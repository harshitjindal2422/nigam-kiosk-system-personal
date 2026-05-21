# developmentGuide.md

# Nagar Nigam Kiosk System - Architecture & Standards

## 🚀 Industry Standards & Best Practices Currently Implemented

### Backend (Server)

1. **Repository-Service Pattern**: Strict separation of concerns. Controllers handle HTTP requests/responses, Services contain business logic, and Repositories manage PostgreSQL database queries.
2. **Global Error Handling**: Use `asyncHandler`, custom `ApiError`, centralized error middleware, and structured API responses.
3. **Security Middlewares**: Use `helmet`, `cors`, `express-rate-limit`, `cookie-parser`, and request sanitization.
4. **Advanced Logging System**: Use `morgan` for request logging and `winston` for application/system logs.
5. **Graceful Shutdown Strategy**: Handle `SIGINT`, `SIGTERM`, `uncaughtException`, and `unhandledRejection` for production-safe shutdown.
6. **Kiosk Session Management**: Auto session reset, inactivity timeout handling, and isolated kiosk transaction flow.
7. **File Security Handling**: Temporary downloaded files must auto-delete after printing.

---

### Frontend (Client)

1. **Feature-Based Architecture**: Separate kiosk modules into independent features.
2. **Centralized Axios Configuration**: Dedicated `axiosInstance.js` with interceptors.
3. **Protected Admin Routes**: Separate authentication flow for Admin and Super Admin.
4. **Kiosk Optimized UI**: Fullscreen touch-friendly responsive interface.
5. **Bilingual Support Ready**: Structure UI for Hindi/English expansion.
6. **Reusable UI Components**: Shared buttons, cards, forms, overlays, and kiosk popups.
7. **Session Overlay Management**: Handle pause mode, hold mode, sleep mode, and resume states.

---

## 📁 General Status

The Nagar Nigam Kiosk System is being developed as a production-grade public kiosk platform for:

* Certificate Printing
* Registration Search
* Certificate Correction via Token
* Certificate Correction via Pehchan Portal
* QR Payment Integration
* Thermal Printer Integration
* Admin Monitoring System

The system architecture follows scalable enterprise-grade standards.

* See `projectProgressReport.md` for development updates.
* See `guidelines.md` for development regulations.
* See `developmentPlan.md` for full execution roadmap.


