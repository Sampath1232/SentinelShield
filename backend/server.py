"""SentinelShield - FastAPI server (WAF + IDS + Dashboard API)."""
from dotenv import load_dotenv
load_dotenv()
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import time
import io
import re
import uuid
import bcrypt
import jwt
import magic
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from detector import inspect_request, list_rules, scan
from rate_limiter import limiter
from ai_detector import anomaly_detector, featurize
from security_logger import write_event
from seed_data import generate_events

# ----- DB -----
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
LOGIN_ATTEMPTS = {}  # ip -> [timestamps of attempts]
RATE_LIMIT = {}  # max attempts

# ----- App -----
app = FastAPI(docs_url=None, redoc_url=None,)

@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)

    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin"

    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' https: data:; "
        "style-src 'self' 'unsafe-inline' https:; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "font-src 'self' https: data:;"
    )

    return response

api = APIRouter(prefix="/api")

# =========================================================
# AUTH
# =========================================================
class LoginIn(BaseModel):
    email: EmailStr
    password: str


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_access_token(user_id: str, email: str) -> str:
    return jwt.encode({
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        "type": "access"
    }, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):

    ip = request.client.host

    # simple in-memory login tracking
    if ip not in LOGIN_ATTEMPTS:
        LOGIN_ATTEMPTS[ip] = []

    now = time.time()

    # keep only last 60 seconds
    LOGIN_ATTEMPTS[ip] = [
        t for t in LOGIN_ATTEMPTS[ip]
        if now - t < 60
    ]

    # block after 5 attempts
    if len(LOGIN_ATTEMPTS[ip]) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts"
        )

    user = await db.users.find_one({"email": body.email})

    if not user or not verify_password(body.password, user["password_hash"]):
        LOGIN_ATTEMPTS[ip].append(now)

        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    # clear attempts on successful login
    LOGIN_ATTEMPTS[ip] = []

    token = make_access_token(user["id"], user["email"])

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "token": token
    }

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# =========================================================
# WAF INSPECTION (live)
# =========================================================
def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


async def update_ip_reputation(ip: str, delta: int, last_action: str, last_category: str):
    rec = await db.ip_reputation.find_one({"ip": ip}, {"_id": 0})
    score = (rec["score"] if rec else 0) + delta
    status = "ok"
    if score > 60:
        status = "blacklisted"
        limiter.blacklist(ip)
    elif score > 30:
        status = "temp_banned"
        limiter.ban_temp(ip)
    await db.ip_reputation.update_one(
        {"ip": ip},
        {"$set": {"ip": ip, "score": score, "status": status,
                  "last_action": last_action, "last_category": last_category,
                  "updated_at": datetime.now(timezone.utc).isoformat()},
         "$inc": {"hits": 1}},
        upsert=True,
    )
    return score, status


async def record_event(ip: str, method: str, path: str, query: str,
                       headers: dict, body: str, source: str = "live", fingerprint: str = "unknown"):
    # Rate-limit pre-check
    allowed, reason = limiter.check(ip)
    if not allowed:
        ev = write_event({
            "ip": ip, "method": method, "path": path, "query": query,
            "user_agent": headers.get("user-agent", ""),
            "device_fingerprint": fingerprint,
            "category": "Rate Limit", "rule_id": "RL_001",
            "severity": "medium", "score": 5, "action": "blocked",
            "reason": reason, "source": source,
        })
        score, status = await update_ip_reputation(ip, 5, "blocked", "Rate Limit")
        await db.events.insert_one({**ev, "id": str(uuid.uuid4())})
        return {"blocked": True, "reason": reason, "matches": [], "score": 5, "severity": "medium", "ip_score": score, "ip_status": status}

    # Rule scan
    result = inspect_request(method, path, query, headers, body)

    # AI anomaly — only flag for substantial payloads to avoid false positives on tiny benign requests
    feats = featurize(method, path, query, body)
    payload_len = feats[0]
    anomaly = anomaly_detector.score(feats) if payload_len >= 25 else {"anomaly": False, "score": 0.0}
    if anomaly["anomaly"] and not result["matches"]:
        result["matches"].append({"rule_id": "AI_001", "category": "Behavioral Anomaly",
                                  "severity": "medium", "score": 5,
                                  "description": "Isolation Forest anomaly",
                                  "matched_in": "ai"})
        result["score"] += 5
        result["severity"] = "medium"
        result["blocked"] = True

    category = result["matches"][0]["category"] if result["matches"] else "Benign"
    rule_id = result["matches"][0]["rule_id"] if result["matches"] else None
    action = "blocked" if result["blocked"] else "allowed"

    ev = write_event({
        "ip": ip, "method": method, "path": path, "query": query,
        "user_agent": headers.get("user-agent", ""),
        "device_fingerprint": fingerprint,
        "category": category, "rule_id": rule_id,
        "severity": result["severity"] if result["matches"] else "none",
        "score": result["score"], "action": action,
        "matches": [m["rule_id"] for m in result["matches"]],
        "anomaly_score": anomaly["score"], "source": source,
    })
    score, status = await update_ip_reputation(ip, result["score"] if result["blocked"] else 0,
                                               action, category)
    await db.events.insert_one({**ev, "id": str(uuid.uuid4())})
    return {**result, "anomaly": anomaly, "ip_score": score, "ip_status": status, "action": action}


class InspectIn(BaseModel):
    method: str = "GET"
    path: str = "/"
    query: str = ""
    body: str = ""
    user_agent: Optional[str] = None


@api.post("/inspect")
async def inspect(payload: InspectIn, request: Request):
    ip = client_ip(request)
    fingerprint = request.headers.get("X-Device-Fingerprint", "unknown")
    headers = {"user-agent": payload.user_agent or request.headers.get("user-agent", "")}
    res = await record_event(ip, payload.method, payload.path, payload.query, headers, payload.body, source="api", fingerprint=fingerprint)
    if res.get("blocked"):
        return JSONResponse(status_code=403, content=res)
    return res


# =========================================================
# Attack Simulator (server-side)
# =========================================================
SIM_PAYLOADS = {
    "sqli":      {"method": "GET",  "path": "/login",   "query": "user=admin' OR 1=1--",                "body": "", "ip": "203.0.113.10"},
    "xss":       {"method": "GET",  "path": "/search",  "query": "q=<script>alert('XSS')</script>",     "body": "", "ip": "203.0.113.11"},
    "traversal": {"method": "GET",  "path": "/file",    "query": "name=../../../etc/passwd",            "body": "", "ip": "203.0.113.12"},
    "command":   {"method": "POST", "path": "/ping",    "query": "host=8.8.8.8; cat /etc/shadow",       "body": "", "ip": "203.0.113.13"},
    "union":     {"method": "GET",  "path": "/products","query": "id=1 UNION SELECT username,password FROM users", "body": "", "ip": "203.0.113.14"},
    "benign":    {"method": "GET",  "path": "/about",   "query": "",                                    "body": "", "ip": "203.0.113.15"},
}


class SimIn(BaseModel):
    type: str
    spoof_ip: Optional[str] = None


@api.post("/simulate")
async def simulate(body: SimIn, request: Request, user: dict = Depends(get_current_user)):
    p = SIM_PAYLOADS.get(body.type)
    if not p:
        raise HTTPException(status_code=400, detail=f"Unknown simulation type: {body.type}")
    ip = body.spoof_ip or p.get("ip") or client_ip(request)
    # Reset limiter for clean isolated demo runs
    limiter.unblock(ip)
    headers = {"user-agent": f"SentinelShield-SimAgent/{body.type}"}
    res = await record_event(ip, p["method"], p["path"], p["query"], headers, p["body"], source="simulator", fingerprint=request.headers.get("X-Device-Fingerprint", "unknown"))
    return {"simulated": body.type, "payload": p, "result": res}


@api.post("/simulate/burst")
async def simulate_burst(request: Request, user: dict = Depends(get_current_user)):
    """Fire 15 requests rapidly from a single spoofed IP to trigger rate limiting."""
    spoof = "203.0.113.222"
    limiter.unblock(spoof)  # reset for clean demo
    await db.ip_reputation.delete_one({"ip": spoof})  # reset persistent rep
    results = []
    headers = {"user-agent": "SentinelShield-BurstAgent"}
    for i in range(15):
        r = await record_event(spoof, "GET", "/api/v1/data", f"i={i}", headers, "", source="simulator", fingerprint=request.headers.get("X-Device-Fingerprint", "unknown"))
        reason = r.get("reason") or ("rate_limited" if r.get("ip_status") == "temp_banned" and r.get("blocked") else None)
        results.append({"i": i, "blocked": r.get("blocked"), "reason": reason})
    return {"simulated": "burst", "spoof_ip": spoof, "results": results}


# =========================================================
# Stats / Logs / Rules / IPs
# =========================================================
@api.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    total = await db.events.count_documents({})
    blocked = await db.events.count_documents({"action": "blocked"})
    allowed = await db.events.count_documents({"action": "allowed"})
    critical = await db.events.count_documents({"severity": "critical"})
    high = await db.events.count_documents({"severity": "high"})

    # category breakdown
    pipeline_cat = [{"$group": {"_id": "$category", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}}]
    categories = [{"category": d["_id"] or "Unknown", "count": d["count"]}
                  async for d in db.events.aggregate(pipeline_cat)]

    # severity breakdown
    pipeline_sev = [{"$group": {"_id": "$severity", "count": {"$sum": 1}}}]
    severities = [{"severity": d["_id"] or "none", "count": d["count"]}
                  async for d in db.events.aggregate(pipeline_sev)]

    # top IPs (blocked only)
    pipeline_ip = [{"$match": {"action": "blocked"}},
                   {"$group": {"_id": "$ip", "count": {"$sum": 1}, "score": {"$sum": "$score"}}},
                   {"$sort": {"count": -1}}, {"$limit": 8}]
    top_ips = [{"ip": d["_id"], "count": d["count"], "score": d["score"]}
               async for d in db.events.aggregate(pipeline_ip)]

    # 24h trend (hourly buckets)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    pipeline_trend = [
        {"$match": {"timestamp": {"$gte": cutoff}}},
        {"$group": {"_id": {"$substr": ["$timestamp", 0, 13]},
                    "blocked": {"$sum": {"$cond": [{"$eq": ["$action", "blocked"]}, 1, 0]}},
                    "allowed": {"$sum": {"$cond": [{"$eq": ["$action", "allowed"]}, 1, 0]}}}},
        {"$sort": {"_id": 1}},
    ]
    trend = [{"hour": d["_id"], "blocked": d["blocked"], "allowed": d["allowed"]}
             async for d in db.events.aggregate(pipeline_trend)]

    return {
        "total": total, "blocked": blocked, "allowed": allowed,
        "active_threats": critical + high,
        "critical": critical, "high": high,
        "categories": categories, "severities": severities,
        "top_ips": top_ips, "trend": trend,
        "rules_count": len(list_rules()),
        "banned_count": await db.ip_reputation.count_documents({"status": {"$in": ["temp_banned", "blacklisted"]}}),
    }


@api.get("/logs")
async def logs(limit: int = 100, action: Optional[str] = None,
               category: Optional[str] = None, severity: Optional[str] = None,
               user: dict = Depends(get_current_user)):
    q = {}
    if action: q["action"] = action
    if category: q["category"] = category
    if severity: q["severity"] = severity
    cursor = db.events.find(q, {"_id": 0}).sort("timestamp", -1).limit(min(limit, 500))
    return [doc async for doc in cursor]


@api.get("/rules")
async def rules(user: dict = Depends(get_current_user)):
    return list_rules()


@api.get("/ip-reputation")
async def ip_rep(user: dict = Depends(get_current_user)):
    cursor = db.ip_reputation.find({}, {"_id": 0}).sort("score", -1).limit(100)
    return [doc async for doc in cursor]


class IpAction(BaseModel):
    ip: str


@api.post("/ip-reputation/unblock")
async def unblock_ip(body: IpAction, user: dict = Depends(get_current_user)):
    limiter.unblock(body.ip)
    await db.ip_reputation.update_one({"ip": body.ip},
                                      {"$set": {"status": "ok", "score": 0}})
    return {"ok": True, "ip": body.ip}


@api.post("/ip-reputation/blacklist")
async def blacklist_ip(body: IpAction, user: dict = Depends(get_current_user)):
    limiter.blacklist(body.ip)
    await db.ip_reputation.update_one({"ip": body.ip},
                                      {"$set": {"status": "blacklisted", "score": 100}},
                                      upsert=True)
    return {"ok": True, "ip": body.ip}


@api.get("/rate-limit/status")
async def rl_status(user: dict = Depends(get_current_user)):
    return limiter.status()


# =========================================================
# File Upload Validation (magic numbers)
# =========================================================
ALLOWED_MIME = {"image/png", "image/jpeg", "application/pdf"}


@api.post("/upload")
async def upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")
    detected = magic.from_buffer(data, mime=True)
    declared = file.content_type
    accepted = detected in ALLOWED_MIME
    record = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "declared_mime": declared,
        "detected_mime": detected,
        "size": len(data),
        "accepted": accepted,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.uploads.insert_one(record.copy())
    if not accepted:
        ev = write_event({
            "ip": "local", "method": "POST", "path": "/api/upload",
            "category": "Malicious Upload",
            "rule_id": "UPL_001", "severity": "high", "score": 10,
            "action": "blocked",
            "detail": f"declared={declared} detected={detected}",
            "source": "upload",
        })
        await db.events.insert_one({**ev, "id": str(uuid.uuid4())})
        return JSONResponse(status_code=415, content={**record, "reason": "Magic-number mismatch — file type rejected."})
    return record


@api.get("/uploads")
async def uploads(user: dict = Depends(get_current_user)):
    cursor = db.uploads.find({}, {"_id": 0}).sort("uploaded_at", -1).limit(50)
    return [doc async for doc in cursor]


# =========================================================
# Startup: seed admin + seed events + indexes
# =========================================================
@app.on_event("startup")
async def on_start():
    await db.users.create_index("email", unique=True)
    await db.events.create_index("timestamp")
    await db.events.create_index("ip")
    await db.ip_reputation.create_index("ip", unique=True)

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pwd = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_pwd),
            "name": "SOC Administrator",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_pwd, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_pwd)}})

    # seed events if empty
    if await db.events.count_documents({}) == 0:
        events = generate_events(200)
        for e in events:
            e["id"] = str(uuid.uuid4())
            ip = e["ip"]
            await db.ip_reputation.update_one(
                {"ip": ip},
                {"$set": {"ip": ip, "status": "ok",
                        "last_action": e["action"], "last_category": e["category"],
                        "updated_at": e["timestamp"]},
                "$inc": {"hits": 1, "score": e["score"] if e["action"] == "blocked" else 0}},
                upsert=True,
            )
        await db.events.insert_many(events)


@app.on_event("shutdown")
async def on_stop():
    client.close()


# =========================================================
# Include router + CORS
# =========================================================
app.include_router(api)

_cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False if _cors_origins == ["*"] else True,
    allow_origins=_cors_origins,
    allow_origin_regex=".*" if _cors_origins == ["*"] else None,
    allow_methods=["*"],
    allow_headers=["*"],
)
