#!/data/data/com.termux/files/usr/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DIST="$ROOT/dist"
DOMAIN="buddy-ai-partners.surge.sh"
SURGE_BIN="$(command -v surge || true)"

echo "BUDDY AI PARTNERS — safe static build"
test -f "$ROOT/index.html" || { echo "ERROR: index.html is missing."; exit 1; }
test -f "$ROOT/public/images/founder-rahul.png" || {
  echo "ERROR: founder image missing at public/images/founder-rahul.png; refusing to deploy."
  exit 1
}

# dist is generated output. Rebuild it from tracked source files only.
rm -rf "$DIST"
mkdir -p "$DIST/public/images"
cp "$ROOT/index.html" "$DIST/index.html"
cp "$ROOT/public/images/founder-rahul.png" "$DIST/public/images/founder-rahul.png"
[ ! -f "$ROOT/robots.txt" ] || cp "$ROOT/robots.txt" "$DIST/robots.txt"
[ ! -f "$ROOT/sitemap.xml" ] || cp "$ROOT/sitemap.xml" "$DIST/sitemap.xml"

echo ""
echo "Build complete:"
find "$DIST" -maxdepth 4 -type f -print
echo ""
echo "Local preview:"
echo "  python -m http.server 8765 --bind 127.0.0.1 --directory dist"
echo ""
echo "Production has NOT been changed."
echo "After testing, deploy explicitly with: sh deploy-surge.sh --production"

if [ "${1:-}" != "--production" ]; then
  exit 0
fi

test -n "$SURGE_BIN" || { echo "ERROR: Surge CLI not found. Install it with: npm install -g surge"; exit 1; }
echo "Publishing to $DOMAIN ..."
node "$SURGE_BIN" "$DIST" "$DOMAIN"
echo "Surge command completed. Verify the live site in Chrome before announcing the release."
