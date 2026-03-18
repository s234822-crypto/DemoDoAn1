---
title: CardioPredict AI
emoji: 🫀
colorFrom: red
colorTo: orange
sdk: docker
app_port: 7860
pinned: false
---

# 🫀 Hệ thống Dự đoán Bệnh Tim - CardioPredict AI

## Giới thiệu
Hệ thống Machine Learning dự đoán nguy cơ mắc bệnh tim mạch dựa trên các chỉ số sức khỏe, sử dụng thuật toán Random Forest với độ chính xác ~76.72%.

## Cấu trúc dự án
```
DoAn_TimMach/
├── api.py                    # Backend API (Flask)
├── train_model.py            # Script huấn luyện model
├── data_preprocessing.py     # Script xử lý dữ liệu
├── requirements.txt          # Dependencies
├── README.md                 # Hướng dẫn
├── dataset/
│   └── heart_disease_processed.csv  # Dataset (5007 mẫu)
├── models/
│   └── heart_model.pkl       # Model đã train
└── Fontend/                  # React Frontend
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   └── services/
    └── package.json
```

## Yêu cầu hệ thống
- Python 3.10+
- Node.js 18+
- npm hoặc yarn

## Cài đặt

### 1. Backend (Python)
```bash
# Tạo môi trường ảo
python -m venv venv
venv\Scripts\activate  # Windows

# Cài đặt dependencies
pip install -r ../requirements.txt
```

### 2. Frontend (React)
```bash
cd Fontend
npm install
```

## Chạy ứng dụng

### Bước 1: Khởi động Backend API
```bash
cd DoAn_TimMach
python api.py
```
Server chạy tại: http://127.0.0.1:5000

### Bước 2: Khởi động Frontend
```bash
cd Fontend
npm run dev
```
Giao diện tại: http://localhost:5175

## Deploy miễn phí trên Hugging Face Spaces

Project này đã được chuẩn bị để chạy trên Hugging Face Spaces bằng Docker.

### Cách deploy
1. Tạo một Space mới trên Hugging Face.
2. Chọn SDK là `Docker`.
3. Push toàn bộ thư mục `DoAn_TimMach/` lên repo của Space.
4. Hugging Face sẽ tự build từ `Dockerfile` và chạy app trên cổng `7860`.

### Lưu ý khi chạy trên Hugging Face
- Mặc định Space dùng `DB_MODE=sqlite` vì không thể truy cập SQL Server nội bộ trên máy cá nhân.
- Frontend React được build trong Docker và được Flask phục vụ trực tiếp cùng domain.
- Dữ liệu SQLite trên gói miễn phí là tạm thời: có thể mất khi Space rebuild hoặc restart.
- Nếu muốn giữ dữ liệu lâu dài, cần dùng persistent storage hoặc chuyển sang DB cloud riêng.

### URL sau deploy
- Giao diện web nằm tại `/`
- API info tại `/api`
- Health check tại `/api/health`

## Train lại Model (nếu cần)
```bash
python train_model.py
```

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | Thông tin API |
| GET | `/api/health` | Kiểm tra trạng thái |
| POST | `/api/predict` | Dự đoán nguy cơ bệnh tim |
| GET | `/api/feature-importance` | Độ quan trọng features |

### Ví dụ Request
```json
POST /api/predict
{
    "age": 55,
    "sex": 1,
    "cp": 2,
    "trestbps": 140,
    "chol": 250,
    "fbs": 0,
    "restecg": 1,
    "thalach": 150,
    "exang": 0,
    "oldpeak": 1.5,
    "slope": 1,
    "ca": 0,
    "thal": 2
}
```

## Các đặc trưng (Features)

| Feature | Mô tả | Giá trị |
|---------|-------|---------|
| age | Tuổi | Số nguyên |
| sex | Giới tính | 0: Nữ, 1: Nam |
| cp | Loại đau ngực | 0-3 |
| trestbps | Huyết áp nghỉ | mm Hg |
| chol | Cholesterol | mg/dl |
| fbs | Đường huyết > 120 | 0: Không, 1: Có |
| restecg | ECG nghỉ | 0-2 |
| thalach | Nhịp tim tối đa | bpm |
| exang | Đau ngực khi tập | 0: Không, 1: Có |
| oldpeak | ST Depression | mm |
| slope | Độ dốc ST | 0-2 |
| ca | Số mạch máu chính | 0-3 |
| thal | Thalassemia | 0-2 |

## Công nghệ sử dụng

### Backend
- Python 3.13
- Flask + Flask-CORS
- scikit-learn (Random Forest)
- pandas, numpy
- Waitress (Production server)

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide Icons
- Recharts

## Kết quả
- **Accuracy**: 76.72%
- **Model**: Random Forest Classifier
- **Dataset**: 5007 mẫu, 13 features

## Tác giả
Hồ Đại Vĩ - DH23TIN05

## License
MIT License
