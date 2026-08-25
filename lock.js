/* ---------------------------------------------------------------------------
 * Talmind is a private project (25.08.2026).
 *
 * The card stays on the homepage wearing a grey padlock, and nobody can open
 * it - except this browser profile. No browser API will ever say "you are in
 * Yehuda's personal Chrome profile", so the profile is what HOLDS the proof:
 * one visit to the secret unlock link plants a token in localStorage, which is
 * scoped to the origin AND to the Chrome profile that stored it. His work
 * profile, a guest window, incognito, his phone, anyone else's machine - none
 * of them have it, none of them get in, and his own profile is never asked
 * anything again.
 *
 *   unlock this browser : https://yehudaamitzur.com/?k=<token>
 *   lock it back up     : https://yehudaamitzur.com/?k=out
 *
 * Everything here is written FAIL-CLOSED. The shipped markup carries no route
 * to the case study at all - the card has no href, and Bianca's hand-off
 * points at TrailDesk - and this file ADDS them back for the browser it
 * recognises. So a blocked script, a failed request or JS switched off leaves
 * the project shut rather than open. The token itself is never written down
 * here, only a digest of it, so reading this file hands nobody the key.
 *
 * What this CANNOT do is hide the case study from someone who opens the page
 * source, or the public GitHub repo the site is served from. It is a lock on
 * the door, not a safe; sealing that too means shipping the page encrypted.
 *
 * Loaded plain (not defer) from the <head> so the state is settled before the
 * first paint and the padlock never flickers.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var STORE  = 'ya_pk';
  var SALT   = 'ya-talmind-2026';
  var DIGEST = '123a8cda465e0f6ae32e92e5';

  /* FNV-1a, three passes over the salted token. Synchronous on purpose: an
     async WebCrypto digest resolves a frame too late, and the card would paint
     in the wrong state for that frame. */
  function f(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i) & 255;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function digest(t) { return f(SALT + t) + f(t + SALT) + f(t + t); }
  function opens(t) { return !!t && digest(t) === DIGEST; }

  /* ---- the one-time unlock ----
     ?k= works on any page of the site, so the link can simply be the homepage.
     Read, stored, then wiped out of the address bar before anyone reads it. */
  var said = '';
  var m = /[?&#]k=([^&#]*)/.exec(location.search + location.hash);
  if (m) {
    var handed = decodeURIComponent(m[1]);
    try {
      if (handed === 'out') { localStorage.removeItem(STORE); said = 'Locked again'; }
      else if (opens(handed)) { localStorage.setItem(STORE, handed); said = 'Unlocked on this browser'; }
      else said = "That key didn't work";
    } catch (e) { said = 'This browser is not storing site data, so it cannot be unlocked'; }
    try {
      if (window.history && history.replaceState && window.URL) {
        var u = new URL(location.href);
        u.searchParams.delete('k');
        u.hash = (u.hash || '').replace(/(^|[&])k=[^&]*/, '').replace(/^#&?$/, '');
        history.replaceState(history.state, '', u.pathname + u.search + u.hash);
      }
    } catch (e) {}
  }

  var token = '';
  try { token = localStorage.getItem(STORE) || ''; } catch (e) {}
  var OPEN = opens(token);

  window.__yaOpen = OPEN;
  var root = document.documentElement;
  root.className = (root.className.replace(/\bya-(shut|open)\b/g, '') +
                    (OPEN ? ' ya-open' : ' ya-shut')).replace(/\s+/g, ' ').trim();

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* ---- say what just happened ----
     The unlock used to be completely silent: a working key, a mistyped one and a link opened in
     the wrong Chrome profile all looked exactly the same - nothing. One quiet line, three
     seconds, and there is never any doubt about which browser is holding the key. */
  function announce(text, good) {
    var el = document.createElement('div');
    el.className = 'ya-said' + (good ? ' is-good' : '');
    el.setAttribute('role', 'status');
    el.textContent = text;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    setTimeout(function () {
      el.classList.remove('is-in');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, 3400);
  }

  ready(function () {
    if (said) announce(said, OPEN);

    var card = document.querySelector('.pcard--talmind .pcard__inner');
    var pill = card && card.querySelector('.pcard__view');
    var nxt  = document.querySelector('[data-nxt-talmind]');

    if (OPEN) {
      /* ---- recognised: put the two routes back ---- */
      if (card) {
        card.setAttribute('href', card.getAttribute('data-open') || '/talmind');
        card.setAttribute('aria-label', 'Talmind - open the case study');
      }
      if (nxt) {
        var link = nxt.querySelector('.nxt__link');
        var desc = nxt.querySelector('.nxt__desc');
        var img  = nxt.querySelector('.nxt__img');
        if (link) link.setAttribute('href', '/talmind');
        if (desc) desc.innerHTML = '<b>TALMIND</b> a tablet learning app for Korean classrooms';
        if (img) img.setAttribute('src', 'tile-talmind.jpg?v=178');
        nxt.className = nxt.className.replace('nxt--traildesk', 'nxt--talmind');
      }
      return;
    }

    /* ---- everyone else: clicking a locked card has to say something, or it
            reads as broken ---- */
    if (card && pill) {
      card.addEventListener('click', function (ev) {
        ev.preventDefault();
        pill.classList.add('is-hinting');
        clearTimeout(pill._t);
        pill._t = setTimeout(function () { pill.classList.remove('is-hinting'); }, 2400);
      });
    }
  });
})();
