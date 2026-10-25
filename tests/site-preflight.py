#!/usr/bin/env python3
"""Site preflight: validate index.html structure, structured data and local asset URLs.

Two modes:
  source : audit the repo index.html, resolving refs with the build mapping
           (images/x -> public/images/x, public/images/x -> public/images/x)
  dist   : audit a built dist/index.html, where every local ref must resolve
           directly from the dist root (this is what a static host will serve)

Run:
  python3 tests/site-preflight.py            # source audit
  python3 tests/site-preflight.py --dist     # built-output audit
  python3 tests/site-preflight.py --help
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_ORIGIN = "https://buddy-ai-partners.surge.sh/"


def is_local(ref: str) -> bool:
    ref = ref.strip()
    if not ref:
        return False
    if ref.startswith(("data:", "mailto:", "tel:", "javascript:", "upi:", "#", "//")):
        return False
    if ref.startswith(SITE_ORIGIN):
        return True  # own production URL -> validate its path too
    return not ref.startswith(("http://", "https://"))


def local_paths(ref: str, base: Path, mode: str):
    ref = ref.strip()
    if ref.startswith(SITE_ORIGIN):
        ref = ref[len(SITE_ORIGIN):]
    ref = ref.split("#")[0].split("?")[0].lstrip("/")
    if not ref:
        return []
    if mode == "dist":
        # The built tree must resolve the reference directly from its root.
        out = [base / ref]
        if ref.startswith("public/images/"):
            out.append(base / ref[len("public/"):])
        return out
    # source mode: mirror the mapping the build applies
    out = [base / ref]
    if ref.startswith("images/"):
        out.append(base / "public" / ref)
    if ref.startswith("public/"):
        out.append(base / "public" / ref[len("public/"):])
    return out


class RefCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.refs = []  # (group label, reference)

    @staticmethod
    def _srcset(value):
        return [part.strip().split(" ")[0] for part in value.split(",") if part.strip()]

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        tag = tag.lower()
        if a.get("id"):
            self.ids.append(a["id"])
        if tag == "img":
            if a.get("src"):
                self.refs.append(("img", a["src"]))
            if a.get("srcset"):
                self.refs.extend(("img", r) for r in self._srcset(a["srcset"]))
        elif tag == "source" and a.get("srcset"):
            self.refs.extend(("source", r) for r in self._srcset(a["srcset"]))
        elif tag == "link" and a.get("href"):
            rel = (a.get("rel") or "").lower()
            if any(k in rel for k in ("icon", "preload", "stylesheet", "manifest")):
                self.refs.append(("link", a["href"]))
        elif tag == "script" and a.get("src"):
            self.refs.append(("script", a["src"]))
        elif tag == "a" and a.get("href"):
            self.refs.append(("a", a["href"]))


def audit(html_path: Path, base: Path, mode: str) -> int:
    html = html_path.read_text(encoding="utf-8")
    problems = []

    collector = RefCollector()
    collector.feed(html)

    dupes = sorted({x for x in collector.ids if collector.ids.count(x) > 1})
    if dupes:
        problems.append("Duplicate HTML IDs: " + ", ".join(dupes))

    if 'rel="canonical"' not in html and "rel='canonical'" not in html:
        problems.append("Canonical link missing.")

    schemas = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    if not schemas:
        problems.append("No JSON-LD schema blocks found.")
    for i, payload in enumerate(schemas, 1):
        try:
            json.loads(payload)
        except json.JSONDecodeError as exc:
            problems.append(f"Invalid JSON-LD schema {i}: {exc}")

    checked = 0
    for group, ref in collector.refs:
        if not is_local(ref):
            continue
        candidates = local_paths(ref, base, mode)
        if not candidates:
            continue
        checked += 1
        if not any(c.is_file() for c in candidates):
            problems.append(f"Missing local asset referenced by <{group}>: {ref}")

    # Social/OG images use absolute production URLs; their paths must exist too.
    for meta in re.findall(r'<meta[^>]+(?:og:image|twitter:image)[^>]*>', html):
        m = re.search(r'content="([^"]+)"', meta)
        if not m:
            continue
        url = m.group(1)
        if not url.startswith(SITE_ORIGIN):
            continue
        checked += 1
        if not any(c.is_file() for c in local_paths(url, base, mode)):
            problems.append(f"Missing og/twitter image: {url}")

    label = "source" if mode == "source" else "dist"
    if problems:
        print(f"PREFLIGHT FAIL ({label}, {html_path})")
        for p in problems:
            print(" -", p)
        return 1
    print(
        f"Preflight OK ({label}): {len(collector.ids)} IDs, {len(schemas)} JSON-LD block(s), "
        f"{checked} local refs resolved."
    )
    return 0


def main() -> int:
    if "--help" in sys.argv:
        print(__doc__)
        return 0
    if "--dist" in sys.argv:
        dist_html = ROOT / "dist" / "index.html"
        if not dist_html.is_file():
            print("dist/index.html not found — run the build first (sh deploy-surge.sh).")
            return 1
        return audit(dist_html, ROOT / "dist", "dist")
    return audit(ROOT / "index.html", ROOT, "source")


if __name__ == "__main__":
    sys.exit(main())
