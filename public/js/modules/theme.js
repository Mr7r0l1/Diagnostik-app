import { showToast } from './toast.js';

export function initTheme() {
    const savedTheme = localStorage.getItem('diagnostik_theme') || 'light';
    setTheme(savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    const themeToggleBtnMobile = document.getElementById('themeToggleBtnMobile');
    if (themeToggleBtnMobile) {
        themeToggleBtnMobile.addEventListener('click', toggleTheme);
    }
}

export function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('diagnostik_theme', theme);

    // Actualizar todos los iconos y etiquetas (móvil y escritorio)
    document.querySelectorAll('.theme-toggle-icon').forEach(iconEl => {
        iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
    document.querySelectorAll('.theme-toggle-label').forEach(labelEl => {
        labelEl.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';
    });

    const selectTheme = document.getElementById('settingThemeSelect');
    if (selectTheme) selectTheme.value = theme;
}

export function toggleTheme() {
    const isDark = document.documentElement.hasAttribute('data-theme');
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    showToast(`Tema cambiado a ${nextTheme === 'dark' ? 'Modo Oscuro 🌙' : 'Modo Claro ☀️'}`, 'info');
}

export function initThemeListeners() {
    const selectTheme = document.getElementById('settingThemeSelect');
    if (selectTheme) {
        selectTheme.addEventListener('change', (e) => {
            setTheme(e.target.value);
            showToast(`Tema actualizado a ${e.target.value === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}`, 'info');
        });
    }
}
