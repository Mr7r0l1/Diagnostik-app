import {
    generarPresupuestoAPI,
    actualizarPresupuestoAPI,
    obtenerPresupuestosAPI,
    eliminarPresupuestoAPI
} from '../services/api.js';
import { datosPerfil } from './taller.js';
import { getTodosLosReportes, marcarReportePresupuestadoLocal } from './historial.js';
import { escapeHtml, imprimirPresupuesto } from './reportePrint.js';
import { switchTab } from './navigation.js';
import { showToast } from './toast.js';

let presupuestoActual = null;
let listaPresupuestos = [];
let modoEntrada = 'reporte'; // 'reporte' | 'manual'
let condicionPreferida = 'Nueva'; // 'Nueva' | 'Segunda Mano' | 'Mixta'

function obtenerMonedaActiva() {
    return presupuestoActual?.moneda || datosPerfil.moneda || localStorage.getItem('diagnostik_moneda_taller') || 'MXN';
}

function formatearImporte(valor, moneda = obtenerMonedaActiva()) {
    const num = Number(valor) || 0;
    return `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;
}

// ─── Sincronizar Selector de Reportes y Costo de Token ──────────────────────
export function actualizarSelectorReportesPresupuesto(reporteIdSeleccionar = null) {
    const select = document.getElementById('presSelectReporte');
    if (!select) return;

    const reportes = getTodosLosReportes() || [];
    const valorPrevio = reporteIdSeleccionar || select.value;

    if (reportes.length === 0) {
        select.innerHTML = `<option value="">-- No tienes reportes previos aún --</option>`;
        actualizarIndicadorCosto();
        return;
    }

    select.innerHTML = `<option value="">-- Selecciona un reporte de tu historial --</option>` +
        reportes.map(r => {
            const yaCotizado = !!r.presupuesto_generado;
            const etiquetaCosto = yaCotizado ? '(Ya cotizado · 1 Token)' : '(✨ GRATIS - 1er presupuesto)';
            const fechaCorta = new Date(r.creado_en).toLocaleDateString('es-ES');
            return `<option value="${r.id}">${escapeHtml(r.marca)} ${escapeHtml(r.modelo)} [${escapeHtml(r.codigo || 'Sin DTC')}] - ${fechaCorta} ${etiquetaCosto}</option>`;
        }).join('');

    if (valorPrevio && reportes.some(r => String(r.id) === String(valorPrevio))) {
        select.value = valorPrevio;
    }

    actualizarIndicadorCosto();
}

function actualizarIndicadorCosto() {
    const badgeCosto = document.getElementById('presCostoBadge');
    const btnTexto = document.getElementById('presBtnGenerarTexto');
    const select = document.getElementById('presSelectReporte');
    const reportes = getTodosLosReportes() || [];

    let esGratis = false;
    if (modoEntrada === 'reporte' && select && select.value) {
        const rep = reportes.find(r => String(r.id) === String(select.value));
        if (rep && !rep.presupuesto_generado) {
            esGratis = true;
        }
    }

    if (badgeCosto) {
        if (esGratis) {
            badgeCosto.className = 'text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
            badgeCosto.textContent = '✨ GRATIS (Incluido con tu reporte)';
        } else {
            badgeCosto.className = 'text-xs font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40';
            badgeCosto.textContent = '🪙 Costo: 1 Token';
        }
    }

    if (btnTexto) {
        btnTexto.textContent = esGratis
            ? 'Generar Presupuesto con IA (Gratis)'
            : 'Generar Presupuesto con IA (1 Token)';
    }
}

function cambiarModoEntrada(nuevoModo) {
    modoEntrada = nuevoModo;
    const btnReporte = document.getElementById('btnModoReporte');
    const btnManual = document.getElementById('btnModoManual');
    const bloqueReporte = document.getElementById('presBloqueReporte');

    if (nuevoModo === 'reporte') {
        btnReporte?.classList.add('bg-purple-600', 'text-white', 'border-purple-500');
        btnReporte?.classList.remove('bg-slate-900', 'text-slate-400', 'border-slate-700');
        btnManual?.classList.remove('bg-purple-600', 'text-white', 'border-purple-500');
        btnManual?.classList.add('bg-slate-900', 'text-slate-400', 'border-slate-700');
        bloqueReporte?.classList.remove('hidden');
    } else {
        btnManual?.classList.add('bg-purple-600', 'text-white', 'border-purple-500');
        btnManual?.classList.remove('bg-slate-900', 'text-slate-400', 'border-slate-700');
        btnReporte?.classList.remove('bg-purple-600', 'text-white', 'border-purple-500');
        btnReporte?.classList.add('bg-slate-900', 'text-slate-400', 'border-slate-700');
        bloqueReporte?.classList.add('hidden');
    }

    actualizarIndicadorCosto();
}

function aplicarDatosDeReporteSeleccionado(reporteObj) {
    if (!reporteObj) return;
    const marcaEl = document.getElementById('presMarca');
    const modeloEl = document.getElementById('presModelo');
    const descEl = document.getElementById('presDescripcionTrabajo');

    if (marcaEl) marcaEl.value = reporteObj.marca || '';
    if (modeloEl) modeloEl.value = reporteObj.modelo || '';

    const diag = reporteObj.diagnostico || {};
    const solucion = diag.solucion_recomendada || '';
    const causas = Array.isArray(diag.posibles_causas) && diag.posibles_causas.length > 0
        ? `Posibles piezas/causas: ${diag.posibles_causas.slice(0, 3).join(', ')}.`
        : '';

    if (descEl) {
        descEl.value = [solucion, causas].filter(Boolean).join('\n') || reporteObj.sintomas || '';
    }
}

/**
 * Abre la pestaña de presupuestos precargando un reporte desde el Visor o desde Nuevo Diagnóstico.
 */
export function iniciarPresupuestoDesdeReporte(rep) {
    if (!rep) return;
    switchTab('tab-presupuestos');
    cambiarModoEntrada('reporte');

    actualizarSelectorReportesPresupuesto(rep.id);

    const select = document.getElementById('presSelectReporte');
    if (select && rep.id) {
        select.value = rep.id;
    }

    aplicarDatosDeReporteSeleccionado(rep);
    actualizarIndicadorCosto();

    const ciudadInput = document.getElementById('presCiudad');
    if (ciudadInput && !ciudadInput.value) {
        ciudadInput.value = datosPerfil.ciudad || 'Ciudad Juárez, Chih.';
    }

    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Reporte cargado para cotizar presupuesto', 'info');
}

// ─── Renderizado y Edición en Vivo del Presupuesto Activo ───────────────────
export function renderizarEditorPresupuesto(pres) {
    presupuestoActual = JSON.parse(JSON.stringify(pres));
    if (!Array.isArray(presupuestoActual.piezas)) presupuestoActual.piezas = [];
    if (!Array.isArray(presupuestoActual.mano_de_obra)) presupuestoActual.mano_de_obra = [];

    const estadoVacio = document.getElementById('presEstadoVacio');
    const hojaEditor = document.getElementById('hojaPresupuestoEditor');
    if (estadoVacio) estadoVacio.classList.add('hidden');
    if (hojaEditor) hojaEditor.classList.remove('hidden');

    const folioEl = document.getElementById('presEditorFolio');
    const vehiculoEl = document.getElementById('presEditorVehiculo');
    const ciudadEl = document.getElementById('presEditorCiudad');
    const tiempoEl = document.getElementById('presEditorTiempo');
    const notasEl = document.getElementById('presEditorNotas');

    if (folioEl) folioEl.textContent = presupuestoActual.folio || 'COTIZACIÓN';
    if (vehiculoEl) vehiculoEl.textContent = `${presupuestoActual.marca || ''} ${presupuestoActual.modelo || ''}`.trim();
    if (ciudadEl) ciudadEl.textContent = presupuestoActual.ciudad || datosPerfil.ciudad || '';
    if (tiempoEl) tiempoEl.value = presupuestoActual.tiempo_estimado || '';
    if (notasEl) notasEl.value = presupuestoActual.notas || '';

    renderizarFilasPiezas();
    renderizarFilasManoObra();
    recalcularTotalesUI();
}

function renderizarFilasPiezas() {
    const tbody = document.getElementById('presTablaPiezasBody');
    if (!tbody || !presupuestoActual) return;

    const moneda = obtenerMonedaActiva();

    if (presupuestoActual.piezas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-xs text-slate-500 py-4">
                    No hay piezas en la lista. Usa el botón "+ Agregar Pieza" para añadir una.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = presupuestoActual.piezas.map((p, idx) => {
        const cant = Math.max(1, Number(p.cantidad) || 1);
        const precio = Number(p.precio_unitario) || 0;
        const subtotal = cant * precio;
        const esSegundaMano = p.condicion === 'Segunda Mano';

        return `
            <tr class="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                <td class="py-2 pr-2">
                    <input type="text" data-idx="${idx}" data-field="descripcion"
                        value="${escapeHtml(p.descripcion)}"
                        placeholder="Nombre de la pieza..."
                        class="pres-pieza-input w-full rounded-lg px-2.5 py-1.5 text-xs">
                </td>
                <td class="py-2 px-1.5 text-center">
                    <button type="button" data-idx="${idx}"
                        class="pres-btn-toggle-condicion text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all whitespace-nowrap ${
                            esSegundaMano
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        }"
                        title="Clic para cambiar entre Nueva y Segunda Mano">
                        ${esSegundaMano ? '🔄 2da Mano' : '✨ Nueva'}
                    </button>
                </td>
                <td class="py-2 px-1.5 w-20">
                    <input type="number" min="1" step="1" data-idx="${idx}" data-field="cantidad"
                        value="${cant}"
                        class="pres-pieza-input w-full rounded-lg px-2 py-1.5 text-xs text-center font-mono">
                </td>
                <td class="py-2 px-1.5 w-32">
                    <input type="number" min="0" step="0.01" data-idx="${idx}" data-field="precio_unitario"
                        value="${precio}"
                        class="pres-pieza-input w-full rounded-lg px-2.5 py-1.5 text-xs text-right font-mono">
                </td>
                <td class="py-2 px-2 text-right font-mono text-xs font-bold text-slate-200 whitespace-nowrap" id="presSubtotalPieza-${idx}">
                    ${formatearImporte(subtotal, moneda)}
                </td>
                <td class="py-2 pl-1 text-right w-8">
                    <button type="button" data-idx="${idx}" class="pres-btn-del-pieza btn-remove" title="Quitar pieza">×</button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('.pres-pieza-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = Number(e.target.dataset.idx);
            const field = e.target.dataset.field;
            if (!presupuestoActual.piezas[idx]) return;

            if (field === 'descripcion') {
                presupuestoActual.piezas[idx].descripcion = e.target.value;
            } else if (field === 'cantidad') {
                presupuestoActual.piezas[idx].cantidad = Math.max(1, Number(e.target.value) || 1);
            } else if (field === 'precio_unitario') {
                presupuestoActual.piezas[idx].precio_unitario = Math.max(0, Number(e.target.value) || 0);
            }

            const p = presupuestoActual.piezas[idx];
            p.subtotal = Number(((Number(p.cantidad) || 1) * (Number(p.precio_unitario) || 0)).toFixed(2));
            const subCell = document.getElementById(`presSubtotalPieza-${idx}`);
            if (subCell) subCell.textContent = formatearImporte(p.subtotal, obtenerMonedaActiva());
            recalcularTotalesUI();
        });
    });

    tbody.querySelectorAll('.pres-btn-toggle-condicion').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.idx);
            const p = presupuestoActual.piezas[idx];
            if (!p) return;
            p.condicion = p.condicion === 'Segunda Mano' ? 'Nueva' : 'Segunda Mano';
            renderizarFilasPiezas();
        });
    });

    tbody.querySelectorAll('.pres-btn-del-pieza').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.idx);
            presupuestoActual.piezas.splice(idx, 1);
            renderizarFilasPiezas();
            recalcularTotalesUI();
        });
    });
}

function renderizarFilasManoObra() {
    const tbody = document.getElementById('presTablaManoObraBody');
    if (!tbody || !presupuestoActual) return;

    if (presupuestoActual.mano_de_obra.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-xs text-slate-500 py-4">
                    Sin mano de obra registrada. Usa "+ Agregar Mano de Obra" para añadir un concepto.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = presupuestoActual.mano_de_obra.map((m, idx) => {
        const precio = Number(m.precio ?? m.subtotal ?? 0) || 0;
        return `
            <tr class="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                <td class="py-2 pr-2">
                    <input type="text" data-idx="${idx}" data-field="descripcion"
                        value="${escapeHtml(m.descripcion)}"
                        placeholder="Descripción de la mano de obra..."
                        class="pres-mo-input w-full rounded-lg px-2.5 py-1.5 text-xs">
                </td>
                <td class="py-2 px-1.5 w-36">
                    <input type="number" min="0" step="0.01" data-idx="${idx}" data-field="precio"
                        value="${precio}"
                        class="pres-mo-input w-full rounded-lg px-2.5 py-1.5 text-xs text-right font-mono">
                </td>
                <td class="py-2 pl-1 text-right w-8">
                    <button type="button" data-idx="${idx}" class="pres-btn-del-mo btn-remove" title="Quitar mano de obra">×</button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('.pres-mo-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = Number(e.target.dataset.idx);
            const field = e.target.dataset.field;
            if (!presupuestoActual.mano_de_obra[idx]) return;

            if (field === 'descripcion') {
                presupuestoActual.mano_de_obra[idx].descripcion = e.target.value;
            } else if (field === 'precio') {
                const val = Math.max(0, Number(e.target.value) || 0);
                presupuestoActual.mano_de_obra[idx].precio = val;
                presupuestoActual.mano_de_obra[idx].subtotal = val;
            }
            recalcularTotalesUI();
        });
    });

    tbody.querySelectorAll('.pres-btn-del-mo').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.idx);
            presupuestoActual.mano_de_obra.splice(idx, 1);
            renderizarFilasManoObra();
            recalcularTotalesUI();
        });
    });
}

function recalcularTotalesUI() {
    if (!presupuestoActual) return;
    const moneda = obtenerMonedaActiva();

    const subPiezas = presupuestoActual.piezas.reduce((acc, p) => {
        return acc + ((Math.max(1, Number(p.cantidad) || 1)) * (Math.max(0, Number(p.precio_unitario) || 0)));
    }, 0);

    const subManoObra = presupuestoActual.mano_de_obra.reduce((acc, m) => {
        return acc + (Math.max(0, Number(m.precio ?? m.subtotal ?? 0) || 0));
    }, 0);

    const totalNeto = subPiezas + subManoObra;

    presupuestoActual.subtotal_piezas = Number(subPiezas.toFixed(2));
    presupuestoActual.subtotal_mano_obra = Number(subManoObra.toFixed(2));
    presupuestoActual.subtotal = Number(totalNeto.toFixed(2));
    presupuestoActual.total = Number(totalNeto.toFixed(2));

    const elSubPiezas = document.getElementById('presResumenPiezas');
    const elSubMO = document.getElementById('presResumenManoObra');
    const elTotal = document.getElementById('presResumenTotalNeto');

    if (elSubPiezas) elSubPiezas.textContent = formatearImporte(subPiezas, moneda);
    if (elSubMO) elSubMO.textContent = formatearImporte(subManoObra, moneda);
    if (elTotal) elTotal.textContent = formatearImporte(totalNeto, moneda);
}

// ─── Historial de Presupuestos Guardados ────────────────────────────────────
export async function cargarPresupuestos(userId) {
    if (!userId) return;
    const cont = document.getElementById('listaPresupuestosGuardados');
    if (!cont) return;

    try {
        const res = await obtenerPresupuestosAPI(userId);
        listaPresupuestos = res.data || [];
        renderizarListaPresupuestos();
    } catch (err) {
        console.error('Error al cargar presupuestos:', err);
        cont.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No se pudieron cargar los presupuestos previos.</p>`;
    }
}

function renderizarListaPresupuestos() {
    const cont = document.getElementById('listaPresupuestosGuardados');
    if (!cont) return;

    if (listaPresupuestos.length === 0) {
        cont.innerHTML = `<p class="text-sm text-slate-500 text-center py-6">Aún no has generado presupuestos.</p>`;
        return;
    }

    cont.innerHTML = listaPresupuestos.map((p, index) => {
        const bgClase = (index % 2 === 0)
            ? 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-500'
            : 'bg-slate-900/70 border-slate-800/90 hover:bg-slate-800/45 hover:border-slate-600';

        const moneda = p.moneda || datosPerfil.moneda || 'MXN';
        const totalTxt = formatearImporte(p.total, moneda);

        return `
            <div data-id="${p.id}" class="tarjeta-presupuesto ${bgClase} border p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between transition-all duration-200 gap-3 cursor-pointer group shadow-sm hover:shadow-md">
                <div class="flex items-start sm:items-center gap-3 min-w-0">
                    <span class="text-xs font-mono font-bold text-emerald-400 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-700 shrink-0">${escapeHtml(p.folio || 'COT')}</span>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-sm text-slate-200 group-hover:text-white transition-colors truncate">${escapeHtml(p.marca)} ${escapeHtml(p.modelo)}</span>
                            <span class="text-xs font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">${totalTxt}</span>
                        </div>
                        <p class="text-xs text-slate-400 truncate mt-0.5">${escapeHtml(p.descripcion_trabajo || '')}</p>
                        <p class="text-[11px] text-slate-500 mt-0.5">${new Date(p.creado_en).toLocaleString('es-ES')} · 📍 ${escapeHtml(p.ciudad || '')}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button type="button" class="text-xs bg-slate-800 group-hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-600 group-hover:border-slate-500 transition-colors pointer-events-none">
                        Editar / Ver
                    </button>
                    <button type="button" data-del-id="${p.id}" class="btn-eliminar-presupuesto text-xs bg-red-500/15 hover:bg-red-500/30 text-red-300 px-2.5 py-2 rounded-lg border border-red-500/30 transition-colors" title="Eliminar presupuesto">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');

    cont.querySelectorAll('.tarjeta-presupuesto').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-eliminar-presupuesto')) return;
            const id = card.getAttribute('data-id');
            const encontrado = listaPresupuestos.find(item => String(item.id) === String(id));
            if (encontrado) {
                renderizarEditorPresupuesto(encontrado);
                showToast(`Presupuesto ${encontrado.folio} cargado en el editor`, 'info');
                document.getElementById('hojaPresupuestoEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    cont.querySelectorAll('.btn-eliminar-presupuesto').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-del-id');
            const userId = window._getPresupuestoUserId ? window._getPresupuestoUserId() : null;
            if (!id || !userId) return;

            try {
                await eliminarPresupuestoAPI(id, userId);
                listaPresupuestos = listaPresupuestos.filter(item => String(item.id) !== String(id));
                renderizarListaPresupuestos();
                if (presupuestoActual && String(presupuestoActual.id) === String(id)) {
                    presupuestoActual = null;
                    document.getElementById('hojaPresupuestoEditor')?.classList.add('hidden');
                    document.getElementById('presEstadoVacio')?.classList.remove('hidden');
                }
                showToast('Presupuesto eliminado', 'info');
            } catch (err) {
                showToast(err.message || 'No se pudo eliminar', 'error');
            }
        });
    });
}

// ─── Inicializar Listeners de Presupuestos ──────────────────────────────────
export function initPresupuestosListeners(getUserId) {
    window._getPresupuestoUserId = getUserId;

    window.addEventListener('reportesActualizados', () => {
        actualizarSelectorReportesPresupuesto();
    });

    // Botones de Modo (Desde Reporte vs Desde Cero)
    document.getElementById('btnModoReporte')?.addEventListener('click', () => cambiarModoEntrada('reporte'));
    document.getElementById('btnModoManual')?.addEventListener('click', () => cambiarModoEntrada('manual'));

    // Al elegir un reporte del dropdown, rellenar Marca, Modelo y Descripción
    const selectReporte = document.getElementById('presSelectReporte');
    if (selectReporte) {
        selectReporte.addEventListener('change', () => {
            const id = selectReporte.value;
            const reportes = getTodosLosReportes() || [];
            const r = reportes.find(item => String(item.id) === String(id));
            if (r) {
                aplicarDatosDeReporteSeleccionado(r);
            }
            actualizarIndicadorCosto();
        });
    }

    // Botones de preferencia de condición de piezas
    document.querySelectorAll('.btn-pref-piezas').forEach(btn => {
        btn.addEventListener('click', () => {
            condicionPreferida = btn.getAttribute('data-cond') || 'Nueva';
            document.querySelectorAll('.btn-pref-piezas').forEach(b => {
                b.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-500');
                b.classList.add('bg-slate-900', 'text-slate-400', 'border-slate-700');
            });
            btn.classList.add('bg-emerald-600', 'text-white', 'border-emerald-500');
            btn.classList.remove('bg-slate-900', 'text-slate-400', 'border-slate-700');
        });
    });

    // Marcar si el usuario editó manualmente la ciudad
    const ciudadInput = document.getElementById('presCiudad');
    if (ciudadInput) {
        ciudadInput.addEventListener('input', () => {
            ciudadInput.dataset.editadoManual = 'true';
        });
    }

    // Formulario para generar presupuesto con IA
    const formGenerar = document.getElementById('presupuestoForm');
    if (formGenerar) {
        formGenerar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = getUserId();
            if (!userId) return showToast('Inicia sesión para continuar', 'error');

            const reporteId = modoEntrada === 'reporte'
                ? (document.getElementById('presSelectReporte')?.value || null)
                : null;

            if (modoEntrada === 'reporte' && !reporteId) {
                return showToast('Selecciona un reporte de la lista o cambia a "Desde Cero"', 'error');
            }

            const marca = document.getElementById('presMarca')?.value.trim() || '';
            const modelo = document.getElementById('presModelo')?.value.trim() || '';
            const descripcionTrabajo = document.getElementById('presDescripcionTrabajo')?.value.trim() || '';
            const ciudad = document.getElementById('presCiudad')?.value.trim() || datosPerfil.ciudad || 'Ciudad Juárez, Chih.';
            const moneda = datosPerfil.moneda || localStorage.getItem('diagnostik_moneda_taller') || 'MXN';

            if (!marca || !modelo || !descripcionTrabajo) {
                return showToast('Completa la marca, modelo y qué se va a reparar o reemplazar', 'error');
            }

            const btn = document.getElementById('btnGenerarPresupuesto');
            const btnTexto = document.getElementById('presBtnGenerarTexto');
            if (btn) btn.disabled = true;
            if (btnTexto) btnTexto.textContent = 'Calculando precios con IA...';

            try {
                const res = await generarPresupuestoAPI({
                    userId,
                    reporteId,
                    marca,
                    modelo,
                    descripcionTrabajo,
                    ciudad,
                    moneda,
                    preferenciaPiezas: condicionPreferida
                });

                // Actualizar contador de tokens en UI
                if (res.creditosRestantes !== undefined) {
                    document.querySelectorAll('.ui-creditos-val').forEach(el => {
                        el.textContent = res.creditosRestantes;
                    });
                }

                if (reporteId) {
                    marcarReportePresupuestadoLocal(reporteId);
                }

                renderizarEditorPresupuesto(res.data);
                await cargarPresupuestos(userId);

                showToast(
                    res.esGratis
                        ? '✨ Presupuesto gratuito generado con éxito'
                        : '✅ Presupuesto generado con IA',
                    'success'
                );

                if (window.innerWidth < 1024) {
                    document.getElementById('hojaPresupuestoEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } catch (err) {
                showToast(err.message || 'Error al generar el presupuesto', 'error');
            } finally {
                if (btn) btn.disabled = false;
                actualizarIndicadorCosto();
            }
        });
    }

    // Botón: + Agregar Pieza
    document.getElementById('btnAgregarPiezaPres')?.addEventListener('click', () => {
        if (!presupuestoActual) return;
        presupuestoActual.piezas.push({
            id: `p-${Date.now()}`,
            descripcion: 'Nueva pieza / refacción',
            condicion: condicionPreferida === 'Segunda Mano' ? 'Segunda Mano' : 'Nueva',
            cantidad: 1,
            precio_unitario: 0,
            subtotal: 0
        });
        renderizarFilasPiezas();
        recalcularTotalesUI();
    });

    // Botón: + Agregar Mano de Obra
    document.getElementById('btnAgregarManoObraPres')?.addEventListener('click', () => {
        if (!presupuestoActual) return;
        presupuestoActual.mano_de_obra.push({
            id: `mo-${Date.now()}`,
            descripcion: 'Mano de obra adicional',
            precio: 0,
            subtotal: 0
        });
        renderizarFilasManoObra();
        recalcularTotalesUI();
    });

    // Inputs de Tiempo Estimado y Notas
    document.getElementById('presEditorTiempo')?.addEventListener('input', (e) => {
        if (presupuestoActual) presupuestoActual.tiempo_estimado = e.target.value;
    });
    document.getElementById('presEditorNotas')?.addEventListener('input', (e) => {
        if (presupuestoActual) presupuestoActual.notas = e.target.value;
    });

    // Botón: Guardar Cambios del Presupuesto
    document.getElementById('btnGuardarCambiosPres')?.addEventListener('click', async () => {
        if (!presupuestoActual || !presupuestoActual.id) return;
        const userId = getUserId();
        if (!userId) return;

        const btn = document.getElementById('btnGuardarCambiosPres');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Guardando...';
        }

        try {
            const res = await actualizarPresupuestoAPI(presupuestoActual.id, {
                userId,
                marca: presupuestoActual.marca,
                modelo: presupuestoActual.modelo,
                descripcion_trabajo: presupuestoActual.descripcion_trabajo,
                ciudad: presupuestoActual.ciudad,
                moneda: obtenerMonedaActiva(),
                piezas: presupuestoActual.piezas,
                mano_de_obra: presupuestoActual.mano_de_obra,
                tiempo_estimado: presupuestoActual.tiempo_estimado,
                notas: presupuestoActual.notas
            });

            presupuestoActual = res.data;
            await cargarPresupuestos(userId);
            showToast('💾 Cambios del presupuesto guardados', 'success');
        } catch (err) {
            showToast(err.message || 'Error al guardar cambios', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '💾 Guardar Cambios';
            }
        }
    });

    // Botón: Imprimir / PDF
    document.getElementById('btnImprimirPresupuesto')?.addEventListener('click', () => {
        if (!presupuestoActual) return;
        imprimirPresupuesto(presupuestoActual);
    });
}

