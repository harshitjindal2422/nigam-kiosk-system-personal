import { Router } from 'express';
import authRouter from './auth.routes.js';
import paymentRouter from './payment.routes.js';
import printRouter from './print.routes.js';

const router = Router();

// API Healthcheck route
router.get('/ping', (req, res) => {
  res.status(200).json({ success: true, message: 'Nagar Nigam API version 1.0.0 is active' });
});

// Auth Routes mounted in Phase 2
router.use('/auth', authRouter);

// Payment Routes mounted in Phase 4
router.use('/payment', paymentRouter);

// Print Routes mounted in Phase 4
router.use('/print', printRouter);

// Correction Routes
import correctionRouter from './correction.routes.js';
router.use('/counter-correction', correctionRouter);
// router.use('/pehchan-correction', pehchanCorrectionRouter);

export { router };
