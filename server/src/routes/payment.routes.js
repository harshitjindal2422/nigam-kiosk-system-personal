import { Router } from 'express';
import { generateQRCode, verifyStatus, receiveWebhook } from '../controllers/payment.controller.js';

const router = Router();

// Endpoint to fetch simulated UPI QR barcode parameters
router.post('/qr', generateQRCode);

// Endpoint to verify transaction status (success simulation)
router.get('/verify/:transactionId', verifyStatus);

// Endpoint to receive gateway webhook callbacks (SBI / Razorpay / Bank)
router.post('/webhook', receiveWebhook);

export default router;
