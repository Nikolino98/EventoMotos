import { useCallback } from "react";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Attendee } from "@/types/attendee";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

interface FileUploadProps {
  onFileLoad: (data: Attendee[], fileName?: string) => void;
}

export const FileUpload = ({ onFileLoad }: FileUploadProps) => {
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const attendees: Attendee[] = jsonData.map((row: any, index) => ({
            id: uuidv4(),
            ...(typeof row === 'object' && row !== null ? row : {}),
          }));

          onFileLoad(attendees, file.name);
          toast({
            title: "Archivo cargado",
            description: `Se cargaron ${attendees.length} registros correctamente.`,
          });
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo procesar el archivo. Verifica el formato.",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [onFileLoad]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".csv"))) {
        const input = document.getElementById("file-upload") as HTMLInputElement;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        toast({
          variant: "destructive",
          title: "Formato no válido",
          description: "Por favor, carga un archivo XLSX o CSV.",
        });
      }
    },
    []
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-smooth cursor-pointer bg-card"
    >
      <input
        id="file-upload"
        type="file"
        accept=".xlsx,.csv"
        onChange={handleFileUpload}
        className="hidden"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground mb-2">
            Arrastra tu archivo o haz clic para seleccionar
          </p>
          <p className="text-sm text-muted-foreground">
            Formatos soportados: XLSX, CSV
          </p>
        </div>
      </label>
    </div>
  );
};
