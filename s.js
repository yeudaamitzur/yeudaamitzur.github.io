/* ---------------------------------------------------------------------------
 * Visit log. Deliberately its own file: index.html loads hero-dots.js while the
 * case studies load script.js, so anything living inside those would have to be
 * maintained twice - and a stray error in either one takes the hero canvas down
 * with it. Here it is sealed off. Everything below is wrapped so that a failure,
 * a blocked request, or a browser missing an API is silent and harmless.
 *
 * No cookies, no IP, no name. The session id lives in sessionStorage and dies
 * with the tab, which is also why a project opened in a NEW tab counts as a new
 * visitor - the honest cost of not tracking people across a browser.
 *
 * Owner opt-out: load any page once with ?me=1 and this browser stops reporting
 * for good (?me=0 undoes it).
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';
  try {
    var EP = 'https://ya-stats.yeudaamizur.workers.dev/e';
    if (EP.indexOf('REPLACE_WITH') > -1) return;      // not wired up yet: do nothing at all
    if (navigator.webdriver) return;                  // automated browser, not a reader

    // Tidies the address bar without reloading and without adding a history entry, so Back
    // still goes where the reader expects. Called only AFTER the tag has been read and sent -
    // a recruiter should see "yehudaamitzur.com", not the label that says which application
    // they arrived from.
    function tidyUrl() {
      try {
        if (!window.history || !history.replaceState || !window.URL) return;
        var url = new URL(location.href);
        var junk = ['utm', 'utm_source', 'utm_medium', 'utm_campaign', 'ref', 'r', 'me'];
        var found = false;
        for (var i = 0; i < junk.length; i++) {
          if (url.searchParams.has(junk[i])) { url.searchParams.delete(junk[i]); found = true; }
        }
        // A bare "?cedar" is a key with no value. Anything else - a real key=value that some
        // future page might need - is left alone.
        var bare = [];
        url.searchParams.forEach(function (v, k) { if (!v) bare.push(k); });
        for (var j = 0; j < bare.length; j++) { url.searchParams.delete(bare[j]); found = true; }
        if (found) history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      } catch (e) {}
    }

    try {
      var q = location.search;
      if (q.indexOf('me=1') > -1) localStorage.setItem('ya_me', '1');
      if (q.indexOf('me=0') > -1) localStorage.removeItem('ya_me');
      if (localStorage.getItem('ya_me')) { tidyUrl(); return; }
    } catch (e) {}

    /* ---- who and which visit ----
     * Two ids, on purpose:
     *   sid - one browsing session. Lives in sessionStorage, dies with the tab.
     *   vid - the browser itself. Lives in localStorage so a visit next week joins up with
     *         this one. A random number and nothing else: no name, no email, no IP, and
     *         nothing derived from the device. It answers exactly one question - "is this
     *         the same browser as before" - and it cannot follow anyone to another device
     *         or to any other site.
     * Both are optional. Private mode throws on storage access, and then the visit is
     * simply counted as a brand new one rather than not counted at all. */
    var ss = null;
    try { ss = window.sessionStorage; ss.getItem('ya_s'); } catch (e) { ss = null; }

    var vid = null;
    try {
      vid = localStorage.getItem('ya_v');
      if (!vid) {
        vid = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 14);
        localStorage.setItem('ya_v', vid);
      }
    } catch (e) { vid = null; }

    var sid = ss && ss.getItem('ya_s'), fresh = false;
    if (!sid) {
      sid = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, 16);
      fresh = true;
      if (ss) ss.setItem('ya_s', sid);
    }
    var seq = ss ? (+ss.getItem('ya_n') || 0) : 0;

    // script.js rewrites "/bianca.html" to "/bianca" after load, so normalise both spellings
    // to one name - otherwise the same page shows up twice in the dashboard.
    var page = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
    if (page.length > 1) page = page.replace(/\/+$/, '');
    if (!page) page = '/';

    var dev = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'm' : 'd';

    /* ---- send ---- */
    var count = 0;
    function send(type, extra) {
      if (++count > 200) return;                      // a tab left open for a week stays cheap
      // `dev` rides along on every event. Sending it only on the first one left every
      // click and end row saying "desktop", which quietly poisoned the raw data and the
      // CSV export even though the session-level device happened to come out right.
      var d = { s: sid, n: ++seq, t: type, p: page, d: dev };
      if (vid) d.v = vid;
      if (extra) for (var k in extra) if (extra[k] !== undefined && extra[k] !== '') d[k] = extra[k];
      if (ss) { try { ss.setItem('ya_n', seq); } catch (e) {} }
      var body = JSON.stringify(d);
      try {
        // text/plain keeps this a "simple" request: no CORS preflight, and sendBeacon is the
        // only thing that reliably survives the page going away - fetch gets killed mid-flight.
        if (navigator.sendBeacon && navigator.sendBeacon(EP, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
      } catch (e) {}
      try { fetch(EP, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' }); } catch (e) {}
    }

    /* ---- active time ---- *
     * Counts only the time the tab is actually in front. A portfolio left open in a
     * background tab for an hour is not an hour of reading, and counting it that way
     * would make every number useless. */
    var visible = document.visibilityState !== 'hidden';
    var mark = Date.now(), acc = 0, flushed = 0;

    function tick() {
      var now = Date.now();
      if (visible) acc += now - mark;
      mark = now;
    }
    function flush() {
      tick();
      var delta = acc - flushed;
      if (delta < 500) return;                        // nothing worth a row
      flushed = acc;
      markSeen();
      send('end', { ms: delta, sc: scrollPct() });
    }

    /* ---- scroll depth ---- *
     * Remembers the deepest PIXEL reached, never a percentage. Storing a percentage was
     * wrong on mobile: the first scroll happens while the images are still loading, so the
     * page is short, the maths says 100%, and because the value only ever grows it stays
     * at 100% for the whole visit. Pixels are absolute - the height is read fresh at send
     * time, when the page has settled.
     *
     * The number reported is how much of the page was actually SEEN - the bottom edge of
     * the viewport, not the top - so a reader who never scrolls still gets credit for the
     * first screenful instead of a flat 0%.
     */
    var deepestPx = 0, ticking = false;
    function pageH() {
      return Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0,
        window.innerHeight
      );
    }
    function markSeen() {
      var p = Math.min(window.pageYOffset + window.innerHeight, pageH());
      if (p > deepestPx) deepestPx = p;
    }
    function scrollPct() {
      var h = pageH();
      return h > 0 ? Math.max(1, Math.min(100, Math.round((deepestPx / h) * 100))) : 100;
    }
    markSeen();
    window.addEventListener('resize', markSeen, { passive: true });
    window.addEventListener('orientationchange', markSeen, { passive: true });
    window.addEventListener('load', markSeen);
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; markSeen(); });
    }, { passive: true });

    /* ---- clicks ---- *
     * Capture phase, so a handler that stops propagation cannot hide the click. */
    document.addEventListener('click', function (ev) {
      try {
        var el = ev.target && ev.target.closest && ev.target.closest('a,button,[data-track],[role="button"]');
        if (!el) return;
        // A project card is one big link, so its raw text is the whole card. Reach for the
        // heading inside it first - "Talmind" is a readable row in the dashboard, four lines
        // of body copy are not.
        var name = el.getAttribute('data-track') || el.getAttribute('aria-label');
        if (!name) {
          var h = el.querySelector && el.querySelector('h1,h2,h3,h4');
          name = (h && h.textContent) || el.textContent || el.tagName.toLowerCase();
        }
        name = name.replace(/\s+/g, ' ').trim();
        send('click', { l: name.slice(0, 60), h: (el.getAttribute('href') || '').slice(0, 120) });
      } catch (e) {}
    }, true);

    /* ---- lifecycle ---- */
    document.addEventListener('visibilitychange', function () {
      tick();
      if (document.visibilityState === 'hidden') { visible = false; flush(); }
      else { visible = true; mark = Date.now(); }
    });

    // pagehide, never unload: iOS Safari does not fire unload at all, which would have
    // thrown away the reading time of every visitor on an iPhone.
    window.addEventListener('pagehide', flush);

    // Coming back with the Back button restores the page from the bfcache without any
    // load event, so without this the second look at a project is invisible.
    window.addEventListener('pageshow', function (ev) {
      mark = Date.now();
      visible = document.visibilityState !== 'hidden';
      if (ev.persisted) send('view', { b: 1 });
    });

    // Safety net for the visit that ends in a crash or a shut lid.
    setInterval(function () { if (visible) flush(); }, 60000);

    /* ---- first event ---- */
    var first = {};
    if (fresh) {
      try {
        if (document.referrer && document.referrer.indexOf(location.host) === -1) {
          first.r = document.referrer.replace(/^https?:\/\//, '').split('/')[0].slice(0, 80);
        }
      } catch (e) {}
      try {
        var u = new URLSearchParams(location.search);
        var tag = u.get('utm') || u.get('utm_source') || u.get('ref') || u.get('r') || '';
        if (!tag) {
          // "?cedar" - no key, no equals sign, nothing that reads as tracking to anyone who
          // glances at the address bar while the page loads. The word means nothing on its
          // own; the note saying which application it belongs to stays on Yehuda's machine.
          u.forEach(function (v, k) { if (!tag && !v && k !== 'me') tag = k; });
        }
        first.u = tag.slice(0, 40);
      } catch (e) {}
      // A time zone is a free, precise region hint that costs no third-party call and
      // stores nothing personal - the country still comes from the edge.
      try { first.z = Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 40); } catch (e) {}
    }
    send('view', first);
    tidyUrl();
  } catch (e) {
    /* the site never notices */
  }
})();
