"""
API Backend cho ứng dụng dự đoán bệnh tim
Flask REST API để kết nối với Frontend React
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from waitress import serve
import joblib
import pandas as pd
import numpy as np
import os

app = Flask(__name__)
# Cho phép tất cả origins trong development
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Load mô hình
def load_model():
    """Load mô hình đã train"""
    model_path = os.path.join(os.path.dirname(__file__), 'models', 'heart_model.pkl')
    try:
        model = joblib.load(model_path)
        return model
    except FileNotFoundError:
        return None

# Khởi tạo model khi start server
model = load_model()

@app.route('/', methods=['GET'])
def home():
    """Trang chủ API"""
    return jsonify({
        'name': 'Heart Disease Prediction API',
        'version': '1.0',
        'status': 'running',
        'model_loaded': model is not None,
        'endpoints': {
            'health': '/api/health',
            'predict': '/api/predict (POST)',
            'feature_importance': '/api/feature-importance'
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Kiểm tra trạng thái server"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
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
        
        # Kiểm tra model
        if model is None:
            # Trả về mock prediction nếu chưa có model
            risk_score = calculate_mock_risk(input_data)
            return jsonify({
                'prediction': 1 if risk_score > 50 else 0,
                'risk_score': risk_score,
                'risk_level': get_risk_level(risk_score),
                'message': 'Dự đoán dựa trên quy tắc (model chưa được train)',
                'factors': analyze_risk_factors(input_data)
            })
        
        # Dự đoán với model
        prediction = model.predict(input_df)[0]
        
        # Tính xác suất nếu có
        try:
            proba = model.predict_proba(input_df)[0]
            risk_score = round(proba[1] * 100, 1)
        except:
            risk_score = 75 if prediction == 1 else 25
        
        return jsonify({
            'prediction': int(prediction),
            'risk_score': risk_score,
            'risk_level': get_risk_level(risk_score),
            'message': 'CÓ NGUY CƠ mắc bệnh tim' if prediction == 1 else 'KHÔNG CÓ nguy cơ mắc bệnh tim',
            'factors': analyze_risk_factors(input_data)
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
    """Xác định mức độ nguy cơ"""
    if score < 30:
        return 'low'
    elif score < 50:
        return 'medium'
    elif score < 70:
        return 'high'
    else:
        return 'very_high'

def analyze_risk_factors(data):
    """Phân tích các yếu tố nguy cơ"""
    factors = []
    
    if data['age'] > 55:
        factors.append({
            'name': 'Tuổi',
            'value': f"{data['age']} tuổi",
            'impact': 'high',
            'description': 'Tuổi cao là yếu tố nguy cơ quan trọng'
        })
    
    if data['trestbps'] > 140:
        factors.append({
            'name': 'Huyết áp',
            'value': f"{data['trestbps']} mmHg",
            'impact': 'high',
            'description': 'Huyết áp cao (tăng huyết áp)'
        })
    
    if data['chol'] > 240:
        factors.append({
            'name': 'Cholesterol',
            'value': f"{data['chol']} mg/dl",
            'impact': 'high',
            'description': 'Cholesterol cao'
        })
    
    if data['thalach'] < 120:
        factors.append({
            'name': 'Nhịp tim tối đa',
            'value': f"{data['thalach']} bpm",
            'impact': 'medium',
            'description': 'Nhịp tim tối đa thấp hơn bình thường'
        })
    
    if data['exang'] == 1:
        factors.append({
            'name': 'Đau thắt ngực khi gắng sức',
            'value': 'Có',
            'impact': 'high',
            'description': 'Xuất hiện đau thắt ngực khi vận động'
        })
    
    if data['oldpeak'] > 2:
        factors.append({
            'name': 'ST Depression',
            'value': f"{data['oldpeak']}",
            'impact': 'high',
            'description': 'Chênh lệch ST cao, có thể thiếu máu cơ tim'
        })
    
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

if __name__ == '__main__':
    print("🚀 Starting Heart Disease Prediction API...")
    print(f"📊 Model loaded: {model is not None}")
    print("🌐 Server running on http://127.0.0.1:5000")
    serve(app, host='127.0.0.1', port=5000)
