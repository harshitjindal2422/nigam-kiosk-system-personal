import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generate() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 850]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text, x, y, size = 11, isBold = false) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: isBold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  // Draw Title
  drawText('NAGAR NIGAM KIOSK SYSTEM', 50, 800, 18, true);
  drawText('Default Development Credentials', 50, 780, 12, false);

  // Draw horizontal line
  page.drawLine({
    start: { x: 50, y: 765 },
    end: { x: 550, y: 765 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  const credentials = [
    { role: 'Super Admin', email: 'superadmin@nagarnigam.gov.in', password: 'SuperAdmin@123' },
    { role: 'Kiosk Admin', email: 'admin@nagarnigam.gov.in', password: 'Admin@123' },
    { role: 'Counter Operator (Suresh)', email: 'suresh@nagarnigam.gov.in', password: 'Operator@123' },
    { role: 'Counter Operator (Anjali)', email: 'anjali@nagarnigam.gov.in', password: 'Operator@123' },
    { role: 'Counter Operator (Vikram)', email: 'vikram@nagarnigam.gov.in', password: 'Operator@123' },
    { role: 'Marriage Operator', email: 'marriage@nagarnigam.gov.in', password: 'Operator@123' },
    { role: 'Checker Operator', email: 'checker@nagarnigam.gov.in', password: 'Checker@123' },
    { role: 'Approval Operator', email: 'approval@nagarnigam.gov.in', password: 'Approval@123' },
    { role: 'Cashier Operator', email: 'cashier@nagarnigam.gov.in', password: 'Cashier@123' },
    { role: 'Printer Operator', email: 'printer@nagarnigam.gov.in', password: 'Printer@123' },
  ];

  // Draw headers
  let y = 735;
  drawText('Role', 55, y, 11, true);
  drawText('Email / Login ID', 220, y, 11, true);
  drawText('Password', 450, y, 11, true);

  // Draw header line
  page.drawLine({
    start: { x: 50, y: y - 8 },
    end: { x: 550, y: y - 8 },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  });

  y -= 25;

  for (const cred of credentials) {
    drawText(cred.role, 55, y, 10, false);
    drawText(cred.email, 220, y, 10, false);
    drawText(cred.password, 450, y, 10, false);
    
    // Draw row separator line
    page.drawLine({
      start: { x: 50, y: y - 8 },
      end: { x: 550, y: y - 8 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
    y -= 30;
  }

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  const outputPath = path.resolve('temp/credentials.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`PDF created successfully at: ${outputPath}`);
}

generate().catch(console.error);
