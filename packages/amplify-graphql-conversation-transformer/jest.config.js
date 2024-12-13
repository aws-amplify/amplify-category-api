const baseConfig = require('../../jest.config.base.js'); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = {
  ...baseConfig,
  modulePathIgnorePatterns: ['templates'],
  snapshotFormat: {
    escapeString: false,
    printBasicPrototype: false,
  },
};
