import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import { logger } from '../config/logger.js';
import PrintRepository from '../repositories/print.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { prisma } from '../config/db.js';
import { generateUniversalToken } from '../utils/tokenGenerator.js';
import { getISTDate } from '../utils/dateHelper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOAD_DIR = path.resolve(__dirname, '../../temp/downloads');
const RECEIPTS_DIR = path.resolve(__dirname, '../../temp/receipts');

// Keep track of already printed sandboxed files to prevent double-detection
const PRINTED_FILES = new Set();

export default class PrintService {
  /**
   * Scans the temp/downloads sandboxed directory for the latest downloaded PDF.
   * Matches files created or modified within the last 60 seconds (1 minute).
   */
  static async detectDownload() {
    // 1. Ensure sandboxed download folder exists
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    }

    // 2. Read contents of sandboxed directory
    const files = fs.readdirSync(DOWNLOAD_DIR);
    const pdfFiles = files.filter((f) => f.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      return null;
    }

    // 3. Resolve the latest modified PDF based on timestamp (skipping already printed files)
    let latestFile = null;
    let latestTime = 0;

    for (const file of pdfFiles) {
      if (PRINTED_FILES.has(file)) continue;

      const filePath = path.join(DOWNLOAD_DIR, file);
      const stat = fs.statSync(filePath);

      if (stat.mtimeMs > latestTime) {
        latestTime = stat.mtimeMs;
        latestFile = file;
      }
    }

    if (!latestFile) return null;

    // 4. Validate that the file is fresh (modified within the last 60 seconds / 1 minute)
    const now = Date.now();
    const ageSeconds = (now - latestTime) / 1000;

    if (ageSeconds > 60) {
      logger.error(`⏳ [SANDBOX ERROR]: Found latest file ${latestFile} but age is stale (${Math.round(ageSeconds)}s ago).`);
      return null;
    }

    logger.info(`✨ [SANDBOX]: Active fresh file detected: ${latestFile} (${Math.round(ageSeconds)}s old)`);
    
    return {
      fileName: latestFile,
      ageSeconds: Math.round(ageSeconds),
      sizeBytes: fs.statSync(path.join(DOWNLOAD_DIR, latestFile)).size,
    };
  }

  /**
   * Generates a Print Token queue record, links it to payment, and saves it in database.
   */
  static async executePrint(data) {
    const { 
      applicantName, 
      mobileNumber, 
      registrationNumber, 
      certificateType, 
      totalCopies, 
      downloadedFileName, 
      amount, 
      transactionId,
      paymentMode
    } = data;

    const isOffline = paymentMode === 'OFFLINE';

    // 1. Generate Universal Print Token number
    const tokenNumber = await generateUniversalToken(certificateType, 'PRI');

    // 2. Perform atomic database operations
    const result = await prisma.$transaction(async (tx) => {
      // 2a. Upsert payment record
      const payment = await tx.payment.upsert({
        where: { transaction_id: transactionId },
        update: {
          registration_number: registrationNumber,
          amount,
          payment_status: isOffline ? 'PENDING' : 'SUCCESS',
          payment_mode: isOffline ? 'CASH' : 'UPI',
          paid_at: isOffline ? null : getISTDate()
        },
        create: {
          registration_number: registrationNumber,
          amount,
          payment_mode: isOffline ? 'CASH' : 'UPI',
          transaction_id: transactionId,
          payment_status: isOffline ? 'PENDING' : 'SUCCESS',
          paid_at: isOffline ? null : getISTDate()
        }
      });

      // 2b. Create PrintToken queue record
      const printToken = await tx.printToken.create({
        data: {
          token_number: tokenNumber,
          applicant_name: applicantName,
          mobile_number: mobileNumber,
          certificate_type: certificateType.toUpperCase(),
          service_type: 'PRI',
          total_copies: parseInt(totalCopies) || 1,
          downloaded_file_name: downloadedFileName,
          fee_status: isOffline ? 'PENDING' : 'FULFILLED',
          fee_amount: amount,
          print_status: 'PENDING',
          created_at: getISTDate()
        }
      });

      // 2c. Create a standard CertificatePrintRecord for legacy tracking
      await tx.certificatePrintRecord.create({
        data: {
          payment_id: payment.payment_id,
          applicant_name: applicantName,
          mobile_number: mobileNumber,
          registration_number: registrationNumber,
          certificate_type: certificateType.toUpperCase(),
          total_copies: parseInt(totalCopies) || 1,
          downloaded_file_name: downloadedFileName || 'certificate.pdf',
          token_number: tokenNumber,
          downloaded_at: getISTDate(),
          print_status: 'PENDING',
          printed_at: null
        }
      });

      return { printToken, payment };
    });

    logger.info(`✨ [KIOSK PRINT QUEUE]: Generated Print Token ${tokenNumber} (Fee Status: ${result.printToken.fee_status})`);

    // 3. Automatically save a backup copy of the thermal receipt
    try {
      if (!fs.existsSync(RECEIPTS_DIR)) {
        fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
      }
      const receiptContent = `=========================================
          NAGAR NIGAM JAIPUR
        CITIZEN SERVICE CENTER
=========================================
DATE:         ${new Date().toLocaleString()}
TOKEN NO:     ${tokenNumber}
SERVICE:      CERTIFICATE PRINT
REG NO:       ${registrationNumber.toUpperCase()}
APPLICANT:    ${applicantName.toUpperCase()}
MOBILE:       ${mobileNumber}
CERT TYPE:    ${certificateType.toUpperCase()}
COPIES:       ${totalCopies}
AMOUNT:       ₹${amount}.00
TXN ID:       ${transactionId}
-----------------------------------------
PAYMENT:      ${isOffline ? 'OFFLINE (PENDING)' : 'SUCCESSFUL'}
FEE STATUS:   ${result.printToken.fee_status}
=========================================
Please take this token receipt to the Printing Counter to collect your certificate.
Thank you for using civic services!
`;
      const receiptPath = path.join(RECEIPTS_DIR, `receipt_${transactionId}.txt`);
      fs.writeFileSync(receiptPath, receiptContent, 'utf8');
      logger.info(`💾 [RECEIPT]: Thermal receipt backup successfully saved to: ${receiptPath}`);
    } catch (receiptErr) {
      logger.error(`⚠️ [RECEIPT]: Failed to save thermal receipt backup: ${receiptErr.message}`);
    }

    return {
      tokenNumber: result.printToken.token_number,
      applicantName: applicantName,
      mobileNumber: mobileNumber,
      registrationNumber: registrationNumber,
      certificateType: certificateType,
      totalCopies: totalCopies,
      amount: amount,
      transactionId: transactionId,
      feeStatus: result.printToken.fee_status,
      base64Pdf: null // Ensure direct kiosk printing is disabled
    };
  }
}

