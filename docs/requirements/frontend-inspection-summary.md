# Frontend inspection summary (Stage 1–2)

Date: 2026-10-26 · Author: frontend (with Claude Code) · Branch: `frontdent-foundetion`

This document records what was inspected before any frontend code is written, what the
designs and requirements contain, and what is still unknown. It is the input for the
Stage 3 implementation plan.

## 1. Repository state

- Two commits (`Add project folder structure`, `calude`). **No application code yet** —
  no `package.json`, no Next.js app, no Tailwind config, no Prisma schema, no tests.
  Every folder holds only a `.gitkeep`.
- Folder layout is already decided in `README.md` and matches the architecture doc:
  - `src/app/(public)/[tenant]/…` — 15 public pages + `search` + `sitemap`
  - `src/app/(auth)/{login,forgot-password,reset-password}`
  - `src/app/(admin)/admin/{dashboard,hierarchy,block-admins,roles,websites/[websiteId]/pages/[pageKey],announcements,media,audit-logs,profile}`
  - `src/app/api/v1/{auth,tenants,hierarchy,accounts,websites,content,announcements,media,grievances,search,audit-logs}` — backend-owned
  - `src/components/{ui,layout,public,admin,forms}`, `src/config`, `src/i18n/messages`, `src/types`
  - `src/modules/*`, `src/server/*`, `prisma/*` — backend-owned
- **Tenancy decision conflict** (needs an ADR in `docs/decisions/`):
  - Master prompt: `domainname.com/gram-panchayat-name` (path-based) — matches `(public)/[tenant]`.
  - README / nginx notes and the live reference sites use **subdomains** (`ganeshwadi.digitalgp.in`).
  - Frontend will resolve the tenant from the `[tenant]` route segment; a middleware rewrite from
    `<slug>.domain` → `/<slug>` can be added later without changing pages. Backend must confirm.

## 2. Requirements source: Govt. of Maharashtra circular (16 Oct 2025)

File: `DOC-20251018-WA0021 (2).pdf` (8 scanned pages, Marathi). It is the RDD letter
"मुख्यमंत्री समृद्ध पंचायतराज अभियान" listing what every Gram Panchayat website must contain.

### 2.1 Framework rules (page 2)
1. Government branding — official logos and prescribed theme.
2. Ownership — department/institution name, address and contact on home page, footer/header and all entry pages.
3. **Bilingual: Marathi + English** (home page bullet also mentions Hindi).
4. Content management — GRs, notices, scheme and works documents kept up to date.
5. Photos and details of CM / Dy. CMs / ministers / departmental officers + institutional hierarchy.
6. Latest announcements, alerts, flagship programmes, schemes.
7. Sitemap / content index.
8. Keyword search.
9. Citizen feedback form.
10. Social media integration (Instagram, Facebook of GP and RDD).

### 2.2 The 16 content sections (pages 3–8) → public routes

| # | Section (circular) | Route folder | Key content |
|---|---|---|---|
| 1 | Home page | `[tenant]/` | hero (photo, logo, slogan), quick stats (population, households, literacy, wards, area, water source), latest news, live weather widget, thought of the day / panchayat message, language switch, welcome video, "progress meter" infographic |
| 2 | About the GP | `about` | history, panchayat structure (Sarpanch, Up-Sarpanch, members), office address/hours/contact, roles & responsibilities, emergency contacts (health, police, ambulance, fire, FPO, MSEB, forest), vision/values, "know your leaders" |
| 3 | Key projects & initiatives | `projects` | completed (photos, year, cost, result), ongoing with progress, proposed; before/after slider, resolution tracker, impact dashboard |
| 4 | Schemes & beneficiaries | `schemes` | central/state/district schemes, application process, eligibility, documents, ward-wise coverage map, "star beneficiary" stories |
| 5 | Announcements & circulars | `announcements` | meeting notices (Gram Sabha), circulars/orders, deadlines (tax, elections, camps), downloads (forms, PDFs), interactive calendar |
| 6 | Village infrastructure & facilities | `infrastructure` | water & sanitation, roads & lights, schools/anganwadi/health, library/playground/SHG centre, bus stop, health camps; GIS map, smart village dashboard |
| 7 | Finance & budget transparency | `finance` | annual budget summary, income sources, expenditure split, "where your rupee goes" infographic, interactive pie chart |
| 8 | Citizen services & forms | `services` | certificate links (birth, death, RTS), grievance portal link, feedback, online tax payment with QR |
| 9 | Our village – identity & culture | `culture` | history & festivals, temples/heritage, folk arts, homestays, notable persons, cultural programmes, local cuisine/handicrafts, FPO groups, virtual gallery, "voice of the village" videos |
| 10 | Employment & skill development | `employment` | local jobs/tenders, SHG & MSME, youth training, employment portal links, "village talent directory", farmer help centre |
| 11 | Education & youth corner | `education` | schools & student achievements, scholarships, career guidance, sports/NSS, student of the month, youth speak, local entrepreneurs |
| 12 | Grievance redressal & feedback | `grievance` | online complaint form, status tracking, escalation matrix, suggestion box, toll-free/WhatsApp, monthly resolution report |
| 13 | Environment & sustainability | `environment` | tree plantation, plastic-free, waste segregation, rainwater harvesting, solar, water conservation, green scoreboard, adopt-a-tree, agriculture & livelihood (crop advice, weather, market prices) |
| 14 | Gallery & media | `gallery` | photo gallery, video gallery, press coverage, then-and-now slider, mini documentaries |
| 15 | Contact & collaboration | `contact` | office contact details, map, feedback form, partner NGOs/CSR/departments, volunteer form |
| 16 | Dashboard "My village, my progress" | (home section or `/dashboard`) | population / literacy / sanitation coverage, tap water / electrification, scheme beneficiaries, fund utilisation, grievance resolution, tree plantation, ward-wise comparison, "top 5 achievements of the year" |

The repo's 15 public folders map 1:1 to sections 1–15; section 16 is a dashboard block (Figma
shows it as a home-page section). `search` and `sitemap` come from framework rules 7–8.

## 3. Architecture spec (Digital GP System Architecture Specification.pdf)

- Stack as in CLAUDE.md. Hosting: Hostinger VPS + Nginx + PM2, GitHub Actions deploy.
- Workflow: Super Admin configures Taluka/Block/GP → GP Admin creates Data Entry Operator accounts → DEOs enter data in assigned modules → GP Admin reviews/approves → only approved content is public.
- Tenant isolation: every server-side query verifies tenant scope and permissions; DEOs have module-level permissions and activity logs.
- Caching: published pages cached and revalidated on content update; Redis later.

## 4. Figma file — what was actually inspected

File `qBVt7yv0KG41onObVWfnP1`, single page **"Final"** (`40:1282`).

**Access limitation (honest note):** the page is ~53 000 × 45 000 px and the Figma MCP
`get_metadata` response for the page exceeds the transport limit, so node IDs / tokens /
spacing could **not** be read. What was inspected is a 16 384 px rendered screenshot of
the whole page, cropped region by region. That gives layout, screen inventory, colour
direction and large text, **not** exact typography, spacing, or component props.
To get pixel-accurate specs I need **section-level links** (right-click each section →
"Copy link to selection") for the four sections below, then `get_design_context` works per frame.

### 4.1 Sections found on the page

| Section (position) | Content | Count |
|---|---|---|
| Top-left | Admin CMS — per-page editors, long desktop frames with green sidebar | 17 tall frames + 2 small "GP CMS dashboard" frames + 2 small setup frames |
| Top-right | Auth + Super/Block admin screens + modals | 2 login cards, 5 frames (2 greyed = modal states), 7 frames row, 4 auth cards, 1 audit-log table, 4 announcement modals, 3 dashboards |
| Middle-left | **Public website** pages (desktop) | 7 + 12 = 19 frames |
| Bottom-left | Design system / components | stat cards, dropdown menus, 3 sidebar variants (per role), inputs, buttons, tags, delete-confirm modal, tables, pagination |

### 4.2 Screens identified (readable at crop resolution)

Admin / auth
- **Login** — split layout: dark-green left panel with Ashoka emblem + "Gram Panchayat Website Management System — Rural Development and Panchayat Raj Department"; right: "Welcome back", **Login as** role dropdown (Super Admin…), email, password (Show), Remember me, Forgot password, language toggle (मराठी) top-right.
- **Forgot password / reset password / create password / success** — same split layout (4 cards).
- **GP CMS dashboard** ("Savardari Gram Panchayat CMS") — top bar: District ▾ / Taluka ▾ / Gram Panchayat ▾ selectors, search, language toggle (मर | English), user menu (Priya Deshmukh, Super Admin). Stat cards: Setup Progress 18 %, CMS Pages 15, Completed Pages 2, Pending Items 37. "Complete Website Setup" progress card, "Website Details" card, **CMS Page Overview** table (page, status, required info, last updated, action; rows = the 15 pages). Sidebar lists all 15 CMS pages grouped (Home, About, Key Projects, Schemes, Infrastructure, Finance…), Settings, Logout.
- **15 per-page CMS editors** (`websites/[websiteId]/pages/[pageKey]`) — each: breadcrumb/top bar, stat cards, hero image upload, grouped form sections, repeatable item tables (projects, schemes, members, documents, gallery grid), status toggles, Save/Publish buttons.
- **Super Admin: Taluka / GP hierarchy management** — table with search/filters, "Add New Taluka" modal (District ▾, Taluka name EN/MR, official code, Active ▾, office address), "Add Gram Panchayat" modal, confirmation modals (greyed overlay states).
- **Block (Taluka) Admin dashboard** — Assigned Talukas / GPs stats, website status progress, GP websites table; **Assigned GP Websites** table.
- **Public Announcements** (district/taluka-level) — stats (Total 148, Published 126, Drafts 14, Scheduled 8), filters (search, category, status, published to), table (announcement, category, priority tag, status tag, published to "N GP websites", date, pages, actions), pagination, Export, "+ Publish Announcement" → modal with scope (All / Taluka / selected GPs) → success modal "Announcement published successfully".
- **Audit log** table. **User/role management** tables (block admins, DEO accounts).
- **Profile / settings** small frames.

Public website (desktop)
- Header: dark-green government strip (Govt. of Maharashtra, English | मराठी toggle, phone, email, search), white nav with emblem + "Gram Panchayat Savardari, Tal. Khed, Dist. Pune" and menu (Home, About Us, Development, Citizen Services, Community, Media — i.e. grouped dropdowns).
- Home: hero "Welcome to Gram Panchayat Savardari — Building a Sustainable, Transparent & Digital Village" with CTA pills (Explore Village, Explore Services, Register Complaint), stats strip (Population, Households, Agriculture area, Literacy, Schemes, Schools, Water, Ongoing projects), **Citizen Services** icon grid (Property Tax, Water Tax, House Tax, Birth/Death/Marriage certificates…), news/announcements, officials cards, map, gallery, footer.
- Remaining 18 frames = About (leaders cards), Projects (before/after, progress), Schemes (donut/bar charts), Infrastructure (map), Finance (pie charts), Services, Culture, Employment, Education, Grievance (form + tracking), Environment (green scoreboard), Gallery, Contact (map + form), Announcements, Dashboard, Search/Sitemap — exact mapping to confirm with section links.

### 4.3 Visual language (from screenshots)
- Primary: dark forest green (sidebar/header, ≈ `#0F4D3A`–`#14532D` range), light mint backgrounds for selected states, white cards with soft borders, status tags in green/amber/red/purple, amber accent for warnings.
- Emblem of India + Maharashtra branding; Devanagari + Latin text side by side.
- Admin: fixed left sidebar (≈ 240 px) + top bar with scope selectors; content max-width cards.
- Public: full-width hero with photo, rounded stat chips, icon-card grids, section titles centred.

### 4.4 Update — section links received (node-level inspection)

Section links provided by the frontend owner. Node IDs below are usable with the Figma MCP
(`get_design_context` / `get_screenshot`). Reference PNGs are in `docs/design/figma/`.

| Section | Node | Notes |
|---|---|---|
| Admin Dashboard (GP CMS page editors) | `375:16279` | 17 frames, 1440 wide |
| LOG IN PROCESS (auth + Super/Block admin) | `375:20845` | 25 frames |
| User Dashboard (public website) | `375:11288` | too large for metadata; frames probed individually (see 4.4.3) |
| Components | `375:15370` | Footer `375:15382`, Navbar `375:15444`, GP CMS NAVBAR `375:15777`, Block CMS NAVBAR `375:16004`, Admin CMS NAVBAR `375:16035`, Language Switcher `375:15766`, Logout modal `375:16126`, date pickers, dropdowns, stat cards |

#### 4.4.1 Admin Dashboard section — GP CMS page editors (`375:16279`)

| Node | Frame | Height |
|---|---|---|
| `375:20626` | Admin Sarvardari Dashboard (GP CMS dashboard, Super Admin view) | 958 |
| `375:20734` | Block Sarvardari Dashboard (same, Block Admin view) | 958 |
| `375:19844` | 1. Home Admin | 5055 |
| `375:16280` | 2. About the Gram Panchayat Admin | 4786 |
| `375:17753` | 3. Key projects | 3764 |
| `375:18383` | 4. Schemes & Beneficiary | 3426 |
| `375:18637` | 5. Village Infrastructure | 3127 |
| `375:18786` | 6. Finance & Budget | 3377 |
| `375:20013` | 7. Citizen Services | 3949 |
| `375:18975` | 8. Grievance & Feedback | 3833 |
| `375:19200` | 9. Our Village | 4809 |
| `375:17415` | 10. Employment & Skills | 3964 |
| `375:20423` | 11. Education & Youth | 3434 |
| `375:19294` | 12. Environment & Sustainability | 3580 |
| `375:19583` | 13. Announcements | 4076 |
| `375:19248` | 14. Media Gallery | 4135 |
| `375:18331` | 15. Contact & Collaboration | 2486 |

**GP CMS dashboard** (`gp-cms-dashboard.png`): sidebar groups — Dashboard · CONTENT MANAGEMENT
(Home Page, About Gram Panchayat, Key Projects & Initiatives, Schemes and Beneficiaries,
Village Infrastructure, Finance & Budget) · DEVELOPMENT MANAGEMENT (Citizen Services & Form,
Grievance & Feedback) · DYNAMIC CONTENT (Our Village, Employment & Skills, Education & Youth,
Environment & Sustainability) · MEDIA & COMMUNICATION (Announcement & Circulars, Gallery & Media,
Contact & Collaboration) · SETTINGS (Log out). Header: District/Taluka/GP selects, search,
मराठी|English, user menu. Title + DRAFT pill + "Go Back to Dashboard". Stat cards (Setup
Progress %, CMS Pages 15, Completed Pages, Pending Items). "Complete Website Setup" progress +
"Website generated" check + "Preview Website". "Website Details" (GP, District/Taluka, Public URL
"Not published"). "CMS Page Overview" table (CMS Page, Status In Progress/Not Started, Required
Actions "8 fields pending", Last Updated, Action Edit/Start).

**Home page editor** (`admin-01-home-editor.png`, 5055 px tall) is the pattern for all 15
editors: title "Home Page — Managing institutional content for <GP>", status dot "Published ·
Last edited", "Save Changes" button; then stacked cards, each with "Show this section" toggle:
1. Banner — layout picker (Full Background / Image Right / Image Left / Framed Image), content
   (section heading, supporting line, description, CTA buttons list with label/link/type/open-in-new),
   image settings (upload/replace/crop), text position (L/C/R × T/M/B), overlay & readability
   slider, banner appearance (height, content width, text colour).
2. Top Statistics table — icon, label, value, unit, visibility toggle, edit/duplicate/delete, "Add Card".
3. About Section Content — title, description, left cards (drag-reorder, edit/delete, add), right
   images (large + small + map with "Open in Maps").
4. Statistics Data table — icon, label, value, trend %, trend text, trend type, actions.
5. Ward Details table — order/colour, ward name, roads, water pipeline, street lights, drainage,
   plantation, ongoing projects.
6. What's New This Week — image, title, date, status (Completed…), actions.
7. Top Five Achievements — icon, title, description, completed on.
8. Today's Weather — location, condition, temperature, rain %, humidity, wind, visibility,
   sunrise/sunset, date, "Sync Weather" (fetch latest).
9. Message from the Sarpanch — initials, message, name & designation.
10. Manage Categories (announcement categories with icon/colour/status) and Manage Notices
    (order, date, category, title, status).
Every row-table supports drag handle ⋮⋮, add, edit, delete, visibility toggle.

#### 4.4.2 LOG IN PROCESS section (`375:20845`) — auth, Super Admin, Block Admin

| Node | Frame | Notes |
|---|---|---|
| `375:20882` | Admin log in | split layout; Login-as dropdown (Super Admin / Block Admin), email, password+Show, Remember me, Forgot password, Sign In, "Contact technical support", "Secure access" badge, मराठी|English |
| `375:20846` | Block log in | same, Block Admin preselected |
| `375:22080` / `375:22116` | 14 — Forgot Password (admin / block) | |
| `375:22097` / `375:22133` | 15 — Reset Password (admin / block) | |
| `375:20919` | 02 — Super Admin Dashboard | metric cards (Districts 36, Talukas 358, GP Websites 1,248 "986 published", Block Admins 184 "172 active"), Website Overview bars (Published/Draft/Not Created), Quick Actions (Create GP Website, Add Block Admin, Manage Districts, Publish Announcement), Recent GP Websites table, Recent Activity feed |
| `375:21076` `375:21231` `375:21430` | 03 — GP Website Management (3 states) | stats, filters (District, Taluka/Block, Website Status, Search GP), table (#, GP, District/Taluka, Website status pill, Block Admin, Last Updated, Action = Manage / Continue Setup / Create Website, ••• menu), pagination, Export |
| `375:21620` | 07 — District & Taluka Management | stats (Districts, Talukas, Gram Panchayats 28,813, Active Districts), filter card, District Overview table (District, Talukas, GPs, Websites Created, Block Admins, Manage) |
| `375:22361` | Frame 2608623 (590×784) | "Add New Taluka" modal: District select, Taluka name EN / MR, official code, Active status, office address, info note |
| `375:21730` | 08 — Block Admin Management | table of Block Admins |
| `375:21832` | 09 — Create Block Admin | form |
| `375:21903` | 10 — Assign District, Taluka & GP Access | District + Taluka/Block selects, "42 GP websites available" pill, "Select all created websites", checkbox cards per GP with status pill, Save & Continue |
| `375:21997` | 11 — Block Admin Profile | |
| `375:22248` | 18 — Roles & Permissions | Platform Roles list (**Super Admin / Block Admin / Normal User**) + Permission Matrix (Create GP websites, Manage all districts, Edit assigned GP content, Publish website content, Create Block Admins, View public website, Manage roles & permissions, View audit logs) with Allowed / Not allowed / View only / Own activity pills; Save Permission Settings |
| `375:22152` | 17 — Audit Logs | table |
| `375:22396` | 12 — Block Admin Dashboard | sidebar: Dashboard · MANAGEMENT (Assigned GP Websites, Publish Announcement) · SETTINGS (Logout); header has Taluka + GP selects only; stats (Assigned Websites, Published, Draft, Pending Updates), Website Status bars, Quick Actions (Edit a GP Website, Publish Announcement), Gram Panchayat Overview table (GP, Status, Pending Items, Last Updated, Updated By, Action Open CMS / Continue) |
| `375:22500` | 13 — Assigned GP Websites | table |
| `375:22844` | 22 — Public Announcements Management | stats (Total, Published, Drafts, Scheduled), filters (search, category, status, published to), table (Announcement, Category, Priority pill Important/Normal/Emergency/Urgent, Status pill Published/Scheduled/Draft, Published To "N GP websites / All created GPs / Not selected", Date, Pages, •••), Export, pagination |
| `375:22702` / `375:22594` | AdminPublish / BlockPublish (908×763) | "Publish Announcement" modal: title, category, priority, scope (all / taluka / selected GPs), target pages, schedule |
| `375:22820` / `375:22796` | Frame 2608625 / 2608624 (580×764) | "Announcement Published Successfully" confirmation |

> **Role mismatch to resolve:** Figma's Roles & Permissions screen models only **Super Admin,
> Block Admin, Normal User**; the architecture spec and master prompt require **Super Admin,
> Taluka (Block) Admin, GP Admin, Data Entry Operator**. There is no GP-Admin or DEO login,
> no "create DEO account" screen and no approval queue in Figma — the only workflow states are
> Not Created → Draft → Published at website level and Not Started → In Progress → (Completed)
> per CMS page. The frontend will model 4 roles in `src/config/roles.ts` and reuse the
> Block-Admin shell for GP Admin / DEO until designs exist; **backend + design owner must confirm.**

#### 4.4.3 User Dashboard section — public website pages (`375:11288`)

17 frames, all 1440 wide. Shared chrome on every page: `Govt of maharashtra` strip (70 px:
emblem, "Government of Maharashtra", language switch, phone, email), `Navbar` instance
(emblem + "Gram Panchayat / Savardari / Tal. Khed, Dist. Pune" + 7 grouped nav items), hero
(eyebrow, headline, paragraph, 1–3 pill CTAs, right-side photo), page sections, `Footer`
instance (380 px: Contact Us / Quick Links / Follow Us / "Designed & Hosted by…").

| Node | Frame | Height | Sections |
|---|---|---|---|
| `375:12279` | 1. Home page | 5979 | hero; stat strip (Population, Households, Agriculture area, Literacy, Schemes, Schools, Water, Ongoing projects); About the village (3 cards); KPI tiles (9); Ward Details table w/ ward select; Today's Weather + Message from Sarpanch; Welcome + Village Development Progress bars; map; Top Five Achievements (per ward); What's New This Week; Our Leaders (CM, Dy CMs, ministers, secretaries); Notice & Announcement |
| `375:12876` | 1. Home page OPTION | 5935 | alternate: adds **Citizen Services quick-link tiles** (taxes, certificates, Aadhar, complaint, gallery) under hero; otherwise same blocks |
| `375:13500` | 2. About us | 5331 | village history + office hours/contact; map; Panchayat structure (Sarpanch, Dy Sarpanch, Gram Sevak, members) + office info; Roles & Responsibilities (6 cards); Important contact numbers (112, 108, 101, 104, 1077, 1912…); Vision/Mission/Core values; Our Leaders (8) |
| `375:13848` | 3. Key Projects | 3521 | stats; Completed/Ongoing/Upcoming tabs + project cards (year, budget, outcome, families); Before & After gallery; Village Resolution Tracker (top-10 %); Impact Dashboard indicators; Development timeline; Success stories; suggestion CTA; Financial overview |
| `375:12177` | 4. Citizen Services *(name inferred — node unreadable)* | ≈2800+ | hero "Citizen Services & Online Forms"; banner; 4 image cards; service tiles (certificates, grievance portal, tax payment, feedback, help, RTS); "Scan QR codes" row; stats strip |
| `375:14424` | 5. Government Schemes *(inferred)* | ≈3476 | category tiles (Central 48 / State 36 / District 22); Featured scheme cards (tags, benefit ₹, DBT, View Details); Scheme info + Ward-wise coverage map; totals (106 schemes, 2,845 beneficiaries); quick actions; Success stories |
| `375:14752` | 6. Village Infrastructure | 3867 | Public Facilities Overview (15 tiles); Village infrastructure map; Smart Village Dashboard cards |
| `375:12126` | 7. Financial Information & Budget | 3427 | Sources of income charts; Where Your Money Goes; Interactive Budget Visualizer; Plans, Reports & Documents |
| `375:14965` | 8. Announcements & Circulars *(inferred)* | ≈2660 | category tiles; notice list with "New" tag; Interactive Calendar + upcoming events; Important deadlines |
| `375:12063` | 9. Our Village History | 3825 | history & heritage; culture/tradition; distinguished personalities; success stories |
| `375:11416` | 10. Employment & Skill Development | 3566 | Local opportunities stat cards; Village Talent Directory skill grid; Farmer Assistance Center; Training & digital literacy; success stories |
| `375:11891` | 11. Education & Youth Corner | 3504 | student spotlight; Youth Speak tabs (blogs/videos/reels) + post cards; Schemes & opportunities for youth (5); success stories |
| `375:11289` | 12. Grievance & Feedback | 3185 | Register Your Complaint form (name, mobile, email, category, type, location, subject, description, file upload ≤5 MB); image cards; Track Your Complaint; info banner |
| `375:11378` | 13. Environment and Sustainability | 3152 | hero (Adopt a Tree); three large content images (scoreboard/initiatives — image-only in Figma) |
| `375:11547` | 14. Photo Gallery | 3513 | filter chips; Photo gallery; Video gallery; Press coverage; Then & Now split slider; Mini documentary |
| `375:11766` | 15. Contact | 3726 | 4 contact cards; office map + feedback form; partners; Become a Volunteer + registration form |

Gaps: three frames (`375:12177`, `375:14424`, `375:14965`) crash the Figma MCP on their hero
text nodes (unescaped character) — names/numbers inferred from hero copy and footer link order;
confirm in Figma. Environment page is mostly flat images, so its real sections come from the
circular §13. No "Search" or "Sitemap" page frames exist — build from the component library.

#### 4.4.4 Design tokens (read from `get_design_context`)

- Primary `#034f3c` (buttons, links, brand panel) · sidebar bg `#064e3b`, sidebar border `#065f46`,
  sidebar text `#fcf7ee`, sidebar group label / accent `#10b981`, selected item `rgba(252,247,238,.15)`
  with 3 px left border; alt dark `#135130`.
- Surfaces: page bg `#f9faf9` / `#f8fbf9`, card `#ffffff`, card border `#d6e0d9`, table header `#f6f9f7`,
  quick-action row `#f4faf6`, select bg `#f1fff8`, bar track `#ebf0ed`, divider `#d6e0d9`.
- Text: heading `#14211b` / `#1a241f`, body-muted `#6e7a73`, placeholder `#99a39c`, input border `rgba(65,65,65,.2)`.
- Status tints: green `#e8f6ee`/`#034f3c` (Published/Allowed), amber `#fff2de`/`#fa9e14` (Draft/Urgent),
  red `#ffebeb`/`#e84040` (Not Created/Emergency/Not allowed), blue `#e8f2ff`/`#1f6ecc` (Important),
  purple `#f2ebff`/`#754dc7` (Scheduled).
- Typography: admin body **Noto Sans Devanagari UI** (works for mr + en), login **Inter**,
  brand "Smart Village" **Sora** 14 bold + "CMS PLATFORM" **Manrope** 10 tracking .8;
  sidebar items Manrope 10/16; page title 25 bold; card title 17 bold; metric value 27 bold;
  table header 10 semibold; body 12–13.
- Layout: sidebar 263 px fixed (logo row 66.5, nav padding 10/12, footer 70); header row ~72;
  content gutter 20; radius 10 cards / 8 inputs / 13 pills / 7 buttons; metric card 126 tall;
  login card 520×756 r16; brand panel 610 wide.
- Figma styles present: `M3/sys/light/on-surface #1D1B20` (Material 3 dropdown components reused).

## 5. Reference websites

- `grampanchayatkulvandi.in` — Marathi only; 12-item flat nav (Home, About, GP info, Officials, Development works, Tourism, Birth/Death/Marriage, Gram Sabha, House tax, Photos, Feedback/Complaint, Contact); hero, founding date, about, 3 stats, weather heading, government logo strip; footer with address, phone, email, office hours, social icons, "Admin Panel" link; contact form (name, surname, mobile, email, message).
- `ganeshwadi.digitalgp.in` (also padegaon, vasantpuri — same template, Blazor app; errors in headless fetch, renders in browser) — subdomain tenancy; header: Maharashtra emblem, Govt. of Maharashtra | महाराष्ट्र शासन, phone/email/PIN, login icon, Eng toggle; hamburger menu: मुख्यपृष्ठ, ग्रामपंचायत प्रशासन, नागरिक पोर्टल +, आमच्या बाबत, माहिती अधिकार, पुरस्कार, योजना व कार्यक्रम +, सूचना, सोई-सुविधा, जमा खर्च, ग्रामविकास कामे, कर भरणा, यशोगाथा, अभियान +, तक्रार नोंदणी. Home sections: hero with village name/taluka/district, counters, thought of the day, **minister & dignitary cards (CM, Dy CMs, RDD minister, secretaries, divisional commissioner)**, elected representatives, ZP/Panchayat Samiti officers, GP members, about, citizen stats (properties, wards, voters), highlights, programmes/events, notices, photo gallery, contact CTA, Google-translate language select.
- Takeaway: district/taluka-level **shared content** (ministers, ZP officers, Panchayat Samiti officers) is injected into every GP site — matches the "Taluka-level shared data" requirement.

## 6. Gaps / questions for the team

1. **Figma section links** needed for pixel-accurate implementation (see §4).
2. **Tenancy**: path (`/[tenant]`) vs subdomain — decide and record an ADR; frontend defaults to path with middleware rewrite later.
3. **Languages**: circular says Marathi + English (home bullet adds Hindi). Figma shows only mr/en. Assume **mr + en**, Marathi default on public, English default in admin?
4. **Role list in Figma** = Super Admin, Block/Taluka Admin, GP Admin, Data Entry Operator — matches spec. Need the DEO module-permission model from backend to drive sidebar filtering.
5. **Content status vocabulary** (draft / submitted / approved / published / rejected?) — needed for tags and the approval UI; backend to confirm.
6. **No dependencies installed yet** — need agreement on Next.js version, i18n approach (`next-intl` vs custom dictionaries in `src/i18n/messages`), charting library (public finance/scheme charts), map embed (Google Maps iframe vs Leaflet), icon set, and form library (react-hook-form + zod are the usual pair with the backend's zod validators).
7. Weather widget, Google Translate, YouTube embeds, WhatsApp bot — third-party; confirm which are in scope for v1.

## 7. Proposed next steps (Stage 3)

1. Bootstrap the Next.js app (`package.json`, `tsconfig`, Tailwind with government-green tokens, ESLint, Vitest, Playwright) on the frontend branch, coordinating `package.json` with backend.
2. `src/config/pages.ts` — page registry for the 15 pages (key, route, nav group, i18n keys) shared by public nav, admin sidebar and CMS overview table.
3. `src/types/api.ts` — typed contracts for tenant resolution, published content per page, auth session, hierarchy, announcements; `src/lib/api/` client with mock adapters until backend endpoints exist.
4. Build in order: design tokens + `ui/` primitives → auth screens → admin shell (sidebar/topbar/role nav) → GP CMS dashboard → one page editor pattern → public shell → public home → remaining public pages.
