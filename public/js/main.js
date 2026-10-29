import { checkSession, initAuthListeners, getUsuarioActual } from './modules/auth.js';
import { switchTab, initNavigation } from './modules/navigation.js';
import { initTallerListeners } from './modules/taller.js';
import { initDiagnosticoListeners } from './modules/diagnostico.js';
import { initHistorialListeners } from './modules/historial.js';
import { initPresupuestosListeners } from './modules/presupuestos.js';
import { initTokensListeners } from './modules/tokens.js';
import { initPdfListener } from './modules/pdf.js';
import { initTheme, initThemeListeners } from './modules/theme.js';

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar tema y apariencia
    initTheme();
    initThemeListeners();

    // Inicializar navegación por tabs
    initNavigation();
    window.switchTab = switchTab;

    // Inicializar listeners de autenticación, taller, diagnóstico, historial y tokens
    initAuthListeners();
    initTallerListeners(() => getUsuarioActual()?.id);
    initDiagnosticoListeners(() => getUsuarioActual()?.id);
    initHistorialListeners();
    initPresupuestosListeners(() => getUsuarioActual()?.id);
    initTokensListeners(() => getUsuarioActual()?.email);
    initPdfListener();

    // Verificar sesión iniciada de Supabase
    checkSession();
});
