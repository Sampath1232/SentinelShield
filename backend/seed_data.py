"""Generate realistic seed attack events for the dashboard."""
import random
from datetime import datetime, timezone, timedelta
from typing import List

ATTACK_TEMPLATES = [
    {"category": "SQL Injection", "rule_id": "SQLI_001", "severity": "high",     "score": 10, "path": "/login",    "payload": "user=admin' OR 1=1--"},
    {"category": "SQL Injection", "rule_id": "SQLI_002", "severity": "high",     "score": 10, "path": "/products", "payload": "id=1 UNION SELECT username,password FROM users"},
    {"category": "SQL Injection", "rule_id": "SQLI_003", "severity": "critical", "score": 20, "path": "/admin",    "payload": "name='; DROP TABLE users;--"},
    {"category": "Cross-Site Scripting", "rule_id": "XSS_001", "severity": "high",   "score": 10, "path": "/search",  "payload": "q=<script>alert(1)</script>"},
    {"category": "Cross-Site Scripting", "rule_id": "XSS_002", "severity": "high",   "score": 10, "path": "/redirect","payload": "url=javascript:alert(document.cookie)"},
    {"category": "Cross-Site Scripting", "rule_id": "XSS_003", "severity": "medium", "score": 5,  "path": "/profile", "payload": "bio=<img onerror=alert(1) src=x>"},
    {"category": "Directory Traversal", "rule_id": "TRV_001", "severity": "high",     "score": 10, "path": "/file",  "payload": "name=../../../etc/passwd"},
    {"category": "Directory Traversal", "rule_id": "TRV_002", "severity": "critical", "score": 20, "path": "/static","payload": "file=/etc/passwd"},
    {"category": "Command Injection",   "rule_id": "CMD_001", "severity": "critical", "score": 20, "path": "/ping",  "payload": "host=8.8.8.8; cat /etc/shadow"},
    {"category": "Command Injection",   "rule_id": "CMD_002", "severity": "critical", "score": 20, "path": "/run",   "payload": "cmd=ls && cat /etc/passwd"},
    {"category": "Rate Limit",          "rule_id": "RL_001",  "severity": "medium",   "score": 5,  "path": "/api/v1", "payload": "rate_limit_exceeded"},
    {"category": "Behavioral Anomaly",  "rule_id": "AI_001",  "severity": "medium",   "score": 5,  "path": "/api/v1", "payload": "unusual request pattern"},
]

IP_POOL = [
    "203.0.113.42", "198.51.100.17", "192.0.2.91", "203.0.113.105", "198.51.100.200",
    "185.220.101.45", "45.155.205.233", "162.158.79.34", "104.244.74.108", "23.94.16.5",
    "8.8.8.8", "1.1.1.1", "203.0.113.7", "198.51.100.33", "192.0.2.250",
]

METHODS = ["GET", "GET", "GET", "POST", "POST", "PUT", "DELETE"]
USER_AGENTS = [
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
    "sqlmap/1.7.10#stable (https://sqlmap.org)",
    "Nikto/2.5.0",
    "curl/8.4.0",
    "Mozilla/5.0 (compatible; Nuclei - Open-source project)",
    "python-requests/2.31.0",
]


def generate_events(count: int = 200) -> List[dict]:
    events = []
    now = datetime.now(timezone.utc)
    for i in range(count):
        tpl = random.choice(ATTACK_TEMPLATES)
        ts = now - timedelta(minutes=random.randint(0, 60 * 48), seconds=random.randint(0, 59))
        ip = random.choice(IP_POOL)
        method = random.choice(METHODS)
        action = "blocked" if tpl["severity"] in ("high", "critical") or random.random() < 0.85 else "allowed"
        events.append({
            "timestamp": ts.isoformat(),
            "ip": ip,
            "method": method,
            "path": tpl["path"],
            "query": tpl["payload"],
            "user_agent": random.choice(USER_AGENTS),
            "category": tpl["category"],
            "rule_id": tpl["rule_id"],
            "severity": tpl["severity"],
            "score": tpl["score"],
            "action": action,
            "source": "seed",
        })
    # add some allowed/benign traffic
    benign_paths = ["/", "/about", "/pricing", "/api/health", "/dashboard", "/docs"]
    for i in range(80):
        ts = now - timedelta(minutes=random.randint(0, 60 * 48), seconds=random.randint(0, 59))
        events.append({
            "timestamp": ts.isoformat(),
            "ip": random.choice(IP_POOL),
            "method": random.choice(METHODS),
            "path": random.choice(benign_paths),
            "query": "",
            "user_agent": USER_AGENTS[0],
            "category": "Benign",
            "rule_id": None,
            "severity": "none",
            "score": 0,
            "action": "allowed",
            "source": "seed",
        })
    events.sort(key=lambda e: e["timestamp"])
    return events
