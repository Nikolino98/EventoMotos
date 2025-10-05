import { supabase } from './client';

export async function initializeDatabase() {
  try {
    console.log('Verificando si la tabla guests existe...');
    
    // Verificar si la tabla existe consultando los metadatos
    const { data, error: checkError } = await supabase
      .from('guests')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.log('La tabla no existe o hay un error, creándola...');
      
      // Crear la tabla usando SQL directo a través de funciones RPC
      // Nota: Esto requiere que se haya creado previamente una función SQL en Supabase
      // Como alternativa, usamos el panel de SQL de Supabase para crear la tabla
      
      console.log('Por favor, crea la tabla manualmente en el panel de SQL de Supabase');
      console.log('Usando la estructura definida en el archivo de migración');
      
      // Informar al usuario que debe crear la tabla manualmente
      alert('La tabla de invitados no existe en la base de datos. Por favor, ejecuta el script SQL de migración en el panel de Supabase.');
    } else {
      console.log('La tabla guests ya existe');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    return { success: false, error };
  }
}