#!/bin/bash
# resolve-bundled-symlinks.sh
#
# Removes nested node_modules from symlinked monorepo-local packages inside
# a construct package's node_modules. This prevents jsii-pacmak from creating
# tgz entries with '..' directory traversal that npm rejects (TAR_ENTRY_ERROR).
#
# The symlinked packages' own node_modules contain duplicate deps that are
# already available in the construct's node_modules (via nohoist). Removing
# the nested ones is safe and prevents the '..' path issue.
#
# Usage: ./scripts/resolve-bundled-symlinks.sh <package-dir>
# Example: ./scripts/resolve-bundled-symlinks.sh packages/amplify-graphql-api-construct

set -euo pipefail

PACKAGE_DIR="${1:?Usage: $0 <package-dir>}"
NODE_MODULES="$PACKAGE_DIR/node_modules"

if [ ! -d "$NODE_MODULES" ]; then
  echo "No node_modules directory found in $PACKAGE_DIR"
  exit 1
fi

cleaned=0
realPkgDir=$(readlink -f "$PACKAGE_DIR")

# Iterate over package symlinks (top-level and scoped)
for link in "$NODE_MODULES"/* "$NODE_MODULES"/@*/*; do
  # Skip if glob didn't match
  [ -e "$link" ] || [ -L "$link" ] || continue

  # Skip dot-dirs (.bin, .cache, etc.)
  case "$(basename "$link")" in
    .*) continue ;;
  esac

  # Only look at scoped or top-level packages
  dirbase=$(basename "$(dirname "$link")")
  case "$dirbase" in
    node_modules|@*) ;; # OK
    *) continue ;;
  esac

  # Only process symlinks pointing outside package dir
  [ -L "$link" ] || continue
  target=$(readlink -f "$link")
  case "$target" in
    "$realPkgDir"/*) continue ;; # inside package dir, skip
  esac

  # If the symlink target has its own node_modules, remove it
  if [ -d "$target/node_modules" ]; then
    relname="${link#$NODE_MODULES/}"
    nm_contents=$(ls "$target/node_modules" 2>/dev/null | tr '\n' ', ')
    echo "Cleaning nested node_modules from $relname (contained: ${nm_contents%, })"
    rm -rf "$target/node_modules"
    cleaned=$((cleaned + 1))
  fi
done

echo "Cleaned nested node_modules from $cleaned symlinked packages"
