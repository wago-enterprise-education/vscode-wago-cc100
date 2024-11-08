const vscode = acquireVsCodeApi();

window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    switch (message.command) {
        case 'cmd_reload':
            reload_simulator(message.simulator)
            break;
        case 'cmd_set_download':
            reload_download(message.value)
            break;
    }
});

window.addEventListener("DOMContentLoaded", (event) => {
    vscode.postMessage({ command: "cmd_loaded" });
});

function btn_application_upload_clicked() {
    vscode.postMessage({ command: "cmd_application_upload" });
}

function btn_debug_clicked() {
    vscode.postMessage({ command: "cmd_debug" });
}

function btn_io_check_clicked() {
    vscode.postMessage({ command: "cmd_io_check" });
}

function btn_simulation_clicked() {
    vscode.postMessage({ command: "cmd_simulation" });
}

function btn_settings_clicked() {
    vscode.postMessage({ command: "cmd_settings" })
}

function btn_home_clicked() {
    vscode.postMessage({ command: "cmd_home" })
}

function btn_delete_clicked() {
    vscode.postMessage({ command: "cmd_delete" })
}

function btn_download_clicked() {
    change_window(true);
}

function btn_cancel_clicked() {
    change_window(false);
}

function btn_confirm_clicked() {
    change_window(false)
    vscode.postMessage({ command: "cmd_download" })
}


/**
 * Update the Display of the Confirmation window for the download
 * @param show_confirmation Determines whether the confirmation window is displayed or not
 */
function change_window(show_confirmation) {
    const menu = document.getElementById("menu");
    const confirm = document.getElementById("confirm")
    if (show_confirmation) {
        confirm.style.display = "flex"
        menu.style.display = "none"
    } else {
        confirm.style.display = "none"
        menu.style.display = "inline"
    }
}

/**
 * Update the Display of the Simulator button
 * @param value Determines whether the simulator button is displayed or not
 */
function reload_simulator(value) {
    const btn_simulation = document.getElementById("simulation");
    if (value) {
        btn_simulation.style.display = "block"
    } else {
        btn_simulation.style.display = "none"
    }
}

/**
 * Update the Display of the Download button
 * @param value Determines whether the download button is displayed or not
 */
function reload_download(value) {
    const btn_download = document.getElementById("download");
    if (value) {
        btn_download.style.display = "block"
    } else {
        btn_download.style.display = "none"
    }
}

/**
 * Changes the text of the tooltip based on the given parameter
 * @param button_string One of these options: `HOME`, `UPLOAD`, `DEBUG`, `REMOVE`, `IOCHECK`, `DOWNLOAD`, `SIMULATOR`
 */
function change_tooltip(button_string) {
    const text = document.getElementById("tooltip_text");
    switch (button_string) {
        case "HOME":
            text.innerHTML = "Open the Home Screen to create or open a project"
            break;
        case "UPLOAD":
            text.innerHTML = "Upload your main.py to the connected CC100 and run it";
            break;
        case "DEBUG":
            text.innerHTML = "Use breakpoints to debug your main.py. If no breakpoints have been set, the application is uploaded and started";
            break;
        case "REMOVE":
            text.innerHTML = "Remove all files from the CC100 that were created by this extension";
            break;
        case "IOCHECK":
            text.innerHTML = "Open the IO Check to monitor the connected CC100";
            break;
        case "DOWNLOAD":
            text.innerHTML = "Download the main.py from a connected CC100";
            break;
        case "SIMULATOR":
            text.innerHTML = "Open the CC100 Simulator";
            break;
    }
}
