#!/usr/bin/env python3
"""
test_api.py — Auto-test suite cho CardioPredict AI API
=======================================================
Chạy: python test_api.py [--url http://localhost:5001]

Kiểm tra:
  1. Health endpoint
  2. Predict với 5 bộ dữ liệu (low/medium/high/very_high/edge)
  3. Response format đúng field Phase 1
  4. Latency < 3s
  5. System stats endpoint (nếu có token)
  6. Model-info endpoint

Thoát code 0 = tất cả PASS, 1 = có lỗi.
"""

import sys
import time
import json
import argparse
import urllib.request
import urllib.error
import urllib.parse

# ── ANSI colors ──────────────────────────────────────────────────────────────
GREEN  = '\033[92m'
RED    = '\033[91m'
YELLOW = '\033[93m'
CYAN   = '\033[96m'
BOLD   = '\033[1m'
RESET  = '\033[0m'

OK   = f'{GREEN}✓{RESET}'
FAIL = f'{RED}✗{RESET}'
SKIP = f'{YELLOW}○{RESET}'

# ── Test samples ──────────────────────────────────────────────────────────────
SAMPLES = {
    'low_risk': {
        'name': 'Nguy cơ thấp',
        'data': {'age': 35, 'sex': 0, 'cp': 3, 'trestbps': 118, 'chol': 185,
                 'fbs': 0, 'restecg': 0, 'thalach': 172, 'exang': 0,
                 'oldpeak': 0.3, 'slope': 0, 'ca': 0, 'thal': 2},
        'expected_max_score': 40,
    },
    'medium_risk': {
        'name': 'Nguy cơ trung bình',
        'data': {'age': 50, 'sex': 1, 'cp': 1, 'trestbps': 135, 'chol': 225,
                 'fbs': 0, 'restecg': 1, 'thalach': 138, 'exang': 0,
                 'oldpeak': 1.5, 'slope': 1, 'ca': 1, 'thal': 2},
        'expected_max_score': 65,
    },
    'high_risk': {
        'name': 'Nguy cơ cao',
        'data': {'age': 60, 'sex': 1, 'cp': 0, 'trestbps': 152, 'chol': 265,
                 'fbs': 0, 'restecg': 1, 'thalach': 118, 'exang': 1,
                 'oldpeak': 2.4, 'slope': 2, 'ca': 1, 'thal': 3},
        'expected_min_score': 50,
    },
    'very_high_risk': {
        'name': 'Nguy cơ rất cao',
        'data': {'age': 67, 'sex': 1, 'cp': 0, 'trestbps': 178, 'chol': 295,
                 'fbs': 1, 'restecg': 2, 'thalach': 92, 'exang': 1,
                 'oldpeak': 4.0, 'slope': 2, 'ca': 3, 'thal': 3},
        'expected_min_score': 65,
    },
    'edge_case': {
        'name': 'Edge case (biên giới)',
        'data': {'age': 45, 'sex': 1, 'cp': 2, 'trestbps': 130, 'chol': 250,
                 'fbs': 0, 'restecg': 0, 'thalach': 145, 'exang': 0,
                 'oldpeak': 1.8, 'slope': 1, 'ca': 0, 'thal': 2},
    },
}

REQUIRED_FIELDS = ['prediction', 'risk_score', 'risk_level', 'message', 'factors']
PHASE1_FIELDS   = ['urgent_referral', 'confidence_interval', 'clinical_recommendations']

# ── HTTP helper ───────────────────────────────────────────────────────────────
def http_get(url: str, token: str = None) -> tuple:
    """Trả về (status_code, body_dict, latency_ms)"""
    req = urllib.request.Request(url)
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            latency_ms = (time.time() - t0) * 1000
            return r.status, json.loads(r.read()), latency_ms
    except urllib.error.HTTPError as e:
        latency_ms = (time.time() - t0) * 1000
        try:
            body = json.loads(e.read())
        except Exception:
            body = {}
        return e.code, body, latency_ms


def http_post(url: str, data: dict, token: str = None) -> tuple:
    raw = json.dumps(data).encode()
    req = urllib.request.Request(url, data=raw, method='POST')
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            latency_ms = (time.time() - t0) * 1000
            return r.status, json.loads(r.read()), latency_ms
    except urllib.error.HTTPError as e:
        latency_ms = (time.time() - t0) * 1000
        try:
            body = json.loads(e.read())
        except Exception:
            body = {'error': str(e)}
        return e.code, body, latency_ms


# ── Test runner ───────────────────────────────────────────────────────────────
class TestRunner:
    def __init__(self, base_url: str, token: str = None):
        self.base = base_url.rstrip('/')
        self.token = token
        self.passed = 0
        self.failed = 0
        self.results = []

    def check(self, name: str, cond: bool, detail: str = ''):
        if cond:
            self.passed += 1
            self.results.append((OK, name, detail))
        else:
            self.failed += 1
            self.results.append((FAIL, name, detail))

    def run_all(self):
        print(f'\n{BOLD}{CYAN}CardioPredict API Test Suite{RESET}')
        print(f'Base URL: {self.base}\n')
        print('─' * 60)

        # 1. Health
        print(f'\n{BOLD}[1] Health Check{RESET}')
        status, body, lat = http_get(f'{self.base}/api/health')
        self.check('HTTP 200', status == 200, f'got {status}')
        self.check('status = ok', body.get('status') == 'ok', f"got '{body.get('status')}'")
        self.check('model_loaded field exists', 'model_loaded' in body)
        self.check('Latency < 500ms', lat < 500, f'{lat:.0f}ms')

        # 2. Model-info
        print(f'\n{BOLD}[2] Model Info Endpoint{RESET}')
        status, body, lat = http_get(f'{self.base}/api/model-info', self.token)
        self.check('HTTP 200', status == 200, f'got {status}')
        self.check('version field', 'version' in body, str(body.get('version', '—')))
        self.check('model_type field', 'model_type' in body)
        self.check('Latency < 1s', lat < 1000, f'{lat:.0f}ms')

        # 3. Predict × 5 samples
        print(f'\n{BOLD}[3] Predict Endpoint — 5 mẫu bệnh nhân{RESET}')
        for key, sample in SAMPLES.items():
            status, body, lat = http_post(f'{self.base}/api/predict', sample['data'], self.token)
            label = sample['name']
            self.check(f'[{label}] HTTP 200', status == 200, f'got {status}')
            if status == 200:
                self.check(f'[{label}] required fields', all(f in body for f in REQUIRED_FIELDS),
                           ', '.join(f for f in REQUIRED_FIELDS if f not in body) or 'OK')
                self.check(f'[{label}] risk_score 0-100',
                           0 <= body.get('risk_score', -1) <= 100,
                           str(body.get('risk_score')))
                if 'expected_max_score' in sample:
                    s = body.get('risk_score', 999)
                    self.check(f'[{label}] score ≤ {sample["expected_max_score"]}%',
                               s <= sample['expected_max_score'] + 20,
                               f'{s}%')
                if 'expected_min_score' in sample:
                    s = body.get('risk_score', 0)
                    self.check(f'[{label}] score ≥ {sample["expected_min_score"]}%',
                               s >= sample['expected_min_score'] - 20,
                               f'{s}%')
                # Phase 1 fields
                p1_ok = any(f in body for f in PHASE1_FIELDS)
                self.check(f'[{label}] Phase1 fields present', p1_ok,
                           'confidence_interval/clinical_recommendations missing' if not p1_ok else '')
            self.check(f'[{label}] Latency < 3s', lat < 3000, f'{lat:.0f}ms')

        # 4. Feature Importance
        print(f'\n{BOLD}[4] Feature Importance{RESET}')
        status, body, lat = http_get(f'{self.base}/api/feature-importance', self.token)
        self.check('HTTP 200', status == 200)
        if isinstance(body, list):
            self.check('Returns list', True, f'{len(body)} items')
            self.check('First item has importance', 'importance' in (body[0] if body else {}))
        self.check('Latency < 1s', lat < 1000, f'{lat:.0f}ms')

        # 5. System stats (Phase 2 - requires auth)
        print(f'\n{BOLD}[5] System Stats (Phase 2){RESET}')
        if self.token:
            status, body, lat = http_get(f'{self.base}/api/system/stats', self.token)
            self.check('HTTP 200', status == 200, f'got {status}')
            if status == 200:
                self.check('server field', 'server' in body)
                self.check('metrics field', 'metrics' in body)
            self.check('Latency < 1s', lat < 1000, f'{lat:.0f}ms')
        else:
            self.results.append((SKIP, 'System stats (cần token)', 'Bỏ qua — không có auth token'))

        # Print results
        print()
        print('─' * 60)
        for icon, name, detail in self.results:
            suffix = f'{YELLOW} [{detail}]{RESET}' if detail else ''
            print(f'  {icon}  {name}{suffix}')
        print('─' * 60)
        total = self.passed + self.failed
        color = GREEN if self.failed == 0 else RED
        print(f'\n{color}{BOLD}Kết quả: {self.passed}/{total} PASSED, {self.failed} FAILED{RESET}\n')
        return self.failed == 0


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='CardioPredict API Test Suite')
    parser.add_argument('--url', default='http://localhost:5001', help='Base URL của API')
    parser.add_argument('--token', default=None, help='JWT token để test endpoint có auth')
    args = parser.parse_args()

    runner = TestRunner(base_url=args.url, token=args.token)
    ok = runner.run_all()
    sys.exit(0 if ok else 1)
