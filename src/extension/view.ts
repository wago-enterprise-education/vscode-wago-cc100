import * as vscode from 'vscode';

const controlleTest = [
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

export class ControllerProvider implements vscode.TreeDataProvider<Controller | ControllerItem> {
    static readonly instance = new ControllerProvider();
    private _onDidChangeTreeData: vscode.EventEmitter<Controller | undefined | null | void> = new vscode.EventEmitter<Controller | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Controller | ControllerItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Controller | ControllerItem): vscode.TreeItem {
        return element;
    }

    getChildren(element: Controller | ControllerItem): vscode.ProviderResult<Controller[] | ControllerItem[]> {
        if(!element) {
            return Promise.resolve(
                controlleTest.map(element => {
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

class Controller extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public settings: { [key: string]: string }
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'controller';
    }
}

class ControllerItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'controllerItem';
    }
}