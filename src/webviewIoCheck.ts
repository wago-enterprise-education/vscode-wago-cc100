import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SSH } from './ssh';
import { Workspace } from './extension/workspace';
import { Connection } from './extension/connection';
import sanitizeHtml from 'sanitize-html';
import { ConnectionManager } from './extension/connectionManager';
import { Controller } from './extension/view';

let ssh = new SSH('192.168.42.42', 22, 'root', '');

export class webviewIoCheck {
    private windowClosed: boolean = false
    private test: boolean = false;
    private Workspace = new Workspace();
    private Connection = new Connection();

    public canLoadPanel: boolean = true;
    public ioCheckPanel: vscode.WebviewPanel | undefined = undefined;
    private context: vscode.ExtensionContext;
    private readonly pathToLibFile: string = 'src/lib/CC100IO.py';
    private wsPath: string = '';
    private connectionLost: boolean = false;
    calibData: any[][] = [['PT1', 'PT2', 'AI1', 'AI2', 'AO1', 'AO2'],
    ['9663', '1000', '40753', '3000'],
    ['9551', '1000', '40571', '3000'],
    ['14129', '2494', '41910', '7492'],
    ['14106', '2494', '41873', '7492'],
    ['1050', '350', '8978', '3000'],
    ['1044', '350', '8970', '3000']];
    private switchStatus: string;
    private serialConnection: any;

    constructor(private con: vscode.ExtensionContext) {
        this.context = con;
        this.calibData = [];
        this.switchStatus = '';
        this.createNewWebview();
    }

    private createNewWebview() {
        this.context.subscriptions.push(

            // The command has been defined in the package.json file
            // Now provide the implementation of the command with registerCommand
            // The commandId parameter must match the command field in package.json

            // vscode.commands.registerCommand('vscode-wago-cc100.iocheck', async () => {

            //     this.wsPath = await this.Workspace.getProjectPath();

            //     if (this.wsPath !== "Error: Could not find a project") {
            //         // Check if an activeTextEditor is there, either it exists or it is undefined
            //         const columnToShowIn = vscode.window.activeTextEditor
            //         ? vscode.window.activeTextEditor.viewColumn
            //         : undefined;

            //         if (this.ioCheckPanel) {
            //             // If we already have a panel, show it in the target column
            //             this.ioCheckPanel.reveal(columnToShowIn);
            //         } else {
            //             this.canLoadPanel = false;
            //             // create IO-Check Webview panel 

            //             this.ioCheckPanel = vscode.window.createWebviewPanel("iocheck", "IO-Check", columnToShowIn || vscode.ViewColumn.One, {
            //                 enableScripts: true,
            //                 retainContextWhenHidden: true,
            //                 localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'src'), vscode.Uri.joinPath(this.context.extensionUri, 'out'),
            //                 vscode.Uri.joinPath(this.context.extensionUri, 'res')]
            //             });

            //             this.ioCheckPanel.webview.html = this.getIOCheckWebviewContent();

            //             // Webview Tab Icon
            //             this.ioCheckPanel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'res/images/WAGOW.png');

            //             // Reset when the current panel is closed
            //             this.ioCheckPanel.onDidDispose(() => {
            //                 // this.test = false;
            //                 this.ioCheckPanel = undefined;
            //                 this.windowClosed = true

            //             },
            //                 null,
            //                 this.context.subscriptions
            //             );
            //         }
            //     }
            //     else {
            //         vscode.window.showErrorMessage(this.wsPath);
            //         return;
            //     }





            vscode.commands.registerCommand('vscode-wago-cc100.iocheck', async (element: Controller) => {

                    // The code you place here will be executed every time your command is executed
                    this.wsPath = await this.Workspace.getProjectPath();
                    //Check if a CC100 project is opened in the explorer
                    if (this.wsPath !== "Error: Could not find a project") {
    
                        	this.wsPath = this.wsPath

                    }
                    else {
                        vscode.window.showErrorMessage(this.wsPath);
                        return;
                    }
    
                    // Check if an activeTextEditor is there, either it exists or it is undefined
                    const columnToShowIn = vscode.window.activeTextEditor
                        ? vscode.window.activeTextEditor.viewColumn
                        : undefined;
    
                    if (this.ioCheckPanel) {
                        this.ioCheckPanel.reveal(columnToShowIn);
                    } else {
    
                        this.ioCheckPanel = vscode.window.createWebviewPanel("iocheck", "IO-Check", columnToShowIn || vscode.ViewColumn.One, {
                            enableScripts: true,
                            retainContextWhenHidden: true,
                            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'src'), vscode.Uri.joinPath(this.context.extensionUri, 'out'),
                            vscode.Uri.joinPath(this.context.extensionUri, 'res')]
                        });
    
                        this.ioCheckPanel.webview.html = this.getIOCheckWebviewContent();
    
                        this.ioCheckPanel.webview.onDidReceiveMessage(
                            async message => {
                                switch (message.command) {
                                    case 'windowLoaded': {
                                        this.canLoadPanel = true;
                                        break;
                                    }
                                }
                            }
                        );
    
                        // Webview Tab Icon
                        this.ioCheckPanel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'res/images/WAGO_W.png');
    
                        // Reset when the current panel is closed
                        this.ioCheckPanel.onDidDispose(() => {
                            // this.test = false;
                            this.ioCheckPanel = undefined;
                            this.windowClosed = true
                        },
                            null,
                            this.context.subscriptions
                        );
                        
                        if (this.ioCheckPanel) {
                            try {
                                this.updateIoCheck(Number.parseInt(element.id));
                            }
                            catch (error: any) {
                                this.ioCheckPanel.dispose();
                            }
                        }
                    }
                })
        );
    }


    /**
     * This method converts a local file path to a webview path
     * @param path Relative path of the file on your device
     * @returns The given path as webview path
     */
    public getPath(path: any) {
        // Get path to resource on disk
        const onDiskPath = vscode.Uri.joinPath(this.context.extensionUri, path);
        var webviewPath = vscode.Uri.joinPath(this.context.extensionUri);
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
        var pathHTML = path.join(this.context.extensionPath, 'res/webviews/ioCheck.html');
        var html = fs.readFileSync(pathHTML).toString();

        const pathCC100 = this.getPath('res/images/cc100Neu11.png').toString();
        const pathCC100Schalter = this.getPath('res/images/cc100Schalter.png').toString();
        const pathStyle1 = this.getPath('res/webviews/ioCheck.css').toString();
        const pathScript = this.getPath('out/ioCheck.js').toString();
        const pathWagoimg = this.getPath('res/images/wago-iconsRgbTemperatureOutlineGreen.svg').toString();
        const pathSerialSVG = this.getPath('res/images/wago-iconsRgbConnectorsOutlineGreen.svg').toString();
        const pathWagoimg3 = this.getPath('res/images/WagoW.png').toString();
        const pathWagoimg4 = this.getPath('res/images/wago-iconsRgbExportOutlineGreen.svg').toString();
        const pathWagoimg5 = this.getPath('res/images/wago-iconsRgbImportOutlineGreen.svg').toString();
        const pathChevron = this.getPath('res/images/wago-iconsRgbChevron-rightOutlineGreen.svg').toString();
        const pathCycleTime = this.getPath('res/images/wago-iconsRgbFutureOutlineGreen.svg').toString();

        html = html.replace("../images/cc100Neu11.png", pathCC100.toString());
        html = html.replace("../images/cc100Schalter.png", pathCC100Schalter.toString());
        html = html.replace("./ioCheck.css", pathStyle1.toString());
        html = html.replace("../ioCheck.js", pathScript.toString());
        html = html.replace("res/images/wago-iconsRgbTemperatureOutlineGreen.svg", pathWagoimg.toString());
        html = html.replace("res/images/wago-iconsRgbConnectorsOutlineGreen.svg", pathSerialSVG.toString());
        html = html.replace("../images/WagoW.png", pathWagoimg3.toString());
        html = html.replace("res/images/wago-iconsRgbExportOutlineGreen.svg", pathWagoimg4.toString());
        html = html.replace("res/images/wago-iconsRgbImportOutlineGreen.svg", pathWagoimg5.toString());
        html = html.replaceAll("res/images/wago-iconsRgbChevron-rightOutlineGreen.svg", pathChevron.toString())
        html = html.replace('res/images/wago-iconsRgbFutureOutlineGreen.svg', pathCycleTime.toString())
        return html;
    }

    /**
     * This method updates the UI via POST-Messages and the CC100 via SSH
     */
    async updateIoCheck(id: number) {
        let result: string


        if (this.ioCheckPanel) {
            await ConnectionManager.instance.executeCommand(id,"cat /etc/calib").then((tmp: string) => {
                this.convertAnalogData(tmp);
            });
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // später die Serial Kommuniaktion abändern
            await this.startEventForSerialCommunication(id);
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            await this.startEventForSwitch(id);
            await ssh.setupSerialInterface();
            await ConnectionManager.instance.executeCommand(id,"stty -F /dev/ttySTM1 cstopb brkint -icrnl -ixon -opost -isig icanon -iexten -echo");
            this.ioCheckPanel.webview.postMessage({
                command: 'start'
            })
            this.ioCheckPanel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'alert': {
                            vscode.window.showErrorMessage(message.text);
                            return;
                        }
                        case 'readData': {
                            await ConnectionManager.instance.executeCommand(id,
                                "cat /sys/devices/platform/soc/44009000.spi/spi_master/spi0/spi0.0/din " + // DI
                                "/sys/kernel/dout_drv/DOUT_DATA " + // DO
                                "/sys/bus/iio/devices/iio:device3/in_voltage3_raw " + // AI1
                                "/sys/bus/iio/devices/iio:device3/in_voltage0_raw " + // AI2
                                "/sys/bus/iio/devices/iio:device0/out_voltage1_raw " + // AO1
                                "/sys/bus/iio/devices/iio:device1/out_voltage2_raw " + // AO2
                                "/sys/bus/iio/devices/iio:device2/in_voltage13_raw " + // PT1
                                "/sys/bus/iio/devices/iio:device2/in_voltage1_raw " + // PT2
                                "/dev/leds/sys-green/brightness " + // SYS LED green
                                "/dev/leds/sys-red/brightness " + // SYS LED red
                                "/dev/leds/run-green/brightness " + // RUN LED green
                                "/dev/leds/run-red/brightness " + // RUN LED red
                                "/dev/leds/u1-green/brightness " + // USR LED green
                                "/dev/leds/u1-red/brightness " + // USR LED red
                                "/dev/leds/led-mmc/brightness &&" + // µSD LED
                                'ethtool ethX1 | grep "Link detected*" &&' + // LNK ACT1 | Das Auslesen der Ethernet-LEDs hat die zyklische Abfrage in IO-Check verdoppelt
                                'ethtool ethX2 | grep "Link detected*"') // LNK ACT2
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
                                result = data;
                                let dataArray = this.splitDataToStringArray(data);
                                dataArray[0] = this.convertDigital(Number(dataArray[0]), 'IN').toString(); // DI
                                dataArray[1] = this.convertDigital(Number(dataArray[1]), 'OUT').toString(); // DO
                                dataArray[2] = this.calcCalibratedValues(Number(dataArray[2]), this.calibData[3]).toString(); // AI1
                                dataArray[3] = this.calcCalibratedValues(Number(dataArray[3]), this.calibData[4]).toString(); // AI2
                                dataArray[4] = this.calcCalibratedAoValue(Number(dataArray[4]), this.calibData[5]).toString(); // AO1
                                dataArray[5] = this.calcCalibratedAoValue(Number(dataArray[5]), this.calibData[6]).toString(); // AO2
                                dataArray[6] = this.calcCelsius(this.calcCalibratedValues(Number(dataArray[6]), this.calibData[1])); // PT1
                                dataArray[7] = this.calcCelsius(this.calcCalibratedValues(Number(dataArray[7]), this.calibData[2])); // PT2
                                this.ioCheckPanel?.webview.postMessage({
                                    command: 'readData',
                                    values: dataArray
                                })
                            })

                            if (result.includes('Error')) {
                                this.connectionLost = true;
                            }
                            break;
                        }
                        case 'readSwitch': {
                            this.ioCheckPanel?.webview.postMessage({
                                command: 'readSwitch',
                                value: this.switchStatus
                            })
                            break;
                        }
                        case 'buttonClick': {
                            this.ioCheckPanel?.webview.postMessage({
                                command: 'buttonClick'
                            })
                            break;
                        }
                        case 'digitalWrite': {
                            var value = 0;
                            for (let index = 0; index < message.value.length; index++) {
                                if (message.value[index] == 1) {
                                    value = value + Math.pow(2, index);
                                }
                            }
                            await ConnectionManager.instance.executeCommand(id,"echo " + value + " >> /sys/kernel/dout_drv/DOUT_DATA").then(()=> {
                                this.ioCheckPanel?.webview.postMessage({
                                    command: 'buttonClick'
                                })
                            });
                            break;
                        }
                        case 'analogWrite': {
                            console.log('AnalogWrite Value: ' + message.value);
                            console.log('AnalogWrite Pin: ' + message.pin);
                            var value = this.calcCalibratedValues(message.value, this.calibData[message.pin + 4]);
                            await ConnectionManager.instance.executeCommand(id,"").then(()=> {
                                this.ioCheckPanel?.webview.postMessage({
                                    command: 'buttonClick',
                                    pin: message.pin
                                })
                            });
                            break;
                        }
                        case 'serialWrite': {
                            let text = sanitizeHtml(message.text, { allowedTags: [], allowedAttributes: {} });
                            await ConnectionManager.instance.executeCommand(id,"echo " + '"' + text + '"' + " >> /dev/ttySTM1").then(() => {
                                this.ioCheckPanel?.webview.postMessage({
                                    command: 'serialWrite',
                                    text: text
                                })
                            });
                            break;
                        }
                    }
                },
                undefined,
                this.context.subscriptions
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

        return (result < 0 ? 0 : result);
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
        this.convertDigital(1.0, 'IN')
        let result = parseInt(valCal.toString());
        return (result < 0 ? 0 : result);
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
        }
        else {
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

        // resistance value at 0°C [Ohm]
        const r0 = 1000;
        // temperature coefficient [ppm/K]
        const tk = 0.00358;
        // temperature value (rounded to 2 digits after comma) [°C]
        var valTemperature = (resistance - r0) / (r0 * tk);

        if (valTemperature > 850.00) {
            valTemperature = 0.00;
        }

        return valTemperature.toFixed(2);
    }

    /**
     * This method removes the additional data that is supplied during serial communication
     * @param data the string containing the data from serial communication
     * @returns the data from serial communication without any additional data
     */
    removeAdditionalData(data: string) {
        const trash1 = '[00;32mWAGO Linux Terminal'
        const trash2 = 'root@CC100-'
        const trash21 = ':~'
        const trash3 = 'cat /dev/ttySTM1'
        const trash4 = ' '

        if (data.includes(trash1)) {
            return ''
        }
        else if (data.includes(trash2) && data.includes(trash21)) {
            return ''
        }
        else if (data.includes(trash3)) {
            return ''
        }
        else if (data == trash4) {
            return ''
        }
        else {
            return data
        }
    }

    /**
     * Method for trying to built up a connection permanantly
     * 
     * @returns void if a connection can be established
     */
    // private async tryToConnect() {
    //     this.windowClosed = false;
    //     let connectionSuccesful: boolean = false
    //     let resultConnection: string

    //     while (!connectionSuccesful) {
    //         resultConnection = (await ssh.sshConnectionWithoutKey()).toString()
    //         console.log(resultConnection)
    //         if (!resultConnection.startsWith("Error")) {
    //             connectionSuccesful = true
    //             this.connectionLost = false
    //             await this.startEventForSerialCommunication();
    //             await this.startEventForSwitch();
    //             await ssh.setupSerialInterface();
    //             this.ioCheckPanel?.webview.postMessage({
    //                 command: 'start'
    //             })
    //             vscode.window.showInformationMessage("Connected to CC100")
    //             return
    //         }

    //         await this.Workspace.readSettingsWriteSshProperties(this.wsPath, ssh).then(result => {
    //             if (typeof result !== 'boolean') {
    //                 ssh = result;
    //             }
    //             else {
    //                 return result;
    //             }
    //         });

    //         if (this.windowClosed) {
    //             this.connectionLost = false
    //             return
    //         }
    //     }
    // }

    private async startEventForSerialCommunication(id: number) {
        let data;
        this.serialConnection = ConnectionManager.instance.getConnection(id); 
        await this.serialRead((rxData: Buffer) => {
            data = this.removeAdditionalData(rxData.toString())
            this.ioCheckPanel?.webview.postMessage({
                command: 'serialRead',
                text: data.replace(/(?:\r\n|\r|\n)/g, '')
            });
        });
        
    }

    private async serialRead(callback: (dataBuffer: Buffer) => void) {
        this.serialConnection.client.on("ready", () => {
            this.serialConnection.client.shell((err: any, stream: any) => {
              if (err) throw err;
      
              stream
                .on("close", () => {
                    this.serialConnection.client.end();
                })
                .on("data", (data: Buffer) => {
                  callback(data);
                });
      
              // Hier kannst du Befehle senden, wenn der Stream bereit ist
              stream.write("cat /dev/ttySTM1\n");
            });
        }); 
    }

    private async startEventForSwitch(id: number) {
        await ConnectionManager.instance.executeCommand(id,"./etc/config-tools/get_run_stop_switch_value").then((tmp: string) => {
            if (tmp == 'run') {
                this.switchStatus = '1'
            }
            else {
                this.switchStatus = '2'
            }
        });

    }
}
