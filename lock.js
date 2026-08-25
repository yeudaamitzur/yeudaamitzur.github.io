/* ---------------------------------------------------------------------------
 * Talmind is a private project (25.08.2026).
 *
 * The card stays on the homepage wearing a grey padlock. Clicking it asks for a
 * password; getting it right unlocks THIS browser for good, and the card simply
 * works from then on - no second prompt, ever.
 *
 * Why a password and not just the secret link it started as: the link had to
 * survive being copied, pasted, and landing in the right Chrome window, and
 * twice it did not. A password is typed where it is needed and cannot be
 * delivered to the wrong profile by accident. The link still works as a way to
 * open up another device without typing (see ?k= below) - it is now the derived
 * token rather than a separate secret.
 *
 *   unlock by hand : click the card, type the password
 *   another device : https://yehudaamitzur.com/?k=<derived token>
 *   lock it back up: https://yehudaamitzur.com/?k=out
 *
 * WHAT IS STORED AND WHY IT IS SAFE TO SHIP. The password is never in this
 * file. What ships is a digest of PBKDF2-SHA256(password, salt, 200000). The
 * check runs in the visitor's browser, so those constants are public by
 * definition - the slow KDF is what stops a weak password being recovered from
 * them offline. Every page load then re-checks only the DERIVED token, with a
 * cheap synchronous hash, so nothing has to await crypto before first paint.
 * To change the password: python3 set-password.py "new one", paste the DIGEST.
 *
 * Everything is FAIL-CLOSED. The shipped markup carries no route to the case
 * study at all - the card has no href, and Bianca's hand-off points at
 * TrailDesk - and this file ADDS them back for the browser it recognises. A
 * blocked script or JS switched off therefore leaves the project shut.
 *
 * What this CANNOT do is hide the case study from someone who opens the page
 * source, or the public GitHub repo the site is served from. A lock on the
 * door, not a safe.
 *
 * Loaded plain (not defer) from the <head> so the state is settled before the
 * first paint and the padlock never flickers.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var STORE  = 'ya_pk';
  var SALT   = 'ya-talmind-2026';                 /* for the cheap per-load check */
  var KDF_SALT = 'talmind.yehudaamitzur.2026';    /* for the slow password derivation */
  var ITER   = 200000;
  var DIGEST = '35e35124f0b18420f88213c5';

  /* FNV-1a, three passes. Synchronous on purpose: an async digest resolves a
     frame too late and the card would paint in the wrong state for that frame. */
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

  function remember(t) { try { localStorage.setItem(STORE, t); } catch (e) {} }
  function forget()    { try { localStorage.removeItem(STORE); } catch (e) {} }

  /* password -> the token that gets stored. Deliberately expensive. */
  function derive(pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: enc.encode(KDF_SALT), iterations: ITER, hash: 'SHA-256' },
          key, 256);
      })
      .then(function (bits) {
        var out = '', b = new Uint8Array(bits);
        for (var i = 0; i < b.length; i++) out += ('0' + b[i].toString(16)).slice(-2);
        return out;
      });
  }

  /* ---- ?k= : open up a browser without typing ---- */
  var said = '';
  var m = /[?&#]k=([^&#]*)/.exec(location.search + location.hash);
  if (m) {
    var handed = decodeURIComponent(m[1]);
    if (handed === 'out') { forget(); said = 'Locked again'; }
    else if (opens(handed)) { remember(handed); said = 'Unlocked on this browser'; }
    else said = "That link didn't work";
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
     Without this the unlock is completely silent, and a key that worked looks
     exactly like a link opened in the wrong Chrome profile. */
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

  /* ---- the password field ----
     There is no second control and nothing is layered over the card. The View pill IS the field:
     the word "View" collapses to nothing, the input grows out of the same box, and the pill
     widens leftward while its right edge stays exactly where it was. The padlock, pinned at
     right:100% of that pill, rides along at the leading edge.

     Only the field's width is animated. The pill is inline-flex and content-sized, so it follows
     every frame on its own - which is just as well, because a pill's `auto` width cannot be
     transitioned at all.

     No <form> on purpose. This lives inside .pcard__inner, which is an <a>, and a form nested in
     an anchor is asking for trouble; Enter and the button both call submit() directly instead.

     Both pieces are children of .pcard__view, so they ride the arc driver's transform along with
     the card - the card moves under the scroll every frame, and anything in viewport coordinates
     would slide off the padlock immediately. */
  var gate = null;
  function askForPassword(host, then) {
    if (gate) { gate.input.focus({ preventScroll: true }); gate.input.select(); return; }

    var wrap = document.createElement('span');
    wrap.className = 'ya-gate';
    wrap.innerHTML =
      '<span class="ya-gate__row">' +
        '<input class="ya-gate__input" type="password" name="password" ' +
              'autocomplete="current-password" placeholder="Password" ' +
              'aria-label="Password for the Talmind case study" />' +
        '<button class="ya-gate__go" type="button" aria-label="Open the case study">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
               'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M5 12h13M12.6 6.2 18.8 12l-6.2 5.8" />' +
          '</svg>' +
        '</button>' +
      '</span>';

    /* the small line that says why the frame is there at all */
    var note = document.createElement('span');
    note.className = 'ya-gate__note';
    note.textContent = 'Private project';

    host.appendChild(wrap);
    host.appendChild(note);

    var input = wrap.querySelector('.ya-gate__input');
    var go    = wrap.querySelector('.ya-gate__go');
    var card  = host.closest ? host.closest('.pcard') : null;
    gate = { wrap: wrap, input: input, note: note };
    if (card) card.classList.add('has-gate');

    /* a click in the field is not a click on the card - without this the card handler fires
       again and keeps re-selecting the text under the cursor */
    function swallow(ev) { ev.stopPropagation(); }
    wrap.addEventListener('click', swallow);
    wrap.addEventListener('mousedown', swallow);
    note.addEventListener('mousedown', swallow);

    function close() {
      wrap.classList.remove('is-in');
      note.classList.remove('is-in');
      host.classList.remove('is-open', 'is-working', 'is-wrong');
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside, true);
      if (card) card.classList.remove('has-gate');
      setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        if (note.parentNode) note.parentNode.removeChild(note);
        gate = null;
      }, 380);
    }
    function onKey(ev) { if (ev.key === 'Escape') close(); }
    /* "outside" means outside the CARD - a click on the card itself is the card's business, and
       it just puts the cursor back in the field */
    function onOutside(ev) { if (card && !card.contains(ev.target)) close(); }

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside, true);

    function wrong() {
      host.classList.remove('is-working', 'is-wrong');
      void host.offsetWidth;                       /* restart the shake on a second wrong try */
      host.classList.add('is-wrong');
      input.disabled = false;
      go.disabled = false;
      input.value = '';
      input.placeholder = 'Not it';
      setTimeout(function () { if (gate) input.placeholder = 'Password'; }, 2200);
      input.focus({ preventScroll: true });
    }

    function submit() {
      var pw = input.value;
      if (!pw || input.disabled) return;
      host.classList.remove('is-wrong');
      host.classList.add('is-working');
      input.disabled = true;                       /* 200k PBKDF2 rounds is a real beat */
      go.disabled = true;
      derive(pw).then(function (t) {
        if (!opens(t)) throw new Error('no');
        remember(t);
        close();
        then();
      }).catch(wrong);
    }

    go.addEventListener('click', function (ev) { ev.preventDefault(); submit(); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); submit(); }
    });

    /* preventScroll matters here: the field starts at zero width inside an overflow:hidden box,
       and a browser scrolling it into view would drag the whole scroll-driven card with it */
    try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
    /* is-open collapses the word "View" on the pill; is-in grows the field out of the same box */
    requestAnimationFrame(function () {
      host.classList.add('is-open');
      wrap.classList.add('is-in');
      note.classList.add('is-in');
    });
  }

  ready(function () {
    if (said) announce(said, OPEN);

    var card = document.querySelector('.pcard--talmind .pcard__inner');
    var nxt  = document.querySelector('[data-nxt-talmind]');

    function letThrough() {
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
        if (img) img.setAttribute('src', 'tile-talmind.jpg?v=180');
        nxt.className = nxt.className.replace('nxt--traildesk', 'nxt--talmind');
      }
      root.className = root.className.replace('ya-shut', 'ya-open');
      window.__yaOpen = true;
    }

    if (OPEN) { letThrough(); return; }

    /* ---- shut: a click asks for the password, and a right answer goes
            straight where the click was headed ---- */
    var pill = card && card.querySelector('.pcard__view');
    if (card && pill) {
      card.addEventListener('click', function (ev) {
        ev.preventDefault();
        askForPassword(pill, function () {
          letThrough();
          location.href = card.getAttribute('data-open') || '/talmind';
        });
      });
    }
    if (nxt) {
      /* Bianca's hand-off is a real, working TrailDesk link for everyone else, so it is
         left completely alone here - swapping it for a password prompt would take a
         visitor somewhere they never asked to go. */
    }
  });
})();
