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
// A tap swell: out fast, back slowly. Not a sine — a sine leaves at full speed and arrives at
// full speed, which reads as a twitch. This one eases out of rest and settles back into it.
const POP_MS = 760;
const popCurve = (t) => (t <= 0 || t >= 1) ? 0
  : (t < 0.38 ? easeOutCubic(t / 0.38) : 1 - easeInOutCubic((t - 0.38) / 0.62));
// The phone's blink: smoothstep down, HOLD at ink, smoothstep back up. Smoothstep has zero slope
// at both ends, so the letter leaves and rejoins the purple without an edge — that is the soft part.
// The hold in the middle is what makes it actually reach black: the colour itself eases at
// 0.2/frame, and against a curve that only touches bottom for an instant (a plain raised cosine)
// it bottomed out around 0.32 — a wash, not a letter turning black and coming back.
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
const line2 = document.querySelector('.hero__line--2');
const heroSub = document.querySelector('.hero__sub');
const cases = Array.from(document.querySelectorAll('.case'));
const canvas = document.querySelector('.hero__dots');
const cursorEl = document.querySelector('.hero__cursor');
const hdrAvatar = document.querySelector('.hdr__avatar');
const hdrAvatarImg = document.querySelector('.hdr__avatar-img');

// Both hero loops (the wordmark dots and the drifting halos) pause the moment the hero leaves the
// viewport and resume when it comes back. There is nothing to look at while it is off screen, and
// the frames they were spending are frames the browser can hand to the pointer instead.
// They park for a second reason too: while the phone's project row is being dragged sideways.
// See the .hero-work block near the end of this file.
let heroOnScreen = true, heroBusy = false, dotsRaf = null, driftRaf = null;
// heroBusy parks the HALOS only. It used to park the wordmark canvas too, and that was wrong:
// the letters were still colouring themselves in when the row was dragged, so the animation
// visibly froze mid-sequence and picked up again afterwards. Nothing the reader is watching may
// be stopped to buy frames — the halos drift behind everything and nobody can tell.
const heroLive = () => heroOnScreen && !heroBusy;
let resumeDrift = () => {};   // assigned below, once the halos exist

// ---- Two drifting halos that roam the whole hero ----
const orbA = document.querySelector('.hero__orb--a');
const orbB = document.querySelector('.hero__orb--b');
if ((orbA || orbB) && !reduced) {
  // A translate in % is a share of the ORB, not of the screen. On a phone the orbs take a far
  // bigger share of the hero (see the max-width:700px block in the CSS), so the same percentages
  // would fling them clean off the screen and leave long dead stretches with nothing in view.
  // These factors bring the swept distance back to roughly the share of the hero it covers on
  // desktop — a bit less sideways, nearly all of the vertical, since a phone hero is tall.
  const phone = window.matchMedia('(max-width: 700px)');
  let ax = 1, ay = 1;
  const setAmp = () => { ax = phone.matches ? 0.52 : 1; ay = phone.matches ? 0.85 : 1; };
  setAmp();
  phone.addEventListener('change', setAmp);

  let t = Math.random() * 100;
  const drift = () => {
    t += 0.005;
    if (orbA) orbA.style.transform =
      `translate(${((Math.sin(t) * 70 + Math.sin(t * 0.6) * 22) * ax).toFixed(1)}%, ${(Math.cos(t * 0.8) * 42 * ay).toFixed(1)}%) scale(${(1 + Math.sin(t * 0.5) * 0.12).toFixed(3)})`;
    if (orbB) orbB.style.transform =
      `translate(${((Math.cos(t * 0.7) * 66 - 12) * ax).toFixed(1)}%, ${(Math.sin(t * 0.9) * 40 * ay).toFixed(1)}%) scale(${(1 + Math.cos(t * 0.6) * 0.14).toFixed(3)})`;
    driftRaf = heroLive() ? requestAnimationFrame(drift) : null;
  };
  driftRaf = requestAnimationFrame(drift);
  resumeDrift = () => { if (driftRaf === null) driftRaf = requestAnimationFrame(drift); };
}

// ---- "UX/UI Designer" as living particles across the whole hero ----
const TEXT = canvas ? (canvas.dataset.dots || 'UX/UI Designer') : '';
const ctx = canvas ? canvas.getContext('2d') : null;
const offc = document.createElement('canvas');
const offx = offc.getContext('2d');
let dots = [], letters = [], letterHot = [], letterOn = [], letterLift = [], cw = 0, ch = 0, dotR = 3;
// The three timestamp/value pairs below all follow the same shape: the timestamp is the input the
// scheduler writes, the value is what the frame loop derives from it through a curve.
// letterBlink = when the hint started dimming this letter, 0 when idle  → letterDim  (0..1, ink)
// letterPop   = when the tap that is swelling this letter landed, 0 when idle → letterSwell (0..1)
// letterInk   = does this index actually carry dots (false for the space)
let letterDim = [], letterBlink = [], letterPop = [], letterSwell = [], letterInk = [];
// letterTaps  = how many times this letter has been tapped, ever (not necessarily in a row)
// letterBurst = when it shattered, 0 when intact  → letterGone once the debris has flown off
let letterTaps = [], letterBurst = [], letterGone = [];
let forceDraw = true;   // set whenever something changes outside the frame loop
let lastScatter = -1;   // so the first frame always counts as a change
// The shatter runs long on purpose: the KICK is over in a couple of frames so the click lands
// instantly, and the rest of the window is the debris floating out of the canvas. BURST_STAGGER is
// the spread of per-dot start times — without it the letter leaves as one rigid slab.
const BURST_MS = 1600, BURST_STAGGER = 140;
let textRight = 0, textMidY = 0, textH = 0, entryStart = 0, hoverLetter = -1, entryDone = false;
let inkSprite = null, purpleSprite = null, hotSprite = null, spriteSize = 0;
let mouseHX = -9999, mouseHY = -9999;   // cursor in hero coords (for the letter "push")

// Pre-render the dot + glowing-dot once, then blit with drawImage (fast, no per-frame blur)
function makeSprites() {
  const S = 2;
  spriteSize = Math.ceil(dotR * 2 + 2);
  inkSprite = document.createElement('canvas');
  inkSprite.width = inkSprite.height = spriteSize * S;
  const ic = inkSprite.getContext('2d'); ic.scale(S, S);
  ic.fillStyle = 'rgba(24,22,15,1)';      // a touch more contrast than before
  ic.beginPath(); ic.arc(spriteSize / 2, spriteSize / 2, dotR, 0, 6.283); ic.fill();

  // crisp purple dot for the hovered letter — same tiny footprint, no halo/blur
  purpleSprite = document.createElement('canvas');
  purpleSprite.width = purpleSprite.height = spriteSize * S;
  const pc = purpleSprite.getContext('2d'); pc.scale(S, S);
  pc.fillStyle = '#B575DF';
  pc.beginPath(); pc.arc(spriteSize / 2, spriteSize / 2, dotR, 0, 6.283); pc.fill();

  // A fully purple dot is drawn as ink first and purple over it at alpha 1 — two draws per dot,
  // for every dot, in the state the phone sits in permanently once the wordmark has coloured
  // itself in. This bakes that pair into one sprite. It is the same composite the runtime does,
  // antialiased rim included, so it is pixel for pixel what was there before at half the calls.
  hotSprite = document.createElement('canvas');
  hotSprite.width = hotSprite.height = spriteSize * S;
  const hc = hotSprite.getContext('2d'); hc.scale(S, S);
  hc.drawImage(inkSprite, 0, 0, spriteSize, spriteSize);
  hc.drawImage(purpleSprite, 0, 0, spriteSize, spriteSize);
}

function buildDots() {
  if (!canvas || !ctx || !hero || !line2) return;
  const heroRect = hero.getBoundingClientRect();
  cw = Math.round(heroRect.width);
  // extend the canvas below the hero so scattered dots can drift down to the stats divider
  // a fixed bleed past the hero; the dots self-fade over the last stretch of the canvas
  // (see FADE in drawDots), so they dissolve on their own instead of needing a veil below
  const extraBelow = 240;
  ch = Math.round(heroRect.height) + extraBelow;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);   // render at device pixels → crisp 2px dots on retina / mobile
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  offc.width = cw; offc.height = ch;

  const vw = window.innerWidth;
  let fs = clamp(vw * 0.16, 52, 200);
  const setFont = (c) => { c.font = `700 ${fs}px 'Hanken Grotesk', system-ui, sans-serif`; };
  setFont(offx);
  const maxW = (line2.clientWidth || cw) - 6;
  let tw = offx.measureText(TEXT).width;
  if (tw > maxW) { fs = fs * (maxW / tw); setFont(offx); tw = offx.measureText(TEXT).width; }
  textH = Math.round(fs * 1.28);
  line2.style.height = textH + 'px';

  const wrapRect = line2.getBoundingClientRect();
  textRight = Math.round(wrapRect.right - heroRect.left) - 2;
  textMidY = Math.round(wrapRect.top + wrapRect.height / 2 - heroRect.top);

  offx.setTransform(1, 0, 0, 1, 0, 0);
  offx.clearRect(0, 0, cw, ch);
  offx.fillStyle = '#000';
  setFont(offx);
  offx.textBaseline = 'middle'; offx.textAlign = 'right';
  offx.fillText(TEXT, textRight, textMidY);

  letters = [];
  const leftEdge = textRight - tw;
  for (let i = 0; i < TEXT.length; i++) {
    letters.push({ x0: leftEdge + offx.measureText(TEXT.slice(0, i)).width, x1: leftEdge + offx.measureText(TEXT.slice(0, i + 1)).width, cx: 0, cy: textMidY });
  }
  // letterHot = eased COLOUR (sticky: stays purple until the letter is touched again)
  // letterLift = eased MOTION (only while the cursor is actually on the letter)
  // letterOn   = the toggled purple state itself, preserved across rebuilds where possible
  const prevOn = letterOn;
  letterHot = new Array(letters.length).fill(0);
  letterLift = new Array(letters.length).fill(0);
  letterDim = new Array(letters.length).fill(0);
  letterBlink = new Array(letters.length).fill(0);
  letterPop = new Array(letters.length).fill(0);
  letterSwell = new Array(letters.length).fill(0);
  letterBurst = new Array(letters.length).fill(0);
  // a shattered letter stays shattered — a width change rebuilds the dots, it does not undo
  // something the reader deliberately did
  const prevGone = letterGone, prevTaps = letterTaps;
  letterGone = new Array(letters.length).fill(false).map((v, i) => (prevGone && prevGone[i]) || false);
  letterTaps = new Array(letters.length).fill(0).map((v, i) => (prevTaps && prevTaps[i]) || 0);
  letterOn = new Array(letters.length).fill(0).map((v, i) => (prevOn && prevOn[i]) || 0);

  const data = offx.getImageData(0, 0, cw, ch).data;
  const stepPx = fs >= 130 ? 3 : 2;   // denser grid → ~1.8× more dots on desktop; tightest on mobile so the small type stays clear
  dotR = 1;                            // 2px dots, capped — small & crisp
  const maxDist = Math.max(ch * 0.55, 280);

  dots = [];
  for (let y = 0; y < ch; y += stepPx) {
    for (let x = 0; x < cw; x += stepPx) {
      if (data[(y * cw + x) * 4 + 3] > 130) {
        let li = -1;
        for (let k = 0; k < letters.length; k++) { if (x >= letters[k].x0 && x < letters[k].x1) { li = k; break; } }
        const ang = Math.random() * 6.283, dist = 120 + Math.random() * maxDist;
        const bang = Math.random() * 6.283, bspd = 300 + Math.random() * 800;
        // bias the scatter downward so the dots gather behind the project tiles as you scroll
        const oyBias = dist * 0.55;
        dots.push({ hx: x, hy: y, li, ox: Math.cos(ang) * dist, oy: Math.sin(ang) * dist * 0.85 + oyBias, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.2, delay: Math.random() * 420, lx: 0, ly: 0,
          // where this dot goes when its letter is shattered: its own direction, its own speed and
          // its own moment of letting go, fixed at build time so the burst is the same explosion
          // every frame it is drawn
          bx: Math.cos(bang) * bspd, by: Math.sin(bang) * bspd, bd: Math.random() * BURST_STAGGER });
      }
    }
  }
  const sums = {};
  dots.forEach((d) => { if (d.li < 0) return; const s = sums[d.li] || (sums[d.li] = { x: 0, y: 0, n: 0 }); s.x += d.hx; s.y += d.hy; s.n++; });
  letters.forEach((L, i) => { const s = sums[i]; if (s) { L.cx = s.x / s.n; L.cy = s.y / s.n; } });
  // "UX/UI Designer" has a space in it, and a space owns a slice of the line with no dots in it.
  // The phone's blink walks this list, not the raw string, so the hint never spends a beat on
  // nothing — and a tap that lands in the gap doesn't silently toggle an invisible letter.
  letterInk = letters.map((L, i) => !!sums[i]);
  dots.forEach((d) => { if (d.li >= 0) { const L = letters[d.li]; let vx = d.hx - L.cx, vy = d.hy - L.cy; const m = Math.hypot(vx, vy) || 1; d.lx = vx / m; d.ly = vy / m; } });

  makeSprites();
  // Only the FIRST build plays the fly-in. A later rebuild (a real width change) re-seats the
  // dots already assembled, so scrolling never replays the assembly animation.
  entryStart = entryDone ? performance.now() - 3000 : performance.now();
}

function drawDots() {
  if (!ctx) return;
  // NOTE: the canvas is cleared further down, only once this frame has decided it is going to
  // draw. Clearing up here would wipe the wordmark on every skipped frame and leave it blank.
  const now = performance.now(), nowS = now / 1000;
  if (!entryDone && now - entryStart > 1980) entryDone = true;   // the fly-in is a one-time event
  // disperse across the FULL height the canvas occupies (hero + its bleed under the stats bar),
  // so the dots are still visibly drifting for as long as any of them is on screen
  const scatter = clamp(window.scrollY / Math.max(1, ch * 0.9), 0, 1);
  // scatter > 0 means the dots are dispersing AND wobbling; hoverLetter / mouseHX mean a cursor
  // is working the letters. Any of those and the frame is live no matter what the letters say.
  // `scatter !== lastScatter` is the one that matters on the way back up: the frame where scatter
  // finally reaches 0 is the frame that puts every dot exactly on its letter. Testing only
  // `scatter > 0` would skip it and leave the wordmark holding its last smeared frame.
  let busy = !entryDone || scatter > 0.0005 || scatter !== lastScatter || hoverLetter >= 0 || mouseHX > -9000;
  lastScatter = scatter;
  for (let i = 0; i < letterHot.length; i++) {
    // Both of these are eased at 0.2/frame ON PURPOSE — Yehuda wants the wordmark to answer the
    // cursor slowly, so the dots swell and settle rather than snap. They were once sped up to
    // 0.5/instant to kill "lag"; that was the wrong call here and was put back. The no-lag rule
    // applies to the pointer follower (the photo), not to this.
    // The swell and the blink are properties of the LETTER, so both are resolved once a frame here
    // rather than per dot — there are a few thousand dots and only fourteen letters. They are
    // resolved BEFORE letterHot below, which consumes letterDim in the same pass; computing them
    // after would feed it last frame's value.
    letterSwell[i] = letterPop[i] ? popCurve((now - letterPop[i]) / POP_MS) : 0;
    if (letterPop[i] && now - letterPop[i] > POP_MS) letterPop[i] = 0;
    letterDim[i] = letterBlink[i] ? blinkCurve((now - letterBlink[i]) / BLINK_MS) : 0;
    if (letterBlink[i] && now - letterBlink[i] > BLINK_MS) letterBlink[i] = 0;
    // letterDim multiplies the TARGET rather than flipping letterOn, so the blink can never
    // overwrite a letter the reader has toggled themselves.
    letterHot[i]  += ((letterOn[i] ? 1 : 0) * (1 - letterDim[i]) - letterHot[i]) * 0.2;   // colour — sticky
    letterLift[i] += ((i === hoverLetter ? 1 : 0) - letterLift[i]) * 0.2;   // motion — hover only
    if (letterBurst[i] && now - letterBurst[i] > BURST_MS + BURST_STAGGER) {   // the debris has left the screen
      letterBurst[i] = 0; letterGone[i] = true; forceDraw = true;
    }
    if (letterBlink[i] || letterPop[i] || letterBurst[i] || letterLift[i] > 0.002) busy = true;
    if (Math.abs(letterHot[i] - (letterOn[i] ? 1 : 0) * (1 - letterDim[i])) > 0.002) busy = true;
  }

  // Nothing is moving: every letter has reached its colour, none is blinking, swelling or
  // shattering, the fly-in is over and the page has not scrolled — so `wob` is zero and this frame
  // would be pixel-for-pixel the last one. Re-queue without touching the canvas.
  //
  // This replaces parking the loop during a sideways drag on the row, which is what used to buy
  // those frames and cost the wordmark its animation. Skipping identical frames costs nothing
  // visible and saves far more: the canvas used to repaint ~2700 sprites every frame for as long
  // as the hero was on screen, including when it was completely still.
  if (!busy && !forceDraw) { if (!reduced && heroOnScreen) dotsRaf = requestAnimationFrame(drawDots); else dotsRaf = null; return; }
  forceDraw = false;
  ctx.clearRect(0, 0, cw, ch);

  const half = spriteSize / 2, FADE = 190;   // px of self-fade at the canvas foot
  const hotDots = [];
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    const entry = easeOutCubic(clamp((now - entryStart - d.delay) / 1500, 0, 1));
    const disperse = Math.max(1 - entry, scatter);
    const wob = 1.5 * disperse;   // ambient jitter only while flying in / scattering → dots sit perfectly still & crisp once settled
    // settled is the common case: no disperse means no offset and no jitter, so skip the two trig
    // calls per dot rather than computing a wobble that gets multiplied by zero
    const x = wob ? d.hx + d.ox * disperse + Math.sin(nowS * d.sp + d.ph) * wob : d.hx;
    const y = wob ? d.hy + d.oy * disperse + Math.cos(nowS * d.sp * 0.9 + d.ph) * wob : d.hy;
    const hot = d.li >= 0 ? letterHot[d.li] : 0;
    const lift = d.li >= 0 ? letterLift[d.li] : 0;
    const swell = d.li >= 0 ? letterSwell[d.li] : 0;
    const fade = y > ch - FADE ? clamp((ch - y) / FADE, 0, 1) : 1;
    if (fade <= 0.01) continue;
    if (d.li >= 0 && letterGone[d.li]) continue;                    // shattered — this dot is not coming back
    // Mid-shatter: the dot runs off along its own vector and fades out. Handled here rather than in
    // the hot pass below because it must ignore the swell and the hover lift entirely — it is no
    // longer part of a letter, it is debris.
    if (d.li >= 0 && letterBurst[d.li]) {
      const el = now - letterBurst[d.li] - d.bd;   // this dot's own clock — see BURST_STAGGER
      if (el > 0) {
        const bt = clamp(el / BURST_MS, 0, 1);
        // Two motions, added. `kick` spends almost all of itself in the first ~200ms: that is the
        // answer to the click, and it has to be over before the reader can register it as a delay.
        // `glide` is linear and never decays, so once the kick has spent itself the debris is still
        // travelling — it drifts out of the canvas instead of parking mid-air the way a lone
        // easeOutCubic did, which is what made the old burst read as "stopped" halfway.
        const kick = 1 - Math.pow(1 - bt, 6);
        const travel = 0.42 * kick + 0.58 * bt;
        // ...and on top of that a slow sway plus a little lift, so the flight is a float rather
        // than fourteen hundred dots on rails. Both grow with bt: nothing sways at the instant of
        // the hit, everything is drifting by the end.
        const sway = Math.sin(nowS * d.sp * 1.4 + d.ph) * 16 * bt;
        const rise = -34 * bt * bt;
        // full ink for the first half of the flight, then out — so they leave the frame rather
        // than dissolving on the spot the moment they are hit
        const a = Math.pow(clamp((1 - bt) / 0.5, 0, 1), 1.4) * fade;
        const bxp = x + d.bx * travel + sway, byp = y + d.by * travel + rise;
        ctx.globalAlpha = a;
        ctx.drawImage(inkSprite, bxp - half, byp - half, spriteSize, spriteSize);
        if (hot > 0.03) { ctx.globalAlpha = a * hot; ctx.drawImage(purpleSprite, bxp - half, byp - half, spriteSize, spriteSize); }
        continue;
      }
      // still waiting its turn — falls through and is drawn in place, part of the letter
    }
    // `swell` is in this test on purpose: a letter tapped back to ink has hot ≈ 0, and without it
    // that letter would take the flat branch below and never animate.
    if (hot > 0.03 || lift > 0.03 || swell > 0.002) {
      d._x = x + d.lx * 11 * lift; d._y = y - 20 * lift + d.ly * 11 * lift;
      d._hot = hot; d._lift = lift; d._swell = swell; d._fade = fade; hotDots.push(d);
    } else {
      ctx.globalAlpha = fade;
      ctx.drawImage(inkSprite, x - half, y - half, spriteSize, spriteSize);
    }
  }
  const cursorOn = mouseHX > -9000;   // there is no cursor on a phone: skip the push maths entirely
  for (const d of hotDots) {
    let x = d._x, y = d._y;
    // A tapped letter swells around its OWN centre. Scaling the offset from L.cx/L.cy is what
    // makes it a letter getting bigger; nudging every dot the same distance outward (which is what
    // the hover lift does, on purpose) only puffs the outline and leaves the letter the same size.
    if (d._swell > 0) {
      const L = letters[d.li], sc = 1 + 0.17 * d._swell;
      x = L.cx + (x - L.cx) * sc;
      y = L.cy + (y - L.cy) * sc;
    }
    if (cursorOn) {
      const dx = x - mouseHX, dy = y - mouseHY, dd = Math.hypot(dx, dy) || 1;   // cursor pushes the dots outward
      if (dd < 90) { const push = (1 - dd / 90) * 24 * d._lift; x += dx / dd * push; y += dy / dd * push; }
    }
    if (d._hot > 0.995) {                 // fully purple — one baked sprite instead of ink + purple
      ctx.globalAlpha = d._fade;          ctx.drawImage(hotSprite, x - half, y - half, spriteSize, spriteSize);
    } else {
      ctx.globalAlpha = d._fade;          ctx.drawImage(inkSprite,    x - half, y - half, spriteSize, spriteSize);   // crisp base
      ctx.globalAlpha = d._hot * d._fade; ctx.drawImage(purpleSprite, x - half, y - half, spriteSize, spriteSize);   // crisp purple — no blur/halo
    }
  }
  ctx.globalAlpha = 1;
  // Only keep painting while the hero is actually on screen. This used to re-queue itself
  // unconditionally, so the wordmark canvas repainted every single frame for the whole session —
  // still burning the main thread while the reader was down at the footer, which is main-thread
  // time that is not going to their mouse. The footer particles already gate themselves this way.
  if (!reduced && heroOnScreen) dotsRaf = requestAnimationFrame(drawDots); else dotsRaf = null;
}

if (canvas && ctx) {
  const startDots = () => { buildDots(); drawDots(); };
  if (document.fonts && document.fonts.load) {
    document.fonts.load("700 100px 'Hanken Grotesk'").then(startDots).catch(startDots);
  } else { startDots(); }
  // Rebuild on a real WIDTH change only. On phones the address bar collapsing while you scroll
  // fires `resize` with a new height — rebuilding there was what made the dots re-assemble
  // mid-scroll instead of just dispersing.
  let rt, lastVW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastVW) return;
    lastVW = window.innerWidth;
    clearTimeout(rt); rt = setTimeout(() => { buildDots(); if (reduced) drawDots(); }, 160);
  });
}

// ---- Park the hero's two animation loops whenever the hero is off screen ----
if (hero && !reduced && 'IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    heroOnScreen = entries[0].isIntersecting;
    if (!heroOnScreen) return;
    if (canvas && ctx && dotsRaf === null) dotsRaf = requestAnimationFrame(drawDots);
    resumeDrift();
  }, { threshold: 0 }).observe(hero);
}

// ---- Phones: hand the whole frame budget to the finger while the project row is being dragged ----
// The tile strip sits INSIDE the hero, so a sideways drag happens while the wordmark canvas and the
// two halos are both painting every frame and all three tiles are mid-breath — main-thread and
// compositor work competing with the gesture itself, which is what made the row feel stiff under the
// thumb. Same trade the observer above makes: no ambient motion is worth a frame the finger needs.
// It parks the moment a finger lands on the row and comes back 400 ms after it settles.
const workRow = document.querySelector('.hero-work');
if (workRow && !reduced) {
  let settle = null;
  // touchstart, not scroll. Waiting for the first scroll event meant the canvas and the halos were
  // still painting through the opening milliseconds of the drag — the part the hand actually
  // judges. This clears the frame budget the moment the finger lands, before anything has moved.
  const park = () => {
    heroBusy = true;
    clearTimeout(settle);
    settle = setTimeout(() => { heroBusy = false; resumeDrift(); },
      400);   // long enough to cover the coast after the finger has already left
  };
  workRow.addEventListener('touchstart', park, { passive: true });
  workRow.addEventListener('scroll', park, { passive: true });
}

// ---- Phones: the wordmark colours itself in, hints that it is tappable, then answers your finger ----
// There is no cursor to run across the letters, so the letters take the brand purple one after
// another, left to right, and after that a tap on any letter toggles it back to ink — and back to
// purple — for as long as you like.
//
// PAINT_AT is the moment the project row finishes, not a round number: the third tile starts at
// 2.26s and rises for 1.5s, so 3.76s is exactly when it lands. The wordmark takes over on that beat.
if (canvas && ctx && !reduced && hero && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const PAINT_AT = 2260 + 1500, PER_LETTER = 105;
  const LETTER_SETTLE = 600;   // the last letter's colour easing still has to finish after its turn
  const HINT_WAIT = 1500;      // ...and then the line is simply left alone for a beat
  const STEP_MS = 260, PASS_GAP = 3000;
  let hintTimers = [], tapped = false;
  const stopHint = () => { hintTimers.forEach(clearTimeout); hintTimers = []; };

  // The hint. Every other letter drops back to ink and returns, left to right — the skip is what
  // makes it read as a deliberate signal rather than the wordmark misbehaving. Each pass starts on
  // the opposite letter to the last one, so over two passes the whole line has flickered; a fixed
  // parity would mark the same half for ever and leave the rest looking dead.
  //
  // STEP_MS is deliberately shorter than BLINK_MS: each letter is still easing back up as the next
  // one starts down, so the hint travels as one soft wave instead of a row of separate flicks.
  function runHint(parity) {
    const ids = [];
    for (let i = parity; i < letters.length; i += 2) if (letterInk[i]) ids.push(i);
    if (!ids.length) return;
    // every id is kept, not just the last one: a tap has to be able to cancel the whole pass, and
    // a single `hintTimer` variable only ever remembers the timer scheduled most recently
    hintTimers = ids.map((li, n) =>
      setTimeout(() => { letterBlink[li] = performance.now(); }, n * STEP_MS));
    // the gap is measured from the end of the wave, tail included, not from the last letter's start
    hintTimers.push(setTimeout(() => {
      runHint(parity ? 0 : 1);
    }, (ids.length - 1) * STEP_MS + BLINK_MS + PASS_GAP));
  }

  setTimeout(function paintIn() {
    if (!letters.length) { setTimeout(paintIn, 200); return; }        // wait for the font/build
    letters.forEach((L, i) => setTimeout(() => { letterOn[i] = 1; }, i * PER_LETTER));
    // the hint waits for the last letter to finish taking its colour, and then waits again — the
    // line has to be allowed to just sit there fully purple before anything starts moving in it
    setTimeout(() => { if (!tapped) runHint(0); },
      (letters.length - 1) * PER_LETTER + LETTER_SETTLE + HINT_WAIT);
  }, PAINT_AT);

  hero.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !letters.length) return;
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.abs(y - textMidY) > textH * 0.55) return;                // only taps on the wordmark itself
    for (let k = 0; k < letters.length; k++) {
      if (!letterInk[k]) continue;                                    // the space is not a letter
      if (x >= letters[k].x0 && x < letters[k].x1) {
        // The hint has done its job the moment it is answered. Leaving it running would keep
        // flickering letters the reader has just set on purpose, which reads as a bug, not a cue.
        if (!tapped) {
          tapped = true;
          stopHint();
          for (let j = 0; j < letterBlink.length; j++) { letterBlink[j] = 0; letterDim[j] = 0; }
        }
        if (letterGone[k]) break;                                     // nothing left there to press
        letterTaps[k] = (letterTaps[k] || 0) + 1;
        forceDraw = true;
        if (letterTaps[k] >= 2) {
          // Second press on this letter — whenever it comes, not necessarily the next tap — and it
          // blows apart: every dot leaves on its own heading and the letter does not come back.
          letterBurst[k] = performance.now();
        } else {
          letterOn[k] = letterOn[k] ? 0 : 1;
          letterPop[k] = performance.now();                           // and it swells under the thumb
        }
        break;
      }
    }
  }, { passive: true });
}

// ---- Hero scroll parallax + card grow/fade + shadow-fade ----
function onFrame() {
  const vh = window.innerHeight;
  const y = window.scrollY;
  if (line1) {
    // dissolves fast on scroll — the same move the Bianca / Talmind hero titles make,
    // instead of sliding sideways and staying fully legible the whole way down
    const o = clamp(1 - y / 90, 0, 1);
    line1.style.opacity = o.toFixed(3);
    if (heroSub) heroSub.style.opacity = o.toFixed(3);
  }
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

// ---- Only the header PHOTO flies to the cursor; per-letter glow; Instagram-style return ----
if (hero && line2 && cursorEl && hdrAvatar && hdrAvatarImg && !reduced) {
  const SIZE = 80, HOME_S = 46 / 80, RET = 760, FLY = RET;   // out and back take exactly as long
  let tx = 0, ty = 0, cx = 0, cy = 0, cs = HOME_S;
  let active = false, returning = false, raf = null, homeX = 0, homeY = 0;
  let retStart = 0, rfx = 0, rfy = 0, rfs = HOME_S;
  // The photo flies from the header to the cursor — that hand-off is the effect and stays eased.
  // But once it has ARRIVED it becomes the cursor, and a thing that IS the cursor may not trail it.
  // From that moment it is locked to the pointer and drawn from the pointermove event itself.
  let locked = false, flyStart = 0, ffx = 0, ffy = 0, ffs = HOME_S;   // where the flight launched from

  const render = () => {
    cursorEl.style.transform = `translate(${(cx - SIZE / 2).toFixed(1)}px, ${(cy - SIZE / 2).toFixed(1)}px) scale(${cs.toFixed(3)})`;
  };
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
    if (locked) { cx = tx; cy = ty; cs = ts(); } else if (active) {
      // The flight OUT is the mirror image of the flight home: same clock, same easeInOutCubic,
      // the same rounded hop and the same damped settle. It used to be a 300ms follow-ease that
      // ramped 0.26 → 1, which arrived correctly but felt like a snatch; this reads as the photo
      // being lifted out of the header and carried across.
      // The hand-off is still time-boxed, NOT distance-based — keyed off distance it could never
      // finish while the pointer kept moving, and the photo would trail forever. The eased
      // progress runs between the LAUNCH point and wherever the pointer is NOW, so it still lands
      // exactly on the pointer at t = 1; from there it locks and pointermove draws it.
      const t = clamp((performance.now() - flyStart) / FLY, 0, 1);
      const e = easeInOutCubic(t);
      cx = ffx + (tx - ffx) * e;
      const baseY = ffy + (ty - ffy) * e;
      const arc = -Math.sin(t * Math.PI) * 60;                  // soft rounded hop over the top
      const bounce = Math.sin(t * Math.PI * 3) * (1 - t) * 12;  // two gentle, damped bounces
      cy = baseY + arc + bounce;
      cs = ffs + (1 - ffs) * e;
      if (t >= 1) { cx = tx; cy = ty; cs = 1; locked = true; }
    } else {
      cx += (tx - cx) * 0.26; cy += (ty - cy) * 0.26; cs += (ts() - cs) * 0.26;
    }
    render();
    // Once it is locked AND done growing there is nothing left to animate: the loop stands down and
    // pointermove draws it, so there is no rAF hop between the mouse and the photo.
    const scaling = Math.abs(ts() - cs) > 0.002;
    if ((active && (!locked || scaling)) || (!active && Math.hypot(tx - cx, ty - cy) > 0.6)) {
      raf = requestAnimationFrame(loop);
    } else { raf = null; }
  };
  const ts = () => (active ? 1 : HOME_S);
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  const flyOut = (x, y) => {
    const r = hdrAvatar.getBoundingClientRect();
    homeX = r.left + r.width / 2; homeY = r.top + r.height / 2;
    if (!active && !returning) { cx = homeX; cy = homeY; cs = HOME_S; render(); }
    active = true; returning = false; locked = false; flyStart = performance.now();   // flies across first
    // launch from wherever it actually is — the header, or mid-flight home if you came straight back
    ffx = cx; ffy = cy; ffs = cs;
    document.documentElement.classList.add('hero-ava-on');
    cursorEl.style.opacity = '1';
    hdrAvatarImg.style.opacity = '0';    // only the photo lifts off; the ring stays
    tx = x; ty = y; kick();
  };
  const flyHome = () => {
    if (!active) return;
    active = false; returning = true; locked = false;
    document.documentElement.classList.remove('hero-ava-on');   // round cursor comes back immediately
    retStart = performance.now(); rfx = cx; rfy = cy; rfs = cs;
    kick();
  };

  // Both rects used to be read on EVERY pointermove. Reading layout inside an input handler forces
  // a synchronous style+layout flush, and the halo loop dirties style every frame, so it was never
  // free — it put a measurable stall between the mouse moving and anything drawing. They are cached
  // and only re-read when something can actually have moved them.
  let r2 = null, rh = null;
  const dropRects = () => { r2 = null; rh = null; };
  addEventListener('scroll', dropRects, { passive: true });
  addEventListener('resize', dropRects, { passive: true });
  const line2Rect = () => (r2 || (r2 = line2.getBoundingClientRect()));
  const heroRect = () => (rh || (rh = hero.getBoundingClientRect()));

  const overLine2 = (x, y) => { const r = line2Rect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    if (overLine2(e.clientX, e.clientY)) {
      if (!active) flyOut(e.clientX, e.clientY);
      else {
        tx = e.clientX; ty = e.clientY;
        // locked = it IS the cursor now, so draw it in this event, not on the next frame
        if (locked) { cx = tx; cy = ty; render(); } else kick();
      }
      // which letter is under the cursor (+ feed the cursor position to the dots)
      const hr = heroRect();
      const lx = e.clientX - hr.left;
      mouseHX = lx; mouseHY = e.clientY - hr.top;
      let found = -1;
      for (let k = 0; k < letters.length; k++) { if (lx >= letters[k].x0 && lx < letters[k].x1) { found = k; break; } }
      // toggle on ENTER only: a touched letter turns purple and stays purple until touched again
      if (found !== hoverLetter) {
        if (found >= 0 && letterOn.length > found) letterOn[found] = letterOn[found] ? 0 : 1;
        hoverLetter = found;
      }
    } else {
      if (active) flyHome();
      hoverLetter = -1; mouseHX = -9999; mouseHY = -9999;
    }
  }, { passive: true });   // never calls preventDefault — let the browser composite without waiting on it

  // ---- Click a letter and it comes apart ----
  // The phone gets there on the second tap, because the first one is how you colour a letter in.
  // With a mouse the colour is already handled by running across the letters, so a click has nothing
  // else to mean and shatters straight away.
  //
  // `pointerdown`, not `click`: the letter has to start leaving on the way DOWN. Waiting for the
  // release puts the length of the press between the reader and the response, and that is the whole
  // of the effect — press, and it is already flying.
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const k = hoverLetter;   // kept up to date by the pointermove above; only ever set over line2
    if (k < 0 || !letterInk[k] || letterGone[k] || letterBurst[k]) return;
    letterBurst[k] = performance.now();
    letterTaps[k] = (letterTaps[k] || 0) + 1;
    forceDraw = true;
  }, { passive: true });

  window.addEventListener('blur', () => { if (active) flyHome(); hoverLetter = -1; mouseHX = -9999; mouseHY = -9999; });
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

// ---- (JS smooth wheel-scroll removed — reverted to native scrolling; it could stall) ----

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
  // only 20% of the gap per frame — ~350ms to catch up after a fast flick — and since the native
  // cursor is hidden site-wide, that trail read as the whole interface lagging. Position is now
  // written straight from the mousemove event, in the same frame the browser delivers it.
  const targetS = () => (hover ? 1.7 : 1) * (down ? 0.82 : 1);

  const render = () => {
    const heroActive = document.documentElement.classList.contains('hero-ava-on');   // only while actually over the name
    dot.style.opacity = (shown && inside && !heroActive) ? '1' : '0';
    dot.classList.toggle('is-hover', hover);
    dot.style.transform = `translate3d(${(mx - 12.5).toFixed(2)}px, ${(my - 12.5).toFixed(2)}px, 0) scale(${cs.toFixed(3)})`;
  };

  // Only the SCALE is animated, and only while it is actually settling — no permanent rAF loop
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
  // in the same event — kick() only starts the scale easing behind it. Waiting for the rAF to do
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
// Every way back to the homepage — the header avatar, "Home" in the nav and the drawer, and the
// "Back to all work" link that closes each case study — points here. On a phone that landing kept
// coming out approximate: #top resolves against the FIXED header, the browser restores its own
// scroll on a reload, and the page keeps growing for a second or two after it opens (the hero
// wordmark canvas measures itself once the display font is ready, the tile images decode). So the
// top is HELD rather than jumped to, and the first real scroll input from the reader releases it.
(function () {
  if (location.hash !== '#top') return;
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
// Every Contact button — here and on the case studies (index.html#contact) — aims at the last
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

  // The page keeps growing for a moment after it opens — lazy photos decode, the wordmark canvas
  // sizes itself once the display font is ready — and every one of those pushes the footer down.
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
    // its own jump to #contact after load, which lands at the page bottom — treating that as "the
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
      // a smooth scroll asked for from a click is sometimes dropped — land it either way, then
      // hold it (the hold starts late so it doesn't fight the glide)
      setTimeout(() => { if (Math.abs(window.scrollY - target) > 40) window.scrollTo(0, footLine()); }, 420);
      setTimeout(hold, 800);
    });
  });

  // Arriving from another page. The hash is not always present the moment this runs — some
  // browsers apply the fragment after the document is parsed — so this listens for it as well as
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
// and a cursor that only moves a circle on ACTUAL contact — a swept segment test, so fast flicks
// can't tunnel past. Nothing caps them upward: a hard enough hit throws them clean off screen.
(function () {
  const foot = document.querySelector('.foot');
  if (!foot) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'foot__dots';
  canvas.setAttribute('aria-hidden', 'true');
  foot.prepend(canvas);
  const ctx = canvas.getContext('2d');

  // A third of what it was on both sizes, and a third again on phones — the pile now stands
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
  // step that its neighbours immediately undo — motionless on paper, shimmering on screen.
  // The test has to be displacement, not velocity: a supported ring carries vy ≈ G forever.
  // SLEEP_D has to tolerate the slow sink a position-based solver leaves in a stack (each
  // resting ring gives back only half its overlap per frame); WAKE_D is real travel, the only
  // thing allowed to wake a parked neighbour — otherwise that jitter cascades through the pile.
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
      while (radii.length < COUNT) radii.push(rnd(2, 4));     // the rest stay small (4–8px)
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

  // cached for the same reason as the others — this fires on every mouse move anywhere on the page
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
      if (px1 > -9000) {                                  // contact only — no force field
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
      // A ring standing on ground — the floor, or a ring that is itself standing on ground — gets
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
        // a bounce this small is invisible as motion but visible as flicker — kill it outright
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
    // this deep — every ring has half a dozen neighbours, so a single pass leaves overlaps that
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
              // two parked rings are already resting against each other — re-solving that contact
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
    // settle pass — measured AFTER collisions, so a ring that gravity pushed down and its
    // neighbour pushed straight back up counts as having gone nowhere, and can finally park.
    awake = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.d = Math.abs(p.x - p.ox) + Math.abs(p.y - p.oy);
      p.g = p.gN;
      // Only a ring standing on ground may settle. Below the threshold it is just jittering, so
      // bleed its speed away hard — that is what lets the counter actually reach SLEEP_AFTER
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
