import * as vscode from 'vscode';
import * as fs from 'fs';
import { ControllerProvider, Controller, ControllerItem } from './view';
import { wagoSettings, YamlCommands } from './yaml';
import { versionNr } from './helper'
import { ConnectionManager } from './connectionManager';
import { Upload } from './upload';
import { EditSettings, setting, settingAdapter } from './editSettings';

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
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    const destinationPath = `${vscode.workspace.workspaceFolders[0].uri.fsPath}/wago.yaml`;
                    fs.cpSync(`${context.extensionPath}/res/template/wago.yaml`, destinationPath);
                } else {
                    vscode.window.showErrorMessage('No workspace is open');
                }
                // fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, yaml.stringify({ version: 1.0 }));
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
                    title: 'Add Controller',
                    canPickMany: false
                }
            ) || { label: "src" };
        
            const controllerImg = await vscode.window.showInputBox({
                prompt: 'Enter the docker image version of the controller',
                title: 'Add Controller'
            }) || 'latest';

            await YamlCommands.createController(context, controllerName, controllerDescription, controllerEngine, controllerSrc.label, controllerImg);
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

            try {
                if (versionNr == 1.0){
                    await ConnectionManager.instance.executeCommand(controllerId, 'killall python3');
                    await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /home/user/python_bootapplication/*');
                    await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /etc/init.d/S99_python_runtime');
                    await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /etc/rc.d/S99_python_runtime');
                    await ConnectionManager.instance.executeCommand(controllerId, 'killall tail');
                }

                else if (versionNr == 2.0){
                    await ConnectionManager.instance.executeCommand(controllerId, 'docker container stop #Container name');
                    await ConnectionManager.instance.executeCommand(controllerId, 'docker rm #Container name');
                    await ConnectionManager.instance.executeCommand(controllerId, 'docker irm #Image name');
                    await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /home/user/python_bootapplication/*');
                }

                // await ConnectionManager.instance.executeCommand(controllerId,);

                // await ssh.digitalWrite(0);
                // await ssh.analogWrite(1, 0);
                // await ssh.analogWrite(2, 0);
                // await ssh.turnOffRunLed();
                // await ssh.startCodesysRuntime();
                // await ssh.deleteFiles('#Path zur Datei');
                
                vscode.window.showInformationMessage(`Controller ${controller.label} reset`);

                ControllerProvider.instance.refresh();
            } catch (error: any) {
                vscode.window.showErrorMessage('Error reseting controller');
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
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.upload-all', async () => {
            YamlCommands.getControllers().forEach(async (controller) => {
                vscode.commands.executeCommand('vscode-wago-cc100.upload',{id: controller.id, label: controller.displayname, online: false});
            });
        }));
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.edit-setting', async (controller: ControllerItem | undefined) => {
            if(!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('No workspace is open');
                return;
            }
        
            let settingToEdit: string;

            if(controller === undefined) {
                const nodes = YamlCommands.getWagoYaml()["nodes"];

                let con = await vscode.window.showQuickPick(
                    Object.keys(nodes).map((key: any) => ({
                        id: key,	
                        label: nodes[key].displayname,
                        description: nodes[key].description,
                        online: false
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

                EditSettings.editSetting(id, settingAdapter[settingToEdit as keyof typeof settingAdapter]);
            } else {
                EditSettings.editSetting(controller.getId(), settingAdapter[controller.setting as keyof typeof settingAdapter]);
            }
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

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.remove-controller', async (controller: Controller | undefined, showConfirmation = true) => {
            let selcetedController;
            if(controller) {
                selcetedController = controller;
            } else {
                selcetedController = await vscode.window.showQuickPick(
                    YamlCommands.getControllers().map((controller) => ({
                        id: controller.id,	
                        label: controller.displayname,
                        description: controller.description
                    })),
                    {
                        title: 'Remove Controller',
                        canPickMany: false
                    }
                );
                if (!selcetedController) return;
            } 

            let controllerId
            if(showConfirmation){
                await vscode.window.showWarningMessage(`Remove ${selcetedController.label}`, 'Yes', 'No').then((value) => {
                    if(value === 'Yes') controllerId = selcetedController.id;
                });
                if(!controllerId) return;
            } else {
                controllerId = selcetedController.id;
            }
            
            YamlCommands.removeController(Number.parseInt(controllerId));
            vscode.window.showInformationMessage(`Controller ${selcetedController.label} removed`);

            ControllerProvider.instance.refresh();
        }));

        context.subscriptions.concat(commands);
    }
}