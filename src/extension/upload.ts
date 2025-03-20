import * as vscode from 'vscode';
import fs from 'fs';
import { YamlCommands } from './yaml';
import { ConnectionManager } from './connectionManager';
import path from 'path';

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

    private compareFolders(id: number, src: string, localPath: string) {
        try {
            // Read the contents of both folders
            let localFolderContents: string[] = [];
            fs.readdir(localPath, (err, files) => {
                if (err) {
                    console.error('Error reading folder:', err);
                    return;
                }
                localFolderContents = files;
                return;
            });

            const remoteFolderContents = fs.readdir(folder2);
        
            for (const file of localFolderContents) {
                if (remoteFolderContents.includes(file)) {
                    const localPath = path.join(localPath, file);
                    const remotePath = path.join(folder2, file);
        
                    const statsLocal = fs.stat(file1Path);
                    const statsRemote = fs.stat(file2Path);
        
                    // Compare file timestamps
                    if (statsLocal.isFile() && statsRemote.isFile()) {
                        //timestamp comparison
                    }
              } else {
                return false;
              }
            }
          } catch (error) {
            console.error('Error comparing folders:', error);
          }
        
    }

}