import * as vscode from 'vscode'
import fs from 'fs'
import { getApi, FileDownloader } from "@microsoft/vscode-file-downloader-api";
import { Workspace } from './workspace';

export class custom_webview_provider_settings {

    public static readonly viewType = 'settings';

    private workspace: Workspace = new Workspace();

    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
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
                vscode.Uri.parse("https://raw.githubusercontent.com/wago-enterprise-education/wago_cc100_python/V1.1/CC100IO/CC100IO.py"),
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
