import React, { useState } from "react";
import { UserPlus, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NewGuestFormProps {
  headers: string[];
}

export const NewGuestForm: React.FC<NewGuestFormProps> = ({ headers = [] }) => {
  const [formData, setFormData] = useState<Record<string, string>>({ 
    "DNI": "",
    "Apellido y Nombre": "", 
    "Pais": "", 
    "Provincia": "", 
    "Teléfono": "", 
    "Grupo sanguíneo": "", 
    "Venís acompañado": "No",
    "Apellido y Nombre del acompañante": "", 
    "DNI Acompañante": "", 
    "Moto en la que venís": "", 
    "Sos alérgico a algo?": "No",
    "A que sos alérgico?": "", 
    "Tenés Seguro vigente?": "No",
    "Tenés carnet Vigente?": "No", 
    "Contacto de Emergencia": "", 
    "Vas a realizar las rodadas": "No", 
    "Dirección de correo electrónico": "", 
    "Ciudad de donde nos visitas": "", 
    "Tenés alguna restricción alimentaria?": "No", 
    "Cena show día sábado 11 (no incluye bebida)": "No" 
  });
  const [hasCompanion, setHasCompanion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Lista de campos requeridos 
  const requiredFields = ["DNI", "Apellido y Nombre", "Teléfono"];

  // Campos que dependen de "Venís acompañado"
  const companionFields = ["DNI Acompañante", "Apellido y Nombre del acompañante"];

  // Campos que son de tipo Sí/No
  const yesNoFields = [
    "Venís acompañado",
    "Sos alérgico a algo?",
    "Tenés Seguro vigente?",
    "Tenés carnet Vigente?",
    "Vas a realizar las rodadas",
    "Tenés alguna restricción alimentaria?",
    "Cena show día sábado 11 (no incluye bebida)"
  ];

  // Filtrar campos que no queremos mostrar
  const filteredHeaders = headers.filter(header => 
    !header.toLowerCase().includes('timestamp') && 
    !header.toLowerCase().includes('created_at') &&
    !header.toLowerCase().includes('updated_at')
  );

  // Si hay headers, usarlos; de lo contrario, usar los campos predefinidos
  const fieldsToShow = filteredHeaders.length > 0 
    ? filteredHeaders 
    : Object.keys(formData);

  const handleInputChange = (header: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [header]: value
    }));

    // Si cambia "Venís acompañado" a "Si", actualizar el estado
    if (header === "Venís acompañado") {
      setHasCompanion(value === "Si");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validar campos requeridos
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      toast({
        title: "Campos requeridos",
        description: `Por favor complete los siguientes campos: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Generar un ID único basado en DNI
      const guestId = `INV-${formData["DNI"]}`;

      const newGuest = {
        guest_id: guestId,
        guest_data: formData,
        confirmed: false
      };

      const { error } = await supabase
        .from('guests')
        .insert([newGuest]);

      if (error) throw error;

      toast({
        title: "Invitado añadido",
        description: "El nuevo invitado ha sido añadido correctamente.",
      });

      // Resetear el formulario a los valores iniciales
      setFormData({ 
        "DNI": "", 
        "Pais": "", 
        "Provincia": "", 
        "Teléfono": "", 
        "Grupo sanguíneo": "", 
        "Venís acompañado": "No", 
        "DNI Acompañante": "", 
        "Apellido y Nombre": "", 
        "A que sos alérgico?": "", 
        "Moto en la que venís": "", 
        "Sos alérgico a algo?": "No", 
        "Tenés Seguro vigente?": "No", 
        "Contacto de Emergencia": "", 
        "Tenés carnet Vigente?": "No", 
        "Vas a realizar las rodadas": "No", 
        "Dirección de correo electrónico": "", 
        "Ciudad de donde nos visitas": "", 
        "Apellido y Nombre del acompañante": "", 
        "Tenés alguna restricción alimentaria?": "No", 
        "Cena show día sábado 11 (no incluye bebida)": "No" 
      });
      setHasCompanion(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el invitado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para formatear el nombre del campo para mostrar
  const formatFieldName = (field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l, i) => i === 0 ? l.toUpperCase() : l.toLowerCase());
  };

  // Determinar si un campo depende de "Venís acompañado"
  const isCompanionField = (field: string) => {
    return companionFields.includes(field);
  };

  // Determinar si un campo es de tipo Sí/No
  const isYesNoField = (field: string) => {
    return yesNoFields.includes(field);
  };

  // Determinar si un campo depende de otro campo booleano
  const shouldShowField = (field: string) => {
    // Si es un campo de acompañante y no hay acompañante, no mostrar
    if (isCompanionField(field) && !hasCompanion) {
      return false;
    }
    
    // Si es un campo de alergia específica y no es alérgico, no mostrar
    if (field === "A que sos alérgico?" && formData["Sos alérgico a algo?"] === "No") {
      return false;
    }
    
    // Si es un campo de restricción alimentaria específica y no tiene restricciones, no mostrar
    if (field.includes("restricción") && field !== "Tenés alguna restricción alimentaria?" && 
        formData["Tenés alguna restricción alimentaria?"] === "No") {
      return false;
    }
    
    return true;
  };

  // Determinar si un campo es requerido
  const isRequired = (field: string) => {
    return requiredFields.includes(field);
  };

  return (
    <Card className="p-4 border-dashed border-primary/50">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-primary">Agregar Nuevo Invitado</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {fieldsToShow.map((field) => {
            // Si este campo no debe mostrarse según las condiciones, no lo incluimos
            if (!shouldShowField(field)) return null;

            if (isYesNoField(field)) {
              return (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>
                    {formatFieldName(field)}
                    {isRequired(field) && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Select
                    value={formData[field] || "No"}
                    onValueChange={(value) => handleInputChange(field, value)}
                  >
                    <SelectTrigger id={field}>
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Si">Sí</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            return (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>
                  {formatFieldName(field)}
                  {isRequired(field) && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  id={field}
                  name={field}
                  value={formData[field] || ""}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  placeholder={`Ingrese ${formatFieldName(field).toLowerCase()}`}
                  required={isRequired(field)}
                />
              </div>
            );
          })}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            "Guardando..."
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Guardar Invitado
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};