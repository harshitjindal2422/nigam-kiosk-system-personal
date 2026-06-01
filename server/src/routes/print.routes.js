import { Router } from 'express';
import { checkDownload, executePrint, logError } from '../controllers/print.controller.js';

const router = Router();

// Polled by the React kiosk during HOLD state to verify if the file has landed
router.get('/check-download', checkDownload);

// Triggered by the kiosk after payment completion to execute mock printing
router.post('/execute', executePrint);

// Public logger endpoint for kiosk client-side errors
router.post('/log-error', logError);

export default router;
