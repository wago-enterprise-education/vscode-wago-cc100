import * as Interface from '../interfaces/projectInterface'
import * as V1 from '../projectVersions/V01'
import * as V2 from '../projectVersions/V02'

/**
 * A factory class for creating various project-related commands and controllers
 * based on the specified version number. Implements the Singleton design pattern
 * to ensure only one instance of the factory exists.
 */
export class ProjectFactory {
    private static instance: ProjectFactory

    private constructor() {
        // Private constructor to prevent instantiation from outside
    }
    /**
     * Retrieves the singleton instance of the `ProjectFactory`.
     * If the instance does not exist, it is created.
     *
     * @returns {ProjectFactory} The singleton instance of the factory.
     */
    public static getInstance(): ProjectFactory {
        if (!ProjectFactory.instance) {
            ProjectFactory.instance = new ProjectFactory()
        }
        return ProjectFactory.instance!
    }

    /**
     * Creates an upload command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.UploadInterface} The upload command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createUploadCommand(versionNr: number): Interface.UploadInterface {
        switch (versionNr) {
            case 0.1:
                return new V1.UploadController()
            case 0.2:
                return new V2.UploadController()
            default:
                throw new Error('Invalid version number')
        }
    }

    public createUploadAllCommand(
        versionNr: number
    ): Interface.UploadAllInterface {
        switch (versionNr) {
            case 0.2:
                return new V2.UploadAllControllers()
            default:
                throw new Error('Invalid version number')
        }
    }
    /**
     * Creates a reset controller command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.ResetControllerInterface} The reset controller command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createResetCommand(
        versionNr: number
    ): Interface.ResetControllerInterface {
        switch (versionNr) {
            case 0.1:
                return new V1.ResetController()
            case 0.2:
                return new V2.ResetController()
            default:
                throw new Error('Invalid version number')
        }
    }

    /**
     * Creates an add controller command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.AddControllerInterface} The add controller command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createAddCommand(
        versionNr: number
    ): Interface.AddControllerInterface {
        switch (versionNr) {
            case 0.2:
                return new V2.AddController()
            default:
                throw new Error('Invalid version number')
        }
    }

    /**
     * Creates a remove controller command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.RemoveControllerInterface} The remove controller command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createRemoveCommand(
        versionNr: number
    ): Interface.RemoveControllerInterface {
        switch (versionNr) {
            case 0.2:
                return new V2.RemoveController()
            default:
                throw new Error('Invalid version number')
        }
    }

    /**
     * Creates a configure controller command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.ConfigureControllerInterface} The configure controller command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createConfigureCommand(
        versionNr: number
    ): Interface.ConfigureControllerInterface {
        switch (versionNr) {
            case 0.1:
                return new V1.ConfigureController()
            case 0.2:
                return new V2.ConfigureController()
            default:
                throw new Error('Invalid version number')
        }
    }

    /**
     * Creates an edit settings command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.EditSettingsInterface} The edit settings command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createEditSettingsCommand(
        versionNr: number
    ): Interface.EditSettingsInterface {
        switch (versionNr) {
            case 0.1:
                return new V1.EditSettings()
            case 0.2:
                return new V2.EditSettings()
            default:
                throw new Error('Invalid version number')
        }
    }

    /**
     * Creates a view children command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.ViewChildrenInterface} The view children command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createViewChildrenCommand(
        versionNr: number
    ): Interface.ViewChildrenInterface {
        switch (versionNr) {
            case 0.1:
                return new V1.ViewChildren()
            case 0.2:
                return new V2.ViewChildren()
            default:
                throw new Error('Invalid version number')
        }
    }

    /**
     * Creates a rename controller command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.RenameControllerInterface} The rename controller command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createRenameCommand(
        versionNr: number
    ): Interface.RenameControllerInterface {
        switch (versionNr) {
            case 0.2:
                return new V2.RenameController()
            default:
                throw new Error('Invalid version number')
        }
    }

    /**
     * Creates a create project command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.CreateProjectInterface} The create project command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createCreateProjectCommand(
        versionNr: number
    ): Interface.CreateProjectInterface {
        switch (versionNr) {
            case 0:
                return new V2.CreateProject()
            default:
                throw new Error('Invalid version number')
        }
    }

    /**
     * Creates a remove reset controller command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.RemoveResetControllerInterface} The remove reset controller command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createRemoveResetControllerCommand(
        versionNr: number
    ): Interface.RemoveResetControllerInterface {
        switch (versionNr) {
            case 0.2:
                return new V2.RemoveResetController()
            default:
                throw new Error('Invalid version number')
        }
    }

    /**
     * Creates an establish connections command for the specified version.
     *
     * @param {number} versionNr - The version number of the command to create.
     * @returns {Interface.EstablishConnectionsInterface} The establish connections command for the specified version.
     * @throws {Error} If the version number is invalid.
     */
    public createEstablishConnections(
        versionNr: number
    ): Interface.EstablishConnectionsInterface {
        switch (versionNr) {
            case 0.2:
                return new V2.EstablishConnections()
            case 0.1:
                return new V1.EstablishConnections()
            default:
                throw new Error('Invalid version number')
        }
    }
}
