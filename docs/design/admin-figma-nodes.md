# Admin panel: Figma frames

File: `qBVt7yv0KG41onObVWfnP1` (Gram panchayat), page "Final". Node ids use `:` in the API (`375:20882`).
Status column: **done** = rebuilt to match; **partial** = layout follows the frame, some parts wait for backend data; **todo** = not yet.

| Screen | Node | Status |
|---|---|---|
| Admin login | 375:20882 | done: role tile in the select |
| Block login | 375:20846 | done (same form, plain layout variant) |
| Super admin dashboard | 375:20846 (this id is the block login; the dashboard export is `docs/design/figma/admin-pages/dashboard.png`) | done: sidebar and top bar; body already followed the design. Pending Updates metric and list (GET /dashboard/pending-updates); website table with Pending Items, Setup Progress, Last Updated and Updated By (GET /dashboard/websites) |
| GP website management | 375:21076, 375:21231 | done: metrics, filter card, GP and status table with Block Admin column (`blockAdmins` on GET /tenants), pagination, Export (GET /tenants/export with the district / taluka, status and search filters; hidden for "Not created", which has no website rows) |
| Create GP website (confirm dialog) | 375:21430 | done: GP, District and Taluka read-only boxes, template note |
| District and taluka management | 375:21620 | done (overview for the super admin) |
| Add new taluka (modal) | 375:22361 | done: icon header, inset divider, 590px card, note and full-width Cancel / Save follow the frame; no District select (the parent is chosen on the page), Active status or office address because the backend unit has no such fields |
| Block admin management | 375:21730 | done (Active vs Pending Invite is derived from last login; GP Access counts websites under the assigned unit) |
| Create block admin | 375:21832 | done: two columns with steps and security note |
| Assign district, taluka and GP access | 375:21903 | done: area (district, taluka / block) and the websites it covers, Save & Continue. Access is granted per area, so the website list is read-only (the backend has no per-website assignment). The assignment manager stays on the profile for other roles |
| Block admin profile | 375:21997 | done: profile card, assigned access, recent activity |
| Roles and permissions | 375:22248 | done: role list and matrix with Allowed / Not allowed / Own activity. Read-only: the matrix is fixed in backend code, so there is no Save Permission Settings |
| Forgot password / reset password | 375:22080 / 375:22097 | done (password rule text follows the backend: 10+ characters, letters and numbers) |
| Forgot password (block) / reset password (block) | 375:22116 / 375:22133 | done (plain layout variant) |
| Audit logs | 375:22152 | done: filter card (plus a Result filter), overview table with actor name / email, website, IP / Result column (SUCCESS / FAILURE / DENIED pills), Export Logs (GET /audit-logs/export with the current filters) |
| Admin publish | 375:22702, 375:22820 | done: single card in the modal layout (type, priority, date, content, attachment, language, pages, publishing targets, Save Draft / Publish to N GPs) and the success card. Publish runs submit, approve and publish as far as the role allows |
| Block publish | 375:22594, 375:22796 | done: same form and success card as above |
| Public announcements management | 375:22844 | done: four totals and "All Uploaded Announcements" |
| Block admin dashboard | 375:22396 | done: metrics (Pending Updates from GET /dashboard/websites), status bars, quick actions, overview table with Pending Items, Last Updated, Updated By and Open CMS / Continue |
| Assigned GP websites | 375:22500 | done: shorter filter card, no totals |
| Home page editor (CMS) | `docs/design/figma/admin-pages/home.png` | partial (checked in the browser on the seeded Savardari site, 2026-11-10): the page follows the frame section by section (banner with layout tiles, one card per section with its own Add button and Show-this-section switch, table with column headings, order, row actions and a dashed Add row). Known differences: bilingual fields (label, title) show English above Marathi, so rows are about twice as tall as the single-line frame rows; row actions are move up / down and delete, not a drag handle and pencil |
| Other CMS page editors | `docs/design/figma/admin-pages/*.png` | partial (same cards and table pattern as the Home editor, not compared frame by frame);  every section field of the backend registry now has an input (heading / subheading / View all, layouts and variants, card link and colour, youth-post author / date, market-prices markets, tree-adoption recipient / thank-you text, mini-documentary thumbnail / duration, document file size, quick-stats unit / visible, monthly-metrics trend, About overview eyebrow / buttons) |
| Success stories (GP CMS, no frame) | none | done in the content-module pattern of projects / schemes: list (page and status filters), form (page, linked project / scheme, bilingual title / summary / story / quote, person, location, photo, consent, display order), detail with the review workflow |

## Backend gaps (not invented in the UI)

- Home hero `actions[]`: not in the editor. The schema needs at least one entry when the key is present, and the editor always sends top-level lists (an empty list would fail). `cta` stays the primary button.
- Roles: the permission matrix is fixed in code; there is no save endpoint.
- Scheme map image: only for Gram Panchayat schemes (the media picker uploads to one website).
