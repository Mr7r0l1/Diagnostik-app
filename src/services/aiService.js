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

export async function generarPresupuestoAI({ marca, modelo, descripcionTrabajo, ciudad, moneda = 'MXN', preferenciaPiezas = 'Nueva', contextoDiagnostico = '' }) {
  const promptUsuario = [
    `VEHÍCULO: ${marca || 'Genérico'} ${modelo || ''}`,
    `CIUDAD DEL TALLER: ${ciudad || 'Ciudad de México, México'}`,
    `MONEDA A COTIZAR: ${moneda || 'MXN'} (Precios netos, sin desglosar IVA)`,
    `PREFERENCIA DE PIEZAS: ${preferenciaPiezas}`,
    contextoDiagnostico ? `DIAGNÓSTICO PREVIO DE REFERENCIA:\n${contextoDiagnostico}` : null,
    `TRABAJO A REALIZAR / PIEZAS A REEMPLAZAR O REPARAR:\n${descripcionTrabajo}`
  ].filter(Boolean).join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: promptUsuario,
    config: {
      systemInstruction: `Eres un jefe de taller mecánico automotriz experto en cotizaciones y precios de refacciones y mano de obra.
Tu objetivo es generar un presupuesto claro, realista y fácil de entender, adaptado a los precios reales de mercado en la ciudad del taller indicada y en la moneda solicitada (${moneda}).

Reglas importantes:
1. Todos los precios deben ser VALORES NETOS en ${moneda} (no agregues IVA aparte).
2. En "piezas", incluye las refacciones e insumos necesarios para el trabajo descrito.
3. Respeta la preferencia de condición de piezas ("Nueva" o "Segunda Mano"). Si el usuario eligió "Segunda Mano" (usada/yonke), estima precios realistas de pieza usada en buen estado (40% a 60% del valor de una nueva). Si eligió "Mixta", usa "Nueva" para consumibles/empaques/sensores críticos y "Segunda Mano" para componentes mayores si conviene.
4. En "mano_de_obra", desglosa los trabajos a realizar con su precio neto justo para la ciudad indicada.

Responde únicamente con un objeto JSON válido con este formato exacto:
{
  "piezas": [
    {
      "descripcion": "string (nombre claro de la pieza o insumo)",
      "condicion": "Nueva | Segunda Mano",
      "cantidad": 1,
      "precio_unitario": 0
    }
  ],
  "mano_de_obra": [
    {
      "descripcion": "string (descripción clara de la reparación o instalación)",
      "precio": 0
    }
  ],
  "tiempo_estimado": "string (ej. 1 a 2 días hábiles o 4 horas)",
  "notas": "string (garantía sugerida y observaciones breves para el cliente)"
}`,
      responseMimeType: 'application/json'
    }
  });

  if (!response || !response.text) {
    throw new Error('La IA no generó ningún presupuesto válido.');
  }

  return JSON.parse(response.text);
}


