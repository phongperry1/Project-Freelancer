# 🎓 TKU Academic Platform (Project-Freelancer)

> **Comprehensive Online Learning & Academic Management Platform (LMS & E-Learning)**  
> Engineered with a modern Monorepo architecture powered by **React 19**, **NestJS 12**, **Prisma 7**, **PostgreSQL 18**, and **Docker**.

---

## 📑 Table of Contents

- [1. Overview](#1-overview)
- [2. Architecture & Technology Stack](#2-architecture--technology-stack)
- [3. Monorepo Project Structure](#3-monorepo-project-structure)
- [4. Core Subsystems & Key Features](#4-core-subsystems--key-features)
  - [4.1 Authentication & Security Subsystem](#41-authentication--security-subsystem)
  - [4.2 Administrator Portal](#42-administrator-portal)
  - [4.3 Lecturer & Instructor Portal](#43-lecturer--instructor-portal)
  - [4.4 Student Experience & Public Landing Page](#44-student-experience--public-landing-page)
- [5. System Requirements & Prerequisites](#5-system-requirements--prerequisites)
- [6. Environment Variables Configuration (.env)](#6-environment-variables-configuration-env)
- [7. Getting Started & Installation Guide](#7-getting-started--installation-guide)
- [8. Master Scripts Reference](#8-master-scripts-reference)
- [9. Database Architecture (Prisma Schema & ERD)](#9-database-architecture-prisma-schema--erd)
- [10. API Documentation (Swagger OpenAPI)](#10-api-documentation-swagger-openapi)
- [11. Code Quality & Contribution Standards](#11-code-quality--contribution-standards)

---

## 1. Overview

**TKU Academic Platform** is an enterprise-grade learning management and curriculum authoring platform designed to digitize educational administration, course delivery, and student engagement:

- **Administrators**: Centralized oversight of users, teacher course assignments, system-wide analytics, course catalog lifecycle, and content approvals.
- **Lecturers / Instructors**: Real-time teaching dashboards, assigned course management, and an interactive **Curriculum Builder** supporting structured chapters and lessons with a zero-cost, high-performance **YouTube Unlisted** video embedding solution.
- **Students**: Modern learning experience with multi-device protection, session hijacking prevention, interactive course navigation, personal learning notes, and real-time completion tracking.

---

## 2. Architecture & Technology Stack

The project follows an **npm Workspaces Monorepo** pattern, providing clean architectural boundaries between the Backend REST API and the Frontend Web Application:

| Layer / Component | Technology | Version | Purpose & Highlights |
| :--- | :--- | :--- | :--- |
| **Monorepo Manager** | **npm Workspaces** | v10+ | Unified dependency management and synchronized orchestration across packages |
| **Backend Framework** | **NestJS** | v12.0.1 | Modular architecture, Dependency Injection, robust enterprise RESTful API |
| **Runtime Environment** | **Node.js (ESM)** | v20+ / v22+ | Fully executed in native ECMAScript Modules mode (`"type": "module"`) |
| **Database ORM** | **Prisma ORM** | v7.10.0 | Type-safe query engine, automated schema migrations, custom client generation |
| **Database Engine** | **PostgreSQL** | v18-alpine | Relational database engine orchestrated via lightweight Docker containers |
| **Frontend Framework** | **React** | v19.2.8 | Single Page Application (SPA), React 19 concurrent features and modern Hooks |
| **Build & Bundler** | **Vite** | v8.3.0 | Ultra-fast build times, optimized production chunks, instant Hot Module Replacement |
| **Language** | **TypeScript** | v6.0.2 | End-to-end strict static typing across backend and frontend codebases |
| **Routing** | **React Router** | v7.18.4 | Client-side routing, Role-based Protected Routes, Suspense-powered code splitting |
| **Design System** | **Vanilla CSS** | CSS3 | TKU Academic Design System — lightweight, bespoke styling without heavy UI frameworks |
| **Icons & Visuals** | **Lucide React** | v1.47.0 | Modern, consistent academic icon suite with zero runtime overhead |
| **Security & Hashing** | **Argon2 + JWT** | — | Password hashing with Argon2, stateless authorization via Bearer JWT tokens |
| **OAuth Integration** | **Google Identity**| — | Seamless Google Sign-In and developer OAuth modal verification |
| **Mailing Service** | **Nodemailer** | v10.0.10 | Automated email dispatch for 6-digit registration & password reset OTP codes |
| **Cloud Storage** | **Cloudinary** | v2.11.0 | Cloud media processing, compression, and delivery for course thumbnails & avatars |
| **Linter & Tools** | **Oxlint & ESLint** | — | High-speed Rust-based Oxlint for backend and ESLint v9/v10 for frontend |
| **API Documentation** | **Swagger / OpenAPI** | v12.0.1 | Interactive, self-documenting REST API explorer hosted at `/api/docs` |
| **DevOps Container** | **Docker Compose** | Compose v2 | Isolated, reproducible PostgreSQL database environment |

---

## 3. Monorepo Project Structure

```text
Project-Freelancer/
├── apps/
│   ├── api/                           # NestJS Backend Application
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # Database models, relationships, and PostgreSQL indexes
│   │   │   └── migrations/            # Version-controlled database migration history
│   │   ├── src/
│   │   │   ├── admin/                 # Administrator module: User CRUD, Course catalog, Metrics
│   │   │   │   ├── dto/               # Input validation schemas (Data Transfer Objects)
│   │   │   │   ├── admin.controller.ts
│   │   │   │   ├── admin.service.ts
│   │   │   │   └── admin.module.ts
│   │   │   ├── auth/                  # Authentication module: Register, Login, OTP, Device management
│   │   │   │   ├── dto/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.module.ts
│   │   │   ├── lecturer/              # Lecturer module: Dashboard stats, assigned courses, curriculum editor
│   │   │   │   ├── lecturer.controller.ts
│   │   │   │   ├── lecturer.service.ts
│   │   │   │   └── lecturer.module.ts
│   │   │   ├── cloudinary/            # Cloudinary media upload and asset management service
│   │   │   ├── mail/                  # Nodemailer Gmail SMTP integration for OTP delivery
│   │   │   ├── prisma/                # Prisma client provider and lifecycle hooks
│   │   │   ├── generated/             # Auto-generated Prisma Client
│   │   │   ├── app.module.ts          # Root NestJS module connecting all submodules
│   │   │   └── main.ts                # Application bootstrap: CORS, ValidationPipe, Swagger
│   │   ├── test/                      # Unit testing and E2E test suites (Vitest)
│   │   ├── .env                       # Backend environment configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                           # React 19 + Vite Frontend Application
│       ├── public/                    # Static public assets (Favicon, logos, branding)
│       ├── src/
│       │   ├── assets/                # App illustrations and graphic assets
│       │   ├── components/            # Shared reusable UI components
│       │   │   ├── auth/              # AdminRoute, LecturerRoute, GoogleDevModal
│       │   │   └── common/            # LoadingSpinner, RouteTransitionLoader
│       │   ├── context/               # Global React Contexts: AuthContext, ToastProvider, useAuth
│       │   ├── pages/                 # Page-level components
│       │   │   ├── admin/             # Admin portal: Dashboard, Users, Courses, Content manager
│       │   │   ├── auth/              # Auth pages: Login, Register, ForgotPassword, SessionTerminated
│       │   │   ├── error/             # NotFoundPage (404 Error handler)
│       │   │   ├── landing/           # Public Landing Page showcasing TKU academic offerings
│       │   │   └── lecturer/          # Lecturer portal:
│       │   │       ├── LecturerDashboardPage.tsx
│       │   │       ├── LecturerCoursesPage.tsx          # Assigned courses list (Table view)
│       │   │       ├── LecturerCourseCurriculumPage.tsx # Interactive curriculum authoring page
│       │   │       ├── lecturerCourses.css              # Course list styling
│       │   │       └── lecturerCurriculum.css           # Curriculum editor styling
│       │   ├── services/              # HTTP Client services: auth, admin, lecturer
│       │   ├── styles/                # Global CSS rules, resets, and design tokens
│       │   ├── App.tsx                # Client-side routes, role-based guards, code splitting
│       │   ├── main.tsx               # React DOM entrypoint
│       │   └── index.css              # Typography, CSS variables, and design foundation
│       ├── .env                       # Frontend environment configuration
│       ├── package.json
│       └── vite.config.ts
│
├── compose.yaml                       # Docker Compose specification for PostgreSQL 18
├── package.json                       # Monorepo root package: cross-workspace scripts
└── README.md                          # Project documentation
```

---

## 4. Core Subsystems & Key Features

### 4.1 Authentication & Security Subsystem
- **Two-Step Secure Registration**: Validates user credentials, hashes passwords using the **Argon2** algorithm, generates a time-sensitive **6-digit OTP**, and securely delivers it via email.
- **JWT Session Management**: Issues secure pairs of **Access Tokens** and **Refresh Tokens** with standard Bearer authorization.
- **Hardware & Device Protection (`UserDevice`)**:
  - Automatically identifies client devices based on `User-Agent` signatures and IP addresses.
  - Detects unrecognized device logins, enforcing step-up verification or terminating outdated sessions (`SessionTerminatedPage`) to prevent unauthorized account sharing.
- **Google OAuth Integration**: Fast, single-click sign-in via Google Identity Services.
- **Secure Password Reset**: Multi-step identity verification via email OTP before issuing password changes.

### 4.2 Administrator Portal
- **Executive Dashboard**: Real-time statistical metrics displaying total registered users, active students, certified lecturers, published courses, and total lessons.
- **User Management**:
  - Searchable, filterable directory with role filtering (`STUDENT`, `TEACHER`, `ADMIN`) and account status controls (`ACTIVE`, `SUSPENDED`).
  - Account creation, permission configuration, user locking, and bulk user import from Excel files.
- **Course Catalog Management**:
  - Full CRUD operations on courses with assigned lead instructors (`teacherId`).
  - Automated course thumbnail uploading and optimization via Cloudinary.
  - Course status toggling (`ACTIVE` vs. `HIDDEN`) and tuition pricing configuration.
- **Academic Content Oversight**: High-level inspection and structural monitoring of chapters and lessons across the platform.

### 4.3 Lecturer & Instructor Portal
- **Lecturer Analytics Dashboard**: Class-level metrics tracking assigned course loads, active student enrollments, and lesson counts.
- **My Assigned Courses**:
  - Academic table view presenting all courses under the lecturer's direct responsibility.
  - Instant search across titles and descriptions, status filtering, and multi-criteria sorting (`Newest`, `Most Students`, `Most Lessons`).
- **Interactive Curriculum Builder**:
  - **Chapter Management**: Rapid inline chapter creation, in-place title renaming, and safe deletion confirmation dialogs.
  - **Lesson Authoring**: Compose theoretical text lessons or multimedia video lessons.
  - **Optimized YouTube Unlisted Video Delivery (Zero Server Cost)**:
    - Instructors can embed YouTube videos marked as **"Unlisted"**, eliminating video hosting expenses and bandwidth limitations while leveraging Google's global CDN infrastructure.
    - Intelligent URL parser supporting all YouTube variants (`watch?v=`, `youtu.be/`, `shorts/`, `live/`, timestamps) as well as direct 11-character video IDs.
    - Enhanced privacy embedding using `https://www.youtube-nocookie.com` with background recommendations disabled (`rel=0&modestbranding=1`).
    - Integrated in-modal Video Preview player for real-time lesson verification before publishing.

### 4.4 Student Experience & Public Landing Page
- **Landing Page**: Modern academic showcase presenting TKU Chemistry Center's curriculum, faculty highlights, student testimonials, and course discovery.
- **Interactive Learning Track**: Visual lesson progression, personal note-taking (`LessonNote`), and real-time completion tracking (`LessonProgress`).

---

## 5. System Requirements & Prerequisites

Ensure the following prerequisites are installed on your workstation:
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or later
- **Docker** & **Docker Compose**: Required for running the local PostgreSQL container
- **Git**: For source control

---

## 6. Environment Variables Configuration (.env)

The platform requires separate environment files for the Backend and Frontend applications:

### 6.1 Backend API (`apps/api/.env`)

Create `apps/api/.env` with the following configuration:

```env
# 1. NestJS API Port
PORT=3000

# 2. PostgreSQL Database Connection (matches compose.yaml configuration)
DATABASE_URL="postgresql://postgres:postgres_dev_password@localhost:5433/learning_platform?schema=public"

# 3. JSON Web Token (JWT) Secret
JWT_SECRET="your_super_secret_jwt_key_tku_2026"

# 4. Nodemailer Gmail SMTP Configuration (for OTP dispatch)
MAIL_USER="your-email@gmail.com"
MAIL_PASS="your-16-character-google-app-password"
MAIL_FROM="TKU Chemistry Center <your-email@gmail.com>"

# 5. Google Identity (OAuth 2.0 Client ID)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# 6. Cloudinary Media Storage Credentials
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

### 6.2 Frontend Web (`apps/web/.env`)

Create `apps/web/.env` with the following configuration:

```env
# Backend REST API Base Endpoint
VITE_API_URL="http://localhost:3000/api/v1"

# Google Client ID for Client-Side Google Sign-In
VITE_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
```

---

## 7. Getting Started & Installation Guide

Follow these steps from the root workspace directory (`Project-Freelancer`):

### Step 1: Install All Monorepo Dependencies
```bash
npm install
```
*This command leverages npm workspaces to resolve and install dependencies across root, `apps/api`, and `apps/web` simultaneously.*

### Step 2: Start the PostgreSQL Container
```bash
npm run docker:up
```
*Spins up an isolated PostgreSQL 18 Alpine instance exposed on port `localhost:5433`.*

### Step 3: Run Database Migrations & Generate Prisma Client
```bash
# Generate the custom-typed Prisma Client
npm run prisma:generate

# Apply migrations to your PostgreSQL database
npm run prisma:migrate
```
*(Optional: Launch Prisma Studio's visual database GUI via `npm run prisma:studio` at `http://localhost:5555`).*

### Step 4: Start the Development Servers

Run the backend and frontend concurrently:

```bash
# Terminal 1 - Start the NestJS Backend API (Port 3000)
npm run dev:api

# Terminal 2 - Start the React + Vite Frontend (Port 5173)
npm run dev:web
```

Open your browser to:
- **Web Application**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3000](http://localhost:3000)
- **Interactive Swagger Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## 8. Master Scripts Reference

Key operations available from the root `package.json`:

| Command | Action & Scope |
| :--- | :--- |
| `npm run dev:api` | Starts the NestJS API server in hot-reload watch mode (`nest start --watch`) |
| `npm run dev:web` | Starts the Vite development server with instant HMR (`vite`) |
| `npm run build:api` | Compiles TypeScript and builds production artifacts for the API (`nest build`) |
| `npm run build:web` | Validates TypeScript types and bundles frontend assets (`tsc -b && vite build`) |
| `npm run build` | Builds both API and Web applications for production deployment |
| `npm run docker:up` | Starts the background PostgreSQL container (`docker compose up -d`) |
| `npm run docker:down` | Gracefully stops and shuts down Docker containers (`docker compose down`) |
| `npm run prisma:generate` | Regenerates the typed Prisma Client from `schema.prisma` |
| `npm run prisma:migrate` | Synchronizes pending database migrations (`prisma migrate dev`) |
| `npm run prisma:studio` | Launches Prisma Studio visual data browser |
| `npm run test:api` | Executes backend unit and integration test suites with Vitest |

---

## 9. Database Architecture (Prisma Schema & ERD)

The database adheres to Third Normal Form (3NF) relational standards defined in [apps/api/prisma/schema.prisma](file:///d:/Project%20Freelance/Project-Freelancer/apps/api/prisma/schema.prisma):

```mermaid
erDiagram
    User ||--o{ UserDevice : "owns"
    User ||--o{ AuthToken : "issues"
    User ||--o{ Course : "instructs (teacherId)"
    User ||--o{ CourseEnrollment : "enrolls in"
    User ||--o{ LessonProgress : "records progress"
    User ||--o{ LessonNote : "writes notes"
    User ||--o{ AssessmentSubmission : "submits"
    
    Course ||--o{ Chapter : "contains"
    Course ||--o{ CourseEnrollment : "registers"
    
    Chapter ||--o{ Lesson : "contains"
    Chapter ||--o{ Assessment : "evaluates through"
    
    Lesson ||--o{ LessonProgress : "tracks"
    Lesson ||--o{ LessonNote : "has notes"
    
    Assessment ||--o{ Question : "contains"
    Assessment ||--o{ AssessmentSubmission : "evaluates"
    
    Question ||--o{ QuestionOption : "provides choices"
```

### Core Entities:
1. **User**: User profiles, credentials, role categorization (`STUDENT`, `TEACHER`, `ADMIN`), and account statuses (`ACTIVE`, `SUSPENDED`).
2. **UserDevice**: Hardware fingerprinting (`deviceFingerprint`), operating system details, IP tracing, and concurrent session tracking.
3. **Course**: Master course catalog records, assigned lead teachers, tuition fees, student enrollment tallies, and visibility states (`ACTIVE`, `HIDDEN`).
4. **Chapter**: Structural syllabus modules sequenced by `sortOrder`.
5. **Lesson**: Granular learning units containing written lecture notes (`content`), embedded video links (`videoUrl`), and relative sequence numbers (`sortOrder`).
6. **Assessment & Question**: Quizzes, tests, and examination engines supporting multiple choice and text evaluations.
7. **CourseEnrollment & LessonProgress**: Student enrollment tracking and real-time progress percentages.

---

## 10. API Documentation (Swagger OpenAPI)

The NestJS backend includes built-in OpenAPI 3.0 documentation:
- Accessible at: **`http://localhost:3000/api/docs`**
- Interactive specifications covering:
  - Request bodies and typed DTO schemas
  - Standardized response payloads (`200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict`)
  - Built-in **Authorize** functionality to test JWT Bearer authenticated endpoints directly in the browser.

---

## 11. Code Quality & Contribution Standards

To maintain clean, performant, and reliable code across the monorepo:

1. **Pre-commit Linter & Typechecks**:
   ```bash
   # Backend Linter (Oxlint)
   npm --prefix apps/api run lint

   # Frontend Linter (ESLint)
   npm --prefix apps/web run lint

   # Verify Production Builds
   npm run build
   ```

2. **Branching & Commit Conventions**:
   - Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:
     - `feat(scope): new feature description` (e.g., `feat(lecturer): Manage content for lecturer FE`)
     - `fix(scope): bug fix description` (e.g., `fix(auth): Resolve device token expiration`)
     - `refactor(scope): code improvements with no behavioral changes`
     - `docs(scope): documentation updates`

---

<p align="center">
  Engineered and maintained by the <strong>TKU Academic Engineering Team</strong> © 2026.
</p>