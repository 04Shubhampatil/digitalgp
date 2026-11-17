# Public website vs Figma: cross-check (2026-11-17)

Every public page was compared with its Figma frame (file `qBVt7yv0KG41onObVWfnP1`) at 1440px, English, on the
live site (`digitalgp.vercel.app/savardari`, build of PR #50). Method: full-frame Figma render next to a full-page
screenshot, plus section positions read from the DOM. Heights are page heights in px.

| Page | Figma frame | Figma | Live | Result |
|---|---|---|---|---|
| Home | 375:12876 | 5935 | 6016 | matches; gallery photo fixed (below) |
| About | 375:13500 | 5331 | 5442 | matches in layout; published text differs (below) |
| Key Projects | 375:13848 | 3521 | 4103 | fixed: three cards per tab, tabs on the heading row, section gaps |
| Citizen Services | 375:12177 | 3265 | 3285 | matches; eyebrow case fixed |
| Schemes | 375:14424 | 3483 | 3969 | fixed: fifth scheme card wrapped to a second row |
| Infrastructure | 375:14752 | 3867 | 3883 | matches; hero heading size fixed |
| Finance | 375:12126 | 3427 | 3442 | fixed: "Sources of Income" heading was half covered; hero heading size |
| Announcements | 375:14965 | 2660 | 2654 | matches |
| Our Village | 375:12063 | 3825 | 3905 | matches; hero photo fixed |
| Employment | 375:11416 | 3566 | 3586 | matches |
| Education | 375:11891 | 3504 | 3527 | matches; one strip title wrapped |
| Grievance | 375:11289 | 3185 | 3472 | fixed: form and tracker width, trend chart height |
| Environment | 375:11378 | 3152 | 3334 | matches; eyebrow case fixed; section gaps are larger than Figma |
| Gallery | 375:11547 | 3513 | 3425 | matches in layout; see open items |
| Contact | 375:11766 | 3726 | 3478 | matches in layout; Follow Us icons fixed; section gaps are smaller than Figma |

## Fixed in this pass

- Schemes: the five Featured Schemes cards were 2px too wide for one row (5 x 256 + gaps > 1316), so the fifth wrapped.
- Key Projects: one row of three cards per tab with "View All Projects" revealing the rest; the stage tabs sit on the
  "KEY PROJECTS" row; 41px between the gallery, tracker, timeline and stories rows.
- Finance: the overlapping stats strip covered the top of "Sources of Income" (a collapsed negative margin).
- Finance and Infrastructure heroes: 32px heading on three lines and a two-line eyebrow, as in the frames.
- Our Village hero: the rangoli courtyard photo of the frame (848 x 533 at x=592) instead of the aerial photo.
- Home gallery: the third photo was the torn-edge hero picture; it is now a rectangular crop of the same photo.
- Contact: Facebook, X, YouTube and Instagram always show in "Follow Us" (network home page until real URLs are set).
- Grievance: form and tracker are 1320px wide; the monthly trend chart is the short, wide chart of the frame.
- Services and Environment: eyebrow in sentence case as typed in the frames.
- Education: "Student Achievements" stays on one line in the strip.
- Contact phone link: a broken pattern (`/s+/`) is now `/\s+/`.

## Open items (not a frontend layout problem)

- About: the Panchayat structure card is headed "Message from the Sarpanch" on the live site. That text is the
  published `members` section heading; the frame says "Local Administration". Fix the heading in the About editor.
- About hero: the published overview heading ("About Savardari") replaces the frame's "People-led governance…".
- Grievance: the "Upload Supporting Document" box only shows when uploads are switched on in the grievance settings.
- Key Projects: the live "projects" are achievements without ward, budget or families, so cards are shorter than the frame.
- Announcements: four category tiles and no row descriptions on the live site, because of the published data.
- Gallery: the Then & Now photos are 660 x 354 and are stretched to 1320px, so they look soft. Sharper originals are needed.
- Gallery: no page dots under the photos while there is one page of photos.
- Icons on Infrastructure, Finance, Grievance support cards and Education scheme cards are close matches, not the
  exact Figma glyphs (those frames are flat pictures).
- Section spacing still differs by 20 to 60px per block on Key Projects, Environment, Contact and Grievance.

Not compared: Marathi against Figma (the frames are English only), widths other than 1440px, the admin screens.
