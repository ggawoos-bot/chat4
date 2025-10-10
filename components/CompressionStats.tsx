import React from 'react';
import { CompressionResult } from '../services/pdfCompressionService';

interface CompressionStatsProps {
  compressionResult: CompressionResult | null;
  isVisible: boolean;
  onClose: () => void;
}

const CompressionStats: React.FC<CompressionStatsProps> = ({ 
  compressionResult, 
  isVisible, 
  onClose 
}) => {
  if (!isVisible || !compressionResult) return null;

  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercentage = (num: number) => `${(num * 100).toFixed(1)}%`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-brand-surface border border-brand-secondary rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-brand-text-primary">
            PDF 압축 통계
          </h3>
          <button
            onClick={onClose}
            className="text-brand-text-secondary hover:text-brand-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* 기본 통계 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-brand-bg rounded-lg p-4">
              <div className="text-sm text-brand-text-secondary mb-1">원본 크기</div>
              <div className="text-lg font-semibold text-brand-text-primary">
                {formatNumber(compressionResult.originalLength)}자
              </div>
            </div>
            <div className="bg-brand-bg rounded-lg p-4">
              <div className="text-sm text-brand-text-secondary mb-1">압축 후 크기</div>
              <div className="text-lg font-semibold text-brand-text-primary">
                {formatNumber(compressionResult.compressedLength)}자
              </div>
            </div>
          </div>

          {/* 압축률 */}
          <div className="bg-brand-bg rounded-lg p-4">
            <div className="text-sm text-brand-text-secondary mb-2">압축률</div>
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-brand-primary">
                {formatPercentage(compressionResult.compressionRatio)}
              </div>
              <div className="flex-1 bg-brand-secondary rounded-full h-2">
                <div 
                  className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, compressionResult.compressionRatio * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 토큰 정보 */}
          <div className="bg-brand-bg rounded-lg p-4">
            <div className="text-sm text-brand-text-secondary mb-1">예상 토큰 수</div>
            <div className="text-lg font-semibold text-brand-text-primary">
              {formatNumber(compressionResult.estimatedTokens)}개
            </div>
            <div className="text-xs text-brand-text-secondary mt-1">
              (Gemini 2.5 Flash 제한: 1,000,000 토큰)
            </div>
          </div>

          {/* 품질 점수 */}
          <div className="bg-brand-bg rounded-lg p-4">
            <div className="text-sm text-brand-text-secondary mb-2">품질 점수</div>
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-brand-primary">
                {compressionResult.qualityScore.toFixed(1)}점
              </div>
              <div className="flex-1 bg-brand-secondary rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    compressionResult.qualityScore >= 80 ? 'bg-green-500' :
                    compressionResult.qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, compressionResult.qualityScore)}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-brand-text-secondary mt-1">
              {compressionResult.qualityScore >= 80 ? '우수' :
               compressionResult.qualityScore >= 60 ? '양호' : '개선 필요'}
            </div>
          </div>

          {/* 절약된 토큰 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">토큰 절약</div>
            <div className="text-lg font-semibold text-green-800">
              {formatNumber(compressionResult.originalLength / 4 - compressionResult.estimatedTokens)}개
            </div>
            <div className="text-xs text-green-600 mt-1">
              비용 절약 및 응답 속도 향상
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-80 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompressionStats;
