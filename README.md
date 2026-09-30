# osauer.github.io

This repo is the live GitHub Pages publisher for the root `osauer.dev` site.

Current path ownership:

- `osauer.dev/` is served from this repo, `main:/`.
- `osauer.dev/desk/`, `osauer.dev/torok/`, `osauer.dev/hyperserve/` and
  `osauer.dev/tower/` are served from this repo's folders of the same name.
  `assets/` holds the shared stylesheet, favicon, screenshots, diagrams and
  the companion bird they reference.
- `osauer.dev/canary/` is served from `osauer/canary` GitHub Pages (`main:/docs`),
  not from this repo. The local link checker treats `/canary/` as a delegated
  route. The Canary logo on the landing page is a copy of that repo's
  `docs/social/canary-icon.png`.

Before changing a product path, verify the relevant repo's Pages settings with
`gh api repos/osauer/<repo>/pages` and confirm the live `Last-Modified` header.

## Checks

```sh
node tools/check-site-links.mjs
node tools/render-diagrams.mjs --check
```

The first verifies that every local link and asset resolves to a file. The
second verifies that the committed SVG diagrams in `assets/` match their sources
in `tools/diagrams/`; run it without `--check` to regenerate them.

## Code samples

Code blocks carry static syntax colouring; there is no JavaScript on the pages.
Regenerate a block's markup with `node tools/highlight-go.mjs < sample.go` and
paste the result inside `<pre><code>`.

## Transcripts

The demo transcript on the Torok page is a static `<pre>` copied from
`NO_COLOR=1 ./demo.sh` in the private Torok checkout, with repeated event
lines elided. Recapture it when the demo changes.

## Screenshots

The Canary Desk screenshots in `assets/` were captured from Canary Desk's built-in simulation
mode (`desk -simulate`), which renders the real console with a synthetic paper
book and scripted replies. They contain no account data. Recapture them from the
private Desk checkout when the console changes:

```sh
./desk -simulate -state "$(mktemp -d)" -addr 127.0.0.1:8891 -health 127.0.0.1:8892
node tools/capture-desk-screenshots.mjs assets http://127.0.0.1:8891/
```

The desktop captures are 1600x1000 at 2x, so the market ribbon shows all five
instruments; the phone capture is 390x844 at 3x. Outside US market hours the
simulation charts the last completed session in full (Desk 65d5dbf), so the
sparklines read like a real day at any hour.

The Tower picture (`assets/tower-panel.webp`) is the panel from the private
Tower checkout rendered against its test harness's fake runtime with synthetic
sessions and decisions only; never render it from a live export.

## The companion bird

`assets/canary.js` and `assets/canary.css` draw the Desk companion's canary
(the mark and the animations ported from the native app's `Canary.swift`) and
let it play a scripted day with demo messages and a demo brief on the landing
and Desk pages. It is plain ES module code with no dependencies and no network
access; it hides itself under 761px and respects reduced motion. A `×` on the
capsule hides it for the session.
