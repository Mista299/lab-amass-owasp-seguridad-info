# LAB-INFRA - Laboratorio OWASP Amass

Infraestructura del laboratorio de reconocimiento y mapeo de superficie de
ataque con **OWASP Amass v5**.

- **Dominio ficticio:** `lab.local` (TLD reservado por la IANA)
- **Red del laboratorio:** `192.168.56.0/24` (RFC 1918 privada)

Todo corre en Docker. No necesitas Kali, ni máquinas virtuales, ni una IP
pública.

---

## Puesta en marcha en 3 comandos

```bash
cd lab-infra/docker
docker compose -f compose.yaml up -d --build
docker compose -f compose.yaml ps          # ambos contenedores deben estar Up
docker compose -f compose.yaml exec amass amass subs -names -d lab.local -ip
```

O, desde la raíz del proyecto, con el script que lo hace todo:

```bash
./start.sh
```

Detener:

```bash
./start.sh --stop
```

---

## Contenido

| Ruta | Descripción |
|---|---|
| `dns/zone.txt` | Zona DNS ficticia: 32 nombres (A, NS, MX, CNAME, SRV) |
| `dns/db.lab.local` | La misma zona en formato BIND9, para montarla en una VM real |
| `dns/db.192.168.56` | Zona inversa (PTR) del laboratorio |
| `docker/compose.yaml` | Topología: `dns` + `amass` |
| `docker/Dockerfile.dns` | Imagen del DNS autoritativo (dnspython) |
| `docker/Dockerfile.amass` | Imagen de Amass con redirección de DNS preconfigurada |
| `docker/dns_server.py` | Servidor DNS autoritativo en Python |
| `docker/dnat-setup.sh` | Aplica la redirección DNS al arrancar (entrypoint) |
| `docker/run-amass.sh` | Arranca el motor y ejecuta enum/subs |
| `docker/resolvers.txt` | Los 53 resolvers públicos hardcodeados en Amass v5 |
| `configs/config.yaml` | Configuración de Amass: scope, transforms, brute force |
| `configs/datasources.yaml` | Fuentes de datos documentadas (ninguna externa activa) |
| `wordlists/subdomains-lab.txt` | Lista para fuerza bruta (13 candidatos) |
| `wordlists/seeds.txt` | Nombres candidatos para experiments |
| `wordlists/alterations-lab.txt` | Palabras del plugin FQDN-Alterations |
| `scripts/01-setup-dns.sh` | Montaje de BIND9 en una VM real (alternativa) |
| `scripts/02-setup-osint-mock.sh` | Mock de fuentes OSINT (opcional) |
| `scripts/03-aislar-salida.sh` | Bloqueo de salida en VM nativa (alternativa) |
| `scripts/04-setup-attacker.sh` | Docker + Amass en VM nativa (alternativa) |
| `webmock/` | Fuentes OSINT simuladas (opcional) |
| `TOPOLOGIA.md` | Diagrama y mapeo DNS -> activos |
| `NOTAS-PASIVO.md` | Cómo funciona el modo pasivo offline y sus limitaciones |
| `../02-GUIA-LABORATORIO.md` | **Guía completa con todos los comandos** |

---

## Topología

```
RED DOCKER "labnet" — 192.168.56.0/24

  amass-lab-dns     192.168.56.101:53    DNS autoritativo ficticio
  amass-lab-amass   192.168.56.100       Motor + cliente de Amass v5
                                             + SQLite (asset.db)
                                             + redirección DNS -> lab

  objetivo (opcional) 192.168.56.103     Metasploitable 3
```

---

## Cómo entrar en cada máquina

```bash
cd lab-infra/docker

# Entrar en la máquina Amass (aquí se ejecutan los comandos de Amass)
docker compose -f compose.yaml exec amass bash

# Entrar en la máquina DNS
docker compose -f compose.yaml exec dns bash

# Salir de cualquiera de las dos
exit
```

---

## Verificación rápida

```bash
# ¿El DNS responde?
docker compose -f compose.yaml exec amass \
  dig +short @192.168.56.101 dev.lab.local A

# ¿Los subdominios descubiertos?
docker compose -f compose.yaml exec amass \
  amass subs -names -d lab.local -ip

# ¿Cuántas consultas DNS se hicieron?
docker compose -f compose.yaml logs dns | grep -c query
```

---

## Tres detalles técnicos que hay que conocer

### 1. `transformations` no es opcional

En Amass v5 el motor carga esa sección del `config.yaml` al leer el archivo.
Si falta, **ningún plugin se activa**: la enumeración termina sin descubrir nada
y sin error visible.

### 2. Los resolvers DNS están escritos en el código

El plugin DNS de v5 (`engine/plugins/support/resolvers.go`) usa una lista fija
de 53 servidores DNS públicos y `8.8.4.4` para el wildcard detector. La opción
`resolvers:` del `config.yaml` solo aplica a `intel`/`whois`.

La imagen de Amass del laboratorio trae la redirección de red preconfigurada
para que las consultas lleguen al DNS ficticio. Se aplica sola al arrancar.

### 3. La API cambió en v5

| Bandera / subcomando | v3 / v4 | v5 |
|---|---|---|
| `enum -src`, `-o`, `-ip`, `-do`, `-json` | ✔ | ✘ |
| `amass db -list`, `db -show` | ✔ | ✘ (eliminado) |
| `amass subs -names -ip` | — | ✔ (reemplazo) |

Además, **Amass v5.1.3 tiene un bug**: el endpoint `bulk` de la API entra en
*panic* por puntero nulo (`engine/api/server/v1/utils.go:91`) y mata el motor.
Se manifiesta como:

```
Failed to perform a bulk transfer of assets: ... EOF
```

**Solución:** no uses `-nf`. La fuerza bruta se hace con `-brute -w`, que es la
vía estable y produce el mismo resultado observable.

---

## Nota de seguridad

`lab.local` es un TLD reservado por la IANA para pruebas. `192.168.56.0/24` es un
rango RFC 1918 privado. El laboratorio no puede alcanzar sistemas reales.

Para montarlo sobre VMs físicas en lugar de contenedores, consulta
`scripts/01-setup-dns.sh`, `scripts/03-aislar-salida.sh` y
`scripts/04-setup-attacker.sh`.
