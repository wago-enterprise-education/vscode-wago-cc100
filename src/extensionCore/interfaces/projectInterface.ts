/**
 * @fileoverview Defines interfaces for controller management in the WAGO CC100 VS Code extension.
 *
 * This file contains interfaces that define operations for managing controllers:
 * - Uploading to controllers
 * - Resetting controllers
 * - Configuring controllers
 * - Editing controller settings
 * - Viewing controller hierarchies
 * - Adding/removing controllers
 * - Renaming controllers
 * - Creating projects
 * - Establishing connections
 *
 * These interfaces separate the contract from implementation, allowing for different implementations
 * of controller management functionality while maintaining a consistent API across the extension.
 *
 * @module projectInterface
 */
import { Controller, ControllerItem } from '../../extension/view';
import * as vscode from 'vscode';

export interface UploadInterface {
    uploadController: (controller: Controller | undefined) => void;
}

export interface UploadAllInterface {
    uploadAllControllers: () => void;
}

export interface ResetControllerInterface {
    reset: (
        controller: Controller | undefined,
        showConfirmation: boolean
    ) => Promise<string>;
}

export interface ConfigureControllerInterface {
    configure: (controller: Controller | undefined) => void;
}

export interface EditSettingsInterface {
    editSettings: (controller: ControllerItem | undefined) => void;
}

export interface ViewChildrenInterface {
    getChildren: (
        element?: Controller | ControllerItem | undefined
    ) => Promise<vscode.ProviderResult<Controller[] | ControllerItem[]>>;
}

export interface AddControllerInterface {
    addController: () => void;
}

export interface RemoveControllerInterface {
    removeController: (
        controller: Controller | undefined,
        showConfirmation: boolean
    ) => void;
}

export interface RenameControllerInterface {
    renameController: (controller: Controller | undefined) => void;
}

export interface RemoveResetControllerInterface {
    removeResetController: (
        controller: Controller | undefined
    ) => Promise<Controller | undefined>;
}

export interface EstablishConnectionsInterface {
    establishConnections: () => void;
}

export interface GetEngineInterface {
    getEngine: (controllerId: number) => string;
}