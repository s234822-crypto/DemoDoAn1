"""
app.py — Entry point LEGACY (phiên bản cũ, đơn giản, không có auth/DB).

⚠️  CẢNH BÁO: Entry point chính của dự án là api.py (port 5001).
    Hãy dùng: python api.py
    File này chỉ giữ lại để tham khảo.
"""

import os
from typing import Dict, Any

import joblib
import numpy as np
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEATURES = [
    'age', 'sex', 'cp', 'trestbps', 'chol', 'fbs',
    'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal'
]
CONTINUOUS_INDICES = [0, 3, 4, 7, 9]


def load_model_bundle() -> Dict[str, Any]:
    """Load model từ model.pkl hoặc fallback sang models/heart_model.pkl."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    env_model_path = os.environ.get('MODEL_PATH', '').strip()

    candidate_paths = [
        env_model_path,
        os.path.abspath(os.path.join(base_dir, 'model.pkl')),
        os.path.abspath(os.path.join(base_dir, 'models', 'heart_model.pkl')),
    ]

    # Giữ thứ tự ưu tiên, đồng thời loại path trống/trùng.
    dedup_paths = []
    seen = set()
    for p in candidate_paths:
        if not p:
            continue
        ap = os.path.abspath(p)
        if ap in seen:
            continue
        seen.add(ap)
        dedup_paths.append(ap)

    last_error = None
    for model_path in dedup_paths:
        if not os.path.exists(model_path):
            continue
        try:
            loaded = joblib.load(model_path)
            if isinstance(loaded, dict) and 'model' in loaded:
                return {
                    'model': loaded['model'],
                    'scaler': loaded.get('scaler'),
                    'features': loaded.get('feature_names', FEATURES),
                    'cont_idx': loaded.get('cont_idx', CONTINUOUS_INDICES),
                    'path': model_path,
                }
            return {
                'model': loaded,
                'scaler': None,
                'features': FEATURES,
                'cont_idx': CONTINUOUS_INDICES,
                'path': model_path,
            }
        except Exception as exc:
            last_error = exc

    raise RuntimeError(
        'Không thể load model (.pkl). '
        f'Checked paths: {dedup_paths}. '
        f'Chi tiết: {last_error}'
    )


MODEL_BUNDLE = load_model_bundle()


def _parse_payload(payload: Dict[str, Any]) -> Dict[str, float]:
    """Parse và validate dữ liệu đầu vào từ form/json."""
    missing = [f for f in FEATURES if payload.get(f, '') in (None, '')]
    if missing:
        raise ValueError(f'Thiếu dữ liệu: {", ".join(missing)}')

    data = {
        'age': float(payload['age']),
        'sex': int(payload['sex']),
        'cp': int(payload['cp']),
        'trestbps': float(payload['trestbps']),
        'chol': float(payload['chol']),
        'fbs': int(payload['fbs']),
        'restecg': int(payload['restecg']),
        'thalach': float(payload['thalach']),
        'exang': int(payload['exang']),
        'oldpeak': float(payload['oldpeak']),
        'slope': int(payload['slope']),
        'ca': int(payload['ca']),
        'thal': int(payload['thal']),
    }
    return data


def _predict_heart_risk(data: Dict[str, float]) -> Dict[str, Any]:
    """Thực hiện suy luận từ model/scaler đã load."""
    features = MODEL_BUNDLE['features']
    cont_idx = MODEL_BUNDLE['cont_idx']
    scaler = MODEL_BUNDLE['scaler']
    model = MODEL_BUNDLE['model']

    X = np.array([[data[f] for f in features]], dtype=float)
    if scaler is not None:
        X[:, cont_idx] = scaler.transform(X[:, cont_idx])

    pred_class = int(model.predict(X)[0])
    if hasattr(model, 'predict_proba'):
        risk_score = float(model.predict_proba(X)[0][1] * 100)
    else:
        risk_score = 90.0 if pred_class == 1 else 10.0

    if risk_score < 25:
        risk_level = 'Thấp'
    elif risk_score < 50:
        risk_level = 'Trung bình'
    elif risk_score < 75:
        risk_level = 'Cao'
    else:
        risk_level = 'Rất cao'

    return {
        'prediction': pred_class,
        'risk_score': round(risk_score, 2),
        'risk_level': risk_level,
        'message': 'Có nguy cơ bệnh tim' if pred_class == 1 else 'Nguy cơ thấp / chưa phát hiện bệnh tim',
    }


def _as_json_request() -> bool:
    if request.is_json:
        return True
    accept = request.headers.get('Accept', '')
    return 'application/json' in accept


@app.route('/', methods=['GET'])
def index():
    """Trang form nhập dữ liệu dự đoán."""
    return render_template('index.html', result=None, error=None, form_data={})


@app.route('/predict', methods=['POST'])
def predict():
    """Endpoint nhận dữ liệu từ form HTML hoặc JSON rồi trả kết quả dự đoán."""
    try:
        payload = request.get_json(silent=True) if request.is_json else request.form
        payload = payload or {}
        input_data = _parse_payload(payload)
        result = _predict_heart_risk(input_data)

        if _as_json_request():
            return jsonify(result)

        return render_template('index.html', result=result, error=None, form_data=input_data)
    except Exception as exc:
        if _as_json_request():
            return jsonify({'error': str(exc)}), 400

        return render_template('index.html', result=None, error=str(exc), form_data=request.form)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check đơn giản cho môi trường deploy."""
    return jsonify({
        'status': 'ok',
        'model_loaded': MODEL_BUNDLE.get('model') is not None,
        'model_path': MODEL_BUNDLE.get('path')
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5000'))
    app.run(host='0.0.0.0', port=port, debug=False)