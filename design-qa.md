# V4.3 Guided Upload Card Design QA

- Source visual truth: `C:/Users/hyory/.codex/codex-remote-attachments/01a0769b-baf4-77e3-81d8-4cbec68f01de/8DF1BB6B-5A7C-4316-AAB6-8C4AEE40217B/1-写真1.jpg`
- Browser-rendered implementation: `../v43-upload-card-qa/mobile-390-initial.png`
- Focused comparison: `../v43-upload-card-qa/comparison-upload-focus.png`
- Full-view comparison: `../v43-upload-card-qa/comparison-full.png`
- Source pixels: 720 × 1280 px
- Implementation pixels: 390 × 844 px at a 390 × 844 CSS viewport and device scale factor 1
- Additional implementation captures: 320 × 760 and 1280 × 900 CSS px
- States checked: empty upload state; 12-image success/failure/duplicate result state; editing; individual retry; failed-only retry

## Full-view comparison evidence

The reference and implementation were normalized into one side-by-side comparison image. Both use a light, low-saturation canvas; a white upload card; a restrained green accent; and a clear visual path from purpose to selection to processing. The implementation intentionally omits the reference's decorative photography and feature tiles because the user requested a focused update to the upload area without expanding the page or adding large assets.

The implementation preserves the existing compact H1 and editorial sections. The upload card is now the primary first-view product surface, rather than a form row or command bar.

## Focused comparison evidence

- Information order: purpose and supported formats → empty/selected state → primary selection CTA → secondary start action → AI-processing disclosure → multi-image benefit.
- Card treatment: white surface, 1 px neutral border, 16–18 px radius, and a low-opacity natural shadow. No gradient, glow, glass effect, or nested card treatment is present.
- Primary action: full-width green selection control with 54–56 px height, restrained iconography, and clear hover/pressed/focus states.
- Empty state: a single quiet dashed region communicates selection state without competing with the CTA.
- Typography: the card heading, explanatory text, action label, disclosure, and supporting note use distinct size, weight, and contrast levels.
- Responsive fit: the card measures 294 px at 320 px, 358 px at 390 px, and is capped at 760 px on desktop. No horizontal overflow or one-character Japanese wrapping was detected.

## Required fidelity surfaces

- Fonts and typography: unchanged OS-native Japanese sans-serif stack; the upload heading uses semibold weight while supporting copy remains regular; responsive phrase grouping avoids orphaned Japanese characters.
- Spacing and layout rhythm: consistent 10–20 px internal gaps, aligned card edges, 44 px-plus tap targets, and a contained desktop width prevent either crowding or excessive stretching.
- Colors and visual tokens: off-white `#F5F7F3` first-view canvas, white card, charcoal text, limited deep green `#167357`, and light neutral borders/disabled surfaces.
- Image and icon quality: the compact image icon already used by the product is reused; no raster decoration, external font, icon library, or framework was added.
- Copy and content: required supported formats, empty state, upload CTA, start CTA, AI disclosure, and maximum-three parallel-processing explanation are all present in Japanese.

## Findings and comparison history

Initial browser review found two P2 polish issues at 390 px: the supported-format sentence could end with a one-character orphan, and the privacy link could split after its first character. The copy was grouped into natural inline phrases and the link was made non-breaking. The post-fix capture confirms balanced two-line supporting copy and an intact `詳しく見る` link.

No actionable P0, P1, or P2 findings remain.

## Primary interactions tested

- Empty and 12-image selected states
- 12-image mock processing with success 10, failure 2, and duplicate 2
- Selection count update and selection-order preservation
- Manual edit with text-only normal display
- Individual failed-image retry and failed-only batch retry
- Individual copy, copy all, and CSV export
- XSS regression with markup-like edited content
- Browser console checked with no application errors

## Implementation checklist

- [x] 320/390/1280 responsive browser checks
- [x] No horizontal overflow
- [x] No Japanese one-character vertical wrapping
- [x] Primary and secondary actions are at least 44 px tall
- [x] Existing IDs and event wiring preserved
- [x] `functions/api.js`, feature JavaScript, SEO metadata, sitemap, robots, and `public/info.css` unchanged

final result: passed
