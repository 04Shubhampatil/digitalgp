# Frontend implementation plan (Stage 3)

Status: **proposal — not started**. Revised after `feat/backend-foundation` (#1) merged.
Inputs: `docs/requirements/frontend-inspection-summary.md` (Figma + circular inventory),
`docs/api-contract.md` + `src/types/api.ts` (backend contract), `src/lib/permissions.ts` (roles),
`src/config/pages.ts` (page registry), `prisma/schema.prisma` (content model).
Owner: frontend. Backend-owned files (`prisma/`, `src/lib/`, `src/features/`, `src/app/api/`, `tests/`)
are not touched; shared files (`src/types/api.ts`, `src/config/`, `package.json`) change only by agreement.

## 0. What the backend already fixes (frontend must follow, not re-decide)

| Topic | Backend decision | Frontend consequence |
|---|---|---|
| Roles | `SUPER_ADMIN`, `TALUKA_ADMIN`, `BLOCK_ADMIN`, `GP_ADMIN`, `DATA_ENTRY_OPERATOR` (`Role` in `types/api.ts`); user holds one or more assignments `{ role, unitId, modules[] }` | nav/visibility derives from `CurrentUserDto.capabilities` + assignments, **not** from a single role; Figma's 3-role matrix is a design gap (summary §4.4.2) |
| Capabilities | `hierarchy:*`, `tenant:*`, `user:*`, `content:read/edit/submit/review/publish/share`, `media:manage`, `grievance:manage`, `audit:read(-own)`, `roles:manage` (`src/lib/permissions.ts`) | UI hides controls by capability; server re-checks everything |
| Content workflow | `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED → ARCHIVED`, `REJECTED` (note required); actions `submit / start_review / approve / reject / publish / unpublish / archive` (`src/features/content/workflow.ts`); only `DRAFT`/`REJECTED` editable | status pills + action buttons per status; editors lock when not editable; DEO sees *Submit for review*, GP Admin+ sees *Approve / Reject / Publish* |
| Tenant status | `DRAFT \| PUBLISHED \| SUSPENDED` (`TenantStatus`) | Figma's "Not Created" = GP unit with `tenantId: null` in `AdminUnitDto` |
| Tenant addressing | `resolvePublicTenant(host, path)` supports `<slug>.<APP_BASE_HOST>`, custom domain, or `/<slug>` first segment | public routes live under `(public)/[tenant]`; `middleware.ts` rewrites host-based requests to `/<slug>/…` using the same rules as `extractTenantKey` (re-implemented without Prisma, middleware is edge) |
| Hierarchy | `STATE > DISTRICT > TALUKA > BLOCK (optional) > GRAM_PANCHAYAT`, materialised `path` | District/Taluka/GP scope selectors in the topbar are `GET /hierarchy/units?parentId&level` cascades |
| Pages | `PAGE_KEYS` (15 + optional `progress`) in `src/config/pages.ts`; `Page` row per (tenant, pageKey) with SEO fields; `Section` rows per `sectionKey` with `draft` / `published` `SectionRevision` (JSON validated by a per-key zod schema) | **every editor block = one `sectionKey`**; the frontend section registry extends `pages.ts` with UI metadata (label i18n, nav group, section list) and the public page renders `published` revisions only |
| Locales | `Locale = "EN" \| "MR" \| "HI"`; content fields are `*En` / `*Mr` pairs | UI chrome via i18n dictionaries (mr/en, hi later); content picks the field for the active locale with fallback to the other |
| API shape | `{ data }`, lists `{ data, page: { nextCursor, limit } }`, errors `{ error: { code, message, details } }`; cookie session `dgp_session`; same-origin fetch passes CSRF | one `apiFetch` helper that unwraps envelopes, maps `VALIDATION_ERROR.details[]` onto form fields and `UNAUTHENTICATED` to `/login`; tables use **cursor** pagination (no page numbers — Figma's "1 2 3" pager becomes *Load more / Next*) |
| Toolchain | Next 16.4.3, React 19.3, TypeScript 5.9 strict, zod 4, Vitest 5 (node env, DB-backed integration), ESLint 9 flat config, `@/*` alias, `serverExternalPackages` for Prisma/argon2 | add only what the UI needs (below); keep `vitest.config.ts` shared — frontend unit tests go in `src/**/*.test.ts(x)` with `// @vitest-environment jsdom` |

## 1. Dependencies to add (frontend PR, coordinated in `package.json`)

| Package | Purpose | Note |
|---|---|---|
| `tailwindcss@4`, `@tailwindcss/postcss` | styling; tokens in `src/styles/globals.css` `@theme` from summary §4.4.4 | spec requires Tailwind |
| `next-intl` | UI strings `src/i18n/messages/{mr,en}.json`; locale from cookie, default `mr` on public, `en` in admin | circular rule 3 |
| `react-hook-form`, `@hookform/resolvers` | forms; **reuse the backend zod schemas** from `src/features/*/validators.ts` where they are pure (no DB) — otherwise mirror them in `src/lib/forms/schemas.ts` | zod 4 already present |
| `lucide-react` | icons | |
| `@tanstack/react-table` | sortable admin tables with cursor paging | |
| `@dnd-kit/core`, `@dnd-kit/sortable` | row reorder in section editors (`sortOrder`) | |
| `recharts` | Finance / Schemes / Progress charts | SSR-safe |
| `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` | component tests | dev |
| `@playwright/test` | e2e (login per role, nav visibility, tenant routing, published-only) | dev; CI job added later with backend |
| `next/font` (built-in) | Noto Sans Devanagari, Inter, Sora, Manrope | no package |

Not added: react-query (Server Components + Route Handlers suffice for v1), Leaflet (Google Maps embed first).

## 2. Routing (`src/app`)

```
app/
├─ layout.tsx                         fonts, <html lang>, NextIntl provider           (replaces backend placeholder)
├─ middleware.ts                      host → /<slug> rewrite; admin session cookie presence check
├─ (public)/[tenant]/layout.tsx       GET /public/:slug → 404 if not PUBLISHED; GovtStrip + Navbar + Footer
│   ├─ page.tsx                       home            ─┐
│   ├─ about … contact/page.tsx       14 pages         ├ each renders published sections for its pageKey
│   ├─ progress/page.tsx              optional 16th   ─┘  (hidden unless Page.isEnabled)
│   ├─ announcements/page.tsx         + GET /public/:slug/announcements?page=announcements
│   ├─ search/page.tsx                client-side over published sections until a search API exists
│   └─ sitemap/page.tsx               from page registry + enabled pages
├─ (auth)/login | forgot-password | reset-password?token=
└─ (admin)/admin/layout.tsx           GET /auth/me (server) → redirect /login; AdminShell(assignments, capabilities)
    ├─ dashboard/                      picks SuperAdmin | Taluka/Block | GpCms view by highest role
    ├─ hierarchy/                      units tree (hierarchy:read/manage) + Add Taluka / Add GP modals
    ├─ websites/                       GET /tenants (+ GP units without tenant = "Not Created")
    │   └─ [tenantId]/                 GP CMS dashboard (setup progress from section statuses)
    │       └─ pages/[pageKey]/        section editors (draft revisions) + workflow bar
    ├─ users/                          replaces Figma "Block Admins": list/create/assign for every creatable role, incl. DEO module grants
    ├─ roles/                          read-only capability matrix (ROLE_CAPABILITIES is fixed in code; "Save" hidden until roles:manage is editable)
    ├─ announcements/                  GP-owned + shared, workflow actions, targets picker
    ├─ media/                          library (needs media API)
    ├─ audit-logs/                     GET /audit-logs with filters
    └─ profile/                        change-password
```

`src/config/pages.ts` stays backend-shared; the frontend adds `src/config/page-sections.ts`:
`{ pageKey, navGroup, sidebarGroup, i18nKey, sections: [{ sectionKey, editor, public }] }` — the
section keys must match the backend's per-key zod schemas once `/content` endpoints land (agree the
list first; proposal in §5).

## 3. Component library (`src/components`)

**ui/** Button, Input, Textarea, Select (+ async cascade), Checkbox, Toggle, StatusPill (variants =
`ContentStatus` ∪ `TenantStatus` ∪ `AnnouncementPriority` ∪ allowed/notAllowed/viewOnly/ownActivity),
Card, MetricCard, ProgressBar, Tabs, Dialog, ConfirmDialog, Toast, CursorPager, Skeleton, EmptyState,
ErrorState, DataTable, DropdownMenu, Avatar, FileDropzone, DatePicker, LanguageSwitcher.

**layout/** AdminSidebar (groups filtered by capability; Figma's 3 navbar variants collapse into one
data-driven sidebar), AdminTopbar (scope cascade District → Taluka → GP, search, lang, user menu),
PublicGovtStrip, PublicNavbar (grouped dropdowns from `page-sections.ts`), PublicFooter, AuthSplitLayout.

**admin/** WorkflowBar (status + allowed actions from `TRANSITIONS` mirrored client-side), SectionCard
(title + `isVisible` toggle + revision status), SortableRowTable, BannerEditor, CtaListEditor,
ImageSlotPicker (media API), StatCardsEditor, WeatherEditor, SarpanchMessageEditor, CategoryManager,
NoticeManager, CmsPageOverviewTable, SetupProgress, QuickActions, ActivityFeed (audit logs), ScopeTargetPicker
(for shared announcements: all / taluka / selected GPs), ModuleGrantEditor (DEO modules × canWrite).

**public/** Hero, StatsStrip, ServiceIconGrid, NewsList, LeaderCards, OfficerCards, ProjectCard +
BeforeAfterSlider, SchemeCard, DonutChart/BarChart, WardMap, BudgetPieChart, GalleryGrid, VideoGrid,
ComplaintForm, TrackComplaint, FeedbackForm, ContactCard, MapEmbed, WeatherWidget, ThoughtOfTheDay,
ProgressMeter, EventCalendar, AnnouncementList (`isShared` badge).

**lib/api/** `apiFetch` (envelope + error mapping), typed clients per feature (`auth`, `hierarchy`,
`tenants`, `users`, `announcements`, `audit`, `public`) importing DTOs from `@/types/api`;
`MockAdapter` behind `NEXT_PUBLIC_API_MODE=mock` for endpoints that do not exist yet.

## 4. Build order (one reviewable PR each)

1. Tailwind + tokens + fonts + next-intl + `apiFetch` + jsdom test setup; replace placeholder `layout.tsx`. *(blocks everything)*
2. `ui/` primitives + `/dev/ui` playground (dev-only) + unit tests (StatusPill, DataTable, CursorPager).
3. Auth: login (`POST /auth/login`; the Figma "Login as" dropdown becomes informational since the role comes from the session), forgot/reset, change-password, `mustResetPassword` redirect.
4. Admin shell: `/auth/me` guard, capability-driven sidebar, scope cascade topbar, logout dialog.
5. Super/Taluka/Block admin screens on **real APIs**: dashboard (counts from `/hierarchy/units`, `/tenants`, `/users`), hierarchy + modals, websites list + create, users (all roles, DEO module grants), roles matrix (read-only), audit logs, announcements (+ workflow actions, targets, success modal).
6. GP CMS dashboard + CMS Page Overview (section status aggregation) — **needs `/content` endpoints**; mocked until then.
7. Editor framework (SectionCard, SortableRowTable, BannerEditor, WorkflowBar) + Home editor; agree section keys/schemas with backend as they land.
8. Remaining 14 editors from `page-sections.ts`.
9. Public shell (`/public/:slug`, govt strip, navbar, footer, locale switch) + Home from published sections.
10. Remaining public pages, announcements feed, grievance form (needs grievance API), search, sitemap.
11. Playwright: login per seeded role (`npm run db:seed` users), nav visibility, tenant routing, published-only; a11y pass.

## 5. Backend dependencies still open (Stage 4 — agree with backend)

Implemented and usable now: auth, hierarchy, tenants, users/assignments/modules, announcements (+ workflow), audit, public tenant + announcements feed.

| Need | Proposed shape (to confirm) | Blocks |
|---|---|---|
| Page sections | `GET /tenants/:id/pages` → `[{ pageKey, isEnabled, seo…, sections: [{ sectionKey, sortOrder, isVisible, draft?: {status, data, version}, published?: {…} }] }]`; `PUT /tenants/:id/pages/:pageKey/sections/:sectionKey` (draft data) ; `PATCH …/sections` (order/visibility); `POST …/sections/:sectionKey/:action` (workflow); `PATCH /tenants/:id/pages/:pageKey` (SEO, isEnabled); public: `GET /public/:slug/pages/:pageKey` → published data only | steps 6–10 |
| Section key list + zod schemas | frontend proposes keys per page from Figma (summary §4.4.1 / §4.4.3); backend owns the schemas in `src/features/content/validators` | step 7 |
| Media | `POST /media` multipart → `MediaDto { id, url, kind, width, height, altEn, altMr }`; `GET /media?tenantId&kind&cursor`; `DELETE /media/:id`; a public URL scheme for `storageKey` | image pickers, gallery |
| Schemes / Projects | CRUD + workflow per `Scheme` / `Project` models; public list endpoints | schemes, projects pages |
| Grievances | public `POST /public/:slug/grievances` → `{ trackingCode }`, `GET /public/:slug/grievances/:trackingCode`; admin list/assign/resolve | grievance page |
| Dashboard stats | counts by status for scope (tenants, users, announcements, pending reviews) — or frontend aggregates list endpoints until then | dashboards |
| Search | `GET /public/:slug/search?q=` over published sections + announcements | search page |
| Shared "Our Leaders" / dignitaries | district/taluka-level section data targeted like shared announcements (open decision #10) | About/Home |
| Preview of draft site | signed preview token or session-gated `?preview=1` render of draft revisions | "Preview Website" button |

Open decisions carried from `docs/requirements/requirements.md` §9 that affect UI: separate GP Admin login
(now a backend role — UI shows it), who creates GP websites (`tenant:create` = Super + Taluka admin),
Hindi (locale exists; UI dictionaries mr/en first), 16th page (`progress` key exists; off by default).

## 6. Mocking strategy

`src/lib/api/client.ts` selects `MockAdapter` per feature when `NEXT_PUBLIC_API_MODE=mock`; fixtures
in `tests/fixtures/frontend/*.json` mirror the DTOs in `src/types/api.ts` and the seed data
(Maharashtra › Pune › Haveli/Mulshi › `ganeshwadi`, `padegaon`, `vasantpuri`). Implemented endpoints
are hit for real against `npm run dev` + `docker compose up` + `db:seed`; only the §5 gaps are mocked.
