import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../config/logger.js';

const prisma = new PrismaClient();

/**
 * @desc    Generate Counter Correction Token & Payment Record
 * @route   POST /api/v1/counter-correction/generate-token
 * @access  Public
 */
export const generateToken = asyncHandler(async (req, res) => {
  const { 
    applicantName, 
    mobileNumber, 
    registrationNumber, 
    certificateType, 
    correctionType,
    correctionDetails,
    amount,
    transactionId 
  } = req.body;

  if (!applicantName || !mobileNumber || !registrationNumber || !certificateType || !amount || !transactionId) {
    throw new ApiError(400, "All fields are required to generate a token");
  }

  // Execute database inserts atomically
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create or Update Payment Record (upsert to handle webhook pre-creation)
    const payment = await tx.payment.upsert({
      where: { transaction_id: transactionId },
      update: {
        registration_number: registrationNumber,
        amount,
        payment_status: 'SUCCESS',
        paid_at: new Date()
      },
      create: {
        registration_number: registrationNumber,
        amount,
        payment_mode: 'UPI',
        transaction_id: transactionId,
        payment_status: 'SUCCESS',
        paid_at: new Date()
      }
    });

    // 2. Determine Next Token Number
    const tokenCount = await tx.token.count();
    const tokenNumber = `TKN-${String(tokenCount + 101).padStart(3, '0')}`;

    // 3. Create Counter Correction Record
    const correctionRecord = await tx.counterCorrectionRecord.create({
      data: {
        payment_id: payment.payment_id,
        applicant_name: applicantName,
        mobile_number: mobileNumber,
        registration_number: registrationNumber,
        certificate_type: certificateType,
        correction_type: correctionType || 'MULTI',
        correction_details: correctionDetails || [],
        token_number: tokenNumber
      }
    });

    // 4. Create Physical Queue Token mapping
    const token = await tx.token.create({
      data: {
        correction_record_id: correctionRecord.correction_record_id,
        token_number: tokenNumber,
        counter_number: 'Counter 1',
        queue_status: 'WAITING'
      }
    });

    return { payment, correctionRecord, token };
  });

  // 5. Dispatch physical print job
  logger.info(`
=========================================
          MUNICIPAL THERMAL PRINTER
           NAGAR NIGAM KIOSK SYSTEM
=========================================
  TOKEN NO:     ${result.token.token_number}
  COUNTER:      ${result.token.counter_number}
-----------------------------------------
  Applicant:    ${applicantName}
  Reg No:       ${registrationNumber}
  Correction:   ${correctionType.toUpperCase()}
=========================================
  `);

  return res.status(201).json(
    new ApiResponse(201, result, "Counter correction token generated and spooled to printer successfully")
  );
});
