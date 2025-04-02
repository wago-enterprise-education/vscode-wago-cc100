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