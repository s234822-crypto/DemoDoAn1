import { User, Calendar, Activity, Heart, Stethoscope } from 'lucide-react';
import type { PatientData } from '../services/api';

interface PatientSummaryProps {
  data: PatientData;
}

export function PatientSummary({ data }: PatientSummaryProps) {
  const getChestPainType = (cp: number) => {
    const types = ['Đau thắt điển hình', 'Đau thắt không điển hình', 'Đau không do tim', 'Không triệu chứng'];
    return types[cp] || 'N/A';
  };

  const getEcgResult = (restecg: number) => {
    const results = ['Bình thường', 'Bất thường ST-T', 'Phì đại thất trái'];
    return results[restecg] || 'N/A';
  };

  const getThalResult = (thal: number) => {
    const results = ['Bình thường', 'Khiếm khuyết cố định', 'Khiếm khuyết hồi phục'];
    return results[thal] || 'N/A';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
      <h3 className="text-base font-medium text-gray-900 mb-4">Tóm tắt thông tin</h3>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm text-[#6B7280]">Họ tên:</span>
          <span className="text-sm font-medium text-gray-900">{data.name || 'Chưa nhập'}</span>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm text-[#6B7280]">Tuổi:</span>
          <span className="text-sm font-medium text-gray-900">{data.age} tuổi</span>
          <span className="text-sm text-[#6B7280]">•</span>
          <span className="text-sm font-medium text-gray-900">{data.sex === 1 ? 'Nam' : 'Nữ'}</span>
        </div>

        <div className="flex items-center gap-3">
          <Stethoscope className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm text-[#6B7280]">Loại đau ngực:</span>
          <span className="text-sm font-medium text-gray-900">{getChestPainType(data.cp)}</span>
        </div>

        <div className="pt-3 border-t border-[#E5E7EB]">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[#6B7280]">Huyết áp nghỉ:</span>
              <span className="ml-2 font-medium text-gray-900">{data.trestbps} mmHg</span>
            </div>
            <div>
              <span className="text-[#6B7280]">Cholesterol:</span>
              <span className="ml-2 font-medium text-gray-900">{data.chol} mg/dl</span>
            </div>
            <div>
              <span className="text-[#6B7280]">Đường huyết:</span>
              <span className="ml-2 font-medium text-gray-900">{data.fbs === 1 ? '> 120 mg/dl' : '≤ 120 mg/dl'}</span>
            </div>
            <div>
              <span className="text-[#6B7280]">ECG nghỉ:</span>
              <span className="ml-2 font-medium text-gray-900">{getEcgResult(data.restecg)}</span>
            </div>
            <div>
              <span className="text-[#6B7280]">Nhịp tim max:</span>
              <span className="ml-2 font-medium text-gray-900">{data.thalach} bpm</span>
            </div>
            <div>
              <span className="text-[#6B7280]">Đau ngực khi tập:</span>
              <span className="ml-2 font-medium text-gray-900">{data.exang === 1 ? 'Có' : 'Không'}</span>
            </div>
            <div>
              <span className="text-[#6B7280]">ST Depression:</span>
              <span className="ml-2 font-medium text-gray-900">{data.oldpeak}</span>
            </div>
            <div>
              <span className="text-[#6B7280]">Số mạch máu:</span>
              <span className="ml-2 font-medium text-gray-900">{data.ca}</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <Heart className="w-4 h-4 text-[#6B7280]" />
            <span className="text-sm text-[#6B7280]">Thalassemia:</span>
            <span className="text-sm font-medium text-gray-900">{getThalResult(data.thal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
