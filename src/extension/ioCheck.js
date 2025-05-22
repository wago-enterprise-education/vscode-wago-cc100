const vscode = acquireVsCodeApi();

var doData = [0, 0, 0, 0];
var displayDoData = [0, 0, 0, 0];
var doChanged = false;
var aoData1 = -1;
var aoData2 = -1;
var serialText = '';
var ledRunOn = false;
let switchStatus;
let previousTimestamp = Date.now();

const red = '#FF0000';
const orange = '#FF6000';
const wagoGreen = '#6EC800';
const white = '#FFFFFF';
const black = '#000000';

// Get all HTML-Elements

const body = document.getElementById('body');

const elemDo = document.getElementsByClassName('btnDo');
const ledDo = document.getElementsByClassName('ledDo');

const elemDi = document.getElementsByClassName('btnDi');
const ledDi = document.getElementsByClassName('ledDi');

const elemPtAi = document.getElementsByClassName('analogDisplay');

var elemSwitch = document.getElementById('switch');

const elemAoValue = document.getElementsByClassName('textInput');
var elemAo1Val = document.getElementById('valAo1');
var elemAo2Val = document.getElementById('valAo2');
var elemAo1Write = document.getElementById('btnAo1Write');
var elemAo2Write = document.getElementById('btnAo2Write');

var btnSend = document.getElementById('btnSerialSend');
var transMessage = document.getElementById('inputSerial');
var chatSerial = document.getElementById('chatSerial');

const sideNav = document.getElementsByClassName('sideItems');

const rightParams = [];
rightParams[0] = document.getElementById('rightParamsInputs');
rightParams[1] = document.getElementById('rightParamsOutputs');
rightParams[2] = document.getElementById('rightParamsSerial');
rightParams[3] = document.getElementById('rightParamsTemperature');

var ledSys = document.getElementById('ledSys');
var ledRun = document.getElementById('ledRun');
var ledUsr = document.getElementById('ledUsr');
var ledLnkAct1 = document.getElementById('ledLact1');
var ledLnkAct2 = document.getElementById('ledLact2');
var ledµSd = document.getElementById('ledMsd');

var refrashRate = document.getElementById('refrashRate');

// Set Event Listener
// POST-Event for the communication to the `webviewIoCheck.ts` file
window.addEventListener('message', (event) => {
    // The JSON data our extension sent
    const message = event.data;

    switch (message.command) {
        case 'start': {
            body.style.opacity = 1;
            body.style.pointerEvents = 'auto';
            readData();
            break;
        }
        case 'serialRead': {
            showRecievingMessage(message.text);
            break;
        }
        case 'readData': {
            updateRefrashRate();
            updateEverything(message.values);
            readSwitch();
            break;
        }
        case 'readSwitch': {
            if (message.value != switchStatus) {
                if (switchStatus == '3') {
                    upToDate = false;
                }
                switchStatus = message.value;
                updateSwitch(message.value);
                doData = displayDoData;
            }
            if (switchStatus == '1') {
                readData();
            } else {
                buttonClick();
            }
            break;
        }
        case 'buttonClick': {
            if (doChanged) {
                digitalWrite(doData);
                doChanged = false;
            } else if (serialText != '') {
                serialWrite(serialText);
                serialText = '';
            } else if (aoData1 >= 0) {
                analogWrite(1, aoData1);
                aoData1 = -1;
            } else if (aoData2 >= 0) {
                analogWrite(2, aoData2);
                aoData2 = -1;
            } else {
                readData();
            }
            break;
        }
        case 'serialWrite': {
            showMessage(message.text);
            buttonClick();
            break;
        }
        case 'connectionLost': {
            body.style.opacity = 0.375;
            body.style.pointerEvents = 'none';
        }
        case 'reload': {
            doData = [0, 0, 0, 0];
        }
    }
});

// Click-Event for the Write-Button of AO1
elemAo1Write.onclick = function () {
    clickedAo(0);
};

// Keypress-Event for the textfield of AO1
elemAoValue[0].addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        elemAoValue[0].blur();
        clickedAo(0);
    }
});

// Click-Event for the Write-Button of AO2
elemAo2Write.onclick = function () {
    clickedAo(1);
};

// Keypress-Event for the textfield of AO1
elemAoValue[1].addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        elemAoValue[1].blur();
        clickedAo(1);
    }
});

// Click-Event for the Send-Button of RS-485
btnSend.addEventListener('click', clickedSend);

// Keypress-Event for the textfield of RS-485
transMessage.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        btnSend.click();
    }
});

window.addEventListener('DOMContentLoaded', (event) => {
    vscode.postMessage({
        command: 'windowLoaded',
    });
});

// Click-Event for the DO-Buttons and Side-Nav
for (let index = 0; index < elemDo.length; index++) {
    elemDo[index].onclick = function () {
        clickedDo(index);
    };
    sideNav[index].onclick = function () {
        clickedNav(index);
    };
}

// SSH functions

/**
 * This function sends a POST-Message to the file `webviewIoCheck.ts` to read all ports from the CC100 with one SSH command
 */
async function readData() {
    vscode.postMessage({
        command: 'readData',
    });
}

/**
 * This method sends a POST-Message to the file `webviewIoCheck.ts` to write the digital outputs
 * @param value A decimal number to write, which represents the ports in binary format
 */
function digitalWrite(value) {
    vscode.postMessage({
        command: 'digitalWrite',
        value: value,
    });
}

/**
 * This method sends a POST-Message to the file `webviewIoCheck.ts` for all Click-Events
 */
async function buttonClick() {
    vscode.postMessage({
        command: 'buttonClick',
    });
}

/**
 * This method sends a POST-Message to the file `webviewIoCheck.ts` to read incoming messages of the RS-485
 */
async function serialRead() {
    vscode.postMessage({
        command: 'serialRead',
    });
}

/**
 * This method sends a POST-Message to the `file` `webviewIoCheck.ts` to write a message to the RS-485
 * @param text The text of the sending message
 */
function serialWrite(text) {
    vscode.postMessage({
        command: 'serialWrite',
        text: text,
    });
}

/**
 * This method sends a POST-Message to the file `webviewIoCheck.ts` to write the analog Data
 * @param pin '1' write to AO1, '2' write to AO2
 * @param value value between 0 and 4095 (12 bit value)
 */
function analogWrite(pin, value) {
    vscode.postMessage({
        command: 'analogWrite',
        value: value,
        pin: pin,
    });
}

/**
 * This method sends a POST-Message to the file `webviewIoCheck.ts` to read the switch on the CC100
 */
function readSwitch() {
    vscode.postMessage({
        command: 'readSwitch',
    });
}

async function updateEverything(dataArray) {
    updateAo(0, dataArray[4]);
    updateAo(1, dataArray[5]);
    displayDoData = dataArray[1].split(',').map((x) => +x);

    updateDigital(
        dataArray[0].split(',').map((x) => +x),
        elemDi,
        ledDi
    );
    updateDigital(displayDoData, elemDo, ledDo);
    updatePtAi(3, dataArray[2]);
    updatePtAi(4, dataArray[3]);
    updatePtAi(1, dataArray[6]);
    updatePtAi(2, dataArray[7]);
    updateStatusLeds(
        dataArray[8],
        dataArray[9],
        dataArray[10],
        dataArray[11],
        dataArray[12],
        dataArray[13],
        dataArray[14],
        dataArray[15],
        dataArray[16]
    );
}

function updateRefrashRate() {
    refrashRate.innerHTML = Date.now() - previousTimestamp + ' ms';
    previousTimestamp = Date.now();
}

/**
 * This method updates the DI and DO in the UI
 * @param value A decimal number to write, which represents the digital inputs in binary format
 * @param elements An array with the HTML-Elements
 * @param LEDs An array with the LEDs for the CC100 SVG
 */
async function updateDigital(value, elements, LEDs) {
    for (let index = 0; index < elements.length; index++) {
        if (value[index] == 1) {
            elements[index].style.backgroundColor = wagoGreen;
            elements[index].value = 'HIGH';
            LEDs[index].style.fill = wagoGreen;
        } else {
            elements[index].style.backgroundColor =
                'var(--vscode-sideBar-border)';
            elements[index].value = 'LOW';
            LEDs[index].style.fill = white;
        }
    }
}

/**
 * This method updates the LEDs in the IO-Check UI
 *
 * @param {*} sysLedGreen the SYS LED lights green when the value is `1` and not when value is `0`
 * @param {*} sysLedRed the SYS LED lights red when the value is `1` and not when value is `0`
 * @param {*} runledGreen the RUN LED lights green when the value is `1` and not when value is `0`
 * @param {*} runLedRed the RUN LED lights red when the value is `1` and not when value is `0`
 * @param {*} usrLedGreen the USR LED lights green when the value is `1` and not when value is `0`
 * @param {*} usrLedRed the USR LED lights red when the value is `1` and not when value is `0`
 * @param {*} µsdLed the µSD LED lights red when the value is `1` and not when value is `0`
 */
async function updateStatusLeds(
    sysLedGreen,
    sysLedRed,
    runLedGreen,
    runLedRed,
    usrLedGreen,
    usrLedRed,
    µsdLed,
    lnkAct1,
    lnkAct2
) {
    if (sysLedGreen == '1' && sysLedRed == '1') {
        ledSys.style.fill = orange;
    } else if (sysLedGreen == '0' && sysLedRed == '1') {
        ledSys.style.fill = red;
    } else if (sysLedGreen == '1' && sysLedRed == '0') {
        ledSys.style.fill = wagoGreen;
    } else {
        ledSys.style.fill = white;
    }

    if (runLedGreen == '1' && runLedRed == '1') {
        ledRun.style.fill = orange;
    } else if (runLedGreen == '0' && runLedRed == '1') {
        ledRun.style.fill = red;
    } else if (runLedGreen == '1' && runLedRed == '0') {
        ledRun.style.fill = wagoGreen;
    } else {
        ledRun.style.fill = white;
    }

    if (usrLedGreen == '1' && usrLedRed == '1') {
        ledUsr.style.fill = orange;
    } else if (usrLedGreen == '0' && usrLedRed == '1') {
        ledUsr.style.fill = red;
    } else if (usrLedGreen == '1' && usrLedRed == '0') {
        ledUsr.style.fill = wagoGreen;
    } else {
        ledUsr.style.fill = white;
    }

    if (lnkAct1) {
        if (lnkAct1.includes('yes')) {
            ledLnkAct1.style.fill = wagoGreen;
        } else {
            ledLnkAct1.style.fill = white;
        }
    }

    if (lnkAct2) {
        if (lnkAct2.includes('yes')) {
            ledLnkAct2.style.fill = wagoGreen;
        } else {
            ledLnkAct2.style.fill = white;
        }
    }
    if (µsdLed == '1') {
        ledµSd.style.fill = red;
    } else {
        ledµSd.style.fill = white;
    }
}

/**
 * This method updates the PT and AI in the UI
 * @param index The index of the PT and AI element in the UI
 * @param analogVal The analog value to update with
 */
async function updatePtAi(index, analogVal) {
    elemPtAi[index - 1].innerHTML = analogVal;
}

/**
 * This method updates the AO in the UI
 * @param index '0' to update AO1, '1' to update AO2
 * @param analogVal The analog value to update with
 */
function updateAo(index, value) {
    if (index == 0) {
        elemAo1Val.innerHTML = value;
    } else if (index == 1) {
        elemAo2Val.innerHTML = value;
    }
    // elemAoValue[index].value = value;
}

/**
 * This method updates the switch on the CC100 in the UI
 * @param value The switch status
 */
function updateSwitch(value) {
    if (value == '1') {
        elemSwitch.setAttribute('y', '370');
        disableOutputElements();
    } else if (value == '2') {
        elemSwitch.setAttribute('y', '395');
        enableOutputElements();
    } else if (value == '3') {
        elemSwitch.setAttribute('y', '420');
    }
}

/**
 * This method shows the recieved message from RS-485 in the UI
 * @param message The recieved message
 */
async function showRecievingMessage(message) {
    if (message != '') {
        var html = '<p align="left" style="background-color: #616a73;">';
        html += message;
        html += '</p>';
        chatSerial.innerHTML = chatSerial.innerHTML + html;
        chatSerial.scrollTop = chatSerial.scrollHeight;
    }
}

// Event functions (Outputs)

/**
 * This method reads and calibrates the values of the AO textfields
 * @param index `0` AO1 was clicked, `1` AO2 was clicked
 */
function clickedAo(index) {
    var val = elemAoValue[index].value;
    if (val) {
        val = parseFloat(val);
        if (val > 10000) {
            val = 10000;
            vscode.postMessage({
                command: 'alert',
                text: 'Maximum value is 10000',
            });
        } else if (val < 0) {
            val = 0;
            vscode.postMessage({
                command: 'alert',
                text: 'No negative value allowed',
            });
        }

        elemAoValue[index].value = '';
        if (index == 0) {
            aoData1 = val;
        } else {
            aoData2 = val;
        }
    } else {
        vscode.postMessage({
            command: 'alert',
            text: 'Undefined Value',
        });
        return;
    }
}

/**
 * This method changes the params on the right side according to the matching symbol in the navigation bar
 * @param index The index of the clicked symbol
 */
function clickedNav(index) {
    for (var i = 0; i < sideNav.length; i++) {
        if (i == index) {
            sideNav[i].style.borderColor = wagoGreen;
            rightParams[i].style.display = 'flex';
        } else {
            sideNav[i].style.borderColor = 'var(--vscode-sideBar-border)';
            rightParams[i].style.display = 'none';
        }
    }
}

/**
 * This method changes the value of the DO
 * @param index The index of clicked DO
 */
function clickedDo(index) {
    console.log('DO');
    if (elemDo[index].value == 'HIGH') {
        doData[index] = 0;
    } else {
        doData[index] = 1;
    }
    doChanged = true;
}

/**
 * This method sends the message from the RS-485 textfield
 */
function clickedSend() {
    if (transMessage.value) {
        serialText = transMessage.value;
        transMessage.value = '';
    }
}

function showMessage(message) {
    if (message) {
        var html = '<p align="right">';
        html += message;
        html += '</p>';
        chatSerial.innerHTML += html;
        chatSerial.scrollTop = chatSerial.scrollHeight;
    }
}

// Help functions

/**
 * This method disables all output elements that are not used in monitoring mode
 */
function disableOutputElements() {
    for (let index = 0; index < elemDo.length; index++) {
        elemDo[index].setAttribute('disabled', 'disabled');
    }
    elemAoValue[0].setAttribute('disabled', 'disabled');
    elemAoValue[1].setAttribute('disabled', 'disabled');
    elemAo1Write.setAttribute('disabled', 'disabled');
    elemAo2Write.setAttribute('disabled', 'disabled');
    btnSend.setAttribute('disabled', 'disabled');
}

/**
 * This method activates all elements that are necessary for setting outputs on the CC100
 */
function enableOutputElements() {
    for (let index = 0; index < elemDo.length; index++) {
        elemDo[index].removeAttribute('disabled');
    }
    elemAoValue[0].removeAttribute('disabled');
    elemAoValue[1].removeAttribute('disabled');
    elemAo1Write.removeAttribute('disabled');
    elemAo2Write.removeAttribute('disabled');
    btnSend.removeAttribute('disabled');
}
