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
        breakpoints: {
            mobile: 768 // Below this width, use card layout
        },
        pagination: {
            mobilePageSize: 10, // Students per page on mobile
            pageSizeOptions: [5, 10, 20, 50]
        },
        colors: [
            { gradient: 'linear-gradient(135deg, var(--tm-primary) 0%, var(--tm-primary-light) 100%)', icon: 'bi-building' },
            { gradient: 'linear-gradient(135deg, var(--tm-secondary) 0%, var(--tm-secondary-light) 100%)', icon: 'bi-mortarboard' },
            { gradient: 'linear-gradient(135deg, var(--tm-info) 0%, var(--tm-info-light) 100%)', icon: 'bi-book' },
            { gradient: 'linear-gradient(135deg, var(--tm-accent) 0%, var(--tm-accent-light) 100%)', icon: 'bi-backpack' }
        ],
        text: {
            dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
            diasCortos: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
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
            studentIdNotFound: 'ID de estudiante no encontrado',
            viewSchedule: 'Ver horarios',
            editSchedule: 'Editar horarios',
            noSchedule: 'Sin horario',
            showing: 'Mostrando',
            of: 'de',
            students: 'estudiantes',
            previous: 'Anterior',
            next: 'Siguiente',
            page: 'Página',
            noResults: 'No se encontraron resultados'
        }
    };

    // ============================================
    // STATE
    // ============================================
    let state = {
        instituciones: [],
        totalEstudiantes: 0,
        isLoading: false,
        isMobile: window.innerWidth < CONFIG.breakpoints.mobile,
        // Mobile pagination state per institution
        mobilePagination: {} // { instId: { currentPage: 1, pageSize: 10, allStudents: [], filteredStudents: [] } }
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

    /**
     * Validates if a time string is in a valid format
     * Accepts: HH:MM or HH:MM:SS formats
     */
    function isValidTime(time) {
        if (!time) return true;
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    }
    function normalizeTime(time) {
        if (!time) return '';
        const trimmed = String(time).trim();

        // Match "H:MM", "HH:MM", "H:MM:SS", "HH:MM:SS"
        const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (!match) return trimmed;

        const hh = match[1].padStart(2, '0');
        const mm = match[2]; // already 2 digits
        return `${hh}:${mm}`;
    }

    function isMobileView() {
        return window.innerWidth < CONFIG.breakpoints.mobile;
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
    // PAGINATION HELPERS
    // ============================================

    function initMobilePagination(instId, students) {
        state.mobilePagination[instId] = {
            currentPage: 1,
            pageSize: CONFIG.pagination.mobilePageSize,
            allStudents: students,
            filteredStudents: students
        };
    }

    function getMobilePagination(instId) {
        return state.mobilePagination[instId] || {
            currentPage: 1,
            pageSize: CONFIG.pagination.mobilePageSize,
            allStudents: [],
            filteredStudents: []
        };
    }

    function getPagedStudents(instId) {
        const pagination = getMobilePagination(instId);
        const start = (pagination.currentPage - 1) * pagination.pageSize;
        const end = start + pagination.pageSize;
        return pagination.filteredStudents.slice(start, end);
    }

    function getTotalPages(instId) {
        const pagination = getMobilePagination(instId);
        return Math.ceil(pagination.filteredStudents.length / pagination.pageSize) || 1;
    }

    function goToPage(instId, page) {
        const pagination = getMobilePagination(instId);
        const totalPages = getTotalPages(instId);

        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        pagination.currentPage = page;
        renderMobileStudentCards(instId);
    }

    function filterMobileStudents(instId, searchTerm) {
        const pagination = getMobilePagination(instId);
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            pagination.filteredStudents = pagination.allStudents;
        } else {
            pagination.filteredStudents = pagination.allStudents.filter(student => {
                const name = (student.nombreCompleto || '').toLowerCase();
                const section = (student.seccion || '').toLowerCase();
                return name.includes(term) || section.includes(term);
            });
        }

        // Reset to first page when filtering
        pagination.currentPage = 1;
        renderMobileStudentCards(instId);
    }

    function changePageSize(instId, newSize) {
        const pagination = getMobilePagination(instId);
        pagination.pageSize = parseInt(newSize, 10);
        pagination.currentPage = 1;
        renderMobileStudentCards(instId);
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

    // ============================================
    // DESKTOP TABLE RENDERING
    // ============================================

    function createSchoolCardDesktop(institucion, colorIndex) {
        const color = CONFIG.colors[colorIndex % CONFIG.colors.length];
        const T = CONFIG.text;

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

    function createStudentRowDesktop(alumno) {
        const T = CONFIG.text;

        const diasHtml = T.dias.map(dia => {
            const horario = alumno.horarios[dia];
            const entrada = normalizeTime(horario?.entrada || '');
            const salida = normalizeTime(horario?.salida || '');
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

    // ============================================
    // MOBILE CARD RENDERING
    // ============================================

    function createSchoolCardMobile(institucion, colorIndex) {
        const color = CONFIG.colors[colorIndex % CONFIG.colors.length];
        const T = CONFIG.text;

        const pageSizeOptions = CONFIG.pagination.pageSizeOptions.map(size =>
            `<option value="${size}" ${size === CONFIG.pagination.mobilePageSize ? 'selected' : ''}>${size}</option>`
        ).join('');

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
                    <!-- Mobile Controls: Search + Page Size -->
                    <div class="tm-mobile-controls">
                        <div class="tm-mobile-search">
                            <div class="input-group">
                                <span class="input-group-text"><i class="bi bi-search"></i></span>
                                <input type="text" class="form-control" placeholder="Buscar estudiante..." 
                                       data-search-inst="${institucion.idInstitucion}">
                            </div>
                        </div>
                        <div class="tm-mobile-page-size">
                            <label>Mostrar</label>
                            <select class="form-select form-select-sm" data-pagesize-inst="${institucion.idInstitucion}">
                                ${pageSizeOptions}
                            </select>
                        </div>
                    </div>
                    
                    <!-- Student Cards Container -->
                    <div class="tm-student-cards" id="cards-inst-${institucion.idInstitucion}">
                        <div class="tm-loading-cards">
                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="visually-hidden">${T.loading}</span>
                            </div>
                            <span class="ms-2 tm-text-muted">${T.loadingStudents}</span>
                        </div>
                    </div>
                    
                    <!-- Mobile Pagination -->
                    <div class="tm-mobile-pagination" id="pagination-inst-${institucion.idInstitucion}">
                        <!-- Pagination will be rendered here -->
                    </div>
                </div>
            </div>
        `;
    }

    function createMobilePaginationHtml(instId) {
        const T = CONFIG.text;
        const pagination = getMobilePagination(instId);
        const totalPages = getTotalPages(instId);
        const currentPage = pagination.currentPage;
        const totalStudents = pagination.filteredStudents.length;
        const pageSize = pagination.pageSize;

        const startItem = totalStudents === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalStudents);

        // Generate page numbers
        let pageNumbers = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers += `
                <button type="button" class="tm-page-btn ${i === currentPage ? 'active' : ''}" 
                        data-page="${i}" data-inst="${instId}">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-pagination-info">
                ${T.showing} <strong>${startItem}-${endItem}</strong> ${T.of} <strong>${totalStudents}</strong> ${T.students}
            </div>
            <div class="tm-pagination-controls">
                <button type="button" class="tm-page-btn tm-page-prev" 
                        data-inst="${instId}" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button" class="tm-page-btn tm-page-next" 
                        data-inst="${instId}" ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function createStudentCardMobile(alumno) {
        const T = CONFIG.text;

        const schedulePreview = T.diasCortos.map((diaCorto, index) => {
            const dia = T.dias[index];
            const horario = alumno.horarios[dia];
            const hasSchedule = horario?.entrada || horario?.salida;
            return `<span class="tm-day-dot ${hasSchedule ? 'active' : ''}" title="${dia}">${diaCorto}</span>`;
        }).join('');

        const scheduleGrid = T.dias.map((dia, index) => {
            const horario = alumno.horarios[dia];
            const entrada = normalizeTime(horario?.entrada || '');
            const salida = normalizeTime(horario?.salida || '');
            return `
                <div class="tm-schedule-day" data-dia="${dia}">
                    <div class="tm-schedule-day-name">${T.diasCortos[index]}</div>
                    <div class="tm-schedule-times">
                        <div class="tm-schedule-time-row">
                            <span class="tm-time-label">${T.entrada}:</span>
                            <span class="tm-time-value schedule-value" data-tipo="entrada" data-value="${escapeAttr(entrada)}">
                                ${entrada || '—'}
                            </span>
                        </div>
                        <div class="tm-schedule-time-row">
                            <span class="tm-time-label">${T.salida}:</span>
                            <span class="tm-time-value schedule-value" data-tipo="salida" data-value="${escapeAttr(salida)}">
                                ${salida || '—'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="tm-student-card" data-id-estudiante="${alumno.idEstudiante}">
                <div class="tm-student-card-header" data-bs-toggle="collapse" 
                     data-bs-target="#schedule-${alumno.idEstudiante}" aria-expanded="false">
                    <div class="tm-student-info">
                        <span class="tm-badge tm-badge-primary">${escapeHtml(alumno.seccion)}</span>
                        <span class="tm-student-name">${escapeHtml(alumno.nombreCompleto)}</span>
                    </div>
                    <div class="tm-student-preview">
                        <div class="tm-day-dots">${schedulePreview}</div>
                        <i class="bi bi-chevron-down tm-expand-icon"></i>
                    </div>
                </div>
                <div class="collapse" id="schedule-${alumno.idEstudiante}">
                    <div class="tm-student-card-body">
                        <div class="tm-schedule-grid">
                            ${scheduleGrid}
                        </div>
                        <div class="tm-student-actions">
                            <button type="button" class="tm-btn tm-btn-sm tm-btn-outline btn-edit-mobile">
                                <i class="bi bi-pencil me-1"></i>${T.editSchedule}
                            </button>
                            <button type="button" class="tm-btn tm-btn-sm tm-btn-primary btn-save-mobile" style="display: none;">
                                <i class="bi bi-check-lg me-1"></i>${T.save}
                            </button>
                            <button type="button" class="tm-btn tm-btn-sm tm-btn-ghost btn-cancel-mobile" style="display: none;">
                                ${T.cancel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function createEmptyStateMobile(message = null) {
        const T = CONFIG.text;
        return `
            <div class="tm-empty-state-mobile">
                <i class="bi bi-inbox fs-1 tm-text-muted"></i>
                <p class="mt-2 mb-0 tm-text-muted">${message || T.noStudents}</p>
                <small class="tm-text-light">${message ? '' : T.noStudentsHint}</small>
            </div>
        `;
    }

    function createEmptyStateDesktop(institucionId) {
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

    // ============================================
    // MAIN RENDERING LOGIC
    // ============================================

    async function renderInstituciones() {
        const container = DOM.contenedorEscuelas();
        if (!container) return;

        container.innerHTML = '';
        state.totalEstudiantes = 0;
        state.isMobile = isMobileView();
        state.mobilePagination = {}; // Reset pagination state
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
            if (state.isMobile) {
                container.insertAdjacentHTML('beforeend', createSchoolCardMobile(inst, index));
            } else {
                container.insertAdjacentHTML('beforeend', createSchoolCardDesktop(inst, index));
            }
        });

        for (const inst of state.instituciones) {
            await loadStudentsForInstitution(inst.idInstitucion);
        }

        if (state.isMobile) {
            attachMobileControlHandlers();
        }

        updateStats();
    }

    async function loadStudentsForInstitution(idInstitucion) {
        try {
            const rows = await fetchEstudiantes(idInstitucion);

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
                        entrada: normalizeTime(r.horaEntrada ?? r.hora_entrada ?? ''),
                        salida: normalizeTime(r.horaSalida ?? r.hora_salida ?? '')
                    };
                }
            }

            // Update badge count
            const badge = document.querySelector(`#badge-count-${idInstitucion} span`);
            if (badge) {
                badge.textContent = alumnos.size;
            }

            state.totalEstudiantes += alumnos.size;

            if (state.isMobile) {
                // Initialize pagination with all students
                const studentsArray = Array.from(alumnos.values());
                initMobilePagination(idInstitucion, studentsArray);
                renderMobileStudentCards(idInstitucion);
            } else {
                await renderStudentsDesktop(idInstitucion, alumnos);
            }

        } catch (error) {
            console.error(`Error loading students for institution ${idInstitucion}:`, error);
        }
    }

    async function renderStudentsDesktop(idInstitucion, alumnos) {
        const tbody = document.querySelector(`#tabla-inst-${idInstitucion} tbody`);
        if (!tbody) return;

        tbody.innerHTML = '';

        if (alumnos.size === 0) {
            tbody.innerHTML = createEmptyStateDesktop(idInstitucion);
        } else {
            for (const alumno of alumnos.values()) {
                tbody.insertAdjacentHTML('beforeend', createStudentRowDesktop(alumno));
            }

            if (typeof initDataTable === 'function') {
                initDataTable(`tabla-inst-${idInstitucion}`, [12], {
                    pageLength: 10,
                    ordering: true,
                    order: [[0, 'asc'], [1, 'asc']]
                });
            }
        }

        attachDesktopRowEventListeners(tbody);
    }

    function renderMobileStudentCards(instId) {
        const container = document.querySelector(`#cards-inst-${instId}`);
        const paginationContainer = document.querySelector(`#pagination-inst-${instId}`);

        if (!container) return;

        const pagination = getMobilePagination(instId);
        const pagedStudents = getPagedStudents(instId);

        container.innerHTML = '';

        if (pagination.filteredStudents.length === 0) {
            const T = CONFIG.text;
            const message = pagination.allStudents.length === 0 ? null : T.noResults;
            container.innerHTML = createEmptyStateMobile(message);
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
                paginationContainer.style.display = 'none';
            }
        } else {
            for (const alumno of pagedStudents) {
                container.insertAdjacentHTML('beforeend', createStudentCardMobile(alumno));
            }

            // Render pagination
            if (paginationContainer) {
                paginationContainer.innerHTML = createMobilePaginationHtml(instId);
                paginationContainer.style.display = '';
                attachPaginationHandlers(instId);
            }
        }

        attachMobileCardEventListeners(container);
    }

    // ============================================
    // MOBILE CONTROL HANDLERS
    // ============================================

    function attachMobileControlHandlers() {
        // Search handlers
        document.querySelectorAll('[data-search-inst]').forEach(input => {
            input.addEventListener('input', (e) => {
                const instId = e.target.dataset.searchInst;
                filterMobileStudents(instId, e.target.value);
            });
        });

        // Page size handlers
        document.querySelectorAll('[data-pagesize-inst]').forEach(select => {
            select.addEventListener('change', (e) => {
                const instId = e.target.dataset.pagesizeInst;
                changePageSize(instId, e.target.value);
            });
        });
    }

    function attachPaginationHandlers(instId) {
        const paginationContainer = document.querySelector(`#pagination-inst-${instId}`);
        if (!paginationContainer) return;

        // Page number buttons
        paginationContainer.querySelectorAll('.tm-page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page, 10);
                goToPage(instId, page);
            });
        });

        // Previous button
        const prevBtn = paginationContainer.querySelector('.tm-page-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const pagination = getMobilePagination(instId);
                goToPage(instId, pagination.currentPage - 1);
            });
        }

        // Next button
        const nextBtn = paginationContainer.querySelector('.tm-page-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const pagination = getMobilePagination(instId);
                goToPage(instId, pagination.currentPage + 1);
            });
        }
    }

    // ============================================
    // DESKTOP EVENT HANDLERS
    // ============================================

    function attachDesktopRowEventListeners(tbody) {
        tbody.querySelectorAll('tr[data-id-estudiante]').forEach(row => {
            const btnEdit = row.querySelector('.btn-edit');
            const btnSave = row.querySelector('.btn-save');
            const btnCancel = row.querySelector('.btn-cancel');

            if (btnEdit) {
                btnEdit.addEventListener('click', () => handleEditRowDesktop(row));
            }
            if (btnSave) {
                btnSave.addEventListener('click', () => handleSaveRowDesktop(row));
            }
            if (btnCancel) {
                btnCancel.addEventListener('click', () => handleCancelEditDesktop(row));
            }
        });
    }

 
    function handleEditRowDesktop(row) {
        const cells = row.querySelectorAll('.schedule-cell');

        cells.forEach(cell => {
            if (cell.querySelector('input')) return;

            const value = normalizeTime(cell.dataset.value || '');
            const tipo = cell.dataset.tipo;

            cell.innerHTML = `
            <input type="time" class="form-control form-control-sm hora-${tipo}" value="${escapeAttr(value)}">
        `;
        });

        row.querySelector('.btn-edit').style.display = 'none';
        row.querySelector('.btn-save').style.display = 'inline-flex';
        row.querySelector('.btn-cancel').style.display = 'inline-flex';
    }

    function handleCancelEditDesktop(row) {
        const cells = row.querySelectorAll('.schedule-cell');

        cells.forEach(cell => {
            const value = normalizeTime(cell.dataset.value || '');
            cell.innerHTML = value || '<span class="tm-text-muted">—</span>';
        });

        row.querySelector('.btn-edit').style.display = 'inline-flex';
        row.querySelector('.btn-save').style.display = 'none';
        row.querySelector('.btn-cancel').style.display = 'none';
    }

    async function handleSaveRowDesktop(row) {
        const T = CONFIG.text;
        const idEstudiante = row.dataset.idEstudiante;

        if (!idEstudiante) {
            showToast('error', 'Error', T.studentIdNotFound);
            return;
        }

        const horariosPorDia = {};
        const cells = row.querySelectorAll('.schedule-cell');

        cells.forEach(cell => {
            const input = cell.querySelector('input');
            if (!input) return;

            const dia = cell.dataset.dia;
            const tipo = cell.dataset.tipo;
            const value = normalizeTime(input.value?.trim() || '');

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

    // ============================================
    // MOBILE EVENT HANDLERS
    // ============================================

    function attachMobileCardEventListeners(container) {
        container.querySelectorAll('.tm-student-card').forEach(card => {
            const btnEdit = card.querySelector('.btn-edit-mobile');
            const btnSave = card.querySelector('.btn-save-mobile');
            const btnCancel = card.querySelector('.btn-cancel-mobile');

            if (btnEdit) {
                btnEdit.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleEditCardMobile(card);
                });
            }
            if (btnSave) {
                btnSave.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleSaveCardMobile(card);
                });
            }
            if (btnCancel) {
                btnCancel.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleCancelEditMobile(card);
                });
            }
        });
    }

    function handleEditCardMobile(card) {
        const scheduleValues = card.querySelectorAll('.schedule-value');

        scheduleValues.forEach(span => {
            const value = normalizeTime(span.dataset.value || '');
            const tipo = span.dataset.tipo;

            span.innerHTML = `
            <input type="time" class="form-control form-control-sm hora-${tipo}" value="${escapeAttr(value)}">
        `;
        });

        card.querySelector('.btn-edit-mobile').style.display = 'none';
        card.querySelector('.btn-save-mobile').style.display = 'inline-flex';
        card.querySelector('.btn-cancel-mobile').style.display = 'inline-flex';
    }


    function handleCancelEditMobile(card) {
        const scheduleValues = card.querySelectorAll('.schedule-value');

        scheduleValues.forEach(span => {
            const value = normalizeTime(span.dataset.value || '');
            span.innerHTML = value || '—';
        });

        card.querySelector('.btn-edit-mobile').style.display = 'inline-flex';
        card.querySelector('.btn-save-mobile').style.display = 'none';
        card.querySelector('.btn-cancel-mobile').style.display = 'none';
    }

    async function handleSaveCardMobile(card) {
        const T = CONFIG.text;
        const idEstudiante = card.dataset.idEstudiante;

        if (!idEstudiante) {
            showToast('error', 'Error', T.studentIdNotFound);
            return;
        }

        const horariosPorDia = {};
        const scheduleDays = card.querySelectorAll('.tm-schedule-day');

        scheduleDays.forEach(dayEl => {
            const dia = dayEl.dataset.dia;
            const inputs = dayEl.querySelectorAll('input');

            if (!horariosPorDia[dia]) {
                horariosPorDia[dia] = { entrada: '', salida: '', spans: {} };
            }

            inputs.forEach(input => {
                const span = input.closest('.schedule-value');
                const tipo = span?.dataset.tipo;
                const value = normalizeTime(input.value?.trim() || '');

                if (tipo) {
                    horariosPorDia[dia][tipo] = value;
                    horariosPorDia[dia].spans[tipo] = span;
                }
            });
        });

        const changes = [];
        for (const [dia, data] of Object.entries(horariosPorDia)) {
            if (data.entrada || data.salida) {
                changes.push({
                    dia,
                    entrada: data.entrada,
                    salida: data.salida,
                    spans: data.spans
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
                if (c.spans.entrada) {
                    c.spans.entrada.dataset.value = c.entrada;
                    c.spans.entrada.innerHTML = c.entrada || '—';
                }
                if (c.spans.salida) {
                    c.spans.salida.dataset.value = c.salida;
                    c.spans.salida.innerHTML = c.salida || '—';
                }
            });

            updateDayDots(card);

            card.querySelector('.btn-edit-mobile').style.display = 'inline-flex';
            card.querySelector('.btn-save-mobile').style.display = 'none';
            card.querySelector('.btn-cancel-mobile').style.display = 'none';

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

    function updateDayDots(card) {
        const T = CONFIG.text;
        const dots = card.querySelectorAll('.tm-day-dot');

        dots.forEach((dot, index) => {
            const dia = T.dias[index];
            const dayEl = card.querySelector(`.tm-schedule-day[data-dia="${dia}"]`);

            if (dayEl) {
                const entrada = dayEl.querySelector('[data-tipo="entrada"]')?.dataset.value || '';
                const salida = dayEl.querySelector('[data-tipo="salida"]')?.dataset.value || '';

                if (entrada || salida) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            }
        });
    }

    // ============================================
    // SCHOOL CREATION
    // ============================================

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

    function handleResize() {
        const wasMobile = state.isMobile;
        state.isMobile = isMobileView();

        if (wasMobile !== state.isMobile) {
            renderInstituciones();
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

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 250);
        });

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