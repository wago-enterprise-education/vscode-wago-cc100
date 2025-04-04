import * as vscode from 'vscode';
import { ConnectionManager } from '../../extension/connectionManager';
import { ControllerProvider } from '../../extension/view';
import * as Interface from './controllerInterface';

export class ResetController implements Interface.ResetControllerInterface {
    /**
     * Resets the specified controller by executing a series of commands to reset its hardware components
     * and restart its runtime environment. Displays a success message upon completion or an error message
     * if the reset process fails.
     *
     * @param controller - The controller object containing the `controllerId` and other relevant properties.
     * 
     * @throws Will display an error message if any of the commands fail during execution.
     */
    async reset( controller: any) {
        let controllerId = controller.controllerId;
        try {
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
            vscode.window.showErrorMessage(`Error reseting controller: ${error}`);
        }
    }
}