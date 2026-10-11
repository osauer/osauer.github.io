#!/usr/bin/env python3
"""Generate static legacy redirects and validate the exact Pages artifact."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError
from urllib.parse import urlsplit, urldefrag
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://osauer.dev"
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
SITEMAPS = {ORIGIN + "/sitemap.xml", ORIGIN + "/canary/sitemap.xml"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def route_file(route):
    parsed = urlsplit(route)
    require(not parsed.scheme and not parsed.netloc and not parsed.query and not parsed.fragment,
            f"Expected a local route: {route}")
    require(route.startswith("/ibkr/") and "\\" not in route and "%" not in route
            and not any(part in (".", "..") for part in route.split("/")),
            f"Unsafe legacy route: {route}")
    return route.lstrip("/") + ("index.html" if route.endswith("/") else "")


def load_routes():
    manifest = json.loads((ROOT / "tools/legacy-redirects.json").read_text())
    redirects, retired = manifest["redirects"], manifest["retired"]
    require(not set(redirects) & set(retired), "A route is both redirected and retired")
    files = set()
    for source, target in redirects.items():
        file = route_file(source)
        require(file.endswith(".html"), f"Cannot use HTML to redirect a discovery file: {source}")
        require(file not in files, f"Duplicate redirect output: {file}")
        files.add(file)
        parsed = urlsplit(target)
        require(not parsed.scheme and not parsed.netloc and not parsed.query
                and parsed.path.startswith("/canary/") and "\\" not in target
                and not any(p in (".", "..") for p in parsed.path.split("/")),
                f"Redirect must name a current Canary route: {source} -> {target}")
    for source, reason in retired.items():
        route_file(source)
        require(isinstance(reason, str) and reason.strip(), f"Missing retirement reason: {source}")
    history = json.loads((ROOT / "tools/fixtures/legacy-sitemap-urls.json").read_text())["urls"]
    require(len(history) == len(set(history)) and history, "Historical inventory is empty or duplicated")
    missing = set(history) - {ORIGIN + p for p in set(redirects) | set(retired)}
    require(not missing, f"Unaccounted historical URLs: {sorted(missing)}")
    return redirects, retired


def redirect_html(target):
    destination = escape(ORIGIN + target, quote=True)
    canonical = escape(urldefrag(ORIGIN + target)[0], quote=True)
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url={destination}">
  <link rel="canonical" href="{canonical}">
  <title>Page moved | Canary</title>
</head>
<body>
  <p>This page has moved. <a href="{destination}">Continue to Canary</a>.</p>
</body>
</html>
'''


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.canonicals, self.refreshes, self.links, self.ids, self.robots = [], [], [], set(), []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "link" and "canonical" in attrs.get("rel", "").lower().split():
            self.canonicals.append(attrs.get("href", ""))
        if tag == "a":
            self.links.append(attrs.get("href", ""))
        if tag == "meta":
            if attrs.get("http-equiv", "").lower() == "refresh":
                self.refreshes.append(attrs.get("content", ""))
            if attrs.get("name", "").lower() in ("robots", "googlebot"):
                self.robots.append(attrs.get("content", "").lower())

    @property
    def noindex(self):
        return any(re.search(r"\b(noindex|none)\b", value) for value in self.robots)


def check_redirect(text, source, target):
    page = Page(text)
    require(page.canonicals == [urldefrag(ORIGIN + target)[0]], f"Wrong redirect canonical: {source}")
    require(len(page.refreshes) == 1 and re.fullmatch(r"0\s*;\s*url=" + re.escape(ORIGIN + target),
            page.refreshes[0], re.I), f"Missing or wrong immediate redirect: {source}")
    require(ORIGIN + target in page.links, f"Missing fallback link: {source}")
    require(not page.noindex, f"Redirect should communicate its destination, not noindex it: {source}")


def sitemap_urls(text, label):
    xml = ET.fromstring(text)
    require(xml.tag == NS + "urlset", f"Not a sitemap URL set: {label}")
    urls = []
    for entry in xml.findall(NS + "url"):
        loc = entry.findtext(NS + "loc", "").strip()
        parsed = urlsplit(loc)
        require(parsed.scheme == "https" and parsed.netloc == "osauer.dev" and not parsed.query
                and not parsed.fragment and not parsed.path.startswith("/ibkr/"),
                f"Noncanonical sitemap URL in {label}: {loc}")
        require(loc not in urls, f"Duplicate sitemap URL: {loc}")
        urls.append(loc)
        lastmod = entry.findtext(NS + "lastmod")
        if lastmod is not None:
            modified = datetime.fromisoformat(lastmod.replace("Z", "+00:00")).date()
            require(modified <= date.today(), f"Future lastmod: {loc}")
    require(urls, f"Empty sitemap: {label}")
    return set(urls)


def check_robots(text):
    # This public site deliberately allows every crawler. Enforce that small
    # contract instead of approximating Google's longest-match/group semantics
    # with Python's first-match RobotFileParser.
    fields = {}
    for line in text.splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        key, separator, value = line.partition(":")
        key, value = key.strip().lower(), value.strip()
        require(separator and key in ("user-agent", "allow", "disallow", "sitemap"),
                f"Unsupported robots directive; review crawler policy: {line}")
        fields.setdefault(key, []).append(value)
    require(fields.get("user-agent") == ["*"] and fields.get("allow") == ["/"]
            and not any(fields.get("disallow", [])),
            "robots.txt must allow all crawlers; a specific group or Disallow may block Googlebot")
    require(set(fields.get("sitemap", [])) == SITEMAPS,
            "robots.txt must advertise both current sitemaps")


def check_site(site, redirects, retired):
    require((site / "index.html").is_file(), f"Build the public artifact first: {site}")
    urls = sitemap_urls((site / "sitemap.xml").read_text(), "root sitemap")
    for source, target in redirects.items():
        file = site / route_file(source)
        require(file.is_file(), f"Redirect omitted from public artifact: {source}")
        check_redirect(file.read_text(), source, target)
    for source in retired:
        require(not (site / route_file(source)).exists(), f"Retired route unexpectedly published: {source}")
    owned = set()
    for file in site.rglob("*.html"):
        relative = file.relative_to(site).as_posix()
        if relative == "404.html" or relative.startswith("ibkr/"):
            continue
        page = Page(file.read_text())
        require(not page.refreshes and not page.noindex, f"Public page is redirected or noindex: {relative}")
        url = ORIGIN + "/" + re.sub(r"(^|/)index\.html$", r"\1", relative)
        require(page.canonicals == [url], f"Incorrect canonical on {relative}")
        require(url in urls, f"Public page missing from sitemap: {url}")
        owned.add(url)
    require({u for u in urls if not u.startswith(ORIGIN + "/canary/")} == owned,
            "Root sitemap contains a missing, retired, or noncanonical local page")
    check_robots((site / "robots.txt").read_text())
    return urls


def fetch(url):
    request = Request(url, headers={"User-Agent": "osauer.dev-publishing-check/1.0"})
    try:
        response = urlopen(request, timeout=20)
    except HTTPError as error:
        response = error
    with response:
        require(response.status == 200, f"HTTP {response.status}: {url}")
        require(response.url == url, f"Unexpected HTTP redirect: {url} -> {response.url}")
        require(not re.search(r"\b(noindex|none)\b", response.headers.get("X-Robots-Tag", ""), re.I),
                f"X-Robots-Tag prevents indexing: {url}")
        body = response.read(4 * 1024 * 1024 + 1)
        require(len(body) <= 4 * 1024 * 1024, f"Unexpectedly large public document: {url}")
        return body.decode("utf-8"), response.headers.get_content_type()


def check_live(urls, redirects, site, deployed=False):
    # Before deployment, root-owned URLs and robots are checked in the new
    # artifact. Requiring new pages to exist live would prevent publishing them
    # and requiring old live robots to work would prevent repairing that file.
    all_urls = set(urls) if deployed else {u for u in urls if u.startswith(ORIGIN + "/canary/")}
    live_sitemaps = SITEMAPS if deployed else {ORIGIN + "/canary/sitemap.xml"}
    for sitemap in sorted(live_sitemaps):
        text, content_type = fetch(sitemap)
        require(content_type in ("application/xml", "text/xml"), f"Sitemap is not XML: {sitemap}")
        discovered = sitemap_urls(text, sitemap)
        if sitemap == ORIGIN + "/canary/sitemap.xml":
            require(all(u.startswith(ORIGIN + "/canary/") for u in discovered),
                    "Canary sitemap contains URLs outside its delegated path")
        all_urls |= discovered
    all_urls |= {urldefrag(ORIGIN + target)[0] for target in redirects.values()}
    if deployed:
        robots, _ = fetch(ORIGIN + "/robots.txt")
        require(robots == (site / "robots.txt").read_text(), "Live robots.txt differs from the artifact")
        live_sitemap, _ = fetch(ORIGIN + "/sitemap.xml")
        require(live_sitemap == (site / "sitemap.xml").read_text(), "Live root sitemap differs from the artifact")
    else:
        robots = (site / "robots.txt").read_text()
    check_robots(robots)
    with ThreadPoolExecutor(max_workers=6) as pool:
        documents = dict(zip(sorted(all_urls), pool.map(fetch, sorted(all_urls))))
    for url, (text, content_type) in documents.items():
        if url.endswith(("/", ".html")):
            require(content_type == "text/html", f"Expected HTML: {url}")
            page = Page(text)
            require(not page.refreshes and not page.noindex, f"Destination is redirected or noindex: {url}")
            require(page.canonicals == [url], f"Destination canonical disagrees: {url}")
    for target in redirects.values():
        url, fragment = urldefrag(ORIGIN + target)
        if fragment:
            require(fragment in Page(documents[url][0]).ids, f"Missing destination anchor: {target}")
    scope = "deployed site" if deployed else "delegated Canary site"
    print(f"Live discovery check ({scope}): {len(all_urls)} URLs and canonical destinations pass")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["generate", "check", "verify"])
    parser.add_argument("site", type=Path, nargs="?", default=ROOT / "output/site")
    parser.add_argument("--live", action="store_true", help="Also validate current public destinations and sitemaps")
    args = parser.parse_args()
    redirects, retired = load_routes()
    if args.command == "generate":
        for source, target in redirects.items():
            file = args.site / route_file(source)
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(redirect_html(target))
        print(f"Generated {len(redirects)} legacy HTML redirects")
        return
    urls = check_site(args.site, redirects, retired)
    print(f"Publishing SEO check: {len(redirects)} redirects, {len(retired)} documented retirements, sitemap coverage and robots pass")
    if args.live or args.command == "verify":
        check_live(urls, redirects, args.site, deployed=args.command == "verify")
    if args.command == "verify":
        def verify_redirect(item):
            source, target = item
            text, content_type = fetch(ORIGIN + source)
            require(content_type == "text/html", f"Deployed redirect is not HTML: {source}")
            check_redirect(text, source, target)
            require(text == (args.site / route_file(source)).read_text(), f"Deployed content differs from artifact: {source}")
        with ThreadPoolExecutor(max_workers=6) as pool:
            list(pool.map(verify_redirect, redirects.items()))
        print(f"Deployment verified: all {len(redirects)} legacy redirects match the built artifact")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, ET.ParseError) as error:
        sys.exit(f"SEO check failed: {error}")
