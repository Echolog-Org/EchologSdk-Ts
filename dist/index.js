"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectContext = exports.createMetadataType = exports.LogLevel = exports.initEcholog = exports.EchologClient = void 0;
// src/index.ts
var client_1 = require("./client");
Object.defineProperty(exports, "EchologClient", { enumerable: true, get: function () { return client_1.EchologClient; } });
Object.defineProperty(exports, "initEcholog", { enumerable: true, get: function () { return client_1.initEcholog; } });
var types_1 = require("./core/types");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return types_1.LogLevel; } });
var global_1 = require("./global");
Object.defineProperty(exports, "createMetadataType", { enumerable: true, get: function () { return global_1.createMetadataType; } });
Object.defineProperty(exports, "collectContext", { enumerable: true, get: function () { return global_1.collectContext; } });
