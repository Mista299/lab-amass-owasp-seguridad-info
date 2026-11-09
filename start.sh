#!/usr/bin/env bash
# =============================================================================
#  LAB-INFRA · Levantar el laboratorio OWASP Amass con un solo comando
#
#  Uso:
#     ./start.sh              → construye, levanta y verifica
#     ./start.sh --reset      → borra la base de datos y vuelve a empezar
#     ./start.sh --stop       → detiene el laboratorio
#     ./start.sh --logs       → sigue los logs en vivo
#     ./start.sh --check      → solo verifica el estado
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAB_DIR="${SCRIPT_DIR}/lab-infra"
COMPOSE="${LAB_DIR}/docker/compose.yaml"

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

# --- Comandos ----------------------------------------------------------------
compose() { docker compose -f "$COMPOSE" "$@"; }

check_prereqs() {
    log "Verificando requisitos"
    command -v docker >/dev/null 2>&1 || {
        err "Docker no está instalado."
        dim "Instalación: https://docs.docker.com/engine/install/"
        dim "En Arch: sudo pacman -S docker && sudo systemctl enable --now docker"
        exit 1
    }
    ok "Docker: $(docker --version | cut -d, -f1)"

    docker compose version >/dev/null 2>&1 || {
        err "Docker Compose v2 no está disponible."
        dim "En Arch: sudo pacman -S docker-compose"
        exit 1
    }
    ok "Docker Compose: $(docker compose version --short)"

    docker info >/dev/null 2>&1 || {
        err "No se puede conectar al daemon de Docker."
        dim "Prueba: sudo systemctl start docker"
        dim "Si estás en el grupo 'docker' pero falla: sudo usermod -aG docker \$USER"
        dim "  (después cierra la sesión y vuelve a entrar)"
        exit 1
    }
    ok "Daemon de Docker accesible"
}

do_build() {
    log "Construyendo las imágenes (la primera vez tarda ~2 min)"
    if compose build --quiet 2>&1 | tail -5; then
        ok "Imágenes construidas"
    else
        err "Falló la construcción de las imágenes."
        compose build 2>&1 | tail -25
        exit 1
    fi
}

do_start() {
    log "Levantando el laboratorio"
    compose up -d
    ok "Contenedores iniciados"
}

# Asegura que los contenedores existen y estan arriba.
ensure_up() {
    if ! compose ps --status running 2>/dev/null | grep -q "amass-lab-dns"; then
        log "Los contenedores no estan arriba; levantandolos"
        compose up -d
        sleep 3
    fi
}

wait_ready() {
    ensure_up
    log "Esperando a que el motor de Amass este listo"
    local i=0
    while [[ $i -lt 90 ]]; do
        if compose exec -T amass \
            wget -qO- http://127.0.0.1:4000/api/v1/health 2>/dev/null | grep -q "OK"; then
            ok "Motor listo tras ${i}s"
            return 0
        fi
        sleep 1
        ((i++))
    done
    warn "El motor tardo mas de 90s en arrancar (es normal la primera vez)."
    dim "Revisa los logs: ./start.sh --logs"
    return 1
}

do_verify() {
    ensure_up
    log "Verificando el aislamiento y el DNS"

    # Espera a que el DNS acepte consultas (puede tardar un par de segundos).
    local i=0
    while [[ $i -lt 20 ]]; do
        if compose exec -T amass \
            dig +short +timeout=2 +tries=1 @192.168.56.101 lab.local A 2>/dev/null \
            | grep -q "192.168.56.101"; then
            break
        fi
        sleep 1
        ((i++))
    done

    # 1. DNS responde
    if compose exec -T amass \
        dig +short +timeout=3 +tries=1 @192.168.56.101 lab.local A 2>/dev/null \
        | grep -q "192.168.56.101"; then
        ok "DNS del laboratorio responde (192.168.56.101:53)"
    else
        err "El DNS del laboratorio no responde."
        compose logs dns | tail -15
        exit 1
    fi

    # 2. Un subdominio concreto resuelve
    if compose exec -T amass \
        dig +short +timeout=3 +tries=1 @192.168.56.101 dev.lab.local A 2>/dev/null \
        | grep -q "192.168.56.103"; then
        ok "Resolución de subdominios funciona (dev.lab.local → 192.168.56.103)"
    else
        warn "La resolución de subdominios no responde como se esperaba."
    fi

    # 2b. Un nombre inexistente debe devolver NXDOMAIN
    if compose exec -T amass \
        dig +short +timeout=3 +tries=1 @192.168.56.101 test.lab.local A 2>/dev/null \
        | grep -q .; then
        warn "test.lab.local debería NO existir (la zona lo define así)."
    else
        ok "NXDOMAIN correcto para los candidatos inexistentes"
    fi

    # 3. Internet bloqueado
    if compose exec -T amass \
        sh -c 'curl -s --max-time 5 -o /dev/null https://owasp.org' >/dev/null 2>&1; then
        err "FUGA DETECTADA: el contenedor tiene acceso a Internet."
        dim "El laboratorio no debe salir a Internet. Revisa los logs."
        exit 1
    else
        ok "Internet bloqueado (política DROP)"
    fi

    # 4. Reglas DNAT/SNAT aplicadas
    local dn
    dn=$(compose exec -T amass sh -c 'iptables -t nat -L OUTPUT -n | grep -c DNAT' 2>/dev/null | tr -d '\r\n')
    if [[ "${dn:-0}" -ge 100 ]]; then
        ok "Redirección DNS activa (${dn} reglas DNAT + SNAT)"
    else
        warn "Solo ${dn:-0} reglas DNAT aplicadas (se esperaban 106)."
    fi
}

do_enum() {
    log "Ejecutando la enumeración activa con fuerza bruta"
    dim "(dura entre 2 y 4 minutos; el motor descubre los subdominios)"
    compose up -d amass
    wait_ready
    compose logs -f amass
}

show_menu() {
    printf '\n'
    printf '%s╭──────────────────────────────────────────────────────────────╮%s\n' "${C_INFO}" "${C_OFF}"
    printf '%s│  Laboratorio OWASP Amass · listo                            │%s\n' "${C_INFO}" "${C_OFF}"
    printf '%s╰──────────────────────────────────────────────────────────────╯%s\n' "${C_INFO}" "${C_OFF}"
    printf '\n'
    printf '  %sComandos:%s\n' "${C_INFO}" "${C_OFF}"
    printf '    ./start.sh --enum      Ejecutar la enumeración (recomendado)\n'
    printf '    ./start.sh --results   Ver los resultados sin re-ejecutar\n'
    printf '    ./start.sh --dns       Ver las consultas DNS registradas\n'
    printf '    ./start.sh --logs      Seguir los logs en vivo\n'
    printf '    ./start.sh --stop      Detener el laboratorio\n'
    printf '\n'
    printf '  %sAtacante (tú):%s\n' "${C_INFO}" "${C_OFF}"
    printf '    cd lab-infra/docker\n'
    printf '    docker compose -f compose.yaml exec amass amass subs -names -d lab.local -ip\n'
    printf '\n'
}

# --- Menú principal ----------------------------------------------------------
case "${1:-}" in
    --reset)
        check_prereqs
        log "Reiniciando el laboratorio desde cero"
        compose down --remove-orphans 2>/dev/null
        # Los ficheros de la sesion los crea el contenedor como root; se borran
        # desde un contenedor auxiliar para no depender de sudo en el host.
        docker run --rm -v "${LAB_DIR}/configs:/cfg" alpine \
            sh -c 'rm -rf /cfg/session-* /cfg/*.log /cfg/asset.db*' 2>/dev/null
        ok "Base de datos limpiada"
        do_build
        do_start
        wait_ready && do_verify
        show_menu
        ;;
    --stop)
        log "Deteniendo el laboratorio"
        compose down --remove-orphans 2>/dev/null
        ok "Laboratorio detenido"
        ;;
    --logs)
        compose logs -f
        ;;
    --check)
        check_prereqs
        ensure_up
        compose ps
        do_verify
        ;;
    --enum)
        check_prereqs
        do_enum
        ;;
    --results)
        ensure_up
        log "Resultados almacenados"
        compose exec -T amass amass subs -names -d lab.local -ip 2>/dev/null
        printf '\n'
        dim "Consultas DNS registradas: $(compose logs dns 2>/dev/null | grep -c query)"
        ;;
    --dns)
        ensure_up
        log "Consultas DNS registradas"
        compose logs dns | grep "query" | sed 's/.*\[query\] //' | awk '{print $1}' | sort -u
        ;;
    "" | --help | -h)
        cat <<EOF
${C_INFO}Laboratorio OWASP Amass — 100% offline${C_OFF}

  ./start.sh              Construye, levanta y verifica el laboratorio
  ./start.sh --reset      Borra la base de datos y vuelve a empezar
  ./start.sh --enum       Ejecuta la enumeración activa con fuerza bruta
  ./start.sh --results    Muestra los resultados ya obtenidos
  ./start.sh --dns        Muestra las consultas DNS registradas
  ./start.sh --logs       Sigue los logs en vivo
  ./start.sh --check      Solo verifica el estado
  ./start.sh --stop       Detiene el laboratorio

${C_DIM}Dominio ficticio: lab.local   ·   Red: 192.168.56.0/24   ·   Sin salida a Internet${C_OFF}
EOF
        ;;
    *)
        err "Opción desconocida: $1"
        "$0" --help
        exit 1
        ;;
esac
