# The homepage card, as it stood before it went anonymous — 28.08.2026

Taken from commit **`76bb04b`**, the last commit in which the homepage card named the
project. Kept so the card can be put back **exactly** as it was, in one pass, whenever
Yehuda says the word.

This folder is **not served**. `.github/workflows/pages.yml` deletes `versions/` from its
checkout before the upload step, so nothing in here is reachable from the site — which is
the point, since the files below are the very text that came off the card.

---

## What changed on 28.08.2026

The project stays locked exactly as it was — padlock, password field, `/talmind` guard, the
whole of `lock.js` untouched. What changed is only what the **shut** card says and shows:

| | before (in this folder) | after (live now) |
|---|---|---|
| card name | `Talmind` | `Confidential` |
| headline, `index.html` | `Built a pilot that answers a huge need in Korean classrooms` | `Built a pilot that answers a huge need in the classroom` |
| headline, `hero-dots.html` | `Built a real pilot that answers a huge need in Korean classrooms` | `Built a pilot that answers a huge need in the classroom` |
| `aria-label` | `Talmind - a private project` | `A private project` |
| the three screens | `strip-talmind-1.jpg` `-2` `-3` | `strip-private-1.png` `-2` `-3` |
| chip / kind | `Case study` / `Learning app` | unchanged |

Prose comments on both homepages that spelled the name out were reworded at the same time
(the `og:image` note, the `lock.js` note, the card-stack note, and on `hero-dots.html` the
`og:image:alt`). `pcard--talmind` and `data-open="/talmind"` were **left alone** — the
stylesheet and `lock.js` are wired to them, and renaming them buys nothing while
`/talmind` is a real page and `lock.js` is a public file.

The three original captures were also dropped from the repo and added to `.gitignore`,
which is how this site has always retired an asset: still on Yehuda's disk, no longer
served. They are in the history at `76bb04b`.

## The files here

- `index.card.html` — the whole `<article class="reveal pcard pcard--talmind">` block from
  `index.html`, verbatim, at `76bb04b`.
- `hero-dots.card.html` — the same block from `hero-dots.html`. It is **not** identical to
  the one above: the alternate homepage carried a shorter comment and the older headline
  (`Built a real pilot …`). Restore each into its own file.

## Putting it back

```sh
# 1. the two card blocks, and the captures they point at
git checkout 76bb04b -- index.html hero-dots.html strip-talmind-1.jpg strip-talmind-2.jpg strip-talmind-3.jpg

# 2. drop the three strip-talmind lines from .gitignore, or step 1's images stay unpublished
#    (they are the last block in the file, under "The private case study's own captures")

# 3. bump ?v= across the site by one, so a cached page does not keep asking for the grey PNGs
```

`git checkout 76bb04b -- index.html hero-dots.html` also rewinds anything **else** those two
files gained after 28.08.2026. If there is any such work, restore the card blocks alone: the
two files in this folder are exactly what has to sit back in place, at
`index.html` line 147 and `hero-dots.html` line 117, replacing the article block that is
there. Then `strip-private-1..3.png` can go.

Nothing outside those two files needs touching. `lock.js` and the `.pcard--talmind` rules in
`styles.css` were never part of this change.

## What this does and does not hide

It makes the **homepage** say nothing about the project: not the name, not the subject, not
the country, and no screen anyone can read. That is the front door, and the front door is
what a visitor sees.

It is not a secret. This repository is public, so every commit before this one — the card,
the copy, the captures — is still readable on GitHub, and the case study itself is still a
file on the server: the guard in `talmind.html` sends a browser home, but the page's own
source answers a plain fetch. Taking the project genuinely off the internet means taking
`talmind.html` and its assets off the server, and that is a bigger decision than this one.
