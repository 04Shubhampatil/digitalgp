# Backend needs for the public website (Figma match)

What the public pages need from the backend to look and behave exactly like the Figma design
(file `qBVt7yv0KG41onObVWfnP1`). Nothing here is invented in the UI: where data is missing the
frontend shows the design's placeholder or hides the control. Owner: backend (Shubham).

## Bugs

1. **Public pages API answers 500 for a page with no row.** `GET /public/:slug/pages/progress`
   returns `INTERNAL_ERROR`; it should be `NOT_FOUND` (404). The frontend treats both as "no
   content" for now (`src/app/(public)/[tenant]/[pageKey]/page.tsx`). Also decide whether the
   `progress` page gets a `Page` row per tenant or stays out of `DEFAULT_PAGE_KEYS`.

## Tenant settings (seed and admin)

2. `settings.contact.phone`, `settings.contact.email` and `settings.branding.tagline`
   ("Tal. Khed, Dist. Pune") for Savardari: the header strip and navbar show the design's values
   until these are set (`src/content/figma-chrome.ts`).
3. `settings.social`: Facebook / Instagram / YouTube URLs (footer and Contact page icons are
   hidden while empty). The Contact design also shows **Twitter/X**: add `twitter` to
   `TenantSettingsDto.social`.

## Home page sections

4. `village-progress` items need `valueText` (the published rows have labels only, so the bars
   were empty; the design's values fill in meanwhile).
5. `ward-details`: ward boundary `geometry` or a `mapImageId` per ward, else the design's map
   picture is shown.
6. `leaders` is published on the home page but the Figma home has no Leaders block; the frontend
   hides it on home (`HOME_HIDDEN` in `src/content/fallback.ts`). Keep it on About.
7. `whats-new` items: `href` per item (currently all rows open the announcements page).
8. Hero: the published title is "Welcome to Gram Panchayat Savardari" and the subtitle is the real
   heading; the frontend swaps them. Better to store title = "Building a Sustainable…" and let the
   welcome line come from the tenant name.

## Section schemas (src/config/sections-pages.ts, section-primitives.ts)

9. `supportCardItem`: add `link`/`href` (category tiles on Employment/Education, helpline `tel:`,
   WhatsApp `https://wa.me/…`, Suggestion Box → feedback form).
10. `iconCardList` (assistance-items): add `description` caption per item.
11. `viewAll { label, href }` on list sections: local-opportunities, skill-directory, job-portals,
    success-stories, youth-posts, student-spotlight — or confirm these buttons are dropped (there
    are no "all opportunities / all stories / all students" pages).
12. `youth-posts` items: `author`, `date`, and a real `type` per post (blog / youtube / reels / ideas).
13. `scheme-cards` items: `colour`/`background` tint per card (frontend can use a fixed palette if
    you prefer).
14. `sustainability-initiatives` items: `link`.
15. `press-coverage` items: `category` ("News").
16. `market-prices`: multiple markets (one `marketName` today) and a live mandi source if the
    "Select Market" dropdown stays; otherwise the dropdown is dropped.
17. Weather: the renderer should call `GET /public/:slug/weather` (exists) — frontend task, noted here
    so the endpoint stays.

## Forms and endpoints

18. Grievance submit (`POST /public/:slug/grievances`): add `complaintType`, `location`, `subject`.
19. Grievance track: lookup by **mobile number** as well as tracking code
    (`GET /public/:slug/grievances/:trackingCode` only).
20. Grievance stats: month-over-month deltas for resolved / pending / resolution rate
    (only `receivedChangePercent` exists).
21. Feedback (`POST /public/:slug/feedback`): add `subject`.
22. Volunteers (`POST /public/:slug/volunteers`): add `address`, `areaOfInterest`.
23. Tree adoption: a submission endpoint (until then "Adopt a Tree Now" opens the volunteer form).

## Admin (from docs/design/admin-figma-nodes.md, unchanged)

- GP website list: Block Admin column, Export.
- Block admin dashboard: Pending Items, Updated By, Setup Progress, Pending Updates.
- Audit logs: IP address, Result, Export.
- Home editor: Unit / Visibility on Top Statistics, trend fields on Statistics Data.
- Roles: the permission matrix is fixed in code; there is no save endpoint.

## Inner pages (from the page-by-page audit)

24. **Detail routes / endpoints** for a single project, scheme, announcement and success story: every
    "View Details" / "Read Story" / "Know More" has nowhere to go today. DTOs exist for projects,
    schemes and announcements; there is no success-story entity.
25. About page: structured data for the design's sections (hero with buttons + photo, Panchayat
    structure with role + photo per member, office hours / phone / email, vision & mission, emergency
    numbers). Today the About page publishes only `overview`, `history`, `geography`, `members`,
    `office`; the frontend merges their text into the design's layout.
26. `PublicServiceStatsDto`: certificates issued this month, tax collected this month, citizen
    satisfaction rate (documented "no source yet"). `PublicSchemeStatsDto.amountDisbursedThisFinancialYear`
    is null. While a live figure is 0 next to sample figures the sample stays (see `LiveStatsSection`).
27. Scheme coverage: beneficiaries per ward and ward polygons / map image per scheme; scheme `category`.
28. Announcements: `eventDate` / time for the calendar; per-category counts for the category strip;
    attachments for the Downloads tiles (size via `GET /media/:id/meta`); a category filter on the
    announcements listing page.
29. Finance: real `fileId`s for Plans, Reports & Documents and the budget report download.
30. Infrastructure: `infra-map.markers` and `map-filters` published, live status per facility.
31. `fpo-gallery-voice`: `learnMoreLink`, `galleryLink`; `homestay`: booking/contact link.
32. Project cards: `wardLabel`, `outcomeShort`, before/after images; success stories with photos.

## Per-page layout pass (fields the placeholders use today)

The design layouts below read optional presentation fields that only the Figma placeholder data sets
today. Add them to the section schemas (src/config/sections-pages.ts) so published content can use them:

33. `heading`, `subheading`, `viewAll {label, href}` on success-stories, local-opportunities,
    skill-directory, assistance-items, training-programs, job-portals, scheme-cards, youth-posts.
34. `layout` switches: `support-cards.layout` ("strip" / "contact"), `success-stories.layout`
    ("quote"), `link-cards.layout` ("list"), `top-stats.variant` ("strip" / "card" / "band").
35. `link` and `colour` per icon card (support-cards, scheme-cards, assistance-items).
36. `youth-posts` items: `author`, `date`.
37. `fpo-gallery-voice`: `link` / `linkLabel` for FPO and Voice, voice `imageId`.
38. `before-after` (projects): `beforeUrl` / `afterUrl` media per tile.
39. `mini-documentary`: `thumbnailUrl`, `duration`.
40. `key-initiatives` (environment): a new section type with icon, title, link per tile.
41. `documents` (finance): `fileSize` (or use `GET /media/:id/meta`).
42. Content: real video / documentary URLs (placeholders point at youtube.com), the office map
    embed URL, a higher-resolution "before" photo for Projects.
