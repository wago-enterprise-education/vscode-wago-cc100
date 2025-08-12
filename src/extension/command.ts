import * as vscode from 'vscode';
import * as fs from 'fs';
import { ControllerProvider, Controller, ControllerItem } from './view';
import { Manager } from '../extensionCore/manager';
import { ConnectionManager } from './connectionManager';
import { extensionContext } from '../extension';
import { verifyProject } from './versionDetection';

const MAX_RETRIES = 10; // Maximum number of retries for the debugger connection
const RETRY_DELAY = 2000; // Delay between retries in milliseconds

export class Command {
    public static createCommands() {
        const commands = [];

        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.create-project',
                async () => {
                    Manager.getInstance().createProject();
                }
            )
        );

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

        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.add-controller',
                async () => {
                    Manager.getInstance().addController();
                }
            )
        );

        //Debugger Command
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.refresh-view',
                async () => {
                    ControllerProvider.instance.refresh();
                }
            )
        );

        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.debug',
                async function (element: Controller | undefined) {
                    //Debugger configurations
                    const config = {
                        name: 'Python: attach to cc100',
                        type: 'python', //Python debug type
                        request: 'attach', //Attach Mode
                        justMyCode: false, //Debuggen von exterenen libraries
                        connect: {
                            host: 'localhost', //remote host (local for the ssh tunnel)
                            port: 8765, //Port for the connection
                        },
                        pathMappings: [
                            {
                                localRoot: '${fileDirname}',
                                remoteRoot: '/home/user/python_bootapplication',
                            },
                        ],
                    };

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
                            progress.report({
                                increment: 0,
                                message:
                                    'Checking if port forwarding is enabled...',
                            });

                            const filePermission = await ConnectionManager.instance.executeCommand(
                                element.controllerId,
                                "cat /etc/dropbear/dropbear.conf"
                            );

                            if(filePermission === ''){
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

                                await ConnectionManager.instance
                                    .executeCommand(
                                        element.controllerId,
                                        '/etc/init.d/dropbear restart'
                                    )
                                    .catch();
                            } else {
                                progress.report({ increment: 10 });
                            }

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

                            progress.report({
                                increment: 10,
                                message: 'Stopping old process...',
                            });

                            const dockerPermission = await connection.executeCommand(
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

                            await connection.executeCommand(
                                'docker exec pythonRuntime killall -15 python3'
                            );

                            progress.report({
                                increment: 10,
                                message: 'Starting new process with debugpy...',
                            });

                            await connection.executeCommand(
                                'docker exec -d pythonRuntime python3 -Xfrozen_modules=off -m debugpy --listen 0.0.0.0:5678 --wait-for-client main.py'
                            );

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

                            //Wait for the user to stop the debugging session
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

        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.upload',
                async (controller: Controller | undefined) => {
                    Manager.getInstance().upload(controller);
                }
            )
        );

        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.upload-all',
                async () => {
                    Manager.getInstance().uploadAll();
                }
            )
        );

        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.edit-setting',
                async (controller: ControllerItem | undefined) => {
                    Manager.getInstance().editSettings(controller);
                }
            )
        );

        // Commands in Context Menu
        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.rename-controller',
                async (controller: Controller | undefined) => {
                    Manager.getInstance().renameController(controller);
                }
            )
        );

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

        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.reset-controller',
                async (controller) => {
                    Manager.getInstance().resetController(controller);
                }
            )
        );

        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.remove-reset-controller',
                async (controller: Controller | undefined) => {
                    Manager.getInstance().removeReset(controller);
                }
            )
        );

        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.configure-controller',
                async(controller: Controller | undefined) => {
                    Manager.getInstance().configureController(controller);
                }
            )
        )

        extensionContext.subscriptions.concat(commands);
    }
}
