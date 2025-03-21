import * as vscode from 'vscode';
import fs from 'fs';
import { YamlCommands } from './yaml';
import { ConnectionManager } from './connectionManager';
import crypto from 'crypto';
import path from 'path';

//Roadmap for the extension
//+1. Get Path to the file structure to be uploaded -> Throw Error if not available
//+2. Create Command to send to the Connection Manager
//+3. Integrate Hash-Comparison of files
//4. Integrate Containerversion Check and update
//5. Integrate File Upload in Case of older Version

const uploadPath = "/home/user/python_bootapplication";
let connectionManager = ConnectionManager.instance;

export class Upload {

    /**
     * This Method uploads the corresponding files to the WAGO Controller.
     * 
     * @param id The id of the used controller
     */

    public async uploadFile(id: number) {
        
        let controllers = YamlCommands.readWagoYaml();
        let src = controllers.nodes.$(id).src;
        let path = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/${src}`;
        
        if (!fs.existsSync(`${path}/main.py`)) { 
            vscode.window.showErrorMessage("The files to be uploaded do not exist.");
            return;
        }
        if(await this.compareFolders(id, path)) {
            vscode.window.showInformationMessage(`The files on ${controllers.nodes.$(id).displayname} are already up to date.`);
            return;
        }

        await connectionManager.executeCommand(id, `cp ${path} ${uploadPath}`);
    }

    /**
     * This method is used to compare the contents of a folder on the WAGO Controller with the local folder, 
     * using Hashes to compare the contents.
     * 
     * @param id The id of the used controller
     * @param localPath The Path to the local folder with the python program
     * @returns Returns true, if folder contents are equivalent, false if not
     */
    
    private async compareFolders(id:number, localPath: string): Promise<Boolean> {
        try {
            // Get Array of remote Hashes
            let remoteHashes = await connectionManager.executeCommand(id, `find ${uploadPath} -type f -exec md5sum {} +`);
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
            let localHashes = await this.getLocalHashes(localPath);
            localHashes = localHashes
                .replaceAll('\n', ' ')
                .split(' ')
                .filter((value, index) => {
                    return index % 2 !== 0;
                })
                .sort((a, b) => a.localeCompare(b))
                .toString();

            let localHash = crypto
                .createHash('md5')
                .update(remoteHashes)
                .digest('hex');

            return Promise.resolve(localHash === remoteHash);
            
        } catch (error) {
            console.error('Error comparing folders:', error);
            return Promise.reject(error);
        }
        
    }

    /**
     * This Method is used to get the Hashes of all files in a directory
     * It is made to resemble the output of the following linux command:
     * find ${src} -type f -exec md5sum {} +
     * 
     * @param path The Path to the directory to get the Hashes from
     * @returns Returns a String with Hashes and Paths to all files in the directory
     */

    private async getLocalHashes(path: string): Promise<string> {
        try {
            const localFiles = await this.getFilesInDirectory(path);
            const localHashes = "";

            //For Each File from Path in localFiles Array create Hash and add to localHashes
            for (const file of localFiles) {
                let fileContent = fs.readFileSync(file);
                let hash = crypto.createHash('md5')
                    .update(fileContent)
                    .digest('hex');
                localHashes.concat(`${hash} ${file} \n`);
            }

            return Promise.resolve(localHashes);

        } catch (error) {
            console.error('Error getting local hashes:', error);
            return Promise.reject(error);
        }
    }

    /**
     * This Method is used to get Paths to every file in the current directory
     * 
     * @param dirPath The current folder to be iterated
     * @returns Returns an Array with all Paths to files in the directory
     */

    private async getFilesInDirectory(dirPath: string): Promise<string[]> {
        
        try {
            const files: string[] = [];
            fs.readdir(dirPath, (err, files) => {
                files = files;
            });
            
            for (const file of files) {
                const fullPath = path.join(dirPath, file);
                let stat = fs.statSync(fullPath);
                fs.stat(fullPath, (err, stats) => {
                    stat = stats;
                });
            
                if (stat.isDirectory()) {
                    const subDirFiles = await this.getFilesInDirectory(fullPath);
                    files.push(...subDirFiles);
                } else if (stat.isFile()) {
                    // If it's a file, add it to the list
                    files.push(fullPath);
                }
            }

            return files;

        } catch (error) {
            console.error('Error getting files in directory:', error);
            return Promise.reject(error);
        }
    }

    /**
     * This Method is used to update the docker-container on the WAGO Controller
     * 
     * @param id The id of the used controller
     */

    private async updateContainer(id: number) {
        
        /* Check latest available version 
            => Registry where they are available or will it be in the Extension files?
        */

        /* Check current version on controller
            => Read from a file in the container?
        */

        /* Compare Versions and update if necessary
            => Stop and 'Delete and Upload' or 'Override' current container
        */

    }

}