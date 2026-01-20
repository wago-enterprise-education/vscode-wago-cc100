import * as vscode from 'vscode';
import * as fs from 'fs';
import { ControllerProvider, Controller, ControllerItem } from './view';
import { Manager } from '../extensionCore/manager';
import { ConnectionManager } from './connectionManager';
import { extensionContext } from '../extension';
import { verifyProject } from './versionDetection';
import {
    FOLDER_REGEX,
    DEBUGGER_SETTINGS,
    UPLOAD_PATH,
} from '../shared/constants';
import { YamlCommands } from '../shared/yamlCommands';

const { MAX_RETRIES, RETRY_DELAY } = DEBUGGER_SETTINGS;

/**
 * Central command registration class for the WAGO CC100 extension.
 * This class handles the creation and registration of all VS Code commands
 * available in the extension, including project management, controller operations,
 * and debugging functionality.
 */
export class Command {
    /**
     * Creates and registers all extension commands with VS Code.
     * This method is called during extension activation to make commands available.
     *
     * Commands are organized into categories:
     * - Project management (create, open, initialize)
     * - Controller operations (add, upload, reset, configure)
     * - View management (refresh)
     * - Debugging (Python remote debugging)
     */
    public static createCommands() {
        const commands = [];

        // === PROJECT MANAGEMENT COMMANDS ===

        /**
         * Command: Create new WAGO project
         * Creates a new project directory with template files and opens it in VS Code.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.create-project',
                async () => {
                    // Get project name with validation
                    const projectName = await vscode.window.showInputBox({
                        prompt: 'Enter the name of the project',
                        title: 'Create Project',
                        validateInput: (value: string) => {
                            if (!RegExp(FOLDER_REGEX).test(value)) {
                                return 'Invalid project name';
                            }
                            return null;
                        },
                    });

                    if (!projectName) return;

                    // Let user select destination folder
                    await vscode.window
                        .showOpenDialog({
                            canSelectFiles: false,
                            canSelectFolders: true,
                            canSelectMany: false,
                            openLabel: 'Select Project Destination',
                        })
                        .then(async (uri) => {
                            if (uri && projectName) {
                                try {
                                    // Create project directory and copy template files
                                    fs.mkdirSync(
                                        `${uri[0].fsPath}/${projectName}`
                                    );
                                    fs.cpSync(
                                        `${extensionContext.extensionPath}/res/template`,
                                        `${uri[0].fsPath}/${projectName}`,
                                        { recursive: true }
                                    );

                                    // Open project in new window if workspace is already open
                                    let newWindow = false;
                                    if (
                                        vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders
                                            .length > 0
                                    ) {
                                        newWindow = true;
                                    }
                                    await vscode.commands.executeCommand(
                                        'vscode.openFolder',
                                        vscode.Uri.file(
                                            `${uri[0].fsPath}/${projectName}`
                                        ),
                                        {
                                            forceNewWindow: newWindow,
                                        }
                                    );
                                } catch (error: any) {
                                    vscode.window.showErrorMessage(
                                        'Project already exists'
                                    );
                                }
                            }
                        });
                }
            )
        );

        /**
         * Command: Open existing WAGO project
         * Allows user to browse and open an existing project folder.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.open-project',
                async () => {
                    await vscode.window
                        .showOpenDialog({
                            canSelectFiles: false,
                            canSelectFolders: true,
                            canSelectMany: false,
                            openLabel: 'Select Project Folder',
                        })
                        .then(async (uri) => {
                            if (!uri) return;
                            // Open in new window if workspace is already open
                            let newWindow = false;
                            if (vscode.workspace.workspaceFolders) {
                                newWindow = true;
                            }
                            await vscode.commands.executeCommand(
                                'vscode.openFolder',
                                vscode.Uri.file(uri[0].fsPath),
                                {
                                    forceNewWindow: newWindow,
                                }
                            );
                        });
                }
            )
        );

        /**
         * Command: Initialize current folder as WAGO project
         * Copies template files to the current workspace without overwriting existing files.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.init-project',
                async () => {
                    fs.cpSync(
                        `${extensionContext.extensionPath}/res/template`,
                        `${vscode.workspace.workspaceFolders![0].uri.fsPath}`,
                        { recursive: true, force: false }
                    );
                    await verifyProject();
                    vscode.window.showInformationMessage('Project initialized');
                }
            )
        );

        // === CONTROLLER MANAGEMENT COMMANDS ===

        /**
         * Command: Add new controller to project
         * Available only in V02 projects that support multiple controllers.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.add-controller',
                async () => {
                    Manager.getInstance().addController();
                }
            )
        );

        /**
         * Command: Upload project to specific controller
         * Uploads the current project's source code to the selected controller.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.upload',
                async (controller: Controller | undefined) => {
                    Manager.getInstance().upload(controller);
                }
            )
        );

        /**
         * Command: Upload project to all controllers
         * Available only in V02 projects, uploads to all configured controllers.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.upload-all',
                async () => {
                    Manager.getInstance().uploadAll();
                }
            )
        );

        /**
         * Command: Edit controller settings
         * Opens dialogs to modify controller configuration (IP, port, credentials, etc.)
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.edit-setting',
                async (controller: ControllerItem | undefined) => {
                    Manager.getInstance().editSettings(controller);
                }
            )
        );

        /**
         * Command: Configure controller
         * Opens controller-specific configuration options.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.configure-controller',
                async (controller: Controller | undefined) => {
                    Manager.getInstance().configureController(controller);
                }
            )
        );

        // === CONTEXT MENU COMMANDS ===
        // These commands appear in right-click context menus on controllers

        /**
         * Command: Rename controller
         * Allows changing the display name of a controller in V02 projects.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.rename-controller',
                async (controller: Controller | undefined) => {
                    Manager.getInstance().renameController(controller);
                }
            )
        );

        /**
         * Command: Remove controller from project
         * Removes controller configuration from the project (does not affect the physical device).
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.remove-controller',
                async (
                    controller: Controller | undefined,
                    showConfirmation = true
                ) => {
                    Manager.getInstance().removeController(
                        controller,
                        showConfirmation
                    );
                }
            )
        );

        /**
         * Command: Reset controller
         * Clears the controller's file system and stops running processes.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.reset-controller',
                async (controller) => {
                    Manager.getInstance().resetController(controller);
                }
            )
        );

        /**
         * Command: Reset and remove controller
         * Combination command that resets the controller then removes it from the project.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.remove-reset-controller',
                async (controller: Controller | undefined) => {
                    Manager.getInstance().removeReset(controller);
                }
            )
        );

        // === VIEW MANAGEMENT ===

        /**
         * Command: Refresh controller view
         * Forces a refresh of the controller tree view to update connection status.
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.refresh-view',
                async () => {
                    ControllerProvider.instance.refresh();
                }
            )
        );

        // === DEBUGGING COMMAND ===

        /**
         * Command: Start Python debugging session
         * Sets up remote debugging with the CC100 controller using debugpy.
         *
         * This complex command:
         * 1. Validates controller connection and permissions
         * 2. Enables SSH port forwarding if needed
         * 3. Starts Python debugger on the controller
         * 4. Creates local port forwarding tunnel
         * 5. Launches VS Code debugging session
         */
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.debug',
                async function (element: Controller | undefined) {
                    // VS Code debugging configuration for remote Python debugging
                    const config = {
                        name: 'Python: attach to cc100',
                        type: 'python',
                        request: 'attach',
                        justMyCode: false, // Allow debugging external libraries
                        connect: {
                            host: 'localhost', // Connect via SSH tunnel
                            port: 8765,
                        },
                        pathMappings: [
                            {
                                localRoot: '${fileDirname}',
                                remoteRoot: UPLOAD_PATH,
                            },
                        ],
                    };

                    if(!element) {
                        element = await vscode.window.showQuickPick(
                            YamlCommands.getControllers().map((controller) => ({
                                controllerId: controller.id,
                                label: controller.displayname,
                                description: controller.description,
                                online: true,
                            })),
                            {
                                title: 'Debug Controller',
                                canPickMany: false,
                            }
                        )
                    }

                    if (!element) {
                        vscode.window.showErrorMessage(
                            'No controller selected'
                        );
                        return;
                    }

                    await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: 'Python Debugging',
                            cancellable: false,
                        },
                        async (progress) => {
                            // Step 1: Check Dropbear SSH server permissions
                            progress.report({
                                increment: 0,
                                message:
                                    'Checking if port forwarding is enabled...',
                            });

                            const filePermission =
                                await ConnectionManager.instance.executeCommand(
                                    element.controllerId,
                                    'cat /etc/dropbear/dropbear.conf'
                                );

                            if (filePermission === '') {
                                vscode.window.showErrorMessage(
                                    'Dropbear permission denied'
                                );
                                progress.report({
                                    increment: 100,
                                    message: 'Debugging session failed',
                                });
                                return new Promise<void>((resolve) => {
                                    setTimeout(() => {
                                        resolve();
                                    }, 4000);
                                });
                            }

                            // Step 2: Enable port forwarding if not already enabled
                            const pfEnabled =
                                await ConnectionManager.instance.executeCommand(
                                    element.controllerId,
                                    "cat /etc/dropbear/dropbear.conf | grep LOCAL_PORT_FORWARDING | cut -d'=' -f2"
                                );

                            if (pfEnabled !== 'true') {
                                progress.report({
                                    increment: 10,
                                    message:
                                        'Port forwarding is not enabled. Enabling...',
                                });

                                await ConnectionManager.instance.executeCommand(
                                    element.controllerId,
                                    `
                        grep -q "LOCAL_PORT_FORWARDING=false" /etc/dropbear/dropbear.conf &&
                        sed -i 's/LOCAL_PORT_FORWARDING=false/LOCAL_PORT_FORWARDING=true/' /etc/dropbear/dropbear.conf ||
                        grep -q "LOCAL_PORT_FORWARDING=true" /etc/dropbear/dropbear.conf ||
                        echo "LOCAL_PORT_FORWARDING=true" >> /etc/dropbear/dropbear.conf
                    `
                                );

                                // Restart Dropbear SSH server to apply changes
                                await ConnectionManager.instance
                                    .executeCommand(
                                        element.controllerId,
                                        '/etc/init.d/dropbear restart'
                                    )
                                    .catch();
                            } else {
                                progress.report({ increment: 10 });
                            }

                            // Step 3: Wait for controller reconnection after potential restart
                            progress.report({
                                increment: 10,
                                message: 'Waiting for controller to connect...',
                            });

                            const connection =
                                await ConnectionManager.instance.getConnection(
                                    element.controllerId
                                );

                            let isConnected = false;
                            for (let i = 0; i < MAX_RETRIES; i++) {
                                const out =
                                    await connection.executeCommand(
                                        'echo ping'
                                    );
                                if (out == 'ping') {
                                    isConnected = true;
                                    break;
                                }
                                await new Promise((resolve) =>
                                    setTimeout(resolve, RETRY_DELAY)
                                );
                            }

                            if (!isConnected) {
                                connection.disconnect();
                                vscode.window.showErrorMessage(
                                    'Could not connect to controller. Please check your connection and try again.'
                                );
                                progress.report({
                                    increment: 100,
                                    message: 'Debugging session failed',
                                });
                                return new Promise<void>((resolve) => {
                                    setTimeout(() => {
                                        resolve();
                                    }, 4000);
                                });
                            }

                            // Step 4: Check Docker permissions and stop existing processes
                            progress.report({
                                increment: 10,
                                message: 'Stopping old process...',
                            });

                            const dockerPermission =
                                await connection.executeCommand(
                                    'docker images'
                                );

                            if (dockerPermission === '') {
                                connection.disconnect();
                                vscode.window.showErrorMessage(
                                    'Docker permission denied'
                                );
                                progress.report({
                                    increment: 100,
                                    message: 'Debugging session failed',
                                });
                                return new Promise<void>((resolve) => {
                                    setTimeout(() => {
                                        resolve();
                                    }, 4000);
                                });
                            }

                            // Stop any running Python processes
                            await connection.executeCommand(
                                'docker exec pythonRuntime killall -15 python3'
                            );

                            // Step 5: Start new Python process with debugpy
                            progress.report({
                                increment: 10,
                                message: 'Starting new process with debugpy...',
                            });

                            await connection.executeCommand(
                                'docker exec -d pythonRuntime python3 -Xfrozen_modules=off -m debugpy --listen 0.0.0.0:5678 --wait-for-client main.py'
                            );

                            // Step 6: Create SSH port forwarding tunnel
                            progress.report({
                                increment: 20,
                                message: 'Creating port forwarding...',
                            });

                            await connection.forwardPort(8765, 5678);

                            progress.report({
                                increment: 20,
                                message:
                                    'Waiting for the debugger to connect...',
                            });

                            // Step 7: Set up debugging session cleanup
                            vscode.debug.onDidTerminateDebugSession(
                                async (session) => {
                                    if (
                                        session.configuration.name ===
                                        config.name
                                    ) {
                                        connection.disconnect();
                                        vscode.window.showInformationMessage(
                                            'Debugging session stopped'
                                        );
                                    }
                                }
                            );

                            // Step 8: Start VS Code debugging session with retry logic
                            let success = false;
                            for (let i = 1; i <= MAX_RETRIES; i++) {
                                success = await vscode.debug.startDebugging(
                                    undefined,
                                    config
                                );
                                if (success) break;
                                if (i >= MAX_RETRIES) break;
                                await new Promise((resolve) =>
                                    setTimeout(resolve, RETRY_DELAY)
                                );
                            }

                            if (success) {
                                progress.report({
                                    increment: 100,
                                    message: 'Debugging session started',
                                });
                            } else {
                                connection.disconnect();
                                progress.report({
                                    increment: 100,
                                    message: 'Debugging session failed',
                                });
                            }

                            return new Promise<void>((resolve) => {
                                setTimeout(() => {
                                    resolve();
                                }, 2000);
                            });
                        }
                    );
                }
            )
        );

        // Register all commands with VS Code's extension context for proper cleanup
        extensionContext.subscriptions.push(...commands);
    }
}
