import * as vscode from 'vscode';
import fs from 'fs';
import { YamlCommands } from './yaml';
import { ConnectionManager } from './connectionManager';
import { createHash } from 'crypto';
import { Stream } from 'stream';

//Roadmap for the extension
//+1. Get Path to the file structure to be uploaded -> Throw Error if not available
//+2. Create Command to send to the Connection Manager
//3. Integrate Hash-Comparison of files
//4. Integrate Containerversion Check and update
//5. Integrate File Upload in Case of older Version

const uploadPath = "/home/user/python_bootapplication";
let connectionManager = ConnectionManager.instance;

export class Upload {

    /**
     * This Method uploads the corresponding file to the WAGO Controller.
     * 
     * @param context 
     * @param id 
     */

    public async uploadFile(context: vscode.ExtensionContext, id: number) {
        
        let controllers = YamlCommands.readWagoYaml();
        let src = controllers.nodes.$(id).src;
        let path = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/${src}`;
        
        if (fs.existsSync(`${path}/main.py`)) { 
            let command = "cp " + path + " " + uploadPath;
            await connectionManager.executeCommand(id, command);
        } else {
            vscode.window.showErrorMessage("The files to be uploaded do not exist.");
            return;
        }
    }

    private async compareHashes(id: number) {
        let controllers = YamlCommands.readWagoYaml();
        let src = controllers.nodes.$(id).src;
        let path = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/${src}`;
        
    }

    private createFileHash(path: string) {
        let sum = "";
        let fd = fs.createReadStream('/some/file/name.txt');
        let hash = createHash('sha1');
        hash.setEncoding('hex');
    
        fs.createReadStream(`${path}`)
            .pipe(createHash('sha1')
            .setEncoding('hex'))
            .on('finish', () => {
                sum = hash.read();
        });
    
        return sum;
    }


}