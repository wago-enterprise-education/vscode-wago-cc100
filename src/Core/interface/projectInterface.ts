import { Controller, ControllerItem } from '../../extension/view';
import * as vscode from 'vscode';

export interface UploadInterface{
    upload: (id: number) => void;
}

export interface ResetControllerInterface{
<<<<<<< HEAD:src/Core/interface/interface.ts
<<<<<<< HEAD
    reset: (controller: Controller | undefined, showConfirmation: boolean) => Promise<boolean>;
=======
    reset: (controller: Controller | undefined) => void;
>>>>>>> 3668887 (Refactor WAGO controller engine version and update imports for controller handling)
=======
    reset: (controller: Controller | undefined) => Promise<string>;
>>>>>>> 02ff7d8 (added factory for controller and split resetCommand between Project- and ControllerFactory):src/Core/interface/projectInterface.ts
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