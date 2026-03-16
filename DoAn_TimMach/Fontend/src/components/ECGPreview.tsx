import { Play, Pause, ZoomIn, Activity } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function ECGPreview() {
  const [isPlaying, setIsPlaying] = useState(true);
  const scanRef = useRef<SVGRectElement>(null);

  const ecgPath = "M 0 60 L 20 60 L 25 20 L 30 100 L 35 40 L 40 60 L 60 60 L 65 55 L 70 65 L 75 60 L 100 60 L 105 20 L 110 100 L 115 40 L 120 60 L 140 60 L 145 55 L 150 65 L 155 60 L 180 60 L 185 20 L 190 100 L 195 40 L 200 60 L 220 60 L 225 55 L 230 65 L 235 60 L 260 60 L 265 20 L 270 100 L 275 40 L 280 60 L 300 60 L 305 55 L 310 65 L 315 60 L 340 60 L 345 20 L 350 100 L 355 40 L 360 60 L 380 60";

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
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10.5px', marginTop: '2px' }}>Bản ghi: 29/01/2025 14:23 · Lead II</p>
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
                ref={scanRef}
                x="0" y="0" width="8" height="120"
                fill="url(#scan-grad)"
                style={{ animation: 'ecg-scan 3s linear infinite' }}
              />
            )}
          </svg>
        </div>

        {/* Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {[
              { label: 'Nhịp tim', value: '72', unit: 'bpm', color: '#ff4d4f' },
              { label: 'QRS', value: '98', unit: 'ms', color: '#fbbf24' },
              { label: 'QT', value: '412', unit: 'ms', color: '#34d399' },
              { label: 'PR', value: '160', unit: 'ms', color: '#60a5fa' },
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
            Xem chi tiết →
          </button>
        </div>
      </div>
    </div>
  );
}
