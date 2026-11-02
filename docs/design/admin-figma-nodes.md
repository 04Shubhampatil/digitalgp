# Admin panel: Figma frames

File: `qBVt7yv0KG41onObVWfnP1` (Gram panchayat), page "Final". Node ids use `:` in the API (`375:20882`).
Status column: **done** = rebuilt to match; **partial** = layout follows the frame, some parts wait for backend data; **todo** = not yet.

| Screen | Node | Status |
|---|---|---|
| Admin login | 375:20882 | done: role tile in the select |
| Block login | 375:20846 | done (same form, plain layout variant) |
| Super admin dashboard | 375:20846 (this id is the block login; the dashboard export is `docs/design/figma/admin-pages/dashboard.png`) | done: sidebar and top bar; body already followed the design |
| GP website management | 375:21076, 375:21231 | partial: metrics, filter card, GP and status table, pagination. Block Admin column and Export need backend support |
| Create GP website (confirm dialog) | 375:21430 | done: GP, District and Taluka read-only boxes, template note |
| District and taluka management | 375:21620 | done (overview for the super admin) |
| Add new taluka (modal) | 375:22361 | todo: existing dialog works, layout not restyled |
| Block admin management | 375:21730 | done (Active vs Pending Invite is derived from last login; GP Access counts websites under the assigned unit) |
| Create block admin | 375:21832 | done: two columns with steps and security note |
| Assign district, taluka and GP access | 375:21903 | partial: uses the existing assignment manager below the profile (`#access`) |
| Block admin profile | 375:21997 | done: profile card, assigned access, recent activity |
| Roles and permissions | 375:22248 | done: role list and matrix with Allowed / Not allowed / Own activity. Read-only: the matrix is fixed in backend code, so there is no Save Permission Settings |
| Forgot password / reset password | 375:22080 / 375:22097 | done (password rule text follows the backend: 10+ characters, letters and numbers) |
| Forgot password (block) / reset password (block) | 375:22116 / 375:22133 | done (plain layout variant) |
| Audit logs | 375:22152 | partial: filter card and overview table. Export Logs and the IP / Result column are not in the API |
| Admin publish | 375:22702, 375:22820 | partial: publish wording, "Select Publishing Targets", Save Draft; modal layout not restyled |
| Block publish | 375:22594, 375:22796 | partial: same form as above |
| Public announcements management | 375:22844 | done: four totals and "All Uploaded Announcements" |
| Block admin dashboard | 375:22396 | partial: metrics, status bars, quick actions, overview table (Pending Items and Updated By need backend data) |
| Assigned GP websites | 375:22500 | done: shorter filter card, no totals |
| Home page editor (CMS) | `docs/design/figma/admin-pages/home.png` | partial: top bar, page header and banner editor done; table rows, About layout and Ward Details not restyled |
| Other CMS page editors | `docs/design/figma/admin-pages/*.png` | todo |

## Backend gaps (not invented in the UI)

- GP website list: Block Admin column, Export.
- Block admin dashboard: Pending Items, Updated By, Setup Progress, Pending Updates.
- Audit logs: IP address, Result, Export.
- Home editor: Unit / Visibility on Top Statistics, trend fields on Statistics Data.
- Roles: the permission matrix is fixed in code; there is no save endpoint.
