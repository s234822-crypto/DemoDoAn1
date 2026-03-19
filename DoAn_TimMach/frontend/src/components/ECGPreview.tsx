import { Play, Pause, ZoomIn } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { EcgMetrics, PatientData } from '../services/api';

interface ECGPreviewProps {
  metrics?: EcgMetrics;
  riskScore?: number | null;
  patientData?: PatientData | null;
  prediction?: number | null;
}

const DEFAULT_METRICS: EcgMetrics = {
  recorded_at: 'Chưa có dữ liệu',
  lead: 'Lead II',
  source: 'demo',
  heart_rate_bpm: 72,
  pr_ms: 160,
  qrs_ms: 98,
  qt_ms: 412,
  qtc_ms: 432,
  rr_interval_ms: 833,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildEcgPath(metrics: EcgMetrics, riskScore: number): string {
  const baseline = 60;
  const heartRate = clamp(metrics.heart_rate_bpm || 72, 45, 160);
  const beatCount = Math.round(clamp(heartRate / 22, 3, 7));
  const beatSpacing = 380 / beatCount;

  const pHeight = clamp(3 + (metrics.pr_ms - 150) * 0.03, 2, 8);
  const qrsHeight = clamp(24 + (metrics.qrs_ms - 90) * 0.35 + riskScore * 0.08, 20, 44);
  const qDepth = clamp(qrsHeight * 0.42, 8, 20);
  const tHeight = clamp(8 + (metrics.qt_ms - 380) * 0.04, 5, 17);
  const stOffset = clamp((riskScore - 50) * 0.05 + (metrics.qtc_ms >= 460 ? 2 : 0), -1.5, 6);

  const seg: string[] = ['M 0 60'];
  for (let i = 0; i < beatCount; i += 1) {
    const x = i * beatSpacing;
    seg.push(`L ${x + 9} ${baseline}`);
    seg.push(`L ${x + 14} ${baseline - pHeight}`);
    seg.push(`L ${x + 20} ${baseline}`);
    seg.push(`L ${x + 29} ${baseline}`);
    seg.push(`L ${x + 33} ${baseline + qDepth}`);
    seg.push(`L ${x + 37} ${baseline - qrsHeight}`);
    seg.push(`L ${x + 42} ${baseline + qrsHeight * 0.82}`);
    seg.push(`L ${x + 48} ${baseline - stOffset}`);
    seg.push(`L ${x + 63} ${baseline - tHeight}`);
    seg.push(`L ${x + 79} ${baseline}`);
  }
  seg.push('L 400 60');
  return seg.join(' ');
}

function sourceLabel(source: string): string {
  if (source === 'derived_from_clinical_inputs') {
    return 'Suy ra từ kết quả chẩn đoán';
  }
  if (source === 'derived_from_form_inputs') {
    return 'Suy ra từ chỉ số chẩn đoán';
  }
  return 'Dữ liệu mẫu hiển thị';
}

function deriveMetricsFromDiagnosis(patientData: PatientData, riskScore?: number | null, prediction?: number | null): EcgMetrics {
  const age = Number(patientData.age);
  const sex = Number(patientData.sex);
  const restecg = Number(patientData.restecg);
  const exang = Number(patientData.exang);
  const oldpeak = Number(patientData.oldpeak);
  const ca = Number(patientData.ca);
  const thalach = Number(patientData.thalach);
  const fbs = Number(patientData.fbs);
  const score = riskScore ?? 35;
  const pred = prediction ?? (score >= 50 ? 1 : 0);

  const predictedMaxHr = Math.max(120, 220 - age);
  const effortRatio = clamp(thalach / predictedMaxHr, 0.35, 1.2);
  const restingHr =
    67
    + (1 - effortRatio) * 22
    + oldpeak * 2.2
    + (exang === 1 ? 7 : 0)
    + (score >= 70 ? 5 : 0)
    + (fbs === 1 ? 2 : 0);

  const heartRate = Math.round(clamp(restingHr, 48, 145));
  const rrMs = 60000 / Math.max(heartRate, 1);
  const rrSqrt = Math.sqrt(rrMs / 1000);

  let prMs = 150 + age * 0.28 + oldpeak * 4.5 + (exang === 1 ? 7 : 0) + ([1, 2].includes(restecg) ? 5 : 0);
  prMs += score >= 70 ? 4 : 0;
  prMs = Math.round(clamp(prMs, 110, 240));

  let qrsMs = 88 + ([1, 2].includes(restecg) ? 9 : 0) + ca * 4 + (pred === 1 ? 6 : 0);
  qrsMs += oldpeak >= 2 ? 3 : 0;
  qrsMs = Math.round(clamp(qrsMs, 75, 160));

  let qtcMs = 408 + age * 0.35 + oldpeak * 4 + ([1, 2].includes(restecg) ? 9 : 0);
  qtcMs += sex === 0 ? 8 : 0;
  qtcMs += (score - 50) * 0.18;
  qtcMs = clamp(qtcMs, 370, 520);

  const qtMs = Math.round(clamp(qtcMs * rrSqrt, 320, 520));
  qtcMs = Math.round(clamp(qtMs / Math.max(rrSqrt, 1e-6), 360, 540));

  return {
    recorded_at: new Date().toLocaleString('vi-VN', { hour12: false }),
    lead: 'Lead II',
    source: 'derived_from_form_inputs',
    heart_rate_bpm: heartRate,
    pr_ms: prMs,
    qrs_ms: qrsMs,
    qt_ms: qtMs,
    qtc_ms: qtcMs,
    rr_interval_ms: Math.round(rrMs),
  };
}

export function ECGPreview({ metrics, riskScore, patientData, prediction }: ECGPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const displayMetrics = useMemo(() => {
    const derived = !metrics && patientData ? deriveMetricsFromDiagnosis(patientData, riskScore, prediction) : undefined;
    return { ...DEFAULT_METRICS, ...(metrics || derived || {}) };
  }, [metrics, patientData, riskScore, prediction]);
  const score = riskScore ?? 35;
  const ecgPath = useMemo(() => buildEcgPath(displayMetrics, score), [displayMetrics, score]);
  const scanDuration = `${clamp((60 / clamp(displayMetrics.heart_rate_bpm, 45, 170)) * 4, 2.2, 4.5).toFixed(2)}s`;

  return (
    <div style={{
      borderRadius: '16px',
      background: 'linear-gradient(145deg, #060d1f, #0a1428)',
      border: '1px solid rgba(255,77,79,0.15)',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>

      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ff4d4f', boxShadow: '0 0 8px rgba(255,77,79,0.8)', animation: isPlaying ? 'pulse-beacon 1.4s ease-in-out infinite' : 'none' }} />
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13.5px', fontWeight: 600 }}>Điện tâm đồ (ECG)</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10.5px', marginTop: '2px' }}>Bản ghi: {displayMetrics.recorded_at} · {displayMetrics.lead}</p>
          <p style={{ color: 'rgba(96,165,250,0.8)', fontSize: '10px', marginTop: '3px' }}>{sourceLabel(displayMetrics.source)}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setIsPlaying(v => !v)}
            title={isPlaying ? 'Tạm dừng' : 'Phát'}
            style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,79,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
          >
            {isPlaying ? <Pause size={13} color="rgba(255,255,255,0.8)" /> : <Play size={13} color="rgba(255,255,255,0.8)" />}
          </button>
          <button
            title="Phóng to"
            style={{ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
          >
            <ZoomIn size={13} color="rgba(255,255,255,0.8)" />
          </button>
        </div>
      </div>

      {/* Waveform area */}
      <div style={{ padding: '16px 18px', position: 'relative' }}>
        {/* Grid background */}
        <div style={{ position: 'absolute', inset: '16px 18px', opacity: 0.15 }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="ecg-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ff4d4f" strokeWidth="0.4" />
              </pattern>
              <pattern id="ecg-grid-large" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#ff4d4f" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ecg-grid)" />
            <rect width="100%" height="100%" fill="url(#ecg-grid-large)" />
          </svg>
        </div>

        {/* ECG Waveform */}
        <div style={{ position: 'relative', height: '100px' }}>
          <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <filter id="ecg-glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Scan line gradient */}
              <linearGradient id="scan-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,77,79,0)" />
                <stop offset="85%" stopColor="rgba(255,77,79,0.12)" />
                <stop offset="100%" stopColor="rgba(255,77,79,0.6)" />
              </linearGradient>
            </defs>

            {/* Ghost trail (lighter duplicate) */}
            <path d={ecgPath} fill="none" stroke="rgba(255,77,79,0.18)" strokeWidth="1.5" strokeLinecap="round" />

            {/* Main waveform */}
            <path
              d={ecgPath}
              fill="none"
              stroke="#ff4d4f"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#ecg-glow)"
              className="anim-ecg-draw"
              style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
            />

            {/* Animated scan line */}
            {isPlaying && (
              <rect
                x="0" y="0" width="8" height="120"
                fill="url(#scan-grad)"
                style={{ animation: `ecg-scan ${scanDuration} linear infinite` }}
              />
            )}
          </svg>
        </div>

        {/* Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {[
              { label: 'Nhịp tim', value: String(displayMetrics.heart_rate_bpm), unit: 'bpm', color: '#ff4d4f' },
              { label: 'QRS', value: String(displayMetrics.qrs_ms), unit: 'ms', color: '#fbbf24' },
              { label: 'QT', value: String(displayMetrics.qt_ms), unit: 'ms', color: '#34d399' },
              { label: 'PR', value: String(displayMetrics.pr_ms), unit: 'ms', color: '#60a5fa' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{m.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: m.color, letterSpacing: '0.5px' }}>
                  {m.value}<span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: '2px' }}>{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <button style={{ fontSize: '11.5px', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', transition: 'all 0.18s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(96,165,250,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(96,165,250,0.1)'; }}
          >
            QTc: {displayMetrics.qtc_ms} ms
          </button>
        </div>
      </div>
    </div>
  );
}
