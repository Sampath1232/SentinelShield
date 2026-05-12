"""Sliding-window per-IP rate limiter with temporary bans."""
import time
from collections import defaultdict, deque
from threading import Lock
from typing import Tuple

WINDOW_SECONDS = 10
MAX_REQUESTS = 10
TEMP_BAN_SECONDS = 60


class RateLimiter:
    def __init__(self):
        self._hits = defaultdict(deque)
        self._bans: dict[str, float] = {}
        self._permanent: set[str] = set()
        self._lock = Lock()

    def check(self, ip: str) -> Tuple[bool, str]:
        """Return (allowed, reason)."""
        now = time.time()
        with self._lock:
            if ip in self._permanent:
                return False, "permanent_blacklist"

            ban_until = self._bans.get(ip)
            if ban_until:
                if now < ban_until:
                    return False, "temp_banned"
                self._bans.pop(ip, None)

            dq = self._hits[ip]
            while dq and now - dq[0] > WINDOW_SECONDS:
                dq.popleft()
            dq.append(now)

            if len(dq) > MAX_REQUESTS:
                self._bans[ip] = now + TEMP_BAN_SECONDS
                return False, "rate_limited"
        return True, "ok"

    def ban_temp(self, ip: str, seconds: int = TEMP_BAN_SECONDS):
        with self._lock:
            self._bans[ip] = time.time() + seconds

    def blacklist(self, ip: str):
        with self._lock:
            self._permanent.add(ip)

    def unblock(self, ip: str):
        with self._lock:
            self._permanent.discard(ip)
            self._bans.pop(ip, None)
            self._hits.pop(ip, None)

    def status(self):
        now = time.time()
        with self._lock:
            return {
                "permanent": sorted(self._permanent),
                "temp_banned": {ip: max(0, int(t - now)) for ip, t in self._bans.items() if t > now},
            }


limiter = RateLimiter()
