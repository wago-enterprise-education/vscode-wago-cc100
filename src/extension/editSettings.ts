import { YamlCommands, wagoSettings, controllerSettings } from "./yaml";

export class EditSettings {
    
    public static editSetting(id: number, settingToEdit: string, content: string) {
        if (!content) {
            vscode.window.showErrorMessage('No content given');
            return;
        }

        if (settingToEdit in wagoSettings) {
            switch (settingToEdit) {
                // wago.yaml Setting
                case "displayname": 
                case "description":
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
                    YamlCommands.writeControllerYaml(id, controllerSettings[settingToEdit], content);
                    break;
    
                // controller.yaml QuickPick
                case "autoupdate": 
    
                    break;
            }
            return;

        } else {
            vscode.showErrorMessage("Invalid Attribute Type");
        }

        
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