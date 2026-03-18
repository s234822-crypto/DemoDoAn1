"""
Seed script: Thêm dữ liệu mẫu demo vào database để kiểm thử hệ thống.
Chạy: python seed_demo.py

Bao gồm 10 bệnh nhân mẫu đa dạng mức nguy cơ (low/medium/high/very_high).
Dùng user_id=1 (tài khoản đầu tiên trong hệ thống).
"""

import sys
import os

# Thêm thư mục gốc vào path
sys.path.insert(0, os.path.dirname(__file__))

from models.user import Diagnosis, init_db, get_db

# Dữ liệu mẫu: 10 bệnh nhân với nguy cơ đa dạng
SAMPLE_PATIENTS = [
    # ── Nguy cơ RẤT CAO (very_high) ──
    {
        'meta': {'name': 'Nguyễn Văn An', 'expected_risk': 'very_high'},
        'data': {'age': 67, 'sex': 1, 'cp': 0, 'trestbps': 180, 'chol': 290,
                 'fbs': 1, 'restecg': 2, 'thalach': 95, 'exang': 1,
                 'oldpeak': 3.8, 'slope': 2, 'ca': 3, 'thal': 3},
        'prediction': 1, 'risk_score': 91.5, 'risk_level': 'very_high',
    },
    {
        'meta': {'name': 'Trần Thị Bích', 'expected_risk': 'very_high'},
        'data': {'age': 72, 'sex': 0, 'cp': 0, 'trestbps': 165, 'chol': 310,
                 'fbs': 1, 'restecg': 2, 'thalach': 88, 'exang': 1,
                 'oldpeak': 4.2, 'slope': 2, 'ca': 3, 'thal': 1},
        'prediction': 1, 'risk_score': 88.3, 'risk_level': 'very_high',
    },
    # ── Nguy cơ CAO (high) ──
    {
        'meta': {'name': 'Lê Minh Cường', 'expected_risk': 'high'},
        'data': {'age': 58, 'sex': 1, 'cp': 0, 'trestbps': 155, 'chol': 265,
                 'fbs': 0, 'restecg': 1, 'thalach': 115, 'exang': 1,
                 'oldpeak': 2.5, 'slope': 2, 'ca': 2, 'thal': 3},
        'prediction': 1, 'risk_score': 74.2, 'risk_level': 'high',
    },
    {
        'meta': {'name': 'Phạm Hồng Đức', 'expected_risk': 'high'},
        'data': {'age': 62, 'sex': 1, 'cp': 2, 'trestbps': 145, 'chol': 250,
                 'fbs': 1, 'restecg': 1, 'thalach': 120, 'exang': 0,
                 'oldpeak': 2.1, 'slope': 2, 'ca': 1, 'thal': 3},
        'prediction': 1, 'risk_score': 69.8, 'risk_level': 'high',
    },
    {
        'meta': {'name': 'Vũ Thị Lan', 'expected_risk': 'high'},
        'data': {'age': 55, 'sex': 0, 'cp': 0, 'trestbps': 148, 'chol': 275,
                 'fbs': 1, 'restecg': 2, 'thalach': 108, 'exang': 1,
                 'oldpeak': 2.8, 'slope': 2, 'ca': 2, 'thal': 3},
        'prediction': 1, 'risk_score': 71.1, 'risk_level': 'high',
    },
    # ── Nguy cơ TRUNG BÌNH (medium) ──
    {
        'meta': {'name': 'Hoàng Đình Phúc', 'expected_risk': 'medium'},
        'data': {'age': 49, 'sex': 1, 'cp': 1, 'trestbps': 138, 'chol': 230,
                 'fbs': 0, 'restecg': 1, 'thalach': 135, 'exang': 0,
                 'oldpeak': 1.5, 'slope': 1, 'ca': 1, 'thal': 2},
        'prediction': 0, 'risk_score': 43.5, 'risk_level': 'medium',
    },
    {
        'meta': {'name': 'Đặng Thị Mai', 'expected_risk': 'medium'},
        'data': {'age': 52, 'sex': 0, 'cp': 2, 'trestbps': 132, 'chol': 218,
                 'fbs': 0, 'restecg': 0, 'thalach': 140, 'exang': 0,
                 'oldpeak': 1.2, 'slope': 1, 'ca': 0, 'thal': 2},
        'prediction': 0, 'risk_score': 37.8, 'risk_level': 'medium',
    },
    # ── Nguy cơ THẤP (low) ──
    {
        'meta': {'name': 'Ngô Quang Ninh', 'expected_risk': 'low'},
        'data': {'age': 38, 'sex': 1, 'cp': 3, 'trestbps': 118, 'chol': 190,
                 'fbs': 0, 'restecg': 0, 'thalach': 165, 'exang': 0,
                 'oldpeak': 0.5, 'slope': 0, 'ca': 0, 'thal': 2},
        'prediction': 0, 'risk_score': 18.2, 'risk_level': 'low',
    },
    {
        'meta': {'name': 'Bùi Thanh Thảo', 'expected_risk': 'low'},
        'data': {'age': 32, 'sex': 0, 'cp': 3, 'trestbps': 112, 'chol': 175,
                 'fbs': 0, 'restecg': 0, 'thalach': 175, 'exang': 0,
                 'oldpeak': 0.2, 'slope': 0, 'ca': 0, 'thal': 2},
        'prediction': 0, 'risk_score': 12.4, 'risk_level': 'low',
    },
    {
        'meta': {'name': 'Trương Văn Khải', 'expected_risk': 'low'},
        'data': {'age': 45, 'sex': 1, 'cp': 1, 'trestbps': 125, 'chol': 205,
                 'fbs': 0, 'restecg': 0, 'thalach': 158, 'exang': 0,
                 'oldpeak': 0.8, 'slope': 1, 'ca': 0, 'thal': 2},
        'prediction': 0, 'risk_score': 24.7, 'risk_level': 'low',
    },
]


def seed():
    """Chạy seed dữ liệu mẫu vào DB."""
    init_db()

    # Tìm user_id đầu tiên từ DB
    from models.user import get_db, _is_mssql_mode, _fetchone_dict
    conn = get_db()
    if _is_mssql_mode():
        row = _fetchone_dict(conn, 'SELECT TOP 1 Id FROM TaiKhoan ORDER BY Id')
    else:
        row = _fetchone_dict(conn, 'SELECT Id FROM Users ORDER BY Id LIMIT 1')
    conn.close()

    if not row:
        print('[Seed] ❌ Không tìm thấy user nào trong DB. Hãy đăng ký tài khoản trước.')
        print('       Chạy server, đăng ký 1 tài khoản, sau đó chạy lại seed_demo.py')
        return

    user_id = list(row.values())[0]
    print(f'[Seed] ✅ Dùng user_id={user_id} cho toàn bộ dữ liệu mẫu')

    ok = 0
    for i, p in enumerate(SAMPLE_PATIENTS, 1):
        try:
            new_id = Diagnosis.create(
                user_id=user_id,
                data=p['data'],
                prediction=p['prediction'],
                risk_score=p['risk_score'],
                risk_level=p['risk_level'],
            )
            level_vn = {'low': 'Thấp', 'medium': 'Trung bình', 'high': 'Cao', 'very_high': 'Rất cao'}
            print(f'  [{i:02d}] ✓ {p["meta"]["name"]:18} | {level_vn.get(p["risk_level"], p["risk_level"]):10} | {p["risk_score"]}% → ID={new_id}')
            ok += 1
        except Exception as e:
            print(f'  [{i:02d}] ✗ {p["meta"]["name"]:18} → Lỗi: {e}')

    print(f'\n[Seed] Hoàn tất: {ok}/{len(SAMPLE_PATIENTS)} bệnh nhân mẫu đã được thêm vào DB.')
    print('[Seed] Vào Dashboard hoặc Lịch sử để xem kết quả demo.')


if __name__ == '__main__':
    seed()
