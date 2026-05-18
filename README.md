# UIMS — University Integrated Management System

![UIMS Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Tech Stack](https://img.shields.io/badge/stack-React_|_NestJS_|_Prisma_|_PostgreSQL-success.svg)

## Overview

The **University Integrated Management System (UIMS)** is a comprehensive, AI-augmented platform designed to unify academic operations into a single source of truth. By interconnecting every academic stakeholder—students, lecturers, coordinators, HR, Finance, and the Exam Division—UIMS eliminates fragmented legacy portals and automates the most labour-intensive university workflows.

## Key Benefits to the University

UIMS is designed not just as a database, but as an operational engine that actively works to improve university administration:

1. **AI-Driven Academic Operations**
   - **Automated Retake Scheduling:** Instantly generates graduation-compliant retake plans for students following exam results, drastically reducing manual coordinator workload.
   - **Intelligent Timetabling:** A constraint-based AI solver generates conflict-free timetables that optimize room capacities, lecturer availability, and student comfort while enforcing prerequisite rules.

2. **Streamlined Compliance & Accreditation**
   - **MQA Alignment:** Digitizes and enforces approved curriculum structures, ensuring every student's pathway is strictly compliant.
   - **Automated Reporting:** Pulls real-time pass rates, completion timelines, and delivery data directly into accreditation templates.

3. **Enhanced Student Experience**
   - **Zero Timetable Clashes:** Guarantees students a seamless registration and class attendance experience.
   - **RAG Student Advisor:** Provides a 24/7 AI chatbot capable of answering complex, prerequisite-aware academic planning questions.
   - **Predictive Support:** Flags students demonstrating early academic difficulty via registration patterns to enable proactive advisor intervention.

4. **Resource & Cost Optimization**
   - **Smart Venue Management:** Merges cross-programme equivalent subjects into combined classes to optimize lecturer loads and maximize room utilization.
   - **Instant Cancellation Recovery:** Suggests the least disruptive replacement slots when a class is cancelled, minimizing downtime.

## System Architecture

UIMS is built using a modern, scalable monorepo architecture:

- **Frontend (Web):** React 18, Vite, Tailwind CSS v4, shadcn/ui.
- **Frontend (Mobile):** React Native (Expo) for cross-platform access.
- **Backend (API):** Node.js 20 LTS, NestJS (REST + GraphQL hybrid), Bull queues.
- **Timetable Engine:** Python (FastAPI) wrapping the Google OR-Tools constraint solver.
- **Database Layer:** PostgreSQL 16 with Prisma ORM, Redis for caching, and pgvector for AI embeddings.

## Getting Started (Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v9+)
- [Docker Desktop](https://www.docker.com/)
- [Python 3.12+](https://www.python.org/)

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start external services (PostgreSQL, Redis) via Docker:**
   ```bash
   pnpm docker:up
   ```

3. **Setup Database:**
   ```bash
   cp .env.example .env
   pnpm db:push
   pnpm db:seed
   ```

4. **Run the Development Servers:**
   ```bash
   pnpm dev
   ```
   *The Web app will be available at `http://localhost:5173` and the API at `http://localhost:3000`.*

---

*This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.*
