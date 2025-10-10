import React, { useState, useEffect } from 'react';
import { githubService } from '../services/githubService';

interface PDFFile {
  name: string;
  size: number;
  lastModified: string;
}

interface ProcessingSettings {
  chunkSize: number;
  overlapSize: number;
}

const AdminPage: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState<ProcessingSettings>({
    chunkSize: 2000,
    overlapSize: 200
  });

  // PDF 파일 목록 로드
  useEffect(() => {
    loadPdfFiles();
  }, []);

  const loadPdfFiles = async () => {
    try {
      setIsLoading(true);
      const files = await githubService.getPdfFiles();
      setPdfFiles(files);
    } catch (error) {
      console.error('PDF 파일 목록 로드 실패:', error);
      setMessage('PDF 파일 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsLoading(true);
      setMessage('');

      for (const file of files) {
        if (file.type !== 'application/pdf') {
          setMessage(`${file.name}은 PDF 파일이 아닙니다.`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB 제한
          setMessage(`${file.name}은 10MB를 초과합니다.`);
          continue;
        }

        await githubService.uploadPdfFile(file);
        setMessage(`${file.name} 업로드 완료`);
      }

      // 파일 목록 새로고침
      await loadPdfFiles();
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      setMessage('파일 업로드에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`${fileName}을 삭제하시겠습니까?`)) return;

    try {
      setIsLoading(true);
      await githubService.deletePdfFile(fileName);
      setMessage(`${fileName} 삭제 완료`);
      await loadPdfFiles();
    } catch (error) {
      console.error('파일 삭제 실패:', error);
      setMessage('파일 삭제에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPdfs = async () => {
    try {
      setIsProcessing(true);
      setMessage('PDF 처리를 시작합니다...');
      
      await githubService.triggerPdfProcessing(settings);
      setMessage('PDF 처리가 시작되었습니다. GitHub Actions에서 처리 중입니다.');
    } catch (error) {
      console.error('PDF 처리 트리거 실패:', error);
      setMessage('PDF 처리 시작에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-primary">
      <div className="max-w-6xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-brand-primary mb-2">관리자 설정</h1>
              <p className="text-brand-text-secondary">PDF 파일 관리 및 processed-pdfs.json 생성</p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-brand-secondary text-brand-text-primary rounded-lg hover:bg-opacity-80 transition-colors"
            >
              메인으로 돌아가기
            </a>
          </div>
        </div>

        {/* 메시지 표시 */}
        {message && (
          <div className="mb-6 p-4 bg-brand-surface border border-brand-primary rounded-lg">
            <p className="text-brand-text-primary">{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PDF 관리 섹션 */}
          <div className="bg-brand-surface rounded-lg p-6">
            <h2 className="text-xl font-semibold text-brand-text-primary mb-4">PDF 파일 관리</h2>
            
            {/* 파일 업로드 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-brand-text-primary mb-2">
                PDF 파일 업로드
              </label>
              <div className="border-2 border-dashed border-brand-secondary rounded-lg p-6 text-center hover:border-brand-primary transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer block"
                >
                  <svg className="w-12 h-12 mx-auto text-brand-secondary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-brand-text-secondary">
                    클릭하거나 파일을 드래그하여 업로드
                  </p>
                  <p className="text-xs text-brand-text-secondary mt-1">
                    PDF 파일만 업로드 가능 (최대 10MB)
                  </p>
                </label>
              </div>
            </div>

            {/* 현재 PDF 파일 목록 */}
            <div>
              <h3 className="text-lg font-medium text-brand-text-primary mb-3">현재 업로드된 파일</h3>
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-brand-text-secondary mt-2">로딩 중...</p>
                </div>
              ) : pdfFiles.length === 0 ? (
                <p className="text-brand-text-secondary text-center py-4">업로드된 PDF 파일이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {pdfFiles.map((file) => (
                    <div key={file.name} className="flex items-center justify-between p-3 bg-brand-bg rounded-lg">
                      <div className="flex-1">
                        <p className="text-brand-text-primary font-medium">{file.name}</p>
                        <p className="text-xs text-brand-text-secondary">
                          {formatFileSize(file.size)} • {new Date(file.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.name)}
                        disabled={isLoading}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 처리 설정 섹션 */}
          <div className="bg-brand-surface rounded-lg p-6">
            <h2 className="text-xl font-semibold text-brand-text-primary mb-4">PDF 처리 설정</h2>
            
            <div className="space-y-4">
              {/* 청크 크기 설정 */}
              <div>
                <label className="block text-sm font-medium text-brand-text-primary mb-2">
                  청크 크기 (문자 수)
                </label>
                <input
                  type="number"
                  value={settings.chunkSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, chunkSize: parseInt(e.target.value) || 2000 }))}
                  className="w-full p-3 bg-brand-bg border border-brand-secondary rounded-lg text-brand-text-primary focus:outline-none focus:border-brand-primary"
                  min="500"
                  max="10000"
                  step="100"
                />
                <p className="text-xs text-brand-text-secondary mt-1">
                  PDF를 나눌 청크의 크기 (500-10000자)
                </p>
              </div>

              {/* 오버랩 크기 설정 */}
              <div>
                <label className="block text-sm font-medium text-brand-text-primary mb-2">
                  오버랩 크기 (문자 수)
                </label>
                <input
                  type="number"
                  value={settings.overlapSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, overlapSize: parseInt(e.target.value) || 200 }))}
                  className="w-full p-3 bg-brand-bg border border-brand-secondary rounded-lg text-brand-text-primary focus:outline-none focus:border-brand-primary"
                  min="0"
                  max="1000"
                  step="50"
                />
                <p className="text-xs text-brand-text-secondary mt-1">
                  청크 간 겹치는 부분의 크기 (0-1000자)
                </p>
              </div>

              {/* 처리 버튼 */}
              <div className="pt-4">
                <button
                  onClick={handleProcessPdfs}
                  disabled={isProcessing || pdfFiles.length === 0}
                  className="w-full py-3 px-4 bg-brand-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      처리 중...
                    </div>
                  ) : (
                    'processed-pdfs.json 생성'
                  )}
                </button>
                <p className="text-xs text-brand-text-secondary mt-2 text-center">
                  GitHub Actions에서 PDF를 처리하고 processed-pdfs.json을 생성합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 현재 설정 표시 */}
        <div className="mt-8 bg-brand-surface rounded-lg p-6">
          <h3 className="text-lg font-medium text-brand-text-primary mb-3">현재 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-brand-text-secondary">청크 크기:</span>
              <span className="text-brand-text-primary ml-2">{settings.chunkSize}자</span>
            </div>
            <div>
              <span className="text-brand-text-secondary">오버랩 크기:</span>
              <span className="text-brand-text-primary ml-2">{settings.overlapSize}자</span>
            </div>
            <div>
              <span className="text-brand-text-secondary">업로드된 파일:</span>
              <span className="text-brand-text-primary ml-2">{pdfFiles.length}개</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
