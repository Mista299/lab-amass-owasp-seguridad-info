# Plan de la sesión — OWASP Amass

**Expositor:** Michael Stiven Tabares Tobón
**Curso:** Seguridad de la Información — 2026-II · Ingeniería de Sistemas, UdeA
**Duración:** 25 minutos (8 min teoría + 17 min práctica)

---

## Objetivo

Demostrar cómo OWASP Amass construye un inventario de activos y cómo se
prioriza, sobre un laboratorio completamente local.

---

## Decisiones

| Decisión | Valor |
|---|---|
| Duración | 25 minutos |
| Reparto | 8 min teoría + 17 min práctica |
| Entorno | Docker sobre Arch Linux. Sin VMs, sin Kali, sin objetivo real |
| Dominio | `lab.local` (TLD reservado por la IANA) |
| Red | `192.168.56.0/24` (RFC 1918) |
| Fuerza bruta | Sí, con lista propia de 13 candidatos |
| Objetivo externo | Ninguno. La zona DNS es un contenedor local |
| Base de datos | SQLite, la crea Amass automáticamente |
| Entregables | Presentación, guion, guía del laboratorio, repositorio |

---

## Estructura de la exposición

| # | Diapositiva | Minutos |
|---|---|---|
| 1 | Portada | 0.5 |
| 2 | El problema: la superficie de ataque que nadie conoce | 1.2 |
| 3 | Qué es OWASP Amass | 1.2 |
| 4 | Pasivo vs. activo | 1.7 |
| 5 | Arquitectura: del dato al grafo | 1.0 |
| 6 | La base de datos: memoria del laboratorio | 1.2 |
| 7 | Divisor: manos a la obra | 1.2 |
| 8 | Práctica: verificar el entorno | 2.0 |
| 9 | Práctica: enumeración y fuerza bruta | 3.0 |
| 10 | Práctica: del hallazgo al riesgo | 3.0 |
| 11 | Cierre | 2.5 |
| | Preguntas | 3.5 |

---

## Flujo de la práctica

```
Paso 0  Verificar el entorno
        · DNS del laboratorio responde
        · NXDOMAIN en un nombre inexistente
        · amass -version

Paso 1  Enumeración activa
        · amass enum -active -brute -w /wl/subdomains-lab.txt
        · amass subs -names -d lab.local -ip

Paso 2  Fuerza bruta completa
        · ./start.sh --brute
        · 13 candidatos: 11 confirmados, 2 descartados

Paso 3  Interpretación
        · Tabla de severidad por activo
        · La herramienta no prioriza: el equipo sí
```

---

## Material de respaldo

Si la demo falla:

| Archivo | Contenido |
|---|---|
| `material/OWASP-Amass-Presentacion.pdf` | La presentación en PDF, 11 páginas |
| `lab-infra/imgs/demo-1.png` | `amass -version` |
| `lab-infra/imgs/demo-2.png` | El DNS respondiendo y el NXDOMAIN |
| `lab-infra/imgs/demo-3.png` | Los 14 subdominios con sus IPs |
| `lab-infra/imgs/demo-4.png` | Las consultas DNS registradas |

---

## Reparto del laboratorio

| VM / Contenedor | IP | Rol |
|---|---|---|
| `amass-lab-dns` | 192.168.56.101 | DNS autoritativo ficticio. Objetivo del escaneo. |
| `amass-lab-amass` | 192.168.56.100 | Motor y cliente de Amass v5. Atacante. |

El atacante entra al contenedor con:

```bash
cd lab-infra/docker
docker compose -f compose.yaml exec amass bash
```

---

## Criterios de evaluación

| Criterio | Peso |
|---|---|
| El laboratorio está montado y verificado | 20 % |
| La enumeración se ejecuta y se leen resultados | 25 % |
| La fuerza bruta muestra confirmados y descartados | 20 % |
| La priorización se argumenta con criterio propio | 20 % |
| El uso de la herramienta se hace dentro del alcance | 15 % |

---

## Entregables

| # | Archivo |
|---|---|
| 1 | `00-PLAN-EJERCICIO-PRACTICO-OWASP-AMASS.md` |
| 2 | `01-GUION-EXPOSITOR.md` |
| 3 | `02-GUIA-LABORATORIO.md` |
| 4 | `material/OWASP-Amass-Presentacion.pdf` |
| 5 | `lab-infra/` con el laboratorio completo |

---

## Repositorio

<https://github.com/Mista299/lab-amass-owasp-seguridad-info>

```bash
git clone https://github.com/Mista299/lab-amass-owasp-seguridad-info.git
cd lab-amass-owasp-seguridad-info
./start.sh
```
