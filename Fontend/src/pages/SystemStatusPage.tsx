import { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';
import {
    Activity, Server, Database, AlertTriangle, CheckCircle2,
    Clock, Zap, Shield, RefreshCw, Play, ChevronDown, ChevronUp,
} from 'lucide-react';
import { apiService, type SystemStats, type AuditEntry, type DriftReport } from '../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
function StatusDot({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: ok ? '#22c55e' : '#ef4444',
                boxShadow: ok ? '0 0 6px #22c55e99' : '0 0 6px #ef444499',
                display: 'inline-block',
            }} />
            {label}
        </span>
    );
}

function MetricCard({ icon: Icon, label, value, sub, color = '#c62828' }: {
    icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
    return (
        <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
            padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={18} color={color} />
            </div>
            <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{label}</div>
                {sub && <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>}
            </div>
        </div>
    );
}

// ── Quick Test ────────────────────────────────────────────────────────────────
function QuickTest() {
    const [state, setState] = useState<'idle' | 'running' | 'ok' | 'error'>('idle');
    const [result, setResult] = useState<{ latency: number; score: number; level: string } | null>(null);

    const runTest = async () => {
        setState('running');
        const t0 = performance.now();
        try {
            const res = await apiService.predict({
                age: 55, sex: 1, cp: 0, trestbps: 145, chol: 260,
                fbs: 0, restecg: 1, thalach: 125, exang: 1,
                oldpeak: 2.1, slope: 2, ca: 1, thal: 2,
            });
            const latency = Math.round(performance.now() - t0);
            setResult({ latency, score: res.risk_score, level: res.risk_level });
            setState('ok');
        } catch {
            setState('error');
        }
    };

    const ringColor = state === 'ok' ? '#22c55e' : state === 'error' ? '#ef4444' : state === 'running' ? '#3b82f6' : '#6b7280';
    const levelMap: Record<string, string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', very_high: 'Rất cao' };

    return (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Kiểm tra API nhanh</h3>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>Gọi /api/predict với dữ liệu mẫu</p>
                </div>
                <button
                    onClick={runTest}
                    disabled={state === 'running'}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: state === 'running' ? '#e5e7eb' : '#c62828',
                        color: state === 'running' ? '#9ca3af' : '#fff',
                        fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                    }}
                >
                    <Play size={13} />
                    {state === 'running' ? 'Đang gọi API...' : 'Chạy Test'}
                </button>
            </div>

            {state !== 'idle' && (
                <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: state === 'ok' ? '#f0fdf4' : state === 'error' ? '#fef2f2' : '#eff6ff',
                    border: `1px solid ${state === 'ok' ? '#bbf7d0' : state === 'error' ? '#fecaca' : '#bfdbfe'}`,
                }}>
                    {state === 'ok' && result && (
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            <span style={{ color: '#15803d', fontSize: 13 }}>
                                <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4 }} />
                                <strong>OK</strong> — {result.latency}ms
                            </span>
                            <span style={{ fontSize: 13, color: '#374151' }}>
                                Nguy cơ: <strong>{result.score}%</strong> ({levelMap[result.level] || result.level})
                            </span>
                        </div>
                    )}
                    {state === 'error' && (
                        <span style={{ color: '#dc2626', fontSize: 13 }}>
                            <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Lỗi — Không thể kết nối API. Kiểm tra server đang chạy.
                        </span>
                    )}
                    {state === 'running' && (
                        <span style={{ color: '#1d4ed8', fontSize: 13 }}>Đang gọi API predict...</span>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditLogTable({ logs }: { logs: AuditEntry[] }) {
    const [expanded, setExpanded] = useState(false);
    const shown = expanded ? logs : logs.slice(0, 8);

    const statusColor = (s: number | null) => !s ? '#6b7280' : s < 400 ? '#16a34a' : '#dc2626';
    const actionColor = (a: string) =>
        a === 'predict' ? '#c62828' : a === 'auth' ? '#7c3aed' : '#0284c7';

    return (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Audit Log</h3>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>{logs.length} bản ghi gần nhất</p>
            </div>
            {logs.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    Chưa có bản ghi nào. Audit log sẽ xuất hiện sau khi dùng hệ thống.
                </div>
            ) : (
                <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: '#f9fafb' }}>
                                {['Thời gian', 'Người dùng', 'Action', 'Endpoint', 'HTTP', 'Latency'].map(h => (
                                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((log, i) => (
                                <tr key={log.id ?? i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '7px 12px', color: '#9ca3af' }}>
                                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString('vi-VN') : '—'}
                                    </td>
                                    <td style={{ padding: '7px 12px', color: '#374151' }}>{log.userName || '—'}</td>
                                    <td style={{ padding: '7px 12px' }}>
                                        <span style={{
                                            padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                            color: actionColor(log.action), background: `${actionColor(log.action)}15`
                                        }}>{log.action}</span>
                                    </td>
                                    <td style={{ padding: '7px 12px', color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {log.endpoint}
                                    </td>
                                    <td style={{ padding: '7px 12px', fontWeight: 600, color: statusColor(log.httpStatus) }}>
                                        {log.httpStatus ?? '—'}
                                    </td>
                                    <td style={{ padding: '7px 12px', color: (log.latencyMs ?? 0) > 1000 ? '#dc2626' : '#374151' }}>
                                        {log.latencyMs != null ? `${Math.round(log.latencyMs)}ms` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {logs.length > 8 && (
                        <button
                            onClick={() => setExpanded(e => !e)}
                            style={{ width: '100%', padding: '9px', border: 'none', background: '#f9fafb', cursor: 'pointer', color: '#6b7280', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        >
                            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {expanded ? 'Thu gọn' : `Xem thêm ${logs.length - 8} bản ghi`}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

// ── Drift Chart ───────────────────────────────────────────────────────────────
function DriftPanel({ drift }: { drift: DriftReport }) {
    const isDrift = drift.drift?.drift_detected;
    const chartData = drift.distribution.map(d => ({
        date: d.date.substring(5),
        'Thấp': d.low, 'Trung bình': d.medium, 'Cao': d.high, 'Rất cao': d.very_high,
        'TB nguy cơ': d.avg_score,
    }));

    return (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${isDrift ? '#fca5a5' : '#e5e7eb'}`, overflow: 'hidden' }}>
            <div style={{
                padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
                background: isDrift ? '#fef2f2' : undefined,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Drift Monitor — {drift.days} ngày gần nhất</h3>
                    <p style={{ fontSize: 12, margin: '3px 0 0', color: isDrift ? '#dc2626' : '#6b7280' }}>
                        {drift.drift?.message || 'Đang phân tích...'}
                    </p>
                </div>
                {isDrift ? (
                    <AlertTriangle size={20} color="#dc2626" />
                ) : (
                    <CheckCircle2 size={20} color="#16a34a" />
                )}
            </div>
            <div style={{ padding: 20 }}>
                {chartData.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: 32, fontSize: 13 }}>
                        Chưa đủ dữ liệu để vẽ biểu đồ drift (cần dùng hệ thống dự đoán ít nhất 1 ngày).
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="Thấp" stackId="a" fill="#22c55e" />
                            <Bar dataKey="Trung bình" stackId="a" fill="#f97316" />
                            <Bar dataKey="Cao" stackId="a" fill="#ef4444" />
                            <Bar dataKey="Rất cao" stackId="a" fill="#7f1d1d" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
                {drift.drift && (
                    <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap', fontSize: 12, color: '#6b7280' }}>
                        <span>Baseline mean: <strong>{drift.drift.baseline_mean}%</strong></span>
                        {drift.drift.window_mean != null && (
                            <span>Window mean: <strong style={{ color: isDrift ? '#dc2626' : '#374151' }}>{drift.drift.window_mean}%</strong></span>
                        )}
                        <span>Z-score: <strong>{drift.drift.drift_score}</strong></span>
                        <span>Mẫu: <strong>{drift.drift.window_count}</strong></span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function SystemStatusPage() {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [drift, setDrift] = useState<DriftReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [autoRefresh, setAutoRefresh] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, l, d] = await Promise.allSettled([
                apiService.getSystemStats(),
                apiService.getAuditLog(20),
                apiService.getDriftReport(7),
            ]);
            if (s.status === 'fulfilled') setStats(s.value);
            if (l.status === 'fulfilled') setLogs(l.value);
            if (d.status === 'fulfilled') setDrift(d.value);
            setLastRefresh(new Date());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(load, 15000);
        return () => clearInterval(id);
    }, [autoRefresh, load]);

    const m = stats?.metrics;
    const srv = stats?.server;

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }} className="anim-page-enter">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Trạng thái hệ thống</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                        Cập nhật lần cuối: {lastRefresh.toLocaleTimeString('vi-VN')}
                        {loading && <span style={{ marginLeft: 8, color: '#c62828' }}>⟳ Đang tải...</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={() => setAutoRefresh(a => !a)}
                        style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: '1.5px solid #e5e7eb',
                            background: autoRefresh ? '#c62828' : '#fff',
                            color: autoRefresh ? '#fff' : '#374151',
                            display: 'flex', alignItems: 'center', gap: 5,
                            transition: 'all 0.2s',
                        }}
                    >
                        <Activity size={13} />
                        {autoRefresh ? 'Auto 15s ✓' : 'Auto refresh'}
                    </button>
                    <button
                        onClick={load}
                        disabled={loading}
                        style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151',
                            display: 'flex', alignItems: 'center', gap: 5,
                        }}
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Tải lại
                    </button>
                </div>
            </div>

            {/* Server Health Row */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Server size={16} color="#c62828" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Trạng thái server</span>
                </div>
                <StatusDot ok={srv?.status === 'ok'} label={`Server ${srv?.status === 'ok' ? 'hoạt động' : 'lỗi'}`} />
                <StatusDot ok={srv?.model_loaded ?? false} label={`Model ${srv?.model_loaded ? `đã tải (${srv?.model_type})` : 'chưa tải'}`} />
                <StatusDot ok={srv?.db_status === 'ok'} label={`DB ${srv?.db_status === 'ok' ? `kết nối (${srv?.db_mode})` : 'lỗi'}`} />
                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Uptime: <strong>{srv?.uptime_formatted || '—'}</strong>
                </span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                    Model v<strong>{srv?.model_version || '?'}</strong>
                </span>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                <MetricCard icon={Activity} label="Dự đoán hôm nay" value={m?.predict_count_today ?? '—'} sub="ca dự đoán" color="#c62828" />
                <MetricCard icon={Zap} label="p95 Latency" value={m?.p95_latency_ms != null ? `${m.p95_latency_ms}ms` : '—'} sub={`p50: ${m?.p50_latency_ms ?? '?'}ms`} color="#2563eb" />
                <MetricCard icon={Shield} label="Error rate" value={m?.error_rate != null ? `${m.error_rate}%` : '—'} sub={`${m?.total_errors ?? 0} lỗi / ${m?.total_requests ?? 0} req`} color={((m?.error_rate ?? 0) > 5) ? '#dc2626' : '#16a34a'} />
                <MetricCard icon={RefreshCw} label="Req/min" value={m?.requests_per_min ?? '—'} sub="window 5 phút" color="#7c3aed" />
            </div>

            {/* Drift + Quick Test */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 16, marginBottom: 20 }}>
                {drift ? <DriftPanel drift={drift} /> : (
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
                        {loading ? 'Đang tải drift report...' : 'Drift report không khả dụng'}
                    </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <QuickTest />
                    {/* Endpoint breakdown */}
                    {(stats?.endpoints ?? []).length > 0 && (
                        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Top endpoints</h3>
                            {stats!.endpoints.map((ep, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: i < stats!.endpoints.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                    <span style={{ color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{ep.endpoint}</span>
                                    <span style={{ color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8 }}>{ep.count}x · {ep.avg_latency_ms}ms</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Audit Log */}
            <AuditLogTable logs={logs} />
        </div>
    );
}
