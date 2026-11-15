# System Limitations & Future Scope

This document provides a transparent, code-evidenced assessment of current technical limitations in SmartConnect CRM and outlines a prioritized engineering roadmap for future iterations.

---

## 1. Architectural & Technical Limitations

### 1.1 Outbound-Only Email (No Inbound Inbox Sync)
- **Current State**: The email engine (`server/src/services/emailSend.service.js`) delivers outbound emails via Nodemailer using configured SMTP credentials and records the sent message in the `EmailLog` and `Activity` timeline.
- **Limitation**: There is no inbound mail synchronization (e.g., via IMAP, POP3, or Gmail/Microsoft Graph webhooks). When a prospect replies to an email, their response does not automatically appear in the customer timeline and must be logged manually as a note or activity by the representative.

### 1.2 Client Polling Instead of Real-Time WebSockets
- **Current State**: Navigation badges (e.g. `NotificationsMenu.jsx`) and dashboards rely on HTTP polling with TanStack Query (`refetchInterval: 30000`).
- **Limitation**: Updates made by one sales representative (such as claiming a lead or advancing a pipeline deal) do not reflect instantly on other active users' screens without a query invalidation or manual page refresh.

### 1.3 Single-Tenant Architecture
- **Current State**: The PostgreSQL database schema models users, roles, and business data under a unified global schema.
- **Limitation**: The current system is designed as a single-workspace CRM. It does not contain an `organizationId` or `workspaceId` partition on tables, precluding multi-tenant SaaS hosting without separate database instances.

### 1.4 Individual Messaging (No Mass Marketing Campaigns)
- **Current State**: Emails are sent individually through Customer 360, the lead details drawer, or event-driven automation rules (`SEND_EMAIL_TEMPLATE`).
- **Limitation**: The platform does not support mass email broadcast campaigns, newsletter list segmentation, or asynchronous queue-based batching (e.g. BullMQ / Redis).

### 1.5 Frontend Test Suite Gaps
- **Current State**: The repository features 90 integration tests running on the Node.js native test runner and Supertest, validating backend controllers, Prisma queries, auth boundaries, automations, and EJS views.
- **Limitation**: The React client currently lacks isolated Vitest or React Testing Library unit tests; frontend regression prevention relies on TypeScript-level ESLint validation, production bundle audits, and end-to-end API integration tests.

### 1.6 File Upload Storage
- **Current State**: CSV imports and file attachments use Multer memory/local disk storage.
- **Limitation**: File assets are not offloaded to an S3-compatible cloud object store, limiting horizontal scaling across container replicas without a shared volume.

### 1.7 Single-Currency Pipeline
- **Current State**: Monetary valuations in the pipeline and analytics reports format numbers using the default USD locale.
- **Limitation**: Multi-currency exchange rate tables and international currency conversions are not currently supported.

---

## 2. Prioritized Future Roadmap

| Priority | Milestone | Description | Complexity |
| :--- | :--- | :--- | :--- |
| **P1** | **Real-Time WebSockets (Socket.io)** | Replace 30-second polling with WebSocket push events for live notifications, collaborative Kanban card locking, and instant team chat. | Medium |
| **P2** | **Inbound Email Sync (IMAP / Webhooks)** | Integrate Gmail and Microsoft Outlook OAuth2 APIs to parse inbound replies directly into the customer activity stream. | High |
| **P3** | **Client Component Testing Suite** | Integrate Vitest and `@testing-library/react` to establish full unit and snapshot test coverage for UI modals, forms, and charts. | Medium |
| **P4** | **Multi-Tenancy & Workspace Partitioning** | Introduce `Organization` entity with composite tenant indexing across all tables to support multi-tenant SaaS deployment. | High |
| **P5** | **Cloud Storage (S3 / Cloudflare R2)** | Migrate Multer file handling to presigned S3 uploads for scalable document and attachment management. | Low |
| **P6** | **Bulk Marketing & Campaign Analytics** | Build bulk email broadcast queues with background job workers (BullMQ), bounce tracking, and open/click telemetry. | High |
| **P7** | **Multi-Currency & Regionalization** | Support custom currency symbols, automated daily exchange rate feeds, and user-level timezone localization. | Medium |

