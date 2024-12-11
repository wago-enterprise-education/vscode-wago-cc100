import * as vscode from 'vscode'
import fs from 'fs'
import path from 'path'

export class webview_homepage {
    constructor(
        private context: vscode.ExtensionContext,
        private readonly _extensionUri: vscode.Uri,
    )
    // Subscribe necessary commands for this class and create the home-webview
    {
        let panel: vscode.WebviewPanel | undefined = undefined;
        context.subscriptions.push(
            vscode.commands.registerCommand('vscode-wago-cc100.home', () => {
                if (panel) {
                    panel.reveal(vscode.ViewColumn.Active);
                }
                else {
                    panel = vscode.window.createWebviewPanel(
                        'vscode-wago-cc100.home',
                        'CC100',
                        vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One,
                        {
                            enableScripts: true,
                            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out'),
                            vscode.Uri.joinPath(context.extensionUri, 'res'), vscode.Uri.joinPath(context.extensionUri, 'src')]
                        }
                    );
                    panel.iconPath = { dark: vscode.Uri.joinPath(context.extensionUri, "res/images/wago-icons_rgb_house_outline_white.svg"), light: vscode.Uri.joinPath(context.extensionUri, "res/images/wago-icons_rgb_house_outline_black.svg") };
                    panel.webview.html = this.getHomeWebContent(context, panel);
                    this.check_buttons(panel.webview);

                    panel.onDidDispose(() => {
                        panel = undefined;
                    },
                        null,
                        context.subscriptions);
                }
            })
        );
    }

    /**
     * Handling of the incoming messages from the webview
     */
    private check_buttons(webview: vscode.Webview) {
        webview.onDidReceiveMessage(async data => {
            switch (data.command) {
                case 'cmd_submit':
                    {
                        this.btn_submit_clicked(data.proj_name, data.Path);
                        break;
                    }
                case 'cmd_io_check':
                    {
                        vscode.commands.executeCommand("vscode-wago-cc100.iocheck");
                        break;
                    }
                case 'cmd_documentation':
                    {
                        vscode.env.openExternal(vscode.Uri.parse('https://github.com/wago-enterprise-education/vscode-wago-cc100/blob/main/README.md'));
                        break;
                    }
                case 'cmd_open':
                    {
                        this.btn_open_clicked();
                        break;
                    }
                case 'cmd_select_path':
                    {
                        let selected_path = await this.txt_path_clicked();
                        webview.postMessage({ command: 'cmd_path_info', Path: selected_path });
                    }
            }
        });
    }

    /**
     * Method that will be executed when "Confirm" is clicked
     * @param Name Name of the Project that will be created
     * @param Path Path of where the Project that will be created should be saved
     * @returns 
     */
    private async btn_submit_clicked(Name: string, Path: string): Promise<void> {
        // Check for valid name and path
        if (Name == "") {
            vscode.window.showErrorMessage("Error: Missing name");
            return;
        }
        else if (Path.length == 0) {
            vscode.window.showErrorMessage("Error: Missing path");
            return;
        }

        // Make Path valid
        Path.replaceAll("\\", "/");
        Path += "/" + Name;

        // Copy Template into local memory
        fs.cpSync(__dirname + "/../../res/template", Path, { recursive: true });

        // Open folder in explorer
        vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(Path));
    }
    /**
     * Opens the file explorer and returns the selected path
     * @returns the selected path
     */
    private async txt_path_clicked(): Promise<String> {
        // Open file Explorer to select destination path
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Auswählen',
            canSelectFiles: false,
            canSelectFolders: true
        };
        let selected_path = await vscode.window.showOpenDialog(options).then(fileUri => {
            if (fileUri && fileUri[0]) {
                console.log('Selected file:' + fileUri[0].fsPath)
                return fileUri[0].fsPath.toString();
            }
            return "";
        });
        return selected_path;
    }
    /**
     * Opens the file explorer and opens the selected path as project
     */
    private btn_open_clicked() {
        // Open file Explorer to select destination path
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Öffnen',
            canSelectFiles: false,
            canSelectFolders: true
        };
        vscode.window.showOpenDialog(options).then(fileUri => {
            if (fileUri && fileUri[0]) {
                vscode.commands.executeCommand('vscode.openFolder', fileUri[0]);
                console.log("Project opened");
            }
        })
    }

    /**
     * Method for replacing the resource paths in the html source code with paths relative to the extension installation
     * @param context The exentsion context
     * @param panel The webview panel that should show the html content
     * @returns the HTML content as String
     */
    private getHomeWebContent(context: vscode.ExtensionContext, panel: any) {
        var html = fs.readFileSync(path.join(__dirname, '../../res/webviews/homepage.html'), "utf-8").toString();

        const pathImg = vscode.Uri.joinPath(context.extensionUri, 'res/images/Wago.png');
        const img = panel.webview.asWebviewUri(pathImg).toString();

        const pathChivron = vscode.Uri.joinPath(context.extensionUri, 'res/images/wago-icons_rgb_chevron-right_outline_green.svg');
        const chivron = panel.webview.asWebviewUri(pathChivron).toString();

        const pathClose = vscode.Uri.joinPath(context.extensionUri, 'res/images/close.svg');
        const close = panel.webview.asWebviewUri(pathClose).toString();

        const pathJS = vscode.Uri.joinPath(context.extensionUri, 'out/extension/homepage.js');
        const js = panel.webview.asWebviewUri(pathJS).toString();

        const pathCSS = vscode.Uri.joinPath(context.extensionUri, 'res/webviews/homepage.css');
        const css = panel.webview.asWebviewUri(pathCSS).toString();

        const pathFolder = vscode.Uri.joinPath(context.extensionUri, 'res/images/wago-icons_rgb_folder_outline_black.svg');
        const folder = panel.webview.asWebviewUri(pathFolder).toString();


        html = html.replace('../../out/extension/homepage.js', js);
        html = html.replace('homepage.css', css);
        html = html.replaceAll('../images/Wago.png', img);
        html = html.replaceAll('../images/wago-icons_rgb_chevron-right_outline_green.svg', chivron);
        html = html.replaceAll('../images/close.svg', close);
        html = html.replace('../images/wago-icons_rgb_folder_outline_black.svg', folder);
        return html;
    }
}
