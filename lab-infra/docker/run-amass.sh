#!/bin/sh
# ==========================================================================
# Arranca el motor de OWASP Amass y ejecuta el comando solicitado.
#
# El motor y el cliente viven en el MISMO contenedor por dos razones:
#   1. Es el modo natural de Amass v5 ("enum" auto-arranca el motor).
#   2. Con el motor separado, el traspaso de semillas por bulk puede dejar
#      al motor en estado inconsistente (panic nil-pointer en PutAsset,
#      bug observado en v5.1.3).
#
# El script NO usa 'exec' al final, para que el motor sobreviva al comando
# y 'amass subs' pueda leer la base de datos asset.db que generó la
# enumeración.
# ==========================================================================
set -e

ENGINE_URL="${AMASS_ENGINE_URL:-http://127.0.0.1:4000}"
DOMAIN="${DOMAIN:-lab.local}"
SUBCMD="$1"; shift

if [ -z "$SUBCMD" ]; then
    echo "uso: run-amass.sh <enum|subs|track> [opciones]"
    exit 1
fi

echo "[lab] arrancando el motor de Amass en ${ENGINE_URL}..."
amass engine >/tmp/engine.log 2>&1 &
ENGINE_PID=$!

# Espera activa al health check del motor.
i=0
while [ "$i" -lt 90 ]; do
    if wget -qO- "${ENGINE_URL}/api/v1/health" 2>/dev/null | grep -q "OK"; then
        echo "[lab] motor listo tras ${i}s"
        break
    fi
    if ! kill -0 "$ENGINE_PID" 2>/dev/null; then
        echo "[lab] ERROR: el motor murió durante el arranque"
        tail -20 /tmp/engine.log
        exit 1
    fi
    i=$((i + 1))
    sleep 1
done

if [ "$i" -ge 90 ]; then
    echo "[lab] ERROR: el motor no arrancó en 90s"
    tail -20 /tmp/engine.log
    exit 1
fi

echo "[lab] ejecutando: amass ${SUBCMD} $*"
set +e
amass "${SUBCMD}" -engine "${ENGINE_URL}" "$@"
RC=$?
set -e

# Da tiempo a que el motor vacíe la base de datos antes de leerla.
sleep 2

echo ""
echo "############################################################"
echo "# RESULTADOS  (amass subs -names -ip)"
echo "############################################################"
amass subs -names -d "${DOMAIN}" -ip 2>&1 | sed 's/^/  /'

kill "$ENGINE_PID" 2>/dev/null || true
exit $RC
