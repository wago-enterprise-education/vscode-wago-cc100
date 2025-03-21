from lib import CC100IO
import debugpy
 
 
debugpy.listen(("0.0.0.0",5678))
debugpy.wait_for_client
 
# Sample script for writing digital Outputs
state = True
while True:
    for output in range(1,5):
        CC100IO.digitalWrite(output, state)
        CC100IO.delay(100)
    state = not state