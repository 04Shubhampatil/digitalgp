# DigitalGP — Requirements Summary

Sources: `Gram_Panchayat_Website_Requirements.pdf` (22 Oct 2026), `Digital GP System Architecture
Specification.pdf` (v1.0), Government circular मुसपंअ-२०२५/प्र.क्र.१५२/यो-११ (RDD, 16 Oct 2025), and the
"DigitalGP — Backend Foundation Task" brief. Where sources disagree, see **Open decisions** at the end.

## 1. Geographic hierarchy

| Source               | Hierarchy                                                            |
|----------------------|----------------------------------------------------------------------|
| Requirements doc     | District → Taluka → Gram Panchayat (Pune District)                   |
| Backend task brief   | District → Taluka → Development Block / Panchayat Samiti → Gram Panchayat |
| Figma design         | 36 districts / 358 talukas / 1,248 GP websites (all Maharashtra)     |

Updating one Taluka must not affect another; updating one GP must not affect another, except where shared
District/Taluka content applies.

## 2. Roles

| Role                     | Created by                  | Can                                                                 | Cannot                              |
|--------------------------|-----------------------------|---------------------------------------------------------------------|-------------------------------------|
| Super Admin              | seed                        | Everything: hierarchy, GP websites, Taluka/Block admin accounts, roles, all audit logs, district-level content | —                                   |
| Taluka / Block Admin     | Super Admin                 | Manage GPs of own taluka/block, taluka-level content, publish announcements to own scope, create GP Admins (per requirements doc; design says Super Admin only) | Touch other talukas/blocks, create GP websites (design), create Block Admins |
| Gram Panchayat Admin     | Taluka Admin or Super Admin | Edit + approve + publish own GP content, create Data Entry Operators (architecture doc) | Access another GP                   |
| Data Entry Operator      | GP Admin                    | Enter data / upload documents in **assigned modules** of own GP; submit for review | Approve or publish; access other modules or GPs |
| Public visitor           | —                           | View **published** content only                                     | —                                   |

Design-defined permission matrix (Super Admin / Block Admin): create GP websites (A / —), manage all districts
(A / —), edit assigned GP content (A / A), publish website content (A / A), create Block Admins (A / —),
manage roles & permissions (A / —), view audit logs (all / own activity only).

## 3. Content workflow (architecture doc §2)

1. Super Admin configures Taluka/Block/GP records.
2. GP Admin creates account and grants Data Entry Operator access.
3. DEO fills data in assigned modules, uploads documents.
4. GP Admin reviews and approves.
5. Public website shows only approved **and** published content.

## 4. Multi-tenancy (architecture doc §3)

- Each GP is a tenant with its own tenant ID.
- Tenant identified from domain or subdomain (reference sites: `ganeshwadi.digitalgp.in`) — requirements doc
  says `domain.com/gram-panchayat-name`.
- Every server-side query and permission check verifies tenant scope.
- DEOs have module-level permissions and activity logs.

## 5. Public website — 15 pages (+ optional 16th dashboard)

Home, About, Key Projects & Initiatives, Government Schemes & Beneficiaries, Announcements & Circulars,
Village Infrastructure, Finance & Budget Transparency, Citizen Services & Online Forms, Our Village: Identity &
Culture, Employment & Skill Development, Education & Youth Corner, Grievance Redressal & Feedback, Environment &
Sustainability, Gallery & Media, Contact & Collaboration. Circular adds §16 "My Village, My Progress" dashboard.

Every page: common header (language switch, contact details, search) + footer. About page holds SEO metadata
(tab title, meta description, share image).

## 6. Circular — 10 mandatory guidelines

Government branding · Ownership details on home/header/footer · Marathi + English (home page also lists Hindi) ·
GR/notice/scheme documents kept current · Photos & hierarchy of CM / Dy CMs / ministers / officers ·
Announcements & events · Sitemap/content index · Keyword search · Citizen feedback form · Instagram/Facebook of
GP and RDD.

## 7. Announcements (requirements §7)

Created once, published to many websites. Fields: type, priority (Normal/Important/Urgent/Emergency), title,
content, optional PDF/image ≤ 10 MB, language (en/mr/both), publish now or scheduled, display pages, targets
(districts/talukas/GPs or all). Status: Published / Draft / Scheduled. Searchable, filterable, exportable.

## 8. Admin panel (requirements §6)

Login by role (email + password, remember me, language switch), forgot/reset password via emailed link, audit
logs (filter + export), roles & permissions screen, media library, per-page editors with show/hide sections,
add/edit/reorder/delete items, publish status and last-edited time.

## 9. Open decisions (requirements §9 + task brief)

| # | Topic                        | Options                                                       | Backend impact |
|---|------------------------------|---------------------------------------------------------------|----------------|
| 1 | Area                         | Pune District only / all Maharashtra                          | Seed data only — schema supports both |
| 2 | Separate GP Admin login      | Yes (requirements) / No (design)                              | Role list |
| 3 | Who creates GP websites      | Super Admin only (design) / Taluka Admin too (requirements)   | Permission matrix |
| 4 | Taluka Admin scope           | Whole taluka automatically / assigned GPs individually        | Role-assignment model |
| 5 | Address format               | Path / subdomain                                              | Tenant resolver only — slug-based either way |
| 6 | Block level                  | Taluka = Block (Maharashtra: Panchayat Samiti is per taluka) / separate level | Hierarchy model |
| 7 | 16th dashboard page          | Separate page / on Home                                       | Page registry |
| 8 | Hindi                        | Needed / not                                                  | Locale enum |
| 9 | Permissions                  | Fixed per role / editable by Super Admin                      | Permission storage |
| 10| District-level "Our Leaders" | Super Admin manages / not                                     | Content scope |
