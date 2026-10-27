export function switchTab(tabId) {
    const tabs = ['tab-dashboard', 'tab-diag', 'tab-historial', 'tab-reporte-ver', 'tab-perfil'];
    tabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(tabId);
    if (target) target.classList.remove('hidden');

    // Update active state in sidebar and tabs (la vista de reporte pertenece al historial)
    const navActiva = tabId === 'tab-reporte-ver' ? 'tab-historial' : tabId;
    document.querySelectorAll('.nav-item').forEach(btn => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab === navActiva) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update page title section header if present
    const titleMap = {
        'tab-dashboard': { title: 'Panel Principal', subtitle: 'Resumen de actividad y métricas clave' },
        'tab-diag': { title: 'Generar Reporte', subtitle: 'Captura los síntomas del vehículo para generar el reporte' },
        'tab-historial': { title: 'Historial de Diagnósticos', subtitle: 'Consulta, filtra y exporta reportes previos' },
        'tab-reporte-ver': { title: 'Consulta de Reporte', subtitle: 'Reporte archivado · solo lectura' },
        'tab-perfil': { title: 'Ajustes de Perfil y Configuración', subtitle: 'Personaliza tu cuenta, datos del taller y apariencia' }
    };

    const headerTitle = document.getElementById('pageHeaderTitle');
    const headerSub = document.getElementById('pageHeaderSubtitle');
    if (headerTitle && titleMap[tabId]) headerTitle.textContent = titleMap[tabId].title;
    if (headerSub && titleMap[tabId]) headerSub.textContent = titleMap[tabId].subtitle;
}

export function initNavigation() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            if (tabId) switchTab(tabId);
        });
    });
}
