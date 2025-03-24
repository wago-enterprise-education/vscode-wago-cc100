import * as vscode from 'vscode';
import { webviewIoCheck } from './webviewIoCheck';
import { YamlCommands, settings } from './extension/yaml';
import { ControllerProvider } from './extension/view';
import { Command } from './extension/command';
import { verifyProject } from './extension/helper';
import { ConnectionManager } from './extension/connectionManager';


export async function activate(context: vscode.ExtensionContext) {
	//Register TreeDataProvider for sidebar
	vscode.window.registerTreeDataProvider('controller-view', ControllerProvider.instance);

	//create IO-Check
	new webviewIoCheck(context);

	//Create Commands
	Command.createCommands(context);

	if(await verifyProject()) {
		const controller = YamlCommands.readWagoYaml();
		Object.keys(controller.nodes).forEach(async (key) => {
			const settings = YamlCommands.readControllerYaml(Number.parseInt(key));
			await ConnectionManager.instance.addController(Number.parseInt(key), `${settings.ip}:${settings.port}`, settings.user)
		})
	}

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
