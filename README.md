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

### Profiles
Guests can order without one. A profile is optional and lives **only in that visitor's browser**
(`localStorage['nm-profile']`) — no password, nothing sent to a server. It fills in name/phone/email,
preselects their usual drink, adds a standing kitchen note, keeps favourite dishes at the top of the
menu, and lists their last 10 orders with "Order again". Guests leave nothing stored but the cart.
Signing in on another device, or anything the restaurant should be able to see (customer list,
loyalty points), needs real accounts on a backend — the same one that will handle payment.

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

## The app (iPhone and Android)
The app is the same site running in "app mode": when it is opened from the home screen or inside
the iOS shell, `<html>` gets the class `is-app` and `js/app.js` adds a bottom tab bar
(Home · Order · Visit · Profile). Styles are at the end of `css/style.css`. There is one codebase —
change the site and the app changes with it.

**1. Home-screen app (works today, no App Store).** On an iPhone open nomadmanti.com in Safari →
Share → *Add to Home Screen*. It gets the icon in `assets/app/`, opens full-screen, and `sw.js` keeps
the last-seen pages available offline (network first, so new deploys show up immediately).
`manifest.webmanifest` holds the name, colours and icons.

**2. App Store app (`app/`).** A [Capacitor](https://capacitorjs.com) project that bundles the site
into a native iOS app (`com.nomadmanti.app`, iOS 16+, portrait). The Xcode project in `app/ios/`
was generated on Linux and has **never been built** — that needs a Mac:

```bash
cd app
npm install
npm run ios        # copies the site into app/www, syncs it into the Xcode project, opens Xcode
```
Needs Node 20+, Xcode and CocoaPods (`sudo gem install cocoapods`). In Xcode pick your team under
*Signing & Capabilities*, then run on a simulator or phone. Re-run `npm run sync` after every change
to the site — the app carries its own copy, it does not load nomadmanti.com.

**3. Android app (`app/android/`).** The same Capacitor project, Android side (`com.nomadmanti.app`,
Android 6+, portrait, dark system bars, adaptive icon). Also **never built** — this machine has Java
but no Android SDK. It can be built on Linux, Windows or Mac:

```bash
cd app
npm install
npm run android    # syncs the site, opens the project in Android Studio
npm run apk        # or: debug APK at android/app/build/outputs/apk/debug/app-debug.apk
```
Needs Node 20+, JDK 21 and the Android SDK (installing Android Studio is the simple way; for
`npm run apk` without it, set `ANDROID_HOME`). The debug APK can be installed straight onto a phone
for testing. Google Play needs a developer account ($25 once), a signed release bundle
(Android Studio → Build → Generate Signed App Bundle — keep the keystore safe, it can't be replaced),
a privacy policy URL, and for new personal accounts a closed test with 12 testers for 14 days.
On Android the site can also be installed without any store: Chrome → menu → *Add to Home screen*.

Before submitting to the App Store:
- an Apple Developer account ($99/year); change the bundle id in `app/capacitor.config.json` and Xcode if needed;
- test on a real iPhone: the call / text / maps / Instagram links, the "Text my order" hand-off, the notch and home-bar spacing;
- Apple can reject apps that are only a wrapped website (guideline 4.2). Ordering, profiles and offline
  support help; push notifications for "order ready" would help more;
- once payments are on, the hosted checkout must return into the app (an in-app browser or universal
  links) — `returnUrls` currently points at the app's internal address, which a payment page can't open.
