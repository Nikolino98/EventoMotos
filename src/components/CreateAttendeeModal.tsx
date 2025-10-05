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
  const [newAttendee, setNewAttendee] = useState<Attendee>(() => {
    const attendee: Attendee = {
      id: uuidv4(),
      isConfirmed: false,
    };
    
    // Inicializar campos basados en las columnas existentes
    columnHeaders.forEach(header => {
      if (header !== 'id' && header !== 'isConfirmed') {
        attendee[header] = '';
      }
    });
    
    return attendee;
  });

  const handleFieldChange = (key: string, value: any) => {
    setNewAttendee((prev) => ({ ...prev, [key]: value }));
  };

  const validateBraceletNumber = (number: string, isCompanion: boolean = false): boolean => {
    if (!number) return true;
    
    const otherNumber = isCompanion 
      ? newAttendee.braceletNumber 
      : newAttendee.companionBraceletNumber;
    
    if (number === otherNumber) {
      toast({
        variant: "destructive",
        title: "Número duplicado",
        description: "Las pulseras del invitado y acompañante no pueden ser iguales.",
      });
      return false;
    }

    if (usedBraceletNumbers.has(number)) {
      toast({
        variant: "destructive",
        title: "Número en uso",
        description: "Este número de pulsera ya está asignado a otro asistente.",
      });
      return false;
    }

    return true;
  };

  const hasCompanion = () => {
    const companionFields = Object.keys(newAttendee).filter(key =>
      key.toLowerCase().includes("acompañ")
    );
    
    for (const field of companionFields) {
      const value = String(newAttendee[field]).toLowerCase();
      if (value === "si" || value === "sí" || value === "yes") {
        return true;
      }
    }
    return false;
  };

  const handleSave = () => {
    if (newAttendee.braceletNumber && !validateBraceletNumber(newAttendee.braceletNumber)) {
      return;
    }

    if (hasCompanion() && newAttendee.companionBraceletNumber && 
        !validateBraceletNumber(newAttendee.companionBraceletNumber, true)) {
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
          <DialogTitle>Crear Nuevo Invitado</DialogTitle>
          <DialogDescription>
            Ingresa la información del nuevo invitado y asigna números de pulsera únicos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {Object.keys(newAttendee)
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
                  value={newAttendee[key] ?? ""}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="col-span-3"
                />
              </div>
            ))}
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