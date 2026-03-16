import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import sanitizeHtml from 'sanitize-html';
import { ConnectionManager } from './connectionManager';
import { Controller } from './view';
import { ProjectVersion } from './versionDetection';
import { extensionContext } from '../extension';
import { YamlCommands } from '../shared/yamlCommands';

/**
 * WebView-based IO-Check panel for interactive WAGO CC100 controller testing.
 *
 * This class provides a comprehensive interface for testing and monitoring CC100 controller I/O:
 * - Digital inputs and outputs (DI/DO)
 * - Analog inputs and outputs (AI/AO) with calibration
 * - RS-485 serial communication
 * - Temperature monitoring
 * - Controller switch status
 *
 * The webview communicates with the controller via SSH commands executed through
 * the ConnectionManager, providing real-time I/O interaction capabilities.
 */
export class webviewIoCheck {
    /** Flag controlling whether the panel can be loaded */
    public canLoadPanel: boolean = true;

    /** Reference to the active webview panel */
    public ioCheckPanel: vscode.WebviewPanel | undefined = undefined;

    /** VS Code extension context */
    private context: vscode.ExtensionContext;

    /**
     * Calibration data for analog inputs/outputs.
     * First row contains channel names, subsequent rows contain calibration values
     * for different measurement ranges and reference points.
     */
    calibData: any[][] = [
        ['PT1', 'PT2', 'AI1', 'AI2', 'AO1', 'AO2'],
        ['9663', '1000', '40753', '3000'],
        ['9551', '1000', '40571', '3000'],
        ['14129', '2494', '41910', '7492'],
        ['14106', '2494', '41873', '7492'],
        ['1050', '350', '8978', '3000'],
        ['1044', '350', '8970', '3000'],
    ];

    /** Current controller switch position */
    private switchStatus: string;

    /** Active serial communication connection */
    private serialConnection: any;

    /**
     * Initializes the IO-Check webview functionality.
     * Sets up the extension context and registers the command for opening the panel.
     */
    constructor() {
        this.context = extensionContext;
        this.calibData = [];
        this.switchStatus = '';
        this.createNewWebview();
    }

    /**
     * Creates and registers the IO-Check webview command.
     * Handles panel creation, reuse, and proper disposal.
     */
    private createNewWebview() {
        extensionContext.subscriptions.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.iocheck',
                async (element: Controller) => {
                    // Determine which column to show the webview in
                    const columnToShowIn = vscode.window.activeTextEditor
                        ? vscode.window.activeTextEditor.viewColumn
                        : undefined;

                    if (this.ioCheckPanel) {
                        // Reuse existing panel if available
                        this.ioCheckPanel.reveal(columnToShowIn);
                    } else {
                        // Create new webview panel
                        this.ioCheckPanel = vscode.window.createWebviewPanel(
                            'iocheck',
                            'IO-Check',
                            columnToShowIn || vscode.ViewColumn.One,
                            {
                                enableScripts: true,
                                retainContextWhenHidden: true,
                                localResourceRoots: [
                                    vscode.Uri.joinPath(
                                        extensionContext.extensionUri,
                                        'src'
                                    ),
                                    vscode.Uri.joinPath(
                                        extensionContext.extensionUri,
                                        'out'
                                    ),
                                    vscode.Uri.joinPath(
                                        extensionContext.extensionUri,
                                        'res'
                                    ),
                                ],
                            }
                        );

                        this.ioCheckPanel.webview.html =
                            this.getIOCheckWebviewContent();

                        this.ioCheckPanel.webview.onDidReceiveMessage(
                            async (message) => {
                                switch (message.command) {
                                    case 'windowLoaded': {
                                        this.canLoadPanel = true;
                                        break;
                                    }
                                }
                            }
                        );

                        // Webview Tab Icon
                        this.ioCheckPanel.iconPath = vscode.Uri.joinPath(
                            this.context.extensionUri,
                            'res/images/WAGOW.png'
                        );

                        // Reset when the current panel is closed
                        this.ioCheckPanel.onDidDispose(
                            () => {
                                // this.test = false;
                                this.ioCheckPanel = undefined;
                                this.serialConnection?.disconnect();
                                this.serialConnection = undefined;
                            },
                            null,
                            this.context.subscriptions
                        );

                        if (this.ioCheckPanel) {
                            try {
                                if (element) {
                                    this.updateIoCheck(element.controllerId);
                                } else if (ProjectVersion >= 0.2) {
                                    let controller =
                                        await vscode.window.showQuickPick(
                                            YamlCommands.getControllers().map(
                                                (controller) => {
                                                    return {
                                                        label: controller.displayname,
                                                        controllerId:
                                                            controller.id,
                                                        online: false,
                                                    };
                                                }
                                            ),
                                            {
                                                placeHolder:
                                                    'Select a controller',
                                            }
                                        );
                                    if (controller) {
                                        this.updateIoCheck(
                                            controller.controllerId
                                        );
                                    }
                                } else {
                                    this.updateIoCheck(0);
                                }
                            } catch (error: any) {
                                this.ioCheckPanel.dispose();
                            }
                        }
                    }
                }
            )
        );
    }

    /**
     * This method converts a local file path to a webview path
     * @param path Relative path of the file on your device
     * @returns The given path as webview path
     */
    public getPath(path: any) {
        // Get path to resource on disk
        const onDiskPath = vscode.Uri.joinPath(
            extensionContext.extensionUri,
            path
        );
        var webviewPath = vscode.Uri.joinPath(extensionContext.extensionUri);
        if (this.ioCheckPanel) {
            webviewPath = this.ioCheckPanel.webview.asWebviewUri(onDiskPath);
        }
        // Get the special URI to use with the webview
        return webviewPath;
    }

    /**
     * This method replaces the paths in the HTML with the webview paths
     * @returns The modified HTML file as string
     */
    public getIOCheckWebviewContent() {
        var pathHTML = path.join(
            extensionContext.extensionPath,
            'res/webviews/ioCheck.html'
        );
        var html = fs.readFileSync(pathHTML).toString();

        const pathCC100 = this.getPath('res/images/cc100Neu11.png').toString();
        const pathCC100Schalter = this.getPath(
            'res/images/cc100Schalter.png'
        ).toString();
        const pathStyle1 = this.getPath('res/webviews/ioCheck.css').toString();
        const pathScript = this.getPath('src/ioCheck.js').toString();
        const pathWagoimg = this.getPath(
            'res/images/wago-iconsRgbTemperatureOutlineGreen.svg'
        ).toString();
        const pathSerialSVG = this.getPath(
            'res/images/wago-iconsRgbConnectorsOutlineGreen.svg'
        ).toString();
        const pathWagoimg3 = this.getPath('res/images/WagoW.png').toString();
        const pathWagoimg4 = this.getPath(
            'res/images/wago-iconsRgbExportOutlineGreen.svg'
        ).toString();
        const pathWagoimg5 = this.getPath(
            'res/images/wago-iconsRgbImportOutlineGreen.svg'
        ).toString();
        const pathChevron = this.getPath(
            'res/images/wago-iconsRgbChevronRightOutlineGreen.svg'
        ).toString();
        const pathCycleTime = this.getPath(
            'res/images/wago-iconsRgbFutureOutlineGreen.svg'
        ).toString();

        html = html.replace('../images/cc100Neu11.png', pathCC100.toString());
        html = html.replace(
            '../images/cc100Schalter.png',
            pathCC100Schalter.toString()
        );
        html = html.replace('./ioCheck.css', pathStyle1.toString());
        html = html.replace('../ioCheck.js', pathScript.toString());
        html = html.replace(
            'res/images/wago-iconsRgbTemperatureOutlineGreen.svg',
            pathWagoimg.toString()
        );
        html = html.replace(
            'res/images/wago-iconsRgbConnectorsOutlineGreen.svg',
            pathSerialSVG.toString()
        );
        html = html.replace('../images/WagoW.png', pathWagoimg3.toString());
        html = html.replace(
            'res/images/wago-iconsRgbExportOutlineGreen.svg',
            pathWagoimg4.toString()
        );
        html = html.replace(
            'res/images/wago-iconsRgbImportOutlineGreen.svg',
            pathWagoimg5.toString()
        );
        html = html.replaceAll(
            'res/images/wago-iconsRgbChevronRightOutlineGreen.svg',
            pathChevron.toString()
        );
        html = html.replace(
            'res/images/wago-iconsRgbFutureOutlineGreen.svg',
            pathCycleTime.toString()
        );
        return html;
    }

    /**
     * This method updates the UI via POST-Messages and the CC100 via SSH
     */
    async updateIoCheck(id: number) {
        if (this.ioCheckPanel) {
            await ConnectionManager.instance
                .executeCommand(id, 'cat /etc/calib')
                .then((tmp: string) => {
                    this.convertAnalogData(tmp);
                });
            await this.startEventForSerialCommunication(id);
            await this.startEventForSwitch(id);

            // Serial access is missing

            await ConnectionManager.instance.executeCommand(
                id,
                'stty -F /dev/ttySTM1 cstopb brkint -icrnl -ixon -opost -isig icanon -iexten -echo'
            );
            this.ioCheckPanel.webview.postMessage({
                command: 'start',
            });
            this.ioCheckPanel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.command) {
                        case 'alert': {
                            vscode.window.showErrorMessage(message.text);
                            return;
                        }
                        case 'readData': {
                            await ConnectionManager.instance
                                .executeCommand(
                                    id,
                                    'cat /sys/devices/platform/soc/44009000.spi/spi_master/spi0/spi0.0/din ' + // DI
                                        '/sys/kernel/dout_drv/DOUT_DATA ' + // DO
                                        '/sys/bus/iio/devices/iio:device3/in_voltage3_raw ' + // AI1
                                        '/sys/bus/iio/devices/iio:device3/in_voltage0_raw ' + // AI2
                                        '/sys/bus/iio/devices/iio:device0/out_voltage1_raw ' + // AO1
                                        '/sys/bus/iio/devices/iio:device1/out_voltage2_raw ' + // AO2
                                        '/sys/bus/iio/devices/iio:device2/in_voltage13_raw ' + // PT1
                                        '/sys/bus/iio/devices/iio:device2/in_voltage1_raw ' + // PT2
                                        '/dev/leds/sys-green/brightness ' + // SYS LED green
                                        '/dev/leds/sys-red/brightness ' + // SYS LED red
                                        '/dev/leds/run-green/brightness ' + // RUN LED green
                                        '/dev/leds/run-red/brightness ' + // RUN LED red
                                        '/dev/leds/u1-green/brightness ' + // USR LED green
                                        '/dev/leds/u1-red/brightness ' + // USR LED red
                                        '/dev/leds/led-mmc/brightness &&' + // µSD LED
                                        'ethtool ethX1 | grep "Link detected*" &&' + // LNK ACT1 | Reading the Ethernet LEDs has doubled the cyclic polling in IO-Check
                                        'ethtool ethX2 | grep "Link detected*"' // LNK ACT2
                                )
                                .then((data: any) => {
                                    /**
                                     * `[0]` => digital inputs
                                     * `[1]` => digital outputs
                                     * `[2]` => analog input 1
                                     * `[3]` => analog input 2
                                     * `[4]` => analog output 1
                                     * `[5]` => analog output 2
                                     * `[6]` => PT 1
                                     * `[7]` => PT 2
                                     * `[8]` => SYS LED green
                                     * `[9]` => SYS LED red
                                     * `[10]` => RUN LED green
                                     * `[11]` => RUN LED red
                                     * `[12]` => USR LED green
                                     * `[13]` => USR LED red
                                     * `[14]` => µSD LED
                                     * `[15]` => LNK ACT1 LED
                                     * `[16]` => LNK ACT2 LED
                                     */
                                    let dataArray =
                                        this.splitDataToStringArray(data);
                                    dataArray[0] = this.convertDigital(
                                        Number(dataArray[0]),
                                        'IN'
                                    ).toString(); // DI
                                    dataArray[1] = this.convertDigital(
                                        Number(dataArray[1]),
                                        'OUT'
                                    ).toString(); // DO
                                    dataArray[2] = this.calcCalibratedValues(
                                        Number(dataArray[2]),
                                        this.calibData[3]
                                    ).toString(); // AI1
                                    dataArray[3] = this.calcCalibratedValues(
                                        Number(dataArray[3]),
                                        this.calibData[4]
                                    ).toString(); // AI2
                                    dataArray[4] = this.calcCalibratedAoValue(
                                        Number(dataArray[4]),
                                        this.calibData[5]
                                    ).toString(); // AO1
                                    dataArray[5] = this.calcCalibratedAoValue(
                                        Number(dataArray[5]),
                                        this.calibData[6]
                                    ).toString(); // AO2
                                    dataArray[6] = this.calcCelsius(
                                        this.calcCalibratedValues(
                                            Number(dataArray[6]),
                                            this.calibData[1]
                                        )
                                    ); // PT1
                                    dataArray[7] = this.calcCelsius(
                                        this.calcCalibratedValues(
                                            Number(dataArray[7]),
                                            this.calibData[2]
                                        )
                                    ); // PT2
                                    this.ioCheckPanel?.webview.postMessage({
                                        command: 'readData',
                                        values: dataArray,
                                    });
                                });
                            break;
                        }
                        case 'readSwitch': {
                            this.ioCheckPanel?.webview.postMessage({
                                command: 'readSwitch',
                                value: this.switchStatus,
                            });
                            break;
                        }
                        case 'buttonClick': {
                            this.ioCheckPanel?.webview.postMessage({
                                command: 'buttonClick',
                            });
                            break;
                        }
                        case 'digitalWrite': {
                            var value = 0;
                            for (
                                let index = 0;
                                index < message.value.length;
                                index++
                            ) {
                                if (message.value[index] == 1) {
                                    value = value + Math.pow(2, index);
                                }
                            }
                            await ConnectionManager.instance
                                .executeCommand(
                                    id,
                                    'echo ' +
                                        value +
                                        ' >> /sys/kernel/dout_drv/DOUT_DATA'
                                )
                                .then(() => {
                                    this.ioCheckPanel?.webview.postMessage({
                                        command: 'buttonClick',
                                    });
                                });
                            break;
                        }
                        case 'analogWrite': {
                            var value = this.calcCalibratedValues(
                                message.value,
                                this.calibData[message.pin + 4]
                            );
                            switch (message.pin) {
                                case 1: // AO1
                                    await ConnectionManager.instance.executeCommand(
                                        id,
                                        `echo 0 >> /sys/bus/iio/devices/iio:device0/out_voltage1_powerdown`
                                    );

                                    await ConnectionManager.instance.executeCommand(
                                        id,
                                        `echo ${value} >> /sys/bus/iio/devices/iio:device0/out_voltage1_raw`
                                    );

                                    await ConnectionManager.instance.executeCommand(
                                        id,
                                        `cat /sys/bus/iio/devices/iio:device0/out_voltage1_raw`
                                    );
                                    break;

                                case 2: // AO2
                                    await ConnectionManager.instance.executeCommand(
                                        id,
                                        `echo 0 >> /sys/bus/iio/devices/iio:device1/out_voltage2_powerdown`
                                    );

                                    await ConnectionManager.instance.executeCommand(
                                        id,
                                        `echo ${value} >> /sys/bus/iio/devices/iio:device1/out_voltage2_raw`
                                    );

                                    await ConnectionManager.instance.executeCommand(
                                        id,
                                        `cat /sys/bus/iio/devices/iio:device1/out_voltage2_raw`
                                    );
                                    break;
                            }

                            this.ioCheckPanel?.webview.postMessage({
                                command: 'buttonClick',
                                pin: message.pin,
                            });
                            break;
                        }
                        case 'serialWrite': {
                            let text = sanitizeHtml(message.text, {
                                allowedTags: [],
                                allowedAttributes: {},
                            });
                            await ConnectionManager.instance
                                .executeCommand(
                                    id,
                                    'echo ' +
                                        '"' +
                                        text +
                                        '"' +
                                        ' >> /dev/ttySTM1'
                                )
                                .then(() => {
                                    this.ioCheckPanel?.webview.postMessage({
                                        command: 'serialWrite',
                                        text: text,
                                    });
                                });
                            break;
                        }
                    }
                },
                undefined,
                extensionContext.subscriptions
            );
        }
    }

    splitDataToStringArray(data: string) {
        return data.split('\n');
    }

    /**
     * This method converts the analog data string to an array
     * @param analogData The analog data string
     */
    convertAnalogData(analogData: string) {
        if (!analogData.includes('*')) {
            const einD1 = analogData.split('\n');
            for (let index = 0; index < einD1.length; index++) {
                this.calibData[index] = einD1[index].split(' ');
            }
        }
    }

    /**
     * This method calculates the calibrated values of AI, PT and AO(millie Volt to calibrated)
     * @param valUncal The uncalibrated values of AI, PT and AO
     * @param calib The calibrated values for AI, PT and AO
     * @returns The calibrated values of AI, PT and AO
     */
    calcCalibratedValues(valUncal: number, calib: string[]) {
        var x1 = parseInt(calib[0]);
        var y1 = parseInt(calib[1]);
        var x2 = parseInt(calib[2]);
        var y2 = parseInt(calib[3]);

        var valCal = (y2 - y1) * (valUncal - x1);
        valCal = valCal / (x2 - x1);
        valCal = valCal + y1;

        let result = parseInt(valCal.toString());

        return result < 0 ? 0 : result;
    }

    /**
     * This method calculates the calibrated values of AO(calibrated to millie Volt)
     * @param valUncal The uncalibrated value of AO
     * @param calib The calibrated value for AO
     * @returns The calibrated value of AO
     */
    calcCalibratedAoValue(valUncal: number, calib: string[]) {
        var x1 = parseInt(calib[0]);
        var y1 = parseInt(calib[1]);
        var x2 = parseInt(calib[2]);
        var y2 = parseInt(calib[3]);

        var valCal = (x2 - x1) * (valUncal - y1);
        valCal = valCal / (y2 - y1);
        valCal = valCal + x1;
        let result = parseInt(valCal.toString());
        return result < 0 ? 0 : result;
    }
    /**
     * Converts a number to a binary array
     * @param value number to convert
     * @param port either 'IN' or 'OUT'
     * @returns the binary array describing the given number
     */
    convertDigital(value: number, port: string) {
        var values;
        if (port == 'IN') {
            values = [0, 0, 0, 0, 0, 0, 0, 0];
        } else {
            values = [0, 0, 0, 0];
        }
        for (let index = 0; index < values.length; index++) {
            values[index] = (value >> index) % 2;
        }
        return values;
    }

    /**
     * This method calculates the temperature value out of the given resistance value of the PT1000
     * @param resistance The calibrated value of the PT [Ohm]
     */
    calcCelsius(resistance: number) {
        // Resistance value at 0°C [Ohm]
        const r0 = 1000;
        // Temperature coefficient [ppm/K]
        const tk = 0.00358;
        // Temperature value (rounded to 2 digits after comma) [°C]
        var valTemperature = (resistance - r0) / (r0 * tk);

        if (valTemperature > 850.0) {
            valTemperature = 0.0;
        }

        return valTemperature.toFixed(2);
    }

    /**
     * This method removes the additional data that is supplied during serial communication
     * @param data the string containing the data from serial communication
     * @returns the data from serial communication without any additional data
     */
    removeAdditionalData(data: string) {
        const trash1 = '[00;32mWAGO Linux Terminal';
        const trash2 = 'root@CC100-';
        const trash21 = ':~';
        const trash3 = 'cat /dev/ttySTM1';
        const trash4 = ' ';

        if (data.includes(trash1)) {
            return '';
        } else if (data.includes(trash2) && data.includes(trash21)) {
            return '';
        } else if (data.includes(trash3)) {
            return '';
        } else if (data == trash4) {
            return '';
        } else {
            return data;
        }
    }

    private async startEventForSerialCommunication(id: number) {
        let data;
        if (!this.serialConnection)
            this.serialConnection =
                await ConnectionManager.instance.getConnection(id);
        await this.serialRead((rxData: Buffer) => {
            data = this.removeAdditionalData(rxData.toString());
            this.ioCheckPanel?.webview.postMessage({
                command: 'serialRead',
                text: data.replace(/(?:\r\n|\r|\n)/g, ''),
            });
        });
    }

    private async serialRead(callback: (dataBuffer: Buffer) => void) {
        this.serialConnection.streamCommand(
            'cat /dev/ttySTM1\n',
            (data: Buffer) => {
                callback(data);
            },
            (error: any) => {
                console.error(error);
            }
        );
    }

    private async startEventForSwitch(id: number) {
        await ConnectionManager.instance
            .executeCommand(id, './etc/config-tools/get_run_stop_switch_value')
            .then((tmp: string) => {
                if (tmp == 'run') {
                    this.switchStatus = '1';
                } else {
                    this.switchStatus = '2';
                }
            });
    }
}
