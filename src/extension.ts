import * as vscode from 'vscode';
import { SSH } from './ssh'
const ssh = new SSH('192.168.42.42', 0, 'root', '');
import { custom_webview_provider_menu } from './extension/custom_webview_menu';
import { custom_webview_provider_settings } from './extension/webview_settings';
import { webview_IOCheck } from './webview_IOCheck';
import { Workspace } from './extension/workspace';
import { YamlCommands } from './extension/yaml';
import { View } from './extension/view';
import { Command } from './extension/command';
import { verifyProject } from './extension/helper';

const workspace = new Workspace();

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

	//show settings
	const webview_provider_settings = new custom_webview_provider_settings(context);

	webview_provider_settings.download_lib();

	const test = new YamlCommands();
	test.registerYamlCommands(context);
}

// This method is called when your extension is deactivated
export function deactivate() { }
