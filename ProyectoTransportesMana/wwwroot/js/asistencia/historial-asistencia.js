let tabla;
let ultimoData = [];

function initTablaSiNoExiste() {
    if ($.fn.DataTable.isDataTable("#tablaHistorial")) return;

    tabla = $("#tablaHistorial").DataTable({
        responsive: true,
        language: { url: "https://cdn.datatables.net/plug-ins/2.3.2/i18n/es-ES.json" },
        order: [[0, "desc"]]
    });
}

function pick(obj, camel, pascal) {
    return (obj && obj[camel] !== undefined) ? obj[camel] : (obj ? obj[pascal] : undefined);
}

function tipoViajeLabel(v) {
    const x = (v ?? "").toString().toLowerCase();
    switch (x) {
        case "ida-manana": return "Ida Mañana";
        case "ida-tarde": return "Ida Tarde";
        case "vuelta-manana": return "Vuelta Mañana";
        case "vuelta-tarde": return "Vuelta Tarde";
        default: return v ?? "";
    }
}

function isoDateOnly(v) {
    if (!v) return "";
    return v.toString().substring(0, 10);
}

function renderTabla(rows) {
    initTablaSiNoExiste();
    tabla.clear();

    rows.forEach(r => {
        const fecha = pick(r, "fecha", "Fecha");
        const escuela = pick(r, "escuela", "Escuela");
        const placaBuseta = pick(r, "placaBuseta", "PlacaBuseta");
        const nombreConductor = pick(r, "nombreConductor", "NombreConductor");
        const tipoViaje = pick(r, "tipoViaje", "TipoViaje");
        const nombre = pick(r, "nombre", "Nombre");
        const apellidos = pick(r, "apellidos", "Apellidos");
        const seccion = pick(r, "seccion", "Seccion");
        const estado = pick(r, "estado", "Estado");

        const busetaTxt = placaBuseta
            ? `${placaBuseta} - ${nombreConductor ?? ""}`.trim()
            : "";

        tabla.row.add([
            isoDateOnly(fecha),
            escuela ?? "",
            busetaTxt,
            tipoViajeLabel(tipoViaje),
            nombre ?? "",
            apellidos ?? "",
            seccion ?? "",
            estado ?? ""
        ]);
    });

    tabla.draw();
}

function actualizarResumen(rows) {
    const estadoNorm = (x) => ((pick(x, "estado", "Estado") ?? "").toString().toLowerCase());

    $("#cardTotal").text(rows.length);
    $("#cardRecogidos").text(rows.filter(x => estadoNorm(x) === "recogido").length);
    $("#cardNoViaja").text(rows.filter(x => estadoNorm(x) === "noviaja").length);
    $("#cardPendientes").text(rows.filter(x => estadoNorm(x) === "pendiente").length);
}

function leerFiltros() {
    const fecha = $("#filtroFecha").val();
    const institucionId = $("#filtroEscuela").val();
    const busetaId = $("#filtroBuseta").val();
    const tipoViaje = $("#filtroTipo").val();

    return {
        fecha,
        institucionId: institucionId ? parseInt(institucionId, 10) : null,
        busetaId: busetaId ? parseInt(busetaId, 10) : null,
        tipoViaje: tipoViaje ? tipoViaje.trim() : null
    };
}

function aplicarFiltros() {
    const f = leerFiltros();

    if (!f.fecha) {
        SwalNotify("warning", "Fecha requerida", "Debe seleccionar una fecha para consultar el historial.");
        return;
    }

    const params = new URLSearchParams();
    params.set("fecha", f.fecha);

    if (f.institucionId) params.set("institucionId", f.institucionId.toString());
    if (f.busetaId) params.set("busetaId", f.busetaId.toString());
    if (f.tipoViaje) params.set("tipoViaje", f.tipoViaje);

    fetch(`/Asistencia/BuscarHistorial?${params.toString()}`)
        .then(async resp => {
            const json = await resp.json().catch(() => null);

            if (!resp.ok || !json || json.ok !== true) {
                SwalNotify("error", "Error", json?.message || "No se pudo cargar el historial.");
                return;
            }

            ultimoData = json.data || [];
            renderTabla(ultimoData);
            actualizarResumen(ultimoData);
        })
        .catch(() => SwalNotify("error", "Error", "Ocurrió un error al consultar el historial."));
}

function csvCell(v) {
    const s = (v ?? "").toString().replace(/"/g, '""');
    return `"${s}"`;
}

function exportarCSV() {
    if (!ultimoData || ultimoData.length === 0) {
        SwalNotify("info", "Sin datos", "No hay datos para exportar.");
        return;
    }

    let csv = "Fecha,Escuela,Buseta,TipoViaje,Nombre,Apellidos,Seccion,Estado\n";

    ultimoData.forEach(r => {
        const fecha = isoDateOnly(pick(r, "fecha", "Fecha"));
        const escuela = pick(r, "escuela", "Escuela") ?? "";
        const placaBuseta = pick(r, "placaBuseta", "PlacaBuseta");
        const nombreConductor = pick(r, "nombreConductor", "NombreConductor");
        const tipoViaje = pick(r, "tipoViaje", "TipoViaje") ?? "";
        const nombre = pick(r, "nombre", "Nombre") ?? "";
        const apellidos = pick(r, "apellidos", "Apellidos") ?? "";
        const seccion = pick(r, "seccion", "Seccion") ?? "";
        const estado = pick(r, "estado", "Estado") ?? "";

        const busetaTxt = placaBuseta
            ? `${placaBuseta} - ${nombreConductor ?? ""}`.trim()
            : "";

        csv += [
            csvCell(fecha),
            csvCell(escuela),
            csvCell(busetaTxt),
            csvCell(tipoViaje),
            csvCell(nombre),
            csvCell(apellidos),
            csvCell(seccion),
            csvCell(estado)
        ].join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "historial-asistencia.csv";
    a.click();
}

document.addEventListener("DOMContentLoaded", () => {
    const hoy = new Date().toISOString().split("T")[0];
    $("#filtroFecha").val(hoy);

    $("#btnAplicar").on("click", aplicarFiltros);
    $("#btnExportar").on("click", exportarCSV);

    aplicarFiltros();
});
