import { useState, useMemo, useEffect } from "react";
import { Bike, Loader2, UserPlus, FileDown, WifiOff } from "lucide-react";
import { Attendee } from "@/types/attendee";
import { FileUpload } from "@/components/FileUpload";
import { AttendeeList } from "@/components/AttendeeList";
import { EditAttendeeModal } from "@/components/EditAttendeeModal";
import { CreateAttendeeModal } from "@/components/CreateAttendeeModal";
import { useAttendees } from "@/hooks/useAttendees";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from 'xlsx';
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { attendees, isLoading, setAttendees, saveAttendees, updateAttendee } = useAttendees();
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isNewAttendeeModalOpen, setIsNewAttendeeModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Monitorear el estado de la conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Verificar la conexión con Supabase al inicio
    const checkConnection = async () => {
      try {
        await supabase.from('attendees').select('id').limit(1);
        setIsOnline(true);
      } catch (error) {
        console.error('Error de conexión con Supabase:', error);
        setIsOnline(false);
      }
    };
    
    checkConnection();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const usedBraceletNumbers = useMemo(() => {
    const numbers = new Set<string>();
    attendees.forEach((attendee) => {
      if (attendee.braceletNumber) {
        numbers.add(attendee.braceletNumber);
      }
      if (attendee.companionBraceletNumber) {
        numbers.add(attendee.companionBraceletNumber);
      }
    });
    return numbers;
  }, [attendees]);

  const handleFileLoad = async (data: Attendee[], fileName?: string) => {
    setAttendees(data);
    await saveAttendees(data, fileName);
  };

  const handleEditAttendee = (attendee: Attendee) => {
    setSelectedAttendee(attendee);
    setIsModalOpen(true);
  };

  const handleSaveAttendee = async (updatedAttendee: Attendee) => {
    setAttendees((prev) =>
      prev.map((a) => (a.id === updatedAttendee.id ? updatedAttendee : a))
    );
    await updateAttendee(updatedAttendee);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAttendee(null);
  };
  
  const handleCloseNewAttendeeModal = () => {
    setIsNewAttendeeModalOpen(false);
  };
  
  const handleCreateAttendee = async (newAttendee: Attendee) => {
    try {
      if (!isOnline) {
        throw new Error("Sin conexión a internet");
      }
      
      // Convertir el asistente al formato de la base de datos
      const { id, braceletNumber, companionBraceletNumber, isConfirmed, ...rowData } = newAttendee;
      const dbRecord = {
        id,
        row_data: { ...rowData, isConfirmed },
        bracelet_number: braceletNumber,
        companion_bracelet_number: companionBraceletNumber
      };
      
      // Insertar directamente en la base de datos
      const { error } = await supabase
        .from("attendees")
        .insert(dbRecord);
        
      if (error) throw error;
      
      // Actualizar la lista local después de guardar en la base de datos
      // Esto es importante para asegurar que los datos se muestren correctamente
      setAttendees(prev => [...prev, newAttendee]);
      
      toast({
        title: "Invitado creado",
        description: "El nuevo invitado se ha guardado correctamente en la base de datos.",
      });
    } catch (error: any) {
      console.error("Error creating attendee:", error);
      
      // Mensaje de error más específico
      let errorMessage = "No se pudo crear el nuevo asistente en la base de datos.";
      if (!isOnline || error.message === "Sin conexión a internet" || error.message?.includes("fetch")) {
        errorMessage = "No hay conexión a internet. Verifica tu conexión e intenta nuevamente.";
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };
  
  const handleDeleteAttendee = async (attendeeToDelete: Attendee) => {
    try {
      if (!isOnline) {
        throw new Error("Sin conexión a internet");
      }
      
      // Eliminar de la base de datos
      const { error } = await supabase
        .from("attendees")
        .delete()
        .eq("id", attendeeToDelete.id);
        
      if (error) throw error;
      
      // Actualizar la lista local
      setAttendees(prev => prev.filter(attendee => attendee.id !== attendeeToDelete.id));
      
      toast({
        title: "Invitado eliminado",
        description: "El invitado ha sido eliminado correctamente.",
      });
    } catch (error: any) {
      console.error("Error deleting attendee:", error);
      
      // Mensaje de error más específico
      let errorMessage = "No se pudo eliminar el invitado de la base de datos.";
      if (!isOnline || error.message === "Sin conexión a internet" || error.message?.includes("fetch")) {
        errorMessage = "No hay conexión a internet. Verifica tu conexión e intenta nuevamente.";
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };
  
  const handleExportToXLSX = () => {
    // Crear una copia de los datos para exportar
    const dataToExport = attendees.map(attendee => {
      // Crear una copia sin el ID para la exportación
      const { id, ...exportData } = attendee;
      return exportData;
    });
    
    // Crear un nuevo libro de trabajo
    const workbook = XLSX.utils.book_new();
    
    // Convertir los datos a una hoja de cálculo
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Añadir la hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invitados");
    
    // Generar el archivo y descargarlo
    XLSX.writeFile(workbook, "invitados_evento.xlsx");
    
    // Mostrar notificación de éxito
    toast({
      title: "Exportación exitosa",
      description: "El archivo se ha descargado correctamente.",
    });
  };
  
  const getColumnHeaders = () => {
    if (attendees.length === 0) {
      // Campos predeterminados cuando no hay invitados
      return [
        "nombre", 
        "apellido", 
        "email", 
        "telefono", 
        "direccion",
        "ciudad",
        "provincia",
        "codigoPostal",
        "¿Tenés carnet Vigente?",
        "¿Tenés Seguro vigente?",
        "Contacto de Emergencia",
        "Ciudad de donde nos visitas",
        "¿Sos alérgico a algo?",
        "Cena show día sábado 11 (no incluye bebida)",
        "¿Tenés alguna restricción alimentaria?",
        "Moto en la que venís",
        "¿Venís acompañado?", 
        "Apellido y Nombre del acompañante",
        "braceletNumber", 
        "companionBraceletNumber"
      ];
    }
    const firstAttendee = attendees[0];
    return Object.keys(firstAttendee).filter(key => key !== "id");
  };

  return (
    <div className="min-h-screen gradient-hero bg-[#111317]">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#F6762C]/20 flex items-center justify-center">
              <Bike className="w-6 h-6 text-[#F6762C]" />
            </div>
            <h1 className="text-4xl md:text-5xl text-[#F6762C] font-extrabold drop-shadow-lg">Validación de Asistentes</h1>
          </div>
          <p className="text-lg text-white font-light">Sistema de gestión para eventos de motos</p>
          <p className="text-sm text-white mt-2">Creado por <a href="https://npmdesign.netlify.app/" target="_blank" rel="noopener noreferrer" className="underline"><span className="blink-blue">N</span>PM</a></p>
        </header>
        <div className="w-full flex justify-center mb-8 h-[50vh]">
          <img src="/motos-sunset.jpg" alt="Evento de motos" className="w-11/12 h-full object-cover rounded-xl shadow-lg border-4 border-[#F6762C]" />
        </div>
        <main className="max-w-6xl mx-auto space-y-8">
          {!isOnline && (
            <div className="bg-red-500/20 border border-red-500 rounded-md p-4 mb-4 flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-red-500" />
              <p className="text-red-500 font-medium">Sin conexión a internet. Algunas funciones pueden no estar disponibles.</p>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#F6762C]" />
              <p className="ml-3 text-[#F6762C]">Cargando datos...</p>
            </div>
          ) : attendees.length === 0 ? (
            <FileUpload onFileLoad={handleFileLoad} />
          ) : (
            <div className="bg-[#181A1B] rounded-2xl shadow-xl border border-[#F6762C]/30 p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={() => setIsNewAttendeeModalOpen(true)}
                    className="bg-[#F6762C] hover:bg-[#d85c1a] text-white flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Crear Nuevo Invitado
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFileUpload(!showFileUpload)}
                    className="border-[#F6762C] text-[#F6762C] hover:bg-[#F6762C]/10"
                  >
                    Cargar Archivo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportToXLSX}
                    className="border-[#F6762C] text-[#F6762C] hover:bg-[#F6762C]/10 flex items-center gap-2"
                  >
                    <FileDown className="w-5 h-5" />
                    Exportar XLSX
                  </Button>
                </div>
                <div className="flex gap-3">
                  <div className="bg-[#659252]/20 text-[#659252] px-4 py-2 rounded-lg font-medium">
                    Confirmados: {attendees.filter(a => a.isConfirmed).length}
                  </div>
                  <div className="bg-[#F6762C]/20 text-[#F6762C] px-4 py-2 rounded-lg font-medium">
                    Pendientes: {attendees.filter(a => !a.isConfirmed).length}
                  </div>
                </div>
              </div>
              
              {showFileUpload && (
                <div className="mb-6 p-4 bg-[#1D1F20] rounded-lg border border-[#F6762C]/30">
                  <FileUpload onFileLoad={handleFileLoad} />
                </div>
              )}
              <h2 className="text-2xl font-bold text-[#F6762C] mb-6 text-center">Invitados</h2>

              <AttendeeList
                attendees={attendees}
                onEditAttendee={handleEditAttendee}
                onDeleteAttendee={handleDeleteAttendee}
              />
              <div className="flex justify-center mt-8">
                <div
                  className="bg-[#F6762C] hover:bg-[#d85c1a] text-white font-bold py-2 px-6 rounded shadow-lg transition-colors duration-200 cursor-pointer"
                  onClick={() => setAttendees([])}
                >
                  Cargar otro archivo Excel, XLSX o CSV
                </div>
              </div>
            </div>
          )}
        </main>

        <EditAttendeeModal
          attendee={selectedAttendee}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveAttendee}
          usedBraceletNumbers={usedBraceletNumbers}
        />
        
        <CreateAttendeeModal
          isOpen={isNewAttendeeModalOpen}
          onClose={handleCloseNewAttendeeModal}
          onSave={handleCreateAttendee}
          usedBraceletNumbers={usedBraceletNumbers}
          columnHeaders={getColumnHeaders()}
        />
      </div>
      <div className="w-full flex justify-center mb-8">
        <img src="/placeholder.svg" alt="Evento de motos" className="max-h-64 rounded-xl shadow-lg" />
      </div>
    </div>
  );
};

export default Index;
