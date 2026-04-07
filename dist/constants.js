"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseFormat = exports.TOKEN_REFRESH_BUFFER_SECONDS = exports.MAX_AUTH_RETRIES = exports.TOKEN_FILE_PATH = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.CHARACTER_LIMIT = exports.OAUTH_TOKEN_URL = exports.API_BASE_URL = void 0;
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
/** Strava API v3 base URL */
exports.API_BASE_URL = "https://www.strava.com/api/v3";
/** Strava OAuth token endpoint */
exports.OAUTH_TOKEN_URL = "https://www.strava.com/oauth/token";
/** Maximum response size in characters */
exports.CHARACTER_LIMIT = 25000;
/** Default pagination limit */
exports.DEFAULT_PAGE_SIZE = 30;
/** Maximum pagination limit */
exports.MAX_PAGE_SIZE = 200;
/**
 * Path where refreshed tokens are persisted to survive process restarts.
 * Defaults to ~/.strava-mcp-tokens.json, overridable via STRAVA_TOKEN_FILE.
 */
exports.TOKEN_FILE_PATH = process.env.STRAVA_TOKEN_FILE ??
    path_1.default.join(os_1.default.homedir(), ".strava-mcp-tokens.json");
/** Maximum number of times to retry a request after a 401 */
exports.MAX_AUTH_RETRIES = 1;
/** Token refresh buffer — refresh this many seconds before actual expiry */
exports.TOKEN_REFRESH_BUFFER_SECONDS = 300;
/** Response format options */
var ResponseFormat;
(function (ResponseFormat) {
    ResponseFormat["MARKDOWN"] = "markdown";
    ResponseFormat["JSON"] = "json";
})(ResponseFormat || (exports.ResponseFormat = ResponseFormat = {}));
