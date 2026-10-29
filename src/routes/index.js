import { Router } from 'express';
import diagnosticoRoutes from './diagnosticoRoutes.js';
import reportesRoutes from './reportesRoutes.js';
import tallerRoutes from './tallerRoutes.js';
import presupuestosRoutes from './presupuestosRoutes.js';

const router = Router();

router.use(diagnosticoRoutes);
router.use(reportesRoutes);
router.use(tallerRoutes);
router.use(presupuestosRoutes);

export default router;
