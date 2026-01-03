// -*- coding: utf-8 -*-
/**
NOTE: This file MUST be saved as UTF-8 with BOM to display Spanish characters correctly
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        apiBase: window.API_BASE || 'https://localhost:7238',
        endpoints: {
            instituciones: '/api/v1/instituciones',
            estudiantes: (id) => `/api/v1/instituciones/${id}/estudiantes`,
            horarios: '/api/v1/horarios'
        },
        colors: [
            { gradient: 'linear-gradient(135deg, var(--tm-primary) 0%, var(--tm-primary-light) 100%)', icon: 'bi-building' },
            { gradient: 'linear-gradient(135deg, var(--tm-secondary) 0%, var(--tm-secondary-light) 100%)', icon: 'bi-mortarboard' },
            { gradient: 'linear-gradient(135deg, var(--tm-info) 0%, var(--tm-info-light) 100%)', icon: 'bi-book' },
            { gradient: 'linear-gradient(135deg, var(--tm-accent) 0%, var(--tm-accent-light) 100%)', icon: 'bi-backpack' }
        ],
        // Spanish text constants (ensures consistent encoding)
        text: {
            dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
            loading: 'Cargando...',
            loadingStudents: 'Cargando estudiantes...',
            noStudents: 'No hay estudiantes registrados',
            noStudentsHint: 'Los estudiantes aparecerán aquí cuando se registren',
            noSchools: 'No hay escuelas registradas',
            noSchoolsHint: 'Haga clic en "Nueva Escuela" para agregar una',
            connectionError: 'Error de conexión',
            connectionErrorMsg: 'No se pudieron cargar los datos',
            retry: 'Reintentar',
            section: 'Sección',
            student: 'Estudiante',
            actions: 'Acciones',
            entrada: 'Entrada',
            salida: 'Salida',
            save: 'Guardar',
            cancel: 'Cancelar',
            saving: 'Guardando...',
            saved: '¡Guardado!',
            savedMsg: 'Horarios actualizados correctamente',
            saveError: 'No se pudieron guardar los horarios. Intente nuevamente.',
            confirmSave: '¿Guardar horarios?',
            confirmSaveMsg: (count) => `Se guardarán ${count} horario(s) para este estudiante`,
            noChanges: 'Sin cambios',
            noChangesMsg: 'No se detectaron horarios para guardar',
            invalidFormat: 'Formato inválido',
            invalidFormatMsg: 'Use el formato HH:MM para los horarios',
            schoolCreated: '¡Escuela creada!',
            schoolCreatedMsg: (name) => `"${name}" se agregó correctamente`,
            schoolCreateError: 'No se pudo crear la escuela',
            fieldRequired: 'Campo requerido',
            enterSchoolName: 'Ingrese el nombre de la escuela',
            studentIdNotFound: 'ID de estudiante no encontrado'
        }
    };

    // ============================================
    // STATE
    // ============================================
    let state = {
        instituciones: [],
        totalEstudiantes: 0,
        isLoading: false
    };

    // ============================================
    // DOM ELEMENTS
    // ============================================
    const DOM = {
        contenedorEscuelas: () => document.getElementById('contenedor-escuelas'),
        statsTotal: () => document.getElementById('stats-total-escuelas'),
        statsEstudiantes: () => document.getElementById('stats-total-estudiantes'),
        modalEscuela: () => document.getElementById('modalEscuela'),
        inputNombreEscuela: () => document.getElementById('nombreEscuela'),
        btnGuardarEscuela: () => document.getElementById('btnGuardarEscuela'),
        loadingOverlay: () => document.getElementById('loading-overlay')
    };

    // ============================================
    // UTILITIES
    // ============================================

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeAttr(str) {
        if (str == null) return '';
        return String(str)
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function isValidTime(time) {
        if (!time) return true;
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
    }

    function showLoading(show = true) {
        state.isLoading = show;
        const overlay = DOM.loadingOverlay();
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    function showToast(type, title, message = '') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        Toast.fire({ icon: type, title: title, text: message });
    }

    // ============================================
    // API FUNCTIONS
    // ============================================

    async function fetchInstituciones() {
        const response = await fetch(`${CONFIG.apiBase}${CONFIG.endpoints.instituciones}`);
        if (!response.ok) {
            throw new Error(`Error fetching instituciones: ${response.status}`);
        }
        return await response.json();
    }

    async function fetchEstudiantes(idInstitucion) {
        const response = await fetch(`${CONFIG.apiBase}${CONFIG.endpoints.estudiantes(idInstitucion)}`);
        if (!response.ok) {
            console.warn(`Could not fetch students for institution ${idInstitucion}`);
            return [];
        }
        return await response.json();
    }

    async function createInstitucion(nombre) {
        const response = await fetch(`${CONFIG.apiBase}${CONFIG.endpoints.instituciones}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ idInstitucion: 0, nombre })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Error creating institution');
        }
        return await response.json();
    }

    async function updateHorario(idEstudiante, diaSemana, horaEntrada, horaSalida) {
        const response = await fetch(`${CONFIG.apiBase}${CONFIG.endpoints.horarios}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                idEstudiante: parseInt(idEstudiante, 10),
                diaSemana,
                horaEntrada,
                horaSalida
            })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Error updating schedule: ${error || response.statusText}`);
        }
        return response;
    }

    // ============================================
    // UI RENDERING
    // ============================================

    function updateStats() {
        const statsEscuelas = DOM.statsTotal();
        const statsEstudiantes = DOM.statsEstudiantes();

        if (statsEscuelas) {
            statsEscuelas.textContent = state.instituciones.length;
        }
        if (statsEstudiantes) {
            statsEstudiantes.textContent = state.totalEstudiantes;
        }
    }

    function createSchoolCard(institucion, colorIndex) {
        const color = CONFIG.colors[colorIndex % CONFIG.colors.length];
        const T = CONFIG.text;

        // Generate sub-header cells for Entrada/Salida
        const subHeaderCells = T.dias.map(() => `
            <th class="text-center header-entrada">${T.entrada}</th>
            <th class="text-center header-salida">${T.salida}</th>
        `).join('');

        return `
            <div class="tm-card tm-school-card" data-id="${institucion.idInstitucion}">
                <div class="tm-card-header tm-school-header" style="background: ${color.gradient}; color: white;">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi ${color.icon}"></i>
                        <span class="fw-semibold">${escapeHtml(institucion.nombre)}</span>
                    </div>
                    <span class="tm-badge tm-badge-light" id="badge-count-${institucion.idInstitucion}">
                        <i class="bi bi-people-fill me-1"></i>
                        <span>0</span>
                    </span>
                </div>
                <div class="tm-card-body p-0">
                    <div class="table-responsive">
                        <table id="tabla-inst-${institucion.idInstitucion}" class="table table-hover mb-0 tm-schedule-table">
                            <thead>
                                <tr class="header-days">
                                    <th rowspan="2" class="text-center align-middle" style="width: 80px;">${T.section}</th>
                                    <th rowspan="2" class="align-middle">${T.student}</th>
                                    <th colspan="2" class="text-center header-day">${T.dias[0]}</th>
                                    <th colspan="2" class="text-center header-day">${T.dias[1]}</th>
                                    <th colspan="2" class="text-center header-day">${T.dias[2]}</th>
                                    <th colspan="2" class="text-center header-day">${T.dias[3]}</th>
                                    <th colspan="2" class="text-center header-day">${T.dias[4]}</th>
                                    <th rowspan="2" class="text-center align-middle" style="width: 100px;">${T.actions}</th>
                                </tr>
                                <tr class="header-times">
                                    ${subHeaderCells}
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="loading-row">
                                    <td colspan="14" class="text-center py-4">
                                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">${T.loading}</span>
                                        </div>
                                        <span class="ms-2 tm-text-muted">${T.loadingStudents}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function createStudentRow(alumno) {
        const T = CONFIG.text;

        const diasHtml = T.dias.map(dia => {
            const horario = alumno.horarios[dia];
            const entrada = horario?.entrada || '';
            const salida = horario?.salida || '';
            return `
                <td class="text-center schedule-cell schedule-entrada" data-dia="${dia}" data-tipo="entrada" data-value="${escapeAttr(entrada)}">
                    ${entrada || '<span class="tm-text-muted">—</span>'}
                </td>
                <td class="text-center schedule-cell schedule-salida" data-dia="${dia}" data-tipo="salida" data-value="${escapeAttr(salida)}">
                    ${salida || '<span class="tm-text-muted">—</span>'}
                </td>
            `;
        }).join('');

        return `
            <tr data-id-estudiante="${alumno.idEstudiante}">
                <td class="text-center">
                    <span class="tm-badge tm-badge-primary">${escapeHtml(alumno.seccion)}</span>
                </td>
                <td class="fw-medium">${escapeHtml(alumno.nombreCompleto)}</td>
                ${diasHtml}
                <td class="text-center">
                    <div class="tm-action-buttons">
                        <button type="button" class="tm-btn tm-btn-sm tm-btn-ghost btn-edit" title="Editar horario">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="tm-btn tm-btn-sm tm-btn-ghost btn-save" title="${T.save}" style="display: none;">
                            <i class="bi bi-check-lg tm-text-success"></i>
                        </button>
                        <button type="button" class="tm-btn tm-btn-sm tm-btn-ghost btn-cancel" title="${T.cancel}" style="display: none;">
                            <i class="bi bi-x-lg tm-text-danger"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    function createEmptyState(institucionId) {
        const T = CONFIG.text;
        return `
            <tr>
                <td colspan="14" class="text-center py-5">
                    <div class="tm-empty-state">
                        <i class="bi bi-inbox fs-1 tm-text-muted"></i>
                        <p class="mt-2 mb-0 tm-text-muted">${T.noStudents}</p>
                        <small class="tm-text-light">${T.noStudentsHint}</small>
                    </div>
                </td>
            </tr>
        `;
    }

    async function renderInstituciones() {
        const container = DOM.contenedorEscuelas();
        if (!container) return;

        container.innerHTML = '';
        state.totalEstudiantes = 0;
        const T = CONFIG.text;

        if (state.instituciones.length === 0) {
            container.innerHTML = `
                <div class="tm-card">
                    <div class="tm-card-body text-center py-5">
                        <i class="bi bi-building fs-1 tm-text-muted"></i>
                        <h5 class="mt-3 tm-text-muted">${T.noSchools}</h5>
                        <p class="tm-text-light">${T.noSchoolsHint}</p>
                    </div>
                </div>
            `;
            updateStats();
            return;
        }

        state.instituciones.forEach((inst, index) => {
            container.insertAdjacentHTML('beforeend', createSchoolCard(inst, index));
        });

        for (const inst of state.instituciones) {
            await loadStudentsForInstitution(inst.idInstitucion);
        }

        updateStats();
    }

    async function loadStudentsForInstitution(idInstitucion) {
        try {
            const rows = await fetchEstudiantes(idInstitucion);
            const tbody = document.querySelector(`#tabla-inst-${idInstitucion} tbody`);

            if (!tbody) return;

            const alumnos = new Map();
            for (const r of rows) {
                const id = r.idEstudiante ?? r.id_estudiante ?? r.id;
                if (!alumnos.has(id)) {
                    alumnos.set(id, {
                        idEstudiante: id,
                        seccion: r.seccion ?? '',
                        nombreCompleto: r.nombreCompleto ?? r.nombre_completo ?? '',
                        horarios: {}
                    });
                }
                const alumno = alumnos.get(id);
                const dia = String(r.diaSemana ?? r.dia_semana ?? '').trim();
                if (dia) {
                    alumno.horarios[dia] = {
                        entrada: r.horaEntrada ?? r.hora_entrada ?? '',
                        salida: r.horaSalida ?? r.hora_salida ?? ''
                    };
                }
            }

            tbody.innerHTML = '';

            if (alumnos.size === 0) {
                tbody.innerHTML = createEmptyState(idInstitucion);
            } else {
                for (const alumno of alumnos.values()) {
                    tbody.insertAdjacentHTML('beforeend', createStudentRow(alumno));
                }
                state.totalEstudiantes += alumnos.size;

                const badge = document.querySelector(`#badge-count-${idInstitucion} span`);
                if (badge) {
                    badge.textContent = alumnos.size;
                }

                // Initialize DataTable with updated column count
                // Columns: Sección(0), Estudiante(1), Lun-Ent(2), Lun-Sal(3), Mar-Ent(4), Mar-Sal(5), 
                //          Mie-Ent(6), Mie-Sal(7), Jue-Ent(8), Jue-Sal(9), Vie-Ent(10), Vie-Sal(11), Acciones(12)
                if (typeof initDataTable === 'function') {
                    initDataTable(`tabla-inst-${idInstitucion}`, [12], {
                        pageLength: 10,
                        ordering: true,
                        order: [[0, 'asc'], [1, 'asc']]
                    });
                }
            }

            attachRowEventListeners(tbody);

        } catch (error) {
            console.error(`Error loading students for institution ${idInstitucion}:`, error);
        }
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    function attachRowEventListeners(tbody) {
        tbody.querySelectorAll('tr[data-id-estudiante]').forEach(row => {
            const btnEdit = row.querySelector('.btn-edit');
            const btnSave = row.querySelector('.btn-save');
            const btnCancel = row.querySelector('.btn-cancel');

            if (btnEdit) {
                btnEdit.addEventListener('click', () => handleEditRow(row));
            }
            if (btnSave) {
                btnSave.addEventListener('click', () => handleSaveRow(row));
            }
            if (btnCancel) {
                btnCancel.addEventListener('click', () => handleCancelEdit(row));
            }
        });
    }

    function handleEditRow(row) {
        const cells = row.querySelectorAll('.schedule-cell');

        cells.forEach(cell => {
            if (cell.querySelector('input')) return;

            const value = cell.dataset.value || '';
            const tipo = cell.dataset.tipo;

            cell.innerHTML = `
                <input type="time" class="form-control form-control-sm hora-${tipo}" value="${escapeAttr(value)}">
            `;
        });

        row.querySelector('.btn-edit').style.display = 'none';
        row.querySelector('.btn-save').style.display = 'inline-flex';
        row.querySelector('.btn-cancel').style.display = 'inline-flex';
    }

    function handleCancelEdit(row) {
        const cells = row.querySelectorAll('.schedule-cell');

        cells.forEach(cell => {
            const value = cell.dataset.value || '';
            cell.innerHTML = value || '<span class="tm-text-muted">—</span>';
        });

        row.querySelector('.btn-edit').style.display = 'inline-flex';
        row.querySelector('.btn-save').style.display = 'none';
        row.querySelector('.btn-cancel').style.display = 'none';
    }

    async function handleSaveRow(row) {
        const T = CONFIG.text;
        const idEstudiante = row.dataset.idEstudiante;

        if (!idEstudiante) {
            showToast('error', 'Error', T.studentIdNotFound);
            return;
        }

        // Group cells by day
        const horariosPorDia = {};
        const cells = row.querySelectorAll('.schedule-cell');

        cells.forEach(cell => {
            const input = cell.querySelector('input');
            if (!input) return;

            const dia = cell.dataset.dia;
            const tipo = cell.dataset.tipo;
            const value = input.value?.trim() || '';

            if (!horariosPorDia[dia]) {
                horariosPorDia[dia] = { entrada: '', salida: '', cells: {} };
            }
            horariosPorDia[dia][tipo] = value;
            horariosPorDia[dia].cells[tipo] = cell;
        });

        const changes = [];
        for (const [dia, data] of Object.entries(horariosPorDia)) {
            if (data.entrada || data.salida) {
                changes.push({
                    dia,
                    entrada: data.entrada,
                    salida: data.salida,
                    cells: data.cells
                });
            }
        }

        if (changes.length === 0) {
            showToast('info', T.noChanges, T.noChangesMsg);
            return;
        }

        const invalidChanges = changes.filter(c => !isValidTime(c.entrada) || !isValidTime(c.salida));
        if (invalidChanges.length > 0) {
            showToast('error', T.invalidFormat, T.invalidFormatMsg);
            return;
        }

        const result = await Swal.fire({
            title: T.confirmSave,
            html: T.confirmSaveMsg(changes.length),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `<i class="bi bi-check-lg me-1"></i> ${T.save}`,
            cancelButtonText: T.cancel,
            confirmButtonColor: 'var(--tm-secondary)',
            cancelButtonColor: 'var(--tm-text-muted)'
        });

        if (!result.isConfirmed) return;

        try {
            Swal.fire({
                title: T.saving,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            await Promise.all(changes.map(c =>
                updateHorario(idEstudiante, c.dia, c.entrada, c.salida)
            ));

            changes.forEach(c => {
                if (c.cells.entrada) {
                    c.cells.entrada.dataset.value = c.entrada;
                    c.cells.entrada.innerHTML = c.entrada || '<span class="tm-text-muted">—</span>';
                }
                if (c.cells.salida) {
                    c.cells.salida.dataset.value = c.salida;
                    c.cells.salida.innerHTML = c.salida || '<span class="tm-text-muted">—</span>';
                }
            });

            row.querySelector('.btn-edit').style.display = 'inline-flex';
            row.querySelector('.btn-save').style.display = 'none';
            row.querySelector('.btn-cancel').style.display = 'none';

            Swal.fire({
                icon: 'success',
                title: T.saved,
                text: T.savedMsg,
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error saving schedules:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: T.saveError
            });
        }
    }

    async function handleSaveEscuela() {
        const T = CONFIG.text;
        const input = DOM.inputNombreEscuela();
        const nombre = input?.value?.trim();

        if (!nombre) {
            showToast('warning', T.fieldRequired, T.enterSchoolName);
            input?.focus();
            return;
        }

        try {
            const btnGuardar = DOM.btnGuardarEscuela();
            if (btnGuardar) {
                btnGuardar.disabled = true;
                btnGuardar.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> ${T.saving}`;
            }

            await createInstitucion(nombre);

            const modal = bootstrap.Modal.getInstance(DOM.modalEscuela());
            modal?.hide();
            input.value = '';

            showToast('success', T.schoolCreated, T.schoolCreatedMsg(nombre));

            await loadData();

        } catch (error) {
            console.error('Error creating school:', error);
            showToast('error', 'Error', T.schoolCreateError);
        } finally {
            const btnGuardar = DOM.btnGuardarEscuela();
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = `<i class="bi bi-check-lg me-1"></i> ${T.save}`;
            }
        }
    }

    // ============================================
    // MAIN FUNCTIONS
    // ============================================

    async function loadData() {
        const T = CONFIG.text;
        try {
            showLoading(true);
            state.instituciones = await fetchInstituciones();
            await renderInstituciones();
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('error', T.connectionError, T.connectionErrorMsg);

            const container = DOM.contenedorEscuelas();
            if (container) {
                container.innerHTML = `
                    <div class="tm-card">
                        <div class="tm-card-body text-center py-5">
                            <i class="bi bi-wifi-off fs-1 tm-text-danger"></i>
                            <h5 class="mt-3">${T.connectionError}</h5>
                            <p class="tm-text-muted">${T.connectionErrorMsg}</p>
                            <button class="tm-btn tm-btn-primary" onclick="Principal.reload()">
                                <i class="bi bi-arrow-clockwise me-1"></i> ${T.retry}
                            </button>
                        </div>
                    </div>
                `;
            }
        } finally {
            showLoading(false);
        }
    }

    function init() {
        const btnGuardar = DOM.btnGuardarEscuela();
        if (btnGuardar) {
            btnGuardar.addEventListener('click', handleSaveEscuela);
        }

        const inputNombre = DOM.inputNombreEscuela();
        if (inputNombre) {
            inputNombre.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSaveEscuela();
                }
            });
        }

        loadData();
    }

    // ============================================
    // PUBLIC API
    // ============================================
    window.Principal = {
        init,
        reload: loadData
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();