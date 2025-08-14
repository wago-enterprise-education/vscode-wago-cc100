/**
 * Shared types and enums used across the VS Code WAGO CC100 extension
 */

/**
 * Represents a controller type with its configuration details
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
 * Extended controller settings that include network configuration
 * Used in V02 project versions that support additional networking features
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
 * Enum representing available settings for the wago.yaml file
 */
export enum WagoSettings {
    displayname = 'displayname',
    description = 'description',
    engine = 'engine',
    src = 'src',
    imageVersion = 'imageVersion',
}

/**
 * Enum representing available settings for the controller.yaml file
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
 * Enum representing various display settings used in the application.
 * Each setting corresponds to a specific configuration property.
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
 * Enum representing the various settings for an adapter configuration.
 * Each member of the enum corresponds to a specific configuration property.
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
 * Enum representing the keys used in the settings JSON configuration (V01).
 * Each key corresponds to a specific configuration option.
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
 * Enum representing available engines/controllers.
 */
export enum Engine {
    CC100 = 'CC100',
}
