#!/bin/sh
# BUDDY AI PARTNERS — validate, build and (optionally) publish the static site.
# Usage:
#   sh deploy-surge.sh               build + validate only (safe, no network)
#   sh deploy-surge.sh --production  build + validate, then publish to Surge
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

# Preflight: HTML IDs, JSON-LD, canonical link, and every local asset reference
# resolved with the same path mapping the build uses.
python3 "$ROOT/tests/site-preflight.py"

# dist is generated output. Rebuild it from source files only.
rm -rf "$DIST"
mkdir -p "$DIST/images" "$DIST/public/images"
cp "$ROOT/index.html" "$DIST/index.html"
cp -r "$ROOT/public/images/." "$DIST/images/"
# Backward-compatible alias for previously published /public/images/... URLs.
cp -r "$ROOT/public/images/." "$DIST/public/images/"
[ ! -f "$ROOT/robots.txt" ] || cp "$ROOT/robots.txt" "$DIST/robots.txt"
[ ! -f "$ROOT/sitemap.xml" ] || cp "$ROOT/sitemap.xml" "$DIST/sitemap.xml"
[ ! -f "$ROOT/llms.txt" ] || cp "$ROOT/llms.txt" "$DIST/llms.txt"
[ ! -f "$ROOT/5b44e100446fef7d326fe15d85f5d157.txt" ] || cp "$ROOT/5b44e100446fef7d326fe15d85f5d157.txt" "$DIST/5b44e100446fef7d326fe15d85f5d157.txt"
[ ! -f "$ROOT/googleb8ea7c1bfd32f1e7.html" ] || cp "$ROOT/googleb8ea7c1bfd32f1e7.html" "$DIST/googleb8ea7c1bfd32f1e7.html"

# Post-build gate: every local URL in the built HTML must exist inside dist,
# so a silently broken local URL can never be published.
python3 "$ROOT/tests/site-preflight.py" --dist

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
