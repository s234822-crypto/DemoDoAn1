import { useState, useEffect } from 'react';
import {
    ScatterChart, Scatter, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Activity, TrendingUp, Heart, AlertTriangle, Brain } from 'lucide-react';
import { apiService, type FeatureImportance } from '../services/api';

// Phân tích tuổi và nguy cơ (dữ liệu lâm sàng)
const ageRiskData = [
    { age: 30, risk: 12 }, { age: 32, risk: 15 }, { age: 35, risk: 18 },
    { age: 38, risk: 22 }, { age: 40, risk: 25 }, { age: 42, risk: 28 },
    { age: 44, risk: 32 }, { age: 45, risk: 35 }, { age: 48, risk: 38 },
    { age: 50, risk: 42 }, { age: 52, risk: 40 }, { age: 53, risk: 48 },
    { age: 55, risk: 55 }, { age: 57, risk: 58 }, { age: 58, risk: 52 },
    { age: 60, risk: 62 }, { age: 62, risk: 68 }, { age: 65, risk: 72 },
    { age: 67, risk: 75 }, { age: 70, risk: 80 }, { age: 75, risk: 85 },
];

// So sánh nguy cơ theo giới tính
const genderRiskData = [
    { group: '30-39', male: 22, female: 15 },
    { group: '40-49', male: 35, female: 28 },
    { group: '50-59', male: 52, female: 42 },
    { group: '60-69', male: 68, female: 55 },
    { group: '70+', male: 78, female: 65 },
];

// Health indicator correlation with heart disease risk
const correlationData = [
    { indicator: 'Huyết áp', correlation: 0.42, color: '#C62828' },
    { indicator: 'Cholesterol', correlation: 0.35, color: '#D32F2F' },
    { indicator: 'Nhịp tim max', correlation: -0.38, color: '#1976D2' },
    { indicator: 'ST Depression', correlation: 0.45, color: '#E53935' },
    { indicator: 'Số mạch máu', correlation: 0.52, color: '#B71C1C' },
    { indicator: 'Đường huyết', correlation: 0.18, color: '#F97316' },
    { indicator: 'Tuổi', correlation: 0.30, color: '#EF5350' },
];

// Radar: hồ sơ yếu tố nguy cơ
const radarData = [
    { subject: 'Huyết áp', importance: 85, fullMark: 100 },
    { subject: 'Cholesterol', importance: 72, fullMark: 100 },
    { subject: 'Nhịp tim', importance: 78, fullMark: 100 },
    { subject: 'ST Depression', importance: 82, fullMark: 100 },
    { subject: 'Tuổi', importance: 65, fullMark: 100 },
    { subject: 'Mạch máu', importance: 90, fullMark: 100 },
    { subject: 'Đau ngực', importance: 70, fullMark: 100 },
    { subject: 'Thalassemia', importance: 60, fullMark: 100 },
];

// Phân bố loại đau ngực
const cpDistribution = [
    { type: 'Không đau ngực', count: 143, riskRate: 56, color: '#22C55E' },
    { type: 'Đau điển hình', count: 50, riskRate: 20, color: '#EF4444' },
    { type: 'Đau không điển hình', count: 87, riskRate: 38, color: '#F97316' },
    { type: 'Đau không tim', count: 23, riskRate: 65, color: '#6366F1' },
];

export function AnalyticsPage() {
    const [selectedTab, setSelectedTab] = useState<'feature' | 'correlation' | 'dataset' | 'factors'>('feature');
    const [featureData, setFeatureData] = useState<FeatureImportance[]>([]);

    useEffect(() => {
        apiService.getFeatureImportance().then(setFeatureData).catch(() => { });
    }, []);

    const tabs = [
        { key: 'feature' as const, label: 'Mức độ ảnh hưởng', icon: Brain },
        { key: 'correlation' as const, label: 'Mối liên hệ chỉ số', icon: TrendingUp },
        { key: 'dataset' as const, label: 'Thống kê dữ liệu', icon: Activity },
        { key: 'factors' as const, label: 'Các yếu tố nguy cơ', icon: AlertTriangle },
    ];

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6">
            <div className="anim-fade-up">
                <h2 className="text-xl font-medium text-gray-900">Phân tích sức khỏe tim mạch</h2>
                <p className="text-sm text-[#6B7280]">Thống kê và đánh giá nguy cơ dựa trên dữ liệu</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-2 anim-fade-up anim-delay-1">
                {tabs.map((tab) => (
                    <button key={tab.key} onClick={() => setSelectedTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium anim-nav-item ${selectedTab === tab.key ? 'bg-[#C62828] text-white' : 'text-[#6B7280] hover:bg-[#FAFBFC] hover:text-gray-900'
                            }`}>
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Feature Importance Tab */}
            {selectedTab === 'feature' && (
                <div className="space-y-6 anim-tab-content" key="feature">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Feature Importance Bar Chart */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-1 anim-hover-lift">
                            <div className="mb-4">
                                <h3 className="text-base font-medium text-gray-900">Mức độ ảnh hưởng của các chỉ số sức khỏe</h3>
                                <p className="text-xs text-[#6B7280] mt-1">Mức độ ảnh hưởng của từng chỉ số đến kết quả dự đoán AI</p>
                            </div>
                            {featureData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={featureData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }}
                                            domain={[0, 'auto']}
                                            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} width={120} />
                                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }}
                                            formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, 'Importance']} />
                                        <Bar dataKey="importance" fill="#C62828" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out">
                                            {featureData.map((_, i) => (
                                                <Cell key={i} fill={i < 3 ? '#C62828' : i < 6 ? '#E53935' : '#EF9A9A'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[400px] flex items-center justify-center text-sm text-[#6B7280]">Đang tải dữ liệu...</div>
                            )}
                        </div>

                        {/* Radar Chart */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-2 anim-hover-lift">
                            <div className="mb-4">
                                <h3 className="text-base font-medium text-gray-900">Biểu đồ radar - Hồ sơ yếu tố nguy cơ</h3>
                                <p className="text-xs text-[#6B7280] mt-1">Mức độ quan trọng tương đối của các yếu tố</p>
                            </div>
                            <ResponsiveContainer width="100%" height={400}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#E5E7EB" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} />
                                    <PolarRadiusAxis tick={{ fill: '#6B7280', fontSize: 10 }} domain={[0, 100]} />
                                    <Radar name="Importance" dataKey="importance" stroke="#C62828" fill="#C62828" fillOpacity={0.3} isAnimationActive={true} animationDuration={1200} />
                                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Feature description list */}
                    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-3">
                        <h3 className="text-base font-medium text-gray-900 mb-4">Giải thích đặc trưng mô hình AI</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {featureData.map((f, i) => (
                                <div key={i} className={`p-3 bg-[#FAFBFC] rounded-lg border border-[#E5E7EB] flex items-center justify-between anim-fade-up anim-delay-${Math.min(i + 1, 8)} anim-hover-lift`}>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{f.name}</p>
                                        <p className="text-xs text-[#6B7280]">Key: {f.key}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div className="h-2 rounded-full bg-[#C62828] anim-progress-fill" style={{ width: `${f.importance * 100 / 0.15}%` }}></div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 w-14 text-right">{(f.importance * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Correlation Tab */}
            {selectedTab === 'correlation' && (
                <div className="space-y-6 anim-tab-content" key="correlation">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Correlation Bar */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-1 anim-hover-lift">
                            <div className="mb-4">
                                <h3 className="text-base font-medium text-gray-900">Tương quan với nguy cơ bệnh tim</h3>
                                <p className="text-xs text-[#6B7280] mt-1">Hệ số tương quan Pearson giữa chỉ số sức khỏe và nguy cơ</p>
                            </div>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={correlationData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} domain={[-0.5, 0.6]} />
                                    <YAxis type="category" dataKey="indicator" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} width={110} />
                                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(v: number) => [v.toFixed(2), 'Tương quan']} />
                                    <Bar dataKey="correlation" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={1000}>
                                        {correlationData.map((entry, i) => (
                                            <Cell key={i} fill={entry.correlation >= 0 ? '#C62828' : '#1976D2'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-[#6B7280]">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#C62828]"></div> Tương quan dương (tăng nguy cơ)</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#1976D2]"></div> Tương quan âm (giảm nguy cơ)</div>
                            </div>
                        </div>

                        {/* Age vs Risk Scatter */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-2 anim-hover-lift">
                            <div className="mb-4">
                                <h3 className="text-base font-medium text-gray-900">Tuổi vs Nguy cơ tim mạch</h3>
                                <p className="text-xs text-[#6B7280] mt-1">Phân bố nguy cơ theo tuổi từ dữ liệu lâm sàng</p>
                            </div>
                            <ResponsiveContainer width="100%" height={350}>
                                <ScatterChart>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="age" name="Tuổi" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }}
                                        label={{ value: 'Tuổi', position: 'insideBottom', offset: -5, fill: '#6B7280', fontSize: 12 }} />
                                    <YAxis dataKey="risk" name="Nguy cơ (%)" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }}
                                        label={{ value: 'Nguy cơ (%)', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                                    <Scatter data={ageRiskData} fill="#C62828" isAnimationActive={true} animationDuration={1200}>
                                        {ageRiskData.map((entry, i) => (
                                            <Cell key={i} fill={entry.risk < 30 ? '#22C55E' : entry.risk < 50 ? '#F97316' : '#C62828'} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Thống kê dữ liệu Tab */}
            {selectedTab === 'dataset' && (
                <div className="space-y-6 anim-tab-content" key="dataset">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Gender comparison */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-1 anim-hover-lift">
                            <div className="mb-4">
                                <h3 className="text-base font-medium text-gray-900">Nguy cơ theo giới tính & nhóm tuổi</h3>
                                <p className="text-xs text-[#6B7280] mt-1">So sánh nguy cơ trung bình nam và nữ theo dữ liệu lâm sàng</p>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={genderRiskData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="group" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} />
                                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(v: number) => [`${v}%`, '']} />
                                    <Legend />
                                    <Bar dataKey="male" name="Nam" fill="#1976D2" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} />
                                    <Bar dataKey="female" name="Nữ" fill="#E91E63" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Chest pain distribution */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-2 anim-hover-lift">
                            <div className="mb-4">
                                <h3 className="text-base font-medium text-gray-900">Phân bố loại đau ngực</h3>
                                <p className="text-xs text-[#6B7280] mt-1">Dữ liệu bệnh nhân, số ca và tỷ lệ nguy cơ</p>
                            </div>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={cpDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="count"
                                        label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                                        isAnimationActive={true} animationDuration={1000}>
                                        {cpDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 mt-2">
                                {cpDistribution.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm anim-fade-up" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <span className="text-[#6B7280]">{item.type}</span>
                                        </div>
                                        <span className="font-medium text-gray-900">{item.count} mẫu · {item.riskRate}% nguy cơ</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tổng quan dữ liệu */}
                    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up anim-delay-3">
                        <h3 className="text-base font-medium text-gray-900 mb-4">Tổng quan dữ liệu y khoa</h3>
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: 'Tổng mẫu dữ liệu', value: '303', desc: 'Bệnh nhân trong dữ liệu gốc' },
                                { label: 'Số đặc trưng', value: '13', desc: 'Chỉ số y khoa đầu vào' },
                                { label: 'Tỷ lệ bệnh tim', value: '54.5%', desc: 'Tỷ lệ mẫu dương tính' },
                                { label: 'Độ chính xác', value: '94.2%', desc: 'Accuracy của mô hình XGBoost' },
                            ].map((item, i) => (
                                <div key={i} className={`p-4 bg-[#FAFBFC] rounded-lg border border-[#E5E7EB] text-center anim-fade-up anim-delay-${i + 1} anim-hover-lift`}>
                                    <p className="text-2xl font-semibold text-[#C62828]">{item.value}</p>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{item.label}</p>
                                    <p className="text-xs text-[#6B7280] mt-0.5">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Risk Factors Tab */}
            {selectedTab === 'factors' && (
                <div className="space-y-6 anim-tab-content" key="factors">
                    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 anim-fade-up">
                        <div className="mb-4">
                            <h3 className="text-base font-medium text-gray-900">Các yếu tố ảnh hưởng đến nguy cơ bệnh tim</h3>
                            <p className="text-xs text-[#6B7280] mt-1">Phân tích từ dữ liệu lâm sàng và mô hình AI</p>
                        </div>
                        <div className="space-y-4">
                            {[
                                { factor: 'Số mạch máu chính bị hẹp (ca)', impact: 95, desc: 'Yếu tố mạnh nhất. Nhiều mạch bị hẹp = nguy cơ rất cao.' },
                                { factor: 'Loại đau ngực (cp)', impact: 88, desc: 'Đau ngực không điển hình và không do thắt ngực liên quan mạnh đến bệnh tim.' },
                                { factor: 'ST Depression (oldpeak)', impact: 85, desc: 'Chênh lệch ST cao phản ánh thiếu máu cơ tim khi gắng sức.' },
                                { factor: 'Nhịp tim tối đa (thalach)', impact: 82, desc: 'Nhịp tim tối đa thấp bất thường là dấu hiệu đáng quan ngại.' },
                                { factor: 'Huyết áp nghỉ (trestbps)', impact: 78, desc: 'Huyết áp cao kéo dài gây tổn thương mạch vành.' },
                                { factor: 'Tuổi (age)', impact: 72, desc: 'Nguy cơ tăng theo tuổi, đặc biệt sau 55 tuổi.' },
                                { factor: 'Cholesterol (chol)', impact: 68, desc: 'Cholesterol cao dẫn đến xơ vữa động mạch.' },
                                { factor: 'Đau ngực khi gắng sức (exang)', impact: 65, desc: 'Triệu chứng đau ngực khi tập luyện là cảnh báo quan trọng.' },
                                { factor: 'Thalassemia (thal)', impact: 55, desc: 'Bất thường thalassemia ảnh hưởng đến khả năng vận chuyển oxy.' },
                                { factor: 'Giới tính (sex)', impact: 50, desc: 'Nam giới có nguy cơ cao hơn nữ ở cùng độ tuổi.' },
                                { factor: 'ECG nghỉ (restecg)', impact: 42, desc: 'Bất thường điện tâm đồ khi nghỉ.' },
                                { factor: 'Đường huyết (fbs)', impact: 35, desc: 'Đường huyết lúc đói > 120 mg/dl liên quan đến tiểu đường và bệnh tim.' },
                                { factor: 'Slope ST (slope)', impact: 30, desc: 'Hình dạng đoạn ST trong ECG gắng sức.' },
                            ].map((item, i) => (
                                <div key={i} className={`flex items-center gap-4 p-3 bg-[#FAFBFC] rounded-lg border border-[#E5E7EB] anim-fade-up anim-hover-lift`} style={{ animationDelay: `${0.04 * (i + 1)}s` }}>
                                    <div className="w-8 text-center text-sm font-bold text-[#C62828]">#{i + 1}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-medium text-gray-900">{item.factor}</p>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.impact >= 80 ? 'bg-red-50 text-red-700'
                                                : item.impact >= 60 ? 'bg-orange-50 text-orange-700'
                                                    : 'bg-blue-50 text-blue-700'
                                                }`}>
                                                {item.impact >= 80 ? 'Rất quan trọng' : item.impact >= 60 ? 'Quan trọng' : 'Trung bình'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#6B7280] mb-2">{item.desc}</p>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className={`h-2 rounded-full anim-progress-fill ${item.impact >= 80 ? 'bg-red-500' : item.impact >= 60 ? 'bg-orange-500' : 'bg-blue-500'
                                                }`} style={{ width: `${item.impact}%`, animationDelay: `${0.05 * (i + 1)}s` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
