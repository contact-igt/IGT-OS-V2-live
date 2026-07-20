// ─────────────────────────────────────────────────────────────
// ARCHITECTURE PROMPT GENERATOR
// Stateless — fill in a project name + stack + database, get a
// standard-structure prompt to paste into an AI coding assistant
// (or use as a checklist) so every client project follows the
// same conventions regardless of who builds it.
// ─────────────────────────────────────────────────────────────

export type FrontendStack = 'nextjs' | 'react-vite' | 'plain';
export type BackendStack = 'express' | 'nestjs';
export type DatabaseId = 'postgres' | 'mysql' | 'mongodb' | 'sqlite' | 'redis';

export const FRONTEND_STACKS: { id: FrontendStack; label: string }[] = [
  { id: 'nextjs', label: 'Next.js (App Router)' },
  { id: 'react-vite', label: 'React (Vite)' },
  { id: 'plain', label: 'Plain HTML / CSS / JS' },
];

export const BACKEND_STACKS: { id: BackendStack; label: string }[] = [
  { id: 'express', label: 'Node.js + Express' },
  { id: 'nestjs', label: 'NestJS' },
];

export const DATABASES: { id: DatabaseId; label: string }[] = [
  { id: 'postgres', label: 'PostgreSQL' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'mongodb', label: 'MongoDB' },
  { id: 'sqlite', label: 'SQLite' },
  { id: 'redis', label: 'Redis' },
];

const DB_PERSISTENCE_CONVENTION: Record<DatabaseId, string> = {
  postgres: 'Raw SQL via the `pg` package (no ORM) — parameterized queries only, one connection pool shared across the app.',
  mysql: 'Raw SQL via `mysql2/promise` — parameterized queries only, one connection pool shared across the app.',
  mongodb: 'Mongoose (or the native MongoDB driver) — one connection at startup, schemas/models grouped in a `models/` folder.',
  sqlite: '`better-sqlite3` for a single-file embedded DB — fine for small tools/prototypes, not for production multi-instance deployments.',
  redis: 'Used as a cache/session store alongside a primary DB via `ioredis` — TTL-based caching only, never the source of truth.',
};

const DB_ENV_VAR: Record<DatabaseId, string> = {
  postgres: 'DATABASE_URL',
  mysql: 'DATABASE_URL',
  mongodb: 'MONGODB_URI',
  sqlite: 'SQLITE_DB_PATH',
  redis: 'REDIS_URL',
};

function frontendTemplate(stack: FrontendStack, projectName: string): string {
  const name = projectName.trim() || '{{project name}}';

  if (stack === 'nextjs') {
    return `# Frontend Architecture — ${name} (Next.js, App Router)

src/
  app/                    — routes (App Router), one folder per route segment
    (auth)/               — auth-only routes (login, forgot-password), grouped, no layout impact
    (app)/                — authenticated routes, wrapped in a shared layout.tsx (nav + topbar)
    layout.tsx, page.tsx  — root layout and landing page
  components/
    ui/                   — generic, reusable primitives (Button, Modal, Input, Table)
    <feature>/             — feature-specific components, one folder per domain (e.g. tasks/, clients/)
  contexts/               — React Context providers (Auth, app-wide state)
  lib/                    — typed API client, utilities, constants, shared types
  hooks/                  — shared custom hooks

Conventions:
- TypeScript everywhere; no \`any\` unless justified with a comment.
- Tailwind CSS for styling; shared button/input classes live in globals.css, no inline style duplication.
- Fetch data via a typed API client in lib/api.ts — never call fetch() directly from inside a component.
- One Context per concern (Auth, app state) — don't spin up a new context per feature unless it's genuinely independent.
- Co-locate a component's own subcomponents in the same folder; only promote to components/ui once reused in 2+ places.`;
  }

  if (stack === 'react-vite') {
    return `# Frontend Architecture — ${name} (React + Vite)

src/
  pages/                  — one file/folder per route, wired up via React Router
  components/
    ui/                   — generic, reusable primitives (Button, Modal, Input, Table)
    <feature>/             — feature-specific components, one folder per domain
  contexts/               — React Context providers (Auth, app-wide state)
  lib/                    — typed API client, utilities, constants, shared types
  hooks/                  — shared custom hooks
  main.tsx, App.tsx       — entrypoint and router setup

Conventions:
- TypeScript everywhere; no \`any\` unless justified with a comment.
- Tailwind CSS for styling; shared classes centralized, no inline style duplication.
- Fetch data via a typed API client in lib/api.ts — never call fetch() directly from inside a component.
- One Context per concern (Auth, app state) — don't spin up a new context per feature unless it's genuinely independent.
- Co-locate a component's own subcomponents in the same folder; only promote to components/ui once reused in 2+ places.`;
  }

  return `# Frontend Architecture — ${name} (Plain HTML / CSS / JS)

/
  index.html              — entry page
  css/
    styles.css            — shared styles; one file per page/section if it grows large
  js/
    main.js                — entrypoint, wires up event listeners
    api.js                 — all fetch() calls to the backend live here, nowhere else
    <feature>.js            — one file per page/feature's behavior
  assets/                 — images, fonts, icons

Conventions:
- No build step assumed — plain \`<script>\` tags with ES modules (\`type="module"\`).
- All backend calls go through js/api.js — no inline fetch() scattered across feature files.
- Keep DOM manipulation and data-fetching logic separated: fetch in api.js, render in the feature file.
- Use semantic HTML and CSS custom properties for theme colors — avoid inline styles.`;
}

function backendTemplate(stack: BackendStack, projectName: string, db: DatabaseId): string {
  const name = projectName.trim() || '{{project name}}';
  const dbLabel = DATABASES.find(d => d.id === db)!.label;
  const persistence = DB_PERSISTENCE_CONVENTION[db];
  const envVar = DB_ENV_VAR[db];

  if (stack === 'express') {
    return `# Backend Architecture — ${name} (Node.js + Express + ${dbLabel})

src/
  index.ts                — app entrypoint: middleware wiring, route mounting, server start
  routes/                 — one file per resource (users.ts, tasks.ts, ...), thin route handlers only
  middleware/              — auth, error handling, validation
  lib/                    — ${dbLabel} client/connection setup, external service clients
  types/                  — shared TypeScript interfaces

Conventions:
- Routes stay thin: validate input, call into a query/service function, serialize the response. No business logic inline in a route handler beyond a few lines.
- Persistence: ${persistence}
- Auth via JWT bearer tokens, verified in a shared \`requireAuth\` middleware — never re-implemented per route.
- Environment config via \`.env\` (e.g. \`${envVar}\`) — never hardcode secrets or connection strings.
- Consistent error shape across every route: \`{ error: string }\` with the correct HTTP status code, never leaking stack traces to the client.`;
  }

  return `# Backend Architecture — ${name} (NestJS + ${dbLabel})

src/
  main.ts                 — app bootstrap
  app.module.ts            — root module, imports feature modules
  <feature>/
    <feature>.module.ts    — module definition
    <feature>.controller.ts — thin HTTP layer: routes, DTOs, validation only
    <feature>.service.ts   — business logic and ${dbLabel} queries live here
  common/
    guards/                — auth guards (e.g. JwtAuthGuard)
    filters/               — global exception filters for a consistent error shape
    pipes/                 — shared validation pipes

Conventions:
- Controllers stay thin — no direct ${dbLabel} access in a controller, always go through the module's service.
- Persistence: ${persistence}
- Auth via a shared JwtAuthGuard applied per-controller or globally — never re-implemented per route.
- Environment config via \`.env\` (e.g. \`${envVar}\`) and Nest's ConfigModule — never hardcode secrets.
- Consistent error shape across every endpoint via a global exception filter, never leaking stack traces to the client.`;
}

export function generateArchitecturePrompts(params: {
  projectName: string;
  frontendStack: FrontendStack;
  backendStack: BackendStack;
  database: DatabaseId;
}): { frontend: string; backend: string } {
  return {
    frontend: frontendTemplate(params.frontendStack, params.projectName),
    backend: backendTemplate(params.backendStack, params.projectName, params.database),
  };
}
