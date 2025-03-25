import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { YamlCommands } from './yaml';
import { ConnectionManager } from './connectionManager';

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
            let controllers = YamlCommands.getWagoYaml();
            if (!controllers) return Promise.resolve([]);

            return Promise.all(
                Object.keys(controllers.nodes).map(async (key) => {
                    let online = false;
                    try {
                        await ConnectionManager.instance.ping(Number.parseInt(key));
                        online = true;
                    } catch (error) {
                        console.debug(`Controller ${key} is offline`);
                    }
                    return new Controller(key, controllers.nodes[key].displayname, online);
                })
            );
        } else {
            if(element instanceof Controller) {
                const settings = yaml.parse(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/${element.id}.yaml`);
                if (!settings) return Promise.resolve([]);
                
                const nodes = YamlCommands.getWagoYaml()["nodes"];

                const settingArray = []

                settingArray.push(new ControllerItem(`Connection: ${settings.connection === "usb-c" ? 'USB-C' : settings.connection ? 'Ethernet' : 'Simulator'}`, Number.parseInt(element.id)));
                if(settings.ethernet) {
                    settingArray.push(new ControllerItem(`IP: ${settings.ip_adress}`, element.id));
                    settingArray.push(new ControllerItem(`Port: ${settings.port}`, element.id));
                }
                settingArray.push(new ControllerItem(`Username: ${settings.user}`, element.id));
                settingArray.push(new ControllerItem(`Auto Update: ${settings.autoupdate}`, element.id));

                return Promise.resolve([
                    new ControllerItem(`Description: ${nodes[element.id].description}`, element.id),
                    new ControllerItem(`Engine: ${nodes[element.id].engine}`, element.id),
                    new ControllerItem(`Docker Iamge Version: ${nodes[element.id].imgVersion}`, element.id),
                    new ControllerItem(`Src: ${nodes[element.id].src}`, element.id),

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
class ControllerItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'controllerItem';
    }

    public getId(): number {
        return Number.parseInt(id)
    }
}