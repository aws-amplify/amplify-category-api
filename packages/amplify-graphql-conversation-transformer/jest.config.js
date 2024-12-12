const baseConfig = require('../../jest.config.base.js'); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = {
  ...baseConfig,
  modulePathIgnorePatterns: ['templates'],
  coverageThreshold: {
    global: {
      branches: 92,
      lines: 91,
      functions: 95,
    },
  },
  snapshotFormat: {
    escapeString: false,
    printBasicPrototype: false,
  },
};
