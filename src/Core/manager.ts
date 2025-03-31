import { Factory } from "./factory";
import { versionNr } from '../extension/helper';

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
}