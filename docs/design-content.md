# Design content in the database

The public pages were built with design placeholder blocks (`src/content/figma-*.ts`) that show whenever the
database has no published section for a block. `scripts/publish-design-content.ts` moves that content into the
database, so every block is a published section (or a record) that admins can edit.

```bash
npm run content:publish-design -- --tenant savardari --dry-run   # report only
npm run content:publish-design -- --tenant savardari             # publish
npm run content:publish-design -- --tenant savardari --refresh   # also rebuild its own, never-edited sections
```

It uses `DATABASE_URL`. For the live site, run it once with the Vercel database URL after the deploy that includes
migration `20261119090000_site_asset_media`.

## What it does

1. **Design pictures become media records.** Each `public/images/...` file used by the design is registered once as a
   `Media` row with `source = SITE_ASSET` and `storageKey = "site:<path>"`, shared (no tenant) and owned by the root
   unit. No bytes are stored: `GET /public/:slug/media/:id` (and the admin file route) answer `307` to the site file.
   This works on Vercel (no persistent disk) and an admin replaces a picture by uploading a new one. Deleting the
   record never deletes the site file. Only plain `/images/...` picture paths are accepted (`src/features/media/site-assets.ts`).
2. **Sections are published from the design.** For every section the admin editor shows, the script builds the same
   data the editor opens with (`bannerSeed` / `sectionSeed` / `designSeed` in `src/lib/banner-seed.ts`) with the
   pictures as media ids, plus the conversions in `scripts/design-bridges.ts` for design blocks drawn under another key
   (`REPLACES` in `src/content/fallback.ts`) or missing a required setting. Every result is validated against the
   section schema before it is published.
3. **Records behind list blocks.** The design's Featured Schemes become `Scheme` records (with the new benefit fields).
4. **Never overwrites admin work.** Sections already published and schemes with the same name are left alone; it can
   be re-run. With `--refresh`, a section whose live revision this script wrote, and that nobody edited since, is
   rebuilt and republished when its content changed (e.g. after a schema change in a later release).
   Every revision it writes is audited as `section.publish` with `after.source = "design-content"`.

## Schema additions for the design content

- `MediaSource.SITE_ASSET`; `Scheme.benefitValueEn/Mr`, `benefitCaptionEn/Mr` (migration `20261119090000_site_asset_media`, additive).
- Icon pictures use the frontend's `iconImageId` fields (PR #58); the tracker `percent` and the financial-overview
  lists are also PR #58's. Placeholder picture fields are mapped to them: `imageUrl` → `imageId`, `photoUrl` → `photoId`,
  `iconUrl` / `iconImage` → `iconImageId` (or `iconId` where the section has that), `beforeUrl` / `afterUrl` →
  `beforeImageId` / `afterImageId`, `thumbnailUrl` → `thumbnailId`.

## Still from the design files (Savardari, after the script)

| Block | Why | What is needed |
| --- | --- | --- |
| Home `notices` tabs | the block shows live announcements; the tab layout has no section shape | frontend: build the tabs from announcement categories |
| Grievance `complaint-form` | needs the office email (`settings.contact.email`) | set the website's contact email, re-run |
| Announcements `download-forms`, Finance `documents` rows | need real files | upload the PDFs in the admin |
| Schemes `statistics`, Services `live-stats` | computed from records (already live) | — |

## Switching the design fallbacks off (frontend)

`NEXT_PUBLIC_DESIGN_FALLBACKS=off` (set it in `.env` and in the host's environment, then redeploy) makes the public pages draw only
what is published: sections, and the blocks fed by records. Unset (default) keeps the old behaviour, so a website that has not
had its design content published yet still shows the design.

With the flag off:
- A block nobody has published is not drawn. Kept: blocks fed by records (projects, before/after, schemes and their counts,
  the announcement categories / latest announcements / calendar, Home "What's New", Home "notices" whose tabs are the
  announcement categories), computed figures (`live-stats`) and the fixed call-out bands of Grievance and Contact.
- Published sections are still drawn in the design's own blocks (`src/content/design-adapters.ts` and `adaptToDesign` in
  `src/content/fallback.ts`), so the look of the page does not change: Announcements, Services, Schemes quick actions,
  Projects, Contact, Grievance and About leaders. Settings of the design block that are not stored (card style, spacing) are
  taken from the design file.
- Finance documents and Announcement downloads only list rows that have a file.
- Pictures are media ids (`SITE_ASSET` or uploads); the page does not read picture paths from the design files.

Checked locally with a script that compares every page (English and Marathi) with the design: no broken pictures, the same
blocks and texts, except what is now dynamic (live counts and weather, announcement tabs) or needs a file (documents, downloads).

Marathi note: texts typed in one language (scheme category, deadline dates, weather place) show in the design's Marathi when the
design has a translation, otherwise as typed.

## Finance documents without a PDF

The `documents` section of the Finance page no longer requires a PDF for every entry (`fileId` is optional in
`src/config/sections-pages.ts`). The publish script seeds the five design documents (title and size label); until a
PDF is uploaded for an entry the public page lists it with "File coming soon" instead of a Download link. Run
`npm run content:publish-design -- --tenant savardari` once after deploying; it only adds sections that have no
published revision, so existing admin edits are kept.
