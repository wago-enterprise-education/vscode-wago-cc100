import * as vscode from 'vscode'
import { SSH } from '../ssh';
import YAML from 'yaml';
import fs from 'fs';

export class Workspace {
    private static password: string = '';
    private readonly pathToLibFile: string = 'src/lib/CC100IO.py';


    /**
     * A Method for getting the path of an CC100IO-Project that is currently open.
     * 
     * @returns The path to the project or a error message.
     */
    public async getProjectPath(): Promise<string> {
        let ws = (await vscode.workspace.findFiles('*/*/CC100IO.py', null, 1)).at(0);
        let wsPath: string;

        if (ws !== undefined) { //Check if a CC100 project is opened in the explorer
            if (process.platform === 'win32') {
                wsPath = ws.path.toString().substring(1, ws.path.toString().length - this.pathToLibFile.length);
            }
            else {
                wsPath = ws.path.toString().substring(0, ws.path.toString().length - this.pathToLibFile.length);
            }

            return wsPath;
        }
        else {
            return "Error: Could not find a project";
        }
    }


    /**
     * This method reads the project settings and writes it to the properties of the ssh connection.
     * 
     * @param wsPath The path to the workspace in which the settings file is located.
     * @param ssh The `SSH` object that includes the information about the ssh connection.
     * @returns a `SSH` object if settings are written. `Returns` false of type `boolean` if ssh properties are not written because of unusual properties content.
     */
    public async readSettingsWriteSshProperties(wsPath: string, ssh: SSH): Promise<boolean | SSH> {
        let projectSettings = YAML.parse(fs.readFileSync(wsPath + 'settings.json', 'utf8'));
        if (Workspace.password.length == 0) {
            const passwordInput: string = await vscode.window.showInputBox({
                password: true,
                title: "Password"
            }) ?? '';
            ssh.password = passwordInput;
            Workspace.password = passwordInput;
        }
        else {
            ssh.password = Workspace.password;
        }

        if (projectSettings.usbC.valueOf() && !projectSettings.ethernet.valueOf() && !projectSettings.simulator.valueOf()) {
            ssh.ipAdress = "192.168.42.42";
            ssh.port = projectSettings.port;
            return ssh;
        }
        else if (!projectSettings.usbC.valueOf() && projectSettings.ethernet.valueOf() && !projectSettings.simulator.valueOf()) {
            ssh.ipAdress = projectSettings.ipAdress;
            ssh.port = projectSettings.port;
            return ssh;
        }
        else if (!projectSettings.usbC.valueOf() && !projectSettings.ethernet.valueOf() && projectSettings.simulator.valueOf()) {
            ssh.ipAdress = projectSettings.simulationBackend;
            ssh.port = 2222;
            return ssh;
        }
        else {
            console.log("Error: Connectivity undefined");
            vscode.window.showErrorMessage("Error: Connectivity undefined. Please check your connection settings");
            return false;
        }
    }

    /**
     * Checks if the CC100IO.py libary of the current project is up to date. If not, the user is asked if he wants to update it.
     */
    public async libUpToDate(extensionPath: String): Promise<boolean> {
        let projectPath = await this.getProjectPath()
        let libPath = extensionPath + "/res/template/src/lib/CC100IO.py"
        if (!projectPath.startsWith("Error")) {
            let libProjectPath = projectPath + "src/lib/CC100IO.py"
            let data1 = fs.readFileSync(libProjectPath, "utf-8")
            let data2 = fs.readFileSync(libPath.toString(), "utf-8")
            if (data1 != data2) {
                vscode.window.showInformationMessage("The CC100IO Libary in your current project is not up to date. Would you like to update?", "YES", "NO")
                    .then(answer => {
                        if (answer === "YES") {
                            fs.copyFileSync(libPath, libProjectPath)
                        }
                    })
            }
        }
        return false;
    }

    public async changePassword() {
        const passwordInput: string = await vscode.window.showInputBox({
            password: true,
            title: "Password"
        }) ?? '';
        Workspace.password = passwordInput;
    }
}