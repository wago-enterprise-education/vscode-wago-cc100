import * as vscode from 'vscode';
import { custom_webview_provider_menu } from './extension/custom_webview_menu';
import { webview_IOCheck } from './webviewIoCheck';
import { YamlCommands } from './extension/yaml';
import { ControllerProvider } from './extension/view';
import { Command } from './extension/command';
import { verifyProject } from './extension/helper';


export function activate(context: vscode.ExtensionContext) {
	//Register TreeDataProvider for sidebar
	vscode.window.registerTreeDataProvider('controller-view', ControllerProvider.instance);

	//Create Commands
	Command.createCommands(context);

	//Check if project is valid
	verifyProject();

	//create IO-Check
	const webviewIo = new webviewIoCheck(context);

	//show menu
	const webviewProviderMenu = new customWebviewProviderMenu(context.extensionUri, webview_IO);
	webviewProviderMenu.registerCommands(context);
	webviewProviderMenu.createStatusBar(context);

	/*//register yaml commands
	const test = new YamlCommands();
	test.registerYamlCommands(context); */
}

// This method is called when your extension is deactivated
export function deactivate() { }
