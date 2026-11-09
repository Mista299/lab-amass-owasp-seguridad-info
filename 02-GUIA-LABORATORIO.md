# Guía del laboratorio — OWASP Amass

**Laboratorio de reconocimiento y mapeo de superficie de ataque**
Dominio ficticio: `lab.local` · Red: `192.168.56.0/24`

**Expositor:** Michael Stiven Tabares Tobón
**Curso:** Seguridad de la Información — 2026-II · Ingeniería de Sistemas, UdeA

---

## Las dos "máquinas" del laboratorio

Aunque los dos corren en Docker, piénsalos como dos máquinas separadas:

| Máquina | Cómo se llama | Qué hace | Cómo entras |
|---|---|---|---|
| **Tu portátil (Arch)** | `host` | Tu equipo. Aquí escribes los comandos. | Ya estás aquí |
| **Servidor DNS** | `dns` | Sirve la zona ficticia `lab.local` | `docker compose exec dns ...` |
| **Amass** | `amass` | La herramienta. Aquí corres los comandos de Amass. | `docker compose exec amass bash` |

> **Regla:** todo comando de `amass` se ejecuta **dentro de la máquina `amass`**.
> Todo comando de `dig`/`nslookup` se puede ejecutar dentro de `amass` o en `dns`.

---

## Índice

**Para operar el laboratorio (usa el script)**
- [Paso 0 (opcional) · Instalar Amass nativo](#paso-0-opcional--instalar-amass-nativo-en-tu-equipo)
- [Paso 1 · Montar el laboratorio](#paso-1--montar-el-laboratorio)
- [Paso 2 · Entrar dentro de la máquina Amass](#paso-2--entrar-dentro-de-la-máquina-amass)
- [Paso 3 · Comandos de la práctica](#paso-3--comandos-de-la-práctica)
- [Paso 4 · Experimentos para aprender](#paso-4--experimentos-para-aprender)
- [Paso 5 · Resumen: dónde se ejecuta cada cosa](#paso-5--resumen-dónde-se-ejecuta-cada-cosa)

**Conceptos**
- [Entender el laboratorio · Qué es un DNS](#entender-el-laboratorio--qué-es-un-dns-y-qué-hace-cada-contenedor)
- [Cómo funciona esto en un entorno real](#cómo-funciona-esto-en-un-entorno-real)
- [Pruebas contra objetivos reales · Qué es legal y qué no](#pruebas-contra-objetivos-reales--qué-es-legal-y-qué-no)

**Referencia**
- [Los atajos del script](#los-atajos-del-script)
- [La zona del laboratorio](#la-zona-del-laboratorio)
- [Problemas frecuentes](#problemas-frecuentes)
- [Dos detalles técnicos](#dos-detalles-técnicos-que-vale-la-pena-conocer)

---

## Paso 0 (opcional) · Instalar Amass nativo en tu equipo

> **¿Hace falta para el laboratorio? No.** El laboratorio ya trae Amass dentro
> del contenedor Docker y `./start.sh` se encarga de todo.
>
> Esta sección es para cuando quieras **aprender Amass en tu propia máquina**,
> fuera del laboratorio. Ten en cuenta que Amass instalado de forma nativa
> **sí sale a Internet**: consulta fuentes OSINT públicas (crt.sh, RapidDNS,
> HackerTarget…) y resuelve con servidores DNS públicos.

### En Arch Linux

#### Opción A — Binario oficial (rápido, sin compilar)

```bash
cd /tmp
curl -LO https://github.com/owasp-amass/amass/releases/download/v5.1.3/amass_linux_amd64.tar.gz
curl -LO https://github.com/owasp-amass/amass/releases/download/v5.1.3/amass_checksums.txt

# Verificar la integridad del archivo
sha256sum -c amass_checksums.txt --ignore-missing

# Descomprimir e instalar
tar xzf amass_linux_amd64.tar.gz
sudo install -m 755 amass_linux_amd64/amass /usr/local/bin/amass

# Limpiar
rm -rf amass_linux_amd64 amass_linux_amd64.tar.gz amass_checksums.txt
```

> En ARM (Raspberry Pi, laptops ARM) cambia `amass_linux_amd64.tar.gz` por
> `amass_linux_arm64.tar.gz`.

##### Alternativa sin sudo (instalar en tu carpeta personal)

```bash
mkdir -p ~/.local/bin
cd /tmp
curl -LO https://github.com/owasp-amass/amass/releases/download/v5.1.3/amass_linux_amd64.tar.gz
tar xzf amass_linux_amd64.tar.gz
install -m 755 amass_linux_amd64/amass ~/.local/bin/amass

# Asegura que ~/.local/bin está en el PATH
grep -q 'HOME/.local/bin' ~/.bashrc || \
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Comprobar
which amass && amass -version
```

> `~/.local/bin` ya viene en el `PATH` por defecto en Arch. Si `which amass`
> no lo encuentra tras instalar, es que tu `~/.bashrc` no lo incluye: agrega
> la línea del `export` de arriba.

#### Opción B — AUR

```bash
# Con yay (o cualquier helper de AUR)
yay -S amass-bin

# O manualmente con makepkg
git clone https://aur.archlinux.org/amass-git.git
cd amass-git
makepkg -si
```

#### Opción C — Compilar desde el código (necesita Go 1.25+)

```bash
sudo pacman -S --needed go git
git clone https://github.com/owasp-amass/amass.git
cd amass
CGO_ENABLED=0 go install -v github.com/owasp-amass/amass/v5/cmd/amass@main
```

El binario queda en `$(go env GOPATH)/bin`. Para que esté en el `PATH`:

```bash
echo 'export PATH="$PATH:$(go env GOPATH)/bin"' >> ~/.bashrc
source ~/.bashrc
```

### En Kali Linux

Kali trae Amass en sus repositorios:

```bash
sudo apt update
sudo apt install -y amass
```

> **Atención:** la versión de los repositorios de Kali puede no ser la última.
> Para instalar la v5 concreta, usa el binario oficial o compila desde el
> código (las mismas órdenes de Arch, Opciones A y C).

### Alternativa universal: Docker

Si no quieres instalar nada en el sistema:

```bash
docker pull owaspamass/amass:latest
docker run --rm owaspamass/amass:latest -version
```

### Confirmar que quedó instalado

```bash
# 1. ¿Está en el PATH?
which amass
# Esperado: /usr/local/bin/amass   (Arch)
#           /usr/bin/amass           (Kali)

# 2. ¿Qué versión es?
amass -version
# Esperado: v5.1.3

# 3. ¿Responde la ayuda?
amass -h
# Debe listar los subcomandos: assoc, engine, enum, subs, track, viz

# 4. ¿Qué subcomandos tiene?
amass -h 2>&1 | grep -oE "\[assoc\|engine\|enum\|subs\|track\|viz\]"
# Esperado: [assoc|engine|enum|subs|track|viz]

# 5. Comprobación final
amass -version && echo "INSTALACIÓN CORRECTA"
```

> **Sobre `amass enum -list`:** en la v5 este comando **no** solo lista las
> fuentes: además de eso **ejecuta una enumeración** y por eso pide un dominio
> (`-d`) y tarda. Úsalo solo si quieres ver la lista completa de fuentes
> activas: `amass enum -list -d lab.local`. Para una comprobación rápida,
> `amass -h` es suficiente.

Si `which amass` no devuelve nada, el binario no está en el `PATH`. En Arch
suele estar en `/usr/local/bin` (revisa con `echo $PATH`); en Kali, en `/usr/bin`.

---

## Entender el laboratorio · Qué es un DNS y qué hace cada contenedor

> Esta sección es el contexto para entender todo lo demás. Léela antes de la
> práctica si todavía no dominas DNS.

---

### ¿Qué es un DNS?

**DNS es el sistema que traduce nombres a direcciones IP.**

Es la libreta de contactos de Internet. Cuando escribes `www.lab.local` en el
navegador, alguien tiene que convertir ese nombre en algo que se pueda
conectar por red: una dirección como `192.168.56.103`.

```
  www.lab.local          ← el NOMBRE (lo que escribes tú)
        │
        │  "¿qué IP tiene este nombre?"
        ▼
  ┌─────────────┐
  │   DNS       │  ← el LIBRO (nombres → direcciones)
  └─────────────┘
        │
        ▼
  192.168.56.103        ← la DIRECCIÓN (lo que se conecta el navegador)
```

Sin DNS, tendrías que escribir `http://192.168.56.103` en lugar de
`http://www.lab.local`. Todo Internet funciona sobre esta traducción.

#### Los dos papeles del DNS

| Papel | Qué hace | Ejemplo |
|---|---|---|
| **Resolver** (resolver) | Nombre → IP | `dev.lab.local` → `192.168.56.103` |
| **Autoritativo** (authoritative) | Guardar la zona y responder por ella | Nuestro servidor con la zona `lab.local` |

**Nuestro contenedor `dns` es autoritativo**: no busca la respuesta en otro
lugar, la tiene. Es la fuente de verdad de esa zona.

#### Un registro DNS no es solo un nombre y una IP

Un registro tiene un **tipo**. Los más comunes:

| Tipo | Para qué | Ejemplo en nuestro laboratorio |
|---|---|---|
| `A` | Nombre → IPv4 | `dev.lab.local` → `192.168.56.103` |
| `AAAA` | Nombre → IPv6 | (no usamos) |
| `CNAME` | Alias: un nombre apunta a otro | `intranet.lab.local` → `portal.lab.local` |
| `NS` | Qué servidores DNS son los autorizados | `lab.local` → `ns1.lab.local` |
| `MX` | Servidor de correo | `lab.local` → `mail.lab.local` |
| `SRV` | Qué puerto y protocolo usa un servicio | `_sip._tcp.lab.local` → `sipserver.lab.local:5060` |

#### Las dos respuestas del DNS

Esto es lo que hace la demostración:

| Respuesta | Significado | Ejemplo |
|---|---|---|
| **NOERROR** | "El nombre existe, aquí tienes la respuesta" | `dev.lab.local` → `192.168.56.103` |
| **NXDOMAIN** | "**No existe.** Este nombre no está en mi zona" | `test.lab.local` → nada |

**NXDOMAIN** significa *Non-Existent Domain*. Es la respuesta del DNS cuando
le preguntas por algo que no tiene.

> **Por qué importa en la práctica:** cuando Amass hace fuerza bruta, no está
> "adivinando". Le pregunta al DNS autoritativo. Si el DNS contesta NXDOMAIN,
> el nombre no existe y Amass lo **descarta**. Si contesta NOERROR con una IP,
> lo **confirma**.
>
> El DNS es el juez. La herramienta solo pregunta.

Comprobación real en el laboratorio:

```bash
# Un nombre que existe
docker compose -f compose.yaml exec amass   dig @192.168.56.101 dev.lab.local A | grep status:
# → status: NOERROR

# Un nombre que NO existe
docker compose -f compose.yaml exec amass   dig @192.168.56.101 test.lab.local A | grep status:
# → status: NXDOMAIN
```

---

### Los dos contenedores

#### `dns` — El servidor DNS autoritativo ficticio

```
┌─────────────────────────────────────────────┐
│  amass-lab-dns                              │
│  IP: 192.168.56.101                         │
│                                             │
│  Servicio: python3 dns_server.py            │
│  Puerto:   UDP 53  ← el puerto del DNS      │
│                                             │
│  Qué expone: UNA SOLA COSA                  │
│  La zona "lab.local" con 32 nombres          │
│                                             │
│  Estado: ES LA ÚNICA FUENTE DE VERDAD       │
│  del laboratorio. Si un nombre no está      │
│  aquí, no existe.                           │
└─────────────────────────────────────────────┘
```

**Qué expone y por qué:**

| Aspecto | Detalle |
|---|---|
| **Puerto** | UDP 53 (el puerto estándar de DNS) |
| **Protocolo** | DNS sobre UDP |
| **Expone** | Un solo recurso: la zona `lab.local` |
| **Zona** | 32 nombres: A, CNAME, NS, MX y un SRV |
| **Responde** | NOERROR con la IP si el nombre existe; NXDOMAIN si no |
| **No expone** | NADA más. No hay web, ni SSH, ni base de datos. |

Su código está en `lab-infra/docker/dns_server.py`, y la zona en
`lab-infra/dns/zone.txt`. Puedes leer ambos.

Ver la zona completa:

```bash
docker compose -f compose.yaml exec dns cat /app/zone.txt
```

#### `amass` — El atacante

```
┌─────────────────────────────────────────────┐
│  amass-lab-amass                            │
│  IP: 192.168.56.100                         │
│                                             │
│  Servicios:                                 │
│    · amass engine  → HTTP en 4000          │
│    · amass enum    → el comando de escaneo  │
│    · amass subs    → lectura de resultados │
│                                             │
│  Base de datos: SQLite en                   │
│    /.config/amass/asset.db                  │
│                                             │
│  Contiene: 35+ plugins de reconocimiento    │
│  (DNS, Certificate Transparency, scraping…) │
└─────────────────────────────────────────────┘
```

**Qué expone:**

| Aspecto | Detalle |
|---|---|
| **Puerto** | HTTP 4000 (solo dentro de la red del laboratorio) |
| **Expone** | La API del motor de Amass, para que el cliente `enum` le pida trabajo |
| **Guarda** | El grafo de activos en SQLite |
| **Contiene** | El binario `amass` con todos sus plugins |

**El flujo de trabajo, paso a paso:**

```
1.  amass enum -d lab.local
        │
        │  ¿existe un motor corriendo?
        ▼
2.  Arranca "amass engine" en segundo plano (HTTP :4000)
        │
        │  POST /api/v1/sessions  →  "crea una sesión de enumeración"
        ▼
3.  El motor carga su config: el scope (lab.local), los puertos (80,443)
    y las transformaciones
        │
        │  "busca activos de lab.local"
        ▼
4.  Los plugins trabajan:
      · DNS → consulta al contenedor dns (192.168.56.101)
      · SRV → prueba prefijos estándar (_ldap._tcp, _sip._tcp…)
      · HTTP-Probes → comprueba los puertos 80 y 443
        │
        │  cada hallazgo se guarda como entidad + relación
        ▼
5.  El grafo queda en asset.db
        │
        ▼
6.  amass subs -names -d lab.local -ip  →  lo lee y lo muestra
```

**Por qué el motor está en un puerto HTTP:** el motor es un servicio
independiente. El comando `enum` es un cliente que le dice "haz esta
enumeración" y espera. Por eso se pueden lanzar varios `enum` contra el mismo
motor, o consultar resultados mientras otra enumeración corre.

---

### Cómo se hablan entre sí

```
┌──────────────────────┐         ┌──────────────────────┐
│  amass-lab-amass      │         │  amass-lab-dns       │
│  192.168.56.100       │         │  192.168.56.101      │
│                       │         │                      │
│  "dev.lab.local       │  DNS    │  busca dev.lab.local │
│   resuelve a qué IP?" │ ──────► │  en la zona          │
│                       │  :53    │                      │
│  ← 192.168.56.103     │ ◄────── │  "192.168.56.103"    │
│                       │         │                      │
│  guarda la relación   │         │  "test.lab.local"    │
│  en asset.db          │         │   no está en la zona │
│                       │  DNS    │                      │
│                       │ ──────► │  → NXDOMAIN         │
│                       │         │                      │
└──────────────────────┘         └──────────────────────┘
```

El tráfico DNS va **dentro de la red Docker** (`192.168.56.0/24`). Nunca sale
a Internet. Las dos "máquinas" se ven entre sí como si fueran equipos físicos
en un switch.

---

### Los dos tipos de activos

Cuando el motor termina, la base de datos tiene activos de dos clases:

| Tipo | Ejemplo | Confianza | Significado |
|---|---|---|---|
| **Confirmado** | `dev.lab.local` | 100 | El DNS respondió con una IP. Existe de verdad. |
| **Descartado** | `test.lab.local` | Baja o nula | Se consultó, el DNS dijo NXDOMAIN. No existe. |

El valor de guardar ambos es que **sabes qué preguntaste y qué obtuviste**.
Un escáner que solo devuelve lo que encontró no te permite afirmar que su
cobertura fue completa. Amass sí.

---

### Comprobación de que el DNS no miente

Una prueba rápida para tus compañeros de clase: pregunta por un nombre que inventaste
en el momento.

```bash
# Un nombre que nunca existió en la zona
docker compose -f compose.yaml exec amass   dig @192.168.56.101 este-no-existe-xyz.lab.local A | grep status:
# → status: NXDOMAIN
```

Y un nombre que sí existe:

```bash
docker compose -f compose.yaml exec amass   dig @192.168.56.101 www.lab.local A | grep status:
# → status: NOERROR
```

Si alguien dice "eso no es real, tú lo inventaste", la respuesta es: **el
servidor DNS es el que dice que no existe**. No es Amass filtrando; es el
servidor de nombres autoritativo respondiendo.

---

## Cómo funciona esto en un entorno real

> La diferencia entre el laboratorio y la realidad no está en el comando. Está
> en **a quién se le pregunta** y **si ese "objetivo" tiene permiso para
> responderte**. Entender esto es lo que separa un mapeo de superficie de
> ataque de un escaneo indiscriminado.

---

### El escenario real

Supongamos `ejemplo.com`, una organización real.

```
TÚ (analista)                 INTERNET                    LA ORGANIZACIÓN
     │                            │                              │
     │  ¿qué NS tiene ejemplo.com? │                              │
     ├───────────────────────────►│  ──► raíz . ──► TLD .com ──► │ ns1.ejemplo.com
     │                            │                              │ ns2.ejemplo.com
     │◄──────────────────────────┤◄─────────────────────────────┤
     │  ns1.ejemplo.com = 203.0.113.10                           │
     │                            │                              │
     │  ¿qué IP tiene www.ejemplo.com?                            │
     ├───────────────────────────────────────────────────────────►│
     │◄───────────────────────────────────────────────────────────┤
     │  www.ejemplo.com = 203.0.113.55                           │
```

**El punto clave:** El nameserver autoritativo de una organización **contesta
a cualquiera que pregunte**. No hay autenticación. `dig @ns1.ejemplo.com
www.ejemplo.com` funciona desde cualquier parte del mundo.

Por eso el reconocimiento pasivo y el semi-activo son tan usados: **puedes
preguntar sin que la víctima se entere**, porque una consulta DNS es
indistinguible de la de cualquier usuario normal.

---

### Las tres formas de preguntar

#### 1. Al resolver recursivo (un resolver público)

```
tú ──► 8.8.8.8 ──► raíz ──► TLD ──► ns1.ejemplo.com ──► respuesta ──► tú
```

Es lo que hace tu navegador. El resolver público recorre la jerarquía por ti.

- ✅ No reveals tu IP al objetivo: ve el resolver, no el servidor autoritativo
- ⚠️ Las consultas quedan en los logs del resolver público (Google, Cloudflare)
- ❌ No sirve para enumerar: solo resuelve nombres que ya conoces

#### 2. Directamente al autoritativo (lo que hace Amass)

```
tú ─────────────────────────────────► ns1.ejemplo.com
```

Amass pregunta **directamente** a los servidores de nombres del dominio.

- ✅ Puedes preguntar por **cualquier** nombre, uno por uno (fuerza bruta)
- ✅ Ves la **respuesta autoritativa**: el nombre existe o no existe (NXDOMAIN)
- ⚠️ Tu IP sí aparece en los logs del servidor de nombres
- ⚠️ Miles de consultas = fácil de detectar para un IDS bien configurado

> **Por qué Amass pregunta directamente:** si usara un resolver recursivo,
> no podría distinguir "este nombre no existe" de "este resolver no lo sabe".
> Contra el autoritativo, el NXDOMAIN es definitivo.

#### 3. Transferencia de zona (AXFR)

```
tú ──► ns1.ejemplo.com ──► "¿me das TODA la zona?"
                            │
                            ├─ Sí (mal configurado) → te llevas los 20.000 registros
                            └─ No (bien configurado) → "REFUSED"
```

Una sola petición te da **toda la zona**. Es el peor error de configuración
posible en un servidor DNS.

Amass lo intenta automáticamente en modo activo. En el laboratorio lo activamos
a propósito para poder mostrarlo.

---

### Por qué la fuerza bruta es un problema

Si consultas un nombre y no existe, el servidor de nombres puede:

| Configuración | Comportamiento | Consecuencia |
|---|---|---|
| Normal | Responde rápido NXDOMAIN | 20.000 candidatos = 20.000 consultas |
| **Rate limiting** | Ralentiza o bloquea | Tu escaneo se frena |
| **DNSLOG / IDS** | Registra y alerta | Te detectan |
| **Wildcard** | Responde a TODO | Obtienes miles de falsos positivos |

**El wildcard** es el caso interesante. Si el servidor tiene:

```
*.ejemplo.com  IN  A  203.0.113.99
```

entonces **todo** nombre resuelve. Tu fuerza bruta devolvería 20.000
"descubrimientos" que no existen. Por eso Amass, antes de reportar un
descubrimiento, genera **nombres aleatorios** y comprueba si también
resuelven. Si un nombre aleatorio resuelve, sabe que hay un wildcard y puede
descartar el falso positivo.

Esos nombres aleatorios son los que ves en el log del laboratorio con formato
`5isoprdn-1td.lab.local`. No son errores: son el control de calidad de Amass.

---

### El riesgo real de cada técnica

| Técnica | Touches el objetivo | Riesgo | Cuándo es legítima |
|---|---|---|---|
| OSINT pasivo (crt.sh, Wayback) | No | **Nulo** | Siempre, con fines informativos |
| Transferencia de zona | Sí, 1 consulta | **Bajo** | Con autorización |
| Resolución DNS de nombres conocidos | Sí, pocas consultas | **Bajo** | Con autorización |
| **Fuerza bruta DNS** | Sí, **miles** | **Medio-alto** | Con autorización explícita del alcance |
| Escaneo de puertos | Sí, miles | **Medio-alto** | Con autorización explícita |
| Explotación | Sí | **Fuera de alcance** | Nunca en un pentest |

---

### El flujo completo en una auditoría real

```
FASE 0 — Alcance por escrito
         "Autorizo el reconocimiento pasivo del dominio ejemplo.com.
          NO autorizo fuerza bruta ni escaneo de puertos."
         ↓
FASE 1 — Pasivo (OSINT)
         amass enum -d ejemplo.com -timeout 60
         → subdominios publicados en certificados, historiales, etc.
         → CERO contacto con el objetivo
         ↓
FASE 2 — Validación (DNS)
         Resolver los nombres obtenidos para ver cuáles siguen vivos
         → algunos ya caducaron. Ese es el valor del dato pasivo
         ↓
FASE 3 — Activo (solo con autorización)
         amass enum -active -d ejemplo.com -p 80,443,8080
         → el inventario real, con servicios
         ↓
FASE 4 — Correlación con el inventario del cliente
         "¿cuáles de estos no estaban en su inventario?"
         ↓
FASE 5 — Reporte priorizado
         " vpn.ejemplo.com (crítico, no está en su inventario)"
```

**La fase 5 es la que genera valor.** La herramienta solo da el inventario.
El análisis es el trabajo del analista.

---

### Las credenciales: el factor que se nos olvida

Las fuentes pasivas de Amass se dividen en dos grupos:

| Tipo | Ejemplos | ¿Necesita API key? |
|---|---|---|
| **Gratuitas** | crt.sh, Wayback, RapidDNS, DuckDuckGo, Bing | No |
| **Con credenciales** | Shodan, VirusTotal, SecurityTrails, Censys, Netlas | **Sí** |

Las que tienen credencial dan **mucho mejor** resultado: datos históricos,
certificados completos, servicios. Por eso un mapeo serio empieza por
configurar credenciales.

En `lab-infra/configs/datasources.yaml` tienes la lista completa documentada.
Todas están comentadas, porque en el laboratorio son innecesarias: el DNS
ficticio ya nos da la respuesta.

---

### Qué cambia entre el laboratorio y la realidad

| Aspecto | Laboratorio | Realidad |
|---|---|---|
| **Objetivo** | DNS propio en 192.168.56.101 | `ns1.ejemplo.com` en Internet |
| **Consultas** | ~200, en red privada | Miles o millones |
| **Credenciales** | No hacen falta | Shodan, VT, SecurityTrails… |
| **Wildcards** | No hay | Hay que detectarlos |
| **Rate limiting** | No | Puede frenarte |
| **Detección** | Imposible | El IDS te ve |
| **Autorización** | Tu propia zona | **Documento firmado** |
| **Riesgo legal** | Ninguno | Altísimo sin permiso |

**Lo único que cambia en el comando es el dominio.** Todo lo demás es idéntico.
Por eso el laboratorio con un DNS propio es una buena aproximación: te
permite practicar el mecanismo sin tocar a nadie.

---

### La regla de oro

> **El alcance se define antes de la herramienta, no después.**
>
> "Voy a usar Amass" no es un alcance.
> "Autorizo reconocimiento pasivo del dominio X" sí lo es.

Si el alcance no está por escrito, no hay escaneo que sea legítimo. Y eso no
lo decide la ethical del analista: lo decide el contrato.

---

## Pruebas contra objetivos reales · Qué es legal y qué no

> Todo lo de esta sección está **verificado empíricamente** en esta máquina
> (noviembre 2026). Los comandos y sus salidas son reales, no examples.
>
> **Lee el bloque de la regla de oro antes de ejecutar nada.**

---

### La regla de oro

> **El alcance se define antes de la herramienta, no después.**
>
> "Voy a usar Amass" no es un alcance.
> "Autorizo el reconocimiento pasivo del dominio X" sí lo es.

Sin autorización escrita, un escaneo no es investigación: es un delito
informático en la mayoría de legislaciones latinoamericanas (en Colombia,
Ley 1273 de 2009, y el Decreto 175 de 2015 que tipifica el acceso no
autorizado a sistemas de información).

**Y esto aplica también a los dominios reservados por la IANA.** Aunque
`example.com` sea de uso público, la IANA y Cloudflare no autorizan
escaneos activos contra sus servidores. Que "el objetivo no tenga nada
interesante" no lo convierte en un objetivo permitido.

---

### Opción 1 (la recomendada) · Tu propio dominio

**Es la única opción 100 % legítima para pruebas activas.**

Si tienes un dominio propio (o puedes registrar uno), puedes hacer
reconocimiento completo sin riesgo legal ni ethical. Un dominio en
DigitalOcean, Namecheap o Cloudflare cuesta unos 10 USD al año.

```
TÚ ──► tu-dominio.com ──► sus propios servidores de nombres
         (tú controlas todo, y autorizas el escaneo)
```

Configuración mínima:

1. Un dominio apuntando a un servidor propio (puede ser tu máquina con
   IP pública o un VPS barato).
2. Servidores de nombres propios (BIND, PowerDNS o los del proveedor).
3. Una zona con varios subdominios que representen activos realistas.
4. Opcional: un certificado TLS real para que las fuentes de Certificate
   Transparency tengan algo que encontrar.

Con esto puedes practicing el flujo completo: **pasivo, validación, activo,
fuerza bruta, AXFR** (incluso mal configurado a propósito, para ver cómo
lo detecta Amass).

> **Es lo que hace este laboratorio, pero con la zona en un contenedor
> local en vez de en Internet.** La única diferencia es dónde están los
> servidores de nombres.

---

### Opción 2 (la más segura para practicar pasivo) · Dominios reservados por la IANA

La IANA reserva varios dominios **específicamente para pruebas y
documentación** ([RFC 6761](https://www.rfc-editor.org/rfc/rfc6761)):

| Dominio | Estado verificado |
|---|---|
| `example.com` | Resuelve a 104.20.23.154 (Cloudflare) |
| `example.org` | Resuelve a 104.20.26.136 |
| `example.net` | Resuelve a 104.20.21.8 |
| `test` | Reservado, no resuelve |
| `invalid` | Reservado, no resuelve |
| `localhost` | Reservado, siempre local |

**Verificado en esta máquina:**

```
$ dig +short example.com A
104.20.23.154
$ dig +short example.com NS
elliott.ns.cloudflare.com.
hera.ns.cloudflare.com.
```

#### ¿Qué se puede y qué no con ellos?

| Técnica | ¿Se puede? | Verificación |
|---|---|---|
| **Pasivo** (OSINT, crt.sh, Wayback) | ✅ **Sí** | Consulta fuentes públicas. No toca el objetivo. |
| **Validación DNS** de nombres conocidos | ✅ Sí, con moderación | Son consultas normales de DNS |
| **Fuerza bruta DNS** | ⚠️ **No recomendable** | Miles de consultas a servidores ajenos. Se puede detectar y es descortés. |
| **Escaneo de puertos** | ❌ **No** | Escanea infraestructura de Cloudflare, no tuya. |
| **AXFR** | ⚠️ Inofensivo, pero pointless | Verificado: `Transfer failed` (bien configurado) |

#### Pruebas pasivas seguras

Estas **no tocan el objetivo** y son perfectamente legítimas:

```bash
# 1. Reconocimiento pasivo con Amass (solo fuentes OSINT)
amass enum -d example.com -timeout 2
# ⚠️ Tarda: cada plugin externo espera su timeout. Dale 3-5 minutos.

# 2. Lo mismo pero acotando el tiempo
amass enum -d example.com -timeout 1

# 3. Ver qué fuentes tiene activas
amass enum -list -d example.com

# 4. Consultar Certificate Transparency directamente (sin Amass)
curl -s "https://crt.sh/?q=%25.example.com&output=json" | jq -r '.[].name_value' | sort -u

# 5. Wayback Machine
curl -s "http://archive.org/wayback/available?url=example.com"

# 6. DNS pasivo: qué publica el dominio
dig example.com NS
dig example.com MX
dig example.com TXT
```

> **Verificación del AXFR** (inofensivo, son 2 peticiones):
> ```
> $ dig AXFR example.com @elliott.ns.cloudflare.com
> ; Transfer failed.
> ```
> Correctamente configurado. Amass lo intentará automáticamente en modo
> activo y obtendrá un refusal, que es un resultado válido.

#### ⚠️ El problema del modo activo con `example.com`

**Verificado:** `amass enum -active -d example.com -p 80,443` **no termina en un
tiempo razonable**. Las causas:

1. El barrido SRV prueba ~120 prefijos estándar contra los NS de Cloudflare.
2. Los plugins externos (crt.sh, RapidDNS…) cada uno espera su timeout.
3. El escaneo de puertos contra una IP de Cloudflare no devuelve nada útil
   (Cloudflare responde en muchos puertos).

**Conclusión:** el modo activo contra `example.com` es una mala práctica. No
porque sea ilegal per se, sino porque **no es tu objetivo** y porque
genera ruido innecesario en infraestructura ajena.

---

### Opción 3 · Bugs bounty y programas de alcance público

Si quieres probar en un objetivo real **y** de forma legal, existen programas
que dan autorización explícita y pública:

| Programa | Alcance | Qué permite |
|---|---|---|
| **HackerOne** |(Number of programs vary) | Reconocimiento en los dominios de cada programa |
| **Bugcrowd** | Por programa | Igual, con reglas específicas |
| **Google VRP** | `*.google.com` (parcial) | Reconocimiento passivo y activo controlado |
| **GitHub Security Lab** | Fuera de alcance | Solo reportar, no escanear |


**Reglas de oro de un programa de bug bounty:**

1. **Lee la política del programa.** Cada uno tiene límites distintos.
2. Identifícate con tu **dirección IP de origen** y tu user agent. Muchos
   programas exigen un identificador.
3. **No escanees lo que no está en el alcance.** El scope suele ser una lista
   explícita de dominios.
4. **No hagas fuerza bruta masiva** salvo que esté permitido.
5. **Reporta lo que encuentres**, incluso sin exploitation. El
   reconocimiento ya es un hallazgo.

Ejemplo de política real (resumida):

```
Scope:      *.ejemplo.com
Allowed:    DNS enumeration, certificate transparency
Not allowed: brute force de subdominios, escaneo de puertos,
              denegación de servicio, cualquier forma de exploitation
```

> **Esto es lo más cercano a un trabajo real** y por eso vale la pena
> mencionarlo: en la industria, la diferencia entre un escáner y un
> profesional no es la herramienta, es el alcance y la identificación.

---

### Resumen: qué hacer en cada caso

| Si quieres… | Usa | Nivel de riesgo |
|---|---|---|
| Practicar la mecánica del laboratorio | `./start.sh --brute` | **Nulo** |
| Practicar pasivo contra algo real | `example.com` con `-d` | **Nulo** (solo OSINT) |
| Practicar activo de verdad | **Tu propio dominio** | Nulo (tú autorizas) |
| Practicar en un programa real | HackerOne / Bugcrowd | Bajo (dentro del scope) |
| Escaneear sin permiso | Nada | **Delito** |

---

### El código de una autorización, en la práctica

Si en algún momento te contratan o haces un praktikum, la autorización debe
tener, como mínimo:

```
1. Identificación del cliente y del objetivo (dominios e IPs exactos)
2. Explicitación de las técnicas permitidas
   (OSINT / DNS / AXFR / fuerza bruta / escaneo de puertos)
3. Fechas de inicio y fin
4. Restricciones: QPS máximo, horarios, IPs excluidas
5. Responsabilidad por los daños colaterales
6. Contacto de emergencia para detener el escaneo
7. Qué hacer con los datos encontrados (confidencialidad, retención)
```

Si ese documento no existe, no hay autorización. Un correo informal de
"mira a ver si mi servidor está expuesto" **no** es autorización para
escanear: es una petición de servicios.

---

## Paso 1 · Montar el laboratorio

Desde tu portátil (Arch), en la raíz del proyecto:

```bash
./start.sh
```

Eso construye todo, levanta los contenedores y comprueba que el DNS responde.
Tarda ~2 minutos la primera vez.

**Salida esperada:**

```
==> Verificando requisitos
 [✓] Docker: Docker version 29.7.2
 [✓] Docker Compose: 5.5.1
 [✓] Daemon de Docker accesible

==> Construyendo las imágenes (la primera vez tarda ~2 min)
 [✓] Imágenes construidas

==> Levantando el laboratorio
 [✓] Contenedores iniciados

==> Esperando a que el motor de Amass esté listo
 [✓] Motor listo tras 1s

==> Verificando el DNS del laboratorio
 [✓] DNS del laboratorio responde (192.168.56.101:53)
 [✓] Resolución de subdominios funciona (dev.lab.local → 192.168.56.103)
 [✓] NXDOMAIN correcto para los candidatos inexistentes
```

Para empezar de cero en cualquier momento:

```bash
./start.sh --reset
```

---

## Paso 2 · Entrar dentro de la máquina Amass

Esta es la orden clave. Desde tu portátil, en la carpeta `lab-infra/docker`:

```bash
cd lab-infra/docker
docker compose -f compose.yaml exec amass bash
```

Ahora tienes una **terminal dentro de la máquina `amass`**. El prompt cambia a algo como:

```
/ # estás dentro del contenedor
```

**Todo lo que hagas de aquí en adelante corre dentro de Amass.** Para salir:

```bash
exit
```

> **Atajo:** si no quieres entrar y salir, puedes ejecutar un solo comando directamente:
> ```bash
> docker compose -f compose.yaml exec amass amass subs -names -d lab.local -ip
> ```

### Verificar que estás dentro

```bash
hostname          # deve mostrar algo como amass-lab-amass
which amass      # /bin/amass
```

---

## Paso 3 · Comandos de la práctica

### 3.1 Ver la versión de Amass

> 📍 **Dónde:** dentro de la máquina `amass`

```bash
amass -version
```

```
v5.1.3
```

---

### 3.2 Ver la ayuda de cada subcomando

> 📍 **Dónde:** dentro de la máquina `amass`

```bash
amass -h              # ayuda general
amass enum -h         # ayuda de enum
amass subs -h         # ayuda de subs
```

---

### 3.3 Comprobar que el DNS ficticio responde

> 📍 **Dónde:** dentro de la máquina `amass`

```bash
dig +short @192.168.56.101 lab.local A
```

```
192.168.56.101
```

Un subdominio que sí existe:

```bash
dig +short @192.168.56.101 dev.lab.local A
```

```
192.168.56.103
```

Uno que **no** existe:

```bash
dig +short @192.168.56.101 test.lab.local A
```

```
(sin salida — el DNS responde NXDOMAIN)
```

> Esto último es importante: **el DNS es el que decide qué existe.** Lo
> volveremos a ver en la fuerza bruta.

---

### 3.4 La enumeración con fuerza bruta

> 📍 **Dónde:** dentro de la máquina `amass`

```bash
amass enum \
  -engine http://127.0.0.1:4000 \
  -active \
  -brute -w /wl/subdomains-lab.txt \
  -d lab.local \
  -p 80,443 \
  -timeout 3
```

**Qué significa cada parte:**

| Parte | En palabras |
|---|---|
| `amass enum` | "Haz una enumeración" |
| `-engine http://127.0.0.1:4000` | "Habla con el motor que corre en esta misma máquina" |
| `-active` | "Pregunta al DNS y comprueba los puertos" |
| `-brute -w /wl/subdomains-lab.txt` | "Prueba los nombres de esta lista" |
| `-d lab.local` | "El objetivo es este dominio" |
| `-p 80,443` | "Solo mira estos dos puertos" |
| `-timeout 3` | "Si dejas de avanzar 3 minutos, te detienes" |

**Tarda entre 2 y 4 minutos.** Verás una barra de progreso.

> ⚠️ **No uses `-nf`**: en Amass v5.1.3 esa opción provoca un error interno que
> tumba el motor. La fuerza bruta se hace con `-brute -w`.

---

### 3.5 Ver los resultados

> 📍 **Dónde:** dentro de la máquina `amass`

```bash
amass subs -names -d lab.local -ip
```

```
mail.lab.local 192.168.56.103
ns1.lab.local 192.168.56.101
lab.local 192.168.56.103
```

Con el resumen completo:

```bash
amass subs -show -d lab.local -ip
```

---

### 3.6 Ver todo lo que se le preguntó al DNS

> 📍 **Dónde:** en tu **portátil** (no dentro del contenedor)
> 📍 **Desde:** la carpeta `lab-infra/docker`

#### El comando

```bash
docker compose -f compose.yaml logs dns | grep "query" \
  | sed 's/.*\[query\] //' | awk '{print $1}' | sort -u
```

#### Qué hace, paso a paso

Es un **tubería**: cada comando recibe la salida del anterior. Vamos a ver cada
etapa con datos reales.

##### Paso 1 — `docker compose ... logs dns`

Muestra el historial de mensajes del contenedor del servidor DNS. Cada línea
tiene este formato:

```
amass-lab-dns  | [query] bgp.tools A id=13812 src=192.168.56.100
```

| Parte | Qué es |
|---|---|
| `amass-lab-dns  |` | Prefijo que Docker pone a cada línea |
| `[query]` | Etiqueta que pone nuestro servidor DNS en cada consulta |
| `bgp.tools` | El nombre que se consultó |
| `A` | El tipo de registro DNS consultado |
| `id=13812` | Identificador único de esa consulta |
| `src=192.168.56.100` | Quién la hizo (el contenedor de Amass) |

##### Paso 2 — `grep "query"`

Se queda solo con las líneas que mencionan consultas DNS, descartando el resto
del log (arranque del servidor, errores, etc.).

##### Paso 3 — `sed 's/.*\[query\] //'`

Borra el prefijo de cada línea y deja solo lo que viene después de `[query] `.

```
ANTES:  amass-lab-dns  | [query] bgp.tools A id=13812 src=192.168.56.100
DESPUÉS:  bgp.tools A id=13812 src=192.168.56.100
```

El `.*` significa "cualquier cosa", y `\[query\]` es el texto literal
`[query]`. El `//` del final es el separador de `sed` (se puede usar `/` u
otro carácter).

##### Paso 4 — `awk '{print $1}'`

Imprime **solo la primera palabra** de cada línea. En Unix, los campos de una
línea se separan por espacios y `$1` es el primero.

```
ANTES:  bgp.tools A id=13812 src=192.168.56.100
DESPUÉS:  bgp.tools
```

Aquí `awk` cumple el papel de `cut -d' ' -f1`, pero es más flexible.

##### Paso 5 — `sort -u`

Ordena alfabéticamente (`sort`) y **elimina los duplicados** (`-u`, de *unique*).

Aquí es donde se ve el valor: Amass consultó el mismo nombre varias veces
(A, AAAA, CNAME) y cada candidato del wordlist más de una vez. Sin `-u`
tendrías cientos de líneas repetidas.

#### La salida

```
5isoprdn-1td.lab.local
7vhr3btx00ytjh7._tcp.lab.local
admin.lab.local
api.lab.local
bgp.tools
dev.lab.local
grafana.lab.local
gitlab.lab.local
jenkins.lab.local
lab.local
mail.lab.local
qa.lab.local
staging.lab.local
test.lab.local          ← se preguntó, el DNS dijo que NO existe
vpn.lab.local
www.lab.local
...
```

#### Cómo leer esta lista

Tres tipos de nombres, y la diferencia es la lección:

| Tipo | Ejemplo | Qué significa |
|---|---|---|
| **Nombres reales** | `dev.lab.local`, `vpn.lab.local` | Existen en la zona. El DNS confirmó. |
| **Nombres que no existen** | `test.lab.local`, `stage.lab.local` | Se preguntaron y el DNS respondió NXDOMAIN. |
| **Ruido interno** | `5isoprdn-1td.lab.local`, `7vhr3btx00ytjh7._tcp.lab.local` | Nombres aleatorios que genera Amass para detectar **wildcards** (DNS que responde a todo). |
| **Nombres del plugin** | `bgp.tools`, `_ldap._tcp.lab.local` | El motor consulta dominios de servicios auxiliares y prefijos SRV estándar. |

#### Filtrar solo lo que nos interesa

Para ver solo los candidatos del wordlist (los que importan para la demo):

```bash
docker compose -f compose.yaml logs dns | grep "query" \
  | sed 's/.*\[query\] //' | awk '{print $1}' | sort -u \
  | grep -E "^(www|mail|dev|staging|qa|admin|vpn|jenkins|gitlab|grafana|api|test|stage)\.lab\.local$"
```

La parte nueva es el último `grep -E`:

| Parte | Qué hace |
|---|---|
| `grep -E` | Versión de grep que usa **expresiones regulares** (patrones con `^`, `\|`, `$`) |
| `^` | La línea debe **empezar** por esto |
| `(www\|mail\|dev\|...)` | Debe empezar por **uno de estos** nombres |
| `\.lab\.local$` | Y terminar en `.lab.local` |
| `$` | Fin de línea (para que no matchee `dev.lab.local.otro`) |

Salida:

```
admin.lab.local
api.lab.local
dev.lab.local
gitlab.lab.local
grafana.lab.local
jenkins.lab.local
lab.local
mail.lab.local
qa.lab.local
staging.lab.local
test.lab.local
stage.lab.local
vpn.lab.local
www.lab.local
```

Nótese que **`test` y `stage` aparecen** en la lista de consultas pero **no** en
los resultados de `amass subs`. Esa diferencia es exactamente lo que
demuestra la fuerza bruta: se preguntó y se descartaron.

#### Comparar: lo consultado contra lo confirmado

Un solo comando muestra la diferencia, que es el argumento central de la demo:

```bash
# Lo que se consultó (candidatos del wordlist)
docker compose -f compose.yaml logs dns | grep "query" \
  | sed 's/.*\[query\] //' | awk '{print $1}' | sort -u \
  | grep -E "^(www|mail|dev|staging|qa|admin|vpn|jenkins|gitlab|grafana|api|test|stage)\.lab\.local$" \
  > /tmp/consultados.txt

# Lo que Amass confirmó
docker compose -f compose.yaml exec -T amass \
  amass subs -names -d lab.local | awk '{print $1}' | sort -u > /tmp/confirmados.txt

# Los descartados: se preguntó, pero no existen
comm -23 /tmp/consultados.txt /tmp/confirmados.txt
```

Salida:

```
stage.lab.local
test.lab.local
```

> **Ese es el momento de la demostración.** Dos nombres se preguntaron, el DNS
> respondió que no existen, y Amass los descartó. La fuerza bruta no solo
> confirma: también **rechaza**, y eso es lo que permite saber si el escaneo
> fue completo.

---

### 3.7 Inspeccionar la base de datos de activos

> 📍 **Dónde:** dentro de la máquina `amass`
> 📍 **Herramienta:** `sqlite3` (ya viene instalada en la imagen)

Aquí es donde se ve el **grafo de activos** que mencionamos en la teoría. Cada
subdominio es una **entidad** y cada relación entre activos es una **arista**.

#### 3.7.1 Ver las tablas

```bash
sqlite3 /.config/amass/asset.db ".tables"
```

```
account           edge_tag       fqdn             location      productrelease
autnumrecord      edge_type_lu   fundstransfer    netblock      service
autonomoussystem  entity         gorp_migrations  organization  tag_type_lu
contactrecord     entity_tag     identifier       person        tlscertificate
domainrecord      entity_type_lu ipaddress        phone         url
edge              file           ipnetrecord      product
```

Las que importan para la demo:

| Tabla | Qué guarda |
|---|---|
| `entity` | El índice de todos los activos (con su tipo y su clave natural) |
| `fqdn` | Los nombres de dominio: `www.lab.local`, `vpn.lab.local`… |
| `ipaddress` | Las direcciones IP |
| `service` | Los servicios detectados en cada puerto |
| `edge` | **Las relaciones.** Es la tabla del grafo. |
| `entity_tag` | La **procedencia** de cada hallazgo: qué fuente lo descubrió y con qué confianza |

#### 3.7.2 Los nombres descubiertos

```bash
sqlite3 /.config/amass/asset.db "SELECT fqdn FROM fqdn ORDER BY fqdn;"
```

```
_sip._tcp.lab.local
admin.lab.local
api.lab.local
dev.lab.local
gitlab.lab.local
grafana.lab.local
jenkins.lab.local
lab.local
mail.lab.local
ns1.lab.local
qa.lab.local
stage.lab.local
staging.lab.local
test.lab.local
vpn.lab.local
www.lab.local
```

Fíjate en **`test.lab.local` y `stage.lab.local`**: están ahí. Amass los
consultó, el DNS respondió que no existen, y aun así quedaron registrados como
activos **con baja confianza**. Eso es el valor de la base de datos: no solo
guarda lo que encontró, sino también lo que **descartó** y por qué.

#### 3.7.3 Las direcciones IP

```bash
sqlite3 /.config/amass/asset.db "SELECT ip_address FROM ipaddress ORDER BY ip_address;"
```

```
192.168.56.101
192.168.56.103
192.168.56.104
192.168.56.105
192.168.56.106
192.168.56.107
192.168.56.108
192.168.56.109
```

#### 3.7.4 El grafo: las relaciones entre activos

Esta es la consulta más importante. Une las tres tablas para mostrar **qué activo
se relaciona con cuál y cómo**:

```bash
sqlite3 -header -column /.config/amass/asset.db "
SELECT f.fqdn AS origen, e.label AS relacion, ip.ip_address AS destino
FROM edge e
JOIN entity se ON se.entity_id = e.from_entity_id
JOIN fqdn f ON f.id = se.row_id
JOIN entity de ON de.entity_id = e.to_entity_id
LEFT JOIN ipaddress ip ON ip.id = de.row_id
ORDER BY f.fqdn LIMIT 12;"
```

```
     origen         relacion      destino
-----------------  ----------  ------------------
admin.lab.local    dns_record  192.168.56.105
api.lab.local      dns_record  192.168.56.109
dev.lab.local      dns_record  192.168.56.103
gitlab.lab.local   dns_record  192.168.56.107
grafana.lab.local  dns_record  192.168.56.108
jenkins.lab.local  dns_record  192.168.56.107
lab.local          dns_record  192.168.56.101
...
```

Qué significa cada columna:

| Columna | Significado |
|---|---|
| `origen` | El activo desde el que sale la relación |
| `relacion` | El tipo de relación: `dns_record`, `node`, `tcp_port_443`… |
| `destino` | El activo al que apunta |

`dns_record` significa "este nombre resuelve a esta IP". `node` significa
"este subdominio cuelga de este dominio".

#### 3.7.5 Cuántas relaciones se encontraron

```bash
sqlite3 /.config/amass/asset.db "SELECT COUNT(*) FROM edge;"
```

```
27
```

#### 3.7.6 La procedencia: qué fuente descubrió cada activo

```bash
sqlite3 -header -column /.config/amass/asset.db "
SELECT f.fqdn AS activo, t.tag_type AS fuente, t.val AS valor
FROM entity_tag t
JOIN entity e ON e.entity_id = t.entity_id
JOIN fqdn f ON f.id = e.row_id
LIMIT 12;"
```

> La columna `tag_type` indica el origen del dato (`DNS`, `Known-FQDN`, etc.) y
> `val`, su nivel de confianza. Un activo descubierto por varias fuentes
> aparece con varias etiquetas.

#### 3.7.7 Los logs del motor: cada relación en texto plano

Si lo de SQL te resulta ajeno, el motor también deja un log legible:

```bash
ls -t /.config/amass/amass_engine_*.log | head -1 | xargs grep "relationship discovered"
```

Cada línea es una relación descubierta, con el formato:

```json
{"msg":"relationship discovered","from":"lab.local","relation":"dns_record","to":"192.168.56.103"}
```

#### 3.7.8 Resumen: por qué esto importa

```bash
# Un resumen rápido de todo el grafo
sqlite3 /.config/amass/asset.db "
SELECT 'Activos FQDN: '  || COUNT(*) FROM fqdn
UNION ALL SELECT 'Direcciones IP: ' || COUNT(*) FROM ipaddress
UNION ALL SELECT 'Relaciones: '    || COUNT(*) FROM edge
UNION ALL SELECT 'Servicios: '     || COUNT(*) FROM service;"
```

| Métrica | Por qué importa |
|---|---|
| Activos FQDN | El tamaño de la superficie descubierta |
| Direcciones IP | Cuánta infraestructura hay detrás |
| Relaciones | **La richness del grafo.** Si hay muchos activos y pocas relaciones, son nombres sueltos. Si hay muchas relaciones, hay un mapa. |
| Servicios | Qué está 실제로 expuesto en cada puerto |

> **El argumento para el profesor:** un escáner que solo devuelve una lista de
> nombres te da N activos. Amass te da N activos **más** las relaciones entre
> ellos, la procedencia de cada uno y el historial de qué cambió. Eso es lo que
> convierte una lista de nombres en un inventario de superficie de ataque
> accionable.

---

### 3.8 Ver la zona DNS completa

> 📍 **Dónde:** dentro de la máquina `dns`

```bash
docker compose -f compose.yaml exec dns cat /app/zone.txt
```

O entrando directamente:

```bash
docker compose -f compose.yaml exec dns bash
cat /app/zone.txt
exit
```

---

## Paso 4 · Experimentos para aprender

### Experimento A — Pasivo vs. activo

> 📍 **Dónde:** dentro de la máquina `amass`

```bash
# Pasivo: no pregunta al DNS, solo consulta fuentes OSINT
amass enum -d lab.local -timeout 2

# Activo: pregunta al DNS y comprueba puertos
amass enum -active -d lab.local -p 80,443 -timeout 2
```

**Qué observar:** el pasivo termina rápido y sin descubrir nada. El activo
tarda y encuentra subdominios.

### Experimento B — Ampliar la lista de fuerza bruta

> 📍 **Dónde:** en tu **portátil**

```bash
cat >> lab-infra/wordlists/subdomains-lab.txt <<'EOF'
uat
preprod
sandbox
backup
EOF
```

> 📍 **Dónde:** dentro de la máquina `amass`

```bash
amass enum -engine http://127.0.0.1:4000 \
  -active -brute -w /wl/subdomains-lab.txt \
  -d lab.local -p 80,443 -timeout 3
```

**Qué observar:** `uat` y `preprod` existen en la zona. `prod` no existe:
puedes añadirlo y verificar que se consulta pero no aparece en los resultados.

### Experimento C — Alteraciones de nombres

> 📍 **Dónde:** dentro de la máquina `amass`

```bash
amass enum -engine http://127.0.0.1:4000 \
  -active -alts -aw /wl/alterations-lab.txt \
  -d lab.local -p 80,443 -timeout 2
```

**Qué observar:** a partir de `dev.lab.local` genera variantes (`dev1`,
`dev-test`, `test-dev`…) y valida cada una contra el DNS.

### Experimento D — Cambiar el alcance de puertos

> 📍 **Dónde:** dentro de la máquina `amass`

```bash
amass enum -engine http://127.0.0.1:4000 \
  -active -d lab.local -p 80,443,8080 -timeout 2
```

### Experimento E — Comparar con el scope

> 📍 **Dónde:** dentro de la máquina `amass`

```bash
amass subs -names -d lab.local -ip
amass subs -names -d noexiste.lab.local -ip
```

---

## Paso 5 · Resumen: dónde se ejecuta cada cosa

| Acción | Dónde | Comando |
|---|---|---|
| Montar el laboratorio | **Portátil** | `./start.sh` |
| Empezar de cero | **Portátil** | `./start.sh --reset` |
| **Entrar a la máquina Amass** | **Portátil** | `cd lab-infra/docker && docker compose -f compose.yaml exec amass bash` |
| Salir de la máquina | **Dentro** | `exit` |
| Ver versión | **Amass** | `amass -version` |
| Ayuda de un subcomando | **Amass** | `amass enum -h` |
| Consultar el DNS | **Amass** | `dig +short @192.168.56.101 dev.lab.local A` |
| Enumerar + fuerza bruta | **Amass** | `amass enum -engine http://127.0.0.1:4000 -active -brute -w /wl/subdomains-lab.txt -d lab.local -p 80,443 -timeout 3` |
| Ver resultados | **Amass** | `amass subs -names -d lab.local -ip` |
| Ver la base de datos | **Amass** | `sqlite3 /.config/amass/asset.db "SELECT fqdn FROM fqdn;"` |
| Ver consultas DNS | **Portátil** | `docker compose -f compose.yaml logs dns \| grep query` |
| Ver la zona | **DNS** | `docker compose -f compose.yaml exec dns cat /app/zone.txt` |
| Detener todo | **Portátil** | `./start.sh --stop` |

---

## Los atajos del script

Si no quieres escribir comandos de Docker, `start.sh` los hace por ti:

| Comando | Qué hace |
|---|---|
| `./start.sh` | Monta el laboratorio y verifica el DNS |
| `./start.sh --reset` | Empieza de cero |
| `./start.sh --enum` | Ejecuta la enumeración con fuerza bruta |
| `./start.sh --results` | Muestra los resultados guardados |
| `./start.sh --dns` | Muestra las consultas DNS |
| `./start.sh --check` | Verifica el estado |
| `./start.sh --logs` | Logs en vivo |
| `./start.sh --stop` | Detiene el laboratorio |
| `./start.sh amass <args>` | Ejecuta un comando de Amass a mano |

Ejemplo:

```bash
./start.sh amass subs -names -d lab.local -ip
```

---

## La zona del laboratorio

`lab.local` tiene 32 nombres:

| Grupo | Nombres | IP |
|---|---|---|
| Objetivo | `www`, `mail`, `www2` | 192.168.56.103 |
| Preproducción | `dev`, `staging` | 192.168.56.103 |
| Preproducción | `qa`, `uat`, `preprod` | 192.168.56.104 |
| Administración | `admin`, `portal` | 192.168.56.105 |
| Acceso remoto | `vpn` | 192.168.56.106 |
| CI/CD | `jenkins`, `gitlab` | 192.168.56.107 |
| Observabilidad | `grafana`, `kibana` | 192.168.56.108 |
| APIs | `api`, `beta`, `sandbox` | 192.168.56.109 |
| Residuales | `old`, `backup` | 192.168.56.110 |
| Infraestructura | `ns1` | 192.168.56.101 |
| Infraestructura | `sipserver` (+ SRV `_sip._tcp`) | 192.168.56.111 |
| Aliases CNAME | `intranet`→`portal`, `secure`→`vpn`, `ci`→`jenkins`, `scm`→`gitlab`, `metrics`→`grafana`, `logs`→`kibana`, `preview`→`beta`, `legacy`→`old` | — |

### Priorización

| Activo | Severidad | Razón |
|---|---|---|
| `vpn.lab.local` | **Crítico** | Acceso remoto a toda la organización |
| `dev` / `staging` / `qa` / `uat` | **Alto** | Preproducción con menos controles |
| `jenkins` / `gitlab` | **Alto** | Cadena de suministro |
| `admin` / `portal` | **Alto** | Administración expuesta |
| `old` / `backup` | **Medio** | Activo residual |
| `www` / `mail` | **Bajo** | Activos públicos esperados |

> **La conclusión:** Amass **no prioriza**. Entrega el inventario con su
> procedencia. La severidad depende del contexto: si una IP es producción o una
> máquina de pruebas, el mismo hallazgo cambia. Eso lo decide el equipo, no el
> script.

---

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `Failed to perform a bulk transfer of assets: EOF` | Bug de Amass v5.1.3 en el endpoint `bulk` | No uses `-nf`. Usa `-brute -w`. |
| El motor muere con `panic: invalid memory address` | Mismo bug | `./start.sh --reset` y usa `-brute -w` |
| `Failed to create a session with the Amass engine` | El motor no está listo | `./start.sh` espera al motor. Si persiste, `--reset`. |
| `Failed to obtain the BGPTools IP address` | `bgp.tools` no resuelve | Verifica que está en `lab-infra/docker/zone.txt` y haz `--reset` |
| `flag provided but not defined: -src` / `-ip` / `-o` | Banderas de v3/v4 que ya no existen | Usa `amass subs` (ver §3.5) |
| `subcommand provided but not defined: db` | El subcomando `db` fue eliminado | Usa `amass subs` o `sqlite3` (§3.7) |
| La enumeración no descubre nada | Faltan las `transformations` en el config | Restaura el bloque `transformations:` de `lab-infra/configs/config.yaml` |
| `service "amass" is not running` | Los contenedores están detenidos | `./start.sh` los levanta |
| `Address already in use` | Ya hay contenedores con esos nombres | `./start.sh --stop` y vuelve a levantar |
| `permission denied` en iptables | Falta `NET_ADMIN` | Está en el `compose.yaml`; no lo borres |
| `Failed to populate the ASN cache: zero entities found` | Normal: requiere WHOIS/RDAP | Ignorar |
| La enumeración tarda mucho | El plugin DNS-SD hace ~60 consultas SRV | Reduce `-timeout` a 2 |
| `docker: permission denied` | Tu usuario no está en el grupo `docker` | `sudo usermod -aG docker $USER` y reinicia sesión |

---

## Dos detalles técnicos que vale la pena conocer

### 1. `transformations` no es opcional

En Amass v5 el motor carga esa sección del `config.yaml` al leer el archivo. Si
falta, **ningún plugin se activa** y la enumeración termina sin descubrir nada,
sin error visible. Por eso `lab-infra/configs/config.yaml` la incluye completa.

### 2. Los resolvers DNS están escritos en el código

El plugin DNS de v5 usa una lista fija de 53 servidores DNS públicos. La opción
`resolvers:` del config solo aplica a `intel`/`whois`. Para que las consultas
lleguen al DNS ficticio, la imagen de Amass trae reglas de redirección
preconfiguradas que se aplican solas al arrancar. No hay que hacer nada.

---

## Referencias

- Sitio del proyecto: <https://owasp.org/projects/amass>
- Documentación oficial v5: <https://owasp-amass.github.io/docs/>
- Código fuente: <https://github.com/owasp-amass/amass>

---

*Guía validada con OWASP Amass v5.1.3 sobre Docker.*
