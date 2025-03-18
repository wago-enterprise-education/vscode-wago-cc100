import fs from 'fs'
import YAML from 'yaml'
import { window } from 'vscode'
import * as vscode from 'vscode'

export class YamlCommands {
    
    /**
     * Function to read the content of the wago.yaml file.
     * 
     * @returns The content of the wago.yaml file as a JS object
     */
    public static readWagoYaml() {
        return YAML.parse(fs.readFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, 'utf8'));
    }

    /**
     * Method for changing a attribute of a yaml file.
     * 
     * @param path Path where the operating file is located.
     * @param attribute The attibute of the yaml file to be changed
     * @param value The new value of the attribute
     */
    public static write(path: string, attribute: settings, value: string | boolean) {
        let yaml = YAML.parse(fs.readFileSync(path, 'utf8'));
        yaml[attribute] = value;
        fs.writeFileSync(path, YAML.stringify(yaml, null, "\t"))
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
    public static async createController(context: vscode.ExtensionContext, displayname: string, description: string, engine: string, src: string, img: string) {
        

        //Addition of the Controller to wago.yaml
        let id = this.findNextID();

        let obj = {
            nodes: {
                [id]: {
                    displayname: displayname,
                    description: description,
                    engine: engine,
                    src: src,
                    img: img
                }
            }
        }

        let yaml = this.readWagoYaml();
        yaml.nodes[id] = obj.nodes[id];

        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(yaml, null, "\t"));

        //Adding Controller to corresponding controllers/controller[id].yaml file
        fs.copyFile(`${context.extensionPath}.res/template/controller/controller1.yaml`, `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controllers/controller${id}.yaml`, (err) => {
            if (err) throw err;
        });
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
        let yaml = this.readWagoYaml();
        delete yaml.nodes[id];
        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(yaml, null, "\t"));

        //remove Controller configuration file
        fs.unlinkSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/controllers/controller${id}.yaml`);
    }

    
    /**
     * Finds the next available ID for a controller in the Wago YAML configuration.
     *
     * This method reads the Wago YAML configuration and iterates through the existing
     * controller IDs to find the next available ID that is not already in use.
     *
     * @returns {number} The next available controller ID.
     */
    private static findNextID() {
        let yaml = this.readWagoYaml();
        let id = 1;
        while (yaml.controllers[id] != undefined) {
            id++;
        }
        return id;
    }

    /*public registerYamlCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.create-controller", async () => {
            
            await YamlCommands.createController(context);

        }));

        // context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.write-controller", async () => {

        //     let yaml = (`${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller1.yaml`);
        //     await YamlCommands.write(yaml, settings.user, "test");

        // }));
    } */
}


/**
 * Enum representing various settings for the application.
 * 
 * @enum {string}
 */
export enum settings {
    version = 'version',
    connection = 'connection',
    ip_adress = 'ip_adress',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate'
}
