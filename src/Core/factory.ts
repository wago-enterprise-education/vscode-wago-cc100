import { RefreshInterface, UploadInterface } from "./interface/interface";
import * as V1 from "./interface/V0_1_0";
import * as V2 from "./interface/V0_2_0";
import { versionNr } from '../extension/helper';

export class Factory {
    private static instance: Factory | null = null;
    private constructor() {
        // Private constructor to prevent instantiation from outside
    }

    public static getInstance(): Factory {
        if (!Factory.instance) {
            Factory.instance = new Factory();
        }
        return Factory.instance!;
    }

    public createRefreshCommand(versionNr: number): RefreshInterface {
        if (versionNr = 0.1) {
            return new V1.Refresh();
        } else if (versionNr = 0.2) {
            return new V2.Refresh();
        } else {
            throw new Error("Invalid version number");
        }
    }

    public createUploadCommand(versionNr: number): UploadInterface {
        if (versionNr = 0.1) {
            return new V1.Upload();
        } else if (versionNr = 0.2) {
            return new V2.Upload();
        } else {0
            throw new Error("Invalid version number");
        }
    }
}