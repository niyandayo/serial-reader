# V4.3 Design QA

- Source visual truth: user attachment `1-写真1.jpg` (the local attachment path is intentionally omitted from Git)
- Browser-rendered implementation: Codex in-app browser capture of `http://127.0.0.1:8795/`, shown in the comparison view at `http://127.0.0.1:8796/`
- Viewport: 360 × 640 CSS px
- Density normalization: source 720 × 1280 px shown at 360 × 640; implementation iframe rendered at 360 × 640 CSS px
- State: initial state, no images selected

## Full-view comparison evidence

The reference and implementation were rendered side by side in one browser view. The implementation carries over the intended white/off-white base, black-led typography, a single restrained green accent, a compact service label, and an immediately visible image-selection CTA. Decorative hero photography, English labels, feature-card rows, gradients, and oversized marketing elements were intentionally omitted because the product brief explicitly excludes them.

## Focused comparison evidence

The 360 × 640 full view keeps the header, H1, supporting sentence, upload CTA, empty state, privacy note, disabled start control, and the beginning of the supporting content legible at the same time. A separate crop was not required because these critical surfaces were readable in the normalized comparison.

## Required fidelity surfaces

- Typography: system-font stack retained; three-line H1 uses moderate 610/650 weights, compact line height, and one green phrase. Supporting copy and control labels remain clearly subordinate.
- Spacing and layout: single-column flow on mobile and desktop; image selection remains above the fold. The upload UI uses one boundary without nested or dashed containers.
- Colors and tokens: `#FAFAF8` background, `#171A1F` text, `#626970` secondary text, and `#0F7A5A` accent. Semantic success, warning, and error colors remain distinct.
- Image quality and assets: no new imagery was added. The large decorative image in the reference was intentionally excluded by the brief. The existing functional upload icon remains unchanged.
- Copy and content: the H1 meaning, supported actions, file-format guidance, AI-processing notice, and SEO support content remain present.
- Accessibility and behavior: visible focus styles, 44 px minimum primary controls, readable contrast, and reduced-motion handling remain present. Existing functional JavaScript and IDs are unchanged.

## Findings

No actionable P0, P1, or P2 findings remain. The implementation intentionally prioritizes the live tool over the reference image's promotional decoration.

## Comparison history

- Earlier implementation: berry accent and desktop split layout read as a conventional form/SaaS composition.
- Fix: restored a single information flow, changed to restrained green, strengthened the typographic hierarchy, simplified the brand, and reordered the mobile upload UI so the primary CTA appears first.
- Post-fix evidence: normalized side-by-side browser capture shows a compact, tool-first first view without the excluded marketing devices.

## Implementation checklist

- [x] Single-column hero and tool flow
- [x] Green limited to the H1 accent, CTA, progress, links, and small numeric labels
- [x] No new external fonts, images, libraries, or animation
- [x] Existing functional selectors and scripts preserved
- [x] Responsive, interaction, syntax, and protected-file regression checks passed before commit

final result: passed
