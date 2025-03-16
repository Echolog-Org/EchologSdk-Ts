 /**
   * Utility method to convert various argument types to strings
   * @param arg The argument to stringify
   */
 export function stringifyArg(arg: any): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
    
    try {
      if (typeof arg === 'object') {
        return JSON.stringify(arg);
      }
      return String(arg);
    } catch (e) {
      return '[Object]';
    }
  }

  /**
   * Determines if a network request should be captured
   * @param url The URL of the request
   */
  export function shouldCaptureRequest(url: string, apiUrl: string): boolean {
    // Don't capture requests to the Echolog API to avoid infinite loops
    if (url.includes(apiUrl)) {
      return false;
    }
    return true;
  }

   /**
   * Generates a unique ID for events
   * @returns A UUID v4 format string
   */
   export function generateUniqueId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Detects the current browser name
   * @returns The browser name or 'unknown'
   */
  export function getBrowserName(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    
    if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
    if (userAgent.indexOf('Safari') > -1) return 'Safari';
    if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
    if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) return 'Internet Explorer';
    if (userAgent.indexOf('Edge') > -1) return 'Edge';
    
    return 'unknown';
  }
