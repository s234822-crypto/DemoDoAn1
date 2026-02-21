import { Play, Pause, ZoomIn } from 'lucide-react';
import { useState } from 'react';

export function ECGPreview() {
  const [isPlaying, setIsPlaying] = useState(false);

  // SVG ECG waveform path
  const ecgPath = "M 0 60 L 20 60 L 25 20 L 30 100 L 35 40 L 40 60 L 60 60 L 65 55 L 70 65 L 75 60 L 100 60 L 105 20 L 110 100 L 115 40 L 120 60 L 140 60 L 145 55 L 150 65 L 155 60 L 180 60 L 185 20 L 190 100 L 195 40 L 200 60 L 220 60 L 225 55 L 230 65 L 235 60 L 260 60 L 265 20 L 270 100 L 275 40 L 280 60 L 300 60 L 305 55 L 310 65 L 315 60 L 340 60 L 345 20 L 350 100 L 355 40 L 360 60 L 380 60";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-gray-900">Điện tâm đồ (ECG)</h3>
          <p className="text-xs text-[#6B7280] mt-1">Bản ghi: 29/01/2025 14:23</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-lg bg-[#FAFBFC] hover:bg-[#E5E7EB] flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-gray-700" />
            ) : (
              <Play className="w-4 h-4 text-gray-700" />
            )}
          </button>
          <button className="w-8 h-8 rounded-lg bg-[#FAFBFC] hover:bg-[#E5E7EB] flex items-center justify-center transition-colors">
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>
      
      <div className="relative bg-gradient-to-br from-[#FAFBFC] to-white p-6">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5E7EB" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* ECG Waveform */}
        <div className="relative h-32">
          <svg 
            viewBox="0 0 400 120" 
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d={ecgPath}
              fill="none"
              stroke="#C62828"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        {/* Metrics */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-[#6B7280]">Nhịp tim</p>
              <p className="text-base font-medium text-gray-900">72 bpm</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">QRS</p>
              <p className="text-base font-medium text-gray-900">98 ms</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">QT</p>
              <p className="text-base font-medium text-gray-900">412 ms</p>
            </div>
          </div>
          
          <button className="text-sm text-[#1976D2] hover:underline">
            Xem chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}
