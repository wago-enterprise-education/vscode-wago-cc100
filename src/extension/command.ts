import * as vscode from 'vscode';
import * as fs from 'fs';
import yaml from 'yaml';
import { ControllerProvider, Controller, ControllerItem } from './view';
import { wagoSettings, YamlCommands } from './yaml';
import { SSH }from '../ssh';
import {versionNr} from './helper'
import { ConnectionManager } from './connectionManager';
import { Upload } from './upload';
import { EditSettings, setting } from './editSettings';

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

            const controllerEngine = await vscode.window.showQuickPick(['CC100-v0.1', 'CC100-v0.2'], {
                title: 'Add Controller',
                canPickMany: false
            }) || 'CC100-v0.2';

            const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath
            const controllerSrc = await vscode.window.showQuickPick(
                fs.readdirSync(workspacePath)
                    .map((folder) => {
                        if (fs.existsSync(`${workspacePath}/${folder}/main.py`)) {
                            return {
                                label: `${folder}`,
                                description: `${folder}/main.py`
                            };
                        }
                        return { label: "" }
                    })
                    .filter((path) => path.label.length > 0 ? true : false)
                    .concat({ label: "New", description: 'Create a new folder' }),
                {
                    title: 'Add Controller',
                    canPickMany: false
                }
            ) || { label: "src" };
        
            const controllerImg = await vscode.window.showInputBox({
                prompt: 'Enter the docker image version of the controller',
                title: 'Add Controller'
            }) || 'latest';

            YamlCommands.createController(context, controllerName, controllerDescription, controllerEngine, controllerSrc.label, controllerImg);
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
            let ssh = new SSH(controllerSettings.ip_adress, controllerSettings.port, controllerSettings.username, '');
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

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.upload', async (controller: Controller | undefined) => {
            if(!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('No workspace is open');
                return;
            }
            
            const nodes = YamlCommands.getWagoYaml()["nodes"];
            if (controller === undefined) {
                let con = await vscode.window.showQuickPick(
                    Object.keys(nodes).map((key: any) => ({
                        id: key,	
                        label: nodes[key].displayname,
                        description: nodes[key].description,
                        online: false
                    })),
                    {
                        title: 'Upload to Controller',
                        canPickMany: false
                    }
                );    
                if (con === undefined) return;
                controller = con;
            }
            
            await new Upload().uploadFile(Number.parseInt(controller.id));
            return;
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.edit-setting', async (controller: ControllerItem | undefined) => {
            if(!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('No workspace is open');
                return;
            }
        
            let settingToEdit: string;

            if(controller === undefined) {
                settingToEdit = await vscode.window.showQuickPick(
                    Object.values(setting),
                    {
                        title: 'Choose Setting',
                        canPickMany: false
                    }
                ) || '';
                if (!settingToEdit) return;

                let content = await vscode.window.showInputBox({
                    prompt: 'Enter the value the Setting should be set to',
                    title: 'Set Setting Value'
                }) || '';
                if (!content) return;

                EditSettings.editSetting(settingToEdit, content);
            } else {
                
            }

            //Regular Check - Case for every Setting type with function writeCon or writeWago
        }));


        // Commands in Context Menu
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.rename-controller', async (controller: Controller | undefined) => {
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
                            id: controller.id,
                        };
                    }), {
                        title: 'Rename Controller',
                        canPickMany: false
                    });
                } else {
                    newController = {
                        label: controllers[0].displayname,
                        id: controllers[0].id,
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

            YamlCommands.writeWagoYaml(Number.parseInt(newController.id), wagoSettings.displayname, controllerName);
        }));

        context.subscriptions.concat(commands);
    }
}