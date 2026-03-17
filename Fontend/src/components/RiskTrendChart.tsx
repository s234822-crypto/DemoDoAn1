import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'T1', risk: 18 },
  { month: 'T2', risk: 20 },
  { month: 'T3', risk: 19 },
  { month: 'T4', risk: 22 },
  { month: 'T5', risk: 24 },
  { month: 'T6', risk: 23 },
];

export function RiskTrendChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
      <div className="mb-4">
        <h3 className="text-base font-medium text-gray-900">Xu hướng nguy cơ</h3>
        <p className="text-xs text-[#6B7280] mt-1">6 tháng gần nhất</p>
      </div>
      
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="month" 
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis 
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
            domain={[0, 50]}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: any) => [`${value}%`, 'Nguy cơ']}
          />
          <Line 
            type="monotone" 
            dataKey="risk" 
            stroke="#C62828" 
            strokeWidth={2}
            dot={{ fill: '#C62828', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#C62828] rounded-full"></div>
          <span className="text-xs text-[#6B7280]">Mức nguy cơ (%)</span>
        </div>
        <span className="text-xs text-[#6B7280]">Tăng 5% so với tháng trước</span>
      </div>
    </div>
  );
}
