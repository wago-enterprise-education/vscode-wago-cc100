export class EditSettings {
    
    public static editSetting(settingToEdit: string, content: string) {
        //Check for the name of the setting and call the according function
        //Add QuickPicks for Settings where it can be used

        switch (settingToEdit) {
            // wago.yaml Setting
            case setting.displayname, setting.description:

                break;

            // controller.yaml Setting
            case setting.version, setting.connection, setting.ip, setting.port, setting.user:

                break;

            // wago.yaml QuickPick
            case setting.engine, setting.src, setting.imageVersion: 

                break;

            // controller.yaml QuickPick
            case setting.autoupdate: 
            
                break;
        }
    }

}

export enum setting {
    displayname = 'Name',
    description = 'Description',
    engine = 'Engine',
    src = 'Src',
    imageVersion = 'Docker Image Version',
    version = 'Version',
    connection = 'Connection',
    ip = 'IP',
    port = 'Port',
    user = 'User',
    autoupdate = 'Autoupdate'
}