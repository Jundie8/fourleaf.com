#!/bin/sh
# Run this after editing style.css, site.js or lucky.js.
# It rewrites the ?v=<hash> on those links in every page, so a changed file always gets a fresh URL
# and new HTML never meets stale cached CSS or JS (the host caches files for up to 10 minutes).
set -e
cd "$(dirname "$0")/.."
hash() { shasum -a 256 "$1" | cut -c1-8; }
css=$(hash style.css); js=$(hash site.js); lk=$(hash lucky.js)
find . -name '*.html' -not -path './.git/*' | while read -r f; do
  sed -E -i.bak "s#/style\.css(\?v=[A-Za-z0-9]+)?\"#/style.css?v=$css\"#; s#/site\.js(\?v=[A-Za-z0-9]+)?\"#/site.js?v=$js\"#; s#/lucky\.js(\?v=[A-Za-z0-9]+)?\"#/lucky.js?v=$lk\"#" "$f"
  rm -f "$f.bak"
done
echo "style.css?v=$css  site.js?v=$js  lucky.js?v=$lk"
