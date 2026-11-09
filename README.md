# OWASP Amass · Laboratorio 100 % offline

Laboratorio de reconocimiento y mapeo de superficie de ataque con **OWASP Amass v5**
completamente aislado de Internet.

- **Dominio ficticio:** `lab.local` (TLD reservado por la IANA, no existe en Internet)
- **Red del laboratorio:** `192.168.56.0/24` (RFC 1918 privada)
- **Objetivo opcional:** Metasploitable 3 en `192.168.56.103`

Todo corre en Docker. No necesitas Kali, ni máquinas virtuales, ni una IP pública.

---

## ⚠️ Antes de empezar

**Todo este laboratorio ocurre dentro de tu portátil.** No hay servidor remoto,
no hay nube, no hay objetivo ajeno:

- El dominio `lab.local` **no existe en Internet** (TLD reservado por la IANA).
- La red `192.168.56.0/24` es **privada** (RFC 1918).
- El servidor DNS es un contenedor de Docker en tu máquina.

No puedes hacer daño a nadie con este laboratorio.

### ¿Y si quiero practicar contra algo real?

| Opción | Qué puedes practicar | Riesgo |
|---|---|---|
| **Este laboratorio** | Todo: pasivo, DNS, fuerza bruta, AXFR | **Nulo** |
| **Tu propio dominio** (~10 USD/año) | Todo, contra infraestructura real | **Nulo** |
| **Dominios IANA** (`example.com`) | **Solo pasivo**: OSINT, CT, DNS pasivo | Nulo |
| **Bug bounty** (HackerOne, Bugcrowd) | Solo dentro del scope publicado | Bajo |

> **El alcance se define antes de la herramienta.** "Voy a usar Amass" no es un
> alcance; "autorizo el reconocimiento pasivo del dominio X" sí.
>
> Y ojo: **HackerOne no es un laboratorio**. Es una plataforma de reporte: te
> registras, lees el scope de un programa, haces reconocimiento pasivo y
> reportas lo que encuentres. No hay máquina virtual que descargar.

Detalle completo en
[`02-GUIA-LABORATORIO.md`](02-GUIA-LABORATORIO.md#pruebas-contra-objetivos-reales--qué-es-legal-y-qué-no).

---

## Requisitos

| Componente | Versión | En Arch | En Debian/Ubuntu |
|---|---|---|---|
| Docker Engine | 24 o superior | `sudo pacman -S docker` | ver docs.docker.com |
| Docker Compose | v2 | `sudo pacman -S docker-compose` | `sudo apt install docker-compose-plugin` |
| RAM libre | 2 GB | — | — |
| Disco libre | 3 GB | — | — |

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # cierra la sesión y vuelve a entrar
```

> **No necesitas conexión a Internet para ejecutar el laboratorio.** Solo la
> necesitas la primera vez, para descargar las imágenes de Docker.

### Instalar Amass en tu equipo (opcional)

No hace falta para el laboratorio, pero si quieres **aprender la herramienta
por fuera**:

**Arch Linux** — binario oficial:

```bash
cd /tmp
curl -LO https://github.com/owasp-amass/amass/releases/download/v5.1.3/amass_linux_amd64.tar.gz
curl -LO https://github.com/owasp-amass/amass/releases/download/v5.1.3/amass_checksums.txt
sha256sum -c amass_checksums.txt --ignore-missing
tar xzf amass_linux_amd64.tar.gz
sudo install -m 755 amass_linux_amd64/amass /usr/local/bin/amass
```

**Kali Linux** — desde los repositorios:

```bash
sudo apt update
sudo apt install -y amass
```

**Confirmar la instalación:**

```bash
which amass      # /usr/local/bin/amass (Arch) o /usr/bin/amass (Kali)
amass -version   # v5.1.3
amass -h         # debe listar: assoc, engine, enum, subs, track, viz
```

> Amass instalado de forma nativa **sí sale a Internet**: consulta fuentes
> OSINT públicas. En el laboratorio eso no ocurre, porque todo se dirige al
> DNS ficticio.

---

## Puesta en marcha

```bash
git clone https://github.com/TU-USUARIO/amass-lab.git
cd amass-lab

./start.sh
```

Eso construye las imágenes, levanta los contenedores y verifica que el DNS
responda. La primera vez tarda unos 2 minutos.

### Ejecutar la enumeración

```bash
./start.sh --enum
```

Tarda entre 2 y 4 minutos.

### Entrar en la máquina Amass

Para escribir los comandos a mano (es lo recomendado para aprender):

```bash
cd lab-infra/docker
docker compose -f compose.yaml exec amass bash
```

Ya estás dentro. Para salir: `exit`.

### Ver los resultados

```bash
./start.sh --results     # subdominios con sus IPs
./start.sh --dns         # todas las consultas DNS registradas
./start.sh --logs        # logs en vivo
./start.sh --stop        # detener
./start.sh --reset       # empezar de cero (borra la base de datos)
```

### Atajo para comandos sueltos de Amass

```bash
./start.sh amass -version
./start.sh amass subs -names -d lab.local -ip
./start.sh amass enum -h
```

---

## Topología

```
RED DOCKER "labnet" — 192.168.56.0/24

  amass-lab-dns     192.168.56.101:53    DNS autoritativo ficticio
  amass-lab-amass   192.168.56.100       Motor + cliente de Amass v5
                                             + SQLite (asset.db)
                                             + redirección DNS → lab

  objetivo (opcional) 192.168.56.103     Metasploitable 3
```

---

## Comandos manuales

Entra en la máquina Amass y escribe los comandos ahí:

```bash
cd lab-infra/docker
docker compose -f compose.yaml exec amass bash
```

Dentro ya puedes escribir:

```bash
amass -version
amass enum -h
amass subs -names -d lab.local -ip
sqlite3 /.config/amass/asset.db "SELECT fqdn FROM fqdn;"
dig +short @192.168.56.101 dev.lab.local A
```

Para salir: `exit`.

Desde el portátil, para consultar las consultas DNS y la zona:

```bash
cd lab-infra/docker

docker compose -f compose.yaml logs dns | grep "query" \
  | sed 's/.*\[query\] //' | awk '{print $1}' | sort -u

docker compose -f compose.yaml exec dns cat /app/zone.txt
```

---

## Topología

```
RED DOCKER "labnet" — 192.168.56.0/24

  amass-lab-dns     192.168.56.101:53    DNS autoritativo ficticio
  amass-lab-amass   192.168.56.100       Motor + cliente de Amass v5
                                             + SQLite (asset.db)
                                             + redirección DNS → lab

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

Por eso la imagen de Amass del laboratorio trae reglas de redirección de red
preconfiguradas: las consultas se dirigen al DNS ficticio en lugar de a los
servidores públicos. Se aplican solas al arrancar el contenedor; no hay nada
que configurar.

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
