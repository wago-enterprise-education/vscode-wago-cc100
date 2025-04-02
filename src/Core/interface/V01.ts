import { ConnectionManager } from "../../extension/connectionManager";
<<<<<<< HEAD
import { Controller, ControllerItem, ControllerProvider } from "../../extension/view";
=======
import { ControllerProvider } from "../../extension/view";
>>>>>>> 0a6a056 (added factory for controller and split resetCommand between Project- and ControllerFactory)
import { YamlCommands } from "../../migrated/yaml";
import * as Interface from "./projectInterface";
import * as vscode from 'vscode';
import * as fs from 'fs';

export class Upload implements Interface.UploadInterface{
    upload() {
        console.log("Upload command executed");
    }
}
export class ResetController implements Interface.ResetControllerInterface{
    async reset(controller: Controller | undefined, showConfirmation: boolean): Promise<boolean> {
        if(!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open');
<<<<<<< HEAD
            return Promise.resolve(false);
=======
            return "";
>>>>>>> 02ff7d8 (added factory for controller and split resetCommand between Project- and ControllerFactory)
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
<<<<<<< HEAD
            if (!controller) return Promise.resolve(false);
        } 
        let controllerId;
        if(showConfirmation){
            await vscode.window.showWarningMessage(`Remove ${controller.label}`, 'Yes', 'No').then((value) => {
                if(value === 'Yes') controllerId = controller.controllerId;
            });
            if(!controllerId) return Promise.resolve(false);
        } else {
            controllerId = controller.controllerId;
        }
        if(!controllerId) return Promise.resolve(false);
=======
            if (!controller) return "";
        } 
        await vscode.window.showWarningMessage(`Reset ${controller.label}`, 'Yes', 'No').then((value) => {
            if(value === 'Yes') controllerId = controller.controllerId;
        });
        if(!controllerId) return "";
>>>>>>> 02ff7d8 (added factory for controller and split resetCommand between Project- and ControllerFactory)

        try {
            await ConnectionManager.instance.executeCommand(controllerId, 'killall python3');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /home/user/python_bootapplication/*');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /etc/init.d/S99_python_runtime');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /etc/rc.d/S99_python_runtime');
            await ConnectionManager.instance.executeCommand(controllerId, 'killall tail');
            
<<<<<<< HEAD
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
            return Promise.resolve(true);
        } catch (error: any) {
            vscode.window.showErrorMessage('Error reseting controller');
            return Promise.reject(error);
=======
        } catch (error: any) {
            vscode.window.showErrorMessage('Error resetting controller');
>>>>>>> 02ff7d8 (added factory for controller and split resetCommand between Project- and ControllerFactory)
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
    editSettings(element: any) {
        console.log("Edit settings command executed", element);
    }
}
export class ViewChildren implements Interface.ViewChildrenInterface{
    getChildren(element?: Controller | ControllerItem | undefined): vscode.ProviderResult<Controller[] | ControllerItem[]> {
        let controller = JsonCommands.getController();
        if (!controller) return Promise.resolve([]);

        if(!element) {
            let online = false

            async () => {
                try {
                    await ConnectionManager.instance.updateController(0, `${controller.ip}:${controller.port}`, controller.user);
                    await ConnectionManager.instance.ping(0);
                    online = true;
                } catch (error) {
                    console.debug(`Controller is offline. ${error}`);
                }
            }

            return Promise.all([
                new Controller(0, 'Controller', true)
            ]);
        } else {
            if(element instanceof Controller) {

                const settingArray = []

                settingArray.push(new ControllerItem(element.controllerId, setting.connection, controller.connection));
                if(controller.connection === 'ethernet') {
                    settingArray.push(new ControllerItem(element.controllerId, setting.ip, controller.ip));
                }
                if(controller.connection === 'simulator') {
                    settingArray.push(new ControllerItem(element.controllerId, setting.description, controller.simulation_frontend));
                    settingArray.push(new ControllerItem(element.controllerId, setting.description, controller.simulation_backend));
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
<<<<<<< HEAD
export class JsonCommands {

    /**
     * Function to read the content of the wago.yaml file.
     * 
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getSettingsJson() {
        return JSON.parse(fs.readFileSync(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/settings.json`, 'utf8'));
    }

    public static getController() {
        const settings = this.getSettingsJson();
        let connectionType = '';
        if(settings.usb_c) connectionType = 'usb-c';
        if(settings.ethernet) connectionType = 'ethernet';
        if(settings.simulator) connectionType = 'simulator';

        return {
            connection: connectionType,
            simulation_frontend: settings.simulation_frontend,
            simulation_backend: settings.simulation_backend,
            ip: settings.ip,
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
=======
>>>>>>> 21bbbd1 (Refactor WAGO controller engine version and update imports for controller handling)
