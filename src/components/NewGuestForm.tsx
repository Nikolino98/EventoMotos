import React, { useState } from 'react';
import { UserPlus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NewGuestFormProps {
  headers: string[];
  onGuestAdded: () => void;
}

export const NewGuestForm: React.FC<NewGuestFormProps> = ({ headers, onGuestAdded }) => {
  // Inicializar isOpen como false pero asegurar que el botón siempre sea visible
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Escuchar el evento personalizado para abrir el formulario
  React.useEffect(() => {
    const handleOpenForm = () => {
      setIsOpen(true);
      // Asegurar que el formulario sea visible
      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    };
    
    document.addEventListener('openNewGuestForm', handleOpenForm);
    
    return () => {
      document.removeEventListener('openNewGuestForm', handleOpenForm);
    };
  }, []);
  
  const [formData, setFormData] = useState<Record<string, string>>({
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
  const [hasCompanion, setHasCompanion] = useState(false);
  const { toast } = useToast();

  // Lista de campos requeridos
  const requiredFields = ["DNI", "Apellido y Nombre", "Teléfono"];

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

      // Limpiar el formulario
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
      setIsOpen(false);
      onGuestAdded();
    } catch (error: any) {
      console.error('Error al guardar invitado:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo añadir el invitado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Lista de campos específicos en el orden deseado
  const specificFields = [
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
    "Contacto de Emergencia",
    "Venís acompañado"
  ];

  // Campos del acompañante que solo se muestran si tiene acompañante
  const companionFields = [
    "DNI Acompañante",
    "Apellido y Nombre del acompañante"
  ];

  // Renderizar siempre el botón y el formulario, pero controlando la visibilidad del formulario
  return (
    <div>
      {/* El botón siempre es visible */}
      <Button 
        variant="outline" 
        className="mb-4 w-full"
        onClick={() => setIsOpen(!isOpen)}
        id="add-guest-button"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Añadir nuevo invitado
      </Button>
      
      {/* El formulario solo se muestra cuando isOpen es true */}
      {isOpen && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-xl font-bold">Añadir nuevo invitado</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {specificFields.map((field) => {
                // Renderizar diferentes tipos de campos según el nombre
                if (field === "Venís acompañado" || field === "Sos alérgico a algo?" || 
                    field === "Tenés alguna restricción alimentaria?" || 
                    field === "Tenés carnet Vigente?" || field === "Tenés Seguro vigente?" || 
                    field === "Vas a realizar las rodadas" || 
                    field === "Cena show día sábado 11 (no incluye bebida)") {
                  return (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`select-${field}`}>{field}</Label>
                      <Select 
                        value={formData[field]} 
                        onValueChange={(value) => handleInputChange(field, value)}
                      >
                        <SelectTrigger id={`select-${field}`}>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Si">Si</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                
                // Mostrar campo de texto para alergias solo si es alérgico
                if (field === "A que sos alérgico?") {
                  return (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`input-${field}`}>{field}</Label>
                      <Input
                        id={`input-${field}`}
                        value={formData[field] || ''}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        placeholder={`Ingrese ${field.toLowerCase()}`}
                        disabled={formData["Sos alérgico a algo?"] !== "Si"}
                      />
                    </div>
                  );
                }
                
                // Campos de texto normales
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={`input-${field}`}>{field}</Label>
                    <Input
                      id={`input-${field}`}
                      value={formData[field] || ''}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      placeholder={`Ingrese ${field.toLowerCase()}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Campos del acompañante, solo visibles si "Venís acompañado" es "Si" */}
            {formData["Venís acompañado"] === "Si" && (
              <div className="mt-4 mb-4 border-t pt-4">
                <h4 className="text-md font-medium mb-3">Información del acompañante</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companionFields.map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`input-${field}`}>{field}</Label>
                      <Input
                        id={`input-${field}`}
                        value={formData[field] || ''}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        placeholder={`Ingrese ${field.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Save className="mr-2 h-4 w-4" />
                    Guardar invitado
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};