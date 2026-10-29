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

## Projects (admin)

Development projects are always owned by one website (`tenantId`). Operators need module `projects`.

| Method | Path                    | Capability | Body / query | Response |
|--------|-------------------------|------------|--------------|----------|
| GET    | `/projects`             | in scope   | `?tenantId&status&stage&year&q&limit&cursor` | paginated `ProjectDto` |
| POST   | `/projects`             | `content:edit` (+ module `projects`) | see below | `201 ProjectDto` (status `DRAFT`) |
| GET    | `/projects/:id`         | in scope   | –            | `ProjectDto` |
| PATCH  | `/projects/:id`         | `content:edit` | any create field except `tenantId`; only `DRAFT`/`REJECTED` editable | `ProjectDto` |
| DELETE | `/projects/:id`         | `content:edit` | –          | `204`; `409` while `PUBLISHED` |
| POST   | `/projects/:id/:action` | see workflow | `{ note? }` | `ProjectDto`; audit `project.<action>` |

Create body:

```jsonc
{
  "tenantId": "<tenantId>",
  "stage": "UPCOMING" | "ONGOING" | "COMPLETED",
  "nameEn": "…", "nameMr": "…",                 // at least one
  "descriptionEn": "…", "descriptionMr": "…",
  "wardNo": "3" | null,
  "year": 2026 | null,
  "budget": 250000 | null,                      // number, ≤ 2 decimals; returned as "250000.00"
  "familiesBenefited": 40 | null,
  "outcomeEn": "…", "outcomeMr": "…",
  "coverImageId": "<mediaId>" | null            // must be an IMAGE of the same website (or shared from an ancestor); 400 otherwise
}
```

## Media

File metadata is stored in Postgres; bytes live behind the storage adapter in
[`src/lib/storage.ts`](../src/lib/storage.ts) (local disk under `UPLOADS_DIR`, default `./uploads`,
key `<tenantId>/<id>.<ext>` or `shared/<ownerUnitId>/<id>.<ext>`). Limits: **10 MB**; types are detected
from the file signature (the declared `Content-Type` is ignored): `image/jpeg`, `image/png`, `image/webp`,
`image/gif` → `IMAGE`; `video/mp4`, `video/webm` → `VIDEO`; `application/pdf` → `DOCUMENT`.

| Method | Path               | Capability | Body / query | Response |
|--------|--------------------|------------|--------------|----------|
| GET    | `/media`           | in scope   | `?tenantId&ownerUnitId&kind&q&limit&cursor` | paginated `MediaDto` |
| POST   | `/media`           | `media:manage` (+ module `media`) for `tenantId`; `content:share` for `ownerUnitId` | `multipart/form-data`: `file`, `tenantId` **or** `ownerUnitId` (non-GP unit), `altEn?`, `altMr?` | `201 MediaDto`; `400 BAD_REQUEST` on size/type violations |
| GET    | `/media/:id`       | in scope   | –            | `MediaDto` |
| GET    | `/media/:id/file`  | in scope   | –            | file bytes (`Content-Type`, inline, `private, no-store`) |
| PATCH  | `/media/:id`       | as upload  | `{ altEn?, altMr? }` | `MediaDto` |
| DELETE | `/media/:id`       | as upload  | –            | `204` — soft-deletes the row and removes the file; references (`attachmentId`, `coverImageId`, `shareImageId`) become `null` |

Audit events: `media.upload`, `media.update`, `media.delete`.

## Grievances

Citizens file grievances on the public website and track them with a code; staff handle them in the
admin. Reads: roles with `grievance:manage` (GP admin and above) or operators granted module
`grievances` (read-only). Writes: `grievance:manage` only.

| Method | Path                               | Capability | Body / query | Response |
|--------|------------------------------------|------------|--------------|----------|
| GET    | `/grievances`                      | read (see above) | `?tenantId&status&category&assignedToId&q&limit&cursor` | paginated `GrievanceDto` |
| GET    | `/grievances/:id`                  | read       | –            | `GrievanceDto` (with `events` and `attachments[]: { id, originalName, sizeBytes, mimeType, kind, uploadedAt }`; bytes via `GET /media/:id/file`) |
| POST   | `/grievances/:id/assign`           | `grievance:manage` | `{ assignedToId: userId \| null }` — must be an active user whose assignment covers the website (`400` otherwise) | `GrievanceDto` |
| POST   | `/grievances/:id/status`           | `grievance:manage` | `{ status: "IN_PROGRESS" \| "RESOLVED" \| "REJECTED", note? }` — `note` required when closing and is shown to the citizen | `GrievanceDto`; `409 INVALID_TRANSITION` |

Status moves: `OPEN → IN_PROGRESS | RESOLVED | REJECTED`, `IN_PROGRESS → RESOLVED | REJECTED`,
`RESOLVED | REJECTED → IN_PROGRESS` (reopen). Each move adds a `GrievanceEvent` and an audit row
`grievance.status.<status>`; assignment writes `grievance.assign`. Audit payloads never contain citizen
contact details.

## Page content (sections)

Each website has one `Page` row per key in `src/config/pages.ts`. A page is made of **sections**
registered in [`src/config/sections.ts`](../src/config/sections.ts) (`home`: `hero`, `quick-stats`,
`welcome`, `leaders`, `quick-links`; `about`: `overview`, `history`, `geography`, `members`, `office`;
more pages follow). Section data is JSON validated by the section's zod schema (unknown keys rejected;
any `*ImageId` / `*PhotoId` / `*MediaId` must reference media of the website or shared by an ancestor
unit). Each section keeps a **draft** revision and a **published** revision; the public site serves only
the published one, so a new draft never changes the live page until it is published.

| Method | Path | Capability | Body | Response |
|--------|------|------------|------|----------|
| GET    | `/content/:tenantId/pages`                 | in scope | – | `PageDto[]` |
| GET    | `/content/:tenantId/pages/:pageKey`        | in scope | – | `PageDto` — every registered section, with `draft` / `published` (`null` until content exists) |
| PATCH  | `/content/:tenantId/pages/:pageKey`        | `tenant:update` | `{ isEnabled?, seoTitleEn?, seoTitleMr?, seoDescriptionEn?, seoDescriptionMr?, shareImageId? }` | `PageDto`; audit `page.update` |
| PUT    | `/content/:tenantId/pages/:pageKey/sections/:sectionKey/draft` | `content:edit` (+ module `pages`) | `{ data, isVisible?, sortOrder? }` | `PageSectionDto` — creates version `n+1` or updates the current `DRAFT`/`REJECTED` draft in place; `409` while the draft is submitted/approved; `400 VALIDATION_ERROR` on schema failure; audit `section.save` |
| DELETE | `…/sections/:sectionKey/draft`              | `content:edit` (+ module `pages`) | – | `PageSectionDto` — discards a `DRAFT`/`REJECTED` draft; audit `section.discard` |
| POST   | `…/sections/:sectionKey/:action`            | see workflow | `{ note? }` | `PageSectionDto` — `submit`, `start_review`, `approve`, `reject` (note required), `publish` (draft becomes published, previous published is `ARCHIVED`), `unpublish` (published goes offline and becomes the draft again; refused with `409` while another draft exists); audit `section.<action>` |

`archive` is not available for sections — use `unpublish` and discard the draft.

## Scheme ward coverage

Beneficiary **household counts per ward** for a scheme on one website (`SchemeWardCoverage`: `tenantId`,
`schemeId`, `wardNo`, `households`; unique per tenant+scheme+ward). Aggregates only — no beneficiary
records. `wardNo` matches `wardNo` of the Home `ward-details` section so the Schemes page can draw a
coverage map. Shared schemes (owned by a taluka/block/district) can carry separate coverage on each website
they are targeted at.

| Method | Path | Capability | Body | Response |
|--------|------|------------|------|----------|
| GET    | `/content/:tenantId/scheme-coverage/:schemeId` | in scope | – | `SchemeWardCoverageDto` `{ schemeId, tenantId, wards: [{ wardNo, households }], totalHouseholds, updatedAt }` |
| PUT    | `/content/:tenantId/scheme-coverage/:schemeId` | `content:edit` (+ module `schemes`) | `{ wards: [{ wardNo: 1–20 chars, households: int >= 0 }] }` (<= 200, unique `wardNo`) — **replaces** the whole list; `[]` clears it | `SchemeWardCoverageDto`; audit `scheme.coverage_update` |
| DELETE | `/content/:tenantId/scheme-coverage/:schemeId` | as PUT | – | `204` |

The scheme must be visible to the website (its own, or shared and targeted at it/an ancestor); otherwise `404`.

## Public statistics

Numbers only — no record, name, code or note is ever returned. Each endpoint is memoised in-process for
60 s per website and answers with `Cache-Control: public, max-age=60, s-maxage=60`. Figures with no data
source yet are `null` (never `0`) so the frontend can keep showing sample values for them.

| Path | Response (`data`) |
|------|--------------------|
| `GET /public/:tenantSlug/stats/grievances` | `PublicGrievanceStatsDto`: `total`, `resolved`, `rejected`, `pending` (OPEN + IN_PROGRESS), `resolutionRate` (% resolved of total, 1 decimal, `null` when no grievances), `lastMonth { received, resolved }`, `monthBefore { ... }`, `receivedChangePercent` (last vs before, `null` when before = 0), `monthly[12]` `{ month: "YYYY-MM", received, resolved, pending }` (oldest first, current month last; `pending` = received that month and still open), `byCategory[] { category, total, resolved, sharePercent }` (desc by total), `generatedAt` |
| `GET /public/:tenantSlug/stats/schemes` | `PublicSchemeStatsDto`: `totalSchemes` (published + visible), `totalBeneficiaries` (sum of `beneficiaryCount`, `null` when none set), `amountDisbursedTotal` (decimal string), `amountDisbursedThisFinancialYear` (**always `null` for now** — schemes store a cumulative amount without a date), `householdsCovered` (per-ward maximum across schemes from the coverage table, `null` without coverage data), `totalHouseholds` (from the published About > `geography.households`, else `null`), `coveragePercent` (covered / total x 100, `null` when either is unknown), `financialYear` ("2026-27", April–March), `generatedAt` |
| `GET /public/:tenantSlug/stats/services` | `PublicServiceStatsDto`: `grievancesReceivedThisMonth`, `grievancesResolvedThisMonth`, `certificatesIssuedThisMonth: null`, `taxCollectedThisMonth: null`, `citizenSatisfactionRate: null` (no data sources yet), `month: "YYYY-MM"`, `generatedAt` |

Missing inputs for the `null` figures: a certificate/Right-to-Service issuance log, tax collection entries,
a citizen rating captured at resolution, and a dated disbursement record per scheme (for "this financial
year"). Add those models and the figures light up without API changes.

## Audit logs

`GET /audit-logs?tenantId&unitId&actorId&action&entityType&from&to&limit&cursor` → paginated `AuditLogDto`.
Roles with `audit:read` see events inside their scope; everyone sees their own actions.

## Public (no auth, published websites only)

| Method | Path                                   | Query | Response |
|--------|----------------------------------------|-------|----------|
| GET    | `/public/:tenantSlug`                  | –     | `PublicTenantDto`; `404` if not published |
| GET    | `/public/:tenantSlug/announcements`    | `?page=<pageKey>&priority&category&limit&cursor` | paginated `PublicAnnouncementDto` — own published items + shared items targeted at the GP or any ancestor; honours `publishAt`/`expiresAt` |
| GET    | `/public/:tenantSlug/schemes`          | `?level&limit&cursor` | paginated `PublicSchemeDto` — own published + shared targeted schemes |
| GET    | `/public/:tenantSlug/schemes/coverage` | `?schemeId=` (optional) | `PublicSchemeCoverageDto` `{ schemeId, wards: [{ wardNo, households }], totalHouseholds }`; without `schemeId`: per-ward maximum across all published schemes (`schemeId: null`); unpublished/foreign scheme -> `404`; cached 60 s |
| GET    | `/public/:tenantSlug/stats/{grievances,schemes,services}` | – | see **Public statistics** |
| POST   | `/public/:tenantSlug/grievance-attachments` | multipart | see **Complaint form settings** |
| GET    | `/public/:tenantSlug/projects`         | `?stage&year&limit&cursor` | paginated `PublicProjectDto` |
| GET    | `/public/:tenantSlug/media/:mediaId`   | –     | file bytes (`public, max-age=3600`, `nosniff`) — only the website's own media or shared media of an ancestor unit; `404` otherwise |
| GET    | `/public/:tenantSlug/pages/:pageKey`   | –     | `PublicPageDto` — SEO fields + visible, published sections ordered by `sortOrder`; `404` when the page is disabled or the website unpublished |
| POST   | `/public/:tenantSlug/grievances`       | body `{ category, citizenName, citizenPhone?, citizenEmail?, description (10–5000) }` | `201 PublicGrievanceReceiptDto` `{ trackingCode: "GRV-XXXXXXXX", status, createdAt }`; `429` after 5 submissions / hour per IP; audit `grievance.submit` |
| GET    | `/public/:tenantSlug/grievances/:trackingCode` | – | `PublicGrievanceStatusDto` — status + timeline + resolution note (when closed); never citizen details; `404` on another website |

Tenant resolution for server-rendered pages: `resolvePublicTenant(host, pathname)` in
[`src/lib/tenant.ts`](../src/lib/tenant.ts) supports `<slug>.<APP_BASE_HOST>`, a custom domain, or
`/<slug>/…` as the first path segment.

## Section registry

Pages other than `home` and `about` currently have no registered sections (`sections: []`); add
definitions in `src/config/sections.ts` to enable them — no migration needed.

## Page sections — admin editor registry

Section keys per public page, as registered in `src/config/sections.ts` (Home, About) and
`src/config/sections-pages.ts` (all other pages). Every key is written with
`PUT /content/:tenantId/pages/:pageKey/sections/:sectionKey/draft` and validated against its schema.
Full field lists: `docs/admin-editor-backend-needs.md`.

| Page | Section keys |
| --- | --- |
| infrastructure | banner, top-stats, infra-map, map-filters, status-cards, latest-announcements, upcoming-events |
| finance | banner, top-stats, income-sources, expenditure, budget-visualizer, documents |
| services | banner, service-links, service-categories, qr-codes, top-stats, help |
| grievance | banner, complaint-form, support-cards, track-complaint, escalation-matrix, monthly-report |
| culture | banner, village-intro, heritage-cards, culture-cards, homestay, training-programs, leader-cards, fpo-gallery-voice, success-stories |
| employment | banner, support-cards, local-opportunities, skill-directory, assistance-items, training-programs, job-portals, success-stories |
| education | banner, support-cards, student-spotlight, youth-speak-tabs, youth-posts, scheme-cards, success-stories |
| environment | banner, top-stats, green-scoreboard, tree-adoption, sustainability-initiatives, market-prices, weather-update |
| announcements | banner, top-stats, announcement-categories, calendar, deadline-cards, download-forms, support-cards |
| gallery | banner, photo-gallery, video-gallery, press-coverage, then-and-now, mini-documentary |
| contact | banner, contact-cards, office-location, feedback-form, partners, volunteer-categories, volunteer-registration |

Rules enforced by the schemas:
- Links are `https://` (job portals, press, QR codes, social links); CTA hrefs also allow site paths and `mailto:`/`tel:`.
- Videos: YouTube or Vimeo only. Social reels: YouTube, Instagram or Facebook. Maps: Google Maps or OpenStreetMap embeds only.
- Money amounts are decimal strings (`12500.00`); market prices must satisfy min ≤ modal ≤ max.
- Media fields (`*Id`, `*Ids`, including `fileId`, `iconId`, `logoId`, `videoId`, `thumbnailId`) must belong to the website or an ancestor unit.
- Submitting a Student Spotlight for review requires `guardianConsent.confirmed = true`
  (`confirmedBy`, `confirmedAt`); the check runs on `submit` only, so drafts can be saved without it.
- Home `ward-details` wards: `{ wardNo?, name, colour?, geometry?, mapImageId?, items[] }`. `wardNo` (<= 20 chars,
  unique within the section) links a ward to scheme coverage and markers. `colour` is a hex `#RRGGBB`.
  `geometry` is GeoJSON `Polygon` or `MultiPolygon` (WGS84 `[lng, lat]`, lng -180..180, lat -90..90, every ring
  closed with >= 4 positions, <= 20 rings per polygon, <= 50 polygons, <= 2000 coordinate pairs in total);
  `mapImageId` is an uploaded picture as the alternative. Both may be present; the frontend prefers `geometry`.
- Contact `volunteer-categories` items: `{ title, description?, iconId?, order }`; `partners` items:
  `{ logoId?, title, description?, partnerLogoIds[] }`.

Cache refresh: publishing or unpublishing a section and changing page settings call `revalidateTag` for
`tenant:<slug>` and `page:<slug>:<pageKey>` (src/lib/revalidate.ts), so the public pages update immediately
instead of waiting for the 60 s time-based revalidation.

Not part of these schemas yet (need other endpoints): computed grievance statistics, public complaint
and feedback forms, live weather, and server-generated QR images.

## Contact-page forms (feedback and volunteers)

Public submit endpoints. A form is open only while its Contact-page section is published with `enabled: true`
and `showOnWebsite: true`; otherwise the endpoint returns `404 NOT_FOUND`.

### POST /public/:tenantSlug/feedback
Request (`feedbackSchema`, strict):
```json
{ "name": "2–120 chars", "email": "optional email", "phone": "optional +91…", "message": "10–2000 chars", "website": "", "turnstileToken": "optional" }
```
- `website` is a honeypot: it must be empty. A filled value gets a success response but nothing is stored or sent.
- Rate limit: 5 submissions per hour per IP (`RATE_LIMITED`, 429).
- CAPTCHA: Cloudflare Turnstile when `TURNSTILE_SECRET_KEY` is set (then `turnstileToken` is required). Without the key, only the honeypot and the rate limit apply.
- Response `201`: `{ "data": { "message": "<successMessage>" } }`. Nothing about the stored record is returned.
- Notifications: the record is stored; email goes to `recipientEmail` and `notificationEmail` (when set), and the `autoReply` text goes to the visitor when an email was given.

### POST /public/:tenantSlug/volunteers
Request (`volunteerSchema`, strict):
```json
{ "name": "2–120 chars", "email": "email (required)", "phone": "+91… (required)", "category": "must match a published volunteer category (en or mr)", "message": "optional, ≤2000", "website": "", "turnstileToken": "optional" }
```
- Refused with `400 BAD_REQUEST` after `deadline` (YYYY-MM-DD, UTC).
- Category not in the published `volunteer-categories` list → `400 VALIDATION_ERROR` on `category`.
- Same honeypot, rate limit (5/hour/IP) and CAPTCHA rules as feedback.
- Response `201`: `{ "data": { "message": "<successMessage>" } }`.

### Admin: GET /form-submissions?tenantId=&kind=FEEDBACK|VOLUNTEER&limit&cursor
Auth required; capability `content:review` on the website's scope (GP admins and above). Paginated.
Item shape (`FormSubmissionDto`): `{ id, kind, name, email, phone, category, message, createdAt }`. No IP address is stored or returned.

### Admin: GET /form-submissions/:submissionId
Same permissions. Another website's submission returns `404`.

### Admin: GET /form-submissions/summary?tenantId=
Same permissions. `{ "data": { "feedback": { "total", "last30Days" }, "volunteer": { "total", "last30Days" } } }`.

### Retention
Submissions older than `FORM_SUBMISSION_RETENTION_MONTHS` (default 12, env) are deleted by
`npm run forms:purge` (`scripts/purge-form-submissions.ts`). Schedule it daily (cron or a Windows task).
Only the fields the form asks for are stored.

## Complaint form settings (grievance submit)

The published "complaint-form" section (page `grievance`) is enforced by `POST /public/:tenantSlug/grievances`.
When the section is missing or unpublished, the form works with safe defaults: no CAPTCHA, no uploads, no notification.

### GET /public/:tenantSlug/grievance-form
Public. Returns what the form needs to adapt. The recipient address is never returned.
`{ "data": { "captchaEnabled", "allowFileUpload", "maxFileSizeMb", "allowedFileTypes": ["pdf","jpg","jpeg","png","webp"], "heading", "description", "successMessage", "submitButtonText" } }`

### POST /public/:tenantSlug/grievances (request additions)
- `attachmentIds`: optional array (max 5) of ids returned by `POST /public/:tenantSlug/grievance-attachments` (below). Allowed only when `allowFileUpload` is true (otherwise `400 BAD_REQUEST`).
  Each id must have been uploaded through that endpoint **for this website**, be unexpired and not yet attached to another complaint, and still satisfy the form's current `maxFileSizeMb` / `allowedFileTypes`. Violations return `400 VALIDATION_ERROR` with `details[].path = "attachmentIds"`. Duplicates are refused. Library media (admin uploads) can never be attached.
- `turnstileToken`: required when `captchaEnabled` is true. If `TURNSTILE_SECRET_KEY` is not configured, the submit fails closed with `503` (`INTERNAL_ERROR`), so the form cannot be used without the key.
- When a `recipientEmail` is set, a notification is sent with the tracking code, category and attachment count only. No citizen details are included.

### POST /public/:tenantSlug/grievance-attachments — citizen file upload
`multipart/form-data`, one file per request: `file` (required), `website` (honeypot — must be empty), `turnstileToken` (required when `captchaEnabled`).

| Rule | Behaviour |
|------|-----------|
| Form must be published with `allowFileUpload: true` (and the website published) | otherwise `404 NOT_FOUND` |
| Size | `<= maxFileSizeMb` from the section (hard cap 10 MB) -> `400 BAD_REQUEST` `{ maxBytes }` |
| Type | detected from the **file signature** (declared `Content-Type` and extension are ignored); must map to `allowedFileTypes` (`pdf`->`application/pdf`, `jpg`/`jpeg`->`image/jpeg`, `png`, `webp`) -> `400 BAD_REQUEST` `{ allowed }` |
| Honeypot | a filled `website` returns a plausible `{ id }` but stores nothing; the id can never be attached |
| CAPTCHA | same as submit: required when `captchaEnabled`; `503` while no secret is configured |
| Rate limit | 10 uploads / hour / IP -> `429 RATE_LIMITED` |
| Pending cap | at most `GRIEVANCE_UPLOAD_MAX_PENDING` (default 200) unattached uploads per website -> `429` |
| Response | `201 { "data": { "id": "<mediaId>" } }` — **no URL**; the file is never publicly readable |

Storage: a `Media` row with `source = PUBLIC_GRIEVANCE`, `uploadedById = null`, key `<tenantId>/grievance/<id>.<ext>`, and `expiresAt = now + GRIEVANCE_UPLOAD_TTL_HOURS` (default 24). Such rows are excluded from the media library (`GET /media`), from the public media route (`GET /public/:slug/media/:id` -> `404`) and from page-section / project media references. Audit: `grievance.attachment_upload` (no personal data).

Full flow: upload each file -> collect ids -> `POST /public/:slug/grievances` with `attachmentIds` -> attaching links the files (`GrievanceAttachment`) and clears `expiresAt`. Staff see them on `GET /grievances/:id` (`attachments[]`) and download with `GET /media/:id/file` (scope-checked). Unattached uploads past `expiresAt` are deleted (row + bytes) by `npm run forms:purge` (`purgeExpiredGrievanceUploads`); schedule it daily.

