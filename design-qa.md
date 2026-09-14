# V4.3 Contrast Pass Design QA

- Source visual truth: approved final-adjustment mock `exec-30c8f8c2-041d-41b0-97ba-ed66a47e3e49.png` (local absolute path intentionally omitted from Git)
- Browser-rendered implementation: installed Chrome in headless mode against the local app
- Source pixels: 852 × 1844 px
- Comparison viewport: source and implementation normalized to 390 × 844 CSS px
- States checked: no image selected; 12-image mock with success/failure/duplicate states; editing; individual retry; failed-only retry
- Evidence: `work/v43-contrast-qa/mobile-390-initial.png`, `desktop-1280-initial.png`, `mobile-390-results.png`, and `desktop-1280-results.png` (kept outside the repository)

## Full-view comparison evidence

The approved mock, the previous Preview, and the browser implementation were inspected together. The quiet one-line header remains white. A single dark-charcoal product stage now contains the compact three-line title and the integrated white command bar, while the results and supporting content return to restrained light surfaces. The implementation preserves the approved typography, precise 1 px rules, restrained radii, and lack of gradients, decorative imagery, glow, or heavy shadow.

The live implementation additionally retains the existing progress and four-value summary between the command bar and result rows. This is a deliberate functional requirement, styled as a compact continuation of the same product surface rather than as a separate card.

## Focused comparison evidence

- Header: service name remains primary while `使い方` and `FAQ` use smaller, lower-contrast text on a white surface.
- Hero: dark charcoal provides one deliberate contrast field; the H1 is white with only `シリアルコード` in deep emerald.
- Command bar: the white `写真を追加` → selected count → `読み取り開始` surface remains one continuous control with subtle dividers and a natural disabled state.
- Results: codes render as text in the normal state; an input appears only after `編集`. Thumbnails, state, copy/retry, duplicate warning, and metadata remain compact rows separated by 1 px rules.
- Supporting content: `使い方` is a compact three-row mobile sequence and a three-column desktop strip; alternating white and `#F7F7F5` editorial sections provide rhythm without cards. FAQ remains a divider-based accordion.
- Responsive layout: directly measured at 390 and 1280 CSS px, with the existing 320/768 responsive rules retained. No horizontal overflow or one-character Japanese wrapping was detected.

## Required fidelity surfaces

- Typography: OS system sans-serif; compact H1; restrained weight hierarchy; monospaced serial-code values.
- Layout: 8 px-based spacing rhythm, quiet header, one focused product stage, integrated command bar, compact result rows, and divider-led supporting sections.
- Colors: white and `#F7F7F5` light surfaces, `#202522` hero stage, white/charcoal typography, and limited deep emerald accent. Warning/error colors appear only for state communication.
- Assets: no new decorative images, external fonts, icon libraries, or UI frameworks.
- Interaction: primary controls remain at least 44 px tall on mobile; focus-visible and reduced-motion rules are present.
- Security and SEO: safe DOM rendering, current metadata, JSON-LD, Search Console verification, canonical/OGP URLs, robots, sitemap, and API implementation remain intact.

## Findings

The contrast pass introduced no layout or interaction regressions. Chrome measurements confirmed a 350 px-wide horizontal H1 at 390 px, a 60 px-high command surface ordered as upload/count/run, vertically stacked mobile steps, and 358 px-wide result rows within the viewport. Expected mock 422 responses were distinguished from application console errors. No actionable P0, P1, or P2 findings remain.

## Primary interactions tested

- 12-image mock processing with success, failure, and duplicate states
- Selection-order preservation and maximum-three parallel implementation retained
- Manual edit changes text to an input only during editing and persists the corrected value
- Individual failed-image retry reprocessed only its target
- Failed-only batch retry left successful items intact
- Individual copy, copy all, and CSV controls remained available
- FAQ accordion remained keyboard/click operable
- Browser console showed no application errors; expected mock HTTP failures were limited to the mocked `/api` responses

## Implementation checklist

- [x] Approved contrast direction implemented without a new design concept
- [x] 390/1280 Chrome screenshot and layout checks
- [x] Existing 320/768 responsive protections retained
- [x] No horizontal overflow
- [x] No Japanese one-character vertical wrapping
- [x] Existing functional IDs and safe event handling preserved
- [x] `functions/api.js`, `public/sitemap.xml`, and `public/robots.txt` unchanged

final result: passed
