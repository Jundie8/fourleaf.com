/* Four Leaf: the playful layer. Every page works without this file, and it makes
   no network requests. It adds, where the page has the markup for it:
   the clover (lean, spin, a ladybug), the lucky patch, the Greenlit diet demo,
   the Auto/Light/Dark switch, a sticky index for the legal pages, the FAQ's
   expand-all, copy-address, back-to-top, and a leaf rain if you type "luck". */
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

  /* The wind takes everything that wasn't lucky, nearest first. */
  function blowAway(grid, found) {
    const items = [...grid.children];
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const at = items.indexOf(found);
    items.forEach((b, i) => {
      if (b === found) return;
      const d = Math.hypot((i % cols) - (at % cols), Math.floor(i / cols) - Math.floor(at / cols));
      b.style.setProperty('--d', Math.round(d * 40) + 'ms');
      b.style.setProperty('--gx', 70 + Math.random() * 170 + 'px');
      b.style.setProperty('--gy', -140 + Math.random() * 210 + 'px');
      b.style.setProperty('--gr', 120 + Math.random() * 320 + 'deg');
    });
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
    let target, tries, done, lastDist;

    function play() {
      grid.replaceChildren();
      grid.classList.remove('done');
      target = Math.floor(Math.random() * N);
      tries = 0;
      done = false;
      lastDist = null;
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
        blowAway(grid, b);
        const r = b.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
        lucky(true);
        if (!calm() && navigator.vibrate) navigator.vibrate([12, 50, 12]);
        msg.textContent = tries === 1 ? 'First try. Absurdly lucky.' : `Found it in ${tries} tries. Lucky you.`;
        again.hidden = false;
        if (home) home.hidden = false;
      } else {
        b.classList.add('miss');
        const at = [...grid.children].indexOf(b);
        b.setAttribute('aria-label', `Clover ${at + 1}, three leaves`);
        // warmer / colder, measured in grid steps from the lucky one
        const dist = Math.hypot((at % COLS) - (target % COLS), Math.floor(at / COLS) - Math.floor(target / COLS));
        msg.textContent = lastDist === null ? pick(nope) : dist < lastDist * 0.85 ? 'Warmer.' : dist > lastDist * 1.15 ? 'Colder.' : 'Not that one.';
        lastDist = dist;
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
    // a few everyday words people type, mapped to the tags the menu uses
    const SYNONYMS = { milk: 'dairy', cheese: 'dairy', cream: 'dairy', lactose: 'dairy', wheat: 'gluten', flour: 'gluten', bread: 'gluten', pasta: 'gluten', peanut: 'nuts', almond: 'nuts', cashew: 'nuts', seafood: 'fish', pork: 'meat', beef: 'meat' };
    const LABEL = { go: 'Greenlit', ask: 'Ask first', stop: 'Skip' };
    const RANK = { go: 0, ask: 1, stop: 2 };
    const chipBox = $('.chips', root);
    const list = $('.dishes', root);
    const rows = $$('li', list); // data-i is each dish's place on the menu; it breaks ties within a group
    const status = $('.demo-status', root);
    const form = $('.own', root);
    const input = $('input', form);
    const note = $('.own-note', form);
    const pressed = c => c.getAttribute('aria-pressed') === 'true';
    const words = () => $$('[data-custom]', root).filter(pressed).map(c => c.dataset.custom);

    // "eggs" should find "egg", "tomatoes" should find "tomato"
    const forms = w => [...new Set([w, w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, '')])].filter(x => x.length >= 3);
    function matches(word, ing) {
      const text = ing.textContent.toLowerCase();
      const tags = ing.dataset.t.split(' ').filter(Boolean);
      return forms(word).some(f => text.includes(f) || tags.some(t => t.includes(f)) || (SYNONYMS[f] && tags.includes(SYNONYMS[f])));
    }

    function sort(animate) {
      const forbid = new Set($$('[data-diet]', root).filter(pressed).flatMap(c => FORBID[c.dataset.diet]));
      const custom = words();
      const count = { go: 0, ask: 0, stop: 0 };
      rows.forEach(li => {
        const ings = $$('.ings span', li);
        const hits = ings.filter(i => i.dataset.t.split(' ').some(t => forbid.has(t)) || custom.some(w => matches(w, i)));
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
      status.textContent = `${count.go} greenlit, ${count.ask} ask first, ${count.stop} skip.` + (note.hidden ? '' : ' ' + note.textContent);
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

    // which dishes does a word flag? (used for the little note under the field)
    const flaggedBy = word => rows.filter(li => $$('.ings span', li).some(i => matches(word, i))).map(li => $('b', li).textContent);
    const niceList = a => (a.length < 3 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
    const tell = text => { note.textContent = text; note.hidden = !text; if (text) status.textContent = text; };

    chipBox.addEventListener('click', e => {
      const x = e.target.closest('.chip-x');
      const chip = e.target.closest('[data-diet], [data-custom]');
      if (!x && !chip) return;
      settle(); // a tap during the sweep finishes it straight away
      if (x) {
        const own = x.closest('.chip-own');
        tell('');
        own.remove();
        input.focus();
      } else {
        chip.setAttribute('aria-pressed', pressed(chip) ? 'false' : 'true');
        tell('');
      }
      sort(true);
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const word = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!word) return;
      if (word.length < 3) return tell('Try a word with at least three letters.');
      if ($$('[data-custom]', root).some(c => c.dataset.custom === word)) return tell(`“${word}” is already on your list.`);
      if ($$('[data-custom]', root).length >= 4) return tell('That’s plenty for a demo. Remove one to add another.');
      settle();
      const own = document.createElement('span');
      own.className = 'chip-own';
      own.innerHTML = '<button type="button" class="chip" aria-pressed="true"></button><button type="button" class="chip-x"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg></button>';
      const chip = $('.chip', own);
      chip.dataset.custom = word;
      chip.textContent = `No ${word}`;
      const x = $('.chip-x', own);
      x.setAttribute('aria-label', `Remove ${word}`);
      chipBox.appendChild(own);
      input.value = '';
      const found = flaggedBy(word);
      tell(found.length ? `“${word}” shows up in ${niceList(found)}.` : `Nothing on this menu has “${word}”. Good news.`);
      sort(true);
    });
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

  /* ---- drag the clover to spin it; let go and it coasts ----------------------- */
  function spin(root) {
    if (calm()) return;
    const box = $('.clover-box', root);
    let angle = 0, velocity = 0, down = null, moved = false, frame = 0, lastX = 0, lastT = 0;
    const set = a => { angle = a; box.style.setProperty('--spin', a.toFixed(1) + 'deg'); };

    function coast() {
      velocity *= 0.94;
      set(angle + velocity);
      frame = Math.abs(velocity) > 0.05 ? requestAnimationFrame(coast) : 0;
    }
    box.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelAnimationFrame(frame);
      down = { x: e.clientX, id: e.pointerId };
      moved = false;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
    });
    box.addEventListener('pointermove', e => {
      if (!down || e.pointerId !== down.id) return;
      if (!moved && Math.abs(e.clientX - down.x) < 6) return; // a tap or a click is not a drag
      if (!moved) { moved = true; box.setPointerCapture(e.pointerId); box.classList.add('spinning'); }
      const dx = e.clientX - lastX;
      const now = performance.now();
      velocity = Math.max(-26, Math.min(26, (dx * 0.8) / Math.max(1, (now - lastT) / 16)));
      set(angle + dx * 0.8);
      lastX = e.clientX;
      lastT = now;
    });
    const end = e => {
      if (!down || e.pointerId !== down.id) return;
      down = null;
      box.classList.remove('spinning');
      if (moved && Math.abs(velocity) > 0.3) frame = requestAnimationFrame(coast);
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
    // a drag must not also pick the leaf under the finger
    box.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
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

  /* ---- Auto / Light / Dark, remembered on this device ------------------------ */
  function theme() {
    const KEY = 'fl-theme';
    const root = document.documentElement;
    const footer = $('.site-footer .wrap');
    if (!footer) return;
    const metas = $$('meta[name="theme-color"]');
    const originals = metas.map(m => m.content);
    const bg = { light: '#fff8ec', dark: '#1a1814' };
    const ICONS = {
      auto: '<circle cx="12" cy="12" r="8"/><path class="fill" d="M12 4a8 8 0 0 1 0 16z"/>',
      light: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
      dark: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
    };
    const LABELS = { auto: 'Match my device', light: 'Light', dark: 'Dark' };
    const read = () => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; } };

    const box = $('[data-theme-slot]', footer);
    if (!box) return;
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Colour theme');
    const buttons = Object.keys(ICONS).map(mode => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.mode = mode;
      b.setAttribute('aria-label', LABELS[mode]);
      b.title = LABELS[mode];
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[mode]}</svg>`;
      box.appendChild(b);
      return b;
    });

    function apply(mode) {
      if (mode === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = mode;
      metas.forEach((m, i) => { m.content = mode === 'auto' ? originals[i] : bg[mode]; });
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    }
    box.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      try { b.dataset.mode === 'auto' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, b.dataset.mode); } catch (err) { /* private mode: it still works for this visit */ }
      apply(b.dataset.mode);
    });
    addEventListener('storage', e => { if (e.key === KEY) apply(read()); }); // another tab changed it
    apply(read());
  }

  /* ---- legal pages: section links, and a sticky "you are here" index on wide screens ---- */
  function legal() {
    const main = $('main.prose');
    if (!main) return;
    const heads = $$('h2[id]', main);
    const names = new Map(heads.map(h => [h.id, h.textContent.trim()]));

    heads.forEach(h => {
      h.tabIndex = -1; // so a jump can land focus on the section for screen readers
      const a = document.createElement('a');
      a.className = 'anchor';
      a.href = '#' + h.id;
      a.setAttribute('aria-label', `Link to “${names.get(h.id)}”`);
      a.textContent = '#';
      h.appendChild(a);
    });
    const land = () => { const h = heads.find(x => '#' + x.id === decodeURI(location.hash)); if (h) h.focus({ preventScroll: true }); };
    addEventListener('hashchange', land);

    const toc = $('.toc', main);
    if (!toc || heads.length < 3) return;
    const side = document.createElement('nav');
    side.className = 'toc-side';
    side.setAttribute('aria-label', 'On this page');
    side.innerHTML = '<div class="toc-side-inner"><p class="toc-title">On this page</p><ol></ol></div>';
    const ol = $('ol', side);
    heads.forEach(h => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = names.get(h.id);
      li.appendChild(a);
      ol.appendChild(li);
    });
    toc.after(side);

    const links = $$('a', side);
    let queued = false;
    function spy() {
      queued = false;
      let current = null;
      for (const h of heads) { if (h.getBoundingClientRect().top <= 150) current = h; else break; }
      links.forEach(a => {
        if (current && a.getAttribute('href') === '#' + current.id) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  }

  /* ---- type "luck" anywhere and it rains leaves --------------------------------- */
  function rain() {
    if (calm()) return;
    const colours = ['var(--green)', 'var(--green-deep)', 'var(--ask)'];
    for (let i = 0; i < 44; i++) {
      const el = document.createElement('i');
      el.className = 'spark';
      const size = 14 + Math.random() * 14;
      el.style.cssText = `left:${Math.random() * 100}vw;top:-30px;width:${size}px;height:${size * 1.06}px;background:${colours[i % 3]}`;
      document.body.appendChild(el);
      el.animate(
        [
          { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
          { transform: `translate(${Math.random() * 160 - 80}px, ${innerHeight + 60}px) rotate(${180 + Math.random() * 540}deg)`, opacity: 0.9 },
        ],
        { duration: 2600 + Math.random() * 2600, delay: Math.random() * 1500, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'backwards' }
      ).onfinish = () => el.remove();
    }
  }
  let typed = '';
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    const t = document.activeElement;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    typed = (typed + e.key.toLowerCase()).slice(-4);
    if (typed === 'luck') { typed = ''; rain(); }
  });

  /* ---- the FAQ: open or close every answer at once --------------------------------- */
  function faqTools() {
    const faq = $('.faq');
    const items = faq ? $$('details', faq) : [];
    if (items.length < 3) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'linklike faq-all';
    const wrap = document.createElement('div');
    wrap.className = 'faq-tools';
    wrap.appendChild(btn);
    faq.before(wrap);
    const sync = () => { const all = items.every(d => d.open); btn.textContent = all ? 'Collapse all' : 'Expand all'; btn.setAttribute('aria-expanded', String(all)); };
    btn.addEventListener('click', () => { const open = !items.every(d => d.open); items.forEach(d => { d.open = open; }); sync(); });
    items.forEach(d => d.addEventListener('toggle', sync));
    sync();
  }

  // The 404 page says which address wasn't found.
  const lost = $('[data-path]');
  if (lost && location.pathname !== '/404.html') { lost.textContent = location.pathname; lost.closest('p').hidden = false; }

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
  $$('.clover').forEach(spin);
  $$('.clover').forEach(ladybug);
  $$('[data-copy]').forEach(copyButton);
  theme();
  legal();
  faqTools();
  toTop();
  openFromHash();

  // lucky.js (the game page) borrows these
  window.fourleaf = { NS, LEAF, calm, burst };

  console.log('%c Four Leaf %c small apps, made with care. Found a bug? support@tryfourleaf.com. (Try typing “luck” on the page.)', 'background:#047857;color:#fff;border-radius:6px;padding:2px 6px;font-weight:700', '');
})();
