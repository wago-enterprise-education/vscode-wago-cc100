const { NodeSSH } = require("node-ssh");
const { exec } = require("child_process");
const path = require("path");

export class pythonWorkspace {
  private ssh = new NodeSSH();

/**
   * Requirements: An existing SSH connection
   *
   * @returns A `String` that either contains the python version on the CC100 or an error message
   */
public async get_python_version() {
    try {
      return await this.ssh
        .exec("python3 -V", [""], {
          cwd: "/.",
          stream: "stdout",
          options: { pty: true },
        })
        .then(function (result: any) {
          return result;
        });
    } catch (error: any) {
      return "Error: " + error.message;
    }
  }

  /**
   * Requirements: An existing SSH connection
   *
   * @param opkgPackage The path with the filename of the package to install
   *
   * Example: /home/python3_3.7.6_armhf.ipk
   *
   * @returns A `String` containing an error message if the process fails
   */
  public async install_package(opkgPackage: string) {
    try {
      return await this.ssh
        .exec("opkg install " + opkgPackage, [""], {
          cwd: "/.",
          stream: "stdout",
          options: { pty: true },
        })
        .then(function (result: any) {
          return result;
        });
    } catch (error: any) {
      return "Error: " + error.message;
    }
  }

  /**
   * Requirements: An existing SSH connection
   *
   * @param path file directory with file of the file to execute
   *
   * Example: /home/wago_cc100_python-main/sample_scripts/write_do.py
   *
   * @returns A `String` containing an error message if the process fails
   */
  public async start_python_script(path: string) {
    try {
      return await this.ssh
        .exec("python3 " + path + " &", [""], {
          cwd: "/.",
          stream: "stdout",
          options: { pty: true },
        })
        .then(function (result: any) {
          return result;
        });
    } catch (error: any) {
      return "Error: " + error.message;
    }
  }

  /**
   * Requierements: An existing SSH connection
   *
   * @param filename filename of the file to be changed to run mode
   *
   * @returns A `String` that either contains 'Successfully' or an error message
   */
  public async make_file_to_executable_file(filename: string) {
    try {
      return await this.ssh
        .exec("chmod +x /etc/init.d/" + filename, [""], {
          cwd: "/.",
          stream: "stdout",
          options: { pty: true },
        })
        .then(() => {
          return "Successfully";
        });
    } catch (error: any) {
      return "Error: " + error.message;
    }
  }
  
  /**
   * Kills ALL running python scripts
   * Requirements: An existing SSH connection
   *
   * @returns Either a `String` containing an error message or the result returned by the ssh.exec() function
   */
  public async kill_all_python_scripts() {
    try {
      return await this.ssh
        .exec("killall python3", [""], {
          cwd: "/.",
          stream: "stdout",
          options: { pty: true },
        })
        .then(function (result: any) {
          return result;
        });
    } catch (error: any) {
      return "Error: " + error.message;
    }
  }
}