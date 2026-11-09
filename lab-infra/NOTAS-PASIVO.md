# NOTAS — El modo pasivo en un laboratorio 100 % offline

## El problema

En Amass v5 el motor (`engine`) inicia **todos** los plugins registrados en
`engine/plugins/load.go`, entre ellos los de fuentes externas:

```
api.NewCrtsh        → https://crt.sh/?CN=...
scrape.NewRapidDNS  → https://rapiddns.io/subdomain/...
scrape.NewBing      → https://www.bing.com/search?q=...
scrape.NewDuckDuckGo→ https://duckduckgo.com/html/?q=...
archive.NewWayback  → http://archive.org/wayback/available?url=...
api.NewVirusTotal   → https://www.virustotal.com/api/v3/...
api.NewSecurityTrails → https://api.securitytrails.com/v1/...
api.NewHackerTarget → https://api.hackertarget.com/hostsearch/?q=...
... y ~25 más
```

El código de `crtsh.go` lo confirma:

```go
resp, err := amasshttp.RequestWebPage(ctx, e.Session.Clients().General,
    &amasshttp.Request{
        URL: "https://crt.sh/?CN=" + name + "&output=json&exclude=expired",
    })
```

La URL está **fijada en el código**, no en `datasources.yaml`. Por eso:

- `datasources.yaml` **no** puede desactivarlas; solo configura credenciales.
- `-include` / `-exclude` filtran por **nombre de fuente**, lo cual sí funciona
  para evitar que un plugin sin credencialesSelected in lese, pero el plugin
  sigue arrancando y consumiendo tiempo en timeouts.
- Redirigir `crt.sh` a un servidor local requeriría **recompilar Amass** o
  montar un proxy TLS con reescritura — fuera del alcance de 25 minutos.

## La solución que usamos en el laboratorio

Combinamos tres mecanismos:

### 1. Red del hypervisor sin salida a Internet

Si el adaptador de las VMs es **host-only** sin NAT ni gateway:

```
$ ping -c 2 8.8.8.8
ping: connect: Network is unreachable
```

Las fuentes fallan **de inmediato** (no hay timeout de 30 s), así que la
enumeración no se ralentiza.

### 2. `iptables` como red de seguridad (Estrategia A)

El script `03-aislar-salida.sh` permite todo hacia `192.168.56.0/24` y
`172.16.0.0/12` (Docker), y rechaza el resto. Es la opción preferida si el
hypervisor exige que la VM tenga gateway.

### 3. `resolvers: [192.168.56.101]` en `config.yaml`

Esta es la línea **más importante** del laboratorio:

```yaml
options:
  resolvers:
    - 192.168.56.101
```

Con esto, **toda** resolución DNS (A, AAAA, CNAME, NS, MX, PTR, SRV) va al
BIND9 del laboratorio. Nunca se consulta a `8.8.8.8`, `1.1.1.1` ni a ningún
resolver público.

> **Limitación honesta:** el plugin `DNS` de Amass v5 usa un pool interno de
> resolvers públicos (`support.resolvers.go`, función `trustedResolvers()`) para
> `PerformQuery`, independiente de la opción `resolvers` del config, que solo
> afecta a las consultas de `intel`/WHOIS. Por eso el bloqueo a nivel de red
> **no es opcional**: es la garantía real del aislamiento. Sin el bloqueo, el
> plugin DNS consultaría `8.8.8.8` y el laboratorio saldría a Internet.

### Alternativa: `-nf` para simular la fuente pasiva

El plugin `Known-FQDN` (posición 11) **inyecta los nombres que se le pasen**
como activos en el grafo, marcados con su propia fuente. Eso nos permite
simular exactamente lo que devolvería una fuente OSINT, sin red:

```bash
# Semillas pasivas (lo que "devolvería" crt.sh + RapidDNS en la realidad)
docker run --rm -it \
  -v ~/amass-lab/configs:/.config/amass \
  -v ~/amass-lab/results:/results \
  amass:latest enum \
    -active \
    -nf /results/semillas-pasivas.txt \
    -d lab.local \
    -p 80,443,8080 \
    -ip -src \
    -o /results/subdominios-pasivo-semulado.txt
```

El archivo `semillas-pasivas.txt` se genera a partir del mock OSINT:

```bash
# En la VM atacante
curl -s http://192.168.56.102:8080/rapiddns > ~/amass-lab/results/semillas-pasivas.txt
```

Los nombres quedan etiquetados con fuente **Known-FQDN** y los que no existen
en la zona se descartan automáticamente al intentar resolverlos.

## Qué mostrar en la exposición

| Concepto | Evidencia |
|---|---|
| El modo pasivo consulta fuentes OSINT | Diapositiva de arquitectura + mock local |
| El modo activo consulta el DNS autoritativo | Demo en vivo con `dig` + Amass |
| La diferencia es "no tocar el objetivo" | `tcpdump` en la VM objetivo durante cada modo |
| Amass no adivina: valida contra el DNS | Demo de nombres descartados |

### PruebaOptional: captura de tráfico para demostrar el modo pasivo vs. activo

```bash
# En la VM OBJETIVO (192.168.56.103), mientras corres Amass:
sudo tcpdump -i eth0 -nn "host 192.168.56.100 and not port 53" -w /tmp/pasivo.pcap
#   → modo pasivo: 0 paquetes (no hay contacto con el objetivo)
sudo tcpdump -i eth0 -nn "host 192.168.56.100" -w /tmp/activo.pcap
#   → modo activo: paquetes HTTP/HTTPS desde la IP del atacante
```

Esta es una demostración potentísima para un público técnico: **el modo pasivo
literalmente no genera tráfico hacia el objetivo**.

## Limitación que debemos declarar al público

En un escenario real, las fuentes pasivas requieren:

1. Salida a Internet (API keys, consultas HTTP).
2. Credenciales para las fuentes que las exigen (Shodan, VirusTotal, etc.).
3. Aceptar los términos de cada servicio y sus rate limits.

En el laboratorio se sustituyen por un DNS autoritativo propio + semillas
inyectadas, de modo que **el comportamiento observable de Amass** (grafo,
correlación, validación, fuerza bruta, persistencia) es idéntico, pero todo
ocurre dentro de las VMs.

---

## Resumen de la garantía de aislamiento

| Capa | Mecanismo | Verificación |
|---|---|---|
| Hypervisor | Red host-only sin NAT/gateway | `ip route` no muestra default gateway |
| SO | `iptables` bloquea salida no permitida | `curl https://owasp.org` falla |
| DNS | `resolvers: [192.168.56.101]` | `dig @192.168.56.101 lab.local A` responde |
| Objetivo | IP RFC1918 sin exposición pública | `192.168.56.0/24` es privada |
| Datos | `lab.local` es TLD reservado, no existe en Internet | Registro IANA reservado |
