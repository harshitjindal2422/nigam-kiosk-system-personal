import { Router } from 'express';
import { generateToken, generateKioskToken } from '../controllers/correction.controller.js';

const router = Router();

router.post('/generate-token', generateToken);
router.post('/kiosk-token', generateKioskToken);

export default router;
