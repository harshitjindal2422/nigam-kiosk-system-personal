import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import {
  getPrinterTokens,
  collectCashFee,
  executePrinterPrint,
  getPrinterTokenPdf
} from '../controllers/printer.controller.js';

const router = Router();

// Protect all printer routes with JWT verification
router.use(verifyJWT);

// Access limited to PRINTER_OPERATOR and SUPER_ADMIN roles
router.get('/tokens', authorizeRoles('PRINTER_OPERATOR', 'SUPER_ADMIN'), getPrinterTokens);
router.post('/tokens/:tokenNumber/collect-cash', authorizeRoles('PRINTER_OPERATOR', 'SUPER_ADMIN'), collectCashFee);
router.post('/tokens/:tokenNumber/print', authorizeRoles('PRINTER_OPERATOR', 'SUPER_ADMIN'), executePrinterPrint);
router.get('/tokens/:tokenNumber/pdf', authorizeRoles('PRINTER_OPERATOR', 'SUPER_ADMIN'), getPrinterTokenPdf);

export default router;
