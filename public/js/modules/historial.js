import { obtenerHistorialAPI } from '../services/api.js';
import { abrirVistaReporte } from './reporteViewer.js';
import { normalizarDesdeHistorial, escapeHtml } from './reportePrint.js';
import { showToast } from './toast.js';

let todosLosReportes = [];

export async function cargarHistorial(userId) {
    if (!userId) return;

    const lista = document.getElementById('listaHistorial');
    if (!lista) return;

    try {
        const json = await obtenerHistorialAPI(userId);

        if (!json.data || json.data.length === 0) {
            todosLosReportes = [];
            lista.innerHTML = `<p class="text-sm text-slate-500 text-center py-6">No hay reportes previos registrados en tu cuenta.</p>`;
            actualizarEstadisticasDashboard([]);
            return;
        }

        todosLosReportes = json.data;
        renderizarListaFiltrada(todosLosReportes);
        actualizarEstadisticasDashboard(todosLosReportes);

    } catch (err) {
        lista.innerHTML = `<p class="text-sm text-red-400 text-center py-4">Error al cargar historial: ${err.message}</p>`;
    }
}

export function renderizarListaFiltrada(reportes) {
    const lista = document.getElementById('listaHistorial');
    if (!lista) return;

    if (reportes.length === 0) {
        lista.innerHTML = `<p class="text-sm text-slate-400 text-center py-8">No se encontraron reportes con los criterios de búsqueda.</p>`;
        return;
    }

    lista.innerHTML = reportes.map((r, index) => {
        const severidad = r.diagnostico?.severidad || 'Media';
        let badgeColor = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
        if (severidad === 'Crítica' || severidad === 'Alta') {
            badgeColor = 'bg-red-500/20 text-red-400 border-red-500/40';
        } else if (severidad === 'Baja') {
            badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
        }

        return `
            <div class="glass-panel p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between hover:border-slate-600 transition-all gap-3">
                <div class="flex items-start sm:items-center gap-3">
                    <span class="text-xs font-mono font-bold text-emerald-400 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-700 shrink-0">${escapeHtml(r.codigo)}</span>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-sm text-slate-200 truncate">${escapeHtml(r.marca)} ${escapeHtml(r.modelo)}</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${badgeColor}">${severidad}</span>
                        </div>
                        <p class="text-[11px] sm:text-xs text-slate-400 mt-0.5">${new Date(r.creado_en).toLocaleString('es-ES')}</p>
                    </div>
                </div>
                <button data-id="${r.id}" class="btn-ver-historial text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2.5 rounded-lg border border-slate-600 transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0">
                    <img src="icons/eye.svg" class="w-4 h-4 object-contain" alt="">
                </button>
            </div>
        `;
    }).join('');

    // Attach click handlers
    lista.querySelectorAll('.btn-ver-historial').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const r = todosLosReportes.find(item => String(item.id) === String(id));
            if (r) {
                abrirVistaReporte(normalizarDesdeHistorial(r));
                showToast(`Reporte ${r.codigo} abierto`, 'info');
            }
        });
    });
}

function actualizarEstadisticasDashboard(reportes) {
    const totalEl = document.getElementById('statTotalReportes');
    const criticosEl = document.getElementById('statCriticosCount');
    const marcasEl = document.getElementById('statMarcasCount');

    if (totalEl) totalEl.textContent = reportes.length;

    if (criticosEl) {
        const criticos = reportes.filter(r => r.diagnostico?.severidad === 'Crítica' || r.diagnostico?.severidad === 'Alta').length;
        criticosEl.textContent = criticos;
    }

    if (marcasEl) {
        const marcasUnicas = new Set(reportes.map(r => r.marca)).size;
        marcasEl.textContent = marcasUnicas;
    }

    // Renderizar Actividad Reciente en el Dashboard
    const actividadCont = document.getElementById('dashboardActividadReciente');
    if (actividadCont) {
        if (reportes.length === 0) {
            actividadCont.innerHTML = `<p class="text-xs text-slate-500 py-3">Sin actividad reciente.</p>`;
        } else {
            actividadCont.innerHTML = reportes.slice(0, 3).map(r => `
                <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-emerald-400">${r.codigo}</span>
                        <span class="text-slate-300 font-medium">${r.marca} ${r.modelo}</span>
                    </div>
                    <span class="text-slate-500">${new Date(r.creado_en).toLocaleDateString()}</span>
                </div>
            `).join('');
        }
    }
}

export function initHistorialListeners() {
    const searchInput = document.getElementById('searchHistorial');
    const filterSeveridad = document.getElementById('filterSeveridad');

    const aplicarFiltros = () => {
        const query = searchInput?.value.toLowerCase().trim() || '';
        const severidad = filterSeveridad?.value || 'todas';

        const filtrados = todosLosReportes.filter(r => {
            const coincideTexto = (r.codigo || '').toLowerCase().includes(query) ||
                (r.marca || '').toLowerCase().includes(query) ||
                (r.modelo || '').toLowerCase().includes(query) ||
                (r.sintomas && r.sintomas.toLowerCase().includes(query)) ||
                (r.diagnostico?.ficha_vehiculo?.vin || '').toLowerCase().includes(query);

            const coincideSeveridad = severidad === 'todas' || r.diagnostico?.severidad === severidad;

            return coincideTexto && coincideSeveridad;
        });

        renderizarListaFiltrada(filtrados);
    };

    if (searchInput) searchInput.addEventListener('input', aplicarFiltros);
    if (filterSeveridad) filterSeveridad.addEventListener('change', aplicarFiltros);
}
