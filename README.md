# No Dues System

A full-stack No Dues Management System built using a **Monorepo Architecture** with:

- Backend: Node.js + Express
- Frontend: React
- Database: (To be configured)
- Authentication: JWT-based

This project is designed with a **modular architecture**, ensuring scalability, maintainability, and clean separation of concerns.

---

# Project Structure

```
no-dues-system/
│
├── .gitignore
├── backend/
├── frontend/
└── docs/
```

---

# Backend (Node.js + Express)

```
backend/
│
├── src/
│   ├── config/
│   │   ├── db.js
│   │   ├── jwt.js
│   │   └── mail.js
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── departments/
│   │   ├── applications/
│   │   ├── approvals/
│   │   └── admin/
│   │
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   └── errorHandler.js
│   │
│   ├── utils/
│   │   ├── generateToken.js
│   │   ├── generateQR.js
│   │   └── generatePDF.js
│   │
│   ├── routes.js
│   └── server.js
│
├── tests/
├── .env
└── package.json
```

## 🔹 Backend Architecture

- Modular feature-based structure
- Centralized configuration management
- Middleware-based authentication and role control
- Utility layer for reusable logic
- Scalable for future microservices

---

# Frontend (React)

```
frontend/
│
├── src/
│   ├── api/
│   │   ├── authApi.js
│   │   ├── studentApi.js
│   │   ├── departmentApi.js
│   │   └── adminApi.js
│   │
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── ActivateAccount.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── DepartmentDashboard.jsx
│   │   ├── AdminDashboard.jsx
│   │
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── StatusTable.jsx
│   │   ├── ProgressBar.jsx
│   │   └── ProtectedRoute.jsx
│   │
│   ├── context/
│   │   └── AuthContext.jsx
│   │
│   ├── hooks/
│   └── App.jsx
│
└── package.json
```

## 🔹 Frontend Architecture

- API abstraction layer
- Page-based routing
- Reusable UI components
- Authentication context management
- Custom hooks for reusable logic

---

# Docs

```
docs/
```

Used for:

- API Documentation
- Database Schema
- Architecture Diagrams
- Deployment Instructions

---

# Environment Configuration

Each service maintains its own `.env` file:

- `backend/.env`
- `frontend/.env`

These files are ignored using `.gitignore`.

---

# Installation

## Backend

```bash
cd backend
npm install
npm run dev
```

## Frontend

```bash
cd frontend
npm install
npm start
```