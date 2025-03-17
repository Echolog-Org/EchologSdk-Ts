"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest', // Use ts-jest to transform TypeScript
    testEnvironment: 'jest-environment-jsdom', // Simulate browser environment
    testMatch: ['**/*.test.ts'], // Match your test file
    moduleFileExtensions: ['ts', 'js'], // Process .ts and .js files
    rootDir: '.', // Set root to project directory
};
module.exports = config; // CommonJS export
