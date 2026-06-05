import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../config/logger.js';

const prisma = new PrismaClient();

// Helper to generate a unique Enrollment ID
const generateUniqueEnrollmentId = async () => {
  let isUnique = false;
  let enrollmentId = '';
  while (!isUnique) {
    enrollmentId = `ENR-${Math.floor(100000 + Math.random() * 900000)}`;
    const existing = await prisma.application.findUnique({
      where: { enrollment_id: enrollmentId }
    });
    if (!existing) {
      isUnique = true;
    }
  }
  return enrollmentId;
};

// Helper to calculate visit time
const calculateNextVisitTime = (correctionType, submittedDate) => {
  const date = new Date(submittedDate);
  const nextVisit = new Date(date);

  if (correctionType === 'MINOR') {
    const hours = date.getHours();
    // Sub-2PM rule (submitted before 2:00 PM)
    if (hours < 14) {
      // Same day at 5:00 PM
      nextVisit.setHours(17, 0, 0, 0);
    } else {
      // Next day at 5:00 PM
      nextVisit.setDate(nextVisit.getDate() + 1);
      nextVisit.setHours(17, 0, 0, 0);
    }
  } else {
    // Major correction / New registration -> 5 days later
    nextVisit.setDate(nextVisit.getDate() + 5);
    nextVisit.setHours(10, 0, 0, 0); // Default to 10:00 AM
  }

  return nextVisit;
};

/**
 * @desc    Get Active WAITING/SERVING queue tokens
 * @route   GET /api/v1/applications/active-tokens
 */
export const getActiveTokens = asyncHandler(async (req, res) => {
  const tokens = await prisma.token.findMany({
    where: {
      queue_status: { in: ['WAITING', 'SERVING'] }
    },
    orderBy: { issued_at: 'asc' }
  });

  return res.status(200).json(
    new ApiResponse(200, tokens, "Active queue tokens retrieved successfully")
  );
});

/**
 * @desc    Search for an existing application in OBJECTION status
 * @route   GET /api/v1/applications/search
 */
export const searchApplication = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    throw new ApiError(400, "Search query is required");
  }

  const upperQuery = query.toUpperCase();

  const application = await prisma.application.findFirst({
    where: {
      status: 'OBJECTION',
      OR: [
        { token_number: upperQuery },
        { enrollment_id: upperQuery }
      ]
    }
  });

  if (!application) {
    throw new ApiError(404, "No application under objection found with the provided details");
  }

  return res.status(200).json(
    new ApiResponse(200, application, "Objection application found")
  );
});

/**
 * @desc    Submit a new/corrected application (Counter Operator)
 * @route   POST /api/v1/applications/submit
 */
export const submitApplication = asyncHandler(async (req, res) => {
  const {
    tokenNumber,
    departmentBlock,
    serviceType,
    selfieUrl,
    commonDetails,
    correctionFields,
    correctionType,
    uploadedDocuments,
    paymentDetails
  } = req.body;

  if (!tokenNumber || !departmentBlock || !serviceType || !commonDetails || !paymentDetails) {
    throw new ApiError(400, "Incomplete application payload");
  }

  const { applicantName, mobileNumber, registrationNumber, fatherName, motherName, dob, relationWithApplicant } = commonDetails;

  const now = new Date();
  const nextVisitTime = calculateNextVisitTime(correctionType, now);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Check if there is an existing OBJECTION application for this token/enrollment
    let application = await tx.application.findFirst({
      where: {
        token_number: tokenNumber,
        status: 'OBJECTION'
      }
    });

    let enrollmentId = application?.enrollment_id;

    if (application) {
      // Re-submission flow: Update existing application
      application = await tx.application.update({
        where: { application_id: application.application_id },
        data: {
          selfie_url: selfieUrl,
          applicant_name: applicantName,
          mobile_number: mobileNumber,
          registration_number: registrationNumber,
          father_name: fatherName,
          mother_name: motherName,
          dob: dob,
          relation_with_applicant: relationWithApplicant,
          correction_type: correctionType,
          correction_details: correctionFields || [],
          uploaded_documents: uploadedDocuments || [],
          status: 'PENDING_CHECKER',
          objection_remarks: null,
          next_visit_time: nextVisitTime,
          counter_operator_id: req.user.admin_id
        }
      });
    } else {
      // New submission flow: Generate new enrollment ID and create
      enrollmentId = await generateUniqueEnrollmentId();
      application = await tx.application.create({
        data: {
          enrollment_id: enrollmentId,
          token_number: tokenNumber,
          department_block: departmentBlock.toUpperCase(),
          service_type: serviceType.toUpperCase(),
          selfie_url: selfieUrl,
          applicant_name: applicantName,
          mobile_number: mobileNumber,
          registration_number: registrationNumber,
          father_name: fatherName,
          mother_name: motherName,
          dob: dob,
          relation_with_applicant: relationWithApplicant,
          correction_type: correctionType,
          correction_details: correctionFields || [],
          uploaded_documents: uploadedDocuments || [],
          status: paymentDetails.method === 'CASH' ? 'PENDING_CASHIER' : 'PENDING_CHECKER',
          next_visit_time: nextVisitTime,
          payment_method: paymentDetails.method,
          payment_amount: paymentDetails.amount,
          payment_status: paymentDetails.method === 'CASH' ? 'PENDING' : 'SUCCESS',
          transaction_id: paymentDetails.transactionId,
          counter_operator_id: req.user.admin_id
        }
      });
    }

    // 2. Resolve queue Token status to COMPLETED
    const token = await tx.token.findFirst({
      where: { token_number: tokenNumber }
    });

    if (token) {
      await tx.token.update({
        where: { token_id: token.token_id },
        data: { queue_status: 'COMPLETED' }
      });
    }

    return { application, enrollmentId };
  });

  // 3. Dispatch simulated SMS
  const nextVisitFormatted = nextVisitTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  if (paymentDetails.method === 'CASH') {
    logger.info(`[SMS] Sent to ${mobileNumber}: Dear Applicant, your request for ${departmentBlock.toUpperCase()} has been submitted under Enrollment No: ${result.enrollmentId}. Please pay the Rs 20.00 fee at the Cashier counter to proceed. - Jaipur Municipal`);
  } else {
    logger.info(`[SMS] Sent to ${mobileNumber}: Dear Applicant, your request for ${departmentBlock.toUpperCase()} has been submitted successfully under Enrollment No: ${result.enrollmentId}. Next Visit Scheduled: ${nextVisitFormatted}. - Jaipur Municipal`);
  }

  const msg = paymentDetails.method === 'CASH'
    ? "Application registered and queued for Cashier payment successfully"
    : "Application registered and queued for Checker review successfully";

  return res.status(201).json(
    new ApiResponse(201, result.application, msg)
  );
});

/**
 * @desc    Get applications pending checker review
 * @route   GET /api/v1/applications/checker-queue
 */
export const getCheckerQueue = asyncHandler(async (req, res) => {
  const applications = await prisma.application.findMany({
    where: {
      status: { in: ['PENDING_CHECKER', 'REVERTED_TO_CHECKER'] }
    },
    orderBy: { created_at: 'asc' }
  });

  return res.status(200).json(
    new ApiResponse(200, applications, "Checker queue retrieved successfully")
  );
});

/**
 * @desc    Review and update application status (Checker Operator)
 * @route   POST /api/v1/applications/:id/checker-review
 */
export const reviewCheckerApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, objectionRemarks } = req.body;

  if (!action || !['APPROVE', 'OBJECT'].includes(action)) {
    throw new ApiError(400, "Invalid action, must be 'APPROVE' or 'OBJECT'");
  }

  const application = await prisma.application.findUnique({
    where: { application_id: parseInt(id) }
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  let finalStatus = 'APPROVED';
  if (action === 'OBJECT') {
    if (!objectionRemarks) {
      throw new ApiError(400, "Objection remarks are required for an objection");
    }
    finalStatus = 'OBJECTION';
  }

  const updatedApplication = await prisma.application.update({
    where: { application_id: application.application_id },
    data: {
      status: finalStatus,
      objection_remarks: action === 'OBJECT' ? objectionRemarks : null,
      checker_operator_id: req.user.admin_id
    }
  });

  // Dispatch simulated SMS status updates
  if (finalStatus === 'APPROVED') {
    logger.info(`[SMS] Sent to ${application.mobile_number}: Dear Applicant, your request under Enrollment No: ${application.enrollment_id} has been approved by the Checker and is pending final DSC approval. - Jaipur Municipal`);
  } else {
    logger.info(`[SMS] Sent to ${application.mobile_number}: Dear Applicant, your request under Enrollment No: ${application.enrollment_id} has an objection: ${objectionRemarks}. Please visit the Counter with the required documents. - Jaipur Municipal`);
  }

  return res.status(200).json(
    new ApiResponse(200, updatedApplication, `Application reviewed successfully as ${finalStatus}`)
  );
});

/**
 * @desc    Get approved applications pending DSC finalization
 * @route   GET /api/v1/applications/approval-queue
 */
export const getApprovalQueue = asyncHandler(async (req, res) => {
  const applications = await prisma.application.findMany({
    where: {
      status: 'APPROVED'
    },
    orderBy: { updated_at: 'asc' }
  });

  return res.status(200).json(
    new ApiResponse(200, applications, "Approval queue retrieved successfully")
  );
});

/**
 * @desc    Authorize DSC done or revert back to checker (Approval Operator)
 * @route   POST /api/v1/applications/:id/approval-review
 */
export const reviewApprovalApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, revertRemarks } = req.body;

  if (!action || !['DONE', 'REVERT'].includes(action)) {
    throw new ApiError(400, "Invalid action, must be 'DONE' or 'REVERT'");
  }

  const application = await prisma.application.findUnique({
    where: { application_id: parseInt(id) }
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  let finalStatus = 'DONE';
  if (action === 'REVERT') {
    if (!revertRemarks) {
      throw new ApiError(400, "Revert remarks are required for reverting");
    }
    finalStatus = 'REVERTED_TO_CHECKER';
  }

  const updatedApplication = await prisma.application.update({
    where: { application_id: application.application_id },
    data: {
      status: finalStatus,
      objection_remarks: action === 'REVERT' ? revertRemarks : null,
      approval_operator_id: req.user.admin_id
    }
  });

  // Dispatch simulated SMS status updates
  if (finalStatus === 'DONE') {
    logger.info(`[SMS] Sent to ${application.mobile_number}: Dear Applicant, your request under Enrollment No: ${application.enrollment_id} has been completed successfully. You can now download/print your certificate. - Jaipur Municipal`);
  } else {
    // Request goes back to checker. Checker reviews the revert remarks and triggers Objection SMS.
    logger.info(`[SYSTEM] Application ${application.enrollment_id} reverted from Approval to Checker with remarks: "${revertRemarks}"`);
  }

  return res.status(200).json(
    new ApiResponse(200, updatedApplication, `Application completed with action ${finalStatus}`)
  );
});

/**
 * @desc    Get applications pending cashier payment (Cashier)
 * @route   GET /api/v1/applications/cashier-queue
 */
export const getCashierQueue = asyncHandler(async (req, res) => {
  // Delete offline cashier pending payments created before today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const deletedCount = await prisma.application.deleteMany({
    where: {
      status: 'PENDING_CASHIER',
      created_at: {
        lt: startOfToday
      }
    }
  });

  if (deletedCount.count > 0) {
    logger.info(`[SYSTEM] Deleted ${deletedCount.count} expired unpaid cashier applications.`);
  }

  const applications = await prisma.application.findMany({
    where: {
      status: 'PENDING_CASHIER'
    },
    orderBy: { created_at: 'asc' }
  });

  return res.status(200).json(
    new ApiResponse(200, applications, "Cashier queue retrieved successfully")
  );
});

/**
 * @desc    Collect offline cash payment for application (Cashier)
 * @route   POST /api/v1/applications/:id/cashier-collect
 */
export const collectCashierPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const application = await prisma.application.findUnique({
    where: { application_id: parseInt(id) }
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  if (application.status !== 'PENDING_CASHIER') {
    throw new ApiError(400, "Application is not in pending cashier status");
  }

  const updatedApplication = await prisma.application.update({
    where: { application_id: application.application_id },
    data: {
      status: 'PENDING_CHECKER',
      payment_status: 'SUCCESS',
    }
  });

  logger.info(`[SMS] Sent to ${application.mobile_number}: Dear Applicant, payment of Rs 20.00 for Enrollment No: ${application.enrollment_id} has been received successfully. Your application is now queued for Checker review. - Jaipur Municipal`);

  return res.status(200).json(
    new ApiResponse(200, updatedApplication, "Payment collected and application forwarded to Checker successfully")
  );
});
