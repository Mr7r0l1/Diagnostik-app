import { supabase } from '../config/supabase.js';

export async function obtenerReportePorId(reporteId, userId) {
  const { data, error } = await supabase
    .from('reportes')
    .select('*')
    .eq('id', reporteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error obteniendo reporte:', error);
    return null;
  }
  return data;
}

export async function marcarReporteConPresupuesto(reporteId, totalGenerados = 1) {
  const { error } = await supabase
    .from('reportes')
    .update({
      presupuesto_generado: true,
      total_presupuestos_generados: totalGenerados
    })
    .eq('id', reporteId);

  if (error) {
    console.error('Error marcando reporte con presupuesto:', error);
  }
}

export async function crearPresupuestoDB(payload) {
  const { data, error } = await supabase
    .from('presupuestos')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error guardando presupuesto:', error);
    throw error;
  }
  return data;
}

export async function actualizarPresupuestoDB(id, userId, payload) {
  const { data, error } = await supabase
    .from('presupuestos')
    .update({
      ...payload,
      actualizado_en: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error actualizando presupuesto:', error);
    throw error;
  }
  return data;
}

export async function obtenerPresupuestosPorUsuario(userId) {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('user_id', userId)
    .order('creado_en', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function eliminarPresupuestoDB(id, userId) {
  const { error } = await supabase
    .from('presupuestos')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

