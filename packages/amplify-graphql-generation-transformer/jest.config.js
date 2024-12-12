const baseConfig = require('../../jest.config.base.js'); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = {
  ...baseConfig,
  snapshotFormat: {
    escapeString: false,
    printBasicPrototype: false,
  },
  coverageThreshold: {
    global: {
      branches: 90,
      lines: 88,
      functions: 95,
    },
  },
};
