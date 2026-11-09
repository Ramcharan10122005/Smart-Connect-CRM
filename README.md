# SmartConnect CRM

SmartConnect CRM is a modern, high-performance customer relationship management system engineered with React 18, Vite, Tailwind CSS, Express, and Prisma ORM with PostgreSQL.

## System Architecture

```text
smartconnect/
├── client/        # Vite + React 18 SPA (Tailwind CSS, TanStack Query, Zustand)
├── server/        # Express.js (ESM) + Prisma ORM + PostgreSQL
├── package.json   # Workspaces definition & root scripts
└── PROJECT_CONTEXT.md
```

## Quick Start

### 1. Environment Configuration

Copy the example environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Servers

Run both backend (`localhost:5000`) and frontend (`localhost:5173`) concurrently:

```bash
npm run dev
```

Or run them individually:

```bash
npm run dev:server   # Starts Express backend on port 5000 with nodemon
npm run dev:client   # Starts Vite React dev server on port 5173 with proxy
```

### 4. Quality & Linting

```bash
npm run lint         # Runs ESLint across both workspaces
npm run format       # Runs Prettier formatting
```
