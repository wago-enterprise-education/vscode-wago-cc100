import { Factory } from "./factory";
import { ProjectVersion } from '../extension/helper';
import { Controller, ControllerItem } from "../extension/view";
import * as vscode from 'vscode';

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
        Factory.getInstance().createResetCommand(this.versionNr).reset(controller);
    }
    public addController(context: vscode.ExtensionContext){
        Factory.getInstance().createAddCommand(this.versionNr).addController(context);
    }
    public removeController(controller: Controller | undefined, showConfirmation: boolean){
        Factory.getInstance().createRemoveCommand(this.versionNr).removeController(controller, showConfirmation);
    }
}