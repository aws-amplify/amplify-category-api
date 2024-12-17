const baseConfig = require('../../jest.config.base.js'); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 59,
      functions: 31,
      lines: 50,
    },
  },
};
