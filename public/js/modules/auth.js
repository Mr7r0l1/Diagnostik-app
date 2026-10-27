import { clienteSupabase } from '../config.js';
import { cargarDatosUsuario } from './taller.js';
import { cargarHistorial } from './historial.js';
import { showToast } from './toast.js';

let usuarioActual = null;

export function getUsuarioActual() {
    return usuarioActual;
}

export function mostrarErrorAuth(msg) {
    const el = document.getElementById('authError');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
    showToast(msg, 'error');
}

export async function checkSession() {
    if (!clienteSupabase) return;

    const { data: { session } } = await clienteSupabase.auth.getSession();
    if (session) {
        usuarioActual = session.user;
        document.getElementById('authModal')?.classList.add('hidden');
        document.getElementById('appContainer')?.classList.remove('hidden');

        const userEmail = document.getElementById('userEmail');
        if (userEmail) userEmail.textContent = usuarioActual.email;

        await cargarDatosUsuario(usuarioActual.id);
        await cargarHistorial(usuarioActual.id);
    }
}

export function initAuthListeners() {
    if (!clienteSupabase) return;

    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');
    const btnLogout = document.getElementById('btnLogout');

    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            if (!email || !password) return mostrarErrorAuth('Por favor completa todos los campos.');

            const { error } = await clienteSupabase.auth.signInWithPassword({ email, password });
            if (error) mostrarErrorAuth(error.message);
            else {
                showToast('¡Sesión iniciada correctamente!', 'success');
                checkSession();
            }
        });
    }

    if (btnRegister) {
        btnRegister.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            if (!email || !password) return mostrarErrorAuth('Por favor completa todos los campos.');

            const { error } = await clienteSupabase.auth.signUp({ email, password });
            if (error) mostrarErrorAuth(error.message);
            else {
                showToast('Cuenta registrada. Ya puedes iniciar sesión.', 'success');
                checkSession();
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await clienteSupabase.auth.signOut();
            showToast('Sesión cerrada', 'info');
            setTimeout(() => window.location.reload(), 500);
        });
    }
}
