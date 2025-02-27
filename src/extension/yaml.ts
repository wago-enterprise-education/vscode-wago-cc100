import fs from 'fs'
import YAML from 'yaml'
import { window } from 'vscode'
import * as vscode from 'vscode'

export class YamlCommands {
    /**
     * Method for reading the content of a yaml-file.
     * 
     * @param path Path where the operating file is located.
     * @returns an object that represents the yaml file.
     */
    public static readYamlFile(path: string) {
        return YAML.parse(fs.readFileSync(path, 'utf8'));
    }

    /**
     * Method for changing a attribute of a yaml file.
     * 
     * @param path Path where the operating file is located.
     * @param attribute The attibute of the yaml file to be changed
     * @param value The new value of the attribute
     */
    public static write(path: string, attribute: settings, value: string | boolean) {
        let yaml = this.readYamlFile(path);
        yaml[attribute] = value;
        fs.writeFileSync(path, YAML.stringify(yaml, null, "\t"))
    }

    /**
     * Method for adding Controllers to the wago.yaml and correspondingfile
     * 
     * Note: Must be "awaited" on call to work
     */
    public static async createController() {
        
        let displayname = await window.showInputBox({ prompt: "Enter the displayname of the controller" });
        let description = await window.showInputBox({ prompt: "Enter the description of the controller" }); 
        let engine = await window.showInputBox({ prompt: "Enter the engine of the controller" });
        let src = await window.showInputBox({ prompt: "Enter the src of the controller" });

        let id = this.findNextID();

        let obj = {
            controllers: {
                [id]: {
                    displayname: [displayname],
                    description: [description],
                    engine: [engine],
                    src: [src]
                }
            }
        }

        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(obj));
    }

    private static findNextID() {
        let yaml = this.readYamlFile(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`);
        let id = 0;
        while (yaml.controllers[id] != undefined) {
            id++;
        }
        return id;
    }



    public registerYamlCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.create_controller", async () => {
            
            await YamlCommands.createController();

        }));
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