import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import sanitizeHtml from 'sanitize-html'
import { ConnectionManager } from './connectionManager'
import { Controller } from './view'
import { ProjectVersion } from './versionDetection'
import YAML from 'yaml'
import { extensionContext } from '../extension'

export class webviewIoCheck {
    private windowClosed: boolean = false
    private test: boolean = false

    public canLoadPanel: boolean = true
    public ioCheckPanel: vscode.WebviewPanel | undefined = undefined
    private readonly pathToLibFile: string = 'src/lib/CC100IO.py'
    private wsPath: string = ''
    private connectionLost: boolean = false
    calibData: any[][] = [
        ['PT1', 'PT2', 'AI1', 'AI2', 'AO1', 'AO2'],
        ['9663', '1000', '40753', '3000'],
        ['9551', '1000', '40571', '3000'],
        ['14129', '2494', '41910', '7492'],
        ['14106', '2494', '41873', '7492'],
        ['1050', '350', '8978', '3000'],
        ['1044', '350', '8970', '3000'],
    ]
    private switchStatus: string
    private serialConnection: any

    constructor() {
        this.calibData = []
        this.switchStatus = ''
        this.createNewWebview()
    }

    private createNewWebview() {
        extensionContext.subscriptions.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.iocheck',
                async (element: Controller) => {
                    // Check if an activeTextEditor is there, either it exists or it is undefined
                    const columnToShowIn = vscode.window.activeTextEditor
                        ? vscode.window.activeTextEditor.viewColumn
                        : undefined

                    if (this.ioCheckPanel) {
                        this.ioCheckPanel.reveal(columnToShowIn)
                    } else {
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
                        )

                        this.ioCheckPanel.webview.html =
                            this.getIOCheckWebviewContent()

                        this.ioCheckPanel.webview.onDidReceiveMessage(
                            async (message) => {
                                switch (message.command) {
                                    case 'windowLoaded': {
                                        this.canLoadPanel = true
                                        break
                                    }
                                }
                            }
                        )

                        // Webview Tab Icon
                        this.ioCheckPanel.iconPath = vscode.Uri.joinPath(
                            extensionContext.extensionUri,
                            'res/images/WAGOW.png'
                        )

                        // Reset when the current panel is closed
                        this.ioCheckPanel.onDidDispose(
                            () => {
                                // this.test = false;
                                this.ioCheckPanel = undefined
                                this.windowClosed = true
                            },
                            null,
                            extensionContext.subscriptions
                        )

                        if (this.ioCheckPanel) {
                            try {
                                if (element) {
                                    this.updateIoCheck(element.controllerId)
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
                                                    }
                                                }
                                            ),
                                            {
                                                placeHolder:
                                                    'Select a controller',
                                            }
                                        )
                                    if (controller) {
                                        this.updateIoCheck(
                                            controller.controllerId
                                        )
                                    }
                                } else {
                                    this.updateIoCheck(0)
                                }
                            } catch (error: any) {
                                this.ioCheckPanel.dispose()
                            }
                        }
                    }
                }
            )
        )
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
        )
        var webviewPath = vscode.Uri.joinPath(extensionContext.extensionUri)
        if (this.ioCheckPanel) {
            webviewPath = this.ioCheckPanel.webview.asWebviewUri(onDiskPath)
        }
        // Get the special URI to use with the webview
        return webviewPath
    }

    /**
     * This method replaces the paths in the HTML with the webview paths
     * @returns The modified HTML file as string
     */
    public getIOCheckWebviewContent() {
        var pathHTML = path.join(
            extensionContext.extensionPath,
            'res/webviews/ioCheck.html'
        )
        var html = fs.readFileSync(pathHTML).toString()

        const pathCC100 = this.getPath('res/images/cc100Neu11.png').toString()
        const pathCC100Schalter = this.getPath(
            'res/images/cc100Schalter.png'
        ).toString()
        const pathStyle1 = this.getPath('res/webviews/ioCheck.css').toString()
        const pathScript = this.getPath('out/ioCheck.js').toString()
        const pathWagoimg = this.getPath(
            'res/images/wago-iconsRgbTemperatureOutlineGreen.svg'
        ).toString()
        const pathSerialSVG = this.getPath(
            'res/images/wago-iconsRgbConnectorsOutlineGreen.svg'
        ).toString()
        const pathWagoimg3 = this.getPath('res/images/WagoW.png').toString()
        const pathWagoimg4 = this.getPath(
            'res/images/wago-iconsRgbExportOutlineGreen.svg'
        ).toString()
        const pathWagoimg5 = this.getPath(
            'res/images/wago-iconsRgbImportOutlineGreen.svg'
        ).toString()
        const pathChevron = this.getPath(
            'res/images/wago-iconsRgbChevronRightOutlineGreen.svg'
        ).toString()
        const pathCycleTime = this.getPath(
            'res/images/wago-iconsRgbFutureOutlineGreen.svg'
        ).toString()

        html = html.replace('../images/cc100Neu11.png', pathCC100.toString())
        html = html.replace(
            '../images/cc100Schalter.png',
            pathCC100Schalter.toString()
        )
        html = html.replace('./ioCheck.css', pathStyle1.toString())
        html = html.replace('../ioCheck.js', pathScript.toString())
        html = html.replace(
            'res/images/wago-iconsRgbTemperatureOutlineGreen.svg',
            pathWagoimg.toString()
        )
        html = html.replace(
            'res/images/wago-iconsRgbConnectorsOutlineGreen.svg',
            pathSerialSVG.toString()
        )
        html = html.replace('../images/WagoW.png', pathWagoimg3.toString())
        html = html.replace(
            'res/images/wago-iconsRgbExportOutlineGreen.svg',
            pathWagoimg4.toString()
        )
        html = html.replace(
            'res/images/wago-iconsRgbImportOutlineGreen.svg',
            pathWagoimg5.toString()
        )
        html = html.replaceAll(
            'res/images/wago-iconsRgbChevronRightOutlineGreen.svg',
            pathChevron.toString()
        )
        html = html.replace(
            'res/images/wago-iconsRgbFutureOutlineGreen.svg',
            pathCycleTime.toString()
        )
        return html
    }

    /**
     * This method updates the UI via POST-Messages and the CC100 via SSH
     */
    async updateIoCheck(id: number) {
        let result: string

        if (this.ioCheckPanel) {
            await ConnectionManager.instance
                .executeCommand(id, 'cat /etc/calib')
                .then((tmp: string) => {
                    this.convertAnalogData(tmp)
                })
            await this.startEventForSerialCommunication(id)
            await this.startEventForSwitch(id)

            // serieller Zugriff fehlt

            await ConnectionManager.instance.executeCommand(
                id,
                'stty -F /dev/ttySTM1 cstopb brkint -icrnl -ixon -opost -isig icanon -iexten -echo'
            )
            this.ioCheckPanel.webview.postMessage({
                command: 'start',
            })
            this.ioCheckPanel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.command) {
                        case 'alert': {
                            vscode.window.showErrorMessage(message.text)
                            return
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
                                        'ethtool ethX1 | grep "Link detected*" &&' + // LNK ACT1 | Das Auslesen der Ethernet-LEDs hat die zyklische Abfrage in IO-Check verdoppelt
                                        'ethtool ethX2 | grep "Link detected*"'
                                ) // LNK ACT2
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
                                    result = data
                                    let dataArray =
                                        this.splitDataToStringArray(data)
                                    dataArray[0] = this.convertDigital(
                                        Number(dataArray[0]),
                                        'IN'
                                    ).toString() // DI
                                    dataArray[1] = this.convertDigital(
                                        Number(dataArray[1]),
                                        'OUT'
                                    ).toString() // DO
                                    dataArray[2] = this.calcCalibratedValues(
                                        Number(dataArray[2]),
                                        this.calibData[3]
                                    ).toString() // AI1
                                    dataArray[3] = this.calcCalibratedValues(
                                        Number(dataArray[3]),
                                        this.calibData[4]
                                    ).toString() // AI2
                                    dataArray[4] = this.calcCalibratedAoValue(
                                        Number(dataArray[4]),
                                        this.calibData[5]
                                    ).toString() // AO1
                                    dataArray[5] = this.calcCalibratedAoValue(
                                        Number(dataArray[5]),
                                        this.calibData[6]
                                    ).toString() // AO2
                                    dataArray[6] = this.calcCelsius(
                                        this.calcCalibratedValues(
                                            Number(dataArray[6]),
                                            this.calibData[1]
                                        )
                                    ) // PT1
                                    dataArray[7] = this.calcCelsius(
                                        this.calcCalibratedValues(
                                            Number(dataArray[7]),
                                            this.calibData[2]
                                        )
                                    ) // PT2
                                    this.ioCheckPanel?.webview.postMessage({
                                        command: 'readData',
                                        values: dataArray,
                                    })
                                })
                            if (result.includes('Error')) {
                                this.connectionLost = true
                            }
                            break
                        }
                        case 'readSwitch': {
                            this.ioCheckPanel?.webview.postMessage({
                                command: 'readSwitch',
                                value: this.switchStatus,
                            })
                            break
                        }
                        case 'buttonClick': {
                            this.ioCheckPanel?.webview.postMessage({
                                command: 'buttonClick',
                            })
                            break
                        }
                        case 'digitalWrite': {
                            var value = 0
                            for (
                                let index = 0;
                                index < message.value.length;
                                index++
                            ) {
                                if (message.value[index] == 1) {
                                    value = value + Math.pow(2, index)
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
                                    })
                                })
                            break
                        }
                        case 'analogWrite': {
                            console.log('AnalogWrite Value: ' + message.value)
                            console.log('AnalogWrite Pin: ' + message.pin)
                            var value = this.calcCalibratedValues(
                                message.value,
                                this.calibData[message.pin + 4]
                            )
                            await ConnectionManager.instance
                                .executeCommand(id, '')
                                .then(() => {
                                    this.ioCheckPanel?.webview.postMessage({
                                        command: 'buttonClick',
                                        pin: message.pin,
                                    })
                                })
                            break
                        }
                        case 'serialWrite': {
                            let text = sanitizeHtml(message.text, {
                                allowedTags: [],
                                allowedAttributes: {},
                            })
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
                                    })
                                })
                            break
                        }
                    }
                },
                undefined,
                extensionContext.subscriptions
            )
        }
    }

    splitDataToStringArray(data: string) {
        return data.split('\n')
    }

    /**
     * This method converts the analog data string to an array
     * @param analogData The analog data string
     */
    convertAnalogData(analogData: string) {
        if (!analogData.includes('*')) {
            const einD1 = analogData.split('\n')
            for (let index = 0; index < einD1.length; index++) {
                this.calibData[index] = einD1[index].split(' ')
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
        var x1 = parseInt(calib[0])
        var y1 = parseInt(calib[1])
        var x2 = parseInt(calib[2])
        var y2 = parseInt(calib[3])

        var valCal = (y2 - y1) * (valUncal - x1)
        valCal = valCal / (x2 - x1)
        valCal = valCal + y1

        let result = parseInt(valCal.toString())

        return result < 0 ? 0 : result
    }

    /**
     * This method calculates the calibrated values of AO(calibrated to millie Volt)
     * @param valUncal The uncalibrated value of AO
     * @param calib The calibrated value for AO
     * @returns The calibrated value of AO
     */
    calcCalibratedAoValue(valUncal: number, calib: string[]) {
        var x1 = parseInt(calib[0])
        var y1 = parseInt(calib[1])
        var x2 = parseInt(calib[2])
        var y2 = parseInt(calib[3])

        var valCal = (x2 - x1) * (valUncal - y1)
        valCal = valCal / (y2 - y1)
        valCal = valCal + x1
        this.convertDigital(1.0, 'IN')
        let result = parseInt(valCal.toString())
        return result < 0 ? 0 : result
    }
    /**
     * Converts a number to a binary array
     * @param value number to convert
     * @param port either 'IN' or 'OUT'
     * @returns the binary array describing the given number
     */
    convertDigital(value: number, port: string) {
        var values
        if (port == 'IN') {
            values = [0, 0, 0, 0, 0, 0, 0, 0]
        } else {
            values = [0, 0, 0, 0]
        }
        for (let index = 0; index < values.length; index++) {
            values[index] = (value >> index) % 2
        }
        return values
    }

    /**
     * This method calculates the temperature value out of the given resistance value of the PT1000
     * @param resistance The calibrated value of the PT [Ohm]
     */
    calcCelsius(resistance: number) {
        // resistance value at 0°C [Ohm]
        const r0 = 1000
        // temperature coefficient [ppm/K]
        const tk = 0.00358
        // temperature value (rounded to 2 digits after comma) [°C]
        var valTemperature = (resistance - r0) / (r0 * tk)

        if (valTemperature > 850.0) {
            valTemperature = 0.0
        }

        return valTemperature.toFixed(2)
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
        } else if (data.includes(trash2) && data.includes(trash21)) {
            return ''
        } else if (data.includes(trash3)) {
            return ''
        } else if (data == trash4) {
            return ''
        } else {
            return data
        }
    }

    private async startEventForSerialCommunication(id: number) {
        let data
        this.serialConnection =
            await ConnectionManager.instance.getConnection(id)
        await this.serialRead((rxData: Buffer) => {
            data = this.removeAdditionalData(rxData.toString())
            this.ioCheckPanel?.webview.postMessage({
                command: 'serialRead',
                text: data.replace(/(?:\r\n|\r|\n)/g, ''),
            })
        })
    }

    private async serialRead(callback: (dataBuffer: Buffer) => void) {
        this.serialConnection.streamCommand(
            'cat /dev/ttySTM1\n',
            (data: Buffer) => {
                callback(data)
            },
            (error: any) => {
                console.error(error)
            }
        )
    }

    private async startEventForSwitch(id: number) {
        await ConnectionManager.instance
            .executeCommand(id, './etc/config-tools/get_run_stop_switch_value')
            .then((tmp: string) => {
                if (tmp == 'run') {
                    this.switchStatus = '1'
                } else {
                    this.switchStatus = '2'
                }
            })
    }
}

type ControllerType = {
    id: number
    displayname: string
    description: string
    engine: string
    src: string
    imageVersion: string
}
/**
 * Represents the settings for a controller.
 *
 * @property connection - The type of connection used by the controller (e.g., "ethernet", "usb-c").
 * @property ip - The IP address of the controller.
 * @property port - The port number used for communication with the controller.
 * @property user - The username for authentication with the controller.
 * @property autoupdate - The auto-update setting for the controller (e.g., "on", "off").
 */
type ControllerSettingsType = {
    connection: string
    ip: string
    port: number
    user: string
    autoupdate: string
}
export class YamlCommands {
    /**
     * Function to read the content of the wago.yaml file.
     *
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getWagoYaml() {
        return YAML.parse(
            fs.readFileSync(
                `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
                'utf8'
            )
        )
    }

    /**
     * Function to read the content of the wago.yaml file.
     *
     * @returns The content of the wago.yaml file as a JS object
     */
    private static getControllerYaml(id: number) {
        return YAML.parse(
            fs.readFileSync(
                `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`,
                'utf8'
            )
        )
    }

    /**
     * Retrieves an array of controller objects from the Wago YAML configuration.
     *
     * @returns {Array<ControllerType>} An array of controller objects, each containing:
     * - `id`: The numeric identifier of the controller.
     * - `displayname`: The display name of the controller.
     * - `description`: A brief description of the controller.
     * - `engine`: The engine type associated with the controller.
     * - `src`: The source path or URL of the controller.
     * - `imageVersion`: The version of the controller's image.
     */
    public static getControllers(): Array<ControllerType> {
        const nodes = this.getWagoYaml().nodes
        return Object.keys(nodes).map((key: string) => ({
            id: Number.parseInt(key),
            displayname: nodes[key].displayname,
            description: nodes[key].description,
            engine: nodes[key].engine,
            src: nodes[key].src,
            imageVersion: nodes[key].imageVersion,
        }))
    }

    /**
     * Retrieves a controller by its unique identifier.
     *
     * @param id - The unique identifier of the controller to retrieve.
     * @returns The controller matching the given ID, or `undefined` if no match is found.
     */
    public static getController(id: number): ControllerType | undefined {
        return this.getControllers().find((controller) => controller.id === id)
    }

    /**
     * Retrieves the controller settings for a given controller ID.
     *
     * @param id - The unique identifier of the controller.
     * @returns An object containing the controller settings, including:
     * - `connection`: The connection type or protocol.
     * - `ip`: The IP address of the controller.
     * - `port`: The port number used for communication.
     * - `user`: The username for authentication.
     * - `autoupdate`: A flag indicating whether auto-update is enabled.
     */
    public static getControllerSettings(id: number): ControllerSettingsType {
        const settings = this.getControllerYaml(id)
        return {
            connection: settings.connection,
            ip: settings.ip,
            port: settings.port,
            user: settings.user,
            autoupdate: settings.autoupdate,
        }
    }

    /**
     * Method for changing the contents of the wago.yaml
     *
     * @param id Id of the controller
     * @param attribute Name of the attribute that is to be changed (enum)
     * @param value Value that is to be written into the attribute (string)
     */
    public static writeWagoYaml(
        id: number,
        attribute: wagoSettings,
        value: string
    ) {
        let yaml = this.getWagoYaml()
        yaml.nodes[id][attribute] = value
        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
            YAML.stringify(yaml, null, '\t')
        )
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
    public static writeControllerYaml(
        id: number,
        attribute: controllerSettings,
        value: string
    ) {
        let yaml = this.getControllerYaml(id)
        if (attribute === controllerSettings.port) {
            yaml[attribute] = Number(value)
        } else {
            yaml[attribute] = value
        }
        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`,
            YAML.stringify(yaml, null, '\t')
        )
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
    public static async createController(
        context: vscode.ExtensionContext,
        displayname: string,
        description: string,
        engine: string,
        src: string,
        imageVersion: string
    ) {
        //Addition of the Controller to wago.yaml
        let id = this.findNextID()

        let obj = {
            nodes: {
                [id]: {
                    displayname: displayname,
                    description: description,
                    engine: engine,
                    src: src,
                    imageVersion: imageVersion,
                },
            },
        }

        let yaml = this.getWagoYaml()
        yaml.nodes[id] = obj.nodes[id]

        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
            YAML.stringify(yaml, null, '\t')
        )

        //Adding Controller to corresponding controllers/controller[id].yaml file
        fs.cpSync(
            `${context.extensionPath}/res/template/controller/controller1.yaml`,
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`
        )
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
        let yaml = this.getWagoYaml()
        delete yaml.nodes[id]
        fs.writeFileSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`,
            YAML.stringify(yaml, null, '\t')
        )

        //remove Controller configuration file
        let controllerPath = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/controller${id}.yaml`
        if (fs.existsSync(controllerPath)) fs.unlinkSync(controllerPath)
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
        let yaml = this.getWagoYaml()
        let id = 1
        while (yaml.nodes[id] != undefined) {
            id++
        }
        return id
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
    imageVersion = 'imageVersion',
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
    autoupdate = 'autoupdate',
}
