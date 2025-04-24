import * as vscode from 'vscode';
import * as fs from 'fs';
import { ControllerProvider, Controller, ControllerItem } from './view';
import { Manager } from '../extensionCore/manager';
import { ConnectionManager } from './connectionManager';

const MAX_RETRIES = 10; // Maximum number of retries for the debugger connection
const RETRY_DELAY = 2000; // Delay between retries in milliseconds

export class Command {

    public static createCommands(context: vscode.ExtensionContext) {
        const commands = [];

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.create-project', async () => {
            Manager.getInstance().createProject(context);
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.init-project', async () => {
            fs.cpSync(`${context.extensionPath}/res/template/controller`, `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller`, { recursive: true });
            fs.cpSync(`${context.extensionPath}/res/template/wago.yaml`, `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`);
            vscode.window.showInformationMessage('Project initialized');
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.add-controller', async () => {
            Manager.getInstance().addController(context);
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.reset-controller', async (controller) => {
            Manager.getInstance().resetController(controller, );
        }));

        //Debugger Command
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.refresh-view', async () => {
            ControllerProvider.instance.refresh();
        }));
        
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.debug', async function (element: Controller | undefined) {
            //Debugger configurations
            const config = {
                name: "Python: attach to cc100",
                type: "python", //Python debug type
                request: "attach", //Attach Mode
                connect: {
                    host: "localhost", //remote host (local for the ssh tunnel)
                    port: 8765 //Port for the connection
                },
                pathMappings: [
                    {
                        localRoot: "${workspaceFolder}",
                        remoteRoot: "/home/user/python_bootaplication"
                    }
                ]
            };
        
            if(!element) {
                vscode.window.showErrorMessage('No controller selected');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Python Debugging',
                cancellable: false,
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Getting controller connection...' });

                const connection = await ConnectionManager.instance.getConnection(element.controllerId)

                progress.report({ increment: 20, message: 'Stopping old process...' });

                await connection.executeCommand("docker exec pythonRuntime killall -15 python3")

                progress.report({ increment: 20, message: 'Starting new process with debugpy...' });

                await connection.executeCommand("docker exec -d pythonRuntime python3 -Xfrozen_modules=off -m debugpy --listen 0.0.0.0:5678 --wait-for-client main.py")

                progress.report({ increment: 20, message: 'Creating port forwarding...' });
                
                await connection.forwardPort(8765, 8765)

                progress.report({ increment: 20, message: 'Waiting for the debugger to connect...' });

                //Wait for the user to stop the debugging session
                vscode.debug.onDidTerminateDebugSession(async (session) => {
                    if (session.configuration.name === config.name) {
                        connection.disconnect();
                        vscode.window.showInformationMessage('Debugging session stopped');
                    }
                });
                
                let success = false;
                for (let i = 1; i <= MAX_RETRIES; i++) {
                    success = await vscode.debug.startDebugging(undefined, config);
                    if(success) break;
                    if (i >= MAX_RETRIES) break;
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }

                if (success) {
                    progress.report({ increment: 100, message: 'Debugging session started' });
                } else {
                    connection.disconnect();
                    progress.report({ increment: 100, message: 'Debugging session failed' });
                }

                return new Promise<void>((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, 2000);
                })
            })
            
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.upload', async (controller: Controller | undefined) => {
            Manager.getInstance().upload(controller);
        }));
        
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.upload-all', async () => {
            Manager.getInstance().uploadAll();
        }));
        
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.edit-setting', async (controller: ControllerItem | undefined) => {
            Manager.getInstance().editSettings(controller);
        }));
        
        
        // Commands in Context Menu
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.rename-controller', async (controller: Controller | undefined) => {
            Manager.getInstance().renameController(controller);
        }));
        
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.remove-controller', async (controller: Controller | undefined, showConfirmation = true) => {
            Manager.getInstance().removeController(controller, showConfirmation);
        }));
        
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.reset-controller', async (controller) => {
            Manager.getInstance().resetController(controller);
        }));
        
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.remove-reset-controller', async (controller: Controller | undefined) => {
            Manager.getInstance().removeReset(controller);
        }));

        context.subscriptions.concat(commands);
    }
}