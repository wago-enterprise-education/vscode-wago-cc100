import json
import socket
import debugpy
# pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org debugpy

HOST = '0.0.0.0'  # Korrigierte IP-Adresse
PORT = 5678
LOG_FILE = "dap_log.json"
BREAKPOINTS_FILE = "breakpoints.json"

def log_message(message):
    """Speichert Debugging-Nachrichten in eine Datei"""
    with open(LOG_FILE, "a") as log_file:
        log_file.write(json.dumps(message, indent=4) + "\n\n")

def save_breakpoints(breakpoints):
    """Speichert die Breakpoints in eine JSON-Datei"""
    with open(BREAKPOINTS_FILE, "w") as f:
        json.dump(breakpoints, f, indent=4)

def read_dap_message(conn):
    """Liest eine vollständige DAP-Nachricht basierend auf Content-Length"""
    header = b""
    while b"\r\n\r\n" not in header:
        header += conn.recv(1)

    header_text = header.decode()
    content_length = 0
    for line in header_text.split("\r\n"):
        if line.lower().startswith("content-length:"):
            content_length = int(line.split(":")[1].strip())

    body = conn.recv(content_length).decode()
    return body

def handle_dap_request(request):
    """Verarbeitet DAP-Anfragen von VS Code"""
    request_json = json.loads(request)
    log_message({"received": request_json})

    command = request_json.get("command")
    response = {"seq": request_json.get("seq", 0), "type": "response", "command": command, "success": False}

    if command == "initialize":
        response["success"] = True

    elif command == "launch":
        # Starte das Debugging
        program = request_json["arguments"]["program"]
        debugpy.listen(("0.0.0.0", 5678))
        debugpy.wait_for_client()
        debugpy.run_path(program, run_name="__main__")
        response = {"seq": request_json["seq"], "type": "response", "command": "launch", "success": True}

    elif command == "setBreakpoints":
        try:
            breakpoints = request_json["arguments"]["breakpoints"]
            save_breakpoints(breakpoints)  # Speichert Breakpoints in JSON-Datei
            response = {
                "seq": request_json.get("seq", 0),
                "type": "response",
                "command": "setBreakpoints",
                "body": {"breakpoints": breakpoints},
                "success": True
            }
        except Exception as e:
            response["message"] = str(e)

    log_message({"response": response})
    return response

def start_dap_server():
    """Startet einen einfachen DAP-Server"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind((HOST, PORT))
        server.listen(1)
        print(f"DAP-Server läuft auf {HOST}:{PORT}")

        conn, addr = server.accept()
        with conn:
            while True:
                try:
                    request = read_dap_message(conn)
                    response = handle_dap_request(request)
                    response_str = json.dumps(response)
                    conn.sendall(f"Content-Length: {len(response_str)}\r\n\r\n{response_str}".encode())
                except Exception as e:
                    print(f"Fehler: {e}")
                    break

if __name__ == "__main__":
    start_dap_server()
