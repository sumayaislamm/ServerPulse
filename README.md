# 📌 ServerPulse – Backend API

A collaborative issue tracking system API built with Node.js, Express, TypeScript, and PostgreSQL.

---

# 🚀 Live URL

https://server-pulse.vercel.app/

---

# 🛠 Tech Stack

- Node.js (LTS)
- Express.js
- TypeScript
- PostgreSQL (pg)
- JWT Authentication
- bcrypt Password Hashing

---

# ✨ Features

## 🔐 Authentication
- User registration (signup)
- User login
- JWT-based authentication
- Role-based access (`contributor`, `maintainer`)

## 🐞 Issues Management
- Create issue (bug / feature_request)
- View all issues
- View single issue
- Update issue with role-based rules
- Delete issue (maintainer only)

## 🛡 Security
- JWT protected routes
- Role-based authorization
- Password hashing with bcrypt
- Input validation via database constraints

---

# ⚙️ Setup Instructions

## 1. Install dependencies
```bash
npm install