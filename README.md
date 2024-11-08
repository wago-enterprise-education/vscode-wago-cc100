# CC100 Python Extension
A visual studio code extension, for programming the WAGO CC100 in *Python*. The manual for the CC100 can be found [here](https://www.wago.com/medias/m07519301-00000000-0en.pdf?context=bWFzdGVyfGRvd25sb2Fkc3wzNzQwNjM5fGFwcGxpY2F0aW9uL3BkZnxhR1V4TDJnMU9TOHhOREE1TURRMU5EY3lPRGN6TkM5dE1EYzFNVGt6TURGZk1EQXdNREF3TURCZk1HVnVMbkJrWmd8ZDIwMTQzN2JiOTlkYWZiZTZmN2RjYzU3Y2M0MjkyMjliOGMwYmQ0ZTY5NTQwNTI5N2NhZWRjMmFlNzY1ZDVkNA&attachment=true).

**Note that this extension was created as part of a student project and is not regularly maintained. It is neither a stable version nor an official extension of WAGO GmbH & Co. KG.**
## Quick start
![Create Project](https://raw.github.com/wago-enterprise-education/vscode-wago-cc100/main/res/Videos/create_project.gif)
 - You need the SSH Agent to connect to the CC100 with this extension. If you're using windows you will need to [Install OpenSSH on Windows](https://learn.microsoft.com/de-de/windows-server/administration/openssh/openssh_install_firstuse?tabs=powershell#install-openssh-for-windows). After installation you need to restart your PC. Linux and MacOS should have one preinstalled
 - Connect your computer to the controller using a USB-C cable and open the extension by clicking on the corresponding icon in the activity bar
 - Create a project using the start window that opens. To do this, select a project name and the storage location
 
![Upload Project](https://raw.github.com/wago-enterprise-education/vscode-wago-cc100/main/res/Videos/upload_project.gif)

 - Write your code in the file *main.py*
 - The WAGO CC100 comes with Python 2.7 preinstalled. Hence, the extension installs Python 3.7.6.
 - You can now load and run the application on the CC100 by clicking on the "Upload" tab in the left-hand area or on the corresponding icon in the status bar
 - Once uploaded, the program is executed on the controller

## Description
When you install the extension, the icon for this extension appears in the activity bar if the installation was successful. Click on it to start the extension. The start page then opens, where projects can be opened and created, the documentation can be viewed or *IO-Check* can be opened. Two views also appear on the left-hand side. The upper part contains general actions that can be carried out with the extension. In the lower view, connection methods and their options are set. 

## Menu
The following functions are located under the *Menu* section in the sidebar:
 - [Home](#home)
 - [Upload](#upload)
 - [Debug](#debug)
 - [Remove](#remove)
 - [IO-Check](#io-check)
 - [Download](#download)
 <!-- - [Simulation](#simulation) -->
 
### Home
This button takes you to the start page of this extension.

### Upload
If you click this button, you can upload a project to the CC100. You must have a project open to do this. When a project is uploaded to the CC100, a bootapplication is automatically created. The last project uploaded to the CC100 is automatically executed after the boot process. Note that uploading a project to the connected CC100 kills **all** currently runnig python scripts. That means that you can't have any other python scripts running on the CC100 if you want to upload a script with this extension.

### Debug
If you want to debug your code on the CC100, you can add breakpoints in VS Code and upload the project with this button. The Python Debugger (PDB) will start automatically in a new terminal. For navigation with the PDB see [PDB Documentation](https://docs.python.org/3/library/pdb.html).

### Remove
You can use this button to completely remove a project uploaded to the CC100. This always **has to be done** if the CC100 should be programmed in *CODESYS* again after using this extension.

### IO-Check
The *IO-Check* feature in this extension imitates the functions of the well known *WAGO IO-Check* application. Please ensure that the connection method and the associated options are set correctly. The *IO-Check* function has two modes (`RUN`, `STOP`):

When the operating mode switch is in the `RUN` position, the status of the CC100 with its inputs and outputs can be viewed.

![IO-Check with CC100 in RUN mode](https://raw.github.com/wago-enterprise-education/vscode-wago-cc100/main/res/Videos/IO_Check_Run.gif)
 
When the operating mode switch is in the `STOP` position, the outputs as well as the serial port can be set manually by the user.

![IO-Check with CC100 in STOP mode](https://raw.github.com/wago-enterprise-education/vscode-wago-cc100/main/res/Videos/IO_Check_Stop.gif)

### Download
The Download button is used to transfer the python file that is currently saved on the CC100 to your local project. A local project must be open for this button to appear. The files in this project will then be overwritten after confirming the Download. Note that this button will not change the files on the CC100.

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
![Settings](https://raw.github.com/wago-enterprise-education/vscode-wago-cc100/main/res/Videos/settings.gif)

In this view the settings for the connectivity method can be set. To overwrite the current settings select the used connection method, change the parameters if necessary and click on the save-button.
