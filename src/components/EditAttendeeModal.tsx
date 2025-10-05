import { useState, useEffect } from "react";
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

interface EditAttendeeModalProps {
  attendee: Attendee | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAttendee: Attendee) => void;
  usedBraceletNumbers: Set<string>;
}

export const EditAttendeeModal = ({
  attendee,
  isOpen,
  onClose,
  onSave,
  usedBraceletNumbers,
}: EditAttendeeModalProps) => {
  const [editedAttendee, setEditedAttendee] = useState<Attendee | null>(null);

  useEffect(() => {
    if (attendee) {
      setEditedAttendee({ ...attendee });
    }
  }, [attendee]);

  if (!editedAttendee) return null;

  const hasCompanion = () => {
    const companionFields = Object.keys(editedAttendee).filter(key =>
      key.toLowerCase().includes("acompañ")
    );
    
    for (const field of companionFields) {
      const value = String(editedAttendee[field]).toLowerCase();
      if (value === "si" || value === "sí" || value === "yes") {
        return true;
      }
    }
    return false;
  };

  const handleFieldChange = (key: string, value: any) => {
    setEditedAttendee((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const validateBraceletNumber = (number: string, isCompanion: boolean = false): boolean => {
    if (!number) return true;
    
    const otherNumber = isCompanion 
      ? editedAttendee.braceletNumber 
      : editedAttendee.companionBraceletNumber;
    
    if (number === otherNumber) {
      toast({
        variant: "destructive",
        title: "Número duplicado",
        description: "Las pulseras del invitado y acompañante no pueden ser iguales.",
      });
      return false;
    }

    const originalNumber = isCompanion 
      ? attendee?.companionBraceletNumber 
      : attendee?.braceletNumber;
    
    if (number !== originalNumber && usedBraceletNumbers.has(number)) {
      toast({
        variant: "destructive",
        title: "Número en uso",
        description: "Este número de pulsera ya está asignado a otro asistente.",
      });
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (editedAttendee.braceletNumber && !validateBraceletNumber(editedAttendee.braceletNumber)) {
      return;
    }

    if (hasCompanion() && editedAttendee.companionBraceletNumber && 
        !validateBraceletNumber(editedAttendee.companionBraceletNumber, true)) {
      return;
    }

    if (hasCompanion() && !editedAttendee.companionBraceletNumber) {
      toast({
        variant: "destructive",
        title: "Pulsera requerida",
        description: "Debe asignar una pulsera para el acompañante.",
      });
      return;
    }

    onSave(editedAttendee);
    onClose();
    toast({
      title: "Guardado exitoso",
      description: "Los cambios se guardaron correctamente.",
    });
  };

  const getFieldLabel = (key: string): string => {
    // Si es "Marca Temporal", retornamos vacío para que no se muestre
    if (key.toLowerCase().includes("marca") && key.toLowerCase().includes("temporal")) {
      return "";
    }
    
    // Cambiar nombres específicos
    if (key === "braceletNumber") {
      return "NUMERO DE PULSERA";
    }
    
    if (key === "companionBraceletNumber") {
      return "PULSERA ACOMPAÑANTE";
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
          <DialogTitle>Editar Asistente</DialogTitle>
          <DialogDescription>
            Actualiza la información del asistente y asigna números de pulsera únicos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {Object.keys(editedAttendee)
            .filter((key) => {
              // No mostrar ID, isConfirmed ni Marca Temporal
              if (key === "id" || key === "isConfirmed" || key.toLowerCase().includes("marca temporal")) {
                return false;
              }
              
              // No mostrar companionBraceletNumber si no viene acompañado
              if (key === "companionBraceletNumber" && !hasCompanion()) {
                return false;
              }
              
              return true;
            })
            .map((key) => (
              <div key={key} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={key} className="text-right font-medium text-sm" style={{ color: '#F6762C' }}>
                  {getFieldLabel(key)}
                </Label>
                <Input
                  id={key}
                  value={editedAttendee[key] ?? ""}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="col-span-3"
                />
              </div>
            ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {editedAttendee.isConfirmed ? (
            <Button 
              variant="destructive" 
              className="w-full sm:w-auto"
              onClick={() => {
                const updated = { 
                  ...editedAttendee, 
                  isConfirmed: false,
                  braceletNumber: "",
                  companionBraceletNumber: ""
                };
                onSave(updated);
                onClose();
                toast({
                  title: "Confirmación cancelada",
                  description: "Se ha cancelado la confirmación y eliminado los números de pulsera.",
                });
              }}
            >
              Cancelar Confirmación
            </Button>
          ) : (
            <Button 
              variant="hero" 
              className="bg-[#659252] hover:bg-[#4a6b3c] w-full sm:w-auto"
              onClick={() => {
                const updated = { ...editedAttendee, isConfirmed: true };
                onSave(updated);
                onClose();
                toast({
                  title: "Invitado confirmado",
                  description: "El invitado ha sido confirmado y destacado.",
                });
              }}
            >
              Confirmar Invitado
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button variant="hero" onClick={handleSave} className="w-full sm:w-auto">
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
