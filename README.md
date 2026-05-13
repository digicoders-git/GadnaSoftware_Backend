# GadnaSoftware Backend - Policeline App

Complete backend documentation for the Policeline Duty Management System built with MERN Stack.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Environment Setup](#environment-setup)
5. [Database Models](#database-models)
6. [System Flow](#system-flow)
7. [API Documentation](#api-documentation)
   - [Auth](#1-auth)
   - [Admin](#2-admin)
   - [Designation](#3-designation)
   - [Users](#4-users)
   - [Duties](#5-duties)
   - [Duty History](#6-duty-history)
   - [Holidays](#7-holidays)
8. [Security](#security)
9. [Error Handling](#error-handling)

---

## Project Overview

**Policeline App** is a Police Department Duty Management System. It allows admins to:

- Manage police officers (users) with their designations
- Create and assign duties to officers
- Track complete duty history of every officer
- Manage officer holidays
- Get real-time alerts when officers don't return from holiday
- View officers categorized by their current status

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime Environment |
| Express.js | Web Framework |
| MongoDB Atlas | Cloud Database |
| Mongoose | ODM (Object Data Modeling) |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| dotenv | Environment Variables |
| nodemon | Dev Auto-restart |

---

## Project Structure

```
backend/
├── config/
│   └── db.js                     ← MongoDB connection
├── controllers/
│   ├── adminController.js        ← Admin CRUD + Login
│   ├── designationController.js  ← Designation CRUD
│   ├── dutyController.js         ← Duty CRUD + Assign/Remove/Complete
│   ├── dutyHistoryController.js  ← History tracking
│   ├── holidayController.js      ← Holiday management + Alerts
│   └── userController.js         ← User CRUD + Status Overview
├── middleware/
│   ├── authMiddleware.js         ← JWT protect + superAdminOnly
│   └── errorHandler.js           ← Global error handler
├── models/
│   ├── Admin.js                  ← Admin schema
│   ├── Designation.js            ← Designation schema
│   ├── Duty.js                   ← Duty schema
│   ├── DutyHistory.js            ← History schema
│   ├── Holiday.js                ← Holiday schema
│   └── User.js                   ← User schema
├── routes/
│   ├── index.js                  ← Main route registrar
│   ├── adminRoutes.js
│   ├── designationRoutes.js
│   ├── dutyRoutes.js
│   ├── dutyHistoryRoutes.js
│   ├── holidayRoutes.js
│   └── userRoutes.js
├── utils/
│   └── helpers.js
├── .env                          ← Environment variables (not pushed)
├── .gitignore
├── package.json
├── seeder.js                     ← First superadmin create karne ke liye
└── server.js                     ← Entry point
```

---

## Environment Setup

### 1. Clone & Install

```bash
git clone https://github.com/digicoders-git/GadnaSoftware_Backend.git
cd GadnaSoftware_Backend
npm install
```

### 2. Create `.env` file

```env
PORT=8000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.pg0rs31.mongodb.net/policeline_App?appName=Cluster0
JWT_SECRET=your_jwt_secret_here
```

### 3. Create First Superadmin

```bash
npm run seed
```

Output:
```
Superadmin created successfully!
Email: admin@gadnaapp.com
Password: Admin@123
```

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server runs on: `http://localhost:8000`

---

## Database Models

### Admin
```
{
  name        : String (required)
  email       : String (required, unique)
  password    : String (bcrypt hashed)
  role        : Enum ["superadmin", "admin"]  default: "admin"
  isActive    : Boolean  default: true
  timestamps  : createdAt, updatedAt
}
```

### Designation
```
{
  name        : String (required, unique)
  isActive    : Boolean  default: true
  timestamps  : createdAt, updatedAt
}
```

### User (Police Officer)
```
{
  name         : String (required)
  designation  : ObjectId → ref: Designation (required)
  phoneNumber  : String (required, unique)
  pnoNumber    : String (required, unique)
  isActive     : Boolean  default: true
  timestamps   : createdAt, updatedAt
}
```

### Duty
```
{
  title       : String (required)
  description : String
  location    : String
  dutyType    : Enum ["patrol", "guard", "investigation", "traffic", "special", "other"]
  assignedTo  : ObjectId → ref: User  default: null
  startDate   : Date (required)
  endDate     : Date
  status      : Enum ["pending", "active", "completed", "cancelled"]  default: "pending"
  createdBy   : ObjectId → ref: Admin (required)
  timestamps  : createdAt, updatedAt
}
```

### DutyHistory
```
{
  duty          : ObjectId → ref: Duty (required)
  user          : ObjectId → ref: User (required)
  action        : Enum ["assigned", "reassigned", "removed", "completed"]
  dutyType      : String
  location      : String
  startDate     : Date
  endDate       : Date
  duration      : Number (auto-calculated in hours)
  remarks       : String
  performedBy   : ObjectId → ref: Admin (required)
  previousUser  : ObjectId → ref: User  default: null
  timestamps    : createdAt, updatedAt
}
```

### Holiday
```
{
  user        : ObjectId → ref: User (required)
  startDate   : Date (required)
  endDate     : Date (required)
  reason      : String  default: "Holiday"
  status      : Enum ["upcoming", "ongoing", "completed"]  (auto-set)
  approvedBy  : ObjectId → ref: Admin (required)
  timestamps  : createdAt, updatedAt
}
```

---

## System Flow

### Overall System Flow

```
┌─────────────────────────────────────────────────────────┐
│                     ADMIN LOGIN                         │
│              POST /api/admin/login                      │
│                  Token milega                           │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────▼───────────┐
          │   DESIGNATION SETUP   │
          │  POST /api/designations│
          │  (Constable, SI, etc) │
          └───────────┬───────────┘
                      │
          ┌───────────▼───────────┐
          │    OFFICER (USER)     │
          │    ADD KARO           │
          │  POST /api/users      │
          │  Name, Phone, PNO,    │
          │  Designation          │
          └───────────┬───────────┘
                      │
          ┌───────────▼───────────┐
          │     DUTY BANAO        │
          │  POST /api/duties     │
          │  Title, Location,     │
          │  Type, Dates          │
          └───────────┬───────────┘
                      │
          ┌───────────▼───────────┐
          │   DUTY ASSIGN KARO    │
          │  POST /api/duties     │
          │       /:id/assign     │
          └───────────┬───────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐  ┌─────▼────┐  ┌────▼──────┐
   │REASSIGN │  │  REMOVE  │  │ COMPLETE  │
   │ to new  │  │assignment│  │   duty    │
   │  user   │  │          │  │           │
   └────┬────┘  └─────┬────┘  └────┬──────┘
        │             │             │
        └─────────────▼─────────────┘
                      │
          ┌───────────▼───────────┐
          │   DUTY HISTORY        │
          │  Auto track hota hai  │
          │  Har action ka record │
          │  Duration calculate   │
          └───────────────────────┘
```

---

### Duty Assignment Flow

```
Duty Create (status: pending)
        │
        ▼
Assign to Officer (status: active)
        │
        ├──── Reassign to another officer?
        │           │
        │           ▼
        │     Old officer ka record CLOSE (action: removed)
        │     New officer ka record OPEN  (action: reassigned)
        │     previousUser field mein old officer save
        │
        ├──── Remove Assignment?
        │           │
        │           ▼
        │     Record CLOSE (action: removed, endDate set)
        │     Duty status → pending
        │
        └──── Complete Duty?
                    │
                    ▼
              Record CLOSE (action: completed)
              Duration auto-calculate (hours)
              Duty status → completed
```

---

### Holiday Flow

```
Admin adds Holiday
        │
        ▼
Status auto-set:
  ┌─────────────────────────────────┐
  │ startDate > now  → "upcoming"   │
  │ now between dates → "ongoing"   │
  │ endDate < now    → "completed"  │
  └─────────────────────────────────┘
        │
        ▼
Holiday End Date Cross Ho Gayi?
        │
        ├──── Duty assign hui?
        │           │
        │           ▼
        │     ✅ RETURNED - Officer wapas duty pe
        │
        └──── Duty assign NAHI hui?
                    │
                    ▼
              🚨 OVERDUE ALERT
              "Officer ka holiday X din pehle
               khatam hua lekin duty assign nahi hui"
```

---

### User Status Categories

```
Sabhi Active Users
        │
        ├──── Holiday ongoing hai?
        │           YES → Category: "onHoliday"
        │                 (Duty assign list mein NAHI aayenge)
        │
        ├──── Active duty pe assigned hai?
        │           │
        │           ├── dutyType = "special"?
        │           │         YES → Category: "deputed"
        │           │               (Alag jagah bheja gaya)
        │           │
        │           └── Other duty type?
        │                     YES → Category: "dutyWise[patrol/guard/traffic...]"
        │
        └──── Na holiday, na duty?
                    YES → Category: "available"
                          (Assign karne ke liye ready)
```

---

## API Documentation

**Base URL:** `http://localhost:8000/api`

**Authentication:** Sabhi APIs mein header mein token bhejo (sirf login ke alawa)
```
Authorization: Bearer <your_jwt_token>
```

---

### 1. Auth

#### Login
```
POST /api/admin/login
```

Request Body:
```json
{
  "email": "admin@gadnaapp.com",
  "password": "Admin@123"
}
```

Response:
```json
{
  "_id": "...",
  "name": "Gaurav Gupta",
  "email": "admin@gadnaapp.com",
  "role": "superadmin",
  "token": "eyJhbGci..."
}
```

---

### 2. Admin

> SuperAdmin only: Create, Update, Delete

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin` | Protected | Sabhi admins ki list |
| POST | `/api/admin` | SuperAdmin | Naya admin banao |
| GET | `/api/admin/:id` | Protected | Admin by ID |
| PUT | `/api/admin/:id` | SuperAdmin | Admin update karo |
| DELETE | `/api/admin/:id` | SuperAdmin | Admin delete karo |

#### Create Admin - Request Body
```json
{
  "name": "Rahul Admin",
  "email": "rahul@admin.com",
  "password": "Rahul@123",
  "role": "admin"
}
```

---

### 3. Designation

> SuperAdmin only: Create, Update, Delete
> All admins: Get list (for dropdown)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/designations` | Protected | Active designations (dropdown ke liye) |
| GET | `/api/designations?all=true` | Protected | Sab designations (active + inactive) |
| POST | `/api/designations` | SuperAdmin | Nai designation banao |
| PUT | `/api/designations/:id` | SuperAdmin | Update / enable-disable |
| DELETE | `/api/designations/:id` | SuperAdmin | Delete |

#### Create Designation - Request Body
```json
{
  "name": "Sub Inspector"
}
```

#### Update Designation - Request Body
```json
{
  "name": "Sub Inspector",
  "isActive": false
}
```

#### Flow - User add karne se pehle:
```
1. GET /api/designations        ← Dropdown list lo
2. User select kare designation
3. POST /api/users mein designation ID bhejo
```

---

### 4. Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Protected | Sabhi officers ki list |
| POST | `/api/users` | Protected | Naya officer add karo |
| GET | `/api/users/:id` | Protected | Officer by ID |
| PUT | `/api/users/:id` | Protected | Officer update karo |
| DELETE | `/api/users/:id` | Protected | Officer delete karo |
| GET | `/api/users/unassigned/list` | Protected | Jinko koi active duty nahi (holiday bhi exclude) |
| GET | `/api/users/status/overview` | Protected | Sabhi categories ek saath |
| GET | `/api/users/status/by-duty-type/:dutyType` | Protected | Ek specific duty type ke officers |

#### Create User - Request Body
```json
{
  "name": "Ramesh Kumar",
  "designation": "64f1a2b3c4d5e6f7a8b9c0d1",
  "phoneNumber": "9876543210",
  "pnoNumber": "PNO001"
}
```

#### Status Overview Response
```json
{
  "totalUsers": 50,
  "summary": {
    "available": 20,
    "onDuty": 25,
    "onHoliday": 3,
    "deputed": 2
  },
  "available": [...],
  "dutyWise": [
    { "dutyType": "patrol", "total": 10, "users": [...] },
    { "dutyType": "guard", "total": 8, "users": [...] },
    { "dutyType": "traffic", "total": 7, "users": [...] }
  ],
  "deputed": [...],
  "onHoliday": [...]
}
```

#### Duty Type Values for by-duty-type
```
patrol | guard | investigation | traffic | special | other
```

---

### 5. Duties

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/duties` | Protected | Sabhi duties |
| POST | `/api/duties` | Protected | Nai duty banao |
| GET | `/api/duties/:id` | Protected | Duty by ID |
| PUT | `/api/duties/:id` | Protected | Duty update karo |
| DELETE | `/api/duties/:id` | Protected | Duty delete karo |
| POST | `/api/duties/:id/assign` | Protected | Officer ko assign / reassign karo |
| POST | `/api/duties/:id/remove` | Protected | Assignment hatao |
| POST | `/api/duties/:id/complete` | Protected | Duty complete karo |

#### Create Duty - Request Body
```json
{
  "title": "Night Patrol",
  "description": "Sector 12 night patrol",
  "location": "Sector 12",
  "dutyType": "patrol",
  "startDate": "2026-05-15T20:00:00Z",
  "endDate": "2026-05-16T04:00:00Z"
}
```

#### Duty Status Values
```
pending → active → completed
                 → cancelled
```

#### Assign Duty - Request Body
```json
{
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "remarks": "Assigned for night patrol"
}
```

> Same endpoint reassign ke liye bhi use hota hai.
> Agar duty already kisi ko assign hai aur aap naya userId bhejte ho → auto reassign hoga.

#### Remove Assignment - Request Body
```json
{
  "remarks": "Removed due to emergency"
}
```

#### Complete Duty - Request Body
```json
{
  "remarks": "Duty completed successfully"
}
```

---

### 6. Duty History

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/duty-history` | Protected | Sabhi history records (last 100) |
| GET | `/api/duty-history/user/:userId` | Protected | Ek officer ki poori history + stats |
| GET | `/api/duty-history/duty/:dutyId` | Protected | Ek duty ki poori history |

#### User History Response
```json
{
  "history": [
    {
      "duty": { "title": "Night Patrol", "dutyType": "patrol", "location": "Sector 12" },
      "user": { "name": "Ramesh Kumar", "pnoNumber": "PNO001" },
      "action": "completed",
      "startDate": "2026-05-01T20:00:00Z",
      "endDate": "2026-05-02T04:00:00Z",
      "duration": 8.0,
      "remarks": "Completed successfully",
      "performedBy": { "name": "Gaurav Gupta" },
      "previousUser": null
    }
  ],
  "stats": {
    "totalAssignments": 10,
    "totalCompleted": 7,
    "totalRemoved": 3,
    "totalHours": "64.50",
    "dutyTypeBreakdown": {
      "patrol": 4,
      "guard": 3,
      "traffic": 2,
      "special": 1
    }
  }
}
```

#### Action Values
```
assigned    → Pehli baar duty assign hui
reassigned  → Kisi aur se lekar assign ki gayi
removed     → Duty se hataya gaya
completed   → Duty complete ki
```

---

### 7. Holidays

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/holidays` | Protected | Sabhi holidays |
| GET | `/api/holidays?date=YYYY-MM-DD` | Protected | Specific date pe kaun holiday pe |
| GET | `/api/holidays?status=ongoing` | Protected | Status filter |
| POST | `/api/holidays` | Protected | Holiday add karo |
| GET | `/api/holidays/today` | Protected | Aaj kaun holiday pe hai |
| GET | `/api/holidays/active` | Protected | Abhi ongoing holidays |
| GET | `/api/holidays/upcoming` | Protected | Aane wali holidays |
| GET | `/api/holidays/returned` | Protected | Aaj holiday khatam - wapas duty pe |
| GET | `/api/holidays/overdue-alerts` | Protected | 🚨 Holiday khatam but duty assign nahi |
| GET | `/api/holidays/user/:userId` | Protected | Ek officer ki holiday history |
| PUT | `/api/holidays/:id` | Protected | Holiday update karo |
| DELETE | `/api/holidays/:id` | Protected | Holiday cancel karo |

#### Add Holiday - Request Body
```json
{
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-06-05T23:59:59Z",
  "reason": "Annual Leave"
}
```

#### Holiday Status - Auto Set
```
startDate > now   →  "upcoming"
now between dates →  "ongoing"
endDate < now     →  "completed"
```

#### Overdue Alert Response
```json
{
  "totalAlerts": 2,
  "totalReturned": 1,
  "summary": "2 user(s) ka holiday khatam ho gaya hai lekin duty assign nahi hui",
  "notReturnedAlerts": [
    {
      "alertType": "not_returned",
      "message": "🚨 ALERT: Suresh Singh ka holiday 2 din pehle khatam hua lekin abhi tak duty assign nahi hui",
      "overdueBy": { "hours": 58, "days": 2 },
      "user": { "name": "Suresh Singh", "phoneNumber": "9111122222", "pnoNumber": "PNO002" },
      "holiday": { "startDate": "...", "endDate": "...", "reason": "Medical Leave" },
      "currentDuty": null
    }
  ],
  "returnedAlerts": [
    {
      "alertType": "returned",
      "message": "✅ Ramesh Kumar holiday khatam hua aur duty pe wapas aa gaya hai",
      ...
    }
  ]
}
```

---

## Security

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcryptjs (salt rounds: 10) |
| Authentication | JWT Token (expires: 30 days) |
| Route Protection | `protect` middleware - har request mein token verify |
| Role Based Access | `superAdminOnly` middleware - sirf superadmin ke liye |
| No Public Routes | Sirf `/api/admin/login` public hai, baaki sab protected |
| Unknown Routes | 404 response |

#### Middleware Flow
```
Request aaya
     │
     ▼
protect middleware
     │
     ├── Token hai? NO  → 401 "Not authorized, no token"
     │
     ├── Token valid? NO → 401 "Not authorized, token failed"
     │
     └── Token valid? YES → req.admin set karo → next()
                                │
                          superAdminOnly?
                                │
                          ├── role = superadmin? YES → next()
                          └── role = admin?      NO  → 403 "Access denied"
```

---

## Error Handling

Sabhi errors ek consistent format mein aate hain:

```json
{
  "success": false,
  "message": "Error description here",
  "stack": "..." 
}
```

> `stack` sirf development mode mein aata hai, production mein `null` hota hai.

#### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (role not allowed) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Create first superadmin
npm run seed

# Start development server
npm run dev

# Start production server
npm start
```

---

## Default Credentials

```
URL:      http://localhost:8000
Email:    admin@gadnaapp.com
Password: Admin@123
Role:     superadmin
Database: policeline_App (MongoDB Atlas)
```

---

*Built with ❤️ by Gaurav Gupta | Digicoders Development*