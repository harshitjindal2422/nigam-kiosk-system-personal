import { Router } from 'express';
import { prisma } from '../config/db.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Use verifyJWT middleware for all admin routes
router.use(verifyJWT);

// Allowed models to prevent arbitrary access
const ALLOWED_MODELS = [
  'superAdmin',
  'admin',
  'payment',
  'certificatePrintRecord',
  'counterCorrectionRecord',
  'pehchanCorrectionRecord',
  'token'
];

router.get('/metrics', async (req, res, next) => {
  try {
    const printsCount = await prisma.certificatePrintRecord.count();
    
    const activeTokensCount = await prisma.token.count({
      where: { queue_status: { in: ['WAITING', 'SERVING'] } }
    });

    const revenueResult = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { payment_status: 'SUCCESS' }
    });

    const revenue = revenueResult._sum.amount ? parseFloat(revenueResult._sum.amount) : 0;

    res.status(200).json({
      metrics: {
        printedCertificates: printsCount,
        activeTokens: activeTokensCount,
        collectedRevenue: revenue,
        systemDiagnostics: 'ONLINE'
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tables', (req, res) => {
  let allowed = [...ALLOWED_MODELS];
  
  // Only SuperAdmin can view superAdmin and admin tables
  if (req.user && req.user.role !== 'SUPER_ADMIN') {
    allowed = allowed.filter(model => model !== 'superAdmin' && model !== 'admin');
  }

  res.status(200).json({ tables: allowed });
});

router.get('/db/:model', async (req, res, next) => {
  try {
    const { model } = req.params;
    
    // Check global allowed models
    if (!ALLOWED_MODELS.includes(model)) {
      return res.status(400).json({ error: 'Invalid or unauthorized table name' });
    }

    // Enforce role checks dynamically
    if (req.user && req.user.role !== 'SUPER_ADMIN') {
      if (model === 'superAdmin' || model === 'admin') {
         return res.status(403).json({ error: 'Forbidden: SuperAdmin access required' });
      }
    }

    const records = await prisma[model].findMany({
      take: 100 // Limit records to prevent massive payloads
    });

    res.status(200).json({ records });
  } catch (error) {
    next(error);
  }
});

export { router };
