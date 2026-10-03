# osauer.github.io

The GitHub Pages publisher for Oliver Sauer’s personal site, `osauer.dev`.
The Pages workflow publishes selected pages and assets from `main`, serving the
homepage, Desk and the brief Torok, HyperServe and Tower notes.

`osauer.dev/canary/` is separately published by `osauer/canary`, from its Pages
build of `main:/docs`. Its landing page uses this repository’s `/assets/site.css`;
its documentation and how-tos retain their own styles. Publish shared style
changes here before a Canary landing page that depends on them.

Before public website edits, verify each publisher with
`gh api repos/osauer/<repo>/pages` and the live `Last-Modified` header.

## Checks

```sh
node tools/check-site-links.mjs
node tools/build-public-site.mjs
node tools/check-site-links.mjs output/site
```

The build copies only tracked, explicitly allowed pages and asset types to
`output/site`. README, tools, workflow files, local browser artefacts and runtime
data are excluded. New pages need an entry in `tools/build-public-site.mjs`.
Text exports are checked for credential patterns, local home paths and broker
account identifiers. PDFs and images still require privacy review; screenshots
must come from synthetic simulation sessions.

```text
main -> public-file selection -> link checks -> GitHub Pages -> osauer.dev
```

Review the pages in a browser at desktop and phone widths. Browser artefacts in
`output/` and `.playwright-cli/` are local and ignored. The public pages use
static HTML/CSS with no third-party requests. Desk's
screenshot tour (`assets/desk-showcase.js`) and companion bird
(`assets/canary.js`, hidden under 761px) have no dependencies.
Instrument Sans and Instrument Serif are self-hosted as WOFF2 subsets;
their SIL OFL licences are in `assets/fonts/`.
Two families only: Instrument Serif for names and headlines, Instrument Sans for everything else.
Product names stay in the serif too (product faces were tried on 2026-10-01 and read as choppy).
Code uses the system monospace, so no third family is loaded.

## Screens

The three-slide tour tells a focused story: currency contribution, a decision,
and an Opportunities observation. Opportunities is labelled **in preview**;
a pattern match is not evidence of an edge and never grants order authority.
Risk, cash and market detail remain in the disclosures below. Mobile images
show native phone layouts; full-size links follow the image actually displayed.
The cash phone image focuses on the planner's hold, while desktop shows the plan.

The 3 October 2026 captures use Desk `ad12b871ba1afd84492abcab5b30b7fbf7ba19f8`,
including the Opportunities and holdings/Today changes. The public data is a
frozen, explicitly synthetic Friday session at 10:20 New York time. FX uses
USD like the example account and completed statements through 1 October.
The brief, watchlist evidence, cash priority and cash hold are synthetic fixtures;
they are not account observations or production-readiness evidence.

Reproduce from a fresh **isolated** clone of that Desk revision, never the live
checkout. `prepare-desk-capture.py` changes only the demonstration generators:
recognisable symbols, seeded irregular histories, a fixed reporting cutoff and
consistent base currency. The browser adapter supplies coherent synthetic
snapshot and stream data, a populated brief and Opportunities evidence. It
never changes rendered text, styles or warning elements.

```sh
python3 tools/prepare-desk-capture.py /path/to/isolated/desk
# Build the isolated Desk source, then start its binary:
/path/to/isolated/desk-binary -simulate -state /path/to/empty/synthetic-state -addr 127.0.0.1:8891 -health 127.0.0.1:8892
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tools/capture-desk-screenshots.mjs output/desk-captures http://127.0.0.1:8891/
```

Requires Python 3, Node 22+, Playwright, Chrome and `cwebp`. Captures are PNGs
at 2× density; convert reviewed assets to WebP (`cwebp -q 88`) before publishing.
The capture receipt records the source revision, fixture clock and browser
errors. Desktop is 1440×1000; the phone overview is 390×1080 so its account
summary is complete. Detail captures contain the real component bounds without
sticky navigation overlays. Review every published image at desktop and phone
sizes. Keep all financial qualifiers, explicit missing-data gaps and authority
holds. Never use live account data.

The Tower note retains its synthetic test-harness capture. Canary's lending
diagram remains in its separate publisher; the phone capture here is Desk in
a browser, not the Canary paired app.

## Icons and marks

The site icon is a bold OS monogram, paper on slate. Its custom rounded
geometry stays legible at 16px; `assets/favicon.svg` needs no web font.
`assets/favicon-32.png` (Safari and older browsers) and
`assets/apple-touch-icon.png` (180px, full square: iOS rounds the corners) are
rendered from it, for example with `rsvg-convert`. Every page links all three;
the Canary CLI landing keeps the canary icon. Torok's machine head is inlined on
`torok/index.html` from the Torok repository's `assets/torok-mark.svg` (see its
`docs/mark.md`), with the viewBox cropped to the drawing so the plinth sits on
the baseline and the dome reaches cap height; it takes the ink colour, so it
follows dark mode. Keep it when tidying assets.

## The companion bird

`assets/canary.js` and `assets/canary.css` draw the Desk companion's canary,
ported from the native app, and play a scripted day with demo messages and a
demo brief on the Desk page. Palette follows the Financial Times visual code
used by `site.css`.
Its proportions follow the native companion: a 52px capsule, 13px/12px text
and a visible bird about 52px square. Size the parts directly; scaling the
whole widget makes the text too small.
It sits just under the header rule, its capsule flush with the content column
and the bird in the gutter; the Desk hero reserves that band in CSS, so the
page does not shift when it mounts or is hidden. The capsule is not a live
region: a demo should not narrate to a screen reader.

## Product sheet

`assets/sheet/` holds the Canary Desk product sheet (web edition, no e-mail
address) and its page previews, rendered from the editable
`tools/product-sheet.html`. File names carry the month, so a shared link
always means that version. To reissue, add the new dated PDF and previews,
move the Desk page's links, and keep the old files.

The 2 October 2026 edition remains a historical snapshot. Its release-status
notes predate v3.16.0; the website and text export identify that distinction.
The homepage leads with the work; authorship stays in a quiet byline and About.
Use a day suffix when revising an existing month so shared older PDFs stay intact:

```sh
node tools/render-product-sheet.mjs 2026-10-02
```

Requires Node 22+, Google Chrome, Poppler (`pdfinfo`, `pdftoppm`) and `cwebp`. Check all
three rendered pages for clipping before updating the Desk download links and
file size. The sheet uses the site's self-hosted fonts; no private account data
or e-mail address is included. Keep prior dated editions for existing links.
