#!/bin/sh
# Publish the site to GitHub Pages.
#   ./publish.sh "what changed"
# Mirrors the site folder into this repo (minus the assets .gitignore lists), commits, pushes.
# Live at https://yeudaamitzur.github.io within about a minute.
SRC="/Users/yehudaamitzur/Desktop/Commands to Claude/website/netlify-deploy"
cd "$(dirname "$0")" || exit 1
[ -d "$SRC" ] || { echo "source folder not found: $SRC"; exit 1; }
rsync -a --delete \
  --exclude '.git' --exclude '.github' --exclude '.gitignore' --exclude 'publish.sh' \
  --exclude-from='.gitignore' \
  "$SRC"/ .
git add -A
git diff --cached --quiet && { echo "nothing to publish — the repo already matches the site folder"; exit 0; }
git commit -q -m "${1:-Update site}"
git push -q
echo "published: $(git log --oneline -1)"
