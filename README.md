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
node tools/render-diagrams.mjs --check
```

Review the pages in a browser at desktop and phone widths. Browser artefacts in
`output/` and `.playwright-cli/` are local and ignored. The public pages are static
HTML/CSS, with no client JavaScript or third-party font requests. Instrument Sans
and Instrument Serif are self-hosted; their SIL OFL licences are in `assets/fonts/`.

## Screens

Only two Desk screens are used on the public marketing pages: portfolio and
decisions. They come from Desk’s simulation mode, with a synthetic book and
scripted replies. Never capture a live account for this site. To recapture:

```sh
./desk -simulate -state "$(mktemp -d)" -addr 127.0.0.1:8891 -health 127.0.0.1:8892
node tools/capture-desk-screenshots.mjs assets http://127.0.0.1:8891/
```

Desktop captures are 1600×1000 at 2×. The helper also captures other views and
phone width for local review; their assets are not displayed in the marketing
pages. The older diagrams and companion assets remain available but are not
part of the current presentation.
