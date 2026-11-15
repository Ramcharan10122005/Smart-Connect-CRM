import pptxgen from 'pptxgenjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const screenshotsDir = path.join(rootDir, 'results', 'screenshots');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9'; // 13.33 x 7.5 inches
pptx.author = 'Kundena Ramcharan, Nambaru Lehari, Bhogi Sharan sai, Harshavardhan';
pptx.company = 'SmartConnect CRM Academic Project';
pptx.title = 'SmartConnect CRM - Full-Stack Enterprise Relationship Management & Automation Platform';

// Unified Dark Theme Colors matching presentation.html exactly
const C = {
  bg: '0B0F19',          // --bg: #0b0f19
  cardBg: '111827',      // --card-bg: #111827
  cardBorder: '1F2937',  // --card-border: #1f2937
  cardInner: '1E293B',   // card inner background
  primary: '6366F1',     // --primary: #6366f1
  primaryLight: '818CF8',// --primary-light: #818cf8
  accent: '06B6D4',      // --accent: #06b6d4
  success: '10B981',     // --success: #10b981
  warning: 'F59E0B',     // --warning: #f59e0b
  danger: 'EF4444',      // --danger: #ef4444
  text: 'F3F4F6',        // --text: #f3f4f6
  textMuted: '9CA3AF',   // --text-muted: #9ca3af
  white: 'FFFFFF',
};

// Standard Slide Header matching HTML layout
function addSlideHeader(slide, category, title) {
  slide.addText(category.toUpperCase(), {
    x: 0.8,
    y: 0.38,
    w: 11.7,
    h: 0.28,
    fontSize: 10,
    fontFace: 'Arial',
    bold: true,
    color: C.primaryLight,
    letterSpacing: 2,
  });

  slide.addText(title, {
    x: 0.8,
    y: 0.65,
    w: 11.7,
    h: 0.55,
    fontSize: 22,
    fontFace: 'Arial',
    bold: true,
    color: C.white,
  });

  // Subtle border line
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 1.25,
    w: 11.7,
    h: 0.015,
    fill: { color: C.cardBorder },
    line: { color: C.cardBorder },
  });
}

// -------------------------------------------------------------
// SLIDE 1: Title Slide (Dark Theme with Team & GitHub Repo)
// -------------------------------------------------------------
const slide1 = pptx.addSlide();
slide1.background = { color: C.bg };

// Category Badge
slide1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8, y: 0.7, w: 4.6, h: 0.35,
  fill: { color: '4338CA' }, line: { color: C.primaryLight, width: 1 },
});
slide1.addText('ACADEMIC CAPSTONE PROJECT & TECHNICAL DEFENSE', {
  x: 0.8, y: 0.7, w: 4.6, h: 0.35,
  fontSize: 9, fontFace: 'Arial', bold: true, color: C.white, align: 'center',
});

// Title
slide1.addText('SmartConnect CRM', {
  x: 0.8, y: 1.15, w: 11.7, h: 0.95,
  fontSize: 44, fontFace: 'Arial', bold: true, color: C.white,
});

// Subtitle
slide1.addText('Full-Stack Enterprise Relationship Management, Visual Deal Pipeline & Sales Automation Platform', {
  x: 0.8, y: 2.1, w: 11.7, h: 0.5,
  fontSize: 15, fontFace: 'Arial', color: C.textMuted,
});

// Left Card: Architecture & Stack
slide1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8, y: 2.8, w: 5.7, h: 4.1,
  fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
});
slide1.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 2.8, w: 0.1, h: 4.1,
  fill: { color: C.primary }, line: { color: C.primary },
});
slide1.addText('System Architecture & Stack', {
  x: 1.1, y: 3.0, w: 5.2, h: 0.35,
  fontSize: 15, fontFace: 'Arial', bold: true, color: C.primaryLight,
});
slide1.addText([
  { text: '• Frontend: ', options: { bold: true, color: C.white } },
  { text: 'React 18, Vite, Tailwind CSS, Radix UI Primitives\n', options: { color: C.textMuted } },
  { text: '• State Layer: ', options: { bold: true, color: C.white } },
  { text: 'TanStack Query v5 (caching & polling), Zustand stores\n', options: { color: C.textMuted } },
  { text: '• Backend: ', options: { bold: true, color: C.white } },
  { text: 'Node.js Express (ESM), Zod validation, Helmet security\n', options: { color: C.textMuted } },
  { text: '• Database: ', options: { bold: true, color: C.white } },
  { text: 'PostgreSQL with Prisma ORM (20 relational models)\n', options: { color: C.textMuted } },
  { text: '• Subsystems: ', options: { bold: true, color: C.white } },
  { text: 'Nodemailer (SMTP), node-cron schedulers, Automation engine\n\n', options: { color: C.textMuted } },
  { text: 'GitHub Repository:\n', options: { bold: true, color: C.accent } },
  { text: 'https://github.com/Ramcharan10122005/Smart-Connect-CRM', options: { color: '60A5FA', underline: true } },
], {
  x: 1.1, y: 3.4, w: 5.2, h: 3.3,
  fontSize: 11, fontFace: 'Arial', lineSpacingMultiple: 1.25,
});

// Right Card: Team Members
slide1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.8, y: 2.8, w: 5.7, h: 4.1,
  fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
});
slide1.addShape(pptx.shapes.RECTANGLE, {
  x: 6.8, y: 2.8, w: 0.1, h: 4.1,
  fill: { color: C.accent }, line: { color: C.accent },
});
slide1.addText('Project Team Members', {
  x: 7.1, y: 3.0, w: 5.2, h: 0.35,
  fontSize: 15, fontFace: 'Arial', bold: true, color: C.accent,
});

const teamMembers = [
  { name: 'Kundena Ramcharan', roll: '202311047', role: 'Full-Stack Architecture & Security' },
  { name: 'Nambaru Lehari', roll: '202311056', role: 'Frontend Engineering & UI Systems' },
  { name: 'Bhogi Sharan sai', roll: '202311022', role: 'Database Design & Automations' },
  { name: 'Harshavardhan', roll: '202311091', role: 'Integration Testing & Analytics' },
];

teamMembers.forEach((m, idx) => {
  const memberY = 3.45 + idx * 0.72;
  slide1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 7.1, y: memberY, w: 5.2, h: 0.62,
    fill: { color: C.cardInner }, line: { color: C.cardBorder, width: 1 },
  });
  slide1.addText(`${m.name} (${m.roll})`, {
    x: 7.25, y: memberY + 0.08, w: 4.9, h: 0.26,
    fontSize: 12, fontFace: 'Arial', bold: true, color: C.white,
  });
  slide1.addText(m.role, {
    x: 7.25, y: memberY + 0.32, w: 4.9, h: 0.22,
    fontSize: 10, fontFace: 'Arial', color: C.textMuted,
  });
});

slide1.addText('Quality Assurance: 90 / 90 Integration Tests Passed (100%)', {
  x: 7.1, y: 6.4, w: 5.2, h: 0.35,
  fontSize: 10.5, fontFace: 'Arial', bold: true, color: C.success,
});

// -------------------------------------------------------------
// SLIDE 2: Problem Statement & Motivation
// -------------------------------------------------------------
const slide2 = pptx.addSlide();
slide2.background = { color: C.bg };
addSlideHeader(slide2, 'Executive Summary', 'Real-World Problem Statement & Motivation');

slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8, y: 1.5, w: 5.7, h: 5.4,
  fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
});
slide2.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.5, w: 0.1, h: 5.4,
  fill: { color: C.danger }, line: { color: C.danger },
});
slide2.addText('Industry Operational Bottlenecks', {
  x: 1.1, y: 1.7, w: 5.2, h: 0.35,
  fontSize: 15, bold: true, color: 'F87171', fontFace: 'Arial',
});
slide2.addText([
  { text: '• Fragmented Customer Data:\n', options: { bold: true, color: C.white } },
  { text: 'Customer contacts, past emails, and notes are trapped in personal spreadsheets and scattered inboxes with zero shared access.\n\n', options: { color: C.textMuted } },
  { text: '• Lost Leads & Delayed SLA Response:\n', options: { bold: true, color: C.white } },
  { text: 'Inbound web prospects sit unassigned for days without immediate routing, causing competitor defection and lost deal conversion.\n\n', options: { color: C.textMuted } },
  { text: '• Missed Follow-up Commitments:\n', options: { bold: true, color: C.white } },
  { text: 'Reps lack automated reminder notifications, leading to missed client calls and broken sales momentum.\n\n', options: { color: C.textMuted } },
  { text: '• Zero Executive Pipeline Visibility:\n', options: { bold: true, color: C.white } },
  { text: 'Leadership lacks real-time insight into deal stages, stage durations, and conversion drop-offs.', options: { color: C.textMuted } },
], { x: 1.1, y: 2.1, w: 5.2, h: 4.6, fontSize: 11, fontFace: 'Arial', lineSpacingMultiple: 1.2 });

slide2.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.8, y: 1.5, w: 5.7, h: 5.4,
  fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
});
slide2.addShape(pptx.shapes.RECTANGLE, {
  x: 6.8, y: 1.5, w: 0.1, h: 5.4,
  fill: { color: C.primaryLight }, line: { color: C.primaryLight },
});
slide2.addText('SmartConnect CRM Solution', {
  x: 7.1, y: 1.7, w: 5.2, h: 0.35,
  fontSize: 15, bold: true, color: C.primaryLight, fontFace: 'Arial',
});
slide2.addText([
  { text: '• Customer 360 Source of Truth:\n', options: { bold: true, color: C.white } },
  { text: 'Unifies contacts, company relationships, deal pipelines, and activity timelines into one ACID-compliant database.\n\n', options: { color: C.textMuted } },
  { text: '• Interactive Visual Pipeline:\n', options: { bold: true, color: C.white } },
  { text: 'Drag-and-drop Kanban progression with stage weights, deal valuations, and conversion workflows.\n\n', options: { color: C.textMuted } },
  { text: '• Autonomous Background Schedulers:\n', options: { bold: true, color: C.white } },
  { text: 'Node-cron tasks check upcoming tasks every 5 minutes, auto un-snooze tasks, and dispatch 08:00 AM daily briefings.\n\n', options: { color: C.textMuted } },
  { text: '• Event-Driven Automation Engine:\n', options: { bold: true, color: C.white } },
  { text: 'Trigger-condition-action workflow rules with re-entry loop guards, round-robin rep assignment, and dynamic templated emails.', options: { color: C.textMuted } },
], { x: 7.1, y: 2.1, w: 5.2, h: 4.6, fontSize: 11, fontFace: 'Arial', lineSpacingMultiple: 1.2 });

// -------------------------------------------------------------
// SLIDE 3: System Architecture & Separation of Concerns
// -------------------------------------------------------------
const slide3 = pptx.addSlide();
slide3.background = { color: C.bg };
addSlideHeader(slide3, 'Technical Specifications', 'Layered System Architecture & Separation of Concerns');

const archLayers = [
  { num: '1', title: 'Presentation Tier (React 18 SPA + Vite)', color: '6366F1', tech: 'React 18 | Tailwind CSS | Radix UI Primitives | TanStack Query v5 | Zustand Stores', desc: 'Fast, responsive Single Page Application with theme tokenization (Light/Dark mode), declarative data caching, and optimistic UI transitions.' },
  { num: '2', title: 'Network & Security Tier (Express Middleware)', color: '0284C7', tech: 'Helmet | CORS | CookieParser | Express Rate-Limit | Zod Schema Validation', desc: 'Hardened HTTP pipeline enforcing JWT session cookies, request rate limiting (50 emails/hr), and strict runtime schema sanitization.' },
  { num: '3', title: 'Domain Logic & Services Tier (Layered Services)', color: '059669', tech: 'Lead Service | Contact Service | Automation Engine | Mailer Service | Audit Service', desc: 'Enforces business rules, row-level RBAC scoping (scopeByOwner), audit logging on every lifecycle mutation, and template rendering.' },
  { num: '4', title: 'Persistence Tier (PostgreSQL + Prisma ORM)', color: '7C3AED', tech: 'PostgreSQL Relational DB | Prisma Client | 20 Relational Models | ACID Transactions', desc: 'Guarantees referential integrity with foreign key cascades, migration versioning, connection pooling, and atomic prisma.$transaction blocks.' },
];

archLayers.forEach((l, idx) => {
  const yPos = 1.5 + idx * 1.35;
  slide3.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: yPos, w: 11.7, h: 1.2,
    fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
  });
  slide3.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: yPos, w: 0.1, h: 1.2,
    fill: { color: l.color }, line: { color: l.color },
  });
  slide3.addText(l.title, {
    x: 1.1, y: yPos + 0.12, w: 6.5, h: 0.3,
    fontSize: 14, fontFace: 'Arial', bold: true, color: C.white,
  });
  slide3.addText(l.tech, {
    x: 1.1, y: yPos + 0.42, w: 11.2, h: 0.28,
    fontSize: 10, fontFace: 'Arial', bold: true, color: C.accent,
  });
  slide3.addText(l.desc, {
    x: 1.1, y: yPos + 0.72, w: 11.2, h: 0.38,
    fontSize: 10.5, fontFace: 'Arial', color: C.textMuted,
  });
});

// Helper for Screenshot Slides
function addScreenshotSlide(slide, category, title, imageFile, cardTitle, points) {
  slide.background = { color: C.bg };
  addSlideHeader(slide, category, title);

  const imgPath = path.join(screenshotsDir, imageFile);
  if (fs.existsSync(imgPath)) {
    // Add image container border
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: 1.5, w: 7.1, h: 5.4,
      fill: { color: '000000' }, line: { color: C.cardBorder, width: 1 },
    });
    slide.addImage({
      path: imgPath,
      x: 0.82, y: 1.52, w: 7.06, h: 5.36,
    });
  }

  // Right info card
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 8.2, y: 1.5, w: 4.3, h: 5.4,
    fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 8.2, y: 1.5, w: 0.1, h: 5.4,
    fill: { color: C.primaryLight }, line: { color: C.primaryLight },
  });
  slide.addText(cardTitle, {
    x: 8.5, y: 1.7, w: 3.8, h: 0.35,
    fontSize: 15, bold: true, color: C.primaryLight, fontFace: 'Arial',
  });

  const textRuns = [];
  points.forEach((p) => {
    textRuns.push({ text: `• ${p.title}:\n`, options: { bold: true, color: C.white } });
    textRuns.push({ text: `${p.desc}\n\n`, options: { color: C.textMuted } });
  });

  slide.addText(textRuns, {
    x: 8.5, y: 2.1, w: 3.8, h: 4.6,
    fontSize: 10.5, fontFace: 'Arial', lineSpacingMultiple: 1.15,
  });
}

// -------------------------------------------------------------
// SLIDE 4: Dashboard & Analytics
// -------------------------------------------------------------
const slide4 = pptx.addSlide();
addScreenshotSlide(
  slide4,
  'Core Modules',
  'Executive Dashboard & Real-Time Performance Analytics',
  '02-dashboard-light.png',
  'Analytics Capabilities',
  [
    { title: 'Live KPI Summary Cards', desc: 'Instant aggregate calculations for Pipeline Value ($), Deals Won, Active Leads, and Overdue Tasks.' },
    { title: 'Interactive Recharts Series', desc: 'Visualizes deal distribution across stages, monthly revenue velocity, and inbound lead sources.' },
    { title: 'Gamified Team Leaderboard', desc: 'Ranks sales representatives by closed-won revenue and activity counts to incentivize performance.' },
    { title: 'Role-Scoped Visibility', desc: 'Reps view their own portfolio; Admins & Managers inspect company-wide aggregate metrics.' },
    { title: 'Persistent Theme System', desc: 'One-click toggle between high-contrast Light and Dark modes with localStorage persistence.' },
  ]
);

// -------------------------------------------------------------
// SLIDE 5: Visual Kanban Sales Pipeline
// -------------------------------------------------------------
const slide5 = pptx.addSlide();
addScreenshotSlide(
  slide5,
  'Core Modules',
  'Visual Kanban Sales Pipeline & Deal Velocity',
  '06-leads-kanban-light.png',
  'Pipeline Capabilities',
  [
    { title: 'Fluid Drag-and-Drop (@dnd-kit)', desc: 'Smooth drag-and-drop progression across customizable stages: New, Qualified, Proposal, Won, Lost.' },
    { title: 'Audit Stage History', desc: 'Every stage transition commits a LeadStageHistory record tracking days spent in each stage.' },
    { title: 'Weighted Revenue Forecasting', desc: 'Dynamic calculations multiply stage win probabilities against deal values for forecast accuracy.' },
    { title: 'Lead Drawer Sheet', desc: 'Clicking any card slides out full deal details, associated contacts, and stage transition actions.' },
    { title: 'Closed-Won Confetti', desc: 'Moving deals to Won fires celebratory canvas-confetti and emits automation lifecycle triggers.' },
  ]
);

// -------------------------------------------------------------
// SLIDE 6: Customer 360 & Timeline Stream
// -------------------------------------------------------------
const slide6 = pptx.addSlide();
addScreenshotSlide(
  slide6,
  'Core Modules',
  'Customer 360 Profile & Unified Activity Timeline',
  '05-customer-360.png',
  'Relationship Intelligence',
  [
    { title: 'Single Source of Truth', desc: 'Aggregates contact details, company relationship hierarchy, open deals, and active tasks into one pane.' },
    { title: 'Unified Audit Stream', desc: 'Chronological timeline uniting phone calls, meetings, notes, and emails with author badges.' },
    { title: 'Direct Email Composer', desc: 'Send templated emails directly from the customer sheet with dynamic variable interpolation.' },
    { title: 'Print-Ready Profile', desc: 'Server-rendered route (/print/contact/:id) optimized for paper and PDF executive briefing printouts.' },
  ]
);

// -------------------------------------------------------------
// SLIDE 7: Follow-Ups & FullCalendar Integration
// -------------------------------------------------------------
const slide7 = pptx.addSlide();
addScreenshotSlide(
  slide7,
  'Task Management',
  'Follow-Up Task Scheduling & Interactive Calendar',
  '10-followups-calendar.png',
  'Task Orchestration',
  [
    { title: 'Dual-Mode Interface', desc: 'Switch instantly between an actionable table list and a FullCalendar monthly/weekly schedule grid.' },
    { title: 'Smart Snooze Presets', desc: 'One-click snooze presets (1 Hour, Tomorrow, Next Week) with automated un-snooze background cron.' },
    { title: 'Task Reassignment', desc: 'Managers can reassign follow-ups across sales reps with instant in-app notification alerts.' },
    { title: 'Recurring Follow-ups', desc: 'Completing a recurring follow-up automatically provisions the next scheduled occurrence.' },
  ]
);

// -------------------------------------------------------------
// SLIDE 8: Event-Driven Automation Engine
// -------------------------------------------------------------
const slide8 = pptx.addSlide();
slide8.background = { color: C.bg };
addSlideHeader(slide8, 'Workflow Automation', 'Event-Driven Automation Engine & Safeguards');

const autoCols = [
  {
    title: 'Supported Triggers',
    color: C.accent,
    items: [
      { t: 'LEAD_CREATED', d: 'Inbound web form or manual entry.' },
      { t: 'LEAD_STAGE_CHANGED', d: 'Pipeline drag-and-drop moves.' },
      { t: 'CONTACT_CREATED', d: 'New contact record additions.' },
      { t: 'LEAD_STALE_IN_STAGE', d: 'Hourly scan for deals idle X days.' },
      { t: 'FOLLOWUP_OVERDUE', d: 'Hourly scan for overdue tasks.' },
    ],
  },
  {
    title: 'Automated Actions',
    color: C.primaryLight,
    items: [
      { t: 'CREATE_FOLLOWUP', d: 'Auto-due in X days for deal owner.' },
      { t: 'SEND_EMAIL_TEMPLATE', d: 'Dynamic email dispatch to contact.' },
      { t: 'ASSIGN_OWNER', d: 'Fair round-robin rep distribution.' },
      { t: 'ADD_TAG', d: 'Automated categorical tagging.' },
      { t: 'NOTIFY_USER', d: 'High-priority in-app alerts.' },
    ],
  },
  {
    title: 'Safety Safeguards',
    color: C.success,
    items: [
      { t: 'Loop Guard', d: 'In-memory re-entry registry & chain depth limiter (max 5) prevents recursive loops.' },
      { t: 'Rate Limiter', d: 'Capped at 100 executions per rule per hour to safeguard mailers.' },
      { t: 'Strict Idempotency', d: 'All executions logged to AutomationLog; rules never fire twice for same record.' },
    ],
  },
];

autoCols.forEach((col, idx) => {
  const xPos = 0.8 + idx * 4.0;
  slide8.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: xPos, y: 1.5, w: 3.7, h: 5.4,
    fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
  });
  slide8.addShape(pptx.shapes.RECTANGLE, {
    x: xPos, y: 1.5, w: 0.1, h: 5.4,
    fill: { color: col.color }, line: { color: col.color },
  });
  slide8.addText(col.title, {
    x: xPos + 0.25, y: 1.7, w: 3.3, h: 0.35,
    fontSize: 15, bold: true, color: col.color, fontFace: 'Arial',
  });

  const runs = [];
  col.items.forEach((it) => {
    runs.push({ text: `• ${it.t}:\n`, options: { bold: true, color: C.white } });
    runs.push({ text: `${it.d}\n\n`, options: { color: C.textMuted } });
  });

  slide8.addText(runs, {
    x: xPos + 0.25, y: 2.1, w: 3.3, h: 4.6,
    fontSize: 10, fontFace: 'Arial', lineSpacingMultiple: 1.15,
  });
});

// -------------------------------------------------------------
// SLIDE 9: Security & Three-Tier RBAC
// -------------------------------------------------------------
const slide9 = pptx.addSlide();
addScreenshotSlide(
  slide9,
  'Security Architecture',
  'Authentication & Three-Tier Role-Based Access Control',
  '14-rep-restricted-access.png',
  'Role Hierarchy & Security',
  [
    { title: 'ADMIN Tier', desc: 'Global control: user invites, deactivations, pipeline stages, system automations, and audit logs.' },
    { title: 'MANAGER Tier', desc: 'Team-wide visibility: reads all deals, contacts, activities, and templates; coaches team members.' },
    { title: 'SALES REP Tier', desc: 'Row-level ownership: views and edits only records where ownerId = user.id. Admin tabs stripped (as shown in screenshot).' },
    { title: 'HTTP-only JWT Cookies', desc: 'Tokens stored in HTTP-only, SameSite=Lax cookies, immune to JavaScript XSS theft.' },
  ]
);

// -------------------------------------------------------------
// SLIDE 10: Email System & Opt-Out Handling
// -------------------------------------------------------------
const slide10 = pptx.addSlide();
addScreenshotSlide(
  slide10,
  'Communication Engine',
  'Templated Email Dispatch & Unsubscribe Compliance',
  '13-settings.png',
  'Compliance & Templates',
  [
    { title: 'Dynamic Merge Variables', desc: 'Supports {{firstName}}, {{lastName}}, {{companyName}}, {{ownerName}} with robust fallbacks.' },
    { title: 'SMTP Nodemailer Transport', desc: 'Configurable SMTP host, TLS/SSL ports, and sales rep Reply-To header customization.' },
    { title: 'Unsubscribe Token Verification', desc: 'Every outgoing email includes a signed JWT token linking to public EJS /unsubscribe/:token.' },
    { title: 'Automatic Opt-Out Blocking', desc: 'Contacts with emailOptOut = true are strictly blocked from future automated sends.' },
  ]
);

// -------------------------------------------------------------
// SLIDE 11: Real Engineering Challenges & Fixes
// -------------------------------------------------------------
const slide11 = pptx.addSlide();
slide11.background = { color: C.bg };
addSlideHeader(slide11, 'Software Engineering Practice', 'Key Engineering Challenges & Engineered Solutions');

const challengeItems = [
  {
    title: '1. Notifications Dropdown Desync',
    cause: 'Client query read res.data.data.items while API returned direct array; checked !item.read instead of readAt.',
    fix: 'Standardized query to accept array directly and mapped read: Boolean(readAt) in notification.service.js.',
  },
  {
    title: '2. Radix UI Slot Child Collision',
    cause: '<Button asChild> injected a conditional spinner alongside children, violating Radix single-child rule.',
    fix: 'Conditionally bypassed spinner wrapper when asChild=true to render pure single React element.',
  },
  {
    title: '3. Unparsed Template Variables in Dispatched Emails',
    cause: 'Modal previewed variables client-side but sent raw template body; backend sent directly without parsing.',
    fix: 'Implemented shared renderTemplateVariables resolving contact/lead variables before SMTP send.',
  },
];

challengeItems.forEach((c, idx) => {
  const yPos = 1.5 + idx * 1.8;
  slide11.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: yPos, w: 11.7, h: 1.6,
    fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
  });
  slide11.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: yPos, w: 0.1, h: 1.6,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  slide11.addText(c.title, {
    x: 1.1, y: yPos + 0.15, w: 11.0, h: 0.35,
    fontSize: 14, bold: true, color: C.accent, fontFace: 'Arial',
  });
  slide11.addText([
    { text: 'Root Cause: ', options: { bold: true, color: 'F87171' } },
    { text: c.cause + '\n', options: { color: C.text } },
    { text: 'Engineered Fix: ', options: { bold: true, color: C.success } },
    { text: c.fix, options: { color: C.textMuted } },
  ], {
    x: 1.1, y: yPos + 0.55, w: 11.0, h: 0.95,
    fontSize: 11, fontFace: 'Arial', lineSpacingMultiple: 1.2,
  });
});

// -------------------------------------------------------------
// SLIDE 12: Quality Assurance & Automated Test Results
// -------------------------------------------------------------
const slide12 = pptx.addSlide();
slide12.background = { color: C.bg };
addSlideHeader(slide12, 'Verification & Validation', 'Automated Test Results & Code Quality Verification');

const statsBoxes = [
  { val: '12 / 12', label: 'Test Suites Passed', color: C.primaryLight },
  { val: '90 / 90', label: 'Tests Passed', color: C.primaryLight },
  { val: '100%', label: 'Pass Rate', color: C.success },
  { val: '~2.08s', label: 'Execution Time', color: C.accent },
];

statsBoxes.forEach((s, idx) => {
  const xPos = 0.8 + idx * 3.0;
  slide12.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: xPos, y: 1.5, w: 2.7, h: 1.15,
    fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
  });
  slide12.addText(s.val, {
    x: xPos, y: 1.62, w: 2.7, h: 0.5,
    fontSize: 24, bold: true, color: s.color, align: 'center', fontFace: 'Arial',
  });
  slide12.addText(s.label, {
    x: xPos, y: 2.15, w: 2.7, h: 0.35,
    fontSize: 11, color: C.textMuted, align: 'center', fontFace: 'Arial',
  });
});

const testTableRows = [
  ['Activities & Follow-ups Module Integration', '8 / 8 PASS', 'Supertest + Prisma'],
  ['Analytics, Dashboard, Reports & CSV Data-Exchange', '14 / 14 PASS', 'Supertest + Prisma'],
  ['Authentication, Sessions & Role-Based Access Control', '14 / 14 PASS', 'Supertest + JWT'],
  ['Automation Engine, Triggers & Loop Safeguards', '6 / 6 PASS', 'Supertest + Engine'],
  ['Contacts, Companies Directory & Bulk Tagging', '8 / 8 PASS', 'Supertest + DB'],
  ['Email Delivery, Templates & Unsubscribe Token Handling', '7 / 7 PASS', 'Supertest + Mailer'],
  ['Leads Pipeline, Stages, Drag-and-Drop & Conversions', '9 / 9 PASS', 'Supertest + Prisma'],
  ['Notifications & Background Cron Schedulers', '8 / 8 PASS', 'Supertest + Cron'],
  ['Server-Rendered EJS Views, Public Forms & Print View', '8 / 8 PASS', 'Supertest + EJS'],
];

slide12.addTable([
  [
    { text: 'Integration Test Suite', options: { bold: true, fill: { color: '1F2937' }, color: C.white } },
    { text: 'Result', options: { bold: true, fill: { color: '1F2937' }, color: C.white } },
    { text: 'Harness', options: { bold: true, fill: { color: '1F2937' }, color: C.white } },
  ],
  ...testTableRows.map((r) => [
    { text: r[0], options: { fontSize: 9.5, color: C.text, fill: { color: C.cardBg } } },
    { text: r[1], options: { fontSize: 9.5, bold: true, color: C.success, fill: { color: C.cardBg } } },
    { text: r[2], options: { fontSize: 9.5, color: C.textMuted, fill: { color: C.cardBg } } },
  ]),
], {
  x: 0.8, y: 2.85, w: 11.7, h: 4.0,
  colW: [7.0, 2.5, 2.2],
  border: { color: C.cardBorder, pt: 0.5 },
  fontFace: 'Arial',
});

// -------------------------------------------------------------
// SLIDE 13: System Limitations & Future Scope
// -------------------------------------------------------------
const slide13 = pptx.addSlide();
slide13.background = { color: C.bg };
addSlideHeader(slide13, 'Engineering Roadmap', 'System Limitations & Prioritized Future Scope');

slide13.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8, y: 1.5, w: 5.7, h: 5.4,
  fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
});
slide13.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.5, w: 0.1, h: 5.4,
  fill: { color: C.warning }, line: { color: C.warning },
});
slide13.addText('Current Architectural Limitations', {
  x: 1.1, y: 1.7, w: 5.2, h: 0.35,
  fontSize: 15, bold: true, color: C.warning, fontFace: 'Arial',
});
slide13.addText([
  { text: '• Outbound-Only Email:\n', options: { bold: true, color: C.white } },
  { text: 'No IMAP/webhook inbox sync for auto-logging client email replies.\n\n', options: { color: C.textMuted } },
  { text: '• Client HTTP Polling:\n', options: { bold: true, color: C.white } },
  { text: 'TanStack Query 30-second polling instead of real-time WebSockets.\n\n', options: { color: C.textMuted } },
  { text: '• Single-Tenant Architecture:\n', options: { bold: true, color: C.white } },
  { text: 'Designed as a single-workspace deployment without multi-company organizationId partitioning.\n\n', options: { color: C.textMuted } },
  { text: '• Client Unit Testing Gap:\n', options: { bold: true, color: C.white } },
  { text: 'Frontend relies on ESLint and API integration tests rather than Vitest component snapshots.', options: { color: C.textMuted } },
], { x: 1.1, y: 2.1, w: 5.2, h: 4.6, fontSize: 11, fontFace: 'Arial', lineSpacingMultiple: 1.2 });

slide13.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.8, y: 1.5, w: 5.7, h: 5.4,
  fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
});
slide13.addShape(pptx.shapes.RECTANGLE, {
  x: 6.8, y: 1.5, w: 0.1, h: 5.4,
  fill: { color: C.success }, line: { color: C.success },
});
slide13.addText('Prioritized Future Scope', {
  x: 7.1, y: 1.7, w: 5.2, h: 0.35,
  fontSize: 15, bold: true, color: C.success, fontFace: 'Arial',
});
slide13.addText([
  { text: '• P1 — Real-Time WebSockets (Socket.io):\n', options: { bold: true, color: C.white } },
  { text: 'Live multi-user collaboration, instant card locking, and toast notifications.\n\n', options: { color: C.textMuted } },
  { text: '• P2 — Inbound Email Sync (IMAP / Webhooks):\n', options: { bold: true, color: C.white } },
  { text: 'Gmail & Outlook OAuth integration for two-way conversation threading.\n\n', options: { color: C.textMuted } },
  { text: '• P3 — Component Unit Testing Suite:\n', options: { bold: true, color: C.white } },
  { text: 'Vitest and React Testing Library suites for UI forms and modal validation.\n\n', options: { color: C.textMuted } },
  { text: '• P4 — Multi-Tenancy Architecture:\n', options: { bold: true, color: C.white } },
  { text: 'Organization-level schema partitioning for SaaS multi-company hosting.', options: { color: C.textMuted } },
], { x: 7.1, y: 2.1, w: 5.2, h: 4.6, fontSize: 11, fontFace: 'Arial', lineSpacingMultiple: 1.2 });

// -------------------------------------------------------------
// SLIDE 14: Conclusion & Academic Defense Q&A
// -------------------------------------------------------------
const slide14 = pptx.addSlide();
slide14.background = { color: C.bg };
addSlideHeader(slide14, 'Summary & Academic Defense', 'Conclusion & Viva Defense Preparedness');

slide14.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 0.8, y: 1.5, w: 5.7, h: 5.4,
  fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
});
slide14.addShape(pptx.shapes.RECTANGLE, {
  x: 0.8, y: 1.5, w: 0.1, h: 5.4,
  fill: { color: C.primaryLight }, line: { color: C.primaryLight },
});
slide14.addText('Project Accomplishments', {
  x: 1.1, y: 1.7, w: 5.2, h: 0.35,
  fontSize: 15, bold: true, color: C.primaryLight, fontFace: 'Arial',
});
slide14.addText([
  { text: '• Full-Stack Architectural Cohesion:\n', options: { bold: true, color: C.white } },
  { text: 'Delivered a production-ready CRM adhering strictly to layered architectural principles across React, Express, and PostgreSQL.\n\n', options: { color: C.textMuted } },
  { text: '• Enterprise Data Reliability:\n', options: { bold: true, color: C.white } },
  { text: 'Guaranteed relational integrity via Prisma ACID transactions, foreign keys, and audit logging for every lifecycle event.\n\n', options: { color: C.textMuted } },
  { text: '• Autonomous Background Scheduling:\n', options: { bold: true, color: C.white } },
  { text: 'Idempotent cron jobs eliminate human error for follow-up reminders, lead rot detection, and daily briefings.\n\n', options: { color: C.textMuted } },
  { text: '• Academic Standard:\n', options: { bold: true, color: C.white } },
  { text: '100% verified test suite (90/90), zero linter warnings, complete visual screenshots, and comprehensive architectural documentation.', options: { color: C.textMuted } },
], { x: 1.1, y: 2.1, w: 5.2, h: 4.6, fontSize: 10.5, fontFace: 'Arial', lineSpacingMultiple: 1.2 });

slide14.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
  x: 6.8, y: 1.5, w: 5.7, h: 5.4,
  fill: { color: C.cardBg }, line: { color: C.cardBorder, width: 1 },
});
slide14.addShape(pptx.shapes.RECTANGLE, {
  x: 6.8, y: 1.5, w: 0.1, h: 5.4,
  fill: { color: C.accent }, line: { color: C.accent },
});
slide14.addText('Defense Q&A Preparedness', {
  x: 7.1, y: 1.7, w: 5.2, h: 0.35,
  fontSize: 15, bold: true, color: C.accent, fontFace: 'Arial',
});
slide14.addText([
  { text: 'Q: How is row-level data scoping enforced?\n', options: { bold: true, color: C.white } },
  { text: 'A: Enforced at the service query tier using scopeByOwner(user, "ownerId") injected into Prisma WHERE clauses. Reps cannot view peer deals.\n\n', options: { color: C.textMuted } },
  { text: 'Q: How does the system prevent automation recursion loops?\n', options: { bold: true, color: C.white } },
  { text: 'A: An in-memory re-entry registry and max chain depth limit of 5 intercepts circular rule triggers before recursion can occur.\n\n', options: { color: C.textMuted } },
  { text: 'Q: Why use HTTP-only cookies instead of LocalStorage for JWT?\n', options: { bold: true, color: C.white } },
  { text: 'A: Eliminates token access from client-side JavaScript, providing robust immunity against token theft via XSS vulnerabilities.\n\n', options: { color: C.textMuted } },
  { text: 'GitHub: ', options: { bold: true, color: C.accent } },
  { text: 'https://github.com/Ramcharan10122005/Smart-Connect-CRM', options: { color: '60A5FA', underline: true } },
], { x: 7.1, y: 2.1, w: 5.2, h: 4.6, fontSize: 10.5, fontFace: 'Arial', lineSpacingMultiple: 1.2 });

// Save PPTX
const outputPath = path.join(docsDir, 'SmartConnect_CRM_Presentation.pptx');
console.log('Writing presentation to:', outputPath);

pptx.writeFile({ fileName: outputPath }).then(() => {
  console.log('Successfully generated SmartConnect_CRM_Presentation.pptx!');
}).catch((err) => {
  console.error('Failed to generate presentation:', err);
});
