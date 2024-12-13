const baseConfig = require('../../jest.config.base.js'); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = {
  ...baseConfig,
  coveragePathIgnorePatterns: [...baseConfig.coveragePathIgnorePatterns, 'src/directives/directive.ts'],
};
