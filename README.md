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

The Desk page leads with a three-view story: FX contribution, Decisions and
Cash sweep. Native disclosures keep reporting methods, market/phone captures and
the full feature catalogue available without lengthening the primary journey. Focused FX, cash and market captures
make the details readable; phone captures show the responsive browser UI.
They come from Desk’s simulation mode, with a synthetic book and scripted
replies. Never capture a live account for this site. To recapture:

```sh
./desk -simulate -state "$(mktemp -d)" -addr 127.0.0.1:8891 -health 127.0.0.1:8892
node tools/capture-desk-screenshots.mjs output/desk-captures http://127.0.0.1:8891/
```

Desktop captures use a 1600×1000 viewport; full phone captures use 390×844.
The 3 October refresh uses the repaired Desk panels and a seeded, varied FX
series; the tour shows cumulative YTD FX while the detail shows daily WTD.
The values remain explicitly synthetic and are never imported account history.
Detail captures retain the panel's native dimensions. The tour uses phone
captures below 760px, with focused panels for Performance, FX and Market.
Detail crops omit the surrounding app gutters; `assets/desk-showcase.css`
supplies canvas-coloured padding so labels never touch the presentation frame.
`assets/desk-showcase.js` adds tabs and keyboard controls; without it the
thumbnail links still open the full-size captures. It has no dependencies.
The phone beside the market studies is Desk in a browser, not the Canary PWA.
Use the actual Canary app capture if changing that caption.
The lending diagram is inline SVG in the Canary landing page
(two variants, wide and narrow), so it sets its type in the site's
two families; it holds no account data. The capture tool
also emits optional risk, operations and full market-study captures; publish
only the views used by the page after reviewing the captures in
`output/desk-captures/`. The Tower note shows
`assets/tower-panel.webp`, rendered from the private Tower checkout's test
harness with synthetic sessions only.

## Icons and marks

The site icon is the initials OS in Instrument Serif, paper on slate:
`assets/favicon.svg` holds the glyph outlines, so it needs no web font.
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
