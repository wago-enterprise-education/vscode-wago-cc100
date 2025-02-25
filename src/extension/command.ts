import * as vscode from 'vscode';
import * as fs from 'fs';

const FOLDER_REGEX = '^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^.]*)?$)[^<>:"/\\|?*\x00-\x1F]*[^<>:"/\\|?*\x00-\x1F\ .]$';

export class Command {
    public static createCommands(context: vscode.ExtensionContext) {
        const commands = [];

        commands.push(vscode.commands.registerCommand('vscode-wago-cc100.create-project', async () => {
            const projectName = await vscode.window.showInputBox({
                prompt: 'Enter the name of the project',
                title: 'Create Project',
                validateInput: (value: string) => {
                    if(!RegExp(FOLDER_REGEX).test(value)) {
                        return 'Invalid project name';
                    }
                    return null;
                }
            })

            if(!projectName) return;

            await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Project Destination'
            }).then(async (uri) => {
                if(uri && projectName) {
                    try {
                        fs.mkdirSync(`${uri[0].fsPath}/${projectName}`);
                        fs.cpSync(`${context.extensionPath}/res/template`, `${uri[0].fsPath}/${projectName}`, { recursive: true });
                        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(`${uri[0].fsPath}/${projectName}`));
                    } catch (error: any) {
                        vscode.window.showErrorMessage('Project already exists');
                        vscode.window.showErrorMessage(error);
                    }
                }
            })
        }));
    }
}