import { Controller, ControllerItem, ControllerProvider } from "../../extension/view";
import * as vscode from 'vscode';
import * as Interface from "./interface";
import * as fs from 'fs';
import { ConnectionManager } from "../../extension/connectionManager";
import YAML from 'yaml';

const FOLDER_REGEX = '^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^.]*)?$)[^<>:"/\\|?*\x00-\x1F]*[^<>:"/\\|?*\x00-\x1F\ .]$';

export class Upload implements Interface.UploadInterface{
    upload() {
        console.log("Upload command executed");
    }
}
export class ResetController implements Interface.ResetControllerInterface{
    async reset(controller: any) {
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
            return;
        }
        let controllerId = null;
        if(!controller) {
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    id: controller.id,	
                    label: controller.displayname,
                    description: controller.description
                })),
                {
                    title: 'Reset Controller',
                    canPickMany: false
                }
            );
            if (!controller) return;
        } 
        await vscode.window.showWarningMessage(`Reset ${controller.label}`, 'Yes', 'No').then((value) => {
            if(value === 'Yes') controllerId = controller.controllerId;
        });
        if(!controllerId) return;

        try {
            await ConnectionManager.instance.executeCommand(controllerId, 'docker container stop #Container name');
            await ConnectionManager.instance.executeCommand(controllerId, 'docker rm #Container name');
            await ConnectionManager.instance.executeCommand(controllerId, 'docker irm #Image name');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /home/user/python_bootapplication/*');
            
            await ConnectionManager.instance.executeCommand(controllerId, 'echo 0 >> /sys/kernel/dout_drv/DOUT_DATA');
            await ConnectionManager.instance.executeCommand(controllerId, 'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage1_powerdown');
            await ConnectionManager.instance.executeCommand(controllerId, 'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage1_raw');
            await ConnectionManager.instance.executeCommand(controllerId, 'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage2_powerdown');
            await ConnectionManager.instance.executeCommand(controllerId, 'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage2_raw');
            await ConnectionManager.instance.executeCommand(controllerId, 'echo 0 >> /dev/leds/run-green/brightness');
            await ConnectionManager.instance.executeCommand(controllerId, 'echo 0 >> /dev/leds/run-red/brightness');
            await ConnectionManager.instance.executeCommand(controllerId, 'codesys3 &');

            vscode.window.showInformationMessage(`Controller ${controller.label} reset`);
            ControllerProvider.instance.refresh();
        } catch (error: any) {
            vscode.window.showErrorMessage('Error reseting controller');
        }
    }
}
export class AddController implements Interface.AddControllerInterface{
    async addController(context: vscode.ExtensionContext) {
        const controllerName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the controller',
            title: 'Add Controller / Name',
            ignoreFocusOut: true
        }) || '';

        if(!controllerName) return;

        const controllerDescription = await vscode.window.showInputBox({
            prompt: 'Enter the description of the controller',
            title: 'Add Controller / Description',
            ignoreFocusOut: true
        }) || '';

        const controllerEngine = await vscode.window.showQuickPick(['CC100-v0.1', 'CC100-v0.2'], {
            title: 'Add Controller / Engine',
            canPickMany: false,
            ignoreFocusOut: true
        }) || 'CC100-v0.2';

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
                title: 'Add Controller / Source',
                canPickMany: false,
                ignoreFocusOut: true
            }
        ) || { label: "src" };

        if(controllerSrc.label === 'New') {
            const newFolder = await vscode.window.showInputBox({
                prompt: 'Enter the name of the folder',
                title: 'Add Controller / Source / New Folder',
                ignoreFocusOut: true,
                validateInput: (value: string) => {
                    if(!RegExp(FOLDER_REGEX).test(value)) {
                        return 'Invalid folder name';
                    }
                    if(fs.existsSync(`${workspacePath}/${value}`)) {
                        return 'Folder already exists';
                    }
                    return null;
                }
            }) || '';

            if(newFolder) {
                fs.mkdirSync(`${workspacePath}/${newFolder}`);
                fs.cpSync(`${context.extensionPath}/res/template/src/main.py`, `${workspacePath}/${newFolder}/main.py`)
                controllerSrc.label = newFolder;
            } else {
                controllerSrc.label = 'src';
            }
        }

        await YamlCommands.createController(context, controllerName, controllerDescription, controllerEngine, controllerSrc.label, "latest");
        vscode.window.showInformationMessage(`Controller ${controllerName} added`);
        ControllerProvider.instance.refresh();
    }
}
export class RemoveController implements Interface.RemoveControllerInterface{
    removeController(controller: Controller | undefined, showConfirmation: boolean){

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
            let con = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    id: controller.id,	
                    label: controller.displayname,
                    description: controller.description
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
            await EditSettingsFunctionality.editSetting(controller.controllerId, settingAdapter[controller.setting as keyof typeof settingAdapter]);
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
// File Functionality
//===================================================================================
type ControllerType = {
    id: number,
    displayname: string,
    description: string,
    engine: string,
    src: string,
    imageVersion: string
}
type ControllerSettingsType = {
    connection: string,
    ip: string,
    port: number,
    user: string,
    autoupdate: string
}
export class YamlCommands {

    /**
     * Function to read the content of the wago.yaml file.
     * 
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getWagoYaml() {
        return YAML.parse(fs.readFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, 'utf8'));
    }

    /**
     * Function to read the content of the wago.yaml file.
     * 
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getControllerYaml(id: number) {
        return YAML.parse(fs.readFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`, 'utf8'));
    }

    public static getControllers(): Array<ControllerType> {
        const nodes = this.getWagoYaml().nodes;
        return Object.keys(nodes).map((key: string) => ({
            id: Number.parseInt(key),	
            displayname: nodes[key].displayname,
            description: nodes[key].description,
            engine: nodes[key].engine,
            src: nodes[key].src,
            imageVersion: nodes[key].imageVersion
        }))
    }

    public static getController(id: number): ControllerType | undefined {
        return this.getControllers().find(controller => controller.id === id);
    }

    public static getControllerSettings(id: number): ControllerSettingsType {
        const settings = this.getControllerYaml(id);
        return {
            connection: settings.connection,
            ip: settings.ip,
            port: settings.port,
            user: settings.user,
            autoupdate: settings.autoupdate
        }
    }

    /**
     * Method for changing the contents of the wago.yaml
     * 
     * @param id Id of the controller
     * @param attribute Name of the attribute that is to be changed (enum)
     * @param value Value that is to be written into the attribute (string)
     */
    public static writeWagoYaml(id: number, attribute: wagoSettings, value: string) {
        let yaml = this.getWagoYaml();
        yaml.nodes[id][attribute] = value;
        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(yaml, null, "\t"));
    }

    /**
     * Method for changing the contents of the controller.yaml
     * 
     * @param id Id of the controller
     * @param attribute Name of the attribute that is to be changed (enum)
     * @param value Value that is to be written into the attribute (string)
     * 
     * In Case of the Port attribute, the String is autmatically converted to a number
     */
    public static writeControllerYaml(id: number, attribute: controllerSettings, value: string) {
        let yaml = this.getControllerYaml(id);
        if (attribute === controllerSettings.port) {
            yaml[attribute] = Number(value);
        } else {
            yaml[attribute] = value;
        }
        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`, YAML.stringify(yaml, null, "\t"));
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
    public static async createController(context: vscode.ExtensionContext, displayname: string, description: string, engine: string, src: string, imageVersion: string) {
        
        //Addition of the Controller to wago.yaml
        let id = this.findNextID();

        let obj = {
            nodes: {
                [id]: {
                    displayname: displayname,
                    description: description,
                    engine: engine,
                    src: src,
                    imageVersion: imageVersion
                }
            }
        }

        let yaml = this.getWagoYaml();
        yaml.nodes[id] = obj.nodes[id];

        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(yaml, null, "\t"));

        //Adding Controller to corresponding controllers/controller[id].yaml file
        fs.cpSync(`${context.extensionPath}/res/template/controller/controller1.yaml`, `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`);
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
        let yaml = this.getWagoYaml();
        delete yaml.nodes[id];
        fs.writeFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`, YAML.stringify(yaml, null, "\t"));

        //remove Controller configuration file
        let controllerPath = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`;
        if(fs.existsSync(controllerPath)) fs.unlinkSync(controllerPath);
    }
    
    /**
     * Finds the next available ID for a controller in the Wago YAML configuration.
     *
     * This method reads the Wago YAML configuration and iterates through the existing
     * controller IDs to find the next available ID that is not already in use.
     *
     * @returns {number} The next available controller ID.
     */
    private static findNextID(): number {
        let yaml = this.getWagoYaml();
        let id = 1;
        while (yaml.nodes[id] != undefined) {
            id++;
        }
        return id;
    }
}
/**
 * Enum representing available settings for the wago.yaml.
 * Wago.yaml-half of the split "setting" from editSettings.ts
 * 
 * @enum {string}
 */
export enum wagoSettings {
    displayname = 'displayname',
    description = 'description',
    engine = 'engine',
    src = 'src',
    imageVersion = 'imageVersion'
}
/**
 * Enum representing available settings for the controller.yaml.
 * Controller-half of the split "setting" from editSettings.ts
 * 
 * @enum {string}
 */
export enum controllerSettings {
    connection = 'connection',
    ip = 'ip',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate'
}