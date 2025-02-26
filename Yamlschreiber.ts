import fs from 'fs'
import YAML from 'yaml'






//BEISPIELE ZUR REFERENZ//

//Einzelne Schlüsselpaare reinschreiben

fs.writeFileSync("./wago.yaml", YAML.stringify( { src: 'main' } ));
fs.writeFileSync("./wago.yaml", YAML.stringify( { engine: 'cc100-v1' } ));

//Objekt erstellen

let hi = {
    controller: {
        src: 'main',
        engine: 'eojef'
    }
};

//Objekt schreiben

fs.writeFileSync("./wago.yaml", YAML.stringify(hi));

//Objekt auslesen

const read = fs.readFileSync("wago.yaml", 'utf8');

//Objekt bearbeitbar machen

let object = YAML.parse(read);

object.controller.src = 'secondary'

