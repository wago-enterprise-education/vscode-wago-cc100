import * as vscode from 'vscode'
import fs from 'fs'
import path from 'path'
import { parse_JSON, settings } from './json';
import { custom_webview_provider_menu } from './custom_webview_menu';
import { webview_IOCheck } from '../webview_IOCheck';
import { getApi, FileDownloader } from "@microsoft/vscode-file-downloader-api";
import { Workspace } from './workspace';

export class custom_webview_provider_settings implements vscode.WebviewViewProvider {

    public static readonly viewType = 'settings';

    private _view?: vscode.WebviewView;

    private webview_menu: custom_webview_provider_menu;

    private io_check: webview_IOCheck

    private workspace: Workspace = new Workspace();

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private context: vscode.ExtensionContext,
        webview_menu: custom_webview_provider_menu,
        webview_IO: webview_IOCheck
    ) {
        this.webview_menu = webview_menu;
        this.io_check = webview_IO;
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
                case 'cmd_submit':
                    this.update_settings(data.data);
                    break;
                case 'cmd_request_data':
                    this.send_data(webviewView.webview);
                    break;
                case 'cmd_change_password':
                    this.workspace.change_password();
                    break;
            }
        });
    }

    /**
     * Method for replacing resource path and `return` the webview
     */
    private getWebViewContent(webview: vscode.Webview): string {
        var html = fs.readFileSync(path.join(__dirname, '../../res/webviews/settings.html'), "utf-8").toString();

        const path_css = vscode.Uri.joinPath(this._extensionUri, 'res/webviews/settings.css');
        const path_js = vscode.Uri.joinPath(this._extensionUri, 'out/extension/settings.js');
        const path_tick = vscode.Uri.joinPath(this._extensionUri, 'res/images/wago-icons_rgb_tick-sign_outline_black.svg');
        const path_chevron = vscode.Uri.joinPath(this._extensionUri, 'res/images/wago-icons_rgb_chevron-right_outline_green.svg');
        const path_view = vscode.Uri.joinPath(this._extensionUri, 'res/images/wago-icons_rgb_view_outline_green.svg');
        const css = webview.asWebviewUri(path_css).toString();
        const js = webview.asWebviewUri(path_js).toString();
        const tick = webview.asWebviewUri(path_tick).toString();
        const chevron = webview.asWebviewUri(path_chevron).toString();
        const view = webview.asWebviewUri(path_view).toString();
        html = html.replace("settings.css", css);
        html = html.replace("../../out/extension/settings.js", js);
        html = html.replaceAll('../images/wago-icons_rgb_tick-sign_outline_black.svg', tick);
        html = html.replaceAll("../images/wago-icons_rgb_chevron-right_outline_green.svg", chevron);
        html = html.replace("../images/wago-icons_rgb_view_outline_green.svg", view);
        return html;
    }
    /**
     * Updates the settings.json based on the values from the given 
     * @param data The data that is used to update the settings.json
     */
    private async update_settings(data: any) {
        let ws_path = await this.workspace.get_project_path();
        if (!ws_path.startsWith("Error")) {
            let settings_path = ws_path + 'settings.json';
            let autoupdate: boolean = false;
            // reset mode
            parse_JSON.write(settings_path, settings.usb_c, false);
            parse_JSON.write(settings_path, settings.ethernet, false);
            parse_JSON.write(settings_path, settings.simulator, false);
            for (var pair of data) {
                if (pair[0] == "mode") {
                    parse_JSON.write(settings_path, pair[1], true);
                } else {
                    let autoupdateOldValue = JSON.parse(fs.readFileSync(settings_path, 'utf8')).autoupdate;
                    // data only contains autoupdate, if the checkbox is checked
                    if (pair[0] == "autoupdate") {
                        autoupdate = true;
                        // Only download current CC100 libary, when the value is changed
                        if (!autoupdateOldValue) {
                            console.log("checklib");
                            this.download_lib();
                        }
                    }
                    parse_JSON.write(settings_path, pair[0], pair[1]);
                }
            }
            // If the data didn't contain autoupdate, autoupdate has to be false
            if (!autoupdate) {
                parse_JSON.write(settings_path, settings.autoupdate, false);
            }
            vscode.window.showInformationMessage("Saved Changes");
            this.webview_menu._view?.webview.postMessage({ command: "cmd_reload", simulator: parse_JSON.read_json_file(settings_path).simulator.valueOf() })
        }
        if (this.io_check.ioCheckPanel != undefined) {
            this.io_check.ioCheckPanel.dispose();
        }
    }
    /**
     * Sends the data from the settings.json to the settings.js through the 'cmd_reload' command
     * @param webview 
     */
    private async send_data(webview: vscode.Webview) {
        let path_to_lib_file: string = 'src/lib/CC100IO.py';
        let p = (await vscode.workspace.findFiles('*/*/CC100IO.py', null, 1)).at(0);
        let ws_path: string;
        if (p != undefined) {
            if (process.platform === 'win32') {
                ws_path = p.path.toString().substring(1, p.path.toString().length - path_to_lib_file.length);
            }
            else {
                ws_path = p.path.toString().substring(0, p.path.toString().length - path_to_lib_file.length);
            }
            let settingsPath = ws_path + 'settings.json';
            webview.postMessage({ command: "cmd_send_data", data: JSON.parse(fs.readFileSync(settingsPath, 'utf8')) });
            this.webview_menu._view?.webview.postMessage({ command: "cmd_reload", simulator: parse_JSON.read_json_file(settingsPath).simulator.valueOf() })
        }
    }
    /**
     * Downloads the currnet CC100IP.py libary from GitHub
     */
    public async download_lib() {
        let project_path = await this.workspace.get_project_path();
        if (project_path.startsWith("Error")) {
            return;
        }
        let settings_path = project_path + 'settings.json';
        let autoupdate = JSON.parse(fs.readFileSync(settings_path, 'utf8')).autoupdate;
        if (!autoupdate) {
            return;
        }
        let cancellationTokenSource = new vscode.CancellationTokenSource();
        let cancellationToken = cancellationTokenSource.token;

        let progressCallback = (downloadedBytes: number, totalBytes: number | undefined) => {
            console.log(`Downloaded ${downloadedBytes}/${totalBytes} bytes`);
        };

        let fileDownloader: FileDownloader = await getApi();

        try {
            const file: vscode.Uri = await fileDownloader.downloadFile(
                vscode.Uri.parse("https://raw.githubusercontent.com/wago-enterprise-education/wago_cc100_python/main/CC100IO/CC100IO.py"),
                "CC100IO.py",
                this.context,
                cancellationToken,
                progressCallback,
            );
            fs.rename(file.fsPath, this.context.extensionPath + "/res/template/src/lib/CC100IO.py", () => { })
            this.workspace.lib_up_to_date(this.context.extensionPath)
        } catch (e) {
            console.log("Error: Couldn't download CC100 libary: ");
            console.log(e)
        }
    }

}
