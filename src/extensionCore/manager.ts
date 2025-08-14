import { ProjectVersion } from '../extension/versionDetection';
import { Controller, ControllerItem } from '../extension/view';
import * as vscode from 'vscode';
import { ProjectFactory } from './factorys/factoryProject';
import { ControllerFactory } from './factorys/factoryController';

/**
 * Central manager for all WAGO controller project operations.
 *
 * This singleton class serves as the main orchestrator for controller management,
 * delegating operations to version-specific implementations through factory patterns.
 * It provides a unified API for:
 * - Project upload operations (single controller or all controllers)
 * - Controller lifecycle management (add, remove, reset, configure)
 * - Settings and connection management
 * - Tree view data provision
 *
 * The manager automatically adapts its behavior based on the detected project version
 * (V01 for legacy single-controller projects, V02 for modern multi-controller projects).
 *
 * @class Manager
 * @singleton
 */
export class Manager {
    private static instance: Manager;
    private versionNr: number;

    private constructor() {
        // Cache the current project version for consistent behavior across operations
        this.versionNr = ProjectVersion;
    }

    /**
     * Gets the singleton instance of the Manager class.
     * Creates the instance on first access using lazy initialization.
     *
     * @returns The singleton Manager instance
     */
    public static getInstance(): Manager {
        if (!Manager.instance) {
            Manager.instance = new Manager();
        }
        return Manager.instance!;
    }
    /**
     * Uploads the current project's source code to a specific controller.
     * Delegates to version-specific upload implementation via ProjectFactory.
     *
     * @param controller - Target controller for upload (undefined for user selection prompt)
     */
    public upload(controller: Controller | undefined) {
        ProjectFactory.getInstance()
            .createUploadCommand(this.versionNr)
            .uploadController(controller);
    }
    /**
     * Uploads the current project to all configured controllers simultaneously.
     * Only available in V02 projects that support multiple controllers.
     * Delegates to version-specific implementation via ProjectFactory.
     */
    public uploadAll() {
        ProjectFactory.getInstance()
            .createUploadAllCommand(this.versionNr)
            .uploadAllControllers();
    }
    /**
     * Edits the settings of a controller by creating and executing an edit settings command.
     *
     * @param controller - The controller to edit settings for, or undefined if no specific controller is targeted
     */
    public editSettings(controller: ControllerItem | undefined) {
        ProjectFactory.getInstance()
            .createEditSettingsCommand(this.versionNr)
            .editSettings(controller);
    }
    /**
     * Resets the specified controller to its default state.
     *
     * This method performs a two-step reset process:
     * 1. Creates and executes a reset command through ProjectFactory
     * 2. Uses the resulting engine to create and execute a controller-specific reset command
     *
     * @param controller - The controller to reset, can be undefined
     * @returns A Promise that resolves when the reset operation is complete
     */
    public async resetController(controller: Controller | undefined) {
        let engine = await ProjectFactory.getInstance()
            .createResetCommand(this.versionNr)
            .reset(controller, true);
        ControllerFactory.getInstance()
            .createResetCommand(engine)
            .reset(controller);
    }
    /**
     * Adds a controller to the extension context using the project factory.
     * Creates and registers the controller using the current version number.
     */
    public addController() {
        ProjectFactory.getInstance()
            .createAddCommand(this.versionNr)
            .addController();
    }
    /**
     * Removes a controller from the current project.
     *
     * @param controller - The controller to be removed, can be undefined
     * @param showConfirmation - Whether to show a confirmation dialog before removing
     */
    public removeController(
        controller: Controller | undefined,
        showConfirmation: boolean
    ) {
        ProjectFactory.getInstance()
            .createRemoveCommand(this.versionNr)
            .removeController(controller, showConfirmation);
    }
    /**
     * Initiates a renaming operation for the specified controller.
     *
     * @param controller - The controller to be renamed, or undefined
     * @remarks This method delegates the renaming operation to a command created by the ProjectFactory
     * using the current version number.
     */
    public renameController(controller: Controller | undefined) {
        ProjectFactory.getInstance()
            .createRenameCommand(this.versionNr)
            .renameController(controller);
    }
    /**
     * Resets and then removes a controller from the project.
     * First resets the controller using a reset command, then removes it using a remove command.
     *
     * @param controller - The controller to reset and remove
     * @returns A promise that resolves when both operations complete
     * @throws Will display an error message if resetting the controller fails
     */
    public async removeReset(controller: Controller | undefined) {
        await ProjectFactory.getInstance()
            .createResetCommand(this.versionNr)
            .reset(controller, false)
            .then(() => {
                ProjectFactory.getInstance()
                    .createRemoveCommand(this.versionNr)
                    .removeController(controller, false);
            })
            .catch((error: any) => {
                console.error(error);
                vscode.window.showErrorMessage(`Error: Resetting Controller`);
            });
    }

    /**
     * Opens controller-specific configuration dialogs.
     * Allows modification of advanced controller settings beyond basic network configuration.
     *
     * @param controller - Controller to configure (undefined for user selection prompt)
     */
    public configureController(controller: Controller | undefined) {
        ProjectFactory.getInstance()
            .createConfigureCommand(this.versionNr)
            .configure(controller);
    }
    /**
     * Retrieves child elements for display in the view.
     * This method delegates to a project-specific view children command
     * based on the current version number.
     *
     * @param element - The parent controller or controller item whose children should be retrieved
     * @returns A collection of child items appropriate for display in the view
     */
    public viewChildren(
        element?: Controller | ControllerItem | undefined
    ): any {
        return ProjectFactory.getInstance()
            .createViewChildrenCommand(this.versionNr)
            .getChildren(element);
    }
    /**
     * Establishes SSH connections to all controllers defined in the current project.
     * Called during extension activation to enable communication with hardware.
     * Delegates to version-specific connection logic via ProjectFactory.
     */
    public establishConnections() {
        ProjectFactory.getInstance()
            .createEstablishConnections(this.versionNr)
            .establishConnections();
    }

    /**
     * Retrieves the USB-C interface IP address for a specific controller.
     * Used for establishing direct USB-C connections to controllers.
     *
     * @param controllerId - ID of the controller to get USB-C IP for
     * @returns The default USB-C IP address for the specified controller
     */
    public getUSB_C_IP(controllerId: number): string {
        const engine = ProjectFactory.getInstance()
            .createGetEngine(this.versionNr)
            .getEngine(controllerId);
        return ControllerFactory.getInstance()
            .createGetUSB_C_IP(engine)
            .getUSB_C_IP();
    }
}
