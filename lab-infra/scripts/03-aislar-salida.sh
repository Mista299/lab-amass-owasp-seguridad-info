#!/usr/bin/env bash
# =============================================================================
# LAB-INFRA · Aislamiento de la salida a Internet (ESTRATEGIA A)
# Ejecutar DENTRO de la VM "attacker" con privilegios de root.
#
#   sudo ./03-aislar-salida.sh
#
# Qué hace:
#   1) Bloquea todo el tráfico saliente por TCP/UDP EXCEPTO:
#        - la red 192.168.56.0/24 (el laboratorio)
#        - la red Docker (172.16.0.0/12) si se usa
#   2) Deja pasar DNS solo hacia 192.168.56.101
#   3) Verifica que Internet está bloqueado y el laboratorio funciona
#
# CON SECUENCIA DE DESBLOQUEO:
#   sudo ./03-aislar-salida.sh off
# =============================================================================
set -euo pipefail

LAB_NET="192.168.56.0/24"
LAB_DNS="192.168.56.101"
DOCKER_NET="172.16.0.0/12"
MODE="${1:-on}"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m[✓] %s\033[0m\n' "$*"; }

[[ "$(id -u)" -eq 0 ]] || { echo "Necesita root." >&2; exit 1; }

IPT=iptables
if ! command -v iptables >/dev/null 2>&1; then
  echo "Instala iptables: apt-get install -y iptables" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
if [[ "$MODE" == "off" ]]; then
  log "Desbloqueando la salida a Internet"
  $IPT -D OUTPUT -p tcp -j REJECT 2>/dev/null || true
  $IPT -D OUTPUT -p udp -j REJECT 2>/dev/null || true
  $IPT -D OUTPUT -p tcp -d "$LAB_NET" -j ACCEPT 2>/dev/null || true
  $IPT -D OUTPUT -p udp -d "$LAB_NET" -j ACCEPT 2>/dev/null || true
  $IPT -D OUTPUT -p tcp -d "$DOCKER_NET" -j ACCEPT 2>/dev/null || true
  $IPT -D OUTPUT -p udp -d "$DOCKER_NET" -j ACCEPT 2>/dev/null || true
  ok "Reglas de bloqueo eliminadas."
  exit 0
fi

# ---------------------------------------------------------------------------
log "1/4 Limpiando reglas previas del laboratorio"
$IPT -D OUTPUT -p tcp -j REJECT 2>/dev/null || true
$IPT -D OUTPUT -p udp -j REJECT 2>/dev/null || true
$IPT -D OUTPUT -p tcp -d "$LAB_NET" -j ACCEPT 2>/dev/null || true
$IPT -D OUTPUT -p udp -d "$LAB_NET" -j ACCEPT 2>/dev/null || true
$IPT -D OUTPUT -p tcp -d "$DOCKER_NET" -j ACCEPT 2>/dev/null || true
$IPT -D OUTPUT -p udp -d "$DOCKER_NET" -j ACCEPT 2>/dev/null || true

# ---------------------------------------------------------------------------
log "2/4 Permitiendo el tráfico del laboratorio (${LAB_NET}) y Docker"
$IPT -I OUTPUT 1 -p tcp -d "$LAB_NET" -j ACCEPT
$IPT -I OUTPUT 2 -p udp -d "$LAB_NET" -j ACCEPT
$IPT -I OUTPUT 3 -p tcp -d "$DOCKER_NET" -j ACCEPT
$IPT -I OUTPUT 4 -p udp -d "$DOCKER_NET" -j ACCEPT

# ---------------------------------------------------------------------------
log "3/4 Bloqueando el resto del tráfico saliente"
$IPT -A OUTPUT -p tcp -j REJECT
$IPT -A OUTPUT -p udp -j REJECT
ok "Todo el tráfico fuera de ${LAB_NET} y ${DOCKER_NET} está bloqueado."

# ---------------------------------------------------------------------------
log "4/4 Verificación"

# 4.1 Internet debe estar bloqueado
if curl -s --max-time 6 -o /dev/null https://owasp.org 2>/dev/null; then
  warn "FUGA: owasp.org responde. Revisa las reglas de iptables."
  exit 1
else
  ok "Internet bloqueado (owasp.org inaccesible)."
fi

# 4.2 DNS del laboratorio debe funcionar
if dig +short +timeout=3 +tries=1 @"$LAB_DNS" dev.lab.local A | grep -q '192.168.56.103'; then
  ok "DNS del laboratorio operativo (dev.lab.local -> 192.168.56.103)."
else
  warn "El DNS del laboratorio no responde en ${LAB_DNS}:53"
  exit 1
fi

echo
echo "────────────────────────────────────────────────────────────"
echo " Laboratorio aislado."
echo "   DNS permitido  : ${LAB_DNS}:53"
echo "   Red permitida  : ${LAB_NET}"
echo "   Internet       : BLOQUEADO"
echo "   Desbloquear    : sudo $0 off"
echo "────────────────────────────────────────────────────────────"
