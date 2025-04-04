import * as vscode from 'vscode';
import { ControllerProvider } from './view';
import { YamlCommands } from '../migrated/yaml';

export let ProjectVersion = 0;

/**
 * Check if the project is valid by checking if the wago.yaml file is present in the root folder.
 */
export async function verifyProject(): Promise<Boolean> {
    let wagoProject = await findWagoYaml();
    listenOnFileChangeWagoYaml();
    setControllerCountContext();
    return wagoProject;
}

/**
 * Find the wago.yaml file in the workspace.
 */
async function findWagoYaml(): Promise<Boolean> {
    let wagoProject = await vscode.workspace.findFiles('**/wago.yaml', '', 1).then(async (files) => {
        if(files.length > 0 && checkIfInRootFolder(files[0])) {
            ProjectVersion = 0.2
            return true;
        } else {
            await findSettingsJson();
            return false;
        }
    });
    vscode.commands.executeCommand('setContext', 'projectVersion', ProjectVersion);
    ControllerProvider.instance.refresh();
    return wagoProject;
}

/**
 * Find the settings.json file in the workspace.
 */
async function findSettingsJson() {
    await vscode.workspace.findFiles('**/settings.json', '', 1).then((files) => {
        if(files.length > 0 && checkIfInRootFolder(files[0])) {
            ProjectVersion = 0.1;
            return true;
        }
        ProjectVersion = 0;
        return false;
    });
    
}

/**
 * Listen for changes on the workspace and check if the wago.yaml file is present.
 */
function listenOnFileChangeWagoYaml() {
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/wago.yaml');

    fileWatcher.onDidChange((uri: vscode.Uri) => {
        if(checkIfInRootFolder(uri)){
            ProjectVersion = 0.2;
            vscode.commands.executeCommand('setContext', 'projectVersion', ProjectVersion);
        } else {
            ProjectVersion = 0;
        }
        setControllerCountContext();
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidCreate((uri: vscode.Uri) => {
        if(checkIfInRootFolder(uri)){
            ProjectVersion = 0.2;
            vscode.commands.executeCommand('setContext', 'projectVersion', ProjectVersion);
        } else {
            ProjectVersion = 0;
        }
        setControllerCountContext();
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidDelete((uri: vscode.Uri) => {
        if(!checkIfInRootFolder(uri)) return
        ProjectVersion = 0;
        vscode.commands.executeCommand('setContext', 'projectVersion', ProjectVersion);
        ControllerProvider.instance.refresh();
    });
}

/**
 * Listen for changes on the workspace and check if the setting.json file is present.
 */
function listenOnFileChangeSettingsJson() {
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/setting.json');

    fileWatcher.onDidChange((uri: vscode.Uri) => {
        vscode.commands.executeCommand('setContext', 'settingJsonPresent', checkIfInRootFolder(uri));
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidCreate((uri: vscode.Uri) => {
        vscode.commands.executeCommand('setContext', 'settingJsonPresent', checkIfInRootFolder(uri));
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidDelete((uri: vscode.Uri) => {
        if(!checkIfInRootFolder(uri)) return
        vscode.commands.executeCommand('setContext', 'settingJsonPresent', false);
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
            const folderPath = uri.fsPath.split('\\').slice(0, -1).join('\\');
            if (folderPath === folder.uri.fsPath) {
                return true;
            }
        }
    }
    return false;
}

function setControllerCountContext() {
    if(ProjectVersion >= 0.2) {
        vscode.commands.executeCommand('setContext', 'controllerCount', YamlCommands.getControllers()?.length);
    } else if(ProjectVersion >= 0.1) {
        vscode.commands.executeCommand('setContext', 'controllerCount', 1);
    } else {
        vscode.commands.executeCommand('setContext', 'controllerCount', 0);
    }
}