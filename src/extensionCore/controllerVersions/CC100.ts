import * as vscode from 'vscode';
import { ConnectionManager } from '../../extension/connectionManager';
import { ControllerProvider } from '../../extension/view';
import * as Interface from '../interfaces/controllerInterface';

/**
 * CC100-specific controller operations
 *
 * This module contains controller-specific implementations for the WAGO CC100 device.
 * These classes handle hardware-specific operations that differ from other controller types.
 */

/**
 * Handles CC100-specific reset operations.
 * Performs a comprehensive hardware reset including I/O deactivation and runtime switching.
 */
export class ResetController implements Interface.ResetControllerInterface {
    /**
     * Executes a complete CC100 controller reset sequence.
     *
     * This method performs the following operations:
     * 1. Deactivates all digital outputs
     * 2. Deactivates all analog outputs
     * 3. Turns off status LEDs
     * 4. Deactivates Docker services
     * 5. Stops Python runtime
     * 6. Restarts CodeSys3 runtime
     * 7. Disables SSH port forwarding
     *
     * @param controller - Controller object containing the controllerId and other properties
     */
    async reset(controller: any) {
        let controllerId = controller.controllerId;

        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Reset Controller',
                cancellable: false,
            },
            async (progress, _token) => {
                try {
                    // Note: Starting at 50% because this continues from V02.ts reset progress
                    progress.report({
                        increment: 50,
                        message: 'Deactivating Digital Outputs...',
                    });
                    // Set all digital outputs to low (0V)
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /sys/kernel/dout_drv/DOUT_DATA'
                    );

                    progress.report({
                        increment: 4,
                        message: 'Deactivating Analog Outputs...',
                    });
                    // Power down analog output 1
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage1_powerdown'
                    );
                    progress.report({
                        increment: 2,
                        message: 'Deactivating Analog Outputs...',
                    });
                    // Set analog output 1 to 0V
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage1_raw'
                    );
                    progress.report({
                        increment: 2,
                        message: 'Deactivating Analog Outputs...',
                    });
                    // Power down analog output 2
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage2_powerdown'
                    );
                    progress.report({
                        increment: 2,
                        message: 'Deactivating Analog Outputs...',
                    });
                    // Set analog output 2 to 0V
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage2_raw'
                    );

                    progress.report({
                        increment: 2,
                        message: 'Deactivating LEDs...',
                    });
                    // Turn off green RUN LED
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /dev/leds/run-green/brightness'
                    );
                    progress.report({
                        increment: 3,
                        message: 'Deactivating LEDs...',
                    });
                    // Turn off red RUN LED
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'echo 0 >> /dev/leds/run-red/brightness'
                    );

                    progress.report({
                        increment: 3,
                        message: 'Deactivating Docker...',
                    });
                    // Deactivate Docker runtime environment
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        '/etc/config-tools/config_docker deactivate'
                    );

                    progress.report({
                        increment: 10,
                        message: 'Stopping Python Runtime...',
                    });
                    // Switch back to CodeSys runtime (version 1)
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        '/etc/config-tools/config_runtime runtime-version=1'
                    );

                    progress.report({
                        increment: 10,
                        message: 'Starting CodeSys3...',
                    });
                    // Start CodeSys3 runtime in background
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'codesys3 &'
                    );

                    progress.report({
                        increment: 5,
                        message: 'Disable Port Forwarding...',
                    });
                    // Disable SSH port forwarding for security
                    await ConnectionManager.instance.executeCommand(
                        controllerId,
                        'grep -q "LOCAL_PORT_FORWARDING=true" /etc/dropbear/dropbear.conf && sed -i "s/LOCAL_PORT_FORWARDING=true/LOCAL_PORT_FORWARDING=false/" /etc/dropbear/dropbear.conf'
                    );

                    progress.report({
                        increment: 5,
                        message: 'Finished Resetting',
                    });

                    // Refresh the controller view to show updated status
                    ControllerProvider.instance.refresh();

                    progress.report({ message: 'Finished Resetting' });
                    return new Promise<void>((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, 2000);
                    });
                } catch (error: any) {
                    progress.report({
                        increment: 100,
                        message: 'An Error occurred while Resetting',
                    });
                    console.error(`Error resetting controller: ${error}`);
                    vscode.window.showErrorMessage(
                        'An Error occurred while Resetting the Controller'
                    );
                }
            }
        );
    }
}

/**
 * Provides CC100-specific network configuration.
 * Returns the default USB-C interface IP address for CC100 controllers.
 */
export class GetUSB_C_IP implements Interface.GetUSB_C_IP_Interface {
    /**
     * Returns the factory default IP address for the CC100's USB-C interface.
     * This is the standard IP address used when connecting via USB-C cable.
     *
     * @returns The default USB-C IP address for CC100 controllers
     */
    getUSB_C_IP(): string {
        return '192.168.42.42';
    }
}
