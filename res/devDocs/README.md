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

#### Extension

Hier finden sich universell gültige Dateien, die immer von der Extension gebraucht werden:

- command.ts -> Eintragen und zuweisen aller Commands
- connectionManager.ts ->

#### ExtensionCore

#### OldFiles

#### Extension.ts

### res

## Anleitungen

### Hinzufügen von neuen Controllern

### Hinzufügen von neuen Extension - Versionen

### Hinzufügen neuer VSCode - Commands
