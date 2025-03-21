# Authors
# Maik Rehburg <maik.rehburg@wago.com>
# Konrad Holsmoelle <konrad.holsmoelle@wago.com>
# Bjarne Zaremba <bjarne.zaremba@wago.com>
# Tobias Pape <tobias.pape@wago.com>
# Tobias Schaekel <tobias.schaekel@wago.com>
# Mattis Schrade <mattis.schrade@wago.com>
# Bekim Imrihor <bekim.imrihor@wago.com>
# Nele Stocksmeyer <nele.stocksmeyer@wago.com>
# Sascha Hahn <sascha.hahn@wago.com> 
# Danny Meihoefer <danny.meihoefer@wago.com>
# Write inputs an outputs with https://github.com/WAGO/cc100-howtos/blob/main/HowTo_Access_Onboard_IO/accessIO_CC100.py

import time
import logging


#Function to read an write the inputs and outputs
def digitalWrite(output, value):
    """
    output: Digital output to be switched
    value: Value which the selected output should be set to
    Function switches the output to the specified value.
    Function does not check the current value of the output
    Function returns True if value is written, returns False if an error occured
    """
    # Reading the outputs current state to calculate the new value in the file
    file = open(DOUT_DATA, "r")
    currentValue = int(file.read())
    file.close()

    # Addition or rather subtraction to the current state to switch the corresponding output
    # Least Significant Bit corresponds to digital output 1, the 4th bit corresponds to output 8
    # A number from 0 to 15 is written to the file
    if output == 1:
        if value:
            currentValue = currentValue | 0b0001
        else:
            currentValue = currentValue & 0b1110
    elif output == 2:
        if value:
            currentValue = currentValue | 0b0010
        else:
            currentValue = currentValue & 0b1101
    elif output == 3:
        if value:
            currentValue = currentValue | 0b0100
        else:
            currentValue = currentValue & 0b1011
    elif output == 4:
        if value:
            currentValue = currentValue | 0b1000
        else:
            currentValue = currentValue & 0b0111
    else:
        logging.warning("Output is false")

    # Writes the calculated value for the new configuration to the file on the CC100
    file = open(DOUT_DATA, "w")
    file.write(str(currentValue))
    file.close()
    # Returns True after completion
    return True


def analogWrite(output, voltage):
    """
    output: Analog output to be switched
    voltage: Voltage which the selected output should be set to
    Function switches the output to the specified voltage
    Function does not check the current value of the output
    Function returns True if value is written, returns False if an error occured
    """
    if (voltage>0 and voltage <10000):
        voltage = calibrateOut(voltage, output)
    if voltage < 0:
        voltage = 0

        # Activates the analog outputs on the CC100
    file = open(OUT_VOLTAGE1_POWERDOWN, "w")
    file.write("0")
    file.close()

    file = open(OUT_VOLTAGE2_POWERDOWN, "w")
    file.write("0")
    file.close()

    # Writes the voltage, taken from the calibration for the corresponding output,
    # for the voltage to the file for the output
    # When turning off, zero is written to the file
    if output == 1:
        file = open(OUT_VOLTAGE1_RAW, "w")
        file.write(str(voltage))
        file.close()

    elif output == 2:
        file=open(OUT_VOLTAGE2_RAW, "w")
        file.write(str(voltage))
        file.close()
        
    # Returns True after completion
    return True

def digitalRead(input):
    """
    input: Digital input to be read
    Function reads the input
    Function does not check the current value of the output
    Returns True or False depending on the value
    """

    # Reads the state of the digital inputs on the CC100
    datei = open (DIN, "r")
    value = datei.readline()
    datei.close()

    # Formats the current state into an 8-digit binary code
    value = int(value)
    value0B = format(value, "08b")

    # Calculates the position of the bit from the desired input
    inputBit = 8 - input

    # Returns the value of the state of the desired input
    # Note: Last index(read from left to right) ist the Least Significant Bit.
    if int(value0B[inputBit]) == 1:
        return True
    else:
        return False

def digitalReadWait(input, value):
    """
    input: Digital input to be checked
    value: State to be queried at the input
    Reads the specified input until the desired state is reached,
    by another Function or external factors and then returns True
    Function runs until the state is reached.
    """

    # Converts the given bool into a number
    if value:
        value = 1
    else:
        value = 0

    # Checks the input as long as it reaches the given state
    # Then ends the loop and returns True
    loop_condition = True
    while loop_condition:
        if digitalRead(input) == value:
            loop_condition = False
            return True

def analogRead(input):
    """
    input: Analog input to be switched
    Function reads the input and returns the calibrated value in mV as an Integer.
    """

    # Reads the state of the analog input on the CC100
    if input == 1:
        path=IN_VOLTAGE3_RAW
    elif input == 2:
        path=IN_VOLTAGE0_RAW

    file = open(path, "r")
    voltage = int(file.readline())
    file.close()

    return(calibrateIn(voltage, input))

def delay(iTime):
    iTime = iTime/1000
    time.sleep(iTime)

def tempRead(input):
    """
    input: PT input to be switched
    Function reads the input and returns the calibrated value in °C as an Integer.
    """
    
    if input == "PT1":
        path=IN_VOLTAGE13_RAW
    elif input == "PT2":
        path=IN_VOLTAGE1_RAW
    
    file = open(path, "r")
    voltage = int(file.readline())
    file.close()

    # Calibrates the value and returns it
    return(calibrateTemp(voltage, input))

def serialReadLine():
    """
    Reads incoming message on RS485 Port till eol
    """
    data = ""
    with open(SERIAL_PORT) as ser:
        data = ser.readline()
    return data
    

def serialReadBytes(n):
    """
    n: number of bytes to read
    Reads n incoming bytes on RS485 Port 
    """
    data = ""
    with open(SERIAL_PORT, "r") as ser:
        data = ser.read(n)
    return data


def serialWrite(message):
    """
    message: String to write
    Write message to RS485 serial interface
    returns number of written bytes  
    """
    written = -1
    with open(SERIAL_PORT, "w") as ser:
        written = ser.write(message)
    return written


# Output calibration from: https://github.com/WAGO/cc100-howtos/blob/main/HowTo_Access_Onboard_IO/accessIO_CC100.py
def readCalibriationData():
    """
    Reads out the data of the calibrationdata from the CC100
    """
    global calib_data
    filename="/home/ea/cal/calib"
    
    file = open(CALIB_DATA, "r")
    
    calib_data = file.readlines()[1:]    
    file.close()

def getCalibrationData(value):
    """
    Returns the calibrationdata for the required row of the table
    """
    return calib_data[value].rstrip().split(' ', 4)

def calcCalibrate(val_uncal, calib):
    """
    Calculates the value of the voltage for the required output
    """
    x1=int(calib[0])
    y1=int(calib[1])
    x2=int(calib[2])
    y2=int(calib[3])

    val_cal=(y2-y1)*int(val_uncal-x1)
    val_cal=val_cal/(x2-x1)
    val_cal=val_cal+y1

    return int(val_cal)

def calibrateOut(iVoltage, iOutput):
    """
    iVoltage: Voltage to be applied to the input
    iOutput: Output which should be switched

    Returns the value which is to be written with the specified voltage
    """
    
    readCalibriationData()
    # Takes a different set of calibration data depending on the output
    if iOutput == 1:
        cal_ao = getCalibrationData(4)
    elif iOutput == 2:
        cal_ao = getCalibrationData(5)
    # Calculates and returns the value
    return calcCalibrate(iVoltage, cal_ao)

def calibrateIn(iValue, iInput):
    """
    iValue: Value given for the file from the output
    iInput: Input at which the value was read
    """
    readCalibriationData()
    if iInput == 1:
        cal_ai = getCalibrationData(2)
    if iInput == 2:
        cal_ai = getCalibrationData(3)
    #Returns the calculated value 
    return calcCalibrate(iValue, cal_ai)

def calibrateTemp(iValue, iInput):
    """
    iValue: Value given for the file from the output
    iInput: Input at which the value was read
    """
    readCalibriationData()
    if iInput == "PT1":
        cal_Temp = getCalibrationData(0)
    if iInput == "PT2":
        cal_Temp = getCalibrationData(1)
    #Returns the calculated value in °C
    return (calcCalibrate(iValue, cal_Temp)-1000)/(3.91)

def osIsDocker():
    '''Returns True if the method is run by CC100Interface-Docker'''
    os_data = open(OS_VERSION, "r")
    lines = os_data.readlines()
    for line in lines:
        if line.strip('\n') == 'NAME="Ubuntu"':
            os_data.close()
            return True
    os_data.close()        
    return False
    
#data paths on CC100
DOUT_DATA = "/sys/kernel/dout_drv/DOUT_DATA"
OUT_VOLTAGE1_POWERDOWN = "/sys/bus/iio/devices/iio:device0/out_voltage1_powerdown"
OUT_VOLTAGE2_POWERDOWN = "/sys/bus/iio/devices/iio:device1/out_voltage2_powerdown"
OUT_VOLTAGE1_RAW = "/sys/bus/iio/devices/iio:device0/out_voltage1_raw"
OUT_VOLTAGE2_RAW = "/sys/bus/iio/devices/iio:device1/out_voltage2_raw"
DIN = "/sys/devices/platform/soc/44009000.spi/spi_master/spi0/spi0.0/din"
IN_VOLTAGE3_RAW = "/sys/bus/iio/devices/iio:device3/in_voltage3_raw"
IN_VOLTAGE0_RAW = "/sys/bus/iio/devices/iio:device3/in_voltage0_raw"
IN_VOLTAGE13_RAW = "/sys/bus/iio/devices/iio:device2/in_voltage13_raw"
IN_VOLTAGE1_RAW = "/sys/bus/iio/devices/iio:device2/in_voltage1_raw"
CALIB_DATA = "/etc/calib"
OS_VERSION = "/etc/os-release"
SERIAL_PORT = "/dev/ttySTM1"
if osIsDocker():
    #data paths on the Docker-Container
    DOUT_DATA = "/home/ea/dout/DOUT_DATA"
    OUT_VOLTAGE1_POWERDOWN = "/home/ea/anout/40017000.dac:dac@1/iio:device0/out_voltage1_powerdown"
    OUT_VOLTAGE2_POWERDOWN = "/home/ea/anout/40017000.dac:dac@2/iio:device1/out_voltage2_powerdown"
    OUT_VOLTAGE1_RAW = "/home/ea/anout/40017000.dac:dac@1/iio:device0/out_voltage1_raw"
    OUT_VOLTAGE2_RAW = "/home/ea/anout/40017000.dac:dac@2/iio:device1/out_voltage2_raw"
    DIN = "/home/ea/din/din"
    IN_VOLTAGE3_RAW = "/home/ea/anin/48003000.adc:adc@100/iio:device3/in_voltage3_raw"
    IN_VOLTAGE0_RAW = "/home/ea/anin/48003000.adc:adc@100/iio:device3/in_voltage0_raw"
    IN_VOLTAGE13_RAW = "/sys/bus/iio/devices/iio:device2/in_voltage13_raw"
    IN_VOLTAGE1_RAW = "/sys/bus/iio/devices/iio:device2/in_voltage1_raw"
    CALIB_DATA = "/home/ea/cal/calib"
    OS_VERSION = "/etc/os-release"
