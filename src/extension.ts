import * as vscode from 'vscode';
import { customWebviewProviderMenu } from './extension/customWebviewMenu';
import { webviewIoCheck } from './webviewIoCheck';
import { YamlCommands } from './extension/yaml';
import { ControllerProvider } from './extension/view';
import { Command } from './extension/command';
import { verifyProject } from './extension/helper';


export function activate(context: vscode.ExtensionContext) {
	//Register TreeDataProvider for sidebar
	vscode.window.registerTreeDataProvider('controller-view', ControllerProvider.instance);

	//create IO-Check
	new webviewIoCheck(context);

	//Create Commands
	Command.createCommands(context);

	//Check if project is valid
	verifyProject();

	//show menu
	// const webviewProviderMenu = new customWebviewProviderMenu(context.extensionUri, webviewIo);
	// webviewProviderMenu.registerCommands(context);
	// webviewProviderMenu.createStatusBar(context);

	// register yaml commands
	// const test = new YamlCommands();
	// test.registerYamlCommands(context);
}

// This method is called when your extension is deactivated
export function deactivate() { }
