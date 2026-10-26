# DigitalGP

Multi-tenant SaaS platform for Gram Panchayat public websites and administration dashboards.

Stack: Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma · Vitest + Playwright.
Deployment: Hostinger Linux VPS · Nginx · PM2 · GitHub Actions.

> Status: **folder structure only** — no application code yet. Every empty directory holds a `.gitkeep`
> so the layout is tracked in git. Remove the `.gitkeep` when the first real file lands in that folder.

## Folder structure

```
digitalgp/
├── .github/workflows/        GitHub Actions (lint, test, build, deploy to VPS)
├── deploy/                   Server configuration committed with the code
│   ├── nginx/                Reverse proxy + HTTPS + per-tenant host rules
│   ├── pm2/                  PM2 ecosystem config
│   └── github-actions/       Deploy helper scripts used by the workflows
├── docs/
│   ├── requirements/         Client requirements, government circular notes
│   ├── architecture/         System architecture, multi-tenant model, caching
│   ├── api/                  Route Handler contracts (request/response shapes)
│   └── decisions/            ADRs — one file per decision (e.g. subdomain vs path tenancy)
├── prisma/
│   ├── migrations/           Prisma migrations (never edit applied migrations)
│   └── seed/                 Seed data: Pune district, talukas, GPs, super admin
├── public/
│   ├── images/  icons/  fonts/
├── scripts/                  One-off dev/ops scripts (backup, restore, import GP list)
├── src/
│   ├── app/                  Next.js App Router — routes only, thin pages
│   │   ├── (public)/[tenant]/   Public GP website — 15 pages, search, sitemap
│   │   ├── (auth)/              login, forgot-password, reset-password
│   │   ├── (admin)/admin/       Super Admin / Taluka (Block) Admin / GP Admin dashboards
│   │   │   └── websites/[websiteId]/pages/[pageKey]/   Per-page editors
│   │   └── api/
│   │       ├── v1/              Versioned Route Handlers
│   │       └── health/          Liveness endpoint for Nginx / monitoring
│   ├── components/           React components (UI only, no data access)
│   │   ├── ui/                  Primitives (Button, Input, Card…)
│   │   ├── layout/              Header, footer, language switch, nav
│   │   ├── public/              Sections used by public website pages
│   │   ├── admin/               Dashboard, tables, editors
│   │   └── forms/               Form components + client-side validation UI
│   ├── hooks/                Client hooks
│   ├── styles/               Tailwind entry + global CSS, government theme tokens
│   ├── i18n/messages/        en.json / mr.json translation dictionaries
│   ├── config/               Site config, routes map, page registry (the 15 pages), roles
│   ├── lib/                  Framework-agnostic utilities (dates, slugs, formatting)
│   ├── types/                Shared types & API contracts (both developers coordinate)
│   ├── server/               Cross-cutting backend infrastructure
│   │   ├── db/                  Prisma client singleton
│   │   ├── auth/                Sessions, password hashing, login/reset flows
│   │   ├── tenant/              Resolve tenant from host/path; tenant-scope guards
│   │   ├── permissions/         RBAC: role → permission checks (server-side only)
│   │   ├── audit/               Audit-log writer
│   │   ├── cache/               Next.js cache tags / revalidation; Redis later
│   │   ├── storage/             File storage adapter (VPS disk now, object storage later)
│   │   └── email/               Transactional mail (password reset)
│   └── modules/              Feature modules — business logic, no React
│       └── <feature>/
│           ├── services/        Business rules; the only entry point for routes/actions
│           ├── repositories/    Prisma queries, always tenant-scoped
│           └── validators/      Zod schemas for all external input
└── tests/
    ├── unit/                 Vitest — services, validators, permission rules
    ├── integration/          Vitest — repositories against a test database
    ├── e2e/                  Playwright — public site + admin flows
    └── fixtures/             Shared test data
```

### Feature modules (`src/modules/`)

| Module          | Covers                                                                 |
|-----------------|------------------------------------------------------------------------|
| `tenants`       | Gram Panchayat tenant records, domain/subdomain mapping                |
| `hierarchy`     | District → Taluka → Gram Panchayat tree                                |
| `accounts`      | Super / Taluka / GP admin accounts, assignment of websites              |
| `websites`      | Website lifecycle (Not Created → Draft → Published), page status        |
| `content`       | Section/card content for the 15 pages, draft vs published separation   |
| `announcements` | Multi-target announcements, priority, scheduling, display pages        |
| `media`         | Media library (images, videos, documents)                              |
| `schemes`       | Government schemes & beneficiary statistics                            |
| `projects`      | Key projects & initiatives                                             |
| `grievances`    | Citizen complaints, feedback, status tracking                          |
| `search`        | Keyword search over published content                                  |

## Layering rules

1. `app/` routes and server actions call **module services** only — never Prisma directly.
2. Services enforce **tenant scope and permissions** via `server/tenant` and `server/permissions` before touching repositories.
3. Repositories are the only place Prisma is used, and every query is tenant-scoped.
4. All external input is validated with the module's `validators/` on the server.
5. Public routes read **published** content only; draft/private data never reaches public responses.
6. Components never import from `server/` or `modules/`.

## Ownership

| Area                                                       | Owner    |
|------------------------------------------------------------|----------|
| `components/`, `hooks/`, `styles/`, `i18n/`, page layouts  | Frontend |
| `prisma/`, `server/`, `modules/`, `app/api/`               | Backend  |
| `types/`, `config/`, `lib/`, dependencies, `.github/`      | Both (coordinate changes) |

## Open decisions (see `docs/decisions/`)

- Tenant addressing: path (`domain.com/gp-name`) vs subdomain (`gp-name.digitalgp.in`). The `[tenant]` segment
  works with either; `server/tenant` resolves it from host or path.
- Whether a separate GP Admin login exists alongside Super Admin and Taluka (Block) Admin.
- Pune District only vs all of Maharashtra.
