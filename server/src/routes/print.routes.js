import { Router } from 'express';
import { checkDownload, executePrint } from '../controllers/print.controller.js';

const router = Router();

// Polled by the React kiosk during HOLD state to verify if the file has landed
router.get('/check-download', checkDownload);

// Triggered by the kiosk after payment completion to execute mock printing
router.post('/execute', executePrint);

export default router;
