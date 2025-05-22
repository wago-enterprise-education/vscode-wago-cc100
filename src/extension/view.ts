import * as vscode from "vscode";
import { Manager } from "../extensionCore/manager";
import { setting } from "../extensionCore/projectVersions/V01";

/**
 * Tree data provider for the controller view.
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
  getChildren(
    element?: Controller | ControllerItem | undefined,
  ): vscode.ProviderResult<Controller[] | ControllerItem[]> {
    return Manager.getInstance().viewChildren(element);
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
    public readonly online: boolean,
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "controller";
    this.tooltip = `ID: ${controllerId} \nOnline: ${online}`;
    this.iconPath = new vscode.ThemeIcon(
      "circle-filled",
      new vscode.ThemeColor(online ? "wagocc100.green" : "wagocc100.red"),
    );
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
    this.contextValue = "controllerItem";
  }
}
