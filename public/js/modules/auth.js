import { clienteSupabase } from '../config.js';
import { cargarDatosUsuario } from './taller.js';
import { cargarHistorial } from './historial.js';
import { guardarTallerAPI } from '../services/api.js';
import { showToast } from './toast.js';

let usuarioActual = null;

// Estado temporal para validación OTP
let otpState = {
    mode: null, // 'signup' | 'device_login'
    email: '',
    password: '',
    tallerData: null,
    cooldownSeconds: 0,
    cooldownTimer: null
};

export function getUsuarioActual() {
    return usuarioActual;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de Dispositivo Seguro (Device Trust)
// ─────────────────────────────────────────────────────────────────────────────
function getDeviceTrustKey(email) {
    if (!email) return 'diagnostik_device_trusted';
    return `diagnostik_device_trusted_${email.toLowerCase().trim()}`;
}

export function isDeviceTrusted(email) {
    if (!email) return false;
    return localStorage.getItem(getDeviceTrustKey(email)) === 'true';
}

export function trustCurrentDevice(email) {
    if (!email) return;
    localStorage.setItem(getDeviceTrustKey(email), 'true');
}

// ─────────────────────────────────────────────────────────────────────────────
// Gestión de Alertas y Vistas
// ─────────────────────────────────────────────────────────────────────────────
export function mostrarErrorAuth(msg) {
    const errorBox = document.getElementById('authError');
    const errorText = document.getElementById('authErrorText');
    const successBox = document.getElementById('authSuccess');

    if (successBox) successBox.classList.add('hidden');

    if (errorBox && errorText) {
        errorText.textContent = msg;
        errorBox.classList.remove('hidden');
    }
    showToast(msg, 'error');
}

export function mostrarExitoAuth(msg) {
    const successBox = document.getElementById('authSuccess');
    const successText = document.getElementById('authSuccessText');
    const errorBox = document.getElementById('authError');

    if (errorBox) errorBox.classList.add('hidden');

    if (successBox && successText) {
        successText.textContent = msg;
        successBox.classList.remove('hidden');
    }
    showToast(msg, 'success');
}

export function limpiarMensajesAuth() {
    const errorBox = document.getElementById('authError');
    const successBox = document.getElementById('authSuccess');
    if (errorBox) errorBox.classList.add('hidden');
    if (successBox) successBox.classList.add('hidden');
}

export function setAuthView(viewName) {
    limpiarMensajesAuth();

    const viewLogin = document.getElementById('viewLogin');
    const viewRegister = document.getElementById('viewRegister');
    const viewOtp = document.getElementById('viewOtp');
    const subtitle = document.getElementById('authSubtitle');

    if (viewLogin) viewLogin.classList.toggle('hidden', viewName !== 'login');
    if (viewRegister) viewRegister.classList.toggle('hidden', viewName !== 'register');
    if (viewOtp) viewOtp.classList.toggle('hidden', viewName !== 'otp');

    if (subtitle) {
        if (viewName === 'login') {
            subtitle.textContent = 'Ingresa con tus credenciales de taller';
        } else if (viewName === 'register') {
            subtitle.textContent = 'Alta de Nuevo Taller Mecánico';
        } else if (viewName === 'otp') {
            subtitle.textContent = 'Validación de Seguridad por Correo';
        }
    }

    if (viewName === 'otp') {
        const otpInput = document.getElementById('otpInput');
        if (otpInput) {
            otpInput.value = '';
            setTimeout(() => otpInput.focus(), 150);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cuenta regresiva de reenvío OTP
// ─────────────────────────────────────────────────────────────────────────────
function startOtpCooldown(segundos = 30) {
    if (otpState.cooldownTimer) clearInterval(otpState.cooldownTimer);

    otpState.cooldownSeconds = segundos;
    const btnResend = document.getElementById('btnResendOtp');
    const textCooldown = document.getElementById('otpCooldownText');

    if (btnResend) {
        btnResend.disabled = true;
        btnResend.classList.add('opacity-50', 'pointer-events-none');
    }
    if (textCooldown) {
        textCooldown.textContent = `(Espera ${otpState.cooldownSeconds}s)`;
        textCooldown.classList.remove('hidden');
    }

    otpState.cooldownTimer = setInterval(() => {
        otpState.cooldownSeconds--;
        if (otpState.cooldownSeconds <= 0) {
            clearInterval(otpState.cooldownTimer);
            if (btnResend) {
                btnResend.disabled = false;
                btnResend.classList.remove('opacity-50', 'pointer-events-none');
            }
            if (textCooldown) {
                textCooldown.textContent = '';
                textCooldown.classList.add('hidden');
            }
        } else {
            if (textCooldown) textCooldown.textContent = `(Espera ${otpState.cooldownSeconds}s)`;
        }
    }, 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificación de Sesión Activa
// ─────────────────────────────────────────────────────────────────────────────
export async function checkSession() {
    if (!clienteSupabase) return;

    try {
        const { data: { session }, error } = await clienteSupabase.auth.getSession();
        if (error) {
            console.warn('Error al verificar sesión:', error);
            return;
        }

        if (session && session.user) {
            usuarioActual = session.user;
            document.getElementById('authModal')?.classList.add('hidden');
            document.getElementById('appContainer')?.classList.remove('hidden');

            const userEmail = document.getElementById('userEmail');
            if (userEmail) userEmail.textContent = usuarioActual.email;

            await cargarDatosUsuario(usuarioActual.id);
            await cargarHistorial(usuarioActual.id);
        } else {
            usuarioActual = null;
            document.getElementById('authModal')?.classList.remove('hidden');
            document.getElementById('appContainer')?.classList.add('hidden');
            setAuthView('login');
        }
    } catch (e) {
        console.error('Error en checkSession:', e);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inicializador de Eventos de Autenticación
// ─────────────────────────────────────────────────────────────────────────────
export function initAuthListeners() {
    if (!clienteSupabase) return;

    // Cambios de vista
    const btnGoToRegister = document.getElementById('btnGoToRegister');
    const btnBackToLogin = document.getElementById('btnBackToLogin');
    const btnCancelOtp = document.getElementById('btnCancelOtp');

    if (btnGoToRegister) {
        btnGoToRegister.addEventListener('click', () => setAuthView('register'));
    }
    if (btnBackToLogin) {
        btnBackToLogin.addEventListener('click', () => setAuthView('login'));
    }
    if (btnCancelOtp) {
        btnCancelOtp.addEventListener('click', () => {
            if (otpState.cooldownTimer) clearInterval(otpState.cooldownTimer);
            otpState = { mode: null, email: '', password: '', tallerData: null, cooldownSeconds: 0, cooldownTimer: null };
            setAuthView('login');
        });
    }

    // Formatear input OTP a sólo números y auto-submit a los 6 caracteres
    const otpInput = document.getElementById('otpInput');
    if (otpInput) {
        otpInput.addEventListener('input', (e) => {
            otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
            if (otpInput.value.length === 6) {
                // Auto-verificar cuando se completan los 6 dígitos
                const btnVerify = document.getElementById('btnVerifyOtp');
                if (btnVerify) btnVerify.click();
            }
        });
    }

    // 1. INICIAR SESIÓN (Con Detección de Dispositivo Nuevo)
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            limpiarMensajesAuth();
            const email = document.getElementById('loginEmail')?.value.trim();
            const password = document.getElementById('loginPassword')?.value;

            if (!email || !password) {
                return mostrarErrorAuth('Por favor ingresa tu correo y contraseña.');
            }

            btnLogin.disabled = true;
            btnLogin.textContent = 'Verificando...';

            try {
                // Verificar credenciales directamente en Supabase
                const { data, error } = await clienteSupabase.auth.signInWithPassword({ email, password });

                if (error) {
                    mostrarErrorAuth(error.message === 'Invalid login credentials'
                        ? 'Correo o contraseña incorrectos. Verifica tus datos.'
                        : error.message);
                    btnLogin.disabled = false;
                    btnLogin.textContent = 'Iniciar Sesión';
                    return;
                }

                // Las credenciales son válidas.
                // ¿El dispositivo ya ha sido autorizado para esta cuenta?
                const dispositivoReconocido = isDeviceTrusted(email);

                if (dispositivoReconocido) {
                    // Dispositivo de confianza: Acceso directo
                    showToast('¡Bienvenido de vuelta!', 'success');
                    btnLogin.disabled = false;
                    btnLogin.textContent = 'Iniciar Sesión';
                    await checkSession();
                } else {
                    // DISPOSITIVO NUEVO / NO RECONOCIDO:
                    // Requiere código de seguridad enviado al correo
                    await clienteSupabase.auth.signOut(); // Desautenticar temporalmente

                    const { error: otpError } = await clienteSupabase.auth.signInWithOtp({
                        email,
                        options: { shouldCreateUser: false }
                    });

                    if (otpError) {
                        mostrarErrorAuth('No se pudo enviar el código de seguridad: ' + otpError.message);
                        btnLogin.disabled = false;
                        btnLogin.textContent = 'Iniciar Sesión';
                        return;
                    }

                    otpState = {
                        mode: 'device_login',
                        email,
                        password,
                        tallerData: null,
                        cooldownSeconds: 0,
                        cooldownTimer: null
                    };

                    const otpIcon = document.getElementById('otpIcon');
                    const otpTitle = document.getElementById('otpTitle');
                    const otpSubtitle = document.getElementById('otpSubtitle');

                    if (otpIcon) otpIcon.textContent = '🛡️';
                    if (otpTitle) otpTitle.textContent = 'Dispositivo Nuevo Detectado';
                    if (otpSubtitle) {
                        otpSubtitle.innerHTML = `Por tu seguridad, enviamos un código de 6 dígitos a <b class="text-white">${email}</b> para autorizar este nuevo dispositivo.`;
                    }

                    setAuthView('otp');
                    startOtpCooldown(30);
                    showToast('Código de seguridad enviado a tu correo', 'info');
                }
            } catch (err) {
                console.error('Error en login:', err);
                mostrarErrorAuth(err.message || 'Error al iniciar sesión.');
            } finally {
                btnLogin.disabled = false;
                btnLogin.textContent = 'Iniciar Sesión';
            }
        });
    }

    // 2. REGISTRO COMPLEJO DE TALLER (Con Validación de Correo por Código)
    const btnSubmitRegister = document.getElementById('btnSubmitRegister');
    if (btnSubmitRegister) {
        btnSubmitRegister.addEventListener('click', async () => {
            limpiarMensajesAuth();

            const nombre_taller = document.getElementById('regTallerNombre')?.value.trim();
            const direccion = document.getElementById('regCiudad')?.value.trim();
            const nombre_usuario = document.getElementById('regTecnicoNombre')?.value.trim();
            const telefono = document.getElementById('regTelefono')?.value.trim();
            const email = document.getElementById('regEmail')?.value.trim();
            const password = document.getElementById('regPassword')?.value;
            const passwordConfirm = document.getElementById('regPasswordConfirm')?.value;

            // Validaciones
            if (!nombre_taller || !direccion || !nombre_usuario || !telefono || !email || !password) {
                return mostrarErrorAuth('Por favor completa todos los campos requeridos con asterisco (*).');
            }

            if (password.length < 6) {
                return mostrarErrorAuth('La contraseña debe tener al menos 6 caracteres.');
            }

            if (password !== passwordConfirm) {
                return mostrarErrorAuth('Las contraseñas no coinciden. Por favor revísalas.');
            }

            btnSubmitRegister.disabled = true;
            btnSubmitRegister.textContent = 'Creando cuenta...';

            try {
                const tallerPayload = {
                    nombre_taller,
                    nombre_usuario,
                    telefono,
                    direccion
                };

                const { data, error } = await clienteSupabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: tallerPayload
                    }
                });

                if (error) {
                    mostrarErrorAuth(error.message || 'Error al registrar taller.');
                    btnSubmitRegister.disabled = false;
                    btnSubmitRegister.textContent = 'Crear Cuenta y Enviar Código 🚀';
                    return;
                }

                // Caso A: Si el proyecto de Supabase tiene confirmación de correo requerida (data.session es null)
                if (!data.session) {
                    otpState = {
                        mode: 'signup',
                        email,
                        password,
                        tallerData: tallerPayload,
                        cooldownSeconds: 0,
                        cooldownTimer: null
                    };

                    const otpIcon = document.getElementById('otpIcon');
                    const otpTitle = document.getElementById('otpTitle');
                    const otpSubtitle = document.getElementById('otpSubtitle');

                    if (otpIcon) otpIcon.textContent = '✉️';
                    if (otpTitle) otpTitle.textContent = 'Confirma tu Correo';
                    if (otpSubtitle) {
                        otpSubtitle.innerHTML = `Enviamos un código de 6 dígitos a <b class="text-white">${email}</b> para validar y activar tu taller.`;
                    }

                    setAuthView('otp');
                    startOtpCooldown(30);
                    showToast('Código de confirmación enviado a tu correo', 'info');
                } else {
                    // Caso B: Si la confirmación de correo estuviese desactivada en Supabase, entra directo y guarda el perfil
                    trustCurrentDevice(email);
                    if (data.user?.id) {
                        try {
                            await guardarTallerAPI(data.user.id, tallerPayload);
                        } catch (e) {
                            console.warn('Error guardando taller inicial:', e);
                        }
                    }
                    showToast('¡Taller registrado y configurado con éxito!', 'success');
                    await checkSession();
                }
            } catch (err) {
                console.error('Error en registro:', err);
                mostrarErrorAuth(err.message || 'Error inesperado durante el registro.');
            } finally {
                btnSubmitRegister.disabled = false;
                btnSubmitRegister.textContent = 'Crear Cuenta y Enviar Código 🚀';
            }
        });
    }

    // 3. VERIFICAR CÓDIGO OTP (Para Registro o para Nuevo Dispositivo)
    const btnVerifyOtp = document.getElementById('btnVerifyOtp');
    if (btnVerifyOtp) {
        btnVerifyOtp.addEventListener('click', async () => {
            limpiarMensajesAuth();
            const code = document.getElementById('otpInput')?.value.trim();

            if (!code || code.length !== 6) {
                return mostrarErrorAuth('Por favor introduce el código de 6 dígitos completo.');
            }

            if (!otpState.email) {
                return mostrarErrorAuth('No hay sesión de verificación activa. Vuelve a iniciar.');
            }

            btnVerifyOtp.disabled = true;
            btnVerifyOtp.textContent = 'Verificando...';

            try {
                if (otpState.mode === 'signup') {
                    // Validar código de alta de usuario
                    let { data, error } = await clienteSupabase.auth.verifyOtp({
                        email: otpState.email,
                        token: code,
                        type: 'signup'
                    });

                    // Respaldo por si la plantilla de correo fue tipo 'email'
                    if (error) {
                        const fallback = await clienteSupabase.auth.verifyOtp({
                            email: otpState.email,
                            token: code,
                            type: 'email'
                        });
                        if (!fallback.error) {
                            data = fallback.data;
                            error = null;
                        }
                    }

                    if (error) {
                        mostrarErrorAuth('Código incorrecto o expirado. Por favor verifica los 6 dígitos.');
                        btnVerifyOtp.disabled = false;
                        btnVerifyOtp.textContent = 'Verificar Código y Entrar';
                        return;
                    }

                    // Código válido en Registro:
                    trustCurrentDevice(otpState.email);

                    // Guardar datos del taller en base de datos
                    const userId = data.session?.user?.id || data.user?.id;
                    if (userId && otpState.tallerData) {
                        try {
                            await guardarTallerAPI(userId, otpState.tallerData);
                        } catch (e) {
                            console.warn('Error al guardar datos del taller tras verificación:', e);
                        }
                    }

                    showToast('¡Taller activado y correo verificado con éxito!', 'success');
                    await checkSession();

                } else if (otpState.mode === 'device_login') {
                    // Validar código de dispositivo nuevo
                    const { data, error } = await clienteSupabase.auth.verifyOtp({
                        email: otpState.email,
                        token: code,
                        type: 'email'
                    });

                    if (error) {
                        mostrarErrorAuth('Código de verificación incorrecto o expirado.');
                        btnVerifyOtp.disabled = false;
                        btnVerifyOtp.textContent = 'Verificar Código y Entrar';
                        return;
                    }

                    // Código válido en Nuevo Dispositivo:
                    // Autorizar y recordar este dispositivo
                    trustCurrentDevice(otpState.email);
                    showToast('¡Dispositivo verificado y autorizado!', 'success');
                    await checkSession();
                }
            } catch (err) {
                console.error('Error al verificar OTP:', err);
                mostrarErrorAuth(err.message || 'Error al validar el código.');
            } finally {
                btnVerifyOtp.disabled = false;
                btnVerifyOtp.textContent = 'Verificar Código y Entrar';
            }
        });
    }

    // 4. REENVIAR CÓDIGO OTP
    const btnResendOtp = document.getElementById('btnResendOtp');
    if (btnResendOtp) {
        btnResendOtp.addEventListener('click', async () => {
            if (!otpState.email) return;

            limpiarMensajesAuth();
            btnResendOtp.disabled = true;

            try {
                if (otpState.mode === 'signup') {
                    const { error } = await clienteSupabase.auth.resend({
                        type: 'signup',
                        email: otpState.email
                    });
                    if (error) throw error;
                } else {
                    const { error } = await clienteSupabase.auth.signInWithOtp({
                        email: otpState.email,
                        options: { shouldCreateUser: false }
                    });
                    if (error) throw error;
                }

                mostrarExitoAuth(`Nuevo código enviado a ${otpState.email}`);
                startOtpCooldown(30);
            } catch (err) {
                console.error('Error al reenviar código:', err);
                mostrarErrorAuth('No se pudo reenviar el código: ' + (err.message || 'Intenta de nuevo en unos minutos.'));
            }
        });
    }

    // 5. CERRAR SESIÓN
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await clienteSupabase.auth.signOut();
            showToast('Sesión cerrada correctamente', 'info');
            setTimeout(() => window.location.reload(), 400);
        });
    }
}
