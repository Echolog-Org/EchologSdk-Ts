import { initEcholog, EchologClient } from "../src"; // This should work if index.ts exports these
import { EchologOptions } from "../src/core/types";

// Mock the global fetch API
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
  } as Response)
) as jest.Mock;

describe('EchologClient', () => {
  let client: EchologClient;
  const mockOptions: EchologOptions = {
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
    client = initEcholog(mockOptions);
  });

  afterEach(() => {
    if ((client as any).flushIntervalId) {
      clearInterval((client as any).flushIntervalId);
    }
  });

  it('initializes correctly', () => {
    expect(client).toBeInstanceOf(EchologClient);
    expect((window as any).echolog).toBe(client);
  });

  it('starts and ends session', () => {
    const captureSpy = jest.spyOn(client, 'captureEvent');

    client.startSession();
    expect((client as any).sessionId).toBeDefined();
    expect((client as any).sessionStartTime).toBeInstanceOf(Date);
    expect(captureSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Session started',
      })
    );

    client.endSession();
    expect(captureSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Session ended',
      })
    );
    expect((client as any).sessionId).toBeUndefined();
  });

  it('captures messages', () => {
    const eventId = client.captureMessage('Test message', { level: ("WARNING" as any) });
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

  it('flushes events', async () => {
    client.captureMessage('Test flush');
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': mockOptions.apiKey, // Use the actual API key from mockOptions
        }),
      })
    );
  });

  it('captures console messages', () => {
    const captureSpy = jest.spyOn(client, 'captureEvent');
    console.log('Test console message');
    expect(captureSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Test console message',
        console: expect.objectContaining({
          level: 'log',
        }),
      })
    );
  });

  it('captures network requests', async () => {
    const captureSpy = jest.spyOn(client, 'captureEvent');
    await fetch('https://example.com', { method: 'POST' });
    expect(captureSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        network: expect.objectContaining({
          url: 'https://example.com',
          method: 'POST',
        }),
      })
    );
  });
});

// Mock utility functions
jest.mock('../utilities/utility', () => ({
  generateUniqueId: () => 'mock-id-' + Math.random().toString(36).substr(2, 9),
  getBrowserName: () => 'Jest Browser',
  stringifyArg: (arg: any) => String(arg),
  shouldCaptureRequest: (url: string, apiUrl: string) => url !== apiUrl,
}));