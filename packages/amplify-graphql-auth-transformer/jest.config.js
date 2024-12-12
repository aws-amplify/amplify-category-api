const baseConfig = require('../../jest.config.base.js');

module.exports = {
  ...baseConfig,
  coverageThreshold: {
    global: {
      branches: 88,
      functions: 96,
      lines: 93,
    },
  },
};
