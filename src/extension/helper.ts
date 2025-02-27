import * as vscode from 'vscode';
import { ControllerProvider } from './view';

export function verifyProject() {
    findWagoYaml();
    listenOnFileChange();
}

function findWagoYaml() {
    vscode.workspace.findFiles('**/wago.yaml', '', 1).then((files) => {
        if(files.length > 0 && checkIfInRootFolder(files[0])) {
            vscode.commands.executeCommand('setContext', 'wagoYamlPresent', true);
        } else {
            vscode.commands.executeCommand('setContext', 'wagoYamlPresent', false);
        }
        ControllerProvider.instance.refresh();
    });
}

function listenOnFileChange() {
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/wago.yaml');

    fileWatcher.onDidChange((uri: vscode.Uri) => {
        vscode.window.showInformationMessage(`Changed: ${checkIfInRootFolder(uri)}`);
        vscode.commands.executeCommand('setContext', 'wagoYamlPresent', checkIfInRootFolder(uri));
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidCreate((uri: vscode.Uri) => {
        vscode.window.showInformationMessage(`Create: ${checkIfInRootFolder(uri)}`);
        vscode.commands.executeCommand('setContext', 'wagoYamlPresent', checkIfInRootFolder(uri));
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidDelete((uri: vscode.Uri) => {
        if(!checkIfInRootFolder(uri)) return
        vscode.commands.executeCommand('setContext', 'wagoYamlPresent', false);
        ControllerProvider.instance.refresh();
    });
}

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