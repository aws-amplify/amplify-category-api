/**
 * DRAFT / RFC (see the accompanying PR): opt-in "slim" packaging for the CDK
 * construct packages (`@aws-amplify/data-construct`,
 * `@aws-amplify/graphql-api-construct`).
 *
 * Problem
 * -------
 * These packages ship their non-jsii dependency closure via
 * `bundledDependencies` (derived from each package's `nonJsiiDependencies.json`
 * and verified by `scripts/verify-construct-dependencies.ts`). That closure is
 * large — each construct unpacks to ~225 MB / ~480 nested files — which
 * dominates `npm install` time for pure-npm/TypeScript consumers (e.g.
 * aws-amplify/amplify-backend), and is especially painful on Windows CI where
 * per-file antivirus scans make the unpack ~2x slower. Because the deps are
 * physically inside the published tarball, consumers cannot opt out via
 * `overrides`/`resolutions` (see amplify-category-api issue #3464).
 *
 * Every bundled dependency is ALSO declared as a normal `dependencies` entry,
 * so for a pure-npm consumer an UNbundled tarball resolves the exact same
 * packages+versions from the registry (npm hoists/dedupes them normally) — a
 * smaller, faster install with identical resolved code.
 *
 * This script produces such a slim tarball WITHOUT changing the default build
 * or the default published artifact in any way:
 *   1. Copy the already-built package dir to a temp location.
 *   2. In the COPY's package.json, remove `bundledDependencies` and mark it
 *      with a `-slim`-suffixed name/tag (configurable) so it can be published
 *      under an opt-in dist-tag / name and never collides with the default.
 *   3. `npm pack` the copy to emit the slim `.tgz`.
 *
 * The default `bundledDependencies` build (what every existing customer, and
 * every jsii/multi-language target, consumes) is untouched — this is purely
 * additive and opt-in. Maintainers own the decision of HOW to publish the
 * result (separate `-slim` package name vs. a `slim` dist-tag); this script
 * only builds the artifact so the tradeoff can be measured.
 *
 * Usage:
 *   ts-node scripts/pack-slim-construct.ts <constructPackageDir> [outDir]
 * e.g.
 *   ts-node scripts/pack-slim-construct.ts packages/amplify-data-construct
 */
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import * as os from 'os';

const [, , constructPackageDirArg, outDirArg] = process.argv;

if (!constructPackageDirArg) {
  throw new Error(
    'Usage: ts-node scripts/pack-slim-construct.ts <constructPackageDir> [outDir]',
  );
}

const constructPackageDir = path.resolve(constructPackageDirArg);
const outDir = path.resolve(outDirArg ?? process.cwd());
const packageJsonPath = path.join(constructPackageDir, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  throw new Error(`No package.json found at ${packageJsonPath}`);
}

const originalPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const bundled: string[] =
  originalPackageJson.bundledDependencies ??
  originalPackageJson.bundleDependencies ??
  [];

if (bundled.length === 0) {
  console.log(
    `${originalPackageJson.name} declares no bundledDependencies; nothing to slim.`,
  );
}

// Work on a throwaway copy so the source package dir (and the default build
// artifact) is never mutated.
const workDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'amplify-slim-construct-'),
);
const stagedDir = path.join(workDir, path.basename(constructPackageDir));
fs.cpSync(constructPackageDir, stagedDir, {
  recursive: true,
  // node_modules is not needed to pack a jsii-built package (lib/ + .jsii are
  // what ship); skip it to keep the copy fast.
  filter: (src) => path.basename(src) !== 'node_modules',
});

const stagedPackageJson = JSON.parse(
  fs.readFileSync(path.join(stagedDir, 'package.json'), 'utf-8'),
);

// The core of the slim variant: drop the bundling directive. The regular
// `dependencies` (which list the same packages with versions) are left intact,
// so npm resolves them from the registry for a pure-npm consumer.
delete stagedPackageJson.bundledDependencies;
delete stagedPackageJson.bundleDependencies;

// Publish-identity: default OFF. Maintainers can wire a `-slim` package name or
// a `slim` dist-tag; here we only annotate so the artifact is unmistakable and
// can never be mistaken for the default published package.
stagedPackageJson.amplifySlimBuild = true;

fs.writeFileSync(
  path.join(stagedDir, 'package.json'),
  JSON.stringify(stagedPackageJson, null, 2) + '\n',
);

fs.mkdirSync(outDir, { recursive: true });

console.log(
  `Packing SLIM (unbundled) variant of ${stagedPackageJson.name} ` +
    `(${bundled.length} bundledDependencies removed) into ${outDir}`,
);

execFileSync('npm', ['pack', '--pack-destination', outDir], {
  cwd: stagedDir,
  stdio: 'inherit',
});

fs.rmSync(workDir, { recursive: true, force: true });

console.log('Slim pack complete. Default (bundled) build is unchanged.');
