import { obtenerPerfilPorId, actualizarCreditos } from '../services/perfilService.js';
import { generarPresupuestoAI } from '../services/aiService.js';
import {
  obtenerReportePorId,
  marcarReporteConPresupuesto,
  crearPresupuestoDB,
  actualizarPresupuestoDB,
  obtenerPresupuestosPorUsuario,
  eliminarPresupuestoDB
} from '../services/presupuestosService.js';

function calcularTotalesNetos(piezas = [], manoDeObra = []) {
  const piezasLimpias = (Array.isArray(piezas) ? piezas : []).map((p, idx) => {
    const cantidad = Math.max(1, Number(p.cantidad) || 1);
    const precio_unitario = Math.max(0, Number(p.precio_unitario) || 0);
    const subtotal = Number((cantidad * precio_unitario).toFixed(2));
    return {
      id: p.id || `p-${idx + 1}`,
      descripcion: String(p.descripcion || 'Pieza / Refacción').trim(),
      condicion: p.condicion === 'Segunda Mano' ? 'Segunda Mano' : 'Nueva',
      cantidad,
      precio_unitario,
      subtotal
    };
  });

  const manoObraLimpia = (Array.isArray(manoDeObra) ? manoDeObra : []).map((m, idx) => {
    const precio = Math.max(0, Number(m.precio ?? m.subtotal ?? 0) || 0);
    return {
      id: m.id || `mo-${idx + 1}`,
      descripcion: String(m.descripcion || 'Mano de obra').trim(),
      precio: Number(precio.toFixed(2)),
      subtotal: Number(precio.toFixed(2))
    };
  });

  const subtotal_piezas = Number(piezasLimpias.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));
  const subtotal_mano_obra = Number(manoObraLimpia.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));
  const total = Number((subtotal_piezas + subtotal_mano_obra).toFixed(2));

  return {
    piezas: piezasLimpias,
    mano_de_obra: manoObraLimpia,
    subtotal_piezas,
    subtotal_mano_obra,
    subtotal: total,
    total
  };
}

export async function generarPresupuesto(req, res, next) {
  try {
    const {
      userId,
      reporteId,
      marca,
      modelo,
      descripcionTrabajo,
      ciudad,
      moneda = 'MXN',
      preferenciaPiezas = 'Nueva'
    } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Sesión no válida.' });
    }

    if (!marca || !modelo || !descripcionTrabajo) {
      return res.status(400).json({
        success: false,
        error: 'Ingresa la marca, modelo y qué se va a reparar o reemplazar.'
      });
    }

    const perfil = await obtenerPerfilPorId(userId);
    if (!perfil) {
      return res.status(404).json({ success: false, error: 'Perfil de usuario no encontrado.' });
    }

    // Verificar si viene de un reporte y si aún tiene disponible su presupuesto gratuito
    let reporte = null;
    let esGratis = false;

    if (reporteId) {
      reporte = await obtenerReportePorId(reporteId, userId);
      if (reporte && !reporte.presupuesto_generado) {
        esGratis = true;
      }
    }

    if (!esGratis && perfil.creditos <= 0) {
      return res.status(403).json({
        success: false,
        error: 'No tienes tokens suficientes para generar este presupuesto.'
      });
    }

    let contextoDiagnostico = '';
    if (reporte) {
      const diag = reporte.diagnostico || {};
      contextoDiagnostico = [
        reporte.codigo ? `Códigos DTC: ${reporte.codigo}` : null,
        diag.descripcion_corta ? `Diagnóstico: ${diag.descripcion_corta}` : null,
        diag.solucion_recomendada ? `Solución recomendada: ${diag.solucion_recomendada}` : null
      ].filter(Boolean).join('\n');
    }

    const ciudadFinal = (ciudad || perfil.ciudad || 'Ciudad Juárez, Chih.').trim();
    const monedaFinal = (moneda || perfil.moneda || 'MXN').trim();

    // Generar presupuesto base con IA
    const resultadoIA = await generarPresupuestoAI({
      marca,
      modelo,
      descripcionTrabajo,
      ciudad: ciudadFinal,
      moneda: monedaFinal,
      preferenciaPiezas,
      contextoDiagnostico
    });

    const calculados = calcularTotalesNetos(resultadoIA.piezas, resultadoIA.mano_de_obra);

    // Cobrar 1 token únicamente si NO es el primer presupuesto gratuito de un reporte
    let nuevosCreditos = perfil.creditos;
    if (!esGratis) {
      nuevosCreditos = perfil.creditos - 1;
      await actualizarCreditos(userId, nuevosCreditos);
    }

    // Si estaba vinculado a un reporte, marcar que ya se le generó su presupuesto
    if (reporte) {
      const totalGen = (Number(reporte.total_presupuestos_generados) || 0) + 1;
      await marcarReporteConPresupuesto(reporte.id, totalGen);
    }

    const folio = `PRE-${Date.now().toString().slice(-5)}`;

    const nuevoPresupuesto = await crearPresupuestoDB({
      user_id: userId,
      reporte_id: reporte ? reporte.id : null,
      folio,
      marca: marca.trim(),
      modelo: modelo.trim(),
      descripcion_trabajo: descripcionTrabajo.trim(),
      ciudad: ciudadFinal,
      piezas: calculados.piezas,
      mano_de_obra: calculados.mano_de_obra,
      costos_adicionales: [],
      moneda: monedaFinal,
      subtotal_piezas: calculados.subtotal_piezas,
      subtotal_mano_obra: calculados.subtotal_mano_obra,
      subtotal_otros: 0,
      subtotal: calculados.subtotal,
      iva_porcentaje: 0,
      iva_monto: 0,
      descuento_monto: 0,
      total: calculados.total,
      anticipo_sugerido: 0,
      tiempo_estimado: resultadoIA.tiempo_estimado || '1 a 2 días',
      garantia: '',
      notas: resultadoIA.notas || '',
      estado: 'activo'
    });

    res.json({
      success: true,
      data: nuevoPresupuesto,
      esGratis,
      creditosRestantes: nuevosCreditos
    });
  } catch (error) {
    next(error);
  }
}

export async function actualizarPresupuesto(req, res, next) {
  try {
    const { id } = req.params;
    const {
      userId,
      marca,
      modelo,
      descripcion_trabajo,
      ciudad,
      moneda,
      piezas,
      mano_de_obra,
      tiempo_estimado,
      notas
    } = req.body;

    if (!userId || !id) {
      return res.status(400).json({ success: false, error: 'Datos incompletos para actualizar.' });
    }

    const calculados = calcularTotalesNetos(piezas, mano_de_obra);

    const actualizado = await actualizarPresupuestoDB(id, userId, {
      marca: marca || 'Genérico',
      modelo: modelo || '',
      descripcion_trabajo: descripcion_trabajo || '',
      ciudad: ciudad || '',
      moneda: moneda || 'MXN',
      piezas: calculados.piezas,
      mano_de_obra: calculados.mano_de_obra,
      subtotal_piezas: calculados.subtotal_piezas,
      subtotal_mano_obra: calculados.subtotal_mano_obra,
      subtotal: calculados.subtotal,
      iva_porcentaje: 0,
      iva_monto: 0,
      total: calculados.total,
      tiempo_estimado: tiempo_estimado || '',
      notas: notas || ''
    });

    res.json({
      success: true,
      data: actualizado
    });
  } catch (error) {
    next(error);
  }
}

export async function listarPresupuestos(req, res, next) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Usuario requerido.' });
    }
    const presupuestos = await obtenerPresupuestosPorUsuario(userId);
    res.json({ success: true, data: presupuestos });
  } catch (error) {
    next(error);
  }
}

export async function eliminarPresupuesto(req, res, next) {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId || !id) {
      return res.status(400).json({ success: false, error: 'Datos requeridos.' });
    }
    await eliminarPresupuestoDB(id, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

