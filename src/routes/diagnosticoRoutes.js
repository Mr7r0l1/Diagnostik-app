import { Router } from 'express';
import { crearDiagnostico } from '../controllers/diagnosticoController.js';

const router = Router();

router.post('/diagnostico', crearDiagnostico);

export default router;
