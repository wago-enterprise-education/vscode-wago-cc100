const fs = require("fs");
const { NodeSSH } = require("node-ssh");
const {
    Client,
    utils: { generateKeyPair },
  } = require("ssh2");
const { exec } = require("child_process");
const { promisify } = require("util");
const { homedir, userInfo } = require("os");
const path = require("path");

export class cc100Engine  {
  private ssh = new NodeSSH();
  private ssh2 = new Client();


    /**
     * Requirements: An existing SSH connection
     *
     * This method turns the `RUN` LED off
     *
     * @returns 'Success' or the 'error' message in a `String`
     */
    public async turn_off_run_led() {
        try {
        await this.ssh.exec("echo 0 >> /dev/leds/run-green/brightness", [""], {
            cwd: "/.",
            stream: "stdout",
            options: { pty: true },
        });
        await this.ssh.exec("echo 0 >> /dev/leds/run-red/brightness", [""], {
            cwd: "/.",
            stream: "stdout",
            options: { pty: true },
        });
        return "Success";
        } catch (error: any) {
        return "Error: " + error.message;
        }
    }

    /**
     * Requirements: An existing SSH connection
     *
     * @returns the complete PEA and PAA from the CC100, the sequence is: `DI`, `DO`, `AI1`, `AI2`, `AO1`, `AO2`, `PT1`, `PT2`, `SYS LED green`, `SYS LED red`, `RUN LED green`, `RUN LED red`, `USR LED green`, `USR LED red`, `LNK ACT1 LED`, `LNK ACT2 LED`, `µSD LED`
     */
    public async read_CC100() {
        try {
        return await this.ssh
            .exec(
            "cat /sys/devices/platform/soc/44009000.spi/spi_master/spi0/spi0.0/din " + // DI
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
                "/dev/leds/led-mmc/brightness &&" + // µSD LED
                'ethtool ethX1 | grep "Link detected*" &&' + // LNK ACT1 | Das Auslesen der Ethernet-LEDs hat die zyklische Abfrage in IO-Check verdoppelt
                'ethtool ethX2 | grep "Link detected*"', // LNK ACT2
            [""],
            { cwd: "/.", stream: "stdout", options: { pty: true } }
            )
            .then(async (result: any) => {
            return result;
            });
        } catch (error: any) {
        return "Error: " + error.message;
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
        const path = "/sys/kernel/dout_drv/DOUT_DATA";

        try {
        await this.ssh.execCommand("echo " + status + " >> " + path);
        return await this.ssh
            .exec("cat " + path, [""], {
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
     * @returns a table containing the calibration data for the analog ports or a `String` containing an error
     */
    public async analog_calib_data() {
        try {
        return await this.ssh
            .exec("cat /etc/calib", [""], {
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
     * @param pin '1' write to AO1, '2' write to AO2
     *
     * @param value value between 0 and 4095 (12 bit value)
     *
     * @returns A 12 bit value which represents the output voltage from the addressed pin or a `String` containing an error
     */
    public async analog_write(pin: number, value: number) {
        const dir = "/sys/bus/iio/devices/";

        try {
        if (pin == 1) {
            await this.ssh.execCommand(
            "echo 0 >> " + dir + "iio:device0/out_voltage1_powerdown"
            );
            await this.ssh.execCommand(
            "echo " + value + " >> " + dir + "iio:device0/out_voltage1_raw"
            );
            return await this.ssh
            .exec("cat " + dir + "iio:device0/out_voltage1_raw", [""], {
                cwd: "/.",
                stream: "stdout",
                options: { pty: true },
            })
            .then(function (result: any) {
                return result;
            });
        } else if (pin == 2) {
            await this.ssh.execCommand(
            "echo 0 >> " + dir + "iio:device1/out_voltage2_powerdown"
            );
            await this.ssh.execCommand(
            "echo " + value + " >> " + dir + "iio:device1/out_voltage2_raw"
            );
            return await this.ssh
            .exec("cat " + dir + "iio:device1/out_voltage2_raw", [""], {
                cwd: "/.",
                stream: "stdout",
                options: { pty: true },
            })
            .then(function (result: any) {
                return result;
            });
        }
        } catch (error: any) {
        return "Error: " + error.message;
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
        return await this.ssh
            .exec(
            "stty -F /dev/ttySTM1 cstopb brkint -icrnl -ixon -opost -isig icanon -iexten -echo",
            [""],
            { cwd: "/.", stream: "stdout", options: { pty: true } }
            )
            .then(function () {
            return "Success!";
            });
        } catch (error: any) {
        return "Error: " + error.message;
        }
    }

    
    /**
     * This function reads the received data from serial communication with RS485 and only needs to be called once
     *
     * The received data is in the Buffer variable
     */
    public async serial_read(callback: (dataBuffer: Buffer) => void) {
        await this.ssh2.on("ready", () => {
        this.ssh2.shell((err: any, stream: any) => {
            if (err) throw err;

            stream
            .on("close", () => {
                this.ssh2.end();
            })
            .on("data", (data: Buffer) => {
                callback(data);
            });

            // Hier kannst du Befehle senden, wenn der Stream bereit ist
            stream.write("cat /dev/ttySTM1\n");
        });
        });
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
        await this.ssh
            .exec("echo " + '"' + serialData + '"' + " >> /dev/ttySTM1", [""], {
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
     * @param callback the switch status is located in Buffer[10]
     *
     * `1` => Run, `2` => Stop, `3` => Reset
     *
     * @returns the `state` of the slideswitch, can be run or stop or a `String` containing an error message
     */
    public async read_switch_status(callback: (data: Buffer[]) => void) {
        try {
        this.ssh.exec("cat /dev/input/event0", [""], {
            cwd: "",
            onStdout(chunk: any[]) {
            callback(chunk);
            },
            onStderr(chunk: any) {
            callback(chunk);
            },
        });

        return await this.ssh
            .exec("/etc/config-tools/get_run_stop_switch_value", [""], {
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

    /** A function for reading the logs.
     *
     * @param callback A Function that will be executed if the log file changes content.
     * @returns a `Buffer` that contains the content of the file or a `String` containing an error message
     */
    public async read_log(callback: (data: Buffer) => void) {
        try {
        await this.ssh.exec(
            "tail -F /home/user/python_bootapplication/errorLog",
            [""],
            {
            cwd: "",
            onStdout(chunk: any) {
                callback(chunk);
            },
            onStderr(chunk: any) {
                callback(chunk);
            },
            }
        );
        } catch (error: any) {
        return "Error: " + error.message;
        }
    }
}