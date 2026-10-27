import { actualizarTaller, obtenerPerfilPorId } from '../services/perfilService.js';

export async function obtenerDatosTaller(req, res, next) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Identificador de usuario requerido.' });
    }

    const perfil = await obtenerPerfilPorId(userId);
    res.json({ success: true, data: perfil });
  } catch (error) {
    console.error('Error en controller obtenerDatosTaller:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al obtener datos del taller.' });
  }
}

export async function guardarDatosTaller(req, res, next) {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Identificador de usuario requerido.' });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No se recibieron datos para actualizar.' });
    }

    const resultado = await actualizarTaller(userId, updateData);
    res.json({
      success: true,
      message: 'Perfil y datos del taller actualizados correctamente.',
      data: resultado
    });
  } catch (error) {
    console.error('Error en controller guardarDatosTaller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al actualizar el perfil en la base de datos.'
    });
  }
}
