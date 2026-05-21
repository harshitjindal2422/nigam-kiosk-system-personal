# guidelines.md

# 📘 Guidelines.md

## 🧠 Project Overview

The project is a **Nagar Nigam Citizen Service Kiosk System** developed for municipal citizen services.

The objective is to create a scalable, production-ready kiosk platform that supports:

* Certificate Printing
* Registration Search
* Certificate Correction
* Queue Token Management
* QR-Based Payments
* Thermal Printer Operations
* Admin Monitoring

The architecture is designed for real-world kiosk deployment inside Nagar Nigam offices.

---

# 🎯 Objectives

* Build a scalable kiosk platform
* Maintain clean modular architecture
* Ensure secure public kiosk handling
* Support thermal printer workflows
* Prevent session misuse between citizens
* Implement production-level error handling
* Build admin-ready monitoring system

---

# 🏗️ Tech Stack

## Frontend

* React.js (Vite)
* Tailwind CSS
* React Router DOM
* Axios
* Context API / Zustand
* Framer Motion

## Backend

* Node.js
* Express.js
* PostgreSQL
* Prisma ORM / Sequelize

## Authentication

* JWT Authentication
* bcryptjs
* Role-based Access Control

## Infrastructure

* Thermal Printer Integration
* QR Payment System
* Local Kiosk Session Manager

---

# 📂 Folder Structure

## Frontend

```text
src/
 ├── api/
 ├── assets/
 ├── components/
 │    ├── common/
 │    ├── kiosk/
 │    ├── overlays/
 │    └── ui/
 ├── features/
 │    ├── certificatePrint/
 │    ├── registrationSearch/
 │    ├── counterCorrection/
 │    ├── pehchanCorrection/
 │    ├── payment/
 │    ├── printer/
 │    └── auth/
 ├── hooks/
 ├── layouts/
 ├── pages/
 ├── routes/
 ├── store/
 ├── utils/
 ├── App.jsx
 └── main.jsx
```

## Backend

```text
server/
 ├── src/
 │    ├── config/
 │    ├── constants/
 │    ├── controllers/
 │    ├── logs/
 │    ├── middlewares/
 │    ├── models/
 │    ├── repositories/
 │    ├── routes/
 │    ├── services/
 │    ├── utils/
 │    ├── validations/
 │    ├── printer/
 │    ├── kiosk/
 │    ├── app.js
 │    └── index.js
```

---

# ⚙️ Development Guidelines for AI Agent

## 1. Architecture Rules

* Follow MVC + Repository-Service Pattern
* Controllers only handle requests/responses
* Services contain business logic
* Repositories handle database operations
* Frontend must follow Feature-Based Architecture
* Maintain strict separation of concerns

---

## 2. Kiosk Development Rules

* Every citizen session must be isolated
* Auto-clear sessions after inactivity
* Temporary certificate files must auto-delete
* Never store downloaded certificate PDFs permanently
* Use fullscreen kiosk-friendly UI
* Prevent random browser navigation
* Implement overlay states for pause/hold mode

---

## 3. Naming Conventions

* Components → PascalCase
* Variables → camelCase
* Constants → UPPER_CASE
* Files → meaningful descriptive names

---

## 4. API Handling

* Centralize APIs using Axios instance
* Global API interceptors mandatory
* Standard API response format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

---

## 5. Error Handling

* Use asyncHandler everywhere
* Never use raw try-catch repeatedly
* Use centralized global error middleware
* Use ApiError and ApiResponse utilities

---

## 6. Security Rules

* Never expose kiosk admin routes publicly
* Protect all admin APIs using JWT middleware
* Prevent duplicate payments
* Restrict certificate printing to latest session file only
* Auto-reset kiosk after inactivity

---

## 7. Printer Handling Rules

* Print operations must have retry mechanism
* Detect printer failure states
* Handle paper-out scenarios
* Support token printing and certificate printing

---

## 8. Payment Handling Rules

* QR payment verification mandatory
* Prevent double-printing without payment
* Maintain transaction logs
* Store payment references safely

---

## 9. Logging Standards

* Use Winston logger only
* No console.log in production
* Store:

  * payment logs
  * printer logs
  * session logs
  * system errors

---

## 10. UI/UX Standards

* Large touch-friendly components
* Minimum 16px readable typography
* Clear bilingual-ready layouts
* Consistent spacing system
* Responsive kiosk interface
* Smooth transitions and overlays

---

## 🚀 Goal

Build a scalable production-ready municipal kiosk system suitable for real-world deployment.

