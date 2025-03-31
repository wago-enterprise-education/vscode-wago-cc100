import * as Interface from "./interface";

export class Upload implements Interface.UploadInterface{
    upload() {
        console.log("Upload command executed");
    }
}
export class ResetController implements Interface.ResetControllerInterface{
    reset() {
        console.log("Reset command executed");
    }
}
export class AddController implements Interface.AddControllerInterface{
    add() {
        console.log("Add command executed");
    }
}
export class ConfigureController implements Interface.ConfigureControllerInterface{
    configure() {
        console.log("Configure command executed");
    }
}
export class EditSettings implements Interface.EditSettingsInterface{
    editSettings(element: any) {
        console.log("Edit settings command executed", element);
    }
}
export class ViewChildren implements Interface.ViewChildrenInterface{
    getChildren(element?: any): any {
        console.log("Get children command executed", element);
        return [];
    }
}