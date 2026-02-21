import { useState, useEffect } from 'react';
import { Heart, Activity, Users, FileText, BarChart3, User, AlertCircle } from 'lucide-react';
import { PatientForm } from './components/PatientForm';
import { RiskScoreCard } from './components/RiskScoreCard';
import { ECGPreview } from './components/ECGPreview';
import { RiskTrendChart } from './components/RiskTrendChart';
import { FeatureImportanceChart } from './components/FeatureImportanceChart';
import { PatientSummary } from './components/PatientSummary';
import { RecentRecords } from './components/RecentRecords';
import { apiService, type PatientData, type PredictionResult } from './services/api';

// Thông tin người dùng mặc định
const defaultUser = {
  name: 'Bác sĩ Demo',
  email: 'viho317@gmail.com',
  department: 'Khoa Tim mạch'
};

export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async (data: PatientData) => {
    setIsLoading(true);
    setError(null);
    setPatientData(data);

    try {
      const result = await apiService.predict(data);
      setPredictionResult(result);
      setRiskScore(result.risk_score);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra khi dự đoán';
      setError(errorMessage);
      // Fallback: tính toán local nếu server không hoạt động
      const mockScore = calculateLocalRisk(data);
      setRiskScore(mockScore);
      setPredictionResult({
        prediction: mockScore > 50 ? 1 : 0,
        risk_score: mockScore,
        risk_level: mockScore < 30 ? 'low' : mockScore < 50 ? 'medium' : 'high',
        message: mockScore > 50 ? 'CÓ NGUY CƠ mắc bệnh tim' : 'KHÔNG CÓ nguy cơ mắc bệnh tim',
        factors: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Tính toán nguy cơ local (backup khi server offline)
  const calculateLocalRisk = (data: PatientData): number => {
    let risk = 10;
    if (data.age > 60) risk += 20;
    else if (data.age > 50) risk += 15;
    if (data.sex === 1) risk += 10;
    if (data.cp >= 2) risk += 15;
    if (data.trestbps > 140) risk += 15;
    if (data.chol > 240) risk += 15;
    if (data.fbs === 1) risk += 10;
    if (data.thalach < 120) risk += 15;
    if (data.exang === 1) risk += 15;
    if (data.oldpeak > 2) risk += 15;
    risk += data.ca * 10;
    return Math.min(risk, 95);
  };

  return (
    <div className="h-screen w-screen flex bg-white overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#FAFBFC] border-r border-[#E5E7EB] flex flex-col">
        <div className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C62828] rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-base font-medium text-gray-900">Daivid AI</h1>
              <p className="text-xs text-[#6B7280]">Phiên bản 1.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveNav('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeNav === 'dashboard'
              ? 'bg-[#C62828] text-white'
              : 'text-[#6B7280] hover:bg-white hover:text-gray-900'
              }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-sm">Bảng điều khiển</span>
          </button>

          <button
            onClick={() => setActiveNav('patients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeNav === 'patients'
              ? 'bg-[#C62828] text-white'
              : 'text-[#6B7280] hover:bg-white hover:text-gray-900'
              }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm">Bệnh nhân</span>
          </button>

          <button
            onClick={() => setActiveNav('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeNav === 'reports'
              ? 'bg-[#C62828] text-white'
              : 'text-[#6B7280] hover:bg-white hover:text-gray-900'
              }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm">Báo cáo</span>
          </button>

          <button
            onClick={() => setActiveNav('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeNav === 'analytics'
              ? 'bg-[#C62828] text-white'
              : 'text-[#6B7280] hover:bg-white hover:text-gray-900'
              }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm">Phân tích</span>
          </button>
        </nav>

        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="text-xs text-[#6B7280] text-center">
            © 2026 Daivid AI
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-medium text-gray-900">AI Dự đoán bệnh tim mạch</h1>
            <p className="text-sm text-[#6B7280]">Hệ thống dự đoán nguy cơ bệnh tim mạch dựa trên AI</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{defaultUser.name}</p>
              <p className="text-xs text-[#6B7280]">{defaultUser.department}</p>
            </div>
            <div className="w-10 h-10 bg-[#1976D2] rounded-full flex items-center justify-center cursor-pointer">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </header>

        {/* Error Banner removed per request */}

        {/* Two-column layout */}
        <div className="flex-1 overflow-auto bg-[#FAFBFC]">
          <div className="p-8">
            <div className="grid grid-cols-2 gap-8 max-w-[1280px] mx-auto">
              {/* Left Column */}
              <div className="space-y-6">
                <PatientForm onPredict={handlePredict} isLoading={isLoading} />
                {patientData && <PatientSummary data={patientData} />}
                <RecentRecords />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <RiskScoreCard score={riskScore} />
                <ECGPreview />

                {/* Charts Row */}
                <div className="grid grid-cols-2 gap-4">
                  <RiskTrendChart />
                  <FeatureImportanceChart />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
