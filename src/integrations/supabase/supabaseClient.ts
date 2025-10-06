import { createClient } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

// Constantes para la configuración de Supabase
const SUPABASE_URL = "https://sznvmazyinfidndtpkyh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bnZtYXp5aW5maWRuZHRwa3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDg1MzYsImV4cCI6MjA3NTI4NDUzNn0.xRfMQoZGo39Oe6VXBQs7Wl3T3CXLio2Jo-cZW9jOFug";

// Cliente de Supabase con manejo de errores mejorado
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Wrapper para manejar errores de forma consistente
export const supabase = {
  from: (table: string) => {
    const query = supabaseClient.from(table);
    
    return {
      ...query,
      select: async (...args: any[]) => {
        try {
          const result = await query.select(...args);
          if (result.error) {
            console.error(`Error al seleccionar datos de ${table}:`, result.error);
            throw result.error;
          }
          return result;
        } catch (error) {
          console.error(`Error en operación select en ${table}:`, error);
          throw error;
        }
      },
      insert: async (values: any, options?: any) => {
        try {
          const result = await query.insert(values, options);
          if (result.error) {
            console.error(`Error al insertar datos en ${table}:`, result.error);
            throw result.error;
          }
          return result;
        } catch (error) {
          console.error(`Error en operación insert en ${table}:`, error);
          throw error;
        }
      },
      upsert: async (values: any, options?: any) => {
        try {
          const result = await query.upsert(values, options);
          if (result.error) {
            console.error(`Error en operación upsert en ${table}:`, result.error);
            throw result.error;
          }
          return result;
        } catch (error) {
          console.error(`Error en operación upsert en ${table}:`, error);
          throw error;
        }
      },
      update: async (values: any, options?: any) => {
        try {
          const result = await query.update(values, options);
          if (result.error) {
            console.error(`Error al actualizar datos en ${table}:`, result.error);
            throw result.error;
          }
          return result;
        } catch (error) {
          console.error(`Error en operación update en ${table}:`, error);
          throw error;
        }
      },
      delete: async () => {
        try {
          const result = await query.delete();
          if (result.error) {
            console.error(`Error al eliminar datos de ${table}:`, result.error);
            throw result.error;
          }
          return result;
        } catch (error) {
          console.error(`Error en operación delete en ${table}:`, error);
          throw error;
        }
      }
    };
  },
  channel: (name: string) => supabaseClient.channel(name),
  removeChannel: (channel: any) => supabaseClient.removeChannel(channel),
};

// Función para manejar errores de Supabase de forma consistente
export const handleSupabaseError = (error: any, customMessage?: string) => {
  console.error(customMessage || 'Error en operación de Supabase:', error);
  
  // Mostrar toast con mensaje de error
  toast({
    variant: "destructive",
    title: "Error de base de datos",
    description: customMessage || 'Ha ocurrido un error al procesar la operación.',
  });
  
  return error;
};