# osauer.github.io

This repo is the live GitHub Pages publisher for the root `osauer.dev` site.

Current path ownership:

- `osauer.dev/` is served from this repo, `main:/`.
- `osauer.dev/hyperserve/` is served from this repo's `hyperserve/` folder.
- `osauer.dev/ibkr/` is served from `osauer/ibkr` GitHub Pages (`main:/docs`),
  not from this repo. The local link checker treats `/ibkr/` as a delegated
  route.

Before changing a product path, verify the relevant repo's Pages settings with
`gh api repos/osauer/<repo>/pages` and confirm the live `Last-Modified` header.
