"""
Script xử lý và chuẩn bị dữ liệu cho mô hình dự đoán bệnh tim
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import os

def load_data(filepath='dataset/heart_disease_processed.csv'):
    """Load dataset đã xử lý"""
    df = pd.read_csv(filepath)
    print(f"📊 Loaded dataset: {len(df)} records")
    print(f"📋 Features: {list(df.columns)}")
    return df

def get_feature_info():
    """Thông tin về các đặc trưng trong dataset"""
    features = {
        'age': 'Tuổi (năm)',
        'sex': 'Giới tính (0: Nữ, 1: Nam)',
        'cp': 'Loại đau ngực (0-3)',
        'trestbps': 'Huyết áp nghỉ (mm Hg)',
        'chol': 'Cholesterol (mg/dl)',
        'fbs': 'Đường huyết lúc đói > 120 mg/dl (0: Không, 1: Có)',
        'restecg': 'Kết quả ECG nghỉ (0-2)',
        'thalach': 'Nhịp tim tối đa đạt được',
        'exang': 'Đau thắt ngực khi tập (0: Không, 1: Có)',
        'oldpeak': 'ST Depression',
        'slope': 'Độ dốc ST (0-2)',
        'ca': 'Số mạch máu chính (0-3)',
        'thal': 'Thalassemia (0-2)',
        'target': 'Kết quả (0: Không bệnh, 1: Có bệnh tim)'
    }
    return features

def prepare_data(df):
    """Chuẩn bị dữ liệu cho training"""
    X = df.drop('target', axis=1)
    y = df['target']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"✅ Training set: {len(X_train)} samples")
    print(f"✅ Test set: {len(X_test)} samples")
    
    return X_train, X_test, y_train, y_test

def analyze_data(df):
    """Phân tích cơ bản về dataset"""
    print("\n📈 PHÂN TÍCH DATASET")
    print("=" * 50)
    
    # Thống kê target
    target_counts = df['target'].value_counts()
    print(f"\n🎯 Phân bố Target:")
    print(f"   - Không bệnh (0): {target_counts[0]} ({target_counts[0]/len(df)*100:.1f}%)")
    print(f"   - Có bệnh (1): {target_counts[1]} ({target_counts[1]/len(df)*100:.1f}%)")
    
    # Thống kê tuổi
    print(f"\n👤 Tuổi:")
    print(f"   - Min: {df['age'].min()}")
    print(f"   - Max: {df['age'].max()}")
    print(f"   - Mean: {df['age'].mean():.1f}")
    
    # Thống kê giới tính
    sex_counts = df['sex'].value_counts()
    print(f"\n⚤ Giới tính:")
    print(f"   - Nữ (0): {sex_counts[0]} ({sex_counts[0]/len(df)*100:.1f}%)")
    print(f"   - Nam (1): {sex_counts[1]} ({sex_counts[1]/len(df)*100:.1f}%)")
    
    return df.describe()

if __name__ == '__main__':
    # Load và phân tích data
    df = load_data()
    analyze_data(df)
    
    # Chuẩn bị data
    X_train, X_test, y_train, y_test = prepare_data(df)
