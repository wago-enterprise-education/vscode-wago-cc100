import { Controller, ControllerItem, ControllerProvider} from "../../extension/view";
import * as vscode from 'vscode';
import * as Interface from "../interfaces/projectInterface";
import crypto from 'crypto';
import { ConnectionManager } from "../../extension/connectionManager";
import * as fs from 'fs';
import YAML from 'yaml';
import * as path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const FOLDER_REGEX = '^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^.]*)?$)[^<>:"/\\|?*\x00-\x1F]*[^<>:"/\\|?*\x00-\x1F\ .]$';

export class UploadController implements Interface.UploadInterface{
    /**
     * Uploads the project specified in the Controllersettings to the selected controller.
     * If no controller is provided, prompts the user to select one from available controllers.
     *
     * @param controller - Optional controller to upload to. If not provided, user will be prompted to select one.
     * @returns A Promise that resolves when the upload is complete or when the operation is cancelled.
     * @throws Will display an error message if no workspace is open.
     */
    async uploadController(controller: Controller | undefined) {
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
        
        if (!controller) {
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,	
                    label: controller.displayname,
                    description: controller.description,
                    online: false
                })),
                {
                    title: 'Upload to Controller',
                    canPickMany: false
                }
            );
            if (!controller) return;
        }
        
        await new UploadFunctionality().uploadFile(controller.controllerId);
        return;
    }
}
export class UploadAllControllers implements Interface.UploadAllInterface{
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
    public uploadAllControllers(){
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
        let upload = new UploadController();
        const controllers = YamlCommands.getControllers();
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
			title: "Upload to All Controllers",
			cancellable: false
        }, (progress, token) => {
            controllers.forEach(async (controller) => {
                if(!controller) return;
    
                upload.uploadController({controllerId: controller.id, label: controller.displayname, online: true}).then(() => {
                    vscode.window.showInformationMessage(`Controller ${controller.displayname} uploaded`);
                }).catch((error) => {
                    vscode.window.showErrorMessage(`Error uploading controller ${controller.displayname}: ${error}`);
                });
                progress.report({increment: 100/controllers.length, message: `Uploading to ${controller.displayname}`});
            });
            return Promise.resolve(true);
        });
        


    }
}
export class ResetController implements Interface.ResetControllerInterface{
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
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');

            return "";
        }
        if(!controller) {
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,	
                    label: controller.displayname,
                    description: controller.description,
                    online: true
                })),
                {
                    title: 'Reset Controller',
                    canPickMany: false
                }
            );
            if (!controller) return "";
        } 

        let controllerId;
        
        if(showConfirmation){
            await vscode.window.showWarningMessage(`Reset ${controller.label}?`, 'Yes', 'No').then((value) => {
                if(value === 'No') return "";
            });
            if(!controllerId) return "";
        }
        controllerId = controller.controllerId;
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
			title: "Reset Controller",
			cancellable: false
        }, async (progress, token) => {
            try {
                await ConnectionManager.instance.executeCommand(controllerId, 'docker container stop #Container name');
                progress.report({ increment: 20, message: `Stopped Container` });
                await ConnectionManager.instance.executeCommand(controllerId, 'docker rm #Container name');
                progress.report({ increment: 10, message: `Removed Container` });
                await ConnectionManager.instance.executeCommand(controllerId, 'docker irm cc100_python');
                progress.report({ increment: 10, message: `Removed Image` });
                await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /home/user/python_bootapplication/*');
                progress.report({ increment: 10, message: `Deleted Files` });
            } catch (error: any) {
                vscode.window.showErrorMessage('Error resetting controller');
            }
        });

        return YamlCommands.getController(controllerId)?.engine || "";
    }
}
export class AddController implements Interface.AddControllerInterface{
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
    async addController(context: vscode.ExtensionContext) {
        const controllerName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the controller',
            title: 'Add Controller / Name',
            ignoreFocusOut: true
        }) || '';

        if(!controllerName) return;

        const controllerDescription = await vscode.window.showInputBox({
            prompt: 'Enter the description of the controller',
            title: 'Add Controller / Description',
            ignoreFocusOut: true
        }) || '';

        const controllerEngine = await vscode.window.showQuickPick(['CC100-v0.1', 'CC100-v0.2'], {
            title: 'Add Controller / Engine',
            canPickMany: false,
            ignoreFocusOut: true
        }) || 'CC100-v0.2';

        const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
        const controllerSrc = await vscode.window.showQuickPick(
            fs.readdirSync(workspacePath)
                .map((folder) => {
                    if (fs.existsSync(`${workspacePath}/${folder}/main.py`)) {
                        return {
                            label: `${folder}`,
                            description: `${folder}/main.py`
                        };
                    }
                    return { label: "" };
                })
                .filter((path) => path.label.length > 0 ? true : false)
                .concat({ label: "New", description: 'Create a new folder' }),
            {
                title: 'Add Controller / Source',
                canPickMany: false,
                ignoreFocusOut: true
            }
        ) || { label: "src" };

        if(controllerSrc.label === 'New') {
            const newFolder = await vscode.window.showInputBox({
                prompt: 'Enter the name of the folder',
                title: 'Add Controller / Source / New Folder',
                ignoreFocusOut: true,
                validateInput: (value: string) => {
                    if(!RegExp(FOLDER_REGEX).test(value)) {
                        return 'Invalid folder name';
                    }
                    if(fs.existsSync(`${workspacePath}/${value}`)) {
                        return 'Folder already exists';
                    }
                    return null;
                }
            }) || '';

            if(newFolder) {
                fs.mkdirSync(`${workspacePath}/${newFolder}`);
                fs.cpSync(`${context.extensionPath}/res/template/src/main.py`, `${workspacePath}/${newFolder}/main.py`)
                controllerSrc.label = newFolder;
            } else {
                controllerSrc.label = 'src';
            }
        }

        await YamlCommands.createController(context, controllerName, controllerDescription, controllerEngine, controllerSrc.label, "latest");
        vscode.window.showInformationMessage(`Controller ${controllerName} added`);
        ControllerProvider.instance.refresh();
    }
}
export class RemoveController implements Interface.RemoveControllerInterface{
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
    async removeController(controller: Controller | undefined, showConfirmation: boolean){
        let selectedController;
        if(controller) {
            selectedController = controller;
        } else {
            selectedController = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,	
                    label: controller.displayname,
                    description: controller.description
                })),
                {
                    title: 'Remove Controller',
                    canPickMany: false
                }
            );
            if (!selectedController) return;
        } 

        let controllerId;
        if(showConfirmation){
            await vscode.window.showWarningMessage(`Remove ${selectedController.label}?`, 'Yes', 'No').then((value) => {
                if(value === 'Yes') controllerId = selectedController.controllerId;
            });
            if(!controllerId) return;
        } else {
            controllerId = selectedController.controllerId;
        }
        
        YamlCommands.removeController(controllerId);
        vscode.window.showInformationMessage(`Controller ${selectedController.label} removed`);

        ControllerProvider.instance.refresh();
    }
}
export class ConfigureController implements Interface.ConfigureControllerInterface{
    /**
     * Configures the necessary settings or parameters for the implementation.
     * This method is intended to be implemented with specific logic.
     */
    configure() {
        
    }
}
export class EditSettings implements Interface.EditSettingsInterface{
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
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
    
        let settingToEdit: string;

        if(controller === undefined) {
            let con = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    id: controller.id,	
                    label: controller.displayname,
                    description: controller.description
                })),
                {
                    title: 'Pick Controller',
                    canPickMany: false
                }
            );    
            if (con === undefined) return;
            let id = con.id;
        
            settingToEdit = await vscode.window.showQuickPick(
                Object.values(setting),
                {
                    title: 'Choose Setting',
                    canPickMany: false
                }
            ) || '';
            if (!settingToEdit) return;

            await EditSettingsFunctionality.editSetting(id, settingAdapter[settingToEdit as keyof typeof settingAdapter]);
        } else {
            await EditSettingsFunctionality.editSetting(controller.controllerId, settingAdapter[controller.setting as keyof typeof settingAdapter]);
        }

        ControllerProvider.instance.refresh();
    }
}
export class ViewChildren implements Interface.ViewChildrenInterface{
    /**
     * Retrieves the children elements for a given controller or controller item.
     * If no element is provided, it fetches the list of controllers and determines their online status.
     * If a controller is provided, it retrieves its settings and additional details.
     *
     * @param element - An optional `Controller` or `ControllerItem` instance. If undefined, the method fetches all controllers.
     * @returns A promise that resolves to a `vscode.ProviderResult` containing an array of `Controller` or `ControllerItem` objects.
     */
    getChildren(element?: Controller | ControllerItem | undefined): Promise<vscode.ProviderResult<Controller[] | ControllerItem[]>> {
        if(!element) {
            let controllers = YamlCommands.getControllers();
            if (!controllers) return Promise.resolve([]);

            return Promise.all(
                controllers.map(async (controller) => {
                    let online = false;
                    try {
                        let settings = YamlCommands.getControllerSettings(controller.id);
                        await ConnectionManager.instance.updateController(controller.id, `${settings.ip}:${settings.port}`, settings.user);
                        await ConnectionManager.instance.ping(controller.id);
                        online = true;
                    } catch (error) {
                        console.debug(`Controller ${controller.id} is offline. ${error}`);
                    }
                    return new Controller(controller.id, controller.displayname, online);
                })
            );
        } else {
            if(element instanceof Controller) {
                const settings = YamlCommands.getControllerSettings(element.controllerId);
                if (!settings) return Promise.resolve([]);
                
                const controller = YamlCommands.getController(element.controllerId);

                const settingArray = []

                settingArray.push(new ControllerItem(element.controllerId, setting.connection, settings.connection));
                if(settings.connection === 'ethernet') {
                    settingArray.push(new ControllerItem(element.controllerId, setting.ip, settings.ip));
                }
                settingArray.push(new ControllerItem(element.controllerId, setting.port, settings.port));
                settingArray.push(new ControllerItem(element.controllerId, setting.user, settings.user));
                settingArray.push(new ControllerItem(element.controllerId, setting.autoupdate, settings.autoupdate));

                return Promise.resolve([
                    new ControllerItem(element.controllerId, setting.description, controller?.description),
                    new ControllerItem(element.controllerId, setting.engine, controller?.engine),
                    new ControllerItem(element.controllerId, setting.imageVersion, controller?.imageVersion),
                    new ControllerItem(element.controllerId, setting.src, controller?.src),

                ].concat(settingArray));
            }
        }
        return Promise.resolve([]);
    }
}
export class RenameController implements Interface.RenameControllerInterface{
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
    async renameController(controller: Controller | undefined){
        let newController;
        if(controller) {
            newController = controller;
        } else {
            const controllers = YamlCommands.getControllers();
            if(controllers.length > 1) {
                newController = await vscode.window.showQuickPick(controllers.map(controller => {
                    return {
                        label: controller.displayname,
                        description: controller.description,
                        controllerId: controller.id,
                    };
                }), {
                    title: 'Rename Controller',
                    canPickMany: false
                });
            } else {
                newController = {
                    label: controllers[0].displayname,
                    controllerId: controllers[0].id,
                }
            }
        }
        if(!newController) return;

        const controllerName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the controller',
            title: 'Rename Controller',
            value: newController.label,
        }) || '';
        if(!controllerName) return;

        YamlCommands.writeWagoYaml(newController.controllerId, wagoSettings.displayname, controllerName);
    }
}
export class CreateProject implements Interface.CreateProjectInterface{
    /**
     * Creates a new project controller by prompting the user for a project name and destination folder.
     * 
     * This function performs the following steps:
     * 1. Prompts the user to input a valid project name.
     * 2. Opens a dialog for the user to select a destination folder for the project.
     * 3. Creates a new folder with the specified project name at the selected destination.
     * 4. Copies a template from the extension's resources into the newly created project folder.
     * 5. Opens the newly created project folder in a new VS Code window.
     * 
     * @param context - The extension context, providing access to the extension's resources and state.
     * 
     * @throws Will show an error message if the project folder already exists or if any file system operation fails.
     */
    async createController(context: vscode.ExtensionContext){
        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the project',
            title: 'Create Project',
            validateInput: (value: string) => {
                if(!RegExp(FOLDER_REGEX).test(value)) {
                    return 'Invalid project name';
                }
                return null;
            }
        })

        if(!projectName) return;

        await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Project Destination'
        }).then(async (uri) => {
            if(uri && projectName) {
                try {
                    fs.mkdirSync(`${uri[0].fsPath}/${projectName}`);
                    fs.cpSync(`${context.extensionPath}/res/template`, `${uri[0].fsPath}/${projectName}`, { recursive: true });
                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(`${uri[0].fsPath}/${projectName}`));
                } catch (error: any) {
                    vscode.window.showErrorMessage('Project already exists');
                }
            }
        })
    }
}
export class RemoveResetController implements Interface.RemoveResetControllerInterface{
    /**
     * Removes or resets a controller. If no controller is provided, prompts the user to select one
     * from a list of available controllers using a Quick Pick dialog.
     *
     * @param controller - The controller to be removed or reset. If undefined, a Quick Pick dialog
     *                      will be displayed to allow the user to select a controller.
     * @returns A promise that resolves to the selected or provided controller.
     */
    async removeResetController(controller: Controller | undefined){
        if(!controller) {
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,	
                    label: controller.displayname,
                    description: controller.description,
                    online: true
                })),
                {
                    title: 'Reset Controller',
                    canPickMany: false
                }
            );
        } 
        return controller;
    };
}
export class EstablishConnections implements Interface.EstablishConnectionsInterface{
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
		controllers.forEach(async controller => {
			const settings = YamlCommands.getControllerSettings(controller.id);
			await ConnectionManager.instance.addController(controller.id, `${settings.ip}:${settings.port}`, settings.user)
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
     * @param settingToEdit - The name of the setting to be edited. This can belong to either `wagoSettings` or `controllerSettings`.
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
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
        
        if (settingToEdit in wagoSettings) {
            switch (settingToEdit) {
                // wago.yaml Setting
                case "displayname": 
                case "description":
                    let content = await this.getInput(settingToEdit);
                    if (!content) return;
                    YamlCommands.writeWagoYaml(id, wagoSettings[settingToEdit], content);
                    break;

                // wago.yaml QuickPick
                case "engine":
                    //TODO - No Enums of available engines yet----------------------------------------------
                    break;

                case "src":
                    const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
                    const controllerSrc = await vscode.window.showQuickPick(
                        fs.readdirSync(workspacePath)
                            .map((folder) => {
                                if (fs.existsSync(`${workspacePath}/${folder}/main.py`)) {
                                    return {
                                        label: `${folder}`,
                                        description: `${folder}/main.py`
                                    };
                                }
                                return { label: "" };
                            })
                            .filter((path) => path.label.length > 0 ? true : false)
                            .concat({ label: "New", description: 'Create a new folder' })
                    );
                    if (!controllerSrc) return;
                    let newFolder
                    if (controllerSrc.label === "New"){
                        newFolder = await this.getInput(settingToEdit)
                        fs.mkdirSync(`${path.resolve(workspacePath)}/${newFolder}`);
                        fs.writeFile(`${path.resolve(workspacePath)}/${newFolder}/main.py`, "", (err) => {
                            if (err) {
                                console.error('Error writing file:', err);
                            }
                        });
                    }
                    if(!newFolder){
                        YamlCommands.writeWagoYaml(id, wagoSettings[settingToEdit], controllerSrc.label);
                    } else {
                        YamlCommands.writeWagoYaml(id, wagoSettings[settingToEdit], newFolder);
                    }
                    break;
                case "imageVersion": 
                    //TODO - Not yet determined how they will be managed-------------------------------------------
                    break;
            }
            return;

        } else if (settingToEdit in controllerSettings) {
            switch (settingToEdit) {
                // controller.yaml Setting
                case "connection":
                    let conType = await vscode.window.showQuickPick(['usb-c', 'ethernet'], {
                        title: 'Connection Type',
                        canPickMany: false
                    }) || '';
                    if (!conType) return;
                    if (conType === 'usb-c') YamlCommands.writeControllerYaml(id, controllerSettings.ip, '192.168.42.42');
                    YamlCommands.writeControllerYaml(id, controllerSettings[settingToEdit], conType);
                    break;

                case "ip": 
                case "port":
                case "user":
                    if (settingToEdit === controllerSettings.ip) YamlCommands.writeControllerYaml(id, controllerSettings.connection, 'usb-c');
                    let content = await this.getInput(settingToEdit);
                    if (!content) return;
                    YamlCommands.writeControllerYaml(id, controllerSettings[settingToEdit], content);
                    break;
    
                // controller.yaml QuickPick
                case "autoupdate": 
                    let status = await vscode.window.showQuickPick(['on', 'off'], {
                        title: 'Autoupdate',
                        canPickMany: false
                    }) || '';
                    if (!status) return;

                    YamlCommands.writeControllerYaml(id, controllerSettings[settingToEdit], status);
                    break;
            }
            return;

        } else {
            vscode.window.showErrorMessage("Invalid Attribute Type");
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
    private static async getInput(settingToEdit: "displayname" | "src" | "description" | "ip" | "port" | "user"): Promise<string> {
        let input = await vscode.window.showInputBox({
            prompt: 'Enter the value the '+ settingToEdit +' should be set to',
            title: 'Set '+ settingToEdit +' Value'
        }) || '';
        return input;
    }
}
/**
 * Enum representing various settings used in the application.
 * Each setting corresponds to a specific configuration property.
 */
export enum setting {
    displayname = 'Name',
    description = 'Description',
    engine = 'Engine',
    src = 'Source',
    imageVersion = 'Docker Image Version',
    connection = 'Connection',
    ip = 'IP',
    port = 'Port',
    user = 'User',
    autoupdate = 'Autoupdate'
}
/**
 * Enum representing the various settings for an adapter configuration.
 * Each member of the enum corresponds to a specific configuration property.
 *
 * @enum {string}
 */
export enum settingAdapter {
    Name = "displayname",
    Description = "description",
    Engine = "engine",
    Source = "src",
    'Docker Image Version' = "imageVersion",
    Connection = "connection",
    IP = "ip",
    Port = "port",
    User = "user",
    Autoupdate = "autoupdate"
}
//===================================================================================
// File Functionality
//===================================================================================
/**
 * Represents the structure of a controller object.
 * 
 * @property id - The unique identifier for the controller.
 * @property displayname - The display name of the controller.
 * @property description - A brief description of the controller.
 * @property engine - The engine associated with the controller.
 * @property src - The source or path related to the controller.
 * @property imageVersion - The version of the controller's image.
 */
type ControllerType = {
    id: number,
    displayname: string,
    description: string,
    engine: string,
    src: string,
    imageVersion: string
}
/**
 * Represents the settings for a controller.
 * 
 * @property connection - The type of connection used by the controller (e.g., "ethernet", "usb-c").
 * @property ip - The IP address of the controller.
 * @property port - The port number used for communication with the controller.
 * @property user - The username for authentication with the controller.
 * @property autoupdate - The auto-update setting for the controller (e.g., "on", "off").
 */
type ControllerSettingsType = {
    connection: string,
    ip: string,
    port: number,
    user: string,
    autoupdate: string
}
export class YamlCommands {

    /**
     * Function to read the content of the wago.yaml file.
     * 
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getWagoYaml() {
        return YAML.parse(fs.readFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, 'utf8'));
    }

    /**
     * Function to read the content of the wago.yaml file.
     * 
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getControllerYaml(id: number) {
        return YAML.parse(fs.readFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`, 'utf8'));
    }

    /**
     * Retrieves an array of controller objects from the Wago YAML configuration.
     *
     * @returns {Array<ControllerType>} An array of controller objects, each containing:
     * - `id`: The numeric identifier of the controller.
     * - `displayname`: The display name of the controller.
     * - `description`: A brief description of the controller.
     * - `engine`: The engine type associated with the controller.
     * - `src`: The source path or URL of the controller.
     * - `imageVersion`: The version of the controller's image.
     */
    public static getControllers(): Array<ControllerType> {
        const nodes = this.getWagoYaml().nodes;
        return Object.keys(nodes).map((key: string) => ({
            id: Number.parseInt(key),	
            displayname: nodes[key].displayname,
            description: nodes[key].description,
            engine: nodes[key].engine,
            src: nodes[key].src,
            imageVersion: nodes[key].imageVersion
        }))
    }

    /**
     * Retrieves a controller by its unique identifier.
     *
     * @param id - The unique identifier of the controller to retrieve.
     * @returns The controller matching the given ID, or `undefined` if no match is found.
     */
    public static getController(id: number): ControllerType | undefined {
        return this.getControllers().find(controller => controller.id === id);
    }

    /**
     * Retrieves the controller settings for a given controller ID.
     *
     * @param id - The unique identifier of the controller.
     * @returns An object containing the controller settings, including:
     * - `connection`: The connection type or protocol.
     * - `ip`: The IP address of the controller.
     * - `port`: The port number used for communication.
     * - `user`: The username for authentication.
     * - `autoupdate`: A flag indicating whether auto-update is enabled.
     */
    public static getControllerSettings(id: number): ControllerSettingsType {
        const settings = this.getControllerYaml(id);
        return {
            connection: settings.connection,
            ip: settings.ip,
            port: settings.port,
            user: settings.user,
            autoupdate: settings.autoupdate
        }
    }

    /**
     * Method for changing the contents of the wago.yaml
     * 
     * @param id Id of the controller
     * @param attribute Name of the attribute that is to be changed (enum)
     * @param value Value that is to be written into the attribute (string)
     */
    public static writeWagoYaml(id: number, attribute: wagoSettings, value: string) {
        let yaml = this.getWagoYaml();
        yaml.nodes[id][attribute] = value;
        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(yaml, null, "\t"));
    }

    /**
     * Method for changing the contents of the controller.yaml
     * 
     * @param id Id of the controller
     * @param attribute Name of the attribute that is to be changed (enum)
     * @param value Value that is to be written into the attribute (string)
     * 
     * In Case of the Port attribute, the String is autmatically converted to a number
     */
    public static writeControllerYaml(id: number, attribute: controllerSettings, value: string) {
        let yaml = this.getControllerYaml(id);
        if (attribute === controllerSettings.port) {
            yaml[attribute] = Number(value);
        } else {
            yaml[attribute] = value;
        }
        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`, YAML.stringify(yaml, null, "\t"));
    }

    /**
     * Creates a new controller by prompting the user for necessary details and updating the `wago.yaml` file.
     * 
     * This function performs the following steps:
     * 1. Finds the next available ID for the new controller.
     * 2. Adds the new controller details to the `wago.yaml` file.
     * 3. Copies a template controller file to the appropriate location with the new controller's ID.
     * 
     * @param context - The extension context provided by VS Code.
     * @returns A promise that resolves when the controller has been created.
     */
    public static async createController(context: vscode.ExtensionContext, displayname: string, description: string, engine: string, src: string, imageVersion: string) {
        
        //Addition of the Controller to wago.yaml
        let id = this.findNextID();

        let obj = {
            nodes: {
                [id]: {
                    displayname: displayname,
                    description: description,
                    engine: engine,
                    src: src,
                    imageVersion: imageVersion
                }
            }
        }

        let yaml = this.getWagoYaml();
        yaml.nodes[id] = obj.nodes[id];

        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(yaml, null, "\t"));

        //Adding Controller to corresponding controllers/controller[id].yaml file
        fs.cpSync(`${context.extensionPath}/res/template/controller/controller1.yaml`, `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`);
        }

    /**
     * Removes a controller configuration by its ID.
     *
     * This method performs the following actions:
     * 1. Reads the `wago.yaml` file and removes the controller entry with the specified ID.
     * 2. Writes the updated `wago.yaml` file back to the filesystem.
     * 3. Deletes the corresponding controller configuration file from the `controllers` directory.
     *
     * @param id - The ID of the controller to be removed.
     */
    public static removeController(id: number) {
        //remove from wago.yaml
        let yaml = this.getWagoYaml();
        delete yaml.nodes[id];
        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(yaml, null, "\t"));

        //remove Controller configuration file
        let controllerPath = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`;
        if(fs.existsSync(controllerPath)) fs.unlinkSync(controllerPath);
    }
    
    /**
     * Finds the next available ID for a controller in the Wago YAML configuration.
     *
     * This method reads the Wago YAML configuration and iterates through the existing
     * controller IDs to find the next available ID that is not already in use.
     *
     * @returns {number} The next available controller ID.
     */
    private static findNextID(): number {
        let yaml = this.getWagoYaml();
        let id = 1;
        while (yaml.nodes[id] != undefined) {
            id++;
        }
        return id;
    }
}
/**
 * Enum representing available settings for the wago.yaml.
 * Wago.yaml-half of the split "setting" from editSettings.ts
 * 
 * @enum {string}
 */
export enum wagoSettings {
    displayname = 'displayname',
    description = 'description',
    engine = 'engine',
    src = 'src',
    imageVersion = 'imageVersion'
}
/**
 * Enum representing available settings for the controller.yaml.
 * Controller-half of the split "setting" from editSettings.ts
 * 
 * @enum {string}
 */
export enum controllerSettings {
    connection = 'connection',
    ip = 'ip',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate'
}
//===================================================================================
// Upload Functionality
//===================================================================================

const uploadPath = "/home/user/python_bootapplication/";
let connectionManager = ConnectionManager.instance;

export class UploadFunctionality {

    /**
     * This Method uploads the corresponding files to the WAGO Controller.
     * 
     * @param id The id of the used controller
     */

    public async uploadFile(id: number) {

        let controller = YamlCommands.getController(id);
        let src = controller?.src;
        let path = `${vscode.workspace.workspaceFolders![0].uri.fsPath}\\${src}`;

        if (!fs.existsSync(`${path}/main.py`)) { 
            vscode.window.showErrorMessage("The selected Folder does not exist or does not contain a main.py.");
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
			title: "Upload Progress",
			cancellable: false
        }, async (progress, token) => {

            console.debug("Deactivating CodeSys3...");
            await this.deactivateCodeSys3(id);
            progress.report({ increment: 10, message: "Deactivated Codesys" });

            console.debug("Comparing Folders...");
            if(await this.compareFolders(id, path)) {
                vscode.window.showInformationMessage(`The files on ${controller?.displayname} are already up to date.`);
                return;
            }
            progress.report({ increment: 10, message: "Compared Folders" });

            console.debug("Activating Docker...");
            await connectionManager.executeCommand(id, '/etc/config-tools/config_docker activate');
            progress.report({ increment: 15, message: "Activated Docker" });

            console.debug("Updating Container...");
            this.updateContainer(id);
            progress.report({ increment: 20, message: "Updated Docker Container" });

            console.debug("Uploading Files...");
            await connectionManager.upload(id, path, uploadPath).then(() => {
                vscode.window.showInformationMessage(`The files on ${controller?.displayname} have been updated.`);
            }).catch((err) => {
                console.error(`Error uploading files: ${err}`);
                vscode.window.showErrorMessage("An error occurred while uploading the files.");
            });
            progress.report({ increment: 30, message: "Uploaded Files" });

            console.debug("Starting Python Runtime...");
            await connectionManager.executeCommand(id, "docker exec -d pythonRuntime python3 /lib/runtimeCC.py"); 
            progress.report({ increment: 15, message: "Starting Script" });

            return Promise.resolve(true);
        });

           
    }

    /**
     * This method is used to compare the contents of a folder on the WAGO Controller with the local folder, 
     * using Hashes to compare the contents.
     * 
     * @param id The id of the used controller
     * @param localPath The Path to the local folder with the python program
     * @returns Returns true, if folder contents are equivalent, false if not
     */
    
    private async compareFolders(id:number, localPath: string): Promise<Boolean> {
        try {
            // Get Array of remote Hashes
            console.log("Getting remote Hashes...");
            let remoteHashes = await connectionManager.executeCommand(id, `find ${uploadPath} -type f -exec md5sum {} +`);
            let remoteHash = this.createFolderHash(remoteHashes);
            
            //Get Array of local Hashes
            console.log("Getting local Hashes...");
            let localHashes = await this.getLocalHashes(localPath);
            let localHash = this.createFolderHash(localHashes);

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
            let localHashes = "";

            //For Each File from Path in localFiles Array create Hash and add to localHashes
            for (let file of localFiles) {
                let fileContent = fs.readFileSync(file, 'utf8');
                let hash = crypto.createHash('md5')
                    .update(fileContent)
                    .digest('hex');
                if (localHashes.length == 0) {
                    localHashes = (`${localHashes}${hash}  ${file}`);
                } else {
                    localHashes = (`${localHashes}\n${hash}  ${file}`);
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
            let read = fs.readdirSync(dirPath, { recursive:true });
            let dirFiles = read.map(String);
            
            for (const file of dirFiles) {
                const fullPath = path.join(dirPath, file);
                let stat = fs.statSync(fullPath);
                fs.stat(fullPath, (err, stats) => {
                    stat = stats;
                });
                if (stat.isFile()) {
                    files.push(fullPath);
                }
            }

            return files;

        } catch (error) {
            console.error('Error getting files in directory:', error);
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
                .filter((val, index) => {
                    return index % 2 === 0;
                })
                .sort((a, b) => a.localeCompare(b))
                .toString()
                .replaceAll(',','');

            let hash = crypto
                .createHash('md5')
                .update(hashes)
                .digest('hex');
            
            return hash;
    }

    private async deactivateCodeSys3(id: number) {
        await connectionManager.executeCommand(id, "kill $(pidof codesys3)");
        await connectionManager.executeCommand(id, "/etc/config-tools/config_runtime runtime-version=0")
            .then(() => {
                
                console.log("CodeSys3 deactivated.");
            })
            .catch((err) => {
                console.error(`Error deactivating CodeSys3: ${err}`);
            });
    }

    /**
     * This Method is used to update the docker-container on the WAGO Controller
     * 
     * The development of this method is planned for a later date due to time registrations
     * 
     * @param id The id of the used controller
     */
    private async updateContainer(id: number) {
          
        let imageName = "cc100_python";

        // Cancel if Image Version is specifically chosen
        if (YamlCommands.getController(id)?.imageVersion !== 'latest') {
            return;
        }
        
        console.log("Comparing Versions...");
        // Check if there is a new version
        // => Get Newest Tag of the image
        let newestVersion: number = 1;

        // Get current version on controller
        let conImageVersion : number = 1;

        if ( newestVersion == conImageVersion ) {
            return;
        }

        let conName = YamlCommands.getController(id)?.displayname;
        let autoupdate = YamlCommands.getControllerSettings(id).autoupdate; 
        if( autoupdate === 'off') {
            await vscode.window.showInformationMessage(`Update Container on ${conName}?`, 'Yes', 'No').then((value) => {
                if(value === 'No') return;
            });
        }

        // Stop current container
        console.log("Stopping Container...");
        await connectionManager.executeCommand(id, "docker exec pythonRuntime killall -15 python3");

        //remove all images and containers
        console.log("Removing Images and Containers...");
        await connectionManager.executeCommand(id, "docker rm pythonRuntime");
        await connectionManager.executeCommand(id, `docker rmi -f ${imageName}`);

        // Download and Upload new Image
        console.log("Downloading new Image...");
        const stream = fs.createWriteStream(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/image.tar`);
        const { body } = await fetch('https://svgithub01001.wago.local/education/vscode-docker-engines/raw/refs/heads/CC100_v0.2/cc100_python.tar');
        if (!body) {
            vscode.window.showErrorMessage("Error downloading image.");
            return;
        }
        await finished(Readable.fromWeb(body).pipe(stream));

        await connectionManager.upload(id, `${vscode.workspace.workspaceFolders![0].uri.fsPath}/image.tar`, "/home/");

        // Load new Image
        console.log("Loading new Image...");
        await connectionManager.executeCommand(id, `docker load -i /home/image.tar`);
        await connectionManager.executeCommand(id, `rm /home/image.tar`);
        await connectionManager.executeScript(id, `../../../res/dockerCommand.sh`);
    }
}