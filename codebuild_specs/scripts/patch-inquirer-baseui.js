#!/usr/bin/env node
'use strict';

/**
 * Post-install patch for the legacy `inquirer` package bundled with the
 * installed Amplify Gen 1 CLI (`@aws-amplify/cli-internal`).
 *
 * Why this exists
 * ---------------
 * Several Gen 1 e2e tests (function_migration, http_migration,
 * custom_query_mutation_extension) drive `amplify add function` through the
 * vendored nexpect harness. After answering the "Do you want to edit the local
 * lambda function now?" confirm prompt with "N", the harness immediately sends
 * EOF (Ctrl-D). EOF closes the underlying readline interface. inquirer then
 * runs its own teardown in `lib/ui/baseUI.js#close()`, which calls
 * `this.rl.pause()` on the now-closed readline.
 *
 * On Node <= 22 calling `pause()` on a closed readline was a silent no-op. On
 * Node 24 it throws `ERR_USE_AFTER_CLOSE: readline was closed`, which surfaces
 * to the user as "🛑 There was an error adding the function resource" and fails
 * the test.
 *
 * The fix guards the `pause()` call so it is skipped when the readline is
 * already closed:
 *
 *     this.rl.pause();   ->   if (!this.rl.closed) { this.rl.pause(); }
 *
 * This script is run from `shared-scripts.sh` right after the CLI is installed
 * globally from the local registry. It is intentionally category-api-only and
 * does not require republishing `@aws-amplify/cli-internal`. The upstream
 * inquirer-usage fix (confirmPrompt -> confirmContinue) is tracked separately
 * in amplify-cli at lower urgency.
 *
 * The patch is idempotent: re-running it on an already-patched (or missing)
 * file is a no-op.
 *
 * Usage:
 *   node patch-inquirer-baseui.js <baseUI.js path> [<baseUI.js path> ...]
 *
 * Exit code is always 0 so a missing file never breaks the install step.
 */

const fs = require('fs');

const UNPATCHED = 'this.rl.pause();';
const PATCHED = 'if (!this.rl.closed) { this.rl.pause(); }';

/**
 * Patch a single inquirer `baseUI.js` file in place.
 *
 * @param {string} filePath Absolute path to the inquirer `lib/ui/baseUI.js`.
 * @returns {'patched' | 'already-patched' | 'not-found' | 'skipped'} Outcome.
 */
function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch-inquirer-baseui] not found, skipping: ${filePath}`);
    return 'not-found';
  }

  const original = fs.readFileSync(filePath, 'utf8');

  if (original.includes(PATCHED)) {
    console.log(`[patch-inquirer-baseui] already patched: ${filePath}`);
    return 'already-patched';
  }

  if (!original.includes(UNPATCHED)) {
    console.log(`[patch-inquirer-baseui] no matching 'this.rl.pause();' to patch: ${filePath}`);
    return 'skipped';
  }

  // Replace only the bare, unguarded call. Using split/join avoids regex
  // surprises and only touches the exact `this.rl.pause();` statement.
  const updated = original.split(UNPATCHED).join(PATCHED);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`[patch-inquirer-baseui] patched: ${filePath}`);
  return 'patched';
}

function main() {
  const targets = process.argv.slice(2);

  if (targets.length === 0) {
    console.log('[patch-inquirer-baseui] no baseUI.js paths provided; nothing to do');
    return;
  }

  for (const target of targets) {
    try {
      patchFile(target);
    } catch (err) {
      // Never fail the install step over a best-effort patch.
      console.log(`[patch-inquirer-baseui] error patching ${target}: ${err && err.message}`);
    }
  }
}

main();
