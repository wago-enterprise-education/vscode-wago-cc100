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
    
    private getProjectVersion(){

    }

    public refresh(id: number){
        this.getProjectVersion();
        Factory.getInstance().createRefreshCommand().refresh();
    }
    public upload(id: number){
        this.getProjectVersion();
        Factory.getInstance().createUploadCommand().upload();
    }
}