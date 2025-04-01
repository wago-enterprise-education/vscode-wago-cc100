import * as vscode from 'vscode';
import * as fs from 'fs';
import { ControllerProvider, Controller, ControllerItem } from './view';
import { YamlCommands } from '../migrated/yaml';
import { Upload } from './upload';
import { Manager } from '../core/manager';

const FOLDER_REGEX = '^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^.]*)?$)[^<>:"/\\|?*\x00-\x1F]*[^<>:"/\\|?*\x00-\x1F\ .]$';

export class Command {

    public static createCommands(context: vscode.ExtensionContext) {
        const commands = [];

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.create-project', async () => {
            Manager.getInstance().createController(context);
            // const projectName = await vscode.window.showInputBox({
            //     prompt: 'Enter the name of the project',
            //     title: 'Create Project',
            //     validateInput: (value: string) => {
            //         if(!RegExp(FOLDER_REGEX).test(value)) {
            //             return 'Invalid project name';
            //         }
            //         return null;
            //     }
            // })

            // if(!projectName) return;

            // await vscode.window.showOpenDialog({
            //     canSelectFiles: false,
            //     canSelectFolders: true,
            //     canSelectMany: false,
            //     openLabel: 'Select Project Destination'
            // }).then(async (uri) => {
            //     if(uri && projectName) {
            //         try {
            //             fs.mkdirSync(`${uri[0].fsPath}/${projectName}`);
            //             fs.cpSync(`${context.extensionPath}/res/template`, `${uri[0].fsPath}/${projectName}`, { recursive: true });
            //             await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(`${uri[0].fsPath}/${projectName}`));
            //         } catch (error: any) {
            //             vscode.window.showErrorMessage('Project already exists');
            //         }
            //     }
            // })
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.init-project', async () => {
            fs.cpSync(`${context.extensionPath}/res/template/controller`, `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller`, { recursive: true });
            fs.cpSync(`${context.extensionPath}/res/template/wago.yaml`, `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`);
            vscode.window.showInformationMessage('Project initialized');
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.add-controller', async () => {
            Manager.getInstance().addController(context);
            // const controllerName = await vscode.window.showInputBox({
            //     prompt: 'Enter the name of the controller',
            //     title: 'Add Controller / Name',
            //     ignoreFocusOut: true
            // }) || '';

            // if(!controllerName) return;

            // const controllerDescription = await vscode.window.showInputBox({
            //     prompt: 'Enter the description of the controller',
            //     title: 'Add Controller / Description',
            //     ignoreFocusOut: true
            // }) || '';

            // const controllerEngine = await vscode.window.showQuickPick(['CC100-v0.1', 'CC100-v0.2'], {
            //     title: 'Add Controller / Engine',
            //     canPickMany: false,
            //     ignoreFocusOut: true
            // }) || 'CC100-v0.2';

            // const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
            // const controllerSrc = await vscode.window.showQuickPick(
            //     fs.readdirSync(workspacePath)
            //         .map((folder) => {
            //             if (fs.existsSync(`${workspacePath}/${folder}/main.py`)) {
            //                 return {
            //                     label: `${folder}`,
            //                     description: `${folder}/main.py`
            //                 };
            //             }
            //             return { label: "" };
            //         })
            //         .filter((path) => path.label.length > 0 ? true : false)
            //         .concat({ label: "New", description: 'Create a new folder' }),
            //     {
            //         title: 'Add Controller / Source',
            //         canPickMany: false,
            //         ignoreFocusOut: true
            //     }
            // ) || { label: "src" };

            // if(controllerSrc.label === 'New') {
            //     const newFolder = await vscode.window.showInputBox({
            //         prompt: 'Enter the name of the folder',
            //         title: 'Add Controller / Source / New Folder',
            //         ignoreFocusOut: true,
            //         validateInput: (value: string) => {
            //             if(!RegExp(FOLDER_REGEX).test(value)) {
            //                 return 'Invalid folder name';
            //             }
            //             if(fs.existsSync(`${workspacePath}/${value}`)) {
            //                 return 'Folder already exists';
            //             }
            //             return null;
            //         }
            //     }) || '';

            //     if(newFolder) {
            //         fs.mkdirSync(`${workspacePath}/${newFolder}`);
            //         fs.cpSync(`${context.extensionPath}/res/template/src/main.py`, `${workspacePath}/${newFolder}/main.py`)
            //         controllerSrc.label = newFolder;
            //     } else {
            //         controllerSrc.label = 'src';
            //     }
            // }

            // await YamlCommands.createController(context, controllerName, controllerDescription, controllerEngine, controllerSrc.label, "latest");
            // vscode.window.showInformationMessage(`Controller ${controllerName} added`);
            // ControllerProvider.instance.refresh();
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.reset-controller', async (controller) => {
            Manager.getInstance().resetController(controller);

            // if(!vscode.workspace.workspaceFolders) {
            //     vscode.window.showErrorMessage('No workspace is open');
            //     return;
            // }
            // let controllerId = null;
            // if(!controller) {
            //     controller = await vscode.window.showQuickPick(
            //         YamlCommands.getControllers().map((controller) => ({
            //             id: controller.id,	
            //             label: controller.displayname,
            //             description: controller.description
            //         })),
            //         {
            //             title: 'Reset Controller',
            //             canPickMany: false
            //         }
            //     );
            //     if (!controller) return;
            // } 
            // await vscode.window.showWarningMessage(`Reset ${controller.label}`, 'Yes', 'No').then((value) => {
            //     if(value === 'Yes') controllerId = controller.id;
            // });
            // if(!controllerId) return;

            // try {
            //     if (ProjectVersion == 1.0){
            //         await ConnectionManager.instance.executeCommand(controllerId, 'killall python3');
            //         await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /home/user/python_bootapplication/*');
            //         await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /etc/init.d/S99_python_runtime');
            //         await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /etc/rc.d/S99_python_runtime');
            //         await ConnectionManager.instance.executeCommand(controllerId, 'killall tail');
            //     }

            //     else if (ProjectVersion == 2.0){
            //         await ConnectionManager.instance.executeCommand(controllerId, 'docker container stop #Container name');
            //         await ConnectionManager.instance.executeCommand(controllerId, 'docker rm #Container name');
            //         await ConnectionManager.instance.executeCommand(controllerId, 'docker irm #Image name');
            //         await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /home/user/python_bootapplication/*');
            //     }

            //     // await ConnectionManager.instance.executeCommand(controllerId,);

            //     // await ssh.digitalWrite(0);
            //     // await ssh.analogWrite(1, 0);
            //     // await ssh.analogWrite(2, 0);
            //     // await ssh.turnOffRunLed();
            //     // await ssh.startCodesysRuntime();
            //     // await ssh.deleteFiles('#Path zur Datei');
                
            //     vscode.window.showInformationMessage(`Controller ${controller.label} reset`);

            //     ControllerProvider.instance.refresh();
            // } catch (error: any) {
            //     vscode.window.showErrorMessage('Error reseting controller');
            // }
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.refresh-view', async () => {
            ControllerProvider.instance.refresh();
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.upload', async (controller: Controller | undefined) => {
            if(!vscode.workspace.workspaceFolders) {
                vscode.window.showErrorMessage('No workspace is open');
                return;
            }
            
            if (controller === undefined) {
                let con = await vscode.window.showQuickPick(
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
                if (con === undefined) return;
                controller = con;
            }
            
            await new Upload().uploadFile(controller.controllerId);
            return;
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.upload-all', async () => {
            YamlCommands.getControllers().forEach(async (controller) => {
                vscode.commands.executeCommand('vscode-wago-cc100.upload',{id: controller.id, label: controller.displayname, online: false});
            });
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.edit-setting', async (controller: ControllerItem | undefined) => {
            Manager.getInstance().editSettings(controller);
            
            // if(!vscode.workspace.workspaceFolders) {
            //     vscode.window.showErrorMessage('No workspace is open');
            //     return;
            // }
        
            // let settingToEdit: string;

            // if(controller === undefined) {
            //     const nodes = YamlCommands.getWagoYaml()["nodes"];

            //     let con = await vscode.window.showQuickPick(
            //         Object.keys(nodes).map((key: any) => ({
            //             id: key,	
            //             label: nodes[key].displayname,
            //             description: nodes[key].description,
            //             online: false
            //         })),
            //         {
            //             title: 'Pick Controller',
            //             canPickMany: false
            //         }
            //     );    
            //     if (con === undefined) return;
            //     let id = con.id;
            
            //     settingToEdit = await vscode.window.showQuickPick(
            //         Object.values(setting),
            //         {
            //             title: 'Choose Setting',
            //             canPickMany: false
            //         }
            //     ) || '';
            //     if (!settingToEdit) return;

            //     await EditSettings.editSetting(id, settingAdapter[settingToEdit as keyof typeof settingAdapter]);
            // } else {
            //     await EditSettings.editSetting(controller.getId(), settingAdapter[controller.setting as keyof typeof settingAdapter]);
            // }

            // ControllerProvider.instance.refresh();
        }));


        // Commands in Context Menu
        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.rename-controller', async (controller: Controller | undefined) => {
            Manager.getInstance().renameController(controller);
            // let newController;
            // if(controller) {
            //     newController = controller;
            // } else {
            //     const controllers = YamlCommands.getControllers();
            //     if(controllers.length > 1) {
            //         newController = await vscode.window.showQuickPick(controllers.map(controller => {
            //             return {
            //                 label: controller.displayname,
            //                 description: controller.description,
            //                 controllerId: controller.id,
            //             };
            //         }), {
            //             title: 'Rename Controller',
            //             canPickMany: false
            //         });
            //     } else {
            //         newController = {
            //             label: controllers[0].displayname,
            //             controllerId: controllers[0].id,
            //         }
            //     }
            // }
            // if(!newController) return;

            // const controllerName = await vscode.window.showInputBox({
            //     prompt: 'Enter the name of the controller',
            //     title: 'Rename Controller',
            //     value: newController.label,
            // }) || '';
            // if(!controllerName) return;

            // YamlCommands.writeWagoYaml(newController.controllerId, wagoSettings.displayname, controllerName);
        }));

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.remove-controller', async (controller: Controller | undefined, showConfirmation = true) => {
            Manager.getInstance().removeController(controller, showConfirmation);
            // let selectedController;
            // if(controller) {
            //     selectedController = controller;
            // } else {
            //     selectedController = await vscode.window.showQuickPick(
            //         YamlCommands.getControllers().map((controller) => ({
            //             controllerId: controller.id,	
            //             label: controller.displayname,
            //             description: controller.description
            //         })),
            //         {
            //             title: 'Remove Controller',
            //             canPickMany: false
            //         }
            //     );
            //     if (!selectedController) return;
            // } 

            // let controllerId
            // if(showConfirmation){
            //     await vscode.window.showWarningMessage(`Remove ${selectedController.label}`, 'Yes', 'No').then((value) => {
            //         if(value === 'Yes') controllerId = selectedController.controllerId;
            //     });
            //     if(!controllerId) return;
            // } else {
            //     controllerId = selectedController.controllerId;
            // }
            
            // YamlCommands.removeController(controllerId);
            // vscode.window.showInformationMessage(`Controller ${selectedController.label} removed`);

            // ControllerProvider.instance.refresh();
        }));

        context.subscriptions.concat(commands);
    }
}