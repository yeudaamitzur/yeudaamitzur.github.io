# The anonymous homepage card — 28.08.2026 to 31.08.2026, and how to bring it back

For three days the Talmind card on the homepage showed nothing about the project: blank
grey screens where its own captures go, and a headline that did not say which country the
pilot is for. It went up on 28.08.2026 while the project was behind a password, and came
down on 31.08.2026 when the project opened to everyone — there was nothing left for grey
placeholders to hold back.

**The card is now what it was before all of this**, minus the padlock. Everything needed to
make it anonymous again is in this folder.

This folder is **not served** — `pages.yml` deletes `versions/` from its checkout before
uploading — and `versions/` is in `.gitignore` so `publish.sh`'s `rsync --delete` leaves it
standing. A new file in here needs `git add -f`.

---

## What "anonymous" meant, exactly

| | live now | anonymous |
|---|---|---|
| the three screens | `strip-talmind-1.jpg` `-2` `-3` — the real captures | `strip-private-1.png` `-2` `-3` — blank grey screens, **in this folder** |
| headline | `Built a pilot that answers a huge need in Korean classrooms` | `Built a pilot that answers a huge need in the classroom` |
| name / chip / kind | `Talmind` / `Case study` / `Learning app` | unchanged — the name was never the part held back |

The grey screens are 640×400, the same as the captures, and sit in the same three places in
`.pcard__strip`, so swapping either way moves nothing else on the card.

For a few hours on 28.08 the name read `Confidential` too, and the prose comments naming the
project were reworded with it. Both went back the same day: the name is not secret.

`hero-dots.html` used to carry a fourth-day-old headline of its own — `Built a **real** pilot
…` — which `index.html` had dropped on 17.08.2026 because the pilot has not run. Both pages
say the same corrected line now. **Do not put `real` back.**

## Making it anonymous again

```sh
# 1. the grey screens go back into the site root
git mv versions/private-card-28.08.2026/strip-private-*.png .

# 2. in index.html AND hero-dots.html, inside <div class="pcard__strip">, swap the three
#    strip-talmind-N.jpg for strip-private-N.png, and change the headline to
#    "Built a pilot that answers a huge need in the classroom"

# 3. take the captures back off the published site - the card cannot read as anonymous
#    while the pictures behind it are one URL away. This is how the site retires an asset:
#    printf 'strip-talmind-1.jpg\nstrip-talmind-2.jpg\nstrip-talmind-3.jpg\n' >> .gitignore
#    git rm --cached strip-talmind-1.jpg strip-talmind-2.jpg strip-talmind-3.jpg

# 4. bump ?v= across the site by one
```

## The files here

- `strip-private-1.png` `-2` `-3` — the grey screens themselves: a side rail and tiles, a
  detail view, a list. Neutral grey, no type, no colour, nothing readable.
- `index.card.html`, `hero-dots.card.html` — the whole `<article class="reveal pcard
  pcard--talmind">` block from each homepage at commit `76bb04b`, verbatim. **These are the
  card as it was with the PADLOCK on it**, from before the project opened, so they are a
  record rather than something to paste back as-is. The lock itself is in
  `versions/talmind-lock-31.08.2026`.

## Worth knowing

Being anonymous on the card never made the project private. It was the password lock that
did that, and it is off: `talmind.html` opens for anyone and no longer carries
`noindex, nofollow`. Grey screens on the card while the case study shows every one of them a
click away is a choice about how the card reads, not a way of holding anything back.
