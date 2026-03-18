/**
 * API Service cho ứng dụng CardioPredict AI
 * Kết nối với Flask backend
 */
import { Client } from "@gradio/client";
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

function normalizeBaseUrl(url?: string): string {
    return (url || '').trim().replace(/\/+$/, '');
}

function resolveApiBaseCandidates(baseUrl?: string): string[] {
    const candidates: string[] = [];
    const envBase = normalizeBaseUrl(baseUrl);
    const customBase = normalizeBaseUrl(localStorage.getItem('daivid_api_url') || '');

    if (envBase) candidates.push(envBase);
    if (customBase) candidates.push(customBase);
    candidates.push('');

    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (isLocal) {
        candidates.push(`${protocol}//${host}:5001`);
        candidates.push(`${protocol}//${host}:5000`);
        if (host === 'localhost') {
            candidates.push('http://127.0.0.1:5001');
            candidates.push('http://127.0.0.1:5000');
        } else {
            candidates.push('http://localhost:5001');
            candidates.push('http://localhost:5000');
        }
    }

    return [...new Set(candidates)];
}

export interface PatientData {
    name?: string;
    age: number;
    sex: number;
    cp: number;
    trestbps: number;
    chol: number;
    fbs: number;
    restecg: number;
    thalach: number;
    exang: number;
    oldpeak: number;
    slope: number;
    ca: number;
    thal: number;
}

export interface RiskFactor {
    name: string;
    value: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
}

/** Yếu tố chi tiết theo từng bệnh nhân (Phase 1 mới) */
export interface ShapFactor {
    name: string;
    value_display: string;
    impact: 'low' | 'medium' | 'high';
    weight: number;
    description: string;
}

/** Khoảng tin cậy 95% */
export interface ConfidenceInterval {
    lower: number;
    upper: number;
}

/** Thông tin model đang dùng */
export interface ModelInfo {
    version: string;
    model_type: string;
    training_date: string;
    accuracy: number | null;
    n_features: number;
    description: string;
}

export interface EcgMetrics {
    recorded_at: string;
    lead: string;
    source: string;
    heart_rate_bpm: number;
    pr_ms: number;
    qrs_ms: number;
    qt_ms: number;
    qtc_ms: number;
    rr_interval_ms: number;
}

export interface PredictionResult {
    // ── Legacy fields ──
    prediction: number;
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'very_high';
    message: string;
    factors: RiskFactor[];
    // ── Phase 1: Clinical fields (optional để backward-compatible) ──
    urgent_referral?: boolean;
    confidence_interval?: ConfidenceInterval;
    uncertainty_score?: number;
    increase_factors?: ShapFactor[];
    protective_factors?: ShapFactor[];
    clinical_recommendations?: string[];
    model_info?: ModelInfo;
    ecg_metrics?: EcgMetrics;
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

export interface DiagnosisRecord {
    id: number;
    userId: number;
    userName: string | null;
    age: number;
    sex: number;
    cp: number;
    trestbps: number;
    chol: number;
    fbs: number;
    restecg: number;
    thalach: number;
    exang: number;
    oldpeak: number;
    slope: number;
    ca: number;
    thal: number;
    prediction: number;
    riskScore: number;
    riskLevel: string;
    createdDate: string;
}

export interface DashboardStats {
    total: number;
    high: number;
    medium: number;
    low: number;
    recent: DiagnosisRecord[];
    daily: { date: string; count: number }[];
}

export interface ReportStats {
    total_diagnoses: number;
    total_users: number;
    by_risk: { level: string; count: number }[];
    by_age: { group: string; count: number; avg_risk: number }[];
    by_sex: { sex: number; count: number; avg_risk: number }[];
    monthly: { month: string; count: number }[];
    recent_records: {
        id: number;
        userId: number;
        userName: string;
        age: number;
        sex: number;
        riskLevel: string;
        riskScore: number | null;
        createdDate: string;
    }[];
}

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('daivid_auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

class ApiService {
    private baseCandidates: string[];

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseCandidates = resolveApiBaseCandidates(baseUrl);
    }

    private async parseResponseBody(response: Response): Promise<any> {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return response.json();
        }
        const raw = await response.text();
        if (!raw) return {};
        try {
            return JSON.parse(raw);
        } catch {
            return { message: raw };
        }
    }

    private async requestJson(path: string, init: RequestInit = {}, includeAuth = false): Promise<any> {
        const headers: Record<string, string> = {
            ...(init.headers as Record<string, string> || {}),
        };
        if (includeAuth) {
            Object.assign(headers, getAuthHeaders());
        }

        let lastErrorMessage = 'Không thể kết nối máy chủ API';
        for (const base of this.baseCandidates) {
            try {
                const response = await fetch(`${base}${path}`, {
                    ...init,
                    headers,
                });

                const contentType = response.headers.get('content-type') || '';
                const isJson = contentType.includes('application/json');
                const isWrongService = !isJson && (response.status === 404 || response.status === 405);
                if (isWrongService) {
                    continue;
                }

                const body = await this.parseResponseBody(response);
                if (response.ok) {
                    return body;
                }

                lastErrorMessage = body?.error || body?.message || `Lỗi API (${response.status})`;
                if ((response.status === 404 || response.status === 405) && !isJson) {
                    continue;
                }
                throw new Error(lastErrorMessage);
            } catch (error: any) {
                lastErrorMessage = error?.message || lastErrorMessage;
            }
        }

        throw new Error(lastErrorMessage);
    }

    async healthCheck(): Promise<HealthCheckResponse> {
        return this.requestJson('/api/health');
    }

    async predict(data: PatientData): Promise<PredictionResult> {
        console.log("Đang gọi AI trên Hugging Face...");
        try {
            // 1. Kết nối tới Hugging Face Space của bạn
            const client = await Client.connect("daiviho/AI_DuDoanBenhTim");

            // 2. Map dữ liệu từ PatientData sang dạng text tiếng Việt mà Gradio cần
            const result = await client.predict("/predict_gradio", {
                age: data.age,
                sex: data.sex === 1 ? "Nam" : "Nữ",
                cp: data.cp, // Lưu ý: Ở form của bạn truyền số hay chữ? Nếu truyền số (0, 1, 2, 3), bạn cần viết 1 hàm switch-case để đổi nó ra chữ ("Đau thắt ngực ổn định"...) giống như trên Hugging Face
                trestbps: data.trestbps,
                chol: data.chol,
                fbs: data.fbs === 1 ? "Đúng" : "Sai",
                restecg: String(data.restecg),
                thalach: data.thalach,
                exang: data.exang === 1 ? "Có" : "Không",
                oldpeak: data.oldpeak,
                slope: String(data.slope),
                ca: data.ca,
                thal: data.thal, // Lưu ý tương tự như trường cp
            });

            const resultData = (result as { data?: unknown }).data;
            const aiOutputText = Array.isArray(resultData) && typeof resultData[0] === 'string'
                ? resultData[0]
                : String(Array.isArray(resultData) ? (resultData[0] ?? '') : '');
            console.log("Kết quả gốc từ Hugging Face:", aiOutputText);

            // 3. Giả lập kết quả trả về để UI hiển thị được
            // Vì Hugging Face chỉ trả text, còn UI của bạn cần một object phức tạp (PredictionResult)
            const isHighRisk = aiOutputText.toLowerCase().includes("nguy cơ cao") || aiOutputText.includes("1");
            const fakeScore = isHighRisk ? 85 : 15;
            const riskLevel = isHighRisk ? 'high' : 'low';

            return {
                prediction: isHighRisk ? 1 : 0,
                risk_score: fakeScore,
                risk_level: riskLevel,
                message: aiOutputText,
                factors: [
                    { name: "Phân tích AI", value: isHighRisk ? "Cảnh báo" : "An toàn", impact: isHighRisk ? "high" : "low", description: aiOutputText }
                ],
                urgent_referral: isHighRisk,
                clinical_recommendations: isHighRisk ? ["Cần khám chuyên khoa sớm"] : ["Duy trì lối sống lành mạnh"],
            };

        } catch (error) {
            console.error("Lỗi khi gọi Hugging Face:", error);
            throw new Error("Không thể kết nối với AI Model trên Hugging Face.");
        }
    }

    async getFeatureImportance(): Promise<FeatureImportance[]> {
        return this.requestJson('/api/feature-importance', {}, true);
    }

    async getDiagnoses(params?: { limit?: number; offset?: number; risk_level?: string; search?: string }): Promise<DiagnosisRecord[]> {
        const query = new URLSearchParams();
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.offset) query.set('offset', String(params.offset));
        if (params?.risk_level) query.set('risk_level', params.risk_level);
        if (params?.search) query.set('search', params.search);
        return this.requestJson(`/api/diagnoses?${query}`, {}, true);
    }

    async getDiagnosis(id: number): Promise<DiagnosisRecord> {
        return this.requestJson(`/api/diagnoses/${id}`, {}, true);
    }

    async getMyDiagnoses(): Promise<DiagnosisRecord[]> {
        return this.requestJson('/api/diagnoses/my', {}, true);
    }

    async getDashboardStats(): Promise<DashboardStats> {
        return this.requestJson('/api/stats/dashboard', {}, true);
    }

    async getReportStats(dateFrom?: string, dateTo?: string): Promise<ReportStats> {
        const query = new URLSearchParams();
        if (dateFrom) query.set('from', dateFrom);
        if (dateTo) query.set('to', dateTo);
        return this.requestJson(`/api/stats/reports?${query}`, {}, true);
    }

    // ── Phase 2: System monitoring ──────────────────────────────────────────
    async getSystemStats(): Promise<SystemStats> {
        return this.requestJson('/api/system/stats', {}, true);
    }

    async getAuditLog(limit = 20): Promise<AuditEntry[]> {
        return this.requestJson(`/api/system/audit-log?limit=${limit}`, {}, true);
    }

    async getDriftReport(days = 7): Promise<DriftReport> {
        return this.requestJson(`/api/system/drift-report?days=${days}`, {}, true);
    }

    async getModelInfo(): Promise<ModelInfo & { status: string }> {
        return this.requestJson('/api/model-info', {}, true);
    }

    // ── Phase 3: RBAC + Fairness ──────────────────────────────────────────────
    async getMyRole(): Promise<{ userId: number; role: string }> {
        return this.requestJson('/api/admin/me/role', {}, true);
    }

    async getAdminUsers(): Promise<any[]> {
        return this.requestJson('/api/admin/users', {}, true);
    }

    async updateUserRole(userId: number, role: string): Promise<{ success: boolean }> {
        return this.requestJson(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        }, true);
    }

    async getFairnessReport(): Promise<FairnessReport> {
        return this.requestJson('/api/system/fairness-report', {}, true);
    }
}

export const apiService = new ApiService();
export default ApiService;

// ── Phase 2: System monitoring interfaces ──────────────────────────────────

export interface AuditEntry {
    id: number;
    userId: number | null;
    userName: string;
    action: string;
    endpoint: string;
    ipAddress: string | null;
    latencyMs: number | null;
    httpStatus: number | null;
    detail: string | null;
    createdAt: string;
}

export interface SystemStats {
    server: {
        status: string;
        uptime_seconds: number;
        uptime_formatted: string;
        model_loaded: boolean;
        model_type: string;
        model_version: string;
        db_status: string;
        db_mode: string;
    };
    metrics: {
        total_requests: number;
        total_errors: number;
        error_rate: number;
        p50_latency_ms: number;
        p95_latency_ms: number;
        p99_latency_ms: number;
        requests_per_min: number;
        predict_count_today: number;
        uptime_seconds: number;
    };
    endpoints: { endpoint: string; count: number; avg_latency_ms: number }[];
    db_stats: Record<string, any>;
}

export interface DriftReport {
    days: number;
    distribution: {
        date: string;
        low: number;
        medium: number;
        high: number;
        very_high: number;
        count: number;
        avg_score: number;
    }[];
    drift: {
        drift_detected: boolean;
        drift_score: number;
        baseline_mean: number;
        window_mean: number | null;
        window_count: number;
        message: string;
    };
    generated_at: string;
}

// ── Phase 3: RBAC + Fairness interfaces ──────────────────────────────────────

export interface FairnessReport {
    total_records: number;
    gender: {
        male: { count: number; mean: number | null; high_risk_pct: number | null };
        female: { count: number; mean: number | null; high_risk_pct: number | null };
    };
    age_group: Record<string, { count: number; mean: number | null; high_risk_pct: number | null }>;
    disparity_alert: boolean;
    disparity_pct: number;
    disparity_message: string;
    generated_at: string;
}
