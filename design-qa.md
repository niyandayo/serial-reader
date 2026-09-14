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

# V4.3 Dark Lower Experience Design QA

- Source visual truth: the approved 390 × 844 dark hero and dark upload-panel capture `../v43-upload-card-qa/cloudflare-preview-390.png`, plus the user's specified lower-surface hierarchy and editorial list requirements
- Browser-rendered implementation: `../v43-lower-dark-qa/mobile-390-full.png`
- Same-viewport comparison: `../v43-lower-dark-qa/comparison-390.png`
- Result-state capture: `../v43-lower-dark-qa/mobile-390-results-full.png`
- Desktop captures: `../v43-lower-dark-qa/desktop-1280-full.png` and `../v43-lower-dark-qa/desktop-1280-results-full.png`
- Viewports checked: 390 × 844 and 1280 × 900 CSS px at device scale factor 1; the established 320 px regression suite was also rerun

## Full-view comparison evidence

The comparison confirms that the accepted white header, `#1C201E` hero, heading typography, deep-emerald CTA, and `#272C29` upload panel remain unchanged. The former abrupt white transition below the hero is replaced by restrained charcoal section surfaces. How-to, tips, use cases, supporting information, FAQ, result rows, and footer now belong to one visual system without using large cards, glow, gradient, or heavy shadow.

## Focused review

- How-to retains three compact vertical rows at 390 px. Numbers are plain deep-emerald text on dark surfaces; the inherited pale number boxes were removed.
- Photo tips and use cases retain their original meaning while presenting a short heading and supporting sentence in divider-led editorial rows.
- Compact result rows use the same spacing and behavior as before, with dark surfaces, low-contrast dividers, off-white code text, muted metadata, restrained success/error/duplicate colors, and editing-only inputs.
- FAQ remains an accessible native `details` accordion and uses 1 px dividers rather than white cards.
- Section surface rhythm is `#222624`, `#1F2321`, `#242826`, related charcoal supporting sections, `#1C201E` FAQ, and `#181B19` footer.
- The first browser pass exposed two P2 integration issues: inherited pale number backgrounds and a light gap before the footer. Both were corrected and the full suite was rerun.

## Verification

- [x] Approved hero and upload-panel computed colors unchanged
- [x] 390 px and 1280 px full-page visual review
- [x] 320/390/1280 responsive interaction regression
- [x] No horizontal overflow or vertical Japanese wrapping
- [x] 12-image success/failure/duplicate result state
- [x] Manual edit, individual retry, failed-only retry, individual copy, copy all, and CSV
- [x] Browser console free of application errors
- [x] Existing IDs, event wiring, feature JavaScript, SEO metadata, sitemap, robots, and `functions/api.js` preserved

final result: passed

# V4.3 Favicon and Row Copy Design QA

- Source visual truth: the released V4.3 result-state capture `../v43-lower-dark-qa/mobile-390-results-full.png` and the existing dark-charcoal/deep-emerald design tokens
- Browser-rendered implementation: `../v43-copy-favicon-qa/results-390.png`
- Focused copied-state evidence: `../v43-copy-favicon-qa/copy-feedback-390.png`
- Desktop evidence: `../v43-copy-favicon-qa/results-1280.png`
- Viewports checked: 320 × 760, 390 × 844, 768 × 900, and 1280 × 900 CSS px at device scale factor 1
- Favicon asset evidence: `../v43-copy-favicon-qa/favicon-preview.png`

## Full-view comparison evidence

The implementation retains the released V4.3 header, hero, dark upload panel, Compact Rows, editorial sections, FAQ, and footer. The only visible result-list change is the per-row copy action: it now uses a restrained muted-emerald surface and off-white label, making it easier to find than the low-emphasis edit action without competing with the main upload CTA.

## Focused comparison evidence

- The copy control remains in the existing right-edge action column and keeps the Compact Rows information hierarchy.
- Its 76 × 44 px minimum target is consistent at every checked viewport and does not overlap the code or edit control.
- Hover, active, focus-visible, disabled, and copied states use the existing deep-emerald family without gradient, glow, or strong shadow.
- After copying, the in-row label changes to `コピー済み`, exposes an updated accessible label, and quietly returns to `コピー` after 1.8 seconds.
- A long serial-code regression pass produced no horizontal overflow and did not shrink or displace the copy action.
- The favicon uses a charcoal square, four emerald focus corners, and a light center target. It remains legible when rasterized to the 32 px icon embedded in `/favicon.ico`.

## Verification

- [x] 320/390/768/1280 responsive browser checks
- [x] No horizontal overflow or vertical Japanese wrapping
- [x] Per-row copy targets remain at least 44 px high
- [x] Copy, copied feedback, copy all, and CSV export
- [x] Manual edit with long-code layout regression
- [x] Individual failed-image retry and failed-only batch retry
- [x] 12-image success/failure/duplicate mock state
- [x] XSS regression with markup-like edited content
- [x] Browser console free of application errors
- [x] `/favicon.ico` returns HTTP 200 with an ICO header in the local production-like server
- [x] Existing IDs, event wiring, AI code, SEO metadata, Search Console verification, sitemap, robots, and `functions/api.js` preserved

final result: passed
