const baseConfig = require('../../jest.config.base.js'); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 97,
      lines: 97,
      functions: 97,
    },
  },
};
