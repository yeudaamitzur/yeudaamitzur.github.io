// ---- Header mobile drawer (opens as if the pill stretches out; closes with a firm contraction) ----
const menuBtn = document.querySelector('.hdr__menu');
const drawer = document.getElementById('hdr-drawer');
const hdrForMenu = document.querySelector('.hdr');
if (menuBtn && drawer) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closeTimer = null;
  const isOpen = () => menuBtn.getAttribute('aria-expanded') === 'true';
  const setOpen = (open) => {
    if (open) {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      drawer.classList.remove('is-closing');
      drawer.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Close menu');
      if (hdrForMenu) hdrForMenu.classList.add('menu-open');   // hide the pill so the card reads as the expanded bar
    } else {
      if (drawer.hidden || closeTimer) return;
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Open menu');
      const finish = () => {
        drawer.hidden = true;
        drawer.classList.remove('is-closing');
        if (hdrForMenu) hdrForMenu.classList.remove('menu-open');   // the small pill takes over again
        closeTimer = null;
      };
      if (prefersReduced) { finish(); return; }
      drawer.classList.add('is-closing');       // play the contraction back into the pill, then hide
      closeTimer = setTimeout(finish, 320);     // matches drawerCollapse duration
    }
  };
  menuBtn.addEventListener('click', () => setOpen(!isOpen()));
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  const closeBtn = drawer.querySelector('.hdr__drawer-close');
  if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));
  // scrolling while the menu is open auto-closes it (with the same contraction)
  window.addEventListener('scroll', () => { if (isOpen()) setOpen(false); }, { passive: true });
  window.addEventListener('resize', () => { if (window.innerWidth > 1024) setOpen(false); });
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// A tap swell: out fast, back slowly. Not a sine - a sine leaves at full speed and arrives at
// full speed, which reads as a twitch. This one eases out of rest and settles back into it.
const POP_MS = 760;
const popCurve = (t) => (t <= 0 || t >= 1) ? 0
  : (t < 0.38 ? easeOutCubic(t / 0.38) : 1 - easeInOutCubic((t - 0.38) / 0.62));
// The phone's blink: smoothstep down, HOLD at ink, smoothstep back up. Smoothstep has zero slope
// at both ends, so the letter leaves and rejoins the purple without an edge - that is the soft part.
// The hold in the middle is what makes it actually reach black: the colour itself eases at
// 0.2/frame, and against a curve that only touches bottom for an instant (a plain raised cosine)
// it bottomed out around 0.32 - a wash, not a letter turning black and coming back.
const BLINK_MS = 820;
const smoothstep = (k) => k * k * (3 - 2 * k);
const blinkCurve = (t) => {
  if (t <= 0 || t >= 1) return 0;
  if (t < 0.30) return smoothstep(t / 0.30);            // down into ink
  if (t < 0.62) return 1;                               // ...and sit there long enough to arrive
  return 1 - smoothstep((t - 0.62) / 0.38);             // back up to purple
};

// ---- Floating pill header: collapse when scrolling down, re-expand when scrolling up ----
const hdrFloat = document.querySelector('.hdr--float');
if (hdrFloat) {
  let lastY = window.scrollY;
  const hdrScroll = () => {
    const y = window.scrollY;
    if (y < 60) hdrFloat.classList.remove('is-scrolled');            // always expanded near the top
    else if (y > lastY + 2) hdrFloat.classList.add('is-scrolled');   // scrolling down → collapse to badge
    else if (y < lastY - 2) hdrFloat.classList.remove('is-scrolled'); // scrolling up → expand again
    lastY = y;
  };
  window.addEventListener('scroll', hdrScroll, { passive: true });
  hdrScroll();
}

// ---- Stat numbers grow/count up from a small number to their value ----
const statVals = Array.from(document.querySelectorAll('.stat__val'));
if (statVals.length) {
  if (reduced || !('IntersectionObserver' in window)) {
    statVals.forEach((el) => (el.textContent = el.dataset.count));
  } else {
    statVals.forEach((el) => (el.textContent = '0'));   // start small so the growth is visible
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target, to = +el.dataset.count; let t0 = null; const dur = 1100;
        (function step(ts) {
          if (!t0) t0 = ts;
          const k = clamp((ts - t0) / dur, 0, 1);
          el.textContent = Math.round(easeOutCubic(k) * to);
          if (k < 1) requestAnimationFrame(step); else el.textContent = to;
        })(performance.now());
        sio.unobserve(el);
      });
    }, { threshold: 0.6 });
    statVals.forEach((el) => sio.observe(el));
  }
}

const hero = document.querySelector('.hero');
const line1 = document.querySelector('.hero__line--1');
const heroSub = document.querySelector('.hero__sub');
const cases = Array.from(document.querySelectorAll('.case'));
const canvas = document.querySelector('.hero__dots');


// ---- The aside types itself out ----
// The string lives in data-type, so the markup still carries it for search engines and for anyone
// who never sees the animation; the span starts empty and fills up. The clock is real time, not a
// per-character timer, so a dropped frame costs nothing - the next frame simply catches up.
const typed = document.querySelector('.hero__typed');
if (typed) {
  const full = typed.dataset.type || '';
  const out = typed.querySelector('span');
  if (reduced || !out) {
    if (out) out.textContent = full;
    typed.classList.add('is-done');
  } else {
    // START is measured from page load, and it is deliberately late: the purple line above finishes
    // settling at 2.5s (1.35s delay + 1.15s rise) and this waits one second after that, so the
    // reader has taken in the line above before anything moves down here. CPS is the pace, and
    // it is a slow hand on purpose. Nothing is visible in the meantime - not even the caret, which
    // only appears with the first character (see .is-typing).
    const START = 3500, CPS = 26, LEAD = 750;
    // A constant rate reads like a machine. Every character gets a little jitter, and the ones
    // AFTER a comma or a full stop get a real pause - which is where a person actually stops.
    const at = []; let t = 0;
    for (let i = 0; i < full.length; i++) {
      t += 1000 / CPS + Math.random() * 24 + (/[,.]/.test(full[i - 1] || '') ? 230 : 0);
      at.push(t);
    }
    let i = 0, t0 = 0;
    const step = (now) => {
      if (!t0) { t0 = now; typed.classList.add('is-typing'); }
      const el = now - t0;
      while (i < at.length && at[i] <= el) i++;
      out.textContent = full.slice(0, i);
      if (i < full.length) requestAnimationFrame(step);
      else typed.classList.add('is-done');
    };
    setTimeout(() => requestAnimationFrame(step), START);
    // The tools set off a beat BEFORE the first character rather than on it. Tied to the same
    // instant they read as one event fired twice; with a lead the wave is already moving when the
    // writing starts, which is what makes the two feel like one sequence instead of a collision.
    setTimeout(startTools, Math.max(0, START - LEAD));
  }
}

// ---- The tools, riding a wave in from the right ----
// One path, and every tile is a point along it. It runs from off the right edge to off the left,
// and its vertical shape is a cosine that starts high, drops into a trough under the portrait,
// lifts once more and then falls away - the amplitude shrinking as it goes, so the far end decays
// rather than stopping. The whole thing is anchored to the BOTTOM OF THE PORTRAIT CIRCLE, which is
// why it is written here and not as a CSS keyframe: that anchor moves with the layout, and the
// wave has to keep meeting it at every window size.
//
// Arrival is the other half of it. A tile does not appear at full size - over the first stretch of
// the path it grows from a third of its size and lifts out of near-transparency, so it reads as
// surfacing rather than as being switched on. The same happens in reverse at the far end.
const stream = document.querySelector('.hero__stream');
let toolsRunning = false;
function startTools() {
  if (!stream || toolsRunning || !hero) return;
  toolsRunning = true;
  const tiles = Array.from(stream.querySelectorAll('.tool'));
  if (!tiles.length) return;

  const LOOP = 26000;          // ms for one tile to cross the whole path
  const IN = 0.16, OUT = 0.14; // the share of the path spent arriving and leaving
  // 1.6 cycles across the width, and that number is not arbitrary: it is what puts the FIRST trough
  // directly under the middle of the portrait. From there the shape falls out exactly as described -
  // in high from the right, down into the hollow beneath the circle, up over a crest, and down into
  // a second, shallower trough that carries it off the left.
  const FREQ = 1.6;
  const BLINKS = 2;            // times a tile fades out and back on one crossing
  const ENTER_MS = 520, STEP_MS = 105;   // the opening fade, and the gap between tiles
  // an irrational-ish step so the beats never line up into a visible pattern
  const phase = Array.from({ length: 32 }, (_, i) => (i * 0.618) % 1);
  const TROUGH_P = 1 / (2 * FREQ);   // where that first low point lands
  let W = 0, H = 0, baseY = 0, amp0 = 0, drift = 0, lift = 0;
  const ampAt = (p) => amp0 * (1 - 0.5 * p);          // the wave decays as it crosses
  const measure = () => {
    const hr = hero.getBoundingClientRect();
    W = hr.width; H = hr.height;
    amp0 = Math.min(W * 0.26, 265);
    drift = Math.min(H * 0.2, 165);
    const pb = portraitBox ? portraitBox.getBoundingClientRect() : null;
    // The trough is placed FIRST - just under the circle, so the wave picks up its underside - and
    // the rest of the path is then hung off it. Anchoring the mid-line instead left the whole thing
    // floating below the picture with no relationship to it.
    const trough = pb ? (pb.bottom - hr.top) + 20 : H * 0.78;
    baseY = trough - ampAt(TROUGH_P) * 0.5 - drift * TROUGH_P * TROUGH_P;

    // ...and then the whole path is pushed down until it clears everything it would otherwise run
    // through. A tile is a box, not a point, so the clearance is measured from its EDGE: half its
    // height plus a margin. The shift is global rather than a per-point clamp, because clamping
    // flattens the wave into a shelf wherever an obstacle sits under it and you can see the tiles
    // stop following the curve.
    const half = (stream.querySelector('.tool') || { offsetHeight: 46 }).offsetHeight / 2;
    const pad = 18;
    const blockers = [];
    if (pb) blockers.push({ l: pb.left - hr.left, r: pb.right - hr.left, b: pb.bottom - hr.top });
    const col = document.querySelector('.hero__col');
    if (col) { const c = col.getBoundingClientRect(); blockers.push({ l: c.left - hr.left, r: c.right - hr.left, b: c.bottom - hr.top }); }
    let push = 0;
    for (let q = 0; q <= 1; q += 0.004) {
      const [x, y] = raw(q);
      for (const bl of blockers) {
        if (x < bl.l - half || x > bl.r + half) continue;
        push = Math.max(push, (bl.b + half + pad) - y);
      }
    }
    lift = push;
  };


  // p = 0 at the right-hand edge, 1 off the left. `raw` is the wave on its own; `at` is that wave
  // pushed clear of everything it would otherwise cross.
  const raw = (p) => {
    const x = (W + 80) + (-(W + 160)) * p;
    const wave = -Math.cos(2 * Math.PI * FREQ * p);   // +1 high at p = 0, trough at TROUGH_P
    return [x, baseY + ampAt(p) * 0.5 * wave + drift * p * p];
  };
  const at = (p) => { const r = raw(p); return [r[0], r[1] + lift]; };

  measure();
  window.addEventListener('resize', measure);

  const t0 = performance.now();
  const frame = (now) => {
    const t = (now - t0) / LOOP;
    const age = now - t0;
    for (let i = 0; i < tiles.length; i++) {
      // Evenly spaced along the path, each one a fixed distance behind the last - all of them in
      // their places from the first frame. An earlier version let them on ONE AT A TIME from the
      // right-hand end, which spread the arrival over most of a 26-second loop and left the wave
      // looking half-built for far too long. The staggering lives in the fade below instead.
      const p = (t + i / tiles.length) % 1;
      const tile = tiles[i];
      const [x, y] = at(p);
      // in at the start, out at the end; flat all the way between
      const k = p < IN ? p / IN : (p > 1 - OUT ? (1 - p) / OUT : 1);
      const e = k * k * (3 - 2 * k);                     // smoothstep, so neither end has a corner
      // ...and on top of that, each tile breathes right out of existence and back BLINKS times on
      // its way across, on its own offset beat so they never do it together. This is the reason the
      // opacity floor is gone: it has to actually reach nothing, or it reads as a dimming rather
      // than as a disappearance.
      const beat = 0.5 - 0.5 * Math.cos(2 * Math.PI * (p * BLINKS + phase[i]));
      // The stagger, and it is only this: each tile fades up a fraction of a second after the one
      // before it. Half a second each, a tenth of a second apart, so the whole set is in within
      // about a second and a half - a graded arrival rather than a switch, and nothing waits.
      const b0 = clamp((age - i * STEP_MS) / ENTER_MS, 0, 1);
      const born = b0 * b0 * (3 - 2 * b0);
      const v = e * Math.pow(beat, 0.65) * born;
      tile.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(0.28 + 0.72 * v).toFixed(3)})`;
      tile.style.opacity = v.toFixed(3);
    }
    // Unconditional. It used to stop whenever the hero left the viewport and never start again,
    // so scrolling down and coming back up left the wave frozen in place. Eleven elements is not a
    // frame budget worth protecting.
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
if (stream && reduced) {
  // no travel: lay them out along the same path, once, and leave them there
  toolsRunning = true;
  const tiles = Array.from(stream.querySelectorAll('.tool'));
  const hr = hero ? hero.getBoundingClientRect() : { width: 0, height: 0 };
  tiles.forEach((tile, i) => {
    const p = 0.08 + 0.84 * (i / Math.max(1, tiles.length - 1));
    const x = (hr.width + 80) - (hr.width + 160) * p;
    const y = hr.height * 0.62 + 60 * -Math.cos(2 * Math.PI * 1.15 * p);
    tile.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    tile.style.opacity = '1';
  });
}

// ---- The portrait ----
//
// This used to be a particle system: a few hundred thousand dots sampled off the photograph, which
// the cursor could push, a press could lift a layer off, and a scroll would blow apart. All three
// were asked for and then, one at a time, asked away again - the scatter last - so what is left is
// simply the picture. The dots, their typed arrays, the spatial index, the colour buckets and the
// frame loop that drove them are all gone; no rAF runs here at all now.
//
// What survives is the part that was never about dots: WHERE the picture goes. It is fitted to the
// subject's own bounds rather than to its file's frame, mirrored or not by one switch, cropped to a
// circle, and - the fiddly bit - pushed down far enough that the arc of that circle cannot cut the
// top of his head at any window size.
const ctx = canvas ? canvas.getContext('2d') : null;
const offc = document.createElement('canvas');
const offx = offc.getContext('2d', { willReadFrequently: true });
const portraitBox = document.querySelector('.hero__portrait');

// Which way round he faces. One line, because it has been asked for in both directions and will be
// again; the flip is done to the raster, so everything measured afterwards sees it as drawn.
const MIRROR = false;

const portraitImg = new Image();
let portraitReady = false;
let subject = null;   // where HE is inside the source frame, in source pixels
let cw = 0, ch = 0, dpr = 1, px_ = 0, py_ = 0;

// A cut-out PNG carries whatever empty margin the person exporting it happened to leave. Fitting
// the FRAME would therefore spend part of the circle on nothing, so the subject's own bounds are
// measured once, off a small downscaled copy (200px wide is ample for a bounding box).
function measureSubject(im) {
  const W = 200, H = Math.max(1, Math.round(200 * im.naturalHeight / im.naturalWidth));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] < 16) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return { x: 0, y: 0, w: im.naturalWidth, h: im.naturalHeight };
  const kx = im.naturalWidth / W, ky = im.naturalHeight / H;
  return { x: x0 * kx, y: y0 * ky, w: (x1 - x0 + 1) * kx, h: (y1 - y0 + 1) * ky };
}

function buildPortrait() {
  if (!canvas || !ctx || !hero || !portraitBox || !portraitReady || !subject) return;
  const heroRect = hero.getBoundingClientRect();
  cw = Math.round(heroRect.width); ch = Math.round(heroRect.height);
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  px_ = Math.round(cw * dpr); py_ = Math.round(ch * dpr);
  canvas.width = px_; canvas.height = py_;
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);       // device pixels, so the picture lands 1:1 on the screen
  offc.width = px_; offc.height = py_;

  const box = portraitBox.getBoundingClientRect();
  const size = Math.min(box.width, box.height) * dpr;
  const bx = (box.left - heroRect.left) * dpr + ((box.width * dpr) - size) / 2;
  const by = (box.top - heroRect.top) * dpr + ((box.height * dpr) - size) / 2;
  const circle = { x: bx + size / 2, y: by + size / 2, r: size / 2 };

  const sc = Math.min(size / subject.w, size / subject.h);
  const dw = Math.round(portraitImg.naturalWidth * sc), dh = Math.round(portraitImg.naturalHeight * sc);
  const dx = Math.round(bx + size / 2 - (subject.x + subject.w / 2) * sc);
  const dy0 = Math.round(by + size / 2 - (subject.y + subject.h / 2) * sc);

  const drawSource = (atY) => {
    offx.setTransform(1, 0, 0, 1, 0, 0);
    offx.clearRect(0, 0, px_, py_);
    if (MIRROR) {
      offx.save();
      offx.translate(dx + dw, atY); offx.scale(-1, 1);
      offx.drawImage(portraitImg, 0, 0, dw, dh);
      offx.restore();
    } else {
      offx.drawImage(portraitImg, dx, atY, dw, dh);
    }
  };

  // A circle is only as wide as its diameter across its MIDDLE; by the top of the box the arc has
  // closed almost to a point, so a picture merely centred in it loses the crown of the head. This
  // measures rather than guesses: rasterise once, read how wide the subject is on every row, then
  // take the smallest downward shift at which every row above the circle's centre fits inside the
  // arc at its own depth. The bottom stays free to be cut - that is what a round crop is for.
  drawSource(dy0);
  const probe = offx.getImageData(0, 0, px_, py_).data;
  const reach = new Float32Array(py_);
  const xa = clamp(dx, 0, px_ - 1), xb = clamp(dx + dw, 0, px_);
  for (let y = 0; y < py_; y++) {
    let m = -1;
    for (let x = xa; x < xb; x++) {
      if (probe[(y * px_ + x) * 4 + 3] < 16) continue;
      const e = Math.abs(x - circle.x); if (e > m) m = e;
    }
    reach[y] = m;
  }
  const topFits = (shift) => {
    for (let y = 0; y < py_; y++) {
      if (reach[y] < 0) continue;
      const yy = y + shift;
      if (yy > circle.y) break;                    // below the centre the arc only widens
      const dyc = yy - circle.y;
      if (reach[y] > Math.sqrt(Math.max(0, circle.r * circle.r - dyc * dyc))) return false;
    }
    return true;
  };
  let shift = 0;
  const maxShift = Math.round(size * 0.55);
  while (shift < maxShift && !topFits(shift)) shift += 2;
  if (shift) drawSource(dy0 + shift);

  ctx.clearRect(0, 0, px_, py_);
  ctx.save();
  ctx.beginPath(); ctx.arc(circle.x, circle.y, circle.r, 0, 6.283); ctx.clip();
  ctx.drawImage(offc, 0, 0);
  ctx.restore();
}

if (canvas && ctx) {
  portraitImg.onload = () => { subject = measureSubject(portraitImg); portraitReady = true; buildPortrait(); };
  portraitImg.src = canvas.dataset.portrait || 'portrait.png';
  // Rebuild on a real WIDTH change only. On phones the address bar collapsing while you scroll
  // fires `resize` with a new height, and redrawing there would be work for nothing.
  let rt, lastVW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastVW) return;
    lastVW = window.innerWidth;
    clearTimeout(rt); rt = setTimeout(buildPortrait, 160);
  });
}

// ---- Selected work: the scroll-driven card stack ----
// Every card rides the SAME arc, just at a different point along it. `p` is the stack's position in
// card units: p = 1.0 means card 1 is dead centre, p = 0.5 means cards 0 and 1 are halfway between
// the centre and their parked positions either side of it. Each card's own phase is f = p - i, so
// f = 0 is centred, f < 0 is still waiting on the right, f > 0 has been read and sits on the left.
//
// The arc is a circle: x = -R·sin(a), y = Rv·(1 - cos(a)) with a = f·SWING. At a = 0 that is exactly
// (0, 0) - the centre - and either side of it the card swings out AND drops, which is what makes
// the move read as one turn of a wheel rather than a slide plus a fade. The x is negated so the
// wheel turns the right way round: a card still waiting (f < 0) sits on the RIGHT and climbs in
// from there, and a card already read (f > 0) carries on down to the left.
//
// f is clamped, not cut off: a card that is two steps away parks a little further out than one that
// is a single step away, so the queue fans instead of stacking three cards on one spot.
const pstack = document.querySelector('.pstack');
if (pstack) {
  const pin = pstack.querySelector('.pstack__pin');
  const cards = Array.from(pstack.querySelectorAll('.pcard'));
  const vids = cards.map((c) => c.querySelector('.pcard__video'));

  if (cards.length && !reduced) {
    const SWING = 62;      // degrees between "centred" and "one step away"
    // How far past one step a card may park. Past ~90° the arc has stopped moving sideways and is
    // only still dropping, so the card two steps out lands BELOW the one step out rather than
    // beside it - which is the whole point: at 1.22 the two queued cards sat almost on the same
    // spot and their headlines read as one garbled block.
    const FAR = 1.5;
    const TAIL = 3.4;      // steps of scroll: one per card + 0.4 holding the last one centred
    const D2R = Math.PI / 180;
    pstack.classList.add('is-driven');

    let active = -1, pRaf = null;
    const place = () => {
      pRaf = null;
      const range = pstack.offsetHeight - pin.offsetHeight;
      if (range <= 0) return;
      const q = clamp(-pstack.getBoundingClientRect().top / range, 0, 1);
      const p = clamp(-1 + q * TAIL, -1, cards.length - 1);
      // measured off the card itself, so the arc scales with the card at every breakpoint
      const R = cards[0].offsetWidth * 0.92, RV = cards[0].offsetHeight * 0.62;

      let nearest = 0, nearestD = Infinity;
      cards.forEach((card, i) => {
        const f = clamp(p - i, -FAR, FAR);
        const a = f * SWING * D2R, s = Math.sin(a);
        const d = Math.abs(f);
        if (d < nearestD) { nearestD = d; nearest = i; }
        // |sin| alone stops separating the cards once the arc passes 90°, so anything parked beyond
        // one step keeps shrinking on |f| - that extra taper is what reads as "further back".
        const sc = 1 - 0.26 * Math.abs(s) - 0.09 * Math.max(0, d - 1);
        card.style.transform =
          `translate3d(${(-R * s).toFixed(1)}px, ${(RV * (1 - Math.cos(a))).toFixed(1)}px, 0)` +
          ` rotate(${(-f * SWING * 0.22).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        card.style.opacity = (1 - 0.34 * Math.abs(s)).toFixed(3);
        card.style.zIndex = String(20 - Math.round(d * 10));
      });

      // only the centred card is interactive, and only its video runs - three hero videos playing
      // at once behind a page that is also drawing a particle canvas is not a trade worth making
      if (nearest !== active) {
        active = nearest;
        cards.forEach((card, i) => card.classList.toggle('is-active', i === active));
        vids.forEach((v, i) => {
          if (!v) return;
          if (i === active) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
          else v.pause();
        });
      }
    };
    const onPStack = () => { if (pRaf === null) pRaf = requestAnimationFrame(place); };
    window.addEventListener('scroll', onPStack, { passive: true });
    window.addEventListener('resize', onPStack);
    place();
  } else {
    // reduced motion: the section is a plain column (no .is-driven), so every card is simply there
    cards.forEach((c) => c.classList.add('is-active'));
  }
}

// ---- Hero scroll parallax + card grow/fade + shadow-fade ----
function onFrame() {
  const vh = window.innerHeight;
  const y = window.scrollY;
  // The greeting used to dissolve within 90px of scroll, the way the case-study hero titles do.
  // It does not any more - Yehuda wants it readable the whole way down.
  cases.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const enter = clamp((vh - rect.top) / (vh - vh * 0.18), 0, 1);
    card.style.setProperty('--card-scale', (0.33 + 0.67 * enter).toFixed(3));
    card.style.setProperty('--card-opacity', clamp((vh - rect.top) / (vh * 0.3), 0, 1).toFixed(3));
  });
  for (let i = 0; i < cases.length; i++) {
    let sh = 1;
    if (cases[i + 1]) {
      const cur = cases[i].getBoundingClientRect();
      const next = cases[i + 1].getBoundingClientRect();
      sh = 1 - clamp((cur.bottom - next.top) / 60, 0, 1);
    }
    const inner = cases[i].querySelector('.case__inner');
    if (inner) inner.style.setProperty('--sh', sh.toFixed(3));
  }
}
if (!reduced) {
  let ticking = false;
  const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { onFrame(); ticking = false; }); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onFrame);
  onFrame();
} else {
  cases.forEach((c) => { c.style.setProperty('--card-scale', '1'); c.style.setProperty('--card-opacity', '1'); });
}

// ---- Glimpse: 3D mouse parallax on the photos ----
const glimpse = document.querySelector('[data-glimpse]');
if (glimpse && !reduced) {
  // The rect and each photo's inner element are resolved ONCE, not on every pointer move: this
  // handler writes transforms, so re-reading layout on the next move forced a full style+layout
  // flush every time (read → write → read → write), which is exactly the kind of thrash that shows
  // up as the mouse feeling heavy over this section.
  const depthFigs = Array.from(glimpse.querySelectorAll('[data-depth]'))
    .map((fig) => ({ inner: fig.querySelector('img, svg'), d: parseFloat(fig.dataset.depth) || 20 }))
    .filter((f) => f.inner);
  let gr = null;
  const dropGlimpseRect = () => { gr = null; };
  addEventListener('scroll', dropGlimpseRect, { passive: true });
  addEventListener('resize', dropGlimpseRect, { passive: true });

  glimpse.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = gr || (gr = glimpse.getBoundingClientRect());
    const mx = (e.clientX - r.left) / r.width - 0.5;
    const my = (e.clientY - r.top) / r.height - 0.5;
    for (const f of depthFigs) {
      f.inner.style.transform =
        `scale(1.12) translate(${(-mx * f.d).toFixed(1)}px, ${(-my * f.d).toFixed(1)}px) rotateX(${(-my * 5).toFixed(2)}deg) rotateY(${(mx * 5).toFixed(2)}deg)`;
    }
  }, { passive: true });
  glimpse.addEventListener('pointerleave', () => {
    for (const f of depthFigs) f.inner.style.transform = 'scale(1.12)';
  });
}

// ---- Scroll reveal ----
const revealEls = document.querySelectorAll('.reveal, .glimpse__anim');
if (reduced || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); } });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => io.observe(el));
}

// ---- (JS smooth wheel-scroll removed - reverted to native scrolling; it could stall) ----

// ---- Custom round cursor (fine-pointer devices only) ----
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  document.documentElement.classList.add('has-cursor');   // hide native cursor only once the dot exists

  const interactive = 'a, button, [role="button"], input, textarea, label, summary, .tl-ucard, .case, .tl-scard';
  let mx = innerWidth / 2, my = innerHeight / 2;
  let shown = false, inside = true, hover = false, down = false;
  let cs = 1, raf = null;
  // The ring sits EXACTLY on the pointer. It used to ease toward it at 0.2/frame, which closes
  // only 20% of the gap per frame - ~350ms to catch up after a fast flick - and since the native
  // cursor is hidden site-wide, that trail read as the whole interface lagging. Position is now
  // written straight from the mousemove event, in the same frame the browser delivers it.
  const targetS = () => (hover ? 1.7 : 1) * (down ? 0.82 : 1);

  const render = () => {
    // this used to stand down behind `html.hero-ava-on`, while the header photo was out over the
    // portrait standing in for it. Nothing sets that class any more.
    dot.style.opacity = (shown && inside) ? '1' : '0';
    dot.classList.toggle('is-hover', hover);
    dot.style.transform = `translate3d(${(mx - 12.5).toFixed(2)}px, ${(my - 12.5).toFixed(2)}px, 0) scale(${cs.toFixed(3)})`;
  };

  // Only the SCALE is animated, and only while it is actually settling - no permanent rAF loop
  // sitting between the pointer and the screen. It is quick enough (~5 frames) to read as instant.
  const scaleEase = reduced ? 1 : 0.45;
  const settle = () => {
    const t = targetS();
    cs += (t - cs) * scaleEase;
    if (Math.abs(t - cs) < 0.003) { cs = t; raf = null; } else { raf = requestAnimationFrame(settle); }
    render();
  };
  const kick = () => { if (raf === null) raf = requestAnimationFrame(settle); };

  addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; shown = true; render(); }, { passive: true });
  // render() FIRST in each of these, so the state change (the hover tint, the press) is on screen
  // in the same event - kick() only starts the scale easing behind it. Waiting for the rAF to do
  // both would put a frame of delay on every hover, which is the thing being fixed here.
  addEventListener('mouseover', (e) => {
    const h = !!(e.target.closest && e.target.closest(interactive));
    if (h !== hover) { hover = h; render(); kick(); }
  }, { passive: true });
  document.addEventListener('mouseleave', () => { inside = false; render(); });
  document.addEventListener('mouseenter', () => { inside = true; render(); });
  addEventListener('mousedown', () => { down = true; render(); kick(); });
  addEventListener('mouseup', () => { down = false; render(); kick(); });
  render();
})();

// ---- "Back to top" links actually scroll to the top (the #top anchor sits on the fixed header, so it alone won't) ----
document.querySelectorAll('a[href="#top"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
});

// ---- Arriving from a case study on "index.html#top": land on the very first pixel ----
// Every way back to the homepage - the header avatar, "Home" in the nav and the drawer, and the
// "Back to all work" link that closes each case study - points here. On a phone that landing kept
// coming out approximate: #top resolves against the FIXED header, the browser restores its own
// scroll on a reload, and the page keeps growing for a second or two after it opens (the hero
// wordmark canvas measures itself once the display font is ready, the tile images decode). So the
// top is HELD rather than jumped to, and the first real scroll input from the reader releases it.
(function () {
  if (location.hash !== '#top') return;
  // The hash has done its whole job the moment we know it was there, so drop it from the address
  // bar right away: the reader gets a plain "/" while the pin below still holds the top. Safe
  // because nothing past this line reads location.hash again, and replaceState adds no history
  // entry, so Back still returns to the case study. #work / #about / #contact are left alone -
  // those name a real section and are worth sharing; "#top" only ever meant "the top", which is
  // what "/" already says.
  history.replaceState(history.state, '', location.pathname + location.search);
  const hadRestore = 'scrollRestoration' in history;
  if (hadRestore) history.scrollRestoration = 'manual';
  let live = true;
  const pin = () => { if (live && window.scrollY !== 0) window.scrollTo(0, 0); };
  const iv = setInterval(pin, 100);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(pin) : null;
  if (ro) ro.observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pin).catch(() => {});
  window.addEventListener('load', pin);
  const end = () => {
    if (!live) return;
    live = false; clearInterval(iv); if (ro) ro.disconnect();
    if (hadRestore) history.scrollRestoration = 'auto';
  };
  setTimeout(end, 3000);
  ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, end, { passive: true, once: true }));
  pin();
})();

// ---- "Let's work together" lands on the footer's top rule ----
// Every Contact button - here and on the case studies (index.html#contact) - aims at the last
// section on the page. The landing spot is the line the rings pile up on: the footer's top edge
// sits exactly at the bottom of the screen, so the whole pile is in frame and the footer itself
// stays below the fold.
(function () {
  const contact = document.querySelector('#contact');
  const foot = document.querySelector('.foot');
  if (!contact || !foot) return;

  // scroll position that puts the footer's top rule on the bottom edge of the viewport
  const footLine = () => {
    const top = foot.getBoundingClientRect().top + window.scrollY - window.innerHeight;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(Math.round(top), Math.round(max)));
  };

  // The page keeps growing for a moment after it opens - lazy photos decode, the wordmark canvas
  // sizes itself once the display font is ready - and every one of those pushes the footer down.
  // So the landing is HELD: re-aimed on each height change until the page is still. The first real
  // scroll from the reader ends the hold, so nothing is ever pulled out from under them.
  let release = null;
  function hold() {
    if (release) release();
    let live = true;
    const settle = () => {
      if (!live) return;
      const t = footLine();
      if (Math.abs(window.scrollY - t) > 1) window.scrollTo(0, t);
    };
    // Height changes are the thing that matters, so watch for them rather than guessing a
    // duration: a lazy photo can decode long after load on a slow connection, and every one of
    // them pushes the footer down. The observer costs nothing while the page is still.
    const ro = 'ResizeObserver' in window ? new ResizeObserver(settle) : null;
    if (ro) ro.observe(document.body);
    // A ticker as well as the observer: the growth and the correcting scroll can land on either
    // side of a frame, and a tick that is already in the right place costs nothing.
    const iv = setInterval(settle, 200);
    // the known cause of the page growing after it opens: the wordmark canvas measures itself
    // once the display font is ready, and that alone moves the footer down a couple of hundred px
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle).catch(() => {});
    const end = () => { live = false; if (ro) ro.disconnect(); clearInterval(iv); release = null; };
    setTimeout(end, 6000);
    // Only a real scroll input ends the hold. Position alone can't be the test: the browser does
    // its own jump to #contact after load, which lands at the page bottom - treating that as "the
    // reader moved" left the landing exactly where it wasn't wanted. Pointer/mouse-down are not
    // enders either: a stray tap or focus click would cut the hold before the page settles.
    ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, end, { passive: true, once: true }));
    release = end;
    settle();
  }

  document.querySelectorAll('a[href="#contact"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (history.replaceState) history.replaceState(null, '', '#contact');
      const target = footLine();
      window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
      // a smooth scroll asked for from a click is sometimes dropped - land it either way, then
      // hold it (the hold starts late so it doesn't fight the glide)
      setTimeout(() => { if (Math.abs(window.scrollY - target) > 40) window.scrollTo(0, footLine()); }, 420);
      setTimeout(hold, 800);
    });
  });

  // Arriving from another page. The hash is not always present the moment this runs - some
  // browsers apply the fragment after the document is parsed - so this listens for it as well as
  // reading it, and re-aims on load once the images have decoded and the page has stopped growing.
  const arrive = () => { if (location.hash === '#contact') hold(); };
  arrive();
  window.addEventListener('hashchange', arrive);
  window.addEventListener('load', arrive);
})();

// ---- Page-foot rings: 1350 lilac circles that pile up ON the footer's top rule ----
// The canvas is absolutely positioned and painted BEHIND all content (z-index -1), so it adds
// no height and changes no layout. Physics: gravity, wall/floor bounce, circle-to-circle
// collision through a flat linked-list grid (a Map of string keys is far too slow at this count),
// and a cursor that only moves a circle on ACTUAL contact - a swept segment test, so fast flicks
// can't tunnel past. Nothing caps them upward: a hard enough hit throws them clean off screen.
(function () {
  const foot = document.querySelector('.foot');
  if (!foot) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'foot__dots';
  canvas.setAttribute('aria-hidden', 'true');
  foot.prepend(canvas);
  const ctx = canvas.getContext('2d');

  // A third of what it was on both sizes, and a third again on phones - the pile now stands
  // ~50px over the footer rule instead of burying the links above it.
  const PHONE = window.matchMedia('(max-width: 700px)').matches;
  const COUNT = PHONE ? 150 : 450;
  const N_24 = PHONE ? 5 : 15, N_16 = Math.round(COUNT / 3), N_12 = PHONE ? 6 : 17;
  const N_FILLED = PHONE ? 11 : 34;
  const G = 0.32, AIR = 0.994, REST = 0.28, FLOOR_FRICTION = 0.86;
  const HUE = '119, 63, 156';
  const CELL = 26;                       // >= the largest diameter, so 3x3 neighbours suffice
  // A ring that has barely CHANGED POSITION for this many frames is parked: no gravity, no
  // integration, no collision response. Without it every resting ring keeps taking a gravity
  // step that its neighbours immediately undo - motionless on paper, shimmering on screen.
  // The test has to be displacement, not velocity: a supported ring carries vy ≈ G forever.
  // SLEEP_D has to tolerate the slow sink a position-based solver leaves in a stack (each
  // resting ring gives back only half its overlap per frame); WAKE_D is real travel, the only
  // thing allowed to wake a parked neighbour - otherwise that jitter cascades through the pile.
  const SLEEP_AFTER = 16, SLEEP_D = 0.55, WAKE_D = 0.9;
  const ITER = 3;                        // contact-solver sweeps per frame

  let W = 0, H = 0, floorY = 0, dpr = 1, parts = [], raf = null, live = false, seeded = false;
  let px0 = -9999, py0 = -9999, px1 = -9999, py1 = -9999, mvx = 0, mvy = 0;
  let cols = 0, rows = 0, head = null, next = null, awake = 1;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function layout() {
    const r = foot.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(canvas.offsetHeight || r.height));
    // they settle ON the footer's top rule, not down at the page edge
    floorY = Math.max(20, H - Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1;
    head = new Int32Array(cols * rows); next = new Int32Array(COUNT);

    if (!seeded && W > 1 && H > 1) {
      seeded = true;
      const radii = [];
      for (let i = 0; i < N_24; i++) radii.push(12);          // 24px
      for (let i = 0; i < N_16; i++) radii.push(8);           // 16px
      for (let i = 0; i < N_12; i++) radii.push(6);           // 12px
      while (radii.length < COUNT) radii.push(rnd(2, 4));     // the rest stay small (4-8px)
      for (let i = radii.length - 1; i > 0; i--) {            // shuffle so sizes intermix
        const j = (Math.random() * (i + 1)) | 0;
        const t = radii[i]; radii[i] = radii[j]; radii[j] = t;
      }
      const filled = new Set();
      while (filled.size < N_FILLED) filled.add((Math.random() * COUNT) | 0);
      for (let i = 0; i < COUNT; i++) {
        const rad = radii[i];
        parts.push({
          x: rnd(rad, W - rad),
          y: rnd(Math.max(0, floorY - H * 0.42), floorY - rad),   // drop in from above the rule
          vx: rnd(-0.6, 0.6), vy: rnd(-1, 1.5), r: rad, fill: filled.has(i), z: 0, d: 9, ox: 0, oy: 0, g: 0, gN: 0
        });
      }
    }
  }

  // cached for the same reason as the others - this fires on every mouse move anywhere on the page
  let cr = null;
  const dropCanvasRect = () => { cr = null; };
  addEventListener('scroll', dropCanvasRect, { passive: true });
  addEventListener('resize', dropCanvasRect, { passive: true });

  window.addEventListener('mousemove', (e) => {
    const r = cr || (cr = canvas.getBoundingClientRect());
    const nx = e.clientX - r.left, ny = e.clientY - r.top;
    if (px1 > -9000) { mvx = nx - px1; mvy = ny - py1; }
    px0 = px1; py0 = py1; px1 = nx; py1 = ny;
    if (px0 < -9000) { px0 = px1; py0 = py1; }
  }, { passive: true });

  function step() {
    const speed = Math.hypot(mvx, mvy);
    const sdx = px1 - px0, sdy = py1 - py0, L2 = sdx * sdx + sdy * sdy;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.ox = p.x; p.oy = p.y;                             // where it stood when the frame began
      if (px1 > -9000) {                                  // contact only - no force field
        let t = L2 > 0 ? ((p.x - px0) * sdx + (p.y - py0) * sdy) / L2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ox = p.x - (px0 + t * sdx), oy = p.y - (py0 + t * sdy);
        const d = Math.hypot(ox, oy), reach = p.r + 1.5;
        if (d < reach) {
          const dd = d || 0.001, nx = ox / dd, ny = oy / dd;
          const f = 1.1 + Math.min(34, speed) * 0.85;
          p.vx += nx * f + mvx * 0.5;
          p.vy += ny * f + mvy * 0.5;
          p.x += nx * (reach - dd); p.y += ny * (reach - dd);
          p.z = 0;                                        // touched → wide awake
        }
      }
      if (p.z >= SLEEP_AFTER) continue;                   // parked: gravity can't nudge it either
      // A ring standing on ground - the floor, or a ring that is itself standing on ground - gets
      // only a trace of gravity. Position-only contact solving can't carry a full G through six
      // layers of pile in one frame, so without this the stack sinks and springs back every frame,
      // which is exactly the shimmer. The chain matters: "touching something" is NOT support, or a
      // clump of rings still falling through the air would hold each other up in mid-flight.
      p.vy += p.g ? G * 0.1 : G;
      p.gN = 0;
      p.vx *= AIR; p.vy *= AIR;
      p.x += p.vx; p.y += p.vy;
      if (p.x < p.r)     { p.x = p.r;     p.vx = -p.vx * 0.5; }
      if (p.x > W - p.r) { p.x = W - p.r; p.vx = -p.vx * 0.5; }
      const fl = floorY - p.r;
      if (p.y > fl) {
        p.y = fl; p.vx *= FLOOR_FRICTION; p.gN = 1;                    // the floor is ground
        // a bounce this small is invisible as motion but visible as flicker - kill it outright
        p.vy = Math.abs(p.vy) < 1.1 ? 0 : -p.vy * REST;
      }
    }

    head.fill(-1);                                        // flat grid: no per-ball string keys
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      let cx = (p.x / CELL) | 0, cy = (p.y / CELL) | 0;
      cx = cx < 0 ? 0 : cx >= cols ? cols - 1 : cx;
      cy = cy < 0 ? 0 : cy >= rows ? rows - 1 : cy;
      const c = cy * cols + cx;
      next[i] = head[c]; head[c] = i;
    }
    // Solve the contacts more than once per frame. One Gauss-Seidel sweep can't converge a pile
    // this deep - every ring has half a dozen neighbours, so a single pass leaves overlaps that
    // gravity re-opens next frame, and the whole pile simmers instead of coming to rest.
    for (let it = 0; it < ITER; it++) {
      const first = it === 0;
      for (let i = 0; i < parts.length; i++) {
        const a = parts[i];
        let cx = (a.x / CELL) | 0, cy = (a.y / CELL) | 0;
        cx = cx < 0 ? 0 : cx >= cols ? cols - 1 : cx;
        cy = cy < 0 ? 0 : cy >= rows ? rows - 1 : cy;
        for (let ox = -1; ox <= 1; ox++) {
          const gx = cx + ox; if (gx < 0 || gx >= cols) continue;
          for (let oy = -1; oy <= 1; oy++) {
            const gy = cy + oy; if (gy < 0 || gy >= rows) continue;
            for (let j = head[gy * cols + gx]; j !== -1; j = next[j]) {
              if (j <= i) continue;
              const b = parts[j];
              // two parked rings are already resting against each other - re-solving that contact
              // every frame is what made the settled pile crawl and shimmer
              if (a.z >= SLEEP_AFTER && b.z >= SLEEP_AFTER) continue;
              const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
              const d2 = dx * dx + dy * dy;
              if (d2 > 0.0001 && d2 < min * min) {
                // only a ring that actually TRAVELLED last frame may wake a parked neighbour;
                // resting contact must not keep resetting the counter, or the pile never settles.
                if (a.d > WAKE_D) b.z = 0; else if (b.d > WAKE_D) a.z = 0;
                const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, push = (min - d) * 0.5;
                // ground propagates upward one layer per frame: b holds a up only if b is itself held
                if (ny > 0.5) { if (b.g) a.gN = 1; } else if (ny < -0.5) { if (a.g) b.gN = 1; }
                a.x -= nx * push; a.y -= ny * push;
                b.x += nx * push; b.y += ny * push;
                if (!first) continue;                    // velocities are settled on the first sweep only
                const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                if (rel < 0) {
                  const imp = rel * 0.5;                 // dead stop along the normal: no bounce to feed
                  a.vx += nx * imp; a.vy += ny * imp;
                  b.vx -= nx * imp; b.vy -= ny * imp;
                  const tx = -ny, ty = nx;               // ...and a little friction across it
                  const rt = ((b.vx - a.vx) * tx + (b.vy - a.vy) * ty) * 0.16;
                  a.vx += tx * rt; a.vy += ty * rt;
                  b.vx -= tx * rt; b.vy -= ty * rt;
                }
              }
            }
          }
        }
      }
    }
    // settle pass - measured AFTER collisions, so a ring that gravity pushed down and its
    // neighbour pushed straight back up counts as having gone nowhere, and can finally park.
    awake = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.d = Math.abs(p.x - p.ox) + Math.abs(p.y - p.oy);
      p.g = p.gN;
      // Only a ring standing on ground may settle. Below the threshold it is just jittering, so
      // bleed its speed away hard - that is what lets the counter actually reach SLEEP_AFTER
      // instead of hovering under it. Anything still in the air keeps falling, however slowly.
      if (p.g && p.d < SLEEP_D) { if (p.z < SLEEP_AFTER) p.z++; p.vx *= 0.5; p.vy *= 0.5; } else p.z = 0;
      if (p.z < SLEEP_AFTER) awake++; else { p.vx = 0; p.vy = 0; }
    }
    mvx *= 0.7; mvy *= 0.7;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(' + HUE + ', 0.5)';
    ctx.fillStyle = 'rgba(' + HUE + ', 0.5)';
    ctx.beginPath();                                   // one path for every ring, one stroke call
    for (const p of parts) {
      if (p.fill || p.y < -40) continue;
      ctx.moveTo(p.x + p.r, p.y); ctx.arc(p.x, p.y, p.r, 0, 6.283);
    }
    ctx.stroke();
    ctx.beginPath();                                   // ...and one for the solid ones
    for (const p of parts) {
      if (!p.fill || p.y < -40) continue;
      ctx.moveTo(p.x + p.r, p.y); ctx.arc(p.x, p.y, p.r, 0, 6.283);
    }
    ctx.fill();
  }

  // Once every ring is parked the frame is final: stop drawing entirely (a settled pile that keeps
  // re-rendering is both the flicker and a pointless battery drain). Any real input wakes it again.
  function loop() {
    step(); draw();
    raf = (live && (awake > 0 || pointerLive)) ? requestAnimationFrame(loop) : null;
    pointerLive = false;
  }
  let pointerLive = false;
  const wake = () => { pointerLive = true; if (live && !raf) raf = requestAnimationFrame(loop); };

  layout();
  if (reduced) { draw(); return; }
  window.addEventListener('resize', () => { layout(); if (!raf) draw(); wake(); });
  window.addEventListener('mousemove', wake, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        live = en.isIntersecting;
        if (live && !raf) { layout(); raf = requestAnimationFrame(loop); }
      });
    }, { rootMargin: '250px' }).observe(foot);
  } else { live = true; raf = requestAnimationFrame(loop); }
})();

// ---- Keep the address bar clean, even when the visitor arrived on an old ".html" link ----
// GitHub Pages serves /bianca and /bianca.html as the same page, and every link on the site now
// points at the short form. But links shared before the custom domain went up still carry the
// extension, so tidy those in place: replaceState rewrites the address without a reload and
// without pushing a history entry, so Back still goes where the reader expects. The query and
// hash are carried over, and index.html collapses to "/".
(function () {
  const p = location.pathname;
  if (!p.endsWith('.html')) return;
  const clean = p === '/index.html' ? '/' : p.slice(0, -5);
  history.replaceState(history.state, '', clean + location.search + location.hash);
})();

// ---- Opening confetti: coloured paper, cut and dropped ----
// Vector shapes on a canvas, not images: rectangles, triangles and thin ribbons, each turning on
// its own axis. The `scale(1, cos t)` is the whole trick - it squashes the shape to nothing and
// back as it falls, which is a flat scrap of paper turning edge-on to you.
//
// The random numbers come from a SEEDED generator, so the drop is identical on every load rather
// than a different shower each time. Same reason the halo starts on a fixed point: the opening of
// the page is a composition, and a composition that re-rolls itself cannot be judged or tuned.
(function () {
  if (reduced) return;
  const COUNT = 280, LIFE = 2200, FADE = 400;
  // Brighter and warmer than the first set, and no longer anchored to the site's purple: a party
  // palette - coral, tangerine, marigold, mint, jade, sky, violet, magenta.
  const COLORS = ['#FF6B57', '#FF9A3C', '#FFC93C', '#FFE66D', '#3FD6A0',
                  '#17B890', '#3FA9F5', '#7B5CFF', '#B575DF', '#FF5E9C'];
  // mulberry32 - small, fast, and the same sequence every time
  let seed = 0x9E3779B9;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const cv = document.createElement('canvas');
  cv.className = 'confetti'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const c = cv.getContext('2d');
  let W = 0, H = 0;
  const size = () => {
    const dp = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dp); cv.height = Math.round(H * dp);
    c.setTransform(dp, 0, 0, dp, 0, 0);
  };
  size();
  window.addEventListener('resize', size);

  const bits = [];
  for (let i = 0; i < COUNT; i++) {
    const kind = rnd();
    bits.push({
      // Spread over a band that STARTS on screen and reaches one and a half screens above it. The
      // first version began entirely above the fold, so the opening half second was a thin trickle
      // before the shower arrived; this way the screen is populated from the first frame.
      x: rnd() * W,
      y: H * 0.25 - rnd() * H * 1.75,
      w: 6 + rnd() * 9, h: 10 + rnd() * 16,
      col: COLORS[(rnd() * COLORS.length) | 0],
      vy: 210 + rnd() * 240, vx: (rnd() - 0.5) * 60,
      sway: 14 + rnd() * 40, swayR: 0.6 + rnd() * 1.5, ph: rnd() * 6.283,
      rot: rnd() * 6.283, vr: (rnd() - 0.5) * 4.4,
      flip: 0.7 + rnd() * 2.1,
      kind: kind < 0.2 ? 2 : (kind < 0.46 ? 1 : 0)   // 0 rectangle, 1 triangle, 2 ribbon
    });
  }

  const t0 = performance.now();
  const frame = (now) => {
    const t = (now - t0) / 1000, life = now - t0;
    c.clearRect(0, 0, W, H);
    let alive = 0;
    const fade = life > LIFE - FADE ? clamp(1 - (life - (LIFE - FADE)) / FADE, 0, 1) : 1;
    for (let i = 0; i < bits.length; i++) {
      const b = bits[i];
      const y = b.y + b.vy * t + 95 * t * t;
      if (y > H + 40) continue;
      alive++;
      const x = b.x + b.vx * t + Math.sin(t * b.swayR + b.ph) * b.sway;
      c.save();
      c.translate(x, y);
      c.rotate(b.rot + b.vr * t);
      c.scale(1, Math.cos(t * b.flip + b.ph));
      c.globalAlpha = fade;
      c.fillStyle = b.col;
      if (b.kind === 1) {
        c.beginPath(); c.moveTo(0, -b.h / 2); c.lineTo(b.w / 2, b.h / 2); c.lineTo(-b.w / 2, b.h / 2);
        c.closePath(); c.fill();
      } else if (b.kind === 2) {
        c.fillRect(-b.w / 6, -b.h * 0.8, b.w / 3, b.h * 1.6);   // a long thin streamer
      } else {
        c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      }
      c.restore();
    }
    if (alive && life < LIFE) requestAnimationFrame(frame);
    else cv.remove();
  };
  requestAnimationFrame(frame);
})();
