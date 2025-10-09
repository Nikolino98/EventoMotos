import * as XLSX from 'xlsx';

/**
 * Exporta datos a un archivo XLSX
 * @param data Los datos a exportar
 * @param fileName Nombre del archivo (sin extensión)
 */
export const exportToXLSX = (data: any[], fileName: string = 'export') => {
  try {
    // Crear una hoja de trabajo
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Crear un libro de trabajo
    const workbook = XLSX.utils.book_new();
    
    // Añadir la hoja de trabajo al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    
    // Convertir el libro a un array buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Crear un Blob con el array buffer
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Crear un URL para el blob
    const url = window.URL.createObjectURL(blob);
    
    // Crear un elemento <a> para la descarga
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${fileName}.xlsx`;
    
    // Añadir el enlace al documento y hacer clic
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Limpiar
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error al exportar a XLSX:', error);
    throw new Error('No se pudo exportar el archivo XLSX');
  }
};
