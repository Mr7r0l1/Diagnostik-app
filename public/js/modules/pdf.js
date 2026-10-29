import { getReporteParaImprimir } from './diagnostico.js';
import { imprimirReporte } from './reportePrint.js';
import { iniciarPresupuestoDesdeReporte } from './presupuestos.js';
import { showToast } from './toast.js';

// Imprime el reporte recién generado usando la plantilla A4 personalizada
// (antes se usaba html2pdf, que rasterizaba la pantalla y partía el contenido).
export function initPdfListener() {
    const btnPdf = document.getElementById('btnDescargarPdf');
    const btnCotizar = document.getElementById('btnCotizarReporteReciente');

    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            const rep = getReporteParaImprimir();
            if (!rep) return showToast('Primero genera un reporte.', 'info');
            imprimirReporte(rep);
        });
    }

    if (btnCotizar) {
        btnCotizar.addEventListener('click', () => {
            const rep = getReporteParaImprimir();
            if (!rep) return showToast('Primero genera un reporte.', 'info');
            iniciarPresupuestoDesdeReporte(rep);
        });
    }
}
