import * as vscode from 'vscode';

const controllerTest = [
    {
        "name": "Controller 1",
        "settings": {
            "ip": "192.168.42.42",
            "port": "22"
        }
    },
    {
        "name": "Controller 2",
        "settings": {
            "ip": "192.168.17.85",
            "port": "22"
        }
    }
]

export class View {
    public static createView(context: vscode.ExtensionContext) {
        vscode.window.registerTreeDataProvider('controller-view', ControllerProvider.instance);
    }
}

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
            return Promise.resolve(
                controllerTest.map(element => {
                    return new Controller(element.name, element.settings);
                })
            )
        } else {
            if(element instanceof Controller) {
                return Promise.resolve(
                    Object.keys(element.settings).map(key => {
                        return new ControllerItem(`${key}: ${element.settings[key]}`);
                    })
                );
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
        public readonly label: string,
        public settings: { [key: string]: string }
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