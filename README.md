# BUDDY AI PARTNERS

Premium public website for BUDDY AI PARTNERS — custom CRM workflows, AI-assisted automation, websites, and performance marketing.

## Run locally in Termux

Stop your current preview server with Ctrl+C, then run:

```sh
cd ~/buddy-ai-partners
git status --short
git fetch origin
git switch redesign/premium-conversion
git pull --ff-only origin redesign/premium-conversion
sh deploy-surge.sh
python -m http.server 8765 --bind 127.0.0.1 --directory dist
```

If the local branch does not exist yet, use `git switch --track origin/redesign/premium-conversion` instead of the `git switch redesign/premium-conversion` line. If `git status --short` shows edits you need, commit or back them up before switching branches.

Open http://127.0.0.1:8765/ on the same Android device. In Chrome, turn **Desktop site** off when testing mobile layout; with Desktop site enabled, Chrome requests a wider viewport and shrinks the page.

## Safe production deployment

The build script validates duplicate HTML IDs, local images and JSON-LD, then rebuilds dist. It never publishes by default. Test the generated dist folder first. After approval:

```sh
sh deploy-surge.sh --production
```

The script checks the founder portrait and copies robots.txt and sitemap.xml. The WhatsApp destination still needs the official business number configured in index.html before direct one-recipient routing can be guaranteed.

## Website notes

- Single-page static HTML using Tailwind CDN, inline CSS and JavaScript.
- The floating Buddy project guide is a local, rule-based chooser—not a live AI assistant or connected backend.
- The hero neural-core illustration and background particle network are client-side visuals.
- Lead calculator outputs use illustrative planning assumptions and are not performance guarantees.
- Portfolio labels distinguish operational workflows from agent/voice research prototypes.

## Before launch

Test mobile and desktop viewports, reduced-motion behavior, navigation destinations, carousel, calculator, contact form, Buddy project guide, social-share image and production URL. Search Console verification and indexing requests must be completed by the site owner; schema markup does not guarantee rankings.
