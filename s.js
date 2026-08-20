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

    try {
      var q = location.search;
      if (q.indexOf('me=1') > -1) localStorage.setItem('ya_me', '1');
      if (q.indexOf('me=0') > -1) localStorage.removeItem('ya_me');
      if (localStorage.getItem('ya_me')) return;
    } catch (e) {}

    /* ---- session ---- */
    var ss = null;
    try { ss = window.sessionStorage; ss.getItem('ya_s'); } catch (e) { ss = null; }

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
      var d = { s: sid, n: ++seq, t: type, p: page };
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
      send('end', { ms: delta, sc: deepest });
    }

    /* ---- scroll depth ---- *
     * Measured off a cached page height and only inside a rAF, so scrolling never pays
     * for a layout read. The height is re-measured at most once a second, which covers
     * the images and videos that finish loading after the first paint. */
    var docH = 0, measured = 0, deepest = 0, ticking = false;
    function measure() {
      docH = document.documentElement.scrollHeight - window.innerHeight;
      measured = Date.now();
    }
    measure();
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('load', measure);
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (Date.now() - measured > 1000) measure();
        var p = docH > 0 ? Math.round((window.pageYOffset / docH) * 100) : 100;
        if (p > deepest) deepest = Math.min(100, p);
      });
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
      if (ev.persisted) send('view', { d: dev, b: 1 });
    });

    // Safety net for the visit that ends in a crash or a shut lid.
    setInterval(function () { if (visible) flush(); }, 60000);

    /* ---- first event ---- */
    var first = { d: dev };
    if (fresh) {
      try {
        if (document.referrer && document.referrer.indexOf(location.host) === -1) {
          first.r = document.referrer.replace(/^https?:\/\//, '').split('/')[0].slice(0, 80);
        }
      } catch (e) {}
      try {
        var u = new URLSearchParams(location.search);
        first.u = (u.get('utm') || u.get('utm_source') || u.get('ref') || '').slice(0, 40);
      } catch (e) {}
      // A time zone is a free, precise region hint that costs no third-party call and
      // stores nothing personal - the country still comes from the edge.
      try { first.z = Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 40); } catch (e) {}
    }
    send('view', first);
  } catch (e) {
    /* the site never notices */
  }
})();
