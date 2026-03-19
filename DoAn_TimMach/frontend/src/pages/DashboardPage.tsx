import { useState, useEffect, useRef } from 'react';
import { Activity, Brain, Sparkles, Shield, Info, AlertTriangle, TrendingUp, TrendingDown, Users, Heart, Zap, PhoneCall } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PatientForm } from '../components/PatientForm';
import { RiskScoreCard } from '../components/RiskScoreCard';
import { ECGPreview } from '../components/ECGPreview';
import { PatientSummary } from '../components/PatientSummary';
import { apiService, type PatientData, type PredictionResult, type DashboardStats } from '../services/api';
import { readUiPreferences } from '../utils/uiPreferences';

// ── AI Reasoning steps ────────────────────────────────────────────
const AI_STEPS = [
  'Thu thập dữ liệu bệnh nhân...',
  'Phân tích chỉ số tim mạch...',
  'So sánh với dữ liệu huấn luyện...',
  'Tính toán xác suất nguy cơ...',
  'Hoàn tất dự đoán...',
];

// ── AI Processing Overlay ─────────────────────────────────────────
function AIProcessingOverlay({ currentStep }: { currentStep: number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.95)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
      padding: '32px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px',
    }}>

      {/* Spinner */}
      <div style={{ position: 'relative', width: '72px', height: '72px' }}>
        {/* Pulsing ring */}
        <div className="anim-ring-pulse" style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid #c62828', transformOrigin: 'center',
        }} />
        {/* Icon container */}
        <div style={{
          position: 'absolute', inset: '6px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(198,40,40,0.18)',
        }}>
          <Brain size={28} color="#c62828" className="anim-heartbeat" />
        </div>
        {/* Spinning arc */}
        <svg className="anim-spin-slow" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 72 72" width="72" height="72">
          <circle cx="36" cy="36" r="33" fill="none" stroke="#c62828" strokeWidth="2.5"
            strokeDasharray="52 155" strokeLinecap="round" />
        </svg>
      </div>

      {/* Heading */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>AI đang phân tích dữ liệu</span>
          <span className="anim-blink-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c62828', display: 'inline-block' }} />
        </div>
        <p style={{ fontSize: '12.5px', color: '#9ca3af', margin: 0 }}>Mô hình XGBoost đang xử lý 13 chỉ số lâm sàng</p>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: '320px' }}>
        <div style={{
          height: '6px', borderRadius: '8px',
          background: '#f3f4f6', overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div
            key={`bar-${currentStep}`}
            className="anim-ai-bar"
            style={{
              height: '100%', borderRadius: '8px',
              background: 'linear-gradient(90deg, #c62828, #ad1457)',
              boxShadow: '0 0 8px rgba(198,40,40,0.4)',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{Math.min(currentStep + 1, AI_STEPS.length)}/{AI_STEPS.length} bước</span>
          <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>
            {currentStep < AI_STEPS.length - 1 ? 'Đang xử lý...' : 'Hoàn tất'}
          </span>
        </div>
      </div>

      {/* Reasoning steps */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {AI_STEPS.map((step, i) => {
          const done = i <= currentStep;
          const active = i === currentStep;
          return (
            <div
              key={i}
              className={done ? 'anim-step-appear' : ''}
              style={{
                display: done ? 'flex' : 'none',
                alignItems: 'center', gap: '10px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: active ? 'linear-gradient(90deg, #fff1f2, #ffe4e6)' : '#fafafa',
                border: `1px solid ${active ? '#fecdd3' : '#f0f0f0'}`,
                transition: 'all 0.25s ease',
              }}
            >
              {/* Icon */}
              {active ? (
                <div style={{ width: '18px', height: '18px', flexShrink: 0 }}>
                  <svg className="anim-spin-slow" viewBox="0 0 18 18" width="18" height="18">
                    <circle cx="9" cy="9" r="7" fill="none" stroke="#c62828" strokeWidth="2"
                      strokeDasharray="12 34" strokeLinecap="round" />
                  </svg>
                </div>
              ) : (
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
              )}
              <span style={{
                fontSize: '13px', fontWeight: active ? 600 : 500,
                color: active ? '#c62828' : '#374151',
              }}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared card style ──────────────────────────────────────────────
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(12px)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
};

// ── Tiny stat card ─────────────────────────────────────────────────
function StatMini({ icon: Icon, label, value, color, trend }: { icon: any; label: string; value: string | number; color: string; trend?: 'up' | 'down' | null }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...glassCard,
        padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0,
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
        transform: hov ? 'translateY(-4px) scale(1.015)' : 'none',
        boxShadow: hov ? `0 12px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)` : glassCard.boxShadow as string,
      }}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{value}</div>
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: trend === 'up' ? '#ef4444' : '#22c55e', fontSize: '11px', fontWeight: 600 }}>
          {trend === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const predictionResultRef = useRef<HTMLDivElement | null>(null);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // AI processing overlay state
  const [aiPhase, setAiPhase] = useState<'idle' | 'processing' | 'done'>('idle');
  const [reasoningStep, setReasoningStep] = useState(-1);

  const scrollToPredictionResult = () => {
    predictionResultRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const shouldAutoScroll = () => readUiPreferences().autoScrollPrediction;

  useEffect(() => {
    apiService.getDashboardStats().then(setStats).catch(() => { });
  }, []);

  const handlePredict = async (data: PatientData) => {
    // 1. Immediately scroll to result section and start AI overlay
    setAiPhase('processing');
    setReasoningStep(0);
    setIsLoading(true);
    setPredictionError(null);
    setPatientData(data);
    if (shouldAutoScroll()) {
      requestAnimationFrame(scrollToPredictionResult);
    }

    // 2. Run reasoning steps concurrently with the API call
    const STEP_DELAY = 700; // ms per step
    const stepPromise = new Promise<void>((resolve) => {
      let step = 0;
      const ticker = setInterval(() => {
        step += 1;
        if (step < AI_STEPS.length) {
          setReasoningStep(step);
        } else {
          clearInterval(ticker);
          resolve();
        }
      }, STEP_DELAY);
    });

    // 3. Start API call in parallel
    const apiPromise = apiService.predict(data);

    try {
      // 4. Wait for BOTH the steps animation AND the API to complete
      const [result] = await Promise.all([apiPromise, stepPromise]);
      setPredictionResult(result);
      setRiskScore(result.risk_score);
      apiService.getDashboardStats().then(setStats).catch(() => { });
    } catch (error: any) {
      await stepPromise; // Still finish the animation even on error
      setRiskScore(null);
      setPredictionResult(null);
      setPredictionError(error?.message || 'Không thể lưu kết quả chẩn đoán. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
      setAiPhase('done');
      if (shouldAutoScroll()) {
        requestAnimationFrame(scrollToPredictionResult);
      }
    }
  };

  const riskLevelLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Thấp';
      case 'medium': return 'Trung bình';
      case 'high': return 'Cao';
      case 'very_high': return 'Rất cao';
      default: return level;
    }
  };

  const riskBadgeStyle = (level: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string; border: string }> = {
      low: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
      medium: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
      high: { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3' },
      very_high: { bg: '#4c0519', color: '#fda4af', border: '#9f1239' },
    };
    const s = map[level] || map['medium'];
    return { background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '20px', padding: '2px 10px', fontSize: '11.5px', fontWeight: 600 };
  };

  const dailyChartData = (stats?.daily || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    count: item.count,
  }));

  const totalDiagnoses = stats?.total ?? 0;
  const highRiskCount = stats?.recent?.filter(d => d.riskLevel === 'high' || d.riskLevel === 'very_high').length ?? 0;
  const todayCount = dailyChartData.length > 0 ? (dailyChartData[dailyChartData.length - 1]?.count ?? 0) : 0;

  return (
    <div style={{ padding: '24px 28px 32px', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ───── HERO BANNER ───── */}
      <div
        className="anim-fade-up"
        style={{
          marginBottom: '24px', borderRadius: '20px', padding: '28px 32px',
          background: 'linear-gradient(135deg, #c62828 0%, #ad1457 55%, #880e4f 100%)',
          boxShadow: '0 16px 48px rgba(198,40,40,0.35), 0 4px 16px rgba(0,0,0,0.12)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Floating blobs */}
        <div style={{ position: 'absolute', right: '-30px', top: '-50px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', animation: 'float-blob 6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', right: '120px', bottom: '-60px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', animation: 'float-blob 8s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', left: '55%', top: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', animation: 'float-blob 10s ease-in-out infinite' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <Brain size={26} color="white" />
                </div>
                <div>
                  <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '22px', lineHeight: 1.2, margin: 0 }}>AI Dự đoán nguy cơ bệnh tim</h2>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '3px 0 0' }}>Mô hình XGBoost • Độ chính xác 94.2% • 13 chỉ số phân tích</p>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13.5px', maxWidth: '520px', lineHeight: 1.6, margin: '0 0 16px' }}>
                Nhập thông tin lâm sàng bên dưới. Hệ thống AI sẽ phân tích và đưa ra dự đoán nguy cơ tim mạch tức thì.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[
                  { icon: Sparkles, text: 'Dự đoán tức thì' },
                  { icon: Shield, text: 'Dữ liệu bảo mật' },
                  { icon: Activity, text: '13 chỉ số lâm sàng' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', borderRadius: '20px', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Icon size={13} color="rgba(255,255,255,0.85)" />
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 500 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Accuracy badge */}
            <div style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)', borderRadius: '16px', padding: '18px 22px', border: '1px solid rgba(255,255,255,0.2)', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ color: '#fff', fontSize: '36px', fontWeight: 800, lineHeight: 1, letterSpacing: '-1px' }}>94.2<span style={{ fontSize: '18px' }}>%</span></div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', marginTop: '4px' }}>Độ chính xác</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', marginTop: '2px' }}>XGBoost v2</div>
            </div>
          </div>
        </div>
      </div>

      {/* ───── MINI STATS ROW ───── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }} className="anim-fade-up anim-delay-1">
        <StatMini icon={Users} label="Tổng chẩn đoán" value={totalDiagnoses} color="#1677ff" />
        <StatMini icon={Heart} label="Nguy cơ cao (gần đây)" value={highRiskCount} color="#ef4444" trend={highRiskCount > 2 ? 'up' : 'down'} />
        <StatMini icon={Zap} label="Chẩn đoán hôm nay" value={todayCount} color="#a855f7" />
        <StatMini icon={Activity} label="Độ chính xác AI" value="94.2%" color="#16a34a" />
      </div>

      {/* ───── MAIN 2-COL: Form + Result ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '55fr 45fr', gap: '20px' }}>
        {/* LEFT: Form + ECG */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="anim-fade-up anim-delay-1">
            <PatientForm onPredict={handlePredict} isLoading={isLoading} />
          </div>
          {predictionError && (
            <div style={{ ...glassCard, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', borderLeft: '3px solid #ef4444' }} className="anim-shake">
              <AlertTriangle size={18} color="#ef4444" style={{ marginTop: '1px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#b91c1c', marginBottom: '2px' }}>Không thể lưu chẩn đoán</p>
                <p style={{ fontSize: '12.5px', color: '#dc2626' }}>{predictionError}</p>
              </div>
            </div>
          )}
          {patientData && (
            <div className="anim-fade-up">
              <PatientSummary data={patientData} />
            </div>
          )}
          <div className="anim-fade-up anim-delay-3">
            <ECGPreview riskScore={riskScore} patientData={patientData} prediction={predictionResult?.prediction ?? null} />
          </div>
        </div>

        {/* RIGHT: Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            ref={predictionResultRef}
            id="prediction-result-section"
            className="anim-fade-up anim-delay-2"
            style={{ scrollMarginTop: '80px', scrollMarginBottom: '40px' }}
          >
            {aiPhase === 'processing' ? (
              <AIProcessingOverlay currentStep={reasoningStep} />
            ) : (
              <div className={aiPhase === 'done' ? 'anim-scale-in' : ''}>
                <RiskScoreCard score={riskScore} patientData={patientData} predictionResult={predictionResult} />
              </div>
            )}
          </div>

          {/* Risk factors */}
          {predictionResult && predictionResult.factors.length > 0 && (
            <div style={{ ...glassCard, padding: '20px' }} className="anim-fade-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Info size={15} color="#e11d48" />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Yếu tố nguy cơ phát hiện</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {predictionResult.factors.map((factor, idx) => {
                  const colors = factor.impact === 'high' ? { bg: '#fff1f2', border: '#fecdd3', text: '#e11d48', label: '#9f1239' }
                    : factor.impact === 'medium' ? { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', label: '#9a3412' }
                      : { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', label: '#1e40af' };
                  return (
                    <div key={idx} style={{ background: colors.bg, borderRadius: '10px', padding: '10px 12px', border: `1px solid ${colors.border}`, transition: 'all 0.2s ease' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
                      className={`anim-fade-up anim-delay-${Math.min(idx + 1, 8)}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827' }}>{factor.name}</span>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: colors.text, background: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: '10px' }}>{factor.value}</span>
                      </div>
                      <p style={{ fontSize: '11.5px', color: '#6b7280', margin: 0 }}>{factor.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          {predictionResult && (
            <div style={{
              ...glassCard,
              padding: '16px 18px',
              borderLeft: `3px solid ${predictionResult.risk_score >= 70 ? '#c62828' : predictionResult.risk_score >= 50 ? '#ef4444' : predictionResult.risk_score >= 30 ? '#f97316' : '#22c55e'}`,
            }} className="anim-fade-up">
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>💡 Khuyến nghị từ AI</h4>
              {/* Dùng data thật từ API nếu có, fallback về text cũ */}
              {predictionResult.clinical_recommendations && predictionResult.clinical_recommendations.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {predictionResult.clinical_recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} style={{ fontSize: '12.5px', color: '#374151', lineHeight: 1.6 }}>{rec}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, margin: 0 }}>
                  {predictionResult.risk_score >= 70 ? 'Nguy cơ rất cao. Cần khám chuyên khoa tim mạch ngay lập tức.'
                    : predictionResult.risk_score >= 50 ? 'Nguy cơ cao. Khuyến nghị khám chuyên khoa tim mạch sớm.'
                      : predictionResult.risk_score >= 30 ? 'Nguy cơ trung bình. Nên tham khảo ý kiến bác sĩ và điều chỉnh lối sống.'
                        : 'Nguy cơ thấp. Tiếp tục duy trì lối sống lành mạnh và kiểm tra định kỳ.'}
                </p>
              )}
              {/* Nút chuyển khám cho bệnh nhân nguy cơ rất cao */}
              {predictionResult.urgent_referral && (
                <div style={{
                  marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #7f1d1d15, #991b1b10)',
                  border: '1.5px solid #fca5a5',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <PhoneCall size={16} color="#dc2626" />
                  <div>
                    <p style={{ fontSize: '12.5px', fontWeight: 700, color: '#991b1b', margin: '0 0 2px' }}>
                      Liên hệ chuyển khám chuyên khoa
                    </p>
                    <p style={{ fontSize: '11.5px', color: '#7f1d1d', margin: 0 }}>
                      Hotline Tim mạch: <b>1800 599 940</b> · Hoặc đến khoa Tim mạch gần nhất
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ───── BOTTOM: Chart + Recent ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>

        {/* Daily chart */}
        <div style={{ ...glassCard, padding: '20px' }} className="anim-fade-up anim-delay-4 anim-hover-lift">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Lượt chẩn đoán theo ngày</h3>
              <p style={{ fontSize: '11.5px', color: '#9ca3af', margin: '2px 0 0' }}>7 ngày gần nhất</p>
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={15} color="#e11d48" />
            </div>
          </div>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyChartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c62828" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#c62828" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10.5 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #f0f0f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                  formatter={(v: number) => [`${v} lượt`, 'Chẩn đoán']}
                />
                <Area type="monotone" dataKey="count" stroke="#c62828" strokeWidth={2.5} fill="url(#dailyGrad)"
                  dot={{ r: 3.5, fill: '#c62828', strokeWidth: 0 }} activeDot={{ r: 5.5, fill: '#c62828', stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={true} animationDuration={1400} animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
              <Activity size={32} color="#e5e7eb" />
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>Chưa có dữ liệu chẩn đoán</span>
            </div>
          )}
        </div>

        {/* Recent diagnoses */}
        <div style={{ ...glassCard, padding: '20px' }} className="anim-fade-up anim-delay-5 anim-hover-lift">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Chẩn đoán gần đây</h3>
              <p style={{ fontSize: '11.5px', color: '#9ca3af', margin: '2px 0 0' }}>Kết quả mới nhất</p>
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={15} color="#2563eb" />
            </div>
          </div>
          {stats?.recent && stats.recent.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.recent.slice(0, 6).map((d, idx) => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: '10px',
                  background: '#fafafa', border: '1px solid #f0f0f0',
                  transition: 'all 0.2s ease', cursor: 'default',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.background = '#fff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; (e.currentTarget as HTMLDivElement).style.background = '#fafafa'; }}
                  className={`anim-fade-up anim-delay-${Math.min(idx + 1, 8)}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#4338ca' }}>#{d.id}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.userName || 'Ẩn danh'} · {d.sex === 1 ? 'Nam' : 'Nữ'}, {d.age} tuổi
                      </p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: '1px 0 0' }}>{new Date(d.createdDate).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  <span style={riskBadgeStyle(d.riskLevel)}>
                    {d.riskScore}% · {riskLevelLabel(d.riskLevel)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
              <Users size={32} color="#e5e7eb" />
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>Chưa có dữ liệu chẩn đoán</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
