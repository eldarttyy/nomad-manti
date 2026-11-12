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
| `order.html`, `css/order.css`, `js/order.js` | **Online ordering page** — menu, cart, pickup details (see "Online ordering" below) |
| `js/site-config.js` | Outbound links and the `ORDER` settings (payment endpoint, tax, hours, prep time) |
| `js/menu-data.js` | **The menu — edit prices/items here** (taken from the Instagram "Menu" highlight, Oct 2026) |
| `assets/photos/` | Customer photos from Google Maps |
| `assets/video/hero-v3*` | Instagram reel (Kyrgyz Tien Shan), rotated to landscape, ping-pong loop: 1920×1080 desktop, native 608×1080 portrait cut for phones, audio removed |
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

## Online ordering (`order.html`)
Pickup only, same-day. The page builds the menu from `js/menu-data.js`, keeps the cart in the
visitor's browser, and hands the order off according to `ORDER` in `js/site-config.js`:

| `ORDER.endpoint` | `ORDER.sms` | What the checkout button does |
|---|---|---|
| `null` (now) | a phone number | **Text my order** — opens the guest's messages app with the order written out, addressed to that number. Pay at pickup. Phones only; nothing is recorded anywhere else, so someone has to watch that phone. |
| `null` | `null` | Shows a "call to order" button only. |
| a URL | anything | **Continue to payment** — sends the order to your backend, which answers with the payment page to open. Tips and the email field appear in this mode. |

Other settings there: `taxRate` (confirm the current Seattle rate), `tips`, `open` / `lastPickup`,
`prepMinutes`, `slotMinutes`, `weekendDays` (when the "Fri & Sat only" dishes can be ordered).
Times always follow the restaurant's clock (`timezone`), not the visitor's.

### Connecting payment
A static site can't take card payments by itself — the secret key has to live on a small backend
(a Cloudflare Worker, Vercel/Netlify function, etc.) that creates a hosted checkout with Stripe,
Square or whatever the restaurant uses. Put that backend's URL in `ORDER.endpoint`.

The page sends `POST <endpoint>` with `Content-Type: application/json`:
```json
{
  "version": 1,
  "createdAt": "2026-11-12T03:37:51.600Z",
  "lang": "en",
  "items": [
    { "id": "boso-lagman", "name": "Boso Lagman", "qty": 1, "unitPrice": 2299, "options": { "drink": "Black tea" } }
  ],
  "amounts": { "currency": "usd", "taxRate": 0.1035, "tipPercent": 15, "subtotal": 2299, "tax": 238, "tip": 345, "total": 2882 },
  "pickup": { "type": "scheduled", "date": "2026-11-11", "time": "20:30", "timezone": "America/Los_Angeles" },
  "customer": { "name": "…", "phone": "…", "email": "" },
  "notes": "",
  "returnUrls": { "success": "https://www.nomadmanti.com/order.html?status=success", "cancel": "https://www.nomadmanti.com/order.html?status=cancelled" }
}
```
Money is in cents; `pickup.type` is `asap` or `scheduled`.

The backend answers `200` with JSON, either
- `{ "checkoutUrl": "https://…", "orderId": "NM-1042" }` — the page redirects there (https only). After
  payment, send the guest to `returnUrls.success` (add `&order=NM-1042` to show the number) or to
  `returnUrls.cancel` if they back out; or
- `{ "orderId": "NM-1042" }` with no `checkoutUrl` — the page shows the confirmation straight away.

Any other status shows "couldn't send your order — call us" and keeps the cart.

The backend must:
- **recompute prices, tax and total from the item `id`s and its own price list** — everything in
  `amounts` and `unitPrice` comes from the browser and can be edited by anyone;
- allow CORS from `https://www.nomadmanti.com` (`POST` + the `Content-Type` header, and the `OPTIONS` preflight);
- tell the kitchen (email / SMS / POS ticket) only after the payment provider confirms payment
  (its webhook), not when the guest lands on the success URL — that URL is just a thank-you page;
- re-check opening hours and the pickup time.
