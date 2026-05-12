"""JSON structured security logger - writes to logs/security.log."""
import json
from pathlib import Path
from datetime import datetime, timezone
from threading import Lock

LOG_PATH = Path(__file__).parent / "logs" / "security.log"
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
_lock = Lock()


def write_event(event: dict) -> dict:
    event = {**event}
    event.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
    line = json.dumps(event, ensure_ascii=False)
    with _lock:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    return event
