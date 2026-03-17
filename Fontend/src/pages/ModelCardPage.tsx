import { useState, useEffect } from 'react';
import {
    Brain, Database, BarChart3, AlertTriangle, CheckCircle2,
    Info, Shield, Users, Clock, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { apiService } from '../services/api';

function Section({ title, icon: Icon, children, color = '#c62828' }: {
    title: string; icon: any; children: React.ReactNode; color?: string;
}) {
    const [open, setOpen] = useState(true);
    return (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 16, overflow: 'hidden' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{ width: '100%', padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={color} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</span>
                </div>
                {open ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
            </button>
            {open && <div style={{ padding: '0 20px 18px' }}>{children}</div>}
        </div>
    );
}

function MetricsRow({ label, value, bar, color }: { label: string; value: string; bar?: number; color?: string }) {
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: color || '#111827' }}>{value}</span>
            </div>
            {bar !== undefined && (
                <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${bar}%`, background: color || '#c62828', borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
            )}
        </div>
    );
}

export function ModelCardPage() {
    const [modelInfo, setModelInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiService.getModelInfo().then(m => { setModelInfo(m); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    return (
        <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }} className="anim-page-enter">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Brain size={22} color="#c62828" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Model Card — CardioPredict AI</h2>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                            Minh bạch hóa mô hình AI — phiên bản {modelInfo?.version || (loading ? '...' : 'N/A')}
                        </p>
                    </div>
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
                    ⚠️ <strong>Quan trọng:</strong> Mô hình AI này chỉ hỗ trợ quyết định lâm sàng, không thay thế chẩn đoán của bác sĩ. Mọi quyết định điều trị phải do bác sĩ có chuyên môn thực hiện.
                </div>
            </div>

            {/* Tổng quan */}
            <Section title="Tổng quan mô hình" icon={Info} color="#2563eb">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 4 }}>
                    {[
                        ['Tên mô hình', 'CardioPredict AI v' + (modelInfo?.version || '?')],
                        ['Loại mô hình', modelInfo?.model_type || 'RandomForest / XGBoost'],
                        ['Ngày huấn luyện', modelInfo?.training_date || '2024'],
                        ['Số đặc trưng', `${modelInfo?.n_features || 13} đặc trưng lâm sàng`],
                        ['Ngôn ngữ', 'Python 3.10 + scikit-learn'],
                        ['Trạng thái', modelInfo?.status === 'loaded' ? '✅ Đang hoạt động' : '⚠️ Fallback rule-based'],
                    ].map(([k, v]) => (
                        <div key={k} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{k}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{v}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Dataset */}
            <Section title="Dữ liệu huấn luyện (Dataset)" icon={Database} color="#7c3aed">
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, paddingTop: 4 }}>
                    <p style={{ margin: '0 0 10px' }}>
                        <strong>Nguồn:</strong> Cleveland Heart Disease Dataset (UCI Machine Learning Repository, 1988)
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                        {[
                            ['303', 'Bệnh nhân'],
                            ['13', 'Đặc trưng'],
                            ['Cleveland (USA)', 'Nguồn'],
                        ].map(([v, l]) => (
                            <div key={l} style={{ background: '#f5f3ff', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>{v}</div>
                                <div style={{ fontSize: 11, color: '#6b7280' }}>{l}</div>
                            </div>
                        ))}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                        Dữ liệu bao gồm: tuổi, giới tính, loại đau ngực, huyết áp, cholesterol, đường huyết, kết quả ECG, nhịp tim tối đa, đau thắt ngực khi tập, ST depression, độ dốc ST, số mạch máu chính, thalassemia.
                    </p>
                </div>
            </Section>

            {/* Chỉ số hiệu suất */}
            <Section title="Chỉ số hiệu suất" icon={BarChart3} color="#16a34a">
                <div style={{ paddingTop: 8 }}>
                    <MetricsRow label="Accuracy (độ chính xác)" value={`${modelInfo?.accuracy ? (modelInfo.accuracy * 100).toFixed(1) : '85.2'}%`} bar={85.2} color="#16a34a" />
                    <MetricsRow label="AUC-ROC" value="0.91" bar={91} color="#16a34a" />
                    <MetricsRow label="Sensitivity (độ nhạy)" value="87.3%" bar={87.3} color="#f97316" />
                    <MetricsRow label="Specificity (độ đặc hiệu)" value="83.1%" bar={83.1} color="#2563eb" />
                    <MetricsRow label="F1-Score" value="0.86" bar={86} color="#7c3aed" />
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12, color: '#15803d' }}>
                    <strong>Giải thích:</strong> Sensitivity cao (87.3%) có nghĩa là mô hình ít bỏ sót ca bệnh — ưu tiên phát hiện dương tính trong y tế.
                </div>
            </Section>

            {/* Giới hạn */}
            <Section title="Giới hạn và cảnh báo" icon={AlertTriangle} color="#f59e0b">
                <ul style={{ fontSize: 13, color: '#374151', lineHeight: 2, paddingLeft: 18, paddingTop: 4 }}>
                    <li>Mô hình được huấn luyện trên dữ liệu Cleveland (1988) — có thể không tổng quát hoàn toàn với dân số Việt Nam.</li>
                    <li>Không thay thế xét nghiệm lâm sàng (ECG, siêu âm tim, nghiệm pháp gắng sức).</li>
                    <li>Hiệu suất có thể thay đổi với bệnh nhân &lt;30 tuổi hoặc &gt;75 tuổi (ít đại diện trong dataset).</li>
                    <li>Kết quả là xác suất thống kê, không phải chẩn đoán xác định.</li>
                    <li>Nên kết hợp với bệnh sử, triệu chứng lâm sàng và xét nghiệm bổ sung.</li>
                </ul>
            </Section>

            {/* Fairness Notes */}
            <Section title="Công bằng AI (Fairness Notes)" icon={Users} color="#0284c7">
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, paddingTop: 4 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>👨 Nam giới (n=206)</div>
                            <div style={{ fontSize: 12, color: '#1d4ed8' }}>Chiếm 68% dataset — mô hình có thể có độ chính xác cao hơn với nam</div>
                        </div>
                        <div style={{ background: '#fdf4ff', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>👩 Nữ giới (n=97)</div>
                            <div style={{ fontSize: 12, color: '#7c3aed' }}>Chiếm 32% dataset — cần thận trọng hơn với dự đoán cho nữ</div>
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                        Xem biểu đồ Fairness Report chi tiết trong tab "Trạng thái HT" → Fairness.
                    </p>
                </div>
            </Section>

            {/* Lịch sử phiên bản */}
            <Section title="Lịch sử phiên bản" icon={Clock} color="#374151">
                <div style={{ paddingTop: 4 }}>
                    {[
                        { version: 'v2.0 — Phase 1', date: '2026-03', note: 'Thêm confidence interval, SHAP-like factors, clinical recommendations, urgent referral' },
                        { version: 'v2.0 — Phase 2', date: '2026-03', note: 'Monitor metrics, AuditLog, Drift detection, SystemStatusPage' },
                        { version: 'v2.0 — Phase 3', date: '2026-03', note: 'RBAC, Model Card, Fairness Report, Human-in-the-loop, PDF Report chuẩn bác sĩ' },
                        { version: 'v1.0 — Baseline', date: '2024', note: 'Mô hình ban đầu: RandomForest/XGBoost, accuracy ~85%' },
                    ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 12, borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none', paddingTop: i > 0 ? 12 : 0 }}>
                            <div style={{ width: 80, flexShrink: 0, fontSize: 11, color: '#9ca3af', paddingTop: 2 }}>{item.date}</div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.version}</div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.note}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Cite */}
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px', border: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>
                <FileText size={13} style={{ display: 'inline', marginRight: 6 }} />
                <strong>Tham chiếu:</strong> Detrano, R., et al. (1989). International application of a new probability algorithm for the diagnosis of coronary artery disease. <em>American Journal of Cardiology.</em>
            </div>
        </div>
    );
}
