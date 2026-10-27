import { ai } from '../config/gemini.js';

export async function generarDiagnosticoAI({ marca, modelo, vin, motor, transmision, kilometraje, codigo, sintomas }) {
  const specsList = [
    `Marca: ${marca || 'No especificada'}`,
    `Modelo: ${modelo || 'No especificado'}`,
    vin ? `VIN / Serie: ${vin}` : null,
    motor ? `Motorización: ${motor}` : null,
    transmision ? `Transmisión: ${transmision}` : null,
    kilometraje ? `Kilometraje: ${kilometraje}` : null,
  ].filter(Boolean).join('\n');

  const promptUsuario = `FICHA TÉCNICA DEL VEHÍCULO:\n${specsList}\n\nCÓDIGOS DE FALLA DTC:\n${codigo || 'Sin códigos DTC'}\n\nSÍNTOMAS Y OBSERVACIONES DEL TALLER:\n${sintomas}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: promptUsuario,
    config: {
      systemInstruction: `Eres un ingeniero mecánico automotriz especialista en diagnóstico avanzado de taller.
Analiza detenidamente los datos del vehículo (motor, transmisión, VIN, kilometraje si están presentes), síntomas reportados y códigos DTC.

Responde únicamente con un objeto JSON válido con este formato exacto:
{
  "codigo": "string (resumen de DTCs o Sin DTC)",
  "descripcion_corta": "string (título breve del diagnóstico)",
  "severidad": "Baja | Media | Alta | Crítica",
  "resumen_analisis": "string (Explicación técnica detallada pero accesible de la falla general del vehículo, posible causa raíz principal y la correlación o falta de relación entre los códigos DTC detectados y los síntomas reportados por el mecánico)",
  "posibles_causas": ["causa 1", "causa 2"],
  "procedimiento_diagnostico": ["Paso 1", "Paso 2"],
  "solucion_recomendada": "string",
  "tiempo_estimado_reparacion": "string"
}`,
      responseMimeType: 'application/json'
    }
  });

  if (!response || !response.text) {
    throw new Error('La IA no generó ninguna respuesta válida.');
  }

  return JSON.parse(response.text);
}

