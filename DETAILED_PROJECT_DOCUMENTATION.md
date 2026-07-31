# Software Project Documentation: Nagar Nigam Citizen Service Kiosk System

This document provides a comprehensive, reverse-engineered technical and business specification of the **Nagar Nigam Citizen Service Kiosk System**.

---

## 1. Project Introduction

### Project Name
* **Nagar Nigam Citizen Service Kiosk System** (Jaipur Municipal Corporation Terminal)

### Purpose
The Nagar Nigam Citizen Service Kiosk System is a secure, touch-screen municipal terminal deployed at civic centers. It enables citizens to perform self-service document operations—such as downloading, printing, searching, and requesting corrections for vital records (Birth, Death, and Marriage certificates)—without direct clerk interaction at the initial stage. It also provides a structured queue-management and verification workflow for municipal operators (Counter, Checker, Approval, and Printer operators) to review, validate, approve, and print certificates.

### Description
The system consists of two primary interfaces:
1. **Citizen Touch-screen Kiosk Application**: A high-contrast, accessible touch interface designed for the general public, featuring bilingual voice assistance, text scaling, an auto-reset inactivity timer, and integrated UPI payment options.
2. **Municipal Back-office Operator Portal**: A role-based administrative dashboard used by various municipal employees to manage queue tokens, capture biometric photographs, trigger physical scanners to upload supporting documents, run translation/transliteration utilities, verify certificate authenticity, apply Digital Signatures (DSC), and print certificates.

### Objectives
* **Citizen Self-Service**: Reduce desk congestion at municipal offices by allowing self-directed certificate printing and correction requests.
* **Bilingual Accessibility**: Address visual, motor, or literacy barriers using bilingual (Hindi/English) Text-to-Speech (TTS), text scaling, and high-contrast styling.
* **Structured Verification (RBAC)**: Ensure high-security and division of labor through a strict multi-tier verification process (Counter Operator -> Checker Operator -> Approval Operator -> Printer Operator).
* **Automated Device Integration**: Provide hardware hooks for Windows Image Acquisition (WIA) physical scanners and virtual thermal receipt printers.
* **Data Privacy and Cleansing**: Cleanse user data automatically between kiosk sessions using a strict 120-second inactivity timer that forces a browser hard reset.

### Business Use Case
Municipal offices face massive daily queues of citizens seeking certificates or name/date corrections. This system automates the entry points. A citizen selects a service, pays the municipal fee via a UPI QR code, and receives a physical thermal token. Back-office operators process the token through a digital queue, scan documents, verify fields, apply digital signatures, and forward the print job back to the printing desk, ensuring zero paperwork leakages and complete transaction transparency.

### Target Users
* **Kiosk Citizens**: Visual or motor-impaired users, illiterate citizens, or general municipal applicants.
* **Counter Operators**: Desk clerks who verify applicant identities, capture webcam selfies, run transliterations, scan physical evidence, and submit requests.
* **Checker Operators**: Intermediate officers who verify submitted documents against registry details and flag objections or approve changes.
* **Approval Operators**: Senior municipal authorities who apply Digital Signature Certificates (DSC) and finalize approvals.
* **Printer Operators**: Clerks who collect cash payments (if unpaid at kiosk) and execute physical thermal prints of signed certificates.
* **Super Admins**: Administrative heads who manage operator profiles, monitor metrics, view live logs, and audit database tables.

---

## 2. Project Overview

The lifecycle of operations spans across the Citizen Kiosk and the Back-Office Operator desks:

```mermaid
flowchart TD
    %% Citizen Kiosk Flow
    subgraph Kiosk ["1. Citizen Kiosk Session"]
        Start([Start Screen]) --> Lang[Select Language & Enable Voice Assist]
        Lang --> Home[Home Screen: Birth / Death / Marriage Blocks]
        
        Home --> PrintB[Print Certificate Block]
        PrintB --> FetchCert[Redirect to Pehchan Portal to download PDF]
        FetchCert --> UploadSandbox[Detect fresh PDF download in Kiosk temp folder]
        UploadSandbox --> PayPrint[Scan QR & Pay ₹20 via UPI]
        PayPrint --> SpoolQueue[Generate Print Token & Print Receipt]
        
        Home --> CorrB[Correction Block]
        CorrB --> FormDetails[Enter Registration No, Mobile, Applicant Name]
        FormDetails --> SelectFields[Select Correction Fields Name/Date/Address]
        SelectFields --> PayCorr[Scan QR & Pay ₹20 via UPI]
        PayCorr --> GenToken[Generate Counter Token & Print Receipt]
    end

    %% Back-office Operator Queue Workflow
    subgraph BackOffice ["2. Back-Office Desk Verification Workflow"]
        GenToken --> CounterQueue[(Active Token Queue)]
        
        CounterQueue --> CounterOperator[Counter Operations Desk]
        CounterOperator --> CaptureSelfie[Take Applicant Web Cam Photo]
        CaptureSelfie --> PhysicalScan[Scan Supporting Documents via WIA interface]
        PhysicalScan --> SubmitApp[Submit Application - moves to PENDING_CHECKER]
        
        SubmitApp --> CheckerOperator[Checker Operations Desk]
        CheckerOperator --> DocReview{Validate Documents & Fields}
        DocReview -- "Flag Issue" --> Objection[Set status to OBJECTION -> Sends SMS Alert]
        DocReview -- "Details Verified" --> Approved[Set status to APPROVED]
        
        Objection --> CitizenRectify[Citizen returns to Counter with missing documents]
        CitizenRectify --> SubmitApp
        
        Approved --> ApprovalOperator[Approval Desk - DSC Signature]
        ApprovalOperator --> UploadCert[Upload signed certificate PDF]
        UploadCert --> ReviewDone{Sign off / DSC done}
        ReviewDone -- "Issue Found" --> Revert[Revert to Checker Desk]
        ReviewDone -- "Approved" --> Done[Set status to DONE - auto-adds to Printer Queue]
        
        Revert --> CheckerOperator
        
        SpoolQueue --> PrinterQueue[(Printer Spool Queue)]
        Done --> PrinterQueue
        
        PrinterQueue --> PrinterOperator[Printer Operations Desk]
        PrinterOperator --> CollectCash{Verify Payment Status}
        CollectCash -- "Cash/Unpaid" --> CashPayment[Collect ₹20 Cash & mark FULFILLED]
        CollectCash -- "Paid" --> StreamPDF[Stream PDF Bytes & Print Certificate]
    end

    DB[(PostgreSQL Database)] <---> Kiosk
    DB <---> BackOffice
```

1. **Initiation**: The citizen starts a session at the Kiosk. They toggle accessibility settings (large text, high contrast, text-to-speech) and choose their language (Hindi/English).
2. **Operations**:
   * **Direct Printing**: If they only need to print an existing certificate, they are redirected to the *Pehchan Portal* to download it. Once downloaded into the kiosk's sandboxed directory, the kiosk validates the PDF, prompts for a UPI payment, and creates a printer token.
   * **Correction Request**: If they need a correction, they choose the fields (Name, DOB, or Address), complete a UPI payment of ₹20, and get a physical queue ticket (e.g., `TKN-BIR-CORR-0307-001`).
3. **Counter Processing**: The citizen moves to the Counter Operator desk. The operator calls their token. The operator captures the citizen's live photo via webcam, triggers the physical scanner (via WIA PowerShell integration) to upload certificates, translates phonetic inputs (English to Hindi), and submits a structured application.
4. **Verification**: The Checker Operator pulls the application from their queue and reviews the uploaded proof. If incorrect, they flag an `OBJECTION` (which triggers a simulated SMS to the citizen). If correct, they approve it.
5. **DSC Sign-off**: The Approval Operator reviews approved applications, uploads the digitally signed PDF, and signs off (`DONE`). This automatically routes the certificate to the universal Print Operator queue.
6. **Delivery**: The Printer Operator calls the print token. If unpaid, they accept cash. They trigger the print job, compiling the PDF to match the copy count, and hand it to the citizen.

---

## 3. Complete Technology Stack

| Technology Category | Technology / Framework Used | Purpose & Why It Is Used | Where It Is Used |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React (Vite)** | Used for building a highly reactive, component-driven single-page application (SPA). Vite is utilized for ultra-fast build compilation and Hot Module Replacement (HMR). | Deployed across the entire client directory (`/client`). |
| **Backend Framework** | **Node.js (Express)** | Lightweight, async-driven REST API server running ES Modules. Handles high throughput and heavy file transfers. | Deployed across the entire server directory (`/server`). |
| **Database** | **PostgreSQL** | Relational, robust ACID-compliant database to handle transactional data, payment logs, and application workflows safely. | Primary data persistence layer configured in `.env`. |
| **ORM** | **Prisma ORM** | Provides type-safe database queries, auto-migration generation, and easy transaction handling using relation mappings. | Configured under `/server/prisma` and utilized by all controllers. |
| **Authentication** | **JWT (jsonwebtoken)** | Custom stateless JSON Web Token generation with a 12-hour expiry window for secure operator sessions. | Created in `/server/src/services/auth.service.js` and verified via middleware. |
| **State Management** | **Zustand** | Extremely lightweight, boilerplate-free state manager. Used for global state tracking without massive React re-renders. | Monitored in `/client/src/store/authStore.js` and `/client/src/store/kioskStore.js`. |
| **UI Library** | **Lucide React** | Premium, clean vector-based icon set matching modern administrative styling metrics. | Used across all frontend components. |
| **CSS Framework** | **TailwindCSS v4** | Utilizes CSS variables and theme properties for high-performance visual styling, smooth transitions, and glassmorphic filters. | Centralized in `/client/src/index.css` for styling. |
| **API Architecture** | **RESTful API** | Standardized JSON payload delivery endpoints. Integrates error and response formatting handlers. | Mapped under `/server/src/routes`. |
| **Real-time Sync** | **Socket.io** | Powers real-time websocket queues. Synchronizes called tokens and plays audio announcements across desks immediately. | Implemented in `/server/src/socket.js` and active in dashboards. |
| **Biometrics Fallback**| **HTML5 MediaDevices** | Accesses local device cameras to capture citizen photographs at the counter. | Embedded in `/client/src/components/admin/CounterOperations.jsx`. |
| **Scanner Interface** | **WIA via PowerShell** | Integrates physical scanners by executing a sandboxed PowerShell WIA script that converts scanned BMP formats into true JPEGs and embeds them in PDF wrappers. | Implemented in `/server/src/controllers/application.controller.js`. |
| **PDF Compiler** | **pdf-lib** | Client/Server PDF processing engine. Used to duplicate page structures matching copy counts and stream binary files. | Utilized in `/server/src/services/print.service.js` and `/server/src/controllers/printer.controller.js`. |
| **Logging Services** | **Winston logger** | Provides a daily rotating logger separating audits into categories: `system`, `errors`, `payments`, `printers`, `sessions`. | Configured under `/server/src/config/logger.js`. |
| **Validation Layer** | **Zod** | Enforces runtime request body schemas before executing database transactions. | Deployed under `/server/src/middlewares/validate.middleware.js`. |

---

## 4. Complete Project Architecture

The application is structured around a decoupled **Client-Server Architecture** utilizing a **Repository-Service Pattern** on the backend and a **Feature-Based Store Pattern** on the touch-optimized frontend.

### Frontend Architecture
* **Kiosk Layout**: A parent container (`KioskLayout.jsx`) that wraps citizen views and acts as a global listener. It tracks user interaction events (taps, key presses, clicks) to reset the inactivity timeout.
* **Zustand Stores**:
  * `kioskStore.js`: Tracks accessibility overrides (contrast, voice assistance, font scales) and updates standard HTML body classes (`.high-contrast`, `.large-text`) dynamically.
  * `authStore.js`: Holds stateful administration credentials, persists JWT profiles in localStorage, and maps operational roles to restrict unauthorized route entries.
* **Axios HTTP Client**: Centralized instance with automatic interceptors that extract credentials and inject authorization tokens.

### Backend Architecture
* **Controller Layer**: Parses HTTP payload properties, executes basic validations, and wraps logic in an `asyncHandler` wrapper to trap errors.
* **Service Layer**: Coordinates business workflows. For example, `PrintService` handles scanning directories for fresh downloads, checking age metadata, and formatting PDF page structures.
* **Repository Layer**: Encapsulates specific Prisma database queries.
* **Real-time Gateway**: Runs a Socket.io server alongside the Express listener to broadcast queue events (`queueUpdated`, `playAnnouncement`) to active operator consoles.

### Database Architecture
* The database handles relations between Payments, Correction Records, Application Workflows, and Printers using foreign keys (`payment_id`, `admin_id`).

### Deployment & Hardware Integration Architecture
* **Sandbox Folders**: Serving static folders `/temp/downloads` and `/temp/scans` dynamically using standard express middleware.
* **Windows Host WIA Hook**: Powers physical scanning operations on the local machine by executing powershell pipelines that interface with native WIA device connections.

```mermaid
graph TB
    subgraph Hardware ["Local Hardware Devices"]
        Scanner[Physical Scanner]
        Printer[Thermal / Laser Printer]
        Webcam[USB Webcam]
    end

    subgraph Client ["React Kiosk & Dashboards (Vite / CSS v4)"]
        A11y[Accessibility Settings: Contrast, TTS, Text Scale]
        TouchUI[Touch Target Citizen Views]
        Dashboards[Operator Consoles: Counter, Checker, Approval, Printer, Admin]
        Zustand[Zustand Stores: authStore & kioskStore]
        SocketIO_Client[Socket.IO Client Client]
    end

    subgraph Server ["Express Node.js REST API Server"]
        Middlewares[Middlewares: JWT Validation, Zod Validator, Winston Access Log]
        Controllers[Controllers: Application, Auth, Correction, Payment, Print, Printer]
        Services[Services: AuthService, PrintService]
        Repos[Repositories: AuthRepository, PrintRepository]
        SocketIO_Server[Socket.IO Server]
        Winston[Winston Logger: Daily Rotation Logs]
        PowerShell[PowerShell WIA Pipeline Manager]
    end

    subgraph Storage ["Data Layer"]
        Prisma[Prisma client]
        Postgres[(PostgreSQL Database)]
        DiskStore["Temporary Sandbox (temp/downloads & temp/scans)"]
    end

    %% Client communication
    TouchUI -. Interactions .-> Zustand
    Dashboards -. Actions .-> Zustand
    Zustand -. API Requests .-> Middlewares
    SocketIO_Client <== Real-time Events ==> SocketIO_Server

    %% Server Internal Flows
    Middlewares --> Controllers
    Controllers --> Services
    Services --> Repos
    Repos --> Prisma
    Prisma --> Postgres
    
    %% File system & script triggers
    Controllers -. Detect / Save Scans .-> DiskStore
    Controllers -. Execute PowerShell .-> PowerShell
    PowerShell -. Connect WIA .-> Scanner
    Services -. Parse PDF .-> DiskStore
    
    %% Devices output
    Dashboards -. Connect mediaDevices .-> Webcam
    DiskStore -. Read PDF Bytes .-> Printer
    
    classDef hardware fill:#ffe2e2,stroke:#ff5c5c,stroke-width:2px;
    classDef client fill:#e2f0ff,stroke:#5ca4ff,stroke-width:2px;
    classDef server fill:#e2ffe2,stroke:#5cff5c,stroke-width:2px;
    classDef storage fill:#fff9e2,stroke:#ffd05c,stroke-width:2px;
    
    class Scanner,Printer,Webcam hardware;
    class A11y,TouchUI,Dashboards,Zustand,SocketIO_Client client;
    class Middlewares,Controllers,Services,Repos,SocketIO_Server,Winston,PowerShell server;
    class Prisma,Postgres,DiskStore storage;
```

---

## 5. Folder Structure

The project directory is split into two major independent structures: the `/client` folder (frontend touch application) and the `/server` folder (REST API backend).

```
nagar-nigam-kiosk/
├── client/                             <-- React Frontend Application
│   ├── public/
│   │   └── assets/
│   │       └── nigam-logo.png          <-- Emblems and EMB logo assets
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosInstance.js        <-- Central Axios wrapper injecting JWT header
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── CounterOperations.jsx  <-- Counter processing wizard component
│   │   │   │   ├── DatabaseViewer.jsx     <-- Admin raw SQL tables visualizer
│   │   │   │   ├── MarriageOperations.jsx <-- Counter marriage application processor
│   │   │   │   ├── OperatorManager.jsx    <-- Admin profile registrar
│   │   │   │   └── QueueManager.jsx       <-- Real-time websocket queue sync widget
│   │   │   ├── common/
│   │   │   │   ├── Accessibility.jsx   <-- Floating menu widget (contrast, voice assist, scale)
│   │   │   │   ├── Footer.jsx          <-- Helpline display and session reset timer UI
│   │   │   │   └── Header.jsx          <-- Municipal Emblems banner & Bilingual toggle
│   │   │   ├── kiosk/
│   │   │   │   ├── ServiceCard.jsx     <-- Service items card (with hover transitions)
│   │   │   │   └── StartScreen.jsx     <-- Inactivity cover screen overlay
│   │   │   └── overlays/
│   │   │       ├── ErrorModal.jsx      <-- System warning modals
│   │   │       ├── IdleOverlay.jsx     <-- 5-second countdown session wipe alert
│   │   │       ├── ModalOverlay.jsx    <-- Backdrop glassmorphic popup overlay
│   │   │       ├── PauseOverlay.jsx    <-- Redirect blocker for portal integration
│   │   │       └── PrintModal.jsx      <-- Kiosk step-by-step certificate upload/pay UI
│   │   ├── layouts/
│   │   │   └── KioskLayout.jsx         <-- Parent router layout tracking idle events
│   │   ├── pages/
│   │   │   ├── LanguageSelection.jsx   <-- Splash entrance screen
│   │   │   ├── Home.jsx                <-- Birth/Death/Marriage choice screen
│   │   │   ├── ServiceSelection.jsx    <-- Service sub-category grid (Print/Corr/New)
│   │   │   ├── TokenGeneration.jsx     <-- Print receipt & Success ticket generation
│   │   │   ├── PrintSelection.jsx      <-- Direct kiosk print workflow controller
│   │   │   ├── CorrectionSelection.jsx <-- Portal-redirection info setup page
│   │   │   ├── BirthCorrection.jsx     <-- Birth request entry details form
│   │   │   ├── DeathCorrection.jsx     <-- Death request entry details form
│   │   │   ├── AdminLogin.jsx          <-- Login form for operators & admins
│   │   │   ├── AdminDashboard.jsx      <-- Dashboard for Super Admins
│   │   │   ├── CounterDashboard.jsx    <-- Dashboard for Counter Operators
│   │   │   ├── MarriageDashboard.jsx   <-- Dashboard for Marriage Operators
│   │   │   ├── CheckerDashboard.jsx    <-- Dashboard for Checker Operators
│   │   │   ├── ApprovalDashboard.jsx   <-- Dashboard for Approval Operators
│   │   │   └── PrinterDashboard.jsx    <-- Dashboard for Printer Operators
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx           <-- React Router configuration & RBAC guards
│   │   ├── store/
│   │   │   ├── authStore.js            <-- Keeps admin and operator profile states
│   │   │   └── kioskStore.js           <-- Accessibility settings & session timeout tickers
│   │   ├── translations/
│   │   │   └── dictionary.js           <-- Hindi/English localization strings
│   │   ├── App.css
│   │   ├── App.jsx                     <-- App initializer
│   │   ├── index.css                   <-- CSS styling system
│   │   └── main.jsx                    <-- DOM rendering root mount
│   └── vite.config.js                  <-- Vite bundler configuration
│
└── server/                             <-- Express Node.js Backend Server
    ├── logs/                           <-- Winston rotating log audit files
    ├── prisma/
    │   ├── schema.prisma               <-- PostgreSQL schema modeling
    │   └── seed.js                     <-- Pre-seeded SuperAdmin/Admin account injector
    ├── src/
    │   ├── config/
    │   │   ├── db.js                   <-- Exports connected Prisma client instance
    │   │   └── logger.js               <-- Configuresinston daily logs rotators
    │   ├── controllers/
    │   │   ├── application.controller.js <-- Process workflows & scanning operations
    │   │   ├── auth.controller.js        <-- Sessions login and logout triggers
    │   │   ├── correction.controller.js  <-- Spools correction tokens
    │   │   ├── payment.controller.js     <-- Simulates UPI payment sessions
    │   │   ├── print.controller.js       <-- Spools print records
    │   │   └── printer.controller.js     <-- Operator printing queue actions
    │   ├── middlewares/
    │   │   ├── auth.middleware.js        <-- Protects routes using JWT verification
    │   │   ├── error.middleware.js       <-- Catches global Express execution exceptions
    │   │   └── validate.middleware.js    <-- Validates body payloads via Zod
    │   ├── repositories/
    │   │   ├── auth.repository.js        <-- Direct SQL profiles lookup
    │   │   └── print.repository.js       <-- Direct database prints query layer
    │   ├── routes/
    │   │   ├── admin.routes.js           <-- System logs reader, metrics & database tables
    │   │   ├── application.routes.js     <-- Checker & Approval review endpoints
    │   │   ├── auth.routes.js            <-- Admin login & session me routes
    │   │   ├── correction.routes.js      <-- Generation of correction tokens
    │   │   ├── index.js                  <-- Mounts v1 routes
    │   │   ├── payment.routes.js         <-- Webhook simulator & UPI QR generator
    │   │   ├── print.routes.js           <-- Sandbox downloads monitor
    │   │   └── printer.routes.js         <-- Printer operator cash/spool routes
    │   ├── services/
    │   │   ├── auth.service.js           <-- Validates credentials & signs JWTs
    │   │   └── print.service.js          <-- Manages sandbox directory lookup & receipt write
    │   ├── utils/
    │   │   ├── ApiError.js               <-- Exception class
    │   │   ├── ApiResponse.js            <-- Success response structure
    │   │   ├── asyncHandler.js           <-- Express Promise middleware catch helper
    │   │   ├── dateHelper.js             <-- Indian Standard Time date format utilities
    │   │   └── tokenGenerator.js         <-- Incremental Universal token format generator
    │   ├── app.js                        <-- Configures express security settings
    │   ├── index.js                      <-- App entry point & old file purge schedule
    │   └── socket.js                     <-- Handles queue websocket events
    ├── temp/
    │   ├── downloads/                    <-- Mock sandbox folder for downloaded PDFs
    │   ├── receipts/                     <-- Backups of thermal receipt text files
    │   └── scans/                        <-- Mock scanner landing directory
    └── package.json
```

---

## 6. Complete Module Breakdown

### Module 1: Citizen Self-Service Kiosk
* **Purpose**: Provides a public touchscreen interface for citizens to access municipal services.
* **Features**: Language switcher, Accessibility options (Voice Assistant, High Contrast contrast variables, Large Text scaling), and automatic session reset timer.
* **Workflow**: Select language -> choose branch (Birth, Death, Marriage) -> choose action (Print, Correction, New Registration) -> complete UPI payment -> print ticket.
* **Business Logic**: Monitors user interactions to reset the inactivity timeout. Ticks down to 0, warning the user 5 seconds prior via `IdleOverlay`, then wipes session cache and reloads browser.
* **Database Tables**: `Payment`, `Token`, `CounterCorrectionRecord`, `CertificatePrintRecord`.
* **API Calls**: `/api/v1/payment/qr` (to generate UPI QR code), `/api/v1/payment/verify/:transactionId` (payment polling), `/api/v1/counter-correction/kiosk-token` (direct counter token generation).
* **Connected Modules**: Connected to *Direct Certificate Print*, *Counter Operator*, and *Printer Operator*.

### Module 2: Direct Certificate Print
* **Purpose**: Automates certificate downloads and printing.
* **Features**: Monitors `/temp/downloads` for new PDF files in real time. Validates file freshness (created in the last 60 seconds) to prevent print duplication.
* **Workflow**: The citizen clicks "Print" and is redirected to the *Pehchan Portal* in a sub-frame. Once they download the PDF, the backend sandbox captures it, verifies it, prompts for a UPI payment, and saves a text thermal receipt backup.
* **Business Logic**: Keeps a global `PRINTED_FILES` set in memory to ignore already printed PDFs. Disables direct PDF streaming to the Kiosk to prevent document theft.
* **Database Tables**: `Payment`, `PrintToken`, `CertificatePrintRecord`.
* **API Calls**: `/api/v1/print/check-download` (polls sandbox folder), `/api/v1/print/execute` (triggers print token generation).
* **Connected Modules**: Connected to *Citizen Kiosk* and *Printer Operator*.

### Module 3: Counter Operator & Document Processing
* **Purpose**: Supports Counter Operators in capturing documents and submitting applications.
* **Features**: Captures live photos via webcam, triggers physical scanners, and translates phonetic text inputs (English to Hindi).
* **Workflow**: Calls a token from the queue. The operator verifies the citizen's identity, takes a photo, scans their supporting documents, fills in details with phonetic translation, registers the fee, and submits the application.
* **Business Logic**: Major corrections (e.g. name changes) and minor corrections (e.g. spelling mistakes) are processed differently. Major corrections default to a 5-day SLA, while minor corrections submitted before 2 PM are processed by 5 PM the same day.
* **Database Tables**: `Application`, `Token`, `Payment`, `Admin`.
* **API Calls**: `/api/v1/applications/active-tokens` (polls queue), `/api/v1/applications/translate` (phonetic transliteration), `/api/v1/applications/trigger-physical-scan` (executes PowerShell WIA script), `/api/v1/applications/submit` (saves details).
* **Connected Modules**: Connected to *Citizen Kiosk*, *Checker Operator*, and *Approval Operator*.

### Module 4: Back-office Workflow Verification (Checker & Approval)
* **Purpose**: Standardizes the review and approval of correction requests.
* **Features**: Support for intermediate reviews, digital signature (DSC) uploads, objection flagging, and revert requests.
* **Workflow**:
  1. The Checker pulls a pending application, reviews the scanned documents, and either approves it (`APPROVED`) or flags an objection (`OBJECTION`).
  2. The Approval Operator reviews approved applications, uploads the DSC-signed PDF, and approves it (`DONE`).
* **Business Logic**: Objections automatically freeze progress and send a simulated SMS to the citizen. If an Approval Operator finds errors, they can revert the application back to the Checker.
* **Database Tables**: `Application`, `PrintToken`, `CertificatePrintRecord`, `Payment`, `Admin`.
* **API Calls**: `/api/v1/applications/checker-queue`, `/api/v1/applications/:id/checker-review`, `/api/v1/applications/approval-queue`, `/api/v1/applications/upload-certificate`, `/api/v1/applications/:id/approval-review`.
* **Connected Modules**: Connected to *Counter Operator* and *Printer Operator*.

### Module 5: Printer Operator Desk
* **Purpose**: Handles offline payments and prints signed certificates.
* **Features**: Displays the universal printing queue, supports cash fee collections, compile multi-copy PDFs using `pdf-lib`, and logs operations.
* **Workflow**: The operator retrieves a print token. If unpaid, they accept cash. They verify the certificate PDF, trigger the print job, compile the pages, and hand the printout to the citizen.
* **Business Logic**: Merges PDF bytes to compile duplicate pages based on the copies count before sending to print, maintaining print counts for audit log verification.
* **Database Tables**: `PrintToken`, `CertificatePrintRecord`, `Payment`, `PrinterAuditLog`, `Admin`.
* **API Calls**: `/api/v1/printer/tokens`, `/api/v1/printer/tokens/:tokenNumber/collect-cash`, `/api/v1/printer/tokens/:tokenNumber/print`, `/api/v1/printer/tokens/:tokenNumber/pdf`.
* **Connected Modules**: Connected to *Direct Certificate Print and *Back-office Workflow Verification*.

---

## 7. Admin Portals

The **Super Admin Dashboard** is a secure control panel restricted to accounts with `role: "SUPER_ADMIN"` or `role: "ADMIN"`.

### Purpose
Allows administrators to manage operator profiles, monitor metrics, view live system logs, and view raw database records.

### Users & Permissions
* **Super Admin / Admin**: Complete read/write access. Only Super Admins can manage operator profiles and view administrative database tables (`superAdmin` and `admin`).

### Features & Workflow
1. **Real-time Metrics**: Displays printed certificates, active tokens, collected revenue, and system status metrics.
2. **Rotating Logs Viewer**: Displays system log files (`system.log`, `errors.log`, `payments.log`, `printers.log`, `sessions.log`), filtering out internal monitoring queries to keep the view clean.
3. **Operator Profile Manager**: Supports creating new operator credentials, assigning station counters, and listing active profiles.
4. **Database Table Visualizer**: Displays raw database tables using a tabular viewer. Sensitive fields (like hashed passwords) are masked by default but can be revealed.

```
+-----------------------------------------------------------------------------+
|  NAGAR NIGAM KIOSK - ADMIN CONSOLE                                          |
+-----------------------------------------------------------------------------+
|  [ Overview ]  [ Logs Monitor ]  [ Database Viewer ]  [ Operator Registry ] |
+-----------------------------------------------------------------------------+
|                                                                             |
|  * Collected Revenue: Rs 24,050.00         * Active Queue: 12 Citizens      |
|  * Printed Certificates: 1,402             * Printer Status: ONLINE         |
|                                                                             |
|  +---------------------------+   +---------------------------------------+  |
|  | REGISTER NEW OPERATOR     |   | ACTIVE REGISTRY OPERATORS             |  |
|  |                           |   |                                       |  |
|  | Full Name: [Suresh Verma] |   | 1. Suresh Kumar (Counter 1) - OPR-101 |  |
|  | Email: [suresh@corp.in  ] |   | 2. Anjali Sharma (Counter 2) - OPR-102|  |
|  | Password: [••••••••••••]  |   | 3. Vikram Singh (Counter 3) - OPR-103 |  |
|  | Station:  [Counter 1   v] |   |                                       |  |
|  |                           |   |                                       |  |
|  | [Register Operator]       |   |                                       |  |
|  +---------------------------+   +---------------------------------------+  |
+-----------------------------------------------------------------------------+
```

### Connected APIs & Database Tables
* **APIs**: `/api/v1/admin/metrics`, `/api/v1/admin/logs`, `/api/v1/admin/tables`, `/api/v1/admin/db/:model`, `/api/v1/admin/printer-audit-logs`.
* **Database Tables**: All models configured in `schema.prisma`.

---

## 8. User Portals

Back-office operators access role-specific dashboards to process citizen requests:

### 1. Counter Operator Dashboard
* **Access Path**: `/counter/dashboard` (or `/marriage/dashboard` for Marriage Operators).
* **Permissions**: Accesses active correction tokens, triggers physical document scanners, transliterates text, and submits applications.
* **UI Features**: Features a real-time queue list on the left and a multi-step submission wizard on the right:
  * *Step 1 (Verification)*: Captures a webcam photo of the applicant.
  * *Step 2 (Fields Selector)*: Selects correction fields (e.g. Name, Date, Address).
  * *Step 3 (Details Form)*: Input details (triggers automatic transliteration on blur).
  * *Step 4 (Scan Documents)*: Triggers the scanner, uploads documents, and runs folder polling.
  * *Step 5 (Billing & Fees)*: Displays base fees, copy fees, and extra charges. Allows selecting payment methods (Cash, UPI QR, or Exempt).
  * *Step 6 (Receipt)*: Generates an enrollment ID (e.g. `ENR-674512`) and prints the token receipt.

### 2. Checker Operator Dashboard
* **Access Path**: `/checker/dashboard`.
* **Permissions**: Accesses applications pending checker review (`PENDING_CHECKER`, `REVERTED_TO_CHECKER`).
* **UI Features**: Lists pending applications, shows a comparative view of old vs. new details, features a document viewer, and supports actions like "Approve" or "Objection".

### 3. Approval Operator Dashboard
* **Access Path**: `/approval/dashboard`.
* **Permissions**: Accesses approved applications. Supports editing incorrect records, rescanning documents, and uploading digitally signed certificates.
* **UI Features**: Comparative field viewer, rescan hooks, file upload zone, and action buttons (`DONE` / `REVERT`).

### 4. Printer Operator Dashboard
* **Access Path**: `/printer/dashboard`.
* **Permissions**: Accesses the universal printing queue, processes cash fee collections, and triggers certificate printing.
* **UI Features**: Tab filters (Pending, Printed, All), search input, date range filters, and a queue table showing print status and actions.

---

## 9. Authentication & Authorization

The system enforces strict role-based route verification guards on the client application and API-level interceptors on the Node server.

### Login Flow
1. The operator inputs their email and password credentials in the `/admin/login` page template.
2. The client submits a POST request to `/api/v1/auth/login`. This request payload is intercepted and validated against a Zod schema (`loginSchema`).
3. The server checks the `SuperAdmin` table first, followed by the `Admin` table.
4. If a record is found, the server matches the raw password string.
5. If verified, the server signs a JSON Web Token (JWT) using the `JWT_SECRET` key, containing the user's ID, email, and role, expiring in 12 hours.
6. The server sets an HTTP-only cookie (`token`) on the response:
   * `httpOnly: true` (prevents XSS script execution reads).
   * `secure: true` (only in production HTTPS).
   * `sameSite: 'lax'` (CSRF safeguard protection).
   * `maxAge: 12 hours` (12 * 60 * 60 * 1000 ms).
7. The server returns a 200 JSON payload containing the user profile object and the token string. The client stores the token in `localStorage` to authorize Axios header attachments.
8. If the login role is `PRINTER_OPERATOR`, the system writes a startup event into the `PrinterAuditLog` database table.

### Signup / Operator Creation Flow
Only authenticated `SUPER_ADMIN` accounts can spawn new operator credentials:
1. The admin fills out the operator's name, email, password, and assigned counter station in the admin console.
2. The client calls `registerOperator` on the Zustand store, which appends the new operator profile to the `kiosk_operators` list in the client's `localStorage` for local runtime testing.

### Session Verification Flow
When an administrator refreshes their browser, the client makes a GET request to `/api/v1/auth/me`. The server intercepts the request using `verifyJWT` middleware:
1. It reads the token from either the `Authorization` header, the HTTP-only cookie, or the URL query parameter.
2. It verifies the signature using the `JWT_SECRET` key.
3. It fetches the profile from the `SuperAdmin` or `Admin` table and attaches it to `req.user`.
4. The server returns the active user profile object to re-establish the frontend session.

### Role-Based Access Control (RBAC) & Route Protection
API access is gated using the `authorizeRoles(...roles)` middleware helper. 

```
                       [ Incoming API Request ]
                                  │
                          ( verifyJWT Middleware )
                                  │
                    ( authorizeRoles Gate )
                    Check: req.user.role in [roles]
                      /                       \
             [ YES ] /                         \ [ NO ]
                    /                           \
         [ Execute Controller ]       [ 403 Access Forbidden ]
```

On the frontend, route protection is enforced via `ProtectedRoute` inside `AppRoutes.jsx`:
* **Unauthorized sessions** are redirected to `/admin/login`.
* **Authorized sessions** are routed based on their role:
  * `COUNTER_OPERATOR` -> `/counter/dashboard`
  * `MARRIAGE_OPERATOR` -> `/marriage/dashboard`
  * `CHECKER_OPERATOR` -> `/checker/dashboard`
  * `APPROVAL_OPERATOR` -> `/approval/dashboard`
  * `PRINTER_OPERATOR` -> `/printer/dashboard`
  * `ADMIN` / `SUPER_ADMIN` -> `/admin/dashboard`

---

## 10. Database Documentation

The system uses a PostgreSQL database. Below is the relational schema definition modeled via Prisma:

### Database Tables Detail

#### 1. `SuperAdmin` (`super_admins`)
Tracks municipal system directors.
* `super_admin_id` (Int, PK, AutoIncrement): Unique identifier.
* `full_name` (String): Full name.
* `email` (String, Unique): Unique email.
* `password` (String): Password.
* `created_at` (DateTime): Default `now()`.

#### 2. `Admin` (`admins`)
Tracks back-office operator roles.
* `admin_id` (Int, PK, AutoIncrement): Unique identifier.
* `super_admin_id` (Int, FK, Nullable): References `SuperAdmin.super_admin_id`.
* `full_name` (String): Operator's full name.
* `email` (String, Unique): Unique login email.
* `password` (String): Password.
* `role` (String): Defaults to `ADMIN`. (Supported: `ADMIN`, `SUPER_ADMIN`, `COUNTER_OPERATOR`, `CHECKER_OPERATOR`, `APPROVAL_OPERATOR`, `PRINTER_OPERATOR`, `MARRIAGE_OPERATOR`).
* `created_at` (DateTime): Default `now()`.

#### 3. `Payment` (`payments`)
Tracks certificate payments and fees.
* `payment_id` (Int, PK, AutoIncrement): Unique identifier.
* `registration_number` (String, Nullable): Enrollment/Registration number.
* `amount` (Decimal, 10, 2): Paid fee.
* `payment_mode` (String): Defaults to `UPI`. (Supported: `UPI`, `CASH`, `COUNTER_CASH`, `EXEMPT`, `DEPOSITED`).
* `transaction_id` (String, Unique): Unique payment reference.
* `qr_reference` (String, Nullable): Reference link.
* `payment_status` (String): Defaults to `PENDING`. (Supported: `PENDING`, `SUCCESS`, `FAILED`).
* `paid_at` (DateTime, Nullable): Payment completion timestamp.

#### 4. `CertificatePrintRecord` (`certificate_print_records`)
Tracks certificate printing tasks.
* `print_record_id` (Int, PK, AutoIncrement): Unique identifier.
* `payment_id` (Int, FK, Unique, Nullable): References `Payment.payment_id` (Cascade).
* `admin_id` (Int, FK, Nullable): References `Admin.admin_id` (SetNull).
* `applicant_name` (String): Applicant's name.
* `mobile_number` (String): Mobile number.
* `registration_number` (String): Document registration number.
* `certificate_type` (String): (Supported: `BIRTH`, `DEATH`, `MARRIAGE`).
* `total_copies` (Int): Default `1`.
* `downloaded_file_name` (String): PDF filename.
* `token_number` (String, Unique, Nullable): Spooled token reference.
* `downloaded_at` (DateTime, Nullable): Landing timestamp.
* `print_status` (String): Default `PENDING`. (Supported: `PENDING`, `PRINTED`).
* `printed_at` (DateTime, Nullable): Print execution timestamp.

#### 5. `CounterCorrectionRecord` (`counter_correction_records`)
Tracks correction requests.
* `correction_record_id` (Int, PK, AutoIncrement): Unique identifier.
* `payment_id` (Int, FK, Unique): References `Payment.payment_id` (Cascade).
* `admin_id` (Int, FK, Nullable): References `Admin.admin_id` (SetNull).
* `applicant_name` (String): Applicant's name.
* `mobile_number` (String): Mobile number.
* `registration_number` (String): Target registration number.
* `certificate_type` (String): (Supported: `BIRTH`, `DEATH`, `MARRIAGE`).
* `correction_type` (String): Defaults to `MULTI`.
* `correction_details` (Json, Nullable): Array of changes (e.g. `[{particular, oldValue, newValue}]`).
* `token_number` (String): Ticket token reference.
* `remarks` (String, Nullable): Remarks.
* `generated_at` (DateTime): Default `now()`.

#### 6. `PehchanCorrectionRecord` (`pehchan_correction_records`)
Tracks Pehchan portal updates.
* `pehchan_record_id` (Int, PK, AutoIncrement): Unique identifier.
* `payment_id` (Int, FK, Unique): References `Payment.payment_id` (Cascade).
* `admin_id` (Int, FK, Nullable): References `Admin.admin_id` (SetNull).
* `applicant_name` (String): Applicant's name.
* `mobile_number` (String): Mobile number.
* `registration_number` (String): Registration number.
* `certificate_type` (String): `BIRTH`, `DEATH`, or `MARRIAGE`.
* `correction_type` (String): `NAME`, `DATE`, `ADDRESS`, or `OTHER`.
* `correction_status` (String): Defaults to `PENDING`. (Supported: `PENDING`, `COMPLETED`, `CANCELLED`).
* `created_at` (DateTime): Default `now()`.

#### 7. `Token` (`tokens`)
Manages queue positions for correction requests.
* `token_id` (Int, PK, AutoIncrement): Unique identifier.
* `correction_record_id` (Int, FK, Unique): References `CounterCorrectionRecord.correction_record_id` (Cascade).
* `token_number` (String): Active ticket queue number.
* `counter_number` (String): Defaults to `Counter 1`.
* `queue_status` (String): Defaults to `WAITING`. (Supported: `WAITING`, `SERVING`, `COMPLETED`, `NOSHOW`).
* `issued_at` (DateTime): Default `now()`.

#### 8. `Application` (`applications`)
Tracks operator workflow details.
* `application_id` (Int, PK, AutoIncrement): Unique identifier.
* `enrollment_id` (String, Unique): Unique enrollment ID.
* `token_number` (String): Ticket reference.
* `department_block` (String): `BIRTH`, `DEATH`, or `MARRIAGE`.
* `service_type` (String): `CORRECTION` or `NEW_REGISTRATION`.
* `selfie_url` (String, Nullable): Selfie image link.
* `applicant_name` (String): Applicant's name.
* `mobile_number` (String): Mobile number.
* `registration_number` (String, Nullable): Target registration number.
* `father_name` (String, Nullable): Father's name.
* `mother_name` (String, Nullable): Mother's name.
* `dob` (String, Nullable): Date of birth/marriage.
* `relation_with_applicant` (String, Nullable): Relation with applicant.
* `correction_type` (String): `MAJOR`, `MINOR`, or `NEW_REGISTRATION`.
* `correction_details` (Json, Nullable): Array of changes (e.g. `[{fieldName, oldValue, newValue}]`).
* `uploaded_documents` (Json): List of uploaded filenames (e.g. `["doc1.pdf", "doc2.pdf"]`).
* `downloaded_certificate_url` (String, Nullable): Digitally signed PDF file link.
* `status` (String): Defaults to `PENDING_CHECKER`. (Supported: `PENDING_CHECKER`, `APPROVED`, `OBJECTION`, `DONE`, `REVERTED_TO_CHECKER`).
* `objection_remarks` (String, Nullable): Objection comments.
* `next_visit_time` (DateTime, Nullable): Next visit timestamp.
* `payment_method` (String, Nullable): `CASH`, `UPI_QR`, or `EXEMPT`.
* `payment_amount` (Decimal, 10, 2): Total collected fee.
* `payment_status` (String): Defaults to `SUCCESS`.
* `transaction_id` (String, Unique): Unique transaction ID.
* `created_at` (DateTime): Default `now()`.
* `updated_at` (DateTime): Auto-updated on modify.
* `counter_operator_id` (Int, FK, Nullable): References `Admin.admin_id`.
* `checker_operator_id` (Int, FK, Nullable): References `Admin.admin_id`.
* `approval_operator_id` (Int, FK, Nullable): References `Admin.admin_id`.

#### 9. `PrintToken` (`print_tokens`)
Universal queue for print operations.
* `print_token_id` (Int, PK, AutoIncrement): Unique identifier.
* `token_number` (String, Unique): Ticket reference.
* `applicant_name` (String): Applicant's name.
* `mobile_number` (String): Mobile number.
* `certificate_type` (String): `BIRTH`, `DEATH`, or `MARRIAGE`.
* `service_type` (String): `REG`, `CORR`, or `PRI`.
* `total_copies` (Int): Default `1`.
* `downloaded_file_name` (String, Nullable): Filename on server.
* `fee_status` (String): Defaults to `PENDING`. (Supported: `PENDING`, `FULFILLED`, `ALREADY_DEPOSITED`).
* `fee_amount` (Decimal, 10, 2): Fee amount.
* `print_status` (String): Defaults to `PENDING`. (Supported: `PENDING`, `PRINTED`).
* `created_at` (DateTime): Default `now()`.
* `printed_at` (DateTime, Nullable): Print completion timestamp.
* `admin_id` (Int, FK, Nullable): References `Admin.admin_id`.

#### 10. `PrinterAuditLog` (`printer_audit_logs`)
Audits print operator activities.
* `log_id` (Int, PK, AutoIncrement): Unique identifier.
* `admin_id` (Int, FK): References `Admin.admin_id` (Cascade).
* `action` (String): Event (e.g. `LOGIN`, `LOGOUT`, `FEE_COLLECTION`, `PRINT_CERTIFICATE`).
* `token_number` (String, Nullable): Associated token.
* `details` (String, Nullable): Audit details.
* `created_at` (DateTime): Default `now()`.

### Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    SUPER_ADMIN {
        int super_admin_id PK
        string full_name
        string email
        string password
        datetime created_at
    }

    ADMIN {
        int admin_id PK
        int super_admin_id FK
        string full_name
        string email
        string password
        string role
        datetime created_at
    }

    PAYMENT {
        int payment_id PK
        string registration_number
        decimal amount
        string payment_mode
        string transaction_id UK
        string qr_reference
        string payment_status
        datetime paid_at
    }

    CERTIFICATE_PRINT_RECORD {
        int print_record_id PK
        int payment_id FK
        int admin_id FK
        string applicant_name
        string mobile_number
        string registration_number
        string certificate_type
        int total_copies
        string downloaded_file_name
        string token_number UK
        datetime downloaded_at
        string print_status
        datetime printed_at
    }

    COUNTER_CORRECTION_RECORD {
        int correction_record_id PK
        int payment_id FK
        int admin_id FK
        string applicant_name
        string mobile_number
        string registration_number
        string certificate_type
        string correction_type
        json correction_details
        string token_number
        string remarks
        datetime generated_at
    }

    PEHCHAN_CORRECTION_RECORD {
        int pehchan_record_id PK
        int payment_id FK
        int admin_id FK
        string applicant_name
        string mobile_number
        string registration_number
        string certificate_type
        string correction_type
        string correction_status
        datetime created_at
    }

    TOKEN {
        int token_id PK
        int correction_record_id FK
        string token_number
        string counter_number
        string queue_status
        datetime issued_at
    }

    APPLICATION {
        int application_id PK
        string enrollment_id UK
        string token_number
        string department_block
        string service_type
        string selfie_url
        string applicant_name
        string mobile_number
        string registration_number
        string father_name
        string mother_name
        string dob
        string relation_with_applicant
        string correction_type
        json correction_details
        json uploaded_documents
        string downloaded_certificate_url
        string status
        string objection_remarks
        datetime next_visit_time
        string payment_method
        decimal payment_amount
        string payment_status
        string transaction_id UK
        datetime created_at
        datetime updated_at
        int counter_operator_id FK
        int checker_operator_id FK
        int approval_operator_id FK
    }

    PRINT_TOKEN {
        int print_token_id PK
        string token_number UK
        string applicant_name
        string mobile_number
        string certificate_type
        string service_type
        int total_copies
        string downloaded_file_name
        string fee_status
        decimal fee_amount
        string print_status
        datetime created_at
        datetime printed_at
        int admin_id FK
    }

    PRINTER_AUDIT_LOG {
        int log_id PK
        int admin_id FK
        string action
        string token_number
        string details
        datetime created_at
    }

    SUPER_ADMIN ||--o{ ADMIN : manages
    ADMIN ||--o{ CERTIFICATE_PRINT_RECORD : prints
    ADMIN ||--o{ COUNTER_CORRECTION_RECORD : processes
    ADMIN ||--o{ PEHCHAN_CORRECTION_RECORD : redirects
    ADMIN ||--o{ APPLICATION : counter_verifies
    ADMIN ||--o{ APPLICATION : checker_reviews
    ADMIN ||--o{ APPLICATION : approval_finalizes
    ADMIN ||--o{ PRINT_TOKEN : prints
    ADMIN ||--o{ PRINTER_AUDIT_LOG : generates
    
    PAYMENT ||--o| CERTIFICATE_PRINT_RECORD : settles
    PAYMENT ||--|| COUNTER_CORRECTION_RECORD : settles
    PAYMENT ||--|| PEHCHAN_CORRECTION_RECORD : settles
    
    COUNTER_CORRECTION_RECORD ||--o| TOKEN : enqueues
```

---

## 11. API Documentation

### 1. Authentication Endpoints

#### `POST /api/v1/auth/login`
Authenticates operators and administrators.
* **Authentication**: None.
* **Headers**: `Content-Type: application/json`.
* **Request Body**:
  ```json
  {
    "email": "admin@nagarnigam.gov.in",
    "password": "Admin@123"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "user": {
        "admin_id": 2,
        "super_admin_id": null,
        "full_name": "Kiosk Administrator",
        "email": "admin@nagarnigam.gov.in",
        "role": "ADMIN",
        "created_at": "2026-07-03T10:00:00.000Z",
        "id": 2
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "message": "Logged in successfully",
    "success": true
  }
  ```

#### `POST /api/v1/auth/logout`
Clears HTTP-only cookies and ends sessions.
* **Authentication**: JWT token required.

#### `GET /api/v1/auth/me`
Retrieves the profile of the currently logged-in user.
* **Authentication**: JWT token required.

---

### 2. Payment Gateway Simulator Endpoints

#### `POST /api/v1/payment/qr`
Generates a simulated UPI QR code.
* **Request Body**:
  ```json
  {
    "amount": 20.00,
    "registrationNumber": "Jaipur-Birth-1002"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "transactionId": "TXN-1719830154000-4821",
      "amount": 20,
      "upiUri": "upi://pay?pa=nagarnigam.kiosk@sbi&pn=NAGAR%20NIGAM%20CIVIC%20KIOSK&am=20&tr=TXN-1719830154000-4821&cu=INR&tn=Municipal%20Print%20Fee",
      "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=..."
    },
    "message": "UPI QR code generated successfully!",
    "success": true
  }
  ```

#### `GET /api/v1/payment/verify/:transactionId`
Checks payment status in the database.
* **Response (200 OK - SUCCESS)**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "transactionId": "TXN-1719830154000-4821",
      "status": "SUCCESS",
      "verifiedAt": "2026-07-03T10:05:00.000Z"
    },
    "message": "Transaction verified successfully!",
    "success": true
  }
  ```

#### `POST /api/v1/payment/webhook`
Simulates SBI/Razorpay transaction callbacks.
* **Request Body**:
  ```json
  {
    "transactionId": "TXN-1719830154000-4821",
    "amount": 20.00,
    "status": "SUCCESS"
  }
  ```

---

### 3. Kiosk Printing Endpoints

#### `GET /api/v1/print/check-download`
Polls the `/temp/downloads` directory for newly downloaded PDFs.
* **Response (200 OK - Detected)**:
  ```json
  {
    "statusCode": 200,
    "data": {
      "detected": true,
      "fileName": "Jaipur_Birth_Cert.pdf",
      "ageSeconds": 12,
      "sizeBytes": 140523
    },
    "message": "Fresh downloaded certificate detected successfully!",
    "success": true
  }
  ```

#### `POST /api/v1/print/execute`
Adds a direct print request to the database.
* **Request Body**:
  ```json
  {
    "applicantName": "John Doe",
    "mobileNumber": "9829012345",
    "registrationNumber": "Jaipur-Birth-1002",
    "certificateType": "BIRTH",
    "totalCopies": 2,
    "downloadedFileName": "Jaipur_Birth_Cert.pdf",
    "amount": 40.00,
    "transactionId": "TXN-1719830154000-4821",
    "paymentMode": "ONLINE"
  }
  ```

---

### 4. Counter Correction Endpoints

#### `POST /api/v1/counter-correction/generate-token`
Generates a token for correction requests.
* **Request Body**:
  ```json
  {
    "applicantName": "Rahul Sharma",
    "mobileNumber": "9829012345",
    "registrationNumber": "BIRTH-REG-1004",
    "certificateType": "BIRTH",
    "correctionFields": ["Name", "Date"],
    "amount": 20.00,
    "transactionId": "TXN-1719830154000-4821"
  }
  ```
* **Response (201 Created)**: Returns the generated token, e.g. `TKN-BIR-CORR-0307-001`.

#### `POST /api/v1/counter-correction/kiosk-token`
Generates a kiosk token (unpaid/counter cash).

---

### 5. Application Process Workflows

#### `GET /api/v1/applications/active-tokens`
Retrieves active tokens (`WAITING` or `SERVING`).
* **Roles**: `COUNTER_OPERATOR`, `MARRIAGE_OPERATOR`, `SUPER_ADMIN`.

#### `POST /api/v1/applications/submit`
Submits a processed application.
* **Request Body**:
  ```json
  {
    "tokenNumber": "TKN-BIR-CORR-0307-001",
    "departmentBlock": "BIRTH",
    "serviceType": "CORRECTION",
    "selfieUrl": "data:image/png;base64,iVBORw0KGgo...",
    "commonDetails": {
      "applicantName": "Rahul Sharma",
      "mobileNumber": "9829012345",
      "registrationNumber": "BIRTH-REG-1004",
      "fatherName": "Suresh Sharma",
      "motherName": "Anjali Sharma",
      "dob": "2015-08-12",
      "relationWithApplicant": "Self"
    },
    "correctionFields": [
      { "fieldName": "Child Name", "oldValue": "Rahool", "newValue": "Rahul" }
    ],
    "correctionType": "MINOR",
    "uploadedDocuments": ["Affidavit.pdf"],
    "paymentDetails": {
      "method": "CASH",
      "amount": 20.00,
      "transactionId": "TXN-CASH-78219"
    }
  }
  ```

#### `POST /api/v1/applications/translate`
Transliterates English names to Hindi phonetically.
* **Request Body**: `{ "text": "RAMESH SHARMA" }`
* **Response (200 OK)**: `{ "data": { "translatedText": "रमेश शर्मा" } }`

#### `POST /api/v1/applications/trigger-physical-scan`
Triggers the physical scanner using a PowerShell script.
* **Request Body**: `{ "targetFileName": "Birth_Affidavit.pdf" }`

---

### 6. Printer Operator Console Endpoints

#### `POST /api/v1/printer/tokens/:tokenNumber/collect-cash`
Collects payments offline.
* **Roles**: `PRINTER_OPERATOR`, `SUPER_ADMIN`.

#### `POST /api/v1/printer/tokens/:tokenNumber/print`
Compiles and prints the certificate.
* **Response (200 OK)**: Returns the Base64 representation of the PDF for printing.

---

### 7. Administrative Console Endpoints

#### `GET /api/v1/admin/logs`
Retrieves daily rotation logs.
* **Roles**: `ADMIN`, `SUPER_ADMIN`.

#### `GET /api/v1/admin/db/:model`
Retrieves raw records from a database table.
* **Roles**: `ADMIN` (restricted), `SUPER_ADMIN` (all tables).

---

## 12. Screen Documentation

### 1. Language Selection Screen
* **Purpose**: Deployed as the kiosk's splash screen to initiate a session.
* **UI Components**:
  * Emblems: Nagar Nigam emblem and emblem text.
  * Accessibility Widget: Floating overlay supporting contrast, speech volume, and text scaling buttons.
  * Start Button: Centered touch button.
* **Interaction**: Clicking the button redirects the user to the home screen.

### 2. Kiosk Home Screen
* **Purpose**: Serves as the main menu.
* **UI Components**:
  * Header: Dual emblem bar showing helpline numbers.
  * Service Cards: Three options: "Birth Certificate Services", "Death Certificate Services", and "Marriage Certificate Services".
* **Interaction**: Tapping a card saves the selected branch to the session state.

### 3. Service Selection Screen
* **Purpose**: Lists actions available for the selected branch.
* **UI Components**:
  * Option Cards:
    1. *Download & Print Certificate*: Instantly download and print.
    2. *Request Certificate Correction*: Correct name, date, or address details.
    3. *New Certificate Registration*: Get a token to begin new registrations.
* **Interaction**: Tapping an option routes the citizen to the relevant workflow.

### 4. Direct Print Screen
* **Purpose**: Guides citizens through the certificate printing process.
* **UI Components**:
  * Portal Frame: Sub-frame rendering the Pehchan portal.
  * Sandbox Indicator: Live spinner checking for the downloaded file.
  * Details Form: Fields for Mobile Number, Applicant Name, and copies count.
  * QR Code Section: Generates a UPI QR code and shows payment instructions.
  * Success Screen: Confirms print token generation.
* **Validations**: Requires a valid PDF upload, applicant name, and a 10-digit mobile number.

### 5. Token Generation Page
* **Purpose**: Displays the generated token.
* **UI Components**:
  * Card Layout: Displays token number (e.g. `TKN-BIR-CORR-0307-001`), branch, and service type.
  * Print Receipt Button: Triggers the virtual thermal printer.
  * Guidelines Text: Instructions to visit the back-office counter.

### 6. Birth & Death Correction Screens
* **Purpose**: Collects correction requests.
* **UI Components**:
  * Text Inputs: Registration number, applicant name, and mobile number.
  * Correction Checkboxes: Name, Date, Address, or Other.
  * Consent Checkbox: Disclaimer check.
  * Payment Panel: Displays payment instructions.
* **Validations**: Requires a registration number, applicant name, mobile number, and at least one correction field.

### 7. Counter Operator Console
* **Purpose**: Used by Counter Operators to process citizen requests.
* **UI Components**:
  * Token Queue Sidebar: Lists active queue tokens (`WAITING`).
  * Process Wizard Steps:
    * *Verification*: Features webcam controls and a photo preview.
    * *Correction Fields*: Lists fields to correct based on the branch.
    * *Applicant Details Form*: Inputs details and triggers translation on focus blur.
    * *Document Scanning Section*: Lists required documents with scan buttons.
    * *Billing & Payments*: Calculates fees and supports cash or UPI payments.
    * *Success Receipt Card*: Displays enrollment ID and provides a print option.

### 8. Checker Dashboard
* **Purpose**: Used by Checker Operators to review applications.
* **UI Components**:
  * Queue Table: Lists pending reviews.
  * Comparative Detail Grid: Displays side-by-side comparison of old vs. new details.
  * Document Viewer: Opens uploaded PDFs.
  * Action Bar: Action buttons (`APPROVE` / `OBJECTION`).

### 9. Approval Dashboard
* **Purpose**: Used by Approval Operators to authorize changes.
* **UI Components**:
  * Queue Grid: Lists pending approvals.
  * Detail Panel: Displays applicant data and modifications.
  * Upload Zone: Digital certificate signature upload section.
  * Action Bar: Action buttons (`DONE` / `REVERT`).

### 10. Printer Dashboard
* **Purpose**: Used by Printer Operators to print signed certificates.
* **UI Components**:
  * Queue Table: Lists pending prints.
  * Action Buttons: "Collect Cash" (gated if unpaid) and "Print".
  * PDF Viewer: Streams and opens the signed PDF.

### 11. Admin Console Dashboard
* **Purpose**: Dashboard for Super Admins.
* **UI Components**:
  * Metric Cards: Panels for prints, active tokens, and revenue.
  * Log Console: Searchable log terminal.
  * Database Viewer: SQL table selector and grid.
  * Profile Registry: Form to register new operators.

---

## 13. Complete Workflow Diagrams

This section outlines the operational workflows within the system.

### 1. Overall Kiosk & Back-Office Workflow
This flowchart outlines the process from the citizen's initial kiosk selection to the operator review and final delivery.

```mermaid
flowchart TD
    Citizen([Citizen at Kiosk]) --> SelectLang[Select Language / A11y]
    SelectLang --> SelectService[Choose Print / Correction / New Registration]
    
    %% Service routes
    SelectService -- "Print" --> DownCert[Download PDF from Pehchan Portal]
    DownCert --> PayUPI_1[Scan UPI QR Code & Pay Rs 20]
    PayUPI_1 --> SpoolPrint[Generate Print Token & Print Receipt]
    
    SelectService -- "Correction" --> EnterForm[Fill Registration & Select Fields]
    EnterForm --> PayUPI_2[Scan UPI QR Code & Pay Rs 20]
    PayUPI_2 --> PrintTicket[Generate Counter Token & Print Receipt]
    
    %% Counter Operator Desk
    PrintTicket --> CounterDesk[Counter Operator calls Token]
    CounterDesk --> VerifyFace[Capture webcam photo]
    VerifyFace --> TriggerWIA[Scan supporting documents via WIA scanner]
    TriggerWIA --> Transliterate[Apply English-to-Hindi Transliteration]
    Transliterate --> AssignBilling[Select Billing Type: Cash/QR/Exempt]
    AssignBilling --> SubmitApp[Submit Application]
    
    %% Verification desks
    SubmitApp --> CheckerDesk[Checker Operator Queue]
    CheckerDesk --> ReviewDoc{Validate Scans & Details}
    ReviewDoc -- "Objection" --> ObjectionSMS[Flag status: OBJECTION -> Trigger SMS alert]
    ObjectionSMS --> CitizenCounter[Citizen returns to Counter with missing documents]
    CitizenCounter --> VerifyFace
    ReviewDoc -- "Approved" --> ApprovalDesk[Approval Operator Queue]
    
    %% Signoff desks
    ApprovalDesk --> UploadDSC[Upload digitally signed certificate PDF]
    UploadDSC --> ReviewApproval{Authorizes sign-off}
    ReviewApproval -- "Revert" --> RevertChecker[Revert to Checker Desk]
    RevertChecker --> CheckerDesk
    ReviewApproval -- "Approve" --> SendSpool[Set status: DONE -> Queue Print Spool]
    
    %% Printing Counter Desk
    SpoolPrint --> PrintDesk[Printer Operator Queue]
    SendSpool --> PrintDesk
    PrintDesk --> VerifyPrintFee{Check Payment Status}
    VerifyPrintFee -- "Cash/Pending" --> CollectCash[Collect Rs 20 offline and mark FULFILLED]
    CollectCash --> CompilePDF[pdf-lib: duplicate PDF pages for copies count]
    VerifyPrintFee -- "Paid" --> CompilePDF
    CompilePDF --> PrintFinal([Print Certificate & deliver to Citizen])
```

### 2. Back-Office Verification & Correction Routing
This workflow defines the lifecycle of an application correction ticket.

```mermaid
flowchart LR
    TokenCreated([Token Created]) --> Counter[Counter Desk submission]
    Counter --> Checker{Checker Review}
    Checker -- "Raise Objection" --> Objection[Status: OBJECTION]
    Objection --> ReSubmit[Counter Re-submission]
    ReSubmit --> Checker
    Checker -- "Verify Details" --> Approved[Status: APPROVED]
    Approved --> Approval{Approval autorization}
    Approval -- "Revert" --> Revert[Status: REVERTED_TO_CHECKER]
    Revert --> Checker
    Approval -- "Sign-off Certificate" --> Done[Status: DONE -> Add to Printer Spool]
```

### 3. API Execution & Transaction Flow
Describes how the backend handles REST requests.

```mermaid
flowchart TD
    Req([HTTP Request]) --> RateLimit{Rate Limiter}
    RateLimit -- "Exceeded" --> Error429[429 Too Many Requests]
    RateLimit -- "Under Limit" --> JWTMiddleware{Verify JWT}
    JWTMiddleware -- "Invalid token" --> Error401[401 Unauthorized]
    JWTMiddleware -- "Valid token" --> RoleGate{Check Roles}
    RoleGate -- "Unauthorized" --> Error403[403 Access Forbidden]
    RoleGate -- "Authorized" --> Validator{Zod Body Schema Validator}
    Validator -- "Invalid Body" --> Error400[400 Bad Request]
    Validator -- "Valid Body" --> Transaction[Execute Controller db Transaction]
    Transaction -- "Fails" --> Rollback[Prisma rollback transaction]
    Rollback --> Error500[500 Server Error]
    Transaction -- "Succeeds" --> Commit[Prisma Commit changes -> write to Winston audit log]
    Commit --> ResSuccess([200 OK standard ApiResponse])
```

---

## 14. Data Flow Diagram (DFD)

The diagram below maps the flow of data through the system, from user inputs at the kiosk to back-office workflows and database storage.

```mermaid
flowchart TB
    %% External Entities
    Citizen([Citizen / Applicant])
    Operator([Back-office Operator / Admin])
    WIA_Scanner([Physical Scanner])
    SBI_Gateway([SBI Payment Gateway Webhook])

    %% Processes
    P1["1.0 Access Touch UI & select language (Kiosk UI)"]
    P2["2.0 Scan sandboxed folder for downloaded PDF"]
    P3["3.0 Generate simulated UPI QR & verify transaction"]
    P4["4.0 Call Queue, Capture photo, trigger scanner & submit"]
    P5["5.0 Review details, flag objections & apply digital signatures"]
    P6["6.0 Process Print Spool, verify fee status & print PDF"]

    %% Data Stores
    DB[("PostgreSQL Database")]
    Disk_Downloads[("Kiosk Sandbox: temp/downloads")]
    Disk_Scans[("Kiosk Sandbox: temp/scans")]

    %% Data Flows
    Citizen ==> |Select Lang, A11y overrides| P1
    Disk_Downloads ===> |PDF file age & size metadata| P2
    P2 ===> |Fresh downloaded file info| P1
    P1 ===> |Generate QR request details| P3
    P3 ===> |Simulated transaction status| P1
    SBI_Gateway ===> |Bank signature & Txn ID callback| P3
    P3 -.-> |Save Payment logs & update transaction status| DB
    
    Citizen ===> |Correction details & Consent| P1
    P1 -.-> |Save Payment logs & create Token| DB
    
    Operator ===> |Call Token details| P4
    WIA_Scanner ===> |Raw BMP scanned bytes| P4
    P4 ===> |Convert true JPEG & create PDF file| Disk_Scans
    P4 -.-> |Upsert Payment & save Application details| DB
    
    Operator ===> |Objection remarks & DSC Certificate PDF| P5
    P5 ===> |Save digitally signed PDF| Disk_Downloads
    P5 -.-> |Update Application status & create Print Token| DB
    
    Operator ===> |Retrieve printing token details| P6
    Disk_Downloads ===> |Stream signed PDF bytes| P6
    P6 -.-> |Mark PrintToken printed & write printer audit log| DB
    P6 ===> |Deliver certificate & thermal receipt| Citizen
```

---

## 15. Sequence Diagrams

### 1. Direct Certificate Print Sequence
This sequence outlines the process of printing certificates directly from the kiosk.

```mermaid
sequenceDiagram
    autonumber
    actor Citizen
    participant Client as Kiosk Touch UI
    participant Server as Express Node Server
    participant Sandbox as temp/downloads Directory
    participant Gateway as Payment Gateway Webhook
    participant DB as PostgreSQL Database

    Citizen->>Client: Tap 'Print Certificate' -> Redirect to Portal
    Citizen->>Client: Download PDF from Pehchan Portal
    loop Every 2 seconds
        Client->>Server: GET /api/v1/print/check-download
        Server->>Sandbox: Scan directory for fresh PDFs
        Sandbox-->>Server: Return latest PDF metadata
        alt File detected (created < 60s ago)
            Server-->>Client: Return 200 OK (fresh file details)
        else No file found
            Server-->>Client: Return 200 OK (detected: false)
        end
    end
    Client->>Citizen: Prompt: Select copies count
    Citizen->>Client: Confirm number of copies
    Client->>Server: POST /api/v1/payment/qr (amount: copies * Rs 20)
    Server-->>Client: Return simulated UPI QR code URL & txnId
    Client->>Citizen: Display UPI QR Code -> Citizen Scans & Pays
    loop Every 3 seconds
        Client->>Server: GET /api/v1/payment/verify/:transactionId
        Server->>DB: Query payment status
        DB-->>Server: Return transaction status
        Server-->>Client: Return SUCCESS / PENDING status
    end
    Note over Gateway,Server: Payment completes
    Gateway->>Server: POST /api/v1/payment/webhook
    Server->>DB: Upsert payment status: SUCCESS
    Server-->>Gateway: Return 200 OK
    Client->>Server: POST /api/v1/print/execute (copies details)
    Server->>DB: Prisma transaction: Create PrintToken & PrintRecord
    DB-->>Server: Confirm transaction success
    Server-->>Client: Return Spooled print details
    Client->>Citizen: Print thermal receipt ticket -> Guide to printing counter
```

### 2. Back-Office Counter Submission Sequence
This sequence details how a Counter Operator processes a citizen's request.

```mermaid
sequenceDiagram
    autonumber
    actor Clerk as Counter Operator
    participant Client as Counter Console UI
    participant Server as Express Node Server
    participant Scanner as Physical Scanner (WIA)
    participant DB as PostgreSQL Database

    Clerk->>Client: Call next queue token
    Client->>Server: GET /api/v1/applications/active-tokens
    Server->>DB: Query active tokens (status: WAITING)
    DB-->>Server: Return tokens list
    Server-->>Client: Populate token data
    Clerk->>Client: Capture webcam photo
    Client-->>Clerk: Preview photo
    Clerk->>Client: Input correction details (English)
    Client->>Server: POST /api/v1/applications/translate (text blur)
    Server-->>Client: Return transliterated Hindi text
    Clerk->>Client: Place papers in tray -> Click 'Scan Document'
    Client->>Server: POST /api/v1/applications/trigger-physical-scan
    Note over Server,Scanner: Execute PowerShell script
    Server->>Scanner: Run WIA.DeviceManager Connect
    Scanner-->>Server: Return BMP file bytes
    Server->>Server: Convert BMP to true Jpeg -> PDF compiler
    Server-->>Client: Return 200 OK (document uploaded successfully)
    Clerk->>Client: Select payment method (Cash / UPI / Exempt)
    Clerk->>Client: Click 'Submit Application'
    Client->>Server: POST /api/v1/applications/submit
    Server->>DB: Update token (COMPLETED) & create Application (PENDING_CHECKER)
    DB-->>Server: Confirm database transaction
    Server-->>Client: Return 201 Created (enrollment ID)
    Client-->>Clerk: Print token receipt -> SMS dispatch triggered
```

---

## 16. State Diagrams

This section maps the state transitions for the Kiosk application, correction workflows, and print tokens.

### 1. Kiosk Application Touch UI States
Tracks the lifecycle of a citizen's session on the kiosk.

```mermaid
stateDiagram-v2
    [*] --> SLEEP : Launch Kiosk UI
    SLEEP --> LanguageSelection : Tap Start Screen
    LanguageSelection --> HOME : Choose Hindi / English & Toggle A11y
    HOME --> ServiceSelection : Select Birth / Death / Marriage branch
    
    ServiceSelection --> PrintSelection : Choose Print Certificate
    PrintSelection --> ActivePayment_1 : Detect PDF download
    ActivePayment_1 --> SpoolPrintQueue : UPI Payment Success
    SpoolPrintQueue --> SuccessTokenPrint : Receipt printed
    
    ServiceSelection --> CorrectionSelection : Choose Request Correction
    CorrectionSelection --> CorrectionDetails : Fill Details & Fields
    CorrectionDetails --> ActivePayment_2 : Confirm Fields
    ActivePayment_2 --> SpoolCorrectionQueue : UPI Payment Success
    SpoolCorrectionQueue --> SuccessTokenPrint : Receipt printed
    
    SuccessTokenPrint --> HOME : Tap Return Home
    
    HOME --> SLEEP : Inactivity timeout (120s timer expires)
    ServiceSelection --> SLEEP : Inactivity timeout
    PrintSelection --> SLEEP : Inactivity timeout
    CorrectionDetails --> SLEEP : Inactivity timeout
```

### 2. Correction Application Record Workflow States
Tracks the status of a correction request through the verification steps.

```mermaid
stateDiagram-v2
    [*] --> PENDING_CHECKER : Counter submission
    PENDING_CHECKER --> OBJECTION : Checker raises objection
    OBJECTION --> PENDING_CHECKER : Citizen returns -> Clerk re-submits
    
    PENDING_CHECKER --> APPROVED : Checker approves details
    APPROVED --> REVERTED_TO_CHECKER : Approval Operator rejects details
    REVERTED_TO_CHECKER --> APPROVED : Checker corrects fields & re-approves
    
    APPROVED --> DONE : Approval Operator signs PDF (DSC done)
    DONE --> [*] : Spooled to Printer operator and printed
```

### 3. Spool Print Token States
Tracks print tokens from generation to print completion.

```mermaid
stateDiagram-v2
    [*] --> PENDING_FEE : Spooled from Kiosk Print (unpaid/kiosk cash)
    PENDING_FEE --> FULFILLED_CASH : Printer Operator collects cash
    
    [*] --> FULFILLED_ONLINE : Spooled from Kiosk Print (paid via UPI QR)
    [*] --> FULFILLED_PREPAID : Spooled from Back-office approval (pre-paid at counter)
    
    FULFILLED_CASH --> PRINTED : Click Execute Print
    FULFILLED_ONLINE --> PRINTED : Click Execute Print
    FULFILLED_PREPAID --> PRINTED : Click Execute Print
    
    PRINTED --> [*] : Hand certificate to Citizen
```

---

## 17. Business Logic & Validation Rules

### 1. The Sub-2 PM Service Level Agreement (SLA) Rule
Determines the return date and time scheduled for correction applicants.
* **Minor Corrections**:
  * If submitted **before 2:00 PM** local time (`now.getHours() < 14`), the return time is scheduled for **5:00 PM the same day**.
  * If submitted **after 2:00 PM**, the return time is scheduled for **5:00 PM the next business day**.
* **Major Corrections or New Registrations**:
  * The return time defaults to **5 days later** at **10:00 AM**.

```javascript
const calculateNextVisitTime = (correctionType, submittedDate) => {
  const date = new Date(submittedDate);
  const nextVisit = new Date(date);

  if (correctionType === 'MINOR') {
    const hours = date.getHours();
    if (hours < 14) {
      nextVisit.setHours(17, 0, 0, 0); // Same day 5:00 PM
    } else {
      nextVisit.setDate(nextVisit.getDate() + 1); // Next day
      nextVisit.setHours(17, 0, 0, 0); // 5:00 PM
    }
  } else {
    nextVisit.setDate(nextVisit.getDate() + 5); // 5 days later
    nextVisit.setHours(10, 0, 0, 0); // 10:00 AM
  }
  return nextVisit;
};
```

### 2. Phonetic English-to-Hindi Transliteration Rules
Provides translations for common Hindi names and phonetically transliterates other words on the blur event of English input fields.
* **Transliteration Dictionary**:
  Contains pre-defined mappings for common names, surnames, and locations (e.g. `RAMESH` -> `रमेश`, `JAIPUR` -> `जयपुर`).
* **Letter Substitution Rules**:
  If a name is not in the dictionary, the system applies phonetic rules based on spelling patterns:
  * Double characters: `SH` -> `श`, `CH` -> `च`, `BH` -> `भ`, `TR` -> `त्र`.
  * Vowels: `I` at the end of a word is transliterated as `ी`, otherwise `ि`. `A` at the end of a word is transliterated as `ा`, otherwise it is treated as a schwa (silent).
  * Consonants: `K` -> `क`, `L` -> `ल`, `M` -> `म`, `R` -> `र`.

### 3. PDF Page Duplication Logic (`pdf-lib`)
To ensure that the correct number of copies are printed, the backend compiles the PDF before printing:
1. It loads the PDF bytes using `pdf-lib`.
2. It parses the copies count from the request (e.g., `total_copies = 3`).
3. It copies the pages of the original PDF to a new document multiple times matching the copies count.
4. It compiles and serializes the new PDF, returning a Base64 string for print spooling.

### 4. Sandbox Monitoring and Freshness Verification
Automates certificate verification during Kiosk direct prints:
1. It scans the `/temp/downloads` directory for PDF files.
2. It filters out files that have already been printed (checked against `PRINTED_FILES` in memory).
3. It finds the latest modified file and calculates its age: `(Date.now() - file.mtimeMs) / 1000`.
4. If the file is **fresher than 60 seconds**, it is processed. Files older than 60 seconds are flagged as **stale** and ignored.

### 5. Scanner PowerShell Integration
A PowerShell script is dynamically generated and executed to trigger the physical scanner:
1. It connects to the first detected WIA device: `New-Object -ComObject WIA.DeviceManager`.
2. It captures the scan in BMP format: `Transfer("{B96B3CAB-0728-11D3-9D7B-0000F81EF32E}")`.
3. It converts the BMP to JPEG using the `.NET Drawing` assembly: `[System.Drawing.Image]::FromFile(...)`.
4. It saves the file in the `/temp/scans` directory.
5. If the target file is a PDF, the backend embeds the JPEG into a PDF wrapper using `pdf-lib`.

### 6. Legal Marriage Age Validation
The Counter Operator dashboard validates marriage applications using the groom and bride's dates of birth:
* **Groom Age**: Must be **21 years or older** at the time of marriage.
* **Bride Age**: Must be **18 years or older** at the time of marriage.
If either check fails, the submission is blocked, and the operator is prompted with a validation warning.

### 7. Inactivity Auto-Reset Wiping
Wipes session data on the kiosk to protect citizen privacy:
* Ticks every second while the kiosk is in `HOME` or `ACTIVE` states.
* Taps, clicks, and key presses reset the timer back to 0.
* If the timer reaches **115 seconds** (5 seconds before timeout), it displays `IdleOverlay` with a 5-second countdown.
* If no action is taken, it triggers a hard reload (`window.location.reload()`) at **120 seconds** to clear local storage and memory.

---

## 18. Features List

The table below lists the system's features grouped by module.

| Module | Feature Name | Technical Implementation | Business Function |
| :--- | :--- | :--- | :--- |
| **Kiosk Core** | Bilingual Dictionary | Dictionary object mapping translation strings (`dictionary.js`). | Translates the touch interface between Hindi and English. |
| **Kiosk Core** | Text-to-Speech (TTS) | Browser `speechSynthesis` API set to `hi-IN` or `en-US`. | Plays audio instructions when hovering over buttons. |
| **Kiosk Core** | Inactivity Auto-Reset | Zustand timer with global event listeners. | Resets the session after 120 seconds of inactivity to protect citizen privacy. |
| **Kiosk Core** | Contrast & Text Scaling | Appends `.high-contrast` and `.large-text` classes to the document body. | Increases visibility and font size by 130% for accessibility. |
| **Kiosk Core** | SBI UPI QR generator | Dependency-free UPI URI generation using the QR Server API. | Generates a UPI QR code dynamically for citizen payments. |
| **Back-office** | Biometric webcam capture | HTML5 `navigator.mediaDevices` camera stream fallback. | Captures applicant photographs at the counter. |
| **Back-office** | PowerShell WIA scanner | Executes a dynamically written PowerShell script via `child_process`. | Triggers document scans directly from the operator panel. |
| **Back-office** | Phonetic Transliteration | REST transliteration helper using phonetic mapping. | Translates English text fields into Hindi on blur. |
| **Back-office** | SLA Scheduling Wizard | Next-visit calendar date calculator based on the 2 PM rule. | Calculates when the citizen should return based on their request type. |
| **Back-office** | DSC Digital Signature upload | Binary certificate upload using standard REST APIs. | Allows approval operators to upload signed certificates. |
| **Back-office** | Real-time WebSocket Queue | Socket.io server connection. | Syncs queues and announces ticket numbers over speakers. |
| **Back-office** | Winston Log rotations | Daily log files rotation configuration. | Rotates logs daily across five categories for auditing. |
| **Back-office** | Database Table visualizer | Fetches records via `/api/v1/admin/db/:model`. | Displays raw database records in the admin console. |
| **Back-office** | Operator Registry | Local storage registration helper. | Allows admins to register and manage operator accounts. |
| **Back-office** | PDF Page Duplication | Page copying and serialization using `pdf-lib`. | Compiles the correct number of duplicate pages before printing. |

---

## 19. External Integrations

The system interfaces with hardware devices, payment systems, and municipal portals:

### 1. Pehchan Municipal Portal
* **Mechanism**: The kiosk uses a secure iframe to display the portal.
* **Integration**: Citizens search for registry numbers and download files within this frame. The files land in the kiosk's sandboxed `/temp/downloads` directory, which is monitored by the backend.

### 2. SBI / Razorpay Payment Webhooks
* **Mechanism**: UPI transactions are processed through simulated webhooks.
* **Integration**: The SBI / Razorpay gateway triggers POST callbacks to `/api/v1/payment/webhook` to update payment records in the database.

### 3. Windows WIA Driver Pipeline
* **Mechanism**: Handled via custom PowerShell scripts.
* **Integration**: The backend runs scripts using Node `exec` to connect to connected scanners, capture images in BMP format, convert them to JPEG, and pack them into PDFs.

### 4. SMS Notification Gateway
* **Mechanism**: Simulated using server-side logging.
* **Integration**: When status changes occur (e.g. objections raised), transaction notifications are written to logs, laying the groundwork for future SMS gateway integrations (like Twilio or Msg91).

---

## 20. Security Specification

### 1. Secure Sessions (HTTP-Only Cookies)
Operator credentials are authenticated using JSON Web Tokens. The JWT token is returned in a secure cookie with:
* `HttpOnly`: Enabled (prevents scripts from accessing token cookies).
* `Secure`: Enabled in production (forces transmission over HTTPS).
* `SameSite: 'lax'`: Protects against Cross-Site Request Forgery (CSRF).

### 2. Role-Based Access Control (RBAC) Gating
Endpoints are protected using the `authorizeRoles` middleware. Actions are restricted by role:
* **Counter Operators** cannot view pending checks.
* **Checker Operators** cannot upload signed certificates.
* **Printer Operators** cannot view raw administrative database tables.

### 3. Input Sanitization & Zod Schema Validations
All request payloads are verified using Zod schemas. Invalid structures are rejected with a `400 Bad Request` error before reaching database queries.

### 4. Production Rate Limiting
In production, rate limiting is applied to the `/api` route. It is set to a maximum of **10,000 requests per 15 minutes** to prevent denial-of-service (DDoS) attempts while allowing real-time queue polling.

### 5. Automated Data Cleansing
The kiosk's **120-second inactivity timer** clears the browser cache, local storage, and cookies on reset, protecting citizen data between sessions.

---

## 21. Error Handling Architecture

The system uses a structured error-handling system:

### 1. Global Express Exception Interceptor
Uncaught errors are captured by the `errorHandler` middleware. Non-standard exceptions are converted into structured `ApiError` responses.

### 2. Error Response Payload Format
Errors are returned in a standardized format:
```json
{
  "success": false,
  "message": "Invalid request data provided",
  "errors": [
    {
      "field": "body.mobileNumber",
      "message": "Mobile number must be a 10-digit numeric value"
    }
  ]
}
```

### 3. Hardware Failures
* **PowerShell Scanner Errors**: PowerShell execution errors (such as scanner busy or disconnected) are caught. The system returns a user-friendly error message rather than raw execution traces.
* **Printer Failures**: If printing compiles fail, errors are logged to `printers.log` and the client is notified.

---

## 22. Environment Configuration

The application is configured using environment variables in the `.env` file:

| Variable Name | Typical Value | Purpose |
| :--- | :--- | :--- |
| `PORT` | `5000` | The port the Node server listens on. |
| `NODE_ENV` | `development` / `production` | Set to `production` to enable rate limits, cookies security, and console output compression. |
| `DATABASE_URL` | `postgresql://postgres:pass@localhost:5432/db` | PostgreSQL connection string. |
| `JWT_SECRET` | `your_secret_key` | Signing key for JWT tokens. |
| `JWT_EXPIRY` | `12h` | Expiration time for operator sessions. |
| `MOCK_PRINTER` | `true` / `false` | Enables virtual printing simulation. |
| `UPI_ID` | `nagarnigam.kiosk@sbi` | Merchant ID used in QR generation. |
| `UPI_MERCHANT_NAME` | `NAGAR NIGAM CIVIC KIOSK` | Merchant name displayed on payment apps. |

---

## 23. Deployment Specification

### 1. Development Setup
1. **Database Setup**:
   Install PostgreSQL, configure the `DATABASE_URL` in `.env`, and apply migrations:
   ```bash
   cd server
   npm install
   npx prisma db push
   npx prisma db seed
   npm run dev
   ```
2. **Client Setup**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

### 2. Production Deployment
1. **Frontend Compilation**:
   Build the production assets:
   ```bash
   cd client
   npm run build
   ```
   This creates static files in the `/dist` directory, which can be served via Nginx or Express.
2. **Server Deployment**:
   Set `NODE_ENV=production` and start the server using PM2 for process monitoring:
   ```bash
   cd server
   pm2 start src/index.js --name "nagarnigam-backend"
   ```
3. **Automated Cleanups**:
   The backend automatically purges sandboxed files older than 3 days from the `/temp/downloads` directory on startup and checks hourly thereafter.

---

## 24. Performance Optimization

* **Winston Daily File Rotation**: Logs are rotated daily to prevent disk space issues, with a maximum file size of 20MB and a retention period of 14 days.
* **Stale File Exclusions**: The system maintains an in-memory `PRINTED_FILES` set to avoid checking previously processed documents, keeping sandbox lookups fast.
* **Pagination & Database Limits**: Raw database views in the admin console are limited to the **latest 100 records** to prevent performance hits from large payloads.
* **Startup Cleanup Schedules**: A background task automatically purges downloaded files older than 3 days from the temp directory on startup, keeping disk usage low.

---

## 25. Testing Strategy

### 1. Direct Printing Flow Test Cases
* Verify that PDF files downloaded from the Pehchan portal are detected by the backend.
* Check that files older than 60 seconds are flagged as stale and ignored.
* Validate that UPI payment polling transitions to `SUCCESS` upon receiving webhook callbacks.

### 2. Verification SLA Timing Test Cases
* Verify that minor correction applications submitted **before 2:00 PM** are scheduled for completion at **5:00 PM the same day**.
* Verify that minor applications submitted **after 2:00 PM** are scheduled for **5:00 PM the next day**.
* Confirm that major corrections default to a 5-day SLA.

### 3. Role-Based Access Control Test Cases
* Verify that unauthorized requests receive a `403 Access Forbidden` error.
* Confirm that operators are redirected to their respective dashboards upon login.
* Test that only Super Admin accounts can view raw database tables.

---

## 26. Future Improvements

1. **Aadhaar Biometric Authentications**: Integrate fingerprint or iris scanning devices to authenticate applicants directly.
2. **Dynamic Hardware Diagnostics**: Implement paper-level sensors and print-head heat warnings on the thermal printer to monitor status in the admin console.
3. **SMS Gateway API Integration**: Replace the simulated SMS logger with actual integrations (like Twilio or Msg91) to send alerts directly to citizens.
4. **Centralized Multi-kiosk Registry**: Support syncing state and queues across multiple kiosk terminals in larger civic offices.

---

## 27. Project Summary

The **Nagar Nigam Citizen Service Kiosk System** is a secure municipal self-service terminal. The decoupled architecture connects a touch-optimized React client to a Node.js Express backend and a PostgreSQL database.

Citizens can download and print certificates, or request corrections using the touchscreen kiosk. Back-office operators process these requests through a structured verification queue (Counter -> Checker -> Approval -> Printer). The system integrates with physical devices (scanners, printers) via PowerShell scripts, secures operator actions using role-based access control, and protects citizen privacy with auto-reset session timers.
