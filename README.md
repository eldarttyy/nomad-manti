# Nomad Manti — website

Static site for Nomad Manti (800 NE 65th St, Seattle). No build step.

```bash
python3 -m http.server 8642     # then open http://localhost:8642
```
(ES modules need a server; opening index.html from disk won't load the 3D section.)

## Structure
| Path | What |
|---|---|
| `index.html` | All sections: intro, hero video, story, pillars, 3D signature dishes, menu, gallery, reviews, visit, footer |
| `css/style.css` | Design tokens at the top (shyrdak red, saffron, lapis, felt cream) |
| `js/main.js` | Smooth scroll (Lenis), GSAP scroll animations, menu tabs, drawer, intro |
| `js/menu-data.js` | **The menu — edit prices/items here** (taken from the Instagram "Menu" highlight, Oct 2026) |
| `js/dishes3d.js` | three.js scene with 4 procedural dishes: manti, plov, boso lagman, shashlik |
| `assets/photos/` | Customer photos from Google Maps |
| `assets/video/hero.*` | Instagram reel (Kyrgyz Tien Shan), rotated to landscape 1920×1080, audio removed |
| `assets/source/` | Original downloaded reel (not served by the page) |

## Swapping in Blender models
Export each dish as **glTF Binary (.glb)** and save it as:

```
assets/models/manti.glb
assets/models/plov.glb
assets/models/lagman.glb
assets/models/shashlik.glb
```
The site loads a .glb automatically if it exists, otherwise it falls back to the procedural model.

Export tips:
- Include the plate/bowl in the model; origin at the bottom-centre of the plate.
- Scale doesn't matter — it's auto-fitted. Keep the default +Y Up.
- Apply modifiers; bake procedural materials to Principled BSDF image textures (2K max, JPG/WebP).
- Aim for < 5 MB per file. Draco mesh compression is supported.

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
