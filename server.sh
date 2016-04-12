#!/bin/sh
echo "[MESSAGE] if you want to exit gcm_apns_library, commandline : pkill -f app.js or pkill -f node"
node ./app.js > log.txt 2> log.txt &
echo "[INFO] server started."
