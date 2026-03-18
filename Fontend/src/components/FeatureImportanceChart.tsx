import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { feature: 'Tuổi', importance: 28, isTop: true },
  { feature: 'Huyết áp', importance: 25, isTop: true },
  { feature: 'Cholesterol', importance: 18, isTop: true },
  { feature: 'BMI', importance: 12, isTop: false },
  { feature: 'Glucose', importance: 10, isTop: false },
  { feature: 'Hút thuốc', importance: 7, isTop: false },
];

export function FeatureImportanceChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
      <div className="mb-4">
        <h3 className="text-base font-medium text-gray-900">Yếu tố ảnh hưởng</h3>
        <p className="text-xs text-[#6B7280] mt-1">Mức độ tác động đến kết quả</p>
      </div>
      
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            type="number" 
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
            domain={[0, 30]}
          />
          <YAxis 
            type="category" 
            dataKey="feature" 
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
            width={80}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: any) => [`${value}%`, 'Tác động']}
          />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.isTop ? '#C62828' : '#EF9A9A'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#C62828] rounded"></div>
            <span className="text-[#6B7280]">Yếu tố chính</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#EF9A9A] rounded"></div>
            <span className="text-[#6B7280]">Yếu tố phụ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
