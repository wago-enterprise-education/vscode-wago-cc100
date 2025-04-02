import * as Interface from "./interface/interface";
import * as V1 from "./interface/V01";
import * as V2 from "./interface/V02";

export class Factory {
    private static instance: Factory | null = null;
    private constructor() {
        // Private constructor to prevent instantiation from outside
    }

    public static getInstance(): Factory {
        if (!Factory.instance) {
            Factory.instance = new Factory();
        }
        return Factory.instance!;
    }

    public createUploadCommand(versionNr: number): Interface.UploadInterface {
        switch (versionNr) {
            case 0.1:
                return new V1.Upload();
            case 0.2:
                return new V2.Upload();
            default:
                throw new Error("Invalid version number");
        }
    }

    public createResetCommand(versionNr: number): Interface.ResetControllerInterface {
        switch (versionNr) {
            case 0.1:
                return new V1.ResetController();
            case 0.2:
                return new V2.ResetController();
            default:
                throw new Error("Invalid version number");
        }
    }

    public createAddCommand(versionNr: number): Interface.AddControllerInterface {
        switch (versionNr) {
            case 0.2:
                return new V2.AddController();
            default:
                throw new Error("Invalid version number");
        }
    }

    public createRemoveCommand(versionNr: number): Interface.RemoveControllerInterface {
        switch (versionNr) {
            case 0.2:
                return new V2.RemoveController();
            default:
                throw new Error("Invalid version number");
        }
    }

    public createConfigureCommand(versionNr: number): Interface.ConfigureControllerInterface {
        switch (versionNr) {
            case 0.1:
                return new V1.ConfigureController();
            case 0.2:
                return new V2.ConfigureController();
            default:
                throw new Error("Invalid version number");
        }
    }

    public createEditSettingsCommand(versionNr: number): Interface.EditSettingsInterface {
        switch (versionNr) {
            case 0.1:
                return new V1.EditSettings();
            case 0.2:
                return new V2.EditSettings();
            default:
                throw new Error("Invalid version number");
        }
    }

    public createViewChildrenCommand(versionNr: number): Interface.ViewChildrenInterface {
        switch (versionNr) {
            case 0.1:
                return new V1.ViewChildren();
            case 0.2:
                return new V2.ViewChildren();
            default:
                throw new Error("Invalid version number");
        }
    }
    
    public createRenameCommand(versionNr: number): Interface.RenameControllerInterface {
        switch (versionNr) {
            case 0.2:
                return new V2.RenameController();
            default:
                throw new Error("Invalid version number");
        }
    }

    public createCreateControllerCommand(versionNr: number): Interface.CreateControllerInterface{
        switch (versionNr) {
            case 0.2:
                return new V2.CreateController();
            default:
                throw new Error("Invalid version number");
        }
    }
}