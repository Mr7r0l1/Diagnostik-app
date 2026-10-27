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

export function toggleMenuMobile() {
    const menuContent = document.getElementById('sidebarMenuContent');
    const indicator = document.getElementById('mobileMenuIndicator');
    if (!menuContent) return;

    const estaOculto = menuContent.classList.contains('hidden');
    if (estaOculto) {
        menuContent.classList.remove('hidden');
        menuContent.classList.add('flex');
        if (indicator) {
            indicator.textContent = '▲';
            indicator.style.transform = 'rotate(180deg)';
        }
    } else {
        menuContent.classList.add('hidden');
        menuContent.classList.remove('flex');
        if (indicator) {
            indicator.textContent = '▼';
            indicator.style.transform = 'rotate(0deg)';
        }
    }
}

export function cerrarMenuMobile() {
    if (window.innerWidth >= 768) return; // En desktop no se oculta
    const menuContent = document.getElementById('sidebarMenuContent');
    const indicator = document.getElementById('mobileMenuIndicator');
    if (menuContent) {
        menuContent.classList.add('hidden');
        menuContent.classList.remove('flex');
    }
    if (indicator) {
        indicator.textContent = '▼';
        indicator.style.transform = 'rotate(0deg)';
    }
}

export function initNavigation() {
    // Manejo de tabs con auto-cierre en móvil
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            if (tabId) {
                switchTab(tabId);
                cerrarMenuMobile();
            }
        });
    });

    // Botón de la llave 🔧: En móvil abre/cierra menú, en desktop va a Inicio/Resumen
    const btnWrench = document.getElementById('btnWrenchToggle');
    if (btnWrench) {
        btnWrench.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth < 768) {
                toggleMenuMobile();
            } else {
                switchTab('tab-dashboard');
            }
        });
    }

    // Cabecera móvil (texto DiagnostikAI): también abre/cierra en móvil
    const mobileHeaderTrigger = document.getElementById('mobileHeaderTrigger');
    if (mobileHeaderTrigger) {
        mobileHeaderTrigger.addEventListener('click', (e) => {
            if (window.innerWidth < 768) {
                // Si no fue el botón mismo (que ya tiene su listener)
                if (e.target !== btnWrench && !btnWrench.contains(e.target)) {
                    toggleMenuMobile();
                }
            }
        });
    }

    // Si la pantalla se redimensiona a escritorio, restablecer visualización
    window.addEventListener('resize', () => {
        const menuContent = document.getElementById('sidebarMenuContent');
        const indicator = document.getElementById('mobileMenuIndicator');
        if (window.innerWidth >= 768) {
            if (menuContent) {
                menuContent.classList.remove('hidden');
                menuContent.classList.add('flex');
            }
        } else {
            // En móvil inicia cerrado
            if (menuContent && !menuContent.classList.contains('hidden') && indicator && indicator.textContent === '▼') {
                menuContent.classList.add('hidden');
                menuContent.classList.remove('flex');
            }
        }
    });
}

