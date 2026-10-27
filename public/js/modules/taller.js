import { obtenerTallerAPI, guardarTallerAPI } from '../services/api.js';
import { showToast } from './toast.js';

export let datosPerfil = {
    nombre_usuario: '',
    avatar_url: '',
    nombre_taller: '',
    telefono: '',
    direccion: '',
    logo_url: ''
};

export async function cargarDatosUsuario(userId) {
    if (!userId) return;

    try {
        const res = await obtenerTallerAPI(userId);
        if (!res || !res.success || !res.data) return;

        const data = res.data;

        // Actualizar créditos en interfaz (móvil y escritorio)
        const creditosValor = data.creditos ?? 0;
        document.querySelectorAll('.ui-creditos-val').forEach(el => {
            el.textContent = creditosValor;
        });

        // Guardar valores en memoria (preservando valores reales, vacíos si son vacíos)
        datosPerfil = {
            nombre_usuario: data.nombre_usuario || '',
            avatar_url: data.avatar_url || '',
            nombre_taller: data.nombre_taller || '',
            telefono: data.telefono || '',
            direccion: data.direccion || '',
            logo_url: data.logo_url || ''
        };

        // 1. Llenar inputs de perfil de usuario
        const inputNombreUsuario = document.getElementById('confNombreUsuario');
        if (inputNombreUsuario) {
            inputNombreUsuario.value = datosPerfil.nombre_usuario;
        }

        // Actualizar interfaz (Header y Avatares)
        const userDisplayName = document.getElementById('userDisplayName');
        if (userDisplayName) {
            userDisplayName.textContent = datosPerfil.nombre_usuario || 'Técnico Principal';
        }

        const defaultAvatarSrc = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + userId;
        const currentAvatar = datosPerfil.avatar_url || defaultAvatarSrc;

        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar) headerAvatar.src = currentAvatar;

        const previewAvatar = document.getElementById('previewAvatar');
        if (previewAvatar) previewAvatar.src = currentAvatar;

        // 2. Llenar inputs del taller
        const confNombre = document.getElementById('confTallerNombre');
        const confTel = document.getElementById('confTallerTel');
        const confDir = document.getElementById('confTallerDir');

        if (confNombre) confNombre.value = datosPerfil.nombre_taller;
        if (confTel) confTel.value = datosPerfil.telefono;
        if (confDir) confDir.value = datosPerfil.direccion;

        if (datosPerfil.logo_url) {
            const prev = document.getElementById('previewLogo');
            if (prev) {
                prev.src = datosPerfil.logo_url;
                prev.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error('Error cargando datos del usuario:', err);
    }
}

export function initTallerListeners(getUserId) {
    const perfilForm = document.getElementById('perfilForm');
    const tallerForm = document.getElementById('tallerForm');
    const logoInput = document.getElementById('confTallerLogo');
    const avatarInput = document.getElementById('confAvatarInput');

    // 1. Guardar Perfil de Usuario (Foto PFP y Nombre)
    if (perfilForm) {
        perfilForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = getUserId();
            if (!userId) return showToast('Sesión no válida. Inicia sesión de nuevo.', 'error');

            const btn = document.getElementById('btnGuardarPerfil');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Guardando...';
            }

            const nombreInput = document.getElementById('confNombreUsuario').value.trim();

            const payload = {};
            if (nombreInput) payload.nombre_usuario = nombreInput;
            if (datosPerfil.avatar_url) payload.avatar_url = datosPerfil.avatar_url;

            try {
                const response = await guardarTallerAPI(userId, payload);
                if (response.success) {
                    await cargarDatosUsuario(userId);
                    showToast('¡Foto y nombre de perfil guardados correctamente!', 'success');
                } else {
                    throw new Error(response.error || 'No se pudo guardar la información.');
                }
            } catch (err) {
                console.error('Error al guardar perfil:', err);
                showToast(err.message || 'Error al guardar el perfil.', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Guardar Foto y Nombre de Perfil';
                }
            }
        });
    }

    // 2. Guardar Datos del Taller (Nombre, Teléfono, Dirección, Logo)
    if (tallerForm) {
        tallerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = getUserId();
            if (!userId) return showToast('Sesión no válida. Inicia sesión de nuevo.', 'error');

            const btn = document.getElementById('btnGuardarTaller');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Guardando...';
            }

            const nombreTallerInput = document.getElementById('confTallerNombre').value.trim();
            const telefonoInput = document.getElementById('confTallerTel').value.trim();
            const direccionInput = document.getElementById('confTallerDir')?.value.trim() || '';

            const payload = {};
            if (nombreTallerInput) payload.nombre_taller = nombreTallerInput;
            if (telefonoInput) payload.telefono = telefonoInput;
            if (direccionInput) payload.direccion = direccionInput;
            if (datosPerfil.logo_url) payload.logo_url = datosPerfil.logo_url;

            try {
                const response = await guardarTallerAPI(userId, payload);
                if (response.success) {
                    await cargarDatosUsuario(userId);
                    showToast('¡Datos del taller guardados correctamente!', 'success');
                } else {
                    throw new Error(response.error || 'No se pudo guardar la información del taller.');
                }
            } catch (err) {
                console.error('Error al guardar datos del taller:', err);
                showToast(err.message || 'Error al guardar los datos del taller.', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Guardar Datos del Taller';
                }
            }
        });
    }

    // Previsualizar Logo del Taller
    if (logoInput) {
        logoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    datosPerfil.logo_url = evt.target.result;
                    const prev = document.getElementById('previewLogo');
                    if (prev) {
                        prev.src = evt.target.result;
                        prev.classList.remove('hidden');
                    }
                    showToast('Logo seleccionado. Haz clic en "Guardar Datos del Taller" para confirmar.', 'info');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Previsualizar Foto de Perfil (PFP)
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    datosPerfil.avatar_url = evt.target.result;
                    const headerAvatar = document.getElementById('headerAvatar');
                    const previewAvatar = document.getElementById('previewAvatar');
                    if (headerAvatar) headerAvatar.src = evt.target.result;
                    if (previewAvatar) previewAvatar.src = evt.target.result;
                    showToast('Foto seleccionada. Haz clic en "Guardar Foto y Nombre de Perfil" para confirmar.', 'info');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Click en Avatares Sugeridos
    document.querySelectorAll('.avatar-preset').forEach(img => {
        img.addEventListener('click', (e) => {
            const src = e.target.src;
            datosPerfil.avatar_url = src;
            const headerAvatar = document.getElementById('headerAvatar');
            const previewAvatar = document.getElementById('previewAvatar');
            if (headerAvatar) headerAvatar.src = src;
            if (previewAvatar) previewAvatar.src = src;
            showToast('Avatar seleccionado. Haz clic en "Guardar Foto y Nombre de Perfil" para confirmar.', 'info');
        });
    });
}
