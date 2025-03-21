#Docker run befehl zum Mappen der Ports und dem Bindmounts
docker run --rm -d \
-v '/sys/kernel/dout_drv/DOUT_DATA:/sys/kernel/dout_drv/DOUT_DATA' \
-p 8765:5678 

#Port öffnen
Ich muss keinen Port öffnen, da keine Firewall