module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
  coverageProvider: 'v8',
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,js}'],
  coverageReporters: ['cobertura', 'lcov', 'text', 'clover'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/src/__tests__/helpers/'],
  testEnvironment: 'jsdom',
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
      branches: 77,
    },
  },
};
