import { Router } from 'express';
import { generateToken } from '../controllers/correction.controller.js';

const router = Router();

router.post('/generate-token', generateToken);

export default router;
