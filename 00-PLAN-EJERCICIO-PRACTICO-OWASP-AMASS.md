# Plan definitivo — Exposición y laboratorio OWASP Amass

**Versión 2.0** · 9 de noviembre de 2026
**Expositor:** Michael Stiven Tabares Tobón
**Programa:** Ingeniería de Sistemas · Universidad de Antioquia
**Curso:** Seguridad de la Información · 2026-II
**Duración total:** 25 minutos (8 min teoría + 17 min práctica)
**Restricción:** todo el laboratorio ocurre en máquinas virtuales locales. **Sin tráfico a servidores reales ni externos.**

---

## 1. Decisiones confirmadas

| Decisión | Valor |
|---|---|
| Duración | 25 minutos totales |
| Reparto | 8 min teoría + 17 min práctica |
| Ejecución | 100 % local en VMs de tu máquina |
| Objetivo de prueba | Dominio ficticio `lab.local` servido por DNS autoritativo propio |
| Activo real del lab | Metasploitable 3 registrado en el DNS del laboratorio |
| Fuerza bruta | **Incluida** (lista de palabras propia, controlada) |
| Base de datos | **Opcional** — se explica en 1 diapositiva; no se monta PostgreSQL |
| Público | Estudiantes de noveno semestre de Ingeniería de Sistemas; profesor experto |
| Entregables | Solo: plan + presentación `.pptx` + guion + guía del laboratorio |
| Portada | Michael Stiven Tabares Tobón · Ingeniería de Sistemas UdeA · Seguridad de la Información 2026-II |

---

## 2. Sobre la base de datos (tu pregunta)

### ¿Para qué sirve?

Amass no solo devuelve texto: **construye un grafo de activos**. La base de datos es el lugar donde vive ese grafo.

```
                    ┌──────────────────┐
   "www" ──DNS──▶   │ FQDN: www.lab.local│
                    └────────┬─────────┘
                             │ tiene_registro_DNS
                    ┌────────▼─────────┐
                    │ IP: 192.168.56.103│
                    └────────┬─────────┘
                             │ alojado_en
                    ┌────────▼─────────┐
                    │ Servicio: HTTP    │
                    │ (Metasploitable)  │
                    └──────────────────┘
```

**Tres usos concretos:**

| Uso | Explicación |
|---|---|
| **1. Persistencia** | Cada ejecución guarda sus hallazgos. Puedes comparar el estado de la superficie de ataque entre fechas. |
| **2. Correlación** | Un mismo activo descubierto por 3 fuentes se guarda **una sola vez**, anotando las 3 fuentes. No se duplica el ruido. |
| **3. Trazabilidad y priorización** | Almacena el TTL, la confianza y la procedencia de cada hallazgo, permitiendo saber qué dato es sólido y cuál es una pista débil. |

### ¿Qué se monta en este laboratorio?

**Decisión: SQLite local y automático.** Amass crea una base SQLite en su directorio de configuración si no se configura ninguna. No requiere instalación ni configuración.

- **No** montamos PostgreSQL: añade complejidad (contenedores, contraseñas, `docker compose`) que no aporta valor pedagógico en 25 minutos.
- La base de datos se explica **conceptualmente** en la teoría y se demuestra con `amass db -list` y `amass db -show` al final de la práctica.
- En la diapositiva se menciona PostgreSQL como opción de producción para equipos que necesitan un repositorio centralizado y multiusuario.

> **Valor pedagógico:** es justo el punto donde se ve la diferencia entre "un enumerador de subdominios" y "una plataforma de inteligencia de superficie de ataque".

---

## 3. Arquitectura del laboratorio offline

### 3.1 Topología de VMs

```
┌──────────────────────────────────────────────────────────────────┐
│  MÁQUINA FÍSICA (tu laptop)                                     │
│  Hypervisor: VirtualBox / VMware / KVM                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  VM 1 — "ATACANTE"  (Kali Linux o Ubuntu + Docker)         │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  Contenedor: owaspamass/amass:latest                 │  │  │
│  │  │  + scripts del laboratorio                            │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │  Red: 192.168.56.0/24  (host-only / NAT isolate)          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  VM 2 — "DNS AUTORITATIVO"  (Debian/Ubuntu + BIND9)       │  │
│  │  Zona autoritativa: lab.local                             │  │
│  │  Servidor: 192.168.56.101                                │  │
│  │  (reverse WHOIS simulado, certificado CT simulado)        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  VM 3 — "OBJETIVO"  (Metasploitable 3)                    │  │
│  │  IP: 192.168.56.103                                      │  │
│  │  Servicios: 80, 443, 21, 22, 3306, 8080...                │  │
│  │  Nombres DNS: www.lab.local, dev.lab.local,               │  │
│  │                staging.lab.local, mail.lab.local,          │  │
│  │                vpn.lab.local, portal.lab.local, etc.       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  VM 4 (opcional) — "OSINT SIMULADO"                       │  │
│  │  Servidor web local que sirve:                            │  │
│  │  /crt.json  → certificados simulados                       │  │
│  │  /dns.txt   → zona DNS pública simulada                   │  │
│  │  /robots.txt, /sitemap.xml                                │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Por qué VM 4 (OSINT simulado)

El modo pasivo de Amass consulta fuentes externas (crt.sh, Certificate Transparency, DNS públicos). Para mantener el requisito de **"no salir a servidores externos"** pero conservar la curiosidad práctica de la parte pasiva, se levanta un **servidor HTTP local** que imita esas respuestas. El laboratorio sigue siendo 100 % local, pero Amass sigue resolviendo nombres **de forma pasiva** (sin consultar directamente al objetivo).

> Si esta VM añade complicación, se puede omitir: el 100 % del valor de la demostración está en el modo activo, la fuerza bruta y la construcción del grafo. La VM 4 es un extra opcional.

### 3.3 Aislamiento de red (requisito crítico)

En el hypervisor:

| Hypervisor | Configuración |
|---|---|
| **VirtualBox** | Adaptador 1: **Host-only** (`VirtualBox Host-Only Network`). Sin NAT, sin桥接. |
| **VMware** | Adaptador: **Host-only (VMnet1)**. Desmarcar "Bridge" y "NAT". |
| **KVM/libvirt** | Red `isolated` con DHCP propia, sin `forward` ni salida a Internet. |

**Verificación de aislamiento desde la VM atacante (OBLIGATORIA antes de empezar):**

```bash
# Debe FALLAR (sin salida a Internet)
ping -c 2 8.8.8.8
curl -s --max-time 5 https://owasp.org -o /dev/null && echo "FUGA DETECTADA" || echo "OK: laboratorio aislado"

# Debe FUNCIONAR (DNS del laboratorio)
dig @192.168.56.101 lab.local A +short
dig @192.168.56.101 www.lab.local A +short
```

> Si el ping a `8.8.8.8` responde, **detén el laboratorio**. Un exercise que se sale a Internet no cumple la regla acordada.

---

## 4. Cronograma de los 25 minutos

| Tiempo | Bloque | Contenido |
|---|---|---|
| 0:00–0:02 | Apertura | Portada, pregunta detonante: "¿cuántos subdominios reales expone una organización y nadie sabe?" |
| 0:02–0:04 | Qué es Amass | Definición, rol en el recon, grafo de activos, OAM |
| 0:04–0:06 | Pasivo vs. Activo | Las dos estrategias, qué hace cada una, riesgos |
| 0:06–0:07 | Arquitectura | Pipeline: fuentes → grafo → resultados |
| 0:07–0:08 | Base de datos | Para qué sirve el grafo persistente (1 min, sin demo) |
| 0:08–0:10 | **Demostración 1** | Verificación del entorno + `enum -list` + `-version` |
| 0:10–0:13 | **Demostración 2** | Modo activo: `-active -p 80,443 -ip -src` → grafo |
| 0:13–0:16 | **Demostración 3** | **Fuerza bruta** con lista propia + `dev`/`test`/`staging` |
| 0:16–0:19 | **Demostración 4** | `db -list`, `db -show -ip`, exportación JSON |
| 0:19–0:22 | **Demostración 5** | Interpretación: qué es un hallazgo crítico, correlación DNS↔servicio |
| 0:22–0:25 | Cierre | Hallazgos del lab, recomendaciones, preguntas |

---

## 5. Guion de la práctica (17 minutos) — comando a comando

### Demo 1 — Verificación del entorno (2 min)

```bash
# 1.1 Entrar a la VM atacante
# 1.2 Confirmar aislamiento
ping -c 2 8.8.8.8                       # debe fallar
dig @192.168.56.101 www.lab.local +short

# 1.3 Verificar la imagen Docker
docker pull owaspamass/amass:latest
docker tag owaspamass/amass:latest amass:latest
docker run --rm amass:latest -version

# 1.4 Listar fuentes de datos disponibles
docker run --rm amass:latest enum -list
```

**Qué se explica:** Amass es un framework con múltiples fuentes; cada ejecución es una combinación de fuentes disponibles. En el lab se vivencia cómo un subdominio puede aparecer por varias rutas.

### Demo 2 — Modo activo contra el laboratorio (3 min)

```bash
# 2.1 Crear estructura de trabajo
mkdir -p ~/amass-lab/{config,wordlists,results}
cd ~/amass-lab

# 2.2 Enumeración activa, solo puertos autorizados
docker run --rm -it \
  -v "$HOME/.config/amass:/.config/amass" \
  -v "$PWD/results:/results" \
  amass:latest enum \
    -active \
    -d lab.local \
    -p 80,443 \
    -ip -src \
    -o /results/subdominios-activo.txt
```

**Qué se explica:**
- `-active` habilita resolución DNS, force DNS y comprobación de puertos.
- `-p 80,443` es el **muro de seguridad** del ejercicio: solo esos puertos.
- `-src` muestra de dónde salió cada nombre.
- `-ip` correlaciona el nombre con su dirección.

### Demo 3 — Fuerza bruta (3 min) ⭐

```bash
# 3.1 Crear la lista de palabras controlada
cat > wordlists/subdomains.txt <<'EOF'
www
mail
dev
test
staging
stage
qa
uat
preprod
sandbox
admin
portal
vpn
git
jenkins
grafana
kibana
api
app
beta
demo
backup
old
new
EOF

# 3.2 Ejecutar la fuerza bruta (se define el alcance en el config)
docker run --rm -it \
  -v "$HOME/.config/amass:/.config/amass" \
  -v "$PWD/results:/results" \
  -v "$PWD/wordlists:/wordlists" \
  amass:latest enum \
    -active \
    -brute \
    -w /wordlists/subdomains.txt \
    -d lab.local \
    -ip -src \
    -o /results/subdominios-bruteforce.txt
```

**Qué se explica:**
- Amass **pregunta al DNS autoritativo** si `dev.lab.local` existe (no adivina ni accede a la web).
- La diferencia con "adivinar nombres" es que la respuesta del DNS es la validación.
- El costo real son **consultas DNS**, no peticiones a servicios.
- Se muestran los nombres de la zona que **sí** existen: `dev`, `staging`, `vpn` → son los candidatos a objetivo de ataque.

### Demo 4 — Persistencia y exportación (3 min)

```bash
# 4.1 Listar enumeraciones guardadas
docker run --rm -it \
  -v "$HOME/.config/amass:/.config/amass" \
  amass:latest db -list

# 4.2 Mostrar los activos con IPs y fuentes
docker run --rm -it \
  -v "$HOME/.config/amass:/.config/amass" \
  amass:latest db -show -ip -src

# 4.3 Exportar en JSON para análisis posterior
docker run --rm -it \
  -v "$HOME/.config/amass:/.config/amass" \
  -v "$PWD/results:/results" \
  amass:latest enum \
    -active -d lab.local -p 80,443 \
    -do /results/amass-lab.json

# 4.4 Ver el JSON
head -40 results/amass-lab.json
```

**Qué se explica:** el grafo persiste; se puede comparar "hoy" contra "la semana pasada" para detectar cambios en la superficie de ataque (subdominio nuevo, puerto nuevo, IP movida).

### Demo 5 — Interpretación y priorización (3 min)

```bash
# 5.1 Hallazgos con nombres sensibles
grep -Ei 'dev|test|stg|qa|uat|preprod|admin|portal|vpn|jenkins|gitlab|grafana' \
  results/subdominios-activo.txt | sort -u

# 5.2 Verificar un hallazgo concreto contra el DNS del laboratorio
dig @192.168.56.101 dev.lab.local A +short

# 5.3 Confirmar el servicio HTTP
curl -sI --max-time 5 http://192.168.56.103 | head -5

# 5.4 Correlación: qué nombres resuelven a la IP del objetivo
grep '192.168.56.103' results/subdominios-activo.txt

# 5.5 Contar activos únicos
sort -u results/subdominios-activo.txt | grep -c .
```

**Qué se explica (el cierre analítico):**

| Hallazgo | Severidad | Razón |
|---|---|---|
| `vpn.lab.local` expuesto | **Crítico** | Acceso remoto a la organización |
| `dev.lab.local` + `staging.lab.local` | **Alto** | Entornos de preproducción con menos controles |
| `jenkins.lab.local` / `gitlab.lab.local` | **Alto** | CI/CD y repositorio: cadena de suministro |
| `admin.lab.local` | **Alto** | Panel de administración expuesto |
| `old.lab.local` sin TLS válido | **Medio** | Activo residual, probable deuda técnica |
| Nombre público sin管理強化 | **Bajo** | Ruido esperado |

> **Punto clave del cierre:** el valor de Amass no es "encontrar subdominios", es **convertirlos en un inventario priorizado** que conecta con un inventario de activos (si el `192.168.56.103` es un servidor de producción o una máquina de pruebas, eso lo decide el equipo, no la herramienta).

---

## 6. Estructura de la presentación (8 diapositivas de teoría + 4 de práctica)

| # | Tipo | Contenido | Tiempo |
|---|---|---|---|
| 1 | Cover | Portada con datos deMichael Stiven Tabares Tobón | 0:30 |
| 2 | Content (stat) | **El problema:** la superficie de ataque crece y nadie la conoce. Cifra de subdominios descubiertos en estudios públicos. | 1:00 |
| 3 | Content (text+icon) | **¿Qué es Amass?** Framework OSINT de reconocimiento y mapeo de superficie de ataque. differences con un simple `dig`. | 1:00 |
| 4 | Content (comparison) | **Pasivo vs. Activo** — dos columnas: qué consulta, cuándo usarlo, riesgo. | 1:30 |
| 5 | Content (process) | **Arquitectura:** fuentes de datos → motor → grafo de activos → exportación. | 1:00 |
| 6 | Content (diagram) | **La base de datos y el grafo:** por qué se persiste; SQLite vs PostgreSQL. | 1:00 |
| 7 | Content (timeline) | **Flujo de trabajo de un pentest:** Amass como fase 1 de recon. | 1:00 |
| 8 | Section divider | **"Manos a la obra"** — transición a la práctica | 0:15 |
| 9 | Content (code) | Demo 1: verificación del entorno + aislamiento | 1:30 |
| 10 | Content (code) | Demo 2: modo activo con `-ip -src` | 2:00 |
| 11 | Content (code) | **Demo 3: fuerza bruta** ⭐ + lista de palabras | 2:00 |
| 12 | Content (code) | Demo 4: persistencia, `db -show`, exportación JSON | 2:00 |
| 13 | Content (table) | Demo 5: interpretación y priorización de hallazgos | 2:30 |
| 14 | Summary | Cierre: 3 conclusiones + recomendaciones + preguntas | 1:30 |

**Total: 14 diapositivas · ~21 min de contenido hablado + 4 min de演示 en vivo y transiciones = 25 min.**

---

## 7. Guion del expositor — estructura

> El guion completo se entrega diapositiva por diapositiva con tiempo asignado, frase de transición y **notas del presentador** (qué decir, qué señalar en pantalla, qué error corregir si falla).

**Muestra (Diapositiva 4 — Pasivo vs. Activo):**

> *"Aquí está la decisión más importante de la práctica. En modo pasivo, Amass no toca su objetivo: consulta fuentes de inteligencia abierta y certificados públicos. En modo activo, sí resuelve nombres y comprueba servicios. En nuestro laboratorio vamos a usar las dos, pero contra un DNS y un servidor que son nuestros, dentro de las VMs, sin salir a Internet. La razón es simple: Amass es una herramienta de reconocimiento **activo** sobre un sistema real, y se autoriza, no se ejecuta por curiosidad."*

---

## 8. Contenido de la guía del laboratorio (entregable)

La guía final tendrá esta estructura:

1. **Objetivos y alcance**
2. **Requisitos** (host, hypervisor, RAM, tiempo de montaje)
3. **Topología y diagrama de red**
4. **Paso 0 — Verificar el aislamiento** (obligatorio)
5. **Paso 1 — Montar la VM DNS autoritativo** (BIND9 + zona `lab.local`)
6. **Paso 2 — Montar el DNS autoritativo con zona `lab.local`** (BIND9 + zona `lab.local`)
7. **Paso 3 — Configurar Metasploitable 3** y registrar sus nombres
8. **Paso 4 — Verificar el DNS desde la VM atacante**
9. **Paso 5 — Instalar Amass (Docker y alternativa nativa)**
10. **Paso 6 — `config.yaml` y `datasources.yaml` del laboratorio**
11. **Paso 7 — Modo activo**
12. **Paso 8 — Fuerza bruta**
13. **Paso 9 — Persistencia y exportación**
14. **Paso 10 — Interpretación y priorización**
15. **Troubleshooting** (DNS no resuelve, Docker sin red, permisos de volumen, timeouts, `rigid_boundaries`)
16. **Tabla de equivalencias Amass v3/v4 vs v5**
17. **Checklist de cierre del laboratorio**

---

## 9. Contenido de la zona DNS del laboratorio

```dns
; /etc/bind/db.lab.local
$TTL 604800
@   IN  SOA ns1.lab.local. admin.lab.local. ( 1 604800 86400 2419200 604800 )
@   IN  NS  ns1.lab.local.

ns1     IN  A   192.168.56.101
lab.local.       IN  A   192.168.56.101

; --- Activos que deben ser descubiertos por Amass ---
www         IN  A   192.168.56.103
mail        IN  A   192.168.56.103
dev         IN  A   192.168.56.103
staging     IN  A   192.168.56.103
qa          IN  A   192.168.56.104
uat         IN  A   192.168.56.104
admin       IN  A   192.168.56.105
portal      IN  A   192.168.56.105
vpn         IN  A   192.168.56.106
jenkins     IN  A   192.168.56.107
gitlab      IN  A   192.168.56.107
grafana     IN  A   192.168.56.108
api         IN  A   192.168.56.109
beta        IN  A   192.168.56.109

; --- Redirecciones y aliases ---
intranet    IN  CNAME portal.lab.local.
secure      IN  CNAME vpn.lab.local.
old         IN  A   192.168.56.110
backup      IN  A   192.168.56.110

; --- Registros querelsacionan con la infraestructura ---
@           IN  MX  10 mail.lab.local.
@           IN  TXT "v=spf1 mx -all"
ns1         IN  A   192.168.56.101
```

**Resultado esperado del laboratorio:** Amass debe descubrir **16+ subdominios**, y la fuerza bruta con la lista de 22 palabras debe recuperar `dev`, `test` (no existe → descartado), `staging`, `qa`, `uat`, `admin`, `portal`, `vpn`, `jenkins`, `gitlab`, `grafana`, `api`, `beta`, `old`, `backup`.

> Los nombres `test`, `sandbox`, `preprod` **no existen** en la zona: sirven para demostrar que la fuerza bruta **descarta** candidatos, no solo confirma. Esa es la parte que más se olvida en las Jeremiah.

---

## 10. Montaje del laboratorio — tiempos estimados

| Tarea | Tiempo | Dificultad |
|---|---|---|
| Descargar y configurar VM DNS con BIND9 | 15 min | Media |
| Configurar la zona `lab.local` | 5 min | Baja |
| Levantar Metasploitable 3 y registrar nombres | 10 min | Baja |
| Configurar red host-only y verificar aislamiento | 10 min | Media |
| Descargar imagen Docker de Amass | 5 min | Baja |
| Probar el flujo completo (3 passes de prueba) | 20 min | Media |
| **Total estimado de montaje** | **~65 min** | |

> Este montaje lo hago yo en tu máquina antes de la exposición, o te entrego los scripts listos para que los ejecutes.

---

## 11. Entregables finales

| # | Entregable | Formato |
|---|---|---|
| 1 | Plan de exposición y laboratorio | `.md` ✅ (este documento) |
| 2 | Presentación | `.pptx` (14 diapositivas) |
| 3 | Guion del expositor | `.md` (cronometrado, por diapositiva) |
| 4 | Guía del laboratorio | `.md` (todos los comandos + explanations + troubleshooting) |

**No se entregan** PDFs, informes finales ni versiones alternativas.

---

## 12. Estado y próximos pasos

| Paso | Estado |
|---|---|
| Plan detallado | ✅ Aprobado en versión 2.0 |
| Montaje del laboratorio | ⏳ Pendiente — requiere VMs en tu máquina |
| Presentación `.pptx` | ⏳ Pendiente |
| Guion del expositor | ⏳ Pendiente |
| Guía del laboratorio | ⏳ Pendiente |

### Pregunta de arranque para el montaje

Para montar el laboratorio necesito confirmar:

1. **Hypervisor:** ¿VirtualBox, VMware o KVM/libvirt?
2. **VM atacante:** ¿ya tienes Kali/Ubuntu o la creamos desde una ISO?
3. **Docker:** ¿lo instalamos en la VM atacante o prefieres Amass nativo (`go install` / binario precompilado)?
4. **DNS:** ¿instalamos BIND9 en una VM Debian/Ubuntu dedicated, o prefieres usar el servidor DNS que ya tengas?

Con estas 4 respuestas monto el laboratorio completo, lo valido con los comandos reales, y luego genero la presentación con capturas reales de la salida de Amass.
