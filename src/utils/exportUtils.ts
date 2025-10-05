import * as XLSX from 'xlsx';

/**
 * Exporta datos a un archivo XLSX
 * @param data Los datos a exportar
 * @param fileName Nombre del archivo (sin extensión)
 */
export const exportToXLSX = (data: any[], fileName: string = 'export') => {
  // Crear una hoja de trabajo
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Crear un libro de trabajo
  const workbook = XLSX.utils.book_new();
  
  // Añadir la hoja de trabajo al libro
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  
  // Generar el archivo XLSX y descargarlo
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};