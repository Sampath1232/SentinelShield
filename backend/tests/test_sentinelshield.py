"""SentinelShield backend API tests."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://threat-detector-115.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@sentinelshield.io"
ADMIN_PWD = "Sentinel@2026"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD}, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["email"] == ADMIN_EMAIL
    return data["token"]


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ----- Auth -----
def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=20)
    assert r.status_code == 401


def test_me_without_token():
    r = requests.get(f"{API}/auth/me", timeout=20)
    assert r.status_code == 401


def test_me_with_token(auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


# ----- Stats -----
def test_stats_requires_auth():
    r = requests.get(f"{API}/stats", timeout=20)
    assert r.status_code == 401


def test_stats_ok(auth_headers):
    r = requests.get(f"{API}/stats", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    d = r.json()
    for k in ["total", "blocked", "allowed", "active_threats", "categories", "severities", "top_ips", "trend", "rules_count"]:
        assert k in d, f"missing {k}"
    assert d["rules_count"] >= 20


# ----- Rules -----
def test_rules(auth_headers):
    r = requests.get(f"{API}/rules", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    rules = r.json()
    assert len(rules) >= 20
    sample = rules[0]
    for k in ["rule_id", "category", "pattern", "severity", "score"]:
        assert k in sample


# ----- Logs filters -----
def test_logs_basic(auth_headers):
    r = requests.get(f"{API}/logs", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_logs_filter_blocked(auth_headers):
    r = requests.get(f"{API}/logs?action=blocked", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    for e in r.json():
        assert e["action"] == "blocked"


# ----- Inspect -----
def test_inspect_sqli_blocked(auth_headers):
    r = requests.post(f"{API}/inspect",
                      headers={**auth_headers, "X-Forwarded-For": "198.51.100.201"},
                      json={"method": "GET", "path": "/login", "query": "user=admin' OR 1=1--"}, timeout=20)
    assert r.status_code == 403
    d = r.json()
    assert d["blocked"] is True
    assert len(d["matches"]) > 0


def test_inspect_benign_allowed(auth_headers):
    r = requests.post(f"{API}/inspect",
                      headers={**auth_headers, "X-Forwarded-For": "198.51.100.202"},
                      json={"method": "GET", "path": "/about", "query": ""}, timeout=20)
    assert r.status_code == 200
    assert r.json()["blocked"] is False


# ----- Simulate -----
@pytest.mark.parametrize("kind", ["sqli", "xss", "traversal", "command", "union", "benign"])
def test_simulate_types(auth_headers, kind):
    r = requests.post(f"{API}/simulate", headers=auth_headers, json={"type": kind}, timeout=20)
    assert r.status_code == 200, r.text
    res = r.json()["result"]
    if kind == "benign":
        assert res.get("blocked") in (False, None)
    else:
        assert res.get("blocked") is True
        assert len(res.get("matches", [])) > 0


def test_simulate_burst_rate_limited(auth_headers):
    r = requests.post(f"{API}/simulate/burst", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    results = r.json()["results"]
    assert len(results) == 15
    rate_limited = [x for x in results if x.get("reason") == "rate_limited"]
    assert len(rate_limited) >= 1, "expected at least one rate_limited response"


# ----- IP Reputation -----
def test_ip_reputation_list(auth_headers):
    r = requests.get(f"{API}/ip-reputation", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_ip_blacklist_and_unblock(auth_headers):
    ip = "198.51.100.77"
    r = requests.post(f"{API}/ip-reputation/blacklist", headers=auth_headers, json={"ip": ip}, timeout=20)
    assert r.status_code == 200
    r = requests.post(f"{API}/ip-reputation/unblock", headers=auth_headers, json={"ip": ip}, timeout=20)
    assert r.status_code == 200


# Minimal valid 1x1 PNG (89 bytes) — passes libmagic detection
PNG_BYTES = bytes.fromhex(
    "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
    "890000000D49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
)


def test_upload_valid_png(auth_headers):
    files = {"file": ("good.png", io.BytesIO(PNG_BYTES), "image/png")}
    r = requests.post(f"{API}/upload", headers=auth_headers, files=files, timeout=20)
    assert r.status_code == 200, r.text
    assert r.json()["accepted"] is True


def test_upload_disguised_file_rejected(auth_headers):
    # Plain text disguised as png
    files = {"file": ("fake.png", io.BytesIO(b"<?php echo 'pwned'; ?>"), "image/png")}
    r = requests.post(f"{API}/upload", headers=auth_headers, files=files, timeout=20)
    assert r.status_code == 415
    d = r.json()
    assert d["accepted"] is False
    assert "detected_mime" in d
