/**
 * Inicializa una tabla DataTable por ID con estilos y configuración predefinida.
 * @param {string} tableId - ID de la tabla sin el selector "#" (ej: 'datatablesSimple')
 * @param {Array} columnasNoOrdenables - Array de índices de columnas que no deben ser ordenables
 */
function initDataTable(tableId, columnasNoOrdenables = []) {
  const selector = `#${tableId}`;
  const table = $(selector);
  if (table.length === 0) return console.warn(`No se encontró la tabla con ID ${tableId}`);

  table.DataTable({
    responsive: true,
    language: {
      url: 'https://cdn.datatables.net/plug-ins/2.3.2/i18n/es-ES.json'
    },
    lengthMenu: [[5, 10, 20, 50], [5, 10, 20, 50]],
    columnDefs: columnasNoOrdenables.map(index => ({
      targets: index,
      orderable: false
    }))
  });
}
