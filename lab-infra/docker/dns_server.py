"""DNS autoritativo simulado para el laboratorio de OWASP Amass v5.

Implementado con dnspython para garantizar un formato de mensaje DNS
correcto (la version anterior, escrita a mano, producia respuestas con
"overflowing header size" que el cliente Go de Amass rechazaba).

Modo de operacion
-----------------
El pool round-robin de resolvers de Amass v5 envia la MISMA consulta (con
el mismo DNS ID) a 53 nameservers distintos. Un resolver real solo responde
a uno; si el simulador responde a todos, el xchgManager de
owasp-amass/resolve entra en conflicto ("key already in use").

Por eso aqui se responde UNICAMENTE a la primera consulta received y se
ignoran las siguientes durante una ventana de tiempo, simulando un unico
nameserver autoritativo.

Uso:
    python3 dns_server.py <puerto> <archivo_zona> [--verbose]
"""

import argparse
import socket
import sys
import threading
import time

import dns.message
import dns.rrset
import dns.rdatatype
import dns.rdataclass
import dns.name


class Zone:
    """Zona DNS minima: registros A, CNAME, NS, MX, PTR, SRV, TXT, SOA."""

    def __init__(self, path):
        self.records = {}
        self.ttl = 300
        with open(path, "r", encoding="utf-8") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split()
                if len(parts) < 3:
                    continue
                name, rtype = parts[0], parts[1]
                # El valor es el resto de la linea (importante para MX y SRV,
                # que tienen campos adicionales: "10 mail.lab.local").
                value = " ".join(parts[2:])
                self.records.setdefault(name.lower(), []).append((rtype.upper(), value))

    def lookup(self, qname, qtype):
        """Devuelve la lista de valores para el nombre y tipo solicitados."""
        name = qname.lower().rstrip(".")
        entries = self.records.get(name)
        if not entries:
            return []

        wanted = dns.rdatatype.from_text(qtype)
        wanted_text = dns.rdatatype.to_text(wanted)
        results = []
        for rtype, value in entries:
            # Solo se devuelve el registro si el tipo coincide EXACTAMENTE con
            # el consultado. Si no, dns.rrset.from_text() construiria un
            # rdataset inconsistente (p.ej. un NS con qtype=SOA).
            if rtype == wanted_text:
                results.append((rtype, value))
        return results


def build_response(query, zone):
    """Construye la respuesta DNS usando dnspython."""
    question = query.question[0]
    qname = str(question.name).rstrip(".")
    qtype = dns.rdatatype.to_text(question.rdtype)

    response = dns.message.make_response(query)
    response.flags |= dns.flags.AA  # authoritative answer

    matches = zone.lookup(qname, qtype)
    if not matches:
        # NXDOMAIN solo si el nombre no existe en absoluto; si existe pero
        # no tiene ese tipo, se responde NOERROR sin answers.
        name_exists = any(
            key == qname.lower() or key == qname.lower().rstrip(".")
            for key in zone.records
        )
        if not name_exists:
            response.set_rcode(dns.rcode.NXDOMAIN)
        return response

    for rtype, value in matches:
        name = dns.name.from_text(qname + ".")
        # Los nombres de destino (CNAME/NS/MX/SRV/PTR) se absolutizan usando
        # origin=root; dns.name.from_text NO anade el punto final por defecto.
        target = value
        if rtype in ("CNAME", "NS", "MX", "SRV", "PTR"):
            if rtype == "MX":
                parts = target.split(None, 1)
                target = f"{parts[0]} {dns.name.from_text(parts[1], origin=dns.name.root)}"
            elif rtype == "SRV":
                parts = target.split(None, 3)
                target = " ".join(
                    parts[:3] + [str(dns.name.from_text(parts[3], origin=dns.name.root))]
                )
            else:
                target = str(dns.name.from_text(target, origin=dns.name.root))
        rrset = dns.rrset.from_text_list(
            name, zone.ttl, "IN", rtype, [target], origin=dns.name.root
        )
        response.answer.append(rrset)
    return response


def serve(sock, zone, verbose, dedup_window):
    """Bucle principal del servidor DNS."""
    last_by_key = {}
    while True:
        try:
            data, addr = sock.recvfrom(4096)
        except OSError:
            break

        try:
            query = dns.message.from_wire(data)
        except Exception:
            continue

        if not query.question:
            continue

        question = query.question[0]
        qname = str(question.name).rstrip(".").lower()
        qtype = dns.rdatatype.to_text(question.rdtype)

        # Deduplicacion: el pool round-robin de Amass envia la misma query
        # (mismo DNS ID + nombre) a los 53 servers. Solo respondemos a la
        # primera, como haria un nameserver real.
        key = (query.id, qname, qtype)
        now = time.monotonic()
        if key in last_by_key and now - last_by_key[key] < dedup_window:
            if verbose:
                print(f"[dup] {qname} {qtype} id={query.id} src={addr[0]}", flush=True)
            continue
        last_by_key[key] = now

        if verbose:
            print(f"[query] {qname} {qtype} id={query.id} src={addr[0]}", flush=True)

        try:
            response = build_response(query, zone)
        except Exception as exc:  # pragma: no cover
            print(f"[error] {qname} {qtype}: {exc}", flush=True)
            continue

        try:
            sock.sendto(response.to_wire(origin=dns.name.root), addr)
        except OSError:
            pass


def main():
    parser = argparse.ArgumentParser(description="DNS autoritativo simulado")
    parser.add_argument("port", nargs="?", type=int, default=53)
    parser.add_argument("zone", nargs="?", default="/app/zone.txt")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--dedup-window", type=float, default=5.0,
                        help="segundos de deduplicacion por (id, nombre, tipo)")
    args = parser.parse_args()

    zone = Zone(args.zone)

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("0.0.0.0", args.port))

    print(f"[dns] simulador autoritativo escuchando en 0.0.0.0:{args.port}", flush=True)
    print(f"[dns] zona: {args.zone} ({len(zone.records)} nombres)", flush=True)

    thread = threading.Thread(
        target=serve,
        args=(sock, zone, args.verbose, args.dedup_window),
        daemon=True,
    )
    thread.start()
    thread.join()


if __name__ == "__main__":
    main()
