import { Factory } from "./factory";
import { versionNr } from '../extension/helper';
import { Controller, ControllerItem } from "../extension/view";

export class Manager {
    private static instance: Manager;
    private versionNr: number;

    private constructor() {
        this.versionNr = versionNr;
    }

    public static getInstance(): Manager {
        if (!Manager.instance) {
            Manager.instance = new Manager();
        }
        return Manager.instance;
    }

    public upload(id: number){
        Factory.getInstance().createUploadCommand(versionNr).upload(id);
    }
    public editSettings(controller: ControllerItem | undefined){
        Factory.getInstance().createEditSettingsCommand(versionNr).editSettings(controller);
    }
    public resetController(controller: Controller | undefined){
        Factory.getInstance().createResetCommand(versionNr).reset(controller);
    }
}