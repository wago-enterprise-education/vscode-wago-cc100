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
import { Setting, SettingAdapter, SettingsJson } from '../../shared/types';
import { UPLOAD_PATH } from '../../shared/constants';

/**
 * V01 Project Version Implementation
 * 
 * This file contains all the implementations for V01 (legacy) WAGO projects.
 * V01 projects are characterized by:
 * - Single controller support only
 * - settings.json configuration file
 * - Simplified project structure
 * - Limited network configuration options
 * 
 * All classes in this file implement interfaces from projectInterface.ts
 * to ensure compatibility with the factory pattern used by the extension.
 */

/**
 * Engine detection for V01 projects.
 * V01 projects only support CC100 controllers.
 */
export class GetEngine implements Interface.GetEngineInterface {
    /**
     * Returns the engine type for V01 projects (always CC100).
     * @param _controllerId - Controller ID (unused in V01 as only one controller is supported)
     * @returns Always returns 'CC100' for V01 projects
     */
    getEngine(_controllerId: number): string {
        return 'CC100';
    }
}

/**
 * Handles project upload functionality for V01 projects.
 * Uploads Python code and resources to the single supported controller.
 */
export class UploadController implements Interface.UploadInterface {
    /**
     * Uploads the current project to the specified controller.
     * In V01, there's only one controller (ID 0), so the controller parameter
     * is mainly for interface compliance.
     * 
     * @param controller - Target controller (defaults to controller 0 if undefined)
     */
    async uploadController(controller: Controller | undefined) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }

        // Use default controller if none specified (V01 limitation)
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
            const response = await vscode.window
                .showWarningMessage(`Reset ${controller.label}?`, 'Yes', 'No');
            if (response !== 'Yes') {
                return '';
            }
            controllerId = controller.controllerId;
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
                        `rm -rf ${UPLOAD_PATH}*`
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
                (await vscode.window.showQuickPick(Object.values(Setting), {
                    title: 'Choose Setting',
                    canPickMany: false,
                })) || '';
            if (!settingToEdit) return;

            await EditSettingsFunctionality.editSetting(
                0,
                SettingAdapter[settingToEdit as keyof typeof SettingAdapter]
            );
        } else {
            await EditSettingsFunctionality.editSetting(
                0,
                SettingAdapter[
                    controller.setting as keyof typeof SettingAdapter
                ]
            );
        }

        ControllerProvider.instance.refresh();
    }
}
/**
 * Establishes SSH connections for V01 projects.
 * V01 projects support only a single controller with configuration stored in settings.json.
 */
export class EstablishConnections
    implements Interface.EstablishConnectionsInterface
{
    /**
     * Establishes connection to the single controller defined in settings.json.
     * Reads controller configuration and adds it to the connection manager.
     */
    async establishConnections() {
        const controller = JsonCommands.getController();
        ConnectionManager.instance.addController(
            0,  // V01 always uses controller ID 0
            `${controller.ip}:${controller.port}`,
            controller.user
        );
    }
}

/**
 * Provides tree view data for V01 projects.
 * Manages the hierarchical display of the single controller and its settings.
 */
export class ViewChildren implements Interface.ViewChildrenInterface {
    /**
     * Retrieves child elements for the tree view based on the current element.
     * 
     * For V01 projects:
     * - Root level: Returns the single controller
     * - Controller level: Returns controller settings (connection, IP, port, user, autoupdate)
     * 
     * @param element - The parent element (undefined for root, Controller for settings)
     * @returns Promise resolving to array of controllers or controller settings
     */
    async getChildren(
        element?: Controller | ControllerItem | undefined
    ): Promise<vscode.ProviderResult<Controller[] | ControllerItem[]>> {
        let controller = JsonCommands.getController();
        if (!controller) return Promise.resolve([]);

        if (!element) {
            // Root level: return the single controller with online status
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
                // Controller level: return all available settings
                const settingArray = [];

                // Always show connection type
                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        Setting.connection,
                        controller.connection
                    )
                );
                
                // Show IP only for ethernet connections
                if (controller.connection === 'ethernet') {
                    settingArray.push(
                        new ControllerItem(
                            element.controllerId,
                            Setting.ip,
                            controller.ip
                        )
                    );
                }
                
                // Always show port, user, and autoupdate settings
                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        Setting.port,
                        controller.port
                    )
                );
                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        Setting.user,
                        controller.user
                    )
                );
                settingArray.push(
                    new ControllerItem(
                        element.controllerId,
                        Setting.autoupdate,
                        controller.autoupdate
                    )
                );

                return Promise.resolve(settingArray);
            }
        }
        return Promise.resolve([]);
    }
}
/**
 * Utility class for managing settings.json operations in V01 projects.
 * Provides methods to read and write controller configuration data.
 */
export class JsonCommands {
    /**
     * Reads and parses the settings.json file from the workspace root.
     * This file contains all controller configuration for V01 projects.
     * 
     * @returns Parsed JSON object containing controller settings
     * @throws Error if the file cannot be read or parsed
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
     * Updates a specific setting in the settings.json file.
     * 
     * @param attribute - The setting key to update (from SettingsJson enum)
     * @param value - The new value to assign to the setting
     * @throws Error if the file cannot be written
     */
    public static writeJson(attribute: SettingsJson, value: string) {
        let json = this.getSettingsJson();
        json[attribute] = value;
        fs.writeFileSync(
            path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, 'settings.json'),
            JSON.stringify(json, null, '\t')
        );
    }
    
    /**
     * Retrieves the controller configuration from settings.json.
     * Processes the raw settings into a normalized controller object.
     * 
     * @returns Controller configuration object with connection details
     */
    public static getController() {
        const settings = this.getSettingsJson();
        
        // Determine connection type from boolean flags
        let connectionType = '';
        if (settings.ethernet === 'true') connectionType = 'ethernet';
        if (settings.usb_c === 'true') connectionType = 'usb-c';

        return {
            connection: connectionType,
            ip: settings.ip_adress,  // Note: kept original typo for compatibility
            port: settings.port,
            user: settings.user,
            autoupdate: settings.autoupdate,
        };
    }
}

/**
 * Utility class for editing individual controller settings in V01 projects.
 * Provides methods to modify settings.json values through user dialogs.
 */
export class EditSettingsFunctionality {
    /**
     * Opens appropriate dialogs to edit a specific controller setting.
     * Handles different setting types with specialized input methods.
     * 
     * @param _id - Controller ID (unused in V01 as only one controller exists)
     * @param settingToEdit - The name of the setting to edit
     */
    public static async editSetting(_id: number, settingToEdit: string) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
        
        let content;
        switch (settingToEdit) {
            case 'connection':
                // Connection type selection (USB-C or Ethernet)
                let conType =
                    (await vscode.window.showQuickPick(['usb-c', 'ethernet'], {
                        title: 'Connection Type',
                        canPickMany: false,
                    })) || '';
                if (!conType) return;
                
                switch (conType) {
                    case 'usb-c':
                        // Set USB-C connection and default IP
                        JsonCommands.writeJson(SettingsJson.usb_c, 'true');
                        JsonCommands.writeJson(SettingsJson.simulator, 'false');
                        JsonCommands.writeJson(SettingsJson.ethernet, 'false');
                        JsonCommands.writeJson(
                            SettingsJson.ip_adress,
                            '192.168.42.42'  // Default USB-C IP
                        );
                        break;
                    case 'ethernet':
                        // Set Ethernet connection
                        JsonCommands.writeJson(SettingsJson.usb_c, 'false');
                        JsonCommands.writeJson(SettingsJson.simulator, 'false');
                        JsonCommands.writeJson(SettingsJson.ethernet, 'true');
                        break;
                    default:
                        break;
                }
                break;

            case 'ip':
                // IP address input
                content = await this.getInput();
                if (!content) return;
                JsonCommands.writeJson(SettingsJson.ip_adress, content);
                break;
                
            case 'port':
            case 'user':
                // Generic text input for port and user
                content = await this.getInput();
                if (!content) return;
                JsonCommands.writeJson(SettingsJson[settingToEdit], content);
                break;
                
            case 'autoupdate':
                // Autoupdate toggle
                let status =
                    (await vscode.window.showQuickPick(['on', 'off'], {
                        title: 'Autoupdate',
                        canPickMany: false,
                    })) || '';
                if (!status) return;

                JsonCommands.writeJson(SettingsJson[settingToEdit], status);
                break;
                
            default:
                vscode.window.showErrorMessage('Invalid Attribute Type');
                break;
        }
    }

    /**
     * Displays a generic input dialog for setting values.
     * 
     * @returns Promise resolving to user input or empty string if cancelled
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

// Cached connection manager instance for upload operations
let connectionManager = ConnectionManager.instance;

/**
 * Main upload functionality class for V01 projects.
 * Handles file upload, folder comparison, and controller management.
 */
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
            async (progress, _token) => {
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
                    // Kill all python processes
                    await connectionManager.executeCommand(
                        id,
                        'killall python3'
                    );

                    // Create bootapplication
                    progress.report({
                        increment: 10,
                        message: 'Creating Bootapplication...',
                    });
                    connectionManager.executeCommand(
                        id,
                        `echo '#!/bin/sh\npython3 ${UPLOAD_PATH}lib/runtimeCC.py &\nstty -F /dev/ttySTM1 cstopb brkint -icrnl -ixon -opost -isig icanon -iexten -echo' > /etc/init.d/S99_python_runtime`
                    );

                    // Upload Files
                    progress.report({ increment: 20, message: 'Uploading...' });
                    await connectionManager.uploadDirectory(id, srcPath, UPLOAD_PATH);

                    // Execute File
                    progress.report({ increment: 20, message: 'Executing...' });
                    await connectionManager.executeCommand(
                        id,
                        `nohup python3 ${UPLOAD_PATH}lib/runtimeCC.py > /dev/null 2>&1 &`
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
     * Compares local and remote folder contents using MD5 hashes.
     * This optimization prevents unnecessary uploads when files haven't changed.
     * 
     * @param id - Controller ID
     * @param localPath - Path to local source directory
     * @returns Promise resolving to true if folders are identical, false otherwise
     */
    private async compareFolders(
        id: number,
        localPath: string
    ): Promise<Boolean> {
        try {
            // Get MD5 hashes of all remote files
            let remoteHashes = await connectionManager.executeCommand(
                id,
                `find ${UPLOAD_PATH} -type f -exec md5sum {} +`
            );
            let remoteHash = this.createFolderHash(remoteHashes);
            console.debug('Remote Hash: ' + remoteHash);

            // Get MD5 hashes of all local files
            let localHashes = await this.getLocalHashes(localPath);
            let localHash = this.createFolderHash(localHashes);
            console.debug('Local Hash: ' + localHash);

            // Compare composite hashes
            return Promise.resolve(localHash === remoteHash);
        } catch (error) {
            console.error('Error comparing folders:', error);
            return Promise.reject(error);
        }
    }

    /**
     * Creates a composite hash from individual file hashes.
     * Processes hash strings to create a deterministic folder signature.
     * 
     * @param hashes - String containing file hashes from md5sum command
     * @returns MD5 hash of the processed hash collection
     */
    private createFolderHash(hashes: string): string {
        // Process hash string: normalize, extract hashes, sort, and combine
        hashes = hashes
            .replaceAll('\n', '  ')
            .split('  ')
            .filter((_val, index) => {
                return index % 2 === 0;  // Extract only hash values, not file paths
            })
            .sort((a, b) => a.localeCompare(b))  // Sort for deterministic result
            .toString()
            .replaceAll(',', '');

        // Create final hash of the combined hashes
        let hash = crypto.createHash('md5').update(hashes).digest('hex');
        return hash;
    }

    /**
     * Generates MD5 hashes for all files in a local directory.
     * Mimics the output format of the Linux 'find ... -exec md5sum {} +' command.
     * 
     * @param path - Local directory path to process
     * @returns Promise resolving to hash string in md5sum format
     */
    private async getLocalHashes(path: string): Promise<string> {
        try {
            let localFiles = await this.getFilesInDirectory(path);
            let localHashes = '';

            // Generate MD5 hash for each file
            for (let file of localFiles) {
                let fileContent = fs.readFileSync(file, 'utf8');
                let hash = crypto
                    .createHash('md5')
                    .update(fileContent)
                    .digest('hex');
                    
                // Build hash string in md5sum format
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
     * Recursively collects all file paths in a directory.
     * Used to build a comprehensive list for hash comparison.
     * 
     * @param dirPath - Directory to scan recursively
     * @returns Promise resolving to array of absolute file paths
     */
    private async getFilesInDirectory(dirPath: string): Promise<string[]> {
        try {
            let files: string[] = [];
            let read = fs.readdirSync(dirPath, { recursive: true });
            let dirFiles = read.map(String);

            // Filter for files only (exclude directories)
            for (const file of dirFiles) {
                const fullPath = path.join(dirPath, file);
                const stat = fs.statSync(fullPath);
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
     * Deactivates CodeSys3 runtime on the controller.
     * This prevents conflicts with Python applications.
     * 
     * @param id - Controller ID
     */
    private async deactivateCodeSys3(id: number) {
        // Kill CodeSys3 processes
        await connectionManager.executeCommand(id, 'kill $(pidof codesys3)');
        
        // Disable CodeSys3 runtime through configuration tool
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
