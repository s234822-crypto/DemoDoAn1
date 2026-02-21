/**
 * API Service cho ứng dụng CardioPredict AI
 * Kết nối với Flask backend
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

export interface PatientData {
    name?: string;
    age: number;
    sex: number; // 0: Nữ, 1: Nam
    cp: number; // 0-3: Loại đau ngực
    trestbps: number; // Huyết áp nghỉ
    chol: number; // Cholesterol
    fbs: number; // 0: <= 120 mg/dl, 1: > 120 mg/dl
    restecg: number; // 0-2: ECG nghỉ
    thalach: number; // Nhịp tim tối đa
    exang: number; // 0: Không, 1: Có đau thắt ngực khi tập
    oldpeak: number; // ST Depression
    slope: number; // 0-2: Slope
    ca: number; // 0-3: Số mạch máu chính
    thal: number; // 0-2: Thalassemia
}

export interface RiskFactor {
    name: string;
    value: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
}

export interface PredictionResult {
    prediction: number;
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'very_high';
    message: string;
    factors: RiskFactor[];
}

export interface FeatureImportance {
    name: string;
    key: string;
    importance: number;
}

export interface HealthCheckResponse {
    status: string;
    model_loaded: boolean;
}

class ApiService {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Kiểm tra trạng thái server
     */
    async healthCheck(): Promise<HealthCheckResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`);
            if (!response.ok) {
                throw new Error('Server không phản hồi');
            }
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    /**
     * Gửi dữ liệu bệnh nhân để dự đoán
     */
    async predict(data: PatientData): Promise<PredictionResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Lỗi khi dự đoán');
            }

            return await response.json();
        } catch (error) {
            console.error('Prediction failed:', error);
            throw error;
        }
    }

    /**
     * Lấy độ quan trọng của các đặc trưng
     */
    async getFeatureImportance(): Promise<FeatureImportance[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/feature-importance`);
            if (!response.ok) {
                throw new Error('Không thể lấy dữ liệu feature importance');
            }
            return await response.json();
        } catch (error) {
            console.error('Get feature importance failed:', error);
            throw error;
        }
    }
}

// Export instance mặc định
export const apiService = new ApiService();

// Export class để có thể tạo instance mới nếu cần
export default ApiService;
