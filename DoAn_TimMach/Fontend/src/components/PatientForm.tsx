import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Activity, Heart, User, Stethoscope, FlaskConical, ChevronDown } from 'lucide-react';
import type { PatientData } from '../services/api';
import { createRipple } from '../hooks/useAnimations';

interface PatientFormProps {
  onPredict: (data: PatientData) => void;
  isLoading?: boolean;
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(12px)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.95)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
  padding: '22px',
};

// Styled input
function FancyInput({ id, type = 'text', value, onChange, placeholder, error, step }: {
  id: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string; step?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <input
        id={id}
        type={type}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: '10px', fontSize: '13.5px',
          border: `1.5px solid ${error ? '#ef4444' : focused ? '#c62828' : '#e5e7eb'}`,
          background: focused ? '#fff' : '#fafafa',
          outline: 'none', color: '#111827',
          boxShadow: focused ? '0 0 0 3px rgba(198,40,40,0.12)' : 'none',
          transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
          boxSizing: 'border-box',
        }}
      />
      {error && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

// Styled label
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px', letterSpacing: '0.2px' }}>{children}</label>;
}

// Section header
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: `2px solid ${color}20` }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={14} color={color} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{title}</span>
      <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, ${color}30, transparent)` }} />
    </div>
  );
}

// Fancy Select wrapper
function FancySelect({ id, value, onValueChange, placeholder, error, children }: {
  id: string; value: string; onValueChange: (v: string) => void;
  placeholder: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: '10px', fontSize: '13.5px',
            border: `1.5px solid ${error ? '#ef4444' : '#e5e7eb'}`,
            background: '#fafafa', outline: 'none', color: '#111827',
            transition: 'all 0.2s ease', boxSizing: 'border-box', minHeight: '38px',
          } as React.CSSProperties}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
      {error && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

export function PatientForm({ onPredict, isLoading = false }: PatientFormProps) {
  const [formData, setFormData] = useState({
    name: '', age: '', sex: '', cp: '', trestbps: '', chol: '',
    fbs: '', restecg: '', thalach: '', exang: '', oldpeak: '', slope: '', ca: '', thal: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.age || +formData.age < 1 || +formData.age > 120) e.age = 'Tuổi phải từ 1–120';
    if (!formData.sex) e.sex = 'Vui lòng chọn';
    if (!formData.cp) e.cp = 'Vui lòng chọn';
    if (!formData.trestbps || +formData.trestbps < 50 || +formData.trestbps > 250) e.trestbps = '50–250 mmHg';
    if (!formData.chol || +formData.chol < 100 || +formData.chol > 600) e.chol = '100–600 mg/dl';
    if (!formData.fbs) e.fbs = 'Vui lòng chọn';
    if (!formData.restecg) e.restecg = 'Vui lòng chọn';
    if (!formData.thalach || +formData.thalach < 50 || +formData.thalach > 220) e.thalach = '50–220 bpm';
    if (!formData.exang) e.exang = 'Vui lòng chọn';
    if (!formData.oldpeak || +formData.oldpeak < 0 || +formData.oldpeak > 10) e.oldpeak = '0–10';
    if (!formData.slope) e.slope = 'Vui lòng chọn';
    if (formData.ca === '') e.ca = 'Vui lòng chọn';
    if (!formData.thal) e.thal = 'Vui lòng chọn';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onPredict({
      name: formData.name || undefined,
      age: +formData.age, sex: +formData.sex, cp: +formData.cp,
      trestbps: +formData.trestbps, chol: +formData.chol,
      fbs: +formData.fbs, restecg: +formData.restecg,
      thalach: +formData.thalach, exang: +formData.exang,
      oldpeak: +formData.oldpeak, slope: +formData.slope,
      ca: +formData.ca, thal: +formData.thal,
    });
  };

  const set = (field: string, v: string) => {
    setFormData(p => ({ ...p, [field]: v }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const reset = () => {
    setFormData({ name: '', age: '', sex: '', cp: '', trestbps: '', chol: '', fbs: '', restecg: '', thalach: '', exang: '', oldpeak: '', slope: '', ca: '', thal: '' });
    setErrors({});
  };

  return (
    <div style={glassCard}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={18} color="#e11d48" />
        </div>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Thông tin bệnh nhân</h2>
          <p style={{ fontSize: '11.5px', color: '#9ca3af', margin: '1px 0 0' }}>Điền đầy đủ 13 chỉ số lâm sàng để dự đoán</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* ── SECTION 1: Cơ bản ── */}
        <div>
          <SectionHeader icon={User} title="Thông tin cơ bản" color="#1677ff" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Name */}
            <div>
              <FieldLabel>Họ và tên (không bắt buộc)</FieldLabel>
              <FancyInput id="name" value={formData.name} onChange={v => set('name', v)} placeholder="Nhập họ và tên bệnh nhân" />
            </div>
            {/* Age + Gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <FieldLabel>Tuổi (năm) *</FieldLabel>
                <FancyInput id="age" type="number" value={formData.age} onChange={v => set('age', v)} placeholder="45" error={errors.age} />
              </div>
              <div>
                <FieldLabel>Giới tính *</FieldLabel>
                <FancySelect id="sex" value={formData.sex} onValueChange={v => set('sex', v)} placeholder="Chọn" error={errors.sex}>
                  <SelectItem value="0">Nữ</SelectItem>
                  <SelectItem value="1">Nam</SelectItem>
                </FancySelect>
              </div>
            </div>
            {/* Chest pain */}
            <div>
              <FieldLabel>Loại đau ngực *</FieldLabel>
              <FancySelect id="cp" value={formData.cp} onValueChange={v => set('cp', v)} placeholder="Chọn loại đau ngực" error={errors.cp}>
                <SelectItem value="0">Đau thắt ngực điển hình</SelectItem>
                <SelectItem value="1">Đau thắt ngực không điển hình</SelectItem>
                <SelectItem value="2">Đau không do tim</SelectItem>
                <SelectItem value="3">Không triệu chứng</SelectItem>
              </FancySelect>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: Chỉ số lâm sàng ── */}
        <div>
          <SectionHeader icon={Stethoscope} title="Chỉ số lâm sàng" color="#c62828" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <FieldLabel>Huyết áp nghỉ (mmHg) *</FieldLabel>
                <FancyInput id="trestbps" type="number" value={formData.trestbps} onChange={v => set('trestbps', v)} placeholder="120" error={errors.trestbps} />
              </div>
              <div>
                <FieldLabel>Cholesterol (mg/dl) *</FieldLabel>
                <FancyInput id="chol" type="number" value={formData.chol} onChange={v => set('chol', v)} placeholder="200" error={errors.chol} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <FieldLabel>Nhịp tim tối đa (bpm) *</FieldLabel>
                <FancyInput id="thalach" type="number" value={formData.thalach} onChange={v => set('thalach', v)} placeholder="150" error={errors.thalach} />
              </div>
              <div>
                <FieldLabel>ST Depression *</FieldLabel>
                <FancyInput id="oldpeak" type="number" step="0.1" value={formData.oldpeak} onChange={v => set('oldpeak', v)} placeholder="1.0" error={errors.oldpeak} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <FieldLabel>Đường huyết lúc đói *</FieldLabel>
                <FancySelect id="fbs" value={formData.fbs} onValueChange={v => set('fbs', v)} placeholder="Chọn" error={errors.fbs}>
                  <SelectItem value="0">≤ 120 mg/dl (Bình thường)</SelectItem>
                  <SelectItem value="1">&gt; 120 mg/dl (Cao)</SelectItem>
                </FancySelect>
              </div>
              <div>
                <FieldLabel>Đau ngực khi tập *</FieldLabel>
                <FancySelect id="exang" value={formData.exang} onValueChange={v => set('exang', v)} placeholder="Chọn" error={errors.exang}>
                  <SelectItem value="0">Không</SelectItem>
                  <SelectItem value="1">Có</SelectItem>
                </FancySelect>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: Xét nghiệm ── */}
        <div>
          <SectionHeader icon={FlaskConical} title="Kết quả xét nghiệm" color="#a855f7" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <FieldLabel>Kết quả ECG nghỉ *</FieldLabel>
              <FancySelect id="restecg" value={formData.restecg} onValueChange={v => set('restecg', v)} placeholder="Chọn" error={errors.restecg}>
                <SelectItem value="0">Bình thường</SelectItem>
                <SelectItem value="1">Bất thường sóng ST-T</SelectItem>
                <SelectItem value="2">Phì đại thất trái (LVH)</SelectItem>
              </FancySelect>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <FieldLabel>Độ dốc ST (Slope) *</FieldLabel>
                <FancySelect id="slope" value={formData.slope} onValueChange={v => set('slope', v)} placeholder="Chọn" error={errors.slope}>
                  <SelectItem value="0">Dốc lên</SelectItem>
                  <SelectItem value="1">Bằng phẳng</SelectItem>
                  <SelectItem value="2">Dốc xuống</SelectItem>
                </FancySelect>
              </div>
              <div>
                <FieldLabel>Số mạch máu chính *</FieldLabel>
                <FancySelect id="ca" value={formData.ca} onValueChange={v => set('ca', v)} placeholder="Chọn" error={errors.ca}>
                  <SelectItem value="0">0 mạch</SelectItem>
                  <SelectItem value="1">1 mạch</SelectItem>
                  <SelectItem value="2">2 mạch</SelectItem>
                  <SelectItem value="3">3 mạch</SelectItem>
                </FancySelect>
              </div>
            </div>
            <div>
              <FieldLabel>Thalassemia *</FieldLabel>
              <FancySelect id="thal" value={formData.thal} onValueChange={v => set('thal', v)} placeholder="Chọn" error={errors.thal}>
                <SelectItem value="0">Bình thường</SelectItem>
                <SelectItem value="1">Khiếm khuyết cố định</SelectItem>
                <SelectItem value="2">Khiếm khuyết có hồi phục</SelectItem>
              </FancySelect>
            </div>
          </div>
        </div>

        {/* ── Buttons ── */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
          <button
            type="button" onClick={reset} disabled={isLoading}
            style={{
              flex: '0 0 auto', padding: '10px 18px', borderRadius: '10px',
              border: '1.5px solid #e5e7eb', background: 'transparent',
              color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; }}
          >
            Xóa form
          </button>
          <button
            type="submit" disabled={isLoading}
            onClick={(e) => { if (!isLoading) createRipple(e as any); }}
            style={{
              flex: 1, padding: '10px 18px', borderRadius: '10px', border: 'none',
              background: isLoading ? '#e5e7eb' : 'linear-gradient(135deg, #c62828 0%, #ad1457 100%)',
              color: isLoading ? '#9ca3af' : 'white', fontSize: '13.5px', fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: isLoading ? 'none' : '0 4px 16px rgba(198,40,40,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { if (!isLoading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(198,40,40,0.45)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = isLoading ? 'none' : '0 4px 16px rgba(198,40,40,0.35)'; }}
          >
            {isLoading ? (
              <>
                <Heart size={15} fill="currentColor" style={{ animation: 'heartbeat 0.8s ease-in-out infinite' }} />
                AI đang phân tích...
              </>
            ) : (
              <>
                <Activity size={15} />
                Dự đoán nguy cơ
              </>
            )}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', margin: 0 }}>* Các trường có dấu sao là bắt buộc</p>
      </form>
    </div>
  );
}
