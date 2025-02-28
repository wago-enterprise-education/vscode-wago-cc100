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
     * Method for adding Controllers to the wago.yaml and corresponding Controllerfile.
     */
    public static async createController(context: vscode.ExtensionContext) {
        
        //To be converted to attributes of the function
        let displaynameInput = await window.showInputBox({ prompt: "Enter the displayname of the controller" });
        let descriptionInput = await window.showInputBox({ prompt: "Enter the description of the controller" }); 
        let engineInput = await window.showInputBox({ prompt: "Enter the engine of the controller" });
        let srcInput = await window.showInputBox({ prompt: "Enter the src of the controller" });

        //Addition of the Controller to wago.yaml
        let id = this.findNextID();

        let obj = {
            nodes: {
                [id]: {
                    displayname: [displaynameInput],
                    description: [descriptionInput],
                    engine: [engineInput],
                    src: [srcInput]
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

    public static removeController(id: number) {
        //remove from wago.yaml
        let yaml = this.readWagoYaml();
        delete yaml.nodes[id];
        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(yaml, null, "\t"));

        //remove Controller configuration file
        fs.unlinkSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/controllers/controller${id}.yaml`);
    }

    private static findNextID() {
        let yaml = this.readWagoYaml();
        let id = 1;
        while (yaml.controllers[id] != undefined) {
            id++;
        }
        return id;
    }

    public registerYamlCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.create-controller", async () => {
            
            await YamlCommands.createController(context);

        }));

        // context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.write-controller", async () => {

        //     let yaml = (`${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller1.yaml`);
        //     await YamlCommands.write(yaml, settings.user, "test");

        // }));
    }
}

// enum for all attributes contained in the settings.yaml
export enum settings {
    version = 'version',
    usb_c = 'usb_c',
    ethernet = 'ethernet',
    ip_adress = 'ip_adress',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate'
}
