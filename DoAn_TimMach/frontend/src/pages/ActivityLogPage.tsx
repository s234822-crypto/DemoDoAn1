import { useEffect, useMemo, useState } from 'react';
import { Clock3, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { apiService, type DiagnosisRecord } from '../services/api';

const riskStyles: Record<string, { label: string; bg: string; color: string }> = {
    low: { label: 'Thấp', bg: '#ecfdf5', color: '#059669' },
    medium: { label: 'Trung bình', bg: '#fffbeb', color: '#d97706' },
    high: { label: 'Cao', bg: '#fff7ed', color: '#ea580c' },
    very_high: { label: 'Rất cao', bg: '#fef2f2', color: '#dc2626' },
};

function getRiskStyle(level: string) {
    return riskStyles[level] || { label: level || 'Không xác định', bg: '#f3f4f6', color: '#4b5563' };
}

function formatDate(value: string) {
    try {
        return new Date(value).toLocaleString('vi-VN');
    } catch {
        return value;
    }
}

export function ActivityLogPage() {
    const [records, setRecords] = useState<DiagnosisRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiService.getMyDiagnoses();
            const sorted = [...data].sort((a, b) => {
                return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
            });
            setRecords(sorted);
        } catch (e: any) {
            setError(e?.message || 'Không thể tải nhật ký hoạt động.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const stats = useMemo(() => {
        const total = records.length;
        const highRisk = records.filter(r => ['high', 'very_high'].includes((r.riskLevel || '').toLowerCase())).length;
        const lastAt = records[0]?.createdDate || null;
        return { total, highRisk, lastAt };
    }, [records]);

    return (
        <div style={{ padding: '28px 32px', maxWidth: 980, margin: '0 auto' }} className="anim-page-enter">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Nhật ký hoạt động cá nhân</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Theo dõi các lượt chẩn đoán đã thực hiện gần đây.</p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    style={{
                        padding: '8px 14px',
                        borderRadius: 9,
                        border: '1.5px solid #e5e7eb',
                        background: '#fff',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: '#374151',
                    }}
                >
                    <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    Làm mới
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Tổng lượt chẩn đoán</p>
                    <p style={{ margin: '5px 0 0', fontSize: 22, fontWeight: 700, color: '#111827' }}>{stats.total}</p>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Lượt nguy cơ cao</p>
                    <p style={{ margin: '5px 0 0', fontSize: 22, fontWeight: 700, color: '#c62828' }}>{stats.highRisk}</p>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Hoạt động gần nhất</p>
                    <p style={{ margin: '5px 0 0', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        {stats.lastAt ? formatDate(stats.lastAt) : 'Chưa có dữ liệu'}
                    </p>
                </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock3 size={15} color="#6b7280" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5563' }}>Dòng thời gian chẩn đoán</span>
                </div>

                {loading ? (
                    <div style={{ padding: 26, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Đang tải dữ liệu...</div>
                ) : error ? (
                    <div style={{ padding: 20, margin: 16, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <AlertTriangle size={16} color="#dc2626" style={{ marginTop: 2 }} />
                        <div>
                            <p style={{ margin: 0, color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>Không thể tải nhật ký</p>
                            <p style={{ margin: '2px 0 0', color: '#dc2626', fontSize: 12 }}>{error}</p>
                        </div>
                    </div>
                ) : records.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>
                        <ShieldCheck size={28} color="#d1d5db" style={{ marginBottom: 8 }} />
                        <p style={{ margin: 0, fontSize: 13 }}>Bạn chưa có hoạt động chẩn đoán nào.</p>
                    </div>
                ) : (
                    <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                        {records.slice(0, 30).map((record) => {
                            const risk = getRiskStyle((record.riskLevel || '').toLowerCase());
                            return (
                                <div
                                    key={record.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '170px 1fr auto',
                                        gap: 12,
                                        alignItems: 'center',
                                        padding: '12px 14px',
                                        borderBottom: '1px solid #f3f4f6',
                                    }}
                                >
                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatDate(record.createdDate)}</span>

                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 13, color: '#111827', fontWeight: 600 }}>
                                            Chẩn đoán nguy cơ cho bệnh nhân {record.userName || 'không rõ tên'}
                                        </p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                                            Điểm nguy cơ: <strong>{Number(record.riskScore || 0).toFixed(1)}%</strong> • Tuổi: {record.age} • Chol: {record.chol}
                                        </p>
                                    </div>

                                    <span
                                        style={{
                                            padding: '4px 9px',
                                            borderRadius: 999,
                                            background: risk.bg,
                                            color: risk.color,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {risk.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
