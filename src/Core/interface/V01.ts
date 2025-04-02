import { ConnectionManager } from "../../extension/connectionManager";
import { Controller, ControllerItem, ControllerProvider } from "../../extension/view";
import * as Interface from "./projectInterface";
import * as vscode from 'vscode';
import * as fs from 'fs';

export class Upload implements Interface.UploadInterface{
    upload() {
        console.log("Upload command executed");
    }
}
export class ResetController implements Interface.ResetControllerInterface{
    async reset(controller: Controller | undefined, showConfirmation: boolean) {
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return "";
        }
        if(!controller) {
            controller ={controllerId: 0, label: "Controller", online: false} 
        }
        let controllerId;
        if(showConfirmation){
            await vscode.window.showWarningMessage(`Reset ${controller.label}?`, 'Yes', 'No').then((value) => {
                if(value === 'Yes') controllerId = controller.controllerId;
            });
        } else {
            controllerId = controller.controllerId;
        }
        if(!controllerId) return "";
        try {
            await ConnectionManager.instance.executeCommand(controllerId, 'killall python3');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /home/user/python_bootapplication/*');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /etc/init.d/S99_python_runtime');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /etc/rc.d/S99_python_runtime');
            await ConnectionManager.instance.executeCommand(controllerId, 'killall tail');
            
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error resetting controller: ${error}`);

        }
        return "CC100";
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
            settingToEdit = await vscode.window.showQuickPick(
                Object.values(setting),
                {
                    title: 'Choose Setting',
                    canPickMany: false
                }
            ) || '';
            if (!settingToEdit) return;

            await EditSettingsFunctionality.editSetting(0 , settingAdapter[settingToEdit as keyof typeof settingAdapter]);
        } else {
            await EditSettingsFunctionality.editSetting(0 , settingAdapter[controller.setting as keyof typeof settingAdapter]);
        }

        ControllerProvider.instance.refresh();
    }
}
export class EstablishConnections implements Interface.EstablishConnectionsInterface{
    async establishConnections() {
        const controller = JsonCommands.getController();
        await ConnectionManager.instance.addController(0, `${controller.ip}:${controller.port}`, controller.user)
    }
}
export class ViewChildren implements Interface.ViewChildrenInterface{
    async getChildren(element?: Controller | ControllerItem | undefined): Promise<vscode.ProviderResult<Controller[] | ControllerItem[]>> {
        let controller = JsonCommands.getController();
        if (!controller) return Promise.resolve([]);

        if(!element) {
            let online = false

            try {
                await ConnectionManager.instance.updateController(0, `${controller.ip}:${controller.port}`, controller.user);
                await ConnectionManager.instance.ping(0);
                online = true;
            } catch (error) {
                console.debug(`Controller is offline. ${error}`);
            }

            return Promise.all([
                new Controller(0, 'Controller', online)
            ]);
        } else {
            if(element instanceof Controller) {

                const settingArray = []

                settingArray.push(new ControllerItem(element.controllerId, setting.connection, controller.connection));
                if(controller.connection === 'ethernet') {
                    settingArray.push(new ControllerItem(element.controllerId, setting.ip, controller.ip));
                
                }
                settingArray.push(new ControllerItem(element.controllerId, setting.port, controller.port));
                settingArray.push(new ControllerItem(element.controllerId, setting.user, controller.user));
                settingArray.push(new ControllerItem(element.controllerId, setting.autoupdate, controller.autoupdate));

                return Promise.resolve(settingArray);
            }
        }
        return Promise.resolve([]);
    }
}
export class JsonCommands {

    /**
     * Function to read the content of the wago.yaml file.
     * 
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getSettingsJson() {
        return JSON.parse(fs.readFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/settings.json`, 'utf8'));
    }

    public static writeJson(id: number, attribute: settingsJson, value: string) {
        let json = this.getSettingsJson();
        json[attribute] = value;
        console.log(JSON.stringify(json));
        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/settings.json`, JSON.stringify(json, null, "\t"));
    }

    public static getController() {
        const settings = this.getSettingsJson();
        let connectionType = '';
        if(settings. ethernet === 'true') connectionType = 'ethernet';
        if(settings.usb_c === 'true') connectionType = 'usb-c';

        return {
            connection: connectionType,
            ip: settings.ip_adress,
            port: settings.port,
            user: settings.user,
            autoupdate: settings.autoupdate
        }
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

export enum settingsJson {
    connection = 'connection',
    usb_c = 'usb_c',
    simulator = 'simulator',
    ethernet = 'ethernet',
    ip_adress = 'ip_adress',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate'
}

export class EditSettingsFunctionality {
    
    public static async editSetting(id: number, settingToEdit: string) {
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
        let content
        switch (settingToEdit) {
            // wago.yaml Setting
            case "description":
                content = await this.getInput();
                if (!content) return;
                // YamlCommands.writeWagoYaml(id, wagoSettings[settingToEdit], content);
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

                // YamlCommands.writeWagoYaml(id, wagoSettings[settingToEdit], controllerSrc.label);
                break;
            case "imageVersion": 
                //TODO - Not yet determined how they will be managed-------------------------------------------
                break;
            case "connection":
                let conType = await vscode.window.showQuickPick(['usb-c', 'ethernet'], {
                    title: 'Connection Type',
                    canPickMany: false
                }) || '';
                if (!conType) return;
                switch (conType) {
                    case 'usb-c':
                        JsonCommands.writeJson(0, settingsJson.usb_c, 'true');
                        JsonCommands.writeJson(0, settingsJson.simulator, 'false');
                        JsonCommands.writeJson(0, settingsJson.ethernet, 'false');
                        JsonCommands.writeJson(0, settingsJson.ip_adress, '192.168.42.42');
                        break;
                    case 'ethernet':
                        JsonCommands.writeJson(0, settingsJson.usb_c, 'false');
                        JsonCommands.writeJson(0, settingsJson.simulator, 'false');
                        JsonCommands.writeJson(0, settingsJson.ethernet, 'true');
                        break
                    default:
                        break;
                }
                break;

            case "ip": 
                content = await this.getInput();
                if (!content) return;
                JsonCommands.writeJson(0, settingsJson.ip_adress, content);
                break;
            case "port":
            case "user":
                content = await this.getInput();
                if (!content) return;
                JsonCommands.writeJson(0, settingsJson[settingToEdit], content);
                break;

            // controller.yaml QuickPick
            case "autoupdate": 
                let status = await vscode.window.showQuickPick(['on', 'off'], {
                    title: 'Autoupdate',
                    canPickMany: false
                }) || '';
                if (!status) return;

                JsonCommands.writeJson(0, settingsJson[settingToEdit], status);
                break;
            default :
                vscode.window.showErrorMessage("Invalid Attribute Type");
            break;
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