# CLAUDE.md — Project Context for Claude Code

## Project Identity
This is **UIMS (University Integrated Management System)** — an AI-augmented, monorepo-based university management platform.

## On Every Session Start
1. Read `.planning/STATE.md` to understand current progress and active tasks.
2. Read `.planning/ROADMAP.md` to understand the full development plan.
3. Check the current phase's plan file (e.g., `.planning/PHASE_2_PLAN.md`) for detailed tasks.
4. Resume work on the first uncompleted active task from `STATE.md`.

## Architecture
- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: `apps/web/` — React 18, Vite, Tailwind CSS v4, shadcn/ui
- **Backend**: `apps/api/` — NestJS 11, Prisma ORM, JWT + RBAC
- **Solver**: `apps/solver/` — Python FastAPI + Google OR-Tools (timetable constraint solver)
- **Shared**: `packages/shared-types/`, `packages/shared-constants/`, `packages/shared-utils/`
- **Database**: PostgreSQL 16 + pgvector, Redis
- **Schema**: `prisma/schema.prisma` (30+ models, 10 modules)

## Key Rules
- **No QIU references**: Use "University" or "university" everywhere. Never write "QIU" or "Quest International University".
- **Auto-push**: After completing any task, always `git add . && git commit -m "descriptive message" && git push`.
- **AI Trust Model**: All AI actions follow generate → review → approve → publish. AI never modifies live records without human confirmation.
- **Update STATE.md**: After completing tasks, update `.planning/STATE.md` to reflect progress.

## Tech Stack Summary
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Backend Framework | NestJS 11 |
| ORM | Prisma 6 |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand + React Query |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis |
| Solver | Python 3.12, FastAPI, OR-Tools |
| Auth | JWT + Passport.js + RBAC |
| CI/CD | GitHub Actions |

## Commands
```bash
pnpm dev          # Start all dev servers
pnpm build        # Build all packages
pnpm db:push      # Push Prisma schema
pnpm db:seed      # Seed dummy data
pnpm sync         # Git add + commit + push
pnpm docker:up    # Start PostgreSQL + Redis
```

## Module Map (10 Core)
- M01: Programme & Repository
- M02: Student Academic Profile
- M03: Course & Prerequisite Engine
- M04: Timetable Generator
- M05: Venue & Resource Manager
- M06: Exam & Results Module
- M07: Enrolment & Registration
- M08: HR & Lecturer Management
- M09: Finance & Fees Module
- M10: Notifications & Appeals
