import { Router } from 'express';
import { obtenerReportes } from '../controllers/reportesController.js';

const router = Router();

router.get('/reportes/:userId', obtenerReportes);

export default router;
