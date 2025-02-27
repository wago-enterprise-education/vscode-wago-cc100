import json
import socket
import debugpy
# pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org debugpy

HOST = '0,0,0,0'
PORT = 5678
LOG_FILE = "dap_log.json"

def log_message(message):
    """Speichert Debugging-Nachrichten in eine Datei"""
    with open(LOG_FILE, "a") as log_file:
        log_file.write(json.dumps(message, indent=4) + "\n\n")

def handle_dap_request(request):
    """Verarbeitet DAP-Anfragen von VS Code"""
    request_json = json.loads(request)
 
    # Logge die eingehende Nachricht
    log_message({"received": request_json})

    command = request_json.get("command")

    if command == "initialize":
        return {"seq": request_json["seq"], "type": "response", "command": "initialize", "success": True}

    elif command == "launch":
        # Starte das Debugging
        program = request_json["arguments"]["program"]
        debugpy.listen(("0.0.0.0", 5678))
        debugpy.wait_for_client()
        debugpy.run_path(program, run_name="__main__")
        response = {"seq": request_json["seq"], "type": "response", "command": "launch", "success": True}

    elif command == "setBreakpoints":
        # Setze Breakpoints
        breakpoints = request_json["arguments"]["breakpoints"]
        return {"seq": request_json["seq"], "type": "response", "command": "setBreakpoints", "body": {"breakpoints": breakpoints}}
        else:
        response = {"seq": request_json["seq"], "type": "response", "command": command, "success": False}

    # Logge die ausgehende Antwort
    log_message({"response": response})

    return {}

def start_dap_server():
    """Startet einen einfachen DAP-Server"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind((HOST, PORT))
        server.listen(1)
        print(f"DAP-Server läuft auf {HOST}:{PORT}")

        conn, addr = server.accept()
        with conn:
            while True:
                data = conn.recv(1024)
                if not data:
                    break
                response = handle_dap_request(data.decode())
                conn.sendall(json.dumps(response).encode())

if __name__ == "__main__":
    start_dap_server()