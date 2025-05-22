import { ProjectVersion } from '../extension/versionDetection';
import { Controller, ControllerItem } from '../extension/view';
import * as vscode from 'vscode';
import { ProjectFactory } from './factorys/factoryProject';
import { ControllerFactory } from './factorys/factoryController';

/**
 * Manager class for WAGO Controllerproject operations.
 *
 * This class implements the Singleton design pattern, ensuring that only one
 * instance exists throughout the application lifecycle. It provides methods
 * for controller management operations such as uploading, editing settings,
 * resetting, adding, removing, and renaming controllers.
 *
 * @class Manager
 * @singleton
 */
export class Manager {
    private static instance: Manager;
    private versionNr: number;

    private constructor() {
        this.versionNr = ProjectVersion;
    }

    /**
     * Gets the singleton instance of the Manager class.
     * If the instance doesn't exist yet, it creates one.
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
     * Uploads the project with the specified version number to the target identified by the given ID.
     *
     * @param id - The identifier of the upload target
     */
    public upload(controller: Controller | undefined) {
        ProjectFactory.getInstance()
            .createUploadCommand(this.versionNr)
            .uploadController(controller);
    }
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
     * Creates a new project by initializing a project creation command and its controller.
     * This method uses the ProjectFactory singleton to instantiate a command with the current version
     * and associates it with the given extension context.
     */
    public createProject() {
        ProjectFactory.getInstance()
            .createCreateProjectCommand(this.versionNr)
            .createController();
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
     * Establishes connections through the ProjectFactory.
     *
     * Uses the singleton instance of ProjectFactory to create an object capable
     * of establishing connections based on the current version number, and then
     * initiates the connection establishment process.
     */
    public establishConnections() {
        ProjectFactory.getInstance()
            .createEstablishConnections(this.versionNr)
            .establishConnections();
    }
}
