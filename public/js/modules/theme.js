// Modo Oscuro permanente y exclusivo en DiagnostikAI
export function initTheme() {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('diagnostik_theme', 'dark');
}

export function setTheme() {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('diagnostik_theme', 'dark');
}

export function toggleTheme() {
    // Modo oscuro permanente
}

export function initThemeListeners() {
    // No-op
}
