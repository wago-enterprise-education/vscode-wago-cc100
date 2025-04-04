import * as vscode from 'vscode';
import { webviewIoCheck } from './extension/webviewIoCheck';
import { ControllerProvider } from './extension/view';
import { Command } from './extension/command';
import { verifyProject } from './extension/versionDetection';
import { Manager } from './core/manager';


export async function activate(context: vscode.ExtensionContext) {
	//Register TreeDataProvider for sidebar
	vscode.window.registerTreeDataProvider('controller-view', ControllerProvider.instance);

	//create IO-Check
	new webviewIoCheck(context);

	//Create Commands
	Command.createCommands(context);

	await verifyProject();

	//Connect to Controllers
	Manager.getInstance().establishConnections();
}

// This method is called when your extension is deactivated
export function deactivate() { }
