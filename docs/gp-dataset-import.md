# Importing a Gram Panchayat content dataset

`data/gp-datasets/<name>.json` holds the public content of one village website in a neutral shape (village
profile, officials, leaders, schemes, events, gallery, government orders). `scripts/import-gp-dataset.ts` publishes
it on a website. Backend only — the public pages draw the result from the normal sections and records.

```bash
npx tsx scripts/import-gp-dataset.ts --tenant savardari --dataset ganeshwadi --dry-run   # report only
npx tsx scripts/import-gp-dataset.ts --tenant savardari --dataset ganeshwadi             # import
```

Uses `DATABASE_URL`. Run it against production only on purpose (it changes what the public website shows).
Re-running is safe: it publishes nothing new and creates no duplicates.

## The Ganeshwadi dataset

Extracted on 2026-11-26 from <https://ganeshwadi.digitalgp.in/> (a Blazor site with no data API; every page was
rendered in a browser and read). Marathi text is verbatim; English is a translation written for the dataset.

- 73 files: 71 pictures in `public/images/gp/ganeshwadi/` (resized to at most 1280 px, JPEG) and 2 government-order
  PDFs in `public/documents/gp/ganeshwadi/`. `assets` in the JSON lists where each file came from. The logo was
  embedded in the page, so its source is marked `#embedded-logo`.
- Content: village profile (population 592, established 1988, PIN 415110, about, history, location and transport),
  contact details, 4 special attractions, 12 ministers and officials with photos, 12 Gram Panchayat members (the
  site lists some twice; this is the de-duplicated list), duties of Sarpanch / Upsarpanch / GP officer, 31 gallery
  photos in 6 categories, 11 government schemes (description, website, logo), 4 events, 2 campaign activities,
  2 government orders, the Zilla Parishad school.
- Empty on the source site, so nothing to import: awards, budget (jama kharch), development works, notices,
  RTI files, the mission pages other than Samruddh Panchayat Raj.

## What the import changes (target website only)

| Dataset | Target |
| --- | --- |
| Name, place, tagline, welcome, about, village photos | Home `banner`, `hero`, `welcome`, `about-cards`; About `banner`, `overview`, `history` |
| Population, programmes, year, area, members, schemes | Home `quick-stats` (the old `about/geography` area and households are removed — the source gives no unit) |
| Sarpanch + thought of the day | Home `sarpanch-message` |
| Attractions | Home `achievements` |
| Events | Home `whats-new`; announcements (category `Event`, with dates) |
| Campaign activities | announcements (category `Completed`) |
| Members, leaders, duties | About `members`, `leaders-profile-grid`, `roles-cards` |
| Location, PIN, transport | About `geography`; Contact `office-location` (Google Maps embed) |
| Contact details | About `office`, Contact `contact-cards`, website settings `contact`; weather place `Karad,IN` |
| Gallery | Gallery `photo-gallery`, Home `home-gallery` |
| Government orders (PDF) | Announcements `download-forms` |
| Schemes | scheme records |

- Sections are published as new revisions (history kept, audited `section.publish` with `source: gp-dataset:<name>`).
  Presentation settings with no dataset value (layout, buttons, colours) are kept from the live revision.
  Sections the dataset has no content for are not touched.
- The website's other schemes and announcements are set to `ARCHIVED` — never deleted; restore by changing the
  status back.
- Pictures and PDFs become shared `SITE_ASSET` media (no bytes stored; redirect to the committed file). Site assets
  now also allow PDFs under `/documents/` (`src/features/media/site-assets.ts`).
- Not changed: the website's name, slug and place in the hierarchy (the header still shows the target village), its
  logo setting, users, and every other website.
- Not shown (no field for them yet): the one-line role summaries, the scheme logos (registered in the media library
  only), the school details, the logo.

Code: `src/features/content-import/gp-dataset.ts` (dataset schema and section mapping, pure),
`src/features/content-import/import-gp-dataset.ts` (database), tests in `tests/unit/gp-dataset.test.ts` and
`tests/integration/gp-dataset-import.test.ts`.
