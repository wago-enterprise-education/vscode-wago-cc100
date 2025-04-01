import * as vscode from 'vscode';
import { YamlCommands } from '../migrated/yaml';
import { ConnectionManager } from './connectionManager';
import { setting } from '../migrated/editSettings';

/**
 * Tree data provider for the controller view.
 */
export class ControllerProvider implements vscode.TreeDataProvider<Controller | ControllerItem> {
    static readonly instance = new ControllerProvider();
    private _onDidChangeTreeData: vscode.EventEmitter<Controller | undefined | null | void> = new vscode.EventEmitter<Controller | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Controller | ControllerItem | undefined | null | void> = this._onDidChangeTreeData.event;

    /**
     * Refreshes the tree data by firing the `_onDidChangeTreeData` event.
     * This method triggers an update to the tree view, causing it to re-fetch
     * and re-render the data.
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Return the tree item for the given element.
     * 
     * @param element Controller or ControllerItem
     * @returns vscode.TreeItem
     */
    getTreeItem(element: Controller | ControllerItem): vscode.TreeItem {
        return element;
    }

    /**
     * Return the children of the given element. If the element is undefined, return the a Controller.
     * 
     * @param element Controller or ControllerItem or undefined
     * @returns vscode.ProviderResult<Controller[] | ControllerItem[]>
     */
    getChildren(element?: Controller | ControllerItem | undefined): vscode.ProviderResult<Controller[] | ControllerItem[]> {
        if(!element) {
            let controllers = YamlCommands.getControllers();
            if (!controllers) return Promise.resolve([]);

            return Promise.all(
                controllers.map(async (controller) => {
                    let online = false;
                    try {
                        let settings = YamlCommands.getControllerSettings(controller.id);
                        await ConnectionManager.instance.updateController(controller.id, `${settings.ip}:${settings.port}`, settings.user);
                        await ConnectionManager.instance.ping(controller.id);
                        online = true;
                    } catch (error) {
                        console.debug(`Controller ${controller.id} is offline. ${error}`);
                    }
                    return new Controller(controller.id, controller.displayname, online);
                })
            );
        } else {
            if(element instanceof Controller) {
                const settings = YamlCommands.getControllerSettings(element.controllerId);
                if (!settings) return Promise.resolve([]);
                
                const controller = YamlCommands.getController(element.controllerId);

                const settingArray = []

                settingArray.push(new ControllerItem(element.controllerId, setting.connection, settings.connection));
                if(settings.connection === 'ethernet') {
                    settingArray.push(new ControllerItem(element.controllerId, setting.ip, settings.ip));
                }
                settingArray.push(new ControllerItem(element.controllerId, setting.port, settings.port));
                settingArray.push(new ControllerItem(element.controllerId, setting.user, settings.user));
                settingArray.push(new ControllerItem(element.controllerId, setting.autoupdate, settings.autoupdate));

                return Promise.resolve([
                    new ControllerItem(element.controllerId, setting.description, controller?.description),
                    new ControllerItem(element.controllerId, setting.engine, controller?.engine),
                    new ControllerItem(element.controllerId, setting.imageVersion, controller?.imageVersion),
                    new ControllerItem(element.controllerId, setting.src, controller?.src),

                ].concat(settingArray));
            }
        }
        return Promise.resolve([]);
    }
}

/**
 * Represents a controller item in a VS Code tree view.
 * Extends the `vscode.TreeItem` class.
 */
export class Controller extends vscode.TreeItem {
    /**
     * Creates an instance of the Controller class.
     * 
     * @param id - The unique identifier for the controller.
     * @param label - The label to display for the controller.
     */
    constructor(
        public readonly controllerId: number,
        public readonly label: string,
        public readonly online: boolean
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'controller';
        this.tooltip = `ID: ${controllerId} \nOnline: ${online}`;
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor(online ? 'wagocc100.green' : 'wagocc100.red'));
    }
}

/**
 * Represents an item in the tree view for a controller.
 * Extends the `vscode.TreeItem` class.
 */
export class ControllerItem extends vscode.TreeItem {
    constructor(
        public readonly controllerId: number,
        public readonly setting: setting,
        public readonly content: any,
    ) {
        super(`${setting}: ${content}`, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'controllerItem';
    }
}