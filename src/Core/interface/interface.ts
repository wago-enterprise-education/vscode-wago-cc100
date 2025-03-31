import { Controller, ControllerItem } from '../../extension/view';
import * as vscode from 'vscode';

export interface UploadInterface{
    upload: (id: number) => void;
}

export interface ResetControllerInterface{
    reset: (controller: any) => void;
}


export interface AddControllerInterface{
    add: () => void;
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