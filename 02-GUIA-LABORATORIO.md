# Guía del laboratorio — OWASP Amass

**Laboratorio 100 % offline de reconocimiento y mapeo de superficie de ataque**
Dominio ficticio: `lab.local` · Red: `192.168.56.0/24` · Sin salida a Internet

**Expositor:** Michael Stiven Tabares Tobón
**Curso:** Seguridad de la Información — 2026-II · Ingeniería de Sistemas, UdeA

---

## Índice

1. [Objetivos](#1-objetivos)
2. [Requisitos](#2-requisitos)
3. [Topología](#3-topología)
4. [Estructura de archivos](#4-estructura-de-archivos)
5. [Paso 0 — Verificar el aislamiento](#paso-0--verificar-el-aislamiento)
6. [Paso 1 — Levantar el laboratorio](#paso-1--levantar-el-laboratorio)
7. [Paso 2 — Enumeración activa](#paso-2--enumeración-activa)
8. [Paso 3 — Fuerza bruta y validación](#paso-3--fuerza-bruta-y-validación)
9. [Paso 4 — Lectura de resultados](#paso-4--lectura-de-resultados)
10. [Paso 5 — Interpretación y priorización](#paso-5--interpretación-y-priorización)
11. [Paso 6 — Demostración del aislamiento](#paso-6--demostración-del-aislamiento)
12. [Comandos de apoyo](#comandos-de-apoyo)
13. [Troubleshooting](#troubleshooting)
14. [Guía de referencia rápida](#guía-de-referencia-rápida)

---

## 1. Objetivos

Al completar este laboratorio serás capaz de:

1. Explicar la diferencia entre reconocimiento **pasivo** y **activo** en OWASP Amass.
2. Operar un laboratorio de reconocimiento completamente aislado de Internet.
3. Ejecutar una enumeración activa contra un DNS autoritativo propio.
4. Validar candidatos de subdominios contra el DNS y distinguir confirmados de descartados.
5. Leer los resultados desde la base de datos SQLite con `amass subs`.
6. Priorizar hallazgos según su naturaleza y no solo según su presencia técnica.
7. Explicar por qué la base de datos de activos es el componente diferenciador de Amass.

---

## 2. Requisitos

| Componente | Versión / detalle | Verificación |
|---|---|---|
| Docker Engine | 24 o superior | `docker --version` |
| Docker Compose | v2 (incluido en Docker Desktop) | `docker compose version` |
| Memoria RAM | 2 GB libres | `free -h` |
| Disco | 3 GB libres (imagen de Amass ≈ 300 MB) | `df -h` |
| Privilegios | Acceso a `NET_ADMIN` para las reglas iptables | `docker run --rm --cap-add NET_ADMIN ...` |
| Hypervisor | Opcional: VMs para el objetivo (Metasploitable 3) | — |

> **Nota sobre red:** el laboratorio **no requiere conexión a Internet**. Todo ocurre en una red bridge de Docker con rangos privados. Esto es una ventaja: el entorno de demostración es reproducible sin importar la red del aula.

---

## 3. Topología

```
┌───────────────────────────────────────────────────────────────┐
│  RED DOCKER "labnet" — 192.168.56.0/24 (aislada)              │
│                                                                │
│  ┌──────────────────────┐   ┌────────────────────────────┐   │
│  │ dns                  │◄──┤ amass                      │   │
│  │ 192.168.56.101:53    │   │ 192.168.56.100             │   │
│  │                      │   │                            │   │
│  │ DNS autoritativo     │   │ Motor + cliente en un       │   │
│  │ ficticio             │   │ mismo contenedor:          │   │
│  │ zona "lab.local"     │   │  · amass engine  (:4000)   │   │
│  │ 32 nombres, A/NS/MX/ │   │  · amass enum              │   │
│  │ CNAME/SRV            │   │  · amass subs              │   │
│  │                      │   │  · SQLite (asset.db)       │   │
│  └──────────┬───────────┘   │  · DNAT+SNAT → dns          │   │
│             │               │  · iptables DROP → Internet│   │
│             │               └─────────────┬──────────────┘   │
│             │                             │                   │
│  ┌──────────▼───────────┐                 │                   │
│  │ objetivo (opcional)  │◄────────────────┘                   │
│  │ 192.168.56.103       │                                     │
│  │ Metasploitable 3     │   ┌────────────────────────────┐   │
│  └──────────────────────┘   │ webmock (opcional)         │   │
│                              │ 192.168.56.102             │   │
│                              │ fuentes OSINT simuladas    │   │
│                              └────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### Por qué el motor y el cliente viven en un mismo contenedor

En Amass v5 el motor expone una API HTTP en el puerto 4000 y el cliente `enum`
le delega todo el trabajo. **Separarlos en dos contenedores es frágil**: el
traspaso de activos por el endpoint `bulk` puede dejar al motor en un estado
inconsistente y provocarle un *panic* que lo mata (ver §Troubleshooting).

En un solo contenedor el flujo `enum → subs` es el natural y el soportado por
la propia herramienta, que es como `amass enum` auto-arranca el motor por
defecto.

### El objetivo (Metasploitable 3)

Es **opcional** para la mecánica del laboratorio, pero muy recomendable para la interpretación. Registra su dirección en la zona DNS para que Amass lo descubra:

```dns
www.lab.local     IN  A   192.168.56.103
dev.lab.local     IN  A   192.168.56.103
staging.lab.local IN  A   192.168.56.103
```

Y para que responda en HTTP/HTTPS (necesario para que Amass detecte el servicio):

```bash
# Dentro de la VM de Metasploitable 3
sudo ip addr add 192.168.56.103/24 dev eth0
sudo ip route add default via 192.168.56.101
```

---

## 4. Estructura de archivos

```
lab-infra/
├── README.md                    Guía rápida de puesta en marcha
├── TOPOLOGIA.md                 Diagrama y mapeo DNS → activos
├── NOTAS-PASIVO.md              Cómo funciona el modo pasivo offline + limitaciones
├── 00-PLAN-EJERCICIO-*.md       Plan de la exposición
│
├── dns/
│   ├── zone.txt                 Zona ficticia (formato simple, 32 nombres)
│   ├── db.lab.local             Zona en formato BIND9 (para montarlo en una VM real)
│   └── db.192.168.56            Zona inversa (PTR)
│
├── docker/
│   ├── compose.yaml             Topología completa del laboratorio
│   ├── Dockerfile.dns           Imagen del DNS autoritativo (dnspython)
│   ├── Dockerfile.amass         Imagen de Amass con DNAT/SNAT preconfigurado
│   ├── dns_server.py            Servidor DNS autoritativo en Python
│   └── zone.txt                 Copia de la zona para el build
│
├── configs/
│   ├── config.yaml              Configuración de Amass (scope, transforms, brute)
│   └── datasources.yaml         Fuentes de datos documentadas (ninguna externa activa)
│
├── wordlists/
│   ├── seeds.txt                13 nombres: 11 existen, 2 no (para demostrar el descarte)
│   ├── subdomains-lab.txt       Lista de subdominios para fuerza bruta
│   └── alterations-lab.txt      Palabras para el plugin FQDN-Alterations
│
├── scripts/
│   ├── dnat-setup.sh            Aplica DNAT+SNAT+iptables (entrypoint de la imagen)
│   ├── run-amass.sh             Arranca motor local y ejecuta enum/subs
│   ├── resolvers.txt            Los 53 resolvers públicos hardcodeados de Amass v5
│   ├── 01-setup-dns.sh          Montaje de BIND9 en una VM real
│   ├── 02-setup-osint-mock.sh   Mock de fuentes OSINT (opcional)
│   ├── 03-aislar-salida.sh     Bloqueo de salida en VM nativa
│   └── 04-setup-attacker.sh     Docker + Amass en VM nativa
│
└── slides/                      Presentación, guion y fuentes de las diapositivas
```

---

## Paso 0 — Verificar el aislamiento

> **Este paso va PRIMERO, siempre.** Define si el resto del laboratorio es válido.

### 0.1 En el host, desde `lab-infra/docker/`

```bash
# Estado inicial: nada debe estar corriendo todavía
docker compose -f compose.yaml down --remove-orphans 2>/dev/null
```

### 0.2 Levantar solo el DNS y verificarlo

```bash
cd lab-infra/docker
docker compose -f compose.yaml up -d dns
sleep 5

# Verificar que el DNS responde correctamente
docker compose -f compose.yaml exec -T dns python3 -c "
import dns.message, dns.query
for n, qt in [('lab.local.','A'), ('lab.local.','NS'), ('lab.local.','MX'),
              ('dev.lab.local.','A'), ('vpn.lab.local.','A'),
              ('nonexistent.lab.local.','A')]:
    q = dns.message.make_query(n, qt)
    r = dns.query.udp(q, '127.0.0.1', timeout=3)
    print(f'{n:26} {qt:5} rcode={r.rcode()} answers={len(r.answer)}')
"
```

**Salida esperada:**

```
lab.local.                 A     rcode=0 answers=1
lab.local.                 NS    rcode=0 answers=1
lab.local.                 MX    rcode=0 answers=1
dev.lab.local.             A     rcode=0 answers=1
vpn.lab.local.             A     rcode=0 answers=1
nonexistent.lab.local.     A     rcode=3 answers=0
```

> `rcode=3` es **NXDOMAIN**: el nombre no existe. Es el comportamiento correcto y es lo que permite a Amass descartar candidatos.

### 0.3 Comprobar el aislamiento de red

```bash
# Desde el contenedor cliente (todavía no existe) o desde cualquier VM del lab:
docker compose -f compose.yaml run --rm --no-deps client sh -c '
  echo "--- ¿Internet? ---"
  wget -qO- --timeout=5 https://owasp.org 2>&1 | head -1 || echo "BLOQUEADO ✓"
  echo "--- ¿DNS del lab? ---"
  nslookup dev.lab.local 8.8.8.8 2>&1 | grep -A1 "Name:"
'
```

**Salida esperada:**

```
--- ¿Internet? ---
BLOQUEADO ✓
--- ¿DNS del lab? ---
Name:	dev.lab.local
Address: 192.168.56.103
```

> **Detalle técnico que hay que explicar:** la segunda consulta va a `8.8.8.8` y aun así devuelve la IP del laboratorio. Eso es el **DNAT + SNAT** funcionando: el paquete se redirige al DNS del lab y la respuesta se "disfraza" como si viniera de `8.8.8.8`.

---

## Paso 1 — Levantar el laboratorio completo

```bash
cd lab-infra/docker
docker compose -f compose.yaml up -d
```

### 1.1 Esperar a que el motor esté listo

```bash
# El healthcheck del compose espera automáticamente, pero para verificar:
docker compose -f compose.yaml ps
```

**Salida esperada:**

```
NAME              IMAGE             STATUS
docker-client-1   amass-lab:latest  Up
docker-dns-1      docker-dns        Up
docker-engine-1   amass-lab:latest  Up (healthy)   ← el motor está listo
```

Verificación explícita del motor:

```bash
docker compose -f compose.yaml exec -T engine \
  wget -qO- http://127.0.0.1:4000/api/v1/health
# {"result":"Amass Engine OK"}
```

### 1.2 Ver la configuración cargada

```bash
docker compose -f compose.yaml exec -T engine cat /.config/amass/config.yaml
```

> **Punto crítico:** la sección `transformations` **no es opcional**. Amass v5 la carga al leer el archivo YAML. Si falta, ningún plugin se activa y la enumeración no descubre nada. Este fue el error más difícil de diagnosticar durante la construcción del laboratorio.

---

## Paso 2 — Enumeración activa

### 2.1 Ejecutar la enumeración

```bash
cd lab-infra/docker
docker compose -f compose.yaml up -d
docker compose -f compose.yaml logs -f amass
```

Equivale a:

```bash
amass enum -engine http://127.0.0.1:4000 \
  -active \
  -brute -w /wl/subdomains-lab.txt \
  -d lab.local \
  -p 80,443 \
  -timeout 3
```

> **Importante:** no uses `-nf` en esta versión. El endpoint `bulk` de la API de
> Amass v5.1.3 tiene un *panic* por puntero nulo que mata el motor (ver
> §Troubleshooting). La fuerza bruta se demuestra con `-brute -w`, que es la
> vía soportada y estable.

### 2.2 Qué hace cada bandera

| Bandera | Efecto | Nota |
|---|---|---|
| `-active` | Habilita resolución DNS, force DNS y comprobación de servicios | Sin ella, solo se consultan fuentes OSINT |
| `-d lab.local` | Dominio objetivo | Acepta varios separados por coma |
| `-p 80,443` | Puertos a comprobar | **Muro de seguridad del ejercicio.** En v5 el default es `80,443` |
| `-brute` | Activa la fuerza bruta DNS | Requiere resolución DNS activa |
| `-w seeds.txt` | Lista de palabras para la fuerza bruta | Mecanismo soportado en v5 (ver §3) |
| `-timeout 3` | Minutos **sin progreso** antes de terminar | Amass detecta que no avanza y se detiene |
| `-engine URL` | URL del motor | Necesario cuando el motor es un servicio separado |

> **Nota sobre `-nf`:** la bandera existe y permite inyectar nombres ya
> conocidos, pero en Amass **v5.1.3** su uso provoca un *panic* en el motor
> (§Troubleshooting). Para la demostración usa `-brute -w`, que produce el
> mismo resultado observable: el DNS autoritativo valida cada candidato.

### 2.3 Salida esperada

```
[lab] DNS del laboratorio : 192.168.56.101:53
[lab] IP de este contenedor: 192.168.56.100
[lab] Red permitida       : 192.168.56.0/24
[lab] DNAT: 106 | SNAT: 105
[lab] arrancando el motor de Amass en http://127.0.0.1:4000...
[lab] motor listo tras 1s
[lab] ejecutando: amass enum -active -brute -w /wl/subdomains-lab.txt ...

29 / 30 [======>      ] 96.67% ? p/s29

Session Scope

FQDN:

lab.local

############################################################
# RESULTADOS  (amass subs -names -ip)
############################################################
  lab.local 192.168.56.103
  mail.lab.local 192.168.56.103
  ns1.lab.local 192.168.56.101
```

**Tiempo total de la ejecución: entre 2 y 4 minutos.** El plugin DNS-SD genera
unas 60 consultas SRV con prefijos estándar (`_ldap._tcp`, `_sip._tcp`,
`_imap._tcp`…) que en su mayoría devuelven NXDOMAIN. Es ruido esperado.

> **Nota importante sobre el resultado:** la salida muestra 3 nombres, no 20.
> La razón es que en Amass v5 el brute force por wordlist genera candidatos
> que se **validan** contra el DNS, pero solo se materializan en el grafo
> cuando el pipeline de plugins los procesa. Con el alcance y las
> transformaciones del laboratorio, la extracción completa requiere que el
> plugin `DNS-Subdomains` complete su recorrido de NS/MX.
>
> Para la demostración, lo relevante es que **el DNS registra todas las
> consultas** (500–600), incluyendo las de los candidatos del wordlist. Eso es
> la evidencia directa de que la fuerza bruta ocurrió y de que el DNS es el
> que decide. Para el inventario completo de activos, usa la consulta directa
> a la base de datos (§4.3).

### 2.4 Contar las consultas DNS generadas

```bash
docker compose -f compose.yaml logs dns | grep -c "query"
```

> Resultado típico: **500–600 consultas**. El plugin DNS-SD genera además unas 60 consultas SRV con prefijos estándar (`_ldap._tcp`, `_sip._tcp`, `_imap._tcp`...). Son ruido esperado: la mayoría devuelve NXDOMAIN.

---

## Paso 3 — Fuerza bruta y validación

### 3.1 El mecanismo

En Amass v5, la fuerza bruta funciona así:

1. `-brute` habilita el plugin de fuerza bruta.
2. `-w <archivo>` le dice qué lista de palabras usar.
3. El motor genera candidatos a partir de cada palabra y los **valida contra el
   DNS autoritativo**.
4. Los que resuelven se conservan con su IP. Los que no, se descartan.

> **Amass no adivina y no "crea" subdominios. El DNS autoritativo es el juez.**

### 3.2 Contenido de `wordlists/subdomains-lab.txt`

La lista tiene 13 entradas: 11 existen en la zona y 2 no.

```bash
cat lab-infra/wordlists/subdomains-lab.txt
```

| Palabra | ¿Existe en la zona? | Resultado |
|---|---|---|
| `www` | ✔ | `www.lab.local` → 192.168.56.103 |
| `mail` | ✔ | `mail.lab.local` → 192.168.56.103 |
| `dev` | ✔ | `dev.lab.local` → 192.168.56.103 |
| `staging` | ✔ | `staging.lab.local` → 192.168.56.103 |
| `qa` | ✔ | `qa.lab.local` → 192.168.56.104 |
| `admin` | ✔ | `admin.lab.local` → 192.168.56.105 |
| `vpn` | ✔ | `vpn.lab.local` → 192.168.56.106 |
| `jenkins` | ✔ | `jenkins.lab.local` → 192.168.56.107 |
| `gitlab` | ✔ | `gitlab.lab.local` → 192.168.56.107 |
| `grafana` | ✔ | `grafana.lab.local` → 192.168.56.108 |
| `api` | ✔ | `api.lab.local` → 192.168.56.109 |
| `old` | ✔ | `old.lab.local` → 192.168.56.110 |
| `test` | ✘ | **descartado** (NXDOMAIN) |

### 3.3 Verificar el descarte manualmente

```bash
# Los que existen
docker compose -f compose.yaml exec -T dns nslookup dev.lab.local 127.0.0.1
docker compose -f compose.yaml exec -T dns nslookup vpn.lab.local 127.0.0.1

# Los que NO existen (NXDOMAIN)
docker compose -f compose.yaml exec -T dns nslookup test.lab.local 127.0.0.1
```

### 3.4 Ver la evidencia de la fuerza bruta en el DNS

Este es el comando clave de la demostración: **el DNS registra cada consulta**,
incluidas las de los candidatos del wordlist.

```bash
cd lab-infra/docker

# Todos los candidatos del wordlist que se consultaron
docker compose -f compose.yaml logs dns | grep "query" \
  | sed 's/.*\[query\] //' | awk '{print $1}' \
  | grep -E "^(www|mail|dev|staging|qa|admin|vpn|jenkins|gitlab|grafana|api|old|test)\.lab\.local$" \
  | sort -u
```

**Salida esperada:**

```
admin.lab.local
api.lab.local
dev.lab.local
grafana.lab.local
jenkins.lab.local
mail.lab.local
old.lab.local
qa.lab.local
staging.lab.local
test.lab.local
vpn.lab.local
www.lab.local
```

> Nótese que **`test.lab.local` aparece entre las consultas**: Amass lo preguntó,
> y el DNS respondió NXDOMAIN. Eso es la fuerza bruta funcionando: consulta
> candidatos y acepta el veredicto del servidor de nombres.

### 3.5 Ampliar la lista

```bash
# Añadir candidatos al archivo
cat >> lab-infra/wordlists/subdomains-lab.txt <<'EOF'
uat
preprod
sandbox
backup
EOF

# Reejecutar
cd lab-infra/docker
docker compose -f compose.yaml restart amass
docker compose -f compose.yaml logs -f amass
```

### 3.5 Generar alteraciones de nombres (plugin `FQDN-Alterations`)

```bash
docker compose -f compose.yaml run --rm --no-deps client \
  amass enum -engine http://192.168.56.100:4000 \
  -active -alts -aw /wl/alterations-lab.txt \
  -d lab.local -p 80,443 -timeout 2
```

Este plugin muta nombres conocidos: `dev` → `dev1`, `dev-test`, `test-dev`, etc., y valida cada mutación contra el DNS.

---

## Paso 4 — Lectura de resultados

### 4.1 `amass subs` — leer los nombres descubiertos

```bash
docker compose -f compose.yaml run --rm --no-deps client \
  amass subs -names -d lab.local -ip
```

**Salida esperada:**

```
vpn.lab.local        192.168.56.106
old.lab.local        192.168.56.110
lab.local            192.168.56.103
mail.lab.local       192.168.56.103
ns1.lab.local        192.168.56.101
```

### 4.2 `amass subs -show` — resumen con tabla ASN

```bash
docker compose -f compose.yaml run --rm --no-deps client \
  amass subs -show -d lab.local -ip
```

> Puede mostrar `Failed to populate the ASN cache: zero entities found`. Es **esperado** en el laboratorio: el cache ASN requiere datos de WHOIS/RDAP, que están bloqueados. No es un error del laboratorio.

### 4.3 Consultar la base de datos directamente

```bash
# Copiar la base de datos del motor
docker compose -f compose.yaml exec -T engine \
  sh -c 'cp /.config/amass/asset.db* /tmp/'
docker cp docker-engine-1:/tmp/asset.db /tmp/asset.db

# Inspeccionar las tablas (requiere sqlite3)
sqlite3 /tmp/asset.db ".tables"
sqlite3 /tmp/asset.db "SELECT fqdn FROM fqdn ORDER BY fqdn;"
sqlite3 /tmp/asset.db "SELECT COUNT(*) FROM entity;"
sqlite3 /tmp/asset.db "SELECT COUNT(*) FROM edge;"
```

### 4.4 Ver los logs del motor

```bash
docker compose -f compose.yaml exec -T engine \
  sh -c 'ls -t /.config/amass/amass_engine_*.log | head -1 | xargs grep "relationship discovered"'
```

Cada línea muestra una relación descubierta:

```json
{"msg":"relationship discovered","from":"lab.local","relation":"dns_record","to":"192.168.56.103"}
```

### 4.5 Nota sobre las banderas que ya no existen

En Amass v5 el subcomando `enum` **no** acepta `-src`, `-o`, `-ip`, `-do` ni `-json`. Y el subcomando `db` fue **eliminado**.

| Bandera | v3 / v4 | v5 | Alternativa en v5 |
|---|---|---|---|
| `-src` | ✔ | ✘ | La fuente se guarda en la DB; se lee desde `entity_tag` |
| `-o` | ✔ | ✘ | `amass subs -o archivo` |
| `-ip` | ✔ | ✘ | `amass subs -ip` |
| `-do` / `-json` | ✔ | ✘ | Exportación desde `subs` o consulta directa a SQLite |
| `amass db -list` | ✔ | ✘ | `amass subs` / consulta a `asset.db` |
| `amass enum -list` | ✔ | ✔ | Lista las fuentes de datos disponibles |

---

## Paso 5 — Interpretación y priorización

### 5.1 Hallazgos con nombres sensibles

```bash
docker compose -f compose.yaml logs dns | grep "query" \
  | sed 's/.*\[query\] //' | awk '{print $1}' \
  | grep -E "^(dev|staging|qa|uat|preprod|admin|portal|vpn|jenkins|gitlab|grafana|old|backup)\.lab\.local$"
```

### 5.2 Correlación con IPs

```bash
# Qué nombres apuntan al objetivo (Metasploitable)
docker compose -f compose.yaml run --rm --no-deps client \
  amass subs -names -d lab.local -ip | grep '192.168.56.103'

# Rango de IPs del laboratorio
docker compose -f compose.yaml run --rm --no-deps client \
  amass subs -names -d lab.local -ip | awk '{print $2}' | sort -u
```

### 5.3 Verificar el servicio HTTP del objetivo

```bash
docker compose -f compose.yaml run --rm --no-deps client \
  sh -c 'curl -sI --max-time 5 http://192.168.56.103 | head -6'
```

### 5.4 Tabla de priorización del laboratorio

| Activo | Severidad | Razón |
|---|---|---|
| `vpn.lab.local` | **Crítico** | Acceso remoto a la organización desde un único activo |
| `dev` / `staging` / `qa` / `uat` | **Alto** | Preproducción con menos controles y posibles datos reales |
| `jenkins` / `gitlab` | **Alto** | Cadena de suministro: código y pipelines de despliegue |
| `admin` / `portal` | **Alto** | Panel de administración expuesto |
| `old` / `backup` | **Medio** | Activo residual, deuda técnica no actualizada |
| `www` / `mail` | **Bajo** | Activos públicos esperados, sin señal por sí solos |

### 5.5 La conclusión del análisis

> Amass **no prioriza**. Entrega el inventario con su procedencia. La severidad depende del contexto: si `192.168.56.103` es producción o una máquina de pruebas, el mismo hallazgo cambia de severidad. Esa decisión es humana.

---

## Paso 6 — Demostración del aislamiento

### 6.1 Bloquear y desbloquear Internet

```bash
# DENTRO del contenedor cliente:
docker compose -f compose.yaml exec -T client sh -c '
  # Ver las reglas aplicadas
  iptables -t nat -L OUTPUT -n | grep -c DNAT    # 106 reglas DNAT
  iptables -t nat -L POSTROUTING -n | grep -c SNAT  # 106 reglas SNAT
  iptables -S OUTPUT | tail -4                    # política DROP
'

# Desbloquear temporalmente (ejecutar desde el propio contenedor)
docker compose -f compose.yaml exec -T client sh -c '
  iptables -D OUTPUT -p tcp -j DROP
  iptables -D OUTPUT -p udp -j DROP
  curl -s --max-time 5 -o /dev/null -w "%{http_code}\n" https://owasp.org
'
```

### 6.2 Captura de tráfico para demostrar pasivo vs. activo

```bash
# En la VM del objetivo (192.168.56.103):
sudo tcpdump -i eth0 -nn "host 192.168.56.102 and not port 53" -w /tmp/pasivo.pcap &
sudo tcpdump -i eth0 -nn "host 192.168.56.102" -w /tmp/activo.pcap &

# Modo pasivo: 0 paquetes hacia el objetivo
docker compose -f compose.yaml run --rm --no-deps client \
  amass enum -engine http://192.168.56.100:4000 -d lab.local -timeout 1

# Modo activo: sí hay tráfico
docker compose -f compose.yaml run --rm --no-deps client \
  amass enum -engine http://192.168.56.100:4000 -active -d lab.local -p 80,443 -timeout 1
```

> Esta es la demostración más potente para un público técnico: **el modo pasivo literalmente no genera tráfico hacia el objetivo**.

---

## Comandos de apoyo

```bash
# Consultar la zona completa
docker compose -f compose.yaml exec -T dns cat /app/zone.txt

# Ver qué nombres se han consultado
docker compose -f compose.yaml logs dns | grep "query" | tail -40

# Contar consultas por nombre
docker compose -f compose.yaml logs dns | grep "query" \
  | sed 's/.*\[query\] //' | awk '{print $1}' | sort | uniq -c | sort -rn | head

# Reiniciar el motor (base de datos limpia)
docker compose -f compose.yaml restart engine

# Limpiar la base de datos
docker compose -f compose.yaml exec -T engine rm -f /.config/amass/asset.db*

# Detener todo
docker compose -f compose.yaml down

# Detener y borrar contenedores + red
docker compose -f compose.yaml down --remove-orphans -v
```

---

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Failed to perform a bulk transfer of assets: ... EOF` | **Bug de Amass v5.1.3**: el endpoint `bulk` de la API entra en *panic* por puntero nulo (`engine/api/server/v1/utils.go:91`, en `PutAsset`: `ents[0]` sobre una lista vacía). El panic mata el motor. | **No uses `-nf`.** La fuerza bruta se hace con `-brute -w`, que es la vía estable. Alternativa: usar una versión de Amass distinta a la 5.1.3. |
| El motor muere con `panic: runtime error: invalid memory address` | Mismo bug del endpoint `bulk`. Aparece si el motor y el cliente están en contenedores separados o si usas `-nf`. | Reinicia el motor (`docker compose restart amass`) y usa `-brute -w`. |
| `Failed to create a session with the Amass engine` | El motor no está listo | Esperar 15–20 s tras `up`. El script `run-amass.sh` ya espera al health check. |
| `Failed to obtain the BGPTools IP address` | `bgp.tools` no resuelve en el DNS del lab | Verificar que `bgp.tools A 192.168.56.101` está en `zone.txt` y reconstruir la imagen DNS. |
| `The Amass engine did not respond within the timeout period` | El motor tardó en arrancar (muchos plugins) | Esperar 15–20 s. El healthcheck del compose ya lo gestiona. |
| La enumeración termina pero no descubre nada | Faltan las `transformations` en `config.yaml` | Restaurar el bloque `transformations:` completo. Es el error más común. |
| `flag provided but not defined: -src` / `-ip` / `-o` | Banderas de v3/v4 que ya no existen en v5 | Usar `amass subs` para leer resultados. Ver §4.5. |
| `subcommand provided but not defined: db` | El subcomando `db` fue eliminado en v5 | Usar `amass subs` o consultar `asset.db` con sqlite3. |
| El DNS responde pero Amass no lo usa | Falta la redirección DNAT | Verificar: `docker compose exec client iptables -t nat -L OUTPUT -n | grep -c DNAT` → debe ser 106. |
| `permission denied` en iptables | Falta `NET_ADMIN` | Añadir `cap_add: [NET_ADMIN]` al servicio en `compose.yaml`. |
| `Failed to perform a bulk transfer of assets: EOF` | El motor no estaba listo para aceptar la sesión | Ver fila anterior: usar `-brute -w` en lugar de `-nf`, y reiniciar el motor. |
| `Failed to populate the ASN cache: zero entities found` | Normal en el lab: requiere WHOIS/RDAP | Ignorar. No afecta la enumeración. |
| La demo tarda mucho | El plugin DNS-SD hace ~60 consultas SRV | Reducir `-timeout` a 2 o usar los resultados pre-generados. |
| `connection refused` al `localhost:4000` | El cliente HTTP resuelve `localhost` a IPv6 | Usar siempre `-engine http://127.0.0.1:4000` o la IP del motor. |

---

## Guía de referencia rápida

### Subcomandos de Amass v5

```
amass [assoc|engine|enum|subs|track|viz] [options]
```

| Subcomando | Función |
|---|---|
| `enum` | Ejecuta la enumeración (crea una sesión en el motor) |
| `subs` | Lee y presenta los subdominios descubiertos desde la base de datos |
| `track` | Compara enumeraciones entre fechas |
| `viz` | Genera visualizaciones del grafo |
| `assoc` | Analyses associations entre activos |
| `engine` | Ejecuta el motor (servicio HTTP en el puerto 4000) |

### Banderas clave de `enum`

```
-active          Habilita resolución DNS y comprobación de servicios
-alts            Genera nombres alternativos (plugin FQDN-Alterations)
-aw <archivo>    Lista de palabras para alteraciones
-brute           Fuerza bruta (requiere DNS activo)
-d <dominio>     Domino objetivo
-df <archivo>    Archivo con dominios objetivo
-engine <url>    URL del motor
-exclude <fuente>  Excluye fuentes de datos
-include <fuente>  Solo usa las fuentes indicadas
-list            Lista las fuentes de datos disponibles
-nf <archivo>    Nombres ya conocidos (semillas)
-norecursive     Desactiva la fuerza bruta recursiva
-p <puertos>     Puertos a comprobar en modo activo
-rigic           Desactiva la expansión del alcance
-timeout <min>   Minutos sin progreso antes de terminar
-w <archivo>     Lista de palabras para fuerza bruta
```

### Banderas clave de `subs`

```
-d <dominio>     Domino a consultar
-ip              Muestra las direcciones IP de los nombres
-ipv4 / -ipv6    Filtra por versión de IP
-names           Solo los nombres descubiertos
-show            Muestra todo
-summary         Resumen de ASN
-o <archivo>     Escribe la salida en un archivo
```

### Verificaciones del laboratorio

```bash
# ¿El DNS responde?
docker compose exec dns nslookup lab.local 127.0.0.1

# ¿El motor está vivo?
docker compose exec engine wget -qO- http://127.0.0.1:4000/api/v1/health

# ¿Las reglas de aislamiento están aplicadas?
docker compose exec client iptables -t nat -L OUTPUT -n | grep -c DNAT   # 106

# ¿Internet está bloqueado?
docker compose run --rm --no-deps client \
  sh -c 'curl -s --max-time 5 -o /dev/null https://owasp.org || echo BLOQUEADO'

# ¿Cuántas consultas DNS se hicieron?
docker compose logs dns | grep -c query
```

---

## Referencias

- OWASP Amass — sitio del proyecto: <https://owasp.org/projects/amass>
- Documentación oficial v5: <https://owasp-amass.github.io/docs/>
- Código fuente: <https://github.com/owasp-amass/amass>
- Biblioteca de resolución DNS: <https://github.com/owasp-amass/resolve>
- Modelo de activos abiertos: <https://github.com/owasp-amass/open-asset-model>

---

*Guía elaborada y validada con OWASP Amass v5.1.3 sobre Docker. Laboratorio 100 % offline: ninguna consulta sale a Internet.*
