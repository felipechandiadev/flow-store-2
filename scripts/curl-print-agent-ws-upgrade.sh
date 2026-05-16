#!/usr/bin/env bash
# Prueba el HTTP Upgrade a WebSocket (como el navegador), no una sesión WS completa.
# Uso:
#   ./scripts/curl-print-agent-ws-upgrade.sh
#   HOST=127.0.0.1 PORT=14567 ORIGIN=http://localhost:3022 TIMEOUT=5 ./scripts/curl-print-agent-ws-upgrade.sh
set -euo pipefail
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-14567}"
ORIGIN="${ORIGIN:-http://localhost:3022}"
TIMEOUT="${TIMEOUT:-5}"
KEY="$(openssl rand -base64 16)"

echo "→ GET http://${HOST}:${PORT}/ (Upgrade: websocket)"
echo "  Origin: ${ORIGIN}"
echo

# Sin esto, curl puede usar HTTP_PROXY y colgarse con 127.0.0.1 (0 bytes hasta timeout).
curl --noproxy '*' --max-time "${TIMEOUT}" -sS -i --http1.1 \
  -H "Host: ${HOST}:${PORT}" \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: ${KEY}" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Origin: ${ORIGIN}" \
  "http://${HOST}:${PORT}/"

echo
echo
echo "Interpretación rápida:"
echo "  101 Switching Protocols  → el agente aceptó el handshake (puerto y Origin OK)."
echo "  403 Forbidden           → revisar «orígenes permitidos» en Print Service (debe coincidir con Origin)."
echo "  timeout / sin bytes     → sin listener, firewall, o curl yendo por proxy (este script usa --noproxy '*')."
