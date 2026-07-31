import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import { getISTDate } from '../utils/dateHelper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOAD_DIR = path.resolve(__dirname, '../../temp/downloads');

/**
 * @desc Get all printer queue tokens (pending and printed)
 * @route GET /api/v1/printer/tokens
 */
export const getPrinterTokens = asyncHandler(async (req, res) => {
  const { status, search, startDate, endDate } = req.query;

  const whereClause = {};
  if (status) {
    whereClause.print_status = status.toUpperCase();
  }
  if (search) {
    const searchVal = search.trim();

    // Query matching application tokens first to support searching by enrollment_id or registration_number
    const apps = await prisma.application.findMany({
      where: {
        OR: [
          { enrollment_id: { contains: searchVal, mode: 'insensitive' } },
          { registration_number: { contains: searchVal, mode: 'insensitive' } }
        ]
      },
      select: { token_number: true }
    });
    const linkedTokenNumbers = apps.map(a => a.token_number);

    whereClause.OR = [
      { token_number: { contains: searchVal, mode: 'insensitive' } },
      { applicant_name: { contains: searchVal, mode: 'insensitive' } },
      { mobile_number: { contains: searchVal } }
    ];

    if (linkedTokenNumbers.length > 0) {
      whereClause.OR.push({
        token_number: { in: linkedTokenNumbers }
      });
    }
  }

  if (startDate || endDate) {
    whereClause.created_at = {};
    if (startDate) {
      whereClause.created_at.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      whereClause.created_at.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  const tokens = await prisma.printToken.findMany({
    where: whereClause,
    orderBy: { created_at: 'desc' }
  });

  return res.status(200).json(
    new ApiResponse(200, tokens, 'Printer tokens retrieved successfully')
  );
});

/**
 * @desc Collect cash offline fee for a printing token
 * @route POST /api/v1/printer/tokens/:tokenNumber/collect-cash
 */
export const collectCashFee = asyncHandler(async (req, res) => {
  const { tokenNumber } = req.params;
  const { paymentMode } = req.body; // 'ONLINE', 'OFFLINE_CASH', 'ALREADY_DEPOSITED'

  const selectedMode = paymentMode || 'OFFLINE_CASH';

  const printToken = await prisma.printToken.findUnique({
    where: { token_number: tokenNumber }
  });

  if (!printToken) {
    throw new ApiError(404, 'Print token not found');
  }

  if (printToken.fee_status !== 'PENDING') {
    throw new ApiError(400, 'Fee has already been collected or deposited');
  }

  // Update token fee status and Payment record atomically
  const updatedToken = await prisma.$transaction(async (tx) => {
    const token = await tx.printToken.update({
      where: { token_number: tokenNumber },
      data: {
        fee_status: selectedMode === 'ALREADY_DEPOSITED' ? 'ALREADY_DEPOSITED' : 'FULFILLED'
      }
    });

    let printRecord = await tx.certificatePrintRecord.findFirst({
      where: { token_number: tokenNumber }
    });

    if (!printRecord) {
      // Fallback matching logic for existing/seeded tokens without explicit token_number links
      printRecord = await tx.certificatePrintRecord.findFirst({
        where: {
          applicant_name: token.applicant_name,
          mobile_number: token.mobile_number,
          total_copies: token.total_copies
        }
      });
    }

    if (printRecord) {
      const payModeMap = {
        'ONLINE': 'ONLINE',
        'OFFLINE_CASH': 'CASH',
        'ALREADY_DEPOSITED': 'DEPOSITED'
      };
      await tx.payment.update({
        where: { payment_id: printRecord.payment_id },
        data: {
          payment_status: 'SUCCESS',
          payment_mode: payModeMap[selectedMode] || 'CASH',
          paid_at: getISTDate()
        }
      });
    }

    return token;
  }, {
    maxWait: 15000,
    timeout: 30000
  });

  // Log fee collection event
  await prisma.printerAuditLog.create({
    data: {
      admin_id: req.user.admin_id || req.user.id,
      action: 'FEE_COLLECTION',
      token_number: tokenNumber,
      details: `Collected/verified printing fee of Rs ${printToken.fee_amount} via ${selectedMode} for token ${tokenNumber} (Operator: ${req.user.full_name})`,
      created_at: getISTDate()
    }
  });

  logger.info(`💰 [PRINTER COUNTER]: Printing fee of Rs ${printToken.fee_amount} processed via ${selectedMode} for token ${tokenNumber} by Operator ${req.user.full_name}`);

  // Send simulated SMS
  logger.info(`[SMS] Sent to ${printToken.mobile_number}: Dear Citizen, payment of Rs ${printToken.fee_amount} for your printing token ${tokenNumber} was received via ${selectedMode}. Please present this token to the printer operator to collect your printed certificate. - Jaipur Municipal`);

  return res.status(200).json(
    new ApiResponse(200, updatedToken, 'Cash fee collected successfully')
  );
});

// Helper to retrieve certificate PDF bytes from Cloudinary URL or local file system
async function getCertificatePdfBytes(tokenNumber, isMock, filePath) {
  let pdfBytes = null;

  // 1. Try to check printToken's downloaded_file_name directly
  const printToken = await prisma.printToken.findUnique({
    where: { token_number: tokenNumber }
  });

  if (printToken && printToken.downloaded_file_name) {
    const fileUrl = printToken.downloaded_file_name;
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      try {
        logger.info(`🌐 [PRINTER]: Fetching certificate directly from print token Cloudinary URL: ${fileUrl}`);
        const response = await fetch(fileUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          pdfBytes = Buffer.from(arrayBuffer);
          return pdfBytes;
        }
      } catch (err) {
        logger.error(`⚠️ [PRINTER ERROR]: Failed to fetch Cloudinary URL from print token: ${err.message}`);
      }
    }
  }

  // 2. Try to query application for uploaded_certificate_url (e.g. Cloudinary link)
  const application = await prisma.application.findFirst({
    where: { token_number: tokenNumber }
  });

  if (application && application.downloaded_certificate_url) {
    const certUrl = application.downloaded_certificate_url;
    if (certUrl.startsWith('http://') || certUrl.startsWith('https://')) {
      try {
        logger.info(`🌐 [PRINTER]: Fetching certificate from Cloudinary URL: ${certUrl}`);
        const response = await fetch(certUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          pdfBytes = Buffer.from(arrayBuffer);
        } else {
          logger.error(`⚠️ [PRINTER ERROR]: Cloudinary URL fetch failed with status ${response.status}`);
        }
      } catch (fetchErr) {
        logger.error(`⚠️ [PRINTER ERROR]: Failed to fetch Cloudinary URL: ${fetchErr.message}`);
      }
    }
  }

  // Fallback to local disk file if not downloaded online
  if (!pdfBytes && !isMock && fs.existsSync(filePath)) {
    pdfBytes = fs.readFileSync(filePath);
  }

  return pdfBytes;
}

/**
 * @desc Process and execute certificate print
 * @route POST /api/v1/printer/tokens/:tokenNumber/print
 */
export const executePrinterPrint = asyncHandler(async (req, res) => {
  const { tokenNumber } = req.params;

  const printToken = await prisma.printToken.findUnique({
    where: { token_number: tokenNumber }
  });

  if (!printToken) {
    throw new ApiError(404, 'Print token not found');
  }

  if (printToken.fee_status === 'PENDING') {
    throw new ApiError(400, 'Cannot print: Fee payment is pending. Please collect fee first');
  }

  const filename = printToken.downloaded_file_name || '';
  const filePath = path.join(DOWNLOAD_DIR, filename);
  const isMock = !filename || filename.startsWith('mock_download_');

  let base64Pdf = null;

  try {
    let pdfBytes = await getCertificatePdfBytes(tokenNumber, isMock, filePath);
    if (!pdfBytes) {
      // High-fidelity fallback PDF for testing
      const mockBase64 = 'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLU31jBQsTAz1DMyAQsFcwVy/IL+gIL80LycxM1cvyM/M0y/ITM9MzklN1gNJmVnqmSmY1XIlOzlZGRkBAQC/XBO+CmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKODcKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1IDg0Ml0vUmVzb3VyY2VzPDwvRm9udDw8L0YxIDEgMCBSPj4+Pi9Db250ZW50cyAyIDAgUi9QYXJlbnQgNSAwIFI+PgplbmRvYmoKCjEgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCgo1IDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzQgMCBSXT4+CmVuZG9iagoKNiAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgNSAwIFI+PgplbmRvYmoKCjcgMCBvYmoKPDwvUHJvZHVjZXIoanNwZGYgMS41LjMgXChodHRwczovL2dpdGh1Yi5jb20vTXJSaW8vanNwZGZcKSkvQ3JlYXRpb25EYXRlKEQ6MjAyMTA5MTUwOTE3NTQrMDAnMDAnKT4+CmVuZG9iagoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMjQ5IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDE2OSAwMDAwMCBuIAowMDAwMDAwMTg5IDAwMDAwIG4gCjAwMDAwMDAzMzcgMDAwMDAgbiAKMDAwMDAwMDM5NCAwMDAwMCBuIAowMDAwMDAwNDQzIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA4L1Jvb3QgNiAwIFIvSW5mbyA3IDAgUi9JRCBbIDw5NDQ3NzM0MUIyRTdBRTlCNDRGRkJCNzlEMUQyRkZBQz4gPDk0NDc3MzQxQjJFN0FFOUI0NEZGQkI3OUQxRDJGRkFDPiBdPj4Kc3RhcnR4cmVmCjU3NQolJUVPRgo=';
      pdfBytes = Buffer.from(mockBase64, 'base64');
    }

    if (pdfBytes) {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const outputPdf = await PDFDocument.create();
      const copies = Math.max(1, printToken.total_copies || 1);

      for (let i = 0; i < copies; i++) {
        const copiedPages = await outputPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => {
          outputPdf.addPage(page);
        });
      }

      const outputBytes = await outputPdf.save();
      base64Pdf = Buffer.from(outputBytes).toString('base64');
    }
  } catch (pdfErr) {
    logger.error(`⚠️ [PRINTER COUNTER ERROR]: Failed to compile PDF for print: ${pdfErr.message}`);
    throw new ApiError(500, `Failed to load certificate file: ${pdfErr.message}`);
  }

  // Update print token status and CertificatePrintRecord atomically
  const updatedToken = await prisma.$transaction(async (tx) => {
    const token = await tx.printToken.update({
      where: { token_number: tokenNumber },
      data: {
        print_status: 'PRINTED',
        printed_at: getISTDate(),
        admin_id: req.user.admin_id
      }
    });

    let printRecord = await tx.certificatePrintRecord.findFirst({
      where: { token_number: tokenNumber }
    });

    if (!printRecord) {
      printRecord = await tx.certificatePrintRecord.findFirst({
        where: {
          applicant_name: token.applicant_name,
          mobile_number: token.mobile_number,
          total_copies: token.total_copies
        }
      });
    }

    if (printRecord) {
      await tx.certificatePrintRecord.update({
        where: { print_record_id: printRecord.print_record_id },
        data: {
          print_status: 'PRINTED',
          printed_at: getISTDate(),
          admin_id: req.user.admin_id
        }
      });
    }

    return token;
  }, {
    maxWait: 15000,
    timeout: 30000
  });

  // Log certificate print event
  await prisma.printerAuditLog.create({
    data: {
      admin_id: req.user.admin_id || req.user.id,
      action: 'PRINT_CERTIFICATE',
      token_number: tokenNumber,
      details: `Printed certificate for token ${tokenNumber} (Operator: ${req.user.full_name})`,
      created_at: getISTDate()
    }
  });

  logger.info(`🖨️ [PRINTER COUNTER]: Spooled and printed token ${tokenNumber} successfully (Operator: ${req.user.full_name})`);

  return res.status(200).json(
    new ApiResponse(200, { token: updatedToken, base64Pdf }, 'Certificate printed successfully')
  );
});

/**
 * @desc Get certificate PDF binary file for opening in Adobe Reader
 * @route GET /api/v1/printer/tokens/:tokenNumber/pdf
 */
export const getPrinterTokenPdf = asyncHandler(async (req, res) => {
  const { tokenNumber } = req.params;

  const printToken = await prisma.printToken.findUnique({
    where: { token_number: tokenNumber }
  });

  if (!printToken) {
    throw new ApiError(404, 'Print token not found');
  }

  const filename = printToken.downloaded_file_name || '';
  const filePath = path.join(DOWNLOAD_DIR, filename);
  const isMock = !filename || filename.startsWith('mock_download_');

  let pdfBytes = null;

  try {
    pdfBytes = await getCertificatePdfBytes(tokenNumber, isMock, filePath);
    if (!pdfBytes) {
      // High-fidelity fallback PDF for testing
      const mockBase64 = 'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLU31jBQsTAz1DMyAQsFcwVy/IL+gIL80LycxM1cvyM/M0y/ITM9MzklN1gNJmVnqmSmY1XIlOzlZGRkBAQC/XBO+CmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKODcKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1IDg0Ml0vUmVzb3VyY2VzPDwvRm9udDw8L0YxIDEgMCBSPj4+Pi9Db250ZW50cyAyIDAgUi9QYXJlbnQgNSAwIFI+PgplbmRvYmoKCjEgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCgo1IDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzQgMCBSXT4+CmVuZG9iagoKNiAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgNSAwIFI+PgplbmRvYmoKCjcgMCBvYmoKPDwvUHJvZHVjZXIoanNwZGYgMS41LjMgXChodHRwczovL2dpdGh1Yi5jb20vTXJSaW8vanNwZGZcKSkvQ3JlYXRpb25EYXRlKEQ6MjAyMTA5MTUwOTE3NTQrMDAnMDAnKT4+CmVuZG9iagoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMjQ5IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDE2OSAwMDAwMCBuIAowMDAwMDAwMTg5IDAwMDAwIG4gCjAwMDAwMDAzMzcgMDAwMDAgbiAKMDAwMDAwMDM5NCAwMDAwMCBuIAowMDAwMDAwNDQzIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA4L1Jvb3QgNiAwIFIvSW5mbyA3IDAgUi9JRCBbIDw5NDQ3NzM0MUIyRTdBRTlCNDRGRkJCNzlEMUQyRkZBQz4gPDk0NDc3MzQxQjJFN0FFOUI0NEZGQkI3OUQxRDJGRkFDPiBdPj4Kc3RhcnR4cmVmCjU3NQolJUVPRgo=';
      pdfBytes = Buffer.from(mockBase64, 'base64');
    }

    if (pdfBytes) {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const outputPdf = await PDFDocument.create();
      const copies = Math.max(1, printToken.total_copies || 1);

      for (let i = 0; i < copies; i++) {
        const copiedPages = await outputPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => {
          outputPdf.addPage(page);
        });
      }

      const outputBytes = await outputPdf.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${printToken.token_number}_certificate.pdf"`);
      return res.status(200).send(Buffer.from(outputBytes));
    } else {
      throw new ApiError(500, 'Failed to compile certificate PDF bytes.');
    }
  } catch (pdfErr) {
    logger.error(`⚠️ [PRINTER PDF ERROR]: Failed to stream PDF: ${pdfErr.message}`);
    throw new ApiError(500, `Failed to stream certificate file: ${pdfErr.message}`);
  }
});
