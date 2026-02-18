const baseConfig = require('../../jest.config.base.js'); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 64,
      lines: 79,
      functions: 77,
    },
  },
};
