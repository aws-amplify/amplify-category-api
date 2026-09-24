import * as path from 'path';
import * as vm from 'vm';
import * as fs from 'fs-extra';

export function getAWSExportsPath(projRoot: string): string {
  return path.join(projRoot, 'src', 'aws-exports.js');
}

/**
 * Loads the generated `aws-exports.js` and returns it in the shape callers expect:
 * an object whose `default` property is the exports config.
 *
 * The generated file uses ES module syntax (`export default { ... }`). Historically this
 * was loaded by copying it to a `.mjs` file and requiring it through the `esm` package.
 * That package is unmaintained (last published 2020) and its V8-internal shims throw
 * `TypeError: Function.prototype.apply was called on undefined` on Node 20/22, which
 * crashed every test that reads aws-exports. We instead evaluate the file in a `vm`
 * sandbox with no external loader, supporting both the ESM (`export default`) and the
 * CommonJS (`module.exports`) shapes, and normalize the result to `{ default: config }`.
 */
export function getAWSExports(projectRoot: string): { default: any } {
  const awsExportsPath = getAWSExportsPath(projectRoot);
  const source = fs.readFileSync(awsExportsPath, 'utf8');

  // Rewrite the sole ES-module `export default <expr>` into an assignment we can capture,
  // leaving a CommonJS `module.exports` file untouched.
  const transformed = source.replace(/export\s+default\s+/, 'module.exports.default = ');

  const sandboxModule: { exports: Record<string, any> } = { exports: {} };
  const context = vm.createContext({ module: sandboxModule, exports: sandboxModule.exports });
  vm.runInContext(transformed, context, { filename: awsExportsPath });

  const loaded = sandboxModule.exports;
  // Normalize: an ESM file yields `{ default: config }`; a CJS file yields the config on
  // `module.exports` directly. Callers expect the config under `.default`.
  return 'default' in loaded ? (loaded as { default: any }) : { default: loaded };
}
