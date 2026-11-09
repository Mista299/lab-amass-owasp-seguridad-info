#!/usr/bin/env bash
# =============================================================================
# LAB-INFRA · Preparación de la VM atacante (Amass + Docker)
# Ejecutar DENTRO de la VM "attacker" (Kali/Ubuntu) con privilegios de root.
#
#   sudo ./04-setup-attacker.sh
#
# Resultado:
#   - Imagen oficial owaspamass/amass:latest descargada y etiquetada
#   - Estructura de trabajo ~/amass-lab con configs, wordlists y results
#   - Verificación de la versión y de los subcomandos
# =============================================================================
set -euo pipefail

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${WORK:-$HOME/amass-lab}"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m[✓] %s\033[0m\n' "$*"; }

[[ "$(id -u)" -eq 0 ]] || { echo "Necesita root." >&2; exit 1; }

# ---------------------------------------------------------------------------
log "1/5 Verificando/instalando Docker"
if ! command -v docker >/dev/null 2>&1; then
  warn "Docker no está instalado. Instalando desde el repositorio oficial."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
ok "Docker: $(docker --version)"

# ---------------------------------------------------------------------------
log "2/5 Descargando la imagen oficial de OWASP Amass"
docker pull owaspamass/amass:latest
docker tag owaspamass/amass:latest amass:latest
ok "Imagen lista: amass:latest"

# ---------------------------------------------------------------------------
log "3/5 Preparando el directorio de trabajo"
mkdir -p "${WORK}"/{configs,wordlists,results,scripts,logs}
cp -f "${LAB_DIR}/configs/config.yaml"       "${WORK}/configs/config.yaml"
cp -f "${LAB_DIR}/configs/datasources.yaml"  "${WORK}/configs/datasources.yaml"
cp -f "${LAB_DIR}/wordlists/"*.txt           "${WORK}/wordlists/"
chmod 644 "${WORK}/configs/"*.yaml
ok "Estructura en ${WORK}"

# La ruta del wordlist en config.yaml es relativa al config; se ajusta.
if ! grep -q "wordlists/subdomains-lab.txt" "${WORK}/configs/config.yaml"; then
  sed -i 's#"./wordlists/subdomains-lab.txt"#"../wordlists/subdomains-lab.txt"#g' \
    "${WORK}/configs/config.yaml"
fi

# ---------------------------------------------------------------------------
log "4/5 Instalando utilidades de análisis"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq dnsutils jq curl netcat-openbsd tree
ok "Utilidades listas (dig, jq, curl, nc, tree)"

# ---------------------------------------------------------------------------
log "5/5 Verificación de Amass"
echo
echo "--- Versión ---"
docker run --rm amass:latest -version
echo
echo "--- Subcomandos ---"
docker run --rm amass:latest -h 2>&1 | head -20
echo
echo "────────────────────────────────────────────────────────────"
echo " VM atacante lista. Siguiente paso:"
echo "   1) Configurar DNS:  sudo ./03-aislar-salida.sh"
echo "   2) Probar:          dig @192.168.56.101 dev.lab.local A"
echo "   3) Ejecutar lab:    cd ${WORK} && ./scripts/run-lab.sh"
echo "────────────────────────────────────────────────────────────"
