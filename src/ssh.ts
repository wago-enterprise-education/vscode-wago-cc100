const fs = require('fs')
const { NodeSSH } = require('node-ssh')
const { Client } = require('ssh2')
const { exec } = require('child_process')
const { promisify } = require('util')
const { homedir, userInfo } = require('os');
const { join } = require('path');

export class SSH {
  private ssh = new NodeSSH()
  private ssh2 = new Client()
  private privateKeyPath: string
  public ipAdress: string
  public port: number
  public username: string
  public password: string


  constructor(ipAdress: string, port: number, username: string, password: string) {
    this.privateKeyPath = join(homedir(), '.ssh', 'id_rsa_cc100')
    this.ipAdress = ipAdress
    this.port = port
    this.username = username
    this.password = password
  }

  /**
   * This method generates a key pair for a SSH connection to the CC100
   * 
   * @returns Error message in a string when the keygen fails
   */
  private async ssh_keygen() {
    try {
      const command = `ssh-keygen -t rsa -b 2048 -f ${this.privateKeyPath} -C "cc100-extension-${userInfo().username}" -N "\n"`;
      const execPromise = promisify(exec);
      const { stdout, stderr } = await execPromise(command);
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      } else {
        console.log(`stdout: ${stdout}`);
      }
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Checks if the given file exists
   * @param filePath 
   * @returns `true` if the file exists, `false` if it doesn't and a `String` containing an error message if the process failed
   */
  private async exists_file(filePath: string) {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch (error: any) {
      return false
    }
  }

  /**
   * This method establish a SSH connection to the CC100 with the standard password
   * 
   * @returns a `String` containig an error message if the process fails or times out, otherwise the `value` given returned by the ssh.connect function
   */
  public async ssh_connection_without_key() {
    try {
      const timeout = new Promise((resolve) => {
        setTimeout(resolve, 2000, 'Error: Timeout');
      });

      let connection_result = this.ssh.connect({
        host: this.ipAdress,
        port: this.port,
        username: this.username,
        password: this.password
      })

      return await Promise.race([timeout, connection_result]).then((value) => {
        return value;
      });
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * This method establish a SSH connection to the CC100 with the SSH keys
   * @returns a `String` containig an error message if the process fails or times out, otherwise the `value` given returned by the ssh.connect function
   */
  public async ssh_connection_with_key() {
    try {
      const timeout = new Promise((resolve) => {
        setTimeout(resolve, 2000, 'Error: Timeout');
      });

      let connection_result = this.ssh.connect({
        host: this.ipAdress,
        port: this.port,
        username: this.username,
        privateKeyPath: this.privateKeyPath
      })

      return await Promise.race([timeout, connection_result]).then((value) => {
        return value;
      });
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Checks whether the there is a ssh connection
   * @returns `true` or `false` depending on the connection status
   */
  public async is_connected() {
    return await this.ssh.isConnected();
  }

  /**
   * This method prepare the CC100 for SSH connection with the SSH keys
   * 
   * The public key is transferred to the CC100 and moved to the required folder
   * 
   * @returns A `String` that either contains 'Successfully' or an error message
   */
  public async copy_ssh_key_to_CC100() {
    try {
      let publicKeyPath = this.privateKeyPath + '.pub'
      let hostKeyPath = '/root/.ssh/authorized_keys'

      const exists = await this.exists_file(this.privateKeyPath);
      if (!exists) {
        await this.ssh_keygen();
      }

      await this.ssh_connection_without_key().then(async () => {
        await this.ssh.execCommand('mkdir -p /root/.ssh/')
        let publicKeyContent = await fs.readFileSync(publicKeyPath)
        await this.append_to_file(hostKeyPath, publicKeyContent)
        await this.ssh.execCommand(`chmod 600 ${publicKeyPath}`)
        await this.disconnect_ssh()
      })
      return 'Successfully'
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * This method can't create folders, it only copies one file. The filename could be changed
   * 
   * Requirements: An existing SSH connection
   * 
   * @param originPath The path of the file to copy with the file name
   * 
   * Example: /c/Users/u0104816/documents/Aufgaben Docker/hello1.py
   * 
   * @param destinationPath The destination path with the new filename, where the file should be copied
   * 
   * Example: /home/Test/hello2.py
   * 
   * @returns A `String` that either contains 'Successfully' or an error message
   */
  public async copy_file(originPath: string, destinationPath: string) {
    try {
      return await this.ssh.execCommand('cp ' + originPath + ' ' + destinationPath).then(function (result: any) {
        return 'Successfully'
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * This method creates a file with data
   * 
   * Requirements: An existing SSH connection
   * 
   * @param path The path of the file to create with the file name
   * 
   * Example: /home/Test/hello.py
   * 
   * @param data The string data to write in the file
   * 
   * Example: "print('Hello, World!')"
   * 
   * @returns A `String` that contains an error message if the process failed
   */
  public async create_file(path: string, data: string) {
    try {
      const command = `echo -e "${data}" > ${path}`;
      return await this.ssh.execCommand(command).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
 * This method appends data to a file
 * 
 * Requirements: An existing SSH connection
 * 
 * @param path The path of the file to append with the file name
 * 
 * Example: /home/Test/hello.py
 * 
 * @param data The string data to append to the file
 * 
 * Example: "print('Hello, World!')"
 * 
 * @returns When the writing process is done
 */
  public async append_to_file(path: string, data: string) {
    try {
      const command = `echo "${data}" >> ${path}`;
      return await this.ssh.execCommand(command).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * This method turns the `RUN` LED off
   * 
   * @returns 'Success' or the 'error' message in a `String`
   */
  public async turn_off_run_led() {
    try {
      await this.ssh.exec('echo 0 >> /dev/leds/run-green/brightness', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } })
      await this.ssh.exec('echo 0 >> /dev/leds/run-red/brightness', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } })
      return 'Success'
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * @returns the complete PEA and PAA from the CC100, the sequence is: `DI`, `DO`, `AI1`, `AI2`, `AO1`, `AO2`, `PT1`, `PT2`, `SYS LED green`, `SYS LED red`, `RUN LED green`, `RUN LED red`, `USR LED green`, `USR LED red`, `LNK ACT1 LED`, `LNK ACT2 LED`, `µSD LED`
   */
  public async read_CC100() {
    try {
      return await this.ssh.exec("cat /sys/devices/platform/soc/44009000.spi/spi_master/spi0/spi0.0/din " + // DI
        "/sys/kernel/dout_drv/DOUT_DATA " + // DO
        "/sys/bus/iio/devices/iio:device3/in_voltage3_raw " + // AI1
        "/sys/bus/iio/devices/iio:device3/in_voltage0_raw " + // AI2
        "/sys/bus/iio/devices/iio:device0/out_voltage1_raw " + // AO1
        "/sys/bus/iio/devices/iio:device1/out_voltage2_raw " + // AO2
        "/sys/bus/iio/devices/iio:device2/in_voltage13_raw " + // PT1
        "/sys/bus/iio/devices/iio:device2/in_voltage1_raw " + // PT2
        "/dev/leds/sys-green/brightness " + // SYS LED green
        "/dev/leds/sys-red/brightness " + // SYS LED red
        "/dev/leds/run-green/brightness " + // RUN LED green
        "/dev/leds/run-red/brightness " + // RUN LED red
        "/dev/leds/u1-green/brightness " + // USR LED green
        "/dev/leds/u1-red/brightness " + // USR LED red
        "/dev/leds/led-mmc/brightness &&" +  // µSD LED
        'ethtool ethX1 | grep "Link detected*" &&' + // LNK ACT1 | Das Auslesen der Ethernet-LEDs hat die zyklische Abfrage in IO-Check verdoppelt
        'ethtool ethX2 | grep "Link detected*"',  // LNK ACT2
        [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(async (result: any) => {
          return result;
        })
    }
    catch (error: any) {
      return 'Error: ' + error.message;
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * @param status A decimal number to write, which represents the ports in binary format 
   * 
   * @returns A decimal number which represents the outputs in binary format when the writing process is completed or a `String` containing an error
   */
  public async digital_write(status: number) {
    const path = '/sys/kernel/dout_drv/DOUT_DATA'

    try {
      await this.ssh.execCommand('echo ' + status + ' >> ' + path)
      return await this.ssh.exec('cat ' + path, [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * @returns a table containing the calibration data for the analog ports or a `String` containing an error
   */
  public async analog_calib_data() {
    try {
      return await this.ssh.exec('cat /etc/calib', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * Enables the analog outputs
   * 
   * @returns A `String` containing an error or 'Successfully enabled'
   */
  public async enable_analog_output() {
    const dir = '/sys/bus/iio/devices/'

    try {
      await this.ssh.execCommand('echo 0 >> ' + dir + 'iio:device0/out_voltage1_powerdown')
      await this.ssh.execCommand('echo 0 >> ' + dir + 'iio:device1/out_voltage2_powerdown')
      return 'Successfully enabled'
    }
    catch (error: any) {
      return error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * @param pin '1' write to AO1, '2' write to AO2
   * 
   * @param value value between 0 and 4095 (12 bit value)
   * 
   * @returns A 12 bit value which represents the output voltage from the addressed pin or a `String` containing an error
   */
  public async analog_write(pin: number, value: number) {
    const dir = '/sys/bus/iio/devices/'

    try {
      if (pin == 1) {
        await this.ssh.execCommand('echo 0 >> ' + dir + 'iio:device0/out_voltage1_powerdown')
        await this.ssh.execCommand('echo ' + value + ' >> ' + dir + 'iio:device0/out_voltage1_raw')
        return await this.ssh.exec('cat ' + dir + 'iio:device0/out_voltage1_raw', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
          return result
        })
      }
      else if (pin == 2) {
        await this.ssh.execCommand('echo 0 >> ' + dir + 'iio:device1/out_voltage2_powerdown')
        await this.ssh.execCommand('echo ' + value + ' >> ' + dir + 'iio:device1/out_voltage2_raw')
        return await this.ssh.exec('cat ' + dir + 'iio:device1/out_voltage2_raw', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
          return result
        })
      }
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * This method setup the serial interface to send more data through the serial interface
   * 
   * @returns A `String`containig 'Success!' or an error message
   */
  public async setup_serial_interface() {
    try {
      return await this.ssh.exec('stty -F /dev/ttySTM1 cstopb brkint -icrnl -ixon -opost -isig icanon -iexten -echo', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function () {
        return 'Success!'
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * This method connect to the additionally SSH2 connection
   * 
   * @returns the value returned by ssh2.connect
   */
  public async ssh2_connect() {
    return await this.ssh2.connect({
      host: this.ipAdress,
      port: this.port,
      username: this.username,
      privateKey: fs.readFileSync(this.privateKeyPath)
    })
  }

  /** 
   * This function reads the received data from serial communication with RS485 and only needs to be called once
   * 
   * The received data is in the Buffer variable
   */
  public async serial_read(callback: (dataBuffer: Buffer) => void) {
    await this.ssh2.on('ready', () => {
      this.ssh2.shell((err: any, stream: any) => {
        if (err) throw err;

        stream.on('close', () => {
          this.ssh2.end();
        }).on('data', (data: Buffer) => {
          callback(data)
        });

        // Hier kannst du Befehle senden, wenn der Stream bereit ist
        stream.write('cat /dev/ttySTM1\n');
      });
    })
  }

  /**
   * This method disconnect the additionally SSH2 connection
   * 
   * @returns when disconnected
   */
  public async ssh2_disconnect() {
    return await this.ssh2.end()
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * This method writes to the RS485 bus
   * 
   * The data size should be less than 6 bytes
   * 
   * @param serialData The transmitted data to the RS485 bus
   * 
   * @returns the result of the executed command or a `String` containig an error message
   */
  public async serial_write(serialData: string) {
    try {
      await this.ssh.exec('echo ' + '"' + serialData + '"' + ' >> /dev/ttySTM1', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * Outputs the files and folders in the given path
   * 
   * @param path The path of the content to be be listed
   * 
   * Example: /home
   * 
   * @returns A `String` containig a list of files and folders at the specified path or an error message
   */
  public async list_content_dir(path: string): Promise<String> {
    try {
      return await this.ssh.exec('ls ' + path, [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * After this function is called, the SSH connection have to be closed with disconnectSSH(). This method can create non-existing folders and rename the filename.
   * Individual files or entire directories can be transferred with this method.
   * 
   * @param originPath origin path of the file
   * 
   * Example: __dirname + '/../res'
   * 
   * @param destinationPath destination path of the file
   * 
   * Example: /home/user/Test/test
   * 
   * @returns A `String` containing either 'Successful' or an error message
   */
  public async transfer_directory(originPath: string, destinationPath: string) {
    try {
      return await this.ssh.putDirectory(originPath, destinationPath).then((result: any) => {
        return 'Successful'
      })
    }
    catch (error: any) {
      try {
        return await this.ssh.putFile(originPath, destinationPath, null).then((result: any) => {
          return 'Successful'
        })
      }
      catch (error: any) {
        return 'Error :' + error.message
      }
    }
  }

  public async get_directory(localDirectory: string, remoteDirectory: string,) {
    try {
      return await this.ssh.getDirectory(localDirectory, remoteDirectory,).then((result: any) => {
        return 'Successful'
      })
    }
    catch (error: any) {
      try {
        return await this.ssh.getFile(localDirectory, remoteDirectory, null).then((result: any) => {
          return 'Successful'
        })
      }
      catch (error: any) {
        return 'Error: ' + error.message
      }
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * @param path the path to the folder or file to be deleted
   * 
   * @returns A `String`containing either 'Successfully' or an error message
   */
  public async delete_files(path: string) {
    try {
      await this.ssh.execCommand('rm -r ' + path)
      return 'Successfully'
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * @returns A `String` that either contains the python version on the CC100 or an error message
   */
  public async get_python_version() {
    try {
      return await this.ssh.exec('python3 -V', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
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
      return await this.ssh.exec('opkg install ' + opkgPackage, [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
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
      return await this.ssh.exec('python3 ' + path + ' &', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
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
      return await this.ssh.exec('chmod +x /etc/init.d/' + filename, [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(() => {
        return 'Successfully'
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }
  /**
   * Creates a symbolic link
   * @param filename the file for which the symbolic link is created
   * @returns A `String` that either contains 'Successfully' or an error message
   */
  public async create_symlink(filename: string) {
    try {
      return await this.ssh.exec('ln -s /etc/init.d/' + filename + ' /etc/rc.d/', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(() => {
        return 'Successfully'
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }
  /**
   * Creates the bootapplication
   * @returns A `String` that either contains 'Successfully' or an error message
   */
  public async put_init() {
    try {
      return await this.ssh.execCommand("echo '#!/bin/sh\n\npython3 /home/user/python_bootapplication/lib/runtimeCC.py &\nstty -F /dev/ttySTM1 cstopb brkint -icrnl -ixon -opost -isig icanon -iexten -echo' > /etc/init.d/S99_python_runtime").then(() => {
        return 'Successfully';
      });
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Changes the password
   *@returns A `String` that either contains 'Successfully' or an error message
   */
  public async change_password() {
    try {
      await this.ssh_connection_without_key().then(async () => {
        return await this.ssh.execCommand("echo -e \'" + this.password + "\n" + this.password + "\' | passwd").then(() => {
          return 'Successfully';
        });
      });
    }
    catch (error: any) {
      return 'Error: ' + error.message
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
      return await this.ssh.exec('killall python3', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }



  /**
   * Requirements: An existing SSH connection
   * 
   * @param callback the switch status is located in Buffer[10]
   * 
   * `1` => Run, `2` => Stop, `3` => Reset
   * 
   * @returns the `state` of the slideswitch, can be run or stop or a `String` containing an error message
   */
  public async read_switch_status(callback: (data: Buffer[]) => void) {
    try {
      this.ssh.exec('cat /dev/input/event0', [''], {
        cwd: '',
        onStdout(chunk: any[]) {
          callback(chunk)
        },
        onStderr(chunk: any) {
          callback(chunk)
        },
      })

      return await this.ssh.exec('/etc/config-tools/get_run_stop_switch_value', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /** A function for reading the logs.
   * 
   * @param callback A Function that will be executed if the log file changes content.
   * @returns a `Buffer` that contains the content of the file or a `String` containing an error message
   */
  public async read_log(callback: (data: Buffer) => void) {
    try {
      await this.ssh.exec('tail -F /home/user/python_bootapplication/errorLog', [''], {
        cwd: '',
        onStdout(chunk: any) {
          callback(chunk)
        },
        onStderr(chunk: any) {
          callback(chunk)
        },
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }


  /**
   * Requirements: An existing SSH connection
   * 
   * @returns Either a `String` containing an error message or the result returned by the ssh.exec() function
   */
  public async kill_all_tails() {
    try {
      return await this.ssh.exec('killall tail', [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * @returns Either a `String` containing an error message or the result returned by the ssh.exec() function
   */
  public async kill_all_cat() {
    try {
      return await this.ssh.execCommand('killall cat').then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * @param path the absolute path to the file
   * @returns A `String` containing the content of the file
   */
  public async read_file_content(path: string) {
    return await this.ssh.exec('cat ' + path, [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
      return result
    })
  }

  /**
   * Requirements: An existing SSH connection
   * 
   * @returns Either a `String` containing an error message or the result returned by the ssh.dispose() function
   */
  public async disconnect_ssh() {
    try {
      return await this.ssh.dispose()
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }
  /**
   * Updates the time on the CC100
   * @param timestamp A Timestamp with the format MMDDHHmmYYYY.ss
   * @returns Either a `String` containing an error message or the result returned by the ssh.exec() function
   */
  public async update_time(timestamp: any) {
    try {
      return await this.ssh.exec('date ' + timestamp, [''], { cwd: '/.', stream: 'stdout', options: { pty: true } }).then(function (result: any) {
        return result
      })
    }
    catch (error: any) {
      return 'Error: ' + error.message
    }
  }
}