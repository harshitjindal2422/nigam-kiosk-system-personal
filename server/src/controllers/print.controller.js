import PrintService from '../services/print.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';

export const logError = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (message) {
    logger.error(`[KIOSK ERROR] ${message}`);
  }
  return res.status(200).json(
    new ApiResponse(200, {}, 'Kiosk error logged successfully on server.')
  );
});

const POLL_TRACKER = {}; // ip -> { firstPollTime, hasDetected }

export const checkDownload = asyncHandler(async (req, res) => {
  const download = await PrintService.detectDownload();

  if (download) {
    return res.status(200).json(
      new ApiResponse(200, { detected: true, ...download }, 'Fresh downloaded certificate detected successfully!')
    );
  }

  // Cloud/Production simulation mode
  if (process.env.NODE_ENV === 'production') {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'default';
    const now = Date.now();

    if (!POLL_TRACKER[clientIp]) {
      POLL_TRACKER[clientIp] = { firstPollTime: now, hasDetected: false };
    }

    const elapsed = now - POLL_TRACKER[clientIp].firstPollTime;
    
    // Simulate download detection after 5 seconds of polling
    if (elapsed > 5000 && !POLL_TRACKER[clientIp].hasDetected) {
      POLL_TRACKER[clientIp].hasDetected = true;
      
      // Clean up tracker after some time
      setTimeout(() => {
        delete POLL_TRACKER[clientIp];
      }, 15000);

      logger.info(`✨ [MOCK SANDBOX]: Simulating download detection for client IP: ${clientIp}`);
      return res.status(200).json(
        new ApiResponse(200, {
          detected: true,
          fileName: `mock_download_${Date.now()}.pdf`,
          ageSeconds: 1,
          sizeBytes: 120000
        }, 'Simulated fresh downloaded certificate detected successfully!')
      );
    }
  }

  return res.status(200).json(
    new ApiResponse(200, { detected: false }, 'No fresh downloaded certificate detected yet.')
  );
});

export const executePrint = asyncHandler(async (req, res) => {
  const {
    applicantName,
    mobileNumber,
    registrationNumber,
    certificateType,
    totalCopies,
    downloadedFileName,
    amount,
    transactionId,
    paymentMode,
  } = req.body;

  // Validate required input properties
  if (
    !applicantName ||
    !mobileNumber ||
    !registrationNumber ||
    !certificateType ||
    !totalCopies ||
    !downloadedFileName ||
    !amount ||
    !transactionId
  ) {
    throw new ApiError(400, 'Missing required print parameters in request body.');
  }

  const result = await PrintService.executePrint({
    applicantName,
    mobileNumber,
    registrationNumber,
    certificateType,
    totalCopies,
    downloadedFileName,
    amount,
    transactionId,
    paymentMode,
    adminId: req.user?.id || null, // Associates active admin context if logged in
  });

  return res.status(200).json(
    new ApiResponse(200, result, 'Certificate spooled and printed successfully!')
  );
});
