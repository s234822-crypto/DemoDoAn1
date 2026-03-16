import { useState, useEffect } from 'react';
import { Search, X, Eye, ArrowUpDown, ArrowLeft, Activity, Filter, Download } from 'lucide-react';
import { apiService, type DiagnosisRecord } from '../services/api';

type ViewMode = 'list' | 'detail';

export function PatientsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');
    const [sortField, setSortField] = useState<string>('id');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selected, setSelected] = useState<DiagnosisRecord | null>(null);

    useEffect(() => {
        loadDiagnoses();
    }, [riskFilter, searchQuery]);

    const loadDiagnoses = async () => {
        setLoading(true);
        try {
            const data = await apiService.getMyDiagnoses();
            const keyword = searchQuery.trim().toLowerCase();
            const filtered = data.filter((d) => {
                const riskMatched = riskFilter === 'all' || d.riskLevel === riskFilter;
                if (!riskMatched) return false;
                if (!keyword) return true;
                return String(d.id).includes(keyword) || (d.userName || '').toLowerCase().includes(keyword);
            });
            setDiagnoses(filtered);
        } catch {
            setDiagnoses([]);
        } finally {
            setLoading(false);
        }
    };

    const sorted = [...diagnoses].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
            case 'id': cmp = a.id - b.id; break;
            case 'age': cmp = a.age - b.age; break;
            case 'risk': cmp = a.riskScore - b.riskScore; break;
            case 'date': cmp = a.createdDate.localeCompare(b.createdDate); break;
            default: cmp = a.id - b.id;
        }
        return sortDirection === 'asc' ? cmp : -cmp;
    });

    const handleSort = (field: string) => {
        if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDirection('asc'); }
    };

    const riskLabel = (level: string) => {
        switch (level) {
            case 'low': return 'Thấp';
            case 'medium': return 'Trung bình';
            case 'high': return 'Cao';
            case 'very_high': return 'Rất cao';
            default: return level;
        }
    };

    const riskBadge = (score: number, level: string) => {
        const color = level === 'high' || level === 'very_high' ? 'text-red-700 bg-red-50'
            : level === 'medium' ? 'text-orange-700 bg-orange-50' : 'text-green-700 bg-green-50';
        return <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>{score}% - {riskLabel(level)}</span>;
    };

    const cpLabel = (v: number) => ['Không đau', 'Đau thắt ngực điển hình', 'Đau thắt ngực không điển hình', 'Đau không do thắt ngực'][v] || `${v}`;
    const ecgLabel = (v: number) => ['Bình thường', 'Bất thường ST-T', 'Phì đại thất trái'][v] || `${v}`;
    const slopeLabel = (v: number) => ['Dốc lên', 'Bằng phẳng', 'Dốc xuống'][v] || `${v}`;
    const thalLabel = (v: number) => ['Bình thường', 'Khuyết tật cố định', 'Khuyết tật hồi phục'][v] || `${v}`;

    const recommendationText = (score: number) => {
        if (score >= 70) return 'Nguy cơ rất cao. Cần khám chuyên khoa tim mạch ngay.';
        if (score >= 50) return 'Nguy cơ cao. Khuyến nghị khám chuyên khoa tim mạch.';
        if (score >= 30) return 'Nguy cơ trung bình. Nên tham khảo ý kiến bác sĩ.';
        return 'Nguy cơ thấp. Tiếp tục duy trì lối sống lành mạnh.';
    };

    const toAscii = (text: string) => text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');

    const handleExportPdf = async (record: DiagnosisRecord) => {
        setExportingPdf(true);
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            let y = 14;

            const addLine = (label: string, value: string) => {
                doc.setFont('helvetica', 'bold');
                doc.text(label, 14, y);
                doc.setFont('helvetica', 'normal');
                doc.text(value, 70, y);
                y += 7;
            };

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('BAO CAO CHAN DOAN TIM MACH', 14, y);
            y += 10;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            addLine('Ma chan doan:', `#${record.id}`);
            addLine('Thoi gian:', new Date(record.createdDate).toLocaleString('vi-VN'));
            addLine('Nguoi duoc chan doan:', toAscii(record.userName || 'An danh'));
            addLine('Gioi tinh:', record.sex === 1 ? 'Nam' : 'Nu');
            addLine('Tuoi:', `${record.age}`);
            addLine('Ket qua AI:', record.prediction === 1 ? 'CO NGUY CO' : 'KHONG CO NGUY CO');
            addLine('Muc nguy co:', `${record.riskScore}% (${riskLabel(record.riskLevel)})`);

            y += 3;
            doc.setFont('helvetica', 'bold');
            doc.text('Chi so suc khoe', 14, y);
            y += 7;
            doc.setFont('helvetica', 'normal');
            addLine('Huyet ap nghi:', `${record.trestbps} mmHg`);
            addLine('Cholesterol:', `${record.chol} mg/dl`);
            addLine('Nhip tim toi da:', `${record.thalach} bpm`);
            addLine('Duong huyet luc doi:', record.fbs === 1 ? '> 120 mg/dl' : '<= 120 mg/dl');
            addLine('Dau nguc khi gang suc:', record.exang === 1 ? 'Co' : 'Khong');
            addLine('ST Depression:', `${record.oldpeak}`);
            addLine('So mach mau chinh:', `${record.ca}`);
            addLine('Loai dau nguc:', toAscii(cpLabel(record.cp)));
            addLine('ECG nghi:', toAscii(ecgLabel(record.restecg)));
            addLine('Slope ST:', toAscii(slopeLabel(record.slope)));
            addLine('Thalassemia:', toAscii(thalLabel(record.thal)));

            y += 3;
            doc.setFont('helvetica', 'bold');
            doc.text('Khuyen nghi AI', 14, y);
            y += 7;
            doc.setFont('helvetica', 'normal');
            const recText = toAscii(recommendationText(record.riskScore));
            const recLines = doc.splitTextToSize(recText, 180);
            doc.text(recLines, 14, y);

            doc.save(`chan-doan-${record.id}.pdf`);
        } catch {
            window.alert('Khong the xuat PDF. Vui long thu lai.');
        } finally {
            setExportingPdf(false);
        }
    };

    const SortIcon = ({ field }: { field: string }) => (
        <ArrowUpDown className={`w-3 h-3 inline ml-1 ${sortField === field ? 'text-[#C62828]' : 'text-[#6B7280]'}`} />
    );

    // === DETAIL VIEW ===
    if (viewMode === 'detail' && selected) {
        return (
            <div className="p-8 max-w-[1400px] mx-auto space-y-6 anim-page-enter">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setViewMode('list'); setSelected(null); }}
                            title="Quay lại danh sách"
                            aria-label="Quay lại danh sách"
                            className="w-10 h-10 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center hover:bg-[#FAFBFC] transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </button>
                        <div>
                            <h2 className="text-xl font-medium text-gray-900">Chi tiết chẩn đoán #{selected.id}</h2>
                            <p className="text-sm text-[#6B7280]">Thực hiện ngày {new Date(selected.createdDate).toLocaleString('vi-VN')}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleExportPdf(selected)}
                        disabled={exportingPdf}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C62828] text-white text-sm font-medium hover:bg-[#B71C1C] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        {exportingPdf ? 'Đang xuất PDF...' : 'Xuất PDF'}
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* General Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-1 anim-hover-lift">
                        <h3 className="text-base font-medium text-gray-900 mb-4">Thông tin chung</h3>
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-medium ${selected.riskLevel === 'high' || selected.riskLevel === 'very_high' ? 'bg-red-500'
                                : selected.riskLevel === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                                }`}>
                                {(selected.userName || '?').charAt(0)}
                            </div>
                            <div>
                                <p className="text-lg font-medium text-gray-900">{selected.userName || 'Ẩn danh'}</p>
                                <p className="text-sm text-[#6B7280]">{selected.sex === 1 ? 'Nam' : 'Nữ'} · {selected.age} tuổi</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-[#E5E7EB]">
                                <span className="text-[#6B7280]">Mã chẩn đoán</span>
                                <span className="font-medium text-gray-900">#{selected.id}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-[#E5E7EB]">
                                <span className="text-[#6B7280]">Ngày thực hiện</span>
                                <span className="font-medium text-gray-900">{new Date(selected.createdDate).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-[#E5E7EB]">
                                <span className="text-[#6B7280]">Kết quả AI</span>
                                <span className={`font-medium ${selected.prediction === 1 ? 'text-red-600' : 'text-green-600'}`}>
                                    {selected.prediction === 1 ? 'CÓ nguy cơ' : 'KHÔNG có nguy cơ'}
                                </span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-[#6B7280]">Mức nguy cơ</span>
                                {riskBadge(selected.riskScore, selected.riskLevel)}
                            </div>
                        </div>
                    </div>

                    {/* Health Indicators */}
                    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-2 anim-hover-lift">
                        <h3 className="text-base font-medium text-gray-900 mb-4">Chỉ số sức khỏe đã nhập</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Huyết áp nghỉ', value: `${selected.trestbps} mmHg`, warn: selected.trestbps > 140 },
                                { label: 'Cholesterol', value: `${selected.chol} mg/dl`, warn: selected.chol > 240 },
                                { label: 'Nhịp tim tối đa', value: `${selected.thalach} bpm`, warn: selected.thalach < 120 },
                                { label: 'Đường huyết lúc đói', value: selected.fbs === 1 ? '> 120 mg/dl' : '≤ 120 mg/dl', warn: selected.fbs === 1 },
                                { label: 'Đau ngực khi gắng sức', value: selected.exang === 1 ? 'Có' : 'Không', warn: selected.exang === 1 },
                                { label: 'ST Depression', value: `${selected.oldpeak}`, warn: selected.oldpeak > 2 },
                                { label: 'Số mạch máu chính', value: `${selected.ca}`, warn: selected.ca > 0 },
                            ].map((item, idx) => (
                                <div key={idx} className="p-3 bg-[#FAFBFC] rounded-lg border border-[#E5E7EB]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[#6B7280]">{item.label}</span>
                                        <span className={`text-sm font-medium ${item.warn ? 'text-red-600' : 'text-green-600'}`}>{item.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Additional parameters */}
                    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-3 anim-hover-lift">
                        <h3 className="text-base font-medium text-gray-900 mb-4">Thông số bổ sung</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Loại đau ngực', value: cpLabel(selected.cp) },
                                { label: 'ECG nghỉ', value: ecgLabel(selected.restecg) },
                                { label: 'Slope ST', value: slopeLabel(selected.slope) },
                                { label: 'Thalassemia', value: thalLabel(selected.thal) },
                            ].map((item, idx) => (
                                <div key={idx} className="p-3 bg-[#FAFBFC] rounded-lg border border-[#E5E7EB]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[#6B7280]">{item.label}</span>
                                        <span className="text-sm font-medium text-gray-900">{item.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* AI Recommendation */}
                        <div className={`mt-6 p-4 rounded-xl border ${selected.riskScore >= 50 ? 'bg-red-50 border-red-200'
                            : selected.riskScore >= 30 ? 'bg-orange-50 border-orange-200'
                                : 'bg-green-50 border-green-200'
                            }`}>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Khuyến nghị từ AI</h4>
                            <p className="text-sm text-gray-700">
                                {recommendationText(selected.riskScore)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // === LIST VIEW ===
    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6 anim-page-enter">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-medium text-gray-900">Lịch sử chẩn đoán AI</h2>
                    <p className="text-sm text-[#6B7280]">{diagnoses.length} kết quả chẩn đoán của bạn</p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo mã chẩn đoán..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C62828] focus:border-transparent"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} title="Xóa tìm kiếm" aria-label="Xóa tìm kiếm" className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-4 h-4 text-[#6B7280]" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#6B7280]" />
                    <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} aria-label="Lọc mức nguy cơ"
                        className="px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C62828]">
                        <option value="all">Tất cả</option>
                        <option value="very_high">🚨 Rất cao (≥70%)</option>
                        <option value="high">Cao (50–69%)</option>
                        <option value="medium">Trung bình (30–49%)</option>
                        <option value="low">Thấp (&lt;30%)</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden anim-fade-up anim-delay-1">
                {loading ? (
                    <div className="p-12 text-center">
                        <Activity className="w-6 h-6 text-[#C62828] animate-spin mx-auto mb-2" />
                        <p className="text-sm text-[#6B7280]">Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#FAFBFC] border-b border-[#E5E7EB]">
                                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                                        <button onClick={() => handleSort('id')} className="flex items-center gap-1 hover:text-gray-900">
                                            ID <SortIcon field="id" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Người thực hiện</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                                        <button onClick={() => handleSort('age')} className="flex items-center gap-1 hover:text-gray-900">
                                            Tuổi <SortIcon field="age" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Giới tính</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">Chỉ số chính</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                                        <button onClick={() => handleSort('risk')} className="flex items-center gap-1 hover:text-gray-900">
                                            Kết quả AI <SortIcon field="risk" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                                        <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-gray-900">
                                            Ngày <SortIcon field="date" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wider">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                                {sorted.map((d, idx) => (
                                    <tr key={d.id} className="hover:bg-[#FAFBFC] transition-colors cursor-pointer anim-fade-up"
                                        style={{ animationDelay: `${0.03 * (idx + 1)}s` }}
                                        onClick={() => { setSelected(d); setViewMode('detail'); }}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">#{d.id}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{d.userName || 'Ẩn danh'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{d.age}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{d.sex === 1 ? 'Nam' : 'Nữ'}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-[#6B7280] space-y-0.5">
                                                <div>HA: <span className="font-medium text-gray-900">{d.trestbps}</span> · Chol: <span className="font-medium text-gray-900">{d.chol}</span></div>
                                                <div>HR: <span className="font-medium text-gray-900">{d.thalach}</span> · ST: <span className="font-medium text-gray-900">{d.oldpeak}</span></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{riskBadge(d.riskScore, d.riskLevel)}</td>
                                        <td className="px-6 py-4 text-sm text-[#6B7280]">{new Date(d.createdDate).toLocaleDateString('vi-VN')}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); setSelected(d); setViewMode('detail'); }}
                                                className="p-2 rounded-lg hover:bg-[#E5E7EB] transition-colors" title="Xem chi tiết">
                                                <Eye className="w-4 h-4 text-[#6B7280]" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {sorted.length === 0 && (
                            <div className="p-12 text-center">
                                <p className="text-sm text-[#6B7280]">Chưa có kết quả chẩn đoán nào. Hãy thực hiện chẩn đoán AI tại trang Bảng điều khiển.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
