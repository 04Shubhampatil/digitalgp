# DigitalGP — API Contract

Shared TypeScript types live in [`src/types/api.ts`](../src/types/api.ts); import DTOs from there instead
of re-declaring them. Request schemas are zod objects in `src/features/<feature>/validators.ts`.

Base path: `/api/v1`. All bodies and responses are JSON.

## Conventions

| Topic          | Rule |
|----------------|------|
| Auth           | Session cookie `dgp_session` (httpOnly, SameSite=Lax, Secure in production). Set by `POST /auth/login`, cleared by `POST /auth/logout`. |
| CSRF           | Mutating requests that carry an `Origin` header must match `APP_ORIGIN` (or a subdomain of `APP_BASE_HOST`), otherwise `403`. Same-origin `fetch` from the admin app passes automatically. |
| Success        | `{ "data": T }` — `201` on create, `204` (empty) on logout/delete. |
| Lists          | `{ "data": T[], "page": { "nextCursor": string \| null, "limit": number } }`. Query `?limit=20&cursor=<nextCursor>`; `limit` 1–100. |
| Errors         | `{ "error": { "code", "message", "details?" } }` — see codes below. |
| Validation     | `400 VALIDATION_ERROR`, `details: [{ path, message }]`. |
| Scope          | A record outside the caller's scope is reported as `404 NOT_FOUND` (existence is not revealed). A capability the caller lacks on an in-scope record is `403 FORBIDDEN`. |
| Dates          | ISO-8601 strings (UTC). |
| Ids            | Prisma cuid strings. |

### Error codes

| Code                 | HTTP | When |
|----------------------|------|------|
| `UNAUTHENTICATED`    | 401  | Missing/invalid/expired session, or wrong login credentials |
| `FORBIDDEN`          | 403  | In scope but capability missing; suspended account; CSRF origin mismatch |
| `NOT_FOUND`          | 404  | Missing or out-of-scope record; unknown workflow action |
| `CONFLICT`           | 409  | Unique violation, duplicate role, editing frozen content |
| `INVALID_TRANSITION` | 409  | Workflow action not allowed from the current status (`details: { from, to }`) |
| `VALIDATION_ERROR`   | 400  | Body/query failed zod validation |
| `BAD_REQUEST`        | 400  | Malformed JSON or a business rule (e.g. missing rejection note) |
| `RATE_LIMITED`       | 429  | Too many attempts; `Retry-After` header + `details.retryAfterSeconds` |
| `INTERNAL_ERROR`     | 500  | Unexpected failure (logged server-side) |

### Roles and scope

A user holds one or more **assignments** `{ role, unitId }`; each grants the role over the subtree of
that hierarchy unit. Capabilities per role are in [`src/lib/permissions.ts`](../src/lib/permissions.ts)
(`ROLE_CAPABILITIES`, `CREATABLE_ROLES`). `GET /auth/me` returns the capability keys the user holds so the
UI can hide controls — **the server re-checks every call**.

| Role                  | Assigned at      | Summary |
|-----------------------|------------------|---------|
| `SUPER_ADMIN`         | STATE / DISTRICT | Everything in scope, hierarchy management, role management |
| `TALUKA_ADMIN`        | TALUKA           | Websites, GP/Block admins, operators, shared content in the taluka |
| `BLOCK_ADMIN`         | BLOCK            | Same as taluka admin within the block, cannot create websites |
| `GP_ADMIN`            | GRAM_PANCHAYAT   | Own website, operators, review + publish own content |
| `DATA_ENTRY_OPERATOR` | GRAM_PANCHAYAT   | Draft/submit in granted modules only; no review, publish, or user management |

Module keys for operators: `announcements`, `schemes`, `projects`, `pages`, `media`, `grievances`.

---

## Health

`GET /api/health` → `200 { status: "ok", db: "ok", time }` or `503`.

## Auth

| Method | Path                         | Auth | Body (zod)                                   | Response |
|--------|------------------------------|------|----------------------------------------------|----------|
| POST   | `/auth/login`                | –    | `{ email, password, rememberMe? }`           | `200 { data: { expiresAt } }` + cookie. `401` wrong credentials, `403` suspended, `429` after 5 failures / 15 min per email (30 per IP) |
| POST   | `/auth/logout`               | ✔    | –                                            | `204`, cookie cleared |
| GET    | `/auth/me`                   | ✔    | –                                            | `200 { data: CurrentUserDto }` |
| POST   | `/auth/forgot-password`      | –    | `{ email }`                                  | always `200 { data: { message } }`; emails a link `APP_ORIGIN/reset-password?token=…` (30 min, single use); 3 requests / hour per email |
| POST   | `/auth/reset-password`       | –    | `{ token, password }`                        | `200`; `400 BAD_REQUEST` invalid/expired token. All sessions are revoked. |
| POST   | `/auth/change-password`      | ✔    | `{ currentPassword, newPassword }`           | `200`; other sessions revoked |

Password policy: 10–128 chars with letters and digits. Session lifetime 24 h, or 30 days with
`rememberMe`, sliding.

`CurrentUserDto`: `{ user: UserDto (without assignments), assignments: AssignmentDto[], capabilities: string[] }`.

## Hierarchy

| Method | Path                       | Capability          | Body / query | Response |
|--------|----------------------------|---------------------|--------------|----------|
| GET    | `/hierarchy/units`         | any assignment      | `?parentId&level&q&limit&cursor` — only units inside the caller's scope | paginated `AdminUnitDto` |
| GET    | `/hierarchy/units/:unitId` | in scope            | –            | `{ data: { unit: AdminUnitDto, ancestors: AdminUnitDto[] } }` |
| POST   | `/hierarchy/units`         | `hierarchy:manage`  | `{ level, parentId \| null, slug, nameEn, nameMr, code? }` — level must be deeper than the parent's; only SUPER_ADMIN may create a root STATE | `201 AdminUnitDto` |
| PATCH  | `/hierarchy/units/:unitId` | `hierarchy:manage`  | `{ slug?, nameEn?, nameMr?, code? }` | `AdminUnitDto` |

Levels: `STATE > DISTRICT > TALUKA > BLOCK (optional) > GRAM_PANCHAYAT`.

## Tenants (Gram Panchayat websites)

| Method | Path                         | Capability        | Body / query | Response |
|--------|------------------------------|-------------------|--------------|----------|
| GET    | `/tenants`                   | any assignment    | `?status&unitId&q&limit&cursor` (scope-filtered) | paginated `TenantDto` |
| POST   | `/tenants`                   | `tenant:create`   | `{ unitId (GRAM_PANCHAYAT), slug, nameEn, nameMr, customDomain?, defaultLocale?, settings? }` — creates the 15 default pages | `201 TenantDto`; `409` if the GP already has a website |
| GET    | `/tenants/:tenantId`         | in scope          | –            | `TenantDto` |
| PATCH  | `/tenants/:tenantId`         | `tenant:update`   | any of the create fields except `unitId`; `settings` is merged shallowly | `TenantDto` |
| POST   | `/tenants/:tenantId/status`  | `tenant:publish`  | `{ status: "DRAFT" \| "PUBLISHED" \| "SUSPENDED" }` | `TenantDto` |

`settings` shape = `TenantSettingsDto` (`contact`, `social`, `branding`, `seo`); unknown keys are rejected.

## Users

| Method | Path                                             | Capability / rule | Body / query | Response |
|--------|--------------------------------------------------|-------------------|--------------|----------|
| GET    | `/users`                                         | `user:read`       | `?unitId&role&status&q&limit&cursor` — users with an active assignment inside scope | paginated `UserDto` |
| POST   | `/users`                                         | `canGrantRole`    | `{ email, name, phone?, locale?, password?, assignment: { role, unitId, modules? } }` | `201 { data: { user: UserDto, temporaryPassword: string \| null } }` — temporary password returned **once** when `password` is omitted (`mustResetPassword = true`) |
| GET    | `/users/:userId`                                 | visible in scope  | –            | `UserDto` |
| PATCH  | `/users/:userId`                                 | manageable        | `{ name?, phone?, locale?, status? }` — `SUSPENDED` revokes all sessions; cannot change own status | `UserDto` |
| POST   | `/users/:userId/assignments`                     | `canGrantRole`    | `{ role, unitId, modules? }` | `201 UserDto` |
| PUT    | `/users/:userId/assignments/:assignmentId`       | `canGrantRole`    | `{ modules: [{ moduleKey, canWrite }] }` (operators only) | `UserDto` |
| DELETE | `/users/:userId/assignments/:assignmentId`       | `canGrantRole`    | –            | `UserDto` (assignment kept with `revokedAt`; last revocation logs the user out) |

Rules: a role may only be granted at its level (`ROLE_LEVELS`); operators need ≥ 1 module, other roles
none; the actor can grant only roles in `CREATABLE_ROLES[actorRole]` and only within scope.

## Announcements (admin)

| Method | Path                               | Capability | Body / query | Response |
|--------|------------------------------------|------------|--------------|----------|
| GET    | `/announcements`                   | in scope   | `?tenantId&ownerUnitId&status&priority&category&q&limit&cursor` | paginated `AnnouncementDto` |
| POST   | `/announcements`                   | `content:edit` (+ module `announcements`) for a GP item; `content:share` for a shared item | see below | `201 AnnouncementDto` (status `DRAFT`) |
| GET    | `/announcements/:id`               | in scope   | –            | `AnnouncementDto` |
| PATCH  | `/announcements/:id`               | as create  | any create field; `targetUnitIds` only for shared items. Only `DRAFT`/`REJECTED` are editable (`409` otherwise); editing a `REJECTED` item returns it to `DRAFT` | `AnnouncementDto` |
| DELETE | `/announcements/:id`               | as create  | –            | `204`; `409` while `PUBLISHED` |
| POST   | `/announcements/:id/:action`       | see workflow | `{ note? }` (required for `reject`) | `AnnouncementDto` |

Create body:

```jsonc
{
  "category": "meeting",                 // free text, ≤ 60
  "priority": "NORMAL" | "IMPORTANT" | "URGENT" | "EMERGENCY",
  "titleEn": "…", "titleMr": "…",        // at least one
  "bodyEn": "…", "bodyMr": "…",
  "attachmentId": "<mediaId>" | null,
  "displayPages": ["home", "announcements"],   // page keys, default shown
  "publishAt": "2026-11-01T00:00:00Z" | null,  // null = on publish; future = scheduled
  "expiresAt": "…" | null,
  // exactly one of:
  "tenantId": "<tenantId>",                                   // GP-owned
  "ownerUnitId": "<talukaId>", "targetUnitIds": ["<unitId>"]  // shared; targets must be inside the owner unit
}
```

### Workflow actions

```
DRAFT --submit--> SUBMITTED --start_review--> UNDER_REVIEW --approve--> APPROVED --publish--> PUBLISHED --archive--> ARCHIVED
                      |                            |                        |                     |
                      +---------- reject (note) ---+------------------------+        unpublish ---+--> APPROVED
REJECTED --submit--> SUBMITTED        (or edit → DRAFT)
```

| Action         | Capability        | Roles |
|----------------|-------------------|-------|
| `submit`       | `content:submit`  | operator (module `announcements`), admins |
| `start_review` | `content:review`  | GP admin and above |
| `approve`      | `content:review`  | GP admin and above |
| `reject`       | `content:review`  | GP admin and above — `note` required |
| `publish`      | `content:publish` | GP admin and above |
| `unpublish`    | `content:publish` | GP admin and above |
| `archive`      | `content:publish` | GP admin and above |

Every transition writes an audit event `announcement.<action>`.

## Schemes (admin)

Same shape and workflow as announcements. A scheme is either GP-owned (`tenantId`) or shared
(`ownerUnitId` + `targetUnitIds`, `content:share`). Operators need module `schemes`.

| Method | Path                  | Capability | Body / query | Response |
|--------|-----------------------|------------|--------------|----------|
| GET    | `/schemes`            | in scope   | `?tenantId&ownerUnitId&status&level&q&limit&cursor` | paginated `SchemeDto` |
| POST   | `/schemes`            | `content:edit` (+ module `schemes`) or `content:share` | see below | `201 SchemeDto` (status `DRAFT`) |
| GET    | `/schemes/:id`        | in scope   | –            | `SchemeDto` |
| PATCH  | `/schemes/:id`        | as create  | any create field; `targetUnitIds` only for shared items; only `DRAFT`/`REJECTED` editable | `SchemeDto` |
| DELETE | `/schemes/:id`        | as create  | –            | `204`; `409` while `PUBLISHED` |
| POST   | `/schemes/:id/:action`| see workflow | `{ note? }` | `SchemeDto`; audit `scheme.<action>` |

Create body:

```jsonc
{
  "level": "CENTRAL" | "STATE" | "DISTRICT" | "GRAM_PANCHAYAT",
  "nameEn": "…", "nameMr": "…",                 // at least one
  "descriptionEn": "…", "descriptionMr": "…",
  "eligibilityEn": "…", "eligibilityMr": "…",
  "processEn": "…", "processMr": "…",
  "externalUrl": "https://…" | null,
  "beneficiaryCount": 120 | null,              // aggregate only — no beneficiary PII
  "amountDisbursed": 150000.5 | null,          // number, ≤ 2 decimals; returned as "150000.50"
  // exactly one of:
  "tenantId": "<tenantId>",
  "ownerUnitId": "<unitId>", "targetUnitIds": ["<unitId>"]
}
```

## Audit logs

`GET /audit-logs?tenantId&unitId&actorId&action&entityType&from&to&limit&cursor` → paginated `AuditLogDto`.
Roles with `audit:read` see events inside their scope; everyone sees their own actions.

## Public (no auth, published websites only)

| Method | Path                                   | Query | Response |
|--------|----------------------------------------|-------|----------|
| GET    | `/public/:tenantSlug`                  | –     | `PublicTenantDto`; `404` if not published |
| GET    | `/public/:tenantSlug/announcements`    | `?page=<pageKey>&priority&category&limit&cursor` | paginated `PublicAnnouncementDto` — own published items + shared items targeted at the GP or any ancestor; honours `publishAt`/`expiresAt` |
| GET    | `/public/:tenantSlug/schemes`          | `?level&limit&cursor` | paginated `PublicSchemeDto` — own published + shared targeted schemes |

Tenant resolution for server-rendered pages: `resolvePublicTenant(host, pathname)` in
[`src/lib/tenant.ts`](../src/lib/tenant.ts) supports `<slug>.<APP_BASE_HOST>`, a custom domain, or
`/<slug>/…` as the first path segment.

## Not yet implemented (planned)

Projects, media upload, grievances, page sections (`/content/...`) — schema exists in
`prisma/schema.prisma`; endpoints follow the same conventions and workflow.
