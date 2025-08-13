import { ConnectionManager } from '../../extension/connectionManager';
import {
    Controller,
    ControllerItem,
    ControllerProvider,
} from '../../extension/view';
import * as Interface from '../interfaces/projectInterface';
import * as vscode from 'vscode';
import * as fs from 'fs';
import crypto from 'crypto';
import path from 'path';

export class GetEngine implements Interface.GetEngineInterface {
    getEngine(controllerId: number): string {
        return 'CC100';
    }
}

export class UploadController implements Interface.UploadInterface {
    async uploadController(controller: Controller | undefined) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }

        if (!controller) {
            controller = {
                controllerId: 0,
                label: 'Controller',
                online: false,
            };
        }

        await new UploadFunctionality().uploadFile(controller.controllerId);
        return;
    }
}
/**
 * The `ResetController` class implements the `ResetControllerInterface` and provides
 * functionality to reset a controller by executing a series of commands on the target device.
 */
export class ResetController implements Interface.ResetControllerInterface {
    /**
     * Resets the specified controller by executing a series of commands to clean up
     * the environment on the target device. Optionally, a confirmation dialog can be shown
     * before proceeding with the reset.
     *
     * @param controller - The controller object to reset. If undefined, a default controller
     *                     object will be used.
     * @param showConfirmation - A boolean indicating whether to show a confirmation dialog
     *                           before resetting the controller.
     * @returns A promise that resolves to a string indicating the result of the reset operation.
     *          Returns "CC100" if the reset is successful, or an empty string if the reset
     *          is aborted or fails.
     *
     * @throws Will show an error message if no workspace is open or if an error occurs during
     *         the execution of reset commands.
     */
    async reset(controller: Controller | undefined, showConfirmation: boolean) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return '';
        }
        if (!controller) {
            controller = {
                controllerId: 0,
                label: 'Controller',
                online: false,
            };
        }
        let controllerId: number;
        if (showConfirmation) {
            await vscode.window
                .showWarningMessage(`Reset ${controller.label}?`, 'Yes', 'No')
                .then((value) => {
                    if (value === 'Yes') {
                        controllerId = controller.controllerId;
                    } else {
                        return '';
                    }
                });
        } else {
            controllerId = controller.controllerId;
        }
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Reset Controller',
                cancellable: false,
            },
            async (progress, token) => {
                try {
                    progress.report({ message: 'Killing Python...' });
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'killall python3'
                    );
                    progress.report({
                        increment: 10,
                        message: 'Removing Files...',
                    });
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'rm -rf /home/user/python_bootapplication/*'
                    );
                    progress.report({
                        increment: 10,
                        message: 'Removing Python Autostart...',
                    });
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'rm -rf /etc/init.d/S99_python_runtime'
                    );
                    progress.report({ increment: 10 });
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'rm -rf /etc/rc.d/S99_python_runtime'
                    );
                    progress.report({
                        increment: 10,
                        message: 'Killing all tails...',
                    });
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'killall tail'
                    );
                    progress.report({ increment: 10 });
                } catch (error: any) {
                    vscode.window.showErrorMessage(
                        `Error resetting controller: ${error}`
                    );
                }
            }
        );
        return 'CC100';
    }
}
/**
 * Represents the EditSettings class that implements the EditSettingsInterface.
 * This class provides functionality to edit settings in a VS Code workspace.
 */
export class EditSettings implements Interface.EditSettingsInterface {
    /**
     * Edits the settings for a given controller or prompts the user to select a setting to edit.
     *
     * @param controller - The controller item whose settings need to be edited. If undefined, the user will be prompted to select a setting.
     * @returns A promise that resolves when the settings editing process is complete.
     *
     * @remarks
     * - If no workspace is open, an error message is displayed to the user.
     * - If the controller is undefined, the user is prompted to select a setting from a list.
     * - The selected or provided setting is then passed to the `EditSettingsFunctionality.editSetting` method for editing.
     * - After editing, the `ControllerProvider` instance is refreshed.
     */
    async editSettings(controller: ControllerItem | undefined) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
        let settingToEdit: string;
        if (controller === undefined) {
            settingToEdit =
                (await vscode.window.showQuickPick(Object.values(setting), {
                    title: 'Choose Setting',
                    canPickMany: false,
                })) || '';
            if (!settingToEdit) return;

            await EditSettingsFunctionality.editSetting(
                0,
                settingAdapter[settingToEdit as keyof typeof settingAdapter]
            );
        } else {
            await EditSettingsFunctionality.editSetting(
                0,
                settingAdapter[
                    controller.setting as keyof typeof settingAdapter
                ]
            );
        }

        ControllerProvider.instance.refresh();
    }
}
/**
 * Represents a class responsible for establishing connections.
 * Implements the `EstablishConnectionsInterface` from the `Interface` namespace.
 */
export class EstablishConnections
    implements Interface.EstablishConnectionsInterface
{
    /**
     * Establishes connections by retrieving the controller information
     * from `JsonCommands` and adding it to the `ConnectionManager`.
     *
     * @returns A promise that resolves when the connection is successfully established.
     */
    async establishConnections() {
        const controller = JsonCommands.getController();
        ConnectionManager.instance.addController(
            0,
            `${controller.ip}:${controller.port}`,
            controller.user
        );
    }
}
/**
 * Represents a class that provides methods to retrieve child elements
 * for a given controller or controller item.
 */
export class ViewChildren implements Interface.ViewChildrenInterface {
    /**
     * Retrieves the child elements of a given controller or controller item.
     *
     * @param element - The parent element for which to retrieve children.
     *                  It can be a `Controller`, `ControllerItem`, or `undefined`.
     * @returns A promise that resolves to a `vscode.ProviderResult` containing
     *          an array of `Controller` or `ControllerItem` objects, or an empty array
     *          if no children are found.
     *
     * The method performs the following:
     * - If no `element` is provided, it checks the online status of the controller
     *   and returns a new `Controller` instance.
     * - If the `element` is a `Controller`, it retrieves and returns an array of
     *   `ControllerItem` objects representing the controller's settings.
     * - If the `element` is neither provided nor a `Controller`, it resolves to an empty array.
     *
     * The method also handles connection updates and pings to determine the online
     * status of the controller.
     */
    async getChildren(
        element?: Controller | ControllerItem | undefined
    ): Promise<vscode.ProviderResult<Controller[] | ControllerItem[]>> {
        let controller = JsonCommands.getController();
        if (!controller) return Promise.resolve([]);

        if (!element) {
            let online = false;

            try {
                await ConnectionManager.instance.updateController(
                    0,
                    `${controller.ip}:${controller.port}`,
                    controller.user
                );
                await ConnectionManager.instance.ping(0);
                online = true;
            } catch (error) {
                console.debug(`Controller is offline. ${error}`);
            }

            return Promise.all([new Controller(0, 'Controller', online)]);
        } else {
            if (element instanceof Controller) {
                const settingArray = [];

                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        setting.connection,
                        controller.connection
                    )
                );
                if (controller.connection === 'ethernet') {
                    settingArray.push(
                        new ControllerItem(
                            element.controllerId,
                            setting.ip,
                            controller.ip
                        )
                    );
                }
                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        setting.port,
                        controller.port
                    )
                );
                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        setting.user,
                        controller.user
                    )
                );
                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        setting.autoupdate,
                        controller.autoupdate
                    )
                );

                return Promise.resolve(settingArray);
            }
        }
        return Promise.resolve([]);
    }
}
export class JsonCommands {
    /**
     * Reads the content of the `settings.json` file located in the workspace folder.
     *
     * @private
     * @returns {object} The content of the `settings.json` file parsed as a JavaScript object.
     * @throws {Error} If the file cannot be read or parsed.
     */
    private static getSettingsJson() {
        return JSON.parse(
            fs.readFileSync(
                path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, 'settings.json'),
                'utf8'
            )
        );
    }
    /**
     * Updates a specific attribute in the `settings.json` file with the provided value.
     *
     * @param {settingsJson} attribute - The key in the `settings.json` file to update.
     * @param {string} value - The new value to assign to the specified attribute.
     * @throws {Error} If the file cannot be written.
     */
    public static writeJson(attribute: settingsJson, value: string) {
        let json = this.getSettingsJson();
        json[attribute] = value;
        fs.writeFileSync(
            path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, 'settings.json'),
            JSON.stringify(json, null, '\t')
        );
    }
    /**
     * Retrieves the controller configuration from the `settings.json` file.
     *
     * @returns {object} An object containing the controller's connection type, IP address, port, user, and autoupdate settings.
     * @throws {Error} If the `settings.json` file cannot be read or parsed.
     */
    public static getController() {
        const settings = this.getSettingsJson();
        let connectionType = '';
        if (settings.ethernet === 'true') connectionType = 'ethernet';
        if (settings.usb_c === 'true') connectionType = 'usb-c';

        return {
            connection: connectionType,
            ip: settings.ip_adress,
            port: settings.port,
            user: settings.user,
            autoupdate: settings.autoupdate,
        };
    }
}
/**
 * Enum representing various settings used in the application.
 * Each setting is associated with a string value that describes its purpose.
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
    autoupdate = 'Autoupdate',
}
/**
 * Enum representing the various settings adapters used in the application.
 * Each adapter corresponds to a specific configuration property.
 *
 * @enum {string}
 */
export enum settingAdapter {
    Name = 'displayname',
    Description = 'description',
    Engine = 'engine',
    Source = 'src',
    'Docker Image Version' = 'imageVersion',
    Connection = 'connection',
    IP = 'ip',
    Port = 'port',
    User = 'user',
    Autoupdate = 'autoupdate',
}
/**
 * Enum representing the keys used in the settings JSON configuration.
 * Each key corresponds to a specific configuration option.
 */
export enum settingsJson {
    connection = 'connection',
    usb_c = 'usb_c',
    simulator = 'simulator',
    ethernet = 'ethernet',
    ip_adress = 'ip_adress',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate',
}
export class EditSettingsFunctionality {
    /**
     * Edits a specific setting in the application's configuration.
     *
     * @param id - The identifier for the setting to be edited (currently unused in the function).
     * @param settingToEdit - The name of the setting to edit. Supported values are:
     *   - `"connection"`: Allows the user to select a connection type (`usb-c` or `ethernet`).
     *   - `"ip"`: Prompts the user to input an IP address.
     *   - `"port"`: Prompts the user to input a port value.
     *   - `"user"`: Prompts the user to input a username.
     *   - `"autoupdate"`: Allows the user to toggle the autoupdate setting (`on` or `off`).
     *
     * The function interacts with the user through VS Code's UI components (e.g., `showQuickPick` and `showInputBox`)
     * to gather input for the specified setting. It then updates the corresponding JSON configuration using
     * `JsonCommands.writeJson`.
     *
     * If the workspace is not open, an error message is displayed, and the function exits early.
     *
     * @returns A `Promise<void>` that resolves when the operation is complete.
     */
    public static async editSetting(id: number, settingToEdit: string) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
        let content;
        switch (settingToEdit) {
            case 'connection':
                let conType =
                    (await vscode.window.showQuickPick(['usb-c', 'ethernet'], {
                        title: 'Connection Type',
                        canPickMany: false,
                    })) || '';
                if (!conType) return;
                switch (conType) {
                    case 'usb-c':
                        JsonCommands.writeJson(settingsJson.usb_c, 'true');
                        JsonCommands.writeJson(settingsJson.simulator, 'false');
                        JsonCommands.writeJson(settingsJson.ethernet, 'false');
                        JsonCommands.writeJson(
                            settingsJson.ip_adress,
                            '192.168.42.42'
                        );
                        break;
                    case 'ethernet':
                        JsonCommands.writeJson(settingsJson.usb_c, 'false');
                        JsonCommands.writeJson(settingsJson.simulator, 'false');
                        JsonCommands.writeJson(settingsJson.ethernet, 'true');
                        break;
                    default:
                        break;
                }
                break;

            case 'ip':
                content = await this.getInput();
                if (!content) return;
                JsonCommands.writeJson(settingsJson.ip_adress, content);
                break;
            case 'port':
            case 'user':
                content = await this.getInput();
                if (!content) return;
                JsonCommands.writeJson(settingsJson[settingToEdit], content);
                break;
            case 'autoupdate':
                let status =
                    (await vscode.window.showQuickPick(['on', 'off'], {
                        title: 'Autoupdate',
                        canPickMany: false,
                    })) || '';
                if (!status) return;

                JsonCommands.writeJson(settingsJson[settingToEdit], status);
                break;
            default:
                vscode.window.showErrorMessage('Invalid Attribute Type');
                break;
        }
    }

    /**
     * Prompts the user with an input box to enter a value for a setting.
     *
     * @returns A promise that resolves to the string entered by the user.
     *          If the user cancels the input box, an empty string is returned.
     */
    private static async getInput(): Promise<string> {
        let input =
            (await vscode.window.showInputBox({
                prompt: 'Enter the value the Setting should be set to',
                title: 'Set Setting Value',
            })) || '';
        return input;
    }
}
//===================================================================================
// Upload Functionality
//===================================================================================

const uploadPath = '/home/user/python_bootapplication/';
let connectionManager = ConnectionManager.instance;

export class UploadFunctionality {
    /**
     * Uploads project files to the controller with the specified ID.
     *
     * This method performs several actions:
     * 1. Verifies that a main.py file exists in the project source directory
     * 2. Deactivates CodeSys3 on the target controller
     * 3. Compares local and remote folders to check if an update is needed
     * 4. Uploads the files if changes are detected
     * 5. Sets up the boot application and starts the Python runtime
     *
     * @param id - The numeric identifier of the target controller
     * @throws Will show an error message if the main.py file is missing
     * @throws Will show an error message if the file upload fails
     * @returns A Promise that resolves when the upload is complete or when an early return occurs
     */
    public async uploadFile(id: number) {
        let srcPath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, "src");

        if (!fs.existsSync(path.join(srcPath, "main.py"))) {
            vscode.window.showErrorMessage(
                'The selected Folder does not exist or does not contain a main.py.'
            );
            return;
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Reset Controller',
                cancellable: false,
            },
            async (progress, token) => {
                progress.report({ message: 'Deactivating CodeSys3...' });
                await this.deactivateCodeSys3(id);
                progress.report({
                    increment: 20,
                    message: 'Comparing Folders...',
                });
                if (await this.compareFolders(id, srcPath)) {
                    vscode.window.showInformationMessage(
                        `The files on your Controller are already up to date.`
                    );
                    return;
                }
                progress.report({
                    increment: 20,
                    message: 'Killing all Python Scripts...',
                });
                try {
                    //kill all python processes
                    await connectionManager.executeCommand(
                        id,
                        'killall python3'
                    );
                    progress.report({
                        increment: 10,
                        message: 'Creating Bootapplication...',
                    });
                    //Create bootapplication
                    connectionManager.executeCommand(
                        id,
                        "echo '#!/bin/sh\npython3 /home/user/python_bootapplication/lib/runtimeCC.py &\nstty -F /dev/ttySTM1 cstopb brkint -icrnl -ixon -opost -isig icanon -iexten -echo' > /etc/init.d/S99_python_runtime"
                    );
                    progress.report({ increment: 20, message: 'Uploading...' });
                    //Upload Files
                    await connectionManager.uploadDirectory(id, srcPath, uploadPath);
                    progress.report({ increment: 20, message: 'Executing...' });
                    //Execute File
                    await connectionManager.executeCommand(
                        id,
                        `nohup python3 /home/user/python_bootapplication/lib/runtimeCC.py > /dev/null 2>&1 &`
                    );
                    progress.report({
                        increment: 10,
                        message:
                            'The files on your Controller have been updated.',
                    });

                    return new Promise<void>((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, 2000);
                    });
                } catch (err) {
                    console.error(`Error uploading files: ${err}`);
                    vscode.window.showErrorMessage(
                        'An error occurred while uploading the files.'
                    );
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
                `find ${uploadPath} -type f -exec md5sum {} +`
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
     * Generates a hash for a given string of folder hashes.
     *
     * The method processes the input string by:
     * - Replacing all newline characters with double spaces.
     * - Splitting the string into an array using double spaces as the delimiter.
     * - Filtering the array to include only elements at even indices.
     * - Sorting the resulting array in lexicographical order.
     * - Joining the sorted array into a single string without commas.
     *
     * Finally, the processed string is hashed using the MD5 algorithm, and the resulting
     * hexadecimal hash is returned.
     *
     * @param hashes - A string containing folder hashes to be processed and hashed.
     * @returns The MD5 hash of the processed folder hashes.
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
            .replaceAll(',', '');

        let hash = crypto.createHash('md5').update(hashes).digest('hex');

        return hash;
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
}
