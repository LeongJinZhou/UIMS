# UIMS — University Integrated Management System

> A unified, AI-augmented management platform for University — connecting students, lecturers, coordinators, HR, Finance, and the Exam Division into one interconnected ecosystem.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTS                              │
│   ┌──────────────┐          ┌────────────────────┐      │
│   │  Web (React) │          │  Mobile (Expo/RN)  │      │
│   │  Vite + TW   │          │  (Phase 7)         │      │
│   └──────┬───────┘          └────────┬───────────┘      │
│          │                           │                   │
│          └──────────┬────────────────┘                   │
│                     │ REST + GraphQL + WebSocket         │
│          ┌──────────▼──────────┐                         │
│          │  Nginx Reverse Proxy │                        │
│          └──┬──────────────┬───┘                         │
│             │              │                             │
│   ┌─────────▼─────┐  ┌────▼──────────────┐             │
│   │  NestJS API   │  │  FastAPI Solver   │             │
│   │  (Node.js 20) │──│  (Google OR-Tools)│             │
│   └───┬───┬───┬───┘  └──────────────────┘             │
│       │   │   │                                        │
│  ┌────▼┐ ┌▼───▼┐ ┌──────┐                             │
│  │ PG  │ │Redis│ │MinIO │                              │
│  │ 16  │ │  7  │ │ (S3) │                              │
│  └─────┘ └─────┘ └──────┘                              │
└────────────────────────────────────────────────────────┘
```

## 📦 Project Structure

```
UniversityProgram/
├── apps/
│   ├── web/          # React 18 + Vite + shadcn/ui + Tailwind
│   ├── api/          # NestJS backend (REST + GraphQL)
│   └── solver/       # Python FastAPI + OR-Tools
├── packages/
│   ├── shared-types/      # TypeScript types
│   ├── shared-utils/      # Utility functions
│   └── shared-constants/  # Constants & enums
├── prisma/
│   ├── schema.prisma      # Full database schema
│   └── seed.ts            # Dummy data seeder
├── docker/
│   ├── docker-compose.yml # PostgreSQL, Redis, MinIO
│   ├── Dockerfile.api
│   ├── Dockerfile.solver
│   └── nginx/nginx.conf
└── .github/workflows/ci.yml
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** (check: `node -v`)
- **pnpm 9+** (`npm i -g pnpm`)
- **Docker** (for PostgreSQL, Redis, MinIO)
- **Python 3.12+** (for the solver service)

### 1. Clone & Install

```bash
cd UniversityProgram
cp .env.example .env    # Edit with your values
pnpm install            # Install all dependencies
```

### 2. Start Infrastructure

```bash
pnpm docker:up          # Starts PostgreSQL, Redis, MinIO
```

### 3. Set Up Database

```bash
pnpm db:generate        # Generate Prisma client
pnpm db:push            # Push schema to PostgreSQL
pnpm db:seed            # Seed with dummy data
```

### 4. Start Development

```bash
# Terminal 1 — Web app
pnpm --filter @uims/web dev

# Terminal 2 — API
pnpm --filter @uims/api dev

# Terminal 3 — Solver (Python)
cd apps/solver
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Or start everything at once:
```bash
pnpm dev
```

### 5. Access

| Service | URL |
|---------|-----|
| Web App | http://localhost:5173 |
| API | http://localhost:3000 |
| Solver | http://localhost:8000/solver/docs |
| API Docs | http://localhost:3000/api |
| MinIO Console | http://localhost:9001 |
| Prisma Studio | `pnpm db:studio` |

## 📋 System Modules

| # | Module | Status | Description |
|---|--------|--------|-------------|
| M01 | Programme & MQA | 🟡 Scaffolded | MQA-approved course structures |
| M02 | Student Profile | 🟡 Scaffolded | Academic plans, GPA, graduation tracking |
| M03 | Course Engine | 🟡 Scaffolded | Prerequisites, equivalencies |
| M04 | Timetable | 🟡 Scaffolded | AI constraint solver |
| M05 | Venue Manager | 🟡 Scaffolded | Floor plans, room management |
| M06 | Exam & Results | 🟡 Scaffolded | Result release, retake plans |
| M07 | Enrolment | 🟡 Scaffolded | Registration, drop/add |
| M08 | HR | 🟡 Scaffolded | Lecturer management |
| M09 | Finance | 🟡 Scaffolded | Fees, billing, payments |
| M10 | Notifications | 🟡 Scaffolded | Push/email/SMS, appeals |

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web Frontend** | React 18, Vite, shadcn/ui, Tailwind CSS, Zustand, React Query |
| **Mobile** | React Native (Expo) — Phase 7 |
| **Backend** | NestJS, TypeScript, REST + GraphQL, JWT + RBAC |
| **Database** | PostgreSQL 16, Prisma ORM, Redis, pgvector |
| **AI/ML** | Claude API, OpenAI Embeddings, OR-Tools, scikit-learn |
| **Infrastructure** | Docker, Nginx, GitHub Actions |
| **Storage** | MinIO (S3-compatible) |

## 📜 Available Commands

```bash
pnpm dev              # Start all services
pnpm build            # Build all packages
pnpm lint             # Lint all code
pnpm type-check       # TypeScript type checking
pnpm test             # Run all tests
pnpm docker:up        # Start infrastructure
pnpm docker:down      # Stop infrastructure
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to DB
pnpm db:migrate       # Create migration
pnpm db:seed          # Seed dummy data
pnpm db:studio        # Open Prisma Studio
```

## 📄 License

CONFIDENTIAL — Internal University Document. All rights reserved.
