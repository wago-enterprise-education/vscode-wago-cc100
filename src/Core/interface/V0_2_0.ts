import { RefreshInterface, UploadInterface } from "./interface";

export class Refresh implements RefreshInterface{
    refresh() {
        console.log("Refresh command executed");
    }
}
export class Upload implements UploadInterface{
    upload() {
        console.log("Upload command executed");
    }
}