if ($.fn.dataTable) {
    $.fn.dataTable.ext.errMode = 'none';
}

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

function resetEscuelaUI(escuelaId) {
    const busetaSelect = document.getElementById(`buseta-${escuelaId}`);
    const tipoViajeSelect = document.getElementById(`tipoViaje-${escuelaId}`);
    const alerta = document.getElementById(`alerta-filtros-${escuelaId}`);
    const contenedorTabla = document.getElementById(`tabla-container-${escuelaId}`);
    const tablaId = `tablaAsistencia-${escuelaId}`;
    const $tabla = $(`#${tablaId}`);
    const tbody = document.querySelector(`#${tablaId} tbody`);

    if (busetaSelect) {
        busetaSelect.value = "";
    }

    if (tipoViajeSelect) {
        tipoViajeSelect.value = "";
    }

    if (alerta) {
        alerta.innerHTML = `
            <p class="text-muted">
                ⚠️ Para ver la lista de estudiantes, seleccione una buseta y aplique los filtros.
            </p>`;
        alerta.classList.remove("d-none");
    }

    if (contenedorTabla) {
        contenedorTabla.classList.add("d-none");
    }

    if ($.fn.DataTable && $.fn.DataTable.isDataTable($tabla)) {
        $tabla.DataTable().clear().destroy();
    }

    if (tbody) {
        tbody.innerHTML = "";
    }

    marcarEscuelaClean(escuelaId);
    asistenciaBusetaActual[escuelaId] = null;
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

function cargarEstudiantesParaEscuela(escuelaId, busetaId, tipoViaje) {
    const tablaId = `tablaAsistencia-${escuelaId}`;
    const $tabla = $(`#${tablaId}`);

    if ($.fn.DataTable && $.fn.DataTable.isDataTable($tabla)) {
        $tabla.DataTable().clear().destroy();
    }

    $.getJSON("/Asistencia/ObtenerEstudiantes", {
        institucionId: escuelaId,
        busetaId: busetaId
    })
        .done(function (respEstudiantes) {
            if (!respEstudiantes || respEstudiantes.ok !== true) {
                const msg = respEstudiantes && respEstudiantes.message
                    ? respEstudiantes.message
                    : "No se pudo cargar la lista de estudiantes.";
                SwalNotify("error", "Error", msg);
                return;
            }

            const estudiantes = respEstudiantes.data || [];
            const tablaBody = document.querySelector(`#${tablaId} tbody`);
            const alerta = document.getElementById(`alerta-filtros-${escuelaId}`);
            const contenedorTabla = document.getElementById(`tabla-container-${escuelaId}`);

            if (!tablaBody || !alerta || !contenedorTabla) {
                console.error("No se encontró la estructura de tabla para la escuela " + escuelaId);
                SwalNotify("error", "Error", "No se encontró la tabla de asistencia para esta institución.");
                return;
            }

            $.getJSON("/Asistencia/ObtenerEstados", {
                institucionId: escuelaId,
                busetaId: busetaId,
                tipoViaje: tipoViaje
            })
                .done(function (respEstados) {
                    const estadosGuardados = (respEstados && respEstados.ok === true)
                        ? (respEstados.data || [])
                        : [];

                    const mapaEstados = {};
                    estadosGuardados.forEach(e => {
                        mapaEstados[e.idEstudiante ?? e.IdEstudiante] = (e.estado ?? e.Estado);
                    });

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
                            tr.dataset.idEstudiante = e.idEstudiante;

                            const estadoInicial = (mapaEstados[e.idEstudiante] || "pendiente").toLowerCase();

                            tr.innerHTML = `
                                <td>${e.nombre}</td>
                                <td>${e.apellidos}</td>
                                <td>${e.seccion ?? ""}</td>
                                <td>
                                    <select class="asistencia-select asistencia-estado-select">
                                        <option value="pendiente" ${estadoInicial === "pendiente" ? "selected" : ""}>Pendiente</option>
                                        <option value="recogido" ${estadoInicial === "recogido" ? "selected" : ""}>Ya se recogió</option>
                                        <option value="noViaja"  ${estadoInicial === "noviaja" ? "selected" : ""}>No viaja</option>
                                    </select>
                                </td>
                            `;
                            tablaBody.appendChild(tr);
                        });
                    }

                    alerta.classList.add("d-none");
                    contenedorTabla.classList.remove("d-none");

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
                .fail(function () {
                    // Si falla la carga de estados, simplemente mostramos todo en "pendiente"
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
                            tr.dataset.idEstudiante = e.idEstudiante;
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
                });
        })
        .fail(function (jqXHR) {
            let msg = "Ocurrió un error al consultar los estudiantes.";
            if (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.message) {
                msg = jqXHR.responseJSON.message;
            }
            SwalNotify("error", "Error", msg);
        });
}

function aplicarFiltros(escuelaId) {
    const busetaSelect = document.getElementById(`buseta-${escuelaId}`);
    const tipoViajeSelect = document.getElementById(`tipoViaje-${escuelaId}`);

    if (!busetaSelect) {
        console.error("No se encontró el select de buseta para la escuela " + escuelaId);
        SwalNotify("error", "Error", "No se pudo encontrar el selector de buseta.");
        return;
    }

    const busetaId = busetaSelect.value;

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

    if (!tipoViajeSelect) {
        SwalNotify("error", "Error", "No se encontró el selector de tipo de viaje.");
        return;
    }

    const tipoViaje = tipoViajeSelect.value;
    if (!tipoViaje) {
        SwalNotify(
            "warning",
            "Tipo de viaje requerido",
            "Debe seleccionar un tipo de viaje antes de aplicar los filtros."
        );
        return;
    }

    const busetaActual = asistenciaBusetaActual[escuelaId] || null;
    const hayCambios = asistenciaDirtyState[escuelaId] === true;

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
                    marcarEscuelaClean(escuelaId);
                    cargarEstudiantesParaEscuela(escuelaId, busetaId, tipoViaje);
                } else {
                    if (cambiandoBuseta) {
                        busetaSelect.value = busetaActual;
                    }
                }
            });
        });

        return;
    }

    // Caso normal
    cargarEstudiantesParaEscuela(escuelaId, busetaId, tipoViaje);
}

function guardarAsistencia(escuelaId) {
    const tablaId = `tablaAsistencia-${escuelaId}`;
    const tabla = document.getElementById(tablaId);
    const busetaSelect = document.getElementById(`buseta-${escuelaId}`);
    const tipoViajeSelect = document.getElementById(`tipoViaje-${escuelaId}`);

    if (!tabla || !busetaSelect) {
        SwalNotify("error", "Error", "No se encontró la tabla o el selector de buseta.");
        return;
    }

    const busetaId = busetaSelect.value;
    if (!busetaId) {
        SwalNotify("warning", "Buseta requerida", "Debe seleccionar una buseta antes de guardar la asistencia.");
        return;
    }

    if (!tipoViajeSelect) {
        SwalNotify("error", "Error", "No se encontró el selector de tipo de viaje.");
        return;
    }

    const tipoViaje = tipoViajeSelect.value;
    if (!tipoViaje) {
        SwalNotify(
            "warning",
            "Tipo de viaje requerido",
            "Debe seleccionar un tipo de viaje antes de guardar la asistencia."
        );
        return;
    }

    const filas = tabla.querySelectorAll("tbody tr");
    const detalles = [];

    filas.forEach(tr => {
        const idEstudianteStr = tr.dataset.idEstudiante;
        if (!idEstudianteStr) {
            return;
        }

        const idEstudiante = parseInt(idEstudianteStr, 10);
        if (Number.isNaN(idEstudiante)) return;

        const selectEstado = tr.querySelector(".asistencia-estado-select");
        const estado = selectEstado ? selectEstado.value : "pendiente";

        detalles.push({
            idEstudiante: idEstudiante,
            estado: estado,
            observaciones: null
        });
    });

    if (detalles.length === 0) {
        SwalNotify(
            "warning",
            "Sin estudiantes",
            "No hay estudiantes para guardar asistencia en esta buseta."
        );
        return;
    }

    const payload = {
        idInstitucion: escuelaId,
        idBuseta: parseInt(busetaId, 10),
        tipoViaje: tipoViaje,
        detalles: detalles
    };

    ensureSwalReady(() => {
        Swal.fire({
            icon: "question",
            title: "Confirmar guardado",
            text: "¿Deseas guardar la asistencia actual para esta buseta?",
            showCancelButton: true,
            confirmButtonText: "Sí, guardar",
            cancelButtonText: "Cancelar"
        }).then(result => {
            if (!result.isConfirmed) return;

            fetch("/Asistencia/GuardarAsistencia", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            })
                .then(async resp => {
                    const data = await resp.json().catch(() => null);

                    if (!resp.ok || !data || data.ok !== true) {
                        const msg = data?.message || "No se pudo guardar la asistencia.";
                        SwalNotify("error", "Error", msg);
                        return;
                    }

                    marcarEscuelaClean(escuelaId);

                    Swal.fire({
                        icon: "success",
                        title: "Asistencia guardada",
                        text: "La asistencia se guardó correctamente.",
                        confirmButtonText: "OK"
                    }).then(() => {
                        resetEscuelaUI(escuelaId);
                    });
                })
                .catch(() => {
                    SwalNotify("error", "Error", "Ocurrió un error al enviar la asistencia.");
                });
        });
    });
}

window.aplicarFiltros = aplicarFiltros;
window.guardarAsistencia = guardarAsistencia;