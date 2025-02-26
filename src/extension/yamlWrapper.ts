import * as vscode from 'vscode'
import fs from 'fs'
import YAML from 'yaml'



export class yamlWrapper {

    public registerCommands(context: vscode.ExtensionContext) {



        context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.write-controller", async (id: any, displaynameGUI: any, descriptionGUI: any, engineGUI: any, srcGUI: any) => {

            let obj = {
                controllers: {
                    id: {
                        displayname: displaynameGUI,
                        description: descriptionGUI,
                        engine: engineGUI,
                        src: srcGUI
                    }
                }
            }
            
            fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(obj));

        }));

        context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.delete-controller", async (id) => {

            const str = fs.readFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, 'utf8');
            let obj = YAML.parse(str);
            
            obj.delete controllers.id;
        }));

    }
}