import * as vscode from 'vscode';
import { custom_webview_provider_menu } from './extension/custom_webview_menu';
import { webview_IOCheck } from './webview_IOCheck';
import { YamlCommands } from './extension/yaml';
import { View } from './extension/view';
import { Command } from './extension/command';
import { verifyProject } from './extension/helper';


export function activate(context: vscode.ExtensionContext) {
	//Create View
	View.createView(context);

	//Create Commands
	Command.createCommands(context);

	//Check if project is valid
	verifyProject();

	//create IO-Check
	const webview_IO = new webview_IOCheck(context);

	//show menu
	const webview_provider_menu = new custom_webview_provider_menu(context.extensionUri, webview_IO);
	webview_provider_menu.register_commands(context);
	webview_provider_menu.create_status_bar(context);

	//register yaml commands
	const test = new YamlCommands();
	test.registerYamlCommands(context);
}

// This method is called when your extension is deactivated
export function deactivate() { }
