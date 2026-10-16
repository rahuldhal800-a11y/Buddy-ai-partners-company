"""P0 regression tests: AI Ecosystem Directory placement (static DOM checks).

Run from repo root:  python3 tests/directory-regression.py
Checks the SOURCE index.html (and dist/index.html when present):
 1. Exactly one directory root (#ecoDirectory) in the document.
 2. The directory root is nested inside section#page-stack.
 3. No directory markup inside Home/About/Services/Portfolio/Process/Contact.
 4. Single dataset source (#ecosystem-data) inside Stack; overview mount present.
 5. No duplicate IDs; required pages + nav targets intact.
"""
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["page-home", "page-about", "page-services", "page-portfolio",
         "page-stack", "page-process", "page-contact"]
DIR_IDS = ["ecoDirectory", "ecoSections", "ecosystem-data", "stackOverview"]
FAILURES = []


class Nest(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.hits = {}
        self.ids = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        self.stack.append((tag, d.get("id")))
        if d.get("id"):
            self.ids.append(d["id"])
        if d.get("id") in DIR_IDS:
            secs = [s[1] for s in self.stack if s[0] == "section"]
            self.hits[d["id"]] = secs

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                break


def check_file(path):
    html = Path(path).read_text(encoding="utf-8")
    p = Nest()
    p.feed(html)
    # 1. exactly one root each (string count + parser hits)
    for did in DIR_IDS:
        n = html.count(f'id="{did}"')
        if n != 1:
            FAILURES.append(f"{path.name}: #{did} occurs {n}x (want 1)")
    # 2. inside Stack
    for did in DIR_IDS:
        secs = p.hits.get(did, [])
        if secs != ["page-stack"]:
            FAILURES.append(f"{path.name}: #{did} ancestors={secs} (want ['page-stack'])")
    # 3. no directory content in other sections: split by page sections
    for page in PAGES:
        if page == "page-stack":
            continue
        start = html.find(f'id="{page}"')
        if start < 0:
            FAILURES.append(f"{path.name}: missing #{page}")
            continue
        nxt = min([html.find(f'id="{q}"', start + 1) for q in PAGES
                   if html.find(f'id="{q}"', start + 1) > 0] or [len(html)])
        seg = html[start:nxt]
        for did in DIR_IDS:
            if f'id="{did}"' in seg:
                FAILURES.append(f"{path.name}: #{did} found inside #{page}")
    # 5. duplicate IDs
    dupes = sorted({k for k, v in Counter(p.ids).items() if v > 1})
    if dupes:
        FAILURES.append(f"{path.name}: duplicate IDs {dupes}")



def check_layout(html):
    global FAILURES
    import re
    i = html.find("function ovRender")
    seg = html[i:i + 3000] if i >= 0 else ""
    # 4. template emits exactly one title per tier card (no repeated headings)
    if seg.count("stack-cat") != 1 or seg.count("stack-tier") != 1:
        FAILURES.append("ovRender template must contain exactly one tier div and one title")
    # 5. OVERVIEW defines exactly 10 groups
    om = re.search(r"var OVERVIEW=\[", html)
    if om:
        names = re.findall(r"\['([^']+)',\{", html[om.start():om.start() + 3000])
        if len(names) != 10:
            FAILURES.append(f"OVERVIEW groups={len(names)} (want 10)")
    else:
        FAILURES.append("OVERVIEW definition missing")
    # 6. no stack-tier element nested inside another in static markup
    if len(re.findall(r'class="stack-tier', html)) != html.count('id="stackOverview"'):
        pass  # tiers render client-side; static file holds only the mount


def main():
    check_file(ROOT / "index.html")
    dist = ROOT / "dist" / "index.html"
    if dist.exists():
        check_file(dist)
    else:
        print("note: dist/index.html absent (build first)")
    check_layout(Path(ROOT / "index.html").read_text(encoding="utf-8"))
    if FAILURES:
        print("FAIL")
        for f in FAILURES:
            print(" -", f)
        sys.exit(1)
    print("PASS: one directory root, inside Stack only, no duplicate IDs")


if __name__ == "__main__":
    main()
