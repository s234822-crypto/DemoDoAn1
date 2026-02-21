import { AlertCircle, FileDown, Info } from 'lucide-react';
import { Button } from './ui/button';

interface RiskScoreCardProps {
  score: number | null;
}

export function RiskScoreCard({ score }: RiskScoreCardProps) {
  const getRiskLevel = (score: number) => {
    if (score < 30) return { label: 'Thấp', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' };
    if (score < 50) return { label: 'Trung bình', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' };
    return { label: 'Cao', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
  };

  const riskLevel = score !== null ? getRiskLevel(score) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-8">
      {score === null ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[#FAFBFC] rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-[#6B7280]" />
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-2">Chưa có kết quả dự đoán</h3>
          <p className="text-sm text-[#6B7280]">
            Vui lòng nhập thông tin bệnh nhân và nhấn "Dự đoán nguy cơ"
          </p>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-3">
              <h3 className="text-base font-medium text-gray-900">Kết quả dự đoán</h3>
              {riskLevel && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${riskLevel.textColor} ${riskLevel.bgColor}`}>
                  {riskLevel.label}
                </span>
              )}
            </div>
            
            {/* Large Risk Score */}
            <div className="relative">
              <div className="text-7xl font-medium text-gray-900 mb-2">
                {score}
                <span className="text-4xl text-[#6B7280]">%</span>
              </div>
              
              {/* Color band indicator */}
              {riskLevel && (
                <div className="flex justify-center gap-1 mb-4">
                  <div className={`h-2 w-24 rounded-full ${score < 30 ? riskLevel.color : 'bg-gray-200'}`}></div>
                  <div className={`h-2 w-24 rounded-full ${score >= 30 && score < 50 ? riskLevel.color : 'bg-gray-200'}`}></div>
                  <div className={`h-2 w-24 rounded-full ${score >= 50 ? riskLevel.color : 'bg-gray-200'}`}></div>
                </div>
              )}
            </div>
            
            <p className="text-sm text-[#6B7280] max-w-md mx-auto">
              Nguy cơ mắc bệnh tim mạch trong 10 năm tới
            </p>
          </div>

          {/* Explanation */}
          <div className={`p-4 rounded-lg mb-6 ${riskLevel?.bgColor}`}>
            <div className="flex gap-3">
              <Info className={`w-5 h-5 ${riskLevel?.textColor} flex-shrink-0 mt-0.5`} />
              <div>
                <h4 className={`text-sm font-medium ${riskLevel?.textColor} mb-1`}>
                  {score < 30 ? 'Nguy cơ thấp' : score < 50 ? 'Nguy cơ trung bình' : 'Nguy cơ cao'}
                </h4>
                <p className="text-sm text-gray-700">
                  {score < 30 
                    ? 'Bệnh nhân có nguy cơ thấp. Duy trì lối sống lành mạnh và kiểm tra định kỳ.'
                    : score < 50
                    ? 'Bệnh nhân nên tham khảo ý kiến bác sĩ và điều chỉnh lối sống.'
                    : 'Bệnh nhân có nguy cơ cao. Cần khám và điều trị ngay lập tức.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 border-[#1976D2] text-[#1976D2] hover:bg-blue-50"
            >
              <Info className="w-4 h-4 mr-2" />
              Giải thích
            </Button>
            <Button 
              className="flex-1 bg-[#C62828] hover:bg-[#B71C1C] text-white"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Tải báo cáo PDF
            </Button>
          </div>

          {/* Additional info */}
          <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Độ tin cậy</p>
                <p className="text-base font-medium text-gray-900">94.2%</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Mô hình</p>
                <p className="text-base font-medium text-gray-900">XGBoost v2</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Cập nhật</p>
                <p className="text-base font-medium text-gray-900">Hôm nay</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
