import * as vscode from 'vscode';
import { ControllerProvider } from './view';
import * as fs from 'fs';
import { YamlCommands } from '../shared/yamlCommands';

/**
 * Global variable representing the detected project version.
 * - 0: No valid project detected
 * - 0.1: Legacy project (V01) with settings.json configuration
 * - 0.2: Modern project (V02) with wago.yaml configuration
 */
export let ProjectVersion: number = 0;

/**
 * Verifies the current workspace contains a valid WAGO project and determines its version.
 * This function examines the project structure and sets up file watchers for configuration changes.
 */
export async function verifyProject() {
    await findWagoYaml();
    setControllerCountContext();
}

/**
 * Searches for a wago.yaml file in the workspace root to identify V02 projects.
 * If found, sets up file watchers to monitor configuration changes.
 * Falls back to checking for settings.json if wago.yaml is not present.
 */
async function findWagoYaml() {
    if (
        vscode.workspace.workspaceFolders &&
        fs.existsSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/wago.yaml`
        ) &&
        vscode.workspace.workspaceFolders!.length < 2
    ) {
        ProjectVersion = 0.2;
        listenOnFileChangeWagoYaml();
    } else {
        await findSettingsJson();
    }
    // Update VS Code context to enable/disable relevant UI elements
    vscode.commands.executeCommand(
        'setContext',
        'projectVersion',
        ProjectVersion
    );
    ControllerProvider.instance.refresh();
}

/**
 * Searches for a settings.json file in the workspace root to identify V01 projects.
 * This is the fallback detection method for legacy project structures.
 */
async function findSettingsJson() {
    if (
        vscode.workspace.workspaceFolders &&
        fs.existsSync(
            `${vscode.workspace.workspaceFolders![0].uri.fsPath}/settings.json`
        ) &&
        vscode.workspace.workspaceFolders!.length < 2
    ) {
        ProjectVersion = 0.1;
        listenOnFileChangeSettingsJson();
    } else {
        ProjectVersion = 0;
    }
}

/**
 * Sets up file system watchers to monitor changes to the wago.yaml file.
 * Automatically updates project version and refreshes the UI when the file is created, modified, or deleted.
 * This ensures the extension responds dynamically to project configuration changes.
 */
function listenOnFileChangeWagoYaml() {
    const fileWatcher =
        vscode.workspace.createFileSystemWatcher('**/wago.yaml');

    // Handle file modifications (content changes)
    fileWatcher.onDidChange((uri: vscode.Uri) => {
        if (checkIfInRootFolder(uri)) {
            ProjectVersion = 0.2;
            vscode.commands.executeCommand(
                'setContext',
                'projectVersion',
                ProjectVersion
            );
        } else {
            ProjectVersion = 0;
        }
        setControllerCountContext();
        ControllerProvider.instance.refresh();
    });

    // Handle file creation (new wago.yaml added)
    fileWatcher.onDidCreate((uri: vscode.Uri) => {
        if (checkIfInRootFolder(uri)) {
            ProjectVersion = 0.2;
            vscode.commands.executeCommand(
                'setContext',
                'projectVersion',
                ProjectVersion
            );
        } else {
            ProjectVersion = 0;
        }
        setControllerCountContext();
        ControllerProvider.instance.refresh();
    });

    // Handle file deletion (wago.yaml removed)
    fileWatcher.onDidDelete((uri: vscode.Uri) => {
        if (!checkIfInRootFolder(uri)) return;
        ProjectVersion = 0;
        vscode.commands.executeCommand(
            'setContext',
            'projectVersion',
            ProjectVersion
        );
        ControllerProvider.instance.refresh();
    });
}

/**
 * Sets up file system watchers to monitor changes to the settings.json file.
 * Used for legacy V01 project detection and UI state management.
 */
function listenOnFileChangeSettingsJson() {
    const fileWatcher =
        vscode.workspace.createFileSystemWatcher('**/settings.json');

    fileWatcher.onDidChange((uri: vscode.Uri) => {
        vscode.commands.executeCommand(
            'setContext',
            'settingJsonPresent',
            checkIfInRootFolder(uri)
        );
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidCreate((uri: vscode.Uri) => {
        vscode.commands.executeCommand(
            'setContext',
            'settingJsonPresent',
            checkIfInRootFolder(uri)
        );
        ControllerProvider.instance.refresh();
    });

    fileWatcher.onDidDelete((uri: vscode.Uri) => {
        if (!checkIfInRootFolder(uri)) return;
        vscode.commands.executeCommand(
            'setContext',
            'settingJsonPresent',
            false
        );
        ControllerProvider.instance.refresh();
    });
}

/**
 * Validates whether a given file URI points to a file in the workspace root directory.
 * This is used to ensure configuration files (wago.yaml, settings.json) are in the correct location.
 *
 * @param uri - The file URI to check
 * @returns True if the file is located in the workspace root, false otherwise
 */
function checkIfInRootFolder(uri: vscode.Uri): Boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const folderPath = uri.fsPath.split('\\').slice(0, -1).join('\\');
            if (folderPath === folder.uri.fsPath) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Updates the VS Code context variable 'controllerCount' based on the current project version.
 * This context variable is used to control the visibility of UI elements in the extension.
 *
 * Controller count determination:
 * - V02 projects: Read from wago.yaml configuration
 * - V01 projects: Always 1 (single controller support)
 * - No project: 0 controllers
 */
function setControllerCountContext() {
    if (ProjectVersion >= 0.2) {
        vscode.commands.executeCommand(
            'setContext',
            'controllerCount',
            YamlCommands.getControllers()?.length
        );
    } else if (ProjectVersion >= 0.1) {
        vscode.commands.executeCommand('setContext', 'controllerCount', 1);
    } else {
        vscode.commands.executeCommand('setContext', 'controllerCount', 0);
    }
}
