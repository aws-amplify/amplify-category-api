const NodeEnvironment = require('jest-environment-node');

/**
 * NOTE: Any fixes in this file should also be ported to packages/amplify-e2e-core/src/cli-test-environment.js
 */
class FixJestEnvironment extends NodeEnvironment {
  constructor(...args) {
    super(...args);
    // https://github.com/jestjs/jest/issues/12628
    // structuredClone is missing in the jest node environment.
    // Newer versions of jest have fixed this, but is not possible to upgrade at this time.
    // Newer versions of jest have a performance issue when not used with Node ^20.11.0
    // https://github.com/jestjs/jest/issues/11956
    // Our minimum supported version is Node 18.
    this.global.structuredClone = structuredClone;
  }
}

module.exports = FixJestEnvironment;
