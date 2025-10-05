import React, { useState, useCallback } from 'react';
import { Upload, FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CSVUploaderProps {
  onDataLoad: (data: any[], headers: string[]) => void;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({ onDataLoad }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const { toast } = useToast();

  const saveGuestsToSupabase = async (data: any[], headers: string[]) => {
    try {
      // Clear existing guests
      await supabase.from('guests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Prepare guest data for insertion
      const guestsToInsert = data.map((row, index) => {
        // Try to find an ID field (common variations)
        const idField = headers.find(header => 
          header.toLowerCase().includes('id') || 
          header.toLowerCase().includes('código') || 
          header.toLowerCase().includes('codigo')
        );
        
        const guestId = idField ? row[idField]?.toString() || `guest_${index + 1}` : `guest_${index + 1}`;
        
        return {
          guest_id: guestId,
          guest_data: row,
          confirmed: false
        };
      });
      
      const { error: insertError } = await supabase
        .from('guests')
        .insert(guestsToInsert);
        
      if (insertError) {
        throw insertError;
      }
      
      toast({
        title: "Datos guardados",
        description: `${guestsToInsert.length} invitados guardados en la base de datos.`,
      });
    } catch (error: any) {
      console.error('Error saving to Supabase:', error);
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudieron guardar los datos en la base de datos.",
        variant: "destructive",
      });
    }
  };

  const processExcelFile = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          setError('El archivo Excel no contiene hojas de trabajo');
          setIsLoading(false);
          return;
        }
        
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { 
          header: 1, 
          defval: '', 
          raw: false 
        }) as any[][];
        
        if (jsonData.length < 2) {
          setError('El archivo debe contener al menos una fila de encabezados y una fila de datos');
          setIsLoading(false);
          return;
        }
        
        // First row as headers
        const headers = jsonData[0].map((h: any) => String(h).trim()).filter(Boolean);
        if (headers.length === 0) {
          setError('No se pudieron detectar las columnas del archivo');
          setIsLoading(false);
          return;
        }
        
        // Convert rows to objects
        const dataRows = jsonData.slice(1)
          .filter(row => row.some(cell => cell && String(cell).trim())) // Filter empty rows
          .map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
        
        if (dataRows.length === 0) {
          setError('No se encontraron filas de datos válidas');
          setIsLoading(false);
          return;
        }
        
        // Save to Supabase
        await saveGuestsToSupabase(dataRows, headers);
        
        onDataLoad(dataRows, headers);
        setError(null);
        setIsLoading(false);
        setIsOpen(false);
      } catch (error) {
        setError(`Error al procesar archivo Excel: ${error}`);
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error al leer el archivo Excel');
      setIsLoading(false);
    };
    
    reader.readAsBinaryString(file);
  }, [onDataLoad]);

  const processCSVFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      encoding: 'UTF-8',
      delimitersToGuess: [',', ';', '\t', '|'],
      complete: async (results) => {
        setIsLoading(false);
        
        if (results.errors.length > 0) {
          const errorMessages = results.errors.map(err => err.message).join(', ');
          setError(`Error al procesar CSV: ${errorMessages}`);
          return;
        }

        if (!results.data || results.data.length === 0) {
          setError('El archivo CSV está vacío o no contiene datos válidos');
          return;
        }

        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          setError('No se pudieron detectar las columnas del CSV');
          return;
        }

        // Filter out completely empty rows
        const validData = results.data.filter((row: any) => {
          return Object.values(row).some(value => value !== null && value !== undefined && value !== '');
        });

        if (validData.length === 0) {
          setError('No se encontraron filas de datos válidas');
          return;
        }

        try {
          // Save to Supabase
          await saveGuestsToSupabase(validData, headers);
          
          onDataLoad(validData, headers);
          setError(null);
          setIsOpen(false);
        } catch (error) {
          // Error handling is done in saveGuestsToSupabase
        }
      },
      error: (error) => {
        setIsLoading(false);
        setError(`Error al leer el archivo: ${error.message}`);
      }
    });
  }, [onDataLoad]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);
    setError(null);

    const fileExtension = file.name.toLowerCase();
    
    // Validate file type
    if (!fileExtension.endsWith('.csv') && !fileExtension.endsWith('.xlsx') && !fileExtension.endsWith('.xls')) {
      setError('Solo se permiten archivos CSV, XLS y XLSX');
      setIsLoading(false);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 10MB');
      setIsLoading(false);
      return;
    }

    // Process file based on type
    if (fileExtension.endsWith('.csv')) {
      processCSVFile(file);
    } else if (fileExtension.endsWith('.xlsx') || fileExtension.endsWith('.xls')) {
      processExcelFile(file);
    }
  }, [processCSVFile, processExcelFile]);

  return (
    <Card className="card-moto">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold">
                {fileName ? `Archivo cargado: ${fileName}` : 'Cargar archivo CSV/Excel'}
              </span>
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-4 pb-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={isLoading}
            />
            <label 
              htmlFor="file-upload" 
              className="cursor-pointer flex flex-col items-center space-y-4"
            >
              <div className={`p-4 rounded-full bg-primary/10 ${isLoading ? 'animate-pulse' : ''}`}>
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {isLoading ? 'Procesando y guardando archivo...' : 'Seleccionar archivo CSV o Excel'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formatos: CSV, XLS, XLSX • Máximo 10MB • Se guarda automáticamente
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};