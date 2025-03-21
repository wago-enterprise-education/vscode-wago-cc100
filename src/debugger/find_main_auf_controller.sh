#!/bin/bash

docker exec -it 2c9b /bin/sh

# Suchen nach der main.py Datei im src Verzeichnis
MAIN_PY_PATH=$(find ./main.py "main.py")
 
# Debugpy starten und auf Verbindung warten 
python -m debugpy --listen 0.0.0.0:5678 --wait-for-client "$MAIN_PY_PATH"