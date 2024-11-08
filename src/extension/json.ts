import fs from 'fs'

export class parse_JSON {
    /**
     * Method for reading the content of a json-file.
     * 
     * @param path Path where the operating file is located.
     * @returns an object that represents the json file.
     */
    public static read_json_file(path: string) {
        return JSON.parse(fs.readFileSync(path, 'utf8'));
    }

    /**
     * Method for changing a attribute of a json file.
     * 
     * @param path Path where the operating file is located.
     * @param attribute The attibute of the json file to be changed
     * @param value The new value of the attribute
     */
    public static write(path: string, attribute: settings, value: string | boolean) {
        let json = this.read_json_file(path);
        json[attribute] = value;
        fs.writeFileSync(path, JSON.stringify(json, null, "\t"))
    }
}

// enum for all attributes contained in the settings.json
export enum settings {
    usb_c = 'usb_c',
    ethernet = 'ethernet',
    simulator = 'simulator',
    ip_adress = 'ip_adress',
    simulation_frontend = 'simulation_frontend',
    simulation_backend = 'simulation_backend',
    user = 'user',
    autoupdate = 'autoupdate'
}