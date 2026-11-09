# OWASP Amass · Laboratorio 100 % offline

Laboratorio de reconocimiento y mapeo de superficie de ataque con **OWASP Amass v5**
completamente aislado de Internet.

- **Dominio ficticio:** `lab.local` (TLD reservado por la IANA, no existe en Internet)
- **Red del laboratorio:** `192.168.56.0/24` (RFC 1918 privada)
- **Salida a Internet:** bloqueada con `iptables` (política DROP)
- **Objetivo opcional:** Metasploitable 3 en `192.168.56.103`

Todo corre en Docker. No necesitas Kali, ni máquinas virtuales, ni una IP pública.

---

## Requisitos

| Componente | Versión | En Arch |
|---|---|---|
| Docker Engine | 24 o superior | `sudo pacman -S docker` |
| Docker Compose | v2 | `sudo pacman -S docker-compose` |
| RAM libre | 2 GB | — |
| Disco libre | 3 GB | — |

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # cierra la sesión y vuelve a entrar
```

> **No necesitas conexión a Internet para ejecutar el laboratorio.** Solo la
> necesitas la primera vez, para descargar las imágenes de Docker.

---

## Puesta en marcha

```bash
git clone https://github.com/TU-USUARIO/amass-lab.git
cd amass-lab

./start.sh
```

Eso construye las imágenes, levanta los contenedores y verifica que todo esté
correcto. Deberías ver:

```
==> Verificando el aislamiento y el DNS
 [✓] DNS del laboratorio responde (192.168.56.101:53)
 [✓] Resolución de subdominios funciona (dev.lab.local → 192.168.56.103)
 [✓] NXDOMAIN correcto para los candidatos inexistentes
 [✓] Internet bloqueado (política DROP)
 [✓] Redirección DNS activa (106 reglas DNAT + SNAT)
```

### Ejecutar la enumeración

```bash
./start.sh --enum
```

Tarda entre 2 y 4 minutos. Al terminar muestra los subdominios descubiertos.

### Ver los resultados

```bash
./start.sh --results     # subdominios con sus IPs
./start.sh --dns         # todas las consultas DNS registradas
./start.sh --logs        # logs en vivo
./start.sh --stop        # detener
./start.sh --reset       # empezar de cero (borra la base de datos)
```

---

## Comandos manuales

```bash
cd lab-infra/docker

# Estado
docker compose -f compose.yaml ps

# Enumeración activa con fuerza bruta
docker compose -f compose.yaml exec amass amass enum \
  -engine http://127.0.0.1:4000 \
  -active -brute -w /wl/subdomains-lab.txt \
  -d lab.local -p 80,443 -timeout 3

# Resultados
docker compose -f compose.yaml exec amass amass subs -names -d lab.local -ip

# Verificar el aislamiento
docker compose -f compose.yaml exec amass sh -c \
  'curl -s --max-time 5 -o /dev/null https://owasp.org && echo FUGA || echo BLOQUEADO'

# Consultas DNS de la fuerza bruta
docker compose -f compose.yaml logs dns | grep "query" \
  | sed 's/.*\[query\] //' | awk '{print $1}' | sort -u

# Inspeccionar la base de datos de activos
docker compose -f compose.yaml exec amass sqlite3 /.config/amass/asset.db \
  "SELECT fqdn FROM fqdn ORDER BY fqdn;"
```

---

## Topología

```
RED DOCKER "labnet" — 192.168.56.0/24 (aislada)

  amass-lab-dns     192.168.56.101:53    DNS autoritativo ficticio
  amass-lab-amass   192.168.56.100       Motor + cliente de Amass v5
                                             + SQLite (asset.db)
                                             + DNAT/SNAT → DNS del lab
                                             + iptables DROP → Internet

  objetivo (opcional) 192.168.56.103     Metasploitable 3
```

---

## La zona DNS del laboratorio

`lab.local` contiene 32 nombres:

| Grupo | Nombres |
|---|---|
| Objetivo | `www`, `mail`, `www2` |
| Preproducción | `dev`, `staging`, `qa`, `uat`, `preprod` |
| Administración | `admin`, `portal`, `vpn` |
| CI/CD | `jenkins`, `gitlab` |
| Observabilidad | `grafana`, `kibana` |
| APIs | `api`, `beta`, `sandbox` |
| Residuales | `old`, `backup` |
| Aliases CNAME | `intranet`, `secure`, `ci`, `scm`, `metrics`, `logs`, `preview`, `legacy` |
| Infraestructura | `ns1`, `sipserver` (+ registro SRV `_sip._tcp`) |

Además: `bgp.tools` resuelve a la IP del DNS del laboratorio porque el motor de
Amass v5 lo necesita para arrancar (ver más abajo).

---

## Tres detalles técnicos que hay que conocer

### 1. `transformations` no es opcional

En Amass v5 el motor carga esa sección del `config.yaml` al leer el archivo.
Si falta, `CheckTransformations` falla y **ningún plugin se activa**: la
enumeración termina sin descubrir nada y sin error visible.

### 2. Los resolvers DNS están hardcodeados

El plugin DNS de v5 (`engine/plugins/support/resolvers.go`) construye un pool
round-robin de **53 resolvers públicos** (8.8.8.8, 1.1.1.1, 9.9.9.9…) y usa
`8.8.4.4` para el wildcard detector. La opción `resolvers:` del `config.yaml`
solo aplica a `intel`/`whois`.

Por eso el laboratorio usa **DNAT + SNAT**:

- **DNAT**: el destino (8.8.8.8:53) se reescribe al DNS del laboratorio.
- **SNAT**: el origen de la respuesta se reescribe a la IP que el pool
  reconoce. Sin esto, `owasp-amass/resolve` descarta las respuestas porque las
  empareja por IP de origen (`conn/connection.go`).

Y el bloqueo `DROP` de todo lo demás es la garantía real del aislamiento.

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

## Documentación

| Archivo | Contenido |
|---|---|
| `02-GUIA-LABORATORIO.md` | Guía completa: todos los comandos, explicaciones y troubleshooting |
| `01-GUION-EXPOSITOR.md` | Guion de la exposición de 25 minutos |
| `00-PLAN-EJERCICIO-PRACTICO-OWASP-AMASS.md` | Plan de la sesión |
| `lab-infra/README.md` | Detalle de la infraestructura |
| `lab-infra/TOPOLOGIA.md` | Diagrama y mapeo DNS → activos |
| `lab-infra/NOTAS-PASIVO.md` | Cómo funciona el modo pasivo offline y sus limitaciones |
| `slides/output/OWASP-Amass-Presentacion.pptx` | Presentación de 11 diapositivas |

---

## Licencia y uso educativo

Material de uso académico para cursos de seguridad de la información.

El objetivo del laboratorio es **exclusivamente** la demostración sobre un DNS
ficticio propio. `lab.local` no existe en Internet y `192.168.56.0/24` es un
rango privado: el laboratorio no puede alcanzar sistemas reales.

Ejecutar reconocimiento contra objetivos reales **requiere autorización escrita
expresa**. La herramienta se automatiza; la responsabilidad no.

---

## Referencias

- Sitio del proyecto: <https://owasp.org/projects/amass>
- Documentación oficial v5: <https://owasp-amass.github.io/docs/>
- Código fuente: <https://github.com/owasp-amass/amass>
- Biblioteca de resolución DNS: <https://github.com/owasp-amass/resolve>
