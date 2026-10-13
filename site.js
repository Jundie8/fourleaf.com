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
  // Finding the lucky clover turns the tab icon gold until you play again.
  const icon = $('link[rel="icon"]');
  const iconHref = icon && icon.href;
  const goldIcon = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="${NS}" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#f59e0b"/><g fill="#fff8ec" transform="translate(50 50)">` +
    [0, 90, 180, 270].map(r => `<path d="${LEAF}" transform="rotate(${r}) translate(0 -3)"/>`).join('') + '</g></svg>');
  const lucky = on => { if (icon) icon.href = on ? goldIcon : iconHref; };

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
    const N = 18;
    const COLS = 6;
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
      lucky(false);
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
      if (!b || done || b.classList.contains('miss')) return;
      tries++;
      if (b === grid.children[target]) {
        done = true;
        b.classList.add('found');
        b.setAttribute('aria-label', 'The four-leaf clover');
        grid.classList.add('done');
        const r = b.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
        lucky(true);
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
    const rows = $$('li', list); // data-i is each dish's place on the menu; it breaks ties within a group
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
        .sort((a, b) => RANK[a.dataset.state] - RANK[b.dataset.state] || a.dataset.i - b.dataset.i)
        .forEach(li => list.appendChild(li));
      if (animate && !calm()) {
        rows.forEach(li => {
          const dy = before.get(li) - li.getBoundingClientRect().top;
          if (dy) li.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.34,1.3,.64,1)' });
        });
      }
      status.textContent = `${count.go} greenlit, ${count.ask} ask first, ${count.stop} skip.`;
    }

    // When the demo first scrolls into view, a scan line sweeps down the list and each
    // dish lights up with its verdict as it passes. Skipped when motion is reduced.
    let settle = () => {};
    if (!calm() && 'IntersectionObserver' in window) {
      const SWEEP = 1300;
      const dishes = [...list.children];
      let timers = [];
      list.classList.add('waiting');
      dishes.forEach(li => li.classList.add('pending'));
      settle = () => {
        timers.forEach(clearTimeout);
        timers = [];
        list.classList.remove('waiting', 'scanning');
        dishes.forEach(li => li.classList.remove('pending'));
      };
      new IntersectionObserver((entries, io) => {
        if (!entries.some(e => e.isIntersecting)) return;
        io.disconnect();
        list.classList.add('scanning');
        dishes.forEach((li, i) => timers.push(setTimeout(() => li.classList.remove('pending'), 150 + (SWEEP * (i + 0.5)) / dishes.length)));
        timers.push(setTimeout(settle, SWEEP + 400));
      }, { threshold: 0.4 }).observe(list);
    }

    chips.forEach(c => c.addEventListener('click', () => {
      settle(); // a tap during the sweep finishes it straight away
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      sort(true);
    }));
    sort(false);
  }

  /* ---- the hero clover leans toward your cursor --------------------------- */
  function lean(root) {
    if (!matchMedia('(pointer: fine)').matches) return;
    const box = $('.clover-box', root);
    const leaves = $$('.lg', root);
    let raf = 0, x = 0, y = 0;

    function apply() {
      raf = 0;
      const r = box.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height * 0.42);
      const reach = Math.max(0.25, 1 - Math.hypot(dx, dy) / 900); // nearer cursor, stronger lean
      const toward = Math.atan2(dx, -dy); // 0 = straight up, clockwise
      leaves.forEach((leaf, i) => {
        const a = Math.cos(toward - (i * Math.PI) / 2);
        leaf.style.setProperty('--lean', (-(Math.max(0, a) ** 2) * 6 * reach).toFixed(1) + 'px');
      });
    }
    const rest = () => leaves.forEach(l => l.style.removeProperty('--lean'));

    addEventListener('pointermove', e => {
      if (calm() || e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      raf ||= requestAnimationFrame(apply);
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', rest);
  }

  /* ---- a ladybug wanders the clover; poke it and it flies off --------------- */
  function ladybug(root) {
    if (calm()) return;
    const box = $('.clover-box', root);
    const bug = document.createElement('i');
    bug.className = 'bug';
    bug.setAttribute('aria-hidden', 'true');
    bug.innerHTML = '<svg viewBox="-10 -13 20 25"><path d="M-2-9L-4-12M2-9L4-12" stroke="#2b2622" stroke-width="1" stroke-linecap="round"/><circle cy="-8" r="3.4" fill="#2b2622"/><ellipse cy="2" rx="7.5" ry="9" fill="#dc2626"/><path d="M0-7V11" stroke="#2b2622" stroke-width="1"/><g fill="#2b2622"><circle cx="-3.6" cy="-1" r="1.5"/><circle cx="3.6" cy="-1" r="1.5"/><circle cx="-3.4" cy="5" r="1.3"/><circle cx="3.4" cy="5" r="1.3"/></g></svg>';

    const spots = [[60, 25], [90, 54], [60, 83], [30, 54]]; // the middle of each leaf, in the clover's 120-unit space
    const scale = () => box.clientWidth / 120;
    let x = 60, y = 134, heading = 0, last = -1, timer = 0, gone = false;

    function walkTo(nx, ny) {
      let a = (Math.atan2(nx - x, -(ny - y)) * 180) / Math.PI;
      a += 360 * Math.round((heading - a) / 360); // turn the short way round
      heading = a;
      bug.style.setProperty('--a', a + 'deg');
      bug.style.setProperty('--x', nx * scale() + 'px');
      bug.style.setProperty('--y', ny * scale() + 'px');
      bug.classList.add('walking');
      setTimeout(() => bug.classList.remove('walking'), 2600);
      x = nx;
      y = ny;
    }

    function wander() {
      if (gone) return;
      if (!document.hidden) {
        let i;
        do { i = Math.floor(Math.random() * spots.length); } while (i === last);
        last = i;
        walkTo(spots[i][0] + (Math.random() - 0.5) * 8, spots[i][1] + (Math.random() - 0.5) * 8);
      }
      timer = setTimeout(wander, 4200 + Math.random() * 3200);
    }

    bug.addEventListener('click', () => {
      gone = true;
      clearTimeout(timer);
      const r = bug.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2);
      bug.classList.add('fly');
      setTimeout(() => bug.remove(), 1300);
    });

    setTimeout(() => {
      bug.style.setProperty('--x', x * scale() + 'px');
      bug.style.setProperty('--y', y * scale() + 'px');
      box.appendChild(bug);
      bug.getBoundingClientRect(); // settle the start position before it moves
      bug.classList.add('on');
      timer = setTimeout(wander, 700);
    }, 6500);
  }

  /* ---- long pages get a clover that shows reading progress ----------------- */
  function toTop() {
    const doc = document.documentElement;
    if (doc.scrollHeight < innerHeight * 2.2) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'totop';
    b.setAttribute('aria-label', 'Back to top');
    b.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="19"/><circle class="ring" cx="22" cy="22" r="19" pathLength="100"/></svg><i class="glyph"></i>';
    document.body.appendChild(b);

    let raf = 0;
    const update = () => {
      raf = 0;
      const max = doc.scrollHeight - innerHeight;
      b.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(3) : 0);
      b.classList.toggle('on', scrollY > 480);
    };
    addEventListener('scroll', () => { raf ||= requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    b.addEventListener('click', () => {
      scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' });
      const main = $('main');
      if (main) main.focus({ preventScroll: true });
    });
    update();
  }

  /* ---- not everyone has a mail app set up: offer to copy the address --------- */
  function copyButton(link) {
    if (!navigator.clipboard) return;
    const address = link.href.replace(/^mailto:/, '');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'button ghost';
    btn.textContent = 'Copy address';
    const status = document.createElement('span');
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    link.after(btn, status);
    let timer = 0;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(address);
        btn.textContent = 'Copied';
        btn.classList.add('done');
        status.textContent = 'Address copied to the clipboard';
      } catch (e) {
        btn.textContent = 'Press Cmd/Ctrl+C';
        const range = document.createRange();
        range.selectNodeContents(link);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
      }
      clearTimeout(timer);
      timer = setTimeout(() => { btn.textContent = 'Copy address'; btn.classList.remove('done'); status.textContent = ''; }, 2200);
    });
  }

  /* ---- small touches ----------------------------------------------------- */
  // A link to #some-question opens that FAQ item.
  function openFromHash() {
    let id = location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch (e) { return; } // a malformed hash is just ignored
    const el = id && document.getElementById(id);
    if (el && el.tagName === 'DETAILS') el.open = true;
  }
  addEventListener('hashchange', openFromHash);
  // Printed pages should show every answer.
  addEventListener('beforeprint', () => $$('details').forEach(d => (d.open = true)));

  $$('[data-patch]').forEach(patch);
  $$('[data-demo]').forEach(demo);
  $$('.clover').forEach(lean);
  $$('.clover').forEach(ladybug);
  $$('[data-copy]').forEach(copyButton);
  toTop();
  openFromHash();

  console.log('%c Four Leaf %c small apps, made with care. Found a bug? support@tryfourleaf.com', 'background:#047857;color:#fff;border-radius:6px;padding:2px 6px;font-weight:700', '');
})();
