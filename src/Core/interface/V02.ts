import { Controller, ControllerItem, ControllerProvider} from "../../extension/view";
import * as vscode from 'vscode';
import * as Interface from "./projectInterface";
import { ConnectionManager } from "../../extension/connectionManager";
import * as fs from 'fs';
import YAML from 'yaml';

const FOLDER_REGEX = '^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^.]*)?$)[^<>:"/\\|?*\x00-\x1F]*[^<>:"/\\|?*\x00-\x1F\ .]$';

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
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,	
                    label: controller.displayname,
                    description: controller.description,
                    online: true
                })),
                {
                    title: 'Reset Controller',
                    canPickMany: false
                }
            );
            if (!controller) return "";
        } 

        let controllerId;
        
        if(showConfirmation){
            await vscode.window.showWarningMessage(`Reset ${controller.label}`, 'Yes', 'No').then((value) => {
                if(value === 'Yes') controllerId = controller.controllerId;
            });
            if(!controllerId) return "";
        } else {
            controllerId = controller.controllerId;
        }

        if(!controllerId) return "";
            if (!controller) return "";
        

        await vscode.window.showWarningMessage(`Reset ${controller.label}`, 'Yes', 'No').then((value) => {
            if(value === 'Yes') controllerId = controller.controllerId;
        });

        if(!controllerId) {
            vscode.window.showErrorMessage("No Controller ID");
            return ""
        };
        try {
            await ConnectionManager.instance.executeCommand(controllerId, 'docker container stop #Container name');
            await ConnectionManager.instance.executeCommand(controllerId, 'docker rm #Container name');
            await ConnectionManager.instance.executeCommand(controllerId, 'docker irm #Image name');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /home/user/python_bootapplication/*');

        } catch (error: any) {
            vscode.window.showErrorMessage('Error reseting controller');
        }
        return YamlCommands.getController(controllerId)?.engine || "";
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
    async removeController(controller: Controller | undefined, showConfirmation: boolean){
        let selectedController;
        if(controller) {
            selectedController = controller;
        } else {
            selectedController = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,	
                    label: controller.displayname,
                    description: controller.description
                })),
                {
                    title: 'Remove Controller',
                    canPickMany: false
                }
            );
            if (!selectedController) return;
        } 

        let controllerId;
        if(showConfirmation){
            await vscode.window.showWarningMessage(`Remove ${selectedController.label}`, 'Yes', 'No').then((value) => {
                if(value === 'Yes') controllerId = selectedController.controllerId;
            });
            if(!controllerId) return;
        } else {
            controllerId = selectedController.controllerId;
        }
        
        YamlCommands.removeController(controllerId);
        vscode.window.showInformationMessage(`Controller ${selectedController.label} removed`);

        ControllerProvider.instance.refresh();
    }
}
export class ConfigureController implements Interface.ConfigureControllerInterface{
    configure() {
        
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
    getChildren(element?: Controller | ControllerItem | undefined): vscode.ProviderResult<Controller[] | ControllerItem[]> {
        if(!element) {
            let controllers = YamlCommands.getControllers();
            if (!controllers) return Promise.resolve([]);

            return Promise.all(
                controllers.map(async (controller) => {
                    let online = false;
                    try {
                        let settings = YamlCommands.getControllerSettings(controller.id);
                        await ConnectionManager.instance.updateController(controller.id, `${settings.ip}:${settings.port}`, settings.user);
                        await ConnectionManager.instance.ping(controller.id);
                        online = true;
                    } catch (error) {
                        console.debug(`Controller ${controller.id} is offline. ${error}`);
                    }
                    return new Controller(controller.id, controller.displayname, online);
                })
            );
        } else {
            if(element instanceof Controller) {
                const settings = YamlCommands.getControllerSettings(element.controllerId);
                if (!settings) return Promise.resolve([]);
                
                const controller = YamlCommands.getController(element.controllerId);

                const settingArray = []

                settingArray.push(new ControllerItem(element.controllerId, setting.connection, settings.connection));
                if(settings.connection === 'ethernet') {
                    settingArray.push(new ControllerItem(element.controllerId, setting.ip, settings.ip));
                }
                settingArray.push(new ControllerItem(element.controllerId, setting.port, settings.port));
                settingArray.push(new ControllerItem(element.controllerId, setting.user, settings.user));
                settingArray.push(new ControllerItem(element.controllerId, setting.autoupdate, settings.autoupdate));

                return Promise.resolve([
                    new ControllerItem(element.controllerId, setting.description, controller?.description),
                    new ControllerItem(element.controllerId, setting.engine, controller?.engine),
                    new ControllerItem(element.controllerId, setting.imageVersion, controller?.imageVersion),
                    new ControllerItem(element.controllerId, setting.src, controller?.src),

                ].concat(settingArray));
            }
        }
        return Promise.resolve([]);
    }
}
export class RenameController implements Interface.RenameControllerInterface{
    async renameController(controller: Controller | undefined){
        let newController;
        if(controller) {
            newController = controller;
        } else {
            const controllers = YamlCommands.getControllers();
            if(controllers.length > 1) {
                newController = await vscode.window.showQuickPick(controllers.map(controller => {
                    return {
                        label: controller.displayname,
                        description: controller.description,
                        controllerId: controller.id,
                    };
                }), {
                    title: 'Rename Controller',
                    canPickMany: false
                });
            } else {
                newController = {
                    label: controllers[0].displayname,
                    controllerId: controllers[0].id,
                }
            }
        }
        if(!newController) return;

        const controllerName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the controller',
            title: 'Rename Controller',
            value: newController.label,
        }) || '';
        if(!controllerName) return;

        YamlCommands.writeWagoYaml(newController.controllerId, wagoSettings.displayname, controllerName);
    }
}
export class CreateProject implements Interface.CreateProjectInterface{
    async createController(context: vscode.ExtensionContext){
        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the project',
            title: 'Create Project',
            validateInput: (value: string) => {
                if(!RegExp(FOLDER_REGEX).test(value)) {
                    return 'Invalid project name';
                }
                return null;
            }
        })

        if(!projectName) return;

        await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Project Destination'
        }).then(async (uri) => {
            if(uri && projectName) {
                try {
                    fs.mkdirSync(`${uri[0].fsPath}/${projectName}`);
                    fs.cpSync(`${context.extensionPath}/res/template`, `${uri[0].fsPath}/${projectName}`, { recursive: true });
                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(`${uri[0].fsPath}/${projectName}`));
                } catch (error: any) {
                    vscode.window.showErrorMessage('Project already exists');
                }
            }
        })
    }
}
export class RemoveResetController implements Interface.RemoveResetControllerInterface{
    async removeResetController(controller: Controller | undefined){
        if(!controller) {
            controller = await vscode.window.showQuickPick(
                YamlCommands.getControllers().map((controller) => ({
                    controllerId: controller.id,	
                    label: controller.displayname,
                    description: controller.description,
                    online: true
                })),
                {
                    title: 'Reset Controller',
                    canPickMany: false
                }
            );
        } 
        return controller;
    };
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