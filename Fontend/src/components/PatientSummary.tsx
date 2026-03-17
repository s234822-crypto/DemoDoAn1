import { User, Calendar, Activity, Heart, Stethoscope } from 'lucide-react';
import type { PatientData } from '../services/api';

interface PatientSummaryProps {
  data: PatientData;
  isDarkMode?: boolean;
}

export function PatientSummary({ data, isDarkMode = false }: PatientSummaryProps) {
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

  const cardClass = isDarkMode ? 'bg-[#0F1724] border-[#243447]' : 'bg-white border-[#E5E7EB]';
  const titleClass = isDarkMode ? 'text-[#E6EEF7]' : 'text-gray-900';
  const mutedClass = isDarkMode ? 'text-[#9EB4C8]' : 'text-[#6B7280]';
  const splitBorder = isDarkMode ? 'border-[#2A3E57]' : 'border-[#E5E7EB]';

  return (
    <div className={`rounded-xl shadow-sm border p-6 anim-fade-up ${cardClass}`}>
      <h3 className={`text-base font-medium mb-4 ${titleClass}`}>Tóm tắt thông tin</h3>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <User className={`w-4 h-4 ${mutedClass}`} />
          <span className={`text-sm ${mutedClass}`}>Họ tên:</span>
          <span className={`text-sm font-medium ${titleClass}`}>{data.name || 'Chưa nhập'}</span>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className={`w-4 h-4 ${mutedClass}`} />
          <span className={`text-sm ${mutedClass}`}>Tuổi:</span>
          <span className={`text-sm font-medium ${titleClass}`}>{data.age} tuổi</span>
          <span className={`text-sm ${mutedClass}`}>•</span>
          <span className={`text-sm font-medium ${titleClass}`}>{data.sex === 1 ? 'Nam' : 'Nữ'}</span>
        </div>

        <div className="flex items-center gap-3">
          <Stethoscope className={`w-4 h-4 ${mutedClass}`} />
          <span className={`text-sm ${mutedClass}`}>Loại đau ngực:</span>
          <span className={`text-sm font-medium ${titleClass}`}>{getChestPainType(data.cp)}</span>
        </div>

        <div className={`pt-3 border-t ${splitBorder}`}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className={mutedClass}>Huyết áp nghỉ:</span>
              <span className={`ml-2 font-medium ${titleClass}`}>{data.trestbps} mmHg</span>
            </div>
            <div>
              <span className={mutedClass}>Cholesterol:</span>
              <span className={`ml-2 font-medium ${titleClass}`}>{data.chol} mg/dl</span>
            </div>
            <div>
              <span className={mutedClass}>Đường huyết:</span>
              <span className={`ml-2 font-medium ${titleClass}`}>{data.fbs === 1 ? '> 120 mg/dl' : '≤ 120 mg/dl'}</span>
            </div>
            <div>
              <span className={mutedClass}>ECG nghỉ:</span>
              <span className={`ml-2 font-medium ${titleClass}`}>{getEcgResult(data.restecg)}</span>
            </div>
            <div>
              <span className={mutedClass}>Nhịp tim max:</span>
              <span className={`ml-2 font-medium ${titleClass}`}>{data.thalach} bpm</span>
            </div>
            <div>
              <span className={mutedClass}>Đau ngực khi tập:</span>
              <span className={`ml-2 font-medium ${titleClass}`}>{data.exang === 1 ? 'Có' : 'Không'}</span>
            </div>
            <div>
              <span className={mutedClass}>ST Depression:</span>
              <span className={`ml-2 font-medium ${titleClass}`}>{data.oldpeak}</span>
            </div>
            <div>
              <span className={mutedClass}>Số mạch máu:</span>
              <span className={`ml-2 font-medium ${titleClass}`}>{data.ca}</span>
            </div>
          </div>
        </div>

        <div className={`pt-3 border-t ${splitBorder}`}>
          <div className="flex items-center gap-3">
            <Heart className={`w-4 h-4 ${mutedClass}`} />
            <span className={`text-sm ${mutedClass}`}>Thalassemia:</span>
            <span className={`text-sm font-medium ${titleClass}`}>{getThalResult(data.thal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
