"use strict";
// Client Types File
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLevel = exports.LogLevel = void 0;
// Log level enum, matching server's LogLevel (UPPERCASE)
var LogLevel;
(function (LogLevel) {
    LogLevel["TRACE"] = "TRACE";
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["FATAL"] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// Console level enum, matching server's ConsoleLevel (lowercase)
var ConsoleLevel;
(function (ConsoleLevel) {
    ConsoleLevel["Log"] = "log";
    ConsoleLevel["Info"] = "info";
    ConsoleLevel["Warn"] = "warn";
    ConsoleLevel["Error"] = "error";
    ConsoleLevel["Debug"] = "debug";
})(ConsoleLevel || (exports.ConsoleLevel = ConsoleLevel = {}));
