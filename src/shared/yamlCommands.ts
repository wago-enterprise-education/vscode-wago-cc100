import * as vscode from 'vscode';
import * as fs from 'fs';
import YAML from 'yaml';
import {
    ControllerType,
    ControllerSettingsExtendedType,
    WagoSettings,
    ControllerSettings,
} from './types';
import { CONTROLLER_AUTO_ID_START } from './constants';

/**
 * Centralized utility class for managing YAML file operations
 * for both wago.yaml and controller configuration files
 */
export class YamlCommands {
    /**
     * Function to read the content of the wago.yaml file.
     *
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getWagoYaml() {
        return YAML.parse(
            fs.readFileSync(
                `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
                'utf8'
            )
        );
    }

    /**
     * Function to read the content of a controller.yaml file.
     *
     * @returns The content of the controller.yaml file as a JS object
     */
    private static getControllerYaml(id: number) {
        return YAML.parse(
            fs.readFileSync(
                `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`,
                'utf8'
            )
        );
    }

    /**
     * Retrieves an array of controller objects from the Wago YAML configuration.
     *
     * @returns {Array<ControllerType>} An array of controller objects, each containing:
     * - `id`: The numeric identifier of the controller.
     * - `displayname`: The display name of the controller.
     * - `description`: A brief description of the controller.
     * - `engine`: The engine type associated with the controller.
     * - `src`: The source path or URL of the controller.
     * - `imageVersion`: The version of the controller's image.
     */
    public static getControllers(): Array<ControllerType> {
        const nodes = this.getWagoYaml().nodes;
        return Object.keys(nodes).map((key: string) => ({
            id: Number.parseInt(key),
            displayname: nodes[key].displayname,
            description: nodes[key].description,
            engine: nodes[key].engine,
            src: nodes[key].src,
            imageVersion: nodes[key].imageVersion,
        }));
    }

    /**
     * Retrieves a controller by its unique identifier.
     *
     * @param id - The unique identifier of the controller to retrieve.
     * @returns The controller matching the given ID, or `undefined` if no match is found.
     */
    public static getController(id: number): ControllerType | undefined {
        return this.getControllers().find((controller) => controller.id === id);
    }

    /**
     * Retrieves the controller settings for a given controller ID.
     *
     * @param id - The unique identifier of the controller.
     * @returns An object containing the controller settings, including:
     * - `connection`: The connection type or protocol.
     * - `ip`: The IP address of the controller.
     * - `port`: The port number used for communication.
     * - `user`: The username for authentication.
     * - `autoupdate`: A flag indicating whether auto-update is enabled.
     */
    public static getControllerSettings(
        id: number
    ): ControllerSettingsExtendedType {
        const settings = this.getControllerYaml(id);
        return {
            connection: settings.connection,
            ip: settings.ip,
            netmask: settings.netmask,
            gateway: settings.gateway,
            port: settings.port,
            user: settings.user,
            autoupdate: settings.autoupdate,
        };
    }

    /**
     * Method for changing the contents of the wago.yaml
     *
     * @param id Id of the controller
     * @param attribute Name of the attribute that is to be changed (enum)
     * @param value Value that is to be written into the attribute (string)
     */
    public static writeWagoYaml(
        id: number,
        attribute: WagoSettings,
        value: string
    ) {
        let yaml = this.getWagoYaml();
        yaml.nodes[id][attribute] = value;
        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
            YAML.stringify(yaml, null, '\t')
        );
    }

    /**
     * Method for changing the contents of the controller.yaml
     *
     * @param id Id of the controller
     * @param attribute Name of the attribute that is to be changed (enum)
     * @param value Value that is to be written into the attribute (string)
     *
     * In Case of the Port attribute, the String is automatically converted to a number
     */
    public static writeControllerYaml(
        id: number,
        attribute: ControllerSettings,
        value: string
    ) {
        let yaml = this.getControllerYaml(id);
        if (attribute === ControllerSettings.port) {
            yaml[attribute] = Number(value);
        } else {
            yaml[attribute] = value;
        }
        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`,
            YAML.stringify(yaml, null, '\t')
        );
    }

    /**
     * Creates a new controller by prompting the user for necessary details and updating the `wago.yaml` file.
     *
     * This function performs the following steps:
     * 1. Finds the next available ID for the new controller.
     * 2. Adds the new controller details to the `wago.yaml` file.
     * 3. Copies a template controller file to the appropriate location with the new controller's ID.
     *
     * @param context - The extension context provided by VS Code.
     * @returns A promise that resolves when the controller has been created.
     */
    public static async createController(
        context: vscode.ExtensionContext,
        displayname: string,
        description: string,
        engine: string,
        src: string,
        imageVersion: string
    ) {
        //Addition of the Controller to wago.yaml
        let id = this.findNextID();

        let obj = {
            nodes: {
                [id]: {
                    displayname: displayname,
                    description: description,
                    engine: engine,
                    src: src,
                    imageVersion: imageVersion,
                },
            },
        };

        let yaml = this.getWagoYaml();
        yaml.nodes[id] = obj.nodes[id];

        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
            YAML.stringify(yaml, null, '\t')
        );

        //Adding Controller to corresponding controllers/controller[id].yaml file
        fs.cpSync(
            `${context.extensionPath}/res/template/controller/controller1.yaml`,
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`
        );
    }

    /**
     * Removes a controller configuration by its ID.
     *
     * This method performs the following actions:
     * 1. Reads the `wago.yaml` file and removes the controller entry with the specified ID.
     * 2. Writes the updated `wago.yaml` file back to the filesystem.
     * 3. Deletes the corresponding controller configuration file from the `controllers` directory.
     *
     * @param id - The ID of the controller to be removed.
     */
    public static removeController(id: number) {
        //remove from wago.yaml
        let yaml = this.getWagoYaml();
        delete yaml.nodes[id];
        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
            YAML.stringify(yaml, null, '\t')
        );

        //remove Controller configuration file
        let controllerPath = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`;
        if (fs.existsSync(controllerPath)) fs.unlinkSync(controllerPath);
    }

    /**
     * Finds the next available ID for a controller in the Wago YAML configuration.
     *
     * This method reads the Wago YAML configuration and iterates through the existing
     * controller IDs to find the next available ID that is not already in use.
     *
     * @returns {number} The next available controller ID.
     */
    private static findNextID(): number {
        let yaml = this.getWagoYaml();
        let id = CONTROLLER_AUTO_ID_START;
        while (yaml.nodes[id] != undefined) {
            id++;
        }
        return id;
    }
}
