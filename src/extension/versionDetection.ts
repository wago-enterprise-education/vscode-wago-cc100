import * as vscode from 'vscode';
import { ControllerProvider } from './view';
import YAML from 'yaml';
import * as fs from 'fs';

export let ProjectVersion: number = 0;

/**
 * Check if the project is valid by checking if the wago.yaml file is present in the root folder.
 */
export async function verifyProject(): Promise<Boolean> {
    let wagoProject = await findWagoYaml();
    setControllerCountContext();
    return wagoProject;
}

/**
 * Find the wago.yaml file in the workspace.
 */
async function findWagoYaml(): Promise<Boolean> {
    let wagoProject = await vscode.workspace
        .findFiles('**/wago.yaml', '', 1)
        .then(async (files) => {
            if (files.length > 0 && checkIfInRootFolder(files[0])) {
                ProjectVersion = 0.2;
                listenOnFileChangeWagoYaml();
                return true;
            } else {
                await findSettingsJson();
                return false;
            }
        });
    vscode.commands.executeCommand(
        'setContext',
        'projectVersion',
        ProjectVersion
    );
    ControllerProvider.instance.refresh();
    return wagoProject;
}

/**
 * Find the settings.json file in the workspace.
 */
async function findSettingsJson() {
    await vscode.workspace
        .findFiles('**/settings.json', '', 1)
        .then((files) => {
            if (files.length > 0 && checkIfInRootFolder(files[0])) {
                ProjectVersion = 0.1;
                listenOnFileChangeSettingsJson();
                return true;
            }
            ProjectVersion = 0;
            return false;
        });
}

/**
 * Listen for changes on the workspace and check if the wago.yaml file is present.
 */
function listenOnFileChangeWagoYaml() {
    const fileWatcher =
        vscode.workspace.createFileSystemWatcher('**/wago.yaml');

    fileWatcher.onDidChange((uri: vscode.Uri) => {
        if (checkIfInRootFolder(uri)) {
            ProjectVersion = 0.2;
            vscode.commands.executeCommand(
                'setContext',
                'projectVersion',
                ProjectVersion
            );
        } else {
            ProjectVersion = 0;
        }
        setControllerCountContext();
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidCreate((uri: vscode.Uri) => {
        if (checkIfInRootFolder(uri)) {
            ProjectVersion = 0.2;
            vscode.commands.executeCommand(
                'setContext',
                'projectVersion',
                ProjectVersion
            );
        } else {
            ProjectVersion = 0;
        }
        setControllerCountContext();
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidDelete((uri: vscode.Uri) => {
        if (!checkIfInRootFolder(uri)) return;
        ProjectVersion = 0;
        vscode.commands.executeCommand(
            'setContext',
            'projectVersion',
            ProjectVersion
        );
        ControllerProvider.instance.refresh();
    });
}

/**
 * Listen for changes on the workspace and check if the setting.json file is present.
 */
function listenOnFileChangeSettingsJson() {
    const fileWatcher =
        vscode.workspace.createFileSystemWatcher('**/setting.json');

    fileWatcher.onDidChange((uri: vscode.Uri) => {
        vscode.commands.executeCommand(
            'setContext',
            'settingJsonPresent',
            checkIfInRootFolder(uri)
        );
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidCreate((uri: vscode.Uri) => {
        vscode.commands.executeCommand(
            'setContext',
            'settingJsonPresent',
            checkIfInRootFolder(uri)
        );
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidDelete((uri: vscode.Uri) => {
        if (!checkIfInRootFolder(uri)) return;
        vscode.commands.executeCommand(
            'setContext',
            'settingJsonPresent',
            false
        );
        ControllerProvider.instance.refresh();
    });
}

/**
 * Check if the file is in the root folder of the workspace.
 *
 * @param uri Uri of the file to check.
 * @returns True if the file is in the root folder, false otherwise.
 */
function checkIfInRootFolder(uri: vscode.Uri): Boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const folderPath = uri.fsPath.split('\\').slice(0, -1).join('\\');
            if (folderPath === folder.uri.fsPath) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Sets the VS Code context variable `controllerCount` based on the current project version.
 *
 * This function uses the `vscode.commands.executeCommand` API to set the context.
 */
function setControllerCountContext() {
    if (ProjectVersion >= 0.2) {
        vscode.commands.executeCommand(
            'setContext',
            'controllerCount',
            YamlCommands.getControllers()?.length
        );
    } else if (ProjectVersion >= 0.1) {
        vscode.commands.executeCommand('setContext', 'controllerCount', 1);
    } else {
        vscode.commands.executeCommand('setContext', 'controllerCount', 0);
    }
}

type ControllerType = {
    id: number;
    displayname: string;
    description: string;
    engine: string;
    src: string;
    imageVersion: string;
};
/**
 * Represents the settings for a controller.
 *
 * @property connection - The type of connection used by the controller (e.g., "ethernet", "usb-c").
 * @property ip - The IP address of the controller.
 * @property port - The port number used for communication with the controller.
 * @property user - The username for authentication with the controller.
 * @property autoupdate - The auto-update setting for the controller (e.g., "on", "off").
 */
type ControllerSettingsType = {
    connection: string;
    ip: string;
    port: number;
    user: string;
    autoupdate: string;
};
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
     * Function to read the content of the wago.yaml file.
     *
     * @returns The content of the wago.yaml file as a JS object
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
    public static getControllerSettings(id: number): ControllerSettingsType {
        const settings = this.getControllerYaml(id);
        return {
            connection: settings.connection,
            ip: settings.ip,
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
        attribute: wagoSettings,
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
     * In Case of the Port attribute, the String is autmatically converted to a number
     */
    public static writeControllerYaml(
        id: number,
        attribute: controllerSettings,
        value: string
    ) {
        let yaml = this.getControllerYaml(id);
        if (attribute === controllerSettings.port) {
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
        let id = 1;
        while (yaml.nodes[id] != undefined) {
            id++;
        }
        return id;
    }
}
/**
 * Enum representing available settings for the wago.yaml.
 * Wago.yaml-half of the split "setting" from editSettings.ts
 *
 * @enum {string}
 */
export enum wagoSettings {
    displayname = 'displayname',
    description = 'description',
    engine = 'engine',
    src = 'src',
    imageVersion = 'imageVersion',
}
/**
 * Enum representing available settings for the controller.yaml.
 * Controller-half of the split "setting" from editSettings.ts
 *
 * @enum {string}
 */
export enum controllerSettings {
    connection = 'connection',
    ip = 'ip',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate',
}
