import { YamlCommands, wagoSettings, controllerSettings } from "./yaml";

export class EditSettings {
    
    public static editSetting(id: number, settingToEdit: string) {
        
        if (settingToEdit in wagoSettings) {
            switch (settingToEdit) {
                // wago.yaml Setting
                case "displayname": 
                case "description":
                    let content = vscode.window.showInputBox({
                        prompt: 'Enter the value the Setting should be set to',
                        title: 'Set Setting Value'
                    }) || '';
                    if (!content) return;

                    YamlCommands.writeWagoYaml(id, wagoSettings[settingToEdit], content);
                    break;

                // wago.yaml QuickPick
                case "engine":
                case "src":
                case "imageVersion": 
    
                    break;
            }
            return;

        } else if (settingToEdit in controllerSettings) {
            switch (settingToEdit) {
                // controller.yaml Setting
                case "version":
                case "connection":
                case "ip": 
                case "port":
                case "user":
                    let content = vscode.window.showInputBox({
                        prompt: 'Enter the value the Setting should be set to',
                        title: 'Set Setting Value'
                    }) || '';
                    if (!content) return;

                    YamlCommands.writeControllerYaml(id, controllerSettings[settingToEdit], content);
                    break;
    
                // controller.yaml QuickPick
                case "autoupdate": 
                    let status = vscode.window.showQuickPick(['on', 'off'], {
                        title: 'Add Controller',
                        canPickMany: false
                    }) || '';
                    if (!status) return;

                    break;
            }
            return;

        } else {
            vscode.showErrorMessage("Invalid Attribute Type");
        }       
    }

    public static editSettingInline(id: number, settingToEdit: string, content: string) {

    }
}

export enum setting {
    displayname = 'Name',
    description = 'Description',
    engine = 'Engine',
    src = 'Src',
    imageVersion = 'Docker Image Version',
    version = 'Version',
    connection = 'Connection',
    ip = 'IP',
    port = 'Port',
    user = 'User',
    autoupdate = 'Autoupdate'
}