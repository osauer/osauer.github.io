# osauer.github.io

The GitHub Pages publisher for Oliver Sauer’s personal site, `osauer.dev`.
The Pages workflow publishes selected pages and assets from `main`, serving the
homepage, Desk and the brief Torok and HyperServe notes.

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
node tools/copy-lint.mjs --skip /ibkr/docs output/site
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

The four-view tour opens with Performance, then offers Decisions, Opportunities
and Cash. The separate, unnumbered daily-routine section describes when Desk
works. A pattern match is not evidence of an edge
and never grants order authority. The daily-use disclosure adds the morning
brief and Operations.
Risk, cash and market detail remain in the disclosures below. Mobile images
show native phone layouts. Screenshot clicks open an in-page dialog with Close,
Escape and zoom; closing restores focus and retains the page position. Modified
clicks and JavaScript-free links still open the underlying image. The viewer
always uses the image actually displayed.
The cash phone image focuses on the planner's hold, while desktop shows the plan.

The 8 October 2026 refresh uses Desk local main
`ac450e75f154ebcd4facea5a518c869e7a709d66`, including the revised Holdings,
Decisions and Operations views. Every public Desk image has a light and a dark
capture of the same fixture. The public data is a frozen, explicitly synthetic
Friday session at 10:20 New York time on 2 October. FX uses USD like the example
account and completed statements through 1 October. The brief, chart histories,
Opportunities evidence, cash plan, borrowing costs and option quotes are
synthetic fixtures, not observations of an account or evidence of performance.
The Decisions fixture includes complete order terms; real simulation controls
and authority holds stay visible. The capture receipt records the exact source
revision and errors, and `tools/desk-capture-receipt.json` preserves the accepted
refresh metadata.

The Performance lead has a separate four-image refresh receipt in
`tools/desk-performance-capture-receipt.json`, from the same renderer and existing
positive synthetic fixture. It includes the Portfolio and chart controls in both
themes and at desktop and phone widths.

A visible product redesign or feature addition requires fresh paired captures,
updated captions, social image and a new dated sheet before the public page is
called current. Regenerate from local main in an isolated clone, review the
actual pixels and keep the receipt. A build passing does not prove visual
freshness. Never recolour a capture to fabricate its other theme.

The script also captures the Short interest screen. It is not published: the
rows pair invented figures with real company names. Publish it only after an
owner decision.

Reproduce from a fresh **isolated** clone of that Desk revision, never the live
checkout. `prepare-desk-capture.py` changes only the demonstration generators:
recognisable symbols, seeded irregular histories, a fixed reporting cutoff and
consistent base currency. The browser adapter supplies coherent synthetic
snapshot and stream data, a populated brief, Opportunities evidence, research
screens and option discovery. Only the trade-ticket capture enables Desk's
trading capability; the adapter answers option discovery and refuses every
preview, authorisation and submission route, so no order is previewed or sent.
It never changes rendered text, styles or warning elements.

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
summary is complete, and the phone ticket is 390×1200 so the dialog is not
clipped. My stocks borrowing is desktop only: on a phone its table scrolls
sideways past the borrow column. Detail captures contain the real component
bounds without sticky navigation overlays. Review every published image at
desktop and phone sizes. Keep all financial qualifiers, explicit missing-data
gaps and authority holds. Never use live account data.

Canary's lending diagram remains in its separate publisher; the phone capture here is Desk in
a browser, not the Canary paired app.

## Website theme

The small, dependency-free `assets/theme.js` exists so visitors can override
the OS scheme and product screenshots can follow that choice. Load it before
stylesheets to apply a saved preference before paint. System is the default;
Dark and Light persist on this origin. System reacts to OS changes and an
explicit choice syncs across tabs. Native radio controls support the keyboard.
Without JavaScript, CSS and picture media queries still follow the OS.
Each theme-aware picture provides dark sources marked `data-theme-source`, with
its width condition in `data-media`. The tour changes both device and theme
sources; every full-size link must match the image actually displayed.
The printable sheet and social preview deliberately use light captures.

With the local preview running, verify the real page and capture combinations:

```sh
SITE_URL=http://127.0.0.1:8913 PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tools/check-site-theme.cjs
```

This checks desktop, laptop and phone widths, both explicit themes against the
opposite OS setting, all screenshot openers, native keyboard controls, image
failure and retry, System updates and saved choices across pages and tabs. The
viewer checks cover Close, Escape, backdrop clicks, focus and scroll restoration,
zoom with the toolbar in view, and keeping the page URL and browser tab intact.
Inspect the
screenshots in `output/review`; assertions alone are not visual review.

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

The 8 October 2026 edition (`2026-10-08`) is current. It clarifies data flow and
order authority and adds a fourth page with current synthetic interface captures.
The 4 October edition remains a historical snapshot.
The 2 October 2026 edition remains a historical snapshot. Its release-status
notes predate v3.16.0; the website and text export identify that distinction.
The homepage leads with the work; authorship stays in a quiet byline and About.
Use a day suffix when revising an existing month so shared older PDFs stay intact:

```sh
node tools/render-product-sheet.mjs 2026-10-08
```

Requires Node 22+, Google Chrome, Poppler (`pdfinfo`, `pdftoppm`) and `cwebp`. Check all
four rendered pages for clipping before updating the Desk download links and
file size. The sheet uses the site's self-hosted fonts; no private account data
or e-mail address is included. Keep prior dated editions for existing links.
