import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SSH } from './ssh';
import { Workspace } from './extension/workspace';
import { Connection } from './extension/connection';
import sanitizeHtml from 'sanitize-html';

let ssh = new SSH('192.168.42.42', 22, 'root', '');

export class webview_IOCheck {
    private window_closed: boolean = false
    private test: boolean = false;
    private Workspace = new Workspace();
    private Connection = new Connection();

    public can_load_panel: boolean = true;
    public ioCheckPanel: vscode.WebviewPanel | undefined = undefined;
    private context: vscode.ExtensionContext;
    private readonly path_to_lib_file: string = 'src/lib/CC100IO.py';
    private ws_path: string = '';
    private connection_lost: boolean = false;
    calibData: any[][] = [['PT1', 'PT2', 'AI1', 'AI2', 'AO1', 'AO2'],
    ['9663', '1000', '40753', '3000'],
    ['9551', '1000', '40571', '3000'],
    ['14129', '2494', '41910', '7492'],
    ['14106', '2494', '41873', '7492'],
    ['1050', '350', '8978', '3000'],
    ['1044', '350', '8970', '3000']];
    private switch_status: string

    constructor(private con: vscode.ExtensionContext) {
        this.context = con;
        this.calibData = [];
        this.switch_status = '';
        this.create_new_webview();
    }

    private create_new_webview() {
        this.context.subscriptions.push(

            // The command has been defined in the package.json file
            // Now provide the implementation of the command with registerCommand
            // The commandId parameter must match the command field in package.json

            vscode.commands.registerCommand('vscode-wago-cc100.iocheck', async () => {
                // The code you place here will be executed every time your command is executed
                let ws = (await vscode.workspace.findFiles('*/*/CC100IO.py', null, 1)).at(0);
                this.ws_path = await this.Workspace.get_project_path();
                //Check if a CC100 project is opened in the explorer
                if (ws !== undefined) {

                    await this.Workspace.read_settings_write_ssh_properties(this.ws_path, ssh).then(result => {
                        if (typeof result !== 'boolean') {
                            ssh = result;
                        }
                        else {
                            return result;
                        }
                    });
                }
                else {
                    vscode.window.showErrorMessage(this.ws_path);
                    return;
                }

                // Check if an activeTextEditor is there, either it exists or it is undefined
                const columnToShowIn = vscode.window.activeTextEditor
                    ? vscode.window.activeTextEditor.viewColumn
                    : undefined;

                if (this.ioCheckPanel) {
                    if (!await ssh.is_connected()) {
                        if (!await this.Connection.check_connection(ssh)) {
                            console.log("IO Check exists")
                            return;
                        }
                    }
                    // If we already have a panel, show it in the target column
                    this.ioCheckPanel.reveal(columnToShowIn);
                } else {
                    this.can_load_panel = false;
                    // create IO-Check Webview panel 
                    if (!await this.Connection.check_connection(ssh)) {
                        this.can_load_panel = true;
                        return;
                    }

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
                                    this.can_load_panel = true;
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
                        ssh.disconnect_ssh();
                        this.window_closed = true
                        ssh.ssh2_disconnect();

                    },
                        null,
                        this.context.subscriptions
                    );
                    ssh.ssh_connection_with_key().then(() => {
                        if (this.ioCheckPanel) {
                            try {
                                this.update_io_check();
                            }
                            catch (error: any) {
                                this.ioCheckPanel.dispose();
                            }
                        }
                    });
                }
            })
        );
    }


    /**
     * This method converts a local file path to a webview path
     * @param path Relative path of the file on your device
     * @returns The given path as webview path
     */
    public get_path(path: any) {
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
        var pathHTML = path.join(this.context.extensionPath, 'res/webviews/io_check.html');
        var html = fs.readFileSync(pathHTML).toString();

        const pathCC100 = this.get_path('res/images/cc100_neu11.png').toString();
        const pathCC100Schalter = this.get_path('res/images/cc100_schalter.png').toString();
        const pathStyle1 = this.get_path('res/webviews/io_check.css').toString();
        const pathScript = this.get_path('out/ioCheck.js').toString();
        const pathWagoimg = this.get_path('res/images/wago-icons_rgb_temperature_outline_green.svg').toString();
        const pathSerialSVG = this.get_path('res/images/wago-icons_rgb_connectors_outline_green.svg').toString();
        const pathWagoimg3 = this.get_path('res/images/WagoW.png').toString();
        const pathWagoimg4 = this.get_path('res/images/wago-icons_rgb_export_outline_green.svg').toString();
        const pathWagoimg5 = this.get_path('res/images/wago-icons_rgb_import_outline_green.svg').toString();
        const pathChevron = this.get_path('res/images/wago-icons_rgb_chevron-right_outline_green.svg').toString();
        const path_cycle_time = this.get_path('res/images/wago-icons_rgb_future_outline_green.svg').toString();

        html = html.replace("../images/cc100_neu11.png", pathCC100.toString());
        html = html.replace("../images/cc100_schalter.png", pathCC100Schalter.toString());
        html = html.replace("./io_check.css", pathStyle1.toString());
        html = html.replace("../ioCheck.js", pathScript.toString());
        html = html.replace("res/images/wago-icons_rgb_temperature_outline_green.svg", pathWagoimg.toString());
        html = html.replace("res/images/wago-icons_rgb_connectors_outline_green.svg", pathSerialSVG.toString());
        html = html.replace("../images/WagoW.png", pathWagoimg3.toString());
        html = html.replace("res/images/wago-icons_rgb_export_outline_green.svg", pathWagoimg4.toString());
        html = html.replace("res/images/wago-icons_rgb_import_outline_green.svg", pathWagoimg5.toString());
        html = html.replaceAll("res/images/wago-icons_rgb_chevron-right_outline_green.svg", pathChevron.toString())
        html = html.replace('res/images/wago-icons_rgb_future_outline_green.svg', path_cycle_time.toString())
        return html;
    }

    /**
     * This method updates the UI via POST-Messages and the CC100 via SSH
     */
    async update_io_check() {
        let result: string


        if (this.ioCheckPanel) {
            await ssh.analog_calib_data().then((tmp: string) => {
                this.convert_analog_data(tmp);
            });

            await this.start_event_for_serial_communication();
            await this.start_event_for_switch();
            await ssh.setup_serial_interface();
            this.ioCheckPanel.webview.postMessage({
                command: 'start'
            })



            this.ioCheckPanel.webview.onDidReceiveMessage(
                async message => {
                    if (this.connection_lost) {
                        this.ioCheckPanel?.webview.postMessage({
                            command: 'connection_lost'
                        })
                        vscode.window.showErrorMessage('Connection lost')
                        await this.try_to_connect()
                        return
                    }
                    switch (message.command) {
                        case 'alert': {
                            vscode.window.showErrorMessage(message.text);
                            return;
                        }
                        case 'readData': {
                            await ssh.read_CC100().then((data: any) => {
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
                                let data_array = this.split_data_to_string_array(data);
                                data_array[0] = this.convert_digital(Number(data_array[0]), 'IN').toString(); // DI
                                data_array[1] = this.convert_digital(Number(data_array[1]), 'OUT').toString(); // DO
                                data_array[2] = this.calc_calibrated_values(Number(data_array[2]), this.calibData[3]).toString(); // AI1
                                data_array[3] = this.calc_calibrated_values(Number(data_array[3]), this.calibData[4]).toString(); // AI2
                                data_array[4] = this.calc_calibrated_ao_value(Number(data_array[4]), this.calibData[5]).toString(); // AO1
                                data_array[5] = this.calc_calibrated_ao_value(Number(data_array[5]), this.calibData[6]).toString(); // AO2
                                data_array[6] = this.calc_celsius(this.calc_calibrated_values(Number(data_array[6]), this.calibData[1])); // PT1
                                data_array[7] = this.calc_celsius(this.calc_calibrated_values(Number(data_array[7]), this.calibData[2])); // PT2
                                this.ioCheckPanel?.webview.postMessage({
                                    command: 'readData',
                                    values: data_array
                                })
                            })

                            if (result.includes('Error')) {
                                this.connection_lost = true;
                            }
                            break;
                        }
                        case 'readSwitch': {
                            this.ioCheckPanel?.webview.postMessage({
                                command: 'readSwitch',
                                value: this.switch_status
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
                            await ssh.digital_write(value).then(() => {
                                this.ioCheckPanel?.webview.postMessage({
                                    command: 'buttonClick'
                                })
                            });
                            break;
                        }
                        case 'analogWrite': {
                            console.log('AnalogWrite Value: ' + message.value);
                            console.log('AnalogWrite Pin: ' + message.pin);
                            var value = this.calc_calibrated_values(message.value, this.calibData[message.pin + 4]);
                            await ssh.analog_write(message.pin, value).then(() => {
                                this.ioCheckPanel?.webview.postMessage({
                                    command: 'buttonClick',
                                    pin: message.pin
                                })
                            });
                            break;
                        }
                        case 'serialWrite': {
                            await ssh.ssh2_disconnect();
                            let text = sanitizeHtml(message.text, { allowedTags: [], allowedAttributes: {} });
                            await ssh.serial_write(text).then(() => {
                                this.ioCheckPanel?.webview.postMessage({
                                    command: 'serialWrite',
                                    text: text
                                })
                            });

                            await ssh.ssh2_connect()
                            break;
                        }
                    }
                },
                undefined,
                this.context.subscriptions
            );
        }
    }

    split_data_to_string_array(data: string) {
        return data.split('\n');
    }

    /**
     * This method converts the analog data string to an array 
     * @param analogData The analog data string
     */
    convert_analog_data(analogData: string) {
        if (!analogData.includes('*')) {
            const einD1 = analogData.split('\n');
            for (let index = 0; index < einD1.length; index++) {
                this.calibData[index] = einD1[index].split(' ');
            }
        }
    }

    /**
     * This method calculates the calibrated values of AI, PT and AO(millie Volt to calibrated)
     * @param val_uncal The uncalibrated values of AI, PT and AO
     * @param calib The calibrated values for AI, PT and AO
     * @returns The calibrated values of AI, PT and AO
     */
    calc_calibrated_values(val_uncal: number, calib: string[]) {
        var x1 = parseInt(calib[0]);
        var y1 = parseInt(calib[1]);
        var x2 = parseInt(calib[2]);
        var y2 = parseInt(calib[3]);

        var val_cal = (y2 - y1) * (val_uncal - x1);
        val_cal = val_cal / (x2 - x1);
        val_cal = val_cal + y1;

        let result = parseInt(val_cal.toString());

        return (result < 0 ? 0 : result);
    }

    /**
     * This method calculates the calibrated values of AO(calibrated to millie Volt)
     * @param val_uncal The uncalibrated value of AO
     * @param calib The calibrated value for AO
     * @returns The calibrated value of AO
     */
    calc_calibrated_ao_value(val_uncal: number, calib: string[]) {
        var x1 = parseInt(calib[0]);
        var y1 = parseInt(calib[1]);
        var x2 = parseInt(calib[2]);
        var y2 = parseInt(calib[3]);

        var val_cal = (x2 - x1) * (val_uncal - y1);
        val_cal = val_cal / (y2 - y1);
        val_cal = val_cal + x1;
        this.convert_digital(1.0, 'IN')
        let result = parseInt(val_cal.toString());
        return (result < 0 ? 0 : result);
    }
    /**
     * Converts a number to a binary array
     * @param value number to convert
     * @param port either 'IN' or 'OUT'
     * @returns the binary array describing the given number
     */
    convert_digital(value: number, port: string) {
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
    calc_celsius(resistance: number) {

        // resistance value at 0°C [Ohm]
        const r0 = 1000;
        // temperature coefficient [ppm/K]
        const tk = 0.00358;
        // temperature value (rounded to 2 digits after comma) [°C]
        var val_temperature = (resistance - r0) / (r0 * tk);

        if (val_temperature > 850.00) {
            val_temperature = 0.00;
        }

        return val_temperature.toFixed(2);
    }

    /**
     * This method removes the additional data that is supplied during serial communication
     * @param data the string containing the data from serial communication
     * @returns the data from serial communication without any additional data
     */
    remove_additional_data(data: string) {
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
    private async try_to_connect() {
        this.window_closed = false;
        let connection_succesful: boolean = false
        let result_connection: string

        while (!connection_succesful) {
            result_connection = (await ssh.ssh_connection_without_key()).toString()
            console.log(result_connection)
            if (!result_connection.startsWith("Error")) {
                connection_succesful = true
                this.connection_lost = false
                await this.start_event_for_serial_communication();
                await this.start_event_for_switch();
                await ssh.setup_serial_interface();
                this.ioCheckPanel?.webview.postMessage({
                    command: 'start'
                })
                vscode.window.showInformationMessage("Connected to CC100")
                return
            }

            await this.Workspace.read_settings_write_ssh_properties(this.ws_path, ssh).then(result => {
                if (typeof result !== 'boolean') {
                    ssh = result;
                }
                else {
                    return result;
                }
            });

            if (this.window_closed) {
                this.connection_lost = false
                return
            }
        }
    }

    private async start_event_for_serial_communication() {
        let data;
        await ssh.kill_all_cat();
        await ssh.ssh2_connect()
        await ssh.serial_read((rxData: Buffer) => {
            data = this.remove_additional_data(rxData.toString())
            this.ioCheckPanel?.webview.postMessage({
                command: 'serialRead',
                text: data.replace(/(?:\r\n|\r|\n)/g, '')
            });
        });
    }

    private async start_event_for_switch() {
        ssh.read_switch_status((switch1: Buffer[]) => {
            if (switch1[10].toString() != this.switch_status) {
                this.switch_status = switch1[10].toString()
            }
        }).then((switch2: any) => {
            if (switch2 == 'run') {
                this.switch_status = '1'
            }
            else {
                this.switch_status = '2'
            }
        })
    }
}
