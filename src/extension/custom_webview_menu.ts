import * as vscode from 'vscode'
import fs from 'fs'
import { SSH } from '../ssh';
import { Connection } from './connection';
import { Workspace } from './workspace';
import { webviewIoCheck } from '../webviewIoCheck';


export class customWebviewProviderMenu {

    public static readonly viewType = 'menu';

    private ssh = new SSH('192.168.42.42', 0, 'root', '');
    private Workspace = new Workspace();
    private Connection = new Connection();
    private ioCheck: webviewIoCheck;
    private readonly destPath: string = '/home/user/python_bootapplication/';
    private readonly destPathToIpk: string = this.destPath + '../python3_3.7.6_armhf.ipk';
    private readonly filenameOnStartup: string = 'S99_python_runtime';
    private outputChannel: vscode.OutputChannel;


    constructor(
        private readonly _extensionUri: vscode.Uri,
        io_check: webviewIoCheck) {
        this.ioCheck = io_check;
        this.outputChannel = vscode.window.createOutputChannel("CC100 Python"); //, {log:!0});
    }

    /**
     * A Method for registering commands.
     * 
     * @param context The extension `context`.
     */
    public registerCommands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.application_upload", async () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Uploading application",
            }, async (progress) => {
                await this.runApplication(false, progress);
            });
        }));
        context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.debug", async () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Starting debug",
            }, async (progress) => {
                await this.runApplication(true, progress);
            });
        }));
    }

    /**
     * A Method for creating and displaying the status bar.
     * 
     * @param context The extension `context`.
     */
    public createStatusBar(context: vscode.ExtensionContext) {
        let upload = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        upload.command = "vscode-wago-cc100.application_upload";
        upload.tooltip = "Upload your project";
        upload.text = "$(arrow-circle-up)";
        context.subscriptions.push(upload);
        upload.show();

        let debug = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        debug.command = "vscode-wago-cc100.debug";
        debug.tooltip = "Debug your project";
        debug.text = "$(debug)";
        context.subscriptions.push(debug);
        debug.show();
    }
    
    /**
   * After this function is called, a current open project in workspace is uploaded on CC100 and will be executed.
   * 
   * @param debug set true if the debug application should be run in debug mode
   * @param progress the progress object used to display the statusbar in the popup
   */
    private async runApplication(debug: boolean, progress: any): Promise<void> {
        let wsPath = await this.Workspace.getProjectPath();
        if (!wsPath.startsWith("Error")) {
            await this.Workspace.readSettingsWriteSshProperties(wsPath, this.ssh).then(result => {
                if (typeof result !== 'boolean') {
                    this.ssh = result;
                }
                else {
                    return result;
                }
            });

            if (!await this.Connection.checkConnection(this.ssh)) {
                return;
            }
            progress.report({ increment: 25, message: "Connected to CC100" })
            let resultCheckForLatestPythonVersion = await this.checkForLatestPythonVersion();
            if (!(typeof resultCheckForLatestPythonVersion == "boolean")) {
                return;
            }
            else if (!resultCheckForLatestPythonVersion) {
                if (!await this.update_python_version()) {
                    vscode.window.showErrorMessage("Error: Could not update Python");
                    progress.report({ increment: 100, message: "ERROR" })
                    return;
                }
            }
            progress.report({ increment: 15, message: "Ensured Python..." })
            await this.ssh.sshConnectionWithKey().then(async () => {
                await this.ssh.setupSerialInterface();
                await this.ssh.disconnectSsh();
            })

            if (!await this.upload_application(wsPath)) {
                vscode.window.showErrorMessage("Error: Upload failed");
                progress.report({ increment: 100, message: "ERROR" })
                return;
            }
            progress.report({ increment: 35, message: "Files transfered..." })
            await this.createBootapplication();
            for (var i = 0; i < vscode.debug.breakpoints.length; i++) {
                let breakpointFilepathParts = (vscode.debug.breakpoints[i] as vscode.SourceBreakpoint).location.uri.path.split('/');
                if (breakpointFilepathParts[breakpointFilepathParts.length - 1] != "main.py") {
                    vscode.debug.removeBreakpoints([vscode.debug.breakpoints[i]]);
                }
            }
            progress.report({ increment: 5, message: "Created bootapplicaton..." })
            if (debug && vscode.debug.breakpoints.length > 0) {
                const data: string[] = this.set_breakpoint();
                await this.startDebugging(data[0], data[1]);
                progress.report({ increment: 100, message: "Debug started" })
            } else {
                if (debug) {
                    progress.report({ increment: 10, message: "No breakpoints set, starting application..." })
                }
                await this.startApplication();
                progress.report({ increment: 100, message: "Application started" })
                // Reset IO-Check
                if (this.ioCheck.ioCheckPanel != undefined) {
                    this.ioCheck.ioCheckPanel.webview.postMessage({ command: 'reload' })
                }
                await this.createLogListener();
            }
        }
        else {
            console.log(wsPath);
            vscode.window.showErrorMessage(wsPath);
            progress.report({ increment: 100, message: "ERROR" })
        }
    }



    /**
     * Method to examine the current python version on the device. Also transfers the .ipk onto the device if necessary.
     * 
     * @returns `true` if the current python version is installed, otherwise `false`. Returns `void` if an error occured while transferring the necessary package. 
     */
    private async check_for_latest_python_version(): Promise<Boolean | void> {
        await this.ssh.sshConnectionWithKey();
        let currentPythonVersionInstalled: boolean;
        let resultGetPythonVersion = await this.ssh.getPythonVersion();
        if (!resultGetPythonVersion.startsWith("Error")) {
            currentPythonVersionInstalled = true;
            console.log("Necessary python version already installed");
        }
        else {
            currentPythonVersionInstalled = false;
            console.log("Error: Necessary python version not installed. Doing it now:");
            let resultTransferIpk = await this.ssh.transferDirectory(__dirname + '/../../res/python_files/python3_3.7.6_armhf.ipk', this.dest_path_to_ipk);
            if (!resultTransferIpk.toString().startsWith('Error')) {
                console.log(".ipk file successfully transferred");
            }
            else {
                console.log("Error: .ipk file cannot be transferred");
                console.log(resultTransferIpk);
                return;
            }
        }
        await this.ssh.disconnectSsh();
        return currentPythonVersionInstalled;
    }

    /**
     * 
     * Method for updating the python version on the device.
     * 
     * @returns `true` if python was updated, otherwise `false`
     */
    private async updatePythonVersion(): Promise<boolean> {
        let updatedPython: boolean = false;
        console.log("Python will be updated");
        await this.ssh.sshConnectionWithKey().then(async () => {
            let resultInstallPackage = await this.ssh.installPackage(this.destPathToIpk);
            if (resultInstallPackage.startsWith("Error")) {
                console.log("Error: Installing python failed");
                console.log(resultInstallPackage);
            }
            else {
                console.log("Installed python successfully");
                let resultDeleteIpk = await this.ssh.deleteFiles(this.destPathToIpk);
                if (!resultDeleteIpk.startsWith("Error")) {
                    console.log("Deleted ipk-File successfully");
                }
                else {
                    console.log("Error: Deletion of ipk-File failed");
                    console.log(resultDeleteIpk);
                }
                await this.ssh.disconnectSsh();
                updatedPython = true;
            }
        });
        return updatedPython;
    }

    /**
     * Method for uploading the application that should run onto the CC100.
     * 
     * @param wsPath Path to to current opened CC100IO project.
     * @returns `true` if the application was uploaded successfully, otherwise `false`
     */
    private async uploadApplication(wsPath: string): Promise<boolean> {
        let uploadedApplication: boolean = false;
        await this.ssh.sshConnectionWithKey().then(async () => {
            await this.ssh.deleteFiles(this.destPath + 'errorLog');
            await this.ssh.killAllTails();
            await this.ssh.updateTime(this.create_timestamp());
            let result_upload_application = await this.ssh.transferDirectory(wsPath + "src", this.destPath.substring(0, this.destPath.length - 1));
            if (!resultUploadApplication.startsWith("Error")) {
                console.log("Application upload successful");
                uploadedApplication = true;
            }
            else {
                console.log("Error: Application upload failed");
            }
            await this.ssh.disconnectSsh();
        });
        return uploadedApplication;
    }

    /**
     * Method for killing all running python scripts and start a new one.
     */
    private async start_application(): Promise<void> {
        await this.ssh.sshConnectionWithKey().then(async () => {
            console.log("Connected to CC100");
            let resultKillAllPythonScripts = await this.ssh.killAllPythonScripts();
            if (resultKillAllPythonScripts.startsWith("Error")) {
                console.log("Error: Cannot kill python scripts");
                console.log(resultKillAllPythonScripts);
            }
            else {
                console.log("Kill all running python scripts");
            }
            let resultStartPythonScript = await this.ssh.startPythonScript(this.destPath + "/lib/runtimeCC.py");
            if (!(resultStartPythonScript.toString().startsWith("Error"))) {
                console.log("Application started");
            }
            else {
                console.log("Error: Application cannot be started");
                console.log(resultStartPythonScript);
            }
            await this.ssh.disconnectSsh();
        });
    }

    /**
     * Method for creating a bootapplication on the device.
     * 
     * @returns `true` if the bootapplication was created, otherwise `false`.
     */
    private async creatBootapplication(): Promise<boolean> {
        let resultCreatedBootapplication: boolean = false;
        await this.ssh.sshConnectionWithKey()
        let resultUploadBootapplication = await this.ssh.putInit();
        if (!resultUploadBootapplication.startsWith("Error")) {
            console.log("Bash file created successfully");
            let resultMakeFileExecutable = await this.ssh.makeFileToExecutableFile(this.filenameOnStartup);
            if (!resultMakeFileExecutable.startsWith("Error")) {
                console.log("Changed Filemode to executable");
                let resultCreateSymlink = await this.ssh.createSymlink(this.filenameOnStartup);
                if (!resultCreateSymlink.startsWith("Error")) {
                    console.log("Created symbolic link successfully");
                    resultCreatedBootapplication = true;
                }
                else {
                    console.log("Error: Could not create symbolic link");
                    console.log(resultCreateSymlink);
                }
            }
            else {
                console.log("Error: Could not make file to executable");
                console.log(resultMakeFileExecutable);
            }
        }
        else {
            console.log("Error: File transfer failed");
            console.log(resultUploadBootapplication);
        }
        await this.ssh.disconnectSsh();
        return resultCreatedBootapplication;
    }

    /**
     * This method places via string manipulation a `breakpoint()` at the corresponding line in the python script
     * @returns The modified python script as string
     */
    private setBreakpoint(): string[] {
        try {
            let breakpointFilepathParts: string[] = (vscode.debug.breakpoints[0] as vscode.SourceBreakpoint).location.uri.fsPath.split('\\');
            let breakpointFilename: string = breakpointFilepathParts.slice(breakpointFilepathParts.indexOf('src') + 1, breakpointFilepathParts.length).toString();
            let script: string[] = fs.readFileSync(breakpointFilepatParts.join('\\')).toString().split('\n');

            let breakpointLines: number[] = [];
            let leadingSpaces: string[] = [];

            let debugScript: string = '';

            for (var i = 0; i < vscode.debug.breakpoints.length; i++) {

                breakpointLines[i] = (vscode.debug.breakpoints[i] as vscode.SourceBreakpoint).location.range.start.line;

                const scriptLine = script[breakpointLines[i]].match(/^\s+/g);
                if (scriptLine) {
                    leadingSpaces[i] = scriptLine[0];
                } else {
                    leadingSpaces[i] = '';
                }
            }

            for (var i = 0; i < script.length; i++) {
                debugScript += (breakpointLines.indexOf(i) > -1) ? leadingSpaces[breakpointLines.indexOf(i)] + 'breakpoint()\n' : '';
                debugScript += script[i] + '\n';
            }

            return new Array(breakpointFilename.slice(0, breakpointFilename.length - 3).toString().concat("_debug.py"), debugScript);
        }
        catch {
            return new Array('', '');
        }
    }

    /**
     * This method starts the debugging process, by setting the breakpoint and starting the script within a bash on the CC100 
     * @returns `false` if any errors occur, otherwise `true`
     */
    private async startDebugging(filename: string, data: string): Promise<boolean> {
        try {
            await this.ssh.sshConnectionWithKey().then(async () => {
                console.log("Connected to CC100");
                await this.ssh.createFile(this.destPath.concat(filename), data);
                await this.ssh.killAllPythonScripts();
                console.log("Breakpoint set");
                await this.ssh.disconnectSsh();
                console.log('Disconnected');
            });

            const os = process.platform;
            let shell = '';
            switch (os) {
                case "linux":
                    shell = '/bin/bash';
                    break;
                case "darwin":
                    shell = '/bin/zsh';
                    break;
                default:
                    shell = 'powershell.exe';
                    break;
            }
            var debuggingTerminal = vscode.window.createTerminal('Debugging', shell, undefined);

            debuggingTerminal.sendText(`ssh -i ${this._extensionUri.fsPath}/res/.ssh/id_rsa ${this.ssh.username}@${this.ssh.ipAdress} "python3 /home/user/python_bootapplication/main_debug.py"`, true);
            debuggingTerminal.show();
            return true;
        }
        catch {
            return false;
        }
    }


    /**
     * A Method that creates a listener that will be executed if the log file changes.
     */
    private async createLogListener() {
        this.outputChannel.show()
        let result = (await this.ssh.sshConnectionWithKey()).toString();
        if (!result.includes("Error")) {
            return new Promise(async (resolve, reject) => {
                resolve(null)
                await this.ssh.readLog(this.write_log.bind(this.write_log))
            })
        }
    }

    private writeLog = (data: Buffer) => {
        let logMessage: string = data.toString();
        if (!logMessage.startsWith("tail")) {
            this.outputChannel.append(logMessage);
        }
    }
    /**
     * Formats a number into a number with at least 2 digits (01, 02, 03, etc.)
     * @param num the number that will be converted
     * @returns A number with at least 2 digits
     */
    private formatNumber(num: number) {
        return num < 10 ? '0' + num : num;
    }
    /**
     * Generates a timestamp for the current time
     * @returns a timestamp with the format MMDDHHmmYYYY.ss
     */
    private create_timestamp() {
        const now = new Date;
        const year = this.formatNumber(now.getFullYear());
        const month = this.formatNumber(now.getMonth() + 1);
        const day = this.formatNumber(now.getDate());
        const hours = this.formatNumber(now.getHours());
        const minutes = this.formatNumber(now.getMinutes());
        const seconds = this.formatNumber(now.getSeconds());
        const timestamp = `${month}${day}${hours}${minutes}${year}.${seconds}`;

        return timestamp;
    }
}
