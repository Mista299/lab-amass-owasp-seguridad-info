#!/usr/bin/env bash
# =============================================================================
# LAB-INFRA · Script principal del laboratorio OWASP Amass
# Ejecutar en la VM "attacker":  ./run-lab.sh [paso]
#
#   ./run-lab.sh 0        Verificación del entorno (aislamiento + DNS)
#   ./run-lab.sh 1        Modo ACTIVO  (enumeración + servicios + IPs)
#   ./run-lab.sh 2        Modo FUERZA BRUTA con lista propia
#   ./run-lab.sh 3        Persistencia: db -list, db -show, export JSON
#   ./run-lab.sh 4        Interpretación y priorización de hallazgos
#   ./run-lab.sh all      Ejecuta todos los pasos
# =============================================================================
set -uo pipefail

WORK="${WORK:-$HOME/amass-lab}"
RESULTS="${WORK}/results"
AMASS="docker run --rm -it -v ${WORK}/configs:/.config/amass -v ${RESULTS}:/results amass:latest"
DNS_SERVER="${DNS_SERVER:-192.168.56.101}"
DOMAIN="${DOMAIN:-lab.local}"
STEP="${1:-all}"

mkdir -p "$RESULTS"

hdr()  { printf '\n\033[1;36m╔══════════════════════════════════════════════════════╗\033[0m\n'; }
title(){ printf '\033[1;36m║ %-56s ║\033[0m\n' "$*"; }
ftr()  { printf '\033[1;36m╚══════════════════════════════════════════════════════╝\033[0m\n'; }
step(){ printf '\n\033[1;33m━━━ %s ━━━\033[0m\n' "$*"; }
note(){ printf '\033[0;37m    %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m    [✓] %s\033[0m\n' "$*"; }
bad() { printf '\033[1;31m    [✗] %s\033[0m\n' "$*"; }

# =============================================================================
paso0() {
  hdr; title "PASO 0 · Verificación del entorno"; ftr
  step "0.1 Aislamiento: Internet debe estar BLOQUEADO"
  if curl -s --max-time 6 -o /dev/null https://owasp.org 2>/dev/null; then
    bad "FUGA DETECTADA: owasp.org responde. Ejecuta: sudo ./03-aislar-salida.sh"
    return 1
  else
    ok "Internet bloqueado correctamente"
  fi

  step "0.2 DNS del laboratorio"
  if dig +short +timeout=3 +tries=1 @"$DNS_SERVER" "$DOMAIN" SOA | grep -q .; then
    ok "DNS autoritativo responde en ${DNS_SERVER}:53"
  else
    bad "El DNS ${DNS_SERVER}:53 no responde. Revisa la VM dns-authoritative."
    return 1
  fi

  step "0.3 Resolución de nombres de prueba"
  for h in www dev staging vpn jenkins test; do
    ip=$(dig +short +timeout=2 +tries=1 @"$DNS_SERVER" "$h.$DOMAIN" A | head -1)
    if [[ -n "$ip" ]]; then printf '    %-24s -> %s\n' "$h.$DOMAIN" "$ip"; fi
  done

  step "0.4 Versión de Amass"
  docker run --rm amass:latest -version

  step "0.5 Subcomandos disponibles"
  docker run --rm amass:latest -h 2>&1 | grep -E "^\s+(assoc|engine|enum|subs|track|viz)" || true

  step "0.6 Prueba de AXFR (transferencia de zona)"
  if dig +short +timeout=5 +tries=1 @"$DNS_SERVER" "$DOMAIN" AXFR | grep -q "$DOMAIN"; then
    ok "AXFR permitido: Amass podrá enumerar la zona completa"
  else
    note "AXFR no disponible. Amass usará resolución individual (igualmente funciona)."
  fi
  return 0
}

# =============================================================================
paso1() {
  hdr; title "PASO 1 · Modo ACTIVO (enumeración + servicios + IPs)"; ftr
  note "Comando: amass enum -active -d lab.local -p 80,443,8080 -ip -src"
  note "El flag -p limita el escaneo a los puertos autorizados del laboratorio."

  $AMASS enum \
    -active \
    -d "$DOMAIN" \
    -p 80,443,8080 \
    -ip -src \
    -o /results/subdominios-activo.txt

  step "1.1 Resultado en pantalla"
  if [[ -f "${RESULTS}/subdominios-activo.txt" ]]; then
    wc -l < "${RESULTS}/subdominios-activo.txt" | xargs -I{} echo "    {} líneas capturadas"
    sort -u "${RESULTS}/subdominios-activo.txt" | head -30 | sed 's/^/    /'
  else
    bad "No se generó el archivo de salida"
    return 1
  fi

  step "1.2 Subdominios únicos descubiertos"
  sort -u "${RESULTS}/subdominios-activo.txt" | grep -c '\.' | xargs -I{} echo "    {} nombres"
  return 0
}

# =============================================================================
paso2() {
  hdr; title "PASO 2 · FUERZA BRUTA DNS"; ftr
  note "Comando: amass enum -active -brute -w wordlists/subdomains-lab.txt"
  note "24 palabras: 19 existen en la zona, 5 NO existen (deben descartarse)."

  step "2.1 Estado inicial"
  sort -u "${RESULTS}/subdominios-activo.txt" 2>/dev/null | grep -c '\.' \
    | xargs -I{} echo "    {} nombres conocidos antes de la fuerza bruta"

  $AMASS enum \
    -active \
    -brute \
    -w /wordlists/subdomains-lab.txt \
    -d "$DOMAIN" \
    -p 80,443,8080 \
    -ip -src \
    -o /results/subdominios-bruteforce.txt

  step "2.2 Nombres NUEVOS descubiertos por fuerza bruta"
  comm -13 \
    <(sort -u "${RESULTS}/subdominios-activo.txt" 2>/dev/null | grep '\.' | sort -u) \
    <(sort -u "${RESULTS}/subdominios-bruteforce.txt" 2>/dev/null | grep '\.' | sort -u) \
    | tee "${RESULTS}/nuevos-por-fuerza-bruta.txt" | sed 's/^/    + /'
  if [[ -s "${RESULTS}/nuevos-por-fuerza-bruta.txt" ]]; then
    ok "La fuerza bruta amplió la superficie de ataque"
  else
    note "No hubo nombres nuevos (la zona ya estaba cubierta)"
  fi

  step "2.3 Candidatos que NO existen (descartados por el DNS)"
  note "Verificarlos manualmente con dig:"
  for w in test stage prod internal; do
    if dig +short +timeout=2 +tries=1 @"$DNS_SERVER" "$w.$DOMAIN" A | grep -q .; then
      printf '    %-20s EXISTE\n' "$w"
    else
      printf '    %-20s descartado (NXDOMAIN)\n' "$w"
    fi
  done
  return 0
}

# =============================================================================
paso3() {
  hdr; title "PASO 3 · Persistencia del grafo y exportación"; ftr

  step "3.1 Enumeraciones almacenadas en la base de datos"
  docker run --rm -it -v "${WORK}/configs:/.config/amass" amass:latest db -list

  step "3.2 Activos con sus direcciones IP"
  docker run --rm -it -v "${WORK}/configs:/.config/amass" amass:latest db -show -ip -src

  step "3.3 Exportación estructurada (JSON de operaciones de datos)"
  $AMASS enum \
    -active \
    -d "$DOMAIN" \
    -p 80,443,8080 \
    -do /results/amass-lab.json

  step "3.4 Estructura del JSON"
  if [[ -f "${RESULTS}/amass-lab.json" ]]; then
    echo "    Tamaño: $(du -h "${RESULTS}/amass-lab.json" | cut -f1)"
    echo "    Primeras líneas:"
    head -25 "${RESULTS}/amass-lab.json" | sed 's/^/      /'
    echo
    echo "    Tipos de activos encontrados:"
    jq -r '.operations[]?.type // empty' "${RESULTS}/amass-lab.json" 2>/dev/null \
      | sort | uniq -c | sed 's/^/      /' || \
      grep -o '"type":"[^"]*"' "${RESULTS}/amass-lab.json" 2>/dev/null \
      | sort | uniq -c | sed 's/^/      /'
  else
    note "El JSON no se generó (puede requerir permisos de escritura en el volumen)"
  fi
  return 0
}

# =============================================================================
paso4() {
  hdr; title "PASO 4 · Interpretación y priorización"; ftr

  step "4.1 Hallazgos con nombres sensibles"
  grep -Ei 'dev|test|stg|qa|uat|preprod|admin|portal|vpn|jenkins|gitlab|grafana|old|backup' \
    "${RESULTS}/subdominios-bruteforce.txt" 2>/dev/null \
    | sort -u | sed 's/^/    /' | head -20

  step "4.2 Verificación de un hallazgo crítico contra el DNS del laboratorio"
  dig +short +timeout=3 +tries=1 @"$DNS_SERVER" dev."$DOMAIN" A | sed 's/^/    dev -> /'
  dig +short +timeout=3 +tries=1 @"$DNS_SERVER" vpn."$DOMAIN" A | sed 's/^/    vpn -> /'

  step "4.3 Confirmación del servicio HTTP en el objetivo"
  curl -sI --max-time 5 "http://192.168.56.103" | head -6 | sed 's/^/    /'

  step "4.4 Correlación: qué nombres apuntan al Metasploitable"
  grep '192.168.56.103' "${RESULTS}/subdominios-bruteforce.txt" 2>/dev/null \
    | sort -u | sed 's/^/    /' | head -20

  step "4.5 Resumen cuantitativo del laboratorio"
  {
    echo "Laboratorio OWASP Amass — resumen"
    echo "Fecha        : $(date -u +'%Y-%m-%d %H:%M UTC')"
    echo "Objetivo     : ${DOMAIN} (ficticio, 100% local)"
    echo "DNS          : ${DNS_SERVER}"
    echo "Puertos      : 80, 443, 8080"
    echo "Modo activo  : $(sort -u "${RESULTS}/subdominios-activo.txt" 2>/dev/null | grep -c '\.' || echo 0) nombres"
    echo "Con fuerza   : $(sort -u "${RESULTS}/subdominios-bruteforce.txt" 2>/dev/null | grep -c '\.' || echo 0) nombres"
  } | tee "${RESULTS}/resumen.txt" | sed 's/^/    /'

  step "4.6 Tabla de priorización"
  cat <<'EOF'
    ┌─────────────────────────────┬───────────┬──────────────────────────────┐
    │ Hallazgo                    │ Severidad │ Justificación                │
    ├─────────────────────────────┼───────────┼──────────────────────────────┤
    │ vpn.lab.local               │ CRÍTICO   │ Acceso remoto a la organización│
    │ dev / staging / qa / uat    │ ALTO      │ Preproducción con menos ctrl │
    │ jenkins / gitlab            │ ALTO      │ Cadena de suministro (CI/CD)  │
    │ admin / portal              │ ALTO      │ Panel de administración      │
    │ old / backup                │ MEDIO     │ Activo residual, deuda técnica│
    │ www / mail                  │ BAJO      │ Activos públicos esperados    │
    └─────────────────────────────┴───────────┴──────────────────────────────┘
EOF
  return 0
}

# =============================================================================
case "$STEP" in
  0)   paso0 ;;
  1)   paso1 ;;
  2)   paso2 ;;
  3)   paso3 ;;
  4)   paso4 ;;
  all) paso0 && paso1 && paso2 && paso3 && paso4 ;;
  *)   echo "Uso: $0 {0|1|2|3|4|all}" >&2; exit 1 ;;
esac
