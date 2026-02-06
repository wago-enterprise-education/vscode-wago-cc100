# WAGO CC100 Visual Studio Code Extension

A Visual Studio Code extension for programming the WAGO Compact Contoller 100 in _Python_. The manual for the CC100 can be found on the [WAGO website](https://www.wago.com/medias/m07519301-00000000-0en.pdf?context=bWFzdGVyfGRvd25sb2Fkc3wzNzQwNjM5fGFwcGxpY2F0aW9uL3BkZnxhR1V4TDJnMU9TOHhOREE1TURRMU5EY3lPRGN6TkM5dE1EYzFNVGt6TURGZk1EQXdNREF3TURCZk1HVnVMbkJrWmd8ZDIwMTQzN2JiOTlkYWZiZTZmN2RjYzU3Y2M0MjkyMjliOGMwYmQ0ZTY5NTQwNTI5N2NhZWRjMmFlNzY1ZDVkNA&attachment=true).

> [!CAUTION]
> **This extension was created as part of a student project and is not regularly maintained. It is neither a stable version nor an official extension of WAGO GmbH & Co. KG.**

## Table of Contents

- [Supported WAGO CC100 Devices](#supported-wago-cc100-devices)
- [Quick Start](#quick-start)
- [How to use the Extension](#how-to-use-the-extension)
- [Write Your Python Code](#write-your-python-code)
- [Upload](#upload)
- [Debug](#debug)
- [Remove/Reset](#remove-reset)
- [IO-Check](#io-check)

## Supported WAGO CC100 Devices

| Device   | Firmware | Comment  |
|----------|----------|----------|
| 751-9301 | 28, 30   |          |

## Quick start

1. Install the extension.
2. Open a folder in VS Code.
3. Use the WAGO CC100 view in the Activity Bar:
    - If your folder is not a CC100 project yet: run **Init Project**.
    - Or create a new one via **Create Project**.
4. Add a controller via **Add Controller** and fill in the prompted fields.
5. Put your code into the controller source folder (see [Write your Python code](#write-your-python-code)).
6. Upload via **Upload** (play icon).
   
## How to use the Extension

Once the WAGO extension is installed in VSCode, a WAGO symbol should appear on the left sidebar. Click this button to open the extension, which reveals options such as **Create Project** and **Open Project** or **Init Project** if you are in a folder. The **Create Project** button helps set up your workspace by creating a template project containing the `wago.yaml` and `controller.yaml` files. These are essential for housing controller configurations. The controller interface includes three buttons and a connection status icon. The icon indicates whether the controller is connected (:green_circle:) or offline (:red_circle:).

Above the controller buttons, you can refresh, perform a multiupload, or add new controllers. When setting up a new controller, the extension will ask for a name, description, controller type (e.g., cc100), and a source folder. These settings can be modified later.

To **change the settings**, navigate to the dropdown menu of the controller. This menu displays all necessary controller information. Click the small pen icon next to the field you wish to edit, leading to a popup on your screen for input.

### Write Your Python Code

Develop your code in the `main.py` file within the source folder of your controller. Ensure this folder contains a file named `main.py` before uploading.

The extension runs using Docker and employs Python 3.13 inside its container.

### Upload

To upload a program to the controller, click the "play" button for the desired controller. Depending on the Docker image status on the controller, this process might take some time. Once a program is uploaded, it will run automatically.

**Note:** The extension checks for changes since the last upload and will only proceed if the program differs from the existing one on the controller.

For uploading to multiple controllers, click the double "play" button next to the add controller button above your controllers, initiating an upload for every connected controller.

**Note:** The rules are the same for both multiupload and single upload.

### Debug

To debug a program, click the play button with the bug icon for the controller you want to debug. VSCode will connect to the specified controller, which may take some time. Once connected, the standard VSCode Python debugger will appear, allowing you to begin debugging.

### Remove/Reset

Right-clicking a controller allows you to **rename**, **reset**, **remove**, or **reset and remove** it.

Selecting **rename** prompts you to enter a new name.

The **reset** option activates CODESYS runtime again and reverts all extension actions, including program and docker image removal.

Choosing **remove** deletes the controller from the sidebar, its configuration, and its entry from the `wago.yaml`. Controller settings themselves remain unchanged.

**Remove and reset** combines the last two functions.

### IO-Check

The _IO-Check_ feature mimics the functionality of the well-known _WAGO IO-Check_ application. Ensure that the connection method and options are set correctly. The _IO-Check_ function has two modes: `RUN` and `STOP`.

With the switch in the `RUN` position, you can view the CC100's status along with its inputs and outputs.

![IO-Check with CC100 in RUN mode](/res/Videos/IoCheckRun.gif)

With the switch in the `STOP` position, outputs and the serial port can be manually configured by the user.

![IO-Check with CC100 in STOP mode](/res/Videos/IoCheckStop.gif)

## Issues

If you can reproduce an issue, please open an issue on GitHub and include logs and steps to reproduce:
https://github.com/wago-enterprise-education/vscode-wago-cc100/issues

## Release notes

See the changelog in this repository: `CHANGELOG.md`.

## Contributing

Contributions are welcome via GitHub pull requests:
https://github.com/wago-enterprise-education/vscode-wago-cc100

## License

See the `LICENSE` file in this repository.