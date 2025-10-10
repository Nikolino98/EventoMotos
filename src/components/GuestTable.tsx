import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Users,
  CheckCircle2,
  Clock,
  UserCheck,
  Edit2,
  Save,
  X,
  Trash2,
  FileDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { exportToXLSX } from "@/utils/exportUtils";

interface GuestTableProps {
  data: any[];
  headers: string[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const GuestTable: React.FC<GuestTableProps> = ({
  data,
  headers,
  searchTerm,
  onSearchChange,
}) => {
  const [confirmedGuests, setConfirmedGuests] = useState<Set<string>>(
    new Set()
  );
  const [supabaseGuests, setSupabaseGuests] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<{
    id: string;
    data: any;
    hasCompanion?: boolean;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [braceletNumber, setBraceletNumber] = useState("");
  const [companionBraceletNumber, setCompanionBraceletNumber] = useState("");
  // Estado para el nuevo modal de información y asignación de pulseras
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [currentGuest, setCurrentGuest] = useState<any>(null);
  // Eliminamos el estado de vista detallada
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();

  // Load guests from Supabase on component mount
  useEffect(() => {
    loadGuestsFromSupabase();

    // Set up real-time subscription
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guests",
        },
        (payload) => {
          console.log("Real-time update:", payload);
          loadGuestsFromSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadGuestsFromSupabase = async () => {
    try {
      const { data: guests, error } = await supabase
        .from("guests")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (guests) {
        setSupabaseGuests(guests);
        // Update confirmed guests set
        const confirmed = new Set(
          guests.filter((g) => g.confirmed).map((g) => g.guest_id)
        );
        setConfirmedGuests(confirmed);
      }
    } catch (error: any) {
      console.error("Error loading guests:", error);
      toast({
        title: "Error al cargar datos",
        description:
          "No se pudieron cargar los invitados desde la base de datos.",
        variant: "destructive",
      });
    }
  };

  // Use Supabase data if available, otherwise use local data
  const currentData =
    supabaseGuests.length > 0
      ? supabaseGuests.map((g) => ({
          ...g.guest_data,
          _supabase_id: g.id,
          _guest_id: g.guest_id,
          _bracelet_number: g.bracelet_number,
          _companion_bracelet_number: g.companion_bracelet_number,
        }))
      : data;

  // Orden específico de los campos
const FIELD_ORDER = [
  "DNI",
  "Apellido y Nombre",
  "Pais",
  "Provincia",
  "Ciudad de donde nos visitas",
  "Teléfono",
  "Dirección de correo electrónico",
  "Grupo sanguíneo",
  "Moto en la que venís",
  "Tenés carnet Vigente?",
  "Tenés Seguro vigente?",
  "Vas a realizar las rodadas",
  "Sos alérgico a algo?",
  "A que sos alérgico?",
  "Tenés alguna restricción alimentaria?",
  "Cena show día sábado 11 (no incluye bebida)",
  "Pagó?",
  "Contacto de Emergencia",
  "Venís acompañado?",
  "DNI Acompañante",
  "Apellido y Nombre del acompañante"
];

// Orden específico para la exportación a XLSX
const EXPORT_FIELD_ORDER = [
  "Apellido y Nombre",
  "DNI",
  "Grupo sanguíneo",
  "Teléfono",
  "Dirección de correo electrónico",
  "Venís acompañado?",
  "Apellido y Nombre del acompañante",
  "DNI Acompañante",
  "Contacto de Emergencia",
  "Tenés carnet Vigente?",
  "Tenés Seguro vigente?",
  "Cena show día sábado 11 (no incluye bebida)",
  "Tenés alguna restricción alimentaria?",
  "Moto en la que venís",
  "Ciudad de donde nos visitas",
  "Provincia",
  "Pais",
  "Sos alérgico a algo?",
  "A que sos alérgico?",
  "Vas a realizar las rodadas",
  "Pagó?",
  "Número de Pulsera",
  "Número de Pulsera Acompañante"
];

  // Función para exportar datos a XLSX
  const handleExportToXLSX = () => {
    try {
      if (!currentData || currentData.length === 0) {
        toast({
          title: "Error al exportar",
          description: "No hay datos para exportar.",
          variant: "destructive",
        });
        return;
      }

      // Usar los datos actuales para la exportación
      const dataToExport = currentData.map(row => {
        // Crear un objeto ordenado con los campos en el orden específico
        const orderedRow = {};
        
        // Primero agregamos los campos en el orden especificado
        EXPORT_FIELD_ORDER.forEach(field => {
          if (field === "Número de Pulsera") {
            orderedRow[field] = row._bracelet_number || "";
          } else if (field === "Número de Pulsera Acompañante") {
            orderedRow[field] = row._companion_bracelet_number || "";
          } else {
            orderedRow[field] = row[field] || "";
          }
        });

        return orderedRow;
      });
      
      // Exportar con nombre descriptivo y fecha
      const today = new Date();
      const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      exportToXLSX(dataToExport, `invitados-moto-event-${dateStr}`);
      
      toast({
        title: "Exportación exitosa",
        description: "Los datos han sido exportados en formato XLSX.",
      });
    } catch (error) {
      console.error('Error en handleExportToXLSX:', error);
      toast({
        title: "Error al exportar",
        description: "Ocurrió un error al exportar los datos. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  // getGuestId debe estar antes de cualquier uso
  const getGuestId = (row: any, index: number): string => {
    if (row._guest_id) return row._guest_id;
    const possibleIdFields = [
      "id",
      "ID",
      "Id",
      "código",
      "codigo",
      "Código",
      "Codigo",
      "DNI",
      "dni",
    ];
    for (const field of possibleIdFields) {
      if (
        row[field] !== undefined &&
        row[field] !== null &&
        row[field] !== ""
      ) {
        return row[field].toString();
      }
    }
    return `guest_${index}`;
  };

  // Filtrado solo por búsqueda (sin filtro de confirmados)
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return currentData;
    return currentData.filter((row) =>
      Object.values(row).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [currentData, searchTerm]);

  // Detecta si el invitado viene acompañado
  const hasCompanion = (guestData: any) => {
    const val =
      guestData["Venís acompañado?"] ||
      guestData["Venís acompañado"] ||
      guestData["venis acompañado"] ||
      guestData["Venís Acompañado"];
    const normalizedVal = val?.toString().toLowerCase().trim();
    return ["si", "sí", "true", "yes", "1"].includes(normalizedVal);
  };

  // Función para manejar el clic en un invitado
  const handleGuestClick = (guestId: string, row: any) => {
    // Normalizar los valores booleanos a "Si"/"No"
    const normalizedData = { ...row };
    const booleanFields = [
      "Sos alérgico a algo?",
      "Tenés carnet Vigente?",
      "Tenés Seguro vigente?",
      "Vas a realizar las rodadas",
      "Tenés alguna restricción alimentaria?",
      "Cena show día sábado 11 (no incluye bebida)"
    ];

    // Verificar si hay información del acompañante
    const hasCompanionInfo = 
      (row["Apellido y Nombre del acompañante"]?.toString().trim() || "").length > 0 ||
      (row["DNI Acompañante"]?.toString().trim() || "").length > 0;

    // Establecer "Venís acompañado?" basado en la información del acompañante
    normalizedData["Venís acompañado?"] = hasCompanionInfo ? "Si" : "No";

    // Normalizar otros campos booleanos
    booleanFields.forEach(field => {
      const value = row[field];
      if (value !== undefined && value !== null) {
        const strValue = value.toString().toLowerCase().trim();
        normalizedData[field] = ["si", "sí", "true", "yes", "1"].includes(strValue) ? "Si" : "No";
      }
    });

    // Establecer el estado del invitado actual con los datos normalizados
    setCurrentGuest({
      id: guestId,
      data: normalizedData,
      hasCompanion: hasCompanionInfo
    });

    // Establecer los números de pulsera
    setBraceletNumber(row._bracelet_number || "");
    setCompanionBraceletNumber(row._companion_bracelet_number || "");
    
    // Abrir el modal
    setInfoModalOpen(true);
  };

  // Handler para eliminar invitado
  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este invitado? Esta acción no se puede deshacer.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("guests")
        .delete()
        .eq("guest_id", guestId);

      if (error) throw error;

      toast({
        title: "Invitado eliminado",
        description: `El invitado ha sido eliminado correctamente.`,
      });
      
      // Recargar la lista de invitados
      loadGuestsFromSupabase();
    } catch (error: any) {
      console.error("Error al eliminar invitado:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el invitado.",
        variant: "destructive",
      });
    }
  };

  // Handler para confirmar/desconfirmar invitado
  const handleConfirmGuest = async (guestId: string, guestData: any) => {
    const isCurrentlyConfirmed = confirmedGuests.has(guestId);

    if (isCurrentlyConfirmed) {
      // Desconfirmar y borrar pulseras
      try {
        const { error } = await supabase
          .from("guests")
          .update({
            confirmed: false,
            confirmed_at: null,
            bracelet_number: null,
            companion_bracelet_number: null,
          })
          .eq("guest_id", guestId);

        if (error) throw error;

        setConfirmedGuests((prev) => {
          const newSet = new Set(prev);
          newSet.delete(guestId);
          return newSet;
        });

        toast({
          title: "Confirmación cancelada",
          description: `El invitado ${guestId} ha sido desconfirmado.`,
        });
      } catch (error: any) {
        console.error("Error updating guest:", error);
        toast({
          title: "Error al actualizar",
          description: "No se pudo actualizar el estado del invitado.",
          variant: "destructive",
        });
      }
    } else {
      // Abrir diálogo para ingresar pulseras
      setSelectedGuest({
        id: guestId,
        data: guestData,
        hasCompanion: hasCompanion(guestData),
      });
      setBraceletNumber("");
      setCompanionBraceletNumber("");
      setDialogOpen(true);
    }
  };

  // Guardar pulseras y confirmar invitado
  const handleSaveBracelets = async () => {
    // Usar currentGuest si está disponible, de lo contrario usar selectedGuest
    const guest = currentGuest || selectedGuest;
  
    if (!guest) {
      toast({
        title: "Error",
        description: "No hay invitado seleccionado.",
        variant: "destructive",
      });
      return;
    }
  
    // Solo validar si se ingresó un número de pulsera
    if (braceletNumber.trim()) {
      // Validación: los números de pulsera deben ser únicos en toda la lista
      const allBracelets = new Set<string>();
      supabaseGuests.forEach((g) => {
        if (g.bracelet_number) allBracelets.add(g.bracelet_number.trim());
        if (g.companion_bracelet_number)
          allBracelets.add(g.companion_bracelet_number.trim());
      });
  
      // Si estamos editando, quitar los actuales del invitado seleccionado
      const currentGuestData = supabaseGuests.find(
        (g) => g.guest_id === guest.id
      );
      if (currentGuestData) {
        if (currentGuestData.bracelet_number)
          allBracelets.delete(currentGuestData.bracelet_number.trim());
        if (currentGuestData.companion_bracelet_number)
          allBracelets.delete(currentGuestData.companion_bracelet_number.trim());
      }
  
      if (allBracelets.has(braceletNumber.trim())) {
        toast({
          title: "Error",
          description:
            "El número de pulsera principal ya está asignado a otro invitado.",
          variant: "destructive",
        });
        return;
      }
  
      // Si hay número de pulsera de acompañante, validar que sea único
      if (companionBraceletNumber.trim()) {
        if (allBracelets.has(companionBraceletNumber.trim())) {
          toast({
            title: "Error",
            description:
              "El número de pulsera del acompañante ya está asignado a otro invitado.",
            variant: "destructive",
          });
          return;
        }
  
        // Además, no pueden ser iguales entre sí
        if (braceletNumber.trim() === companionBraceletNumber.trim()) {
          toast({
            title: "Error",
            description:
              "El número de pulsera principal y el del acompañante no pueden ser iguales.",
            variant: "destructive",
          });
          return;
        }
      }
    }
  
    try {
      const { error } = await supabase
        .from("guests")
        .update({
          confirmed: true,
          confirmed_at: new Date().toISOString(),
          bracelet_number: braceletNumber.trim() || null,
          companion_bracelet_number: companionBraceletNumber.trim() || null,
        })
        .eq("guest_id", guest.id);
  
      if (error) throw error;
  
      setDialogOpen(false);
      setSelectedGuest(null);
      toast({
        title: "Invitado confirmado",
        description: "El invitado ha sido confirmado exitosamente.",
      });
      loadGuestsFromSupabase();
    } catch (error: any) {
      console.error("Error updating guest:", error);
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el estado del invitado.",
        variant: "destructive",
      });
    }
  };

  // Función para editar un campo - Eliminada ya que no se usa la vista detallada

  // 1. Define el array fijo de columnas fuera del componente (o dentro, pero fuera del render)
  const ALL_COLUMNS = [
    "DNI",
    "Apellido y Nombre",
    "Grupo sanguíneo",
    "Teléfono",
    "Venís acompañado",
    "Apellido y Nombre del acompañante",
    "DNI Acompañante",
    "Número de pulsera",
    "Número de pulsera acompañante",
    "Contacto de Emergencia",
    "Tenés carnet Vigente?",
    "Tenés Seguro vigente?",
    "Cena show día sábado 11 (no incluye bebida)",
    "Tenés alguna restricción alimentaria?",
    "Moto en la que venís",
    "Ciudad de donde nos visitas",
    "Provincia",
    "Sos alérgico a algo?",
    "A que sos alérgico?",
    "Vas a realizar las rodadas",
  ];

  // Eliminamos la vista detallada de invitados

  return (
    <Card className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4">
        {/* Controles de navegación */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Input
              placeholder="Buscar invitado..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="max-w-sm"
            />
            <Button 
              variant="outline" 
              className="whitespace-nowrap ml-2"
              onClick={handleExportToXLSX}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exportar a XLSX
            </Button>
          </div>
        </div>

        {/* Lista de invitados */}
        <div className="space-y-2">
          {filteredData.map((row, index) => {
            const guestId = getGuestId(row, index);
            const isConfirmed = confirmedGuests.has(guestId);
            const guestName = row["Apellido y Nombre"] || guestId;

            const orderedData = {};
            FIELD_ORDER.forEach(field => {
              if (field === "Número de Pulsera") {
                orderedData[field] = row._bracelet_number || "";
              } else if (field === "Número de Pulsera Acompañante") {
                orderedData[field] = row._companion_bracelet_number || "";
              } else {
                orderedData[field] = row[field] || "";
              }
            });

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all hover:bg-background/80 cursor-pointer ${
                  isConfirmed
                    ? "bg-success/10 border-success/30 border-l-4 border-l-green-500"
                    : "bg-background/50 border-gray-600 border-l-4 border-l-gray-500"
                } ${index % 2 === 0 ? "bg-gray-900/40" : "bg-gray-950/20"} shadow-md my-3`}
                onClick={() => handleGuestClick(guestId, row)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-lg">
                      {orderedData["Apellido y Nombre"]}
                    </span>
                    <Badge
                      variant={isConfirmed ? "default" : "secondary"}
                      className={`${
                        isConfirmed
                          ? "bg-success/20 text-success border-success/30"
                          : ""
                      } text-xs`}
                    >
                      {isConfirmed ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Confirmado
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Pendiente
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      DNI: {row["DNI"] || "-"}
                    </span>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Abrir modal de información y asignación de pulseras
                        setCurrentGuest({
                          id: guestId,
                          data: row,
                          hasCompanion: hasCompanion(row),
                        });
                        setBraceletNumber(row._bracelet_number || "");
                        setCompanionBraceletNumber(
                          row._companion_bracelet_number || ""
                        );
                        setInfoModalOpen(true);
                      }}
                      variant={isConfirmed ? "default" : "outline"}
                      size="sm"
                      className={`${
                        isConfirmed ? "bg-success hover:bg-success/90" : ""
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {isConfirmed ? "Editar Pulseras" : "Confirmar"}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGuest(guestId);
                      }}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-300 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <span>DNI: {orderedData["DNI"] || "-"}</span>
                  <span>Teléfono: {orderedData["Teléfono"] || "-"}</span>
                  <span>País: {orderedData["Pais"] || "-"}</span>
                  <span>Provincia: {orderedData["Provincia"] || "-"}</span>
                  <span>Ciudad: {orderedData["Ciudad de donde nos visitas"] || "-"}</span>
                  <span>Moto: {orderedData["Moto en la que venís"] || "-"}</span>
                  <span>Pagó: {orderedData["Pagó?"] || "No"}</span>
                  {orderedData["Venís acompañado"]?.toString().toLowerCase() === "si" && (
                    <>
                      <span>DNI Acompañante: {orderedData["DNI Acompañante"] || "-"}</span>
                      <span>Nombre Acompañante: {orderedData["Apellido y Nombre del acompañante"] || "-"}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nuevo Modal de Información y Asignación de Pulseras */}
      <Dialog open={infoModalOpen} onOpenChange={setInfoModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Información del Invitado
            </DialogTitle>
            <DialogDescription>
              Visualiza y edita la información del invitado, y asigna pulseras.
            </DialogDescription>
          </DialogHeader>

          {currentGuest && (
            <div className="space-y-6">
              {/* Información editable del invitado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                {FIELD_ORDER.map((field) => {
                  const isPositiveResponse = (value?: string | boolean | null) => {
                    if (!value) return false;
                    const strValue = value.toString().toLowerCase().trim();
                    return ["si", "sí", "true", "yes", "1"].includes(strValue);
                  };

                  // No mostrar campos de acompañante si "Venís acompañado?" es "No"
                  if (
                    (field === "DNI Acompañante" ||
                    field === "Apellido y Nombre del acompañante" ||
                    field === "Número de Pulsera Acompañante") &&
                    !isPositiveResponse(currentGuest.data["Venís acompañado?"])
                  ) {
                    return null;
                  }

                  // No mostrar campo de alergias si no es alérgico
                  if (
                    field === "A que sos alérgico?" &&
                    !isPositiveResponse(currentGuest.data["Sos alérgico a algo?"])
                  ) {
                    return null;
                  }

                  // Si es un campo de selección Si/No
                  if (
                    field === "Sos alérgico a algo?" ||
                    field === "Tenés carnet Vigente?" ||
                    field === "Tenés Seguro vigente?" ||
                    field === "Vas a realizar las rodadas" ||
                    field === "Venís acompañado?" ||
                    field === "Tenés alguna restricción alimentaria?" ||
                    field === "Cena show día sábado 11 (no incluye bebida)"
                  ) {
                    // Convertir cualquier valor positivo a "Si" y el resto a "No"
                    const currentValue = isPositiveResponse(currentGuest.data[field]) ? "Si" : "No";
                    
                    return (
                      <div key={field} className="space-y-1">
                        <Label className="text-sm text-gray-400">{field}</Label>
                        <Select
                          value={currentValue}
                          onValueChange={(value) => {
                            setCurrentGuest((prev: any) => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                [field]: value,
                              },
                              hasCompanion: field === "Venís acompañado?" ? value === "Si" : prev.hasCompanion,
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Selecciona ${field.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Si">Si</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }

                  // Para el resto de campos, usar Input
                  return (
                    <div key={field} className="space-y-1">
                      <Label className="text-sm text-gray-400">{field}</Label>
                      <Input
                        className="font-medium"
                        value={currentGuest.data[field]?.toString() || ""}
                        onChange={(e) => {
                          const newValue = e.target.value.normalize("NFC");
                          setCurrentGuest((prev: any) => {
                            const newData = {
                              ...prev.data,
                              [field]: newValue,
                            };

                            // Si se está editando un campo de acompañante, actualizar "Venís acompañado?"
                            if (field === "Apellido y Nombre del acompañante" || field === "DNI Acompañante") {
                              const hasCompanionInfo = 
                                (field === "Apellido y Nombre del acompañante" ? newValue : newData["Apellido y Nombre del acompañante"])?.toString().trim().length > 0 ||
                                (field === "DNI Acompañante" ? newValue : newData["DNI Acompañante"])?.toString().trim().length > 0;
                              
                              newData["Venís acompañado?"] = hasCompanionInfo ? "Si" : "No";
                            }

                            return {
                              ...prev,
                              data: newData,
                              hasCompanion: newData["Venís acompañado?"] === "Si"
                            };
                          });
                        }}
                        type="text"
                        inputMode="text"
                        autoComplete="on"
                        spellCheck={true}
                        lang="es"
                      />
                    </div>
                  );
                })}
              </div>
              {/* Sección de asignación de pulseras */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Asignación de Pulseras
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bracelet-modal">
                      Número de Pulsera Principal *
                    </Label>
                    <Input
                      id="bracelet-modal"
                      placeholder="Ej: 001"
                      value={braceletNumber}
                      onChange={(e) => setBraceletNumber(e.target.value)}
                    />
                  </div>
                  {currentGuest.data["Venís acompañado?"] === "Si" && (
                    <div className="space-y-2">
                      <Label htmlFor="companion-bracelet-modal">
                        Número de Pulsera Acompañante *
                      </Label>
                      <Input
                        id="companion-bracelet-modal"
                        placeholder="Ej: 002"
                        value={companionBraceletNumber}
                        onChange={(e) =>
                          setCompanionBraceletNumber(e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => {
              // Anular confirmación y cerrar modal
              if (currentGuest) {
                supabase
                  .from("guests")
                  .update({
                    confirmed: false,
                    confirmed_at: null,
                    bracelet_number: null,
                    companion_bracelet_number: null,
                  })
                  .eq("guest_id", currentGuest.id)
                  .then(() => {
                    setInfoModalOpen(false);
                    setCurrentGuest(null);
                    toast({
                      title: "Confirmación anulada",
                      description: `La confirmación del invitado ha sido anulada.`,
                    });
                    loadGuestsFromSupabase();
                  });
              } else {
                setInfoModalOpen(false);
              }
            }}
          >
            Cancelar Confirmación
          </Button>
          <Button
            onClick={async () => {
              if (currentGuest) {
                // Validación reforzada de pulseras
                const allBracelets = new Set<string>();
                supabaseGuests.forEach((g) => {
                  if (g.bracelet_number)
                    allBracelets.add(g.bracelet_number.trim());
                  if (g.companion_bracelet_number)
                    allBracelets.add(g.companion_bracelet_number.trim());
                });
                const currentGuestData = supabaseGuests.find(
                  (g) => g.guest_id === currentGuest.id
                );
                if (currentGuestData) {
                  if (currentGuestData.bracelet_number)
                    allBracelets.delete(
                      currentGuestData.bracelet_number.trim()
                    );
                  if (currentGuestData.companion_bracelet_number)
                    allBracelets.delete(
                      currentGuestData.companion_bracelet_number.trim()
                    );
                }
                // Validación: pulsera principal obligatoria
                if (!braceletNumber.trim()) {
                  toast({
                    title: "Error",
                    description: "Debes ingresar el número de pulsera principal.",
                    variant: "destructive",
                  });
                  return;
                }
                // Validación: si viene acompañado, pulsera acompañante obligatoria
                if (currentGuest.hasCompanion && !companionBraceletNumber.trim()) {
                  toast({
                    title: "Error",
                    description: "Debes ingresar el número de pulsera del acompañante.",
                    variant: "destructive",
                  });
                  return;
                }
                if (allBracelets.has(braceletNumber.trim())) {
                  toast({
                    title: "Error",
                    description:
                      "El número de pulsera principal ya está asignado a otro invitado.",
                    variant: "destructive",
                  });
                  return;
                }
                if (
                  currentGuest.hasCompanion &&
                  allBracelets.has(companionBraceletNumber.trim())
                ) {
                  toast({
                    title: "Error",
                    description:
                      "El número de pulsera del acompañante ya está asignado a otro invitado.",
                    variant: "destructive",
                  });
                  return;
                }
                if (
                  currentGuest.hasCompanion &&
                  braceletNumber.trim() === companionBraceletNumber.trim()
                ) {
                  toast({
                    title: "Error",
                    description:
                      "El número de pulsera principal y el del acompañante no pueden ser iguales.",
                    variant: "destructive",
                  });
                  return;
                }
                try {
                  const { error } = await supabase
                    .from("guests")
                    .update({
                      guest_data: currentGuest.data,
                      bracelet_number: braceletNumber.trim(),
                      companion_bracelet_number: currentGuest.hasCompanion
                        ? companionBraceletNumber.trim()
                        : null,
                      confirmed: true,
                      confirmed_at: new Date().toISOString(),
                    })
                    .eq("guest_id", currentGuest.id);
                  if (error) throw error;
                  setInfoModalOpen(false);
                  setCurrentGuest(null);
                  toast({
                    title: "Cambios guardados",
                    description: `Pulsera(s) e información actualizada correctamente.`,
                  });
                  loadGuestsFromSupabase();
                } catch (error: any) {
                  console.error("Error al guardar:", error);
                  toast({
                    title: "Error al guardar",
                    description: error.message || "No se pudo guardar la información.",
                    variant: "destructive",
                  });
                }
              }
            }}
            className="bg-primary hover:bg-primary/90"
          >
            Confirmar y Guardar
          </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Este segundo modal de información y asignación de pulseras es redundante y debe eliminarse */}
      {/* El modal anterior ya contiene toda la funcionalidad necesaria */}

      {/* Diálogo para asignar pulseras (original) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Pulseras</DialogTitle>
            <DialogDescription>
              Ingresa el número de pulsera asignada
              {selectedGuest?.hasCompanion
                ? " al invitado y su acompañante"
                : " al invitado"}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bracelet">Número de Pulsera Principal *</Label>
              <Input
                id="bracelet"
                placeholder="Ej: 001"
                value={braceletNumber}
                onChange={(e) => setBraceletNumber(e.target.value)}
              />
            </div>
            {selectedGuest?.hasCompanion && (
              <div className="space-y-2">
                <Label htmlFor="companion-bracelet">
                  Número de Pulsera Acompañante *
                </Label>
                <Input
                  id="companion-bracelet"
                  placeholder="Ej: 002"
                  value={companionBraceletNumber}
                  onChange={(e) => setCompanionBraceletNumber(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBracelets}>Confirmar y Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
