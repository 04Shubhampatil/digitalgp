# Frontend implementation plan (Stage 3)

Status: **proposal — not started**. Depends on `docs/requirements/frontend-inspection-summary.md`.
Owner: frontend. Backend touch-points are called out explicitly so the API contracts can be
agreed before integration (Stage 4).

## 1. Bootstrap (frontend branch, coordinated `package.json`)

| Item | Decision (proposed) | Why |
|---|---|---|
| Next.js | latest stable App Router (`next@15`), React 19, TypeScript strict | spec requires App Router; nothing installed yet |
| Styling | Tailwind CSS v4 with design tokens in `src/styles/globals.css` (`@theme`) | spec; tokens from Figma §4.4.3 |
| Fonts | `next/font/google`: Noto Sans Devanagari (body, mr+en), Inter (auth), Sora + Manrope (brand) | Figma |
| i18n | `next-intl` with `src/i18n/messages/{mr,en}.json`; locale in cookie, not URL (tenant already owns the first path segment) | circular rule 3 |
| Forms | `react-hook-form` + `zod` (shared schemas in `src/types` so backend validators can be reused) | consistent client/server validation |
| Data | Server Components fetch via typed service layer `src/lib/api/*`; client mutations via Route Handlers; `@tanstack/react-query` **not** added until needed | keep deps minimal |
| Charts | `recharts` (pie/donut/bar on Finance, Schemes, Dashboard) | small, SSR-safe |
| Icons | `lucide-react` | Figma uses simple line icons |
| Tables | hand-rolled `DataTable` on top of `@tanstack/react-table` | sortable/paginated admin tables |
| Drag reorder | `@dnd-kit/sortable` (only in CMS editors) | row drag handles in every editor table |
| Maps | Google Maps embed iframe (no API key needed) first; Leaflet later if GIS layer is confirmed | circular "GIS-style map" |
| Testing | Vitest + Testing Library (unit), Playwright (e2e: login, role nav, tenant routing) | spec |
| Lint | ESLint (`next/core-web-vitals`) + Prettier | spec |

Config files to add: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`,
`eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `middleware.ts`.
**Prisma / DB / auth internals are backend-owned and will not be touched.**

## 2. Routing

```
src/app
├─ layout.tsx                      html/body, fonts, intl provider
├─ (public)/[tenant]/layout.tsx     resolves tenant → GovtStrip + Navbar + Footer (published data only)
│   ├─ page.tsx                    1 Home
│   ├─ about | projects | schemes | announcements | infrastructure | finance | services
│   │  culture | employment | education | grievance | environment | gallery | contact
│   ├─ search/page.tsx             keyword search (rule 8)
│   └─ sitemap/page.tsx            content index (rule 7)
├─ (auth)/login | forgot-password | reset-password
├─ (admin)/admin/layout.tsx        session guard (server) → role-aware Sidebar + Topbar
│   ├─ dashboard/page.tsx          switches on role: SuperAdminDashboard | BlockAdminDashboard | GpCmsDashboard
│   ├─ hierarchy/                  07 District & Taluka management (+ Add Taluka / Add GP modals)
│   ├─ websites/                   03 GP Website management (list) ; [websiteId]/ = GP CMS dashboard
│   │   └─ [websiteId]/pages/[pageKey]/page.tsx   per-page editor (15 keys from page registry)
│   ├─ block-admins/               08 list, 09 create, 10 assign access, 11 profile
│   ├─ roles/                      18 Roles & Permissions matrix
│   ├─ announcements/              22 Public announcements (+ Publish modal, success modal)
│   ├─ audit-logs/                 17
│   ├─ media/                      media library (used by editors' image pickers)
│   └─ profile/
└─ api/                            backend-owned
```

- **Tenant resolution**: `middleware.ts` rewrites `<slug>.<root-domain>/*` → `/<slug>/*` so both
  subdomain (live sites) and path (`domain.com/gp-name`) work; pages only ever see `[tenant]`.
  Unknown slug → `notFound()`. Needs backend endpoint `GET /api/v1/tenants/:slug` (public,
  published only).
- `src/config/pages.ts` — single registry `{ key, path, navGroup, sidebarGroup, i18nKey, editorSections[] }`
  for the 15 pages; drives public nav, admin sidebar, CMS Page Overview table and editor routing.
- `src/config/roles.ts` — `SUPER_ADMIN | BLOCK_ADMIN | GP_ADMIN | DATA_ENTRY_OPERATOR` + nav
  visibility map. (Figma only draws Super/Block/Normal — see inspection doc §4.4.2 for the gap.)

## 3. Component library (`src/components`)

**ui/** Button (primary/secondary/ghost/danger), Input, Textarea, Select (native + searchable),
Checkbox, Toggle, Badge/StatusPill (variants: published, draft, notCreated, scheduled, important,
emergency, urgent, allowed, notAllowed, viewOnly, ownActivity), Card, MetricCard, ProgressBar,
Tabs, Modal/Dialog, ConfirmDialog, Toast, Pagination, Skeleton, EmptyState, ErrorState,
DataTable, DropdownMenu (•••), Avatar, FileDropzone, DatePicker, LanguageSwitcher.

**layout/** AdminSidebar (3 variants = Admin/Block/GP CMS navbars from Figma), AdminTopbar
(District/Taluka/GP scope selects, search, lang, user menu), PublicGovtStrip, PublicNavbar
(grouped dropdowns), PublicFooter, AuthSplitLayout.

**admin/** CmsPageOverviewTable, WebsiteSetupProgress, WebsiteDetailsCard, QuickActions,
ActivityFeed, StatusBars, editor blocks: `SectionCard` (title + "Show this section" toggle),
`BannerEditor`, `SortableRowTable`, `CtaListEditor`, `ImageSlotPicker`, `StatCardsEditor`,
`WeatherEditor`, `SarpanchMessageEditor`, `CategoryManager`, `NoticeManager`.

**public/** Hero, StatsStrip, ServiceIconGrid, NewsList, LeaderCards, OfficerCards,
ProjectCard (+ BeforeAfterSlider), SchemeCard, DonutChart/BarChart wrappers, WardMap,
BudgetPieChart, GalleryGrid, VideoGrid, ComplaintForm, TrackComplaint, FeedbackForm,
ContactCard, MapEmbed, WeatherWidget, ThoughtOfTheDay, ProgressMeter, Calendar.

**forms/** Field wrappers with label/hint/error, zod resolvers, `useConfirmLeave`.

## 4. Build order (each step = one reviewable PR)

1. Bootstrap + tokens + fonts + i18n skeleton + lint/test config; `/` renders. *(blocks everything)*
2. `ui/` primitives + Storybook-less playground route `/dev/ui` (dev only) + unit tests for StatusPill/DataTable.
3. Auth screens (login with role select, forgot, reset) wired to a typed `authService` with mock adapter.
4. Admin shell: sidebar variants, topbar, role-based nav, session guard stub, logout modal.
5. Super Admin: dashboard, GP website management, district/taluka management + modals, block admins (list/create/assign/profile), roles matrix, audit logs, announcements (+ publish/success modals).
6. Block Admin: dashboard, assigned websites.
7. GP CMS dashboard + page-overview table.
8. Editor framework (`SectionCard`, `SortableRowTable`, banner editor) + **Home** editor end-to-end.
9. Remaining 14 editors from the registry (mostly configuration of the same blocks).
10. Public shell (govt strip, navbar, footer, tenant resolution, language switch) + **Home**.
11. Remaining 14 public pages + search + sitemap.
12. Playwright: login per role, nav visibility, tenant routing, publish-only visibility; a11y pass.

## 5. Backend contracts needed (Stage 4 — to agree with backend dev)

All under `/api/v1`, JSON, `{ data, error, meta }` envelope, cursor/offset pagination `?page&pageSize`.

| Area | Endpoints (proposed) | Used by |
|---|---|---|
| Auth | `POST auth/login {email,password,role}` → session cookie; `POST auth/logout`; `POST auth/forgot-password`; `POST auth/reset-password`; `GET auth/me` → `{ user, role, scope:{districtIds,talukaIds,gpIds}, permissions[] }` | auth, admin guard, nav |
| Tenants | `GET tenants/:slug` (public) → `{ id, slug, name_mr, name_en, district, taluka, contact, logo, socialLinks, publishedPages[] }` | public layout |
| Content (public) | `GET tenants/:slug/pages/:pageKey` → published JSON for that page (shape per `editorSections`) ; `GET tenants/:slug/search?q=` ; `GET tenants/:slug/announcements` | public pages |
| Hierarchy | `GET/POST districts`, `GET/POST talukas`, `GET/POST gram-panchayats` + stats | 07, modals |
| Websites | `GET websites?district&taluka&status&q`, `POST websites` (create GP website), `GET websites/:id` (setup progress, page statuses), `GET/PUT websites/:id/pages/:pageKey` (draft), `POST …/publish`, `POST …/preview-token` | 03, GP CMS, editors |
| Accounts | `GET/POST block-admins`, `PUT block-admins/:id/access`, `GET/POST gp-admins`, `GET/POST operators` (module permissions) | 08–11, DEO mgmt |
| Roles | `GET roles/permissions`, `PUT roles/permissions` | 18 |
| Announcements | `GET announcements?scope`, `POST announcements` `{ title, category, priority, scope:{all|taluka|gpIds[]}, pages[], publishAt }`, `PUT …/:id`, `DELETE` | 22 |
| Media | `POST media` (multipart) → `{ id, url, width, height }`, `GET media?websiteId` | editors |
| Grievances | `POST tenants/:slug/grievances` (public), `GET tenants/:slug/grievances/:ticket` (track), admin list/update | 12 |
| Audit | `GET audit-logs?actor&action&from&to` | 17 |
| Shared data | `GET shared/dignitaries?district&taluka` (ministers, ZP/PS officers) | public About/Home |

Open backend questions: content-status enum (draft/submitted/approved/published/rejected?),
approval workflow endpoints (not in Figma), DEO module-permission shape, preview of unpublished
content (signed URL vs session), image storage URL base.

## 6. Mocking strategy

`src/lib/api/client.ts` picks `MockAdapter` when `NEXT_PUBLIC_API_MODE=mock` (default in dev
until endpoints exist); fixtures in `tests/fixtures/*.json` mirror the contract shapes above and
are the same data the Figma frames show (Savardari / Pune / Shirur). Switching to the real
backend = env change, no UI edits.
