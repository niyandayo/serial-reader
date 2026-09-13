# V4.3 Final Design QA

- Source visual truth: approved final-adjustment mock `exec-30c8f8c2-041d-41b0-97ba-ed66a47e3e49.png` (local absolute path intentionally omitted from Git)
- Browser-rendered implementation: Codex in-app browser capture of the local app
- Source pixels: 852 × 1844 px
- Comparison viewport: source and implementation normalized to 390 × 844 CSS px
- States checked: no image selected; 12-image mock with success/failure/duplicate states; editing; individual retry; failed-only retry

## Full-view comparison evidence

The approved mock and the browser implementation were inspected side by side in one comparison view. Both use a quiet one-line header, a compact three-line title with only `シリアルコード` in deep emerald, a short supporting sentence, and one integrated command bar. The implementation preserves the mock's white/off-white surfaces, charcoal typography, precise 1 px rules, restrained radii, and lack of gradients, decorative imagery, glow, or heavy shadow.

The live implementation additionally retains the existing progress and four-value summary between the command bar and result rows. This is a deliberate functional requirement, styled as a compact continuation of the same product surface rather than as a separate card.

## Focused comparison evidence

- Header: service name remains primary while `使い方` and `FAQ` use smaller, lower-contrast text.
- Command bar: `写真を追加` → selected count → `読み取り開始` is one continuous control surface with subtle dividers and a light disabled state.
- Results: codes render as text in the normal state; an input appears only after `編集`. Thumbnails, state, copy/retry, duplicate warning, and metadata remain compact rows separated by 1 px rules.
- Supporting content: `使い方` is a compact three-step strip; the remaining sections use editorial spacing and dividers; FAQ remains a divider-based accordion.
- Responsive layout: measured at 320, 390, 768, and 1280 CSS px. No horizontal overflow or one-character Japanese wrapping was detected.

## Required fidelity surfaces

- Typography: OS system sans-serif; compact H1; restrained weight hierarchy; monospaced serial-code values.
- Layout: 8 px-based spacing rhythm, quiet header, integrated command bar, compact result rows, and divider-led supporting sections.
- Colors: `#FAFAF8`/white surfaces, `#171A1F` primary text, neutral secondary text, and limited deep emerald accent. Warning/error colors appear only for state communication.
- Assets: no new decorative images, external fonts, icon libraries, or UI frameworks.
- Interaction: primary controls remain at least 44 px tall on mobile; focus-visible and reduced-motion rules are present.
- Security and SEO: safe DOM rendering, current metadata, JSON-LD, Search Console verification, canonical/OGP URLs, robots, sitemap, and API implementation remain intact.

## Findings

The initial browser comparison found two CSS inheritance issues: the mobile header navigation remained hidden by earlier CSS, and the start button inherited an old grid position. Both were corrected in the final override. The post-fix side-by-side capture matches the approved hierarchy and interaction order. No actionable P0, P1, or P2 findings remain.

## Primary interactions tested

- 12-image mock processing with success, failure, and duplicate states
- Selection-order preservation and maximum-three parallel implementation retained
- Manual edit changes text to an input only during editing and persists the corrected value
- Individual failed-image retry reprocessed only its target
- Failed-only batch retry left successful items intact
- Individual copy, copy all, and CSV controls remained available
- FAQ accordion remained keyboard/click operable
- Browser console showed no application errors; expected mock failure diagnostics were warnings only

## Implementation checklist

- [x] Approved 390 px final-adjustment design implemented
- [x] 320/390/768/1280 responsive checks
- [x] No horizontal overflow
- [x] No Japanese one-character vertical wrapping
- [x] Existing functional IDs and safe event handling preserved
- [x] `functions/api.js`, `public/sitemap.xml`, and `public/robots.txt` unchanged

final result: passed
