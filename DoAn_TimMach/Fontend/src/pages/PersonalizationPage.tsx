import { useEffect, useState } from 'react';
import { SlidersHorizontal, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import {
    type UiPreferences,
    DEFAULT_UI_PREFERENCES,
    readUiPreferences,
    saveUiPreferences,
    applyUiPreferences,
} from '../utils/uiPreferences';

function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{label}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>{description}</p>
            </div>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        </label>
    );
}

export function PersonalizationPage() {
    const [form, setForm] = useState<UiPreferences>(DEFAULT_UI_PREFERENCES);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const prefs = readUiPreferences();
        setForm(prefs);
    }, []);

    const setField = <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        const normalized = saveUiPreferences(form);
        applyUiPreferences(normalized);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleReset = () => {
        setForm(DEFAULT_UI_PREFERENCES);
        const normalized = saveUiPreferences(DEFAULT_UI_PREFERENCES);
        applyUiPreferences(normalized);
        setSaved(false);
    };

    return (
        <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }} className="anim-page-enter">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SlidersHorizontal size={18} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Cá nhân hóa trải nghiệm</h2>
                        <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#6b7280' }}>Tùy chỉnh hiển thị và hành vi hệ thống theo sở thích của bạn.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={handleReset}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                    >
                        <RotateCcw size={13} /> Mặc định
                    </button>
                    <button
                        onClick={handleSave}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
                    >
                        <Save size={13} /> Lưu tùy chọn
                    </button>
                </div>
            </div>

            {saved && (
                <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 9, background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#15803d', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} /> Đã lưu tùy chọn cá nhân hóa.
                </div>
            )}

            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '6px 18px 14px' }}>
                <div style={{ paddingTop: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>Thông tin hiển thị</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>Tên hiển thị sẽ ưu tiên hơn tên lấy từ tài khoản.</p>
                </div>

                <div style={{ marginTop: 10, marginBottom: 4 }}>
                    <label style={{ fontSize: 12, color: '#6b7280' }}>Tên hiển thị</label>
                    <input
                        value={form.displayName}
                        onChange={(e) => setField('displayName', e.target.value)}
                        placeholder="Ví dụ: Bác sĩ Minh"
                        style={{ width: '100%', marginTop: 5, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none' }}
                    />
                </div>

                <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12, color: '#6b7280' }}>Trang mở mặc định sau khi đăng nhập</label>
                    <select
                        value={form.defaultPage}
                        onChange={(e) => setField('defaultPage', e.target.value as UiPreferences['defaultPage'])}
                        style={{ width: '100%', marginTop: 5, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', background: '#fff' }}
                    >
                        <option value="dashboard">Bảng điều khiển</option>
                        <option value="patients">Lịch sử chẩn đoán</option>
                        <option value="reports">Báo cáo</option>
                        <option value="analytics">Phân tích</option>
                        <option value="personalization">Cá nhân hóa</option>
                    </select>
                </div>

                <div style={{ marginTop: 18 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>Hành vi hệ thống</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>Điều chỉnh các tính năng hiển thị theo sở thích của bạn.</p>
                </div>

                <ToggleRow
                    label="Tự cuộn tới phần kết quả dự đoán"
                    description="Khi bấm dự đoán, màn hình sẽ tự động cuộn tới khối kết quả."
                    checked={form.autoScrollPrediction}
                    onChange={(value) => setField('autoScrollPrediction', value)}
                />

                <ToggleRow
                    label="Giảm hiệu ứng chuyển động"
                    description="Tắt bớt animation để đỡ rối mắt và thao tác nhanh hơn."
                    checked={form.reducedMotion}
                    onChange={(value) => setField('reducedMotion', value)}
                />

                <div style={{ paddingTop: 12 }}>
                    <label style={{ fontSize: 12, color: '#6b7280' }}>Cỡ chữ giao diện</label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        {[90, 100, 110].map((size) => (
                            <button
                                key={size}
                                onClick={() => setField('fontScalePercent', size as UiPreferences['fontScalePercent'])}
                                style={{
                                    border: form.fontScalePercent === size ? '1px solid #2563eb' : '1px solid #d1d5db',
                                    background: form.fontScalePercent === size ? '#eff6ff' : '#fff',
                                    color: form.fontScalePercent === size ? '#1d4ed8' : '#374151',
                                    borderRadius: 8,
                                    padding: '7px 10px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                {size === 90 ? 'Nhỏ' : size === 100 ? 'Tiêu chuẩn' : 'Lớn'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
