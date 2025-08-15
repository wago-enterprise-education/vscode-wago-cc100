import {
    Controller,
    ControllerItem,
    ControllerProvider,
} from '../../extension/view';
import * as vscode from 'vscode';
import * as Interface from '../interfaces/projectInterface';
import crypto from 'crypto';
import { ConnectionManager } from '../../extension/connectionManager';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { extensionContext } from '../../extension';
import { create } from 'tar';
import { Manager } from '../manager';
import { YamlCommands } from '../../shared/yamlCommands';
import {
    WagoSettings,
    ControllerSettings,
    Setting,
    SettingAdapter,
    Engine,
} from '../../shared/types';
import {
    FOLDER_REGEX,
    IP_REGEX,
    UPLOAD_PATH,
    CONTROLLER_DEFAULTS,
    DOCKER_CONSTANTS,
    FILE_NAMES,
    NETWORK_CONSTANTS,
} from '../../shared/constants';

export class GetEngine implements Interface.GetEngineInterface {
    getEngine(controllerId: number): string {
        return YamlCommands.getController(controllerId)?.engine || '';
    }
}

export class UploadController implements Interface.UploadInterface {
    /**
     * Uploads the project specified in the ControllerSettings to the selected controller.
     * If no controller is provided, prompts the user to select one from available controllers.
     *
     * @param controller - Optional controller to upload to. If not provided, user will be prompted to select one.
     * @returns A Promise that resolves when the upload is complete or when the operation is cancelled.
     * @throws Will display an error message if no workspace is open.
     */
    async uploadController(controller: Controller | undefined) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }

        if (!controller) {
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,
                    label: controller.displayname,
                    description: controller.description,
                    online: false,
                })),
                {
                    title: 'Upload to Controller',
                    canPickMany: false,
                }
            );
            if (!controller) return;
        }

        return await new UploadFunctionality().uploadFile(controller.controllerId);
    }
}
export class UploadAllControllers implements Interface.UploadAllInterface {
    /**
     * Execute Uploads for all controllers defined in the workspace wago.yaml.
     *
     * This method retrieves all controllers from the current configuration using YamlCommands,
     * then iterates through each controller and attempts to execute Upload for it.
     * If successful, a notification will be displayed for each controller upload.
     *
     * @throws {Error} Shows an error message if no workspace is open or if the upload fails
     * for any controller.
     */
    public uploadAllControllers() {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
        let upload = new UploadController();
        const controllers = YamlCommands.getControllers();

        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Upload to All Controllers',
                cancellable: false,
            },
            async (progress, _token) => {
                for (const controller of controllers) {
                    progress.report({
                        message: `Uploading to ${controller.displayname}...`,
                        increment: 0,
                    });
                    try {
                        await upload
                            .uploadController({
                                controllerId: controller.id,
                                label: controller.displayname,
                                online: true,
                            });

                        vscode.window.showInformationMessage(
                            `Controller ${controller.displayname} uploaded`
                        );
                    } catch(error) {
                        vscode.window.showErrorMessage(
                            `Error uploading controller ${controller.displayname}: ${error}`
                        );
                    }
                    progress.report({ increment: 100 / controllers.length });
                }
                return Promise.resolve(true);
            }
        );
    }
}
export class ResetController implements Interface.ResetControllerInterface {
    /**
     * Resets a controller by stopping and removing its associated Docker containers and images,
     * and clearing its application directory. Optionally prompts the user for confirmation.
     *
     * @param controller - The controller to reset. If undefined, a quick pick dialog will prompt the user to select one.
     * @param showConfirmation - Whether to show a confirmation dialog before resetting the controller.
     * @returns A promise that resolves to the engine of the reset controller, or an empty string if the operation is canceled or fails.
     *
     * @throws Will show an error message if no workspace is open or if an error occurs during the reset process.
     */
    async reset(controller: Controller | undefined, showConfirmation: boolean) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');

            return '';
        }
        if (!controller) {
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,
                    label: controller.displayname,
                    description: controller.description,
                    online: true,
                })),
                {
                    title: 'Reset Controller',
                    canPickMany: false,
                }
            );
            if (!controller) return '';
        }

        let controllerId: any;

        if (showConfirmation) {
            await vscode.window
                .showWarningMessage(`Reset ${controller.label}?`, 'Yes', 'No')
                .then((value) => {
                    if (value === 'Yes') controllerId = controller.controllerId;
                });
            if (!controllerId) return '';
        } else {
            controllerId = controller.controllerId;
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Reset Controller',
                cancellable: false,
            },
            async (progress, _token) => {
                try {
                    progress.report({ message: `Stopping Container...` });
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        `docker container stop ${DOCKER_CONSTANTS.CONTAINER_NAME}`
                    );
                    progress.report({
                        increment: 20,
                        message: `Removing Container...`,
                    });
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        `docker rm ${DOCKER_CONSTANTS.CONTAINER_NAME}`
                    );
                    progress.report({
                        increment: 10,
                        message: `Removing Image...`,
                    });
                    const tags = (
                        await connectionManager.executeCommand(
                            controllerId,
                            `docker images | grep '${UploadFunctionality.imageName}' | awk '{print $2}'`
                        )
                    ).split('\n');
                    for (const tag of tags) {
                        await ConnectionManager.instance.executeCommand(
                            controllerId,
                            `docker rmi -f ${DOCKER_CONSTANTS.IMAGE_PREFIX}/${DOCKER_CONSTANTS.IMAGE_NAME}:${tag}`
                        );
                    }
                    progress.report({
                        increment: 10,
                        message: `Deleting Files...`,
                    });
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        `rm -rf ${UPLOAD_PATH}*`
                    );
                    progress.report({ increment: 10 });
                } catch (error) {
                    vscode.window.showErrorMessage(
                        'Error resetting controller'
                    );
                    throw error;
                }
            }
        );

        return YamlCommands.getController(controllerId)?.engine || '';
    }
}
export class AddController implements Interface.AddControllerInterface {
    /**
     * Adds a new controller to the project by prompting the user for necessary details such as
     * the controller's name, description, engine version, and source folder. If the user opts
     * to create a new folder, it will be created and initialized with a template file.
     *
     * @param context - The extension context provided by VS Code, used to access resources and workspace information.
     *
     * @remarks
     * - Prompts the user for the controller name, description, engine version, and source folder.
     * - Validates folder names against a predefined regex and checks for folder existence.
     * - Creates a new folder and initializes it with a template file if the user selects "New".
     * - Calls `YamlCommands.createController` to create the controller configuration.
     * - Refreshes the `ControllerProvider` instance to reflect the changes.
     * - Displays a success message upon completion.
     *
     * @throws Will throw an error if the workspace folder is not defined or if file system operations fail.
     */
    async addController() {
        const controllerName =
            (await vscode.window.showInputBox({
                prompt: 'Enter the name of the controller',
                title: 'Add Controller / Name',
                ignoreFocusOut: true,
            })) || '';

        if (!controllerName) return;

        const controllerDescription =
            (await vscode.window.showInputBox({
                prompt: 'Enter the description of the controller',
                title: 'Add Controller / Description',
                ignoreFocusOut: true,
            })) || '';

        const controllerEngine =
            (await vscode.window.showQuickPick(Object.values(Engine), {
                title: 'Add Controller / Engine',
                canPickMany: false,
                ignoreFocusOut: true,
            })) || '';

        const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
        const controllerSrc = (await vscode.window.showQuickPick(
            fs
                .readdirSync(workspacePath)
                .map((folder) => {
                    if (
                        fs.existsSync(
                            `${workspacePath}/${folder}/${FILE_NAMES.MAIN_PYTHON}`
                        )
                    ) {
                        return {
                            label: `${folder}`,
                            description: `${folder}/${FILE_NAMES.MAIN_PYTHON}`,
                        };
                    }
                    return { label: '' };
                })
                .filter((path) => (path.label.length > 0 ? true : false))
                .concat({ label: 'New', description: 'Create a new folder' }),
            {
                title: 'Add Controller / Source',
                canPickMany: false,
                ignoreFocusOut: true,
            }
        )) || { label: 'src' };

        if (controllerSrc.label === 'New') {
            const newFolder =
                (await vscode.window.showInputBox({
                    prompt: 'Enter the name of the folder',
                    title: 'Add Controller / Source / New Folder',
                    ignoreFocusOut: true,
                    validateInput: (value: string) => {
                        if (!RegExp(FOLDER_REGEX).test(value)) {
                            return 'Invalid folder name';
                        }
                        if (fs.existsSync(`${workspacePath}/${value}`)) {
                            return 'Folder already exists';
                        }
                        return null;
                    },
                })) || '';

            if (newFolder) {
                fs.mkdirSync(`${workspacePath}/${newFolder}`);
                fs.cpSync(
                    `${extensionContext.extensionPath}/res/template/src/${FILE_NAMES.MAIN_PYTHON}`,
                    `${workspacePath}/${newFolder}/${FILE_NAMES.MAIN_PYTHON}`
                );
                controllerSrc.label = newFolder;
            } else {
                controllerSrc.label = 'src';
            }
        }

        await YamlCommands.createController(
            extensionContext,
            controllerName,
            controllerDescription,
            controllerEngine,
            controllerSrc.label,
            'cc100-latest'
        );
        vscode.window.showInformationMessage(
            `Controller ${controllerName} added`
        );
        ControllerProvider.instance.refresh();
    }
}
export class RemoveController implements Interface.RemoveControllerInterface {
    /**
     * Removes a controller from the system. If a controller is not provided,
     * the user will be prompted to select one from a list of available controllers.
     * Optionally, a confirmation dialog can be shown before removal.
     *
     * @param controller - The controller to be removed. If undefined, the user will be prompted to select one.
     * @param showConfirmation - A boolean indicating whether to show a confirmation dialog before removal.
     *
     * @returns A promise that resolves when the controller is removed or the operation is canceled.
     */
    async removeController(
        controller: Controller | undefined,
        showConfirmation: boolean
    ) {
        let selectedController;
        if (controller) {
            selectedController = controller;
        } else {
            selectedController = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,
                    label: controller.displayname,
                    description: controller.description,
                })),
                {
                    title: 'Remove Controller',
                    canPickMany: false,
                }
            );
            if (!selectedController) return;
        }

        let controllerId;
        if (showConfirmation) {
            await vscode.window
                .showWarningMessage(
                    `Remove ${selectedController.label}?`,
                    'Yes',
                    'No'
                )
                .then((value) => {
                    if (value === 'Yes')
                        controllerId = selectedController.controllerId;
                });
            if (!controllerId) return;
        } else {
            controllerId = selectedController.controllerId;
        }

        YamlCommands.removeController(controllerId);
        vscode.window.showInformationMessage(
            `Controller ${selectedController.label} removed`
        );

        ControllerProvider.instance.refresh();
    }
}
export class ConfigureController
    implements Interface.ConfigureControllerInterface
{
    /**
     * Configures a controller's network settings through user input.
     *
     * This method prompts the user for the controller's IP address and netmask,
     * validates the inputs, and then configures the controller accordingly.
     * It adds a temporary controller connection with default credentials,
     * then executes a network configuration command with the provided settings.
     *
     * @returns A Promise that resolves when the configuration is complete or rejects if an error occurs
     * @throws Will display an error message if no workspace is open or if IP/netmask validation fails
     */
    async configure(controller: Controller | undefined) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }

        if (!controller) {
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,
                    label: controller.displayname,
                    description: controller.description,
                    online: true,
                })),
                {
                    title: 'Configure Controller',
                    canPickMany: false,
                }
            );
            if (!controller) return;
        }

        let conId = controller.controllerId;
        let controllerSettings = YamlCommands.getControllerSettings(conId);
        // let conIp = (await vscode.window.showInputBox({
        //     prompt: 'Enter the Ip of the Controller',
        //     title: 'Configure Controller / Ip',
        //     ignoreFocusOut: true,
        // })) || '';

        // let conNetmask = (await vscode.window.showInputBox({
        //     prompt: 'Enter the Netmask of the Controller',
        //     title: 'Configure Controller / Netmask',
        //     ignoreFocusOut: true,
        // })) || '';

        if (controllerSettings.ip === undefined) {
            vscode.window.showErrorMessage('IP is undefined');
            return;
        }
        if (controllerSettings.netmask === undefined) {
            vscode.window.showErrorMessage('Netmask is undefined');
            return;
        }
        await connectionManager.addController(
            CONTROLLER_DEFAULTS.TEMPORARY_ID,
            `${CONTROLLER_DEFAULTS.IP}:${CONTROLLER_DEFAULTS.PORT}`,
            CONTROLLER_DEFAULTS.DEFAULT_USER,
            CONTROLLER_DEFAULTS.DEFAULT_PASSWORD
        );
        await connectionManager.executeCommand(
            CONTROLLER_DEFAULTS.TEMPORARY_ID,
            `/etc/config-tools/network_config --ip-config --set='{"br0": {"source": "static", "ipaddr": "${controllerSettings.ip}", "netmask": "${controllerSettings.netmask}"}}'`
        );
        await connectionManager.executeCommand(
            CONTROLLER_DEFAULTS.TEMPORARY_ID,
            `cd /etc/config-tools && ./config_routing --change static index="0" gw="${controllerSettings.gateway}" state="enabled"`
        );
        vscode.window.showInformationMessage(
            `Controller ${controller.label} configured`
        );
        connectionManager.removeConnection(CONTROLLER_DEFAULTS.TEMPORARY_ID);
    }
}
export class EditSettings implements Interface.EditSettingsInterface {
    /**
     * Edits the settings of a specified controller or prompts the user to select one if not provided.
     *
     * This function interacts with the Visual Studio Code API to display quick pick menus for selecting
     * a controller and its associated settings. It then applies the selected setting to the controller.
     *
     * @param controller - An optional `ControllerItem` object representing the controller to edit.
     *                      If undefined, the user will be prompted to select a controller.
     *
     * @remarks
     * - If no workspace is open, an error message is displayed, and the function exits early.
     * - If the user cancels any of the quick pick prompts, the function exits without making changes.
     *
     * @throws This function does not throw exceptions but relies on user interaction and may exit early
     *         if required inputs are not provided.
     *
     * @example
     * ```typescript
     * // Example usage:
     * const controller: ControllerItem = { controllerId: '123', setting: 'exampleSetting' };
     * await editSettings(controller);
     * ```
     */
    async editSettings(controller: ControllerItem | undefined) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }

        let settingToEdit: string;

        if (controller === undefined) {
            let con = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    id: controller.id,
                    label: controller.displayname,
                    description: controller.description,
                })),
                {
                    title: 'Pick Controller',
                    canPickMany: false,
                }
            );
            if (con === undefined) return;
            let id = con.id;

            settingToEdit =
                (await vscode.window.showQuickPick(Object.values(Setting), {
                    title: 'Choose Setting',
                    canPickMany: false,
                })) || '';
            if (!settingToEdit) return;

            await EditSettingsFunctionality.editSetting(
                id,
                SettingAdapter[settingToEdit as keyof typeof SettingAdapter]
            );
        } else {
            await EditSettingsFunctionality.editSetting(
                controller.controllerId,
                SettingAdapter[
                    controller.setting as keyof typeof SettingAdapter
                ]
            );
        }

        ControllerProvider.instance.refresh();
    }
}
export class ViewChildren implements Interface.ViewChildrenInterface {
    /**
     * Retrieves the children elements for a given controller or controller item.
     * If no element is provided, it fetches the list of controllers and determines their online status.
     * If a controller is provided, it retrieves its settings and additional details.
     *
     * @param element - An optional `Controller` or `ControllerItem` instance. If undefined, the method fetches all controllers.
     * @returns A promise that resolves to a `vscode.ProviderResult` containing an array of `Controller` or `ControllerItem` objects.
     */
    getChildren(
        element?: Controller | ControllerItem | undefined
    ): Promise<vscode.ProviderResult<Controller[] | ControllerItem[]>> {
        if (!element) {
            let controllers = YamlCommands.getControllers();
            if (!controllers) return Promise.resolve([]);

            return Promise.all(
                controllers.map(async (controller) => {
                    let online = false;
                    try {
                        let settings = YamlCommands.getControllerSettings(
                            controller.id
                        );
                        if (settings && settings.connection === 'usb-c') {
                            await ConnectionManager.instance.updateController(
                                controller.id,
                                `${Manager.getInstance().getUSB_C_IP(controller.id)}:${settings.port}`,
                                settings.user
                            );
                        } else if (
                            settings &&
                            settings.connection === 'ethernet'
                        ) {
                            await ConnectionManager.instance.updateController(
                                controller.id,
                                `${settings.ip}:${settings.port}`,
                                settings.user
                            );
                        }

                        await ConnectionManager.instance.ping(controller.id);
                        online = true;
                    } catch (error) {
                        console.debug(
                            `View: Controller ${controller.id} is offline. ${error}`
                        );
                    }
                    return new Controller(
                        controller.id,
                        controller.displayname,
                        online
                    );
                })
            );
        } else {
            if (element instanceof Controller) {
                const settings = YamlCommands.getControllerSettings(
                    element.controllerId
                );
                if (!settings) return Promise.resolve([]);

                const controller = YamlCommands.getController(
                    element.controllerId
                );

                const settingArray = [];

                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        Setting.connection,
                        settings.connection
                    )
                );
                if (settings.connection === 'ethernet') {
                    settingArray.push(
                        new ControllerItem(
                            element.controllerId,
                            Setting.ip,
                            settings.ip
                        ),
                        new ControllerItem(
                            element.controllerId,
                            Setting.netmask,
                            settings.netmask
                        ),
                        new ControllerItem(
                            element.controllerId,
                            Setting.gateway,
                            settings.gateway
                        )
                    );
                }
                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        Setting.port,
                        settings.port
                    )
                );
                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        Setting.user,
                        settings.user
                    )
                );
                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        Setting.autoupdate,
                        settings.autoupdate
                    )
                );

                return Promise.resolve(
                    [
                        new ControllerItem(
                            element.controllerId,
                            Setting.description,
                            controller?.description
                        ),
                        new ControllerItem(
                            element.controllerId,
                            Setting.engine,
                            controller?.engine
                        ),
                        new ControllerItem(
                            element.controllerId,
                            Setting.imageVersion,
                            controller?.imageVersion
                        ),
                        new ControllerItem(
                            element.controllerId,
                            Setting.src,
                            controller?.src
                        ),
                    ].concat(settingArray)
                );
            }
        }
        return Promise.resolve([]);
    }
}
export class RenameController implements Interface.RenameControllerInterface {
    /**
     * Renames a controller by either selecting an existing controller or creating a new one.
     * If a controller is provided, it will be used directly. Otherwise, the user is prompted
     * to select a controller from a list or use the only available controller.
     *
     * The user is then prompted to input a new name for the selected controller.
     * The updated name is saved using the `YamlCommands.writeWagoYaml` method.
     *
     * @param controller - The controller to rename. If undefined, the user will be prompted
     *                      to select a controller from the available options.
     *
     * @returns A promise that resolves when the renaming process is complete or exits early
     *          if no controller or name is provided.
     */
    async renameController(controller: Controller | undefined) {
        let newController;
        if (controller) {
            newController = controller;
        } else {
            const controllers = YamlCommands.getControllers();
            if (controllers.length > 1) {
                newController = await vscode.window.showQuickPick(
                    controllers.map((controller) => {
                        return {
                            label: controller.displayname,
                            description: controller.description,
                            controllerId: controller.id,
                        };
                    }),
                    {
                        title: 'Rename Controller',
                        canPickMany: false,
                    }
                );
            } else {
                newController = {
                    label: controllers[0].displayname,
                    controllerId: controllers[0].id,
                };
            }
        }
        if (!newController) return;

        const controllerName =
            (await vscode.window.showInputBox({
                prompt: 'Enter the name of the controller',
                title: 'Rename Controller',
                value: newController.label,
            })) || '';
        if (!controllerName) return;

        YamlCommands.writeWagoYaml(
            newController.controllerId,
            WagoSettings.displayname,
            controllerName
        );
    }
}

export class RemoveResetController
    implements Interface.RemoveResetControllerInterface
{
    /**
     * Removes or resets a controller. If no controller is provided, prompts the user to select one
     * from a list of available controllers using a Quick Pick dialog.
     *
     * @param controller - The controller to be removed or reset. If undefined, a Quick Pick dialog
     *                      will be displayed to allow the user to select a controller.
     * @returns A promise that resolves to the selected or provided controller.
     */
    async removeResetController(controller: Controller | undefined) {
        if (!controller) {
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,
                    label: controller.displayname,
                    description: controller.description,
                    online: true,
                })),
                {
                    title: 'Reset Controller',
                    canPickMany: false,
                }
            );
        }
        return controller;
    }
}
export class EstablishConnections
    implements Interface.EstablishConnectionsInterface
{
    /**
     * Establishes connections to all controllers defined in the YAML configuration.
     *
     * This method retrieves the list of controllers using `YamlCommands.getControllers()`,
     * then iterates through each controller to fetch its settings and establish a connection
     * using the `ConnectionManager.instance.addController` method.
     *
     * @async
     * @throws Will propagate any errors encountered during the connection process.
     */
    establishConnections() {
        const controllers = YamlCommands.getControllers();
        controllers.forEach((controller) => {
            const settings = YamlCommands.getControllerSettings(controller.id);
            if (settings && settings.connection === 'usb-c') {
                ConnectionManager.instance.addController(
                    controller.id,
                    `${Manager.getInstance().getUSB_C_IP(controller.id)}:${settings.port}`,
                    settings.user
                );
            } else if (settings && settings.connection === 'ethernet') {
                ConnectionManager.instance.addController(
                    controller.id,
                    `${settings.ip}:${settings.port}`,
                    settings.user
                );
            }
        });
    }
}
//===================================================================================
// EditSettings Functionality
//===================================================================================
export class EditSettingsFunctionality {
    /**
     * Edits a specified setting in either the `wago.yaml` or `controller.yaml` configuration file.
     * The method determines the type of setting to edit and provides appropriate input or selection
     * mechanisms to update the configuration.
     *
     * @param id - The unique identifier for the setting to be edited.
     * @param settingToEdit - The name of the setting to be edited. This can belong to either `wagoSettings` or `ControllerSettings`.
     *
     * @remarks
     * - For `wago.yaml` settings:
     *   - `displayname` and `description` prompt the user for input.
     *   - `engine` and `imageVersion` are placeholders for future implementation.
     *   - `src` allows the user to select an existing folder or create a new one.
     * - For `controller.yaml` settings:
     *   - `connection` provides a quick pick for connection types (`usb-c` or `ethernet`).
     *   - `ip`, `port`, and `user` prompt the user for input.
     *   - `autoupdate` provides a quick pick for enabling or disabling the feature.
     *
     * @throws Will show an error message if no workspace is open or if an invalid attribute type is provided.
     * @returns A promise that resolves when the setting is successfully edited or exits early if the user cancels the operation.
     */
    public static async editSetting(id: number, settingToEdit: string) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }

        if (settingToEdit in WagoSettings) {
            switch (settingToEdit) {
                // wago.yaml Setting
                case WagoSettings.displayname:
                case WagoSettings.description:
                    const content = await this.getInput(settingToEdit);
                    if (!content) return;
                    YamlCommands.writeWagoYaml(
                        id,
                        WagoSettings[settingToEdit],
                        content
                    );
                    break;

                // wago.yaml QuickPick
                case WagoSettings.engine:
                    const pickedEngine =
                        (await vscode.window.showQuickPick(
                            Object.values(Engine),
                            {
                                title: 'Engine',
                                canPickMany: false,
                            }
                        )) || '';
                    if (!pickedEngine) return;
                    YamlCommands.writeWagoYaml(
                        id,
                        WagoSettings[settingToEdit],
                        pickedEngine
                    );
                    break;

                case WagoSettings.src:
                    const workspacePath =
                        vscode.workspace.workspaceFolders![0].uri.fsPath;
                    const controllerSrc = await vscode.window.showQuickPick(
                        fs
                            .readdirSync(workspacePath)
                            .map((folder) => {
                                if (
                                    fs.existsSync(
                                        `${workspacePath}/${folder}/${FILE_NAMES.MAIN_PYTHON}`
                                    )
                                ) {
                                    return {
                                        label: `${folder}`,
                                        description: `${folder}/${FILE_NAMES.MAIN_PYTHON}`,
                                    };
                                }
                                return { label: '' };
                            })
                            .filter((path) =>
                                path.label.length > 0 ? true : false
                            )
                            .concat({
                                label: 'New',
                                description: 'Create a new folder',
                            })
                    );
                    if (!controllerSrc) return;
                    let newFolder;
                    if (controllerSrc.label === 'New') {
                        newFolder = await this.getInput(settingToEdit);
                        fs.mkdirSync(
                            `${path.resolve(workspacePath)}/${newFolder}`
                        );
                        fs.writeFile(
                            `${path.resolve(
                                workspacePath
                            )}/${newFolder}/${FILE_NAMES.MAIN_PYTHON}`,
                            '',
                            (err) => {
                                if (err) {
                                    console.error('Error writing file:', err);
                                }
                            }
                        );
                    }
                    if (!newFolder) {
                        YamlCommands.writeWagoYaml(
                            id,
                            WagoSettings[settingToEdit],
                            controllerSrc.label
                        );
                    } else {
                        YamlCommands.writeWagoYaml(
                            id,
                            WagoSettings[settingToEdit],
                            newFolder
                        );
                    }
                    break;
                case WagoSettings.imageVersion:
                    const imageToken =
                        await new UploadFunctionality().getToken();

                    const dockerImage =
                        (await vscode.window.showQuickPick(
                            await new UploadFunctionality().getTagList(
                                imageToken
                            ),
                            {
                                title: 'Image Version',
                                canPickMany: false,
                            }
                        )) || '';
                    if (!dockerImage) return;

                    YamlCommands.writeWagoYaml(
                        id,
                        WagoSettings[settingToEdit],
                        dockerImage
                    );

                    break;
            }
            return;
        } else if (settingToEdit in ControllerSettings) {
            switch (settingToEdit) {
                // controller.yaml Setting
                case ControllerSettings.connection:
                    const conType =
                        (await vscode.window.showQuickPick(
                            ['usb-c', 'ethernet'],
                            {
                                title: 'Connection Type',
                                canPickMany: false,
                            }
                        )) || '';
                    if (!conType) return;
                    YamlCommands.writeControllerYaml(
                        id,
                        ControllerSettings[settingToEdit],
                        conType
                    );
                    break;

                case ControllerSettings.ip:
                case ControllerSettings.netmask:
                case ControllerSettings.gateway:
                case ControllerSettings.port:
                case ControllerSettings.user:
                    const content = await this.getInput(settingToEdit);
                    if (!content) return;

                    // Change connection to ethernet and check if input ip is valid
                    if (settingToEdit === ControllerSettings.ip) {
                        YamlCommands.writeControllerYaml(
                            id,
                            ControllerSettings.connection,
                            'ethernet'
                        );
                    }

                    // Check input if gateway is valid
                    if (settingToEdit === ControllerSettings.gateway) {
                        if (!RegExp(IP_REGEX).test(content)) {
                            vscode.window.showErrorMessage(
                                'The given gateway is not valid'
                            );
                            return;
                        }
                    }

                    // Check input if netmask is valid
                    if (settingToEdit === ControllerSettings.netmask) {
                        if (!RegExp(IP_REGEX).test(content)) {
                            vscode.window.showErrorMessage(
                                'The given netmask is not valid'
                            );
                            return;
                        }
                    }

                    // Check input if Port is a valid Number
                    if (settingToEdit === ControllerSettings.port) {
                        const tempNumber = Number(content);
                        if (
                            Number.isNaN(tempNumber) ||
                            tempNumber < NETWORK_CONSTANTS.MIN_PORT ||
                            tempNumber > NETWORK_CONSTANTS.MAX_PORT
                        ) {
                            vscode.window.showErrorMessage(
                                'The given Port is not a valid Number'
                            );
                            return;
                        }
                    }

                    YamlCommands.writeControllerYaml(
                        id,
                        ControllerSettings[settingToEdit],
                        content
                    );
                    break;

                // controller.yaml QuickPick
                case ControllerSettings.autoupdate:
                    const status =
                        (await vscode.window.showQuickPick(['on', 'off'], {
                            title: 'Autoupdate',
                            canPickMany: false,
                        })) || '';
                    if (!status) return;

                    YamlCommands.writeControllerYaml(
                        id,
                        ControllerSettings[settingToEdit],
                        status
                    );
                    break;
            }
            return;
        } else {
            vscode.window.showErrorMessage('Invalid Attribute Type');
        }
    }

    /**
     * Prompts the user to input a value for a specified setting and returns the entered value.
     *
     * @param settingToEdit - The name of the setting to be edited.
     *                        Must be one of: "displayname", "src", "description", "ip", "port", or "user".
     * @returns A promise that resolves to the entered value as a string.
     *          If the input box is dismissed without entering a value, an empty string is returned.
     */
    private static async getInput(
        settingToEdit:
            | 'displayname'
            | 'src'
            | 'description'
            | 'ip'
            | 'netmask'
            | 'gateway'
            | 'port'
            | 'user'
    ): Promise<string> {
        let input;
        if (settingToEdit === 'src') {
            input =
                (await vscode.window.showInputBox({
                    prompt:
                        'Enter the name of the new folder that ' +
                        settingToEdit +
                        ' should be set to',
                    title: 'Set Source Value',
                })) || '';
        } else {
            input =
                (await vscode.window.showInputBox({
                    prompt:
                        'Enter the value the ' +
                        settingToEdit +
                        ' should be set to',
                    title: 'Set ' + settingToEdit + ' Value',
                })) || '';
        }

        return input;
    }
}
//===================================================================================
// Upload Functionality
//===================================================================================

let connectionManager = ConnectionManager.instance;

export class UploadFunctionality {
    static repo = DOCKER_CONSTANTS.REPOSITORY;
    static imageName = `${DOCKER_CONSTANTS.IMAGE_PREFIX}/${UploadFunctionality.repo}`;

    /**
     * This Method uploads the corresponding files to the WAGO Controller.
     *
     * @param id The id of the used controller
     */
    public async uploadFile(id: number) {
        let controller = YamlCommands.getController(id);
        let srcPath = path.join(
            vscode.workspace.workspaceFolders![0].uri.fsPath,
            controller?.src || ''
        );

        if (!fs.existsSync(path.join(srcPath, FILE_NAMES.MAIN_PYTHON))) {
            vscode.window.showErrorMessage(
                `The selected Folder does not exist or does not contain a ${FILE_NAMES.MAIN_PYTHON}.`
            );
            return;
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Upload Progress',
                cancellable: false,
            },
            async (progress, _token) => {
                try {
                    progress.report({
                        increment: 20,
                        message: 'Deactivating Codesys...',
                    });
                    await this.deactivateCodeSys3(id);

                    progress.report({
                        increment: 20,
                        message: 'Activating Docker...',
                    });
                    // Wait for dockerd to create docker.sock
                    await connectionManager.executeCommand(
                        id,
                        '/etc/config-tools/config_docker activate && sleep 1'
                    );

                    progress.report({
                        increment: 10,
                        message: 'Comparing Folders and Image Version...',
                    });
                    const filesUpToDate = await this.compareFolders(
                        id,
                        srcPath
                    );
                    const imageVersionResult =
                        await this.compareDockerImageVersion(id);

                    if (!imageVersionResult.imageUpToDate) {
                        progress.report({
                            increment: 10,
                            message: 'Updating image...',
                        });
                        await this.updateContainer(
                            id,
                            imageVersionResult.wantedVersion,
                            imageVersionResult.currentTag
                        );
                    }

                    if (!filesUpToDate) {
                        progress.report({
                            increment: 10,
                            message: 'Uploading files...',
                        });
                        await connectionManager
                            .uploadDirectory(id, srcPath, UPLOAD_PATH)
                            .then(() => {})
                            .catch((err) => {
                                console.error(`Error uploading files: ${err}`);
                                vscode.window.showErrorMessage(
                                    'An error occurred while uploading the files.'
                                );
                            });
                    }

                    progress.report({
                        increment: 20,
                        message: 'Starting Python Application...',
                    });
                    if (!imageVersionResult.imageUpToDate) {
                        await connectionManager.executeScript(
                            id,
                            'dockerCommand.sh',
                            imageVersionResult.wantedVersion
                        );
                    } else {
                        const containerStartResult = await connectionManager.executeCommand(
                            id,
                            `docker start ${DOCKER_CONSTANTS.CONTAINER_NAME}`
                        );

                        if(containerStartResult !== DOCKER_CONSTANTS.CONTAINER_NAME) {
                            await connectionManager.executeScript(
                                id,
                                'dockerCommand.sh',
                                imageVersionResult.currentTag[0]
                            );
                        }
                    }

                    progress.report({
                        increment: 100,
                        message: 'Finished Uploading',
                    });

                    return new Promise<void>((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, 2000);
                    });
                } catch (error) {
                    progress.report({
                        increment: 100,
                        message: 'An Error occured while Uploading',
                    });
                    console.error(`Error uploading to controller: ${error}`);
                    vscode.window.showErrorMessage(String(error));

                    return new Promise<void>((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, 4000);
                    });
                }
            }
        );
    }

    /**
     * This method is used to compare the contents of a folder on the WAGO Controller with the local folder,
     * using Hashes to compare the contents.
     *
     * @param id The id of the used controller
     * @param localPath The Path to the local folder with the python program
     * @returns Returns true, if folder contents are equivalent, false if not
     */
    private async compareFolders(
        id: number,
        localPath: string
    ): Promise<Boolean> {
        try {
            // Get Array of remote Hashes
            let remoteHashes = await connectionManager.executeCommand(
                id,
                `find ${UPLOAD_PATH} -type f -exec md5sum {} +`
            );
            let remoteHash = this.createFolderHash(remoteHashes);
            console.debug('Remote Hash: ' + remoteHash);

            //Get Array of local Hashes
            let localHashes = await this.getLocalHashes(localPath);
            let localHash = this.createFolderHash(localHashes);
            console.debug('Local Hash: ' + localHash);

            return Promise.resolve(localHash === remoteHash);
        } catch (error) {
            console.error('Error comparing folders:', error);
            return Promise.reject(error);
        }
    }

    /**
     * This Method is used to get the Hashes of all files in a directory
     * It is made to resemble the output of the following linux command:
     * find ${src} -type f -exec md5sum {} +
     *
     * @param path The Path to the directory to get the Hashes from
     * @returns Returns a String with Hashes and Paths to all files in the directory
     */
    private async getLocalHashes(path: string): Promise<string> {
        try {
            let localFiles = await this.getFilesInDirectory(path);
            let localHashes = '';

            //For Each File from Path in localFiles Array create Hash and add to localHashes
            for (let file of localFiles) {
                let fileContent = fs.readFileSync(file, 'utf8');
                let hash = crypto
                    .createHash('md5')
                    .update(fileContent)
                    .digest('hex');
                if (localHashes.length == 0) {
                    localHashes = `${localHashes}${hash}  ${file}`;
                } else {
                    localHashes = `${localHashes}\n${hash}  ${file}`;
                }
            }

            return Promise.resolve(localHashes);
        } catch (error) {
            console.error('Error getting local hashes:', error);
            return Promise.reject(error);
        }
    }

    /**
     * This Method is used to get Paths to every file in the current directory
     *
     * @param dirPath The current folder to be iterated
     * @returns Returns an Array with all Paths to files in the directory
     */
    private async getFilesInDirectory(dirPath: string): Promise<string[]> {
        try {
            let files: string[] = [];
            let read = fs.readdirSync(dirPath, { recursive: true });
            let dirFiles = read.map(String);

            for (const file of dirFiles) {
                const fullPath = path.join(dirPath, file);
                let stat = fs.statSync(fullPath);
                fs.stat(fullPath, (_err, stats) => {
                    stat = stats;
                });
                if (stat.isFile()) {
                    files.push(fullPath);
                }
            }

            return files;
        } catch (error) {
            console.error('Error getting files in local directory:', error);
            return Promise.reject(error);
        }
    }

    /**
     * Generates a hash for a folder based on the provided string of hashes.
     *
     * The method processes the input string by replacing newline characters with spaces,
     * splitting it into an array, filtering out every second element, sorting the array
     * lexicographically, and concatenating the elements back into a single string.
     * This processed string is then hashed using the MD5 algorithm to produce the final hash.
     *
     * @param hashes - A string containing hashes, typically separated by newlines.
     * @returns A string representing the MD5 hash of the processed input.
     */
    private createFolderHash(hashes: string): string {
        hashes = hashes
            .replaceAll('\n', '  ')
            .split('  ')
            .filter((_val, index) => {
                return index % 2 === 0;
            })
            .sort((a, b) => a.localeCompare(b))
            .toString()
            .replaceAll(',', '');

        let hash = crypto.createHash('md5').update(hashes).digest('hex');

        return hash;
    }

    /**
     * Kills all running codesys3 processes and deactivates the Codesys3 runtime on the WAGO Controller.
     *
     * @param id The id of the used controller
     */
    private async deactivateCodeSys3(id: number) {
        await connectionManager.executeCommand(id, 'kill $(pidof codesys3)');
        await connectionManager
            .executeCommand(
                id,
                '/etc/config-tools/config_runtime runtime-version=0'
            )
            .catch((err) => {
                console.error(`Error deactivating CodeSys3: ${err}`);
            });
    }

    private async compareDockerImageVersion(id: number) {
        const wantedVers = YamlCommands.getController(id)?.imageVersion;
        if (!wantedVers) throw new Error('No docker image version configured');

        try {
            const dockerPermission = await connectionManager.executeCommand(
                id,
                `docker images`
            );

            if (dockerPermission === '') {
                console.error(`Docker permission denied on Controller ${id}`);
                return Promise.reject(new Error('Docker permission denied'));
            }

            // Get current Controller Image Hash
            const currTag = (
                await connectionManager.executeCommand(
                    id,
                    `docker images | grep '${UploadFunctionality.imageName}' | awk '{print $2}'`
                )
            ).split('\n');

            // Check if there is a new version
            const token = await this.getToken();

            const tagList: string[] = await this.getTagList(token);
            if (!tagList.includes(wantedVers)) {
                vscode.window.showErrorMessage(
                    'Configured Image Tag is not a viable tag'
                );
                throw new Error('Configured image tag is not a viable tag');
            }

            let imageConfigController = '';
            if (currTag[0] != '') {
                const conManifest = await connectionManager.executeCommand(
                    id,
                    `docker inspect ${UploadFunctionality.imageName}:${currTag[0]}`
                );
                const json = JSON.parse(conManifest);
                imageConfigController = json[0].Id;
            } else {
                return {
                    imageUpToDate: false,
                    wantedVersion: wantedVers,
                    currentTag: currTag,
                };
            }

            // Get new Image Hash from GitHub Packages
            const wantedVersManifest = await this.getImageManifest(
                wantedVers,
                token
            );
            const imageConfig = wantedVersManifest.configDigest;

            if (imageConfigController == imageConfig) {
                console.debug('Image up to date');
                return {
                    imageUpToDate: true,
                    wantedVersion: wantedVers,
                    currentTag: currTag,
                };
            }

            // Autoupdate check
            const conName = YamlCommands.getController(id)?.displayname;
            const autoupdate =
                YamlCommands.getControllerSettings(id).autoupdate;
            if (autoupdate === 'off') {
                const checkReturn = await vscode.window.showWarningMessage(
                    `Update container image on ${conName}?`,
                    { modal: true },
                    'Yes',
                    'No'
                );
                if (checkReturn !== 'Yes')
                    return {
                        imageUpToDate: true,
                        wantedVersion: wantedVers,
                        currentTag: currTag,
                    };
            }

            return {
                imageUpToDate: false,
                wantedVersion: wantedVers,
                currentTag: currTag,
            };
        } catch (error) {
            console.error(`Error comparing Docker image versions: ${error}`);
            return Promise.reject(error);
        }
    }

    /**
     * This Method is used to update the docker-container on the WAGO Controller
     *
     * The development of this method is planned for a later date due to time registrations
     *
     * @param id The id of the used controller
     */
    private async updateContainer(
        id: number,
        wantedVersion: string,
        currentTag: string[]
    ): Promise<void> {
        const containerName = DOCKER_CONSTANTS.CONTAINER_NAME;
        const downloadPathFolder = `${extensionContext.storageUri?.fsPath}`;

        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Docker Image Progress',
                    cancellable: false,
                },
                async (progress) => {
                    progress.report({
                        increment: 10,
                        message: 'Removing old Image...',
                    });

                    let token = await this.getToken();

                    // Get new Image Hash from GitHub Packages
                    let wantedVersManifest = await this.getImageManifest(
                        wantedVersion,
                        token
                    );
                    let imageConfig = wantedVersManifest.configDigest;
                    let imageLayers = wantedVersManifest.layers;

                    // Stop current container
                    await connectionManager.executeCommand(
                        id,
                        `docker stop ${containerName}`
                    );

                    // remove all images and containers
                    await connectionManager.executeCommand(
                        id,
                        `docker rm ${containerName}`
                    );
                    for (const tag of currentTag) {
                        await connectionManager.executeCommand(
                            id,
                            `docker rmi -f ${UploadFunctionality.imageName}:${tag}`
                        );
                    }

                    progress.report({
                        increment: 10,
                        message: 'Downloading image from GitHub Packages...',
                    });

                    // Download and Upload new Image
                    // Download all Image Layers
                    if (
                        !fs.existsSync(
                            path.join(downloadPathFolder, 'blobs', 'sha256')
                        )
                    ) {
                        fs.mkdirSync(
                            path.join(downloadPathFolder, 'blobs', 'sha256'),
                            {
                                recursive: true,
                            }
                        );
                    }

                    let layerArray: String[] = [];
                    let layerResponseArray: {
                        response: Promise<Response>;
                        hash: string;
                    }[] = [];
                    await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: 'Downloading Image',
                            cancellable: false,
                        },
                        async (progress) => {
                            // Get Layer Responses
                            for (const layer of imageLayers) {
                                const response = fetch(
                                    `https://ghcr.io/v2/${UploadFunctionality.repo}/blobs/${layer}`,
                                    {
                                        headers: {
                                            Authorization: `Bearer ${token}`,
                                            Accept: 'application/vnd.oci.image.layer.v1.tar+gzip',
                                        },
                                    }
                                );
                                let layerWithoutSha = layer.substring(
                                    7,
                                    layer.length
                                ); // Remove sha256: from beginning of the string

                                // Add Layer Response Promise to Array
                                layerResponseArray.push({
                                    response: response,
                                    hash: layerWithoutSha,
                                });
                            }

                            // Resolve Layer Responses
                            let layerCount = 1;
                            for (const layer of layerResponseArray) {
                                progress.report({
                                    increment:
                                        (1 / layerResponseArray.length) * 100,
                                    message: `Downloading layer ${layerCount} from ${layerResponseArray.length}`,
                                });
                                let layerPath = path.join(
                                    downloadPathFolder,
                                    'blobs',
                                    'sha256',
                                    layer.hash
                                );

                                // Add Layer Path to Array
                                layerArray.push(`blobs/sha256/${layer.hash}`);

                                fs.open(layerPath, 'w', (err, fd) => {
                                    if (err)
                                        vscode.window.showErrorMessage(
                                            'Error while creating temporary file for the image layer.'
                                        );
                                    fs.close(fd);
                                });
                                const stream = fs.createWriteStream(layerPath);
                                const response = await layer.response;
                                const body = response.body;
                                if (!body) {
                                    vscode.window.showErrorMessage(
                                        'Error downloading image Layer.'
                                    );
                                    return;
                                }
                                await finished(
                                    Readable.fromWeb(body).pipe(stream)
                                );

                                console.debug(
                                    `Layer ${layer.hash} downloaded successfully.`
                                );

                                layerCount++;
                            }
                        }
                    );

                    progress.report({
                        increment: 20,
                        message: 'Downloading image metadata...',
                    });

                    // Create config.json file
                    let configJsonPath = path.join(
                        downloadPathFolder,
                        'config.json'
                    );
                    fs.open(configJsonPath, 'w', (err, fd) => {
                        if (err)
                            vscode.window.showErrorMessage(
                                'Error while creating temporary file for the image config.json.'
                            );
                        fs.close(fd);
                    });
                    const stream = fs.createWriteStream(configJsonPath);
                    console.debug(
                        `Request send: https://ghcr.io/v2/${UploadFunctionality.repo}/blobs/${imageConfig}`
                    );
                    const { body } = await fetch(
                        `https://ghcr.io/v2/${UploadFunctionality.repo}/blobs/${imageConfig}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                Accept: 'application/vnd.oci.image.layer.v1.tar+gzip',
                            },
                        }
                    );
                    if (!body) {
                        vscode.window.showErrorMessage(
                            'Error downloading image.'
                        );
                        return;
                    }
                    await finished(Readable.fromWeb(body).pipe(stream));

                    progress.report({
                        increment: 20,
                        message: 'Building Image...',
                    });

                    // Create manifest.json file
                    let manifestJsonPath = path.join(
                        downloadPathFolder,
                        'manifest.json'
                    );
                    fs.open(manifestJsonPath, 'w', (err, fd) => {
                        if (err)
                            vscode.window.showErrorMessage(
                                'Error while creating temporary file for the image manifest.json.'
                            );
                        fs.close(fd);
                    });

                    const manifestJson = [
                        {
                            Config: 'config.json',
                            RepoTags: [
                                `${DOCKER_CONSTANTS.IMAGE_PREFIX}/${UploadFunctionality.repo}:${wantedVersion}`,
                            ],
                            Layers: layerArray,
                        },
                    ];

                    fs.writeFileSync(
                        manifestJsonPath,
                        JSON.stringify(manifestJson)
                    );

                    // Put the Manifest and Layers together to an image
                    let tarPath = path.join(
                        downloadPathFolder,
                        FILE_NAMES.IMAGE_TAR
                    );
                    fs.open(tarPath, 'w', (err, fd) => {
                        if (err)
                            vscode.window.showErrorMessage(
                                `Error while creating temporary file for the image ${FILE_NAMES.IMAGE_TAR}.`
                            );
                        fs.close(fd);
                    });

                    create(
                        {
                            file: path.join(
                                downloadPathFolder,
                                FILE_NAMES.IMAGE_TAR
                            ),
                            sync: true,
                            cwd: downloadPathFolder,
                        },
                        ['config.json', 'manifest.json', 'blobs']
                    );

                    progress.report({
                        increment: 20,
                        message: 'Uploading Image...',
                    });

                    // Upload new Image
                    await connectionManager.uploadFile(
                        id,
                        path.join(
                            downloadPathFolder,
                            `/${FILE_NAMES.IMAGE_TAR}`
                        ),
                        '/home/'
                    );

                    progress.report({
                        increment: 10,
                        message: 'Loading Image...',
                    });

                    // Load new Image
                    await connectionManager.executeCommand(
                        id,
                        `docker load -i /home/${FILE_NAMES.IMAGE_TAR}`
                    );

                    await connectionManager.executeCommand(
                        id,
                        `rm /home/${FILE_NAMES.IMAGE_TAR}`
                    );

                    // Delete local Image files
                    fs.unlinkSync(
                        path.join(downloadPathFolder, FILE_NAMES.IMAGE_TAR)
                    );
                    fs.unlinkSync(path.join(downloadPathFolder, `config.json`));
                    fs.unlinkSync(
                        path.join(downloadPathFolder, `manifest.json`)
                    );
                    fs.rmSync(path.join(downloadPathFolder, `blobs`), {
                        recursive: true,
                        force: true,
                    });
                }
            );
        } catch (error) {
            console.error(`Error Updating Container: ${error}`);
        }
    }

    /**
     * This Method returns the token for all GitHub Packages Calls
     *
     * @param token
     * @returns The Token for the gitHub Packages
     */
    public async getToken(): Promise<string> {
        let tokenResponse = await fetch(
            `https://ghcr.io/token?service=ghcr.io&scope=repository:${UploadFunctionality.repo}:pull`
        );
        if (!tokenResponse.ok)
            throw new Error(
                `Failed to fetch token: ${tokenResponse.statusText}`
            );
        let tokenObj: any = await tokenResponse.json();
        console.debug(`Github Packages Token: ${tokenObj.token}`);
        return tokenObj.token;
    }

    /**
     * This Method returns the List of all Tags in the GitHub Packages
     *
     * @param token
     * @returns The Token for the GitHub Packages
     */
    public async getTagList(token: string): Promise<string[]> {
        let tagListResponse = await fetch(
            `https://ghcr.io/v2/${UploadFunctionality.repo}/tags/list`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        if (!tagListResponse.ok)
            throw new Error(
                `Failed to fetch tag list: ${tagListResponse.statusText}`
            );
        let tagList: any = await tagListResponse.json();
        return tagList.tags;
    }

    /**
     * This Method is used to get the Manifest of a docker image with a specific tag
     *
     * @param tag The tag you want to get the manifest of
     * @returns Promise<string>, the Manifest of the docker image
     */
    private async getImageManifest(
        tag: string,
        token: string
    ): Promise<{ configDigest: string; layers: string[] }> {
        let manifestResponse = await fetch(
            `https://ghcr.io/v2/${UploadFunctionality.repo}/manifests/${tag}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.oci.image.index.v1+json',
                },
            }
        );
        if (!manifestResponse.ok)
            throw new Error(
                `Failed to fetch manifest: ${manifestResponse.statusText}`
            );
        let manifest: any = await manifestResponse.json();

        // Shrinks the Manifest to the size needed later on
        let returnObj = {
            configDigest: manifest.config.digest,
            layers: manifest.layers.map((layer: any) => layer.digest),
        };

        return Promise.resolve(returnObj);
    }
}
