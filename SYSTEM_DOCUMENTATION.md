# 🏛️ Nagar Nigam Citizen Service Kiosk System — System Documentation & Handover Guide

Welcome to the official developer handbook and system documentation guide for the **Nagar Nigam Citizen Service Kiosk System**. This document outlines everything developed during our phases, explaining the architecture, code conventions, state management, database configurations, and standard development processes.

---

## 📂 1. Technical Stack Overview

The kiosk is designed as a secure, public touch-screen municipal terminal with high-contrast visibility, bilingual voice synthesizers, and auto-reset systems.

* **Frontend**: React + Vite + TailwindCSS v4 + Framer Motion (for fluid micro-animations) + Zustand (for global, lightweight state management).
* **Backend**: Node.js + Express (ES Modules) + Prisma ORM + Winston Daily Rotating Logger (for dedicated auditing).
* **Database**: PostgreSQL (handling transaction logging, printer health diagnostics, and administrative control).

---

## 🏛️ 2. Architectural Design Patterns

### A. Backend Architecture: Repository-Service Pattern
To ensure standard security and high maintainability, the backend separates concerns into layers:
1. **Models (Prisma Database Layer)**: Declared in [`schema.prisma`](file:///d:/nagar-nigan-org/server/prisma/schema.prisma). It maps DB tables directly to PostgreSQL schemas.
2. **Repositories**: (Future Phase) Direct DB transactional handlers query database operations via Prisma client.
3. **Services**: (Future Phase) Coordinates core business workflows (e.g., matching payment validation logs, printing queues, and sandboxed file checking).
4. **Controllers**: Triggers Express requests, handles validation payloads, and responds through standardized REST wrappers.
5. **Middlewares**: Protects endpoints (JWT authorization, Winston access logs, global Express exception catchers).

### B. Frontend Architecture: Feature-Based & Touch-Target Optimized
The frontend is built to withstand public physical interactions:
* **Interactive Spacing**: Large target sizes (`min-h-[180px]` and `py-4 px-5`) optimized for touch-based screens.
* **Accessibility FAB**: Persistent floating menu (`Accessibility.jsx`) designed to allow Contrast Toggles, Text-Scaling, and Audio/Voice Assistant.
* **Auto-Reset (120s Inactivity Timer)**: Tracks global interaction events (`touchstart`, `mousedown`, `keydown`) and runs a full browser hard refresh upon timer expiration, ensuring user credentials and files are wiped between sessions.

---

## ⚙️ 3. Complete Project Directory Map

```
nagar-nigan-org/
├── client/                     <-- React Frontend Touch Application
│   ├── public/
│   │   └── assets/
│   │       └── nigam-logo.png  <-- Emblem banner asset
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosInstance.js <-- Connected HTTP adapter with JWT automatic injection
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Accessibility.jsx <-- Floating physical widgets (contrast, scaling, TTS)
│   │   │   │   ├── Footer.jsx  <-- helpline text & auto-reset indicator 
│   │   │   │   └── Header.jsx  <-- Bilingual municipal top bar & active lang switcher
│   │   │   ├── kiosk/
│   │   │   │   ├── ServiceCard.jsx <-- Interactive card with custom SVGs & micro-gestures
│   │   │   │   └── StartScreen.jsx <-- Screen overlay that pauses active states
│   │   │   └── overlays/
│   │   │       ├── ErrorModal.jsx <-- Central alerts and parameters validation
│   │   │       ├── IdleOverlay.jsx <-- 5s countdown overlay alert before reload
│   │   │       └── ModalOverlay.jsx <-- Glassmorphic popups overlay
│   │   ├── layouts/
│   │   │   └── KioskLayout.jsx <-- Central router wrappers and page boundary events
│   │   ├── pages/
│   │   │   ├── Home.jsx        <-- 4-Block services selection grid
│   │   │   ├── AdminLogin.jsx  <-- Admin portal credentials screen
│   │   │   └── AdminDashboard.jsx <-- Real-time administrative operations monitor
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx   <-- Global React Routing system
│   │   ├── store/
│   │   │   ├── authStore.js    <-- Keeps JWT tokens persisted
│   │   │   └── kioskStore.js   <-- Language, timers, modles, high-contrast, TTS voice queue
│   │   ├── translations/
│   │   │   └── dictionary.js   <-- Absolute English/Devanagari translations dictionary
│   │   ├── App.jsx             <-- Layout initializer
│   │   └── index.css           <-- TailwindCSS v4, webfonts loading, contrast variables
│   └── vite.config.js
│
└── server/                     <-- Node.js Express REST API Backend
    ├── prisma/
    │   ├── schema.prisma       <-- PostgreSQL models & ER constraints
    │   └── seed.js             <-- Hashed admin accounts injection
    ├── src/
    │   ├── config/
    │   │   ├── db.js           <-- Centralized database handler
    │   │   └── logger.js       <-- Winston dedicated logs rotation setup
    │   ├── middlewares/
    │   │   ├── auth.middleware.js <-- Route guardian checks using JSON Web Tokens (JWT)
    │   │   ├── error.middleware.js <-- Global API fallback standard outputs
    │   │   └── validate.middleware.js <-- Zod schema validation interceptors
    │   ├── routes/
    │   │   └── index.js        <-- Central API routers configuration
    │   ├── utils/
    │   │   ├── ApiError.js     <-- Standard structure for Express exceptions
    │   │   ├── ApiResponse.js  <-- Standard structures for Express successful outputs
    │   │   └── asyncHandler.js <-- Wrapper catching errors inside promises
    │   ├── app.js              <-- Security middlewares setup (helmet, cors, rate-limits)
    │   └── index.js            <-- Bootstrap initialization & graceful shutdown signals
```

---

## 🛠️ 4. Detailed Component Documentation

### A. State Management & Accessibility Integration (Zustand Store)
Inside [`client/src/store/kioskStore.js`](file:///d:/nagar-nigan-org/client/src/store/kioskStore.js), we run a global kiosk controller:
* **Idle System**: Starts at `idleTimer = 120` seconds. Ticks every second (`tickIdle`). If it falls below `5`, the screen shows the `IdleOverlay` warning. At `0`, it triggers `window.location.reload()` which hard-resets memory.
* **Text-to-Speech (TTS)**: Built using the browser's native `speechSynthesis`. The store tracks `voiceAssist = false`. When enabled, hovering or focusing elements calls `speak(text)`. It automatically cancels any preceding speech queue so overlapping actions sound clean.
* **High Contrast Override**: Toggles `highContrast = false`. When enabled, it injects the `.high-contrast` class into `document.body`. This swaps CSS properties globally using specific yellow/black colors defined in [`index.css`](file:///d:/nagar-nigan-org/client/src/index.css).
* **Text Scaling Override**: Toggles `largeText = false`, adding `.large-text` on `document.body` to scale fonts across screens by `130%` for visually impaired users.

### B. Winston Log Rotations
Inside [`server/src/config/logger.js`](file:///d:/nagar-nigan-org/server/src/config/logger.js), logs are written separately to audit files based on scope:
1. `system.log`: General server startups, router loadings, and structural errors.
2. `payments.log`: Logs UPI transaction references, mock QR checks, and revenue audit trails.
3. `printers.log`: Diagnostics of virtual physical thermal prints, page counts, paper rolls, and hardware health.
4. `sessions.log`: Tracks admin operations, login logs, and user inactivity resets.

---

## 🔒 5. Database Schema & Admin Seeding

Our PostgreSQL schema declared in [`schema.prisma`](file:///d:/nagar-nigan-org/server/prisma/schema.prisma) defines:
* **SuperAdmin / Admin**: Tracks email, hashed password, and role permissions.
* **Payment**: 1-to-1 matching links to specific services using an HSL transaction key. Includes amount, status (`PENDING`, `COMPLETED`, `FAILED`), and gateway references.
* **CertificatePrintRecord**: Tracks PDF filenames, page copy counts, status, and associated Payment IDs.
* **CounterCorrectionRecord**: Tracks corrections for births/deaths/marriages, document checklist matches, and token references.
* **PehchanCorrectionRecord**: Tracks portal redirections, citizen names, mobile numbers, and associated payments.
* **Token**: Generates queue tokens (e.g. `B-103`, `D-202`) with timestamps.

The database seed [`seed.js`](file:///d:/nagar-nigan-org/server/prisma/seed.js) pre-configures:
* **Super Admin**: `superadmin@nagarnigam.gov.in` (Password: `SuperAdmin@123`)
* **Kiosk Admin**: `admin@nagarnigam.gov.in` (Password: `Admin@123`)

---

## 🚀 6. Developer Operational Setup Guide

### 1. Prerequisites
Ensure you have Node.js (v18+) and PostgreSQL installed and running.

### 2. Backend Server Deployment
```bash
# Navigate to backend server
cd server

# Install dependecies
npm install

# Setup environment variables
# Copy .env.example into .env and set your database connection URL:
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/nagar_nigam_kiosk?schema=public"

# Push the Prisma database schemas to your PostgreSQL server
npx prisma db push

# Seed your database with the default SuperAdmin and Admin credentials
npx prisma db seed   # or run 'node prisma/seed.js'

# Start Nodemon Dev Server
npm run dev
```

### 3. Frontend Client Deployment
```bash
# Navigate to frontend client
cd client

# Install dependencies
npm install

# Compile & preview in Dev Mode
npm run dev

# Run Production-ready build compilation
npm run build
```

---

## 🤝 7. Handover Recommendations for New Developers

* **Visual Updates**: All design tokens (saffron, navy, green, purple gradients) are centralized in `@theme` inside [`index.css`](file:///d:/nagar-nigan-org/client/src/index.css). Use custom Tailwind tokens instead of introducing manual color overrides.
* **Text / String Modifications**: Do **NOT** hardcode text labels inside pages. Add strings to both HINDI and ENGLISH keys inside [`dictionary.js`](file:///d:/nagar-nigan-org/client/src/translations/dictionary.js) to preserve the bilingual accessibility layer.
* **State Operations**: Avoid storing page variables in custom hooks if they need to be wiped between user sessions. Storing them in standard components ensures they get wiped automatically when the 120s idle refresh triggers.
