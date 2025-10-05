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
  const [detailViewGuest, setDetailViewGuest] = useState<any | null>(null);
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

  // Función para exportar datos a XLSX
  const handleExportToXLSX = () => {
    // Usar los datos actuales para la exportación
    const dataToExport = currentData.map(row => {
      // Crear una copia limpia sin los campos internos que empiezan con _
      const cleanRow = { ...row };
      Object.keys(cleanRow).forEach(key => {
        if (key.startsWith('_')) {
          delete cleanRow[key];
        }
      });
      return cleanRow;
    });
    
    // Exportar con nombre descriptivo y fecha
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    exportToXLSX(dataToExport, `invitados-moto-event-${dateStr}`);
    
    toast({
      title: "Exportación exitosa",
      description: "Los datos han sido exportados en formato XLSX.",
    });
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
      guestData["Venís acompañado"] ||
      guestData["venis acompañado"] ||
      guestData["Venís Acompañado"];
    return val?.toString().toLowerCase() === "si";
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

    // Validación: obligatorio ingresar número de pulsera principal
    if (!braceletNumber.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar el número de pulsera principal.",
        variant: "destructive",
      });
      return;
    }

    // Si tiene acompañante, obligatorio ingresar número de pulsera acompañante
    if (guest.hasCompanion && !companionBraceletNumber.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar el número de pulsera del acompañante.",
        variant: "destructive",
      });
      return;
    }

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
    if (
      guest.hasCompanion &&
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
    // Además, no pueden ser iguales entre sí
    if (
      guest.hasCompanion &&
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
          confirmed: true,
          confirmed_at: new Date().toISOString(),
          bracelet_number: braceletNumber.trim(),
          companion_bracelet_number: guest.hasCompanion
            ? companionBraceletNumber.trim()
            : null,
        })
        .eq("guest_id", guest.id);

      if (error) throw error;

      setConfirmedGuests((prev) => new Set([...prev, guest.id]));
      setDialogOpen(false);
      setInfoModalOpen(false);

      // Limpiar estados
      setSelectedGuest(null);
      setCurrentGuest(null);

      toast({
        title: "Invitado confirmado",
        description: `Pulsera(s) asignada(s) correctamente.`,
      });

      // Recargar datos para actualizar la vista
      loadGuestsFromSupabase();
    } catch (error: any) {
      console.error("Error updating guest:", error);
      toast({
        title: "Error al actualizar",
        description: "No se pudo confirmar el invitado.",
        variant: "destructive",
      });
    }
  };

  // Función para editar un campo
  const handleEditField = async (fieldName: string, newValue: string) => {
    if (!detailViewGuest) return;

    try {
      const guestId = getGuestId(detailViewGuest, 0);
      const updatedGuestData = {
        ...detailViewGuest,
        [fieldName]: newValue,
      };

      const { error } = await supabase
        .from("guests")
        .update({
          guest_data: updatedGuestData,
        })
        .eq("guest_id", guestId);

      if (error) throw error;

      // Actualizar el estado local
      setDetailViewGuest(updatedGuestData);
      setEditingField(null);
      setEditValue("");

      toast({
        title: "Campo actualizado",
        description: `${fieldName} ha sido actualizado correctamente.`,
      });

      // Recargar datos
      loadGuestsFromSupabase();
    } catch (error: any) {
      console.error("Error updating field:", error);
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el campo.",
        variant: "destructive",
      });
    }
  };

  // 1. Define el array fijo de columnas fuera del componente (o dentro, pero fuera del render)
  const ALL_COLUMNS = [
    "DNI",
    "Apellido y Nombre",
    "Grupo sanguíneo",
    "Teléfono",
    "Venís acompañado",
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
    "Sos alérgico a algo?",
    "A que sos alérgico?",
    "Vas a realizar las rodadas",
  ];

  // Scroll al inicio cuando se muestra la vista de detalle
  useEffect(() => {
    if (detailViewGuest) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [detailViewGuest]);

  // Si hay un invitado seleccionado para ver detalles, mostrar la vista de detalle
  if (detailViewGuest) {
    const guestId = getGuestId(detailViewGuest, 0);
    const isConfirmed = confirmedGuests.has(guestId);

    return (
      <Card className="p-4 sm:p-6 lg:p-8 relative">
        {/* Botón flotante para asignar pulseras */}
        {detailViewGuest && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => {
                const guestId = getGuestId(detailViewGuest, 0);
                setSelectedGuest({
                  id: guestId,
                  data: detailViewGuest,
                  hasCompanion: hasCompanion(detailViewGuest),
                });
                setBraceletNumber(detailViewGuest._bracelet_number || "");
                setCompanionBraceletNumber(
                  detailViewGuest._companion_bracelet_number || ""
                );
                setDialogOpen(true);
              }}
              size="lg"
              className="bg-primary hover:bg-primary/90 shadow-lg flex items-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              Asignar Pulseras
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-4" id="detail-view-top">
          {/* Header con botón de volver */}
          <div className="flex items-center justify-between gap-4">
            <Button
              onClick={() => setDetailViewGuest(null)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Volver a la lista
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Abrir diálogo para ingresar pulseras directamente
                  console.log("Abriendo diálogo para asignar pulseras");
                  setSelectedGuest({
                    id: guestId,
                    data: detailViewGuest,
                    hasCompanion: hasCompanion(detailViewGuest),
                  });
                  setBraceletNumber(detailViewGuest._bracelet_number || "");
                  setCompanionBraceletNumber(
                    detailViewGuest._companion_bracelet_number || ""
                  );
                  setDialogOpen(true);
                }}
                variant="primary"
                size="sm"
                className={`${
                  isConfirmed
                    ? "bg-success hover:bg-success/90"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isConfirmed ? "Editar Pulseras" : "Asignar Pulseras"}
              </Button>
              <Badge
                variant={isConfirmed ? "default" : "secondary"}
                className={`${
                  isConfirmed
                    ? "bg-success/20 text-success border-success/30"
                    : ""
                }`}
              >
                {isConfirmed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Confirmado
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-1" />
                    Pendiente
                  </>
                )}
              </Badge>
            </div>
          </div>

          {/* Título del invitado */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">
              {detailViewGuest["Apellido y Nombre"] || guestId}
            </h2>
          </div>

          {/* Información detallada */}
          <div className="space-y-3">
            {ALL_COLUMNS.map((fieldName) => (
              <div
                key={fieldName}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-background/50 rounded-lg"
              >
                <div className="sm:w-1/3">
                  <span className="font-semibold text-orange-400 text-sm sm:text-base">
                    {fieldName}:
                  </span>
                </div>
                <div className="sm:w-2/3 flex items-center gap-2">
                  {editingField === fieldName ? (
                    <div className="flex items-center gap-2 w-full">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 text-white"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleEditField(fieldName, editValue)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingField(null);
                          setEditValue("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-white flex-1 break-words">
                        {detailViewGuest[fieldName]?.toString() || "-"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingField(fieldName);
                          setEditValue(
                            detailViewGuest[fieldName]?.toString() || ""
                          );
                        }}
                        className="text-orange-400 hover:text-orange-300"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Información de pulseras */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-background/50 rounded-lg">
              <div className="sm:w-1/3">
                <span className="font-semibold text-orange-400 text-sm sm:text-base">
                  Pulsera:
                </span>
              </div>
              <div className="sm:w-2/3">
                <span className="text-white break-words">
                  {detailViewGuest._bracelet_number || "-"}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-background/50 rounded-lg">
              <div className="sm:w-1/3">
                <span className="font-semibold text-orange-400 text-sm sm:text-base">
                  Pulsera Acompañante:
                </span>
              </div>
              <div className="sm:w-2/3">
                <span className="text-white break-words">
                  {detailViewGuest._companion_bracelet_number || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

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
              className="whitespace-nowrap"
              onClick={() => {
                // Buscar el componente NewGuestForm y cambiar su estado directamente
                const event = new CustomEvent('openNewGuestForm');
                document.dispatchEvent(event);
              }}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Añadir invitado
            </Button>
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

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all hover:bg-background/80 ${
                  isConfirmed
                    ? "bg-success/10 border-success/30"
                    : "bg-background/50 border-gray-600"
                }`}
                // Eliminado cursor-pointer y onClick para evitar abrir modal al hacer click en el invitado
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-lg">
                      {guestName}
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
                <div className="mt-2 text-sm text-gray-300">
                  <span>Teléfono: {row["Teléfono"] || "-"}</span>
                  {row["Venís acompañado"]?.toString().toLowerCase() ===
                    "si" && <span className="ml-4">• Viene acompañado</span>}
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
                {Object.entries(currentGuest.data).map(
                  ([key, value]: [string, any]) => {
                    if (
                      key.startsWith("_") ||
                      key === "guest_id" ||
                      key === "confirmed" ||
                      key === "confirmed_at"
                    )
                      return null;
                    // Si es el campo "Venís acompañado", usar un select para facilitar la edición
                    if (key.toLowerCase().includes("venís acompañado")) {
                      return (
                        <div key={key} className="space-y-1">
                          <Label className="text-sm text-gray-400">{key}</Label>
                          <select
                            className="font-medium w-full bg-background text-white border rounded px-2 py-1"
                            value={value?.toString().toLowerCase() === "si" ? "si" : "no"}
                            onChange={(e) => {
                              setCurrentGuest((prev: any) => ({
                                ...prev,
                                data: {
                                  ...prev.data,
                                  [key]: e.target.value,
                                },
                                hasCompanion: e.target.value.toLowerCase() === "si",
                              }));
                            }}
                          >
                            <option value="si">Sí</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                      );
                    }
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="text-sm text-gray-400">{key}</Label>
                        <Input
                          className="font-medium"
                          value={value?.toString() || "-"}
                          onChange={(e) => {
                            // Aseguramos que el valor se guarde y muestre correctamente, incluyendo acentos y ñ
                            const newValue = e.target.value.normalize("NFC");
                            setCurrentGuest((prev: any) => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                [key]: newValue,
                              },
                            }));
                          }}
                          type="text"
                          inputMode="text"
                          autoComplete="on"
                          spellCheck={true}
                          lang="es"
                        />
                      </div>
                    );
                  }
                )}
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
                  {currentGuest.hasCompanion && (
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
                      ...currentGuest.data,
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
                  toast({
                    title: "Error al guardar",
                    description: "No se pudo guardar la información.",
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

      {/* Modal de información y asignación de pulseras */}
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
                {Object.entries(currentGuest.data).map(
                  ([key, value]: [string, any]) => {
                    if (
                      key.startsWith("_") ||
                      key === "guest_id" ||
                      key === "confirmed" ||
                      key === "confirmed_at"
                    )
                      return null;
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="text-sm text-gray-400">{key}</Label>
                        <Input
                          className="font-medium"
                          value={value?.toString() || "-"}
                          onChange={(e) => {
                            setCurrentGuest((prev: any) => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                [key]: e.target.value,
                              },
                            }));
                          }}
                        />
                      </div>
                    );
                  }
                )}
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
                  {currentGuest.hasCompanion && (
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
            <Button variant="outline" onClick={() => setInfoModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (currentGuest) {
                  handleSaveBracelets();
                  setInfoModalOpen(false);
                }
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Confirmar y Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
