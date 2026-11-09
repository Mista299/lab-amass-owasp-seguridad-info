#!/usr/bin/env bash
# =============================================================================
#  LAB-INFRA · Fuerza bruta DNS sobre el laboratorio
#
#  Por que este script existe
#  --------------------------
#  En OWASP Amass v5.1.3 hay dos limitaciones reales:
#
#   1. La opcion "-w" (wordlist) NO genera consultas DNS. El plugin
#      DNS-Subdomains solo recorre registros NS/MX y consulta SRV de una
#      lista interna de prefijos estandar. La wordlist solo se usa para
#      las "alterations" del plugin FQDN-Alterations.
#
#   2. La opcion "-nf" (nombres ya conocidos) SI funciona, pero siempre
#      usa el endpoint "bulk" de la API, que entra en panic por puntero
#      nulo (engine/api/server/v1/utils.go:91) cuando la base de datos no
#      tiene todavia el activo. Ese panic tumba el motor.
#
#  Solucion: se ejecuta "-nf" con UN SOLO nombre por invocacion. Con un
#  unico elemento el cliente usa CreateAsset (individual) en vez del bulk,
#  y no hay panic. Asi el DNS autoritativo valida cada candidato y Amass
#  lo registra en el grafo.
#
#  Uso:
#     ./start.sh --brute            ejecuta la fuerza bruta completa
#     ./start.sh --brute 10         limita a 10 candidatos
#     ./start.sh --brute quick      solo los 5 primeros (demo rapida)
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAB_DIR="${SCRIPT_DIR}/lab-infra"
COMPOSE="${LAB_DIR}/docker/compose.yaml"
WORDLIST="${LAB_DIR}/wordlists/subdomains-lab.txt"
DOMAIN="${DOMAIN:-lab.local}"

# --- Colores -----------------------------------------------------------------
if [[ -t 1 ]]; then
    C_OK=$'\033[1;32m'; C_ERR=$'\033[1;31m'; C_WARN=$'\033[1;33m'
    C_INFO=$'\033[1;36m'; C_DIM=$'\033[0;37m'; C_OFF=$'\033[0m'
else
    C_OK=""; C_ERR=""; C_WARN=""; C_INFO=""; C_DIM=""; C_OFF=""
fi

log()  { printf '%s==>%s %s\n' "${C_INFO}" "${C_OFF}" "$*"; }
ok()   { printf '%s [✓]%s %s\n' "${C_OK}"   "${C_OFF}" "$*"; }
warn() { printf '%s [!]%s %s\n' "${C_WARN}" "${C_OFF}" "$*"; }
err()  { printf '%s [✗]%s %s\n' "${C_ERR}"  "${C_OFF}" "$*" >&2; }
dim()  { printf '%s     %s%s\n' "${C_DIM}" "$*" "${C_OFF}"; }

compose() { docker compose -f "$COMPOSE" "$@"; }

# --- Argumentos --------------------------------------------------------------
MODE="${1:-full}"
LIMIT=0
case "$MODE" in
    quick) LIMIT=5 ;;
    full)  LIMIT=0 ;;
    *)
        if [[ "$MODE" =~ ^[0-9]+$ ]]; then
            LIMIT="$MODE"
        else
            LIMIT=0
        fi
        ;;
esac

# ----wordlist ---------------------------------------------------------------
if [[ ! -f "$WORDLIST" ]]; then
    err "No encuentro el wordlist: ${WORDLIST}"
    exit 1
fi

mapfile -t CANDIDATES < <(grep -vE '^\s*(#|$)' "$WORDLIST")
if [[ "$LIMIT" -gt 0 && "${#CANDIDATES[@]}" -gt "$LIMIT" ]]; then
    CANDIDATES=("${CANDIDATES[@]:0:$LIMIT}")
fi

log "Fuerza bruta DNS · ${#CANDIDATES[@]} candidatos · dominio ${DOMAIN}"
dim "Wordlist: ${WORDLIST}"

# --- Motor -------------------------------------------------------------------
ensure_up() {
    if ! compose ps --status running 2>/dev/null | grep -q "amass-lab-dns"; then
        log "Levantando el laboratorio"
        compose up -d
        sleep 3
    fi
}

wait_ready() {
    local i=0
    while [[ $i -lt 90 ]]; do
        if compose exec -T amass \
            wget -qO- http://127.0.0.1:4000/api/v1/health 2>/dev/null | grep -q "OK"; then
            return 0
        fi
        sleep 1
        ((i++))
    done
    return 1
}

ensure_up

# --- Paso 1: enumeracion base (sin wordlist) --------------------------------
log "Paso 1/2 · Enumeración base del dominio"
dim "Resuelve el apex, los registros NS/MX y los SRV"
compose up -d amass
if ! wait_ready; then
    err "El motor no arrancó"
    compose logs amass | tail -20
    exit 1
fi
ok "Motor listo"

compose exec -T amass amass enum \
    -engine http://127.0.0.1:4000 \
    -active -d "${DOMAIN}" -p 80,443 -timeout 3 2>&1 \
    | grep -vE '^\s*[0-9]+ / [0-9]+' | sed 's/^/    /' | tail -6

# --- Paso 2: un candidato por invocacion -------------------------------------
log "Paso 2/2 · Validando cada candidato contra el DNS"

CONFIRMED=0
REJECTED=0
INDEX=0

for word in "${CANDIDATES[@]}"; do
    INDEX=$((INDEX + 1))
    candidate="${word}.${DOMAIN}"

    # El nombre se inyecta como semilla individual (sin bulk -> sin panic)
    printf '%s\n' "$candidate" > /tmp/amass-seed.txt
    docker cp /tmp/amass-seed.txt amass-lab-amass:/tmp/amass-seed.txt >/dev/null 2>&1

    compose exec -T amass amass enum \
        -engine http://127.0.0.1:4000 \
        -active -nf /tmp/amass-seed.txt \
        -d "${DOMAIN}" -p 80,443 -timeout 1 >/dev/null 2>&1

    # El DNS autoritativo es quien decide
    if compose exec -T amass \
        dig +short +timeout=2 +tries=1 "@192.168.56.101" "$candidate" A 2>/dev/null \
        | grep -q .; then
        printf '    %s [✓] EXISTE\n' "$candidate"
        CONFIRMED=$((CONFIRMED + 1))
    else
        printf '    %s [✗] descartado (NXDOMAIN)\n' "$candidate"
        REJECTED=$((REJECTED + 1))
    fi
done

# --- Resultado ---------------------------------------------------------------
echo ""
log "Resultado de la fuerza bruta"
echo ""
echo "    Candidatos probados : ${#CANDIDATES[@]}"
echo "    Confirmados        : ${CONFIRMED}"
echo "    Descartados        : ${REJECTED}"
echo ""

log "Activos registrados en el grafo"
compose exec -T amass amass subs -names -d "${DOMAIN}" -ip 2>&1 | sed 's/^/    /'
echo ""

if [[ "$REJECTED" -gt 0 ]]; then
    ok "La fuerza bruta tambien DESCARTA: el DNS es el juez."
else
    warn "Ningun candidato fue descartado. Añade al wordlist nombres que no existan."
fi

echo ""
dim "Para ver todas las consultas DNS: ./start.sh --dns"
