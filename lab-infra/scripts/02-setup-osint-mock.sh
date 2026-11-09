#!/usr/bin/env bash
# =============================================================================
# LAB-INFRA · Montaje del servidor web "OSINT simulado"
# Ejecutar DENTRO de la VM "osint-mock" (Debian/Ubuntu minimal)
#
#   VM_IP=192.168.56.102 sudo ./02-setup-osint-mock.sh
#
# Objetivo: replicar LOCALMENTE las respuestas de las fuentes OSINT que
# Amass consulta en Internet (crt.sh, RapidDNS, Wayback, DNS history).
# Así se demuestra el modo PASIVO sin salir de la red del laboratorio.
#
# IMPORTANTE: Amass v5 tiene las URLs de los plugins fijas en el código
# (ej. https://crt.sh/?CN=...). Por eso este mock NO es interceptado por
# Amass directamente. Se usa como:
#   (a) material de apoyo visual, y
#   (b) repositorio de "semillas" que se inyectan con -nf / --dns-file
#       para simular lo que una fuente pasiva devolvería.
# Ver la sección NOTAS-PASIVO.md para el procedimiento exacto.
# =============================================================================
set -euo pipefail

VM_IP="${VM_IP:-192.168.56.102}"
LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="${LAB_DIR}/webmock"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------------------
log "1/4 Instalando servidor web y herramientas"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx python3 openssl curl jq

# ---------------------------------------------------------------------------
log "2/4 Copiando los recursos simulados"
install -d /var/www/osint-mock
cp -r "${WEB_DIR}"/. /var/www/osint-mock/
chown -R www-data:www-data /var/www/osint-mock

# ---------------------------------------------------------------------------
log "3/4 Configurando nginx"
cat > /etc/nginx/sites-available/osint-mock <<EOF
server {
    listen ${VM_IP}:8080;
    listen ${VM_IP}:80;
    server_name osint.lab.local osint-mock.lab.local _;

    root /var/www/osint-mock;
    index index.html;

    # Respuesta tipo crt.sh: JSON con "name_value"
    location = /crt.sh {
        default_type application/json;
        alias /var/www/osint-mock/crt.json;
    }

    # Surtido pasivo de subdominios (formato texto, tipo RapidDNS)
    location = /rapiddns {
        default_type text/plain;
        alias /var/www/osint-mock/rapiddns.txt;
    }

    # Historial DNS simulado
    location = /dns-history {
        default_type text/plain;
        alias /var/www/osint-mock/dns_history.txt;
    }

    # URLs / rutas descubiertas (tipo URLScan)
    location = /urls {
        default_type text/plain;
        alias /var/www/osint-mock/urls.txt;
    }

    location = /health {
        return 200 "osint-mock OK\n";
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

ln -sf /etc/nginx/sites-available/osint-mock /etc/nginx/sites-enabled/osint-mock
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

# ---------------------------------------------------------------------------
log "4/4 Verificación"
sleep 1
curl -s "http://${VM_IP}:8080/health" && echo "OSINT mock operativo en ${VM_IP}:8080"
echo
echo "────────────────────────────────────────────────────────────"
echo " Fuentes simuladas disponibles:"
echo "   http://${VM_IP}:8080/crt.sh       (JSON estilo crt.sh)"
echo "   http://${VM_IP}:8080/rapiddns     (lista de subdominios)"
echo "   http://${VM_IP}:8080/dns-history  (historial DNS)"
echo "   http://${VM_IP}:8080/urls         (URLs y rutas)"
echo "────────────────────────────────────────────────────────────"
