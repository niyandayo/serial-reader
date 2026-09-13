# V4.3 Code Ledger Design QA

- Source visual truth: generated concept `exec-91dd7f7c-0445-47ac-b26b-0b753e05635d.png` (local absolute path intentionally omitted from Git)
- Browser-rendered implementation: Codex in-app browser capture of `http://127.0.0.1:8795/` and the 390 px iframe capture in the local viewport harness
- Source pixels: 852 × 1844 px
- Implementation CSS viewport: 390 × 900 px for the initial state; 390 px-wide result-state capture
- Density normalization: source aspect ratio normalized to a 390 px CSS width; implementation rendered at 390 CSS px without horizontal scaling
- States: no images selected; 12-image mock with success 10, failure 2, duplicate 2; individual retry; failed-only retry; edited result

## Full-view comparison evidence

The source and browser-rendered implementation were inspected together. Both use a compact header, a three-line title with one emerald phrase, and a ledger that begins immediately with column labels and a photo-add row. The implementation preserves the source's light neutral surface, precise rules, low-radius controls, dense information hierarchy, and absence of gradients, large illustrations, floating cards, and marketing decoration.

The implementation keeps one short supporting sentence between the title and ledger. This is an intentional product clarification that preserves the existing Japanese description without returning to the previous marketing-page hierarchy.

## Focused comparison evidence

- Upload ledger: the 390 px capture shows the same order as the source—column labels, numbered photo-add row, supporting rows, and start action—with the photo row fully tappable.
- Result ledger: the browser-rendered 12-image state keeps thumbnails, long filenames, editable codes, copy/retry actions, duplicate markers, and status labels aligned as compact rows.
- Responsive layout: measured at 320, 390, 768, and 1280 CSS px. No horizontal overflow was detected.

## Required fidelity surfaces

- Typography: OS system sans-serif; restrained 600–660 weights; compact title line-height; monospaced result codes; long filenames truncate without moving actions.
- Spacing and layout: one continuous ledger replaces the former nested upload card. The 8 px rhythm, 1 px rules, 4–6 px radii, and compact row heights match the selected direction.
- Colors and tokens: `#FAFAF8` background, `#171A1F` primary text, `#686E75` secondary text, and `#0F6B55` as the limited accent. Error, warning, success, and disabled states remain distinguishable.
- Image quality and assets: no decorative imagery was required by the selected concept. Existing image thumbnails and the functional photo icon remain crisp and correctly cropped.
- Copy and content: service purpose, file formats, privacy notice, progress, result actions, help content, and FAQ remain available. Repeated upload instructions were consolidated.
- Interaction and accessibility: upload and start controls measure 80/46 px on mobile; focus-visible and reduced-motion rules remain; semantic labels, headings, alt text, and existing safe DOM rendering are preserved.

## Findings

No actionable P0, P1, or P2 findings remain.

## Comparison history

- Earlier P1: the upload interaction remained a conventional card below marketing copy.
  - Fix: rebuilt the first screen around a numbered ledger whose first row is the photo-selection control.
  - Post-fix evidence: the 390 px capture presents photo selection as the primary product surface inside the first viewport.
- Earlier P2: result rows and supporting content used different visual systems.
  - Fix: applied the same rules, typography, status tokens, and compact row rhythm to upload, progress, results, and supporting information.
  - Post-fix evidence: the 12-image browser state retains a consistent ledger structure across success, failure, duplicate, retry, and edited states.

## Primary interactions tested

- 12-image mock processing: success 10, failure 2, duplicate 2
- Individual retry: only the selected failed item was reprocessed
- Failed-only batch retry: remaining failed item was reprocessed; successful items were retained
- Manual edit and individual copy: edited value persisted and copy state changed to copied
- Copy all: 12-item completion alert appeared
- CSV export: action completed without a browser error
- Browser console: zero application errors in the clean and mock runs

## Implementation checklist

- [x] Code Ledger first-view structure
- [x] Mobile-first 320/390 layout
- [x] Tablet and desktop 768/1280 layout
- [x] No horizontal overflow
- [x] Existing IDs, functional JavaScript, SEO metadata, JSON-LD, and XSS-safe DOM policy preserved
- [x] `functions/api.js`, `public/sitemap.xml`, and `public/robots.txt` unchanged

final result: passed
