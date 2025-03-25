export class EditSettings {
    
    public static editSetting(setting: string, content: string) {
        //Check for the name of the setting and call the according function
        //Add QuickPicks for Settings where it can be used
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