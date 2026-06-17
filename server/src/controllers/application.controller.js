import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../config/logger.js';
import { generateUniversalToken } from '../utils/tokenGenerator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    include: {
      correction_record: true
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

  let finalTokenNumber = tokenNumber;
  if (
    departmentBlock.toUpperCase() === 'MARRIAGE' &&
    serviceType.toUpperCase() === 'NEW_REGISTRATION' &&
    (!tokenNumber || tokenNumber === 'GENERATE_MARRIAGE_TOKEN')
  ) {
    finalTokenNumber = await generateUniversalToken('marriage', 'new_registration');
  }

  if (!finalTokenNumber || !departmentBlock || !serviceType || !commonDetails || !paymentDetails) {
    throw new ApiError(400, "Incomplete application payload");
  }

  const { applicantName, mobileNumber, registrationNumber, fatherName, motherName, dob, relationWithApplicant } = commonDetails;

  const now = new Date();
  const nextVisitTime = calculateNextVisitTime(correctionType, now);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Check if there is an existing OBJECTION application for this token/enrollment
    let application = await tx.application.findFirst({
      where: {
        token_number: finalTokenNumber,
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
          token_number: finalTokenNumber,
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
          status: 'PENDING_CHECKER',
          next_visit_time: nextVisitTime,
          payment_method: paymentDetails.method,
          payment_amount: paymentDetails.amount,
          payment_status: 'SUCCESS',
          transaction_id: paymentDetails.transactionId,
          counter_operator_id: req.user.admin_id
        }
      });
    }

    // 2. Resolve queue Token status to COMPLETED and update/create database Payment record
    const token = await tx.token.findFirst({
      where: { token_number: finalTokenNumber },
      include: {
        correction_record: true
      }
    });

    if (token) {
      await tx.token.update({
        where: { token_id: token.token_id },
        data: { queue_status: 'COMPLETED' }
      });

      if (token.correction_record) {
        await tx.payment.update({
          where: { payment_id: token.correction_record.payment_id },
          data: {
            transaction_id: paymentDetails.transactionId,
            amount: paymentDetails.amount,
            payment_mode: paymentDetails.method === 'CASH' ? 'COUNTER_CASH' : paymentDetails.method === 'EXEMPT' ? 'EXEMPT' : 'UPI',
            payment_status: 'SUCCESS',
            paid_at: new Date(),
            registration_number: enrollmentId
          }
        });
      } else {
        // Create new payment record since token has no correction/payment record associated
        await tx.payment.create({
          data: {
            amount: paymentDetails.amount,
            payment_mode: paymentDetails.method === 'CASH' ? 'COUNTER_CASH' : paymentDetails.method === 'EXEMPT' ? 'EXEMPT' : 'UPI',
            payment_status: 'SUCCESS',
            transaction_id: paymentDetails.transactionId,
            paid_at: new Date(),
            registration_number: enrollmentId
          }
        });
      }
    } else {
      // Create new payment record since it was generated directly at the counter
      await tx.payment.create({
        data: {
          amount: paymentDetails.amount,
          payment_mode: paymentDetails.method === 'CASH' ? 'COUNTER_CASH' : paymentDetails.method === 'EXEMPT' ? 'EXEMPT' : 'UPI',
          payment_status: 'SUCCESS',
          transaction_id: paymentDetails.transactionId,
          paid_at: new Date(),
          registration_number: enrollmentId
        }
      });
    }

    return { application, enrollmentId };
  });

  // 3. Dispatch simulated SMS
  logger.info(`[SMS] Sent to ${mobileNumber}: Dear Applicant, your application reference number is ${result.enrollmentId} and will be proceeded with in 7 days. - Jaipur Municipal`);

  const msg = "Application registered and queued for Checker review successfully";

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
      status: { in: ['PENDING_CHECKER', 'REVERTED_TO_CHECKER', 'OBJECTION'] }
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
  const { action, objectionRemarks, correctedData } = req.body;

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
    if (application.status === 'REVERTED_TO_CHECKER') {
      throw new ApiError(400, "Reverted applications cannot be flagged with objection. They must be corrected and approved.");
    }
    if (!objectionRemarks) {
      throw new ApiError(400, "Objection remarks are required for an objection");
    }
    finalStatus = 'OBJECTION';
  }

  const updatePayload = {
    status: finalStatus,
    objection_remarks: action === 'OBJECT' ? objectionRemarks : null,
    checker_operator_id: req.user.admin_id
  };

  // If the application is reverted and the action is APPROVE, update it with corrected details
  if (application.status === 'REVERTED_TO_CHECKER' && action === 'APPROVE' && correctedData) {
    updatePayload.applicant_name = correctedData.applicant_name;
    updatePayload.mobile_number = correctedData.mobile_number;
    updatePayload.father_name = correctedData.father_name;
    updatePayload.mother_name = correctedData.mother_name;
    updatePayload.registration_number = correctedData.registration_number;
    updatePayload.dob = correctedData.dob;
    updatePayload.correction_details = correctedData.correction_details;
    updatePayload.uploaded_documents = correctedData.uploaded_documents;
  }

  const updatedApplication = await prisma.application.update({
    where: { application_id: application.application_id },
    data: updatePayload
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
  const { action, revertRemarks, downloadedCertificateUrl } = req.body;

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

  const updatedApplication = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { application_id: application.application_id },
      data: {
        status: finalStatus,
        objection_remarks: action === 'REVERT' ? revertRemarks : null,
        downloaded_certificate_url: action === 'DONE' ? downloadedCertificateUrl : null,
        approval_operator_id: req.user.admin_id
      }
    });

    if (action === 'DONE') {
      // 1. Find the CounterCorrectionRecord to parse copies
      const correctionRecord = await tx.counterCorrectionRecord.findFirst({
        where: { token_number: application.token_number }
      });

      let totalCopies = 1;
      if (correctionRecord && correctionRecord.remarks) {
        const match = correctionRecord.remarks.match(/COPIES:\s*(\d+)/i);
        if (match) {
          totalCopies = parseInt(match[1]) || 1;
        }
      }

      // 2. Find associated Payment record
      const payment = await tx.payment.findFirst({
        where: {
          OR: [
            { transaction_id: application.transaction_id },
            { registration_number: application.enrollment_id }
          ]
        }
      });
      // 3. Create/Upsert PrintToken in the printer operators spool queue
      await tx.printToken.upsert({
        where: { token_number: application.token_number },
        update: {
          applicant_name: application.applicant_name,
          mobile_number: application.mobile_number,
          certificate_type: application.department_block,
          service_type: 'PRI',
          total_copies: totalCopies,
          downloaded_file_name: `${application.token_number}.pdf`,
          fee_status: 'FULFILLED', // pre-paid at counter
          fee_amount: application.payment_amount,
          print_status: 'PENDING',
          created_at: new Date()
        },
        create: {
          token_number: application.token_number,
          applicant_name: application.applicant_name,
          mobile_number: application.mobile_number,
          certificate_type: application.department_block,
          service_type: 'PRI',
          total_copies: totalCopies,
          downloaded_file_name: `${application.token_number}.pdf`,
          fee_status: 'FULFILLED', // pre-paid at counter
          fee_amount: application.payment_amount,
          print_status: 'PENDING',
          created_at: new Date()
        }
      });
      
      // 4. Create/Update CertificatePrintRecord in database for admin logs & database viewer
      // Note: Using findFirst + update/create instead of upsert since token_number
      // uniqueness is enforced at DB level but the JS client may not reflect it yet.
      const existingPrintRecord = await tx.certificatePrintRecord.findFirst({
        where: { token_number: application.token_number }
      });

      const printRecordData = {
        applicant_name: application.applicant_name,
        mobile_number: application.mobile_number,
        registration_number: application.enrollment_id,
        certificate_type: application.department_block,
        total_copies: totalCopies,
        downloaded_file_name: `${application.token_number}.pdf`,
        token_number: application.token_number,
        downloaded_at: new Date(),
        print_status: 'PENDING'
      };

      if (existingPrintRecord) {
        await tx.certificatePrintRecord.update({
          where: { print_record_id: existingPrintRecord.print_record_id },
          data: {
            ...printRecordData,
            ...(payment ? { payment_id: payment.payment_id } : {})
          }
        });
      } else {
        // Only include payment_id in create if we have a valid payment
        await tx.certificatePrintRecord.create({
          data: {
            ...printRecordData,
            ...(payment ? { payment_id: payment.payment_id } : {})
          }
        });
      }
    }

    return updated;
  });

  // Dispatch simulated SMS status updates
  if (finalStatus === 'DONE') {
    const downloadLink = downloadedCertificateUrl || `http://localhost:5000/temp/downloads/${application.token_number}.pdf`;
    logger.info(`[SMS] Sent to ${application.mobile_number}: Dear Applicant, your request under Enrollment No: ${application.enrollment_id} has been completed successfully. Download certificate: ${downloadLink} - Jaipur Municipal`);
  } else {
    // Request goes back to checker. Checker reviews the revert remarks and triggers Objection SMS.
    logger.info(`[SYSTEM] Application ${application.enrollment_id} reverted from Approval to Checker with remarks: "${revertRemarks}"`);
    logger.info(`[SMS] Sent to ${application.mobile_number}: Dear Applicant, your request under Enrollment No: ${application.enrollment_id} was reverted/rejected by the Approval Operator with remarks: "${revertRemarks}". Please visit the Checker desk to verify and correct your application. - Jaipur Municipal`);
  }

  return res.status(200).json(
    new ApiResponse(200, updatedApplication, `Application completed with action ${finalStatus}`)
  );
});

/**
 * @desc    Auto-translate English text to Hindi (Mock Transliteration)
 * @route   POST /api/v1/applications/translate
 */
export const translateText = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    throw new ApiError(400, "Text is required for translation");
  }

  // Simple key-value dictionary for common names & words,
  // plus fallback logic that simulates phonetic transliteration.
  const dict = {
    // Names
    "RAMESH": "रमेश",
    "SURESH": "सुरेश",
    "ANJALI": "अंजलि",
    "SHARMA": "शर्मा",
    "KUMAR": "कुमार",
    "SINGH": "सिंह",
    "JAIPUR": "जयपुर",
    "RAJASTHAN": "राजस्थान",
    "HOSPITAL": "अस्पताल",
    "MALVIYA NAGAR": "मालवीय नगर",
    "SMS HOSPITAL": "एसएमएस अस्पताल",
    "MANIPAL": "मनिपाल",
    "GANDHI NAGAR": "गांधी नगर",
    "FATHER": "पिता",
    "MOTHER": "माता",
    "SELF": "स्वयं",
    "MALE": "पुरुष",
    "FEMALE": "महिला",
    "OTHER": "अन्य",
    "VERMA": "वर्मा",
    "GUPTA": "गुप्ता",
    "MEENA": "मीना",
    "CHOUDHARY": "चौधरी",
    "PATEL": "पटेल",
    "YADAV": "यादव",
    "SHASTRI NAGAR": "शास्त्री नगर",
    "JAGATPURA": "जगतपुरा",
    "SANGANER": "सांगानेर",
    "ROHAN": "रोहन",
    "ROHIT": "रोहित",
    "MOHIT": "मोहित",
    "KUNAL": "कुनाल",
    "SINGHAL": "सिंघल",
    "BANSAL": "बंसल",
    "AGRAWAL": "अग्रवाल",
    "GOYAL": "गोयल",
    "JAIN": "जैन",
    "SEN": "सेन",
    "DEVI": "देवी",
    "PRASAD": "प्रसाद",
    "LAL": "लाल",
    "CHAND": "चन्द",
    "SURENDRA": "सुरेंद्र",
    "NAGAR": "नगर",
    "NIGAM": "निगम",
    "KAUR": "कौर"
  };

  const mapping = [
    { en: "SH", hi: "श" },
    { en: "KH", hi: "ख" },
    { en: "GH", hi: "घ" },
    { en: "CH", hi: "च" },
    { en: "JH", hi: "झ" },
    { en: "TH", hi: "थ" },
    { en: "DH", hi: "ध" },
    { en: "BH", hi: "भ" },
    { en: "PH", hi: "फ" },
    { en: "GY", hi: "ज्ञ" },
    { en: "TR", hi: "त्र" },
    { en: "AA", hi: "ा" },
    { en: "EE", hi: "ी" },
    { en: "OO", hi: "ू" },
    { en: "A", hi: "ा" },
    { en: "E", hi: "े" },
    { en: "I", hi: "ि" },
    { en: "O", hi: "ो" },
    { en: "U", hi: "ु" },
    { en: "B", hi: "ब" },
    { en: "C", hi: "क" },
    { en: "D", hi: "द" },
    { en: "F", hi: "फ" },
    { en: "G", hi: "ग" },
    { en: "H", hi: "ह" },
    { en: "J", hi: "ज" },
    { en: "K", hi: "क" },
    { en: "L", hi: "ल" },
    { en: "M", hi: "म" },
    { en: "N", hi: "न" },
    { en: "P", hi: "प" },
    { en: "R", hi: "र" },
    { en: "S", hi: "स" },
    { en: "T", hi: "त" },
    { en: "V", hi: "व" },
    { en: "W", hi: "व" },
    { en: "Y", hi: "य" },
    { en: "Z", hi: "ज" }
  ];

  const translateWordPhonetically = (word) => {
    let result = "";
    let i = 0;
    while (i < word.length) {
      let matched = false;

      // Check double-character mapping
      if (i + 1 < word.length) {
        const twoChars = word.substring(i, i + 2);
        const map = mapping.find(m => m.en === twoChars);
        if (map) {
          result += map.hi;
          i += 2;
          matched = true;
        }
      }

      if (!matched) {
        const char = word.charAt(i);
        if (char === 'A') {
          // If it's the last character of the word, treat as 'ा'
          if (i === word.length - 1) {
            result += "ा";
          } else {
            // Treat as silent/schwa in the middle
            result += "";
          }
          i += 1;
        } else if (char === 'I') {
          // If it's the last character of the word, treat as 'ी'
          if (i === word.length - 1) {
            result += "ी";
          } else {
            result += "ि";
          }
          i += 1;
        } else {
          const map = mapping.find(m => m.en === char);
          if (map) {
            result += map.hi;
          } else {
            result += char;
          }
          i += 1;
        }
      }
    }
    return result;
  };

  const cleanText = text.toUpperCase().trim();
  const words = cleanText.split(/\s+/);
  const translatedWords = words.map(word => {
    if (dict[word]) {
      return dict[word];
    }
    return translateWordPhonetically(word);
  });

  const translatedText = translatedWords.join(" ");

  return res.status(200).json(
    new ApiResponse(200, { translatedText }, "Translation successful")
  );
});

/**
 * @desc    Upload certificate PDF as base64 and write it to temp/downloads
 * @route   POST /api/v1/applications/upload-certificate
 */
export const uploadCertificate = asyncHandler(async (req, res) => {
  const { fileName, base64Data } = req.body;

  if (!fileName || !base64Data) {
    throw new ApiError(400, "fileName and base64Data are required");
  }

  const downloadsDir = path.resolve(__dirname, '../../temp/downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  const filePath = path.join(downloadsDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

  logger.info(`💾 [CERTIFICATE UPLOAD]: Successfully wrote uploaded certificate to disk: ${filePath}`);

  return res.status(200).json(
    new ApiResponse(200, { filePath }, "Certificate file uploaded and written successfully")
  );
});
