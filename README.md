# CaloFit — AI-Powered Meal & Calorie Tracking App

CaloFit is a production-grade, modular web application designed to track user nutrition and daily calories using AI-based image recognition. Built with a focus on simplicity, scalability, and performance.

---

## 🚀 Architecture Overview

CaloFit is structured as a lightweight monorepo separating Backend and Frontend services:

```
calofit/
├── apps/
│   ├── backend/         # NestJS, Prisma ORM, PostgreSQL, OpenAI API, Supabase Storage
│   └── frontend/        # Next.js 16 (App Router), React 19, Tailwind CSS v4, next-intl
├── .github/
│   └── workflows/
│       └── ci.yml       # Automated CI validation pipeline
└── README.md
```

---

## 🛠️ Technology Stack

### Backend (`apps/backend`)
- **Framework:** [NestJS](https://nestjs.com/) (TypeScript)
- **Database ORM:** [Prisma ORM](https://www.prisma.io/) with PostgreSQL
- **Security:** Passport.js JWT with Refresh Token rotation, Argon2id password hashing, Helmet, and Cookie-Parser
- **AI integration:** OpenAI Vision API (`gpt-4o`) with structured JSON schema responses
- **File Storage:** Supabase Storage (private bucket with signed URL delivery)
- **Validation & Parsing:** class-validator & Zod schemas

### Frontend (`apps/frontend`)
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Style:** Vanilla CSS with [Tailwind CSS v4](https://tailwindcss.com/)
- **State & Server Cache:** [TanStack React Query v5](https://tanstack.com/query)
- **Internationalization:** [next-intl](https://next-intl-docs.vercel.app/) (O'zbek, Русский, English)
- **Client:** Axios with automated request queueing for seamless token refreshing
- **Forms:** React Hook Form

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- PostgreSQL database instance (or Docker)

### 1. Database Setup (Local Docker PostgreSQL)
To start a local PostgreSQL container, run:
```bash
docker run --name calofit-db \
  -e POSTGRES_DB=calofit \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:16-alpine
```

### 2. Backend Configuration
1. Navigate to backend:
   ```bash
   cd apps/backend
   ```
2. Copy env file and fill variables:
   ```bash
   cp .env.example .env
   ```
3. Install packages and generate database client:
   ```bash
   npm install
   # Run migrations (local)
   npx prisma migrate dev
   ```
4. Start development server:
   ```bash
   npm run start:dev
   ```
   *Swagger API Documentation will be available at:* `http://localhost:3000/api/docs`

### 3. Frontend Configuration
1. Navigate to frontend:
   ```bash
   cd apps/frontend
   ```
2. Copy env file:
   ```bash
   cp .env.local.example .env.local
   ```
3. Install packages:
   ```bash
   npm install
   ```
4. Start Next.js development server:
   ```bash
   npm run dev
   ```
   *The application will be accessible at:* `http://localhost:3001`

---

## ⚡ Deployment Guidelines

- **Database:** Deploy PostgreSQL instance on Neon.tech (fully serverless and scales to zero).
- **Backend:** Deploy on Railway.app. The workspace contains a standard multi-stage `Dockerfile` and `railway.json` featuring built-in health-checks and database migrations deployment on startup.
- **Frontend:** Deploy on Vercel. Standard security headers and optimization parameters are included in `vercel.json`.
