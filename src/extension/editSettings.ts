import vscode from "vscode";
import { ControllerItem } from "./view";
import { YamlCommands, wagoSettings, controllerSettings } from "./yaml";
import fs from "fs";

export class EditSettings {
    
    public static async editSetting(id: number, settingToEdit: string) {
        
        if (settingToEdit in wagoSettings) {
            switch (settingToEdit) {
                // wago.yaml Setting
                case "displayname": 
                case "description":
                    let content = await this.getInput();
                    if (!content) return;
                    YamlCommands.writeWagoYaml(id, wagoSettings[settingToEdit], content);
                    break;

                // wago.yaml QuickPick
                case "engine":
                    //TODO - No Enums of available engines yet----------------------------------------------
                    break;
                case "src":
                    const controllerSrc = await vscode.window.showQuickPick(
                        vscode.workspace.workspaceFolders!.map((folder: any) => {
                                if (fs.existsSync(`${folder.uri.fsPath}/main.py`)) {
                                    return `${folder.uri.fsPath}`;
                                }
                                return undefined;
                            })
                            .filter((path: string | undefined): path is string => path !== undefined),
                        {
                            title: 'Source of Program',
                            canPickMany: false
                        }
                    ) || '';
                    if (!controllerSrc || controllerSrc === undefined) return;

                    YamlCommands.writeWagoYaml(id, wagoSettings[settingToEdit], controllerSrc);
                    break;
                case "imageVersion": 
                    //TODO - Not yet determined how they will be managed-------------------------------------------
                    break;
            }
            return;

        } else if (settingToEdit in controllerSettings) {
            switch (settingToEdit) {
                // controller.yaml Setting
                case "connection":
                    let conType = await vscode.window.showQuickPick(['usb-c', 'ethernet'], {
                        title: 'Connection Type',
                        canPickMany: false
                    }) || '';
                    if (conType === 'usb-c') YamlCommands.writeControllerYaml(id, controllerSettings.ip, '192.168.42.42');
                    YamlCommands.writeControllerYaml(id, controllerSettings[settingToEdit], conType);
                    break;

                case "ip": 
                    YamlCommands.writeControllerYaml(id, controllerSettings.connection, 'ethernet');

                case "port":
                case "user":
                    let content = await this.getInput();
                    if (!content) return;
                    YamlCommands.writeControllerYaml(id, controllerSettings[settingToEdit], content);
                    break;
    
                // controller.yaml QuickPick
                case "autoupdate": 
                    let status = await vscode.window.showQuickPick(['on', 'off'], {
                        title: 'Autoupdate',
                        canPickMany: false
                    }) || '';
                    if (!status) return;

                    YamlCommands.writeControllerYaml(id, controllerSettings[settingToEdit], status);
                    break;
            }
            return;

        } else {
            vscode.window.showErrorMessage("Invalid Attribute Type");
        }       
    }

    private static async getInput(): Promise<string> {
        let input = await vscode.window.showInputBox({
            prompt: 'Enter the value the Setting should be set to',
            title: 'Set Setting Value'
        }) || '';
        return input;
    }
}

export enum setting {
    displayname = 'Name',
    description = 'Description',
    engine = 'Engine',
    src = 'Source',
    imageVersion = 'Docker Image Version',
    connection = 'Connection',
    ip = 'IP',
    port = 'Port',
    user = 'User',
    autoupdate = 'Autoupdate'
}

export enum settingAdapter {
    Name = "displayname",
    Description = "description",
    Engine = "engine",
    Source = "src",
    'Docker Image Version' = "imageVersion",
    Connection = "connection",
    IP = "ip",
    Port = "port",
    User = "user",
    Autoupdate = "autoupdate"
}