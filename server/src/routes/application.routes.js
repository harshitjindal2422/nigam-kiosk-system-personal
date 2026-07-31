import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import {
  getActiveTokens,
  searchApplication,
  submitApplication,
  getCheckerQueue,
  reviewCheckerApplication,
  getApprovalQueue,
  reviewApprovalApplication,
  translateText,
  uploadCertificate,
  updateApplicationDocuments,
  updateApplicationDetails,
  detectScan,
  saveScan,
  triggerPhysicalScan,
  uploadScanFile
} from '../controllers/application.controller.js';

const router = Router();

// Scanner Hardware Integration routes (Bypass JWT for local agent hardware execution)
router.get('/detect-scan', detectScan);
router.post('/save-scan', saveScan);
router.post('/trigger-physical-scan', triggerPhysicalScan);
router.post('/upload-scan', uploadScanFile);

// Protect all remaining routes
router.use(verifyJWT);

// Counter Operator routes
router.get('/active-tokens', authorizeRoles('COUNTER_OPERATOR', 'MARRIAGE_OPERATOR', 'SUPER_ADMIN', 'ADMIN'), getActiveTokens);
router.get('/search', authorizeRoles('COUNTER_OPERATOR', 'MARRIAGE_OPERATOR', 'SUPER_ADMIN', 'ADMIN'), searchApplication);
router.post('/submit', authorizeRoles('COUNTER_OPERATOR', 'MARRIAGE_OPERATOR', 'SUPER_ADMIN', 'ADMIN'), submitApplication);
router.post('/translate', authorizeRoles('COUNTER_OPERATOR', 'MARRIAGE_OPERATOR', 'SUPER_ADMIN', 'ADMIN'), translateText);

// Checker Operator routes
router.get('/checker-queue', authorizeRoles('CHECKER_OPERATOR', 'SUPER_ADMIN'), getCheckerQueue);
router.post('/:id/checker-review', authorizeRoles('CHECKER_OPERATOR', 'SUPER_ADMIN'), reviewCheckerApplication);

// Approval Operator routes
router.get('/approval-queue', authorizeRoles('APPROVAL_OPERATOR', 'SUPER_ADMIN'), getApprovalQueue);
router.post('/upload-certificate', authorizeRoles('APPROVAL_OPERATOR', 'SUPER_ADMIN'), uploadCertificate);
router.post('/:id/approval-review', authorizeRoles('APPROVAL_OPERATOR', 'SUPER_ADMIN'), reviewApprovalApplication);
router.post('/:id/update-documents', authorizeRoles('APPROVAL_OPERATOR', 'SUPER_ADMIN'), updateApplicationDocuments);
router.post('/:id/update-details', authorizeRoles('APPROVAL_OPERATOR', 'SUPER_ADMIN'), updateApplicationDetails);

export default router;
