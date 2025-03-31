import { RefreshInterface, UploadInterface } from "./interface/interface";

export class Factory {
    private static instance: Factory | null = null;
    private constructor() {
        // Private constructor to prevent instantiation from outside
    }

    private static newInstance(){
        if (!Factory.instance) {
            Factory.instance = new Factory();
        }
    } 

    public static getInstance(): Factory {
        if (!Factory.instance) {
            Factory.newInstance();
        }
        return Factory.instance!;
    }

    public createRefreshCommand(): RefreshInterface {
        
    }

    public createUploadCommand(): UploadInterface {
        
    }
}