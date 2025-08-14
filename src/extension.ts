import * as vscode from 'vscode';
import { ControllerProvider } from './extension/view';
import { webviewIoCheck } from './extension/webviewIoCheck';
import { ProjectVersion, verifyProject } from './extension/versionDetection';
import { Command } from './extension/command';
import { Manager } from './extensionCore/manager';

/**
 * Global extension context available to other modules.
 * This is set during activation and provides access to extension-specific resources.
 */
export let extensionContext: vscode.ExtensionContext;

/**
 * Main entry point for the WAGO CC100 extension.
 * This function is called automatically when the extension is activated by VS Code.
 *
 * The activation process:
 * 1. Registers the controller tree view in the sidebar
 * 2. Initializes the IO-Check webview functionality
 * 3. Creates and registers all VS Code commands
 * 4. Detects project version and validates project structure
 * 5. Establishes connections to configured controllers
 *
 * @param context - The VS Code extension context providing access to extension lifecycle and resources
 */
export async function activate(context: vscode.ExtensionContext) {
    // Register TreeDataProvider for the controller sidebar view
    vscode.window.registerTreeDataProvider(
        'controller-view',
        ControllerProvider.instance
    );

    // Store extension context globally for use by other modules
    extensionContext = context;

    // Initialize IO-Check webview for real-time controller I/O testing and monitoring
    new webviewIoCheck();

    // Register all extension commands with VS Code
    Command.createCommands();

    // Detect project version (V01 or V02) based on configuration files
    await verifyProject();

    // Establish SSH connections to controllers if a valid project is detected
    if (ProjectVersion != 0) {
        Manager.getInstance().establishConnections();
    }
}

/**
 * Called when the extension is deactivated.
 * Currently empty as cleanup is handled by VS Code's disposal system.
 */
export function deactivate() {}
