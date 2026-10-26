# DigitalGP

Multi-tenant SaaS platform for Gram Panchayat public websites and administration dashboards.

Stack: Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma · Vitest + Playwright.
Deployment: Hostinger Linux VPS · Nginx · PM2 · GitHub Actions.

> Status: **backend foundation implemented** (auth, authorization, hierarchy, tenants, users, announcements, audit).
> Frontend pages/components are not started; empty folders hold a `.gitkeep`.

## Folder structure

```
digitalgp/
├── .github/workflows/        CI: lint, typecheck, tests (Postgres service), build
├── deploy/                   nginx/, pm2/, github-actions/ server configuration
├── docs/
│   ├── requirements/         Requirements summary + open decisions
│   ├── architecture/         backend-foundation-plan.md (accepted design)
│   ├── api-contract.md       Endpoint contract for the frontend
│   ├── backend-setup.md      Local setup, scripts, tests, migrations
│   └── decisions/            ADRs
├── prisma/
│   ├── schema.prisma         Database schema
│   ├── migrations/           Prisma migrations (never edit applied ones)
│   └── seed.ts               Idempotent development seed
├── public/                   images/, icons/, fonts/
├── scripts/                  One-off dev/ops scripts
├── src/
│   ├── app/                  Next.js App Router
│   │   ├── api/health/          Liveness probe
│   │   ├── api/v1/…             Route Handlers (thin: parse → service → DTO)
│   │   └── layout.tsx           Placeholder root layout — frontend owns everything under app/ except api/
│   ├── components/, hooks/, styles/, i18n/   Frontend (owned by the frontend developer)
│   ├── config/               modules.ts (operator module keys), pages.ts (page registry)
│   ├── lib/                  Backend cross-cutting: db, env, errors, validation, http, auth, permissions, tenant, audit, rate-limit, mailer
│   ├── features/<feature>/   validators.ts (zod) · service.ts (rules + authorization) · mappers.ts (DTOs)
│   ├── generated/prisma/     Generated Prisma client (git-ignored)
│   └── types/api.ts          Shared API DTOs — coordinated by both developers
└── tests/
    ├── unit/                 Permission matrix, workflow
    ├── integration/          Auth, tenant isolation, users, announcements, route handlers
    └── helpers/              Factories (hierarchy, tenants, actors, requests)
```

### Features (`src/features/`)

| Feature         | Status      | Covers |
|-----------------|-------------|--------|
| `auth`          | implemented | login/logout, sessions, password reset/change, rate limiting |
| `hierarchy`     | implemented | District → Taluka → Block → Gram Panchayat tree |
| `tenants`       | implemented | Website lifecycle (DRAFT/PUBLISHED/SUSPENDED), settings, public profile |
| `users`         | implemented | Scoped admin/operator accounts, role assignments, module grants |
| `announcements` | implemented | First vertical slice: GP-owned + shared, full workflow, public feed |
| `audit`         | implemented | Scoped audit log listing |
| `content`       | partial     | Workflow transition table (shared); page sections pending |
| `schemes`, `projects`, `media`, `grievances` | schema only | Endpoints pending |

## Layering rules

1. `app/api` routes call **feature services** only — never Prisma directly.
2. Services receive an `AuthContext` and resolve the target tenant/unit **server-side** before any read or write
   (`getTenantForActor`, `getUnitForActor`); scope failures are 404, capability failures are 403.
3. Operators are additionally checked against their module grants.
4. All external input is validated with zod in the feature's `validators.ts`.
5. Public endpoints read **published** content only; `passwordHash` and session secrets never leave the DB layer.
6. Important state changes write an `AuditLog` row in the same transaction.
7. Components never import from `lib/` server modules or `features/`.

## Ownership

| Area                                                              | Owner    |
|-------------------------------------------------------------------|----------|
| `components/`, `hooks/`, `styles/`, `i18n/`, `app/**` (except `app/api`) | Frontend |
| `prisma/`, `lib/`, `features/`, `app/api/`, `tests/`              | Backend  |
| `types/api.ts`, `config/`, `package.json`, `.github/`             | Both (coordinate changes) |

See [docs/backend-setup.md](docs/backend-setup.md) to run it and [docs/api-contract.md](docs/api-contract.md) for the API.

## Open decisions (see `docs/decisions/`)

- Tenant addressing: path (`domain.com/gp-name`) vs subdomain (`gp-name.digitalgp.in`). The `[tenant]` segment
  works with either; `server/tenant` resolves it from host or path.
- Whether a separate GP Admin login exists alongside Super Admin and Taluka (Block) Admin.
- Pune District only vs all of Maharashtra.
