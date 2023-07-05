module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,js}'],
  coverageReporters: ['cobertura', 'lcov', 'text'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/src/__tests__/helpers/'],
  testEnvironment: 'jsdom',
  coverageThreshold: {
    global: {
      lines: 100,
      statements: 100,
    },
  },
};
