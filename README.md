# osauer.github.io

The GitHub Pages publisher for Oliver Sauer’s personal site, `osauer.dev`.
`main:/` serves the homepage, Desk and the brief Torok, HyperServe and Tower notes.

`osauer.dev/canary/` is separately published by `osauer/canary`, from its Pages
build of `main:/docs`. Its landing page uses this repository’s `/assets/site.css`;
its documentation and how-tos retain their own styles. Publish shared style
changes here before a Canary landing page that depends on them.

Before public website edits, verify each publisher with
`gh api repos/osauer/<repo>/pages` and the live `Last-Modified` header.

## Checks

```sh
node tools/check-site-links.mjs
```

Review the pages in a browser at desktop and phone widths. Browser artefacts in
`output/` and `.playwright-cli/` are local and ignored. The public pages are static
HTML/CSS with no third-party requests; the only script is the companion bird on
the Desk page (`assets/canary.js`, no dependencies, hidden under 761px). Instrument Sans
and Instrument Serif are self-hosted as WOFF2 subsets from Google Fonts; their SIL OFL licences are in `assets/fonts/`.
Two families only: Instrument Serif for names and headlines, Instrument Sans for everything else.
Product names stay in the serif too (product faces were tried on 2026-10-01 and read as choppy).
Code uses the system monospace, so no third family is loaded.

## Screens

Only two Desk screens are used on the public marketing pages: portfolio and
decisions. They come from Desk’s simulation mode, with a synthetic book and
scripted replies. Never capture a live account for this site. To recapture:

```sh
./desk -simulate -state "$(mktemp -d)" -addr 127.0.0.1:8891 -health 127.0.0.1:8892
node tools/capture-desk-screenshots.mjs assets http://127.0.0.1:8891/
```

Desktop captures are 1600×1000 at 2×; the phone capture (390×844 at 3×) is
served below 760px through a `<picture>` element. The Tower note shows
`assets/tower-panel.webp`, rendered from the private Tower checkout's test
harness with synthetic sessions only.

## The companion bird

`assets/canary.js` and `assets/canary.css` draw the Desk companion's canary,
ported from the native app, and play a scripted day with demo messages and a
demo brief on the Desk page. Palette follows the Financial Times visual code
used by `site.css`.

## Product sheet

`assets/sheet/` holds the Canary Desk product sheet (web edition, no e-mail
address) and its page previews, rendered from the editable
`tools/product-sheet.html`. File names carry the month, so a shared link
always means that version. To reissue, add the new dated PDF and previews,
move the Desk page's links, and keep the old files.

The October 2026 edition adds FX contribution and the policy-based cash sweep. Update the source date and copy, then render a new dated edition:

```sh
node tools/render-product-sheet.mjs 2026-10
```

Requires Node 22+, Google Chrome, Poppler (`pdfinfo`, `pdftoppm`) and `cwebp`. Check all
three rendered pages for clipping before updating the Desk download links and
file size. The sheet uses the site's self-hosted fonts; no private account data
or e-mail address is included. Keep prior dated editions for existing links.
