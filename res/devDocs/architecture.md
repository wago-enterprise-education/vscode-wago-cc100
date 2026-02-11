# Vereinfachte Architektur: Image, Container & Engines

```mermaid
flowchart TD
    %% Konfiguration
    WAGO["wago.yaml<br/>nodes[id]:<br/>• engine: 'CC100'<br/>• imageVersion: 'cc100-latest'<br/>• src: 'src'"]
    CTRL["controller{id}.yaml<br/>• connection<br/>• ip/port/user"]
    
    %% Extension Komponenten
    MGR["Manager"]
    PF["ProjectFactory<br/>(V01/V02)"]
    CF["ControllerFactory<br/>(engine=CC100)"]
    
    %% Upload Prozess
    UPL["UploadFunctionality<br/>(V02.ts)"]
    GHCR["GHCR Registry<br/>ghcr.io/wago-enterprise-education/<br/>docker-engine-cc100:TAG"]
    
    %% Device
    SSH["SSH Connection<br/>(ConnectionManager)"]
    CC["CC100 Controller"]
    DOCKER["Docker Container<br/>'pythonRuntime'"]
    
    %% Ablauf
    WAGO -->|"liest engine + imageVersion"| MGR
    CTRL -->|"liest Verbindungsdaten"| MGR
    
    MGR -->|"erstellt Command<br/>basierend auf ProjectVersion"| PF
    PF -->|"V02: UploadController"| UPL
    
    UPL -->|"imageVersion aus YAML"| WAGO
    UPL -->|"1. Prüft Image-Version<br/>2. Lädt bei Bedarf<br/>Manifest + Layers"| GHCR
    
    GHCR -->|"image.tar<br/>(config + layers)"| UPL
    UPL -->|"SFTP upload +<br/>docker load"| SSH
    
    SSH -->|"docker run<br/>(dockerCommand.sh)"| CC
    CC --> DOCKER
    
    MGR -->|"bei controller-spezifischen<br/>Operationen (reset)"| CF
    CF -->|"CC100-spezifische Pfade<br/>(/sys/kernel/dout_drv, etc.)"| CC
    
    %% Styling
    classDef config fill:#e1f5ff,stroke:#0288d1
    classDef factory fill:#fff3e0,stroke:#f57c00
    classDef device fill:#f3e5f5,stroke:#7b1fa2
    classDef registry fill:#e8f5e9,stroke:#388e3c
    
    class WAGO,CTRL config
    class MGR,PF,CF,UPL factory
    class SSH,CC,DOCKER device
    class GHCR registry
```

## Kernpunkte

### 1. Image-Festlegung
- **wo**: `wago.yaml` → `nodes[id].imageVersion` (z.B. `"cc100-latest"`)
- **wer nutzt es**: `UploadFunctionality` (in `V02.ts`) liest die Version und lädt bei Bedarf von GHCR

### 2. Container-Start
- **SSH exec**: `ConnectionManager` führt entweder `docker start pythonRuntime` aus (falls Container existiert)
- **oder**: Script `dockerCommand.sh <imageVersion>` → `docker run ... ghcr.io/.../docker-engine-cc100:<tag>`
- **auf Gerät**: CC100 mit Docker Daemon

### 3. Engine-Implementierung
- **Festlegung**: `wago.yaml` → `nodes[id].engine` (aktuell nur `"CC100"`)
- **Factory-Pattern**: 
  - `Manager` → `ProjectFactory` (wählt V01/V02 Implementierung)
  - `Manager` → `ControllerFactory` (wählt CC100-spezifische Implementierung)
- **Controller-spezifisch**: Reset-Befehle, I/O-Pfade unterscheiden sich je nach Hardware
