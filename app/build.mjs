// Copies the website (repo root) into app/www, which Capacitor bundles into the iOS app.
// Run through `npm run sync` after every change to the site.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(here, 'www');

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const entry of ['index.html', 'order.html', 'manifest.webmanifest', 'css', 'js', 'assets']) {
  cpSync(join(root, entry), join(out, entry), {
    recursive: true,
    // the original reel is not used by the pages and would only bloat the app
    filter: (src) => !src.includes(`${join('assets', 'source')}`) && !src.endsWith('.DS_Store'),
  });
}
console.log(`Site copied to ${out}`);
