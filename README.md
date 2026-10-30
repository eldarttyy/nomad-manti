# Nomad Manti — website

Static site for Nomad Manti (800 NE 65th St, Seattle). No build step.

```bash
python3 -m http.server 8642     # then open http://localhost:8642
```
(ES modules need a server; opening index.html from disk won't load the menu.)

## Structure
| Path | What |
|---|---|
| `index.html` | All sections: intro, hero video, story, pillars, menu, gallery, reviews, visit, footer |
| `css/style.css` | Design tokens at the top (shyrdak red, saffron, lapis, felt cream) |
| `js/main.js` | Smooth scroll (Lenis), GSAP scroll animations, menu tabs, drawer, intro |
| `js/i18n.js` | Language detection + switching (picker in the header) |
| `js/translations.js` | **Page text per language** — keys match `data-i18n` in index.html |
| `js/menu-translations.js` | **Menu/branch text per language**, keyed by the original wording in the data files |
| `js/menu-data.js` | **The menu — edit prices/items here** (taken from the Instagram "Menu" highlight, Oct 2026) |
| `assets/photos/` | Customer photos from Google Maps |
| `assets/video/hero.*` | Instagram reel (Kyrgyz Tien Shan), rotated to landscape 1920×1080, audio removed |
| `assets/source/` | Original downloaded reel (not served by the page) |

## Languages
English (source), Russian, Kyrgyz, Spanish. On the first visit the site follows the browser's language, falls back to English,
and remembers whatever the visitor picks in the header (`localStorage['nm-lang']`). `?lang=xx` in the URL
forces a language (handy for sharing). When you edit text:
- in `index.html` → change the same key in `js/translations.js` for the other languages;
- in `menu-data.js` → also rename the matching key in `js/menu-translations.js`
  (untranslated items just show in English).
Translations are machine-written — have a native speaker check the Kyrgyz before launch.

## Before launch — check with the owner
- Phone: Instagram bio says **(425) 518-6966**; Google Maps lists (773) 458-8407. The site uses the Instagram number.
- Rights to the hero reel footage and the customer photos (or replace with the restaurant's own shots).
- Google Maps calls it a "Kazakhstani restaurant" and the menu is pan-Central Asian; copy leans Kyrgyz per the owner's posts (🇰🇬).

## Reviews & QR codes
- Review link (opens Google's "write a review" box):
  `https://search.google.com/local/writereview?placeid=ChIJS_91cwAVkFQRP54GlcYibS0`
- QR codes in `assets/qr/` (SVG, print at any size): `google-review.svg`, `google-maps.svg`, `website.svg`
- Printable table cards: open `/print/review-card.html` → print on Letter, landscape, 100%, background graphics on.
- Every star rating sends guests to Google. Don't filter unhappy guests to a private form instead —
  Google's policies forbid "review gating".

## Delivery (DoorDash / Uber Eats)
Once the restaurant is live on an app, paste its store URL into `js/site-config.js`
(`doordash:` / `ubereats:`). The matching button appears in the Visit section automatically.
