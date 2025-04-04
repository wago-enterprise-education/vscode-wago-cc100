import binascii
import sys

switchvalue = "0"

def hexdump():
    switchvalue1 = 0
    with open('/dev/input/event0', 'rb') as f:
        while True:
            zeile = f.read(16)
            if not zeile:
                break
            hex_string = binascii.hexlify(zeile).decode('ascii')
            switchvalue = hex_string[21:22]

            if (switchvalue != "0") and (switchvalue != switchvalue1):
                switchvalue1 = switchvalue
                out = switchvalue
                print(out)
                sys.stdout.flush()

hexdump()