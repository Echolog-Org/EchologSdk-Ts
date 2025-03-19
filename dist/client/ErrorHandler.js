"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
class ErrorHandler {
    constructor(client, options) {
        this.client = client;
        this.options = options;
    }
    setupErrorCapture() {
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                if (event.defaultPrevented)
                    return;
                this.client.captureException(event.error || new Error(event.message), {
                    message: `Unhandled error: ${event.message}`,
                    metadata: {
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                    },
                });
            });
        }
    }
    setupPromiseRejectionCapture() {
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                this.client.captureException(event.reason || new Error('Unhandled Promise rejection'), {
                    message: 'Unhandled Promise rejection',
                });
            });
        }
    }
}
exports.ErrorHandler = ErrorHandler;
