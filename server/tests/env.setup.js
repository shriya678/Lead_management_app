// Must run BEFORE any src/ file is required so config/env.js validation passes.
// MONGO_URI is a placeholder — real URI comes from the per-file MongoMemoryServer.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-testing-only-do-not-use-in-prod';
process.env.MONGO_URI = 'mongodb://placeholder-overridden-in-tests';
