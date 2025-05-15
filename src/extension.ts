import * as vscode from 'vscode';
import { ControllerProvider } from './extension/view';
import { webviewIoCheck } from './extension/webviewIoCheck';
import { ProjectVersion, verifyProject } from './extension/versionDetection';
import { Command } from './extension/command';
import { Manager } from './extensionCore/manager';
export let extensionContext: vscode.ExtensionContext

export async function activate(context: vscode.ExtensionContext) {
	//Register TreeDataProvider for sidebar
	vscode.window.registerTreeDataProvider('controller-view', ControllerProvider.instance);

	extensionContext = context;

	//create IO-Check
	new webviewIoCheck(extensionContext);

	//Create Commands
	Command.createCommands();

	await verifyProject();

	//Connect to Controllers
	if (ProjectVersion != 0) {
		Manager.getInstance().establishConnections();
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }
