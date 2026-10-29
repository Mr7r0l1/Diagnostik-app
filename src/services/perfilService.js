import { supabase } from '../config/supabase.js';

export async function obtenerPerfilPorId(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener perfil:', error);
    throw error;
  }

  // Si el perfil no existe aún en la tabla 'perfiles', crearlo por defecto
  if (!data) {
    const { data: nuevoPerfil, error: errInsert } = await supabase
      .from('perfiles')
      .insert({
        id: userId,
        creditos: 10,
        nombre_taller: '',
        nombre_usuario: ''
      })
      .select()
      .single();

    if (errInsert) {
      console.error('Error creando perfil por defecto:', errInsert);
      throw errInsert;
    }
    return nuevoPerfil;
  }

  return data;
}

export async function actualizarCreditos(userId, nuevosCreditos) {
  const { data, error } = await supabase
    .from('perfiles')
    .update({ creditos: nuevosCreditos })
    .eq('id', userId)
    .select();

  if (error) throw error;
  return data;
}

export async function actualizarTaller(userId, datosActualizar) {
  // Filtrar propiedades indefinidas, nulas o strings vacíos inútiles
  const payloadLimpio = {};
  Object.keys(datosActualizar).forEach(key => {
    const val = datosActualizar[key];
    if (val !== undefined && val !== null && val !== '') {
      payloadLimpio[key] = val;
    }
  });

  console.log('actualizarTaller payloadLimpio:', payloadLimpio);

  // Si no hay campos limpios para actualizar, no hacer nada
  if (Object.keys(payloadLimpio).length === 0) {
    console.log('actualizarTaller: No hay campos para actualizar.');
    return null;
  }

  // Asegurar que el perfil exista (si no, obtenerPerfilPorId lo crea con 10 créditos de bienvenida)
  await obtenerPerfilPorId(userId);

  let { data, error } = await supabase
    .from('perfiles')
    .update(payloadLimpio)
    .eq('id', userId)
    .select();

  // Fallback si alguna columna opcional (ej. moneda) aún no existe en la tabla perfiles
  if (error && payloadLimpio.moneda) {
    const { moneda, ...payloadSinMoneda } = payloadLimpio;
    if (Object.keys(payloadSinMoneda).length > 0) {
      const retry = await supabase
        .from('perfiles')
        .update(payloadSinMoneda)
        .eq('id', userId)
        .select();
      data = retry.data;
      error = retry.error;
    } else {
      return null;
    }
  }

  console.log('actualizarTaller resultado Supabase:', { data, error });

  if (error) {
    console.error('Error al guardar en Supabase (update):', error);
    throw error;
  }

  return data;
}
