// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',              // Use ts-jest to transform TypeScript
  testEnvironment: 'jest-environment-jsdom',       // Simulate browser environment
  testMatch: ['**/*.test.ts'],    // Match your test file
  moduleFileExtensions: ['ts', 'js'], // Process .ts and .js files
  rootDir: '.',     // Set root to project directory
};

module.exports = config;          // CommonJS export