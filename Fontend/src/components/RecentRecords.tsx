import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const mockRecords = [
  { id: 1, date: '15/01/2025', time: '14:30', risk: 23, trend: 'down', patient: 'Nguyễn Văn B' },
  { id: 2, date: '15/01/2025', time: '10:15', risk: 45, trend: 'up', patient: 'Trần Thị C' },
  { id: 3, date: '14/01/2025', time: '16:20', risk: 18, trend: 'stable', patient: 'Lê Văn D' },
  { id: 4, date: '14/01/2025', time: '09:45', risk: 62, trend: 'down', patient: 'Phạm Thị E' },
];

export function RecentRecords() {
  const getRiskColor = (risk: number) => {
    if (risk < 30) return 'text-green-600 bg-green-50';
    if (risk < 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-gray-900">Dự đoán gần đây</h3>
        <button className="text-sm text-[#1976D2] hover:underline">Xem tất cả</button>
      </div>
      
      <div className="space-y-3">
        {mockRecords.map((record) => (
          <div 
            key={record.id}
            className="flex items-center justify-between p-3 rounded-lg bg-[#FAFBFC] border border-[#E5E7EB] hover:border-[#1976D2] transition-colors cursor-pointer"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{record.patient}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-[#6B7280]" />
                <span className="text-xs text-[#6B7280]">{record.date} • {record.time}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(record.risk)}`}>
                {record.risk}%
              </span>
              
              {record.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
              {record.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
              {record.trend === 'stable' && <Minus className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
