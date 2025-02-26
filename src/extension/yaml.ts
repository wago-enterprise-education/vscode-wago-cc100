import fs from 'fs'
import YAML from 'yaml'

export class parse_YAML {
    /**
     * Method for reading the content of a yaml-file.
     * 
     * @param path Path where the operating file is located.
     * @returns an object that represents the yaml file.
     */
    public static read_yaml_file(path: string) {
        return YAML.parse(fs.readFileSync(path, 'utf8'));
    }

    /**
     * Method for changing a attribute of a yaml file.
     * 
     * @param path Path where the operating file is located.
     * @param attribute The attibute of the yaml file to be changed
     * @param value The new value of the attribute
     */
    public static write(path: string, attribute: settings, value: string | boolean) {
        let yaml = this.read_yaml_file(path);
        yaml[attribute] = value;
        fs.writeFileSync(path, YAML.stringify(yaml, null, "\t"))
    }
}

// enum for all attributes contained in the settings.yaml
export enum settings {
    version = 'version',
    usb_c = 'usb_c',
    ethernet = 'ethernet',
    ip_adress = 'ip_adress',
    port = 'port',
    user = 'user',
    autoupdate = 'autoupdate'
}