import { obtenerPerfilPorId, actualizarCreditos } from '../services/perfilService.js';
import { generarDiagnosticoAI } from '../services/aiService.js';
import { guardarReporte } from '../services/reportesService.js';

export async function crearDiagnostico(req, res, next) {
  try {
    const { marca, modelo, vin, motor, transmision, kilometraje, codigo, sintomas, sintomasReportados, dtcs, userId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Sesión no válida.' });
    }

    if (!marca || !modelo || !sintomas) {
      return res.status(400).json({ success: false, error: 'La marca, modelo y síntomas del vehículo son obligatorios.' });
    }

    // 1. Verificar créditos del usuario
    const perfil = await obtenerPerfilPorId(userId);

    if (!perfil) {
      return res.status(404).json({ success: false, error: 'Perfil de usuario no encontrado.' });
    }

    if (perfil.creditos <= 0) {
      return res.status(403).json({
        success: false,
        error: 'No tienes créditos suficientes para generar este diagnóstico.'
      });
    }

    // 2. Generar diagnóstico con IA
    const diagnosticoIA = await generarDiagnosticoAI({ marca, modelo, vin, motor, transmision, kilometraje, codigo, sintomas });

    // Ficha del vehículo tal como la capturó el taller (se guarda junto al diagnóstico
    // para poder consultarla después desde el historial)
    const diagnostico = {
      ...diagnosticoIA,
      ficha_vehiculo: {
        vin: vin || '',
        motor: motor || '',
        transmision: transmision || '',
        kilometraje: kilometraje || '',
        sintomas_reportados: sintomasReportados || '',
        dtcs: Array.isArray(dtcs)
          ? dtcs.map(d => ({
              code: String(d.code || ''),
              desc: String(d.desc || ''),
              system: String(d.system || ''),
              contextInfo: String(d.contextInfo || '')
            }))
          : []
      }
    };

    // 3. Descontar crédito
    const nuevosCreditos = perfil.creditos - 1;
    await actualizarCreditos(userId, nuevosCreditos);

    // 4. Guardar en historial
    const nuevoReporte = await guardarReporte({
      userId,
      marca,
      modelo,
      codigo,
      sintomas,
      diagnostico
    });

    res.json({
      success: true,
      data: diagnostico,
      reporteId: nuevoReporte ? nuevoReporte.id : null,
      creadoEn: nuevoReporte ? nuevoReporte.creado_en : null,
      creditosRestantes: nuevosCreditos
    });

  } catch (error) {
    next(error);
  }
}
