/**
 * @fileoverview Defines interfaces for controller management in the WAGO CC100 VS Code extension.
 *
 * This file contains interfaces that define operations for managing controllers:
 * - Uploading to controllers
 * - Resetting controllers
 * - Configuring controllers
 * - Editing controller settings
 * - Viewing controller hierarchies
 * - Adding/removing controllers
 * - Renaming controllers
 * - Creating projects
 * - Establishing connections
 *
 * These interfaces separate the contract from implementation, allowing for different implementations
 * of controller management functionality while maintaining a consistent API across the extension.
 *
 * @module projectInterface
 */
import { Controller, ControllerItem } from '../../extension/view';
import * as vscode from 'vscode';

/**
 * Interface for uploading projects to a single controller.
 * Implemented by version-specific upload handlers.
 */
export interface UploadInterface {
    /**
     * Uploads the current project to the specified controller.
     * @param controller - Target controller for upload, undefined for default controller
     */
    uploadController: (controller: Controller | undefined) => void;
}

/**
 * Interface for uploading projects to multiple controllers simultaneously.
 * Only available in V02 projects that support multiple controllers.
 */
export interface UploadAllInterface {
    /**
     * Uploads the current project to all configured controllers.
     */
    uploadAllControllers: () => void;
}

/**
 * Interface for resetting controllers to a clean state.
 * Removes uploaded files and stops running processes.
 */
export interface ResetControllerInterface {
    /**
     * Resets the specified controller to its default state.
     * @param controller - Controller to reset
     * @param showConfirmation - Whether to show user confirmation dialog
     * @returns Promise resolving to controller engine type or empty string on failure
     */
    reset: (
        controller: Controller | undefined,
        showConfirmation: boolean
    ) => Promise<string>;
}

/**
 * Interface for opening controller-specific configuration dialogs.
 */
export interface ConfigureControllerInterface {
    /**
     * Opens the configuration interface for the specified controller.
     * @param controller - Controller to configure
     */
    configure: (controller: Controller | undefined) => void;
}

/**
 * Interface for editing individual controller settings.
 * Handles network configuration, credentials, and other parameters.
 */
export interface EditSettingsInterface {
    /**
     * Opens an editor for the specified controller setting.
     * @param controller - Controller item containing the setting to edit
     */
    editSettings: (controller: ControllerItem | undefined) => void;
}

/**
 * Interface for providing hierarchical tree view data.
 * Manages the parent-child relationships in the controller view.
 */
export interface ViewChildrenInterface {
    /**
     * Retrieves child elements for the tree view.
     * @param element - Parent element (undefined for root level)
     * @returns Promise resolving to array of child controllers or controller items
     */
    getChildren: (
        element?: Controller | ControllerItem | undefined
    ) => Promise<vscode.ProviderResult<Controller[] | ControllerItem[]>>;
}

/**
 * Interface for adding new controllers to V02 projects.
 * Not available in V01 projects which support only a single controller.
 */
export interface AddControllerInterface {
    /**
     * Prompts user to add a new controller to the current project.
     */
    addController: () => void;
}

/**
 * Interface for removing controllers from projects.
 * Removes configuration but does not affect the physical device.
 */
export interface RemoveControllerInterface {
    /**
     * Removes the specified controller from the project configuration.
     * @param controller - Controller to remove
     * @param showConfirmation - Whether to show user confirmation dialog
     */
    removeController: (
        controller: Controller | undefined,
        showConfirmation: boolean
    ) => void;
}

/**
 * Interface for renaming controllers in V02 projects.
 * Allows changing the display name without affecting other settings.
 */
export interface RenameControllerInterface {
    /**
     * Prompts user to rename the specified controller.
     * @param controller - Controller to rename
     */
    renameController: (controller: Controller | undefined) => void;
}

/**
 * Interface for combined reset and remove operations.
 * Provides a one-step solution to clean and remove a controller.
 */
export interface RemoveResetControllerInterface {
    /**
     * Resets then removes the specified controller.
     * @param controller - Controller to reset and remove
     * @returns Promise resolving to the controller or undefined on failure
     */
    removeResetController: (
        controller: Controller | undefined
    ) => Promise<Controller | undefined>;
}

/**
 * Interface for establishing SSH connections to configured controllers.
 * Called during extension activation to connect to all available controllers.
 */
export interface EstablishConnectionsInterface {
    /**
     * Establishes connections to all controllers configured in the current project.
     */
    establishConnections: () => void;
}

/**
 * Interface for determining controller engine types.
 * Used by the factory pattern to select appropriate controller-specific implementations.
 */
export interface GetEngineInterface {
    /**
     * Retrieves the engine type for a specific controller.
     * @param controllerId - Unique identifier of the controller
     * @returns Engine type string (e.g., 'CC100')
     */
    getEngine: (controllerId: number) => string;
}
