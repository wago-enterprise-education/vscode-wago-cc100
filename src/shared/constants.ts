/**
 * Centralized constants and configuration values for the WAGO CC100 extension.
 * 
 * This module contains all shared constants used across the extension including:
 * - Validation patterns and regular expressions
 * - Network and file system paths
 * - Connection management settings  
 * - Default values and limits
 * - Docker and debugging configuration
 */

/**
 * Regular expression for validating project folder names.
 * Ensures compliance with Windows file system naming conventions by:
 * - Rejecting reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
 * - Prohibiting invalid characters (< > : " / \ | ? * and control chars)
 * - Preventing names ending with spaces or periods
 */
export const FOLDER_REGEX = '^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:.[^.]*)?$)[^<>:"/\\|?*\x00-\x1F]*[^<>:"/\\|?*\x00-\x1F .]$';

/**
 * Regular expression for validating IPv4 addresses.
 * Validates standard dotted decimal notation (e.g., 192.168.1.100).
 * Accepts octets from 0-255 with proper boundary checking.
 */
export const IP_REGEX = "^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$";

/**
 * Target directory path on CC100 controllers for uploaded Python applications.
 * This is where project files are deployed and executed from.
 */
export const UPLOAD_PATH = '/home/user/python_bootapplication/';

/**
 * SSH connection pool and management configuration.
 * Controls connection behavior, timeouts, and resource cleanup.
 */
export const CONNECTION_SETTINGS = {
    /** Maximum concurrent SSH connections per controller */
    MAX_CONNECTIONS: 3,
    /** Interval for cleaning up unused connections (5 minutes) */
    GARBAGE_COLLECTOR_INTERVAL: 300_000,
    /** Timeout for waiting for available connections (10 seconds) */
    TIMEOUT: 10_000,
    /** Delay before attempting reconnection after connection loss (10 seconds) */
    RECONNECTION_TIMEOUT: 10_000,
    /** Directory containing shell scripts for controller operations */
    SCRIPT_PATH: 'res/scripts',
    /** Temporary directory on controller for atomic file operations */
    REMOTE_TMP_PATH: '/tmp/cc100-extension',
    /** Path to SSH public key for passwordless authentication */
    PUBLIC_KEY_PATH: require('path').join(require('os').homedir(), '.ssh', 'id_rsa_wago.pub'),
    PRIVATE_KEY_PATH: require('path').join(require('os').homedir(), '.ssh', 'id_rsa_wago')
} as const;

/**
 * Python remote debugging configuration for VS Code integration.
 * Used when establishing debugpy connections to controllers.
 */
export const DEBUGGER_SETTINGS = {
    /** Maximum retry attempts for debugging connection establishment */
    MAX_RETRIES: 10,
    /** Delay between retry attempts in milliseconds (2 seconds) */
    RETRY_DELAY: 2000
} as const;

/**
 * Default network and authentication settings for new controllers.
 * These values are used when creating new controller configurations.
 */
export const CONTROLLER_DEFAULTS = {
    /** Default USB-C interface IP address for CC100 controllers */
    IP: '192.168.42.42',
    /** Standard SSH port number */
    PORT: 22,
    /** Placeholder ID for controllers being created */
    TEMPORARY_ID: -1,
    /** Default SSH username for CC100 controllers */
    DEFAULT_USER: 'root',
    /** Factory default password for CC100 controllers */
    DEFAULT_PASSWORD: 'wago',
} as const;

/**
 * Docker container and image configuration for Python runtime deployment.
 * These settings control how Python applications are containerized on controllers.
 */
export const DOCKER_CONSTANTS = {
    /** Name of the Python runtime container on the controller */
    CONTAINER_NAME: 'pythonRuntime',
    /** Docker image name for Python applications */
    IMAGE_NAME: 'cc100_python',
    /** GitHub repository containing the Docker images */
    REPOSITORY: 'wago-enterprise-education/docker-engine-cc100',
    /** Container registry prefix for image URLs */
    IMAGE_PREFIX: 'ghcr.io'
} as const;

/**
 * Standard file names used throughout the extension and project templates.
 */
export const FILE_NAMES = {
    /** Main Python application entry point */
    MAIN_PYTHON: 'main.py',
    /** Docker image archive file */
    IMAGE_TAR: 'image.tar',
} as const;

/**
 * Network port validation limits for controller configuration.
 */
export const NETWORK_CONSTANTS = {
    /** Maximum valid TCP/UDP port number */
    MAX_PORT: 65535,
    /** Minimum valid TCP/UDP port number */
    MIN_PORT: 0,
} as const;

/**
 * Starting ID value for auto-incrementing controller IDs in V02 projects.
 * Controllers are automatically assigned sequential IDs starting from this value.
 */
export const CONTROLLER_AUTO_ID_START = 1;
