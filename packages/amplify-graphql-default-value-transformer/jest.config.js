const baseConfig = require('../../jest.config.base.js'); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 89,
      lines: 90,
      functions: 90,
    },
  },
};
