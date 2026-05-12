"""Isolation-Forest based anomaly detector for HTTP requests."""
import numpy as np
from sklearn.ensemble import IsolationForest
from threading import Lock


def featurize(method: str, path: str, query: str, body: str) -> list:
    payload = f"{path} {query} {body}"
    length = len(payload)
    special_chars = sum(1 for c in payload if c in "<>'\";|&$`()")
    digit_ratio = sum(1 for c in payload if c.isdigit()) / (length + 1)
    param_count = payload.count("=")
    upper_ratio = sum(1 for c in payload if c.isupper()) / (length + 1)
    return [length, special_chars, digit_ratio, param_count, upper_ratio]


class AnomalyDetector:
    def __init__(self):
        self._model = IsolationForest(contamination=0.02, random_state=42, n_estimators=80)
        self._trained = False
        self._lock = Lock()
        self._train_baseline()

    def _train_baseline(self):
        """Train on a baseline of typical benign request features."""
        rng = np.random.RandomState(7)
        # benign baseline: short paths, few special chars
        normal = []
        for _ in range(400):
            length = rng.randint(5, 60)
            specials = rng.randint(0, 3)
            digit_ratio = rng.uniform(0, 0.2)
            params = rng.randint(0, 4)
            upper = rng.uniform(0, 0.1)
            normal.append([length, specials, digit_ratio, params, upper])
        X = np.array(normal)
        with self._lock:
            self._model.fit(X)
            self._trained = True

    def score(self, features: list) -> dict:
        with self._lock:
            if not self._trained:
                return {"anomaly": False, "score": 0.0}
            arr = np.array(features).reshape(1, -1)
            pred = int(self._model.predict(arr)[0])  # -1 anomaly, 1 normal
            raw = float(self._model.decision_function(arr)[0])
        return {"anomaly": pred == -1, "score": round(raw, 4)}


anomaly_detector = AnomalyDetector()
