#!/data/data/com.termux/files/usr/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DIST="$ROOT/dist"
DOMAIN="buddy-ai-partners.surge.sh"
SURGE_BIN="$(command -v surge || true)"

echo "BUDDY AI PARTNERS — validate and build"
test -f "$ROOT/index.html" || { echo "ERROR: index.html is missing."; exit 1; }
test -f "$ROOT/public/images/founder-rahul.png" || {
  echo "ERROR: founder image missing at public/images/founder-rahul.png; refusing to build/deploy."
  exit 1
}
test -f "$ROOT/public/images/logo.svg" || {
  echo "ERROR: logo missing at public/images/logo.svg; refusing to build/deploy."
  exit 1
}
test -f "$ROOT/public/images/og-cover.jpg" || {
  echo "ERROR: social preview image missing at public/images/og-cover.jpg; refusing to build/deploy."
  exit 1
}

# Validate HTML IDs, local image paths and structured data before creating dist.
python3 - "$ROOT/index.html" "$ROOT" <<'PY'
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

html_path = Path(sys.argv[1])
root = Path(sys.argv[2])
html = html_path.read_text(encoding="utf-8")

class Check(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.images = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"): self.ids.append(a["id"])
        if tag.lower() == "img" and a.get("src"): self.images.append(a["src"])

check = Check()
check.feed(html)
dupes = sorted({x for x in check.ids if check.ids.count(x) > 1})
missing = []
for src in check.images:
    if src.startswith(("https://", "http://", "data:")): continue
    if not (root / src.lstrip("/")).is_file(): missing.append(src)
schemas = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
bad_schemas = []
for i, payload in enumerate(schemas, 1):
    try: json.loads(payload)
    except json.JSONDecodeError as exc: bad_schemas.append(f"schema {i}: {exc}")
if 'rel="canonical"' not in html and "rel='canonical'" not in html:
    raise SystemExit("Canonical link missing.")
if not schemas: raise SystemExit("No JSON-LD schema blocks found.")
if dupes: raise SystemExit("Duplicate HTML IDs: " + ", ".join(dupes))
if missing: raise SystemExit("Missing local images: " + ", ".join(missing))
if bad_schemas: raise SystemExit("Invalid JSON-LD: " + "; ".join(bad_schemas))
print(f"Preflight OK: {len(check.ids)} IDs, {len(schemas)} valid JSON-LD block(s), local images present.")
PY

# dist is generated output. Rebuild it from source files only.
rm -rf "$DIST"
mkdir -p "$DIST/public/images"
cp "$ROOT/index.html" "$DIST/index.html"
cp -r "$ROOT/public/images/." "$DIST/public/images/"
[ ! -f "$ROOT/robots.txt" ] || cp "$ROOT/robots.txt" "$DIST/robots.txt"
[ ! -f "$ROOT/sitemap.xml" ] || cp "$ROOT/sitemap.xml" "$DIST/sitemap.xml"
[ ! -f "$ROOT/llms.txt" ] || cp "$ROOT/llms.txt" "$DIST/llms.txt"

echo ""
echo "Build complete:"
find "$DIST" -maxdepth 4 -type f -print
echo ""
echo "Local preview:"
echo "  python -m http.server 8765 --bind 127.0.0.1 --directory dist"
echo ""
echo "Production has NOT been changed."
echo "After testing, deploy explicitly with: sh deploy-surge.sh --production"

if [ "${1:-}" != "--production" ]; then exit 0; fi
test -n "$SURGE_BIN" || { echo "ERROR: Surge CLI not found. Install it with: npm install -g surge"; exit 1; }
echo "Publishing to $DOMAIN ..."
node "$SURGE_BIN" "$DIST" "$DOMAIN"
echo "Surge command completed. Verify the live site in Chrome before announcing the release."
