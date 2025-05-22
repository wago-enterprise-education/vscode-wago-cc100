import * as vscode from 'vscode'
import { ConnectionManager } from '../../extension/connectionManager'
import { ControllerProvider } from '../../extension/view'
import * as Interface from '../interfaces/controllerInterface'

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
    async reset(controller: any) {
        let controllerId = controller.controllerId

        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Reset Controller',
                cancellable: false,
            },
            async (progress, token) => {
                try {
                    // Starting at 50 because it continues the Progress bar from the reset in the V2.ts code
                    progress.report({
                        increment: 50,
                        message: 'Deactivating Digital Outputs...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /sys/kernel/dout_drv/DOUT_DATA'
                    )
                    progress.report({
                        increment: 4,
                        message: 'Deactivating Analog Outputs...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage1_powerdown'
                    )
                    progress.report({
                        increment: 2,
                        message: 'Deactivating Analog Outputs...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage1_raw'
                    )
                    progress.report({
                        increment: 2,
                        message: 'Deactivating Analog Outputs...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage2_powerdown'
                    )
                    progress.report({
                        increment: 2,
                        message: 'Deactivating Analog Outputs...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage2_raw'
                    )
                    progress.report({
                        increment: 2,
                        message: 'Deactivating LEDs...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /dev/leds/run-green/brightness'
                    )
                    progress.report({
                        increment: 3,
                        message: 'Deactivating LEDs...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /dev/leds/run-red/brightness'
                    )
                    progress.report({
                        increment: 3,
                        message: 'Deactivating Docker...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        '/etc/config-tools/config_docker deactivate'
                    )
                    progress.report({
                        increment: 10,
                        message: 'Stopping Python Runtime...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        '/etc/config-tools/config_runtime runtime-version=1'
                    )
                    progress.report({
                        increment: 10,
                        message: 'Starting CodeSys3...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'codesys3 &'
                    )
                    progress.report({
                        increment: 5,
                        message: 'Deactivate Portforwarding...',
                    })
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'grep -q "LOCAL_PORT_FORWARDING=true" /etc/dropbear/dropbear.conf && sed -i "s/LOCAL_PORT_FORWARDING=true/LOCAL_PORT_FORWARDING=false/" /etc/dropbear/dropbear.conf'
                    )
                    progress.report({
                        increment: 5,
                        message: 'Finished Resetting',
                    })
                    ControllerProvider.instance.refresh()

                    progress.report({ message: 'Finished Resetting' })
                    return new Promise<void>((resolve) => {
                        setTimeout(() => {
                            resolve()
                        }, 2000)
                    })
                } catch (error: any) {
                    progress.report({
                        increment: 100,
                        message: 'An Error occured while Resetting',
                    })
                    console.error(`Error resetting controller: ${error}`)
                    vscode.window.showErrorMessage(
                        'An Error occured while Resetting the Controller'
                    )
                }
            }
        )
    }
}
