import * as vscode from 'vscode';
import * as fs from 'fs';
import { ConnectionManager } from './connectionManager';
import crypto from 'crypto';
import path from 'path';
import { ProjectVersion } from './versionDetection'
import { YamlCommands } from '../core/interface/V02';

//Roadmap for the extension
//+1. Get Path to the file structure to be uploaded -> Throw Error if not available
//+2. Create Command to send to the Connection Manager
//+3. Integrate Hash-Comparison of files
//+4. Integrate File Upload in Case of older Version
//5. Integrate Containerversion Check and update

const uploadPath = "/home/user/python_bootapplication/";
let connectionManager = ConnectionManager.instance;

export class Upload {

    /**
     * This Method uploads the corresponding files to the WAGO Controller.
     * The Procedure of the upload is determined by the versionNr of the Project
     * 
     * @param id The id of the used controller
     */

    public async uploadFile(id: number) {

        let controller = YamlCommands.getController(id);
        let src = controller?.src;
        let path = `${vscode.workspace.workspaceFolders![0].uri.fsPath}\\${src}`;

        if (!fs.existsSync(`${path}/main.py`)) { 
            vscode.window.showErrorMessage("The selected Folder does not exist or does not contain a main.py.");
            return;
        }

        await this.deactivateCodeSys3(id);

        switch (ProjectVersion) {
            case 0.2:
                if(await this.compareFolders(id, path)) {
                    vscode.window.showInformationMessage(`The files on ${controller?.displayname} are already up to date.`);
                    return;
                }

                await connectionManager.executeCommand(id, "docker exec pythonRuntime killall -15 python3");

                this.updateContainer(id);

                await connectionManager.upload(id, path, uploadPath).then(() => {
                    vscode.window.showInformationMessage(`The files on ${controller?.displayname} have been updated.`);
                }).catch((err) => {
                    console.error(`Error uploading files: ${err}`);
                    vscode.window.showErrorMessage("An error occurred while uploading the files.");
                });
                await connectionManager.executeCommand(id, "docker exec -d pythonRuntime python3 /lib/runtimeCC.py");
                break;

            case 0.1: 
                if(await this.compareFolders(id, path)) {
                    vscode.window.showInformationMessage(`The files on ${controller?.displayname} are already up to date.`);
                    return;
                }
                try {
                    //Upload Files
                    await connectionManager.executeCommand(id, `cp ${path} ${uploadPath}`);
                    //Create bootapplication
                    await connectionManager.executeCommand(id, "echo '#!/bin/sh\n\npython3 /home/user/python_bootapplication/lib/runtimeCC.py &\nstty -F /dev/ttySTM1 cstopb brkint -icrnl -ixon -opost -isig icanon -iexten -echo' > /etc/init.d/S99_python_runtime");
                    //Execute File
                    await connectionManager.executeCommand(id, `python3 /home/user/python_bootapplication/lib/runtimeCC.py`);
                } catch (err) {
                    console.error(`Error uploading files: ${err}`);
                    vscode.window.showErrorMessage("An error occurred while uploading the files.");
                }
                vscode.window.showInformationMessage(`The files on ${controller?.displayname} have been updated.`);
                break;
            
            default:
                console.error(`Unknown Project Version (${ProjectVersion})`);
                break;
        }
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
                .replaceAll('\n', '  ')
                .split('  ')
                .filter((value, index) => {
                    return index % 2 === 0;
                })
                .sort((a, b) => a.localeCompare(b))
                .toString()
                .replaceAll(',','');

            let remoteHash = crypto
                .createHash('md5')
                .update(remoteHashes)
                .digest('hex');
            
            //Get Array of local Hashes
            let localHashes = await this.getLocalHashes(localPath);
            localHashes = localHashes
                .replaceAll('\n', '  ')
                .split('  ')
                .filter((value, index) => {
                    return index % 2 === 0;
                })
                .sort((a, b) => a.localeCompare(b))
                .toString()
                .replaceAll(',','');

            let localHash = crypto
                .createHash('md5')
                .update(localHashes)
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
            let localFiles = await this.getFilesInDirectory(path);
            let localHashes = "";

            //For Each File from Path in localFiles Array create Hash and add to localHashes
            for (let file of localFiles) {
                let fileContent = fs.readFileSync(file, 'utf8');
                let hash = crypto.createHash('md5')
                    .update(fileContent)
                    .digest('hex');
                if (localHashes.length == 0) {
                    localHashes = (`${localHashes}${hash}  ${file}`);
                } else {
                    localHashes = (`${localHashes}\n${hash}  ${file}`);
                }
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
            let files: string[] = [];
            let read = fs.readdirSync(dirPath, { recursive:true });
            let dirFiles = read.map(String);
            
            for (const file of dirFiles) {
                const fullPath = path.join(dirPath, file);
                let stat = fs.statSync(fullPath);
                fs.stat(fullPath, (err, stats) => {
                    stat = stats;
                });
                if (stat.isFile()) {
                    files.push(fullPath);
                }
            }

            return files;

        } catch (error) {
            console.error('Error getting files in directory:', error);
            return Promise.reject(error);
        }
    }

    private async deactivateCodeSys3(id: number) {
        await connectionManager.executeCommand(id, "kill $(pidof codesys3)")
            .then(() => {
                console.log("CodeSys3 deactivated.");
            })
            .catch((err) => {
                console.error(`Error deactivating CodeSys3: ${err}`);
            });
    }

    /**
     * This Method is used to update the docker-container on the WAGO Controller
     * 
     * The development of this method is planned for a later date due to time registrations
     * 
     * @param id The id of the used controller
     */
    private async updateContainer(id: number) {
          
        let imageName = "pythonExtension";

        // Cancel if Image Version is specifically chosen
        if (YamlCommands.getController(id)?.imageVersion !== 'latest') {
            return;
        }
        
        // Check latest available version 
        // => Get List of all available versions from the WAGO Container Registry
        // => Version of the Image is readable from the Tag?
        let newestVersion: number = 1;

        // Get current version on controller
        // => Version of the Image is readable from the Tag?
        let conImageVersion : number = 1;

        if ( newestVersion == conImageVersion ) {
            return;
        }

        let name = YamlCommands.getController(id)?.displayname;
        let autoupdate = YamlCommands.getControllerSettings(id).autoupdate; 
        if( autoupdate === 'off') {
            await vscode.window.showInformationMessage(`Reset ${name}?`, 'Yes', 'No').then((value) => {
                if(value === 'No') return;
            });
        }

        // Stop current container
        await connectionManager.executeCommand(id, "docker exec pythonRuntime killall -15 python3");

        //remove all images and containers
        await connectionManager.executeCommand(id, "docker rm pythonRuntime");
        await connectionManager.executeCommand(id, `docker rmi -f ${imageName}`);

        // Download and Upload new Image
        // NOT WORKING: let img = await fetch(`https://github.com/wago-enterprise-education/wago_cc100_python/raw/refs/heads/main/README.md`);
        await connectionManager.upload(id, "<downloadedimage.tar>", "/home/");
        let archiveName = "image270325.tar";

        // Load new Image
        await connectionManager.executeCommand(id, `docker load -i /home/${archiveName}`);
        await connectionManager.executeCommand(id, `rm /home/${archiveName}`);
        await connectionManager.executeScript(id, `../../res/dockerCommand.sh`);
    }
}