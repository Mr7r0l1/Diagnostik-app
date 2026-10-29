import { Router } from 'express';
import {
  generarPresupuesto,
  actualizarPresupuesto,
  listarPresupuestos,
  eliminarPresupuesto
} from '../controllers/presupuestosController.js';

const router = Router();

router.post('/presupuestos/generar', generarPresupuesto);
router.put('/presupuestos/:id', actualizarPresupuesto);
router.get('/presupuestos/:userId', listarPresupuestos);
router.delete('/presupuestos/:id', eliminarPresupuesto);

export default router;

