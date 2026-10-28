export function switchTab(tabId) {
    const tabs = ['tab-dashboard', 'tab-diag', 'tab-historial', 'tab-reporte-ver', 'tab-tokens', 'tab-perfil'];
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
        'tab-tokens': { title: 'Recargar Tokens', subtitle: 'Adquiere tokens para diagnósticos mediante transferencia directa SPEI sin comisiones' },
        'tab-perfil': { title: 'Ajustes de Perfil y Configuración', subtitle: 'Personaliza tu cuenta, datos del taller y apariencia' }
    };

    const headerTitle = document.getElementById('pageHeaderTitle');
    const headerSub = document.getElementById('pageHeaderSubtitle');
    if (headerTitle && titleMap[tabId]) headerTitle.textContent = titleMap[tabId].title;
    if (headerSub && titleMap[tabId]) headerSub.textContent = titleMap[tabId].subtitle;
}

export function toggleMenuMobile() {
    const menuContent = document.getElementById('sidebarMenuContent');
    const backdrop = document.getElementById('mobileMenuBackdrop');
    const btnWrench = document.getElementById('btnWrenchToggle');
    if (!menuContent) return;

    const estaOculto = menuContent.classList.contains('hidden');
    if (estaOculto) {
        menuContent.classList.remove('hidden', 'is-closing');
        menuContent.classList.add('flex');
        if (backdrop) {
            backdrop.classList.remove('hidden', 'is-closing');
        }
        if (btnWrench) btnWrench.classList.add('is-open');
    } else {
        cerrarMenuMobile();
    }
}

export function cerrarMenuMobile() {
    const menuContent = document.getElementById('sidebarMenuContent');
    const backdrop = document.getElementById('mobileMenuBackdrop');
    const btnWrench = document.getElementById('btnWrenchToggle');

    if (btnWrench) btnWrench.classList.remove('is-open');

    if (window.innerWidth < 768 && menuContent && !menuContent.classList.contains('hidden')) {
        menuContent.classList.add('is-closing');
        if (backdrop) backdrop.classList.add('is-closing');

        setTimeout(() => {
            menuContent.classList.add('hidden');
            menuContent.classList.remove('flex', 'is-closing');
            if (backdrop) {
                backdrop.classList.add('hidden');
                backdrop.classList.remove('is-closing');
            }
        }, 190);
    } else {
        if (backdrop) backdrop.classList.add('hidden');
        if (menuContent && window.innerWidth < 768) {
            menuContent.classList.add('hidden');
            menuContent.classList.remove('flex', 'is-closing');
        }
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

    // Botón de la llave 🔧: En móvil abre/cierra menú con morph a ✕, en desktop va a Inicio/Resumen
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
                if (e.target !== btnWrench && !btnWrench.contains(e.target)) {
                    toggleMenuMobile();
                }
            }
        });
    }

    // Backdrop móvil: al tocar fuera, cierra el menú
    const backdrop = document.getElementById('mobileMenuBackdrop');
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            cerrarMenuMobile();
        });
    }

    // Si la pantalla se redimensiona a escritorio, restablecer visualización
    window.addEventListener('resize', () => {
        const menuContent = document.getElementById('sidebarMenuContent');
        const backdrop = document.getElementById('mobileMenuBackdrop');
        const btnWrench = document.getElementById('btnWrenchToggle');

        if (window.innerWidth >= 768) {
            if (menuContent) {
                menuContent.classList.remove('hidden');
                menuContent.classList.add('flex');
            }
            if (backdrop) backdrop.classList.add('hidden');
            if (btnWrench) btnWrench.classList.remove('is-open');
        } else {
            // En móvil inicia cerrado si no estaba activo
            if (menuContent && !btnWrench?.classList.contains('is-open')) {
                menuContent.classList.add('hidden');
                menuContent.classList.remove('flex');
                if (backdrop) backdrop.classList.add('hidden');
            }
        }
    });
}

