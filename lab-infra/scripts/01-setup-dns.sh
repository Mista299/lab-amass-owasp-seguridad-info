#!/usr/bin/env bash
# =============================================================================
# LAB-INFRA · Montaje del servidor DNS autoritativo del laboratorio
# Ejecutar DENTRO de la VM "dns-authoritative" (Debian/Ubuntu minimal)
#
#   VM_IP=192.168.56.101 sudo ./01-setup-dns.sh
#
# Resultado: BIND9 sirviendo la zona autoritativa "lab.local" en 192.168.56.101
# =============================================================================
set -euo pipefail

VM_IP="${VM_IP:-192.168.56.101}"
LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZONE_DIR="${LAB_DIR}/dns"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------------------
log "1/6 Verificando el sistema y la IP de la VM"
if [[ "$(id -u)" -ne 0 ]]; then
  echo "Este script necesita privilegios de root." >&2
  exit 1
fi
ip -4 addr show | grep -q "${VM_IP}" || warn "La VM no tiene ${VM_IP} asignada. Revisa el adaptador host-only."
ip -4 addr show | grep "inet ${VM_IP}" || true

# ---------------------------------------------------------------------------
log "2/6 Instalando BIND9 y utilidades"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq bind9 bind9-utils bind9-dnsutils dnsutils net-tools curl jq

# ---------------------------------------------------------------------------
log "3/6 Deshabilitando systemd-resolved (secuestra el puerto 53)"
if systemctl is-active --quiet systemd-resolved; then
  systemctl disable --now systemd-resolved
  rm -f /etc/resolv.conf
  ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf 2>/dev/null || true
  echo "nameserver ${VM_IP}" > /etc/resolv.conf
  warn "systemd-resolved detenido. /etc/resolv.conf apunta a ${VM_IP}."
fi

# ---------------------------------------------------------------------------
log "4/6 Copiando las zonas al directorio de BIND"
install -m 0644 "${ZONE_DIR}/db.lab.local"   /etc/bind/db.lab.local
install -m 0644 "${ZONE_DIR}/db.192.168.56"  /etc/bind/db.192.168.56

# ---------------------------------------------------------------------------
log "5/6 Generando la configuración de named"
cat > /etc/bind/named.conf.local <<EOF
// ============================================================
// Laboratorio OWASP Amass · zona ficticia lab.local
// Generado por 01-setup-dns.sh — NO usar en producción
// ============================================================

acl "laboratorio" {
    192.168.56.0/24;
    127.0.0.0/8;
    ::1;
};

options {
    directory "/var/cache/bind";
    listen-on { ${VM_IP}; 127.0.0.1; };
    listen-on-v6 { ::1; };
    allow-query { "laboratorio"; };
    allow-transfer { "laboratorio"; };   // AXFR permitido: el laboratorio lo necesita
    recursion yes;
    allow-recursion { "laboratorio"; };
    dnssec-validation no;
    listen-on-v6 { any; };
    version none;
};

zone "lab.local" {
    type master;
    file "/etc/bind/db.lab.local";
    allow-update { "laboratorio"; };
    notify no;
};

zone "56.168.192.in-addr.arpa" {
    type master;
    file "/etc/bind/db.192.168.56";
    allow-update { "laboratorio"; };
    notify no;
};
EOF

# named.conf.local ya está incluido en named.conf de Ubuntu/Debian.
grep -q "named.conf.local" /etc/bind/named.conf || \
  echo 'include "/etc/bind/named.conf.local";' >> /etc/bind/named.conf

# ---------------------------------------------------------------------------
log "6/6 Validando y arrancando named"
named-checkconf
named-checkzone lab.local /etc/bind/db.lab.local
named-checkzone 56.168.192.in-addr.arpa /etc/bind/db.192.168.56

systemctl restart named
systemctl enable named
sleep 2

# ---------------------------------------------------------------------------
log "Verificación final"
if dig @127.0.0.1 "${VM_IP}" lab.local SOA +short +timeout=3 +tries=1 >/dev/null 2>&1; then
  echo "BIND9 responde correctamente en ${VM_IP}:53"
else
  warn "BIND9 no responde. Revisa: journalctl -u named -n 50"
  exit 1
fi

echo
echo "────────────────────────────────────────────────────────────"
echo " DNS autoritativo listo en ${VM_IP}:53"
echo " Zona: lab.local  (AXFR permitido dentro de 192.168.56.0/24)"
echo " Prueba desde la VM atacante:"
echo "   dig @${VM_IP} lab.local NS"
echo "   dig @${VM_IP} dev.lab.local A"
echo "   dig @${VM_IP} -x 192.168.56.103"
echo "────────────────────────────────────────────────────────────"
