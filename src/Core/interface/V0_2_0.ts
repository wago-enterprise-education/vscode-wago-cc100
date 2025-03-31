import { ControllerItem, ControllerProvider } from "../../extension/view";
import { controllerSettings, wagoSettings, YamlCommands } from "../../extension/yaml";
import * as vscode from 'vscode';
import * as Interface from "./interface";
import * as fs from 'fs';

export class Upload implements Interface.UploadInterface{
    upload() {
        console.log("Upload command executed");
    }
}
export class ResetController implements Interface.ResetControllerInterface{
    reset() {
        console.log("Reset command executed");
    }
}
export class AddController implements Interface.AddControllerInterface{
    add() {
        console.log("Add command executed");
    }
}
export class ConfigureController implements Interface.ConfigureControllerInterface{
    configure() {
        console.log("Configure command executed");
    }
}
export class EditSettings implements Interface.EditSettingsInterface{
    async editSettings(controller: ControllerItem | undefined) {
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
    
        let settingToEdit: string;

        if(controller === undefined) {
            const nodes = YamlCommands.getWagoYaml()["nodes"];

            let con = await vscode.window.showQuickPick(
                Object.keys(nodes).map((key: any) => ({
                    id: key,	
                    label: nodes[key].displayname,
                    description: nodes[key].description,
                    online: false
                })),
                {
                    title: 'Pick Controller',
                    canPickMany: false
                }
            );    
            if (con === undefined) return;
            let id = con.id;
        
            settingToEdit = await vscode.window.showQuickPick(
                Object.values(setting),
                {
                    title: 'Choose Setting',
                    canPickMany: false
                }
            ) || '';
            if (!settingToEdit) return;

            await EditSettingsFunctionality.editSetting(id, settingAdapter[settingToEdit as keyof typeof settingAdapter]);
        } else {
            await EditSettingsFunctionality.editSetting(controller.getId(), settingAdapter[controller.setting as keyof typeof settingAdapter]);
        }

        ControllerProvider.instance.refresh();
    }
}
export class ViewChildren implements Interface.ViewChildrenInterface{
    getChildren(element?: any): any {
        console.log("Get children command executed", element);
        return [];
    }
}
//===================================================================================
// EditSettings Functionality
//===================================================================================
export class EditSettingsFunctionality {
    
    public static async editSetting(id: number, settingToEdit: string) {
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
        
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
                    const workspacePath = vscode.workspace.workspaceFolders![0].uri.fsPath;
                    const controllerSrc = await vscode.window.showQuickPick(
                        fs.readdirSync(workspacePath)
                            .map((folder) => {
                                if (fs.existsSync(`${workspacePath}/${folder}/main.py`)) {
                                    return {
                                        label: `${folder}`,
                                        description: `${folder}/main.py`
                                    };
                                }
                                return { label: "" };
                            })
                            .filter((path) => path.label.length > 0 ? true : false)
                            .concat({ label: "New", description: 'Create a new folder' }),
                        {
                            title: 'Add Controller',
                            canPickMany: false
                        }
                    ) || { label: "" };
                    //if (!controllerSrc) return;
                    
                    //TODO - Actually Create New Folder-----------------------------

                    YamlCommands.writeWagoYaml(id, wagoSettings[settingToEdit], controllerSrc.label);
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
                    if (!conType) return;
                    if (conType === 'usb-c') YamlCommands.writeControllerYaml(id, controllerSettings.ip, '192.168.42.42');
                    YamlCommands.writeControllerYaml(id, controllerSettings[settingToEdit], conType);
                    break;

                case "ip": 
                case "port":
                case "user":
                    if (settingToEdit === controllerSettings.ip) YamlCommands.writeControllerYaml(id, controllerSettings.connection, 'usb-c');
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
//===================================================================================