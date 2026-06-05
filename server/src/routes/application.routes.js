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
  getCashierQueue,
  collectCashierPayment
} from '../controllers/application.controller.js';

const router = Router();

// Protect all routes
router.use(verifyJWT);

// Counter Operator routes
router.get('/active-tokens', authorizeRoles('COUNTER_OPERATOR', 'SUPER_ADMIN'), getActiveTokens);
router.get('/search', authorizeRoles('COUNTER_OPERATOR', 'SUPER_ADMIN'), searchApplication);
router.post('/submit', authorizeRoles('COUNTER_OPERATOR', 'SUPER_ADMIN'), submitApplication);

// Cashier Operator routes
router.get('/cashier-queue', authorizeRoles('CASHIER_OPERATOR', 'SUPER_ADMIN'), getCashierQueue);
router.post('/:id/cashier-collect', authorizeRoles('CASHIER_OPERATOR', 'SUPER_ADMIN'), collectCashierPayment);

// Checker Operator routes
router.get('/checker-queue', authorizeRoles('CHECKER_OPERATOR', 'SUPER_ADMIN'), getCheckerQueue);
router.post('/:id/checker-review', authorizeRoles('CHECKER_OPERATOR', 'SUPER_ADMIN'), reviewCheckerApplication);

// Approval Operator routes
router.get('/approval-queue', authorizeRoles('APPROVAL_OPERATOR', 'SUPER_ADMIN'), getApprovalQueue);
router.post('/:id/approval-review', authorizeRoles('APPROVAL_OPERATOR', 'SUPER_ADMIN'), reviewApprovalApplication);

export default router;
