import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { YamlCommands } from './yaml';

/**
 * Tree data provider for the controller view.
 */
export class ControllerProvider implements vscode.TreeDataProvider<Controller | ControllerItem> {
    static readonly instance = new ControllerProvider();
    private _onDidChangeTreeData: vscode.EventEmitter<Controller | undefined | null | void> = new vscode.EventEmitter<Controller | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Controller | ControllerItem | undefined | null | void> = this._onDidChangeTreeData.event;

    /**
     * Reloads the tree view.
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
            let controllers = YamlCommands.readWagoYaml();
            if (!controllers) return Promise.resolve([]);

            return Promise.resolve(
                Object.keys(controllers.nodes).map(key => {
                    return new Controller(key, controllers.nodes[key].displayname);
                })
            );
        } else {
            if(element instanceof Controller) {
                const settings = yaml.parse(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/controller/${element.id}.yaml`);
                if (!settings) return Promise.resolve([]);
                
                const nodes = YamlCommands.readWagoYaml()["nodes"];

                const settingArray = []

                settingArray.push(new ControllerItem(`Connection: ${settings.connection === "usb-c" ? 'USB-C' : settings.connection ? 'Ethernet' : 'Simulator'}`));
                if(settings.ethernet) {
                    settingArray.push(new ControllerItem(`IP: ${settings.ip_adress}`));
                    settingArray.push(new ControllerItem(`Port: ${settings.port}`));
                }
                settingArray.push(new ControllerItem(`Username: ${settings.user}`));
                settingArray.push(new ControllerItem(`Auto Update: ${settings.autoupdate}`));

                return Promise.resolve([
                    new ControllerItem(`Description: ${nodes[element.id].description}`),
                    new ControllerItem(`Engine: ${nodes[element.id].engine}`),
                    new ControllerItem(`Docker Iamge Version: ${nodes[element.id].imgVersion}`),
                    new ControllerItem(`Src: ${nodes[element.id].src}`),

                ].concat(settingArray));
            }
        }
        return Promise.resolve([]);
    }
}

/**
 * Abstract representation of a controller in the tree view.
 */
class Controller extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly label: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'controller';
    }
}

/**
 * Abstract representation of a controller item in the tree view.
 */
class ControllerItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'controllerItem';
    }
}