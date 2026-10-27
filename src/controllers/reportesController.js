import { obtenerReportesPorUsuario } from '../services/reportesService.js';

export async function obtenerReportes(req, res, next) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Identificador de usuario requerido.' });
    }

    const reportes = await obtenerReportesPorUsuario(userId);
    res.json({ success: true, data: reportes });
  } catch (error) {
    next(error);
  }
}
