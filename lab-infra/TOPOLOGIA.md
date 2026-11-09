# =============================================================================
# LAB-INFRA · Topología de VMs · OWASP Amass
#
#   ┌─────────────────────────────────────────────────────────────────┐
#   │  HOST FÍSICO (tu máquina)                                      │
#   │  Hypervisor: VirtualBox / VMware / KVM                         │
#   │  Red: 192.168.56.0/24 — HOST-ONLY, sin NAT, sin bridge        │
#   │                                                                 │
#   │  ┌───────────────────────────────────────────────────────────┐  │
#   │  │ VM ATTACKER           192.168.56.100                    │  │
#   │  │ Kali/Ubuntu + Docker + owaspamass/amass:latest           │  │
#   │  │   → Scripts en ~/amass-lab/scripts/                      │  │
│   │  └───────────────────────────────────────────────────────────┘  │
#   │            │ DNS (53)  │ HTTP/HTTPS (80,443,8080)            │
#   │            │           │ AXFR (allowed en 192.168.56.0/24)    │
#   │  ┌─────────┼──────────────┬──────────────────────────┐        │
#   │  │  ┌──────▼────────┐  ┌──▼───────────────┐  ┌──────▼───┐   │  │
#   │  │  │ VM DNS        │  │ VM OBJETIVO      │  │ VM OSINT │   │  │
#   │  │  │ 192.168.56.101│  │ 192.168.56.103   │  │ .102     │   │  │
#   │  │  │ BIND9         │  │ Metasploitable 3 │  │ nginx    │   │  │
#   │  │  │ lab.local     │  │ :80 :443 :8080   │  │ mock     │   │  │
│   │  │  │ + zona inversa│  │ + :21 :22 :3306  │  │ crt.sh   │   │  │
│   │  │  └───────────────┘  └──────────────────┘  └──────────┘   │  │
#   │  └───────────────────────────────────────────────────────────┘  │
#   └─────────────────────────────────────────────────────────────────┘
#
#  RED AISLADA — verificación obligatoria antes de empezar:
#     ping -c 2 8.8.8.8          → DEBE fallar
#     dig @192.168.56.101 lab.local A → DEBE responder
# =============================================================================

# ---------------------------------------------------------------------------
# Tabla de direcciones
# ---------------------------------------------------------------------------
cat <<'EOF'
VM              IP                Rol                              Puertos relevantes
--------------- ----------------- -------------------------------- ----------------------
attacker        192.168.56.100    Amass + scripts de ataque        Docker, 22
dns-authoritative192.168.56.101    BIND9, zona lab.local            53/tcp 53/udp
osint-mock      192.168.56.102    nginx con fuentes OSINT fake     80/tcp 8080/tcp
objetivo (MS3)  192.168.56.103    Metasploitable 3                 80 443 8080 21 22 3306
extra-01        192.168.56.104    staging/qa/uat (IPsiner)          —
extra-02        192.168.56.105    admin/portal                     —
extra-03        192.168.56.106    vpn                              —
extra-04        192.168.56.107    jenkins/gitlab                   —
extra-05        192.168.56.108    grafana/kibana                   —
extra-06        192.168.56.109    api/beta/sandbox                 —
extra-07        192.168.56.110    old/backup                       —
extra-08        192.168.56.111    sipserver                        —
EOF

# ---------------------------------------------------------------------------
# Mapeo DNS → activos
# ---------------------------------------------------------------------------
cat <<'EOF'
Nombre                    →  IP              →  Observación
------------------------- ----------------- --------------------------------
lab.local                 → 192.168.56.101   → apex (DNS)
ns1.lab.local             → 192.168.56.101   → nameserver
www.lab.local             → 192.168.56.103   → MS3, HTTP/HTTPS
mail.lab.local            → 192.168.56.103   → MS3
dev.lab.local             → 192.168.56.103   → HALLAZGO CRÍTICO
staging.lab.local         → 192.168.56.103   → HALLAZGO ALTO
qa.lab.local              → 192.168.56.104
uat.lab.local             → 192.168.56.104
preprod.lab.local         → 192.168.56.104
admin.lab.local           → 192.168.56.105   → HALLAZGO ALTO
portal.lab.local          → 192.168.56.105
vpn.lab.local             → 192.168.56.106   → HALLAZGO CRÍTICO
jenkins.lab.local         → 192.168.56.107   → HALLAZGO ALTO
gitlab.lab.local          → 192.168.56.107   → HALLAZGO ALTO
grafana.lab.local         → 192.168.56.108
kibana.lab.local          → 192.168.56.108
api.lab.local             → 192.168.56.109
beta.lab.local            → 192.168.56.109
sandbox.lab.local         → 192.168.56.109
old.lab.local             → 192.168.56.110   → deuda técnica
backup.lab.local          → 192.168.56.110
sipserver.lab.local       → 192.168.56.111   → registro SRV
intranet.lab.local        → CNAME portal     → alias
secure.lab.local          → CNAME vpn        → alias
ci.lab.local              → CNAME jenkins    → alias
scm.lab.local             → CNAME gitlab     → alias
metrics.lab.local         → CNAME grafana    → alias
logs.lab.local            → CNAME kibana     → alias
preview.lab.local         → CNAME beta       → alias
legacy.lab.local          → CNAME old        → alias
EOF

echo
echo "IP totalscka en la zona DNS: 20 subdominios + 8 alias CNAME + 1 SRV + 11 PTR"
