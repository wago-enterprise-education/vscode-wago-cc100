import subprocess
import time
import select
import os
import logging
from datetime import datetime, timezone 

event0 = "/dev/input/event0"
errorMain = False
oldValue = 0

DOUT_DATA = "/sys/kernel/dout_drv/DOUT_DATA"
OUT_VOLTAGE1_RAW = "/sys/bus/iio/devices/iio:device0/out_voltage1_raw"
OUT_VOLTAGE2_RAW = "/sys/bus/iio/devices/iio:device1/out_voltage2_raw"

LED_RUN_GR = "/dev/leds/run-green/brightness"
LED_RUN_RED = "/dev/leds/run-red/brightness"

LOG = "/home/user/python_bootapplication/errorLog"
SIGNAL_STOP = 19
SIGNAL_RESUME = 18
DELAY = 0.5

switchValue = 0
start_time = -1
procSwitch = None

# function to check if output from event0 is iterable as int, else return 0 as int
def checkIfIterable(value):
    try:
        iter(value)
        valueInt = int(value)
        return valueInt
    except TypeError:
        return 0
    except ValueError:
        return 0

def write_to_file(filename, data):
    with open(filename, 'w') as file:
        file.write(str(data))

# function to reset outputs, if necssesary
def resetoutput():
    write_to_file(DOUT_DATA, 0)
    write_to_file(OUT_VOLTAGE1_RAW, 0)
    write_to_file(OUT_VOLTAGE2_RAW, 0)

# functions to set the RUN_LED to red/green 
def RunGreen():
    write_to_file(LED_RUN_GR, 1)
    write_to_file(LED_RUN_RED, 0)
    
def RunRed():
    write_to_file(LED_RUN_RED, 1)
    write_to_file(LED_RUN_GR, 0)
    
def RunRedBlink():
    RunRed()
    time.sleep(DELAY)
    write_to_file(LED_RUN_RED, 0)
    time.sleep(DELAY)

# execute subprocess (python-script) and isolate switch-value, 
# in case of already running simulator
def ExecImport():
    global procSwitch
    procSwitch = subprocess.Popen(["python3", "-u", "/home/user/python_bootapplication/lib/importbinascii.py"], text=True, start_new_session=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
# check type of event0, read stdout-stream out of 'importbinascii.py', if possible
def getSwitchValue():
    global oldValue
    if os.path.isfile(event0):
        ExecImport()
    ready, _, _ = select.select([procSwitch.stdout], [], [], DELAY)  
    if ready:
        stdout_line = checkIfIterable(procSwitch.stdout.readline())
        if (stdout_line != None):
            oldValue = stdout_line 
    return oldValue

def reset():
    global start_time
    global errorMain
    global run
    logger.info("reset main.py")
    start_time = time.time()
    RunRed()
    resetoutput()
    errorMain = False
    run = False

# set timezone 
current_time_utc = datetime.now(timezone.utc)
# add 2h to utc-time, to get cest-format
formatted_hour = '{:02d}'.format((int(current_time_utc.strftime('%H')) + 2) % 24)

datefmt1 = "{}:%M:%S"

# remove old log-file
if os.path.isfile(LOG):
    os.remove(LOG)

# init logger to documentate info and error
logger = logging.getLogger('logger')
logger.setLevel(logging.DEBUG)
handler = logging.FileHandler(filename=LOG)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s', datefmt1.format(formatted_hour))
handler.setFormatter(formatter)
logger.addHandler(handler)

subprocess.run('kill $(pidof codesys3)', capture_output=True, shell=True)
codesys = True
while codesys:
    time.sleep(DELAY)
    try:
        output = subprocess.check_output('pidof codesys3', shell=True, text=True)
    except:
        codesys = False

ExecImport()
# init outputs
resetoutput()

run = False
# basic loop for the runtime
while True:
    if not run:
        run = True
        stopped = False
        # execute subprocess (bash-script) and isolate switch-value out of string, 
        # in case of new started simulator
        if switchValue == 0:
            proc1 = subprocess.Popen(["/etc/config-tools/get_run_stop_switch_value"], start_new_session=True, stdout=subprocess.PIPE)
            state = str(proc1.stdout.readline())
            if "stop" in state:  
                RunRed()      
                switchValue = 2
            elif "run" in state: 
                RunGreen()        
                switchValue = 1 
            oldValue = switchValue 
          
        procRun = subprocess.Popen(["python3", "/home/user/python_bootapplication/main.py"], start_new_session=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stopped = True
        procRun.send_signal(SIGNAL_STOP)

        # executed while as long as main.py is running (returncode 'none')
        while procRun.returncode == None: 
            switchValue = getSwitchValue()
            # check state of proc, necessary to restart proc                
            poll = procRun.poll()
            # reset outputs and kill 'main.py', if reset is triggered for at least 5s
            if (switchValue == 3):
                calcTime = (time.time() - start_time)
                if (calcTime >= 5):
                    procRun.kill()
                    reset()
            # stop running 'main.py', getting ready to restart script
            elif (switchValue == 2):
                start_time = time.time()
                RunRed()
                stopped = True
                procRun.send_signal(SIGNAL_STOP)
            # restart stopped 'main.py' at paused codeline
            elif stopped and (switchValue == 1):
                logger.info("started main.py")
                RunGreen()
                procRun.send_signal(SIGNAL_RESUME)
                stopped = False

        # exeptionhandling, if an error occured while running 'main.py'
        if  procRun.stderr is not None:
            stderr_output = procRun.stderr.read()
            if stderr_output:
                errorMain = True
                procRun.kill()
                resetoutput()
                logger.error(stderr_output.decode())
                
    switchValue = getSwitchValue()
    # run RUN_LED, if error in 'main.py' is occured
    if errorMain:
        RunRedBlink()
    if switchValue == 1:
        if not errorMain:
            RunGreen()
    elif (switchValue == 2): 
        if not errorMain:
            RunRed()
        start_time = time.time()   
    elif (switchValue == 3):
        calcTime = (time.time() - start_time)
        if (calcTime >= 5):
            reset()    