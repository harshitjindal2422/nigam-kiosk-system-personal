import { Router } from 'express';
import { prisma } from '../config/db.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import fs from 'fs';
import path from 'path';

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

router.get('/logs', async (req, res, next) => {
  try {
    const LOGS_DIR = path.resolve('logs');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const parseLogFile = async (filePath, category) => {
      try {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        const lines = data.split('\n');
        const entries = [];
        let currentEntry = null;

        const logRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+\[(\w+)\]:\s*(.*)$/;

        for (const line of lines) {
          const trimmed = line.trimEnd();
          if (!trimmed) continue;
          if (trimmed.includes('/admin/logs') || trimmed.includes('/admin/metrics')) {
            continue;
          }

          const match = trimmed.match(logRegex);
          if (match) {
            if (currentEntry) {
              entries.push(currentEntry);
            }
            currentEntry = {
              timestamp: match[1],
              level: match[2].toUpperCase(),
              category: category,
              message: match[3]
            };
          } else {
            if (currentEntry) {
              currentEntry.message += '\n' + trimmed;
            } else {
              currentEntry = {
                timestamp: `${dateStr} 00:00:00`,
                level: 'INFO',
                category: category,
                message: trimmed
              };
            }
          }
        }
        if (currentEntry) {
          entries.push(currentEntry);
        }
        return entries;
      } catch (err) {
        return [];
      }
    };

    const systemLogs = await parseLogFile(path.join(LOGS_DIR, `system-${dateStr}.log`), 'system');
    const errorLogs = await parseLogFile(path.join(LOGS_DIR, `errors-${dateStr}.log`), 'system');
    const paymentLogs = await parseLogFile(path.join(LOGS_DIR, `payments-${dateStr}.log`), 'payments');
    const printerLogs = await parseLogFile(path.join(LOGS_DIR, `printers-${dateStr}.log`), 'printers');
    const sessionLogs = await parseLogFile(path.join(LOGS_DIR, `sessions-${dateStr}.log`), 'sessions');

    const allLogs = [
      ...systemLogs,
      ...errorLogs,
      ...paymentLogs,
      ...printerLogs,
      ...sessionLogs
    ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const seen = new Set();
    const dedupedLogs = [];
    for (const entry of allLogs) {
      const key = `${entry.timestamp}-${entry.category}-${entry.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        dedupedLogs.push(entry);
      }
    }

    const limitedLogs = dedupedLogs.slice(-100);

    res.status(200).json({ logs: limitedLogs });
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
