# tryfourleaf.com

The Four Leaf site: a home page, the Greenlit app pages (about, support, privacy, terms) and a small
game. Plain HTML, one stylesheet and two optional scripts. No framework, no build step, no
third-party requests. Merging to `main` deploys it (GitHub Pages, `CNAME` = tryfourleaf.com).

## Look at it

    python3 -m http.server 8000

then open <http://localhost:8000>. Pages use root-relative URLs, so serve the repo root.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | Home: the clover, the Greenlit card, the lucky patch |
| `greenlit/` | Greenlit's pages: `index.html`, `support/`, `privacy/`, `terms/` |
| `lucky/` | The lucky meadow game (Endless and Daily) |
| `404.html` | Not-found page, which doubles as a clover hunt |
| `style.css` | Every style, light and dark, tokens at the top |
| `site.js` | Optional behaviour: clover, demo, theme switch, legal-page index, small touches |
| `lucky.js` | The game. Only `/lucky/` loads it |
| `scripts/` | `stamp.sh` and `check.py` (below) |

## Ground rules

- **Nothing from elsewhere.** System fonts, no analytics, no CDN. Each page carries a
  Content-Security-Policy that makes the browser enforce this.
- **Works without JavaScript.** `site.js` only adds the playful layer. The clover's leaf picker and
  the Greenlit demo's default state are plain HTML and CSS.
- **Motion respects `prefers-reduced-motion`.** Animations, confetti and haptics all switch off.
- **The privacy and terms text is legal copy.** Change layout freely; change wording on purpose.

## Before you commit

    sh scripts/stamp.sh     # after editing style.css, site.js or lucky.js
    python3 scripts/check.py

`stamp.sh` puts a content hash on the CSS and JS links (`/style.css?v=…`). GitHub Pages caches each
file for up to ten minutes, so without a fresh URL a visitor could get new HTML with old CSS.
`check.py` finds broken markup, dead links and anchors, stale hashes, and a Content-Security-Policy
whose inline-script hash no longer matches. CI runs it on every push and pull request.

If you edit the small inline script in each page's `<head>`, update its `sha256-…` in that page's
Content-Security-Policy (the check prints the new value).

## What the site keeps in your browser

Only on your own device, never sent anywhere:

| Key | Holds |
| --- | --- |
| `fl-theme` | Auto / Light / Dark choice |
| `fl-lucky`, `fl-daily` | Game best round, fastest find, and the daily result and streak |
| `fl-lucky-sr` | The game's screen reader mode |

## Small secrets

Type `luck` on any page.
