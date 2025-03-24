import * as vscode from 'vscode';
import * as fs from 'fs';
import yaml from 'yaml';
import { ControllerProvider } from './view';
import { YamlCommands } from './yaml';
import { SSH }from '../ssh';
import { constrainedMemory } from 'process';
import {versionNr} from './helper'
import { ConnectionManager } from './connectionManager';

const FOLDER_REGEX = '^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^.]*)?$)[^<>:"/\\|?*\x00-\x1F]*[^<>:"/\\|?*\x00-\x1F\ .]$';

export class Command {

    public static createCommands(context: vscode.ExtensionContext) {
        const commands = [];

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.create-project', async () => {
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
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.init-project', async () => {
            try {
                fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, yaml.stringify({ version: 1.0 }));
            } catch(error: any) {
                vscode.window.showErrorMessage("Error initializing project");
            }
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.add-controller', async () => {
            if(!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('No workspace is open');
                return;
            }
            const controllerName = await vscode.window.showInputBox({
                prompt: 'Enter the name of the controller',
                title: 'Add Controller',
                validateInput: (value: string) => {
                    if(!RegExp(FOLDER_REGEX).test(value)) {
                        return 'Invalid controller name';
                    }
                    if(YamlCommands.getWagoYaml()?.nodes[value]) {
                        return 'Controller already exists';
                    }
                    return null;
                }
            }) || '';

            if(!controllerName) return;

            const controllerDescription = await vscode.window.showInputBox({
                prompt: 'Enter the description of the controller',
                title: 'Add Controller'
            }) || '';

            const controllerEngine = await vscode.window.showQuickPick(['Python', 'C++'], {
                title: 'Add Controller',
                canPickMany: false
            }) || '';

            const controllerSrc = await vscode.window.showQuickPick(
                vscode.workspace.workspaceFolders.map((folder: any) => {
                        if (fs.existsSync(`${folder.uri.fsPath}/main.py`)) {
                            return `${folder.uri.fsPath}`;
                        }
                        return undefined;
                    })
                    .filter((path: string | undefined): path is string => path !== undefined),
                {
                    title: 'Add Controller',
                    canPickMany: false
                }
            ) || '';

            const controllerImg = await vscode.window.showInputBox({
                prompt: 'Enter the docker image version of the controller',
                title: 'Add Controller'
            }) || '';

            if(!controllerImg) return;

            YamlCommands.createController(context, controllerName, controllerDescription, controllerEngine, controllerSrc, controllerImg);
            vscode.window.showInformationMessage(`Controller ${controllerName} added`);
            ControllerProvider.instance.refresh();
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.reset-controller', async (controller) => {
            if(!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('No workspace is open');
                return;
            }
            let controllerId = null;
            if(!controller) {
                const nodes = YamlCommands.getWagoYaml()["nodes"];
                controller = await vscode.window.showQuickPick(
                    Object.keys(nodes).map((key: any) => ({
                        id: key,	
                        label: nodes[key].displayname,
                        description: nodes[key].description
                    })),
                    {
                        title: 'Reset Controller',
                        canPickMany: false
                    }
                );
                if (!controller) return;
            } 
            await vscode.window.showWarningMessage(`Reset ${controller.label}`, 'Yes', 'No').then((value) => {
                if(value === 'Yes') controllerId = controller.id;
            });
            if(!controllerId) return;
            
            let controllerSettings = YamlCommands.getControllerYaml(controllerId);
            let ssh = new SSH(controllerSettings.ip_adress, controllerSettings.port, controllerSettings.username, 'wago');
            let filenameOnStartup: string = 'S99_python_runtime';
            let destPath: string = '/home/user/python_bootapplication/';
            let pathToFileOnStartup: string = '/etc/init.d/' + filenameOnStartup;
            let pathToSymbolicLink: string = '/etc/rc.d/' + filenameOnStartup;

            try {
                if (versionNr == 1.0){
                    await ssh.killAllPythonScripts();
                    await ssh.deleteFiles(destPath);
                    await ssh.deleteFiles(pathToFileOnStartup);
                    await ssh.deleteFiles(pathToSymbolicLink);           
                    await ssh.killAllTails();
                }

                else if (versionNr == 2.0){
                    ConnectionManager.instance.executeCommand(controllerId, 'docker container stop #Container name')
                    ConnectionManager.instance.executeCommand(controllerId, 'docker rm #Container name')
                    ConnectionManager.instance.executeCommand(controllerId, 'docker irm #Image name')
                }

                await ssh.digitalWrite(0);
                await ssh.analogWrite(1, 0);
                await ssh.analogWrite(2, 0);
                await ssh.turnOffRunLed();
                await ssh.startCodesysRuntime();
                await ssh.deleteFiles('#Path zur Datei');
                
                vscode.window.showInformationMessage(`Controller ${controller.label} reset`);

                ControllerProvider.instance.refresh();
            } catch (error: any) {
                vscode.window.showErrorMessage('Error reseting controller');
            }
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.remove-controller', async (controller) => {
            if(!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('No workspace is open');
                return;
            }
            let controllerId = null;
            if(!controller) {
                const nodes = YamlCommands.getWagoYaml()["nodes"];
                controller = await vscode.window.showQuickPick(
                    Object.keys(nodes).map((key: any) => ({
                        id: key,	
                        label: nodes[key].displayname,
                        description: nodes[key].description
                    })),
                    {
                        title: 'Remove Controller',
                        canPickMany: false
                    }
                );
                if (!controller) return;
            } 
            await vscode.window.showWarningMessage(`Remove ${controller.label}`, 'Yes', 'No').then((value) => {
                if(value === 'Yes') controllerId = controller.id;
            });
            if(!controllerId) return;
            
            let controllerSettings = YamlCommands.getControllerYaml(controllerId);
            try {
                YamlCommands.removeController(controllerId);
                vscode.window.showInformationMessage(`Controller ${controller.label} removed`);

                ControllerProvider.instance.refresh();
            } catch (error: any) {
                vscode.window.showErrorMessage('Error removing controller');
            }
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.refresh-view', async () => {
            ControllerProvider.instance.refresh();
        }));

        context.subscriptions.concat(commands);
    }
}