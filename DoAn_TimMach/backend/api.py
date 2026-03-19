"""
API Backend cho ứng dụng dự đoán bệnh tim
Flask REST API để kết nối với Frontend React
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from waitress import serve
import joblib
import pandas as pd
import numpy as np
import os
import re
import hmac
import hashlib
import time
import json
import base64
from datetime import datetime

import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from models.user import User, Diagnosis, AuditLog, init_db, get_db_connection_info
from monitor import metrics, compute_drift_signal, format_uptime

app = Flask(__name__)
# Cho phép tất cả origins trong development
CORS(app, resources={r"/api/*": {"origins": "*", "allow_headers": ["Content-Type", "Authorization"]}})

# Secret key cho JWT token
SECRET_KEY = os.environ.get('SECRET_KEY', 'daivid-ai-heart-prediction-secret-key-2026')

# Google OAuth Client ID
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '846476775267-2gr4guet00orj34qinocja7po11aac3r.apps.googleusercontent.com')

AUTH_DB_BOOT_STATUS = {
    'connected': False,
    'mode': 'mssql',
    'error': 'Chưa kiểm tra kết nối CSDL'
}


def refresh_auth_db_status():
    """Đọc thông tin DB auth đang dùng để đảm bảo luôn trỏ đúng SQL Server."""
    global AUTH_DB_BOOT_STATUS
    try:
        info = get_db_connection_info()
        AUTH_DB_BOOT_STATUS = {
            'connected': True,
            **info
        }
    except Exception as e:
        AUTH_DB_BOOT_STATUS = {
            'connected': False,
            'mode': 'mssql',
            'error': str(e)
        }


# Khởi tạo database và kiểm tra DB auth ngay khi start
init_db()
refresh_auth_db_status()

# Continuous feature indices (age, trestbps, chol, thalach, oldpeak)
_CONT_IDX = [0, 3, 4, 7, 9]
_FEATURES  = ['age','sex','cp','trestbps','chol','fbs',
              'restecg','thalach','exang','oldpeak','slope','ca','thal']

# Load mô hình
def load_model():
    """Load model bundle (v2.0: dict with model + scaler) or legacy model."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    env_model_path = os.environ.get('MODEL_PATH', '').strip()
    candidate_paths = [
        env_model_path,
        os.path.abspath(os.path.join(base_dir, 'model.pkl')),
        os.path.abspath(os.path.join(base_dir, 'models', 'heart_model.pkl')),
    ]

    seen = set()
    for model_path in candidate_paths:
        if not model_path:
            continue
        model_path = os.path.abspath(model_path)
        if model_path in seen:
            continue
        seen.add(model_path)

        if not os.path.exists(model_path):
            continue
        try:
            obj = joblib.load(model_path)
            # New format: dict bundle
            if isinstance(obj, dict) and 'model' in obj:
                return obj  # {'model', 'scaler', 'feature_names', 'cont_idx', 'version'}
            # Legacy: raw sklearn/xgboost model
            return {
                'model': obj,
                'scaler': None,
                'feature_names': _FEATURES,
                'cont_idx': _CONT_IDX,
            }
        except Exception:
            continue
    return None

def _apply_preprocessing(bundle: dict, input_data: dict) -> np.ndarray:
    """Convert dict input → scaled numpy array matching training pipeline."""
    features = bundle.get('feature_names', _FEATURES)
    cont_idx = bundle.get('cont_idx', _CONT_IDX)
    scaler   = bundle.get('scaler')

    row = np.array([[input_data[f] for f in features]], dtype=float)
    if scaler is not None:
        row[:, cont_idx] = scaler.transform(row[:, cont_idx])
    return row


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def derive_ecg_metrics(input_data: dict, risk_score: float, prediction: int) -> dict:
    """
    Suy diễn bộ thông số ECG từ dữ liệu lâm sàng + kết quả chẩn đoán.
    Lưu ý: đây không phải waveform đo trực tiếp từ máy ECG,
    mà là chỉ số được ước lượng theo hồ sơ bệnh nhân.
    """
    age = float(input_data['age'])
    sex = int(input_data['sex'])
    restecg = int(input_data['restecg'])
    exang = int(input_data['exang'])
    oldpeak = float(input_data['oldpeak'])
    ca = int(input_data['ca'])
    thalach = float(input_data['thalach'])
    fbs = int(input_data['fbs'])

    # Ước lượng nhịp tim hiện tại từ nhịp tim gắng sức + yếu tố nguy cơ
    predicted_max_hr = max(120.0, 220.0 - age)
    effort_ratio = _clamp(thalach / predicted_max_hr, 0.35, 1.20)
    resting_hr_est = (
        67.0
        + (1.0 - effort_ratio) * 22.0
        + oldpeak * 2.2
        + (7.0 if exang == 1 else 0.0)
        + (5.0 if risk_score >= 70 else 0.0)
        + (2.0 if fbs == 1 else 0.0)
    )
    heart_rate = int(round(_clamp(resting_hr_est, 48.0, 145.0)))

    rr_ms = 60000.0 / max(heart_rate, 1)
    rr_sqrt = np.sqrt(rr_ms / 1000.0)

    # PR kéo dài hơn ở nhóm lớn tuổi / nguy cơ cao / thiếu máu cơ tim gắng sức
    pr_ms = 150.0 + age * 0.28 + oldpeak * 4.5 + (7.0 if exang == 1 else 0.0) + (5.0 if restecg in (1, 2) else 0.0)
    pr_ms += 4.0 if risk_score >= 70 else 0.0
    pr_ms = int(round(_clamp(pr_ms, 110.0, 240.0)))

    # QRS chịu ảnh hưởng bởi bất thường ECG nghỉ và mức độ tổn thương mạch
    qrs_ms = 88.0 + (9.0 if restecg in (1, 2) else 0.0) + ca * 4.0 + (6.0 if prediction == 1 else 0.0)
    qrs_ms += 3.0 if oldpeak >= 2.0 else 0.0
    qrs_ms = int(round(_clamp(qrs_ms, 75.0, 160.0)))

    # QT/QTc: dùng công thức Bazett để giữ tính sinh lý theo nhịp tim
    qtc_ms = 408.0 + age * 0.35 + oldpeak * 4.0 + (9.0 if restecg in (1, 2) else 0.0)
    qtc_ms += (8.0 if sex == 0 else 0.0) + (risk_score - 50.0) * 0.18
    qtc_ms = _clamp(qtc_ms, 370.0, 520.0)

    qt_ms = int(round(_clamp(qtc_ms * rr_sqrt, 320.0, 520.0)))
    qtc_ms = int(round(_clamp(qt_ms / max(rr_sqrt, 1e-6), 360.0, 540.0)))

    return {
        'recorded_at': datetime.now().strftime('%d/%m/%Y %H:%M'),
        'lead': 'Lead II',
        'source': 'derived_from_clinical_inputs',
        'heart_rate_bpm': heart_rate,
        'pr_ms': pr_ms,
        'qrs_ms': qrs_ms,
        'qt_ms': qt_ms,
        'qtc_ms': qtc_ms,
        'rr_interval_ms': int(round(rr_ms)),
    }

# Khởi tạo model khi start server
bundle = load_model()
# Keep backward-compat alias
model = bundle['model'] if bundle else None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_BUILD_DIR = os.path.join(BASE_DIR, '..', 'Fontend', 'build')
FRONTEND_INDEX_FILE = os.path.join(FRONTEND_BUILD_DIR, 'index.html')


def _frontend_build_available() -> bool:
    return os.path.exists(FRONTEND_INDEX_FILE)


def _api_metadata():
    return {
        'name': 'Heart Disease Prediction API',
        'version': bundle.get('version', '1.0') if bundle else '1.0',
        'status': 'running',
        'model_loaded': model is not None,
        'model_type': type(model).__name__ if model else None,
        'frontend_served': _frontend_build_available(),
        'endpoints': {
            'health': '/api/health',
            'predict': '/api/predict (POST)',
            'feature_importance': '/api/feature-importance'
        }
    }


def _serve_frontend(path: str = ''):
    if not _frontend_build_available():
        return jsonify(_api_metadata())

    if path:
        requested_path = os.path.join(FRONTEND_BUILD_DIR, path)
        if os.path.isfile(requested_path):
            return send_from_directory(FRONTEND_BUILD_DIR, path)

    return send_from_directory(FRONTEND_BUILD_DIR, 'index.html')

@app.before_request
def _before():
    """Ghi thời điểm bắt đầu request."""
    import time as _time
    request._start_ts = _time.time()


@app.after_request
def _after(response):
    """Ghi metrics + audit log sau mỗi request."""
    import time as _time
    latency_ms = round((_time.time() - getattr(request, '_start_ts', _time.time())) * 1000, 1)
    endpoint = request.path
    status = response.status_code
    method = request.method
    user_id = None
    try:
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            payload = verify_token(auth[7:])
            if payload:
                user_id = payload.get('user_id')
    except Exception:
        pass

    # Ghi in-memory metrics (luôn)
    metrics.record(endpoint, latency_ms, status, user_id=user_id, method=method)

    # Ghi DB audit chỉ với predict và auth endpoints (không ghi /api/health để tránh spam)
    important_endpoints = ('/api/predict', '/api/auth/', '/api/system/')
    if any(endpoint.startswith(ep) for ep in important_endpoints):
        action = 'predict' if '/predict' in endpoint else 'auth' if '/auth' in endpoint else 'system'
        ip = request.headers.get('X-Forwarded-For', request.remote_addr or '')
        AuditLog.create(
            user_id=user_id, action=action, endpoint=endpoint,
            ip_address=ip, latency_ms=latency_ms,
            http_status=status,
            detail=f'{method} {status}'
        )
    return response


@app.route('/api', methods=['GET'])
def api_home():
    """Thông tin API cho môi trường dev/deploy."""
    return jsonify(_api_metadata())


@app.route('/', methods=['GET'])
def home():
    """Trang chủ: ưu tiên phục vụ frontend build nếu có."""
    return _serve_frontend()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Kiểm tra trạng thái server"""
    refresh_auth_db_status()
    overall_status = 'healthy' if AUTH_DB_BOOT_STATUS.get('connected') else 'degraded'
    return jsonify({
        'status': overall_status,
        'model_loaded': model is not None,
        'auth_database': AUTH_DB_BOOT_STATUS
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Dự đoán nguy cơ bệnh tim
    
    Input JSON:
    {
        "age": 45,
        "sex": 1,
        "cp": 0,
        "trestbps": 120,
        "chol": 200,
        "fbs": 0,
        "restecg": 0,
        "thalach": 150,
        "exang": 0,
        "oldpeak": 1.0,
        "slope": 1,
        "ca": 0,
        "thal": 2
    }
    """
    try:
        user_id = _get_user_id_from_request()
        if not user_id:
            return jsonify({'error': 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'}), 401

        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Không có dữ liệu'}), 400
        
        # Validate required fields
        required_fields = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 
                          'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
        
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({'error': f'Thiếu trường: {", ".join(missing_fields)}'}), 400
        
        # Tạo DataFrame từ input
        input_data = {
            'age': float(data['age']),
            'sex': int(data['sex']),
            'cp': int(data['cp']),
            'trestbps': float(data['trestbps']),
            'chol': float(data['chol']),
            'fbs': int(data['fbs']),
            'restecg': int(data['restecg']),
            'thalach': float(data['thalach']),
            'exang': int(data['exang']),
            'oldpeak': float(data['oldpeak']),
            'slope': int(data['slope']),
            'ca': int(data['ca']),
            'thal': int(data['thal'])
        }
        
        input_df = pd.DataFrame([input_data])
        
        # ── No model → mock rule-based prediction ────────────────
        if model is None or bundle is None:
            risk_score = calculate_mock_risk(input_data)
            risk_level = get_risk_level(risk_score)
            prediction_val = 1 if risk_score > 50 else 0
            ecg_metrics = derive_ecg_metrics(input_data, risk_score, prediction_val)
            urgent_referral = risk_score >= 70
            increase_factors, protective_factors = analyze_shap_factors(input_data, risk_score)
            recommendations = get_clinical_recommendations(risk_level, risk_score, urgent_referral)
            Diagnosis.create(user_id, input_data, prediction_val, risk_score, risk_level)
            return jsonify({
                'prediction': prediction_val,
                'risk_score': risk_score,
                'risk_level': risk_level,
                'message': 'Dự đoán dựa trên quy tắc (model chưa được train)',
                'factors': analyze_risk_factors(input_data),
                'urgent_referral': urgent_referral,
                'confidence_interval': {'lower': max(0, risk_score - 10), 'upper': min(100, risk_score + 10)},
                'uncertainty_score': compute_uncertainty(risk_score),
                'increase_factors': increase_factors,
                'protective_factors': protective_factors,
                'clinical_recommendations': recommendations,
                'ecg_metrics': ecg_metrics,
                'model_info': {'version': 'rule-based', 'model_type': 'RuleBased',
                               'training_date': 'N/A', 'accuracy': None, 'n_features': 13,
                               'description': 'Dự đoán dựa trên quy tắc lâm sàng'},
            })

        # ── AI model prediction (with scaler preprocessing) ───────
        X_input = _apply_preprocessing(bundle, input_data)

        # Probability (primary) — gives nuanced risk score
        try:
            proba = model.predict_proba(X_input)[0]
            risk_score = round(float(proba[1]) * 100, 1)
        except AttributeError:
            # Fallback for models without predict_proba
            risk_score = 75.0

        # Binary prediction
        prediction = int(model.predict(X_input)[0])
        risk_level = get_risk_level(risk_score)
        ecg_metrics = derive_ecg_metrics(input_data, risk_score, prediction)
        urgent_referral = risk_score >= 70  # Cảnh báo khẩn: cần chuyển khám ngay

        # Tính khoảng tin cậy và độ bất định
        ci = compute_confidence_interval(model, bundle, input_data, risk_score)
        uncertainty = compute_uncertainty(risk_score)

        # Phân tích yếu tố nguy cơ chi tiết theo từng bệnh nhân
        increase_factors, protective_factors = analyze_shap_factors(input_data, risk_score)

        # Khuyến nghị lâm sàng theo mức nguy cơ
        recommendations = get_clinical_recommendations(risk_level, risk_score, urgent_referral)

        Diagnosis.create(user_id, input_data, prediction, risk_score, risk_level)

        return jsonify({
            # ── Legacy fields (backward-compatible) ──
            'prediction': prediction,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'message': 'CÓ NGUY CƠ mắc bệnh tim' if prediction == 1 else 'KHÔNG CÓ nguy cơ mắc bệnh tim',
            'factors': analyze_risk_factors(input_data),
            # ── New clinical fields ──
            'urgent_referral': urgent_referral,
            'confidence_interval': ci,
            'uncertainty_score': uncertainty,
            'increase_factors': increase_factors,
            'protective_factors': protective_factors,
            'clinical_recommendations': recommendations,
            'ecg_metrics': ecg_metrics,
            'model_info': get_model_info(bundle),
        })
        
    except ValueError as e:
        return jsonify({'error': f'Lỗi dữ liệu: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500

def calculate_mock_risk(data):
    """
    Tính toán nguy cơ dựa trên quy tắc khi chưa có model
    """
    risk = 10  # Base risk
    
    # Tuổi
    if data['age'] > 60:
        risk += 20
    elif data['age'] > 50:
        risk += 15
    elif data['age'] > 40:
        risk += 10
    
    # Giới tính (nam có nguy cơ cao hơn)
    if data['sex'] == 1:
        risk += 10
    
    # Loại đau ngực (cp = 0 là không đau, nguy cơ thấp)
    if data['cp'] >= 2:
        risk += 15
    
    # Huyết áp cao
    if data['trestbps'] > 140:
        risk += 15
    elif data['trestbps'] > 120:
        risk += 5
    
    # Cholesterol cao
    if data['chol'] > 240:
        risk += 15
    elif data['chol'] > 200:
        risk += 10
    
    # Đường huyết lúc đói cao
    if data['fbs'] == 1:
        risk += 10
    
    # Nhịp tim tối đa thấp
    if data['thalach'] < 120:
        risk += 15
    elif data['thalach'] < 140:
        risk += 5
    
    # Đau thắt ngực khi tập
    if data['exang'] == 1:
        risk += 15
    
    # ST depression
    if data['oldpeak'] > 2:
        risk += 15
    elif data['oldpeak'] > 1:
        risk += 10
    
    # Số mạch máu chính bị tắc
    risk += data['ca'] * 10
    
    return min(risk, 95)  # Cap at 95%

def get_risk_level(score):
    """Xác định mức độ nguy cơ theo thang 4 mức chuẩn lâm sàng"""
    if score < 30:
        return 'low'
    elif score < 50:
        return 'medium'
    elif score < 70:
        return 'high'
    else:
        return 'very_high'


def compute_confidence_interval(model, bundle, input_data: dict, risk_score: float):
    """
    Ước tính khoảng tin cậy 95% bằng perturbation sampling.
    Thêm nhiễu nhỏ vào các chỉ số liên tục, chạy N lần dự đoán,
    lấy percentile 2.5 và 97.5.
    Nếu model không hỗ trợ predict_proba, dùng rule-based fallback.
    """
    N_SAMPLES = 40
    features = bundle.get('feature_names', _FEATURES)
    cont_idx = bundle.get('cont_idx', _CONT_IDX)
    cont_features = [features[i] for i in cont_idx]

    scores = []
    try:
        for _ in range(N_SAMPLES):
            perturbed = dict(input_data)
            for f in cont_features:
                val = perturbed[f]
                # Nhiễu ±5% cộng ±1 std nhỏ
                noise = np.random.normal(0, max(abs(val) * 0.05, 1.0))
                perturbed[f] = val + noise
            X = _apply_preprocessing(bundle, perturbed)
            p = float(model.predict_proba(X)[0][1]) * 100
            scores.append(p)
        lower = round(float(np.percentile(scores, 2.5)), 1)
        upper = round(float(np.percentile(scores, 97.5)), 1)
    except Exception:
        # Fallback: ±10% của risk_score
        margin = max(risk_score * 0.10, 5.0)
        lower = round(max(0.0, risk_score - margin), 1)
        upper = round(min(100.0, risk_score + margin), 1)

    return {'lower': lower, 'upper': upper}


def compute_uncertainty(risk_score: float) -> float:
    """
    Tính độ bất định: gần 50% → uncertainty cao (mô hình không chắc),
    gần 0% hoặc 100% → uncertainty thấp.
    Trả về giá trị 0–1.
    """
    # Entropy-inspired: -p*log(p) - (1-p)*log(1-p) normalized to [0,1]
    p = risk_score / 100.0
    p = max(1e-9, min(1 - 1e-9, p))
    entropy = -(p * np.log2(p) + (1 - p) * np.log2(1 - p))
    return round(float(entropy), 3)  # max = 1.0 khi p=0.5


def analyze_shap_factors(data: dict, risk_score: float):
    """
    Phân tích yếu tố nguy cơ theo từng bệnh nhân.
    Trả về hai danh sách:
      - increase_factors: yếu tố làm TĂNG nguy cơ
      - protective_factors: yếu tố GIẢM / bảo vệ
    Mỗi yếu tố có: name, value_display, direction, impact, description, weight
    """
    increase = []
    protective = []

    # ── Tuổi ──
    if data['age'] >= 65:
        increase.append({'name': 'Tuổi', 'value_display': f"{data['age']} tuổi",
            'impact': 'high', 'weight': 0.18,
            'description': 'Tuổi ≥ 65: nhóm nguy cơ cao nhất về bệnh tim mạch.'})
    elif data['age'] >= 55:
        increase.append({'name': 'Tuổi', 'value_display': f"{data['age']} tuổi",
            'impact': 'medium', 'weight': 0.12,
            'description': 'Tuổi 55–64: nguy cơ tăng đáng kể theo tuổi.'})
    else:
        protective.append({'name': 'Tuổi', 'value_display': f"{data['age']} tuổi",
            'impact': 'low', 'weight': 0.05,
            'description': f"Tuổi {data['age']}: chưa thuộc nhóm nguy cơ theo tuổi."})

    # ── Giới tính ──
    if data['sex'] == 1:
        increase.append({'name': 'Giới tính', 'value_display': 'Nam',
            'impact': 'medium', 'weight': 0.08,
            'description': 'Nam giới có nguy cơ mắc bệnh động mạch vành cao hơn nữ.'})
    else:
        protective.append({'name': 'Giới tính', 'value_display': 'Nữ',
            'impact': 'low', 'weight': 0.04,
            'description': 'Nữ giới dưới mãn kinh có nguy cơ thấp hơn nam giới.'})

    # ── Loại đau ngực (cp) ──
    cp_labels = {0: 'Không triệu chứng', 1: 'Đau thắt ngực điển hình',
                 2: 'Đau thắt ngực không điển hình', 3: 'Đau không phải angina'}
    cp_val = int(data['cp'])
    if cp_val == 0:  # asymptomatic = high risk in UCI dataset
        increase.append({'name': 'Loại đau ngực', 'value_display': cp_labels.get(cp_val, str(cp_val)),
            'impact': 'high', 'weight': 0.14,
            'description': 'Không có triệu chứng đau ngực điển hình liên quan đến nguy cơ cao hơn trên dữ liệu huấn luyện.'})
    elif cp_val >= 2:
        increase.append({'name': 'Loại đau ngực', 'value_display': cp_labels.get(cp_val, str(cp_val)),
            'impact': 'medium', 'weight': 0.09,
            'description': 'Đau ngực không điển hình cần theo dõi và đánh giá thêm.'})
    else:
        protective.append({'name': 'Loại đau ngực', 'value_display': cp_labels.get(cp_val, str(cp_val)),
            'impact': 'low', 'weight': 0.05,
            'description': 'Đau ngực điển hình khi gắng sức thường là đặc trưng rõ ràng, dễ quản lý hơn.'})

    # ── Huyết áp nghỉ ──
    if data['trestbps'] >= 160:
        increase.append({'name': 'Huyết áp nghỉ', 'value_display': f"{data['trestbps']} mmHg",
            'impact': 'high', 'weight': 0.11,
            'description': 'Tăng huyết áp độ 2 (≥160 mmHg) – nguy cơ cao tổn thương tim.'})
    elif data['trestbps'] >= 140:
        increase.append({'name': 'Huyết áp nghỉ', 'value_display': f"{data['trestbps']} mmHg",
            'impact': 'medium', 'weight': 0.08,
            'description': 'Tăng huyết áp độ 1 (140–159 mmHg) – cần kiểm soát.'})
    elif data['trestbps'] <= 120:
        protective.append({'name': 'Huyết áp nghỉ', 'value_display': f"{data['trestbps']} mmHg",
            'impact': 'low', 'weight': 0.04,
            'description': 'Huyết áp ≤ 120 mmHg – trong ngưỡng lý tưởng.'})

    # ── Cholesterol ──
    if data['chol'] >= 280:
        increase.append({'name': 'Cholesterol', 'value_display': f"{data['chol']} mg/dL",
            'impact': 'high', 'weight': 0.10,
            'description': 'Cholesterol rất cao (≥280 mg/dL) – nguy cơ xơ vữa mạch máu.'})
    elif data['chol'] >= 240:
        increase.append({'name': 'Cholesterol', 'value_display': f"{data['chol']} mg/dL",
            'impact': 'medium', 'weight': 0.07,
            'description': 'Cholesterol cao (240–279 mg/dL) – cần kiểm soát lipid máu.'})
    elif data['chol'] <= 200:
        protective.append({'name': 'Cholesterol', 'value_display': f"{data['chol']} mg/dL",
            'impact': 'low', 'weight': 0.03,
            'description': 'Cholesterol ≤ 200 mg/dL – trong ngưỡng khuyến cáo.'})

    # ── Đường huyết lúc đói ──
    if data['fbs'] == 1:
        increase.append({'name': 'Đường huyết lúc đói', 'value_display': '> 120 mg/dL',
            'impact': 'medium', 'weight': 0.06,
            'description': 'Đường huyết cao > 120 mg/dL – nguy cơ đái tháo đường và bệnh tim.'})
    else:
        protective.append({'name': 'Đường huyết lúc đói', 'value_display': '≤ 120 mg/dL',
            'impact': 'low', 'weight': 0.03,
            'description': 'Đường huyết lúc đói bình thường.'})

    # ── Nhịp tim tối đa ──
    if data['thalach'] < 100:
        increase.append({'name': 'Nhịp tim tối đa', 'value_display': f"{data['thalach']} bpm",
            'impact': 'high', 'weight': 0.12,
            'description': 'Nhịp tim tối đa < 100 bpm khi gắng sức – giảm dự trữ tim mạch.'})
    elif data['thalach'] < 130:
        increase.append({'name': 'Nhịp tim tối đa', 'value_display': f"{data['thalach']} bpm",
            'impact': 'medium', 'weight': 0.08,
            'description': 'Nhịp tim tối đa thấp hơn kỳ vọng – cần đánh giá thêm.'})
    elif data['thalach'] >= 150:
        protective.append({'name': 'Nhịp tim tối đa', 'value_display': f"{data['thalach']} bpm",
            'impact': 'low', 'weight': 0.04,
            'description': 'Nhịp tim tối đa tốt – dự trữ chức năng tim mạch đủ.'})

    # ── Đau thắt ngực khi tập ──
    if data['exang'] == 1:
        increase.append({'name': 'Đau thắt ngực khi gắng sức', 'value_display': 'Có',
            'impact': 'high', 'weight': 0.13,
            'description': 'Xuất hiện đau thắt ngực khi vận động – dấu hiệu thiếu máu cơ tim.'})
    else:
        protective.append({'name': 'Đau thắt ngực khi gắng sức', 'value_display': 'Không',
            'impact': 'low', 'weight': 0.05,
            'description': 'Không ghi nhận đau ngực khi gắng sức.'})

    # ── ST Depression (oldpeak) ──
    if data['oldpeak'] >= 3:
        increase.append({'name': 'ST Depression', 'value_display': str(data['oldpeak']),
            'impact': 'high', 'weight': 0.12,
            'description': f"ST Depression {data['oldpeak']} – biên độ rất cao, gợi ý thiếu máu cơ tim."})
    elif data['oldpeak'] >= 1.5:
        increase.append({'name': 'ST Depression', 'value_display': str(data['oldpeak']),
            'impact': 'medium', 'weight': 0.08,
            'description': f"ST Depression {data['oldpeak']} – cần theo dõi, đặc biệt khi kết hợp các yếu tố khác."})
    else:
        protective.append({'name': 'ST Depression', 'value_display': str(data['oldpeak']),
            'impact': 'low', 'weight': 0.04,
            'description': f"ST Depression {data['oldpeak']} – trong ngưỡng bình thường."})

    # ── Số mạch máu chính bị tắc (ca) ──
    if data['ca'] >= 3:
        increase.append({'name': 'Mạch máu chính bị tổn thương', 'value_display': f"{data['ca']}/3 mạch",
            'impact': 'high', 'weight': 0.15,
            'description': f"{data['ca']} mạch máu chính bị ảnh hưởng – bệnh mạch vành đa nhánh."})
    elif data['ca'] >= 1:
        increase.append({'name': 'Mạch máu chính bị tổn thương', 'value_display': f"{data['ca']}/3 mạch",
            'impact': 'medium', 'weight': 0.09,
            'description': f"{data['ca']} mạch máu chính bị ảnh hưởng – cần đánh giá mạch vành sâu hơn."})
    else:
        protective.append({'name': 'Mạch máu chính', 'value_display': 'Không bị ảnh hưởng',
            'impact': 'low', 'weight': 0.05,
            'description': 'Chưa ghi nhận mạch máu chính bị ảnh hưởng trên cận lâm sàng.'})

    # ── Thalassemia ──
    thal_labels = {1: 'Khiếm khuyết cố định', 2: 'Bình thường', 3: 'Khiếm khuyết hồi phục'}
    if data['thal'] in (1, 3):
        increase.append({'name': 'Thalassemia', 'value_display': thal_labels.get(data['thal'], str(data['thal'])),
            'impact': 'medium', 'weight': 0.07,
            'description': 'Bất thường tưới máu cơ tim trên xạ hình tâm thất.'})
    else:
        protective.append({'name': 'Thalassemia', 'value_display': thal_labels.get(data['thal'], 'Bình thường'),
            'impact': 'low', 'weight': 0.03,
            'description': 'Tưới máu cơ tim bình thường.'})

    # Sắp xếp theo weight giảm dần
    increase.sort(key=lambda x: x['weight'], reverse=True)
    protective.sort(key=lambda x: x['weight'], reverse=True)

    return increase, protective


def get_clinical_recommendations(risk_level: str, risk_score: float, urgent: bool) -> list:
    """
    Trả về danh sách khuyến nghị lâm sàng cụ thể theo mức nguy cơ.
    """
    if urgent or risk_level == 'very_high':
        return [
            '🚨 Cần chuyển khám chuyên khoa TIM MẠCH ngay – không trì hoãn.',
            'Thực hiện ECG 12 chuyển đạo và xét nghiệm troponin khẩn nếu chưa có.',
            'Siêu âm tim và chụp mạch vành (nếu chỉ định) theo hướng dẫn chuyên gia.',
            'Kiểm soát ngay: huyết áp, lipid máu, đường huyết nếu đang bất thường.',
            'Tuyệt đối không tự ý dùng thuốc tim mạch khi chưa có chỉ định bác sĩ.',
            'Thông báo cho bệnh nhân/người nhà về triệu chứng cảnh báo: đau ngực dữ dội, khó thở đột ngột.',
        ]
    elif risk_level == 'high':
        return [
            'Chuyển khám chuyên khoa tim mạch trong vòng 1–2 tuần.',
            'Thực hiện ECG gắng sức (stress test) theo chỉ định bác sĩ.',
            'Theo dõi huyết áp mỗi ngày, ghi sổ theo dõi.',
            'Điều chỉnh lối sống: giảm muối (< 5g/ngày), tăng rau xanh, giảm chất béo bão hòa.',
            'Tập thể dục 30 phút/ngày, 5 ngày/tuần ở cường độ vừa phải theo hướng dẫn.',
            'Tái khám nội khoa trong 1–2 tháng để đánh giá lại toàn diện.',
        ]
    elif risk_level == 'medium':
        return [
            'Tham khảo ý kiến bác sĩ nội khoa hoặc tim mạch trong vòng 1 tháng.',
            'Theo dõi huyết áp ít nhất 2 lần/tuần; kiểm tra lipid máu mỗi 3–6 tháng.',
            'Duy trì chế độ ăn lành mạnh tim mạch (DASH diet): nhiều rau củ, cá, hạt.',
            'Tập aerobic 150 phút/tuần; tránh thuốc lá hoàn toàn.',
            'Kiểm soát cân nặng – duy trì BMI 18.5–24.9; vòng eo < 90 cm (nam) / 80 cm (nữ).',
            'Khám sức khỏe định kỳ mỗi 6 tháng.',
        ]
    else:  # low
        return [
            'Tiếp tục duy trì lối sống lành mạnh hiện tại.',
            'Khám sức khỏe định kỳ mỗi 12 tháng bao gồm đo huyết áp và xét nghiệm lipid.',
            'Duy trì vận động thể chất đều đặn ít nhất 150 phút/tuần.',
            'Ăn uống cân bằng, hạn chế thực phẩm chế biến sẵn và đường tinh luyện.',
            'Tránh hút thuốc lá và hạn chế rượu bia.',
        ]


def get_model_info(bundle: dict) -> dict:
    """Trả về metadata của mô hình đang dùng."""
    model_obj = bundle.get('model')
    model_type = type(model_obj).__name__ if model_obj else 'Không xác định'
    return {
        'version': bundle.get('version', '2.0'),
        'model_type': model_type,
        'training_date': bundle.get('training_date', '2026-03-01'),
        'accuracy': bundle.get('accuracy', 0.942),
        'n_features': len(bundle.get('feature_names', _FEATURES)),
        'description': 'Mô hình dự đoán nguy cơ tim mạch 10 năm tới'
    }


def analyze_risk_factors(data):
    """Phân tích các yếu tố nguy cơ (backward-compatible API cũ)"""
    factors = []

    if data['age'] > 55:
        factors.append({'name': 'Tuổi', 'value': f"{data['age']} tuổi",
            'impact': 'high', 'description': 'Tuổi cao là yếu tố nguy cơ quan trọng'})
    if data['trestbps'] > 140:
        factors.append({'name': 'Huyết áp', 'value': f"{data['trestbps']} mmHg",
            'impact': 'high', 'description': 'Huyết áp cao (tăng huyết áp)'})
    if data['chol'] > 240:
        factors.append({'name': 'Cholesterol', 'value': f"{data['chol']} mg/dl",
            'impact': 'high', 'description': 'Cholesterol cao'})
    if data['thalach'] < 120:
        factors.append({'name': 'Nhịp tim tối đa', 'value': f"{data['thalach']} bpm",
            'impact': 'medium', 'description': 'Nhịp tim tối đa thấp hơn bình thường'})
    if data['exang'] == 1:
        factors.append({'name': 'Đau thắt ngực khi gắng sức', 'value': 'Có',
            'impact': 'high', 'description': 'Xuất hiện đau thắt ngực khi vận động'})
    if data['oldpeak'] > 2:
        factors.append({'name': 'ST Depression', 'value': f"{data['oldpeak']}",
            'impact': 'high', 'description': 'Chênh lệch ST cao, có thể thiếu máu cơ tim'})

    return factors

@app.route('/api/feature-importance', methods=['GET'])
def get_feature_importance():
    """Lấy độ quan trọng của các đặc trưng"""
    # Mock data - thay bằng data thực từ model nếu có
    importance = [
        {'name': 'Tuổi', 'key': 'age', 'importance': 0.15},
        {'name': 'Giới tính', 'key': 'sex', 'importance': 0.08},
        {'name': 'Loại đau ngực', 'key': 'cp', 'importance': 0.12},
        {'name': 'Huyết áp nghỉ', 'key': 'trestbps', 'importance': 0.10},
        {'name': 'Cholesterol', 'key': 'chol', 'importance': 0.09},
        {'name': 'Đường huyết', 'key': 'fbs', 'importance': 0.05},
        {'name': 'ECG nghỉ', 'key': 'restecg', 'importance': 0.06},
        {'name': 'Nhịp tim max', 'key': 'thalach', 'importance': 0.11},
        {'name': 'Đau ngực khi tập', 'key': 'exang', 'importance': 0.08},
        {'name': 'ST Depression', 'key': 'oldpeak', 'importance': 0.10},
        {'name': 'Slope', 'key': 'slope', 'importance': 0.04},
        {'name': 'Số mạch máu', 'key': 'ca', 'importance': 0.07},
        {'name': 'Thalassemia', 'key': 'thal', 'importance': 0.05}
    ]
    
    # Sắp xếp theo importance giảm dần
    importance.sort(key=lambda x: x['importance'], reverse=True)
    
    return jsonify(importance)


@app.route('/api/model-info', methods=['GET'])
def get_model_info_endpoint():
    """Trả về thông tin metadata của model AI đang sử dụng."""
    global bundle
    if bundle is None:
        bundle = load_model()
    if bundle:
        info = get_model_info(bundle)
        info['status'] = 'loaded'
    else:
        info = {
            'version': 'rule-based',
            'model_type': 'RuleBased',
            'training_date': 'N/A',
            'accuracy': None,
            'n_features': 13,
            'description': 'Dự đoán dựa trên quy tắc lâm sàng (model chưa được tải)',
            'status': 'fallback',
        }
    return jsonify(info)


# ==================== SYSTEM MONITORING ENDPOINTS (Phase 2) ====================

@app.route('/api/system/stats', methods=['GET'])
def get_system_stats():
    """
    Thống kê vận hành hệ thống:
    - In-memory metrics: p95 latency, req/min, error rate
    - Thống kê DB: tổng chẩn đoán, phân bố nguy cơ hôm nay
    - Status model và DB
    """
    summary = metrics.get_summary()
    endpoint_breakdown = metrics.get_endpoint_breakdown()

    # Thống kê DB
    try:
        all_stats = Diagnosis.get_stats(user_id=None)
    except Exception:
        all_stats = {}

    # Server info
    global bundle
    model_loaded = bundle is not None
    model_type = type(bundle['model']).__name__ if bundle else 'N/A'

    db_ok = True
    db_mode = 'unknown'
    try:
        from models.user import _is_mssql_mode
        db_mode = 'mssql' if _is_mssql_mode() else 'sqlite'
        conn = __import__('models.user', fromlist=['get_db']).get_db()
        conn.close()
    except Exception:
        db_ok = False

    uptime_sec = summary.get('uptime_seconds', 0)

    return jsonify({
        'server': {
            'status': 'ok',
            'uptime_seconds': uptime_sec,
            'uptime_formatted': format_uptime(uptime_sec),
            'model_loaded': model_loaded,
            'model_type': model_type,
            'model_version': bundle.get('version', '1.0') if bundle else 'N/A',
            'db_status': 'ok' if db_ok else 'error',
            'db_mode': db_mode,
        },
        'metrics': summary,
        'endpoints': endpoint_breakdown,
        'db_stats': all_stats,
    })


@app.route('/api/system/audit-log', methods=['GET'])
def get_audit_log():
    """
    Lấy audit log gần nhất.
    Query param: limit (mặc định 20, tối đa 50)
    Yêu cầu: đăng nhập.
    """
    user_id = _get_user_id_from_request()
    if not user_id:
        return jsonify({'error': 'Chưa đăng nhập'}), 401
    limit = min(int(request.args.get('limit', 20)), 50)
    logs = AuditLog.get_recent(limit=limit)
    return jsonify(logs)


@app.route('/api/system/drift-report', methods=['GET'])
def get_drift_report():
    """
    Báo cáo drift monitoring:
    - Phân phối risk_score 7 ngày gần nhất
    - Tín hiệu drift (z-score so với baseline)
    Yêu cầu: đăng nhập
    """
    user_id = _get_user_id_from_request()
    if not user_id:
        return jsonify({'error': 'Chưa đăng nhập'}), 401

    days = int(request.args.get('days', 7))
    distribution = Diagnosis.get_risk_distribution(days=days)

    # Lấy tất cả chẩn đoán trong khoảng để phân tích drift
    all_diagnoses = Diagnosis.get_all(limit=500, offset=0, risk_level='all')
    drift = compute_drift_signal(all_diagnoses[-200:] if len(all_diagnoses) > 200 else all_diagnoses)

    return jsonify({
        'days': days,
        'distribution': distribution,
        'drift': drift,
        'generated_at': __import__('datetime').datetime.now().isoformat(timespec='seconds'),
    })


@app.route('/api/system/fairness-report', methods=['GET'])
def get_fairness_report():
    """
    Phân tích công bằng AI (Fairness Report):
    - Phân phối risk_score theo giới tính (Nam/Nữ)
    - Phân phối risk_score theo nhóm tuổi (≤45, 46-60, >60)
    Yêu cầu: đăng nhập
    """
    user_id = _get_user_id_from_request()
    if not user_id:
        return jsonify({'error': 'Chưa đăng nhập'}), 401

    all_d = Diagnosis.get_all(limit=1000, offset=0, risk_level='all')
    records = [d.to_dict() for d in all_d]

    # Phân tích theo giới tính
    gender_stats = {'male': [], 'female': []}
    for r in records:
        scores = r.get('riskScore')
        if scores is None:
            continue
        score = float(scores)
        if int(r.get('sex', 0)) == 1:
            gender_stats['male'].append(score)
        else:
            gender_stats['female'].append(score)

    def stats(lst):
        if not lst:
            return {'count': 0, 'mean': None, 'high_risk_pct': None}
        hi = sum(1 for s in lst if s >= 50)
        return {
            'count': len(lst),
            'mean': round(sum(lst) / len(lst), 1),
            'high_risk_pct': round(hi / len(lst) * 100, 1),
        }

    gender_report = {
        'male': stats(gender_stats['male']),
        'female': stats(gender_stats['female']),
    }

    # Phân tích theo nhóm tuổi
    age_groups = {'lte45': [], '46_60': [], 'gt60': []}
    for r in records:
        scores = r.get('riskScore')
        age = r.get('age')
        if scores is None or age is None:
            continue
        score = float(scores)
        a = int(age)
        if a <= 45:
            age_groups['lte45'].append(score)
        elif a <= 60:
            age_groups['46_60'].append(score)
        else:
            age_groups['gt60'].append(score)

    age_report = {
        '≤45': stats(age_groups['lte45']),
        '46-60': stats(age_groups['46_60']),
        '>60': stats(age_groups['gt60']),
    }

    # Cảnh báo disparity
    male_mean = gender_report['male'].get('mean') or 0
    female_mean = gender_report['female'].get('mean') or 0
    disparity_pct = abs(male_mean - female_mean)
    disparity_alert = disparity_pct > 15

    return jsonify({
        'total_records': len(records),
        'gender': gender_report,
        'age_group': age_report,
        'disparity_alert': disparity_alert,
        'disparity_pct': round(disparity_pct, 1),
        'disparity_message': (
            f'⚠️ Chênh lệch risk trung bình Nam/Nữ = {disparity_pct:.1f}% (> 15%)'
            if disparity_alert else
            f'✅ Phân phối đều (chênh lệch = {disparity_pct:.1f}%)'
        ),
        'generated_at': __import__('datetime').datetime.now().isoformat(timespec='seconds'),
    })


# ==================== ADMIN ENDPOINTS (Phase 3 - RBAC) ====================

@app.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    """Định danh sách user. Yêu cầu role admin."""
    err = _require_roles('admin')
    if err:
        return err
    users = User.get_all_users(limit=100)
    return jsonify(users)


@app.route('/api/admin/users/<int:target_id>/role', methods=['PUT'])
def admin_update_role(target_id: int):
    """Cập nhật role của user. Yêu cầu role admin."""
    err = _require_roles('admin')
    if err:
        return err
    data = request.get_json() or {}
    new_role = data.get('role', '').strip()
    ok = User.update_role(target_id, new_role)
    if not ok:
        return jsonify({'error': 'Role không hợp lệ hoặc user không tồn tại'}), 400
    AuditLog.create(
        user_id=_get_user_id_from_request(), action='admin_role_update',
        endpoint=f'/api/admin/users/{target_id}/role',
        detail=f'Set role={new_role} for uid={target_id}'
    )
    return jsonify({'success': True, 'userId': target_id, 'newRole': new_role})


@app.route('/api/admin/me/role', methods=['GET'])
def get_my_role():
    """Lấy role hiện tại của user đăng nhập."""
    uid = _get_user_id_from_request()
    if not uid:
        return jsonify({'error': 'Chưa đăng nhập'}), 401
    role = User.get_role(uid)
    return jsonify({'userId': uid, 'role': role})



def _get_user_id_from_request():
    """Trích xuất user_id từ Authorization header"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header[7:]
    payload = verify_token(token)
    return payload.get('user_id') if payload else None


def _get_user_role_from_request() -> str:
    """Lấy role của user hiện tại từ token + DB. fallback 'doctor'."""
    uid = _get_user_id_from_request()
    if not uid:
        return 'anonymous'
    return User.get_role(uid)


def _require_roles(*allowed_roles):
    """
    Kiểm tra role. Nếu không hợp lệ trả về (error_response, 403).
    Sử dụng: err = _require_roles('admin'); if err: return err
    """
    role = _get_user_role_from_request()
    if role not in allowed_roles:
        return jsonify({'error': f'Không có quyền. Yêu cầu: {list(allowed_roles)}. Hiện tại: {role}'}), 403
    return None



# ==================== DIAGNOSIS ENDPOINTS ====================

@app.route('/api/diagnoses', methods=['GET'])
def get_diagnoses():
    """Lấy danh sách kết quả chẩn đoán"""
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    risk_level = request.args.get('risk_level', 'all')
    search = request.args.get('search', '').strip() or None
    diagnoses = Diagnosis.get_all(limit=limit, offset=offset, risk_level=risk_level, search=search)
    return jsonify([d.to_dict() for d in diagnoses])


@app.route('/api/diagnoses/<int:diagnosis_id>', methods=['GET'])
def get_diagnosis(diagnosis_id):
    """Lấy chi tiết một lần chẩn đoán"""
    d = Diagnosis.get_by_id(diagnosis_id)
    if not d:
        return jsonify({'error': 'Không tìm thấy kết quả chẩn đoán'}), 404
    return jsonify(d.to_dict())


@app.route('/api/diagnoses/my', methods=['GET'])
def get_my_diagnoses():
    """Lấy kết quả chẩn đoán của user hiện tại"""
    user_id = _get_user_id_from_request()
    if not user_id:
        return jsonify({'error': 'Chưa đăng nhập'}), 401
    diagnoses = Diagnosis.get_by_user(user_id)
    return jsonify([d.to_dict() for d in diagnoses])


@app.route('/api/stats/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Thống kê cho trang Dashboard"""
    user_id = _get_user_id_from_request()
    stats = Diagnosis.get_stats(user_id=user_id)
    return jsonify(stats)


@app.route('/api/stats/reports', methods=['GET'])
def get_report_stats():
    """Thống kê cho trang Báo cáo – tổng hợp toàn hệ thống"""
    date_from = request.args.get('from')
    date_to = request.args.get('to')
    # Báo cáo tổng hợp: không lọc theo user → hiển thị tất cả dữ liệu BenhNhan
    stats = Diagnosis.get_report_stats(date_from=date_from, date_to=date_to, user_id=None)
    return jsonify(stats)

# ==================== AUTH ENDPOINTS ====================

def create_token(user_id: int, email: str) -> str:
    """Tạo JWT-like token đơn giản"""
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip('=')
    payload_data = {
        "user_id": user_id,
        "email": email,
        "exp": int(time.time()) + 86400  # 24 giờ
    }
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().rstrip('=')
    signature = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
    return f"{header}.{payload}.{signature}"


def verify_token(token: str):
    """Xác thực token"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header, payload, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        # Thêm padding cho base64
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding
        payload_data = json.loads(base64.urlsafe_b64decode(payload))
        if payload_data.get('exp', 0) < time.time():
            return None
        return payload_data
    except Exception:
        return None


@app.route('/api/auth/register', methods=['POST'])
def register():
    """Đăng ký tài khoản mới"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Không có dữ liệu'}), 400

        full_name = data.get('fullName', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        confirm_password = data.get('confirmPassword', '').strip()

        # Validation
        if not full_name or not email or not password:
            return jsonify({'error': 'Vui lòng điền đầy đủ thông tin'}), 400

        if len(full_name) < 2:
            return jsonify({'error': 'Họ và tên phải có ít nhất 2 ký tự'}), 400

        # Validate email format
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return jsonify({'error': 'Email không hợp lệ'}), 400

        if len(password) < 6:
            return jsonify({'error': 'Mật khẩu phải có ít nhất 6 ký tự'}), 400

        if password != confirm_password:
            return jsonify({'error': 'Mật khẩu xác nhận không trùng khớp'}), 400

        # Kiểm tra email đã tồn tại
        existing_user = User.find_by_email(email)
        if existing_user:
            return jsonify({'error': 'Email đã được sử dụng'}), 409

        # Tạo user mới
        success, message = User.create(full_name, email, password)
        if success:
            return jsonify({'message': message}), 201
        else:
            return jsonify({'error': message}), 409

    except RuntimeError as e:
        return jsonify({'error': f'Lỗi kết nối/cấu hình SQL Server: {str(e)}'}), 500

    except Exception as e:
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Đăng nhập"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Không có dữ liệu'}), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()

        if not email or not password:
            return jsonify({'error': 'Vui lòng nhập email và mật khẩu'}), 400

        # Xác thực
        user = User.verify_password(email, password)
        if not user:
            return jsonify({'error': 'Email hoặc mật khẩu không đúng'}), 401

        # Tạo token
        token = create_token(user.id, user.email)

        return jsonify({
            'message': 'Đăng nhập thành công',
            'token': token,
            'user': user.to_dict()
        })

    except RuntimeError as e:
        return jsonify({'error': f'Lỗi kết nối/cấu hình SQL Server: {str(e)}'}), 500

    except Exception as e:
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500


@app.route('/api/auth/google', methods=['POST'])
def google_login():
    """Đăng nhập bằng Google"""
    try:
        data = request.get_json()
        if not data or not data.get('credential'):
            return jsonify({'error': 'Thiếu token Google'}), 400

        credential = data['credential']

        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        if not GOOGLE_CLIENT_ID:
            return jsonify({'error': 'Server chưa cấu hình Google Client ID'}), 500

        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        email = idinfo.get('email')
        full_name = idinfo.get('name', '')
        google_id = idinfo.get('sub')

        if not email:
            return jsonify({'error': 'Không lấy được email từ Google'}), 400

        user = User.find_or_create_google(full_name, email, google_id)
        if not user:
            return jsonify({'error': 'Không thể tạo tài khoản'}), 500

        token = create_token(user.id, user.email)

        return jsonify({
            'message': 'Đăng nhập Google thành công',
            'token': token,
            'user': user.to_dict()
        })

    except ValueError:
        return jsonify({'error': 'Token Google không hợp lệ hoặc đã hết hạn'}), 401
    except RuntimeError as e:
        return jsonify({'error': f'Lỗi kết nối SQL Server: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500


# SMTP Email config
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', 'viho317@gmail.com')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', 'nhyg gdzi fqsj rdby')  # Google App Password
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))

# Lưu OTP tạm trong bộ nhớ: { email: { 'code': '...', 'expires': timestamp } }
_reset_otp_store = {}


def _send_otp_email(to_email: str, otp_code: str) -> bool:
    """Gửi mã OTP qua email."""
    if not SMTP_PASSWORD:
        return False
    msg = MIMEMultipart('alternative')
    msg['From'] = f'CardioPredict AI <{SMTP_EMAIL}>'
    msg['To'] = to_email
    msg['Subject'] = f'M\u00e3 x\u00e1c nh\u1eadn \u0111\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u: {otp_code}'

    html = f"""\
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px">
        <div style="text-align:center;margin-bottom:24px">
            <h2 style="color:#c62828;margin:0">❤️ CardioPredict AI</h2>
        </div>
        <h3 style="color:#333">\u0110\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u</h3>
        <p style="color:#555">B\u1ea1n \u0111\u00e3 y\u00eau c\u1ea7u \u0111\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u. D\u00f9ng m\u00e3 x\u00e1c nh\u1eadn b\u00ean d\u01b0\u1edbi:</p>
        <div style="background:#f5f5f5;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
            <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#c62828">{otp_code}</span>
        </div>
        <p style="color:#888;font-size:13px">M\u00e3 c\u00f3 hi\u1ec7u l\u1ef1c trong <b>5 ph\u00fat</b>. N\u1ebfu b\u1ea1n kh\u00f4ng y\u00eau c\u1ea7u, h\u00e3y b\u1ecf qua email n\u00e0y.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#aaa;font-size:12px;text-align:center">&copy; 2026 CardioPredict AI</p>
    </div>
    """
    msg.attach(MIMEText(html, 'html', 'utf-8'))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f'[SMTP Error] {e}')
        return False


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Gửi mã OTP để đặt lại mật khẩu"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u'}), 400
        email = (data.get('email') or '').strip().lower()
        if not email:
            return jsonify({'error': 'Vui l\u00f2ng nh\u1eadp email'}), 400

        user = User.find_by_email(email)
        if not user:
            return jsonify({'error': 'Email kh\u00f4ng t\u1ed3n t\u1ea1i trong h\u1ec7 th\u1ed1ng'}), 404

        code = ''.join(random.choices(string.digits, k=6))
        _reset_otp_store[email] = {'code': code, 'expires': time.time() + 300}

        email_sent = _send_otp_email(email, code)

        if email_sent:
            return jsonify({
                'message': f'M\u00e3 x\u00e1c nh\u1eadn \u0111\u00e3 \u0111\u01b0\u1ee3c g\u1eedi \u0111\u1ebfn {email}',
                'sent_via': 'email'
            })
        else:
            return jsonify({
                'message': 'M\u00e3 x\u00e1c nh\u1eadn \u0111\u00e3 \u0111\u01b0\u1ee3c t\u1ea1o (ch\u01b0a c\u1ea5u h\u00ecnh SMTP)',
                'sent_via': 'preview',
                'otp_preview': code
            })
    except Exception as e:
        return jsonify({'error': f'L\u1ed7i server: {str(e)}'}), 500


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    """Xác nhận mã OTP"""
    try:
        data = request.get_json()
        email = (data.get('email') or '').strip().lower()
        code = (data.get('code') or '').strip()

        if not email or not code:
            return jsonify({'error': 'Thiếu email hoặc mã xác nhận'}), 400

        stored = _reset_otp_store.get(email)
        if not stored:
            return jsonify({'error': 'Chưa yêu cầu mã xác nhận cho email này'}), 400
        if time.time() > stored['expires']:
            del _reset_otp_store[email]
            return jsonify({'error': 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới.'}), 400
        if not hmac.compare_digest(stored['code'], code):
            return jsonify({'error': 'Mã xác nhận không đúng'}), 400

        return jsonify({'message': 'Mã xác nhận hợp lệ', 'verified': True})
    except Exception as e:
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500


@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Đặt lại mật khẩu sau khi xác nhận OTP"""
    try:
        data = request.get_json()
        email = (data.get('email') or '').strip().lower()
        code = (data.get('code') or '').strip()
        new_password = (data.get('new_password') or '').strip()

        if not email or not code or not new_password:
            return jsonify({'error': 'Thiếu thông tin'}), 400
        if len(new_password) < 6:
            return jsonify({'error': 'Mật khẩu phải có ít nhất 6 ký tự'}), 400

        stored = _reset_otp_store.get(email)
        if not stored:
            return jsonify({'error': 'Chưa yêu cầu mã xác nhận'}), 400
        if time.time() > stored['expires']:
            del _reset_otp_store[email]
            return jsonify({'error': 'Mã xác nhận đã hết hạn'}), 400
        if not hmac.compare_digest(stored['code'], code):
            return jsonify({'error': 'Mã xác nhận không đúng'}), 400

        success, msg = User.reset_password(email, new_password)
        if not success:
            return jsonify({'error': msg}), 400

        del _reset_otp_store[email]
        return jsonify({'message': msg})
    except Exception as e:
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500


@app.route('/api/auth/google-client-id', methods=['GET'])
def get_google_client_id():
    """Trả về Google Client ID cho frontend"""
    return jsonify({'clientId': GOOGLE_CLIENT_ID or ''})


@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """Lấy thông tin user hiện tại từ token"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Chưa đăng nhập'}), 401

    token = auth_header[7:]
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Token không hợp lệ hoặc đã hết hạn'}), 401

    user = User.find_by_email(payload['email'])
    if not user:
        return jsonify({'error': 'Người dùng không tồn tại'}), 404

    return jsonify({'user': user.to_dict()})


@app.route('/<path:path>', methods=['GET'])
def frontend_routes(path):
    """Phục vụ asset/frontend routes khi deploy chung Flask + React."""
    if path.startswith('api/'):
        return jsonify({'error': 'Không tìm thấy endpoint'}), 404
    return _serve_frontend(path)


if __name__ == '__main__':
    host = os.environ.get('API_HOST', '127.0.0.1')
    port = int(os.environ.get('PORT', os.environ.get('API_PORT', '5001')))
    use_waitress = os.environ.get('USE_WAITRESS', '0').lower() in ('1', 'true', 'yes')
    print("Starting Heart Disease Prediction API...")
    print(f"Model loaded: {model is not None}")
    if AUTH_DB_BOOT_STATUS.get('connected'):
        print(
            f"Auth DB connected: {AUTH_DB_BOOT_STATUS.get('server')} / "
            f"{AUTH_DB_BOOT_STATUS.get('database')}"
        )
    else:
        print(f"Auth DB error: {AUTH_DB_BOOT_STATUS.get('error')}")
    print(f"Server running on http://{host}:{port}")
    if use_waitress:
        serve(app, host=host, port=port)
    else:
        app.run(host=host, port=port, debug=False)
