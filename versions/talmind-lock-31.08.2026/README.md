# The password lock, as it stood when it came off — 31.08.2026

Talmind is open to everyone again. The lock that had been on it since 25.08.2026 —
padlock on the card, the View pill turning into a password field, the pre-paint guard on
the case study itself — is kept here whole, so it can go back up on a word.

Everything in this folder is the **live, working lock**, copied out of the tree at commit
**`dbfd7d0`**, the last commit before it was removed. The removal itself is the commit
right after it; **reverting that one commit is the whole restore**, and the files here are
for reading, checking, and rebuilding by hand if the history is ever not to hand.

This folder is **not served** — `pages.yml` deletes `versions/` from its checkout before
uploading — and `versions/` is in `.gitignore` so `publish.sh`'s `rsync --delete` leaves it
standing. A new file in here needs `git add -f`.

---

## Putting the lock back

```sh
# the one-liner: undo the commit that took it off
git revert <the "Talmind goes public" commit>

# then bump ?v= across the site by one, or a browser holding the current styles.css
# will draw the padlock markup with no rules for it
```

If that commit is ever out of reach, the seven pieces below are the whole lock. They were
also removed once before, on 26.08.2026, and put back on 27.08 — commit `be84432` is the
removal, `76bb04b` the restore, and either one read as a diff shows every edit in place.

## What the lock consists of

| # | where | what |
|---|---|---|
| 1 | `lock.js` (root) | the whole thing — PBKDF2 check, `?k=` links, the password field, the card rewiring. **`lock.js` in this folder is that file, verbatim.** |
| 2 | `styles.css` | a 168-line block, `Talmind is private (25.08.2026)`, sitting between the `prefers-reduced-motion` rule that closes the `.pcard` section and the `Next project - the loop` banner. **`styles.lock-block.css` here is those 168 lines.** |
| 3 | `index.html`, `hero-dots.html` | the card: **no `href`**, `data-open="/talmind"`, `aria-label="Talmind - a private project"`, the two padlock SVGs inside `.pcard__view`, and `View` wrapped in `.pcard__view-label` so it can collapse. **`index.card.html` and `hero-dots.card.html` here are those `<article>` blocks, verbatim.** They are not identical to each other — restore each into its own file. |
| 4 | `talmind.html` | the pre-paint guard in the `<head>` plus `<meta name="robots" content="noindex, nofollow" />`. **`talmind.head-guard.html` here is that block.** It runs before any stylesheet is requested, so a stranger never sees a frame. |
| 5 | `bianca.html` | the next-project hand-off ships pointed at **TrailDesk**, with `class="nxt nxt--traildesk"` and `data-nxt-talmind` on the section; `lock.js` swaps it back to Talmind for the browser that is allowed in. **`bianca.nxt-block.html` here is that section.** |
| 6 | all five pages | `<html lang="en" class="ya-shut">` — the resting state is *shut*, so a blocked script leaves the door closed rather than open. |
| 7 | all five pages | `<script src="lock.js?v=…"></script>` in the `<head>`, loaded plain (**not** `defer`) so the state settles before first paint and the padlock never flickers. Each carries its own one-line comment: on `index.html` "the padlock, the missing href and the unlock all live here"; on `hero-dots.html` that the alternate homepage carries the same lock; on `talmind.html` that it is there to wipe a `?k=` out of the address bar; on `bianca.html` that it restores the hand-off; on `traildesk.html` that the unlock link has to work from any page. |

## The password

**Unchanged, and not written down anywhere in this repo.** `lock.js` ships only a digest of
`PBKDF2-SHA256(password, 'talmind.yehudaamitzur.2026', 200000)` — `35e35124f0b18420f88213c5`
— which is what makes the file safe to publish. Restore the file and the same password
opens it. To change it: `python3 set-password.py "new one"` and paste the new digest into
both `lock.js` and the inline guard in `talmind.html`, which carry it separately on purpose.

How it behaves, unchanged since 25.08.2026:

- **by hand** — click the card, type the password
- **another device** — `https://yehudaamitzur.com/?k=<derived token>`
- **lock it again** — `https://yehudaamitzur.com/?k=out`
- the unlock lives in `sessionStorage`, so it lasts the visit and dies with the tab; a new
  arrival is asked again

## What being open means now

`talmind.html` no longer carries `noindex, nofollow`, so search engines will index the case
study from here on. Putting the lock back stops that going forward, but it does not undo
it — anything already indexed has to be removed through Search Console, and a cache or an
archive copy may outlive that. That is the one part of this that a `git revert` cannot take
back, and it is worth knowing before the next switch.
