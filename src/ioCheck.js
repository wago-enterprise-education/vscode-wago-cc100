const vscode = acquireVsCodeApi();

var DO_Data = [0, 0, 0, 0];
var display_DO_Data = [0, 0, 0, 0];
var DO_Changed = false;
var AO_Data1 = -1;
var AO_Data2 = -1;
var Serial_Text = '';
var LED_RUN_ON = false;
let switch_status;
let previous_timestamp = Date.now();

const red = '#FF0000';
const orange = '#FF6000';
const wago_green = '#6EC800';
const white = '#FFFFFF';
const black = '#000000';

// Get all HTML-Elements

const body = document.getElementById('body');

const elem_DO = document.getElementsByClassName('btn_do');
const LED_DO = document.getElementsByClassName('LED_DO');

const elem_DI = document.getElementsByClassName('btn_di');
const LED_DI = document.getElementsByClassName('LED_DI');

const elem_PT_AI = document.getElementsByClassName('analog_display');

var elem_Switch = document.getElementById('switch');

const elem_AO_value = document.getElementsByClassName('text_input');
var elem_AO1_val = document.getElementById('val_AO1');
var elem_AO2_val = document.getElementById('val_AO2');
var elem_AO1_write = document.getElementById('btn_AO1_write');
var elem_AO2_write = document.getElementById('btn_AO2_write');

var btn_Send = document.getElementById('btn_serial_send');
var trans_Message = document.getElementById('input_serial');
var chat_Serial = document.getElementById('chat_serial');

const side_Nav = document.getElementsByClassName('side_items');

const right_Params = [];
right_Params[0] = document.getElementById('right_params_inputs');
right_Params[1] = document.getElementById('right_params_outputs');
right_Params[2] = document.getElementById('right_params_serial');
right_Params[3] = document.getElementById('right_params_temperature');

var LED_SYS = document.getElementById('LED_SYS');
var LED_RUN = document.getElementById('LED_RUN');
var LED_USR = document.getElementById('LED_USR');
var LED_LNK_ACT1 = document.getElementById('LED_LACT1');
var LED_LNK_ACT2 = document.getElementById('LED_LACT2');
var LED_µSD = document.getElementById('LED_MSD');

var refrash_Rate = document.getElementById('refrash_rate'); 

// Set Event Listener
// POST-Event for the communication to the `webview_IOCheck.ts` file
window.addEventListener('message', event => {

    // The JSON data our extension sent
    const message = event.data;

    switch (message.command) {
        case 'start': {
            body.style.opacity = 1;
            body.style.pointerEvents = 'auto'
            read_data();
            break;
        }
        case 'serialRead': {
            show_recieving_Message(message.text);
            break;
        }
        case 'readData': {
            update_Refrash_Rate();
            update_Everything(message.values);
            read_switch();
            setTimeout(function() {console.log('Delay');}, 5000);
            break;
        }
        case 'readSwitch': {
            if (message.value != switch_status) {
                if (switch_status == '3') {
                    up_To_Date = false;
                }
                switch_status = message.value;
                update_Switch(message.value);
                DO_Data = display_DO_Data;
            }
            if (switch_status == '1') {
                read_data();
            }
            else {
                button_Click();
            }
            break;
        }
        case 'buttonClick': {
            if (DO_Changed) {
                digital_write(DO_Data);
                DO_Changed = false;
            }
            else if (Serial_Text != '') {
                serial_write(Serial_Text);
                Serial_Text = '';
            }
            else if (AO_Data1 >= 0) {
                analog_write(1, AO_Data1);
                AO_Data1 = -1;
            }
            else if (AO_Data2 >= 0) {
                analog_write(2, AO_Data2);
                AO_Data2 = -1;
            }
            else {
                read_data();
            }
            break;
        }
        case 'serialWrite': {
            show_Message(message.text)
            button_Click();
            break;
        }
        case 'connection_lost': {
            body.style.opacity = 0.375;
            body.style.pointerEvents = 'none';
        }
        case 'reload':{
            DO_Data = [0, 0, 0, 0];
        }
    }
});

// Click-Event for the Write-Button of AO1
elem_AO1_write.onclick = function () {
    clicked_AO(0);
}

// Keypress-Event for the textfield of AO1
elem_AO_value[0].addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        elem_AO_value[0].blur();
        clicked_AO(0);
    }
});

// Click-Event for the Write-Button of AO2
elem_AO2_write.onclick = function () {
    clicked_AO(1);
}

// Keypress-Event for the textfield of AO1
elem_AO_value[1].addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        elem_AO_value[1].blur();
        clicked_AO(1);
    }
});

// Click-Event for the Send-Button of RS-485
btn_Send.addEventListener('click', clicked_Send);

// Keypress-Event for the textfield of RS-485
trans_Message.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        btn_Send.click();
    }
});

window.addEventListener("DOMContentLoaded", (event) => {
    vscode.postMessage({
        command: 'windowLoaded'
    })
});

// Click-Event for the DO-Buttons and Side-Nav
for (let index = 0; index < elem_DO.length; index++) {
    elem_DO[index].onclick = function () {
        clicked_DO(index);
    }
    side_Nav[index].onclick = function () {
        clicked_Nav(index);
    }
}


// SSH functions

/**
 * This function sends a POST-Message to the file `webview_IOCheck.ts` to read all ports from the CC100 with one SSH command
 */
async function read_data() {
    vscode.postMessage({
        command: 'readData'
    })
}

/**
 * This method sends a POST-Message to the file `webview_IOCheck.ts` to write the digital outputs
 * @param value A decimal number to write, which represents the ports in binary format
 */
function digital_write(value) {
    vscode.postMessage({
        command: 'digitalWrite',
        value: value
    })
}

/**
 * This method sends a POST-Message to the file `webview_IOCheck.ts` for all Click-Events
 */
async function button_Click() {
    vscode.postMessage({
        command: 'buttonClick'
    })
}

/**
 * This method sends a POST-Message to the file `webview_IOCheck.ts` to read incoming messages of the RS-485
 */
async function serial_read() {
    vscode.postMessage({
        command: 'serialRead'
    })
}

/**
 * This method sends a POST-Message to the `file` `webview_IOCheck.ts` to write a message to the RS-485
 * @param text The text of the sending message
 */
function serial_write(text) {
    vscode.postMessage({
        command: 'serialWrite',
        text: text
    })
}

/**
 * This method sends a POST-Message to the file `webview_IOCheck.ts` to write the analog Data
 * @param pin '1' write to AO1, '2' write to AO2
 * @param value value between 0 and 4095 (12 bit value)
 */
function analog_write(pin, value) {
    vscode.postMessage({
        command: 'analogWrite',
        value: value,
        pin: pin
    })
}

/**
 * This method sends a POST-Message to the file `webview_IOCheck.ts` to read the switch on the CC100
 */
function read_switch() {
    vscode.postMessage({
        command: 'readSwitch'
    })
}

async function update_Everything(data_array) {
    update_AO(0, data_array[4]);
    update_AO(1, data_array[5]);
    display_DO_Data = data_array[1].split(',').map(x => +x);
    
    update_Digital(data_array[0].split(',').map(x => +x), elem_DI, LED_DI);
    update_Digital(display_DO_Data, elem_DO, LED_DO);
    update_PT_AI(3, data_array[2]);
    update_PT_AI(4, data_array[3]);
    update_PT_AI(1, data_array[6]);
    update_PT_AI(2, data_array[7]);
    update_status_LEDs(data_array[8], data_array[9], data_array[10], data_array[11], data_array[12], data_array[13], data_array[14], data_array[15], data_array[16]);
}

function update_Refrash_Rate(){
    refrash_Rate.innerHTML = (Date.now() - previous_timestamp) + " ms";
    previous_timestamp = Date.now();
}

/**
 * This method updates the DI and DO in the UI
 * @param value A decimal number to write, which represents the digital inputs in binary format 
 * @param elements An array with the HTML-Elements
 * @param LEDs An array with the LEDs for the CC100 SVG
 */
async function update_Digital(value, elements, LEDs) {
    for (let index = 0; index < elements.length; index++) {
        if (value[index] == 1) {
            elements[index].style.backgroundColor = wago_green;
            elements[index].value = 'HIGH';
            LEDs[index].style.fill = wago_green;
        } else {
            elements[index].style.backgroundColor = 'var(--vscode-sideBar-border)';
            elements[index].value = 'LOW';
            LEDs[index].style.fill = white;
        }
    }
}

/**
 * This method updates the LEDs in the IO-Check UI
 * 
 * @param {*} sys_led_green the SYS LED lights green when the value is `1` and not when value is `0`
 * @param {*} sys_led_red the SYS LED lights red when the value is `1` and not when value is `0`
 * @param {*} run_led_green the RUN LED lights green when the value is `1` and not when value is `0`
 * @param {*} run_led_red the RUN LED lights red when the value is `1` and not when value is `0`
 * @param {*} usr_led_green the USR LED lights green when the value is `1` and not when value is `0`
 * @param {*} usr_led_red the USR LED lights red when the value is `1` and not when value is `0`
 * @param {*} µsd_led the µSD LED lights red when the value is `1` and not when value is `0`
 */
async function update_status_LEDs(sys_led_green, sys_led_red, run_led_green, run_led_red, usr_led_green, usr_led_red, µsd_led, lnk_act1, lnk_act2) {
    if (sys_led_green == '1' && sys_led_red == '1') {
        LED_SYS.style.fill = orange;
    }
    else if (sys_led_green == '0' && sys_led_red == '1') {
        LED_SYS.style.fill = red;
    }
    else if (sys_led_green == '1' && sys_led_red == '0') {
        LED_SYS.style.fill = wago_green;
    }
    else {
        LED_SYS.style.fill = white;
    }

    if (run_led_green == '1' && run_led_red == '1') {
        LED_RUN.style.fill = orange;
    }
    else if (run_led_green == '0' && run_led_red == '1') {
        LED_RUN.style.fill = red;
    }
    else if (run_led_green == '1' && run_led_red == '0') {
        LED_RUN.style.fill = wago_green;
    }
    else {
        LED_RUN.style.fill = white;
    }

    if (usr_led_green == '1' && usr_led_red == '1') {
        LED_USR.style.fill = orange;
    }
    else if (usr_led_green == '0' && usr_led_red == '1') {
        LED_USR.style.fill = red;
    }
    else if (usr_led_green == '1' && usr_led_red == '0') {
        LED_USR.style.fill = wago_green;
    }
    else {
        LED_USR.style.fill = white;
    }

    if(lnk_act1) {
        if (lnk_act1.includes('yes')) {
            LED_LNK_ACT1.style.fill = wago_green;
        }
        else {
            LED_LNK_ACT1.style.fill = white;
        }
    }

    if(lnk_act2) {
        if (lnk_act2.includes('yes')) {
            LED_LNK_ACT2.style.fill = wago_green;
        }
        else {
            LED_LNK_ACT2.style.fill = white;
        }
    }
    if (µsd_led == '1') {
        LED_µSD.style.fill = red;
    }
    else {
        LED_µSD.style.fill = white;
    }
}

/**
 * This method updates the PT and AI in the UI
 * @param index The index of the PT and AI element in the UI
 * @param analogVal The analog value to update with 
 */
async function update_PT_AI(index, analogVal) {
    elem_PT_AI[index - 1].innerHTML = analogVal;
}

/**
 * This method updates the AO in the UI
 * @param index '0' to update AO1, '1' to update AO2
 * @param analogVal The analog value to update with 
 */
function update_AO(index, value) {
    if (index == 0) {
        elem_AO1_val.innerHTML = value;
    }
    else if (index == 1) {
        elem_AO2_val.innerHTML = value;
    }
    // elem_AO_value[index].value = value;
}

/**
 * This method updates the switch on the CC100 in the UI
 * @param value The switch status
 */
function update_Switch(value) {
    if (value == '1') {
        elem_Switch.setAttribute('y', '370');
        disable_Output_Elements();
    }
    else if (value == '2') {
        elem_Switch.setAttribute('y', '395');
        enable_Output_Elements();
    }
    else if (value == '3') {
        elem_Switch.setAttribute('y', '420');
    }
}

/**
 * This method shows the recieved message from RS-485 in the UI
 * @param message The recieved message 
 */
async function show_recieving_Message(message) {
    if (message != '') {
        var html = '<p align="left" style="background-color: #616a73;">'
        html += message;
        html += '</p>'
        chat_Serial.innerHTML = chat_Serial.innerHTML + html;
        chat_Serial.scrollTop = chat_Serial.scrollHeight;
    }
}

// Event functions (Outputs)

/**
 * This method reads and calibrates the values of the AO textfields 
 * @param index `0` AO1 was clicked, `1` AO2 was clicked
 */
function clicked_AO(index) {
    var val = elem_AO_value[index].value
    if (val) {
        val = parseFloat(val);
        if (val > 10000) {
            val = 10000;
            vscode.postMessage({
                command: 'alert',
                text: 'Maximum value is 10000'
            });
        }
        else if (val < 0) {
            val = 0;
            vscode.postMessage({
                command: 'alert',
                text: 'No negative value allowed'
            });
        }

        elem_AO_value[index].value = '';
        if (index == 0) {
            AO_Data1 = val;
        }
        else {
            AO_Data2 = val;
        }
    }
    else {
        vscode.postMessage({
            command: 'alert',
            text: 'Undefined Value'
        });
        return;
    }
}

/**
 * This method changes the params on the right side according to the matching symbol in the navigation bar
 * @param index The index of the clicked symbol
 */
function clicked_Nav(index) {
    for (var i = 0; i < side_Nav.length; i++) {
        if (i == index) {
            side_Nav[i].style.borderColor = wago_green;
            right_Params[i].style.display = 'flex';
        } else {
            side_Nav[i].style.borderColor = 'var(--vscode-sideBar-border)';
            right_Params[i].style.display = 'none';
        }
    }
}

/**
 * This method changes the value of the DO
 * @param index The index of clicked DO
 */
function clicked_DO(index) {
    console.log("DO")
    if (elem_DO[index].value == 'HIGH') {
        DO_Data[index] = 0;
    } else {
        DO_Data[index] = 1;
    }
    DO_Changed = true;
}

/**
 * This method sends the message from the RS-485 textfield
 */
function clicked_Send() {
    if (trans_Message.value) {
        Serial_Text = trans_Message.value;
        trans_Message.value = '';
    }
}

function show_Message(message) {
    if (message) {
        var html = '<p align="right">'
        html += message
        html += '</p>';
        chat_Serial.innerHTML += html;
        chat_Serial.scrollTop = chat_Serial.scrollHeight;
    }
}


// Help functions

/**
 * This method disables all output elements that are not used in monitoring mode
 */
function disable_Output_Elements() {
    for (let index = 0; index < elem_DO.length; index++) {
        elem_DO[index].setAttribute('disabled', 'disabled');
    }
    elem_AO_value[0].setAttribute('disabled', 'disabled');
    elem_AO_value[1].setAttribute('disabled', 'disabled');
    elem_AO1_write.setAttribute('disabled', 'disabled');
    elem_AO2_write.setAttribute('disabled', 'disabled');
    btn_Send.setAttribute('disabled', 'disabled');
}

/**
 * This method activates all elements that are necessary for setting outputs on the CC100
 */
function enable_Output_Elements() {
    for (let index = 0; index < elem_DO.length; index++) {
        elem_DO[index].removeAttribute('disabled');
    }
    elem_AO_value[0].removeAttribute('disabled');
    elem_AO_value[1].removeAttribute('disabled');
    elem_AO1_write.removeAttribute('disabled');
    elem_AO2_write.removeAttribute('disabled');
    btn_Send.removeAttribute('disabled');
}
