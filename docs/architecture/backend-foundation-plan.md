# Backend Foundation — Proposal (for review)

Status: **ACCEPTED (26 Oct 2026)** — decisions 1–4 approved: single AdminUnit tree with roles SUPER_ADMIN / TALUKA_ADMIN / GP_ADMIN / DATA_ENTRY_OPERATOR; DB sessions + Argon2id; JSON sections + zod; backend bootstraps the app, frontend owns all UI.
Author: backend. Scope: database architecture, auth/authz model, API conventions, implementation plan.
Requirements referenced: `docs/requirements/requirements.md`.

## 0. Repository state at time of writing

- Commits: `6c241c1` folder structure, `43e82c6` `claude.md`. Untracked `docker-compose.yaml` (Postgres 16 +
  Redis 7, local-only credentials).
- **No `package.json`, no Next.js app, no Prisma schema yet.** Node v22.19.0, npm 11.11.0.
- No frontend code present — nothing to avoid overwriting yet, but `package.json`/`tsconfig` are shared
  files and must be created in coordination with the frontend developer.

## 1. Proposed Prisma schema (normalized)

Conventions: `cuid` primary keys, `createdAt`/`updatedAt` on every table, soft delete only where auditability
requires it (`deletedAt`), every tenant-owned row carries `tenantId` with a composite index.

### 1.1 Geography — one self-referential table

```prisma
enum AdminUnitLevel { STATE DISTRICT TALUKA BLOCK GRAM_PANCHAYAT }

model AdminUnit {
  id        String         @id @default(cuid())
  level     AdminUnitLevel
  code      String?        // LGD / official code if available
  nameEn    String
  nameMr    String
  slug      String
  parentId  String?
  parent    AdminUnit?     @relation("UnitTree", fields: [parentId], references: [id])
  children  AdminUnit[]    @relation("UnitTree")
  path      String         // materialized path of ancestor ids: "/<state>/<district>/<taluka>/"
  tenant    Tenant?        // only for GRAM_PANCHAYAT
  roleAssignments RoleAssignment[]
  @@unique([parentId, slug])
  @@index([level]) @@index([path])
}
```

Why one table instead of District/Taluka/Block/GP tables: the sources disagree on whether BLOCK is a distinct
level (in Maharashtra the Panchayat Samiti is per taluka, so Taluka ≈ Block). A level enum + materialized
`path` lets scope checks be a prefix match (`unit.path startsWith scope.path`) regardless of depth, and the
Block level can be present, absent, or added later without migration churn.

### 1.2 Tenant (one per Gram Panchayat website)

```prisma
enum TenantStatus { NOT_CREATED DRAFT PUBLISHED SUSPENDED }

model Tenant {
  id            String       @id @default(cuid())
  unitId        String       @unique   // AdminUnit of level GRAM_PANCHAYAT
  slug          String       @unique   // "ganeshwadi" -> ganeshwadi.digitalgp.in or /ganeshwadi
  customDomain  String?      @unique   // optional, e.g. grampanchayatkulvandi.in
  status        TenantStatus @default(DRAFT)
  defaultLocale Locale       @default(MR)
  settings      TenantSetting?
  publishedAt   DateTime?
  // relations: pages, announcement targets, media, grievances, audit logs
}

model TenantSetting {   // branding, social links, contact, SEO defaults, feature toggles
  tenantId String @id
  // ...
}
```

Tenant resolution (`src/server/tenant`): host → `customDomain` match, else first label of `*.digitalgp.in`,
else first path segment. The resolved tenant goes into request context; **never read from body/query of a
protected request**.

### 1.3 Users, roles, sessions

```prisma
enum Role { SUPER_ADMIN DISTRICT_ADMIN TALUKA_ADMIN BLOCK_ADMIN GP_ADMIN DATA_ENTRY_OPERATOR }
enum UserStatus { ACTIVE SUSPENDED }

model User {
  id                String     @id @default(cuid())
  email             String     @unique   // lowercased in the app layer
  passwordHash      String
  name              String
  phone             String?
  locale            Locale     @default(MR)
  status            UserStatus @default(ACTIVE)
  mustResetPassword Boolean    @default(false)
  createdById       String?
  roleAssignments   RoleAssignment[]
  sessions          Session[]
  passwordResets    PasswordResetToken[]
}

model RoleAssignment {       // "user U has role R over scope S"
  id          String  @id @default(cuid())
  userId      String
  role        Role
  unitId      String  // AdminUnit; for GP_ADMIN / DEO this is the GP unit
  grantedById String?
  modules     ModulePermission[]  // only used for DATA_ENTRY_OPERATOR
  @@unique([userId, role, unitId])
  @@index([unitId])
}

model ModulePermission {     // DEO module-level access, e.g. "announcements", "gallery"
  id               String  @id @default(cuid())
  roleAssignmentId String
  moduleKey        String
  canWrite         Boolean @default(true)
  @@unique([roleAssignmentId, moduleKey])
}

model Session {
  id         String   @id      // SHA-256 of a random 256-bit token; the raw token lives only in the cookie
  userId     String
  expiresAt  DateTime
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
  lastSeenAt DateTime @default(now())
}

model PasswordResetToken { id (hashed)  userId  expiresAt  usedAt }
```

Role scope semantics: a role over unit X grants access to every tenant whose `AdminUnit.path` starts with
X's path. Open decision #4 (whole taluka vs individually assigned GPs) is handled by **where** the assignment
points: at the taluka unit (automatic) or at individual GP units (explicit). Both work without schema change;
the proposed default is **whole taluka**.

### 1.4 Content — generic page/section model with draft/published revisions

```prisma
enum ContentStatus { DRAFT IN_REVIEW APPROVED PUBLISHED ARCHIVED }
enum Locale { EN MR HI }

model Page {                // one row per (tenant, pageKey); pageKey from the 15-page registry
  id        String  @id @default(cuid())
  tenantId  String
  pageKey   String          // "home" | "about" | ... from src/config/pages
  isEnabled Boolean @default(true)
  // seoTitleEn/Mr, seoDescriptionEn/Mr, shareImageId
  sections  Section[]
  @@unique([tenantId, pageKey])
}

model Section {             // ordered, show/hide-able block inside a page
  id          String  @id @default(cuid())
  tenantId    String
  pageId      String
  sectionKey  String        // "hero", "quick-stats", "our-leaders", ...
  sortOrder   Int
  isVisible   Boolean @default(true)
  draftId     String? @unique
  publishedId String? @unique
  @@unique([pageId, sectionKey])
}

model SectionRevision {     // immutable snapshot; `data` is JSON validated by a per-sectionKey zod schema
  id            String        @id @default(cuid())
  tenantId      String
  sectionId     String
  status        ContentStatus
  data          Json
  version       Int
  createdById   String
  reviewedById  String?   reviewedAt  DateTime?   reviewNote String?
  publishedById String?   publishedAt DateTime?
  @@index([sectionId, version])
}
```

Why JSON per section rather than a table per card type: the 15 pages contain roughly 80 distinct card/item
shapes (ward details, leaders, projects, schemes, scoreboards, QR codes, ...). Typing each as a table would
mean 80+ tables before any UI exists. Each `sectionKey` gets a zod schema in
`src/modules/content/validators`, so the JSON is validated on every write and the shape is documented for the
frontend. Entities queried **across** pages or tenants stay relational (next section). Public reads only ever
join `Section.published`; admin reads use `draft`.

### 1.5 Cross-cutting relational entities

- `Announcement` (ownerUnitId, type, priority, titleEn/Mr, bodyEn/Mr, attachmentId, status
  DRAFT/SCHEDULED/PUBLISHED, publishAt, displayPages String[]) + `AnnouncementTarget` (announcementId,
  unitId). A target at taluka level means every tenant under it; the public query matches targets whose path
  is a prefix of the tenant's path.
- `Media` (tenantId nullable for shared district/taluka assets, ownerUnitId, kind IMAGE/VIDEO/DOCUMENT,
  storageKey, mimeType, size <= 10 MB, width/height, altEn/Mr, uploadedById). Files on VPS disk under
  `uploads/<tenantId>/`; `storageKey` is abstracted so object storage can replace disk later.
- `Grievance` (tenantId, trackingCode unique, category, name/phone/email, description, status
  OPEN/IN_PROGRESS/RESOLVED/REJECTED, assignedToId, resolutionNote, resolvedAt) + `GrievanceEvent`.
- `AuditLog` (actorId, actorRole, tenantId?, unitId?, action, entityType, entityId, before Json?, after
  Json?, ip, userAgent, createdAt) — append-only, written by `src/server/audit` from services.

Deferred until needed: `Scheme` and `Project` as relational tables (start as section JSON; promote to tables
when district-wide statistics or cross-GP search require it).

## 2. Security model

### 2.1 Authentication

- **Credentials login only** (official email + password) — no OAuth providers are in the requirements.
- Password hashing: **Argon2id** via `@node-rs/argon2` (maintained, prebuilt binaries); fallback `bcryptjs`
  if the VPS toolchain cannot load native modules — decided at install time.
- Sessions: **opaque server-side sessions** in the `Session` table. Token = 32 random bytes from
  `crypto.randomBytes`, stored as its SHA-256 hash, delivered in an `httpOnly; Secure; SameSite=Lax` cookie.
  Rolling expiry: 30 days with "remember me", otherwise 24 h. This is the pattern the Lucia author now
  recommends, built only on Node/Web Crypto primitives — no custom cryptography.
- Why not Auth.js: its Credentials provider forces JWT sessions (no server-side revocation), which conflicts
  with "suspend access" taking effect immediately and with session audit requirements.
- Login throttling: per-email and per-IP counters (Postgres table first, Redis later). Generic error message
  on failure. Password reset: single-use hashed token, 30-minute expiry, emailed link; the endpoint always
  responds 200 to avoid account enumeration.
- CSRF: mutating Route Handlers accept requests only when `Origin` matches the app host (Server Actions do
  this by default; the API wrapper adds the same check).

### 2.2 Authorization — enforced in services, never in UI

Every protected service call receives an `AuthContext { user, assignments[] }` and a target (`tenantId`
and/or `unitId`) resolved **server-side**. Checks run in this order:

1. **Scope** — does any assignment's unit path prefix-match the target unit path?
2. **Role capability** — static permission matrix in `src/server/permissions/matrix.ts` (fixed per role, as
   the requirements state; open decision #9 could later move it to the DB).
3. **Module** — for `DATA_ENTRY_OPERATOR`, the operation's `moduleKey` must exist in `ModulePermission`
   with `canWrite`.
4. **Workflow** — content transitions (2.3) check the role against the transition table.

Proposed permission matrix (to verify against requirements):

| Capability                     | SUPER | DISTRICT     | TALUKA/BLOCK | GP_ADMIN   | DEO              |
|--------------------------------|:-----:|:------------:|:------------:|:----------:|:----------------:|
| Manage hierarchy               | yes   | own district | -            | -          | -                |
| Create GP website (tenant)     | yes   | yes (?)      | yes (?)      | -          | -                |
| Create Taluka/Block admins     | yes   | yes (?)      | -            | -          | -                |
| Create GP admins               | yes   | yes          | yes          | -          | -                |
| Create DEOs                    | yes   | yes          | yes          | yes        | -                |
| Edit content (in scope)        | yes   | yes          | yes          | yes        | assigned modules |
| Submit for review              | yes   | yes          | yes          | yes        | yes              |
| Approve / publish              | yes   | yes          | yes          | yes        | -                |
| Publish announcements to scope | yes   | yes          | yes          | own GP     | -                |
| Manage media (in scope)        | yes   | yes          | yes          | yes        | assigned modules |
| View audit logs                | all   | district     | own scope    | own GP     | own activity     |
| Manage roles & permissions     | yes   | -            | -            | -          | -                |

`(?)` = contradicts the Figma design; see open decisions #2/#3 in the requirements summary.

### 2.3 Content status transitions

```
DRAFT --submit--> IN_REVIEW --approve--> APPROVED --publish--> PUBLISHED --archive--> ARCHIVED
  ^                   |
  +------reject-------+                 (a new edit on a PUBLISHED section opens a new DRAFT revision)
```

- DEO: `submit` only. GP_ADMIN and above: all transitions. `approve` + `publish` may be a single "Publish"
  action for admins but are recorded as two audit events.
- Publishing points `Section.publishedId` at the revision; a later edit creates a new DRAFT revision while the
  published one keeps serving. Publishing triggers cache revalidation by tenant tag.

### 2.4 Tenant isolation guarantees

- Repositories expose only functions that take `tenantId` from `AuthContext` / the resolved tenant — no
  "find by id" without a tenant filter on tenant-owned tables.
- Public API and pages never receive `tenantId` from the client; it is derived from host or path.
- Secrets (`passwordHash`, session hashes, reset tokens) are excluded via Prisma `omit` and DTO mappers.
- Tests: cross-tenant read/write attempts in every module must return 404/403.

## 3. API conventions (`src/app/api/v1`)

- JSON only. Validation with **zod**; invalid -> `400 { error: { code: "VALIDATION_ERROR", issues } }`.
- Error envelope `{ error: { code, message, details? } }`. Codes: `UNAUTHENTICATED` 401, `FORBIDDEN` 403,
  `NOT_FOUND` 404 (also used to hide cross-tenant existence), `CONFLICT` 409, `RATE_LIMITED` 429.
- Success: `{ data }` or `{ data, page: { nextCursor, limit } }` — **cursor pagination**, limit <= 100.
- Route handlers are thin: `withAuth(withTenant(handler))` wrappers in `src/server/http` -> parse -> call
  service -> map DTO. No Prisma in route files.
- Full contract documented in `docs/api/api-contract.md` as endpoints land.

Initial endpoints (plan steps 3–6):

| Method         | Path                                                                   | Who                    |
|----------------|------------------------------------------------------------------------|------------------------|
| POST           | /api/v1/auth/login, /logout, /forgot-password, /reset-password         | public / session       |
| GET            | /api/v1/auth/me                                                        | session                |
| GET/POST       | /api/v1/hierarchy/units (+ /:id)                                       | SUPER, DISTRICT        |
| GET/POST/PATCH | /api/v1/tenants (+ /:id)                                               | by scope               |
| GET/POST/PATCH | /api/v1/accounts (+ /:id, /:id/assignments)                            | by scope               |
| GET/PUT        | /api/v1/content/:tenantId/pages/:pageKey/sections/:sectionKey/draft    | editor                 |
| POST           | .../sections/:sectionKey/{submit,approve,reject,publish}               | by workflow            |
| GET            | /api/v1/public/:tenantSlug/pages/:pageKey                              | public, published only |
| GET/POST/PATCH | /api/v1/announcements                                                  | by scope               |
| GET            | /api/v1/audit-logs                                                     | by scope               |
| GET            | /api/health                                                            | public                 |

## 4. Implementation plan (small, reviewable steps — one branch + PR each)

| # | Branch                        | Deliverable                                                                                                   | Checks                              |
|---|-------------------------------|---------------------------------------------------------------------------------------------------------------|-------------------------------------|
| 1 | `chore/bootstrap-app`         | `package.json`, Next.js + TS + Tailwind + ESLint + Vitest, `.env.example`, Prisma client, `docs/backend-setup.md` — **coordinate with frontend** | lint, build                         |
| 2 | `feat/schema-core`            | Prisma schema 1.1–1.3 + migration + seed (Pune district sample, 3 GPs from reference sites, super admin from env) | `prisma validate`, `migrate dev`    |
| 3 | `feat/auth-sessions`          | Argon2 hashing, session store, cookie helpers, login/logout/me, reset flow, throttling                         | unit tests                          |
| 4 | `feat/authz-core`             | AuthContext, permission matrix, scope resolver, tenant resolver, `withAuth`/`withTenant`, audit writer         | unit tests per matrix row + cross-scope denial |
| 5 | `feat/accounts-hierarchy-api` | hierarchy, tenants, accounts endpoints + contract docs                                                         | unit + integration                  |
| 6 | `feat/content-workflow`       | schema 1.4, page registry, section zod schemas (first 3 pages), draft/review/publish services + endpoints, public read endpoint | workflow + cross-tenant tests |
| 7 | `feat/announcements-media`    | 1.5 announcements + media upload (local disk) + grievances skeleton                                            | tests                               |
| 8 | `chore/ci`                    | GitHub Actions: lint, typecheck, vitest with a Postgres service                                                | CI green                            |

Each PR documents schema/API changes in `docs/api/api-contract.md` and `docs/architecture/`.

## 5. Decisions needed before step 2

1. **Hierarchy levels** — accept a single `AdminUnit` table with a level enum (Block optional)?
2. **Roles** — keep all six (`SUPER_ADMIN, DISTRICT_ADMIN, TALUKA_ADMIN, BLOCK_ADMIN, GP_ADMIN,
   DATA_ENTRY_OPERATOR`)? `DISTRICT_ADMIN` appears in no source and can be dropped; `TALUKA_ADMIN` and
   `BLOCK_ADMIN` are the same role under two names in the sources.
3. **Auth approach** — DB-backed opaque sessions + Argon2id as above, vs Auth.js.
4. **Content model** — JSON-per-section with zod schemas + relational cross-cutting entities, vs fully
   relational tables for every content type.
5. **Bootstrap ownership** — may backend create `package.json` / the Next.js app now (step 1), or has the
   frontend developer already started one that should land first?
6. Lower-impact defaults applied unless overridden: Pune-only seed data; `Locale` enum includes `HI` but only
   EN/MR are required; permissions fixed in code; Taluka Admin scope = whole taluka; tenant slug works for
   both subdomain and path addressing.
