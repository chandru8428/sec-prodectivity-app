# EduSync — Architecture Overview

> **Version**: 2.0.0 | **Last Updated**: 2026-05-27

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Browser Client                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ main.js  │→ │ router.js│→ │ Features │→ │ Components │  │
│  │(bootstrap)│  │(hash SPA)│  │ (pages)  │  │  (UI kit)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│        ↓              ↓             ↓                        │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                    Services Layer                        ││
│  │  auth-service │ firestore-service │ github-service       ││
│  │  cloudinary-service │ timetable-ai                       ││
│  └──────────────────────────────────────────────────────────┘│
│        ↓              ↓             ↓                        │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                    Lib / Adapters                        ││
│  │  firebase.js │ supabase.js │ supabase-adapter.js         ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
        ↓                    ↓                    ↓
  ┌───────────┐      ┌───────────┐      ┌───────────────┐
  │ Firebase  │      │ Supabase  │      │ External APIs │
  │ Auth/DB   │      │ PostgreSQL│      │ NVIDIA/GitHub  │
  └───────────┘      └───────────┘      └───────────────┘
```

## Directory Structure

```
src/
├── app/             → Application bootstrap (main.js, router.js)
├── components/      → Reusable UI components
│   ├── layout/      → Sidebar, Topbar
│   ├── ui/          → Toast, Modal, Loader, Chart
│   └── shared/      → Composite reusable components
├── features/        → Feature modules (one folder per feature)
│   ├── auth/        → Login, Register, Forgot Password
│   ├── dashboard/   → Student & Admin dashboards
│   ├── timetable/   → Exam timetable, AI scheduler, upload
│   ├── gpa/         → GPA Calculator
│   ├── attendance/  → Attendance Tracker
│   ├── qa-board/    → Q&A Board + Moderation
│   ├── record-book/ → Record Book PDF Generator
│   ├── profile/     → User Profile + Settings
│   ├── calendar/    → Academic Calendar
│   ├── students/    → Student Management (admin)
│   └── repo-mapping/→ GitHub Repo Mapping (admin)
├── services/        → External API interfaces
├── lib/             → SDK initialization (Firebase, Supabase)
├── utils/           → Pure utility functions
├── config/          → App constants and configuration
├── styles/          → Global CSS design system
└── types/           → JSDoc type definitions
```

## Feature Map

| Feature | Student | Admin | Location |
|---|---|---|---|
| Dashboard | ✅ | ✅ | `features/dashboard/` |
| Exam Timetable | ✅ (view) | ✅ (upload) | `features/timetable/` |
| AI Schedule Crafter | ✅ | — | `features/timetable/` |
| GPA Calculator | ✅ | — | `features/gpa/` |
| Q&A Board | ✅ | ✅ (moderate) | `features/qa-board/` |
| Record Book PDF | ✅ | — | `features/record-book/` |
| Attendance Tracker | ✅ | — | `features/attendance/` |
| Profile | ✅ | — | `features/profile/` |
| Academic Calendar | — | ✅ | `features/calendar/` |
| Student Management | — | ✅ | `features/students/` |
| Repo Mapping | — | ✅ | `features/repo-mapping/` |

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript (ES Modules) |
| Build | Vite 6.0 |
| Auth | Firebase Auth + Supabase Auth |
| Database | Firestore + Supabase PostgreSQL |
| Charts | Chart.js 4.x |
| PDF | jsPDF + html2canvas + pdfjs-dist |
| Icons | Lucide (inline SVG) |
| Deployment | Firebase Hosting |
| AI | NVIDIA API (timetable generation) |
