# CC100 Python Extension

A visual studio code extension, for programming the WAGO CC100 in *Python*. The manual for the CC100 can be found [on the WAGO website](https://www.wago.com/medias/m07519301-00000000-0en.pdf?context=bWFzdGVyfGRvd25sb2Fkc3wzNzQwNjM5fGFwcGxpY2F0aW9uL3BkZnxhR1V4TDJnMU9TOHhOREE1TURRMU5EY3lPRGN6TkM5dE1EYzFNVGt6TURGZk1EQXdNREF3TURCZk1HVnVMbkJrWmd8ZDIwMTQzN2JiOTlkYWZiZTZmN2RjYzU3Y2M0MjkyMjliOGMwYmQ0ZTY5NTQwNTI5N2NhZWRjMmFlNzY1ZDVkNA&attachment=true).

**Note that this extension was created as part of a student project and is not regularly maintained. It is neither a stable version nor an official extension of WAGO GmbH & Co. KG.**

<!--
## Quick start
 - You need the SSH Agent to connect to the CC100 with this extension. If you're using windows you will need to [Install OpenSSH on Windows](https://learn.microsoft.com/de-de/windows-server/administration/openssh/openssh_install_firstuse?tabs=powershell#install-openssh-for-windows). After installation you need to restart your PC. Linux and MacOS should have one preinstalled
 - Connect your computer to the controller using a USB-C cable and open the extension by clicking on the corresponding icon in the activity bar
 - Create a project using the start window that opens. To do this, select a project name and the storage location
 -->

## Content

- [CC100 Python Extension](#cc100-python-extension)
  - [Content](#content)
  - [How to use the Extention](#how-to-use-the-extention)
    - [Write your code](#write-your-code)
    - [Upload](#upload)
    - [Debug](#debug)
    - [Remove/Reset](#removereset)
    - [IO-Check](#io-check)
 <!-- - [Simulation](#simulation) -->

## How to use the Extention

As soon as the WAGO extension is installed in VSCode, a WAGO symbol should appear on the left side. Upon clicking on this button, the extension opens in the left sidebar and there will be a button called **Init Project**. This button is for setting up your workspace by creating a template project, containing the wago.yaml and a controller.yaml. These files are vital for the project, as they house the configuration of the controllers. The new Controller has three visible buttons and a connection status icon.  The Icon tells whether the controller is connected :green_circle: or if it is offline :red_circle:.
Above the controller buttons are the option to **refresh**, to do a **multiupload** and to **add** a new controller.
When setting up a new controller the extension will ask for a name, a description, a controllertype, like cc100, and a folder as your source. All these settings can be changed later.

To **change the settings**, navigate to the dropdown menu of the controller. This menu contains all necessary informations of the controller. To edit the appropriate setting, click on the small pen on the right of the field you wish to edit. After that, a popup will appear on the top of your screen, asking you for the necessary inputs.

### Write your code

Write you code in the file **main.py**, within the source-folder of your controller. Note that this folder must contain a file named main.py when uploading.

Since the extention runs with the help of Docker, we use Pyhon 3.13 inside the container

### Upload

To upload a program to the controller, select the button commonly known as "play" button of the wanted controller. Depending on the status of the Docker-Image on the controller, this process might take a while.

Once a programm is uploaded the code will run automatically.

**Note:** The extentions checks whether a change happend since the last upload and will only upload if the programm is different then the one already present on the controller.

To upload a program to multiple controllers, select the previously mentioned double "play" button next to the add controller button above your controllers. This will initiate an upload sequence for every connected controller.

**Note:** The rules are the same with a multiupload and a single upload.

### Debug

To debug a program, simply select the play button with the bug on it for the controller you want to debug on. VSCode will try to connect to the given controller, which can take some time.
When the connection succeeds, the normal vscode python debugger will appear on the screen, and you can get started.

**Note:** There needs to be a breakpoint in the projekt. The line to be executed next will be highlighed.

### Remove/Reset

By right clicking a controller you can **rename**, **reset**, **remove** or **reset and remove** the controller.

By selecting **rename** you will be asked to enter a new name.

The option **reset** will activate codesys again and reset everything that was done by the extension, including the removal of the program.

The **remove** option will remove the controller out of the sidebar. It will also remove the controller configuration with the corresponding name and remove the controller out of the wago.yaml. The settings on the controller itself will stay.

**Remove and reset** combines the last two functions.

### IO-Check

The *IO-Check* feature in this extension imitates the functions of the well known *WAGO IO-Check* application. Please ensure that the connection method and the associated options are set correctly. The *IO-Check* function has two modes: `RUN` and `STOP`:

When the operating mode switch is in the `RUN` position, the status of the CC100 with its inputs and outputs can be viewed.

![IO-Check with CC100 in RUN mode](https://raw.github.com/wago-enterprise-education/vscode-wago-cc100/main/res/Videos/IO_Check_Run.gif)

When the operating mode switch is in the `STOP` position, the outputs as well as the serial port can be set manually by the user.

![IO-Check with CC100 in STOP mode](https://raw.github.com/wago-enterprise-education/vscode-wago-cc100/main/res/Videos/IO_Check_Stop.gif)

<!-- ### Simulation

This button only appears if the simulator is selected in the settings. To be able to use the simulator, it must be started in a Docker container.
<details>
<summary>How to run the Container</summary>

#### Before Starting The Simulator:
- Install [Docker-Desktop](https://www.docker.com/products/docker-desktop/) and make sure that you already installed "WSL" (windows subsystem for linux)

#### Running The Container:
1. `docker pull wagoeducation/cc100_simulator:V1.0`
2. `docker run --privileged -d -p 2222:22 -p 3000:3000 --name cc100_simulator --restart always wagoeducation/cc100_simulator:V1.0`

</details> 

In the simulator, the digital inputs can be switched by clicking on the respective switches. The analog inputs can be controlled using the respective slide switches. The operating mode switch can be moved to different states using the green triangles.

![Upload Project](https://raw.github.com/wago-enterprise-education/vscode-wago-cc100/main/res/Videos/showSimulator.gif)

 You can find further information on how the simulator works in detail [here](https://svgithub01001.wago.local/education/cc100_simulator/blob/main/README.md). -->
