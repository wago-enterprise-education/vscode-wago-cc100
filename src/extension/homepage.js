const vscode = acquireVsCodeApi();

window.addEventListener('message', event => {

    const message = event.data; // The JSON data our extension sent

    switch (message.command) {
        case 'cmd_path_info':
            document.getElementById('txt_path').value = message.Path;
            break;
    }
});

function btn_open_clicked() {
    vscode.postMessage({ command: "cmd_open" });
}
/**
 * displays create project popup and blur background
 */
function btn_create_project_clicked() {
    const projectwindow = document.getElementById("new_project");
    const mainWindow = document.getElementById("menu");
    if (projectwindow) {
        projectwindow.style.display = 'flex';
    }
    if (mainWindow) {
        mainWindow.style.opacity = '0.2';
    }
}

function btn_documentation_clicked() {
    vscode.postMessage({ command: "cmd_documentation" });
}

function btn_io_check_clicked() {
    vscode.postMessage({ command: "cmd_io_check" });
}
/**
 * hide reate project popup and show background
 */
function btn_x_clicked() {
    const projectWindow = document.getElementById("new_project");
    const mainWindow = document.getElementById("menu");
    if (projectWindow) {
        projectWindow.style.display = 'none';
    }
    if (mainWindow) {
        mainWindow.style.opacity = '1';
    }
}
function btn_submit_clicked() {
    vscode.postMessage({ command: "cmd_submit", proj_name: document.getElementById('txt_proj_name').value, Path: document.getElementById('txt_path').value });
}
function img_folder_clicked() {
    vscode.postMessage({ command: "cmd_select_path" })
}