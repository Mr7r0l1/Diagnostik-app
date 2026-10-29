import { API_BASE_URL } from '../config.js';

export async function request(endpoint, options = {}) {
    const defaultHeaders = { 'Content-Type': 'application/json' };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Ocurrió un error al procesar la solicitud.');
    }

    return data;
}

export async function generarDiagnosticoAPI(payload) {
    return request('/api/diagnostico', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export async function obtenerHistorialAPI(userId) {
    return request(`/api/reportes/${userId}`);
}

export async function obtenerTallerAPI(userId) {
    return request(`/api/taller/${userId}`);
}

export async function guardarTallerAPI(userId, payload) {
    return request(`/api/taller/${userId}`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export async function generarPresupuestoAPI(payload) {
    return request('/api/presupuestos/generar', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export async function actualizarPresupuestoAPI(id, payload) {
    return request(`/api/presupuestos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
}

export async function obtenerPresupuestosAPI(userId) {
    return request(`/api/presupuestos/${userId}`);
}

export async function eliminarPresupuestoAPI(id, userId) {
    return request(`/api/presupuestos/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId })
    });
}
