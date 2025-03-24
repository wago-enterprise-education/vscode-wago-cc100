#!/bin/sh

# Suchen nach main.py im /app Verzeichnis
MAIN_PY_PATH=$(find /app -name "main.py" | head -n 1)

echo "[INFO] Gefundene main.py: $MAIN_PY_PATH"

# Prüfen, ob die Datei existiert
if [ -f "$MAIN_PY_PATH" ]; then
    echo "[INFO] Starte debugpy mit $MAIN_PY_PATH"
    python3 -m debugpy --listen 0.0.0.0:5678 --wait-for-client "$MAIN_PY_PATH"
else
    echo "[ERROR] main.py nicht gefunden!"
    exit 1
fi
