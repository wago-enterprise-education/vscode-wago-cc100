import { ProjectFactory } from "./factoryProject";
import { ProjectVersion } from '../extension/helper';
import { Controller, ControllerItem } from "../extension/view";
import * as vscode from 'vscode';

import { ControllerFactory } from "./factoryController";

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

    public async resetController(controller: Controller | undefined){
        let engine = await ProjectFactory.getInstance().createResetCommand(this.versionNr).reset(controller, true);
        ControllerFactory.getInstance().createResetCommand(engine).reset(controller)
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
    public createProject(context: vscode.ExtensionContext){
        ProjectFactory.getInstance().createCreateProjectCommand(this.versionNr).createController(context);
    }
    public async removeReset(controller: Controller | undefined){
        await ProjectFactory.getInstance().createResetCommand(this.versionNr).reset(controller, false).then (() => {
            ProjectFactory.getInstance().createRemoveCommand(this.versionNr).removeController(controller, false);
        })
        .catch((error:any) => { 
            console.error(error); 
            vscode.window.showErrorMessage(`Error: Resetting Controller`);
        });
    }
    public viewChildren(element?: Controller | ControllerItem | undefined): any {
        return ProjectFactory.getInstance().createViewChildrenCommand(this.versionNr).getChildren(element);
    }
    public establishConnections(){
        ProjectFactory.getInstance().createEstablishConnections(this.versionNr).establishConnections();
    }
}