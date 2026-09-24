# osauer.github.io

This repo is the live GitHub Pages publisher for the root `osauer.dev` site.

Current path ownership:

- `osauer.dev/` is served from this repo, `main:/`.
- `osauer.dev/desk/`, `osauer.dev/torok/` and `osauer.dev/hyperserve/` are served
  from this repo's folders of the same name. `assets/` holds the shared
  stylesheet, favicon, screenshots and diagrams they reference.
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

## Screenshots

The Canary Desk screenshots in `assets/` were captured from Canary Desk's built-in simulation
mode (`desk -simulate`), which renders the real console with a synthetic paper
book and scripted replies. They contain no account data. Recapture them from the
private Desk checkout when the console changes.
