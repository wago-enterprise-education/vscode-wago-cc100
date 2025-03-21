import * as vscode from 'vscode';
import { ControllerProvider } from './view';

export let versionNr = 0;

/**
 * Check if the project is valid by checking if the wago.yaml file is present in the root folder.
 */
export function verifyProject() {
    findWagoYaml();
    listenOnFileChange();
}

/**
 * Find the wago.yaml file in the workspace.
 */
function findWagoYaml() {
    vscode.workspace.findFiles('**/wago.yaml', '', 1).then((files) => {
        if(files.length > 0 && checkIfInRootFolder(files[0])) {
            vscode.commands.executeCommand('setContext', 'wagoYamlPresent', true);
            versionNr = 2.0
        } else {
            vscode.commands.executeCommand('setContext', 'wagoYamlPresent', false);
            findSettingsJson();
        }
        ControllerProvider.instance.refresh();
    });
}

/**
 * Find the settings.json file in the workspace.
 */
function findSettingsJson() {
    vscode.workspace.findFiles('**/setting,json', '', 1).then((files) => {
        if(files.length > 0 && checkIfInRootFolder(files[0])) {
            vscode.commands.executeCommand('setContext', 'settingsJsonPresent', true);
            versionNr = 1.0
        } else {
            vscode.commands.executeCommand('setContext', 'settingsJsonPresent', false);       
        }
        ControllerProvider.instance.refresh();
    });
}

/**
 * Listen for changes on the workspace and check if the wago.yaml file is present.
 */
function listenOnFileChange() {
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/wago.yaml');

    fileWatcher.onDidChange((uri: vscode.Uri) => {
        vscode.commands.executeCommand('setContext', 'wagoYamlPresent', checkIfInRootFolder(uri));
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidCreate((uri: vscode.Uri) => {
        vscode.commands.executeCommand('setContext', 'wagoYamlPresent', checkIfInRootFolder(uri));
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidDelete((uri: vscode.Uri) => {
        if(!checkIfInRootFolder(uri)) return
        vscode.commands.executeCommand('setContext', 'wagoYamlPresent', false);
        ControllerProvider.instance.refresh();
    });
}

/**
 * Check if the file is in the root folder of the workspace.
 * 
 * @param uri Uri of the file to check.
 * @returns True if the file is in the root folder, false otherwise.
 */
function checkIfInRootFolder(uri: vscode.Uri): Boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if(workspaceFolders) {
        for (const folder of workspaceFolders) {
            if (uri.fsPath === `${folder.uri.fsPath}\\wago.yaml`) {
                return true;
            }
        }
    }
    return false;
}