import { useState, useEffect } from "react";
import { supabase, handleSupabaseError } from "@/integrations/supabase/supabaseClient";
import { Attendee } from "@/types/attendee";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { RealtimeChannel } from "@supabase/supabase-js";

export const useAttendees = () => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load attendees from database on mount
  useEffect(() => {
    loadAttendees();
  }, []);

  // Configure realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("attendees-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
        },
        (payload) => {
          console.log("Actualización en tiempo real:", payload);
          
          if (payload.eventType === "INSERT") {
            const newAttendee = dbToAttendee(payload.new);
            setAttendees((prev) => {
              const exists = prev.some((a) => a.id === newAttendee.id);
              return exists ? prev : [...prev, newAttendee];
            });
            
            toast({
              title: "Nuevo asistente",
              description: "Se ha añadido un nuevo asistente a la lista.",
            });
          } 
          else if (payload.eventType === "UPDATE") {
            const updatedAttendee = dbToAttendee(payload.new);
            setAttendees((prev) =>
              prev.map((a) => (a.id === updatedAttendee.id ? updatedAttendee : a))
            );
            
            toast({
              title: "Asistente actualizado",
              description: "La información de un asistente ha sido actualizada.",
            });
          } 
          else if (payload.eventType === "DELETE") {
            setAttendees((prev) => prev.filter((a) => a.id !== payload.old.guest_id));
            
            toast({
              title: "Asistente eliminado",
              description: "Un asistente ha sido eliminado de la lista.",
            });
          }
        }
      )
      .subscribe();

    // Clean up subscription when unmounting
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAttendees = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        console.log("Datos recibidos de Supabase:", data);
        const convertedData = data.map(dbToAttendee);
        console.log("Datos convertidos:", convertedData);
        setAttendees(convertedData);
      }
    } catch (error) {
      console.error("Error loading attendees:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los asistentes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAttendees = async (newAttendees: Attendee[], fileName?: string) => {
    try {
      // Clear existing attendees
      await supabase.from("guests").delete().neq("guest_id", "00000000-0000-0000-0000-000000000000");

      // Asignar nuevos UUIDs a todos los asistentes
      const attendeesWithUUID = newAttendees.map(attendee => ({
        ...attendee,
        id: uuidv4()
      }));

      // Insert new attendees
      const dbRecords = attendeesWithUUID.map((attendee) => attendeeToDb(attendee, fileName));
      const { error } = await supabase.from("guests").insert(dbRecords);

      if (error) throw error;

      toast({
        title: "Datos sincronizados",
        description: "Los asistentes se guardaron correctamente en la base de datos.",
      });
    } catch (error) {
      console.error("Error saving attendees:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los asistentes en la base de datos.",
      });
    }
  };

  const updateAttendee = async (updatedAttendee: Attendee) => {
    try {
      console.log("Actualizando asistente:", updatedAttendee);
      
      if (!updatedAttendee.id) {
        throw new Error("El ID del invitado no puede estar vacío");
      }

      // Validar que el ID sea un UUID válido
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updatedAttendee.id)) {
        throw new Error("El ID del invitado debe ser un UUID válido");
      }
      
      // Convertir el objeto Attendee al formato de la base de datos
      const dbRecord = attendeeToDb(updatedAttendee);
      console.log("Registro DB para actualizar:", dbRecord);
      
      // Buscar primero el registro por ID para verificar que existe
      const { data: existingData } = await supabase
        .from("guests")
        .select("id")
        .eq("guest_id", dbRecord.guest_id)
        .maybeSingle();
        
      if (!existingData) {
        console.error("No se encontró el invitado con ID:", dbRecord.guest_id);
        throw new Error(`No se encontró el invitado con ID: ${dbRecord.guest_id}`);
      }
      
      // Usar update en lugar de upsert para evitar problemas con el formato del ID
      const { data, error } = await supabase
        .from("guests")
        .update({
          guest_data: dbRecord.guest_data,
          bracelet_number: dbRecord.bracelet_number,
          companion_bracelet_number: dbRecord.companion_bracelet_number,
          confirmed: dbRecord.confirmed,
          updated_at: new Date().toISOString()
        })
        .eq("guest_id", dbRecord.guest_id)
        .select();
      
      if (error) {
        console.error("Error al actualizar asistente:", error);
        throw error;
      }
      
      console.log("Asistente actualizado con éxito:", data);
      
      toast({
        title: "Cambios guardados",
        description: "La información del invitado se actualizó correctamente.",
      });
      
      return { data, error: null };
    } catch (error) {
      console.error("Error al actualizar asistente:", error);
      toast({
        title: "Error al actualizar",
        description: `No se pudo actualizar la información: ${error}`,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  // Función para crear un nuevo asistente
  const createAttendee = async (attendee: Omit<Attendee, "id">) => {
    try {
      // Generar ID único para el nuevo asistente
      const newAttendee: Attendee = {
        ...attendee,
        id: uuidv4()
      };
      
      // Convertir a formato de base de datos
      const dbRecord = attendeeToDb(newAttendee);
      
      // Insertar en la base de datos
      const { data, error } = await supabase
        .from("guests")
        .insert(dbRecord)
        .select();
        
      if (error) throw error;
      
      toast({
        title: "Asistente creado",
        description: "El nuevo asistente se ha creado correctamente.",
      });
      
      // Actualizar estado local
      if (data && data[0]) {
        const createdAttendee = dbToAttendee(data[0]);
        setAttendees(prev => [...prev, createdAttendee]);
      }
      
      return { success: true, data };
    } catch (error) {
      console.error("Error al crear asistente:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el nuevo asistente."
      });
      return { success: false, error };
    }
  };

  // Función para eliminar un asistente
  const deleteAttendee = async (attendeeId: string) => {
    try {
      // Validar ID
      if (!attendeeId) {
        throw new Error("ID de asistente no válido");
      }

      // Validar que el ID sea un UUID válido
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attendeeId)) {
        throw new Error("El ID del invitado debe ser un UUID válido");
      }
      
      // Eliminar de la base de datos
      const { error } = await supabase
        .from("guests")
        .delete()
        .eq("guest_id", attendeeId);
      
      if (error) throw error;
      
      toast({
        title: "Asistente eliminado",
        description: "El asistente ha sido eliminado correctamente.",
      });
      
      // Actualizar estado local
      setAttendees(prev => prev.filter(a => a.id !== attendeeId));
      
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar asistente:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el asistente."
      });
      return { success: false, error };
    }
  };

  return {
    attendees,
    isLoading,
    setAttendees,
    loadAttendees,
    saveAttendees,
    updateAttendee,
    createAttendee,
    deleteAttendee
  };
};

// Función para convertir un registro de la base de datos al formato de la aplicación
const dbToAttendee = (dbRecord: any): Attendee => {
  const { guest_id, guest_data, bracelet_number, companion_bracelet_number, confirmed, ...rest } = dbRecord;
  
  return {
    id: guest_id,
    braceletNumber: bracelet_number,
    companionBraceletNumber: companion_bracelet_number,
    isConfirmed: confirmed,
    ...guest_data,
    ...rest,
  };
};

// Función para convertir un objeto Attendee al formato de la base de datos
const attendeeToDb = (attendee: Attendee, fileName?: string) => {
  const { id, braceletNumber, companionBraceletNumber, isConfirmed, ...rowData } = attendee;
  return {
    guest_id: id,
    file_name: fileName,
    guest_data: rowData,
    bracelet_number: braceletNumber,
    companion_bracelet_number: companionBraceletNumber,
    confirmed: isConfirmed,
  };
};
