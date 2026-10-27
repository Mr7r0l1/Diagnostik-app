import { supabase } from '../config/supabase.js';

export async function guardarReporte({ userId, marca, modelo, codigo, sintomas, diagnostico }) {
  const { data, error } = await supabase
    .from('reportes')
    .insert({
      user_id: userId,
      marca,
      modelo,
      codigo,
      sintomas,
      diagnostico
    })
    .select()
    .single();

  if (error) {
    console.error('Error guardando en historial de reportes:', error);
  }

  return data;
}

export async function obtenerReportesPorUsuario(userId) {
  const { data, error } = await supabase
    .from('reportes')
    .select('*')
    .eq('user_id', userId)
    .order('creado_en', { ascending: false });

  if (error) throw error;
  return data;
}
