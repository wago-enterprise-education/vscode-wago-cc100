/**
 * Shared constants used across the VS Code WAGO CC100 extension
 */

/**
 * Regular expression for validating folder names.
 * Ensures compliance with Windows file naming conventions.
 */
export const FOLDER_REGEX = '^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:.[^.]*)?$)[^<>:"/\\|?*\x00-\x1F]*[^<>:"/\\|?*\x00-\x1F .]$';

/**
 * Regular expression for validating IP addresses.
 * Validates IPv4 addresses in dotted decimal notation.
 */
export const IP_REGEX = "^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$";

/**
 * Upload path on the remote controller for Python applications
 */
export const UPLOAD_PATH = '/home/user/python_bootapplication/';

/**
 * Connection manager settings
 */
export const CONNECTION_SETTINGS = {
    MAX_CONNECTIONS: 3,
    GARBAGE_COLLECTOR_INTERVAL: 300_000,
    TIMEOUT: 10_000,
    RECONNECTION_TIMEOUT: 10_000,
    SCRIPT_PATH: 'res/scripts',
    REMOTE_TMP_PATH: '/tmp/cc100-extension',
    PUBLIC_KEY_PATH: require('path').join(require('os').homedir(), '.ssh', 'id_rsa_wago.pub'),
    PRIVATE_KEY_PATH: require('path').join(require('os').homedir(), '.ssh', 'id_rsa_wago')
} as const;

/**
 * Debugger settings
 */
export const DEBUGGER_SETTINGS = {
    MAX_RETRIES: 10,
    RETRY_DELAY: 2000
} as const;
