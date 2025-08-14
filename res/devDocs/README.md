# WAGO CC100 Extension für Visual Studio Code - Entwicklerdokumentation

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Ordnerstruktur](#ordnerstruktur)
   - [src](#src)
     - [Extension.ts](#extensionts)
     - [Extension](#extension)
     - [ExtensionCore](#extensioncore)
     - [Shared](#shared)
   - [res](#res)
     - [devDocs](#devdocs)
     - [images](#images)
     - [template](#template)
     - [Videos](#videos)
     - [webviews](#webviews)
     - [dockerCommand.sh](#dockercommandsh)
3. [Anleitungen](#anleitungen)
   - [Der Manager und die Factories](#der-manager-und-die-factories)
   - [Hinzufügen von neuen Controllern - Typen](#hinzufügen-von-neuen-controllern---typen)
   - [Hinzufügen von neuen Extension - Versionen](#hinzufügen-von-neuen-extension---versionen)
   - [Hinzufügen neuer VSCode - Commands](#hinzufügen-neuer-vscode---commands)
   - [Connection Manager](#connection-manager)
   - [Debugger Konfigurationen hinzufügen](#debugger-konfigurationen-hinzufügen)
   - [Image herunterladen](#image-herunterladen)

## Überblick

Die Grundidee der Extension war es, eine Entwicklungsumgebung für den Wago CC100 zu bieten.
Nach erfolgreicher Implementierung der Funktion wurde sich dann dazu entschlossen, dass Projekt weiter auszubauen und VSCode-nativer zu gestalten.

So entstand V02 des Projektes. Die Idee war, eine Extension zu haben, die die VSCode Steuerelemente nutzt und mit der man WAGO-Controller per Python Programmieren, teilweise Konfigurieren und Debuggen kann.
Ein weiteres Ziel der V02 war es, eine "Engine" zu entwickeln, welche es ermöglicht die Extension modular für weitere Controller oder Funktionen anpassbar zu machen.

Die Architektur der Extension nutzt dazu ein Factory-Pattern, welches anhand einer Versionsüberprüfung die entsprechend Funktionalität mit den VSCode Buttons und Befehlen verbindet. Dadurch wird es möglich versionsspezifisch Funktionalität hinzuzufügen ohne ältere Versionen verändern zu müssen.

## Ordnerstruktur

Hier wird kurz auf die Aufteilung der Ordner und die Inhalte der wichtigen Unterordner eingegangen.

### src

---

Hier liegt der gesamte Code der Extension. Alles von Aussehen bis Funktionalität geschieht hier. Grundlegend ist der Ordner aufgeteilt in "Extension", "ExtensionCore" und die von VSCode für Extensions geforederte "extension.ts".

#### Extension.ts

Der "Startpunkt" der Extension. Diese Datei enthält die "activate" Funktion, welche beim Starten der Extension aufgerufen wird. Innerhalb der Methode werden die Sidebar gerendert, die Commands registriert, die Projektversion festgestellt und alle gelisteten Controller verbunden. Die Extension.ts bezieht sich dabei auf die Dateien in dem /extension Ordner, um eine angenehmere Ordnung herzustellen.
Die "deactivate" Methode ist ebenfalls vorhanden, jedoch leer, da diese dazu genutzt werden würde, um Commands unverfügbar zu machen. Allerdings werden diese beim registrieren in einen Array eingeschrieben, der zum registrieren der Commands genutzt wird. Da der Array beim deaktivieren der Extension entfernt wird, entfernen sich die Commands auch praktisch von selbst.

#### Extension

Hier finden sich universell gültige Dateien, die immer von der Extension gebraucht werden:

- command.ts -> Eintragen und zuweisen aller Commands als disposable array. In den Commands aufgerufen wird immer der Manager aus dem ExtensionCore
- connectionManager.ts -> Manager, der sich um alles bezüglich der Connections zu den Controllern und Verwaltung dieser kümmert.
- ioCheck.js -> Das Webviews Panel um den Controller vergleichsweise wie in IO-Check zu konfigurieren
- versionDetection.ts -> Eine Funktion um die Version eines geöffneten Projektes festzustellen.
- view.ts -> Darstellung der Controller in der Sidebar
- webviewIOCheck.ts -> Teil der Logik hinter der IO-Check Funktionalität

Mehrere Dateien enthalten die YamlCommands Klasse und die entsprechenden enums aus V02, um Abhängigkeit von Versionsfiles zu vermeiden

#### ExtensionCore

Hier findet sich eine
Factory Struktur, die die Funktionalität von Commands innerhalb von VSCode zuweist. Je nach festgestellter Projektversion und nach im Controller eingestellter Controllerart werden entsprechende Methoden ausgewählt.

- manager.ts -> Das Herz der Factory-Struktur. Sämtliche Commandaufrufe laufen durch diesen Manager, um die entsprechenden Methoden zugeordnet zu bekommen. Dafür ruft der Manager je nach Commands die entsprechende(n) Factory(s) auf.
- controllerVersions -> Enthält die Dateien mit Controller-spezifischen Funktionen. Aufgerufen werden diese nur wenn eine Methode vorliegt, die Controllerspezifische Pfade o. Ä. verwendet.
- factorys -> Die tatsächlichen Factorys, die von dem Manager aufgerufen werden. Verweisen jeweils auf die festgestellten Controllerspezifischen- und Versionsspezifischen Methodendateien.
- interfaces -> Enthält Interfaces für je die Controllermethoden und die Versionsmethoden, um sicherzustellen, dass bekannt ist, welche Attribute in die Methoden eingehen und welche Rückgabewerte zu erwarten sind.
- projectVersions -> Enthält die Dateien mit Versions-spezifischen Funktionen. Standardmäßig werden diese Methoden aufgerufen, sobald ein Command ausgeführt wird, da die Mehrheit der Methoden nicht Controller-spezifisch definiert werden muss.

#### Shared

Hier befinden sich gemeinsam genutzte Ressourcen, die von verschiedenen Teilen der Extension verwendet werden. Der Shared-Ordner stellt zentrale Definitionen und Utility-Funktionen bereit, um Code-Duplikation zu vermeiden und Konsistenz über die gesamte Extension hinweg zu gewährleisten.

- constants.ts -> Zentrale Konstanten und Konfigurationswerte der Extension. Enthält unter anderem Regex-Pattern für Validierungen, Netzwerk-Pfade, SSH-Verbindungseinstellungen, Docker-Konfigurationen und Standard-IP-Adressen. Diese Datei ist die einzige Quelle für alle konfigurierbaren Werte und erleichtert damit die Wartung der Extension.
- types.ts -> TypeScript-Typdefinitionen und Enums für die Extension. Definiert die Struktur von Controller-Konfigurationen, Settings-Mappings und bietet Type-Safety für die gesamte Codebase. Enthält sowohl Legacy-Support für V01-Projekte als auch moderne Typen für V02-Projekte.
- yamlCommands.ts -> Utility-Klasse für alle YAML-Datei-Operationen. Stellt zentrale Methoden zum Lesen, Schreiben und Manipulieren von wago.yaml und controller.yaml Dateien bereit. Diese Klasse abstrahiert alle YAML-bezogenen Operationen und sorgt für einheitliche Dateibehandlung in der gesamten Extension.


### res

---

Hier liegen Zusatzdateien, Bilder und Gifs für das GitHub-Repository, Templates, Docs und Webview-Bezogene Dateien. Allgemein handelt es sich hier nur um einen Ordner, der Zusätzliche Ressorucen enthält.

#### devDocs

Hier liegen verschiedene Dokumentationen zur Extension.

#### images

Hier finden sich Bilder für die Darstellung des IO-Check Webviews.

#### template

Hier findet sich das Template für ein Wago-Projekt. Bei der Erstellung eines neuen Projekts oder beim anlegen neuer Controller werden die Beispieldateien aus diesem Ordner gezogen.

#### Videos

Hier finden sich Gifs, die in der Primär-Readme genutzt zu werden, um den Aufbau der Extension einfach in GitHub darzustellen.

#### webviews

Hier finden sich die css und die html Konfiguration für das IO-Check Webview.

#### dockerCommand.sh

Dieses Shell Skript dient dem korrekten Starten eines Docker-Containers. Beim Starten des Containers wird dieser direkt mit mehreren Ordnern auf dem Controller gemounted, um die entsprechenden Dateien auf dem Controller verändern zu können. Dies it für zum Beispiel die Inputs und Outputs relevant.

## Anleitungen

Wenn die Extension erweitert werden soll, gibt es verschiedene Punkte die beachtet werden müssen, abhängig davon was erweitert werden soll.

### Der Manager und die Factories

Der grundlegende Arbeitsweg der Extension sieht folgendermaßen aus:

![Extension-Architektur](/res/devDocs/FactoryDiagramm.svg)

Ein VSCode Command ruft dabei den Manager auf. Dieser führt den entsprechenden Befehl aus. Dabei kann es sein, das sowohl Funktionalität für eine spezifische Projektversion, als auch einen bestimmten Controllertypen gebraucht wird. Der Manager fragt mit der entsprechenden Version oder Typen bei den Factories an, welche dann ein Objekt mit der richtigen Funktion anhand der Version oder Typen zurückliefern. Auf diesem kann dann die Funktion aufgerufen werden.

### Hinzufügen von neuen Controllern - Typen

Wenn ein neuer Controllertyp eingeführt werden soll muss das an verschiedenen Stellen im Programmcode kenntlich gemacht werden:

```TS
public createResetCommand(
        engine: string
    ): Interface.ResetControllerInterface {
        switch (engine) {
            case 'CC100':
                return new CC100.ResetController();
        // Dieser Part wäre neu
        // -----------------------------------------------------
            case 'NeuerController': 
                return new NeuerController.ResetController();
        // -----------------------------------------------------
            default:
                throw new Error('Invalid Controller');
        }
    }
```

Bei jedem Command welches den neuen Typen unterstüzten können soll muss der Switch-Case erweitert werden und auf das richtige File und darin die richtige Funktions-"Klasse" verweisen.

Damit dies richtig funktioniert muss natürlich auch die entsprechende Datei mit der entsprechenden Klasse angelegt werden. Hierbei kann man sich einfach am Beispiel der bereits vorhandenen CC100 Datei orientieren. Diese ist sehr übersichtlich, da sie nur Controller-spezifische Funktionen enthält. Dies umfasst aktuell nur spezielle Pfade auf dem Controller zum resetten der Ein- und Ausgänge, welche sich zwischen Controllertypen und -versionen ändern können.

Damit der Typ Controller auch in den Einstellungen ausgewählt werden kann muss zusätzlich noch das Enum für die Controllertypen angepasst werden.

```TS
export enum engine {
    CC100 = 'CC100',
// Neu
// ---------------------------------------
    NeuerController = 'NeuerController'
// ---------------------------------------
}
```

Die Möglichkeit, neue Controller zu Unterstützen, hat aktuell nur die V02, da die Version 1 nur auf den CC100 ausgerichtet war und nur als Legacy Support existiert.

Damit wäre alles getan um einen neuen Controllertypen hinzuzufügen.

>Kompilieren nicht vergessen

### Hinzufügen von neuen Extension - Versionen

Das Hinzufügen einer neuen Extension (oder auch Project) Version ähnelt der vom hinzufügen eines neuen Controllertypen, ist aber wesentlich komplexer da es sich hierbei um die Funktionalität der Extension an sich handelt.

Zum aktuellen Zeitpunkt findet die Verionsunterscheidung beim Starten der Extension statt. Dabei wird im Zuge der Kontrolle ob ein Wagoprojekt geöffnet ist überprüft, ob  eine *Settings.json* (V01) oder eine *Wago.yaml* (V02) existiert. Sollte eine neue Projektversion entwickelt und hinzugefügt werden, muss diese Erkennung angepasst werden. Wenn weiterhin die *Wago.yaml* genutzt wird, kann die darin enthaltene Versionsnummer genutzt werden um eine Unterscheidung möglich zu machen. Die anzupassende Funktion wird in der extension.ts aufgerufen:

```TS
await verifyProject();
```

Wenn das Erkennen implementiert ist und die Projectversion gesetzt ist, muss die Unterscheidung zwischen Versionen, diesmal in der ProjectFactory, angepasst werden.

```TS
public createUploadCommand(versionNr: number): Interface.UploadInterface {
    switch (versionNr) {
        case 0.1:
            return new V1.UploadController();
        case 0.2:
            return new V2.UploadController();
    // Beispiel
    // --------------------------------------------------
        case 0.3:
            return new V3.UploadController();
    // --------------------------------------------------
        default:
            throw new Error('Invalid version number');
    }
}
```

Beim Entwickeln von einer neuen Version sollte darauf geachtet werden das die Versionsdateien **NICHT** von einander abhängig sind. Das bedeutet, dass alles, was eine neue Version an Funktionalität braucht, in der neuen Versionsdatei vorhanden ist. Eine Ausnahme stellt hier aktuell der ConnectionManager dar. Da sowohl die Versionen V01 als auch V02 SSH für die Kommunikation benutzen, ist der Verbindungsaufbau und die Verwaltung auf diesen ausgelagert.

Sollte es in Zukunft dazu kommen, das neben SSH auch Git oder WDX (zum Zeitpunkt der Formulierung dieses Dokuments noch in Entwicklung) für die Kommunikation genutzt werden sollen, empfehlen wir für die verschiedenen Kommunikationsmodelle eine eigene Factory zu implementieren. Dadurch wird es möglich neue Kommunikationswege modular hinzuzufügen. Als Referenz für die Implementierung können die beiden bereits vorhandenen Factories genutzt werden.

### Hinzufügen neuer VSCode - Commands

Mit neuen Versionen kommen häufig auch neue Funktionen. Diese muss dann an verschiedenen Stellen eingebunden werden. Das reicht vom visuellen Einbinden in die Darstellung der Extension, über das VSCode-Command und den Manager mit den Factories, hin zur eigentlichen Implementierung.

Alles was mit dem visuellen der Extension zutun hat, wird in der *package.json* umgesetzt. Um einen neuen Command hinzuzufügen müssen folgende Bereiche erweitert werden:

```JSON
"contributes": {
    "commands": [
        {
            "command": "vscode-wago-cc100.add-controller",
            "title": "Add Controller",
            "category": "Wago",
            "icon": "$(add)"
        }
    ]
}
```

- **Command:** Sowas wie die Command-ID
- **Title:** Der Anzeigename
- **Category:** Zu welcher Gruppe gehört das Command
- **Icon:** Welcher Symbol wird für die Darstellung genutzt

Abhängig davon wo das Command in der Oberfläche untergebracht werden soll, kann das Icon weggelassen werden.

Desweiteren muss das neue Command noch in VSCode registriert werden:

 ```JSON
"contributes": {
    "menus": {
        "commandPalette": [
            {
            "command": "vscode-wago-cc100.add-controller",
            "when": "projectVersion >= 0.2"
            }
        ]
    }
}
 ```

- **Command:** Wieder die Command-ID
- **When:** hier wird angegeben wann das Command registriert wird. In unserem Fall ist dies abhängig von der Projectversion die ermittelt wurde

Um den Command visuell anzuzeigen, entweder als Icon oder im Kontextmenu, muss noch ein weiterer Punkt bearbeitet werden:

Für das Anzeigen in der Titelleiste:

```JSON
"contributes": {
    "menus": {
        "view/title": [
            {
                "command": "vscode-wago-cc100.add-controller",
                "when": "view == controller-view && projectVersion >= 0.2",
                "group": "navigation@3"
            }
        ]
    }
}
```

Für das Anzeigen auf einem Controller(Item):

```JSON
"contributes": {
    "menus": {
        "view/item/context": [
            {
                "command": "vscode-wago-cc100.upload",
                "when": "view == controller-view && viewItem == controller",
                "group": "inline@3"
            }
        ]
    }
}
```

- **Group:** Über die Group wird eingestellt, ob der Command als Icon oder im Kontextmenu eingefügt wird. Dabei kann auch die Position festgelegt werden

Mit diesen Einstellungen wurde der neue Command jetzt in VSCode registriert.

Ab jetzt passiert alles im Code der Extension. Als erstes wird der neue Command in der *Command.ts* implementiert:

```TS
export class Command {
    public static createCommands() {
        const commands = [];

        commands.push(
            vscode.commands.registerCommand(
                'vscode-wago-cc100.add-controller',
                async () => {
                    Manager.getInstance().addController();
                }
            )
        );
    }
}
```

Hiermit wird der Code, der aufgerufen wird wenn der Button gedrückt wird, mit dem Command verknüpft und in VSCode registriert. Man sieht hier auch direkt die Verbindung zum Manager und dem entsprechenden Command.

Als nächste muss dann der dazugehörige Part in der *Manager.ts* implementiert werden:

```TS
public addController() {
    ProjectFactory.getInstance()
        .createAddCommand(this.versionNr)
        .addController();
}
```

Wie man hier sehen kann verweist dieser Command nur auf die Projectfactory und lässt sich von dieser ein Objekt mit der gewünschten Funktionalität zu der Projektversionsnummer ausgeben. Von diesem Objekt ruft er eine bestimmte, durch ein Interface festgelegte Funktion auf.

Aktuell gibt es mit der *resetController* Funktion nur eine Funktion, die sowohl die *ProjectFactory* als auch die *ControllerFactory* in einem Command aufruft.

Für beide Factories gilt die gleich Vorgehensweise, wie sie hier an der *ProjetFactory* erklärt wird:

```TS
public createAddCommand(
    versionNr: number
): Interface.AddControllerInterface {
    switch (versionNr) {
        case 0.2:
            return new V2.AddController();
        default:
            throw new Error('Invalid version number');
    }
}
```

Wie hier gezeigt, wird in der Factory abhängig von der Projektversion der Command angelegt. In diesem Fall wird nur auf die Version V02 verwiesen, da es den AddController Command in der V01 nicht gibt.

Auffällig ist hier, dass ein Interface implementiert wird. Dies ist wichtig, damit die Extension sauber arbeiten kann. Hierzu später noch mehr.

Nachdem jetzt die Funktion in der Factory erstellt wurde, fehlt "nur" die Implementierung der Logik in den Versionsdateien (hier V2):

```TS
export class AddController implements Interface.AddControllerInterface{
    async addController() {
        const controllerName =
            (await vscode.window.showInputBox({
                prompt: 'Enter the name of the controller',
                title: 'Add Controller / Name',
                ignoreFocusOut: true,
            })) || '';
    
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // much more magic and logic
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        await YamlCommands.createController(
            extensionContext,
            controllerName,
            controllerDescription,
            controllerEngine,
            controllerSrc.label,
            'latest'
        );
        vscode.window.showInformationMessage(
            `Controller ${controllerName} added`
        );
        ControllerProvider.instance.refresh();
    }
}
```

In jeder Version, in der es die neue Funktion geben soll, muss eine neue Klasse mit der Funktion implementiert werden. Dafür muss standardisiert werden, welche Methoden implementiert werden müssen. Das ist wichtig, damit der Manager immer die gleichen Methoden aufrufen kann, egal welche Version er als Objekt zurück bekommt. Daher werden Interfaces benutzt:

```TS
export interface AddControllerInterface {
    addController: () => void;
}
```

Dieses Interface stellt sicher, dass in egal welcher Version, immer eine Funktion *addController()* mit keinen Eingabe- und keinen Ausgabeparametern vorhanden sein muss. Dies wird besonders wichtig wenn die gleiche Funktionalität in verschiedenen Versionen vorkommt. Sollte man weitere Hilfsfunktionen in der Klasse benötigen ist das natürlich kein Problem solange immer die über das Interface geforderte "Haupt"Funktion als Einstieg vorhanden ist.

### Connection Manager

Der Connection Manager ist für die Verwaltung und das Verbinden der Controller über SSH zuständig. Es gibt zwei Klassen: die `Connection` und die `ConnectionManager` Klasse. Die `Connection` Klasse ist für die einzelnen Verbindungen zuständig, während sich die `ConnectionManager` Klasse um alle Verbindungen kümmert. Die `ConnectionManager` Klasse ist ein Singleton und kann über `ConnectionManager.instance` aufgerufen werden. Außerdem hält der `ConnectionManager` mindestens eine Verbindung zu jedem Controller aufrecht und schließt über einen Garbage Collector diejenigen Verbindungen, die nicht genutzt werden.

Der Connection Manager verwendet die Node-Bibliothek SSH2, und der SSH-Server auf dem CC100 ist Dropbear. Mit einem oder beiden dieser Komponenten haben wir derzeit noch Probleme, und da uns Dropbear keine Logs liefert, können wir das Problem momentan nicht weiter eingrenzen. In `Connection.executeCommand(cmd)` werden SSH-Befehle ausgeführt.

```typescript
if (err) return resolve("")
// return reject(`Error executing command "${cmd}": ${err}`);
```

Hier sieht man die aktuelle Fehlerüberprüfung. Dabei werden Fehler nicht korrekt abgefangen, denn der auskommentierte Code ist eigentlich dafür vorgesehen. Wenn wir die Fehlerbehandlung wieder aktivieren, wird manchmal `Unable to exec` ausgegeben, obwohl der Befehl auf dem Controller korrekt ausgeführt wird. Unsere beste Vermutung ist, dass durch das Schließen einer vorhandenen Verbindung noch ein Befehl gesendet wird und da die Verbindung gerade geschlossen wird, keine Rückmeldung mehr vom SSH-Server kommt. Dadurch wird der Befehl fälschlicherweise als nicht erfolgreich gekennzeichnet.

### Debugger Konfigurationen hinzufügen

Um eine Debuggerkonfiguration hinzuzufügen, sollten andere Sprachen wie Java zusätlich ihre Anwendung finden, wird in commands.ts eine neue Konfiguration hinzugefügt (siehe vorhandene Konfiguration). Die Struktur ist die gleiche wie in einer normalen launch.json ([Siehe VSCode Dokumentation](https://code.visualstudio.com/docs/debugtest/debugging-configuration)). Dabei kann die Logik zum Verbinden erhalten bleiben.

Wichtig ist es, für zum Beispiel Java oder Pyhton, auch die entsprechende Extension in VSCode installiert zu haben. \
[Python Debugger Extention](https://marketplace.visualstudio.com/items?itemName=ms-python.debugpy)
[Java Debugger Extention](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-debug) \

### Image herunterladen

Das Herunterladen eines Images ist ein etwas komlizierterer Prozess. Ursprünglich geplant war, das Image in seiner Gänze direkt aus dem GitHub Packages runterzuladen, auf dem es liegt. Dies ist aber nicht direkt möglich gewesen. Als Umgehung werden jetzt die Einzelteile des Images runtergeladen und als von Docker ladbare Datei zusammengesetzt.

Die in der ladbaren .tar vorhandenen Dateien müssen sein:

- config.json
- manifest.json
- Image Layers
  - Jedes Layer einzeln mit dem eigenen Hash als Namen (Ohne "sha256:")
  - in dem Unterordner blobs/sha256/*

Heruntergeladen werden die Images im Code innerhalb der "updateContainer" Methode in der "UploadFunctionality" Klasse.

Über einen fetch-Befehl innerhalb der entsprechenden Methode wird zunächst ein **token** von GitHub angefordert, welcher bei allen späteren fetch-Befehlen benötigt wird.

Anschließend werden im Zuge des Image-Hash vergleichs, um zu prüfen ob das Image überhaupt aktualisiert werden muss, das "Manifest" des Images heruntergeladen.

In diesem Manifest finden sich sowohl der Hash der Config, als auch die Hashes der einzelnen Image-Layers.

Nach entsprechenden Überprüfungen, Containerstops und initialem reinigen der Images und Container auf dem Controller werden dann die einzelnen download-Schritte druchgeführt:

- Herunterladen der Image Layers (asynchron, um den Prozess zu Beschleunigen)
- Herunterladen der Image Config (Mithilfe des vorher erlangten Config-Hashes)

Im Anschluss wird das Manifest für das Image selber erstellt.

Alle Dateien werden in den `${extensionContext.storageUri?.fsPath}` heruntergeladen. Dieser Ordner wird von VSCode für Datei-Downloads bereitgestellt.

Die 2 Dateien + alle in blobs/sha256 heruntergeladenen Dateien werden dann in eine image.tar geschmissen, die hochgeladen wird und von Docker als Image geöffnet werden kann.
