import fs from 'fs'
import YAML from 'yaml'
import { window } from 'vscode'
import * as vscode from 'vscode'

export class YamlCommands {
    
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
        let yaml = YAML.parse(fs.readFileSync((`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`), 'utf8'));
        let id = 0;
        while (yaml.controllers[id] != undefined) {
            id++;
        }
        return id;
    }



    public registerYamlCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.create-controller", async () => {
            
            await YamlCommands.createController();

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