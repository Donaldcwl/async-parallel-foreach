module.exports = {
  transform: {
    '.(ts|tsx)': 'ts-jest'
  },
  testEnvironment: 'node',
  // testPathIgnorePatterns: ['async-parallel-foreach.e2e.ts'],
  testRegex: '(/__tests__/.*|\\.(test|spec|e2e))\\.(ts|tsx|js)$',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js'
  ],
  coverageReporters: ["json-summary", "json", "lcov", "text", "clover"],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/'
  ],
  coverageThreshold: {
    'global': {
      'branches': 90,
      'functions': 95,
      'lines': 95,
      'statements': 95
    }
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}'
  ]
}