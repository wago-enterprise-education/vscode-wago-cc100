import * as vscode from 'vscode'
import { SSH } from '../ssh';
import { parse_JSON } from './json';
import fs from 'fs'

export class Workspace {
    private static password: string = '';
    private readonly path_to_lib_file: string = 'src/lib/CC100IO.py';


    /**
     * A Method for getting the path of an CC100IO-Project that is currently open.
     * 
     * @returns The path to the project or a error message.
     */
    public async get_project_path(): Promise<string> {
        let ws = (await vscode.workspace.findFiles('*/*/CC100IO.py', null, 1)).at(0);
        let ws_path: string;

        if (ws !== undefined) { //Check if a CC100 project is opened in the explorer
            if (process.platform === 'win32') {
                ws_path = ws.path.toString().substring(1, ws.path.toString().length - this.path_to_lib_file.length);
            }
            else {
                ws_path = ws.path.toString().substring(0, ws.path.toString().length - this.path_to_lib_file.length);
            }

            return ws_path;
        }
        else {
            return "Error: Could not find a project";
        }
    }


    /**
     * This method reads the project settings and writes it to the properties of the ssh connection.
     * 
     * @param ws_path The path to the workspace in which the settings file is located.
     * @param ssh The `SSH` object that includes the information about the ssh connection.
     * @returns a `SSH` object if settings are written. `Returns` false of type `boolean` if ssh properties are not written because of unusual properties content.
     */
    public async read_settings_write_ssh_properties(ws_path: string, ssh: SSH): Promise<boolean | SSH> {
        let project_settings = parse_JSON.read_json_file(ws_path + 'settings.json');
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

        if (project_settings.usb_c.valueOf() && !project_settings.ethernet.valueOf() && !project_settings.simulator.valueOf()) {
            ssh.ipAdress = "192.168.42.42";
            ssh.port = project_settings.port;
            return ssh;
        }
        else if (!project_settings.usb_c.valueOf() && project_settings.ethernet.valueOf() && !project_settings.simulator.valueOf()) {
            ssh.ipAdress = project_settings.ip_adress;
            ssh.port = project_settings.port;
            return ssh;
        }
        else if (!project_settings.usb_c.valueOf() && !project_settings.ethernet.valueOf() && project_settings.simulator.valueOf()) {
            ssh.ipAdress = project_settings.simulation_backend;
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
    public async lib_up_to_date(extension_path: String): Promise<boolean> {
        let project_path = await this.get_project_path()
        let lib_path = extension_path + "/res/template/src/lib/CC100IO.py"
        if (!project_path.startsWith("Error")) {
            let lib_project_path = project_path + "src/lib/CC100IO.py"
            let data1 = fs.readFileSync(lib_project_path, "utf-8")
            let data2 = fs.readFileSync(lib_path.toString(), "utf-8")
            if (data1 != data2) {
                vscode.window.showInformationMessage("The CC100IO Libary in your current project is not up to date. Would you like to update?", "YES", "NO")
                    .then(answer => {
                        if (answer === "YES") {
                            fs.copyFileSync(lib_path, lib_project_path)
                        }
                    })
            }
        }
        return false;
    }

    public async change_password() {
        const passwordInput: string = await vscode.window.showInputBox({
            password: true,
            title: "Password"
        }) ?? '';
        Workspace.password = passwordInput;
    }
}