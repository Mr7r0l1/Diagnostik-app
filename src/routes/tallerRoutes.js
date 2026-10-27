import { Router } from 'express';
import { guardarDatosTaller, obtenerDatosTaller } from '../controllers/tallerController.js';

const router = Router();

router.get('/taller/:userId', obtenerDatosTaller);
router.post('/taller/:userId', guardarDatosTaller);

export default router;
