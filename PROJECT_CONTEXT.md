# SmartConnect CRM — Project Context & Architecture Guide

## 1. Project Overview & Core Vision

SmartConnect CRM is a clean, modern, production-quality web CRM engineered to centralize customer data, manage leads and pipeline progression, track multichannel activities, automate follow-up workflows, and deliver actionable business intelligence.

- **Design Philosophy**: High-polish aesthetic inspired by Linear and Attio, combined with robust, conversion-focused CRM capabilities inspired by HubSpot and Pipedrive.
- **Visual Design**: Inter font, Indigo primary (`#4F46E5`), slate neutrals, 8px spacing grid, 10px corner radius on cards and controls, subtle borders, delicate shadows, comprehensive light and dark modes via CSS variables.
- **UX Invariants**: Every view provides dedicated loading skeletons, empty states with actionable CTAs, resilient error states, and responsive layouts (mobile viewport up to 1920px wide).

---

## 2. Tech Stack (Fixed)

### Frontend

- **Runtime & Bundler**: Vite + React 18 (JavaScript, ES modules)
- **Styling**: Tailwind CSS + custom CSS variables for theme switching
- **Routing**: React Router v6
- **Server State & Data Fetching**: TanStack Query (React Query)
- **Forms & Validation**: React Hook Form + Zod
- **Client State**: Zustand (for app state) + React Context (`ThemeContext`)
- **Visualizations**: Recharts
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (Kanban boards)
- **Icons & Feedback**: Lucide React (`lucide-react`), Sonner (toast notifications), Framer Motion (subtle interactions only)

### Backend

- **Runtime**: Node.js 20 (ES modules)
- **Framework**: Express.js (Entry point: `server/index.js`)
- **Server-Rendered Templates**: EJS (for public lead capture, email previews, and printable summaries)
- **Database ORM**: Prisma ORM with PostgreSQL
- **Security & Authentication**: bcrypt (password hashing), JWT stored in secure `httpOnly` cookies, strict CORS/CSRF protections
- **Validation**: Zod schema validation on all incoming payload boundaries
- **Background Tasks**: node-cron (automated follow-up reminders, recurring tasks, digests)
- **Email Delivery**: Nodemailer (transactional emails, invites, notifications)

---

## 3. Users, Roles & Access Control (RBAC)

Role is represented directly as a Prisma enum: `Role { ADMIN, MANAGER, REP }`.

- **ADMIN**: Unrestricted access across the system: team management, user provisioning, invitation handling, pipeline configuration, system settings, global data access, and auditing.
- **MANAGER**: Full visibility into team records: manages all companies, contacts, leads, and follow-ups; inspects performance dashboards, sales leaderboards, and aggregate reports.
- **REP (Sales Rep)**: Scoped visibility: view and edit permissions strictly limited to records owned by or assigned to them.
- **Authentication & Provisioning**:
  - **No public self-registration**.
  - **First-run `/setup` flow**: Active only when zero users exist in the database to provision the initial system Admin.
  - **Admin Invites**: Subsequent users are invited by an Admin. The invitee receives an invitation link (`/accept-invite/:token`) allowing them to securely set their password and activate their account.

---

## 4. Core Modules & Domain Rules

1. **Customers (Customer 360)**
   - Companies and Contacts hierarchy.
   - Tags, dedicated account owner, linked leads, activity history, and follow-up timeline.
   - _Note_: There is no separate "Deal" model; Leads are the exclusive pipeline entity. Custom fields are excluded.
2. **Leads & Pipeline**
   - Configurable pipeline stages.
   - Priority enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT` (shared with FollowUp).
   - Interactive Kanban board (`dnd-kit`) with optimistic UI updates.
   - Automated lead scoring, stage progression history, win/loss tracking with reason capture.
   - **Conversion**: Converting a qualified lead creates a `Contact` (and links/creates an associated `Company` if applicable).
3. **Activities**
   - Calls, emails, meetings, and notes.
   - Automatic system audit events (stage changes, ownership reassignments).
   - Unified chronological timeline with rich filtering.
4. **Follow-ups (Formerly Tasks)**
   - Named `FollowUp` consistently across database models, APIs, and UI components.
   - Priority enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
   - Due dates, completion status, snooze controls, recurrence rules, and scheduled notifications.
5. **Dashboard & Analytics**
   - Revenue and pipeline KPIs, conversion funnel charts, sales rep leaderboard, activity velocity.
   - Export capabilities (CSV formats).
6. **Platform Features**
   - **Notifications**: In-app notifications served via periodic client polling (refetching every 30–60s via TanStack Query), not WebSockets.
   - Global fuzzy search across Leads, Contacts, and Companies.
   - CSV bulk import/export with schema validation.
   - Standalone public lead-capture form rendered via EJS.

---

## 5. Architectural Standards & Engineering Invariants

- **API Base Path**: `/api/v1`
- **Response Envelope**: Standardized across all endpoints:
  ```json
  {
    "success": true,
    "data": {},
    "error": null,
    "meta": {}
  }
  ```
- **Layered Architecture**: Strict single-direction dependency flow:
  `Routes -> Controllers -> Services -> Prisma`
  No direct business logic or database queries inside route handlers.
- **Validation**: Zod schemas validate both server request bodies/queries and client-side form submissions.
- **Security First**: All authorizations enforce record ownership and role checks on the server; client-side state is never trusted.
- **Configuration**: Exclusively via environment variables loaded from `.env` (with `.env.example` committed).
- **Code Standards**: Production code only. Zero placeholder stubs, zero fake implementations, zero unhandled TODOs.

---

## 6. Directory Structure

```text
smartconnect/
├── .env.example
├── .gitignore
├── package.json                         # Root workspace scripts (dev, test, prisma, build)
├── README.md
├── PROJECT_CONTEXT.md                   # System specification & architecture baseline
│
├── server/                              # Node.js 20 + Express + Prisma (ESM)
│   ├── prisma/
│   │   ├── schema.prisma                # Database schema (Enum Role, FollowUp, Lead, etc.)
│   │   ├── migrations/                  # Database migration files
│   │   └── seed.js                      # Realistic seed data across ADMIN, MANAGER, REP
│   ├── public/
│   │   └── css/                         # CSS stylesheets for EJS server-rendered templates
│   ├── src/
│   │   ├── config/                      # Environment, Prisma client, nodemailer, logger
│   │   ├── constants/                   # Roles, lead stages, priority enums, HTTP codes
│   │   ├── controllers/                 # Express request/response coordinators
│   │   ├── jobs/                        # node-cron scheduled reminders & digests
│   │   ├── middleware/                  # JWT auth, RBAC guard, Zod validator, error handler
│   │   ├── routes/                      # API endpoint definitions mounted at /api/v1
│   │   ├── services/                    # Business logic and database operations
│   │   ├── utils/                       # Token generators, envelope builders, CSV utils
│   │   ├── validators/                  # Zod validation schemas
│   │   ├── views/                       # EJS templates
│   │   │   ├── layouts/                 # Base layout wrappers
│   │   │   ├── partials/                # Reusable template components (nav, headers, footer)
│   │   │   ├── emails/                  # Transactional email templates (invites, reminders)
│   │   │   ├── public/                  # Public lead-capture forms
│   │   │   └── print/                   # Printable summary reports
│   │   └── app.js                       # Express application configuration & middleware
│   ├── tests/                           # Backend integration & unit test suites
│   └── index.js                         # Application entrypoint & HTTP server lifecycle (server.js alias)
│
└── client/                              # Vite + React 18 SPA (ESM + Tailwind CSS)
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── src/
    │   ├── assets/                      # Static branding, logos, icons
    │   ├── components/
    │   │   ├── common/                  # (Equivalent to components/ui): Buttons, inputs, dialogs, badges
    │   │   ├── feedback/                # Skeletons, empty states, error boundaries, toasts
    │   │   ├── layout/                  # AppShell, TopNavbar, Sidebar, Breadcrumbs
    │   │   └── kanban/                  # dnd-kit columns, cards, droppable containers
    │   ├── context/
    │   │   └── ThemeContext.jsx         # Light/dark mode state & DOM attribute synchronization
    │   ├── hooks/                       # Custom hooks (useAuth, useDebounce, useMediaQuery)
    │   ├── lib/                         # (Equivalent to src/api): api.js (Axios instance), queryClient.js
    │   ├── pages/
    │   │   ├── auth/                    # Login, Setup (/setup first-run), Accept Invite (/accept-invite/:token)
    │   │   ├── dashboard/               # Metric cards, charts, rep leaderboard
    │   │   ├── customers/               # Companies, Contacts, Customer 360 profile
    │   │   ├── leads/                   # Kanban pipeline board, list view, lead scoring
    │   │   ├── activities/              # Omnichannel activity timeline & log drawer
    │   │   ├── follow-ups/              # FollowUp items, snooze, priority filters
    │   │   ├── reports/                 # Pipeline analytics, conversion velocity, CSV export
    │   │   └── settings/                # Team management, user invites, pipeline stage configuration
    │   ├── routes/                      # Route definitions, ProtectedRoute, RoleGuard
    │   ├── stores/                      # (Equivalent to src/store): Zustand stores
    │   ├── styles/                      # Tailwind layers, Inter typography, theme color variables
    │   ├── test/                        # Client-side component & hook test suites
    │   ├── validators/                  # Client-side Zod validation schemas
    │   ├── App.jsx
    │   └── main.jsx
```

---

## 7. Aliases & Conventions Mapping

For cross-referencing and prompt compatibility:

- `components/ui` $\iff$ `components/common`
- `src/api` $\iff$ `src/lib` (Axios client lives in `src/lib/api.js`)
- `src/store` $\iff$ `src/stores`
- `server.js` $\iff$ `server/index.js` (entry point)
- Theme state is managed in `src/context/ThemeContext.jsx`
- Entity naming convention: `FollowUp` is strictly used instead of `Task`.
- Priority Enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT` across both `FollowUp` and `Lead`.
- Notification transport: Polling every 30–60 seconds via TanStack Query.
