import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Attendee } from "@/types/attendee";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newAttendee: Attendee) => void;
  usedBraceletNumbers: Set<string>;
  columnHeaders: string[];
}

export const CreateAttendeeModal = ({
  isOpen,
  onClose,
  onSave,
  usedBraceletNumbers,
  columnHeaders,
}: CreateAttendeeModalProps) => {
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
    "Apellido y Nombre del acompañante",
    "braceletNumber",
    "companionBraceletNumber",
  ];

  const [newAttendee, setNewAttendee] = useState<Attendee>(() => {
    const attendee: Attendee = {
      id: uuidv4(),
      isConfirmed: false,
    };

    // Inicializar campos en el orden específico
    FIELD_ORDER.forEach((field) => {
      attendee[field] = "";
    });

    return attendee;
  });

  const handleFieldChange = (key: string, value: any) => {
    setNewAttendee((prev) => ({ ...prev, [key]: value }));
  };

  const validateBraceletNumber = (
    number: string,
    isCompanion: boolean = false
  ): boolean => {
    if (!number) return true;

    const otherNumber = isCompanion
      ? newAttendee.braceletNumber
      : newAttendee.companionBraceletNumber;

    if (number === otherNumber) {
      toast({
        variant: "destructive",
        title: "Número duplicado",
        description:
          "Las pulseras del invitado y acompañante no pueden ser iguales.",
      });
      return false;
    }

    return true;
  };

  const hasCompanion = () => {
    return newAttendee["Venís acompañado?"] === "Si";
  };

  const handleSave = () => {
    if (!validateBraceletNumber(newAttendee.braceletNumber)) {
      return;
    }

    if (
      hasCompanion() &&
      newAttendee.companionBraceletNumber &&
      !validateBraceletNumber(newAttendee.companionBraceletNumber, true)
    ) {
      return;
    }

    onSave(newAttendee);
    onClose();
    toast({
      title: "Invitado creado",
      description: "El nuevo invitado se ha creado correctamente.",
    });
  };

  const getFieldLabel = (key: string): string => {
    // Si es "Marca Temporal", retornamos vacío para que no se muestre
    if (
      key.toLowerCase().includes("marca") &&
      key.toLowerCase().includes("temporal")
    ) {
      return "";
    }

    // Cambiar nombres específicos
    const fieldLabels = {
      braceletNumber: "NÚMERO DE PULSERA (OPCIONAL)",
      companionBraceletNumber: "NÚMERO DE PULSERA ACOMPAÑANTE (OPCIONAL)",
    };

    if (fieldLabels[key]) {
      return fieldLabels[key];
    }

    // Convertir a mayúsculas
    return key
      .split(/(?=[A-Z])/)
      .join(" ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#F9F9F9]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Invitado</DialogTitle>
          <DialogDescription>
            Ingresa la información del nuevo invitado. El número de pulsera es
            opcional y puede ser asignado más tarde.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Sección de asignación de pulseras */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-semibold text-[#F6762C]">
              Asignación de Pulseras
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="bracelet-modal"
                  className="text-right font-medium text-sm"
                  style={{ color: "#F6762C" }}
                >
                  NÚMERO DE PULSERA
                </Label>
                <Input
                  id="bracelet-modal"
                  placeholder="Ej: 001"
                  value={newAttendee.braceletNumber || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!validateBraceletNumber(value)) return;
                    handleFieldChange("braceletNumber", value);
                  }}
                  type="number"
                  className="col-span-3"
                />
              </div>
              {hasCompanion() && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label
                    htmlFor="companion-bracelet-modal"
                    className="text-right font-medium text-sm"
                    style={{ color: "#F6762C" }}
                  >
                    NÚMERO DE PULSERA ACOMPAÑANTE (OPCIONAL)
                  </Label>
                  <Input
                    id="companion-bracelet-modal"
                    placeholder="Ej: 002"
                    value={newAttendee.companionBraceletNumber || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!validateBraceletNumber(value, true)) return;
                      handleFieldChange("companionBraceletNumber", value);
                    }}
                    type="number"
                    className="col-span-3"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Campos del formulario */}
          {FIELD_ORDER.filter(
            (field) =>
              field !== "braceletNumber" && field !== "companionBraceletNumber"
          ).map((field) => {
            if (
              field === "A que sos alérgico?" &&
              newAttendee["Sos alérgico a algo?"] === "No"
            )
              return null;

            if (
              (field === "DNI Acompañante" ||
                field === "Apellido y Nombre del acompañante") &&
              !hasCompanion()
            )
              return null;

            return (
              <div key={field} className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor={field}
                  className="text-right font-medium text-sm"
                  style={{ color: "#F6762C" }}
                >
                  {getFieldLabel(field)}
                </Label>
                {field === "Sos alérgico a algo?" ||
                field === "Tenés carnet Vigente?" ||
                field === "Tenés Seguro vigente?" ||
                field === "Vas a realizar las rodadas" ||
                field === "Venís acompañado?" ||
                field === "Tenés alguna restricción alimentaria?" ||
                field === "Cena show día sábado 11 (no incluye bebida)" ||
                field === "Pagó?" ? (
                  <Select
                    value={newAttendee[field]}
                    onValueChange={(value) => handleFieldChange(field, value)}
                    className="col-span-3"
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={`Selecciona ${field.toLowerCase()}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Si">Si</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : field === "Pagó?" ? (
                  <Input
                    id={field}
                    value={newAttendee[field] || ""}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className="col-span-3"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ingrese el monto pagado"
                  />
                ) : (
                  <Input
                    id={field}
                    value={newAttendee[field] || ""}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className="col-span-3"
                    type="text"
                  />
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="hero" onClick={handleSave}>
            Crear Invitado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
