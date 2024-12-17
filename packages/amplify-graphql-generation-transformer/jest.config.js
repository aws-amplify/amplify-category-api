const baseConfig = require('../../jest.config.base.js'); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = {
  ...baseConfig,
  snapshotFormat: {
    escapeString: false,
    printBasicPrototype: false,
  },
};
