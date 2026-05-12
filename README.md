# SentinelShield — Advanced Intrusion Detection & Web Protection System

A lightweight, full-stack **WAF + IDS hybrid** built for cybersecurity learning, academic projects,
and real-world demo of modern Web Application Firewall behavior.

---

## Stack
- **Backend**: FastAPI (Python 3.11) + MongoDB + scikit-learn (Isolation Forest) + python-magic
- **Frontend**: React 19 + TailwindCSS + Recharts + shadcn/ui
- **Auth**: JWT (bcrypt password hashing)
- **Logging**: Structured JSON (`backend/logs/security.log`)

## Features
1. **HTTP Request Inspection** — URL, query, headers, body, method, IP normalized + URL-decoded
2. **Rule-Based Detection** — 20 signatures across SQLi, XSS, Directory Traversal, Command Injection, LFI, RCE (`backend/rules/rules.json`)
3. **Decision Engine** — block + HTTP 403 + alert + log + IP risk escalation
4. **Rate Limiting** — sliding-window per IP (10 req / 10s) with temp ban + HTTP 429
5. **Severity Scoring** — `score > 30 → temp ban`, `score > 60 → permanent blacklist`
6. **AI Anomaly Detection** — Isolation Forest scoring on request features
7. **Magic-Number File Validation** — `python-magic` true type detection (PNG/JPG/PDF only)
8. **Live Attack Simulator** — fire SQLi, XSS, Traversal, Command Injection, Burst attacks from UI
9. **SOC Dashboard** — KPIs, pie/bar/line charts, top hostile IPs, severity distribution, live feed
10. **Structured JSON Logs** + filterable Threat Logs page
11. **IP Reputation Console** — view scores, manual unblock/blacklist

## Quick Start
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

## Default Credentials
- **Email**: `admin@sentinelshield.io`
- **Password**: `Sentinel@2026`

## Test Attacks via curl
```bash
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sentinelshield.io","password":"Sentinel@2026"}' | jq -r .token)

# Inspect a malicious request
curl -X POST http://localhost:8001/api/inspect \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"method":"GET","path":"/login","query":"user=admin'\'' OR 1=1--"}'

# XSS test
curl -X POST http://localhost:8001/api/inspect \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"method":"GET","path":"/search","query":"q=<script>alert(1)</script>"}'

# Run rate-limit burst from UI Simulator → "Rate-Limit Burst (15 req)"
```

## Architecture
```
┌────────────────┐    HTTPS    ┌─────────────────────────────────────────┐
│  React SPA UI  │ ──────────► │ FastAPI /api router                      │
│  (SOC Console) │             │  ├─ auth      (bcrypt + JWT)             │
└────────────────┘             │  ├─ inspect   ── detector.py (rules.json)│
                               │  ├─ simulate  ── ai_detector (Iso.Forest)│
                               │  ├─ upload    ── python-magic            │
                               │  ├─ stats/logs/rules/ip-reputation       │
                               │  └─ rate_limiter (in-memory)             │
                               │                                          │
                               │  events ─► MongoDB + logs/security.log   │
                               └─────────────────────────────────────────┘
```

## Future Improvements
- WebSocket live event stream
- GeoIP enrichment + heatmap
- Persistent ML model with online learning
- Custom rule editor in UI
- Slack / Email alert webhooks
