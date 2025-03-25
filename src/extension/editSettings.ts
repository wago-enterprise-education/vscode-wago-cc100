export class EditSettings {
    
    public static commands() {
        
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