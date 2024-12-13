module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  bail: false,
  verbose: true,
  testRunner: 'jest-circus/runner',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'core', 'node'],
  collectCoverage: true,
  coverageReporters: ['clover', 'text', 'html'],
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.(ts|tsx|js|jsx)', '!src/**/*.test.(ts|tsx|js|jsx)', '!src/**/*.d.ts'],
  coveragePathIgnorePatterns: ['/__tests__/', '/.*\\.template.js'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
  coverageDirectory: 'coverage',
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  setupFilesAfterEnv: ['<rootDir>/../../setup-jest.js'],
};
