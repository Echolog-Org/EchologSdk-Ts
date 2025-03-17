"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("../src/core"); // This should work if index.ts exports these
// Mock the global fetch API
global.fetch = jest.fn().mockImplementation(() => Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
}));
describe('EchologClient', () => {
    let client;
    const mockOptions = {
        apiKey: 'ecl_d553b8fa02094b6d8aae77e95ccd7528',
        environment: 'testing',
        captureUnhandledErrors: true,
        captureUnhandledPromiseRejections: true,
        enableConsoleCapture: true,
        enableNetworkCapture: true,
        flushInterval: 100,
    };
    beforeEach(() => {
        jest.clearAllMocks();
        client = (0, core_1.initEcholog)(mockOptions);
    });
    afterEach(() => {
        if (client.flushIntervalId) {
            clearInterval(client.flushIntervalId);
        }
    });
    it('initializes correctly', () => {
        expect(client).toBeInstanceOf(core_1.EchologClient);
        expect(window.echolog).toBe(client);
    });
    it('starts and ends session', () => {
        const captureSpy = jest.spyOn(client, 'captureEvent');
        client.startSession();
        expect(client.sessionId).toBeDefined();
        expect(client.sessionStartTime).toBeInstanceOf(Date);
        expect(captureSpy).toHaveBeenCalledWith(expect.objectContaining({
            level: 'info',
            message: 'Session started',
        }));
        client.endSession();
        expect(captureSpy).toHaveBeenCalledWith(expect.objectContaining({
            level: 'info',
            message: 'Session ended',
        }));
        expect(client.sessionId).toBeUndefined();
    });
    it('captures messages', () => {
        const eventId = client.captureMessage('Test message', { level: 'warning' });
        expect(eventId).toBeDefined();
        expect(client['eventQueue']).toHaveLength(1);
        expect(client['eventQueue'][0]).toMatchObject({
            level: 'warning',
            message: 'Test message',
        });
    });
    it('captures exceptions', () => {
        const error = new Error('Test error');
        const eventId = client.captureException(error);
        expect(eventId).toBeDefined();
        expect(client['eventQueue']).toHaveLength(1);
        expect(client['eventQueue'][0]).toMatchObject({
            level: 'error',
            message: 'Test error',
            exception: {
                type: 'Error',
                value: 'Test error',
            },
        });
    });
    it('flushes events', () => __awaiter(void 0, void 0, void 0, function* () {
        client.captureMessage('Test flush');
        yield new Promise(resolve => setTimeout(resolve, 150));
        expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                'x-api-key': mockOptions.apiKey, // Use the actual API key from mockOptions
            }),
        }));
    }));
    it('captures console messages', () => {
        const captureSpy = jest.spyOn(client, 'captureEvent');
        console.log('Test console message');
        expect(captureSpy).toHaveBeenCalledWith(expect.objectContaining({
            level: 'info',
            message: 'Test console message',
            console: expect.objectContaining({
                level: 'log',
            }),
        }));
    });
    it('captures network requests', () => __awaiter(void 0, void 0, void 0, function* () {
        const captureSpy = jest.spyOn(client, 'captureEvent');
        yield fetch('https://example.com', { method: 'POST' });
        expect(captureSpy).toHaveBeenCalledWith(expect.objectContaining({
            level: 'info',
            network: expect.objectContaining({
                url: 'https://example.com',
                method: 'POST',
            }),
        }));
    }));
});
// Mock utility functions
jest.mock('../utilities/utility', () => ({
    generateUniqueId: () => 'mock-id-' + Math.random().toString(36).substr(2, 9),
    getBrowserName: () => 'Jest Browser',
    stringifyArg: (arg) => String(arg),
    shouldCaptureRequest: (url, apiUrl) => url !== apiUrl,
}));
