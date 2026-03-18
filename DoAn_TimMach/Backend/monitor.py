"""
monitor.py — Module giám sát vận hành hệ thống CardioPredict AI
===============================================================
Thread-safe, in-memory metrics với rolling window.
Import trong api.py qua: from monitor import metrics
"""

import threading
import time
import math
from collections import deque
from datetime import datetime, timezone


class RequestMetrics:
    """
    Singleton thread-safe để ghi nhận và truy vấn metrics request.
    Lưu tối đa WINDOW_SIZE bản ghi gần nhất (rolling window).
    """
    WINDOW_SIZE = 1000

    def __init__(self):
        self._lock = threading.Lock()
        self._records: deque = deque(maxlen=self.WINDOW_SIZE)
        self._start_time = time.time()
        self._total_requests = 0
        self._total_errors = 0
        self._predict_count_today = 0
        self._last_date = datetime.now().date()

    # ── Ghi nhận ────────────────────────────────────────────────────────────
    def record(self, endpoint: str, latency_ms: float, status_code: int,
               user_id=None, method: str = 'GET'):
        """Ghi một request vào rolling window."""
        with self._lock:
            now = datetime.now()
            # Reset daily counter nếu sang ngày mới
            if now.date() != self._last_date:
                self._predict_count_today = 0
                self._last_date = now.date()

            entry = {
                'ts': time.time(),
                'endpoint': endpoint,
                'latency_ms': latency_ms,
                'status_code': status_code,
                'user_id': user_id,
                'method': method,
                'is_error': status_code >= 400,
            }
            self._records.append(entry)
            self._total_requests += 1
            if status_code >= 400:
                self._total_errors += 1
            if '/predict' in endpoint and status_code < 400:
                self._predict_count_today += 1

    # ── Thống kê ────────────────────────────────────────────────────────────
    def get_summary(self) -> dict:
        """
        Trả về dict thống kê hiện tại:
        - total_requests, total_errors, error_rate
        - p50, p95, p99 latency (ms)
        - requests_per_min (window 5 phút gần nhất)
        - predict_count_today
        - uptime_seconds
        """
        with self._lock:
            records = list(self._records)

        uptime = time.time() - self._start_time

        if not records:
            return {
                'total_requests': self._total_requests,
                'total_errors': self._total_errors,
                'error_rate': 0.0,
                'p50_latency_ms': 0,
                'p95_latency_ms': 0,
                'p99_latency_ms': 0,
                'requests_per_min': 0.0,
                'predict_count_today': self._predict_count_today,
                'uptime_seconds': round(uptime),
            }

        latencies = sorted(r['latency_ms'] for r in records)
        n = len(latencies)

        def percentile(data, p):
            idx = max(0, math.ceil(p / 100 * len(data)) - 1)
            return round(data[idx], 1)

        # Requests trong 5 phút gần nhất
        cutoff = time.time() - 300
        recent = [r for r in records if r['ts'] >= cutoff]
        rpm = len(recent) / 5.0

        error_count = sum(1 for r in records if r['is_error'])
        error_rate = error_count / n if n > 0 else 0.0

        return {
            'total_requests': self._total_requests,
            'total_errors': self._total_errors,
            'error_rate': round(error_rate * 100, 2),
            'p50_latency_ms': percentile(latencies, 50),
            'p95_latency_ms': percentile(latencies, 95),
            'p99_latency_ms': percentile(latencies, 99),
            'requests_per_min': round(rpm, 1),
            'predict_count_today': self._predict_count_today,
            'uptime_seconds': round(uptime),
        }

    def get_endpoint_breakdown(self) -> list:
        """Thống kê số request và latency trung bình theo endpoint."""
        with self._lock:
            records = list(self._records)

        from collections import defaultdict
        bucket = defaultdict(list)
        for r in records:
            bucket[r['endpoint']].append(r['latency_ms'])

        result = []
        for ep, lats in sorted(bucket.items(), key=lambda x: -len(x[1])):
            result.append({
                'endpoint': ep,
                'count': len(lats),
                'avg_latency_ms': round(sum(lats) / len(lats), 1),
            })
        return result[:10]  # Top 10


def compute_drift_signal(diagnoses: list) -> dict:
    """
    Phân tích phân phối risk_score trong 7 ngày để phát hiện drift.

    So sánh:
    - Baseline: tất cả chẩn đoán có (dùng mẫu tĩnh nếu < 20 bản ghi)
    - Window 7 ngày gần nhất

    Returns:
        drift_detected: bool
        drift_score: float (z-score absolute)
        baseline_mean: float
        window_mean: float
        message: str
    """
    BASELINE_MEAN = 47.5   # Baseline mean risk_score từ training data
    BASELINE_STD  = 22.0   # Baseline std dev

    if not diagnoses:
        return {
            'drift_detected': False,
            'drift_score': 0.0,
            'baseline_mean': BASELINE_MEAN,
            'window_mean': None,
            'window_count': 0,
            'message': 'Chưa đủ dữ liệu để phân tích drift.',
        }

    # Lấy risk_score từ danh sách
    scores = []
    for d in diagnoses:
        if isinstance(d, dict):
            v = d.get('risk_score') or d.get('riskScore')
        else:
            v = getattr(d, 'risk_score', None)
        if v is not None:
            try:
                scores.append(float(v))
            except (ValueError, TypeError):
                pass

    if len(scores) < 5:
        return {
            'drift_detected': False,
            'drift_score': 0.0,
            'baseline_mean': BASELINE_MEAN,
            'window_mean': None,
            'window_count': len(scores),
            'message': f'Cần ≥ 5 bản ghi để phân tích drift (hiện có {len(scores)}).',
        }

    window_mean = sum(scores) / len(scores)
    # Welch's one-sample z-score
    z = abs(window_mean - BASELINE_MEAN) / BASELINE_STD
    drift_detected = z > 1.5   # Ngưỡng cảnh báo

    if drift_detected:
        direction = 'cao hơn' if window_mean > BASELINE_MEAN else 'thấp hơn'
        msg = (f'⚠️ Phát hiện drift: mean nguy cơ 7 ngày = {window_mean:.1f}% '
               f'({direction} baseline {BASELINE_MEAN:.1f}%, z={z:.2f}).')
    else:
        msg = f'✅ Phân phối nguy cơ bình thường (mean = {window_mean:.1f}%, z = {z:.2f}).'

    return {
        'drift_detected': drift_detected,
        'drift_score': round(z, 3),
        'baseline_mean': BASELINE_MEAN,
        'window_mean': round(window_mean, 2),
        'window_count': len(scores),
        'message': msg,
    }


def format_uptime(seconds: float) -> str:
    """Chuyển số giây thành chuỗi đọc được (vd: '2d 3h 15m')."""
    seconds = int(seconds)
    days, rem = divmod(seconds, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, _ = divmod(rem, 60)
    parts = []
    if days:
        parts.append(f'{days}d')
    if hours:
        parts.append(f'{hours}h')
    parts.append(f'{minutes}m')
    return ' '.join(parts) or '< 1m'


# ── Singleton export ─────────────────────────────────────────────────────────
metrics = RequestMetrics()
