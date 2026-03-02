# No Dues System

A full-stack No Dues Management System built using a **Monorepo Architecture** with:

- Backend: Node.js + Express
- Frontend: HTML, CSS, JavaScript
- Database: MySQL
- Authentication: JWT-based

This project is designed with a **modular architecture**, ensuring scalability, maintainability, and clean separation of concerns.

---

# Project Structure

```
nodue/
│
├── README.md
├── package.json
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
│   │   ├── db.js          # Database connection pool
│   │   ├── initDB.js      # Database schema initialization
│   │   ├── jwt.js         # JWT configuration
│   │   └── mail.js        # Email configuration
│   │
│   ├── modules/
│   │   ├── admin/         # Admin module
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # User management
│   │   ├── department/    # Department module
│   │   ├── applications/  # Applications module
│   │   └── approvals/     # Approvals module
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT authentication
│   │   ├── roleMiddleware.js   # Role-based access control
│   │   └── errorHandler.js     # Global error handling
│   │
│   ├── utils/
│   │   ├── generateToken.js    # Token generation
│   │   ├── generateQR.js       # QR code generation
│   │   └── generatePDF.js      # PDF generation
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
- MySQL database with connection pooling
- Scalable for future microservices

---

# Frontend (HTML/CSS/JavaScript)

```
frontend/
│
├── index.html              # Landing page
├── login.html              # Login page
├── dashboard.html          # General dashboard
├── student_dashboard.html  # Student dashboard
├── admin_dashboard.html    # Admin dashboard
│
├── js/
│   ├── api.js              # API communication layer
│   ├── main.js             # Main application logic
│   ├── login.js            # Login functionality
│   └── dashboard.js        # Dashboard functionality
│
├── styles/
│   ├── styles.css          # Global styles
│   ├── login.css           # Login page styles
│   └── dashboard.css       # Dashboard styles
│
└── images/                 # Static images
```

## 🔹 Frontend Architecture

- Static HTML pages served by Express
- Vanilla JavaScript for interactivity
- Modular CSS organization
- API layer for backend communication
- Responsive design

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

Backend maintains a `.env` file:

- `backend/.env`

This file is ignored using `.gitignore`.

---

# Installation

## Backend

```bash
cd backend
npm install
npm run dev
```

## Frontend

The frontend is served as static files by the Express server. No separate installation required.

## Database 

1. Check the `.env.example` file and create a `.env` file in backend with your values
2. Initialize the database schema:

```bash
cd backend/src/config
node initDB.js
```

---

# Running the Application

Start the backend server:

```bash
cd backend/src
node server.js
```

The application will be available at `http://localhost:5000` 
