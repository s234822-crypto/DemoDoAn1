import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Activity, Loader2 } from 'lucide-react';
import type { PatientData } from '../services/api';

interface PatientFormProps {
  onPredict: (data: PatientData) => void;
  isLoading?: boolean;
}

export function PatientForm({ onPredict, isLoading = false }: PatientFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: '',
    cp: '',
    trestbps: '',
    chol: '',
    fbs: '',
    restecg: '',
    thalach: '',
    exang: '',
    oldpeak: '',
    slope: '',
    ca: '',
    thal: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      newErrors.age = 'Tuổi phải từ 1-120';
    }
    if (!formData.sex) newErrors.sex = 'Vui lòng chọn giới tính';
    if (!formData.cp) newErrors.cp = 'Vui lòng chọn loại đau ngực';
    if (!formData.trestbps || parseFloat(formData.trestbps) < 50 || parseFloat(formData.trestbps) > 250) {
      newErrors.trestbps = 'Huyết áp phải từ 50-250 mmHg';
    }
    if (!formData.chol || parseFloat(formData.chol) < 100 || parseFloat(formData.chol) > 600) {
      newErrors.chol = 'Cholesterol phải từ 100-600 mg/dl';
    }
    if (!formData.fbs) newErrors.fbs = 'Vui lòng chọn mức đường huyết';
    if (!formData.restecg) newErrors.restecg = 'Vui lòng chọn kết quả ECG';
    if (!formData.thalach || parseFloat(formData.thalach) < 50 || parseFloat(formData.thalach) > 220) {
      newErrors.thalach = 'Nhịp tim phải từ 50-220 bpm';
    }
    if (!formData.exang) newErrors.exang = 'Vui lòng chọn';
    if (!formData.oldpeak || parseFloat(formData.oldpeak) < 0 || parseFloat(formData.oldpeak) > 10) {
      newErrors.oldpeak = 'ST Depression phải từ 0-10';
    }
    if (!formData.slope) newErrors.slope = 'Vui lòng chọn slope';
    if (!formData.ca) newErrors.ca = 'Vui lòng chọn số mạch máu';
    if (!formData.thal) newErrors.thal = 'Vui lòng chọn Thalassemia';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const patientData: PatientData = {
      name: formData.name || undefined,
      age: parseInt(formData.age),
      sex: parseInt(formData.sex),
      cp: parseInt(formData.cp),
      trestbps: parseFloat(formData.trestbps),
      chol: parseFloat(formData.chol),
      fbs: parseInt(formData.fbs),
      restecg: parseInt(formData.restecg),
      thalach: parseFloat(formData.thalach),
      exang: parseInt(formData.exang),
      oldpeak: parseFloat(formData.oldpeak),
      slope: parseInt(formData.slope),
      ca: parseInt(formData.ca),
      thal: parseInt(formData.thal),
    };

    onPredict(patientData);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age: '',
      sex: '',
      cp: '',
      trestbps: '',
      chol: '',
      fbs: '',
      restecg: '',
      thalach: '',
      exang: '',
      oldpeak: '',
      slope: '',
      ca: '',
      thal: '',
    });
    setErrors({});
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#EF9A9A] rounded-lg flex items-center justify-center">
          <Activity className="w-5 h-5 text-[#C62828]" />
        </div>
        <h2 className="text-lg font-medium text-gray-900">Thông tin bệnh nhân</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Họ tên */}
        <div className="space-y-2">
          <Label htmlFor="name">Họ và tên (không bắt buộc)</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Nhập họ và tên bệnh nhân"
            className="bg-[#FAFBFC] border-[#E5E7EB]"
          />
        </div>

        {/* Age and Gender Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age">Tuổi (năm) *</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => updateField('age', e.target.value)}
              placeholder="45"
              className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.age ? 'border-red-500' : ''}`}
            />
            {errors.age && <p className="text-xs text-red-500">{errors.age}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sex">Giới tính *</Label>
            <Select value={formData.sex} onValueChange={(value) => updateField('sex', value)}>
              <SelectTrigger className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.sex ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Nữ</SelectItem>
                <SelectItem value="1">Nam</SelectItem>
              </SelectContent>
            </Select>
            {errors.sex && <p className="text-xs text-red-500">{errors.sex}</p>}
          </div>
        </div>

        {/* Chest Pain Type */}
        <div className="space-y-2">
          <Label htmlFor="cp">Loại đau ngực *</Label>
          <Select value={formData.cp} onValueChange={(value) => updateField('cp', value)}>
            <SelectTrigger className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.cp ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Chọn loại đau ngực" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Đau thắt ngực điển hình</SelectItem>
              <SelectItem value="1">Đau thắt ngực không điển hình</SelectItem>
              <SelectItem value="2">Đau không do tim</SelectItem>
              <SelectItem value="3">Không triệu chứng</SelectItem>
            </SelectContent>
          </Select>
          {errors.cp && <p className="text-xs text-red-500">{errors.cp}</p>}
        </div>

        {/* Blood Pressure and Cholesterol */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trestbps">Huyết áp nghỉ (mmHg) *</Label>
            <Input
              id="trestbps"
              type="number"
              value={formData.trestbps}
              onChange={(e) => updateField('trestbps', e.target.value)}
              placeholder="120"
              className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.trestbps ? 'border-red-500' : ''}`}
            />
            {errors.trestbps && <p className="text-xs text-red-500">{errors.trestbps}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="chol">Cholesterol (mg/dl) *</Label>
            <Input
              id="chol"
              type="number"
              value={formData.chol}
              onChange={(e) => updateField('chol', e.target.value)}
              placeholder="200"
              className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.chol ? 'border-red-500' : ''}`}
            />
            {errors.chol && <p className="text-xs text-red-500">{errors.chol}</p>}
          </div>
        </div>

        {/* Fasting Blood Sugar and Resting ECG */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fbs">Đường huyết lúc đói *</Label>
            <Select value={formData.fbs} onValueChange={(value) => updateField('fbs', value)}>
              <SelectTrigger className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.fbs ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">≤ 120 mg/dl (Bình thường)</SelectItem>
                <SelectItem value="1">&gt; 120 mg/dl (Cao)</SelectItem>
              </SelectContent>
            </Select>
            {errors.fbs && <p className="text-xs text-red-500">{errors.fbs}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="restecg">Kết quả ECG nghỉ *</Label>
            <Select value={formData.restecg} onValueChange={(value) => updateField('restecg', value)}>
              <SelectTrigger className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.restecg ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Bình thường</SelectItem>
                <SelectItem value="1">Bất thường sóng ST-T</SelectItem>
                <SelectItem value="2">Phì đại thất trái (LVH)</SelectItem>
              </SelectContent>
            </Select>
            {errors.restecg && <p className="text-xs text-red-500">{errors.restecg}</p>}
          </div>
        </div>

        {/* Max Heart Rate and Exercise Angina */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="thalach">Nhịp tim tối đa (bpm) *</Label>
            <Input
              id="thalach"
              type="number"
              value={formData.thalach}
              onChange={(e) => updateField('thalach', e.target.value)}
              placeholder="150"
              className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.thalach ? 'border-red-500' : ''}`}
            />
            {errors.thalach && <p className="text-xs text-red-500">{errors.thalach}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="exang">Đau thắt ngực khi tập *</Label>
            <Select value={formData.exang} onValueChange={(value) => updateField('exang', value)}>
              <SelectTrigger className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.exang ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Không</SelectItem>
                <SelectItem value="1">Có</SelectItem>
              </SelectContent>
            </Select>
            {errors.exang && <p className="text-xs text-red-500">{errors.exang}</p>}
          </div>
        </div>

        {/* ST Depression and Slope */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="oldpeak">ST Depression *</Label>
            <Input
              id="oldpeak"
              type="number"
              step="0.1"
              value={formData.oldpeak}
              onChange={(e) => updateField('oldpeak', e.target.value)}
              placeholder="1.0"
              className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.oldpeak ? 'border-red-500' : ''}`}
            />
            {errors.oldpeak && <p className="text-xs text-red-500">{errors.oldpeak}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slope">Độ dốc ST (Slope) *</Label>
            <Select value={formData.slope} onValueChange={(value) => updateField('slope', value)}>
              <SelectTrigger className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.slope ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Dốc lên (Upsloping)</SelectItem>
                <SelectItem value="1">Bằng phẳng (Flat)</SelectItem>
                <SelectItem value="2">Dốc xuống (Downsloping)</SelectItem>
              </SelectContent>
            </Select>
            {errors.slope && <p className="text-xs text-red-500">{errors.slope}</p>}
          </div>
        </div>

        {/* CA and Thal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ca">Số mạch máu chính *</Label>
            <Select value={formData.ca} onValueChange={(value) => updateField('ca', value)}>
              <SelectTrigger className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.ca ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 mạch</SelectItem>
                <SelectItem value="1">1 mạch</SelectItem>
                <SelectItem value="2">2 mạch</SelectItem>
                <SelectItem value="3">3 mạch</SelectItem>
              </SelectContent>
            </Select>
            {errors.ca && <p className="text-xs text-red-500">{errors.ca}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="thal">Thalassemia *</Label>
            <Select value={formData.thal} onValueChange={(value) => updateField('thal', value)}>
              <SelectTrigger className={`bg-[#FAFBFC] border-[#E5E7EB] ${errors.thal ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Bình thường</SelectItem>
                <SelectItem value="1">Khiếm khuyết cố định</SelectItem>
                <SelectItem value="2">Khiếm khuyết có hồi phục</SelectItem>
              </SelectContent>
            </Select>
            {errors.thal && <p className="text-xs text-red-500">{errors.thal}</p>}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            className="flex-1"
            disabled={isLoading}
          >
            Xóa form
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#C62828] hover:bg-[#B71C1C] text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 mr-2" />
                Dự đoán nguy cơ
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-[#6B7280]">
          * Các trường bắt buộc phải nhập
        </p>
      </form>
    </div>
  );
}
