#!/bin/sh
# ==========================================================================
# Aísla OWASP Amass v5 para el laboratorio 100 % offline.
#
# 1) DNAT: todo el DNS dirigido a los 53 resolvers hardcodeados del pool de
#    Amass v5 + 8.8.4.4 (wildcard detector) se redirige al DNS del laboratorio.
# 2) SNAT: la respuesta vuelve con la IP que el pool reconoce (clave en
#    owasp-amass/resolve conn/connection.go: processResponse empareja por
#    la IP de ORIGEN de la respuesta).
# 3) Politica DROP para todo lo que no sea la red del laboratorio.
# ==========================================================================
set -e

DNS_IP="${LAB_DNS_IP:-192.168.56.101}"
LAB_NET="${LAB_NET:-192.168.56.0/24}"
RESOLVERS_FILE="${LAB_RESOLVER_LOG:-/etc/amass-resolvers.txt}"

SELF_IP="$(ip -4 -o addr show scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -1)"

echo "[lab] DNS del laboratorio : ${DNS_IP}:53"
echo "[lab] IP de este contenedor: ${SELF_IP}"
echo "[lab] Red permitida       : ${LAB_NET}"


while read -r ip; do
    [ -z "$ip" ] && continue
    iptables -t nat -A OUTPUT -p udp -d "$ip" --dport 53 \
        -j DNAT --to-destination "${DNS_IP}:53" 2>/dev/null || true
    iptables -t nat -A OUTPUT -p tcp -d "$ip" --dport 53 \
        -j DNAT --to-destination "${DNS_IP}:53" 2>/dev/null || true
    iptables -t nat -A POSTROUTING -p udp -s "${DNS_IP}" --sport 53 -d "${SELF_IP}" \
        -j SNAT --to-source "$ip" 2>/dev/null || true
    iptables -t nat -A POSTROUTING -p tcp -s "${DNS_IP}" --sport 53 -d "${SELF_IP}" \
        -j SNAT --to-source "$ip" 2>/dev/null || true
done < "${RESOLVERS_FILE}"

# El wildcard detector esta cableado a 8.8.4.4 en support/resolvers.go
iptables -t nat -A OUTPUT -p udp -d 8.8.4.4 --dport 53 \
    -j DNAT --to-destination "${DNS_IP}:53" 2>/dev/null || true
iptables -t nat -A OUTPUT -p tcp -d 8.8.4.4 --dport 53 \
    -j DNAT --to-destination "${DNS_IP}:53" 2>/dev/null || true
iptables -t nat -A POSTROUTING -p udp -s "${DNS_IP}" --sport 53 -d "${SELF_IP}" \
    -j SNAT --to-source 8.8.4.4 2>/dev/null || true

# Politica de salida: solo la red del laboratorio
iptables -A OUTPUT -p tcp -d "${LAB_NET}" -j ACCEPT
iptables -A OUTPUT -p udp -d "${LAB_NET}" -j ACCEPT
iptables -A OUTPUT -p tcp -d 127.0.0.0/8 -j ACCEPT
iptables -A OUTPUT -p udp -d 127.0.0.0/8 -j ACCEPT
iptables -A OUTPUT -p tcp -j DROP
iptables -A OUTPUT -p udp -j DROP

echo "[lab] DNAT: $(iptables -t nat -L OUTPUT -n | grep -c DNAT) | SNAT: $(iptables -t nat -L POSTROUTING -n | grep -c SNAT)"
echo "[lab] Ejecutando: $*"
exec "$@"
