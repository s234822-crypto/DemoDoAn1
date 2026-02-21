"""
Script huấn luyện mô hình dự đoán bệnh tim
Sử dụng RandomForestClassifier từ scikit-learn
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import os

def load_data():
    """Load dataset"""
    df = pd.read_csv('dataset/heart_disease_processed.csv')
    X = df.drop('target', axis=1)
    y = df['target']
    return X, y

def train_model(X, y):
    """Huấn luyện mô hình Random Forest"""
    # Chia dữ liệu
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Tạo và train model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        random_state=42
    )
    
    print("🔄 Đang huấn luyện mô hình...")
    model.fit(X_train, y_train)
    
    # Đánh giá
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n✅ Kết quả huấn luyện:")
    print(f"   Accuracy: {accuracy:.2%}")
    
    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5)
    print(f"   Cross-validation: {cv_scores.mean():.2%} (+/- {cv_scores.std()*2:.2%})")
    
    # Chi tiết
    print(f"\n📊 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Không bệnh', 'Có bệnh']))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n🎯 Top 5 đặc trưng quan trọng:")
    for i, row in feature_importance.head().iterrows():
        print(f"   - {row['feature']}: {row['importance']:.3f}")
    
    return model, accuracy

def save_model(model, filepath='models/heart_model.pkl'):
    """Lưu mô hình"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    joblib.dump(model, filepath)
    print(f"\n💾 Đã lưu mô hình: {filepath}")

if __name__ == '__main__':
    print("=" * 50)
    print("🫀 HỆ THỐNG DỰ ĐOÁN BỆNH TIM")
    print("=" * 50)
    
    # Load data
    X, y = load_data()
    print(f"📂 Loaded {len(X)} samples với {len(X.columns)} features")
    
    # Train model
    model, accuracy = train_model(X, y)
    
    # Save model
    save_model(model)
    
    print("\n✅ Hoàn tất!")
