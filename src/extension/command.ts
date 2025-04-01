import * as vscode from 'vscode';
import * as fs from 'fs';
import { ControllerProvider, Controller, ControllerItem } from './view';
import { Manager } from '../extensionCore/manager';

const FOLDER_REGEX = '^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^.]*)?$)[^<>:"/\\|?*\x00-\x1F]*[^<>:"/\\|?*\x00-\x1F\ .]$';

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
        
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.debug', async function () {
                vscode.window.showInformationMessage('Python Debugging wird gestartet...');
        
                //Debugger configurations
                const config = {
                    name: "Python: attach to cc100",
                    type: "python", //Python debug type
                    request: "attach", //Attach Mode
                    connect: {
                        host: "192.168.42.42", //remote host (local for the ssh tunnel)
                        port: 8765 //Port for the connection
                    },
                    pathMappings: [
                        {
                            localRoot: "${workspaceFolder}",
                            remoteRoot: "/home/user/python_bootaplication"
                        }
                    ]
                };
        
                //Staring debugger
                const success = await vscode.debug.startDebugging(undefined, config);
                
                if (success) {
                    vscode.window.showInformationMessage('Debugging session started sucsessfully');
                } else {
                    vscode.window.showErrorMessage('ERROR: Could start a debugging session');
                }
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