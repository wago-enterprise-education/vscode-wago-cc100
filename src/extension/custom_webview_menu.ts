import * as vscode from 'vscode'
import fs from 'fs'
import path from 'path';
import { SSH } from '../ssh';
import { Connection } from './connection';
import { Workspace } from './workspace';
import { webview_IOCheck } from '../webview_IOCheck';


export class custom_webview_provider_menu implements vscode.WebviewViewProvider {

    public static readonly viewType = 'menu';

    private ssh = new SSH('192.168.42.42', 0, 'root', '');
    private Workspace = new Workspace();
    private Connection = new Connection();
    private io_check: webview_IOCheck;
    public _view?: vscode.WebviewView;
    private readonly dest_path: string = '/home/user/python_bootapplication/';
    private readonly dest_path_to_ipk: string = this.dest_path + '../python3_3.7.6_armhf.ipk';
    private readonly path_to_lib_file: string = 'src/lib/CC100IO.py';
    private readonly filename_on_startup: string = 'S99_python_runtime';
    private readonly path_to_file_on_startup: string = '/etc/init.d/' + this.filename_on_startup;
    private readonly path_to_symbolic_link: string = '/etc/rc.d/' + this.filename_on_startup;
    private readonly path_to_log_file: string = "/home/user/python_bootapplication/errorLog"
    private output_channel: vscode.OutputChannel;


    constructor(
        private readonly _extensionUri: vscode.Uri,
        io_check: webview_IOCheck) {
        this.io_check = io_check;
        this.output_channel = vscode.window.createOutputChannel("CC100 Python"); //, {log:!0});
    }

    /**
     * A Method for registering commands.
     * 
     * @param context The extension `context`.
     */
    public register_commands(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.application_upload", async () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Uploading application",
            }, async (progress) => {
                await this.run_application(false, progress);
            });
        }));
        context.subscriptions.push(vscode.commands.registerCommand("vscode-wago-cc100.debug", async () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Starting debug",
            }, async (progress) => {
                await this.run_application(true, progress);
            });
        }));
    }

    /**
     * A Method for creating and displaying the status bar.
     * 
     * @param context The extension `context`.
     */
    public create_status_bar(context: vscode.ExtensionContext) {
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
     * Create the webview
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this.getWebViewContent(webviewView.webview);

        // Handling of the incoming messages from the webview
        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.command) {
                case 'cmd_application_upload':
                    {
                        await this.btn_application_upload_clicked();
                        break;
                    }
                case 'cmd_debug':
                    {
                        this.output_channel.clear();
                        vscode.commands.executeCommand('vscode-wago-cc100.debug');
                        break;
                    }
                case 'cmd_io_check':
                    {
                        this.btn_io_check_clicked();
                        break;
                    }
                case 'cmd_simulation':
                    {
                        this.btn_simulation_clicked();
                        break;
                    }
                case 'cmd_home':
                    {
                        this.btn_home_clicked();
                        break;
                    }
                case 'cmd_delete':
                    {
                        this.btn_delete_clicked();
                        break;
                    }
                case 'cmd_download': {
                    this.btn_download_clicked()
                    break;
                }
                case 'cmd_loaded': {
                    let ws = (await vscode.workspace.findFiles('*/*/CC100IO.py', null, 1)).at(0);
                    webviewView.webview.postMessage({ command: 'cmd_set_download', value: ws !== undefined })
                    break;
                }
            }
        });
    }

    /**
     * Method for replacing the resource paths in the html source code with paths relative to the extension installation
     * @param webview The webview of the menu
     * @returns A string containig the html content with correct paths
     */
    private getWebViewContent(webview: vscode.Webview): string {
        var html = fs.readFileSync(path.join(__dirname, '../../res/webviews/menu.html'), "utf-8").toString();

        const path_css = vscode.Uri.joinPath(this._extensionUri, 'res/webviews/menu.css');
        const path_js = vscode.Uri.joinPath(this._extensionUri, 'out/Extension/menu.js');
        const pathImgPlay = vscode.Uri.joinPath(this._extensionUri, 'res/images/wago-icons_rgb_play_outline_green.svg');
        const pathImgUpload = vscode.Uri.joinPath(this._extensionUri, 'res/images/wago-icons_rgb_upload_outline_green.svg');
        const pathImgView = vscode.Uri.joinPath(this._extensionUri, 'res/images/wago-icons_rgb_view_outline_green.svg');
        const pathImgDelete = vscode.Uri.joinPath(this._extensionUri, 'res/images/wago-icons_rgb_delete_outline_green.svg');
        const pathImgHome = vscode.Uri.joinPath(this._extensionUri, 'res/images/wago-icons_rgb_house_outline_green.svg');
        const pathImgDownload = vscode.Uri.joinPath(this._extensionUri, 'res/images/wago-icons_rgb_import_outline_green.svg');
        const pathImgDebug = vscode.Uri.joinPath(this._extensionUri, 'res/images/wago-icons_rgb_tools_outline_green.svg');
        const js = webview.asWebviewUri(path_js).toString();
        const css = webview.asWebviewUri(path_css).toString();
        const imgPlay = webview.asWebviewUri(pathImgPlay).toString();
        const imgUpload = webview.asWebviewUri(pathImgUpload).toString();
        const imgView = webview.asWebviewUri(pathImgView).toString();
        const imgDelete = webview.asWebviewUri(pathImgDelete).toString();
        const imgHome = webview.asWebviewUri(pathImgHome).toString();
        const imgImport = webview.asWebviewUri(pathImgDownload).toString();
        const imgDebug = webview.asWebviewUri(pathImgDebug).toString();

        html = html.replace("../../out/Extension/menu.js", js);
        html = html.replace("menu.css", css);
        html = html.replace("../images/wago-icons_rgb_play_outline_green.svg", imgPlay);
        html = html.replace("../images/wago-icons_rgb_upload_outline_green.svg", imgUpload);
        html = html.replace("../images/wago-icons_rgb_view_outline_green.svg", imgView);
        html = html.replace("../images/wago-icons_rgb_delete_outline_green.svg", imgDelete);
        html = html.replace("../images/wago-icons_rgb_house_outline_green.svg", imgHome);
        html = html.replace("../images/wago-icons_rgb_import_outline_green.svg", imgImport);
        html = html.replace("../images/wago-icons_rgb_tools_outline_green.svg", imgDebug)
        return html;
    }
    /**
     * Trys to connect to the connected CC100 through the connection defined in the settings and downloads the project from the CC100 into the current project.
     */
    private async btn_download_clicked() {
        let ws_path = await this.Workspace.get_project_path();
        if (!ws_path.startsWith("Error")) {
            vscode.window.showInformationMessage("Trying to connect...")
            await this.Workspace.read_settings_write_ssh_properties(ws_path, this.ssh).then(result => {
                if (typeof result !== 'boolean') {
                    this.ssh = result;
                }
                else {
                    return;
                }
            });

            if (!await this.Connection.check_connection(this.ssh)) {
                return;
            }

            let result = await this.ssh.ssh_connection_with_key();
            if (!result.toString().startsWith('Error')) {
                console.log("Connection successful");

                await this.ssh.delete_files(this.dest_path + 'errorLog');
                await this.ssh.delete_files(this.dest_path + '__pycache__/');
                await this.ssh.delete_files(this.dest_path + 'main_debug.py')
                let lib_content = await this.ssh.list_content_dir(this.dest_path + 'lib/');
                let lib_content_array = lib_content.split("\n");
                // Remove non python files
                for (const element of lib_content_array) {
                    if (!element.includes(".py")) {
                        await this.ssh.delete_files(this.dest_path + 'lib/' + element)
                    }
                }
                let result = await this.ssh.get_directory(ws_path + 'src', this.dest_path);
                if (result.startsWith('Error: ')) {
                    if (result.includes('No such file')) {
                        vscode.window.showErrorMessage("Error: Could not find application on CC100");
                    } else {
                        vscode.window.showErrorMessage("Error: Unexpected error during copying");
                    }
                    console.log(result);
                } else {
                    console.log("Files transfered")
                    vscode.window.showInformationMessage("Download successful")
                }
                await this.ssh.disconnect_ssh();
            }
            else {
                console.log("Error: Cannot connect to CC100. Download canceled");
                console.log(result);
                vscode.window.showErrorMessage("Error: Could not connect to CC100");
            }
        }
        else {
            console.log(ws_path);
            vscode.window.showErrorMessage(ws_path);
        }

    }

    /**
    * Method that will be executed when "delete" is clicked in the treeview
    **/
    private async btn_delete_clicked() {
        let ws_path = await this.Workspace.get_project_path();
        if (!ws_path.startsWith("Error")) {
            vscode.window.showInformationMessage("Trying to connect...")

            await this.Workspace.read_settings_write_ssh_properties(ws_path, this.ssh).then(result => {
                if (typeof result !== 'boolean') {
                    this.ssh = result;
                }
                else {
                    return;
                }
            });

            if (!await this.Connection.check_connection(this.ssh)) {
                return;
            }

            let result = await this.ssh.ssh_connection_with_key();
            if (!result.toString().startsWith('Error')) {
                console.log("Connection successful");
                await this.ssh.kill_all_python_scripts();
                await this.ssh.delete_files(this.dest_path);
                await this.ssh.delete_files(this.path_to_file_on_startup);
                await this.ssh.delete_files(this.path_to_symbolic_link);
                await this.ssh.digital_write(0);
                await this.ssh.analog_write(1, 0);
                await this.ssh.analog_write(2, 0);
                await this.ssh.turn_off_run_led();
                await this.ssh.kill_all_tails();
                await this.ssh.disconnect_ssh();
                vscode.window.showInformationMessage("Removed application from CC100");
            }
            else {
                console.log("Error: Cannot connect to CC100. Deletion canceled");
                console.log(result);
                vscode.window.showErrorMessage("Error: Could not connect to CC100");
            }
        }
        else {
            console.log(ws_path);
            vscode.window.showErrorMessage(ws_path);
        }
    }

    /**
    * Method that will be executed when "home" is clicked in the treeview
    **/
    private async btn_home_clicked() {
        vscode.commands.executeCommand('vscode-wago-cc100.home');
    }

    /**
    * Method that will be executed when "upload" is clicked in the treeview
    **/
    private async btn_application_upload_clicked() {
        this.output_channel.clear();

        vscode.commands.executeCommand("vscode-wago-cc100.application_upload")
    }

    /**
    * Method that will be executed when "IO-Check" is clicked in the treeview
    **/
    private btn_io_check_clicked() {
        if (this.io_check.can_load_panel) {
            vscode.commands.executeCommand('vscode-wago-cc100.iocheck');
            if (!this.io_check.ioCheckPanel) {
                vscode.window.showInformationMessage("Trying to connect...")
            }
        }
    }

    /**
    * Method that will be executed when "Simulation" is clicked in the treeview
    **/
    private async btn_simulation_clicked() {
        vscode.commands.executeCommand('simpleBrowser.show', 'http://localhost:3000');
        vscode.window.showInformationMessage("Starting simulation...");
    }

    /**
   * After this function is called, a current open project in workspace is uploaded on CC100 and will be executed.
   * 
   * @param debug set true if the debug application should be run in debug mode
   * @param progress the progress object used to display the statusbar in the popup
   */
    private async run_application(debug: boolean, progress: any): Promise<void> {
        let ws_path = await this.Workspace.get_project_path();
        if (!ws_path.startsWith("Error")) {
            await this.Workspace.read_settings_write_ssh_properties(ws_path, this.ssh).then(result => {
                if (typeof result !== 'boolean') {
                    this.ssh = result;
                }
                else {
                    return result;
                }
            });

            if (!await this.Connection.check_connection(this.ssh)) {
                return;
            }
            progress.report({ increment: 25, message: "Connected to CC100" })
            let result_check_for_latest_python_version = await this.check_for_latest_python_version();
            if (!(typeof result_check_for_latest_python_version == "boolean")) {
                return;
            }
            else if (!result_check_for_latest_python_version) {
                if (!await this.update_python_version()) {
                    vscode.window.showErrorMessage("Error: Could not update Python");
                    progress.report({ increment: 100, message: "ERROR" })
                    return;
                }
            }
            progress.report({ increment: 15, message: "Ensured Python..." })
            await this.ssh.ssh_connection_with_key().then(async () => {
                await this.ssh.setup_serial_interface();
                await this.ssh.disconnect_ssh();
            })

            if (!await this.upload_application(ws_path)) {
                vscode.window.showErrorMessage("Error: Upload failed");
                progress.report({ increment: 100, message: "ERROR" })
                return;
            }
            progress.report({ increment: 35, message: "Files transfered..." })
            await this.create_bootapplication();
            for (var i = 0; i < vscode.debug.breakpoints.length; i++) {
                let breakpoint_filepath_parts = (vscode.debug.breakpoints[i] as vscode.SourceBreakpoint).location.uri.path.split('/');
                if (breakpoint_filepath_parts[breakpoint_filepath_parts.length - 1] != "main.py") {
                    vscode.debug.removeBreakpoints([vscode.debug.breakpoints[i]]);
                }
            }
            progress.report({ increment: 5, message: "Created bootapplicaton..." })
            if (debug && vscode.debug.breakpoints.length > 0) {
                const data: string[] = this.set_breakpoint();
                await this.start_debugging(data[0], data[1]);
                progress.report({ increment: 100, message: "Debug started" })
            } else {
                if (debug) {
                    progress.report({ increment: 10, message: "No breakpoints set, starting application..." })
                }
                await this.start_application();
                progress.report({ increment: 100, message: "Application started" })
                // Reset IO-Check
                if (this.io_check.ioCheckPanel != undefined) {
                    this.io_check.ioCheckPanel.webview.postMessage({ command: 'reload' })
                }
                await this.create_log_listener();
            }
        }
        else {
            console.log(ws_path);
            vscode.window.showErrorMessage(ws_path);
            progress.report({ increment: 100, message: "ERROR" })
        }
    }



    /**
     * Method to examine the current python version on the device. Also transfers the .ipk onto the device if necessary.
     * 
     * @returns `true` if the current python version is installed, otherwise `false`. Returns `void` if an error occured while transferring the necessary package. 
     */
    private async check_for_latest_python_version(): Promise<Boolean | void> {
        await this.ssh.ssh_connection_with_key();
        let current_python_version_installed: boolean;
        let result_get_python_version = await this.ssh.get_python_version();
        if (!result_get_python_version.startsWith("Error")) {
            current_python_version_installed = true;
            console.log("Necessary python version already installed");
        }
        else {
            current_python_version_installed = false;
            console.log("Error: Necessary python version not installed. Doing it now:");
            let result_transfer_ipk = await this.ssh.transfer_directory(__dirname + '/../../res/python_files/python3_3.7.6_armhf.ipk', this.dest_path_to_ipk);
            if (!result_transfer_ipk.toString().startsWith('Error')) {
                console.log(".ipk file successfully transferred");
            }
            else {
                console.log("Error: .ipk file cannot be transferred");
                console.log(result_transfer_ipk);
                return;
            }
        }
        await this.ssh.disconnect_ssh();
        return current_python_version_installed;
    }

    /**
     * 
     * Method for updating the python version on the device.
     * 
     * @returns `true` if python was updated, otherwise `false`
     */
    private async update_python_version(): Promise<boolean> {
        let updated_python: boolean = false;
        console.log("Python will be updated");
        await this.ssh.ssh_connection_with_key().then(async () => {
            let result_install_package = await this.ssh.install_package(this.dest_path_to_ipk);
            if (result_install_package.startsWith("Error")) {
                console.log("Error: Installing python failed");
                console.log(result_install_package);
            }
            else {
                console.log("Installed python successfully");
                let result_delete_ipk = await this.ssh.delete_files(this.dest_path_to_ipk);
                if (!result_delete_ipk.startsWith("Error")) {
                    console.log("Deleted ipk-File successfully");
                }
                else {
                    console.log("Error: Deletion of ipk-File failed");
                    console.log(result_delete_ipk);
                }
                await this.ssh.disconnect_ssh();
                updated_python = true;
            }
        });
        return updated_python;
    }

    /**
     * Method for uploading the application that should run onto the CC100.
     * 
     * @param ws_path Path to to current opened CC100IO project.
     * @returns `true` if the application was uploaded successfully, otherwise `false`
     */
    private async upload_application(ws_path: string): Promise<boolean> {
        let uploaded_application: boolean = false;
        await this.ssh.ssh_connection_with_key().then(async () => {
            await this.ssh.delete_files(this.dest_path + 'errorLog');
            await this.ssh.kill_all_tails();
            await this.ssh.update_time(this.create_timestamp());
            let result_upload_application = await this.ssh.transfer_directory(ws_path + "src", this.dest_path.substring(0, this.dest_path.length - 1));
            if (!result_upload_application.startsWith("Error")) {
                console.log("Application upload successful");
                uploaded_application = true;
            }
            else {
                console.log("Error: Application upload failed");
            }
            await this.ssh.disconnect_ssh();
        });
        return uploaded_application;
    }

    /**
     * Method for killing all running python scripts and start a new one.
     */
    private async start_application(): Promise<void> {
        await this.ssh.ssh_connection_with_key().then(async () => {
            console.log("Connected to CC100");
            let result_kill_all_python_scripts = await this.ssh.kill_all_python_scripts();
            if (result_kill_all_python_scripts.startsWith("Error")) {
                console.log("Error: Cannot kill python scripts");
                console.log(result_kill_all_python_scripts);
            }
            else {
                console.log("Kill all running python scripts");
            }
            let result_start_python_script = await this.ssh.start_python_script(this.dest_path + "/lib/runtimeCC.py");
            if (!(result_start_python_script.toString().startsWith("Error"))) {
                console.log("Application started");
            }
            else {
                console.log("Error: Application cannot be started");
                console.log(result_start_python_script);
            }
            await this.ssh.disconnect_ssh();
        });
    }

    /**
     * Method for creating a bootapplication on the device.
     * 
     * @returns `true` if the bootapplication was created, otherwise `false`.
     */
    private async create_bootapplication(): Promise<boolean> {
        let result_created_bootapplication: boolean = false;
        await this.ssh.ssh_connection_with_key()
        let result_upload_bootapplication = await this.ssh.put_init();
        if (!result_upload_bootapplication.startsWith("Error")) {
            console.log("Bash file created successfully");
            let result_make_file_executable = await this.ssh.make_file_to_executable_file(this.filename_on_startup);
            if (!result_make_file_executable.startsWith("Error")) {
                console.log("Changed Filemode to executable");
                let result_create_symlink = await this.ssh.create_symlink(this.filename_on_startup);
                if (!result_create_symlink.startsWith("Error")) {
                    console.log("Created symbolic link successfully");
                    result_created_bootapplication = true;
                }
                else {
                    console.log("Error: Could not create symbolic link");
                    console.log(result_create_symlink);
                }
            }
            else {
                console.log("Error: Could not make file to executable");
                console.log(result_make_file_executable);
            }
        }
        else {
            console.log("Error: File transfer failed");
            console.log(result_upload_bootapplication);
        }
        await this.ssh.disconnect_ssh();
        return result_created_bootapplication;
    }

    /**
     * This method places via string manipulation a `breakpoint()` at the corresponding line in the python script
     * @returns The modified python script as string
     */
    private set_breakpoint(): string[] {
        try {
            let breakpoint_filepath_parts: string[] = (vscode.debug.breakpoints[0] as vscode.SourceBreakpoint).location.uri.fsPath.split('\\');
            let breakpoint_filename: string = breakpoint_filepath_parts.slice(breakpoint_filepath_parts.indexOf('src') + 1, breakpoint_filepath_parts.length).toString();
            let script: string[] = fs.readFileSync(breakpoint_filepath_parts.join('\\')).toString().split('\n');

            let breakpoint_lines: number[] = [];
            let leading_spaces: string[] = [];

            let debug_script: string = '';

            for (var i = 0; i < vscode.debug.breakpoints.length; i++) {

                breakpoint_lines[i] = (vscode.debug.breakpoints[i] as vscode.SourceBreakpoint).location.range.start.line;

                const script_line = script[breakpoint_lines[i]].match(/^\s+/g);
                if (script_line) {
                    leading_spaces[i] = script_line[0];
                } else {
                    leading_spaces[i] = '';
                }
            }

            for (var i = 0; i < script.length; i++) {
                debug_script += (breakpoint_lines.indexOf(i) > -1) ? leading_spaces[breakpoint_lines.indexOf(i)] + 'breakpoint()\n' : '';
                debug_script += script[i] + '\n';
            }

            return new Array(breakpoint_filename.slice(0, breakpoint_filename.length - 3).toString().concat("_debug.py"), debug_script);
        }
        catch {
            return new Array('', '');
        }
    }

    /**
     * This method starts the debugging process, by setting the breakpoint and starting the script within a bash on the CC100 
     * @returns `false` if any errors occur, otherwise `true`
     */
    private async start_debugging(filename: string, data: string): Promise<boolean> {
        try {
            await this.ssh.ssh_connection_with_key().then(async () => {
                console.log("Connected to CC100");
                await this.ssh.create_file(this.dest_path.concat(filename), data);
                await this.ssh.kill_all_python_scripts();
                console.log("Breakpoint set");
                await this.ssh.disconnect_ssh();
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
            var debugging_terminal = vscode.window.createTerminal('Debugging', shell, undefined);

            debugging_terminal.sendText(`ssh -i ${this._extensionUri.fsPath}/res/.ssh/id_rsa ${this.ssh.username}@${this.ssh.ipAdress} "python3 /home/user/python_bootapplication/main_debug.py"`, true);
            debugging_terminal.show();
            return true;
        }
        catch {
            return false;
        }
    }


    /**
     * A Method that creates a listener that will be executed if the log file changes.
     */
    private async create_log_listener() {
        this.output_channel.show()
        let result = (await this.ssh.ssh_connection_with_key()).toString();
        if (!result.includes("Error")) {
            return new Promise(async (resolve, reject) => {
                resolve(null)
                await this.ssh.read_log(this.write_log.bind(this.write_log))
            })
        }
    }

    private write_log = (data: Buffer) => {
        let log_message: string = data.toString();
        if (!log_message.startsWith("tail")) {
            this.output_channel.append(log_message);
        }
    }
    /**
     * Formats a number into a number with at least 2 digits (01, 02, 03, etc.)
     * @param num the number that will be converted
     * @returns A number with at least 2 digits
     */
    private format_number(num: number) {
        return num < 10 ? '0' + num : num;
    }
    /**
     * Generates a timestamp for the current time
     * @returns a timestamp with the format MMDDHHmmYYYY.ss
     */
    private create_timestamp() {
        const now = new Date;
        const year = this.format_number(now.getFullYear());
        const month = this.format_number(now.getMonth() + 1);
        const day = this.format_number(now.getDate());
        const hours = this.format_number(now.getHours());
        const minutes = this.format_number(now.getMinutes());
        const seconds = this.format_number(now.getSeconds());
        const timestamp = `${month}${day}${hours}${minutes}${year}.${seconds}`;

        return timestamp;
    }
}
