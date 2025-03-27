import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { YamlCommands } from './yaml';
import { ConnectionManager } from './connectionManager';
import { setting } from './editSettings';

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
                        let settings = YamlCommands.getControllerYaml(Number.parseInt(controller.id));
                        await ConnectionManager.instance.updateController(Number.parseInt(controller.id), `${settings.ip}:${settings.port}`, settings.user);
                        await ConnectionManager.instance.ping(Number.parseInt(controller.id));
                        online = true;
                    } catch (error) {
                        console.debug(`Controller ${controller.id} is offline. Reason: ${error}`);
                    }
                    return new Controller(controller.id, controller.displayname, online);
                })
            );
        } else {
            if(element instanceof Controller) {
                const settings = YamlCommands.getControllerYaml(Number.parseInt(element.id));
                if (!settings) return Promise.resolve([]);
                
                const nodes = YamlCommands.getWagoYaml()["nodes"];

                const settingArray = []

                settingArray.push(new ControllerItem(element.id, setting.connection, settings.connection));
                if(settings.connection === 'ethernet') {
                    settingArray.push(new ControllerItem(element.id, setting.ip, settings.ip));
                    settingArray.push(new ControllerItem(element.id, setting.port, settings.port));
                }
                settingArray.push(new ControllerItem(element.id, setting.user, settings.user));
                settingArray.push(new ControllerItem(element.id, setting.autoupdate, settings.autoupdate));

                return Promise.resolve([
                    new ControllerItem(element.id, setting.description, nodes[element.id].description),
                    new ControllerItem(element.id, setting.engine, nodes[element.id].engine),
                    new ControllerItem(element.id, setting.imageVersion, nodes[element.id].imageVersion),
                    new ControllerItem(element.id, setting.src, nodes[element.id].src),

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
        public readonly id: string,
        public readonly label: string,
        public readonly online: boolean
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'controller';
        this.tooltip = `ID: ${id} \nOnline: ${online}`;
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor(online ? 'wagocc100.green' : 'wagocc100.red'));
    }
}

/**
 * Represents an item in the tree view for a controller.
 * Extends the `vscode.TreeItem` class.
 */
export class ControllerItem extends vscode.TreeItem {
    constructor(
        public readonly controllerId: string,
        public readonly setting: setting,
        public readonly content: any,
    ) {
        super(`${setting}: ${content}`, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'controllerItem';
    }

    public getId(): number {
        return Number.parseInt(this.controllerId)
    }
}