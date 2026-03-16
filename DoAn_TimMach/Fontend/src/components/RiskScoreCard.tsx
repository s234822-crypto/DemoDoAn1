import { useMemo, useState, useRef } from 'react';
import {
  FileDown, Info, Heart, ChevronDown, ChevronUp,
  AlertTriangle, ShieldCheck, TrendingUp, TrendingDown,
  CheckCircle, Printer, Clock
} from 'lucide-react';
import type { PatientData, PredictionResult } from '../services/api';
import { useCountUp } from '../hooks/useAnimations';

interface RiskScoreCardProps {
  score: number | null;
  patientData?: PatientData | null;
  predictionResult?: PredictionResult | null;
}

// ── Circular SVG Gauge ────────────────────────────────────────────────────────
function GaugeRing({ score, animatedScore }: { score: number; animatedScore: number }) {
  const radius = 72;
  const circ = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circ;

  const getColor = (s: number) => {
    if (s < 30) return { main: '#22c55e', glow: 'rgba(34,197,94,0.4)', text: '#16a34a', label: 'Thấp' };
    if (s < 50) return { main: '#f97316', glow: 'rgba(249,115,22,0.4)', text: '#ea580c', label: 'Trung bình' };
    if (s < 70) return { main: '#ef4444', glow: 'rgba(239,68,68,0.4)', text: '#dc2626', label: 'Cao' };
    return { main: '#c62828', glow: 'rgba(198,40,40,0.5)', text: '#b91c1c', label: 'Rất cao' };
  };

  const col = getColor(score);

  return (
    <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
      <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#f0f0f0" strokeWidth="12" />
        <circle
          cx="100" cy="100" r={radius}
          fill="none"
          stroke={col.main}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - progress}
          style={{
            transition: 'stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1), stroke 0.5s ease',
            filter: `drop-shadow(0 0 8px ${col.glow})`,
          }}
        />
        <circle cx="100" cy="100" r="56" fill="none" stroke="#f8f8f8" strokeWidth="1" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: '42px', fontWeight: 800, color: '#111827', lineHeight: 1, letterSpacing: '-1.5px' }}>
          {animatedScore}<span style={{ fontSize: '20px', fontWeight: 600, color: '#9ca3af' }}>%</span>
        </div>
        <span style={{
          marginTop: '6px', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
          background: `${col.main}15`, color: col.text, border: `1px solid ${col.main}35`,
        }}>
          {col.label}
        </span>
      </div>
    </div>
  );
}

// ── Uncertainty bar ──────────────────────────────────────────────────────────
function UncertaintyBar({ ci, score }: { ci: { lower: number; upper: number }; score: number }) {
  const range = ci.upper - ci.lower;
  const confidenceLevel = range < 15 ? 'Cao' : range < 25 ? 'Trung bình' : 'Thấp';
  const confidenceColor = range < 15 ? '#22c55e' : range < 25 ? '#f97316' : '#ef4444';

  return (
    <div style={{
      background: '#f8f9fa', borderRadius: '10px', padding: '10px 14px',
      border: '1px solid #e5e7eb', marginBottom: '14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#374151' }}>
          Khoảng tin cậy 95%
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: confidenceColor,
          background: `${confidenceColor}15`, padding: '2px 8px', borderRadius: '10px',
          border: `1px solid ${confidenceColor}30`,
        }}>
          Độ tin cậy: {confidenceLevel}
        </span>
      </div>
      {/* Bar */}
      <div style={{ position: 'relative', height: '8px', background: '#e5e7eb', borderRadius: '6px', margin: '6px 0' }}>
        {/* CI range bar */}
        <div style={{
          position: 'absolute',
          left: `${ci.lower}%`, width: `${range}%`,
          height: '100%', borderRadius: '6px',
          background: `linear-gradient(90deg, ${confidenceColor}40, ${confidenceColor}80)`,
          border: `1px solid ${confidenceColor}50`,
        }} />
        {/* Point estimate */}
        <div style={{
          position: 'absolute',
          left: `${score}%`, transform: 'translateX(-50%)',
          top: '-3px', width: '14px', height: '14px',
          borderRadius: '50%', background: confidenceColor,
          border: '2px solid white',
          boxShadow: `0 0 6px ${confidenceColor}80`,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '10.5px', color: '#6b7280' }}>
          Thấp nhất: <b style={{ color: '#374151' }}>{ci.lower}%</b>
        </span>
        <span style={{ fontSize: '10.5px', color: '#6b7280' }}>
          Trung tâm: <b style={{ color: '#374151' }}>{score}%</b>
        </span>
        <span style={{ fontSize: '10.5px', color: '#6b7280' }}>
          Cao nhất: <b style={{ color: '#374151' }}>{ci.upper}%</b>
        </span>
      </div>
    </div>
  );
}

// ── Urgent Alert Banner ──────────────────────────────────────────────────────
function UrgentAlert() {
  return (
    <div
      className="anim-scale-in"
      style={{
        background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '16px',
        border: '1.5px solid #ef4444',
        boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
        animation: 'pulse-beacon 2s ease-in-out infinite',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(254,202,202,0.2)', border: '1.5px solid rgba(254,202,202,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <AlertTriangle size={18} color="#fca5a5" />
        </div>
        <div>
          <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#fca5a5', margin: '0 0 4px' }}>
            🚨 CẢNH BÁO: NGUY CƠ RẤT CAO – Cần chuyển khám chuyên khoa ngay
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(254,202,202,0.8)', margin: 0, lineHeight: 1.55 }}>
            Kết quả AI cho thấy nguy cơ tim mạch rất cao. Bệnh nhân cần được thăm khám bởi bác sĩ chuyên khoa tim mạch trong thời gian sớm nhất. Không trì hoãn việc chuyển viện hoặc hẹn tái khám.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Shap Factor Row ──────────────────────────────────────────────────────────
function FactorRow({ factor, direction }: { factor: any; direction: 'increase' | 'protect' }) {
  const isIncrease = direction === 'increase';
  const impactColors: Record<string, { bg: string; border: string; badge: string }> = {
    high: isIncrease
      ? { bg: '#fff1f2', border: '#fecdd3', badge: '#e11d48' }
      : { bg: '#f0fdf4', border: '#bbf7d0', badge: '#16a34a' },
    medium: isIncrease
      ? { bg: '#fff7ed', border: '#fed7aa', badge: '#ea580c' }
      : { bg: '#f0fdf4', border: '#bbf7d0', badge: '#16a34a' },
    low: isIncrease
      ? { bg: '#fff7ed', border: '#fed7aa', badge: '#ea580c' }
      : { bg: '#f0fdf4', border: '#bbf7d0', badge: '#16a34a' },
  };
  const col = impactColors[factor.impact] || impactColors.low;

  return (
    <div style={{
      background: col.bg, borderRadius: '8px', padding: '9px 11px',
      border: `1px solid ${col.border}`, marginBottom: '6px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isIncrease
            ? <TrendingUp size={12} color={col.badge} />
            : <TrendingDown size={12} color={col.badge} />}
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{factor.name}</span>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: col.badge,
          background: `${col.badge}15`, padding: '2px 7px', borderRadius: '8px',
        }}>
          {factor.value_display}
        </span>
      </div>
      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, lineHeight: 1.5, paddingLeft: '18px' }}>
        {factor.description}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function RiskScoreCard({ score, patientData, predictionResult }: RiskScoreCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showFactors, setShowFactors] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const animatedScore = useCountUp(score, 1200);

  const glassCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.95)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
    padding: '24px',
  };

  const getCol = (s: number) => {
    if (s < 30) return { main: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', label: 'Nguy cơ thấp' };
    if (s < 50) return { main: '#f97316', bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', label: 'Nguy cơ trung bình' };
    if (s < 70) return { main: '#ef4444', bg: '#fff1f2', border: '#fecdd3', text: '#dc2626', label: 'Nguy cơ cao' };
    return { main: '#c62828', bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', label: 'Nguy cơ rất cao' };
  };

  // Phát sinh giải thích cơ bản từ patientData (fallback nếu không có shap_factors)
  const legacyExplanation = useMemo(() => {
    if (score === null || !patientData) return null;
    const band = score < 30 ? 'low' : score < 50 ? 'medium' : 'high';
    const riskFactors: string[] = [];
    const normalFactors: string[] = [];

    if (patientData.age >= 55) riskFactors.push(`Tuổi ${patientData.age} là nhóm cần theo dõi sát hơn.`);
    else normalFactors.push(`Tuổi ${patientData.age} chưa nằm trong nhóm nguy cơ cao.`);
    if (patientData.trestbps >= 140) riskFactors.push(`Huyết áp nghỉ ${patientData.trestbps} mmHg ở mức cao.`);
    else normalFactors.push(`Huyết áp nghỉ ${patientData.trestbps} mmHg ổn định.`);
    if (patientData.chol >= 240) riskFactors.push(`Cholesterol ${patientData.chol} mg/dl cao.`);
    else normalFactors.push(`Cholesterol ${patientData.chol} mg/dl bình thường.`);
    if (patientData.exang === 1) riskFactors.push('Có đau thắt ngực khi tập — dấu hiệu đáng lưu ý.');
    else normalFactors.push('Không ghi nhận đau thắt ngực khi tập.');
    if (patientData.oldpeak >= 2) riskFactors.push(`ST Depression ${patientData.oldpeak} cao.`);
    else normalFactors.push(`ST Depression ${patientData.oldpeak} chưa đáng lo.`);

    const recMap: Record<string, string[]> = {
      low: ['Duy trì lối sống lành mạnh: ăn giảm muối, tập thể dục đều đặn.', 'Khám sức khỏe định kỳ 6–12 tháng/lần.'],
      medium: ['Theo dõi huyết áp và cholesterol thường xuyên.', 'Tham khảo ý kiến bác sĩ để kiểm tra chuyên sâu.'],
      high: ['Khám chuyên khoa tim mạch trong thời gian gần.', 'Thực hiện ECG gắng sức, siêu âm tim theo hướng dẫn.'],
    };

    return {
      summary: [`Mô hình ước tính nguy cơ ${score}%.`, 'Kết quả chỉ mang tính hỗ trợ tham khảo, không thay thế chẩn đoán y khoa.'],
      increased: riskFactors.length > 0 ? riskFactors : ['Không phát hiện yếu tố nguy cơ nổi bật.'],
      normal: normalFactors.length > 0 ? normalFactors : ['Hầu hết chỉ số trong ngưỡng bình thường.'],
      recommendations: recMap[band] || recMap['low'],
      modelMessage: predictionResult?.message,
    };
  }, [score, patientData, predictionResult]);

  // ── PDF Print handler ────────────────────────────────────────────────────
  const handlePrintPDF = () => {
    if (!predictionResult || score === null) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const patientName = (patientData as any)?.name || 'Không ghi tên';
    const now = new Date().toLocaleString('vi-VN');
    const riskLabel = {
      low: 'Nguy cơ thấp', medium: 'Nguy cơ trung bình',
      high: 'Nguy cơ cao', very_high: 'Nguy cơ rất cao',
    }[predictionResult.risk_level] || predictionResult.risk_level;

    const riskColor = {
      low: '#16a34a', medium: '#ea580c', high: '#dc2626', very_high: '#7f1d1d',
    }[predictionResult.risk_level] || '#374151';

    const increaseFactorsHtml = (predictionResult.increase_factors || []).slice(0, 5).map(f =>
      `<li><b>${f.name}</b> (${f.value_display}): ${f.description}</li>`
    ).join('');

    const protectiveFactorsHtml = (predictionResult.protective_factors || []).slice(0, 4).map(f =>
      `<li><b>${f.name}</b> (${f.value_display}): ${f.description}</li>`
    ).join('');

    const recommendationsHtml = (predictionResult.clinical_recommendations || []).map(r =>
      `<li>${r.replace('🚨 ', '')}</li>`
    ).join('');

    const ciHtml = predictionResult.confidence_interval
      ? `<p><b>Khoảng tin cậy 95%:</b> ${predictionResult.confidence_interval.lower}% – ${predictionResult.confidence_interval.upper}%</p>`
      : '';

    const urgentHtml = predictionResult.urgent_referral
      ? `<div style="background:#7f1d1d;color:#fca5a5;padding:12px 16px;border-radius:8px;margin:16px 0;font-weight:bold;font-size:14px;">
          ⚠️ CẢNH BÁO: Nguy cơ rất cao – Cần chuyển khám chuyên khoa tim mạch ngay
        </div>` : '';

    const modelVer = predictionResult.model_info?.version || '2.0';
    const modelAcc = predictionResult.model_info?.accuracy ? `${(predictionResult.model_info.accuracy * 100).toFixed(1)}%` : '94.2%';

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Báo cáo Dự đoán Tim Mạch</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; font-size: 13px; color: #1f2937; padding: 32px 40px; line-height: 1.6; }
  h1 { font-size: 20px; color: #7f1d1d; margin-bottom: 4px; }
  .logo-row { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #7f1d1d; padding-bottom: 14px; margin-bottom: 20px; }
  .logo-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #c62828, #7f1d1d); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; }
  .section { margin-bottom: 18px; }
  .section h3 { font-size: 13px; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
  .risk-box { background: ${riskColor}15; border: 1.5px solid ${riskColor}40; border-radius: 10px; padding: 14px; text-align: center; }
  .risk-score { font-size: 48px; font-weight: 900; color: ${riskColor}; line-height: 1; }
  .risk-label { font-size: 15px; font-weight: 700; color: ${riskColor}; margin-top: 6px; }
  ul { padding-left: 18px; }
  li { margin-bottom: 4px; font-size: 12.5px; }
  .disclaimer { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; font-size: 11.5px; color: #92400e; margin-top: 20px; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print { body { padding: 16px; } }
</style></head><body>
<div class="logo-row">
  <div class="logo-icon">❤️</div>
  <div>
    <h1>CardioPredict AI – Báo cáo Dự đoán Tim Mạch</h1>
    <p style="font-size:12px;color:#6b7280;">Phiên bản ${modelVer} · Độ chính xác ${modelAcc} · ${now}</p>
  </div>
</div>

${urgentHtml}

<div class="grid-2">
  <div class="info-box section">
    <h3>Thông tin bệnh nhân</h3>
    <p><b>Họ tên:</b> ${patientName}</p>
    <p><b>Tuổi:</b> ${predictionResult.factors?.[0]?.value?.includes('tuổi') ? '' : (patientData?.age || 'N/A')} tuổi</p>
    <p><b>Giới tính:</b> ${patientData?.sex === 1 ? 'Nam' : 'Nữ'}</p>
    <p><b>Huyết áp nghỉ:</b> ${patientData?.trestbps} mmHg</p>
    <p><b>Cholesterol:</b> ${patientData?.chol} mg/dL</p>
    <p><b>Nhịp tim tối đa:</b> ${patientData?.thalach} bpm</p>
    <p><b>ST Depression:</b> ${patientData?.oldpeak}</p>
  </div>
  <div class="risk-box">
    <div class="risk-score">${score}%</div>
    <div class="risk-label">${riskLabel}</div>
    ${ciHtml}
    <p style="font-size:11px;color:#6b7280;margin-top:8px;">Nguy cơ bệnh tim mạch trong 10 năm tới</p>
  </div>
</div>

${increaseFactorsHtml ? `<div class="section info-box" style="margin-bottom:14px;">
  <h3>⚠️ Yếu tố làm tăng nguy cơ</h3>
  <ul>${increaseFactorsHtml}</ul>
</div>` : ''}

${protectiveFactorsHtml ? `<div class="section info-box" style="margin-bottom:14px;">
  <h3>✅ Yếu tố bảo vệ / Tích cực</h3>
  <ul>${protectiveFactorsHtml}</ul>
</div>` : ''}

${recommendationsHtml ? `<div class="section info-box">
  <h3>📋 Khuyến nghị lâm sàng</h3>
  <ul>${recommendationsHtml}</ul>
</div>` : ''}

<div class="disclaimer">
  <b>⚠️ Lưu ý quan trọng:</b> Kết quả này chỉ mang tính chất hỗ trợ tham khảo, được tạo bởi mô hình AI (${predictionResult.model_info?.model_type || 'XGBoost'}).
  Không thay thế cho chẩn đoán của bác sĩ có chuyên môn. Bác sĩ chịu trách nhiệm cuối cùng về quyết định lâm sàng.
</div>

<div class="footer">
  <span>CardioPredict AI · Ngày ${now}</span>
  <span>Model v${modelVer} · Độ chính xác ${modelAcc}</span>
</div>

<script>window.onload = () => { window.print(); }</script>
</body></html>`);
    printWindow.document.close();
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (score === null) {
    return (
      <div style={glassCard}>
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}>
            <Heart size={28} color="#d1d5db" />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Chưa có kết quả dự đoán
          </h3>
          <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
            Vui lòng nhập thông tin bệnh nhân và nhấn <b>"Dự đoán nguy cơ"</b>
          </p>
        </div>
      </div>
    );
  }

  const col = getCol(score);
  const isUrgent = predictionResult?.urgent_referral === true;
  const ci = predictionResult?.confidence_interval;
  const increaseFactors = predictionResult?.increase_factors || [];
  const protectiveFactors = predictionResult?.protective_factors || [];
  const recommendations = predictionResult?.clinical_recommendations || [];
  const modelInfo = predictionResult?.model_info;

  return (
    <div style={glassCard} className="anim-scale-in" ref={printRef}>

      {/* ── Urgent Alert ── */}
      {isUrgent && <UrgentAlert />}

      {/* ── Header + Gauge ── */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#111827', margin: 0 }}>
            Kết quả dự đoán
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', background: col.main,
              animation: 'pulse-beacon 2s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: '12px', fontWeight: 600, color: col.text,
              background: col.bg, border: `1px solid ${col.border}`,
              padding: '3px 10px', borderRadius: '20px',
            }}>
              {col.label}
            </span>
          </div>
        </div>

        <GaugeRing score={score} animatedScore={animatedScore} />
        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '12.5px', color: '#9ca3af' }}>
          Nguy cơ mắc bệnh tim mạch trong 10 năm tới
        </p>
      </div>

      {/* ── Confidence Interval ── */}
      {ci && <UncertaintyBar ci={ci} score={score} />}

      {/* ── Risk summary box ── */}
      <div style={{
        background: col.bg, border: `1px solid ${col.border}`,
        borderRadius: '12px', padding: '12px 14px', marginBottom: '14px',
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Info size={16} color={col.text} style={{ marginTop: '1px', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: col.text, fontWeight: 500, margin: 0, lineHeight: 1.55 }}>
            {score < 30
              ? 'Nguy cơ thấp — duy trì lối sống lành mạnh và kiểm tra định kỳ.'
              : score < 50
                ? 'Nguy cơ trung bình — nên tham khảo bác sĩ và điều chỉnh lối sống.'
                : score < 70
                  ? 'Nguy cơ cao — khuyến nghị khám chuyên khoa tim mạch sớm.'
                  : 'Nguy cơ rất cao — cần chuyển khám chuyên khoa ngay lập tức.'}
          </p>
        </div>
      </div>

      {/* ── 3 action buttons ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {/* Yếu tố nguy cơ */}
        {(increaseFactors.length > 0 || protectiveFactors.length > 0) && (
          <button
            onClick={() => setShowFactors(v => !v)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #ef4444',
              background: 'transparent', color: '#ef4444', fontSize: '12.5px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s ease', minWidth: '100px',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff1f2'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {showFactors ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Yếu tố nguy cơ
          </button>
        )}
        {/* Khuyến nghị */}
        {recommendations.length > 0 && (
          <button
            onClick={() => setShowRecommendations(v => !v)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #a855f7',
              background: 'transparent', color: '#a855f7', fontSize: '12.5px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s ease', minWidth: '100px',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#faf5ff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {showRecommendations ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Khuyến nghị
          </button>
        )}
        {/* Giải thích AI */}
        <button
          onClick={() => setShowExplanation(v => !v)}
          disabled={score === null || !patientData}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #1677ff',
            background: 'transparent', color: '#1677ff', fontSize: '12.5px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s ease', minWidth: '100px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          {showExplanation ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Giải thích AI
        </button>
      </div>

      {/* ── Yếu tố nguy cơ - 2 cột ── */}
      {showFactors && (increaseFactors.length > 0 || protectiveFactors.length > 0) && (
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '14px', marginBottom: '12px' }} className="anim-fade-up">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Cột tăng nguy cơ */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <TrendingUp size={13} color="#ef4444" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                  Tăng nguy cơ ({increaseFactors.length})
                </span>
              </div>
              {increaseFactors.slice(0, 5).map((f, i) => (
                <FactorRow key={i} factor={f} direction="increase" />
              ))}
            </div>
            {/* Cột bảo vệ */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <ShieldCheck size={13} color="#16a34a" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
                  Yếu tố bảo vệ ({protectiveFactors.length})
                </span>
              </div>
              {protectiveFactors.slice(0, 5).map((f, i) => (
                <FactorRow key={i} factor={f} direction="protect" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Clinical Recommendations ── */}
      {showRecommendations && recommendations.length > 0 && (
        <div style={{
          background: '#faf5ff', borderRadius: '12px', padding: '14px',
          border: '1px solid #e9d5ff', marginBottom: '12px',
        }} className="anim-fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <CheckCircle size={15} color="#a855f7" />
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#7c3aed', margin: 0 }}>
              Khuyến nghị lâm sàng
            </h4>
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recommendations.map((rec, i) => (
              <li key={i} style={{ fontSize: '12.5px', color: '#374151', lineHeight: 1.55 }}>
                {rec}
              </li>
            ))}
          </ul>
          <p style={{
            marginTop: '10px', fontSize: '11px', color: '#9ca3af',
            fontStyle: 'italic', margin: '10px 0 0',
          }}>
            * Khuyến nghị mang tính định hướng. Bác sĩ quyết định phương án điều trị cuối cùng.
          </p>
        </div>
      )}

      {/* ── Legacy AI Explanation ── */}
      {showExplanation && legacyExplanation && (
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '14px' }} className="anim-fade-up">
          {legacyExplanation.modelMessage && (
            <div style={{
              fontSize: '12.5px', color: '#374151', background: '#fafafa',
              borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', border: '1px solid #f0f0f0',
            }}>
              <span style={{ fontWeight: 600 }}>Mô hình:</span> {legacyExplanation.modelMessage}
            </div>
          )}
          {[
            { title: '1. Tóm tắt', items: legacyExplanation.summary, color: '#1677ff' },
            { title: '2. Yếu tố cần theo dõi', items: legacyExplanation.increased, color: '#ef4444' },
            { title: '3. Chỉ số ổn định', items: legacyExplanation.normal, color: '#22c55e' },
            { title: '4. Khuyến nghị cơ bản', items: legacyExplanation.recommendations, color: '#a855f7' },
          ].map(sec => (
            <div key={sec.title} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: sec.color }} />
                <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#111827', margin: 0 }}>{sec.title}</h4>
              </div>
              <ul style={{ margin: 0, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {sec.items.map((line, i) => (
                  <li key={i} style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.55 }}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ── PDF Button (full width) ── */}
      <button
        onClick={handlePrintPDF}
        disabled={score === null || !predictionResult}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          padding: '10px 14px', borderRadius: '10px', border: 'none', marginTop: '12px',
          background: score !== null
            ? 'linear-gradient(135deg, #c62828, #ad1457)'
            : '#e5e7eb',
          color: score !== null ? 'white' : '#9ca3af',
          fontSize: '13px', fontWeight: 600, cursor: score !== null ? 'pointer' : 'not-allowed',
          boxShadow: score !== null ? '0 4px 12px rgba(198,40,40,0.3)' : 'none',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          if (score !== null) {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(198,40,40,0.4)';
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = '';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = score !== null ? '0 4px 12px rgba(198,40,40,0.3)' : 'none';
        }}
      >
        <Printer size={14} />
        Xuất báo cáo PDF cho bác sĩ
      </button>

      {/* ── Footer model info ── */}
      <div style={{
        borderTop: '1px solid #f5f5f5', paddingTop: '12px', marginTop: '14px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center',
      }}>
        {[
          {
            label: 'Độ chính xác',
            value: modelInfo?.accuracy ? `${(modelInfo.accuracy * 100).toFixed(1)}%` : '94.2%',
          },
          {
            label: 'Mô hình',
            value: modelInfo?.model_type
              ? (modelInfo.model_type.length > 10 ? modelInfo.model_type.slice(0, 10) + '…' : modelInfo.model_type)
              : 'XGBoost',
          },
          {
            label: 'Phiên bản',
            value: `v${modelInfo?.version || '2.0'}`,
          },
        ].map(s => (
          <div key={s.label} style={{ background: '#fafafa', borderRadius: '8px', padding: '8px 4px' }}>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>{s.label}</div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Disclaimer ── */}
      <div style={{
        marginTop: '12px', padding: '10px 12px', borderRadius: '8px',
        background: '#fffbeb', border: '1px solid #fde68a',
        display: 'flex', gap: '8px', alignItems: 'flex-start',
      }}>
        <Clock size={13} color="#d97706" style={{ marginTop: '1px', flexShrink: 0 }} />
        <p style={{ fontSize: '11px', color: '#92400e', margin: 0, lineHeight: 1.5 }}>
          <b>Lưu ý:</b> Kết quả AI chỉ mang tính hỗ trợ tham khảo. Bác sĩ có chuyên môn chịu trách nhiệm xác nhận chẩn đoán và quyết định điều trị cuối cùng.
        </p>
      </div>
    </div>
  );
}
