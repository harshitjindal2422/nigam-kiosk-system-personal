import { prisma } from '../config/db.js';

export default class PrintRepository {
  /**
   * Atomic database transaction to log payment and certificate print records
   */
  static async createPrintRecord(data) {
    const {
      applicantName,
      mobileNumber,
      registrationNumber,
      certificateType,
      totalCopies,
      downloadedFileName,
      amount,
      transactionId,
      paymentStatus,
      adminId
    } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Create or Update standard UPI payment log (upsert to handle webhook pre-creation)
      const payment = await tx.payment.upsert({
        where: { transaction_id: transactionId },
        update: {
          registration_number: registrationNumber,
          amount: amount,
          payment_status: paymentStatus,
          paid_at: paymentStatus === 'SUCCESS' ? new Date() : null,
        },
        create: {
          registration_number: registrationNumber,
          amount: amount,
          payment_mode: 'UPI',
          transaction_id: transactionId,
          payment_status: paymentStatus,
          paid_at: paymentStatus === 'SUCCESS' ? new Date() : null,
        },
      });

      // 2. Create municipal certificate print tracking log linked to payment
      const printRecord = await tx.certificatePrintRecord.create({
        data: {
          payment_id: payment.payment_id,
          admin_id: adminId || null,
          applicant_name: applicantName,
          mobile_number: mobileNumber,
          registration_number: registrationNumber,
          certificate_type: certificateType,
          total_copies: parseInt(totalCopies, 10) || 1,
          downloaded_file_name: downloadedFileName,
        },
      });

      return { payment, printRecord };
    });
  }
}
