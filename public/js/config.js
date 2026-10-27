// URL del Backend en Render (dejar vacío para desarrollo local o poner tu URL de Render en producción)
// Ejemplo: 'https://diagnostik-api.onrender.com'
export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://TU-BACKEND-EN-RENDER.onrender.com';

export const SUPABASE_URL = 'https://fjneqdmgwruyadvezagv.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_2r1S_hv2RCnXXqzi1yLHVw_J7_cNpl4';

export const clienteSupabase = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
