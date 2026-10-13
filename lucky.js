/* The lucky meadow: a small game with two modes.
   Endless: rounds that fill up until your luck runs out.
   Daily: one meadow a day, seeded by the date, with a streak.
   Needs site.js (loaded first) for the leaf shape and the confetti. Nothing leaves
   the page; scores are kept in this browser's localStorage, if it lets us. */
(() => {
  'use strict';

  const FL = window.fourleaf;
  const root = document.querySelector('[data-game]');
  if (!FL || !root) return;
  const { NS, LEAF, calm, burst } = FL;

  const $ = sel => root.querySelector(sel);
  const el = {
    meadow: $('[data-meadow]'), msg: $('.game-msg'), round: $('[data-round]'), time: $('[data-time]'),
    best: $('[data-best]'), luck: $('[data-luck]'), hint: $('[data-hint]'), next: $('[data-next]'),
    again: $('[data-again]'), share: $('[data-share]'), modes: [...root.querySelectorAll('[data-mode]')],
    announce: $('[data-announce]'),
  };
  const kRound = el.round.previousElementSibling;
  const kBest = el.best.previousElementSibling;

  const MAX_LUCK = 3;
  const DAILY_ROUND = 4; // the daily meadow is always round-four dense
  const KEY = 'fl-lucky';
  const DAILY_KEY = 'fl-daily';
  const SR_KEY = 'fl-lucky-sr';
  const LEAVES = { two: 2, three: 3, four: 4, five: 5 };

  /* ---- randomness: the daily meadow is seeded by the date, endless is not ---------- */
  const seedFrom = str => { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mulberry32 = a => () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let rnd = Math.random;
  const rand = (a, b) => a + rnd() * (b - a);
  const pick = list => list[Math.floor(rnd() * list.length)];

  const rounds = n => (n === 1 ? '1 round' : `${n} rounds`);
  const leaves = n => (n === 1 ? '1 leaf' : `${n} leaves`);
  const triesOf = n => (n === 1 ? '1 try' : `${n} tries`);
  const daysOf = n => (n === 1 ? '1 day' : `${n} days`);

  /* ---- dates (UTC, so everyone's "today" turns over together) ------------------------ */
  const dayStr = d => d.toISOString().slice(0, 10);
  const today = () => dayStr(new Date());
  const yesterday = () => dayStr(new Date(Date.now() - 864e5));
  const dateLabel = () => new Date(today() + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  /* ---- scores, kept on this device ----------------------------------------------------- */
  const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v && typeof v === 'object' ? v : fallback; } catch (e) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: fine */ } };
  const best = Object.assign({ round: 0, time: 0 }, read(KEY, {}));
  let daily = read(DAILY_KEY, null);
  const streakNow = () => (daily && (daily.lastWin === today() || daily.lastWin === yesterday()) ? daily.streak || 0 : 0);
  const playedToday = () => !!daily && daily.date === today();

  /* ---- screen reader mode: clovers say how many leaves they have ------------------------------ */
  let announce = !!read(SR_KEY, {}).on;
  el.announce.checked = announce;
  const nameOf = (i, n, kind) => `Clover ${i + 1} of ${n}${announce ? `, ${leaves(LEAVES[kind])}` : ''}`;

  /* ---- state ---------------------------------------------------------------------------- */
  let s = null;
  let ticker = 0;
  const fresh = mode => ({ mode, round: mode === 'daily' ? DAILY_ROUND : 1, luck: MAX_LUCK, cleared: 0, over: false });

  /* ---- drawing a clover ------------------------------------------------------------------- */
  function cloverSvg(kind) {
    const n = LEAVES[kind];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-40 -40 80 80');
    svg.setAttribute('aria-hidden', 'true');
    const angles = n === 2 ? [-34, 34] : Array.from({ length: n }, (_, i) => (360 / n) * i);
    angles.forEach(a => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', LEAF);
      // five leaves are pulled in so their tips overlap instead of leaving a gap at the centre
      p.setAttribute('transform', `rotate(${a}) translate(0 ${n === 5 ? 4 : -1}) scale(${n === 5 ? 1.12 : 1.05})`);
      svg.appendChild(p);
    });
    return svg;
  }

  const columns = () => Math.max(5, Math.floor((el.meadow.clientWidth - 16) / 50));
  const itemsOf = () => [...el.meadow.children].filter(c => c.tagName === 'BUTTON');
  const pos = i => ({ x: i % s.cols, y: Math.floor(i / s.cols) });
  const say = text => { el.msg.textContent = text; };

  /* ---- a round ------------------------------------------------------------------------------ */
  function newRound() {
    rnd = s.mode === 'daily' ? mulberry32(seedFrom('fourleaf-' + today())) : Math.random;
    Object.assign(s, { tries: 0, misses: 0, hinted: false, solved: false, lastDist: null, elapsed: 0, last: performance.now(), running: true });

    const cols = columns();
    const count = Math.min(150, Math.round(12 + 6 * s.round + 1.4 * s.round * s.round));
    const n = Math.max(3, Math.ceil(count / cols)) * cols; // a full rectangle, never a thin strip
    s.cols = cols;
    s.n = n;
    s.target = Math.floor(rand(0, n));

    // From round 5, a few rare five-leaf clovers turn up as decoys.
    const fives = new Set();
    if (s.round >= 5) {
      const want = Math.min(4, 1 + Math.floor((s.round - 4) / 2));
      while (fives.size < want) { const i = Math.floor(rand(0, n)); if (i !== s.target) fives.add(i); }
    }

    el.meadow.hidden = false;
    el.meadow.className = 'meadow';
    el.meadow.style.setProperty('--cols', cols);
    el.meadow.replaceChildren();
    for (let i = 0; i < n; i++) {
      const kind = i === s.target ? 'four' : fives.has(i) ? 'five' : s.round >= 3 && rnd() < 0.14 ? 'two' : 'three';
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.kind = kind;
      b.tabIndex = i ? -1 : 0; // one tab stop; arrow keys move around the meadow
      b.setAttribute('aria-label', nameOf(i, n, kind));
      b.appendChild(cloverSvg(kind));
      b.style.setProperty('--i', Math.min(i, 120));
      b.style.setProperty('--r', rand(0, 360).toFixed(0) + 'deg');
      b.style.setProperty('--s', rand(0.74, 0.98).toFixed(2));
      b.style.setProperty('--x', rand(-7, 7).toFixed(1) + 'px');
      b.style.setProperty('--y', rand(-7, 7).toFixed(1) + 'px');
      b.style.setProperty('--mix', Math.round(rand(74, 94)) + '%');
      el.meadow.appendChild(b);
    }

    el.next.hidden = el.again.hidden = el.share.hidden = true;
    el.hint.hidden = false;
    el.hint.disabled = false;
    el.hint.textContent = 'Hint';
    paint();
    say(s.mode === 'daily' ? `Today’s meadow, ${dateLabel()}. Find the clover with four leaves.` : s.round === 1 ? 'Find the clover with four leaves.' : `Round ${s.round}. Find the clover with four leaves.`);
    startTicker();
  }

  function paint() {
    const isDaily = s.mode === 'daily';
    kRound.textContent = isDaily ? 'Daily' : 'Round';
    el.round.textContent = isDaily ? dateLabel() : s.round;
    kBest.textContent = isDaily ? 'Streak' : 'Best';
    el.best.textContent = isDaily ? (streakNow() ? daysOf(streakNow()) : '–') : best.round ? `Round ${best.round}` : '–';
    el.luck.setAttribute('aria-label', `Luck: ${s.luck} of ${MAX_LUCK}`);
    if (!el.luck.children.length) for (let i = 0; i < MAX_LUCK; i++) el.luck.appendChild(document.createElement('i'));
    [...el.luck.children].forEach((leaf, i) => leaf.classList.toggle('lost', i >= s.luck));
    el.modes.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode)));
  }

  /* ---- the clock: elapsed only, no limit, paused while the tab is hidden --------------------- */
  function startTicker() {
    clearInterval(ticker);
    ticker = setInterval(() => {
      if (!s.running || document.hidden) { s.last = performance.now(); return; }
      const now = performance.now();
      s.elapsed += now - s.last;
      s.last = now;
      el.time.textContent = (s.elapsed / 1000).toFixed(1);
    }, 100);
    el.time.textContent = '0.0';
  }
  function stopTicker() {
    s.running = false;
    clearInterval(ticker);
    el.time.textContent = (s.elapsed / 1000).toFixed(1);
  }

  /* ---- picking -------------------------------------------------------------------------------- */
  el.meadow.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || s.solved || s.over || b.classList.contains('miss')) return;
    s.tries++;
    if (b.dataset.kind === 'four') win(b); else miss(b);
  });

  function miss(b) {
    const i = itemsOf().indexOf(b);
    b.classList.add('miss');
    b.setAttribute('aria-label', `Clover ${i + 1}, ${leaves(LEAVES[b.dataset.kind])}`);
    s.misses++;
    s.luck--;
    paint();
    if (!calm() && navigator.vibrate) navigator.vibrate(12);

    const a = pos(i), t = pos(s.target);
    const dist = Math.hypot(a.x - t.x, a.y - t.y);
    let lead;
    if (b.dataset.kind === 'five') lead = 'Five leaves! Rare, but not the lucky one.';
    else if (b.dataset.kind === 'two') lead = 'Just a sprout.';
    else if (s.lastDist === null) lead = pick(['Just three leaves.', 'Not that one.']);
    else if (dist < s.lastDist * 0.85) lead = 'Warmer.';
    else if (dist > s.lastDist * 1.15) lead = 'Colder.';
    else lead = 'Not that one.';
    s.lastDist = dist;

    if (s.luck <= 0) lose(); else say(lead);
  }

  function win(b) {
    s.solved = true;
    stopTicker();
    const secs = s.elapsed / 1000;
    b.classList.add('found');
    b.setAttribute('aria-label', 'The four-leaf clover');
    const r = b.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
    if (!calm() && navigator.vibrate) navigator.vibrate([12, 50, 12]);
    blowAway(b);

    el.hint.hidden = true;
    el.share.hidden = false;

    if (s.mode === 'daily') {
      const streak = (daily && daily.lastWin === yesterday() ? daily.streak || 0 : 0) + 1;
      daily = { date: today(), won: true, tries: s.tries, secs, streak, lastWin: today() };
      write(DAILY_KEY, daily);
      s.cleared = 1;
      paint();
      say(`${s.tries === 1 ? 'First try! ' : ''}Found today’s clover in ${triesOf(s.tries)}, ${secs.toFixed(1)}s. Streak: ${daysOf(streak)}. A new meadow arrives tomorrow.`);
      el.again.textContent = 'Play endless';
      el.again.hidden = false;
      el.again.focus({ preventScroll: true });
      return;
    }

    s.cleared = s.round;
    const bits = [];
    bits.push(s.tries === 1 ? `First try! Round ${s.round} cleared in ${secs.toFixed(1)}s.` : `Round ${s.round} cleared in ${triesOf(s.tries)}, ${secs.toFixed(1)}s.`);
    if (s.round > best.round) { best.round = s.round; bits.push('New best round.'); }
    if (!best.time || secs < best.time) { if (best.time) bits.push(`Fastest find yet: ${secs.toFixed(1)}s.`); best.time = secs; }
    if (s.misses === 0 && s.luck < MAX_LUCK) { s.luck++; bits.push('A leaf of luck grew back.'); }
    write(KEY, best);
    paint();
    say(bits.join(' '));
    el.next.hidden = false;
    el.next.focus({ preventScroll: true });
  }

  function lose() {
    s.over = true;
    stopTicker();
    itemsOf()[s.target].classList.add('reveal');
    el.meadow.classList.add('over');
    el.hint.hidden = true;
    el.again.hidden = false;

    if (s.mode === 'daily') {
      daily = { date: today(), won: false, tries: s.tries, secs: s.elapsed / 1000, streak: 0, lastWin: daily ? daily.lastWin || null : null };
      write(DAILY_KEY, daily);
      paint();
      say('Out of luck. It was hiding right there. A new meadow arrives tomorrow.');
      el.again.textContent = 'Play endless';
      el.share.hidden = false;
    } else {
      const n = s.round - 1;
      write(KEY, best);
      s.cleared = n;
      say(n ? `Out of luck. It was hiding right there. You cleared ${rounds(n)}.` : 'Out of luck. It was hiding right there.');
      el.share.hidden = !n;
    }
    el.again.focus({ preventScroll: true });
  }

  /* The rest of the meadow is carried off by the wind, nearest clovers first. */
  function blowAway(found) {
    const items = itemsOf();
    const f = pos(items.indexOf(found));
    items.forEach((b, i) => {
      if (b === found) return;
      const p = pos(i);
      b.style.setProperty('--d', Math.round(Math.hypot(p.x - f.x, p.y - f.y) * 30) + 'ms');
      b.style.setProperty('--gx', (70 + Math.random() * 170).toFixed(0) + 'px');
      b.style.setProperty('--gy', (-140 + Math.random() * 210).toFixed(0) + 'px');
      b.style.setProperty('--gr', (120 + Math.random() * 320).toFixed(0) + 'deg');
    });
    el.meadow.classList.add('cleared');
  }

  /* ---- today's meadow is already done: show the result instead ----------------------------- */
  function showDailyDone() {
    s = fresh('daily');
    s.over = true;
    s.running = false;
    clearInterval(ticker);
    el.meadow.hidden = true;
    el.hint.hidden = el.next.hidden = true;
    el.again.hidden = el.share.hidden = false;
    el.again.textContent = 'Play endless';
    el.time.textContent = daily.secs.toFixed(1);
    paint();
    say(daily.won
      ? `You found today’s clover in ${triesOf(daily.tries)}, ${daily.secs.toFixed(1)}s. Streak: ${daysOf(daily.streak)}. A new meadow arrives tomorrow.`
      : 'Today’s clover got away. A new meadow arrives tomorrow.');
  }

  /* ---- modes ------------------------------------------------------------------------------------- */
  const focusMeadow = () => { const first = itemsOf()[0]; if (first && !el.meadow.hidden) first.focus({ preventScroll: true }); };
  function setMode(mode) {
    el.again.textContent = 'Play again';
    if (mode === 'daily' && playedToday()) { showDailyDone(); return; }
    s = fresh(mode);
    newRound();
  }
  el.modes.forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mode === s.mode) return;
    setMode(b.dataset.mode);
    focusMeadow();
  }));

  el.announce.addEventListener('change', () => {
    announce = el.announce.checked;
    write(SR_KEY, { on: announce });
    itemsOf().forEach((b, i) => { if (!b.classList.contains('miss') && !b.classList.contains('found')) b.setAttribute('aria-label', nameOf(i, s.n, b.dataset.kind)); });
    say(announce ? 'Screen reader mode on. Each clover now announces its leaf count.' : 'Screen reader mode off.');
  });

  /* ---- hint: say where to look, and ring the area ----------------------------------------------- */
  el.hint.addEventListener('click', () => {
    if (s.hinted || s.solved || s.over) return;
    s.hinted = true;
    el.hint.disabled = true;
    el.hint.textContent = 'Hint used';

    const t = pos(s.target);
    const rows = s.n / s.cols;
    const fx = s.cols > 1 ? t.x / (s.cols - 1) : 0.5;
    const fy = rows > 1 ? t.y / (rows - 1) : 0.5;
    const h = fx < 0.34 ? 0 : fx > 0.66 ? 2 : 1;
    const v = fy < 0.34 ? 0 : fy > 0.66 ? 2 : 1;
    const place = [['the upper left', 'the top', 'the upper right'], ['the left side', 'the middle', 'the right side'], ['the lower left', 'the bottom', 'the lower right']][v][h];
    say(`Try ${place}.`);

    const button = itemsOf()[s.target];
    const cell = button.offsetWidth;
    const ring = document.createElement('i');
    ring.className = 'hint-ring';
    ring.setAttribute('aria-hidden', 'true');
    ring.style.left = button.offsetLeft + cell / 2 + (Math.random() * 2.2 - 1.1) * cell + 'px';
    ring.style.top = button.offsetTop + cell / 2 + (Math.random() * 2.2 - 1.1) * cell + 'px';
    ring.style.setProperty('--d', cell * 5 + 'px');
    el.meadow.appendChild(ring);
    setTimeout(() => ring.remove(), 3200);
  });

  /* ---- buttons -------------------------------------------------------------------------------------- */
  el.next.addEventListener('click', () => { s.round++; newRound(); focusMeadow(); });
  el.again.addEventListener('click', () => { setMode('endless'); focusMeadow(); });

  el.share.addEventListener('click', async () => {
    let text;
    if (s.mode === 'daily' && daily) {
      text = daily.won
        ? `The lucky meadow, ${dateLabel()}: found the four-leaf clover in ${triesOf(daily.tries)} (${daily.secs.toFixed(1)}s). Streak: ${daysOf(daily.streak)}. Can you beat that?`
        : `The lucky meadow, ${dateLabel()}: the four-leaf clover got away from me. Can you find it?`;
    } else {
      const n = s.cleared;
      text = n ? `I cleared ${rounds(n)} of the lucky meadow on Four Leaf. Can you beat it?` : 'I’m hunting for a four-leaf clover on Four Leaf. Can you find the lucky one?';
    }
    const url = 'https://tryfourleaf.com/lucky/';
    if (navigator.share) {
      try { await navigator.share({ title: 'The lucky meadow', text, url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const label = el.share.textContent;
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      el.share.textContent = 'Copied';
      say('Copied to your clipboard.');
    } catch (e) {
      el.share.textContent = 'Copy failed';
    }
    setTimeout(() => { el.share.textContent = label; }, 2000);
  });

  /* ---- keyboard: one tab stop, arrows move around the meadow ------------------------------------------ */
  el.meadow.addEventListener('keydown', e => {
    const items = itemsOf();
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: s.cols, ArrowUp: -s.cols }[e.key];
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : step === undefined ? -1 : Math.min(items.length - 1, Math.max(0, i + step));
    if (j < 0) return;
    e.preventDefault();
    items[i].tabIndex = -1;
    items[j].tabIndex = 0;
    items[j].focus();
  });

  // However the meadow's width changes (rotation, a scrollbar, a resized window) the grid
  // follows it; an unfinished last row is centred, so it still looks intentional.
  if ('ResizeObserver' in window) {
    let wait = 0;
    new ResizeObserver(() => {
      clearTimeout(wait);
      wait = setTimeout(() => {
        const cols = columns();
        if (s && !el.meadow.hidden && cols !== s.cols) { s.cols = cols; el.meadow.style.setProperty('--cols', cols); }
      }, 120);
    }).observe(el.meadow);
  }

  s = fresh('endless');
  newRound();
})();
