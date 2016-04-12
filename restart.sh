#!/bin/sh
echo "[INFO] Restarting Server"
pkill -f app.js
./server.sh
echo "[INFO] Restarted. "
