# V4.3 Dark Upload Panel Design QA

- Source visual truth: the previously approved dark-hero/white-card capture `../v43-upload-card-qa/cloudflare-preview-390.png`, with the user's specified dark surface hierarchy (`#1C201E` hero, `#272C29` panel, `#303632` empty state, `#3A403C` border)
- Browser-rendered implementation: `../v43-upload-card-qa/mobile-390-initial.png`
- Full-view and focused comparison: `../v43-upload-card-qa/comparison-dark-panel.png`
- Source pixels: 390 × 844 px at a 390 × 844 CSS viewport and device scale factor 1
- Implementation pixels: 390 × 844 px at a 390 × 844 CSS viewport and device scale factor 1
- Additional implementation captures: 320 × 760 and 1280 × 900 CSS px
- States checked: empty upload state; 12-image success/failure/duplicate result state; editing; individual retry; failed-only retry

## Full-view comparison evidence

The normalized side-by-side comparison shows the same header, hero typography, upload-card structure, CTA order, and lower-section transition before and after the change. Only the visual surfaces inside the hero were changed. The white card is replaced by a slightly lighter charcoal control panel that remains distinct from the hero without appearing detached from it.

The new hierarchy is visible without glow, gradient, glass treatment, or strong elevation: `#1C201E` hero → `#272C29` control panel → `#303632` empty state. The deep-emerald CTA remains the sole strong action color.

## Focused comparison evidence

- Information order remains unchanged: purpose and supported formats → empty/selected state → primary selection CTA → secondary start action → AI-processing disclosure → multi-image explanation.
- Panel treatment uses a 1 px `#3A403C` border and a low-opacity natural shadow. The panel remains clearly bounded while visually belonging to the hero.
- Heading and body use `#F4F5F3` and `#AEB5B1`; the hierarchy is legible without reintroducing a white surface.
- Empty state uses `#303632` and a restrained border; selected-count text has a transparent background and no light patch.
- Disabled and busy controls use dark neutral surfaces and remain visibly secondary to the deep-emerald selection CTA.
- At 390 px the panel is 358 px wide, the selection CTA is 318 × 54 px, and the start action is 318 × 50 px. At 320 px the panel is 294 px wide. No horizontal overflow or vertical Japanese wrapping was detected.

## Required fidelity surfaces

- Fonts and typography: unchanged OS-native Japanese sans-serif stack; heading, body, disclosure, and action labels retain their existing size and weight hierarchy.
- Spacing and layout rhythm: upload structure, internal order, responsive padding, and 44 px-plus tap targets are unchanged.
- Colors and visual tokens: hero `#1C201E`, panel `#272C29`, empty state `#303632`, border `#3A403C`, heading `#F4F5F3`, body `#AEB5B1`, and the existing deep-emerald CTA.
- Image and icon quality: existing compact image icons are unchanged; no new assets, external fonts, libraries, or decorative imagery were introduced.
- Copy and content: all required Japanese labels, supported formats, empty state, upload CTA, start CTA, AI disclosure, and maximum-three parallel-processing explanation remain unchanged.

## Findings and comparison history

The first browser pass found one P2 color-integration issue: the selected-count element inherited a higher-specificity light background, producing a white patch inside the dark empty-state surface. A scoped override makes that element transparent and uses the panel's muted body color. The repeated 320/390/1280 captures confirm a uniform empty state.

The post-fix side-by-side comparison confirms that the panel no longer floats as a large white surface, while the hero-to-panel contrast and CTA focus remain clear. No actionable P0, P1, or P2 findings remain.

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
- [x] `functions/api.js`, feature JavaScript, SEO metadata, sitemap, robots, and `public/info.css` unchanged in this pass

final result: passed
