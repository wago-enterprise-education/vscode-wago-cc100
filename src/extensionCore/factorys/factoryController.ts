import * as Interface from "../interfaces/controllerInterface";
import * as CC100 from "./interface/CC100";
export class ControllerFactory {
    private static instance: ControllerFactory | null = null;
    private constructor() {
        // Private constructor to prevent instantiation from outside
    }

    public static getInstance(): ControllerFactory {
        if (!ControllerFactory.instance) {
            ControllerFactory.instance = new ControllerFactory();
        }
        return ControllerFactory.instance!;
    }

    public createResetCommand(engine: string): Interface.ResetControllerInterface{
        switch (engine){
            case "CC100":
                return new CC100.ResetController();
            default:
                throw new Error("Invalid Controller");
        }
    }
}