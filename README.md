# Elkan Tong · Portfolio

Personal portfolio of Elkan Tong — Information Systems student at SMU building full-stack products.

Hand-built static site: plain HTML, CSS and JavaScript (ES modules). No frameworks, no build step, no trackers, no third-party requests at runtime.

## Run locally

ES modules need to be served over HTTP (opening `index.html` directly won't load the scripts):

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Structure

```
index.html        page markup (all sections)
css/style.css     all styles
js/boot.js        runs before paint: intro gating + failsafe
js/main.js        interactions: nav, reveals, counters, skills keyboard, contact
js/motion.js      scroll-driven motion (headlines, rails, parallax)
js/builders.js    builder cursors that build every element (canvas overlay)
js/typer.js       types text into its frame during a build
js/icons.js       generated brand icon paths (Simple Icons, CC0)
assets/fonts/     self-hosted Anton + Inter (OFL)
docs/             project documentation (start at CLAUDE.md)
```

## Deploy

TBD.

## Credits

Brand icons: [Simple Icons](https://simpleicons.org) (CC0). Fonts: Anton and Inter (SIL Open Font License).
