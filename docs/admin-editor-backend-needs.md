# Admin page editors — what the Figma needs from the backend

Source: the Figma admin frames (file `qBVt7yv0KG41onObVWfnP1`). The frontend editor
(`src/components/admin/editor/*`, specs in `src/config/section-editors.ts`) renders whatever the backend
registry (`src/config/sections.ts`) defines. Today the registry has **Home** and **About** only; every
other page shows "editing not available yet". To build a Figma editor the backend first needs the section
(zod schema + draft/publish already generic), then the frontend adds an editor spec and public renderer.

Owner: backend (Shubham). Frontend adds specs as soon as a section key + schema exists.

## Shared sections (appear on almost every page)

### `banner` (Figma "Banner Layout / Content / Image / Text position / Overlay / Appearance")
| field | type |
| --- | --- |
| `layout` | `full-background` \| `image-right` \| `image-left` \| `framed-image` |
| `heading`, `supportingText` | bilingual |
| `description` | bilingual long |
| `ctas` (max 2) | `{ label: bilingual, linkType: "page"\|"external", href, openInNewTab: boolean }[]` |
| `imageId` | media id |
| `textPosition` | `{ horizontal: left\|center\|right, vertical: top\|middle\|bottom }` |
| `overlay` | `{ enabled: boolean, colour: hex, intensity: 0-100, gradient: "left-right"\|… }` |
| `appearance` | `{ height: px, contentWidth: small\|medium\|large, cornerRadius: px, textColour: hex }` |

### `top-stats` ("Top Statistics")
`items[]: { icon, title: bilingual, value, unit?/description?: bilingual, visible: boolean }` (max ~8).
Home already has `quick-stats` (label, value, icon): add `visible` and `unit` there instead of a new key if preferred.

## Village Infrastructure (`infrastructure`, Figma 375:18637)

| section key | content |
| --- | --- |
| `banner`, `top-stats` | shared, above |
| `infra-map` | `{ zoom, mapType: satellite\|roadmap, showZoomControls, showLegend, enableWardClick, showWardBoundary, fullscreenControl, height, mapImageId, markers[] }` |
| `map-filters` | `items[]: { icon, name: bilingual, colour: hex, visible }` (the legend) |
| `status-cards` | `items[]: { icon, title, smallLabel, primaryValue, statusText, bottomLabel, bottomValue, buttonText, buttonLink, theme: blue\|orange\|green }` (reorderable) |
| `latest-announcements` | `{ enabled, heading, buttonText, buttonLink, items[]: { icon, title, date } }` |
| `upcoming-events` | `{ enabled, heading, buttonText, buttonLink, items[]: { icon, title, date } }` |

The public site renders these from Figma placeholders in `src/content/figma-pages*.ts`; once a section is
published here the placeholder is replaced automatically (published data always wins).

## Finance & Budget (`finance`, Figma 375:18786)

| section key | content |
| --- | --- |
| `banner`, `top-stats` | shared, above |
| `income-sources` | `{ enabled, heading, subtitle, categories[]: { name: bilingual, amount, percentage }, supportCard?: { enabled, icon, title, description, buttonText, buttonLink } }` — percentages should total 100 (the editor shows a running total) |
| `expenditure` | `{ heading, subtitle, backgroundColour, categories[]: { name, amount, percentage, colour }, sideCard?: { enabled, icon, title, description, buttonText, buttonLink } }` |
| `budget-visualizer` | `{ enabled, heading, subtitle, backgroundColour, tabs[]: { name, enabled }, overviewCard: { title, fields[]: { label, valueType: dynamic\|auto, prefixSuffix, colour } }, barChart[]: { label, value, colour }, downloadReport: { enabled, buttonText, fileId, icon } }` |
| `documents` | `{ heading, subtitle, description?, backgroundColour, items[]: { title, fileId, buttonText } }` — file size is derived from the upload |

Backend notes: documents need a **PDF media kind** (max 10 MB, PDF only) and the public site must never
expose files from unpublished sections. Money amounts should be stored as numbers/decimal strings, not free text.

## Citizen Services & Form (`services`, Figma 375:20013)

| section key | content |
| --- | --- |
| `banner` | shared, above |
| `service-links` (the "Right to Service" certificate grid, shown as the 4-row table under the banner in Figma) | `items[]: { icon, title: bilingual, description: bilingual, href, visible }` |
| `service-categories` | `items[]: { icon, title, description, features[]: bilingual (max ~4), buttonText, buttonLink, accentColour }` (reorderable) |
| `qr-codes` | `items[]: { title, description, serviceIcon, buttonText, linkUrl }` — **the QR image should be generated from `linkUrl` (server-side or on render), not uploaded**; the public page currently shows a Figma picture with fake codes |
| `top-stats` | shared; Figma adds a `background` colour per item for this page |
| `help` ("Need Help?") | `{ heading, subtitle, imageId, contact: { phone, email, hours }[] (add more), faqs[]: { question, answer } }` |

Also in this Figma: a footer action bar ("Discard changes", "Preview section", "Save draft", "Publish section").
The frontend already has per-section Save draft / Discard / workflow buttons; no backend change needed for that.

## Grievance & Feedback (`grievance`, Figma 375:18975)

Grievances themselves already have their own module (`/admin/grievances`, public submit endpoint). The
page editor in Figma configures how the public page looks and behaves:

| section key | content |
| --- | --- |
| `banner` | shared, above |
| `complaint-form` | `{ heading, description, successMessage, submitButtonText, recipientEmail, captchaEnabled, allowFileUpload, maxFileSizeMb, allowedFileTypes[] }` — `recipientEmail`, upload limits and CAPTCHA must be **enforced by the grievance submit endpoint**, not just stored |
| `support-cards` | `items[]: { icon, title, description, contactOrAction, visible }` (helpline, WhatsApp, suggestion box, feedback form) |
| `track-complaint` | `{ heading, description, searchLabel, placeholder, buttonText, noResultMessage, errorMessage }` — needs a public "track by complaint ID" lookup that returns status only (no personal data) |
| `escalation-matrix` | `steps[]: { title, description }` (5 in Figma) + `statusSummary[]: { label, colour }` |
| `monthly-report` | headline cards (total, resolved, pending, resolution rate with change vs last month), `monthlyTrend[]` (received / resolved / pending per month) and `categoryShare[]` (category, %, colour) |

Important: the Monthly Performance Report numbers (totals, resolution rate, trend, category split) should be
**computed from the real grievance records** by a public read-only stats endpoint, not typed in by an admin.
Typed-in figures would drift from the data and could mislead citizens. The editor then only needs labels and colours.

## Our Village — Culture Management (`culture`, Figma 375:19200)

| section key | content |
| --- | --- |
| `banner` | shared, above |
| `village-intro` (left information card) | `{ iconId, title, description, buttonLabel, buttonLink }` |
| `heritage-cards` (temples) | `items[]: { title, description, imageId }` reorderable |
| `culture-cards` ("Culture, Tradition & Our Way of Life") | `{ enabled, items[]: { title, description, imageId } }` (4 in Figma) |
| `homestay` | `{ heading, description, buttonLabel, buttonLink, imageId, features[]: { icon, title } }` |
| `training-programs` | `items[]: { title, shortDescription, thumbnailImageId, ctaText, ctaLink, order, status: active|inactive, featured }` |
| `leader-cards` | `items[]: { photoId, name, designation, description }` |
| `fpo-gallery-voice` | `{ enabled, fpo: { iconId, title, description, points[] }, gallery: { title, description, imageIds[] }, voice: { title, description, videoId } }` — needs a **video media kind** (MP4, size limit) |
| `success-stories` | `items[]: { imageId, title, description, buttonText, buttonLink, order }` |

Every `*Id` field is a Media id and must be ownership-checked (same rule as `MEDIA_REF_PATTERN`).
The public Our Village page today shows Figma pictures for most of these blocks; they become real content as sections are published.

## Employment & Skills (`employment`, Figma 375:17415)

| section key | content |
| --- | --- |
| `banner` | shared, above |
| `support-cards` | `items[]: { icon, title, description, contactOrAction, visible }` — same shape as Grievance support cards, so one shared section type can serve both |
| `local-opportunities` | same shape as `support-cards` (a second card list on this page) |
| `skill-directory` ("Village Talent Directory") | `items[]: { icon, skillName, availableCount, link, active }` reorderable. `availableCount` should come from real directory entries if a talent directory exists; if it is typed in, label it as approximate |
| `assistance-items` (farmer assistance) | `items[]: { icon, title, link, active }` reorderable |
| `training-programs` | `items[]: { imageId, title, description, buttonText, buttonLink, order, active }` — same shape as the Our Village training list |
| `job-portals` | `items[]: { logoId, name, description, websiteUrl, order, active }` — `websiteUrl` must be validated as https and rendered with `rel="noopener noreferrer"` |
| `success-stories` | `items[]: { imageId, title, description, buttonText, buttonLink, order }` — same shape as Our Village |

Reuse suggestion: define the repeating shapes once (`icon-card-list`, `image-card-list`, `success-stories`) and
register them on several pages instead of one section per page.

## Education & Youth Corner (`education`, Figma 375:20423)

| section key | content |
| --- | --- |
| `banner` | shared, above |
| `support-cards` | shared icon-card list (see Employment) |
| `student-spotlight` | `{ photoId, name, classAndSchool, achievements, quote, buttonText, buttonLink, achievementCards[]: { icon, title, value } }` |
| `youth-speak-tabs` | `items[]: { name, active }` reorderable (All, Blogs, Videos, YouTube, Reels, Creative Ideas) |
| `youth-posts` | per tab: `items[]: { tabKey, type: blog|youtube|reel|idea, title, coverImageId, url }` with post counts derived from the items; "Manage posts" is a list editor per tab |
| `scheme-cards` | `items[]: { icon, title, description, buttonText, buttonLink, active }` reorderable |
| `success-stories` | shared (see Employment) |

**Privacy (needs a decision before building):** the student spotlight publishes a child's photo, name, class
and school. The backend should require an explicit **guardian consent confirmation** (a required checkbox
stored with the section, plus who confirmed and when) before such a section can be submitted for review, and the
reviewer should see it. The same applies to any section that shows an identifiable minor (success stories, gallery).
YouTube/Reel `url` fields must be validated to the provider's domain and embedded without arbitrary scripts.

## Pages still to be reviewed

Environment,
Announcements & Circulars, Gallery, Contact — this file is extended as each frame is reviewed.
Key Projects and Schemes already work through their own list + workflow (cards in the page editor).
