# 🛠️ Nagar Nigam Kiosk System — Development Debug & Error Log

This document tracks all critical technical bugs encountered, debugging workflows, and permanent structural resolutions implemented during development. These patterns serve as **strict architectural constraints** to ensure zero regressions in future phases.

---

## 📌 Architectural Guidelines & Anti-Regression Rules

### 1. Prisma Named Imports Rule
> [!WARNING]
> **Issue**: Importing PrismaClient or other server utility modules as a default import triggers runtime crashes.
> * *Resolution*: Always use exact **named imports** for Prisma and utility packages:
>   ```javascript
>   // Correct 
>   import { prisma } from '../config/db.js';
>   import { ApiError } from '../utils/ApiError.js';
> 
>   // Incorrect (causes runtime failures)
>   import prisma from '../config/db.js';
>   ```

### 2. Strict Database Primary Keys Shape
> [!IMPORTANT]
> **Issue**: Querying administrative records with arbitrary primary keys (like `id` or `superAdminId`) triggers database schema validation crashes.
> * *Resolution*: The database models strictly define unique keys:
>   * `SuperAdmin` uses primary key: `super_admin_id`
>   * `Admin` uses primary key: `admin_id`
> * *Normalized Request Contexts*: Our authentication middleware ([`auth.middleware.js`](file:///d:/nagar-nigan-org/server/src/middlewares/auth.middleware.js)) parses the role-based database queries and normalizes the parsed entity context to `req.user.id` to prevent crashes down the stack.

### 3. Zod Shape Resolver Validation
> [!WARNING]
> **Issue**: Calling `.shape` directly on Zod schemas under compiled middleware triggers validation failures if a body block is not explicitly configured.
> * *Resolution*: In our schema compiler [`validate.middleware.js`](file:///d:/nagar-nigan-org/server/src/middlewares/validate.middleware.js), we verify:
>   ```javascript
>   if (schema.shape && schema.shape.body) { ... }
>   ```
>   This gracefully prevents crashes when processing parameters from headers or query segments.

### 4. Sandboxed File Poll Constraints
> [!NOTE]
> **Issue**: Polling files indefinitely blocks system loops and compromises storage.
> * *Resolution*: File poll scanners must check:
>   * **Extension sanity**: Must match `.pdf` specifically.
>   * **Age constraints**: File timestamp (`mtimeMs`) must be fresh (< 180 seconds old) to prevent printing stale documents.
>   * **Instant Purging**: Files are permanently deleted immediately after spool completes to maintain absolute citizen confidentiality.

### 5. Correction Constraint: Marriage Certificates Excluded
> [!IMPORTANT]
> **Constraint**: There is absolutely no provision for correction of Marriage Certificates on this kiosk system.
> * *Rule*: The correction modules (Block 3 and Block 4) must strictly exclude Marriage Certificates from all selection lists and correction forms, permitting corrections *only* for Birth and Death certificates.

---

## 📝 Debugging Registry Log

| Bug Reference | Impact Area | Symptom | Root Cause | Permanent Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **ERR-001** | `auth.middleware.js` | Server crash (500) during token identification check `/me` | Queried admin schema using property `.id` instead of schema-compliant key `admin_id` | Mapped role check to query strictly via `admin_id` or `super_admin_id` and normalized target to `req.user.id`. |
| **ERR-002** | `validate.middleware.js` | Express startup crashes when passing plain Zod validations | Plain Zod objects do not expose compiled `.body` scopes directly | Checked `schema.shape.body` directly on the validation compiler object to resolve shapes dynamically. |
| **ERR-003** | `authStore.js` | Client hangs indefinitely on network or connection errors | Axios errors lacked standard catch bounds to cascade down to user screens | Wrapped the Zustand request calls in try/catch intercepts, capturing raw messages and piping them directly back to red alert cards on the UI. |
| **ERR-004** | `PrintModal.jsx` | Client whitescreen/crashes when opening Block 1 ("Rendered more hooks than during previous render") | The conditional `activeModal !== 'print'` guard was placed before hook initializations | Moved the conditional activeModal guard to right before the JSX return statement so hooks execute unconditionally. |
