"""Regressions for the failures that must stop Pages publication."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location("site_seo", Path(__file__).with_name("site-seo.py"))
seo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seo)


def sitemap(*urls):
    return '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(
        '<url><loc>' + url + '</loc></url>' for url in urls) + '</urlset>'


class PublishingChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.site = Path(self.temp.name)
        self.redirects = {"/ibkr/": "/canary/", "/ibkr/guides/updating.html": "/canary/docs/start/updating.html"}
        self.retired = {"/ibkr/llms.txt": "Use the current canonical discovery document."}
        self.write("index.html", '<html><link rel="canonical" href="https://osauer.dev/"></html>')
        self.write("sitemap.xml", sitemap("https://osauer.dev/"))
        self.write("robots.txt", 'User-agent: *\nAllow: /\n' + ''.join('Sitemap: ' + u + '\n' for u in sorted(seo.SITEMAPS)))
        for source, target in self.redirects.items():
            self.write(seo.route_file(source), seo.redirect_html(target))

    def write(self, name, text):
        file = self.site / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(text)

    def check(self):
        return seo.check_site(self.site, self.redirects, self.retired)

    def test_valid_artifact(self):
        self.assertEqual(self.check(), {"https://osauer.dev/"})

    def test_redirect_dropped_by_allowlist_fails(self):
        (self.site / "ibkr/guides/updating.html").unlink()
        with self.assertRaisesRegex(ValueError, "Redirect omitted"):
            self.check()

    def test_wrong_destination_and_delayed_refresh_fail(self):
        file = self.site / "ibkr/index.html"
        original = file.read_text()
        for replacement in [original.replace('0; url=', '5; url='),
                            original.replace('0; url=https://osauer.dev/canary/', '0; url=https://osauer.dev/')]:
            with self.subTest(html=replacement):
                file.write_text(replacement)
                with self.assertRaisesRegex(ValueError, "immediate redirect"):
                    self.check()

    def test_wrong_redirect_canonical_fails(self):
        self.write('ibkr/index.html', seo.redirect_html('/canary/').replace('rel="canonical" href="https://osauer.dev/canary/"', 'rel="canonical" href="https://osauer.dev/"'))
        with self.assertRaisesRegex(ValueError, "redirect canonical"):
            self.check()

    def test_noindex_redirect_fails(self):
        self.write('ibkr/index.html', seo.redirect_html('/canary/').replace('</head>', '<meta name="robots" content="noindex"></head>'))
        with self.assertRaisesRegex(ValueError, "noindex"):
            self.check()

    def test_fragment_redirect_uses_page_canonical(self):
        seo.check_redirect(seo.redirect_html('/canary/#install'), '/ibkr/connect-claude-to-ibkr/', '/canary/#install')

    def test_new_public_page_missing_from_sitemap_fails(self):
        self.write('new/index.html', '<link rel="canonical" href="https://osauer.dev/new/">')
        with self.assertRaisesRegex(ValueError, "missing from sitemap"):
            self.check()

    def test_sitemap_cannot_include_missing_or_legacy_pages(self):
        for url in ['https://osauer.dev/missing/', 'https://osauer.dev/ibkr/']:
            with self.subTest(url=url):
                self.write('sitemap.xml', sitemap('https://osauer.dev/', url))
                with self.assertRaises(ValueError):
                    self.check()

    def test_sitemap_must_be_valid_xml_and_cannot_be_homepage_html(self):
        for text in ['<urlset>', '<html><head></head></html>']:
            with self.subTest(text=text):
                with self.assertRaises((ValueError, ET.ParseError)):
                    seo.sitemap_urls(text, 'test')

    def test_sitemap_rejects_duplicates_and_future_dates(self):
        for text in [sitemap('https://osauer.dev/', 'https://osauer.dev/'),
                     sitemap('https://osauer.dev/').replace('</url>', '<lastmod>2999-01-01</lastmod></url>')]:
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    seo.sitemap_urls(text, 'test')

    def test_googlebot_block_is_detected(self):
        file = self.site / 'robots.txt'
        file.write_text(file.read_text() + '\nUser-agent: Googlebot\nDisallow: /\n')
        with self.assertRaisesRegex(ValueError, "block Googlebot"):
            self.check()

    def test_specific_disallow_after_broad_allow_is_detected(self):
        file = self.site / 'robots.txt'
        file.write_text(file.read_text() + 'Disallow: /canary/\n')
        with self.assertRaisesRegex(ValueError, "block Googlebot"):
            self.check()

    def test_prepublication_does_not_require_new_root_pages_to_exist_live(self):
        self.write('new/index.html', '<link rel="canonical" href="https://osauer.dev/new/">')
        self.write('sitemap.xml', sitemap('https://osauer.dev/', 'https://osauer.dev/new/'))
        urls = self.check()
        def public_canary_only(url):
            self.assertTrue(url.startswith('https://osauer.dev/canary/'), url)
            if url.endswith('sitemap.xml'):
                return sitemap('https://osauer.dev/canary/'), 'application/xml'
            return '<link rel="canonical" href="' + url + '">', 'text/html'
        with patch.object(seo, 'fetch', side_effect=public_canary_only):
            seo.check_live(urls, self.redirects, self.site)

    def test_delegated_redirect_or_noindex_destination_stops_publication(self):
        for extra in ['<meta http-equiv="refresh" content="0; url=https://osauer.dev/">',
                      '<meta name="robots" content="noindex">']:
            def public_canary(url):
                if url.endswith('sitemap.xml'):
                    return sitemap('https://osauer.dev/canary/'), 'application/xml'
                return '<link rel="canonical" href="' + url + '">' + extra, 'text/html'
            with self.subTest(extra=extra), patch.object(seo, 'fetch', side_effect=public_canary):
                with self.assertRaisesRegex(ValueError, 'redirected or noindex'):
                    seo.check_live(self.check(), self.redirects, self.site)

    def test_missing_sitemap_discovery_is_detected(self):
        file = self.site / 'robots.txt'
        file.write_text(file.read_text().replace('Sitemap: https://osauer.dev/canary/sitemap.xml\n', ''))
        with self.assertRaisesRegex(ValueError, "advertise both"):
            self.check()

    def test_retired_machine_file_cannot_be_replaced_with_html(self):
        self.write('ibkr/llms.txt', seo.redirect_html('/canary/'))
        with self.assertRaisesRegex(ValueError, "Retired route"):
            self.check()

    def test_historical_inventory_catches_manifest_omission(self):
        redirects, retired = seo.load_routes()
        with patch.object(seo, 'ROOT', self.site):
            import json
            redirects.pop('/ibkr/ibkr-mcp/')
            self.write('tools/legacy-redirects.json', json.dumps({'redirects': redirects, 'retired': retired}))
            self.write('tools/fixtures/legacy-sitemap-urls.json', json.dumps({'urls': ['https://osauer.dev/ibkr/ibkr-mcp/']}))
            with self.assertRaisesRegex(ValueError, 'Unaccounted historical'):
                seo.load_routes()

    def test_unsafe_output_paths_are_rejected(self):
        for route in ['/ibkr/../index.html', '/ibkr/%2e%2e/index.html', '//elsewhere/ibkr/', '/ibkr/x.html?bad=1']:
            with self.subTest(route=route):
                with self.assertRaises(ValueError):
                    seo.route_file(route)


if __name__ == '__main__':
    unittest.main()
