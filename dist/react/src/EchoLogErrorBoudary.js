"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EchoLogErrorBoundary = void 0;
exports.initEchoLog = initEchoLog;
exports.logError = logError;
exports.logEvent = logEvent;
exports.useEchoLog = useEchoLog;
exports.getClient = getClient;
const react_1 = require("react");
const client_1 = require("../../client/client");
const types_1 = require("../../core/types");
const react_2 = __importDefault(require("react"));
let echologClient = null;
/**
 * Initialize the EchoLog SDK for React applications
 * @param options Configuration options for the logging client
 * @returns Initialized EchologClient instance
 */
function initEchoLog(options) {
    var _a;
    if (echologClient) {
        return echologClient;
    }
    const defaultOptions = {
        captureUnhandledErrors: true,
        captureUnhandledPromiseRejections: true,
        enableConsoleCapture: true,
        enableNetworkCapture: true,
        flushInterval: 5000,
        projectId: '',
        maxBatchSize: 10,
        serviceName: 'react-app',
        sampleRate: 1.0,
        debug: false,
        maxRetries: 3,
        includeBrowserMetadata: true,
        trackableElements: [],
        beforeSend: (event) => {
            var _a;
            if (typeof window !== 'undefined') {
                event.metadata = Object.assign(Object.assign({}, event.metadata), { react: Object.assign(Object.assign({}, (_a = event.metadata) === null || _a === void 0 ? void 0 : _a.react), { version: react_2.default.version }) });
            }
            return event;
        },
    };
    /**
     * Create a new EchologClient instance with the provided options
     * and store it in the global variable
     * @type {EchologClient<ReactErrorMetadata>}
     */
    echologClient = new client_1.EchologClient(Object.assign(Object.assign(Object.assign({}, defaultOptions), options), { apiKey: options.apiKey, serviceName: options.serviceName || defaultOptions.serviceName || 'react-app', autoReplay: (_a = options.autoReplay) !== null && _a !== void 0 ? _a : false }));
    echologClient.startSession();
    return echologClient;
}
/**
 * Log an error with React-specific context
 * @param error The error to log
 * @param options Additional options for the log event
 * @returns The event ID for the captured log
 */
function logError(error, options = {}) {
    if (!echologClient) {
        console.warn('[EchoLog] SDK not initialized. Call initEchoLog first.');
        return '';
    }
    const metadata = Object.assign({ react: {
            componentName: options.componentName || options.component || '',
            componentStack: '',
            props: options.props || {},
        } }, options.extraData);
    const userData = options.userId ? { id: options.userId } : undefined;
    return echologClient.captureException(error, {
        metadata,
        user: userData,
        tags: options.tags,
    });
}
/**
 * Log a custom event
 * @param message The message to log
 * @param options Additional options for the log event
 * @returns The event ID for the captured log
 */
function logEvent(message, options = {}) {
    if (!echologClient) {
        console.warn('[EchoLog] SDK not initialized. Call initEchoLog first.');
        return '';
    }
    const metadata = Object.assign({ react: {
            componentName: options.componentName || '',
            componentStack: '',
            props: options.props || {},
        } }, options.metadata);
    const userData = options.userId ? { id: options.userId } : undefined;
    return echologClient.captureMessage(message, {
        level: options.level || types_1.LogLevel.INFO,
        metadata,
        user: userData,
        tags: options.tags,
    });
}
/**
 * Error boundary component for React applications
 */
class EchoLogErrorBoundary extends react_1.Component {
    constructor() {
        super(...arguments);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        // Extract component name from component stack
        const componentMatch = errorInfo.componentStack && errorInfo.componentStack.match(/^\s*in\s(.+)$/);
        const componentName = componentMatch ? componentMatch[1] : 'Unknown';
        // Log the error with React-specific context
        logError(error, {
            componentName,
            extraData: {
                react: {
                    componentName,
                    componentStack: errorInfo.componentStack,
                },
            },
        });
        // Call the onError prop if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback || null;
        }
        return this.props.children;
    }
}
exports.EchoLogErrorBoundary = EchoLogErrorBoundary;
/**
 * Hook to use EchoLog in functional components
 * @returns Object with log methods
 */
function useEchoLog() {
    return {
        logError,
        logEvent,
        captureException: (error, options = {}) => logError(error, options),
        captureMessage: (message, options = {}) => logEvent(message, options),
    };
}
// Export the client instance getter
function getClient() {
    return echologClient;
}
