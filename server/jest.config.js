module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/env.setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testTimeout: 20000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/scripts/**',
  ],
};
