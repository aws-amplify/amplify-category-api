// Unit tests for the maintenance scripts in this package. The package level jest config in package.json wires up the
// AWS backed e2e runner, environment and global setup, none of which these tests should load, so they get their own
// config and are excluded from the e2e test run.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__unit_tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
      },
    ],
  },
};
