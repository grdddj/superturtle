#!/usr/bin/env bash
set -euo pipefail

# Super Turtle release script
# Usage: ./release.sh patch|minor|major

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# --- Validate args ---
BUMP="${1:-}"
if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: ./release.sh patch|minor|major"
  echo ""
  echo "  patch  — bug fixes (0.1.0 → 0.1.1)"
  echo "  minor  — new features (0.1.0 → 0.2.0)"
  echo "  major  — breaking changes (0.1.0 → 1.0.0)"
  exit 1
fi

# --- Pre-flight checks ---
if ! npm whoami &>/dev/null; then
  echo "Error: not logged in to npm. Run: npm adduser"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is dirty. Commit or stash changes first."
  exit 1
fi

CURRENT=$(node -p "require('./package.json').version")

# --- Check CHANGELOG.md ---
if ! grep -q '\[Unreleased\]' CHANGELOG.md; then
  echo "Error: no [Unreleased] section in CHANGELOG.md"
  exit 1
fi

UNRELEASED_CONTENT=$(sed -n '/^## \[Unreleased\]/,/^## \[/{ /^## \[/d; p; }' CHANGELOG.md | sed '/^$/d')
if [[ -z "$UNRELEASED_CONTENT" ]]; then
  echo "Error: [Unreleased] section in CHANGELOG.md is empty."
  echo "Add your changes there before releasing."
  exit 1
fi

# --- Bump version ---
npm version "$BUMP" --no-git-tag-version --quiet
NEW=$(node -p "require('./package.json').version")

# --- Stamp CHANGELOG.md ---
DATE=$(date +%Y-%m-%d)
sed -i '' "s/^## \[Unreleased\]/## [Unreleased]\n\n## [$NEW] - $DATE/" CHANGELOG.md

# --- Commit, tag, publish ---
cd "$SCRIPT_DIR/.."
git add super_turtle/package.json super_turtle/CHANGELOG.md
git commit -m "release: v$NEW"
git tag "v$NEW"

echo ""
echo "  $CURRENT → $NEW"
echo ""
echo "Ready to publish. Run:"
echo ""
echo "  cd super_turtle && npm publish && cd .. && git push --follow-tags"
echo ""
