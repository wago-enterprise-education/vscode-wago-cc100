const vscode = acquireVsCodeApi();
var last_time_submited = 0;

window.addEventListener("DOMContentLoaded", (event) => {
    const change_password_btn = document.getElementById("change_password");
    const form = document.getElementById('settings_form');

    change_password_btn.addEventListener("click", () => {
        vscode.postMessage({ command: "cmd_change_password" });
    });

    if (form) {
        form.addEventListener("submit", submit);
    }
    vscode.postMessage({ command: "cmd_request_data" });
});

window.addEventListener('message', event => {

    const message = event.data; // The JSON data our extension sent

    switch (message.command) {
        case 'cmd_send_data':
            set_form_data(message.data)
            break;
    }
});
/**
 * Change the visibility of the checkmark icons of the radio buttons depending on the values of the radio buttons
 */
function radio_btn_changed() {
    const ethernet = document.getElementById("ethernet");
    const usb_c = document.getElementById("usb_c");
    const inputIP = document.getElementById("ipInput");

    for (const image of document.getElementsByClassName("checkImg")) {
        image.style.display = "none"
    }
    if (ethernet.checked) {
        inputIP.style.display = "block";
        document.getElementById("ethernet_tick").style.display = "block";
    } else if (usb_c.checked) {
        inputIP.style.display = "none";
        document.getElementById("usb_c_tick").style.display = "block";
    } else {
        inputIP.style.display = "none";
        document.getElementById("simulator_tick").style.display = "block";
    }
}

/**
 * Change visibility of the autoupdate checkmark depending on the value of the checkmark
 */
function auto_update_changed() {
    const checkbox = document.getElementById("autoupdate");
    const image = document.getElementById("autoupdate_checkmark")
    if (checkbox.checked) {
        image.style.display = "Block";
    } else {
        image.style.display = "None";
    }
}

/**
 * Adds all form values to a array and sends it to the webview_settings.ts through the 'cmd_submit' command
 * @param event 
 */
function submit(event) {
    event.preventDefault();
    last_time_submited = new Date().getTime();
    const formData = new FormData(event.target);
    const dataArray = [];
    for (var pair of formData.entries()) {
        dataArray.push(pair);
    }
    vscode.postMessage({ command: "cmd_submit", data: dataArray });
}

/**
 * Set the values of the settings form based on the given data values
 * @param data the content of the settings.json
 */
function set_form_data(data) {
    let ipInput = document.getElementById('ip');
    ipInput.value = data.ip_adress;
    let autoupdate = document.getElementById('autoupdate');
    autoupdate.checked = data.autoupdate;
    auto_update_changed();
    if (data.usb_c) {
        let radioButton = document.getElementById('usb_c');
        radioButton.checked = true;
        document.getElementById('usb_c_tick').style.display = "block";
    } else if (data.simulator) {
        let radioButton = document.getElementById('simulator');
        radioButton.checked = true;
        document.getElementById('simulator_tick').style.display = "block";
    } else {
        let radioButton = document.getElementById('ethernet');
        radioButton.checked = true;
        document.getElementById('ethernet_tick').style.display = "block";
        document.getElementById("ipInput").style.display = "block";
    }
}
/**
 * Manually dispatch the submit event
 */
function save_clicked() {
    // The Submit event is sometimes not triggered so we always do it manually here
    if (new Date().getTime() - last_time_submited > 1000) {
        const form = document.getElementById('settings_form');
        form.dispatchEvent(new Event("submit"));
    }
}