#!/bin/sh
# Publish the site to GitHub Pages.
#   ./publish.sh "what changed"
# Mirrors the site folder into this repo (minus the assets .gitignore lists), commits, pushes.
# Live at https://yeudaamitzur.github.io within about a minute.
SRC="/Users/yehudaamitzur/Desktop/Commands to Claude/website/netlify-deploy"
cd "$(dirname "$0")" || exit 1
[ -d "$SRC" ] || { echo "source folder not found: $SRC"; exit 1; }

# Talmind is half sealed (12.10.2026). The public talmind.html carries the rest of the page as
# ciphertext and the study's own pictures live in enc/ - so a plaintext copy of either, dropped
# into netlify-deploy by hand, would publish the whole case study. Refuse rather than ship it.
if ! grep -q 'id="tm-sealed"' "$SRC/talmind.html" 2>/dev/null; then
  echo "REFUSED: netlify-deploy/talmind.html is not the sealed build."
  echo "         run: python3 \"$HOME/Desktop/Commands to Claude/website/talmind-private/build.py\""
  exit 1
fi
# A Talmind picture that no published page names has no business being reachable at its own
# address - that is how the sealed half leaks, one capture at a time. The build takes them out;
# this is the backstop. The teaser's own pictures (the hero, the two tablets) are referenced, so
# they pass.
for f in "$SRC"/talmind-* "$SRC"/ds-semantic.jpg "$SRC"/ds-typography.jpg "$SRC"/strip-talmind-*; do
  [ -e "$f" ] || continue
  base=$(basename "$f")
  if ! grep -qF -- "$base" "$SRC"/*.html "$SRC"/*.js "$SRC"/*.css 2>/dev/null; then
    echo "REFUSED: $base sits in netlify-deploy and no page uses it - run talmind-private/build.py"
    exit 1
  fi
done

rsync -a --delete \
  --exclude '.git' --exclude '.github' --exclude '.gitignore' --exclude 'publish.sh' \
  --exclude-from='.gitignore' \
  "$SRC"/ .
git add -A
git diff --cached --quiet && { echo "nothing to publish — the repo already matches the site folder"; exit 0; }
git commit -q -m "${1:-Update site}"
git push -q
echo "published: $(git log --oneline -1)"
