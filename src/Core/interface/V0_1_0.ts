import { RefreshInterface } from "./interface";

export class Refresh implements RefreshInterface{
    refresh() {
        console.log("Refresh command executed");
    }
}