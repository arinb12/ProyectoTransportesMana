/**
 * Inicializa una tabla DataTable con configuración estándar y soporte responsive.
 * 
 * @param {string} tableId - ID de la tabla sin el selector "#" (ej: 'miTabla')
 * @param {Array<number>} columnasNoOrdenables - Índices de columnas que no deben ser ordenables
 * @param {object} extraOptions - Opciones adicionales para extender la configuración (opcional)
 * @returns {DataTable|null} - Instancia de la tabla DataTable, o null si no se encuentra la tabla
 */
function initDataTable(tableId, columnasNoOrdenables = [], extraOptions = {}) {
    const selector = `#${tableId}`;
    const table = $(selector);

    if (table.length === 0) {
        console.warn(`⚠️ No se encontró la tabla con ID "${tableId}".`);
        return null;
    }

    const defaultOptions = {
        responsive: true,
        language: {
            url: 'https://cdn.datatables.net/plug-ins/2.3.2/i18n/es-ES.json'
        },
        lengthMenu: [[5, 10, 20, 50], [5, 10, 20, 50]],
        columnDefs: columnasNoOrdenables.map(index => ({
            targets: index,
            orderable: false
        }))
    };

    // Combina opciones extra si vienen
    const finalOptions = $.extend(true, {}, defaultOptions, extraOptions);

    return table.DataTable(finalOptions);
}
