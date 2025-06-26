# CC100 Python Extension

A visual studio code extension, for programming the WAGO CC100 in *Python*. Please refer to the [WAGO CC100 manual](https://www.wago.com/medias/m07519301-00000000-0en.pdf?context=bWFzdGVyfGRvd25sb2Fkc3wzNzQwNjM5fGFwcGxpY2F0aW9uL3BkZnxhR1V4TDJnMU9TOHhOREE1TURRMU5EY3lPRGN6TkM5dE1EYzFNVGt6TURGZk1EQXdNREF3TURCZk1HVnVMbkJrWmd8ZDIwMTQzN2JiOTlkYWZiZTZmN2RjYzU3Y2M0MjkyMjliOGMwYmQ0ZTY5NTQwNTI5N2NhZWRjMmFlNzY1ZDVkNA&attachment=true) for technical Information on the PLC.

**Note that this extension was created as part of a student project and is not regularly maintained. It is neither a stable version nor an official extension of WAGO GmbH & Co. KG.**

<!--
## Quick start
 - You need the SSH Agent to connect to the CC100 with this extension. If you're using windows you will need to [Install OpenSSH on Windows](https://learn.microsoft.com/de-de/windows-server/administration/openssh/openssh_install_firstuse?tabs=powershell#install-openssh-for-windows). After installation you need to restart your PC. Linux and MacOS should have one preinstalled
 - Connect your computer to the controller using a USB-C cable and open the extension by clicking on the corresponding icon in the activity bar
 - Create a project using the start window that opens. To do this, select a project name and the storage location
 -->

## Content

- [How to use the Extention](#how-to-use-the-extention)
- [Upload Projekt](#upload)
- [Debug](#debug)
- [Remove/Reset](#removereset)
- [IO-Check](#io-check)
- [Settings](#settings)
<!-- - [Simulation](#simulation) -->

## How to use the Extention

As soon as the WAGO extension is installed in VsCode, on the left Side a WAGO symbol should appear. When you open the extension in the left sidebar there is a button called **init Project**. This is for setting up your workspace by creating a WAGO.yaml and setting up a Controller. Therefore, it will setup a controller.yaml and a sample project. The new Controller has three visible buttons and a connection status icon.  The Icon tells whether the controller is connected (green) :green_circle: :red_circle: or if it is offline (red) :red_circle: .
Above the controller buttons are the option to **refresh**, to do a **multiupload** and to add a new controller. 
When setting up a new controller the extension will ask for a name, a description, to choose a controller like cc100 and to choose a folder for your source.  All these settings can be changed later. To do that, navigate to the dropdown menu of each controller. The menu contains the description, the engine, the Docker image version, the source, the connection type, the port, the user and the option for auto updates which is turned on by default.  

### Write your code

 Write you code in the file *main.py*
 Since the extention runs with the help of Docker, we use Pyhon 3.13 inside the container

### Upload

To upload a program to the controller, select the play button of the wanted controller.
Once a programm is uploaded the code will run automatically.
**Node:** The extentions checks where a change happend since the last upload and will only upload if the programm is diffrent then the one already uploaded. 

 To upload a program to multiple controllers, select the two play buttons next to the add controller button. This will upload the program to every connected controller. 
 **Node:** The rules are the same to a multiupload and a single upload. 

### Debug

To debug a program, simply select the controller you want to debug with the play button with the bug on it. Then vscode will try to connect to the given controller, which can take some time.
When the connection succeeds, the normal vscode python debugger will appear on the top of the screen, and you can get started. 
**Node:** There has to be a breakpoint in the projekt. Also to use the Debugger is it required to press Pause(F6) and Step into(F11). The current executed line will be highlighed.

### Remove/Reset

By right clicking a controller you can **rename**, **reset**, **remove** or **reset and remove** the controller. By selecting a **rename** you will be asked to enter a new name. 
The option **reset** will activate codesys again and reset everything that was done by the extension, like removing the program. 
The **remove** option will remove the controller out of the sidebar. It will also remove the controller.yaml with the corresponding name and remove the controller out of the wago.yaml. The settings on the controller will stay.

With **remove and reset** those two functions will be combined. 

### IO-Check

The *IO-Check* feature in this extension imitates the functions of the well known *WAGO IO-Check* application. Please ensure that the connection method and the associated options are set correctly. The *IO-Check* function has two modes (`RUN`, `STOP`):

When the operating mode switch is in the `RUN` position, the status of the CC100 with its inputs and outputs can be viewed.

![IO-Check with CC100 in RUN mode](https://raw.github.com/wago-enterprise-education/vscode-wago-cc100/main/res/Videos/IoCheckRun.gif)

When the operating mode switch is in the `STOP` position, the outputs as well as the serial port can be set manually by the user.

![IO-Check with CC100 in STOP mode](https://raw.github.com/wago-enterprise-education/vscode-wago-cc100/main/res/Videos/IoCheckStop.gif)

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

## Settings

In this view the settings for the connectivity method can be set. To overwrite the current settings select the used connection method, change the parameters if necessary.
An example would be to set a new IP-Adress. 
