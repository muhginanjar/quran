#!/bin/sh
# Jalankan Quran Offline di server lokal: ./serve.sh [port]
cd "$(dirname "$0")" || exit 1
PORT="${1:-8080}"
echo "Quran Offline  →  http://localhost:$PORT"
python3 -m http.server "$PORT"
