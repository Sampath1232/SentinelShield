# SentinelShield — PRD

## Problem Statement
Full-stack cybersecurity project: WAF + IDS hybrid with HTTP request inspection, rule-based attack detection (SQLi, XSS, Directory Traversal, Command Injection), rate limiting, JSON structured logging, dashboard with charts, magic-number file validation, severity scoring, AI anomaly detection (Isolation Forest), and analytics. Intended for final-year cybersecurity presentation.

## Stack (adapted from Flask/SQLite to platform template)
- Backend: FastAPI + MongoDB (motor)
- ML: scikit-learn Isolation Forest
- File validation: python-magic
- Frontend: React + Tailwind + Recharts + shadcn/ui
- Auth: JWT (bcrypt) — Bearer token, no httpOnly cookies (cross-domain proxy)

## Implemented (Feb 11, 2026)
- 20-rule signature engine in `backend/rules/rules.json`
- `detector.py` regex match + URL-decode normalization
- `rate_limiter.py` sliding-window per IP + temp/permanent ban
- `ai_detector.py` Isolation Forest baseline
- `security_logger.py` JSON line logger → `backend/logs/security.log`
- `seed_data.py` seeds ~280 realistic events on first start
- API: `/api/auth/{login,logout,me}`, `/api/inspect`, `/api/simulate`, `/api/simulate/burst`,
  `/api/stats`, `/api/logs`, `/api/rules`, `/api/ip-reputation` (+unblock/blacklist),
  `/api/upload` (magic-number validation), `/api/uploads`
- Frontend pages: Login (split-view), Dashboard (KPIs+pie+bar+line+activity table),
  Threat Logs (filters), Attack Simulator (terminal UI + buttons), Rules, IP Reputation, File Validator
- Admin auto-seeded: admin@sentinelshield.io / Sentinel@2026

## Backlog / Next
- P1: WebSocket live event push for dashboard
- P1: GeoIP enrichment + world heatmap
- P2: Custom rule editor UI
- P2: Slack/email webhook alerts
- P2: Persistent ML model with online learning
