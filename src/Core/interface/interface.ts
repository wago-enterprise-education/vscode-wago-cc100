import { Controller, ControllerItem } from '../../extension/view';
import * as vscode from 'vscode';

export interface UploadInterface{
    upload: (id: number) => void;
}

export interface ResetControllerInterface{
    reset: (controller: Controller | undefined, showConfirmation: boolean) => Promise<boolean>;
}

export interface ConfigureControllerInterface{
    configure: () => void;
}

export interface EditSettingsInterface{
    editSettings: (controller: ControllerItem | undefined) => void;
}

export interface ViewChildrenInterface{
    getChildren: (element?: Controller | ControllerItem | undefined) => vscode.ProviderResult<Controller[] | ControllerItem[]>;
}

export interface AddControllerInterface{
    addController: (context: vscode.ExtensionContext) => void;
}

export interface RemoveControllerInterface{
    removeController: (controller: Controller | undefined, showConfirmation: boolean) => void;
}

export interface RenameControllerInterface{
    renameController: (controller: Controller | undefined) => void;
}

export interface CreateControllerInterface{
    createController: (context: vscode.ExtensionContext) => void;
}