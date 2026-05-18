# UIMS — University Integrated Management System

**Project Blueprint & Technical Specification**
*Version 1.0 | 2025*

## 1. Executive Summary
The University is a growing institution hosting six faculties and over 50 programmes across three annual intakes (April, July, October). Academic operations currently rely on fragmented tools — a legacy student portal, a disconnected mobile app, and manual coordination workflows between the Exam Division, Head of Programme (HoP), Programme Coordinators (PC), HR, and Finance.

UIMS is a unified, AI-augmented Integrated Management System designed to replace this fragmentation with a single source of truth. The system interconnects every academic stakeholder and automates the most labour-intensive workflows: timetable generation, student academic plan management, prerequisite enforcement, retake scheduling, and accreditation compliance tracking.

The project is to be built by a single developer and deployed as both a web platform and a mobile application.

## 2. System Objectives
- Digitise and enforce approved course structures for every programme, mapping fixed semester-by-semester plans for every intake cohort.
- Automate student academic plan management — detecting failures, inserting retake subjects into future semesters while preserving graduation timelines and credit limits.
- Generate conflict-free timetables that honour room capacity, lecturer availability, student schedule constraints, prerequisite dependencies, and credit-hour limits (20 long / 10 short semester; 21 with appeal).
- Provide a real-time venue and resource management layer backed by a digital campus floor plan.
- Connect all university divisions through one authenticated platform with role-based access.
- Embed AI assistance to pre-generate timetables, flag at-risk students, answer student queries via a prerequisite-aware chatbot, and pre-assess appeal cases — all requiring human sign-off before execution.
- Deliver the system on both web and mobile.

## 3. Scope
- 6 Faculties, 50+ programmes (expandable), 3 standard intakes + special intakes.
- 10 core modules.
- AI-powered HoP/PC automation layer.
- Web application (React) + Mobile application (React Native).
- Dummy data environment → live University database migration path.

## 4. Stakeholders & Roles
- **Student**: Register, view plan, drop/add, appeal, chat with AI advisor.
- **Lecturer**: View timetable, log cancellation, find replacement slot.
- **Programme Coordinator (PC)**: Review AI-generated plans, approve retake schedules.
- **Head of Programme (HoP)**: Approve timetables, handle appeals, override AI decisions.
- **Exam Division**: Release results, trigger retake logic.
- **HR**: Manage lecturer contracts, availability.
- **Finance**: Fee tracking, credit-hour billing, appeals.
- **Registry / Admin**: Document management, programme updates.

## 5. System Modules (10 Core)
1. **M01: Programme & Repository** - Store all approved course structures per programme, intake, and version.
2. **M02: Student Academic Profile** - Student registration, full study plan, credit history, GPA, graduation tracker.
3. **M03: Course & Prerequisite Engine** - Define courses, link prerequisites, map equivalencies.
4. **M04: Timetable Generator** - AI constraint-solver generates conflict-free timetables.
5. **M05: Venue & Resource Manager** - Floor plan, room capacity, equipment tags, real-time availability.
6. **M06: Exam & Results Module** - Releases results; auto-triggers retake plan generation.
7. **M07: Enrolment & Registration** - Semester registration, drop/add, credit limit enforcement.
8. **M08: HR & Lecturer Management** - Staff records, teaching load, availability, leave management.
9. **M09: Finance & Fees Module** - Credit-hour billing, retake fees, appeal surcharges.
10. **M10: Notifications & Appeals** - Push/email alerts, overload appeals (21 cr), prerequisite waivers.

## 6. Timetabling & Academic Plan Logic
### 6.1 University Academic Calendar
Three fixed semesters per calendar year:
- **Semester 1 (Nov-Apr)**: Long Semester (max 20 cr). Oct intake.
- **Semester 2 (Apr-Jul)**: Long Semester (max 20 cr). Apr intake.
- **Semester 3 (Jul-Nov)**: Short Semester (max 10 cr). Jul intake.
MBBS and Pharmacy programmes operate on a Non-Standard Calendar.

### 6.2 Retake Scheduling Logic
- Retake subjects do NOT replace the original plan; they are layered on top.
- **Algorithm**: The AI finds available credit headroom in future semesters, attempts to slot retakes, and cascades lower-priority courses forward if credit limits are reached.
- **Extension Semester Rule**: If the AI cannot fit all courses within standard duration, an extension semester is added before Industrial Training.

### 6.3 HoP Course Offering Schedule
The Head of Programme defines the authoritative list of subjects and assigned lecturers for the upcoming semester. Only subjects on this list can be timetabled.

### 6.4 Cross-Programme Class Merging
Academically equivalent subjects are merged into one section with a combined headcount to optimize lecturer load and room usage.

### 6.5 Constraint Solver Rules
- **Hard constraints**: No double booking, room capacity not exceeded, required equipment available, prerequisite rules honored, credit limits enforced.
- **Soft constraints**: Minimize student campus days, avoid long idle gaps, distribute classes, avoid consecutive lecturer back-to-backs.

## 7. AI Architecture & Trust Model
All AI decisions follow a **generate → review → approve → publish** pipeline. The AI never directly modifies live records without human confirmation.
- **Retake Plan**: PC reviews → HoP approves.
- **Timetable**: HoP approves before publish.
- **Cancellation Slot**: Lecturer selects and confirms.
- **Appeal Pre-assessment**: HoP makes final decision.

## 8. Technology Stack
- **Frontend (Web)**: React 18, Vite, shadcn/ui, Tailwind CSS, Zustand, React Query, React Router v6.
- **Frontend (Mobile)**: React Native (Expo).
- **Backend**: Node.js 20 LTS, NestJS, REST + GraphQL (hybrid), Bull queues, Socket.io.
- **Database**: PostgreSQL 16, Prisma ORM, Redis, Meilisearch, pgvector (for RAG).
- **AI/ML**: Claude API (claude-sonnet-4), OpenAI Embeddings, Google OR-Tools (Timetable Solver via Python/FastAPI), Scikit-learn (At-risk model).
- **Infrastructure**: Docker, Nginx, GitHub Actions, MinIO (S3-compatible).

## 9. Phased Development Plan (~50 weeks)
1. **Phase 1 (~8 wks)**: DB Schema, M01 (Programme), M03 (Course Engine), RBAC, Auth.
2. **Phase 2 (~10 wks)**: M04 (Timetable Engine via OR-Tools), M05 (Venue/Floor Plan), HoP schedules.
3. **Phase 3 (~8 wks)**: M02 (Student Profile), M06 (Results/Retakes), Retake insertion algorithm.
4. **Phase 4 (~6 wks)**: M07 (Enrolment, Drop/Add, Credit Limits).
5. **Phase 5 (~5 wks)**: M08 (HR), M09 (Finance), M10 (Notifications/Appeals).
6. **Phase 6 (~5 wks)**: AI Layer (RAG Chatbot, At-risk model, Report drafting).
7. **Phase 7 (~5 wks)**: React Native Mobile App.
8. **Phase 8 (~3 wks)**: Production hardening, QA, go-live.

## 10. AI-Era Enhancements
1. Predictive At-Risk Detection
2. RAG Student Advisor Chatbot
3. Smart Timetable Explainability
4. Automated Accreditation Report Drafting
5. Lecturer Replacement with Impact Score
6. Intake Cohort Simulation
7. AI Appeal Pre-Assessment
8. Digital Twin Campus Map

## 11. Glossary
- **HoP**: Head of Programme.
- **PC**: Programme Coordinator.
- **CSP**: Constraint Satisfaction Problem (OR-Tools framework).
- **RAG**: Retrieval-Augmented Generation.
- **RBAC**: Role-Based Access Control.
