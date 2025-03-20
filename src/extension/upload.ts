import * as vscode from 'vscode';
import fs from 'fs';
import { YamlCommands } from './yaml';
import { ConnectionManager } from './connectionManager';
import crypto from 'crypto';

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

    /**
     * This method is used to compare the contents of a folder on the WAGO Controller with the local folder, 
     * using Hashes to compare the contents.
     * 
     * @param id 
     * @param src 
     * @param localPath 
     * @returns True, if folder contents are equivalent, false if not
     */
    
    private async compareFolders(id:number, src: string, localPath: string): Promise<Boolean> {
        try {
            // Get Array of remote Hashes
            let remoteHashes = await connectionManager.executeCommand(id, `find ${src} -type f -exec md5sum {} +`);
            remoteHashes = remoteHashes
                .replaceAll('\n', ' ')
                .split(' ')
                .filter((value, index) => {
                    return index % 2 !== 0;
                })
                .sort((a, b) => a.localeCompare(b))
                .toString();
            let remoteHash = crypto
                .createHash('md5')
                .update(remoteHashes)
                .digest('hex');
            
            //Get Array of local Hashes
            

            return Promise.resolve(localHash === remoteHash);
            
        } catch (error) {
            console.error('Error comparing folders:', error);
            return Promise.reject(error);
        }
        
    }


}