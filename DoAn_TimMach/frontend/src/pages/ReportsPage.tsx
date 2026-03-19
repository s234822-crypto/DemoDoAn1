import { useState, useEffect } from 'react';
import { Users, AlertTriangle, Calendar, Activity, FileText } from 'lucide-react';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { apiService, type ReportStats } from '../services/api';

const RISK_COLORS: Record<string, string> = {
    low: '#22C55E',
    medium: '#F97316',
    high: '#EF4444',
    very_high: '#991B1B',
};

const RISK_LABELS: Record<string, string> = {
    low: 'Thấp',
    medium: 'Trung bình',
    high: 'Cao',
    very_high: 'Rất cao',
};

const RISK_DOT_CLASS: Record<string, string> = {
    low: 'bg-green-500',
    medium: 'bg-orange-500',
    high: 'bg-red-500',
    very_high: 'bg-red-900',
};

export function ReportsPage() {
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        loadStats();
    }, [dateFrom, dateTo]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await apiService.getReportStats(dateFrom || undefined, dateTo || undefined);
            setStats(data);
        } catch {
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    const riskOrder: Record<string, number> = { low: 0, medium: 1, high: 2, very_high: 3 };
    const ageOrder: Record<string, number> = { '< 30': 0, '30-39': 1, '40-49': 2, '50-59': 3, '60-69': 4, '70+': 5 };
    const totalDiagnoses = stats?.total_diagnoses ?? 0;

    const riskPieData = (stats?.by_risk || [])
        .slice()
        .sort((a, b) => (riskOrder[a.level] ?? 99) - (riskOrder[b.level] ?? 99))
        .map(r => ({
            name: RISK_LABELS[r.level] || r.level,
            value: r.count,
            color: RISK_COLORS[r.level] || '#6B7280',
            dotClass: RISK_DOT_CLASS[r.level] || 'bg-slate-500',
            percent: totalDiagnoses > 0 ? Math.round((r.count / totalDiagnoses) * 100) : 0,
        }));

    const ageBarData = (stats?.by_age || [])
        .slice()
        .sort((a, b) => (ageOrder[a.group] ?? 99) - (ageOrder[b.group] ?? 99))
        .map(a => ({
            group: a.group,
            count: a.count,
            avgRisk: a.avg_risk,
        }));

    const sexBarData = stats?.by_sex.map(s => ({
        name: s.sex === 1 ? 'Nam' : 'Nữ',
        count: s.count,
        avgRisk: s.avg_risk,
    })) || [];

    const monthlyData = (stats?.monthly || []).map(m => ({
        month: m.month,
        monthLabel: m.month.includes('-') ? `${m.month.slice(5)}/${m.month.slice(0, 4)}` : m.month,
        count: m.count,
    }));

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <div className="text-center anim-fade-in">
                    <Activity className="w-8 h-8 text-[#C62828] animate-spin mx-auto mb-3" />
                    <p className="text-sm text-[#6B7280]">Đang tải báo cáo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between anim-fade-up">
                <div>
                    <h2 className="text-xl font-medium text-gray-900">Báo cáo tổng hợp</h2>
                    <p className="text-sm text-[#6B7280]">Thống kê dữ liệu dự đoán AI toàn hệ thống</p>
                </div>
                <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#6B7280]" />
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Từ ngày" aria-label="Từ ngày"
                        className="px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C62828]" />
                    <span className="text-sm text-[#6B7280]">đến</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Đến ngày" aria-label="Đến ngày"
                        className="px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C62828]" />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-6">
                {[
                    { icon: Activity, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', value: stats?.total_diagnoses ?? 0, valueColor: 'text-gray-900', label: 'Tổng lượt chẩn đoán' },
                    { icon: Users, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', value: stats?.total_users ?? 0, valueColor: 'text-purple-600', label: 'Người dùng đã chẩn đoán' },
                    {
                        icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-600',
                        value: stats && totalDiagnoses > 0
                            ? `${Math.round(((stats.by_risk.find(r => r.level === 'high')?.count || 0) + (stats.by_risk.find(r => r.level === 'very_high')?.count || 0)) / totalDiagnoses * 100)}%`
                            : '0%',
                        valueColor: 'text-red-600', label: 'Tỷ lệ nguy cơ cao'
                    },
                    {
                        icon: Users, iconBg: 'bg-green-50', iconColor: 'text-green-600',
                        value: stats && totalDiagnoses > 0
                            ? `${Math.round((stats.by_risk.find(r => r.level === 'low')?.count || 0) / totalDiagnoses * 100)}%`
                            : '0%',
                        valueColor: 'text-green-600', label: 'Tỷ lệ nguy cơ thấp'
                    },
                ].map((card, i) => (
                    <div key={i} className={`bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-${i + 1} anim-hover-lift`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                            </div>
                            <div>
                                <p className={`text-2xl font-semibold ${card.valueColor}`}>{card.value}</p>
                                <p className="text-xs text-[#6B7280]">{card.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-2 gap-6">
                {/* Risk Distribution Pie */}
                <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-5 anim-hover-lift">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Phân bố mức độ nguy cơ</h3>
                    {riskPieData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                                        isAnimationActive={true} animationDuration={1000}>
                                        {riskPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-6 mt-2">
                                {riskPieData.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm anim-fade-in" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                                        <div className={`w-3 h-3 rounded-full ${item.dotClass}`}></div>
                                        <span className="text-[#6B7280]">{item.name}: <span className="font-medium text-gray-900">{item.value}</span> ({item.percent}%)</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-sm text-[#6B7280]">Chưa có dữ liệu</div>
                    )}
                </div>

                {/* By Age Group */}
                <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-6 anim-hover-lift">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Thống kê theo độ tuổi</h3>
                    {ageBarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={ageBarData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="group" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} />
                                <YAxis yAxisId="left" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} domain={[0, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="count" name="Số lượt" fill="#C62828" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} />
                                <Bar yAxisId="right" dataKey="avgRisk" name="Nguy cơ TB (%)" fill="#F97316" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-sm text-[#6B7280]">Chưa có dữ liệu</div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-2 gap-6">
                {/* By Gender */}
                <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-7 anim-hover-lift">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Thống kê theo giới tính</h3>
                    {sexBarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={sexBarData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} width={50} />
                                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                                <Legend />
                                <Bar dataKey="count" name="Số lượt" fill="#1976D2" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={1000} />
                                <Bar dataKey="avgRisk" name="Nguy cơ TB (%)" fill="#E91E63" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={1000} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-sm text-[#6B7280]">Chưa có dữ liệu</div>
                    )}
                </div>

                {/* Monthly Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-8 anim-hover-lift">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Số lượt chẩn đoán theo tháng</h3>
                    {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={monthlyData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="monthLabel" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} />
                                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(v: number) => [`${v} lượt`, 'Chẩn đoán']} />
                                <Line type="monotone" dataKey="count" stroke="#C62828" strokeWidth={2.5} dot={{ r: 4, fill: '#C62828' }} activeDot={{ r: 6 }}
                                    isAnimationActive={true} animationDuration={1200} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-sm text-[#6B7280]">Chưa có dữ liệu</div>
                    )}
                </div>
            </div>

            {/* Bảng dữ liệu chẩn đoán từ BenhNhan */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up">
                <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-5 h-5 text-[#C62828]" />
                    <h3 className="text-base font-medium text-gray-900">Dữ liệu chẩn đoán gần đây (BenhNhan)</h3>
                </div>
                {(stats?.recent_records?.length ?? 0) > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#E5E7EB]">
                                    <th className="text-left py-3 px-3 font-medium text-[#6B7280]">ID</th>
                                    <th className="text-left py-3 px-3 font-medium text-[#6B7280]">Người dùng</th>
                                    <th className="text-left py-3 px-3 font-medium text-[#6B7280]">Tuổi</th>
                                    <th className="text-left py-3 px-3 font-medium text-[#6B7280]">Giới tính</th>
                                    <th className="text-left py-3 px-3 font-medium text-[#6B7280]">Mức nguy cơ</th>
                                    <th className="text-left py-3 px-3 font-medium text-[#6B7280]">Điểm nguy cơ</th>
                                    <th className="text-left py-3 px-3 font-medium text-[#6B7280]">Ngày chẩn đoán</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats!.recent_records.map((rec, idx) => (
                                    <tr key={rec.id} className={`border-b border-[#F3F4F6] anim-row-hover anim-fade-up`} style={{ animationDelay: `${0.04 * (idx + 1)}s` }}>
                                        <td className="py-3 px-3 text-gray-900">{rec.id}</td>
                                        <td className="py-3 px-3 text-gray-900">{rec.userName || `User #${rec.userId}`}</td>
                                        <td className="py-3 px-3 text-gray-700">{rec.age}</td>
                                        <td className="py-3 px-3 text-gray-700">{rec.sex === 1 ? 'Nam' : 'Nữ'}</td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rec.riskLevel === 'very_high' ? 'bg-red-100 text-red-900' :
                                                    rec.riskLevel === 'high' ? 'bg-red-50 text-red-700' :
                                                        rec.riskLevel === 'medium' ? 'bg-orange-50 text-orange-700' :
                                                            'bg-green-50 text-green-700'
                                                }`}>
                                                {RISK_LABELS[rec.riskLevel] || rec.riskLevel}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-gray-700">{rec.riskScore != null ? `${Math.round(rec.riskScore)}%` : '—'}</td>
                                        <td className="py-3 px-3 text-gray-500">{rec.createdDate ? new Date(rec.createdDate).toLocaleDateString('vi-VN') : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="h-[120px] flex items-center justify-center text-sm text-[#6B7280]">Chưa có dữ liệu chẩn đoán</div>
                )}
            </div>
        </div>
    );
}
