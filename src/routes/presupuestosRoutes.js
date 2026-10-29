import { Router } from 'express';
import {
  generarPresupuesto,
  actualizarPresupuesto,
  listarPresupuestos,
  eliminarPresupuesto
} from '../controllers/presupuestosController.js';

const router = Router();

router.post('/api/presupuestos/generar', generarPresupuesto);
router.put('/api/presupuestos/:id', actualizarPresupuesto);
router.get('/api/presupuestos/:userId', listarPresupuestos);
router.delete('/api/presupuestos/:id', eliminarPresupuesto);

export default router;

