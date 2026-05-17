# SentinelShield — Advanced Intrusion Detection & Web Protection System 🛡️

SentinelShield is a modern **Web Application Firewall (WAF) + Intrusion Detection System (IDS)** hybrid designed for cybersecurity learning, academic research, and real-world security demonstrations.

Built with a full-stack architecture, SentinelShield simulates how modern SOC platforms detect, classify, block, and analyze malicious web traffic in real time.

---

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![React](https://img.shields.io/badge/React-Frontend-61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-green)
![Cybersecurity](https://img.shields.io/badge/Cybersecurity-WAF%20%2B%20IDS-red)

---

# 🚀 Key Highlights

✅ Real-Time Threat Detection  
✅ SOC-Style Security Dashboard  
✅ AI-Based Anomaly Detection  
✅ IP Reputation & Risk Scoring  
✅ Live Attack Simulation  
✅ Secure File Validation  
✅ JWT Authentication & Access Control  
✅ Structured Security Logging  
✅ Modern Cybersecurity UI/UX
✅ Browser Fingerprinting
---

# 📸 Screenshots

## 🔐 Login Portal

<img width="1905" height="908" alt="SentinelShield_loginpage" src="https://github.com/user-attachments/assets/d028a4c8-1aed-4f17-b867-2d9b85d290e2" />

---

## 📊 Threat Operations Dashboard

<img width="1905" height="954" alt="SentinelShield_Dashboard" src="https://github.com/user-attachments/assets/b0991d68-f26c-49ed-965a-72cf3dabb1c3" />

---

## ⚔️ Live Attack Simulator

<img width="1634" height="541" alt="SentinelShield_LiveAttackSimulator" src="https://github.com/user-attachments/assets/a276818f-5533-4034-bd09-ad59fe7a1950" />

---

## 📜 Threat Logs & Analytics

<img width="1727" height="885" alt="SentinelShield_ThreatLogs" src="https://github.com/user-attachments/assets/d3a068ea-aceb-498b-9fdc-acea5a961c2a" />

---

## 🌐 IP Reputation Engine

<img width="1841" height="860" alt="SentinelShield_IPReputation" src="https://github.com/user-attachments/assets/4ff7d9e6-6d92-483f-876b-12333445ba70" />

---

## 🧠 Detection Rule Engine

<img width="1841" height="939" alt="SentinelShield_RulesSign" src="https://github.com/user-attachments/assets/4fbe977d-933d-44e3-afd2-789f953ebf67" />

---

## 📂 Magic File Validator

<img width="1841" height="860" alt="SentinelShield_MagicFileValidator" src="https://github.com/user-attachments/assets/53a1de9c-b875-4bc0-92b3-00b889035cd6" />

---

## 🛠️ Swagger API Documentation

<img width="1629" height="851" alt="SentinelShield_Backend" src="https://github.com/user-attachments/assets/e951f540-c3cd-434e-abc1-4475ca11c69e" />

---

# 🧠 Core Capabilities

## 🔍 HTTP Request Inspection

Analyzes:
- URL paths
- Query parameters
- Headers
- Request bodies
- HTTP methods
- Source IPs

Payloads are normalized and URL-decoded before inspection.

---

## 🛡️ Rule-Based Threat Detection

Includes detection signatures for:

- SQL Injection (SQLi)
- Cross-Site Scripting (XSS)
- Directory Traversal
- Command Injection
- Local File Inclusion (LFI)
- Remote Code Execution (RCE)

Rules are dynamically compiled using regex-based detection logic.

---

## ⚠️ Intelligent Decision Engine

Automatically:
- Blocks malicious requests
- Returns HTTP 403 responses
- Logs security events
- Escalates IP reputation scores
- Applies temporary or permanent bans

---

## 🚦 Rate Limiting & Abuse Prevention

Implements sliding-window rate limiting:
- 10 requests / 10 seconds per IP

Supports:
- Temporary bans
- HTTP 429 responses
- Burst attack mitigation
- Brute-force protection

---

## 🤖 AI Anomaly Detection

Uses **Isolation Forest (scikit-learn)** to detect abnormal request behavior based on:
- Request patterns
- Payload structure
- Frequency anomalies
- Behavioral deviations

---

## 📂 Secure File Validation

Powered by `python-magic` for true file signature verification.

Supported uploads:
- PNG
- JPG
- PDF

Detects:
- MIME spoofing
- Disguised executables
- Malicious uploads

---

## ⚔️ Live Attack Simulator

Built-in attack simulation console for testing:

- SQL Injection
- XSS
- Directory Traversal
- Command Injection
- Rate-Limit Burst Attacks

All attacks are detected and visualized live through the SOC dashboard.

---

## 📊 SOC Dashboard & Threat Analytics

Interactive real-time dashboard includes:

- Threat KPIs
- Attack category distribution
- Request timelines
- Hostile IP tracking
- Severity scoring
- Live event feeds
- Security analytics charts

---

## 🌐 IP Reputation Engine

Tracks attacker behavior using:
- Risk scoring
- Threat history
- Hit counters
- Automatic temporary bans
- Manual blacklist/unblock controls

---

## 📜 Structured Threat Logging

All security events are stored as structured JSON logs for:
- Threat analysis
- Incident review
- Filtering
- Monitoring
- Analytics

Log Location:

```bash
backend/logs/security.log
```

---

# 🧱 Tech Stack

## Backend
- FastAPI (Python 3.11)
- MongoDB
- scikit-learn
- python-magic
- JWT Authentication
- bcrypt Password Hashing

## Frontend
- React 19
- TailwindCSS
- Recharts
- shadcn/ui

---

# 🔐 Authentication

Secure JWT-based authentication system with:
- Access tokens
- Session validation
- Protected routes
- Role-based logic

---

# ⚡ Quick Start

## 1️⃣ Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/SentinelShield.git
cd SentinelShield
```

---

## 2️⃣ Backend Setup

```bash
cd backend

python -m venv venv

source venv/bin/activate   # Linux/macOS
# OR
venv\Scripts\activate      # Windows

pip install -r ../requirements.txt

uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at:

```bash
http://localhost:8000
```


## 3️⃣ Frontend Setup

```bash
cd frontend

npm install --legacy-peer-deps

npm start
```

Frontend runs at:

```bash
http://localhost:3000
```


# ⚔️ Attack Testing Examples

## SQL Injection Test

```bash
curl -X POST http://localhost:8000/api/inspect \
-H "Content-Type: application/json" \
-d '{"payload":"admin OR 1=1"}'
```

---

## XSS Test

```bash
curl -X POST http://localhost:8000/api/inspect \
-H "Content-Type: application/json" \
-d '{"payload":"<script>alert(1)</script>"}'
```

---

## Directory Traversal Test

```bash
curl -X POST http://localhost:8000/api/inspect \
-H "Content-Type: application/json" \
-d '{"payload":"../../etc/passwd"}'
```

---

## Rate-Limit Burst Simulation

Use:

```text
Attack Simulator → Rate-Limit Burst (15 req)
```

---

# 🏗️ System Architecture

```text
┌────────────────┐    HTTPS    ┌─────────────────────────────────────────┐
│  React SPA UI  │ ──────────► │ FastAPI API Gateway                     │
│  (SOC Console) │             │                                         │
└────────────────┘             │  ├─ Authentication (JWT + bcrypt)       │
                               │  ├─ Detection Engine (rules.json)       │
                               │  ├─ AI Anomaly Detection                │
                               │  ├─ File Validation Engine              │
                               │  ├─ Rate Limiter                        │
                               │  ├─ Threat Analytics                    │
                               │  ├─ IP Reputation System                │
                               │  └─ Structured Logging                  │
                               │                                         │
                               │  events ─► MongoDB + security.log       │
                               └─────────────────────────────────────────┘
```

---

# 📈 Future Improvements

- WebSocket live event streaming
- GeoIP enrichment & attack heatmaps
- Persistent ML model training
- Online anomaly learning
- Custom rule editor UI
- Slack/Email alert integrations
- SIEM integrations
- Threat intelligence feeds

---

# 🛡️ Security Focus Areas

- Web Application Firewall (WAF)
- Intrusion Detection Systems (IDS)
- Threat Intelligence
- SOC Monitoring
- Secure File Uploads
- Behavioral Analysis
- API Security
- OWASP Attack Detection

---

# 📌 Educational Purpose

SentinelShield was developed for:
- Cybersecurity learning
- Academic demonstrations
- Portfolio projects
- Security research
- SOC simulation
- Ethical hacking practice

---

# 👨‍💻 Author

**Sampath G L**

Cybersecurity Enthusiast | Full-Stack Developer | Ethical Hacking Learner

---

# ⭐ Support

If you found this project useful:
- ⭐ Star the repository
- 🍴 Fork the project
- 🛡️ Contribute security improvements
- 🚀 Share feedback and ideas
