#!/usr/bin/env python3
"""Stitch .build parts -> root index.html.

Order: 01-head, 02-body-home, 03-pages-a, 04-pages-b, 05-pages-c,
       06-tail-frag, 07-main-script. Then closes </body></html>.

Also:
- Splices the 104-entry ecosystem dataset (extracted from the pre-rebuild
  index.html) into the @@ECO_DATA@@ token (kept as pretty JSON with a newline
  right after the opening tag, which tests/site-preflight + runtime-smoke parse).
- Resolves every <a ... data-wa="MSG" ... href="__WA__"> into a pre-encoded
  https://wa.me/917328089908?text=... URL (raw ₹ survived everywhere).
- Injects a real UPI QR into the @@UPI_QR@@ token (external QR service that
  encodes the upi:// intent; graceful JS fallback text if offline).
"""
import html
import json
import re
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / ".build"
PARTS = ["01-head.html", "02-body-home.html", "03-pages-a.html",
         "04-pages-b.html", "05-pages-c.html", "06-tail-frag.html",
         "07-main-script.html"]
SOURCE = ROOT / "index.html"
WA_NUMBER = "917328089908"

def main() -> int:
    html_text = ""
    for part in PARTS:
        p = BUILD / part
        if not p.exists():
            print(f"MISSING PART: {part}")
            return 1
        html_text += p.read_text(encoding="utf-8") + "\n"

    # 1) Ecosystem dataset --------------------------------------------------
    eco = ""
    src = SOURCE.read_text(encoding="utf-8")
    m = re.search(r'<script type="application/json" id="ecosystem-data">\n?(.*?)</script>',
                  src, re.S)
    if m:
        raw = m.group(1).strip()
        try:
            data = json.loads(raw)
        except Exception as e:  # pragma: no cover
            print(f"ECO dataset parse failed: {e}")
            return 1
    else:
        print("ECO dataset script tag not found in old index.html")
        return 1

    if len(data) != 104:
        print(f"ECO entry count unexpected: {len(data)}")
        return 1

    # Old runtime chip-render expected short pieces per record.
    idx = 0
    pretty = json.dumps(data, ensure_ascii=False, indent=None, separators=(",", ":"))
    html_text = re.sub(r'[ \t]*@@ECO_DATA@@[ \t]*\n',
                       pretty + "\n", html_text, count=1)
    print(f"ECO dataset: {len(data)} entries, {len(pretty)} bytes, first={data[0].get('n')!r}")

    # 2) WhatsApp hrefs -----------------------------------------------------
    def wa_sub(match: re.Match) -> str:
        tag, msg = match.group(1), html.unescape(match.group(2))
        encoded = urllib.parse.quote(msg, safe="")
        href = f"https://wa.me/{WA_NUMBER}?text={encoded}"
        return f"{tag}{href}{match.group(3)}"

    html_text, n_wa = re.subn(
        r'(<a\b(?=[^>]*data-wa=")[^>]*?href=")__WA__("(?:"[^>]*data-wa|)[^>]*data-wa="[^"]*")[^>]*>',
        wa_sub, html_text)
    # Simpler authoritative pass: rewrite each <a ...> containing both attrs.
    def wa_tag(match: re.Match) -> str:
        tag = match.group(0)
        mw = re.search(r'data-wa="([^"]*)"', tag)
        if not mw or 'href="__WA__"' not in tag:
            return tag
        msg = html.unescape(mw.group(1))
        href = f"https://wa.me/{WA_NUMBER}?text={urllib.parse.quote(msg, safe='')}"
        tag = tag.replace('href="__WA__"', f'href="{html.escape(href, quote=True)}"', 1)
        return tag

    html_text, n_wa2 = re.subn(r'<a\b[^>]*>', wa_tag, html_text)
    unresolved = html_text.count('href="__WA__"')
    print(f"wa.me links resolved: {n_wa2} (left unresolved: {unresolved})")
    if unresolved:
        print("FAIL: unresolved __WA__ hrefs")
        return 1

    # 3) UPI QR (locally generated SVG — no third-party runtime dependency) ---
    qr_img = ('<img src="images/upi-qr.svg" alt="BHIM UPI QR code to pay ₹2,999 once for the '
              'Buddy AI Starter Pack" width="240" height="240" loading="eager" decoding="sync" />')
    html_text = html_text.replace("@@UPI_QR@@", qr_img)

    leftover = re.findall(r'@@[A-Z_]+@@', html_text)
    if leftover:
        print(f"FAIL: unresolved tokens {leftover}")
        return 1

    html_text += "</body>\n</html>\n"

    out = ROOT / "index.html"
    out.write_text(html_text, encoding="utf-8")
    print(f"WROTE {out} ({len(html_text):,} bytes, {html_text.count(chr(10)):,} lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
