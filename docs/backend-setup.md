# Backend setup

## Prerequisites

- Node.js 22 (tested with v22.19.0), npm 11
- Docker Desktop (for local PostgreSQL 16 + Redis 7 via `docker-compose.yaml`)

## First run

```bash
docker compose up -d
```

```bash
cp .env.example .env
```

```bash
npm install
```

`npm install` runs `prisma generate` (client is emitted to `src/generated/prisma`, git-ignored).

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

The seed is idempotent. It creates Maharashtra > Pune > Haveli/Mulshi talukas, three published GP
websites (`ganeshwadi`, `padegaon`, `vasantpuri`), a super admin (`SEED_SUPER_ADMIN_*` from `.env`),
one taluka admin, one GP admin and one operator per GP. Sample passwords are printed by the seed.
**Change them in any shared environment.**

```bash
npm run dev
```

Check `http://localhost:3000/api/health`.

## Environment variables

| Variable                   | Purpose |
|----------------------------|---------|
| `DATABASE_URL`             | Postgres connection string (Prisma 7 reads it from `prisma.config.ts`) |
| `APP_BASE_HOST`            | Base host for subdomain tenant resolution, e.g. `digitalgp.in` |
| `APP_ORIGIN`               | Public origin of the admin app — CSRF origin check + password-reset links |
| `SESSION_COOKIE_NAME`      | Optional, default `dgp_session` |
| `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` | Seed only |
| `TEST_DATABASE_URL`        | Optional; tests default to `<DATABASE_URL database>_test` |
| `UPLOADS_DIR`              | Optional, default `uploads` — media files on disk (git-ignored); back it up with the database |

Never commit `.env`. `.env.example` documents every variable.

## Scripts

| Script               | What it does |
|----------------------|--------------|
| `npm run dev/build/start` | Next.js |
| `npm run lint`       | ESLint (next + typescript configs) |
| `npm run typecheck`  | `tsc --noEmit` |
| `npm test`           | Vitest — unit + integration (needs Postgres) |
| `npm run db:migrate` | `prisma migrate dev` (creates a migration from schema changes — development only) |
| `npm run db:deploy`  | `prisma migrate deploy` (production / CI) |
| `npm run db:seed`    | Seed development data |
| `npm run db:studio`  | Prisma Studio |

## Tests

Integration tests run against a **separate database** (`digitalgp_test` by default). Create it once:

```bash
docker exec digitalgp-postgres psql -U admin -d postgres -c "CREATE DATABASE digitalgp_test"
```

`tests/global-setup.ts` applies migrations to it; `tests/setup.ts` truncates all tables before every
test. Test files run serially (`fileParallelism: false`) because they share that database.

## Code layout (backend)

```
src/lib/            cross-cutting: db, env, errors, validation, http wrappers, auth, permissions, tenant, audit, rate-limit, mailer
src/features/<f>/   validators.ts (zod), service.ts (business rules + authorization), mappers.ts (DTOs)
src/app/api/        thin Route Handlers: parse → service → DTO
src/config/         module keys, page registry
src/types/api.ts    shared DTOs for the frontend
prisma/             schema, migrations, seed.ts
tests/              unit/, integration/, helpers/
```

Rules enforced by the code:

1. Route handlers never touch Prisma; services do, through `src/lib/db.ts`.
2. Every service receives `AuthContext` and resolves the target tenant/unit server-side
   (`getTenantForActor`, `getUnitForActor`) before any read or write.
3. Scope failures are `404`; capability failures are `403`; operators are additionally checked against
   their module grants.
4. `passwordHash` is omitted by the Prisma client globally; only `src/lib/auth.ts` and the auth
   service opt back in.
5. Important state changes write an `AuditLog` row inside the same transaction.

## Migrations

- Development: edit `prisma/schema.prisma`, run `npm run db:migrate -- --name <change>`, commit the
  generated folder under `prisma/migrations/`.
- Never edit an applied migration. Destructive changes (drop column/table) need explicit approval and a
  backup first.
- Production: `npm run db:deploy` from CI/CD before starting the new app version.
