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


// ---- The tool wave is not on this page ----
// It belongs to the portrait hero: the tiles ride a curve shaped around the portrait's circle,
// and there is no portrait here for them to ride around.

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
    // START is measured from page load, and it is deliberately late. On this page the line above
    // it finishes settling at 2.85s (1.9s delay + 0.95s rise), so this waits a beat after that -
    // the reader takes in the sentence above before anything moves down here. CPS is the pace, and
    // it is a slow hand on purpose. Nothing is visible in the meantime - not even the caret, which
    // only appears with the first character (see .is-typing).
    const START = 3800, CPS = 26;
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
  }
}

const line2 = document.querySelector('.hero__line--2');
const cursorEl = document.querySelector('.hero__cursor');
const hdrAvatar = document.querySelector('.hdr__avatar');
const hdrAvatarImg = document.querySelector('.hdr__avatar-img');

// ---- The pink halo, pinned ----
// In the original there were two of these and both roamed the hero on a slow rAF loop: a grey one
// at the top left and this violet-rose one behind the wordmark. The grey one is gone, and this one
// no longer drifts - it is placed once, behind the line, and stays exactly there.

// ---- The line as living particles across the whole hero ----
// This is the original engine, restored verbatim from the version that carried the site before the
// portrait replaced it. The type is rendered off-screen in Hanken Grotesk, sampled on a 2-3px grid,
// and every ink pixel becomes a dot that flies in from a random bearing at a random distance. It
// keeps all three behaviours that belonged to it:
//   - a staggered, eased ENTRY out of a scatter,
//   - a scroll-driven EXIT: the same scatter run backwards as the page moves, biased downward so
//     the dots gather below and fade out over the last stretch of the canvas,
//   - and the hover: the header photo flies down to the cursor, the letter under it toggles purple
//     and stays purple, and the dots of that letter lift and are pushed aside by the pointer.
const TEXT = canvas ? (canvas.dataset.dots || 'UX/UI Designer') : '';
const ctx = canvas ? canvas.getContext('2d') : null;
const offc = document.createElement('canvas');
const offx = offc.getContext('2d', { willReadFrequently: true });
let dots = [], letters = [], letterHot = [], letterOn = [], letterLift = [], cw = 0, ch = 0, dotR = 3;
// 0.52 is Yehuda's tuned weight for the line at its full size. Small type carries fewer dots per
// stroke, so at that size the same alpha reads as a whisper - see the note in buildDots.
let inkAlpha = 0.52;
// Square dots instead of round ones - only at phone size; see the note in makeSprites.
let squareDots = false;
let textRight = 0, textMidY = 0, textH = 0, entryStart = 0, hoverLetter = -1;
let inkSprite = null, purpleSprite = null, spriteSize = 0;
let mouseHX = -9999, mouseHY = -9999;   // cursor in hero coords (for the letter "push")

// Pre-render the dot + the purple dot once, then blit with drawImage (fast, no per-frame arc)
function makeSprites() {
  const S = 2;
  spriteSize = Math.ceil(dotR * 2 + 2);
  inkSprite = document.createElement('canvas');
  inkSprite.width = inkSprite.height = spriteSize * S;
  const ic = inkSprite.getContext('2d'); ic.scale(S, S);
  // The ink sits back. Opacity is baked into the SPRITE rather than applied per draw, because the
  // draw loop already spends its alpha on the foot-fade and a second multiply per dot would cost a
  // state change on every one of them. The purple below stays at full strength - the point of the
  // hover is that the letter you touch comes forward out of a quieter line.
  ic.fillStyle = `rgba(24,22,15,${inkAlpha})`;
  // A CIRCLE is the dot everywhere the line is big. At phone size it is the reason the sentence
  // reads furry: a 2px circle is mostly its own antialiased rim, so every letter gets a soft halo
  // instead of an edge, and a stroke two dots wide is then all halo. A square of the same size is
  // the same amount of ink with a hard edge, and it lands on the pixel grid instead of across it.
  if (squareDots) ic.fillRect(spriteSize / 2 - dotR, spriteSize / 2 - dotR, dotR * 2, dotR * 2);
  else { ic.beginPath(); ic.arc(spriteSize / 2, spriteSize / 2, dotR, 0, 6.283); ic.fill(); }

  purpleSprite = document.createElement('canvas');
  purpleSprite.width = purpleSprite.height = spriteSize * S;
  const pc = purpleSprite.getContext('2d'); pc.scale(S, S);
  pc.fillStyle = '#B575DF';
  pc.beginPath(); pc.arc(spriteSize / 2, spriteSize / 2, dotR, 0, 6.283); pc.fill();
}

function buildDots() {
  if (!canvas || !ctx || !hero || !line2) return;
  const heroRect = hero.getBoundingClientRect();
  const prevCw = cw;
  cw = Math.round(heroRect.width);
  // the canvas runs past the foot of the hero so the scattering dots have somewhere to go; they
  // self-fade over the last stretch of it (see FADE in drawDots) rather than being cut off
  const extraBelow = 240;
  ch = Math.round(heroRect.height) + extraBelow;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  offc.width = cw; offc.height = ch;

  const maxW = (line2.clientWidth || cw) - 6;
  const fontAt = (px) => `700 ${px}px 'Hanken Grotesk', system-ui, sans-serif`;
  // width of a string at 100px, so a fitted size is one division rather than a search
  const w100 = (s) => { offx.font = fontAt(100); return offx.measureText(s).width; };
  // the size at which the WIDEST of these lines exactly fills the column
  const fitFor = (parts) => (maxW / Math.max(...parts.map(w100))) * 100;

  // Split the words into n lines, balanced: of every way to cut the word list into n runs, take
  // the one whose widest run is narrowest. Four words and at most three lines, so this is a
  // handful of comparisons - no need for anything cleverer.
  const words = TEXT.split(' ');
  const splitInto = (n) => {
    if (n <= 1 || words.length < n) return [TEXT];
    let best = null, bestW = Infinity;
    const cuts = (start, left, acc) => {
      if (left === 1) {
        const parts = acc.concat([words.slice(start).join(' ')]);
        const w = Math.max(...parts.map(w100));
        if (w < bestW) { bestW = w; best = parts; }
        return;
      }
      for (let i = start + 1; i <= words.length - left + 1; i++)
        cuts(i, left - 1, acc.concat([words.slice(start, i).join(' ')]));
    };
    cuts(0, n, []);
    return best;
  };

  // ---- How many lines. -------------------------------------------------------------------
  // ONE line, at every width. It was briefly wrapped to two on a phone to buy bigger letters, and
  // that is not the design - the sentence is one line. What makes it readable down there is the
  // grid and the ink below, not the type size. The wrapping machinery is kept because it is what
  // guarantees the line fits the column at all; the floor is simply never reached.
  const READABLE_FS = 0;
  let lineTexts = [TEXT], fs = Math.min(fitFor(lineTexts), 200);
  if (fs < READABLE_FS) { lineTexts = splitInto(2); fs = Math.min(fitFor(lineTexts), 200); }
  const setFont = (c) => { c.font = fontAt(fs); };
  setFont(offx);

  // The box the type is drawn into. 1.28 gave it a quarter of a line of air above and below, which
  // read as spacing nobody had asked for - the ink is only ~0.72em tall, so the rest was padding.
  // 1.04 keeps just enough for the descenders in "g" and "y" and nothing more.
  const lineH = Math.round(fs * 1.04);
  textH = lineH * lineTexts.length;
  line2.style.height = textH + 'px';

  const wrapRect = line2.getBoundingClientRect();
  textRight = Math.round(wrapRect.right - heroRect.left) - 2;
  const boxTop = Math.round(wrapRect.top - heroRect.top);
  textMidY = Math.round(wrapRect.top + wrapRect.height / 2 - heroRect.top);

  offx.setTransform(1, 0, 0, 1, 0, 0);
  offx.clearRect(0, 0, cw, ch);
  offx.fillStyle = '#000';
  setFont(offx);
  offx.textBaseline = 'middle'; offx.textAlign = 'right';

  // Every line is right-aligned to the same edge, the way the single line always was, and each
  // letter carries its own row band as well as its column so the hover hit-test cannot pick a
  // letter sitting above or below the pointer once there is more than one line.
  letters = [];
  lineTexts.forEach((lineText, n) => {
    const midY = boxTop + lineH * n + lineH / 2;
    offx.fillText(lineText, textRight, midY);
    const leftEdge = textRight - offx.measureText(lineText).width;
    for (let i = 0; i < lineText.length; i++) {
      letters.push({ x0: leftEdge + offx.measureText(lineText.slice(0, i)).width,
                     x1: leftEdge + offx.measureText(lineText.slice(0, i + 1)).width,
                     y0: boxTop + lineH * n, y1: boxTop + lineH * (n + 1),
                     cx: 0, cy: midY });
    }
  });
  // letterHot = eased COLOUR (sticky: stays purple until the letter is touched again)
  // letterLift = eased MOTION (only while the cursor is actually on the letter)
  // letterOn   = the toggled purple state itself, preserved across rebuilds where possible
  const prevOn = letterOn;
  letterHot = new Array(letters.length).fill(0);
  letterLift = new Array(letters.length).fill(0);
  letterOn = new Array(letters.length).fill(0).map((v, i) => (prevOn && prevOn[i]) || 0);

  const data = offx.getImageData(0, 0, cw, ch).data;
  // ---- Density and ink, which are what decide whether the line READS. ---------------------
  // The grid is deliberately open - Yehuda asked for fewer dots and a lighter ink, and at the
  // line's full size that is what gives it its character: a word drawn IN dots rather than solid
  // type. But the stride was a fixed 3px at every size, and legibility does not live in the
  // stride, it lives in how many dots land across a stroke. At ~90px that is four dots and the
  // word is unmistakable; at the ~44px a phone solves for, the same 3px grid puts barely two
  // there and the sentence dissolves. So the stride is tied to the type size instead - 90px
  // still gets 3 and anything past 130px still gets 4, exactly as tuned, while small type gets 2
  // and keeps the same dots-per-stroke the big line has.
  const small = fs < 70;
  const stepPx = small ? 2 : Math.max(3, Math.round(fs / 30));
  // Same reasoning for the ink: fewer, smaller dots per letter means less of them to carry the
  // 0.52, so the line comes out fainter than the one on a desktop rather than matching it. Phone
  // type is inked most of the way up to compensate - at ~28px there are only two dots across a
  // stroke, and they have to do on their own what a dozen do at full size.
  inkAlpha = small ? 0.8 : 0.52;
  // SMALLER dots at small type, and SQUARE ones. A round 2px dot on a 2px grid is mostly its own
  // antialiased rim, so at phone size every stroke came out as a soft mass with a furry outline
  // rather than a letter with an edge. 1.7px squares are very slightly apart, each lands as its
  // own mark on the pixel grid, and the edge of a stroke is drawn by where the dots ARE.
  // Three other combinations were tried and are worse, so don't rediscover them: bigger round
  // dots (furry), the same size on a 1px grid (sharp, but solid type - the dots disappear), and
  // small dots on the same 2px grid without squaring them (thin and hollow).
  dotR = small ? 0.85 : 1;
  squareDots = small;
  // The threshold stays where it is. Raising it to trim the antialiased fringe was tried and it
  // takes the mass of the stroke with it - at 28px the fringe IS a good part of the letter, and
  // without it the words come out thin and broken. Sharpness comes from the dot size above and
  // the grid below, not from throwing away half the glyph.
  const inkCut = 130;
  const maxDist = Math.max(ch * 0.55, 280);

  dots = [];
  for (let y = 0; y < ch; y += stepPx) {
    for (let x = 0; x < cw; x += stepPx) {
      if (data[(y * cw + x) * 4 + 3] > inkCut) {
        let li = -1;
        for (let k = 0; k < letters.length; k++) { if (x >= letters[k].x0 && x < letters[k].x1 && y >= letters[k].y0 && y < letters[k].y1) { li = k; break; } }
        const ang = Math.random() * 6.283, dist = 120 + Math.random() * maxDist;
        // bias the scatter downward so the dots gather behind what follows as you scroll
        const oyBias = dist * 0.55;
        dots.push({ hx: x, hy: y, li, ox: Math.cos(ang) * dist, oy: Math.sin(ang) * dist * 0.85 + oyBias,
                    ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.2, delay: Math.random() * 420, lx: 0, ly: 0 });
      }
    }
  }
  const sums = {};
  dots.forEach((d) => { if (d.li < 0) return; const s = sums[d.li] || (sums[d.li] = { x: 0, y: 0, n: 0 }); s.x += d.hx; s.y += d.hy; s.n++; });
  letters.forEach((L, i) => { const s = sums[i]; if (s) { L.cx = s.x / s.n; L.cy = s.y / s.n; } });
  dots.forEach((d) => { if (d.li >= 0) { const L = letters[d.li]; let vx = d.hx - L.cx, vy = d.hy - L.cy; const m = Math.hypot(vx, vy) || 1; d.lx = vx / m; d.ly = vy / m; } });

  makeSprites();
  // Fly the dots in on the FIRST build, and after that only when the width changed - a width
  // change is a real relayout (the type is re-solved and every dot has a new home), so replaying
  // the arrival there reads as intended. A height-only change must not replay it: on a phone the
  // address bar collapsing and expanding as you scroll fires `resize` with the same width over
  // and over, and the whole sentence was flying in again on every one of them. The hero is sized
  // in `svh`, so its own box does not even move when that happens - the dots simply stay put.
  if (!entryStart || cw !== prevCw) entryStart = performance.now();
}

function drawDots() {
  if (!ctx) return;
  ctx.clearRect(0, 0, cw, ch);
  const now = performance.now(), nowS = now / 1000;
  // disperse across the FULL height the canvas occupies (hero + its bleed below), so the dots are
  // still visibly drifting for as long as any of them is on screen
  const scatter = clamp(window.scrollY / Math.max(1, ch * 0.9), 0, 1);
  for (let i = 0; i < letterHot.length; i++) {
    letterHot[i]  += ((letterOn[i] ? 1 : 0) - letterHot[i]) * 0.2;          // colour - sticky
    letterLift[i] += ((i === hoverLetter ? 1 : 0) - letterLift[i]) * 0.2;   // motion - hover only
  }

  const half = spriteSize / 2, FADE = 190;   // px of self-fade at the canvas foot
  const hotDots = [];
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    const entry = easeOutCubic(clamp((now - entryStart - d.delay) / 1500, 0, 1));
    const disperse = Math.max(1 - entry, scatter);
    const wob = 1.5 * disperse;   // ambient jitter only while flying in / scattering
    const x = d.hx + d.ox * disperse + Math.sin(nowS * d.sp + d.ph) * wob;
    const y = d.hy + d.oy * disperse + Math.cos(nowS * d.sp * 0.9 + d.ph) * wob;
    const hot = d.li >= 0 ? letterHot[d.li] : 0;
    const lift = d.li >= 0 ? letterLift[d.li] : 0;
    const fade = y > ch - FADE ? clamp((ch - y) / FADE, 0, 1) : 1;
    if (fade <= 0.01) continue;
    if (hot > 0.03 || lift > 0.03) {
      d._x = x + d.lx * 11 * lift; d._y = y - 20 * lift + d.ly * 11 * lift;
      d._hot = hot; d._lift = lift; d._fade = fade; hotDots.push(d);
    } else {
      ctx.globalAlpha = fade;
      ctx.drawImage(inkSprite, x - half, y - half, spriteSize, spriteSize);
    }
  }
  for (const d of hotDots) {
    let x = d._x, y = d._y;
    const dx = x - mouseHX, dy = y - mouseHY, dd = Math.hypot(dx, dy) || 1;   // the cursor pushes them outward
    if (dd < 90) { const push = (1 - dd / 90) * 24 * d._lift; x += dx / dd * push; y += dy / dd * push; }
    ctx.globalAlpha = d._fade;          ctx.drawImage(inkSprite,    x - half, y - half, spriteSize, spriteSize);
    ctx.globalAlpha = d._hot * d._fade; ctx.drawImage(purpleSprite, x - half, y - half, spriteSize, spriteSize);
  }
  ctx.globalAlpha = 1;
  if (!reduced) requestAnimationFrame(drawDots);
}

if (canvas && ctx) {
  // Wait for ALL the webfonts, not just the one this line is set in. buildDots reads where the
  // line's box SITS, and that depends on the height of the greeting above it - so a face that is
  // still swapping anywhere in the block moves the box after the dots have already been given
  // their coordinates, and the line ends up drawn over the greeting. `fonts.ready` settles once
  // every face in use has loaded, which is the only moment the geometry is final.
  const startDots = () => { buildDots(); drawDots(); };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(startDots).catch(startDots);
  } else { startDots(); }
  // A phone fires `resize` on nearly every scroll, because the address bar collapsing changes
  // innerHeight. The hero is `100svh` so its box does not move for that, and rebuilding when
  // nothing has actually moved is pure churn - so the geometry is compared first and a resize
  // that changes neither the hero's width nor its height does nothing at all.
  let rt, lastW = -1, lastH = -1;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const r = hero.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      if (w === lastW && h === lastH) return;
      lastW = w; lastH = h;
      buildDots();
      if (reduced) drawDots();
    }, 160);
  });
}

// ---- Only the header PHOTO flies to the cursor; per-letter toggle; Instagram-style return ----
if (hero && line2 && cursorEl && hdrAvatar && hdrAvatarImg && !reduced) {
  const SIZE = 80, HOME_S = 46 / 80, RET = 760;
  let tx = 0, ty = 0, cx = 0, cy = 0, cs = HOME_S;
  let active = false, returning = false, raf = null, homeX = 0, homeY = 0;
  let retStart = 0, rfx = 0, rfy = 0, rfs = HOME_S;

  const render = () => {
    cursorEl.style.transform = `translate(${(cx - SIZE / 2).toFixed(1)}px, ${(cy - SIZE / 2).toFixed(1)}px) scale(${cs.toFixed(3)})`;
  };
  const ts = () => (active ? 1 : HOME_S);
  const loop = () => {
    if (returning) {
      const t = clamp((performance.now() - retStart) / RET, 0, 1);
      const e = easeInOutCubic(t);
      cx = rfx + (homeX - rfx) * e;
      const baseY = rfy + (homeY - rfy) * e;
      const arc = -Math.sin(t * Math.PI) * 60;                  // soft rounded hop over the top
      const bounce = Math.sin(t * Math.PI * 3) * (1 - t) * 12;  // two gentle, damped bounces
      cy = baseY + arc + bounce;
      cs = rfs + (HOME_S - rfs) * e;
      render();
      if (t >= 1) { returning = false; cursorEl.style.opacity = '0'; hdrAvatarImg.style.opacity = ''; raf = null; return; }
      raf = requestAnimationFrame(loop); return;
    }
    cx += (tx - cx) * 0.26; cy += (ty - cy) * 0.26; cs += (ts() - cs) * 0.26;
    render();
    if (active || Math.hypot(tx - cx, ty - cy) > 0.6) { raf = requestAnimationFrame(loop); } else { raf = null; }
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  const flyOut = (x, y) => {
    const r = hdrAvatar.getBoundingClientRect();
    homeX = r.left + r.width / 2; homeY = r.top + r.height / 2;
    if (!active && !returning) { cx = homeX; cy = homeY; cs = HOME_S; render(); }
    active = true; returning = false;
    document.documentElement.classList.add('hero-ava-on');
    cursorEl.style.opacity = '1';
    hdrAvatarImg.style.opacity = '0';    // only the photo lifts off; the ring stays
    tx = x; ty = y; kick();
  };
  const flyHome = () => {
    if (!active) return;
    active = false; returning = true;
    document.documentElement.classList.remove('hero-ava-on');
    retStart = performance.now(); rfx = cx; rfy = cy; rfs = cs;
    kick();
  };

  const overLine2 = (x, y) => { const r = line2.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    if (overLine2(e.clientX, e.clientY)) {
      if (!active) flyOut(e.clientX, e.clientY); else { tx = e.clientX; ty = e.clientY; kick(); }
      const hr = hero.getBoundingClientRect();
      const lx = e.clientX - hr.left;
      mouseHX = lx; mouseHY = e.clientY - hr.top;
      let found = -1;
      const ly = e.clientY - hr.top;
      for (let k = 0; k < letters.length; k++) { if (lx >= letters[k].x0 && lx < letters[k].x1 && ly >= letters[k].y0 && ly < letters[k].y1) { found = k; break; } }
      // toggle on ENTER only: a touched letter turns purple and stays purple until touched again
      if (found !== hoverLetter) {
        if (found >= 0 && letterOn.length > found) letterOn[found] = letterOn[found] ? 0 : 1;
        hoverLetter = found;
      }
    } else {
      if (active) flyHome();
      hoverLetter = -1; mouseHX = -9999; mouseHY = -9999;
    }
  });
  window.addEventListener('blur', () => { if (active) flyHome(); hoverLetter = -1; mouseHX = -9999; mouseHY = -9999; });
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

  if (cards.length && !reduced) {
    const SWING = 62;      // degrees between "centred" and "one step away"
    // How far past one step a card may park. Past ~90° the arc has stopped moving sideways and is
    // only still dropping, so a card two steps out lands BELOW the one a step out rather than beside
    // it. This has been raised twice: at 1.22 the two queued cards sat on nearly the same spot, and
    // at 1.5 they were still close enough to read as a heap. GONE takes over from there - anything
    // further than that is simply not drawn, so a third card can never pile onto a second.
    const FAR = 2.2;
    // Fully out by GONE, easing off over the last GONE_FADE. 1.4 is not a taste value: with three
    // cards the tightest moment is p = 0.5, where they sit at 0.5, -0.5 and -1.5 - so anything at
    // 1.5 or beyond must already be at zero, or a third card shows behind the two mid-transition.
    // At 1.45 it was still surfacing at 3% opacity, which is exactly the heap this is meant to stop.
    const GONE = 1.4, GONE_FADE = 0.35;
    // steps of scroll: one per card + 0.4 holding the last one centred. Derived from the card
    // count and handed to CSS as --ptail, so adding a project to the stack needs no second edit.
    const TAIL = cards.length + 0.4;
    const D2R = Math.PI / 180;
    // The arc is a DESKTOP motion. On a phone Yehuda asked for the plain thing instead: the
    // projects simply arrive one under the other as you scroll. Below this width the driver
    // stands down completely and the section falls back to its own CSS column
    // (.pstack:not(.is-driven)), with the site's ordinary .reveal doing the arriving. Kept live
    // on resize, so turning a phone - or dragging a desktop window narrow - lands on the right
    // one either way, and every inline style the arc wrote is handed back when it stands down.
    const wide = window.matchMedia('(min-width: 761px)');
    let driven = false;

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
        // ...and faded right out once it is far enough that it would otherwise stack on its
        // neighbour. Two cards on screen at a time is the transition; three is a pile.
        const vis = clamp((GONE - d) / GONE_FADE, 0, 1);
        const op = (1 - 0.34 * Math.abs(s)) * vis;
        card.style.opacity = op.toFixed(3);
        card.style.zIndex = String(20 - Math.round(d * 10));
        // Every card you can SEE is clickable, not just the centred one. The gate is the card's own
        // opacity, so a card faded out of the arc can never sit in front of the page swallowing
        // clicks, and the z-index above still hands the click to the frontmost card where two
        // overlap. (This used to be a blanket `pointer-events:none` on :not(.is-active) in CSS.)
        card.style.pointerEvents = op > 0.15 ? 'auto' : 'none';
      });

      // .is-active still marks the CENTRED card (the arc's focal point); it no longer decides
      // what is clickable - see the pointer-events line above.
      if (nearest !== active) {
        active = nearest;
        cards.forEach((card, i) => card.classList.toggle('is-active', i === active));
      }
    };
    const onPStack = () => { if (driven && pRaf === null) pRaf = requestAnimationFrame(place); };
    const sync = () => {
      if (wide.matches === driven) return;
      driven = wide.matches;
      pstack.classList.toggle('is-driven', driven);
      if (driven) {
        pstack.style.setProperty('--ptail', String(TAIL));
        place();
      } else {
        pstack.style.removeProperty('--ptail');
        active = -1;
        cards.forEach((c) => {
          c.style.transform = ''; c.style.opacity = ''; c.style.zIndex = ''; c.style.pointerEvents = '';
          c.classList.add('is-active');
        });
      }
    };
    window.addEventListener('scroll', onPStack, { passive: true });
    window.addEventListener('resize', () => { sync(); onPStack(); });
    if (wide.addEventListener) wide.addEventListener('change', sync);
    sync();
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
    // it stands down behind `html.hero-ava-on`: while the header photo is out over the line it IS
    // the cursor, and two cursors on screen at once is one too many.
    const avaOut = document.documentElement.classList.contains('hero-ava-on');
    dot.style.opacity = (shown && inside && !avaOut) ? '1' : '0';
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
  // Opt-in, not automatic: the pile belongs to the home page only. The case studies end on their
  // own closing move ("Liked this project?" -> the hand-off) and Yehuda asked for it off there, so
  // a page asks for the rings by marking its footer `data-rings` rather than getting them for
  // simply having a .foot. Both script.js and hero-dots.js carry this same gate.
  if (!foot || !foot.hasAttribute('data-rings')) return;

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

// ---- The address-bar tidy-up is deliberately NOT on this page ----
// GitHub Pages serves /hero-dots and /hero-dots.html as one page; the local preview server
// 404s on a path with no extension, so stripping ".html" would leave a link that dies on the
// first reload.
