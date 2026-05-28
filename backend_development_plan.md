# 🏗️ Nagar Nigam Kiosk System V2.0 - Backend Development Plan

This document serves as the complete engineering blueprint for developing the database schemas, API routes, WebSocket layers, and peripheral printing services to seamlessly connect with the frontend Version 2.0 architecture.

---

## 💾 1. Database Schema Design (Prisma ORM & PostgreSQL)

The database should support active token queuing, multi-step application tracking, selfie records, uploaded documents, payment logs, and registrar approvals.

```prisma
// datasource db {
//   provider = "postgresql"
//   url      = env("DATABASE_URL")
// }

/// 🎫 Token Queue Management for Phase 1 (Kiosk) and Phase 2 (Counter)
model Token {
  id          String      @id @default(uuid())
  tokenNumber String      @unique // e.g., TKN-BIR-CORR-1002
  block       BlockType   // BIRTH, DEATH, MARRIAGE
  serviceType ServiceType // CORRECTION, NEW_REGISTRATION
  status      TokenStatus @default(WAITING)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  // Relations
  application Application?
}

/// 📝 Municipal Application Records for Counter Operations
model Application {
  id                 String            @id @default(uuid())
  enrollmentId       String            @unique // e.g., ENR-982103
  tokenNumber        String            @unique
  departmentBlock    BlockType
  serviceType        ServiceType
  applicantName      String
  mobileNumber       String
  registrationNumber String            // Base registration ID or "NEW-REGISTRATION"
  fatherName         String?
  motherName         String?
  dob                DateTime?
  selfieUrl          String            // Path to stored webcam snapshot
  correctionType     CorrectionType    // MINOR, MAJOR, NEW_REGISTRATION
  correctionFields   Json?             // Array of [{ fieldName: string, oldValue: string, newValue: string }]
  uploadedDocuments  Json              // Array of scanned PDF file URLs
  paymentStatus      PaymentStatus     @default(SUCCESS)
  paymentMethod      PaymentMethod     @default(CASH)
  paymentAmount      Decimal           @default(20.00) @db.Decimal(10, 2)
  transactionId      String            @unique
  registrarStatus    RegistrarStatus   @default(PENDING_APPROVAL)
  submittedAt        DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  // Relations
  token              Token             @relation(fields: [tokenNumber], references: [tokenNumber], onDelete: Cascade)
}

enum BlockType {
  BIRTH
  DEATH
  MARRIAGE
}

enum ServiceType {
  CORRECTION
  NEW_REGISTRATION
}

enum TokenStatus {
  WAITING
  SERVING
  COMPLETED
  NO_SHOW
}

enum CorrectionType {
  MINOR
  MAJOR
  NEW_REGISTRATION
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
}

enum PaymentMethod {
  CASH
  UPI_QR
}

enum RegistrarStatus {
  PENDING_APPROVAL
  APPROVED
  OBJECTION
}
```

---

## 📡 2. REST API Endpoints Specifications

All API routes must reside under `/api/v1` and handle validation schemas dynamically.

### 📱 A. Citizen Kiosk Endpoints (Phase 1)

#### 1. Generate Counter Token
- **Endpoint**: `POST /api/v1/tokens/generate`
- **Request Body**:
  ```json
  {
    "block": "BIRTH",
    "serviceType": "CORRECTION"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "token": {
      "tokenNumber": "TKN-BIR-CORR-1002",
      "block": "BIRTH",
      "serviceType": "CORRECTION",
      "status": "WAITING",
      "createdAt": "2026-05-27T08:29:45Z"
    }
  }
  ```

---

### 🔒 B. Counter Admin Endpoints (Phase 2)

#### 1. Fetch Waiting Queue
- **Endpoint**: `GET /api/v1/tokens/queue`
- **Response**: `200 OK`
  ```json
  {
    "currentServing": "TKN-BIR-CORR-1001",
    "waitingQueue": ["TKN-BIR-CORR-1002", "TKN-DEA-REG-1003"]
  }
  ```

#### 2. Call Next Waiting Token
- **Endpoint**: `POST /api/v1/tokens/call-next`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "calledToken": "TKN-BIR-CORR-1002"
  }
  ```

#### 3. Upload Snapshot/Selfie
- **Endpoint**: `POST /api/v1/applications/upload-selfie`
- **Request**: Multipart Form Data (contains raw binary canvas image blob)
- **Response**: `200 OK`
  ```json
  {
    "selfieUrl": "/uploads/selfies/selfie_1716912389.png"
  }
  ```

#### 4. Upload Scanned Document PDF
- **Endpoint**: `POST /api/v1/applications/upload-document`
- **Request**: Multipart Form (contains PDF stream from physical scanner)
- **Response**: `200 OK`
  ```json
  {
    "fileName": "Aadhaar_Card_Scanned_8912.pdf",
    "fileUrl": "/uploads/documents/Aadhaar_Card_Scanned_8912.pdf"
  }
  ```

#### 5. Submit Completed Application
- **Endpoint**: `POST /api/v1/applications/submit`
- **Request Body**: (Full payload matching Prisma Application model)
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "application": {
      "enrollmentId": "ENR-982103",
      "tokenNumber": "TKN-BIR-CORR-1002",
      "registrarStatus": "PENDING_APPROVAL"
    }
  }
  ```

#### 6. Registrar Approval Status Update (SMS Trigger Hook)
- **Endpoint**: `PUT /api/v1/applications/status/:enrollmentId`
- **Request Body**:
  ```json
  {
    "status": "APPROVED" // or OBJECTION
  }
  ```
- **Response**: `200 OK`
  > [!TIP]
  > This action triggers an automated SMS callback to the applicant's mobile number informing them: *"Your application ENR-982103 has been APPROVED. You may collect your certificate from the kiosk. - Nagar Nigam"*

---

## ⚡ 3. Real-Time WebSockets Architecture (Socket.io)

WebSockets manage real-time Kiosk-to-Counter state synchronizations.

| Event Name | Sender | Payload | Description |
| :--- | :--- | :--- | :--- |
| `tokenGenerated` | Kiosk Client | `{ tokenNumber }` | Alerts admin queue manager of a newly issued kiosk ticket. |
| `fetchQueue` | Admin Portal | `null` | Emitted on dashboard load to initialize server queue lists. |
| `queueUpdated` | Node Server | `{ queue, current }` | Broadcasts active queue and serving token status to all terminals. |
| `callNext` | Admin Portal | `null` | Shifts the waiting queue array and spools the next token. |
| `playAnnouncement` | Node Server | tokenNumber | Fires text-to-speech speaker announcements across municipal dashboards. |

---

## 🖨️ 4. Thermal Printer & PDF Spool Service Hooks

For production physical integrations, the backend should connect to system printer spools using specialized native libraries.

1. **80mm Thermal Receipt Spooling**:
   - Utilize a library like `node-thermal-printer` with `ESC/POS` protocols over USB/Network.
   - Spool clean text formats directly on `Token` generation, avoiding heavy PDF rendering on thermal rolls.
2. **A4 Enrollment Slip Generation**:
   - Implement `pdfkit` or `puppeteer` to render the enrollment slip dynamically from an HTML template.
   - Inject the barcode image (generated via `bwip-js`) and verified signature buffers before sending to standard printer spools.
