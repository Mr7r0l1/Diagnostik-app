import { escapeHtml, severidadClase, formatearFecha, imprimirReporte } from './reportePrint.js';
import { switchTab } from './navigation.js';

let reporteEnVista = null;

function filaFicha(icono, label, valor, mono = false) {
    const vacio = !valor;
    return `
        <div class="viewer-field">
            <span class="viewer-field-icon">${icono}</span>
            <div class="min-w-0">
                <p class="viewer-field-label">${label}</p>
                <p class="viewer-field-value ${mono ? 'mono' : ''} ${vacio ? 'empty' : ''}">${vacio ? 'No registrado' : escapeHtml(valor)}</p>
            </div>
        </div>`;
}

/** Muestra un reporte (ya normalizado) en la vista de solo lectura. */
export function abrirVistaReporte(rep) {
    reporteEnVista = rep;
    const cont = document.getElementById('reporteVerContenido');
    if (!cont) return;

    const d = rep.diagnostico || {};
    const sev = d.severidad || 'Media';
    const causas = Array.isArray(d.posibles_causas) ? d.posibles_causas : [];
    const pasos = Array.isArray(d.procedimiento_diagnostico) ? d.procedimiento_diagnostico : [];
    const dtcs = Array.isArray(rep.dtcs) ? rep.dtcs : [];
    const folio = rep.id ? `#${String(rep.id).slice(0, 8).toUpperCase()}` : '';

    cont.innerHTML = `
        <!-- Barra de acciones -->
        <div class="app-card p-4 flex flex-wrap items-center justify-between gap-3 animate-report-appear">
            <div class="flex items-center gap-3 min-w-0">
                <button type="button" id="btnVolverHistorial" class="viewer-back-btn" title="Volver al historial">←</button>
                <div class="min-w-0">
                    <p class="viewer-kicker">Reporte ${escapeHtml(folio)} · ${escapeHtml(formatearFecha(rep.fecha, true))}</p>
                    <h3 class="viewer-title truncate">${escapeHtml(d.descripcion_corta || 'Reporte de diagnóstico')}</h3>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="badge badge-${severidadClase(sev)}">Severidad: ${escapeHtml(sev)}</span>
                <button type="button" id="btnImprimirVista" class="btn-primary text-sm">🖨️ Imprimir / PDF</button>
            </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <!-- Columna izquierda: ficha del vehículo (bloqueada) -->
            <aside class="xl:col-span-4 space-y-5">
                <div class="app-card viewer-vehicle-card animate-report-appear" style="animation-delay:0.05s">
                    <div class="viewer-vehicle-hero">
                        <div class="flex items-center justify-between gap-2">
                            <span class="viewer-section-label light">🚘 Ficha del Vehículo</span>
                            <span class="viewer-lock" title="Datos registrados al momento del diagnóstico">🔒 Solo lectura</span>
                        </div>
                        <p class="viewer-vehicle-name">${escapeHtml(rep.marca)}</p>
                        <p class="viewer-vehicle-model">${escapeHtml(rep.modelo)}</p>
                    </div>
                    <div class="p-4 space-y-2">
                        ${filaFicha('🔢', 'VIN / Serie', rep.vin, true)}
                        ${filaFicha('⚙️', 'Motor / Cilindrada', rep.motor)}
                        ${filaFicha('🕹️', 'Transmisión', rep.transmision)}
                        ${filaFicha('📏', 'Kilometraje', rep.kilometraje)}
                        ${filaFicha('📅', 'Fecha de ingreso', formatearFecha(rep.fecha, true))}
                    </div>
                    ${!rep.tieneFicha ? `
                        <p class="viewer-note">Este reporte se creó antes de que se guardara la ficha técnica (VIN, motor, etc.), por eso esos campos aparecen vacíos.</p>
                    ` : ''}
                </div>

                <div class="app-card p-5 space-y-3 animate-report-appear" style="animation-delay:0.1s">
                    <p class="viewer-section-label">🔍 Códigos DTC</p>
                    ${dtcs.length ? dtcs.map(x => `
                        <div class="viewer-dtc">
                            <span class="dtc-code-badge">${escapeHtml(x.code)}</span>
                            <div class="min-w-0">
                                <p class="text-sm font-semibold" style="color:var(--text-primary)">${escapeHtml(x.desc)}</p>
                                ${x.contextInfo ? `<p class="text-xs text-muted mt-0.5">Nota del taller: ${escapeHtml(x.contextInfo)}</p>` : ''}
                            </div>
                        </div>
                    `).join('') : `
                        <div class="viewer-dtc">
                            <span class="dtc-code-badge" style="background:var(--text-muted)">${escapeHtml(rep.codigo || 'Sin DTC')}</span>
                            <p class="text-sm text-muted">Sin códigos OBD2 registrados</p>
                        </div>
                    `}
                </div>

                <div class="app-card p-5 space-y-3 animate-report-appear" style="animation-delay:0.15s">
                    <p class="viewer-section-label">📝 Síntomas reportados</p>
                    <p class="viewer-readonly-text">${escapeHtml(rep.sintomas || 'Sin síntomas registrados.')}</p>
                </div>
            </aside>

            <!-- Columna derecha: diagnóstico -->
            <section class="xl:col-span-8 space-y-5">
                ${d.resumen_analisis ? `
                <div class="app-card p-5 space-y-3 animate-report-appear" style="animation-delay:0.1s">
                    <p class="report-section-title purple">📋 Análisis Técnico General</p>
                    <div class="viewer-summary">${escapeHtml(d.resumen_analisis)}</div>
                </div>` : ''}

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div class="app-card p-5 space-y-3 animate-report-appear" style="animation-delay:0.15s">
                        <p class="report-section-title emerald">🔍 Posibles Causas Raíz</p>
                        <ul class="report-list">
                            ${causas.map(c => `
                                <li class="report-list-item">
                                    <div class="flex items-start gap-2 flex-1">
                                        <span class="bullet-emerald">•</span><span>${escapeHtml(c)}</span>
                                    </div>
                                </li>`).join('') || '<li class="text-sm text-muted">Sin datos</li>'}
                        </ul>
                    </div>
                    <div class="app-card p-5 space-y-3 animate-report-appear" style="animation-delay:0.2s">
                        <p class="report-section-title purple">🛠️ Procedimiento de Diagnóstico</p>
                        <ol class="report-list">
                            ${pasos.map((p, i) => `
                                <li class="report-list-item">
                                    <div class="flex items-start gap-3 flex-1">
                                        <span class="step-badge">${i + 1}</span><span>${escapeHtml(p)}</span>
                                    </div>
                                </li>`).join('') || '<li class="text-sm text-muted">Sin datos</li>'}
                        </ol>
                    </div>
                </div>

                <div class="app-card p-5 animate-report-appear" style="animation-delay:0.25s">
                    <div class="solution-card">
                        <div class="flex justify-between items-center flex-wrap gap-2">
                            <p class="report-section-title emerald mb-0">✅ Solución Sugerida</p>
                            <span class="time-badge">⏱️ ${escapeHtml(d.tiempo_estimado_reparacion || 'N/A')}</span>
                        </div>
                        <p class="solution-text">${escapeHtml(d.solucion_recomendada || '')}</p>
                    </div>
                </div>
            </section>
        </div>
    `;

    document.getElementById('btnVolverHistorial')?.addEventListener('click', () => switchTab('tab-historial'));
    document.getElementById('btnImprimirVista')?.addEventListener('click', () => imprimirReporte(reporteEnVista));

    switchTab('tab-reporte-ver');
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
}
