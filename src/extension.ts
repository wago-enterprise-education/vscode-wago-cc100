import * as vscode from 'vscode';
import { SSH } from './ssh'
const ssh = new SSH('192.168.42.42', 0, 'root', '');
import { custom_webview_provider_menu } from './extension/custom_webview_menu';
import { custom_webview_provider_settings } from './extension/webview_settings';
import { webview_homepage } from './extension/webview_homepage';
import { webview_IOCheck } from './webview_IOCheck';
import { Workspace } from './extension/workspace';
const workspace = new Workspace();

export function activate(context: vscode.ExtensionContext) {
	//create IO-Check
	const webview_IO = new webview_IOCheck(context);

	//show menu
	const webview_provider_menu = new custom_webview_provider_menu(context.extensionUri, webview_IO);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider(custom_webview_provider_menu.viewType, webview_provider_menu));
	webview_provider_menu.register_commands(context);
	webview_provider_menu.create_status_bar(context);

	//show settings
	const webview_provider_settings = new custom_webview_provider_settings(context.extensionUri, context, webview_provider_menu, webview_IO);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider(custom_webview_provider_settings.viewType, webview_provider_settings));

	webview_provider_menu._view?.webview.postMessage("cmd_simulation");
	//create home
	const webview_home = new webview_homepage(context, context.extensionUri);

	//show home
	vscode.commands.executeCommand('vscode-wago-cc100.home');

	webview_provider_settings.download_lib();
}

// This method is called when your extension is deactivated
export function deactivate() { }
