import { Factory } from "./factory";
import { ProjectVersion } from '../extension/helper';
import { Controller, ControllerItem } from "../extension/view";
import * as vscode from 'vscode';
import { YamlCommands } from "../migrated/yaml";

export class Manager {
    private static instance: Manager;
    private versionNr: number;

    private constructor() {
        this.versionNr = ProjectVersion;
    }

    public static getInstance(): Manager {
        if (!Manager.instance) {
            Manager.instance = new Manager();
        }
        return Manager.instance;
    }

    public upload(id: number){
        Factory.getInstance().createUploadCommand(this.versionNr).upload(id);
    }
    public editSettings(controller: ControllerItem | undefined){
        Factory.getInstance().createEditSettingsCommand(this.versionNr).editSettings(controller);
    }
    public resetController(controller: Controller | undefined){
        Factory.getInstance().createResetCommand(this.versionNr).reset(controller, true);
    }
    public addController(context: vscode.ExtensionContext){
        Factory.getInstance().createAddCommand(this.versionNr).addController(context);
    }
    public removeController(controller: Controller | undefined, showConfirmation: boolean){
        Factory.getInstance().createRemoveCommand(this.versionNr).removeController(controller, showConfirmation);
    }
    public renameController(controller: Controller | undefined){
        Factory.getInstance().createRenameCommand(this.versionNr).renameController(controller);
    }
    public createController(context: vscode.ExtensionContext){
        Factory.getInstance().createCreateControllerCommand(this.versionNr).createController(context);
    }
    public async removeReset(controller: Controller | undefined){
        if(!controller) {
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,	
                    label: controller.displayname,
                    description: controller.description,
                    online: true
                })),
                {
                    title: 'Reset Controller',
                    canPickMany: false
                }
            );
            if (!controller) return;
        } 
        
        await Factory.getInstance().createResetCommand(this.versionNr).reset(controller, false).then (() => {
            Factory.getInstance().createRemoveCommand(this.versionNr).removeController(controller, false);
        })
        .catch((error:any) => { 
            console.error(error); 
            vscode.window.showErrorMessage(`Error: Resetting Controller`);
        });
    }
    public viewChildren(element?: Controller | ControllerItem | undefined): vscode.ProviderResult<Controller[] | ControllerItem[]> {
        return Factory.getInstance().createViewChildrenCommand(this.versionNr).getChildren(element);
    }
}