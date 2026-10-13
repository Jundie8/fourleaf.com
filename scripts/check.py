#!/usr/bin/env python3
"""Checks the site is internally consistent. Python 3 standard library only.

    python3 scripts/check.py

Run it before opening a PR; CI runs it too. It looks for:
  - broken markup (unbalanced tags, duplicate ids, aria references to nothing)
  - dead internal links and anchors, images without alt text
  - the basics every page needs (title, description, canonical, one h1, ordered headings)
  - stale asset hashes (you edited style.css/site.js/lucky.js but didn't run scripts/stamp.sh)
  - a Content-Security-Policy whose inline-script hash no longer matches the inline script
  - pages missing from sitemap.xml
"""
import base64
import hashlib
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
VOID = {'meta', 'link', 'img', 'br', 'hr', 'input', 'source'}
SVG_SHAPES = {'path', 'circle', 'use', 'rect', 'stop', 'ellipse', 'line', 'polygon', 'polyline'}
problems = []


def pages():
    for dirpath, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'scripts', '.github')]
        for name in files:
            if name.endswith('.html'):
                yield os.path.join(dirpath, name)


def local_file(url):
    url = url.split('#')[0].split('?')[0]
    if url.endswith('/'):
        url += 'index.html'
    path = os.path.join(ROOT, url.lstrip('/'))
    return path if os.path.isfile(path) else None


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.ids, self.refs, self.links, self.imgs = [], [], [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.append(a['id'])
        for key in ('aria-describedby', 'aria-labelledby', 'aria-controls'):
            if key in a:
                self.refs += a[key].split()
        if tag in ('a', 'link') and 'href' in a:
            self.links.append(a['href'])
        if tag == 'script' and 'src' in a:
            self.links.append(a['src'])
        if tag == 'img':
            self.imgs.append(a)
        if tag not in VOID and tag not in SVG_SHAPES:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID and tag not in SVG_SHAPES and self.stack and self.stack[-1] == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in VOID or tag in SVG_SHAPES:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            problems.append(f'{self.name}: unexpected </{tag}> (open: {self.stack[-1] if self.stack else None})')
            if tag in self.stack:
                while self.stack and self.stack.pop() != tag:
                    pass


def short_hash(name):
    with open(os.path.join(ROOT, name), 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:8]


asset_hash = {'/style.css': short_hash('style.css'), '/site.js': short_hash('site.js'), '/lucky.js': short_hash('lucky.js')}
all_pages = sorted(pages())

for path in all_pages:
    rel = os.path.relpath(path, ROOT)
    src = open(path, encoding='utf-8').read()
    p = Page()
    p.name = rel
    p.feed(src)

    if p.stack:
        problems.append(f'{rel}: unclosed {p.stack}')
    dupes = {i for i in p.ids if p.ids.count(i) > 1}
    if dupes:
        problems.append(f'{rel}: duplicate ids {sorted(dupes)}')
    for ref in p.refs:
        if ref not in p.ids:
            problems.append(f'{rel}: aria reference to missing id "{ref}"')

    for href in p.links:
        if href.startswith(('http://', 'https://', 'mailto:', 'data:')):
            continue
        if href.startswith('#'):
            if href[1:] and href[1:] not in p.ids:
                problems.append(f'{rel}: dead anchor {href}')
            continue
        target = local_file(href)
        if not target:
            problems.append(f'{rel}: broken link {href}')
        elif '#' in href and target.endswith('.html'):
            frag = href.split('#')[1]
            if frag and not re.search(r'id="%s"' % re.escape(frag), open(target, encoding='utf-8').read()):
                problems.append(f'{rel}: dead anchor {href}')

    for img in p.imgs:
        if 'alt' not in img:
            problems.append(f'{rel}: image without alt text ({img.get("src")})')

    heads = [int(x) for x in re.findall(r'<h([1-6])[ >]', src)]
    if heads.count(1) != 1:
        problems.append(f'{rel}: {heads.count(1)} h1 elements (want exactly one)')
    for a, b in zip(heads, heads[1:]):
        if b - a > 1:
            problems.append(f'{rel}: heading level jumps h{a} -> h{b}')

    is_404 = rel == '404.html'
    needs = ['<title>', 'lang="en"', 'name="viewport"', 'Content-Security-Policy']
    needs += ['name="robots"'] if is_404 else ['name="description"', 'rel="canonical"']
    for need in needs:
        if need not in src:
            problems.append(f'{rel}: missing {need}')

    # asset links must carry the current content hash
    for url, want in asset_hash.items():
        for m in re.finditer(re.escape(url) + r'(\?v=([A-Za-z0-9]+))?"', src):
            if m.group(2) != want:
                problems.append(f'{rel}: {url} has v={m.group(2)}, expected v={want} (run scripts/stamp.sh)')

    # the CSP allows exactly one inline script, by hash
    inline = re.search(r"<script>(.*?)</script>", src, re.S)
    csp = re.search(r"script-src[^;]*'sha256-([^']+)'", src)
    if inline and csp:
        digest = base64.b64encode(hashlib.sha256(inline.group(1).encode()).digest()).decode()
        if digest != csp.group(1):
            problems.append(f'{rel}: the inline script changed; update its sha256 in the Content-Security-Policy to {digest}')
    elif inline and not csp:
        problems.append(f'{rel}: inline script without a hash in the Content-Security-Policy')

# every public page should be listed in the sitemap (not the 404)
sitemap = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
for path in all_pages:
    rel = os.path.relpath(path, ROOT)
    if rel == '404.html':
        continue
    url = '/' + rel[:-len('index.html')] if rel.endswith('index.html') else '/' + rel
    if f'https://tryfourleaf.com{url}<' not in sitemap:
        problems.append(f'sitemap.xml: missing https://tryfourleaf.com{url}')

print(f'{len(all_pages)} pages checked')
if problems:
    print('\n'.join(problems))
    sys.exit(1)
print('no problems found')
