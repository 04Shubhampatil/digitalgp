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

## Pages still to be reviewed

 Grievance, Our Village, Employment, Education, Environment,
Announcements & Circulars, Gallery, Contact — this file is extended as each frame is reviewed.
Key Projects and Schemes already work through their own list + workflow (cards in the page editor).
