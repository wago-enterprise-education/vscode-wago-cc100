# Wago Extension für Visual Studio Code

## Grundidee

Die Grundidee der Extension war es, eine Entwicklungsumgebung für den Wago CC100 zu bieten.
Nach erfolgreicher Implementierung der Funktion wurde dann entschlosse, dass Projekt weiter auszubauen und VSCode-nativer zu gestalten.

So entstand V02 des Projektes. Idee war, eine Extension zu haben die aussieht wie jede andere in VSCode, mit der man jedoch die Controller die WAGO anbietet Programmieren, teilweise Konfigurieren und per Simulation einsehen kann.
Zu diesem Zweck gibt es eine Factory-Struktur innerhalb der Extension. Sämtliche erstellten Commands werden durch einen Manager erstellt, der je nach Projektversion und Controllerart die entsprechenden Befehle auswählt.

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

## Anleitungen

### Hinzufügen von neuen Controllern

### Hinzufügen von neuen Extension - Versionen

### Hinzufügen neuer VSCode - Commands
