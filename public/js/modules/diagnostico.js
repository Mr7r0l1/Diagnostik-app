import { generarDiagnosticoAPI } from '../services/api.js';
import { datosPerfil } from './taller.js';
import { cargarHistorial } from './historial.js';
import { showToast } from './toast.js';
import { switchTab } from './navigation.js';
import { searchDTC, getDTCByCode, SYSTEM_COLORS } from '../data/dtcDatabase.js';
import { MARCAS_POPULARES, getModelos, getAnios, searchVehiclesGlobal } from '../data/vehicleData.js';

// ─── Estado Global del Módulo ─────────────────────────────────────────────────
let reporteActual = null;
let vehiculoActual = null;
let contextoReporte = { id: null, fecha: null, sintomas: '', dtcs: [], codigo: '' };

/** Devuelve el reporte en pantalla (con las ediciones del técnico) listo para imprimir. */
export function getReporteParaImprimir() {
    if (!reporteActual || !vehiculoActual) return null;
    return {
        id: contextoReporte.id,
        fecha: contextoReporte.fecha || new Date().toISOString(),
        marca: vehiculoActual.marca,
        modelo: vehiculoActual.modelo,
        vin: reporteActual.vin || '',
        motor: reporteActual.motor || '',
        transmision: reporteActual.transmision || '',
        kilometraje: reporteActual.kilometraje || '',
        codigo: contextoReporte.codigo || reporteActual.codigo || '',
        sintomas: contextoReporte.sintomas,
        dtcs: contextoReporte.dtcs,
        diagnostico: reporteActual
    };
}

// Vehicle selection state
let vehiculoSeleccionado = { marca: '', modelo: '', anio: '' };

// Lista de DTCs seleccionados para el diagnóstico actual (multi-código)
let dtcsSeleccionados = []; // [{ code, desc, system, contextInfo }]

// Cache para resultados de búsqueda DTC (evita errores de comillas e interpolación HTML)
let _dtcSearchResultsCache = {};

// ─── Helper de Selección de Vehículo ──────────────────────────────────────────
export function setVehiculo(marca, modelo, anio = '') {
    const fullModelo = anio ? `${modelo} ${anio}` : modelo;
    vehiculoSeleccionado = { marca, modelo, anio };

    const marcaInput = document.getElementById('marca');
    const modeloInput = document.getElementById('modelo');
    if (marcaInput) marcaInput.value = marca;
    if (modeloInput) modeloInput.value = fullModelo;

    const displayEl = document.getElementById('selectedVehicleText');
    const subtextEl = document.getElementById('selectedVehicleSubtext');

    if (displayEl) {
        displayEl.textContent = (marca && fullModelo) ? `${marca} - ${fullModelo}` : 'Haz clic para seleccionar vehículo...';
    }
    if (subtextEl) {
        subtextEl.textContent = marca ? 'Vehículo activo para el diagnóstico' : 'Busca por modelo o navega marca/año';
    }
}

// ─── Renderizar Reporte ────────────────────────────────────────────────────────
export function renderizarReporte(datos, marca, modelo) {
    reporteActual = datos;
    vehiculoActual = { marca, modelo };

    const panel = document.getElementById('hojaReporte');
    const tallerNombre = document.getElementById('pdfTallerNombre');
    const tallerTel = document.getElementById('pdfTallerTel');
    const tallerDir = document.getElementById('pdfTallerDir');
    const pdfLogo = document.getElementById('pdfLogo');

    if (tallerNombre) tallerNombre.textContent = datosPerfil.nombre_taller || 'Taller Mecánico';
    if (tallerTel) tallerTel.textContent = datosPerfil.telefono ? `Contacto: ${datosPerfil.telefono}` : '';
    if (tallerDir) tallerDir.textContent = datosPerfil.direccion ? `Dirección: ${datosPerfil.direccion}` : '';

    if (pdfLogo) {
        if (datosPerfil.logo_url) {
            pdfLogo.src = datosPerfil.logo_url;
            pdfLogo.classList.remove('hidden');
        } else {
            pdfLogo.classList.add('hidden');
        }
    }

    const fechaEl = document.getElementById('fechaReporte');
    if (fechaEl) fechaEl.textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const badge = document.getElementById('badgeSeveridad');
    if (badge) {
        badge.textContent = `Severidad: ${datos.severidad}`;
        let colorClass = 'badge-warning';
        if (datos.severidad === 'Crítica' || datos.severidad === 'Alta') colorClass = 'badge-danger';
        else if (datos.severidad === 'Baja') colorClass = 'badge-success';
        badge.className = `badge ${colorClass}`;
    }

    const cuerpo = document.getElementById('cuerpoReporte');
    if (cuerpo) {
        const specsText = [
            datos.vin ? `VIN: ${datos.vin}` : null,
            datos.motor ? `Motor: ${datos.motor}` : null,
            datos.transmision ? `Transmisión: ${datos.transmision}` : null,
            datos.kilometraje ? `KM: ${datos.kilometraje}` : null,
        ].filter(Boolean).join(' | ');

        cuerpo.innerHTML = `
            <div class="report-vehicle-card animate-report-appear" style="animation-delay:0.05s">
                <div>
                    <p class="report-label">Vehículo Analizado</p>
                    <p class="report-vehicle-name">${marca} ${modelo}</p>
                    ${specsText ? `<p class="text-xs text-muted mt-1 font-mono font-semibold">${specsText}</p>` : ''}
                </div>
                <div class="text-right">
                    <span class="dtc-tag-report">${datos.codigo}</span>
                    <p class="report-label mt-2">${datos.descripcion_corta}</p>
                </div>
            </div>

            ${datos.resumen_analisis ? `
                <div class="report-section animate-report-appear" style="animation-delay:0.1s">
                    <p class="report-section-title purple">📋 Análisis Técnico General y Correlación DTC</p>
                    <div class="p-4 rounded-xl shadow-sm" style="background:var(--bg-subtle);border-left:4px solid var(--primary)">
                        <p class="text-sm leading-relaxed" style="color:var(--text-secondary)">${datos.resumen_analisis}</p>
                    </div>
                </div>
            ` : ''}

            <div class="report-section animate-report-appear" style="animation-delay:0.18s">
                <p class="report-section-title emerald">🔍 Posibles Causas Raíz</p>
                <ul class="report-list" id="listaCausas">
                    ${datos.posibles_causas.map((c, i) => `
                        <li class="report-list-item animate-pop-in" style="animation-delay:${0.15 + i * 0.05}s">
                            <div class="flex items-start gap-2 flex-1">
                                <span class="bullet-emerald">•</span>
                                <span>${c}</span>
                            </div>
                            <button class="btn-remove" onclick="window.removerItemReporte('causas', ${i})" title="Eliminar">×</button>
                        </li>
                    `).join('')}
                </ul>
                <div class="report-add-row">
                    <input type="text" id="nuevaCausa" placeholder="Agregar nueva causa..." class="report-add-input">
                    <button class="btn-add-item" onclick="window.agregarItemReporte('causas')">+ Añadir</button>
                </div>
            </div>

            <div class="report-section animate-report-appear" style="animation-delay:0.25s">
                <p class="report-section-title purple">🛠️ Procedimiento de Diagnóstico</p>
                <ol class="report-list" id="listaProcedimiento">
                    ${datos.procedimiento_diagnostico.map((p, idx) => `
                        <li class="report-list-item animate-pop-in" style="animation-delay:${0.28 + idx * 0.05}s">
                            <div class="flex items-start gap-3 flex-1">
                                <span class="step-badge">${idx + 1}</span>
                                <span>${p}</span>
                            </div>
                            <button class="btn-remove" onclick="window.removerItemReporte('procedimiento', ${idx})" title="Eliminar">×</button>
                        </li>
                    `).join('')}
                </ol>
                <div class="report-add-row">
                    <input type="text" id="nuevoPaso" placeholder="Agregar nuevo paso..." class="report-add-input">
                    <button class="btn-add-item" onclick="window.agregarItemReporte('procedimiento')">+ Añadir</button>
                </div>
            </div>

            <div class="solution-card animate-report-appear" style="animation-delay:0.38s">
                <div class="flex justify-between items-center">
                    <p class="report-section-title emerald mb-0">✅ Solución Sugerida</p>
                    <span class="time-badge">⏱️ ${datos.tiempo_estimado_reparacion || 'N/A'}</span>
                </div>
                <p class="solution-text animate-fade-text">${datos.solucion_recomendada}</p>
            </div>
        `;
    }

    if (panel) panel.classList.remove('hidden');
}

// ─── Funciones Globales para Edición del Reporte ─────────────────────────────
window.removerItemReporte = function (tipo, index) {
    if (!reporteActual) return;
    if (tipo === 'causas') reporteActual.posibles_causas.splice(index, 1);
    else reporteActual.procedimiento_diagnostico.splice(index, 1);
    renderizarReporte(reporteActual, vehiculoActual.marca, vehiculoActual.modelo);
};

window.agregarItemReporte = function (tipo) {
    if (!reporteActual) return;
    if (tipo === 'causas') {
        const val = document.getElementById('nuevaCausa')?.value.trim();
        if (val) { reporteActual.posibles_causas.push(val); }
        else return;
    } else {
        const val = document.getElementById('nuevoPaso')?.value.trim();
        if (val) { reporteActual.procedimiento_diagnostico.push(val); }
        else return;
    }
    renderizarReporte(reporteActual, vehiculoActual.marca, vehiculoActual.modelo);
};

// ─── Gestión de DTCs Seleccionados ───────────────────────────────────────────
function renderDtcsSeleccionados() {
    const container = document.getElementById('dtcsSeleccionadosList');
    if (!container) return;

    if (dtcsSeleccionados.length === 0) {
        container.innerHTML = `<p class="text-xs text-muted italic text-center py-3">Ningún código DTC agregado (Opcional). Puedes generar el diagnóstico directamente para fallas mecánicas.</p>`;
        return;
    }

    container.innerHTML = dtcsSeleccionados.map((dtc, i) => {
        const sysClass = SYSTEM_COLORS[dtc.system] || SYSTEM_COLORS['default'];
        return `
            <div class="dtc-selected-item animate-pop-in" id="dtc-item-${i}">
                <div class="dtc-selected-header">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="dtc-code-badge">${dtc.code}</span>
                        <span class="dtc-system-tag ${sysClass}">${dtc.system}</span>
                        <span class="dtc-desc-text">${dtc.desc}</span>
                    </div>
                    <button type="button" class="btn-remove-dtc" onclick="window.removerDTC(${i})" title="Quitar">×</button>
                </div>
                <div class="dtc-context-row">
                    <input 
                        type="text" 
                        id="dtc-ctx-${i}" 
                        placeholder="Info adicional para la IA (ej: falla solo en frío)..." 
                        class="dtc-context-input"
                        value="${dtc.contextInfo || ''}"
                        oninput="window.updateDTCContext(${i}, this.value)"
                    >
                </div>
            </div>
        `;
    }).join('');
}

window.removerDTC = function (index) {
    dtcsSeleccionados.splice(index, 1);
    renderDtcsSeleccionados();
    actualizarCodigoInput();
};

window.updateDTCContext = function (index, value) {
    if (dtcsSeleccionados[index]) {
        dtcsSeleccionados[index].contextInfo = value;
    }
};

function agregarDTC(code, desc, system) {
    if (dtcsSeleccionados.find(d => d.code === code)) {
        showToast(`El código ${code} ya está en la lista.`, 'info');
        return;
    }
    dtcsSeleccionados.push({ code, desc, system, contextInfo: '' });
    renderDtcsSeleccionados();
    actualizarCodigoInput();
    showToast(`✅ ${code} agregado al diagnóstico.`, 'success');
}

function actualizarCodigoInput() {
    const codigoInput = document.getElementById('codigo');
    if (codigoInput) {
        codigoInput.value = dtcsSeleccionados.map(d => d.code).join(', ');
    }
}

// ─── Buscador DTC (Bug de Onclick Corregido) ──────────────────────────────────
function initDTCSearch() {
    const searchInput = document.getElementById('dtcSearchInput');
    const searchResults = document.getElementById('dtcSearchResults');

    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = searchInput.value.trim();
            if (query.length < 1) {
                searchResults.innerHTML = '';
                searchResults.classList.add('hidden');
                return;
            }

            const results = searchDTC(query, 12);
            searchResults.classList.remove('hidden');

            _dtcSearchResultsCache = {};
            results.forEach(r => { _dtcSearchResultsCache[r.code] = r; });

            if (results.length > 0) {
                searchResults.innerHTML = results.map(r => {
                    const sysClass = SYSTEM_COLORS[r.system] || SYSTEM_COLORS['default'];
                    return `
                        <button type="button" class="dtc-result-item" onclick="window.selectDTCFromSearch('${r.code}')">
                            <span class="dtc-result-code">${r.code}</span>
                            <span class="dtc-system-tag ${sysClass} ml-2">${r.system}</span>
                            <span class="dtc-result-desc ml-2">${r.desc}</span>
                            <span class="dtc-result-add ml-auto">+ Agregar</span>
                        </button>
                    `;
                }).join('');

                const exactMatch = getDTCByCode(query);
                if (!exactMatch && query.length >= 3) {
                    const cleanCode = query.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    searchResults.innerHTML += `
                        <div class="dtc-not-found-row">
                            <span class="text-xs text-muted">¿No encuentras <b>${cleanCode}</b>?</span>
                            <button type="button" class="btn-add-custom-dtc" onclick="window.addCustomDTC('${cleanCode}')">
                                + Agregar código personalizado
                            </button>
                        </div>
                    `;
                }
            } else {
                const cleanCode = query.toUpperCase().replace(/[^A-Z0-9]/g, '');
                searchResults.innerHTML = `
                    <div class="dtc-not-found-row">
                        <span class="text-xs text-muted">No se encontró "<b>${cleanCode}</b>".</span>
                        <button type="button" class="btn-add-custom-dtc" onclick="window.addCustomDTC('${cleanCode}')">
                            + Agregar código personalizado
                        </button>
                    </div>
                `;
            }
        }, 200);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}

window.selectDTCFromSearch = function (code) {
    const dtcObj = _dtcSearchResultsCache[code] || getDTCByCode(code);
    if (dtcObj) {
        agregarDTC(dtcObj.code, dtcObj.desc, dtcObj.system);
    } else {
        agregarDTC(code, 'Código de falla OBD2', 'General');
    }
    const searchInput = document.getElementById('dtcSearchInput');
    const searchResults = document.getElementById('dtcSearchResults');
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.classList.add('hidden');
};

window.addCustomDTC = function (code) {
    const desc = prompt(`Ingresa una descripción breve para el código ${code}:`, '');
    if (desc !== null) {
        agregarDTC(code, desc || 'Código personalizado del taller', 'Personalizado');
    }
    const searchInput = document.getElementById('dtcSearchInput');
    const searchResults = document.getElementById('dtcSearchResults');
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.classList.add('hidden');
};

// ─── Modal Interactivo de Búsqueda de Vehículo ────────────────────────────────
function initVehicleModal() {
    const btnOpen = document.getElementById('btnOpenVehicleModal');
    const btnClose = document.getElementById('btnCloseVehicleModal');
    const modal = document.getElementById('vehicleModal');
    const searchInput = document.getElementById('vehicleSearchInput');
    const stepContainer = document.getElementById('vehicleStepContainer');
    const btnBreadBrand = document.getElementById('btnBreadcrumbBrand');
    const breadModel = document.getElementById('breadcrumbModel');
    const breadYear = document.getElementById('breadcrumbYear');

    const btnCustomToggle = document.getElementById('btnCustomVehicleModal');
    const customForm = document.getElementById('customVehicleForm');
    const btnCancelCustom = document.getElementById('btnCancelCustomVehicle');
    const btnConfirmCustom = document.getElementById('btnConfirmCustomVehicle');

    if (!modal || !btnOpen) return;

    let selectedBrand = '';
    let selectedModel = '';

    function openModal() {
        modal.classList.remove('hidden');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        if (customForm) customForm.classList.add('hidden');
        showBrandStep();
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    btnOpen.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);

    // Cerrar con tecla Escape o backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });

    // 1. Mostrar Marcas
    function showBrandStep() {
        selectedBrand = '';
        selectedModel = '';
        updateBreadcrumbs('marca');

        stepContainer.innerHTML = `
            <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Marcas Populares</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    ${MARCAS_POPULARES.map(m => `
                        <button type="button" class="brand-pill-btn" onclick="window._onSelectVehicleBrand('${m}')">
                            ${m}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 2. Mostrar Modelos
    async function showModelStep(marca) {
        selectedBrand = marca;
        updateBreadcrumbs('modelo');

        stepContainer.innerHTML = `
            <div class="text-center py-6">
                <span class="spinner-inline mb-2"></span>
                <p class="text-xs" style="color:var(--text-muted)">Cargando modelos para <b>${marca}</b>...</p>
            </div>
        `;

        const modelos = await getModelos(marca);

        if (modelos.length > 0) {
            stepContainer.innerHTML = `
                <div>
                    <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Modelos de ${marca}</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${modelos.map(m => `
                            <button type="button" class="vehicle-option-btn" onclick="window._onSelectVehicleModel('${m}')">
                                <span>${m}</span>
                                <span class="text-xs text-muted">›</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            stepContainer.innerHTML = `
                <div class="text-center py-6">
                    <p class="text-xs text-muted">No se encontraron modelos precargados para <b>${marca}</b>.</p>
                    <button type="button" class="btn-primary text-xs mt-3" onclick="window._onSelectVehicleModel('')">
                        Escribir modelo libremente
                    </button>
                </div>
            `;
        }
    }

    // 3. Mostrar Años
    function showYearStep(modelo) {
        selectedModel = modelo;
        updateBreadcrumbs('anio');

        const anios = getAnios();
        stepContainer.innerHTML = `
            <div>
                <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Selecciona Año (${selectedBrand} ${selectedModel})</p>
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    ${anios.map(y => `
                        <button type="button" class="brand-pill-btn text-xs py-2" onclick="window._onSelectVehicleYear('${y}')">
                            ${y}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Actualizar Breadcrumbs
    function updateBreadcrumbs(step) {
        if (step === 'marca') {
            btnBreadBrand.className = 'px-3 py-1 rounded-full text-white';
            btnBreadBrand.style.background = 'var(--primary)';
            breadModel.className = 'px-3 py-1 rounded-full text-muted';
            breadModel.style.background = 'var(--bg-subtle)';
            breadModel.textContent = '2. Modelo';
            breadYear.className = 'px-3 py-1 rounded-full text-muted';
            breadYear.style.background = 'var(--bg-subtle)';
            breadYear.textContent = '3. Año';
        } else if (step === 'modelo') {
            btnBreadBrand.className = 'px-3 py-1 rounded-full text-muted cursor-pointer';
            btnBreadBrand.style.background = 'var(--bg-subtle)';
            btnBreadBrand.textContent = `1. ${selectedBrand}`;

            breadModel.className = 'px-3 py-1 rounded-full text-white';
            breadModel.style.background = 'var(--primary)';
            breadModel.textContent = '2. Modelo';

            breadYear.className = 'px-3 py-1 rounded-full text-muted';
            breadYear.style.background = 'var(--bg-subtle)';
            breadYear.textContent = '3. Año';
        } else if (step === 'anio') {
            breadModel.textContent = `2. ${selectedModel}`;
            breadYear.className = 'px-3 py-1 rounded-full text-white';
            breadYear.style.background = 'var(--primary)';
        }
    }

    btnBreadBrand.addEventListener('click', showBrandStep);

    // Exponer handlers globales para el modal
    window._onSelectVehicleBrand = (marca) => showModelStep(marca);
    window._onSelectVehicleModel = (modelo) => {
        if (!modelo) {
            modelo = prompt(`Escribe el modelo para ${selectedBrand}:`, '');
            if (!modelo) return;
        }
        showYearStep(modelo);
    };
    window._onSelectVehicleYear = (anio) => {
        setVehiculo(selectedBrand, selectedModel, anio);
        closeModal();
        showToast(`🚘 Vehículo seleccionado: ${selectedBrand} ${selectedModel} ${anio}`, 'success');
    };

    // Buscador interactivo en vivo
    let vehicleSearchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(vehicleSearchTimeout);
            vehicleSearchTimeout = setTimeout(() => {
                const query = searchInput.value.trim();
                if (query.length < 2) {
                    showBrandStep();
                    return;
                }

                const matches = searchVehiclesGlobal(query);
                if (matches.length > 0) {
                    stepContainer.innerHTML = `
                        <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color:var(--text-muted)">Resultados para "${query}"</p>
                        <div class="space-y-1.5">
                            ${matches.map(item => {
                                if (item.type === 'marca') {
                                    return `
                                        <button type="button" class="vehicle-option-btn" onclick="window._onSelectVehicleBrand('${item.marca}')">
                                            <div>
                                                <span class="font-bold text-primary">${item.marca}</span>
                                                <span class="text-xs block text-muted">${item.subtitle}</span>
                                            </div>
                                            <span class="text-xs font-bold text-primary">Ver modelos ›</span>
                                        </button>
                                    `;
                                } else {
                                    return `
                                        <button type="button" class="vehicle-option-btn" onclick="window._onSelectSearchModel('${item.marca}', '${item.modelo}')">
                                            <div>
                                                <span class="font-bold text-primary">${item.marca} ${item.modelo}</span>
                                                <span class="text-xs block text-muted">${item.subtitle}</span>
                                            </div>
                                            <span class="text-xs font-bold text-primary">Elegir año ›</span>
                                        </button>
                                    `;
                                }
                            }).join('')}
                        </div>
                    `;
                } else {
                    stepContainer.innerHTML = `
                        <div class="text-center py-6">
                            <p class="text-xs text-muted">No se encontraron coincidencia para "<b>${query}</b>".</p>
                            <button type="button" class="btn-primary text-xs mt-3" onclick="document.getElementById('btnCustomVehicleModal').click()">
                                + Agregar este vehículo manualmente
                            </button>
                        </div>
                    `;
                }
            }, 200);
        });
    }

    window._onSelectSearchModel = (marca, modelo) => {
        selectedBrand = marca;
        showYearStep(modelo);
    };

    // Personalizado inline
    if (btnCustomToggle) {
        btnCustomToggle.addEventListener('click', () => {
            customForm.classList.toggle('hidden');
        });
    }
    if (btnCancelCustom) {
        btnCancelCustom.addEventListener('click', () => {
            customForm.classList.add('hidden');
        });
    }
    if (btnConfirmCustom) {
        btnConfirmCustom.addEventListener('click', () => {
            const marca = document.getElementById('customMarcaInput')?.value.trim();
            const modelo = document.getElementById('customModeloInput')?.value.trim();
            const anio = document.getElementById('customAnioInput')?.value.trim();

            if (!marca || !modelo) {
                return showToast('Ingresa al menos marca y modelo del vehículo.', 'info');
            }

            setVehiculo(marca, modelo, anio);
            closeModal();
            showToast(`🚘 Vehículo personalizado configurado: ${marca} ${modelo}`, 'success');
        });
    }
}

// ─── Init Principal ────────────────────────────────────────────────────────────
export function initDiagnosticoListeners(getUserId) {
    const diagForm = document.getElementById('diagForm');

    // Chips de síntomas rápidos
    document.querySelectorAll('.chip-sintoma').forEach(chip => {
        chip.addEventListener('click', () => {
            const textarea = document.getElementById('sintomas');
            if (textarea) {
                const text = chip.textContent.replace('+ ', '').trim();
                textarea.value = textarea.value.trim()
                    ? textarea.value + ', ' + text
                    : text;
            }
        });
    });

    // Presets DTC rápidos del dashboard
    document.querySelectorAll('[data-dtc-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
            const marca = btn.getAttribute('data-marca') || 'Toyota';
            const modelo = btn.getAttribute('data-modelo') || 'Corolla 2018';
            const codigo = btn.getAttribute('data-codigo') || 'P0300';
            const sintoma = btn.getAttribute('data-sintoma') || 'Fallo de encendido en cilindros.';

            setVehiculo(marca, modelo);
            document.getElementById('sintomas').value = sintoma;

            dtcsSeleccionados = [];
            const dtcInfo = getDTCByCode(codigo);
            if (dtcInfo) {
                agregarDTC(dtcInfo.code, dtcInfo.desc, dtcInfo.system);
            } else {
                agregarDTC(codigo, 'Código de falla predefinido', 'General');
            }

            switchTab('tab-diag');
            showToast(`Preset cargado: ${codigo} - ${marca} ${modelo}`, 'info');
        });
    });

    // Inicializar buscador DTC y selector modal de vehículo
    initDTCSearch();
    initVehicleModal();

    // Formulario de diagnóstico
    if (diagForm) {
        diagForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = getUserId();
            if (!userId) return showToast('Debes iniciar sesión para generar diagnósticos.', 'error');

            const sintomasUser = document.getElementById('sintomas').value.trim();

            if (dtcsSeleccionados.length === 0 && !sintomasUser) {
                return showToast('Escribe los síntomas o falla observada del vehículo.', 'error');
            }

            const btn = document.getElementById('btnGenerar');
            const statusBox = document.getElementById('diagLoadingStatus');
            const progressBar = document.getElementById('loadingProgressBar');
            const progressText = document.getElementById('loadingProgressText');

            if (btn) { btn.innerHTML = '<span class="spinner-inline"></span> Generando...'; btn.disabled = true; }
            if (statusBox) { statusBox.style.display = 'flex'; statusBox.classList.remove('hidden'); }

            if (progressBar) {
                progressBar.style.width = '0%';
                setTimeout(() => { progressBar.style.width = '25%'; if (progressText) progressText.textContent = 'Analizando información técnica...'; }, 400);
                setTimeout(() => { progressBar.style.width = '55%'; if (progressText) progressText.textContent = 'Consultando base de datos técnica...'; }, 1200);
                setTimeout(() => { progressBar.style.width = '85%'; if (progressText) progressText.textContent = 'Generando informe con IA...'; }, 2200);
            }

            let codigoTexto = 'Sin DTC (Falla Mecánica / Física)';
            let sintomasEnriquecidos = sintomasUser || 'Revisión mecánica general del vehículo.';

            if (dtcsSeleccionados.length > 0) {
                codigoTexto = dtcsSeleccionados.map(d => d.code).join(', ');
                const codigosDetalle = dtcsSeleccionados.map(d => {
                    let line = `- ${d.code}: ${d.desc}`;
                    if (d.contextInfo && d.contextInfo.trim()) {
                        line += ` (Info adicional del taller: ${d.contextInfo.trim()})`;
                    }
                    return line;
                }).join('\n');
                sintomasEnriquecidos = `${sintomasUser}\n\nCódigos DTC detectados:\n${codigosDetalle}`;
            } else {
                sintomasEnriquecidos += `\n\n[Diagnóstico sin códigos de falla OBD2: Análisis enfocado en fallas mecánicas, ruidos, fugas o desajustes físicos]`;
            }

            const vin = document.getElementById('vehiculoVin')?.value.trim() || '';
            const motor = document.getElementById('vehiculoMotor')?.value.trim() || '';
            const transmision = document.getElementById('vehiculoTransmision')?.value.trim() || '';
            const kilometraje = document.getElementById('vehiculoKilometraje')?.value.trim() || '';

            const payload = {
                userId,
                marca: document.getElementById('marca').value || 'Generico',
                modelo: document.getElementById('modelo').value || 'Sin modelo especificado',
                vin,
                motor,
                transmision,
                kilometraje,
                codigo: codigoTexto,
                sintomas: sintomasEnriquecidos,
                sintomasReportados: sintomasUser,
                dtcs: dtcsSeleccionados.map(({ code, desc, system, contextInfo }) => ({ code, desc, system, contextInfo })),
            };

            try {
                const json = await generarDiagnosticoAPI(payload);
                if (progressBar) progressBar.style.width = '100%';

                document.querySelectorAll('.ui-creditos-val').forEach(el => {
                    el.textContent = json.creditosRestantes ?? 0;
                });

                const dataEnriquecida = {
                    ...json.data,
                    vin,
                    motor,
                    transmision,
                    kilometraje
                };

                contextoReporte = {
                    id: json.reporteId || null,
                    fecha: json.creadoEn || new Date().toISOString(),
                    sintomas: sintomasUser,
                    dtcs: payload.dtcs,
                    codigo: codigoTexto
                };
                renderizarReporte(dataEnriquecida, payload.marca, payload.modelo);
                cargarHistorial(userId);
                showToast('✅ Reporte generado exitosamente con IA', 'success');

                // En móvil hacer scroll suave hacia el reporte para que el usuario no tenga que buscarlo
                if (window.innerWidth < 1024) {
                    setTimeout(() => {
                        const panel = document.getElementById('hojaReporte');
                        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 150);
                }

            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                if (btn) { btn.innerHTML = '<span>⚡</span> Generar Reporte Técnico de Diagnóstico'; btn.disabled = false; }
                if (statusBox) setTimeout(() => { statusBox.style.display = 'none'; }, 1200);
            }
        });
    }
}
