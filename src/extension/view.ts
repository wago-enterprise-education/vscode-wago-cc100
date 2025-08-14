import * as vscode from 'vscode';
import { Manager } from '../extensionCore/manager';

/**
 * Tree data provider for the WAGO CC100 controller view in VS Code's sidebar.
 * Implements the singleton pattern to ensure a single instance manages the entire tree view.
 * 
 * This provider is responsible for:
 * - Displaying controllers and their configuration settings
 * - Handling tree refresh events when data changes
 * - Managing the hierarchical structure (Controller -> ControllerItem)
 */
export class ControllerProvider
    implements vscode.TreeDataProvider<Controller | ControllerItem>
{
    static readonly instance = new ControllerProvider();
    
    private _onDidChangeTreeData: vscode.EventEmitter<
        Controller | undefined | null | void
    > = new vscode.EventEmitter<Controller | undefined | null | void>();
    
    readonly onDidChangeTreeData: vscode.Event<
        Controller | ControllerItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    /**
     * Triggers a refresh of the entire tree view.
     * Called when controller data changes (connection status, settings, etc.)
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Converts a controller or controller item into a VS Code tree item for display.
     * 
     * @param element - The controller or controller item to convert
     * @returns The VS Code tree item representation
     */
    getTreeItem(element: Controller | ControllerItem): vscode.TreeItem {
        return element;
    }

    /**
     * Retrieves the children of a tree element for hierarchical display.
     * 
     * @param element - The parent element (undefined for root level)
     * @returns Array of child controllers or controller items
     */
    getChildren(
        element?: Controller | ControllerItem | undefined
    ): vscode.ProviderResult<Controller[] | ControllerItem[]> {
        return Manager.getInstance().viewChildren(element);
    }
}

/**
 * Represents a WAGO controller in the tree view.
 * Controllers are top-level items that can be expanded to show their configuration settings.
 */
export class Controller extends vscode.TreeItem {
    /**
     * Creates a new controller tree item.
     *
     * @param controllerId - Unique identifier for the controller
     * @param label - Display name for the controller
     * @param online - Whether the controller is currently connected and responsive
     */
    constructor(
        public readonly controllerId: number,
        public readonly label: string,
        public readonly online: boolean
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'controller';
        this.tooltip = `ID: ${controllerId} \nOnline: ${online}`;
        
        // Set icon color based on connection status (green = online, red = offline)
        this.iconPath = new vscode.ThemeIcon(
            'circle-filled',
            new vscode.ThemeColor(online ? 'wagocc100.green' : 'wagocc100.red')
        );
    }
}

/**
 * Represents a configuration setting for a controller in the tree view.
 * These are child items displayed under each controller (IP, port, user, etc.)
 */
export class ControllerItem extends vscode.TreeItem {
    /**
     * Creates a new controller setting item.
     *
     * @param controllerId - ID of the parent controller
     * @param setting - The type of setting (e.g., 'ip', 'port', 'user')
     * @param content - The current value of the setting
     */
    constructor(
        public readonly controllerId: number,
        public readonly setting: any,
        public readonly content: any
    ) {
        super(`${setting}: ${content}`, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'controllerItem';
    }
}
