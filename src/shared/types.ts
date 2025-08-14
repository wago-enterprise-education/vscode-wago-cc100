/**
 * Shared type definitions and enums for the WAGO CC100 extension.
 * 
 * This module provides TypeScript type safety across the extension by defining:
 * - Controller configuration structures
 * - Setting name mappings and enums
 * - Project configuration types
 * - Display name adapters for UI consistency
 */

/**
 * Core controller configuration type for V02 projects.
 * Represents a controller entry in the wago.yaml file.
 */
export type ControllerType = {
    id: number;
    displayname: string;
    description: string;
    engine: string;
    src: string;
    imageVersion: string;
};

/**
 * Extended controller network settings for V02 projects.
 * Includes advanced networking options like netmask, gateway, and auto-update.
 * Used in controller-specific YAML configuration files.
 */
export type ControllerSettingsExtendedType = {
    connection: string;
    ip: string;
    netmask: string;
    gateway: string;
    port: number;
    user: string;
    autoupdate: string;
};

/**
 * Enumeration of configurable settings in the main wago.yaml file.
 * These settings define controller identity and application configuration.
 */
export enum WagoSettings {
    displayname = 'displayname',
    description = 'description',
    engine = 'engine',
    src = 'src',
    imageVersion = 'imageVersion',
}

/**
 * Enumeration of network and connection settings in controller-specific YAML files.
 * These settings control how the extension connects to and communicates with controllers.
 */
export enum ControllerSettings {
    connection = 'connection',
    ip = 'ip',
    netmask = 'netmask',
    gateway = 'gateway',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate',
}

/**
 * Human-readable display names for settings shown in the VS Code UI.
 * Maps internal setting keys to user-friendly labels for dialogs and tree views.
 */
export enum Setting {
    displayname = 'Name',
    description = 'Description',
    engine = 'Engine',
    src = 'Source',
    imageVersion = 'Docker Image Version',
    connection = 'Connection',
    ip = 'IP',
    netmask = 'Netmask',
    gateway = 'Gateway',
    port = 'Port',
    user = 'User',
    autoupdate = 'Autoupdate',
}

/**
 * Reverse mapping adapter from display names back to internal setting keys.
 * Used to convert user-selected display names back to configuration property names.
 */
export enum SettingAdapter {
    Name = 'displayname',
    Description = 'description',
    Engine = 'engine',
    Source = 'src',
    'Docker Image Version' = 'imageVersion',
    Connection = 'connection',
    IP = 'ip',
    Netmask = 'netmask',
    Gateway = 'gateway',
    Port = 'port',
    User = 'user',
    Autoupdate = 'autoupdate',
}

/**
 * Configuration keys for V01 project settings.json files.
 * Legacy projects use this simpler configuration format with boolean connection flags.
 */
export enum SettingsJson {
    connection = 'connection',
    usb_c = 'usb_c',
    simulator = 'simulator',
    ethernet = 'ethernet',
    ip_adress = 'ip_adress',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate',
}

/**
 * Supported controller hardware types.
 * Currently only CC100 is supported, but this enum allows for future expansion.
 */
export enum Engine {
    CC100 = 'CC100',
}
