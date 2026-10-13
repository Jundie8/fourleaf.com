/* Four Leaf: the playful layer. Every page works without this file, and it
   makes no network requests. It adds: the lucky patch (find the four-leaf
   clover), the Greenlit diet demo, and a few small touches. */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const LEAF = 'M0 0C-2-4-14-12-14-22C-14-29-9-33-5-33C-2-33 0-31 0-28C0-31 2-33 5-33C9-33 14-29 14-22C14-12 2-4 0 0Z';
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const pick = list => list[Math.floor(Math.random() * list.length)];

  /* A handful of leaves thrown from a point. Skipped when motion is reduced. */
  function burst(x, y) {
    if (calm()) return;
    const colours = ['var(--green)', 'var(--ask)', 'var(--green-deep)'];
    const n = 18;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = 'spark';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.background = colours[i % colours.length];
      document.body.appendChild(el);
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const dist = 50 + Math.random() * 90;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 30;
      el.animate(
        [
          { transform: 'translate(0, 0) rotate(0) scale(.4)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy + 100}px) rotate(${Math.random() * 540 - 270}deg) scale(1)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }
      ).onfinish = () => el.remove();
    }
  }

  /* ---- the lucky patch -------------------------------------------------- */
  function clover(leaves) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-40 -40 80 80');
    svg.setAttribute('aria-hidden', 'true');
    const turn = Math.random() * 360;
    for (let i = 0; i < leaves; i++) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', LEAF);
      p.setAttribute('transform', `rotate(${turn + (360 / leaves) * i}) translate(0 -1) scale(1.05)`);
      svg.appendChild(p);
    }
    svg.style.width = svg.style.height = 66 + Math.random() * 14 + '%';
    return svg;
  }

  function patch(root) {
    const N = 21;
    const COLS = 7;
    const grid = $('.patch-grid', root);
    const msg = $('.patch-msg', root);
    const again = $('.patch-again', root);
    const home = $('.patch-home', root);
    const nope = ['Just three leaves.', 'Not that one.', 'So close. Not quite.', 'Keep looking.', 'Three leaves. Try again.'];
    let target, tries, done;

    function play() {
      grid.replaceChildren();
      grid.classList.remove('done');
      target = Math.floor(Math.random() * N);
      tries = 0;
      done = false;
      msg.textContent = '';
      again.hidden = true;
      if (home) home.hidden = true;
      for (let i = 0; i < N; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.tabIndex = i ? -1 : 0; // one tab stop; arrow keys move around the patch
        b.setAttribute('aria-label', `Clover ${i + 1} of ${N}`);
        b.appendChild(clover(i === target ? 4 : 3));
        grid.appendChild(b);
      }
    }

    grid.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || done) return;
      tries++;
      if (b === grid.children[target]) {
        done = true;
        b.classList.add('found');
        b.setAttribute('aria-label', 'The four-leaf clover');
        grid.classList.add('done');
        const r = b.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
        msg.textContent = tries === 1 ? 'First try. Absurdly lucky.' : `Found it in ${tries} tries. Lucky you.`;
        again.hidden = false;
        if (home) home.hidden = false;
      } else {
        b.classList.add('miss');
        b.setAttribute('aria-label', `Clover ${[...grid.children].indexOf(b) + 1}, three leaves`);
        msg.textContent = pick(nope);
      }
    });

    grid.addEventListener('keydown', e => {
      const items = [...grid.children];
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }[e.key];
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? N - 1 : step === undefined ? -1 : Math.min(N - 1, Math.max(0, i + step));
      if (j < 0) return;
      e.preventDefault();
      items[i].tabIndex = -1;
      items[j].tabIndex = 0;
      items[j].focus();
    });

    again.addEventListener('click', () => { play(); grid.children[0].focus({ preventScroll: true }); });
    play();
  }

  /* ---- the Greenlit demo: tap a diet, watch the menu re-sort -------------- */
  function demo(root) {
    // The same three outcomes the app uses. An ingredient the kitchen can leave
    // out (data-hold) makes a dish "ask first"; one the dish is built on makes it "skip".
    const FORBID = { vegan: ['meat', 'fish', 'dairy', 'egg'], gf: ['gluten'], nuts: ['nuts'], mush: ['mushroom'] };
    const LABEL = { go: 'Greenlit', ask: 'Ask first', stop: 'Skip' };
    const RANK = { go: 0, ask: 1, stop: 2 };
    const chips = $$('[data-diet]', root);
    const list = $('.dishes', root);
    const rows = $$('li', list); // original menu order, never reassigned
    const status = $('.demo-status', root);

    function sort(animate) {
      const forbid = new Set(chips.filter(c => c.getAttribute('aria-pressed') === 'true').flatMap(c => FORBID[c.dataset.diet]));
      const count = { go: 0, ask: 0, stop: 0 };
      rows.forEach(li => {
        const ings = $$('[data-t]', li);
        const hits = ings.filter(i => i.dataset.t.split(' ').some(t => forbid.has(t)));
        ings.forEach(i => i.classList.toggle('hit', hits.includes(i)));
        const state = !hits.length ? 'go' : hits.every(i => i.hasAttribute('data-hold')) ? 'ask' : 'stop';
        li.dataset.state = state;
        $('.tag', li).textContent = LABEL[state];
        count[state]++;
      });

      const before = new Map(rows.map(li => [li, li.getBoundingClientRect().top]));
      [...rows]
        .sort((a, b) => RANK[a.dataset.state] - RANK[b.dataset.state] || rows.indexOf(a) - rows.indexOf(b))
        .forEach(li => list.appendChild(li));
      if (animate && !calm()) {
        rows.forEach(li => {
          const dy = before.get(li) - li.getBoundingClientRect().top;
          if (dy) li.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.34,1.3,.64,1)' });
        });
      }
      status.textContent = `${count.go} greenlit, ${count.ask} ask first, ${count.stop} skip.`;
    }

    chips.forEach(c => c.addEventListener('click', () => {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      sort(true);
    }));
    sort(false);
  }

  /* ---- small touches ----------------------------------------------------- */
  // A link to #some-question opens that FAQ item.
  function openFromHash() {
    const el = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el && el.tagName === 'DETAILS') el.open = true;
  }
  addEventListener('hashchange', openFromHash);
  // Printed pages should show every answer.
  addEventListener('beforeprint', () => $$('details').forEach(d => (d.open = true)));

  $$('[data-patch]').forEach(patch);
  $$('[data-demo]').forEach(demo);
  openFromHash();

  console.log('%c Four Leaf %c small apps, made with care. Found a bug? support@tryfourleaf.com', 'background:#047857;color:#fff;border-radius:6px;padding:2px 6px;font-weight:700', '');
})();
