"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = exports.EchoLogErrorBoundary = exports.useEchoLog = exports.logEvent = exports.logError = exports.initEchoLog = exports.collectContext = exports.createMetadataType = exports.LogLevel = void 0;
exports.initEcholog = initEcholog;
// src/index.ts
// src/index.ts
const client_1 = require("./client/client");
function initEcholog(options) {
    const client = new client_1.EchologClient(sanitizeOptions(options));
    const globalObj = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
    globalObj.echolog = client;
    return client;
}
function sanitizeOptions(options) {
    var _a;
    return Object.assign(Object.assign({}, options), { autoReplay: (_a = options.autoReplay) !== null && _a !== void 0 ? _a : false });
}
__exportStar(require("./client/client"), exports);
var types_1 = require("./core/types");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return types_1.LogLevel; } });
var global_1 = require("./global");
Object.defineProperty(exports, "createMetadataType", { enumerable: true, get: function () { return global_1.createMetadataType; } });
Object.defineProperty(exports, "collectContext", { enumerable: true, get: function () { return global_1.collectContext; } });
var EchoLogErrorBoudary_1 = require("./react/src/EchoLogErrorBoudary");
Object.defineProperty(exports, "initEchoLog", { enumerable: true, get: function () { return EchoLogErrorBoudary_1.initEchoLog; } });
Object.defineProperty(exports, "logError", { enumerable: true, get: function () { return EchoLogErrorBoudary_1.logError; } });
Object.defineProperty(exports, "logEvent", { enumerable: true, get: function () { return EchoLogErrorBoudary_1.logEvent; } });
Object.defineProperty(exports, "useEchoLog", { enumerable: true, get: function () { return EchoLogErrorBoudary_1.useEchoLog; } });
Object.defineProperty(exports, "EchoLogErrorBoundary", { enumerable: true, get: function () { return EchoLogErrorBoudary_1.EchoLogErrorBoundary; } });
Object.defineProperty(exports, "getClient", { enumerable: true, get: function () { return EchoLogErrorBoudary_1.getClient; } });
