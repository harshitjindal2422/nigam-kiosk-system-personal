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

export const checkDownload = asyncHandler(async (req, res) => {
  const download = await PrintService.detectDownload();

  if (!download) {
    return res.status(200).json(
      new ApiResponse(200, { detected: false }, 'No fresh downloaded certificate detected yet.')
    );
  }

  return res.status(200).json(
    new ApiResponse(200, { detected: true, ...download }, 'Fresh downloaded certificate detected successfully!')
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
    adminId: req.user?.id || null, // Associates active admin context if logged in
  });

  return res.status(200).json(
    new ApiResponse(200, result, 'Certificate spooled and printed successfully!')
  );
});
