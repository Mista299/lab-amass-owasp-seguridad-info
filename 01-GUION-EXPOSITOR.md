# Guion del expositor — OWASP Amass

**Expositor:** Michael Stiven Tabares Tobón
**Duración:** 25 minutos (8 min teoría + 17 min práctica)
**Público:** Estudiantes de noveno semestre de Ingeniería de Sistemas (UdeA). Profesor: experto en seguridad.

---

## Cómo usar este guion

- El texto en **comillas** es lo que se dice en voz alta (o parafraseado).
- Las líneas con `→` son **indicaciones de acción** (qué hacer en pantalla).
- El tiempo entre paréntesis es el **presupuesto**; si te pasas, recorta lo marcado con *(opcional)*.
- Los **términos técnicos** van en negrita en el original: pronúncialos con calma.

---

## BLOQUE 1 — Apertura y teoría (0:00 – 8:00)

---

### Diapositiva 1 · Portada
**Tiempo: 0:00 – 0:30 (30 s)**

→ Diapositiva en pantalla. Saluda, no leas la portada.

> "Buenos días. Mi nombre es Michael Stiven Tabares Tobón, estudiante de noveno semestre de Ingeniería de Sistemas. Hoy les voy a hablar de OWASP Amass, una herramienta de reconocimiento, y más importante que eso, vamos a construir juntos un laboratorio donde la usaremos de verdad."

> "El laboratorio corre íntegramente en máquinas virtuales en mi equipo. Ninguna consulta sale a Internet, y el dominio que vamos a atacar es uno que yo mismo creé para esta sesión."

*(Si te preguntan por el dominio: es `lab.local`, un TLD reservado por la IANA que no existe en Internet.)*

---

### Diapositiva 2 · El problema
**Tiempo: 0:30 – 1:40 (70 s)**

→ Señala las tres tarjetas de cifras.

> "Empecemos por el problema. Casi todas las organizaciones tienen una lista de sus dominios principales. Pocas tienen una lista de sus subdominios."

> "Y la diferencia no es trivial. Un subdominio olvidado puede ser un servidor de pruebas, un pipeline de despliegue, una instancia vieja de Jenkins, un panel de administración. Cada uno de esos es una puerta de entrada que nadie está vigilando."

> "El dato clave es el tercero: en un inventario típico, la superficie de ataque real y el inventario oficial son dos conjuntos distintos. La brecha entre ambos es exactamente el riesgo."

> "¿Y por qué la brecha existe? Porque construir el inventario de activos requiere trabajo, y ese trabajo solo se prioriza cuando ya hubo un incidente. Reactive."

*(Opcional — 10 s):* "OWASP Amass responde a una pregunta muy concreta: ¿qué activos existen realmente y cuáles de ellos importan?"

---

### Diapositiva 3 · ¿Qué es OWASP Amass?
**Tiempo: 1:40 – 2:50 (70 s)**

→ Lee la definición, luego señala las tres tarjetas.

> "OWASP Amass es un framework open source de la organización OWASP para reconocimiento de activos y mapeo de superficie de ataque."

> "Tres características lo diferencian de las herramientas que ya conocen."

> "Primero: no es solo un enumerador de subdominios. Un subdominio aislado es ruido. Amass lo conecta con su IP, con el servicio que corre en esa IP, con el certificado TLS, y con las fuentes donde lo encontró."

> "Segundo: construye un grafo. Cada activo es una entidad, cada relación es una arista. El resultado es un mapa, no una lista."

> "Tercero: persiste y deja trazabilidad. Cada hallazgo guarda de dónde salió, qué TTL tiene y qué confianza tiene. Eso permite comparar la superficie de ataque entre meses."

> "Y la diferencia con `dig` es de fondo. `dig` responde una pregunta: '¿este nombre resuelve?'. Amass construye el mapa completo de lo que esa respuesta implica."

---

### Diapositiva 4 · Pasivo vs. Activo
**Tiempo: 2:50 – 4:30 (100 s)**

→ Señala la columna PASIVO, luego la ACTIVO.

> "Esta es la decisión más importante de la práctica, y les pido que la retengan."

> "Modo pasivo: Amass no toca el objetivo. Consulta fuentes de inteligencia abierta — Certificate Transparency, historial de DNS, motores de búsqueda. Lo que detecta es lo que otros ya publicaron. El tráfico hacia el objetivo es cero. El riesgo es muy bajo."

> "Modo activo: Amass interroga la infraestructura. Resuelve nombres contra el DNS autoritativo y comprueba servicios. Detecta lo que existe ahora, incluidos hosts que no están en ningún índice público. El riesgo es medio y requiere autorización expresa."

> "En una auditoría real se usan los dos: pasivo para el mapeo inicial, activo para la validación. Lo importante es entender qué se está tocando."

> "Y quiero ser claro con algo, porque el profesor seguro va a preguntarlo: lo que vamos a hacer hoy contra un DNS real sin autorización no es unethical. Es un delito. La línea entre la investigación y el ataque no está en la herramienta: está en el permiso."

---

### Diapositiva 5 · Arquitectura
**Tiempo: 4:30 – 5:30 (60 s)**

→ Recorre el pipeline de izquierda a derecha con el dedo.

> "Por dentro, Amass es un pipeline de cuatro etapas."

> "Uno: las fuentes. Son los lugares donde puede haber información: fuentes OSINT, el DNS autoritativo, listas de palabras."

> "Dos: el motor. Internamente son plugins, cada uno especializado. Uno consulta Certificate Transparency, otro resuelve DNS, otro busca certificados. El motor los coordina."

> "Tres: la base de datos. Aquí es donde ocurre la diferencia con un script de Bash. Cada activo se guarda como entidad tipada y cada relación como arista dirigida."

> "Cuatro: la salida. El subcomando `subs` para leer los resultados, `track` para comparar enumeraciones, `viz` para visualizar, y exportación en JSON."

> "Abajo ven el ejemplo concreto: un FQDN, su IP, el servicio que corre en esa IP, y la fuente con su confianza. Eso es lo que queda almacenado. Por eso el resultado es auditable."

---

### Diapositiva 6 · La base de datos
**Tiempo: 5:30 – 6:40 (70 s)**

→ Señala las tres columnas.

> "Vale la pena detenerse en la base de datos, porque fue una pregunta que me hicieron y la respuesta es más interesante de lo que parece."

> "Sirve para tres cosas."

> "**Persistir.** Cada ejecución queda guardada. Eso permite comparar la superficie de ataque de hoy contra la de la semana pasada y ver qué cambió: un subdominio nuevo, un puerto nuevo, una IP que se movió."

> "**Correlacionar.** Si un mismo activo lo encontraron tres fuentes distintas, se guarda una sola vez, anotando las tres procedencias. Se elimina el ruido."

> "**Priorizar.** Se guarda el TTL, la confianza y el origen de cada dato. Eso permite distinguir un hallazgo sólido de una simple pista."

> "En el laboratorio usamos SQLite porque se crea solo, sin configurar nada. PostgreSQL es lo que usaría un equipo con histórico compartido. Y Neo4j cuando se necesitan consultas de grafo nativas."

---

### Diapositiva 7 · Divisor "Manos a la obra"
**Tiempo: 6:40 – 8:00 (80 s)**

→ Transición. Este es el momento de cambiar de registro: de expositor a operador.

> "Hasta aquí la teoría. Ahora vamos a ejecutar. Y antes de mostrar un solo comando, necesito que Háganme la primera verificación, porque define si el resto de la práctica es válida."

> "La topología es esta: una VM con el DNS autoritativo que servimos la zona ficticia `lab.local`. Una VM con Amass y su motor. Y una VM con Metasploitable 3, que va a ser el objetivo. Todo en la red 192.168.56.0/24, sin gateway, sin salida a Internet."

> "El punto importante: en Amass v5, el plugin de DNS usa 53 resolvers públicos que están escritos directamente en el código. La opción `resolvers` del archivo de configuración solo aplica a otros subcomandos. Para que el laboratorio sea realmente offline, hay que hacer una redirección de red."

*(Opcional — si hay tiempo, 20 s):* "Ese detalle lo descubrí leyendo el código fuente, y es el tipo de cosa que cambia por completo la confianza que uno tiene en una configuración."

---

## BLOQUE 2 — Práctica (8:00 – 22:00)

> **Nota de ritmo:** las demos son en vivo. Si algo falla, el plan B es mostrar las capturas de respaldo en `lab-infra/imgs/` y explicar el error. **Un error técnico bien explicado es mejor que un resultado sin explicar.**

---

### Diapositiva 8 · Paso 0 — Verificar el aislamiento
**Tiempo: 8:00 – 10:00 (120 s)**

→ Abre la terminal de la VM atacante.

> "Paso cero. Antes de ejecutar Amass, demuestro que el laboratorio está aislado. Esto no es burocracia: es la diferencia entre un laboratorio y un incidente."

**Comando 1:**
```bash
curl -s --max-time 5 https://owasp.org
```

> "No hay salida. El tráfico saliente se descarta con iptables. Noten que no es un rechazo rápido: es un DROP, la conexión se queda colgada. Eso es intencional."

**Comando 2:**
```bash
dig @192.168.56.101 dev.lab.local A
```

> "Y el DNS del laboratorio sí responde: `dev.lab.local` resuelve a 192.168.56.103, que es el Metasploitable."

**Comando 3:**
```bash
docker run --rm amass:latest -version
```

> "Amass 5.1.3. Y quiero detenerme aquí un momento, porque es una diferencia con lo que ustedes van a encontrar en tutorials viejos."

> "En la versión 5, el subcomando `enum` ya no tiene las banderas `-src`, `-o`, `-ip` ni `-do`. Y el subcomando `db` ya no existe. Los resultados se consultan con `subs`, que lee la base de datos compartida. Es un cambio de la API que ha roto muchos scripts."

*(Transición:)* "Perfecto. El laboratorio es real y está aislado. Vamos a usarlo."

---

### Diapositiva 9 · Paso 1 y 2 — Enumeración activa y fuerza bruta
**Tiempo: 10:00 – 13:00 (180 s)**

→ Ejecuta la enumeración.

> "Paso uno: enumeración activa."

```bash
amass enum -active \
  -d lab.local -p 80,443 \
  -nf wordlists/seeds.txt \
  -timeout 3
```

> "Cuatro cosas que vale la pena mirar."

> "`-active` habilita la resolución DNS y la comprobación de servicios."

> "`-p 80,443` es el muro de seguridad del ejercicio. Solo esos dos puertos."

> "`-nf` son nombres ya conocidos. Los presento así porque es la forma en que Amass v5 hace la fuerza bruta: se le pasa un conjunto de candidatos y **el DNS autoritativo decide** cuáles existen. Amass no adivina."

> "Y `-timeout 3` son los minutos sin progreso antes de terminar. Amass detecta que no está avanzando y se detiene solo."

→ Muestra la barra de progreso.

> "Veintinueve de treinta. Cuando el motor termina, el DNS ha recibido más de quinientas consultas."

**Comando 4:**
```bash
amass subs -names -d lab.local -ip
```

> "Y aquí están los resultados, con su IP correlacionada."

→ Señala la salida.

> "`vpn.lab.local` apunta a 192.168.56.106. `old.lab.local` a la .110. El dominio raíz y `mail` al objetivo."

> "Pero fíjense en lo que **no** aparece. En la lista de semillas puse trece nombres. Once existen en la zona y dos no. Los dos que no existen fueron descartados."

> "Y esto es el punto pedagógico más importante de la práctica: **la fuerza bruta no solo confirma, también descarta**. Un escáner que solo te dice lo que encontró sin decirte lo que rechazó no te deja estimar la cobertura de tu propio escaneo."

---

### Diapositiva 10 · Paso 3 — Del hallazgo al riesgo
**Tiempo: 13:00 – 16:00 (180 s)**

→ Señala la tabla de severidad.

> "Ahora la parte que separa una herramienta de un análisis."

> "Pasamos de tener nombres a tener un inventario priorizado. Y la priorización no es automática."

> "`vpn.lab.local` es crítico: un solo activo da acceso remoto a toda la organización. No importa que sea un subdominio más."

> "`dev`, `staging` y `qa` son altos: son entornos de preproducción, con menos controles que producción, y a veces con datos reales."

> "`jenkins` y `gitlab` son altos por una razón distinta: son la cadena de suministro. Acceso al código y a los pipelines de despliegue es acceso a todo lo que se despliega después."

> "`old.lab.local` es medio: activo residual, probable deuda técnica, sin actualizar."

> "Y `www` y `mail` son bajos: activos públicos esperados, sin señal de riesgo por sí solos."

→ Señala el recuadro inferior.

> "Pero lean el recuadro con atención, porque es el mensaje final de la herramienta."

> "**Amass no prioriza.** Entrega el inventario con su procedencia. La priorización exige contexto humano: si 192.168.56.103 es un servidor de producción o una máquina de pruebas, el mismo hallazgo cambia por completo de severidad. Eso lo decide el equipo de seguridad con conocimiento del negocio, no el script."

> "Automatizar la recolección es fácil. Interpretar el resultado es el trabajo de verdad."

---

### Diapositiva 11 · Cierre
**Tiempo: 16:00 – 22:00 (resto, según ritmo real)**

*(Nota: el bloque de práctica puede extenderse si la demo va bien. El cierre nunca debe pasar de 3 minutos.)*

→ Señala las tres tarjetas.

> "Tres ideas para llevarse."

> "**Primero: Amass es un grafo, no una lista.** El valor está en las relaciones entre los datos, no en el dato aislado."

> "**Segundo: pasivo y activo responden preguntas distintas.** Ambos son legítimos, pero exigen autorización y alcance distintos. Elegir bien es lo que separa un mapeo de superficie de ataque de un escaneo indiscriminado."

> "**Tercero: el límite real es el alcance ethical.** La herramienta se automatiza; la responsabilidad no. Entender el alcance es más difícil que dominar los comandos, y es lo que nos va a diferenciar como profesionales."

> "Y antes de cerrar, quiero que quede claro algo: todo lo que vieron hoy se ejecutó en máquinas virtuales locales. Ni una sola consulta salió a Internet. El laboratorio es real en cuanto a la mecánica, y seguro en cuanto al alcance."

> "El código del laboratorio, la zona DNS, los scripts y esta presentación quedan disponibles. Con gusto los revisamos."

→ Pausa. Abre espacio a preguntas.

---

## Plan B — Si la demo falla

| Problema | Respuesta |
|---|---|
| El contenedor no arranca | "Esto es justamente lo que pasa cuando se depende de red: muestro las capturas del laboratorio prevalidado." (imágenes en `lab-infra/imgs/`) |
| El DNS no responde | Verificar `docker compose ps`; el servicio DNS debe estar `Up`. Reiniciar con `docker compose up -d dns`. |
| La enumeración tarda | Ampliar `-timeout` a 5. Si el aula va lenta, usar los resultados pre-generados. |
| No hay Internet en el aula | No importa: **el laboratorio no necesita Internet**. Es una ventaja, se explica como tal. |

---

## Notas finales para el expositor

- **No leas las diapositivas.** Están para el público; tú cuentas la historia.
- **La demo es el corazón.** Si tienes que elegir entre pulir la teoría o ensayar la demo, ensaya la demo.
- **Si algo falla, explícalo.** Un error técnico con explicación refuerza la credibilidad; un resultado sin explicar la destruye.
- **El profesor es experto.** Si sale una pregunta técnica específica, no improvises: di "eso lo vi en el código fuente" y sigue. Es honesto y demuestra rigor.
- **Cierra con la frase de la diapositiva 11.** "La herramienta se automatiza; la responsabilidad no."

---

## Control de tiempo (resumen)

| Tramo | Diapositivas | Minutos |
|---|---|---|
| Apertura | 1 | 0.5 |
| Problema | 2 | 1.2 |
| Definición | 3 | 1.2 |
| Pasivo vs Activo | 4 | 1.7 |
| Arquitectura | 5 | 1.0 |
| Base de datos | 6 | 1.2 |
| Transición | 7 | 1.2 |
| **Total teoría** | **1–7** | **8.0** |
| Verificación | 8 | 2.0 |
| Enum + brute | 9 | 3.0 |
| Interpretación | 10 | 3.0 |
| Cierre | 11 | 2.5 |
| Preguntas | — | 3.5 |
| **Total** | **1–11** | **25.0** |
