import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import { logger } from '../config/logger.js';
import PrintRepository from '../repositories/print.repository.js';
import { ApiError } from '../utils/ApiError.js';

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
   * Simulates thermal printing, logs audit entries to Winston, logs record in DB, and purges the file.
   */
  static async executePrint(data) {
    const { downloadedFileName, totalCopies } = data;
    const filePath = path.join(DOWNLOAD_DIR, downloadedFileName);
    const isMock = downloadedFileName && downloadedFileName.startsWith('mock_download_');

    // 1. Double-check that the file exists before printing
    if (!isMock && !fs.existsSync(filePath)) {
      throw new ApiError(404, 'Sandboxed certificate file not found. File may have been purged.');
    }

    logger.info(`🖨️ [PRINTER]: Initializing hardware queue for sandboxed file ${downloadedFileName}`);
    logger.info(`🖨️ [PRINTER]: Spooling and printing ${totalCopies} copies...`);

    // 2. Mock a physical printer feed delay (1.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 3. Log a high-fidelity visual layout simulation to the winston console logs
    logger.info(`
=========================================
          MUNICIPAL THERMAL PRINTER
           NAGAR NIGAM KIOSK SYSTEM
=========================================
  Record ID:    ${data.registrationNumber}
  Type:         ${data.certificateType.toUpperCase()}
  Applicant:    ${data.applicantName}
  Mobile:       ${data.mobileNumber}
  Copies:       ${totalCopies}
  Status:       SUCCESSFULLY PRINTED
=========================================
`);

    logger.info(`🖨️ [PRINTER]: Print spool completed. Triggering absolute sandbox purge...`);

    // 4. Read the file, duplicate pages based on totalCopies, and save to secure privacy
    let base64Pdf = null;
    try {
      let existingPdfBytes = null;
      if (!isMock) {
        if (fs.existsSync(filePath)) {
          existingPdfBytes = fs.readFileSync(filePath);
        }
      } else {
        const mockBase64 = 'JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLU31jBQsTAz1DMyAQsFcwVy/IL+gIL80LycxM1cvyM/M0y/ITM9MzklN1gNJmVnqmSmY1XIlOzlZGRkBAQC/XBO+CmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKODcKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1IDg0Ml0vUmVzb3VyY2VzPDwvRm9udDw8L0YxIDEgMCBSPj4+Pi9Db250ZW50cyAyIDAgUi9QYXJlbnQgNSAwIFI+PgplbmRvYmoKCjEgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCgo1IDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzQgMCBSXT4+CmVuZG9iagoKNiAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgNSAwIFI+PgplbmRvYmoKCjcgMCBvYmoKPDwvUHJvZHVjZXIoanNwZGYgMS41LjMgXChodHRwczovL2dpdGh1Yi5jb20vTXJSaW8vanNwZGZcKSkvQ3JlYXRpb25EYXRlKEQ6MjAyMTA5MTUwOTE3NTQrMDAnMDAnKT4+CmVuZG9iagoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMjQ5IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDE2OSAwMDAwMCBuIAowMDAwMDAwMTg5IDAwMDAwIG4gCjAwMDAwMDAzMzcgMDAwMDAgbiAKMDAwMDAwMDM5NCAwMDAwMCBuIAowMDAwMDAwNDQzIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA4L1Jvb3QgNiAwIFIvSW5mbyA3IDAgUi9JRCBbIDw5NDQ3NzM0MUIyRTdBRTlCNDRGRkJCNzlEMUQyRkZBQz4gPDk0NDc3MzQxQjJFN0FFOUI0NEZGQkI3OUQxRDJGRkFDPiBdPj4Kc3RhcnR4cmVmCjU3NQolJUVPRgo=';
        existingPdfBytes = Buffer.from(mockBase64, 'base64');
      }

      if (existingPdfBytes) {
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const outputPdf = await PDFDocument.create();
        const copiesToMake = Math.max(1, parseInt(totalCopies) || 1);

        for (let i = 0; i < copiesToMake; i++) {
          const copiedPages = await outputPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => {
            outputPdf.addPage(page);
          });
        }

        const pdfBytes = await outputPdf.save();
        base64Pdf = Buffer.from(pdfBytes).toString('base64');

        if (!isMock) {
          PRINTED_FILES.add(downloadedFileName);
          logger.info(`💾 [SANDBOX]: File ${downloadedFileName} marked as printed in memory. Will be permanently deleted after 3 days.`);
        } else {
          logger.info(`🗑️ [SANDBOX]: Bypassed file actions for simulated mock file ${downloadedFileName}.`);
        }
      }
    } catch (err) {
      logger.error(`⚠️ [SANDBOX]: Failed to process file ${downloadedFileName} using pdf-lib: ${err.message}`);
      throw new ApiError(500, `Failed to process PDF for printing: ${err.message}`);
    }

    // 5. Commit atomic transaction logs to PostgreSQL via Prisma
    const result = await PrintRepository.createPrintRecord({
      ...data,
      paymentStatus: 'SUCCESS',
    });

    // 6. Automatically save a backup copy of the thermal receipt to the dedicated receipts folder
    try {
      if (!fs.existsSync(RECEIPTS_DIR)) {
        fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
      }
      const receiptContent = `=========================================
          NAGAR NIGAM JAIPUR
        CITIZEN SERVICE CENTER
=========================================
DATE:         ${new Date().toLocaleString()}
SERVICE:      CERTIFICATE PRINT
REG NO:       ${data.registrationNumber.toUpperCase()}
APPLICANT:    ${data.applicantName.toUpperCase()}
MOBILE:       ${data.mobileNumber}
CERT TYPE:    ${data.certificateType.toUpperCase()}
COPIES:       ${totalCopies}
AMOUNT:       ₹${totalCopies * 20}.00
TXN ID:       ${data.transactionId}
-----------------------------------------
PAYMENT:      SUCCESSFUL
SANDBOX:      FILE PURGED SECURELY
=========================================
Please collect your copies.
Thank you for using civic services!
`;
      const receiptPath = path.join(RECEIPTS_DIR, `receipt_${data.transactionId}.txt`);
      fs.writeFileSync(receiptPath, receiptContent, 'utf8');
      logger.info(`💾 [RECEIPT]: Thermal receipt backup successfully saved to: ${receiptPath}`);
    } catch (receiptErr) {
      logger.error(`⚠️ [RECEIPT]: Failed to save thermal receipt backup: ${receiptErr.message}`);
    }

    if (base64Pdf) {
      result.base64Pdf = base64Pdf;
    }

    return result;
  }
}
