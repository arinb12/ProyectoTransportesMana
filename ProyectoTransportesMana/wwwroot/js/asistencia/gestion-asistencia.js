const asistenciaDirtyState = {}; 
const asistenciaBusetaActual = {}; 

function marcarEscuelaDirty(escuelaId) {
    asistenciaDirtyState[escuelaId] = true;

    const bloque = document.querySelector(`.asistencia-bloque[data-escuela-id="${escuelaId}"]`);
    if (bloque) {
        bloque.classList.add("asistencia-bloque-dirty");
    }
}

function marcarEscuelaClean(escuelaId) {
    asistenciaDirtyState[escuelaId] = false;

    const bloque = document.querySelector(`.asistencia-bloque[data-escuela-id="${escuelaId}"]`);
    if (bloque) {
        bloque.classList.remove("asistencia-bloque-dirty");
    }
}

$(document).ready(function () {
    document.body.addEventListener("change", (event) => {
        const select = event.target;
        if (!select.classList.contains("asistencia-estado-select")) return;

        const tr = select.closest("tr");
        if (!tr) return;

        tr.classList.remove("asistencia-row-updated");
        void tr.offsetWidth;
        tr.classList.add("asistencia-row-updated");

        const tabla = tr.closest("table");
        if (tabla && tabla.id && tabla.id.startsWith("tablaAsistencia-")) {
            const idStr = tabla.id.replace("tablaAsistencia-", "");
            const escuelaId = parseInt(idStr, 10);
            if (!Number.isNaN(escuelaId)) {
                marcarEscuelaDirty(escuelaId);
            }
        }
    });

    window.addEventListener("beforeunload", function (e) {
        const hayCambios = Object.values(asistenciaDirtyState).some(v => v === true);
        if (!hayCambios) return;

        e.preventDefault();
        e.returnValue = "";
    });
});


// =============================================
// Función interna: carga estudiantes y arma la tabla
// =============================================
function cargarEstudiantesParaEscuela(escuelaId, busetaId) {
    const tablaId = `tablaAsistencia-${escuelaId}`;
    const $tabla = $(`#${tablaId}`);

    if ($.fn.DataTable && $.fn.DataTable.isDataTable($tabla)) {
        $tabla.DataTable().clear().destroy();
    }

    $.getJSON("/Asistencia/ObtenerEstudiantes", {
        institucionId: escuelaId,
        busetaId: busetaId
    })
        .done(function (resp) {
            if (!resp || resp.ok !== true) {
                const msg = resp && resp.message
                    ? resp.message
                    : "No se pudo cargar la lista de estudiantes.";
                SwalNotify("error", "Error", msg);
                return;
            }

            const estudiantes = resp.data || [];
            const tablaBody = document.querySelector(`#${tablaId} tbody`);
            const alerta = document.getElementById(`alerta-filtros-${escuelaId}`);
            const contenedorTabla = document.getElementById(`tabla-container-${escuelaId}`);
            const tipoViajeWrapper = document.getElementById(`tipoViaje-wrapper-${escuelaId}`);

            if (!tablaBody || !alerta || !contenedorTabla) {
                console.error("No se encontró la estructura de tabla para la escuela " + escuelaId);
                SwalNotify("error", "Error", "No se encontró la tabla de asistencia para esta institución.");
                return;
            }

            tablaBody.innerHTML = "";

            if (estudiantes.length === 0) {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td colspan="4" class="text-center text-muted">
                        No hay estudiantes asignados a esta buseta en esta institución.
                    </td>`;
                tablaBody.appendChild(tr);
            } else {
                estudiantes.forEach(e => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${e.nombre}</td>
                        <td>${e.apellidos}</td>
                        <td>${e.seccion ?? ""}</td>
                        <td>
                            <select class="asistencia-select asistencia-estado-select">
                                <option value="pendiente" selected>Pendiente</option>
                                <option value="recogido">Ya se recogió</option>
                                <option value="noViaja">No viaja</option>
                            </select>
                        </td>
                    `;
                    tablaBody.appendChild(tr);
                });
            }

            alerta.classList.add("d-none");
            contenedorTabla.classList.remove("d-none");

            if (tipoViajeWrapper) {
                tipoViajeWrapper.classList.remove("d-none");
            }

            marcarEscuelaClean(escuelaId);
            asistenciaBusetaActual[escuelaId] = busetaId;

            if (typeof initDataTable === "function" && $.fn.DataTable) {
                const tabla = initDataTable(tablaId, [3], {
                    paging: true,
                    searching: true,
                    scrollY: 300,
                    scrollCollapse: true
                });

                setTimeout(() => {
                    try {
                        tabla.columns.adjust().responsive.recalc();
                    } catch (e) {
                        console.warn("No se pudo recalcular DataTable para " + tablaId, e);
                    }
                }, 10);
            }
        })
        .fail(function (jqXHR) {
            let msg = "Ocurrió un error al consultar los estudiantes.";
            if (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.message) {
                msg = jqXHR.responseJSON.message;
            }
            SwalNotify("error", "Error", msg);
        });
}


// =============================================
// Función: aplicarFiltros(escuelaId)
//  - Valida buseta seleccionada
//  - Si hay cambios sin guardar y se cambia de buseta, pregunta con Swal
//  - Si ok, llama a cargarEstudiantesParaEscuela(...)
// =============================================
function aplicarFiltros(escuelaId) {
    const busetaSelect = document.getElementById(`buseta-${escuelaId}`);

    if (!busetaSelect) {
        console.error("No se encontró el select de buseta para la escuela " + escuelaId);
        SwalNotify("error", "Error", "No se pudo encontrar el selector de buseta.");
        return;
    }

    const busetaId = busetaSelect.value;

    // Validar que se haya escogido una buseta en el select
    if (!busetaId) {
        const alerta = document.getElementById(`alerta-filtros-${escuelaId}`);
        if (alerta) {
            alerta.innerHTML = `<p class="text-danger">
                                    ❗ Por favor seleccione una buseta antes de aplicar los filtros.
                                </p>`;
            alerta.classList.remove("d-none");
        }

        SwalNotify(
            "warning",
            "Buseta requerida",
            "Debe seleccionar una buseta para ver la lista de estudiantes."
        );
        return;
    }

    const busetaActual = asistenciaBusetaActual[escuelaId] || null;
    const hayCambios = asistenciaDirtyState[escuelaId] === true;

    // Si hay cambios sin guardar (ya sea cambiando de buseta o recargando la misma), preguntar
    if (hayCambios && busetaActual) {
        const cambiandoBuseta = busetaActual !== busetaId;

        ensureSwalReady(() => {
            Swal.fire({
                icon: "warning",
                title: "Cambios sin guardar",
                text: cambiandoBuseta
                    ? "Tienes cambios sin guardar en la lista de asistencia. " +
                    "Si cambias de buseta se perderán esos cambios. ¿Deseas continuar?"
                    : "Tienes cambios sin guardar en la lista de asistencia. " +
                    "Si recargas la lista se perderán esos cambios. ¿Deseas continuar?",
                showCancelButton: true,
                confirmButtonText: "Sí, continuar",
                cancelButtonText: "No, mantener"
            }).then(result => {
                if (result.isConfirmed) {
                    // El usuario acepta perder los cambios
                    marcarEscuelaClean(escuelaId);
                    cargarEstudiantesParaEscuela(escuelaId, busetaId);
                } else {
                    // Si estaba intentando cambiar de buseta, revertimos el select
                    if (cambiandoBuseta) {
                        busetaSelect.value = busetaActual;
                    }
                }
            });
        });

        return;
    }

    // Caso normal: no hay cambios pendientes (o es la primera vez que se carga)
    cargarEstudiantesParaEscuela(escuelaId, busetaId);
}



// =============================================
// Función stub: guardarAsistencia(escuelaId)
// (la lógica real la haremos después)
// =============================================
function guardarAsistencia(escuelaId) {
    SwalNotify(
        "info",
        "Pendiente",
        "La funcionalidad de guardar asistencia aún no está implementada."
    );
    // marcarEscuelaClean(escuelaId);
}

window.aplicarFiltros = aplicarFiltros;
window.guardarAsistencia = guardarAsistencia;
