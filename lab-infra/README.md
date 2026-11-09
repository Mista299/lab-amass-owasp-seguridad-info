# LAB-INFRA · Laboratorio OWASP Amass

Infraestructura **100 % local** para el laboratorio de reconocimiento y mapeo de
superficie de ataque con OWASP Amass.

**Ninguna consulta sale a Internet.** El dominio `lab.local` es un TLD reservado
por la IANA que no existe en Internet, y la red `192.168.56.0/24` es privada.

---

## Puesta en marcha en 3 comandos

```bash
cd lab-infra/docker
docker compose -f compose.yaml up -d --build
docker compose -f compose.yaml ps          # engine debe decir "healthy"
docker compose -f compose.yaml run --rm --no-deps client
```

La última orden ejecuta la enumeración completa. Para leer los resultados:

```bash
docker compose -f compose.yaml run --rm --no-deps client \
  amass subs -names -d lab.local -ip
```

Detener todo:

```bash
docker compose -f compose.yaml down --remove-orphans
```

---

## Contenido

| Ruta | Descripción |
|---|---|
| `dns/zone.txt` | Zona DNS ficticia: 32 nombres (A, NS, MX, CNAME, SRV) |
| `dns/db.lab.local` | La misma zona en formato BIND9, para montarla en una VM real |
| `dns/db.192.168.56` | Zona inversa (PTR) del laboratorio |
| `docker/compose.yaml` | Topología: `dns` + `engine` + `client` |
| `docker/Dockerfile.dns` | Imagen del DNS autoritativo (dnspython) |
| `docker/Dockerfile.amass` | Imagen de Amass con DNAT/SNAT preconfigurado |
| `docker/dns_server.py` | Servidor DNS autoritativo en Python |
| `configs/config.yaml` | Configuración de Amass: scope, transforms, brute force |
| `configs/datasources.yaml` | Fuentes de datos documentadas (ninguna externa activa) |
| `wordlists/seeds.txt` | 13 candidatos: 11 existen, 2 se descartan |
| `wordlists/subdomains-lab.txt` | Lista para fuerza bruta |
| `wordlists/alterations-lab.txt` | Palabras del plugin FQDN-Alterations |
| `scripts/dnat-setup.sh` | Aplica DNAT + SNAT + iptables DROP (entrypoint) |
| `scripts/run-amass.sh` | Arranca el motor local y ejecuta enum/subs |
| `scripts/resolvers.txt` | Los 53 resolvers públicos hardcodeados en Amass v5 |
| `scripts/01-setup-dns.sh` | Montaje de BIND9 en una VM real (alternativa) |
| `scripts/03-aislar-salida.sh` | Bloqueo de salida en VM nativa (alternativa) |
| `scripts/04-setup-attacker.sh` | Docker + Amass en VM nativa (alternativa) |
| `TOPOLOGIA.md` | Diagrama y mapeo DNS → activos |
| `NOTAS-PASIVO.md` | Cómo funciona el modo pasivo offline + limitaciones reales |
| `../02-GUIA-LABORATORIO.md` | **Guía completa con todos los comandos** |

---

## Topología

```
RED DOCKER "labnet" — 192.168.56.0/24 (aislada)

  dns      192.168.56.101:53    DNS autoritativo ficticio
  engine   192.168.56.100:4000  Motor Amass v5 + SQLite
  client   192.168.56.102       amass enum / amass subs + iptables DROP

  objetivo (opcional) 192.168.56.103  Metasploitable 3
```

---

## Tres detalles técnicos que hay que conocer

### 1. `transformations` no es opcional

En Amass v5, el motor carga esa sección del `config.yaml` al leer el archivo.
Si falta, `CheckTransformations` falla y **ningún plugin se activa**: la
enumeración termina sin descubrir nada, sin error visible.

### 2. Los resolvers DNS están hardcodeados

El plugin DNS de v5 (`engine/plugins/support/resolvers.go`) construye un pool
round-robin de **53 resolvers públicos** (8.8.8.8, 1.1.1.1, 9.9.9.9…) y usa
`8.8.4.4` para el wildcard detector. La opción `resolvers:` del `config.yaml`
solo aplica a `intel`/`whois`.

Por eso el laboratorio usa **DNAT + SNAT**: el destino se reescribe al DNS del
laboratorio y el origen de la respuesta se reescribe a la IP que el pool
reconoce. Sin SNAT, `owasp-amass/resolve` descarta las respuestas porque las
empareja por IP de origen.

### 3. La API cambió en v5

| Bandera / subcomando | v3 / v4 | v5 |
|---|---|---|
| `enum -src`, `-o`, `-ip`, `-do`, `-json` | ✔ | ✘ |
| `amass db -list`, `db -show` | ✔ | ✘ (eliminado) |
| `amass subs -names -ip` | — | ✔ (reemplazo) |

El subcomando `enum` solo acepta: `-active`, `-alts`, `-brute`, `-d`, `-df`,
`-engine`, `-exclude`, `-include`, `-list`, `-nf`, `-norecursive`, `-p`,
`-rigid`, `-timeout`, `-w`.

---

## Verificación rápida

```bash
# ¿El DNS responde?
docker compose exec dns nslookup lab.local 127.0.0.1

# ¿El motor está vivo?
docker compose exec engine wget -qO- http://127.0.0.1:4000/api/v1/health

# ¿Las reglas de aislamiento están aplicadas? (debe dar 106)
docker compose exec client iptables -t nat -L OUTPUT -n | grep -c DNAT

# ¿Internet está bloqueado?
docker compose run --rm --no-deps client \
  sh -c 'curl -s --max-time 5 -o /dev/null https://owasp.org || echo BLOQUEADO'

# ¿Cuántas consultas DNS hizo la enumeración? (~500-600)
docker compose logs dns | grep -c query
```

---

## Nota de seguridad

`lab.local` es un TLD reservado por la IANA para pruebas; no existe en Internet.
`192.168.56.0/24` es un rango RFC 1918 privado. El laboratorio no puede, por
diseño, alcanzar sistemas reales.

Para montar el laboratorio sobre VMs físicas en lugar de contenedores, consulta
`scripts/01-setup-dns.sh`, `scripts/03-aislar-salida.sh` y
`scripts/04-setup-attacker.sh`, y la sección de troubleshooting de
`../02-GUIA-LABORATORIO.md`.
