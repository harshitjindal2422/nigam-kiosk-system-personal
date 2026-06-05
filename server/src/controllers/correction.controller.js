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

/**
 * @desc    Generate simple Kiosk Queue Token in the database (Unpaid/Counter Pay)
 * @route   POST /api/v1/counter-correction/kiosk-token
 * @access  Public
 */
export const generateKioskToken = asyncHandler(async (req, res) => {
  const { block, serviceType } = req.body;

  if (!block || !serviceType) {
    throw new ApiError(400, "Block and service type are required");
  }

  // 1. Determine Next Token Number
  const tokenCount = await prisma.token.count();
  
  // Format token like: TKN-BIR-REG-1002 or TKN-DEA-CORR-1003
  const blockPrefix = block.substring(0, 3).toUpperCase();
  const typePrefix = serviceType === 'correction' ? 'CORR' : 'REG';
  const tokenNumber = `TKN-${blockPrefix}-${typePrefix}-${tokenCount + 1001}`;

  // 2. Create Counter Correction Record with empty payment or details
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        amount: 20.00,
        payment_mode: 'COUNTER_CASH',
        transaction_id: `TXN-KIOSK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        payment_status: 'PENDING'
      }
    });

    const correctionRecord = await tx.counterCorrectionRecord.create({
      data: {
        payment_id: payment.payment_id,
        applicant_name: 'Kiosk Citizen',
        mobile_number: '9829XXXXXX',
        registration_number: 'KIOSK-TICKET',
        certificate_type: block.toUpperCase(),
        correction_type: serviceType === 'correction' ? 'MULTI' : 'NEW_REGISTRATION',
        token_number: tokenNumber
      }
    });

    const token = await tx.token.create({
      data: {
        correction_record_id: correctionRecord.correction_record_id,
        token_number: tokenNumber,
        counter_number: 'Counter 1',
        queue_status: 'WAITING'
      }
    });

    return token;
  });

  return res.status(201).json(
    new ApiResponse(201, { token: result }, "Kiosk token generated successfully")
  );
});
