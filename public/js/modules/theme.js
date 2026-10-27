import { showToast } from './toast.js';

export function initTheme() {
    const savedTheme = localStorage.getItem('diagnostik_theme') || 'light';
    setTheme(savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
}

export function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('diagnostik_theme', theme);

    const iconEl = document.getElementById('themeToggleIcon');
    const labelEl = document.getElementById('themeToggleLabel');

    if (iconEl) iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (labelEl) labelEl.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';

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
