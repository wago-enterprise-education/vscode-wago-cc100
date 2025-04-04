import * as Interface from "./interface/projectInterface";
import * as V1 from "./interface/V01";
import * as V2 from "./interface/V02";

export class ProjectFactory {
    private static instance: ProjectFactory | null = null;
    private constructor() {
        // Private constructor to prevent instantiation from outside
    }
    public static getInstance(): ProjectFactory {
        if (!ProjectFactory.instance) {
            ProjectFactory.instance = new ProjectFactory();
        }
        return ProjectFactory.instance!;
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
    public createCreateProjectCommand(versionNr: number): Interface.CreateProjectInterface{
        switch (versionNr) {
            case 0.2:
                return new V2.CreateProject();
            default:
                throw new Error("Invalid version number");
        }
    }
    public createRemoveResetControllerCommand(versionNr: number): Interface.RemoveResetControllerInterface{
        switch (versionNr) {
            case 0.2:
                return new V2.RemoveResetController();
            default:
                throw new Error("Invalid version number");
        }
    }
    public createEstablishConnections(versionNr: number): Interface.EstablishConnectionsInterface{
        switch (versionNr) {
            case 0.2:
                return new V2.EstablishConnections();
            case 0.1:
                return new V1.EstablishConnections();
            default:
                throw new Error("Invalid version number");
        }
    }
}