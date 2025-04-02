import { ProjectFactory } from "./factoryProject";
import { ProjectVersion } from '../extension/helper';
import { Controller, ControllerItem } from "../extension/view";
import * as vscode from 'vscode';
<<<<<<< HEAD
import { YamlCommands } from "../migrated/yaml";
=======
import { ControllerFactory } from "./factoryController";
>>>>>>> 02ff7d8 (added factory for controller and split resetCommand between Project- and ControllerFactory)

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
        ProjectFactory.getInstance().createUploadCommand(this.versionNr).upload(id);
    }
    public editSettings(controller: ControllerItem | undefined){
        ProjectFactory.getInstance().createEditSettingsCommand(this.versionNr).editSettings(controller);
    }
<<<<<<< HEAD
    public resetController(controller: Controller | undefined){
        Factory.getInstance().createResetCommand(this.versionNr).reset(controller, true);
=======
    public async resetController(controller: Controller | undefined){
        let engine = await ProjectFactory.getInstance().createResetCommand(this.versionNr).reset(controller);
        ControllerFactory.getInstance().createResetCommand(engine).reset(controller)
>>>>>>> 02ff7d8 (added factory for controller and split resetCommand between Project- and ControllerFactory)
    }
    public addController(context: vscode.ExtensionContext){
        ProjectFactory.getInstance().createAddCommand(this.versionNr).addController(context);
    }
    public removeController(controller: Controller | undefined, showConfirmation: boolean){
        ProjectFactory.getInstance().createRemoveCommand(this.versionNr).removeController(controller, showConfirmation);
    }
    public renameController(controller: Controller | undefined){
        ProjectFactory.getInstance().createRenameCommand(this.versionNr).renameController(controller);
    }
    public createController(context: vscode.ExtensionContext){
        ProjectFactory.getInstance().createCreateControllerCommand(this.versionNr).createController(context);
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