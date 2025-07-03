# Wago Extension für Visual Studio Code

## Grundidee

Die Grundidee der Extension war es, eine Entwicklungsumgebung für den Wago CC100 zu bieten.
Nach erfolgreicher Implementierung der Funktion wurde sich dann dazu entschlossen, dass Projekt weiter auszubauen und VSCode-nativer zu gestalten.

So entstand V02 des Projektes. Die Idee war, eine Extension zu haben die die VSCode Steuerelemente nutzt und mit der man die Controller die WAGO anbietet per Python Programmieren, teilweise Konfigurieren und Debuggen kann.
Ein weiteres Ziel der V02 war es, eine "Engine" zu entwickeln, welche es ermöglicht die Extension modular für weitere Controller oder Funktionen anpassbar zu machen.

Die Architektur der Extension nutzt dazu ein Factory-Pattern, welches anhand einer Versionsüberprüfung die entsprechend Funktionalität mit den VSCode Buttons und Befehlen verbindet.

## Ordnerstruktur

Hier wird kurz auf die Aufteilung der Ordner und die Inhalte der wichtigen Unterordner eingegangen.

### src

---

Hier liegt der gesamte Code der Extension. Alles von Aussehen bis Funktionalität geschieht hier.

#### Extension.ts

Der "Startpunkt" der Extension. Diese Datei enthält die "activate" Funktion, welche beim Starten der Extension aufgerufen wird. Innerhalb der Methode werden die Sidebar gerendert, die Commands registriert, die Projektversion festgestellt und alle gelisteten Controller verbunden. Die Extension.ts bezieht sich dabei auf die Dateien in dem /extension Ordner, um eine angenehmere Ordnung herzustellen.
Die "deactivate" Methode ist ebenfalls vorhanden, jedoch leer, da diese dazu genutzt werden würde, um commands unverfügbar zu machen. Allerdings werden diese auf eine Art und weise registriert, die das von selbst erledigt.

#### Extension

Hier finden sich universell gültige Dateien, die immer von der Extension gebraucht werden:

- command.ts -> Eintragen und zuweisen aller Commands als disposable array. In den Commands aufgerufen wird immer der Manager aus dem ExtensionCore
- connectionManager.ts -> Manager, der sich um alles bezüglich der Connections zu den Controllern und verwaltung dieser kümmert.
- ioCheck.js -> Das Webviews Panel um den Controller vergleichsweise wie in IO-Check zu konfigurieren
- versionDetection.ts -> Eine Funktion um die Version eines geöffneten Projektes festzustellen.
- view.ts -> Darstellung der Controller in der Sidebar
- webviewIOCheck.ts -> Teil der Logik hinter der IO-Check Funktionalität

Mehrere Dateien enthalten die YamlCommands Klasse und die entsprechenden enums aus V02, um Abhängigkeit von Versionsfiles zu vermeiden

#### ExtensionCore

Hier findet sich die Factory Struktur, die die Funktionalität von Commands innerhalb von VSCode zuweist. Je nach festgestellter Projektversion und nach im Controller eingestellter Controllerart werden entsprechende Methoden ausgewählt.

- manager.ts -> Das Herz der Factory-Struktur. Sämtliche Commandaufrufe laufen durch diesen Manager, um die entsprechenden Methoden zugeordnet zu bekommen. Dafür ruft der Manager je nach Commands die entsprechende(n) Factory(s) auf.
- controllerVersions -> Enthält die Dateien mit Controller-spezifischen Funktionen. Aufgerufen werden diese nur wenn eine Methode vorliegt, die Controllerspezifische Pfade o. Ä. verwendet
- factorys -> Die tatsächlichen Factorys, die von dem Manager aufgerufen werden. Verweisen jeweils auf die festgestellten Controllerspezifischen- und Versionsspezifischen Methodendateien
- interfaces -> Enthält Interfaces für je die Controllermethoden und die Versionsmethoden, um sicherzustellen, dass bekannt ist, welche Attribute in die Methoden eingehen und welche Rückgabewerte zu erwarten sind
- projectVersions -> Enthält die Dateien mit Versions-spezifischen Funktionen. Standardmäßig werden diese Methoden aufgerufen, sobald ein Command ausgeführt wird, da die Mehrheit der Methoden nicht Controller-spezifisch definiert werden muss.

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

### Hinzufügen von neuen Controllern

### Hinzufügen von neuen Extension - Versionen

### Hinzufügen neuer VSCode - Commands

### Debugger Konfigurationen hinzufügen
Um eine Debuggerkonfiguration hinzuzufügen, sollten andere Sprachen wie Java zusätlich ihre Anwendung finden, wird in commands.ts eine neue Konfiguration hinzugefügt (siehe vorhandene Konfiguration). Die Strucktur ist die gleiche wie in einer normalen launch.json. [Hier](https://code.visualstudio.com/docs/debugtest/debugging-configuration) nachlesen.
Dabei kann die logik zum verbinden quasi erhalten bleiben.
Wichtig ist es für zum Beispiel Java oder Pyhton auch die entsprechende Extention in VsCode installiert zu haben. \
[Java Debugger Extention](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-debug) \
[Pyhton Debugger Extention](https://marketplace.visualstudio.com/items?itemName=ms-python.debugpy)