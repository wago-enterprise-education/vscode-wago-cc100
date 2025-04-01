import { ConnectionManager } from "../../extension/connectionManager";
import { ControllerProvider } from "../../extension/view";
import { YamlCommands } from "../../migrated/yaml";
import * as Interface from "./interface";
import * as vscode from 'vscode';

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
            await ConnectionManager.instance.executeCommand(controllerId, 'killall python3');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /home/user/python_bootapplication/*');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /etc/init.d/S99_python_runtime');
            await ConnectionManager.instance.executeCommand(controllerId, 'rm -rf /etc/rc.d/S99_python_runtime');
            await ConnectionManager.instance.executeCommand(controllerId, 'killall tail');

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
    getChildren(element?: any): any {
        console.log("Get children command executed", element);
        return [];
    }
}