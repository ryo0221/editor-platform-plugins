#!/usr/bin/env bash
set -euo pipefail
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
repository='ryo0221/editor-platform-plugins'
repository_url="https://github.com/$repository.git"
if [ "${1:-}" = '--check' ]; then
  test "$(git -C "$root" branch --show-current)" = main
  test -z "$(git -C "$root" status --porcelain)"
  node "$root/scripts/verify-upstream.mjs"
  echo 'Publication source checks passed. No remote write performed.'
  exit 0
fi
command -v gh >/dev/null || { echo 'GitHub CLI is required for public repository creation. Install gh, authenticate, then rerun this script.' >&2; exit 2; }
test "$(git -C "$root" branch --show-current)" = main
test -z "$(git -C "$root" status --porcelain)" || { echo 'Stop: source checkout has changes.' >&2; exit 1; }
node "$root/scripts/verify-upstream.mjs"
gh auth status
if gh repo view "$repository" --json visibility >/dev/null 2>&1; then
  test "$(gh repo view "$repository" --json visibility -q .visibility)" = PUBLIC || { echo 'Stop: existing destination is not public.' >&2; exit 1; }
else
  gh repo create "$repository" --public --description 'MCP Apps integrations for the public Open Editor Platform editors'
fi
existing_refs="$(GIT_TERMINAL_PROMPT=0 git ls-remote "$repository_url")"
commit="$(git -C "$root" rev-parse HEAD)"
if [ -n "$existing_refs" ]; then
  if [ "$existing_refs" = "$(printf '%s\tHEAD\n%s\trefs/heads/main' "$commit" "$commit")" ]; then
    echo 'Public repository already contains this commit.'; exit 0
  fi
  echo 'Stop: destination has history. This script never overwrites it.' >&2; exit 1
fi
if git -C "$root" remote get-url origin >/dev/null 2>&1; then
  test "$(git -C "$root" remote get-url origin)" = "$repository_url"
  test "$(git -C "$root" remote get-url --push origin)" = "$repository_url"
else
  git -C "$root" remote add origin "$repository_url"
fi
git -C "$root" push -u origin main:main
test "$(git ls-remote "$repository_url" refs/heads/main | cut -f1)" = "$commit"
echo "Published and verified: https://github.com/$repository"
