import { datosPerfil } from './taller.js';

// ─── Utilidades ───────────────────────────────────────────────────────────────
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function severidadClase(severidad) {
    if (severidad === 'Crítica' || severidad === 'Alta') return 'danger';
    if (severidad === 'Baja') return 'success';
    return 'warning';
}

export function formatearFecha(fecha, conHora = false) {
    const d = fecha ? new Date(fecha) : new Date();
    if (isNaN(d)) return '';
    const opts = { year: 'numeric', month: 'long', day: 'numeric' };
    if (conHora) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-MX', opts);
}

/**
 * Los reportes antiguos sólo guardaban el texto "enriquecido" de síntomas
 * (síntomas + lista de DTCs). Esta función lo separa en sus partes.
 */
export function parsearSintomas(texto = '') {
    let limpio = String(texto || '').replace(/\[Diagnóstico sin códigos[^\]]*\]/gi, '').trim();
    const marcador = /\n*\s*Códigos DTC detectados:\s*\n?/i;
    const partes = limpio.split(marcador);
    const sintomas = (partes[0] || '').trim();
    const dtcs = [];

    if (partes[1]) {
        partes[1].split('\n').forEach(linea => {
            const m = linea.trim().match(/^-\s*([^:]+):\s*(.*?)(?:\s*\(Info adicional del taller:\s*(.*)\))?$/);
            if (m) dtcs.push({ code: m[1].trim(), desc: m[2].trim(), system: '', contextInfo: (m[3] || '').trim() });
        });
    }
    return { sintomas, dtcs };
}

/** Convierte un registro de la tabla `reportes` a un objeto de reporte uniforme. */
export function normalizarDesdeHistorial(r) {
    const d = r.diagnostico || {};
    const ficha = d.ficha_vehiculo || {};
    const parsed = parsearSintomas(r.sintomas);

    return {
        id: r.id,
        fecha: r.creado_en,
        marca: r.marca || '',
        modelo: r.modelo || '',
        vin: ficha.vin || d.vin || '',
        motor: ficha.motor || d.motor || '',
        transmision: ficha.transmision || d.transmision || '',
        kilometraje: ficha.kilometraje || d.kilometraje || '',
        codigo: r.codigo || d.codigo || '',
        sintomas: ficha.sintomas_reportados || parsed.sintomas,
        dtcs: (ficha.dtcs && ficha.dtcs.length) ? ficha.dtcs : parsed.dtcs,
        tieneFicha: !!r.diagnostico?.ficha_vehiculo,
        diagnostico: d
    };
}

// ─── Plantilla de impresión ───────────────────────────────────────────────────
function campo(label, valor, mono = false) {
    const vacio = !valor;
    return `
        <div class="field">
            <span class="field-label">${label}</span>
            <span class="field-value ${mono ? 'mono' : ''} ${vacio ? 'empty' : ''}">${vacio ? 'No registrado' : escapeHtml(valor)}</span>
        </div>`;
}

export function construirHTMLImpresion(rep) {
    const d = rep.diagnostico || {};
    const taller = datosPerfil || {};
    const sev = d.severidad || 'Media';
    const sevCls = severidadClase(sev);
    const folio = rep.id ? `#${String(rep.id).slice(0, 8).toUpperCase()}` : 'Borrador';
    const causas = Array.isArray(d.posibles_causas) ? d.posibles_causas : [];
    const pasos = Array.isArray(d.procedimiento_diagnostico) ? d.procedimiento_diagnostico : [];
    const dtcs = Array.isArray(rep.dtcs) ? rep.dtcs : [];

    const dtcHtml = dtcs.length
        ? dtcs.map(x => `
            <div class="dtc-row">
                <span class="dtc-code">${escapeHtml(x.code)}</span>
                <span class="dtc-desc">${escapeHtml(x.desc)}${x.contextInfo ? ` <em>— ${escapeHtml(x.contextInfo)}</em>` : ''}</span>
            </div>`).join('')
        : `<div class="dtc-row"><span class="dtc-code muted">${escapeHtml(rep.codigo || 'Sin DTC')}</span><span class="dtc-desc">${rep.codigo && !/^sin dtc/i.test(rep.codigo) ? '' : 'Falla mecánica / física sin códigos OBD2'}</span></div>`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte_${escapeHtml((rep.marca + '_' + rep.modelo).replace(/\s+/g, '_'))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
<style>
    @page { size: A4; margin: 11mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; }
    body {
        font-family: 'Inter', Arial, sans-serif;
        color: #1e293b;
        font-size: 9.6pt;
        line-height: 1.45;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .page { width: 100%; }

    /* Header */
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 10px; }
    .brand { display: flex; gap: 12px; align-items: center; }
    .brand img { width: 54px; height: 54px; object-fit: contain; border-radius: 10px; border: 1px solid #e2e8f0; padding: 3px; }
    .brand h1 { font-size: 15pt; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
    .brand p { font-size: 8.3pt; color: #64748b; }
    .doc-meta { text-align: right; }
    .doc-title { font-size: 8pt; font-weight: 800; letter-spacing: 0.14em; color: #6d28d9; text-transform: uppercase; }
    .doc-folio { font-family: 'JetBrains Mono', monospace; font-size: 10.5pt; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .doc-date { font-size: 8.3pt; color: #64748b; margin-top: 1px; }
    .accent { height: 4px; border-radius: 4px; background: linear-gradient(90deg, #7c3aed, #2563eb); margin-bottom: 12px; }

    /* Secciones */
    .section { margin-bottom: 11px; break-inside: avoid; page-break-inside: avoid; }
    .section-title {
        font-size: 7.8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
        color: #475569; margin-bottom: 5px; display: flex; align-items: center; gap: 6px;
    }
    .section-title::before { content: ''; width: 3px; height: 10px; border-radius: 2px; background: #7c3aed; display: inline-block; }
    .section-title.green::before { background: #059669; }
    .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 11px; background: #f8fafc; }

    /* Vehículo */
    .vehicle-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px; }
    .vehicle-name { font-size: 13pt; font-weight: 800; color: #0f172a; }
    .badge { font-size: 7.6pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
    .badge.danger { background: #fee2e2; color: #b91c1c; }
    .badge.warning { background: #fef3c7; color: #b45309; }
    .badge.success { background: #d1fae5; color: #047857; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 14px; }
    .field { display: flex; flex-direction: column; min-width: 0; }
    .field-label { font-size: 6.9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
    .field-value { font-size: 9.2pt; font-weight: 600; color: #0f172a; word-break: break-word; }
    .field-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 8.6pt; }
    .field-value.empty { color: #cbd5e1; font-weight: 500; font-style: italic; }

    /* DTCs / síntomas */
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .dtc-row { display: flex; gap: 8px; align-items: baseline; padding: 2px 0; }
    .dtc-code { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 8.6pt; color: #fff; background: #4c1d95; padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
    .dtc-code.muted { background: #64748b; }
    .dtc-desc { font-size: 8.8pt; color: #334155; }
    .dtc-desc em { color: #64748b; }
    .text { font-size: 9pt; color: #334155; white-space: pre-line; }

    /* Diagnóstico */
    .diag-title { font-size: 11pt; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .summary { border-left: 3px solid #7c3aed; background: #faf5ff; border-radius: 0 8px 8px 0; padding: 8px 11px; font-size: 9pt; color: #334155; }
    ul.list, ol.list { list-style: none; display: flex; flex-direction: column; gap: 4px; }
    .list li { display: flex; gap: 7px; align-items: flex-start; font-size: 8.9pt; color: #334155; break-inside: avoid; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #059669; margin-top: 5px; flex-shrink: 0; }
    .num { min-width: 17px; height: 17px; border-radius: 5px; background: #ede9fe; color: #5b21b6; font-size: 7.8pt; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .solution { border: 1px solid #a7f3d0; background: #ecfdf5; border-radius: 8px; padding: 9px 11px; }
    .solution-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 4px; }
    .solution-head strong { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; color: #047857; }
    .time { font-size: 8pt; font-weight: 700; color: #065f46; background: #d1fae5; padding: 2px 8px; border-radius: 999px; }
    .solution p { font-size: 9pt; color: #1e293b; }

    /* Firmas / pie */
    .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 26px; break-inside: avoid; }
    .sign { border-top: 1px solid #94a3b8; padding-top: 4px; text-align: center; font-size: 8pt; color: #64748b; }
    .foot { margin-top: 14px; padding-top: 7px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 7.2pt; color: #94a3b8; }
</style>
</head>
<body>
<div class="page" id="page">
    <header class="head">
        <div class="brand">
            ${taller.logo_url ? `<img src="${escapeHtml(taller.logo_url)}" alt="Logo">` : ''}
            <div>
                <h1>${escapeHtml(taller.nombre_taller || 'Taller Mecánico')}</h1>
                ${taller.telefono ? `<p>Tel. ${escapeHtml(taller.telefono)}</p>` : ''}
                ${taller.direccion ? `<p>${escapeHtml(taller.direccion)}</p>` : ''}
            </div>
        </div>
        <div class="doc-meta">
            <div class="doc-title">Reporte de Diagnóstico</div>
            <div class="doc-folio">${escapeHtml(folio)}</div>
            <div class="doc-date">${escapeHtml(formatearFecha(rep.fecha, true))}</div>
        </div>
    </header>
    <div class="accent"></div>

    <section class="section">
        <div class="section-title">Datos del vehículo</div>
        <div class="box">
            <div class="vehicle-top">
                <div class="vehicle-name">${escapeHtml(rep.marca)} ${escapeHtml(rep.modelo)}</div>
                <span class="badge ${sevCls}">Severidad ${escapeHtml(sev)}</span>
            </div>
            <div class="grid">
                ${campo('VIN / Serie', rep.vin, true)}
                ${campo('Motor', rep.motor)}
                ${campo('Transmisión', rep.transmision)}
                ${campo('Kilometraje', rep.kilometraje)}
            </div>
        </div>
    </section>

    <section class="section two">
        <div>
            <div class="section-title">Códigos de falla (DTC)</div>
            <div class="box">${dtcHtml}</div>
        </div>
        <div>
            <div class="section-title">Síntomas reportados</div>
            <div class="box"><p class="text">${escapeHtml(rep.sintomas || 'Sin síntomas registrados.')}</p></div>
        </div>
    </section>

    <section class="section">
        <div class="section-title">Diagnóstico técnico</div>
        ${d.descripcion_corta ? `<div class="diag-title">${escapeHtml(d.descripcion_corta)}</div>` : ''}
        ${d.resumen_analisis ? `<div class="summary">${escapeHtml(d.resumen_analisis)}</div>` : ''}
    </section>

    <section class="section two">
        <div>
            <div class="section-title green">Posibles causas</div>
            <ul class="list">
                ${causas.map(c => `<li><span class="dot"></span><span>${escapeHtml(c)}</span></li>`).join('') || '<li>—</li>'}
            </ul>
        </div>
        <div>
            <div class="section-title">Procedimiento de diagnóstico</div>
            <ol class="list">
                ${pasos.map((p, i) => `<li><span class="num">${i + 1}</span><span>${escapeHtml(p)}</span></li>`).join('') || '<li>—</li>'}
            </ol>
        </div>
    </section>

    <section class="section">
        <div class="solution">
            <div class="solution-head">
                <strong>Solución recomendada</strong>
                <span class="time">Tiempo estimado: ${escapeHtml(d.tiempo_estimado_reparacion || 'N/A')}</span>
            </div>
            <p>${escapeHtml(d.solucion_recomendada || '')}</p>
        </div>
    </section>

    <div class="signs">
        <div class="sign">Técnico responsable${taller.nombre_usuario ? ` · ${escapeHtml(taller.nombre_usuario)}` : ''}</div>
        <div class="sign">Firma de conformidad del cliente</div>
    </div>

    <footer class="foot">
        <span>Diagnóstico orientativo generado con DiagnostikAI. Confirmar con pruebas físicas antes de reparar.</span>
        <span>${escapeHtml(folio)}</span>
    </footer>
</div>
</body>
</html>`;
}

// ─── Impresión mediante iframe oculto (texto vectorial, nítido y seleccionable) ───
const MM_TO_PX = 96 / 25.4;
const PRINTABLE_WIDTH_PX = (210 - 24) * MM_TO_PX;   // A4 menos márgenes laterales
const PRINTABLE_HEIGHT_PX = (297 - 22) * MM_TO_PX;  // A4 menos márgenes verticales
const MAX_SHRINK = 0.72; // Si hace falta reducir más que esto, se permite 2ª página

export function imprimirReporte(rep) {
    const prev = document.getElementById('printFrame');
    if (prev) prev.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'printFrame';
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
        position: 'fixed', left: '-10000px', top: '0', border: '0',
        width: `${PRINTABLE_WIDTH_PX}px`, height: '100px', opacity: '0', pointerEvents: 'none'
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    doc.open();
    doc.write(construirHTMLImpresion(rep));
    doc.close();

    const tituloOriginal = document.title;
    const nombreArchivo = `Reporte_${rep.marca}_${rep.modelo}_${new Date(rep.fecha || Date.now()).toISOString().slice(0, 10)}`
        .replace(/[^\w\-áéíóúñÁÉÍÓÚÑ]+/g, '_');

    let limpio = false;
    const limpiar = () => {
        if (limpio) return;
        limpio = true;
        document.title = tituloOriginal;
        iframe.remove();
    };

    const lanzar = async () => {
        try {
            if (doc.fonts?.ready) await doc.fonts.ready;
            const imgs = Array.from(doc.images);
            await Promise.all(imgs.map(img => img.complete ? null : new Promise(res => { img.onload = img.onerror = res; })));

            // Ajuste automático para que quepa en una sola hoja cuando es posible
            const page = doc.getElementById('page');
            const alto = page.scrollHeight;
            if (alto > PRINTABLE_HEIGHT_PX) {
                const escala = PRINTABLE_HEIGHT_PX / alto;
                if (escala >= MAX_SHRINK) page.style.zoom = String(Math.floor(escala * 1000) / 1000);
            }

            document.title = nombreArchivo; // Chrome usa el título como nombre del PDF
            iframe.contentWindow.addEventListener('afterprint', () => setTimeout(limpiar, 200), { once: true });
            setTimeout(limpiar, 120000); // respaldo
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (err) {
            console.error('Error al imprimir reporte:', err);
            limpiar();
        }
    };

    if (doc.readyState === 'complete') lanzar();
    else iframe.addEventListener('load', lanzar, { once: true });
}
