import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, FileText, X, UploadCloud, FileAudio, FileVideo, Image as ImageIcon, CheckCircle2, Plus, Eye, File as FileIcon, Loader2, AlertCircle, Type, Paperclip, Pause } from 'lucide-react';
import { extractTextFromFile } from '../utils/fileParser';

interface TranscriptInputProps {
  value: string;
  onChange: (value: string) => void;
  onFilesChange: (files: File[]) => void;
  selectedFiles: File[];
  onAnalyze: () => void;
  isLoading: boolean;
}

type InputMode = 'file' | 'text';

const MiniAudioPlayer: React.FC<{ file: File }> = ({ file }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      if (!isNaN(p)) setProgress(p);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
        const time = (Number(e.target.value) / 100) * audioRef.current.duration;
        audioRef.current.currentTime = time;
        setProgress(Number(e.target.value));
    }
  };

  return (
    <div className="flex items-center gap-3 w-full mt-3 bg-secondary-50/50 p-2 rounded-lg border border-secondary-100" onClick={(e) => e.stopPropagation()}>
        <audio 
            ref={audioRef} 
            src={url} 
            onTimeUpdate={onTimeUpdate} 
            onEnded={() => { setIsPlaying(false); setProgress(0); }}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="hidden" 
        />
        <button 
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-500 text-white hover:bg-secondary-600 shadow-sm transition-all shrink-0"
        >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
        </button>
        <div className="flex-1 flex flex-col justify-center">
            <input 
                type="range" 
                min="0" 
                max="100" 
                value={progress} 
                onChange={handleSeek}
                className="w-full h-1.5 bg-secondary-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-secondary-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
            />
        </div>
    </div>
  );
};

export const TranscriptInput: React.FC<TranscriptInputProps> = ({ 
  value, 
  onChange, 
  onFilesChange,
  selectedFiles,
  onAnalyze, 
  isLoading 
}) => {
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Preview State
  const [previewFile, setPreviewFile] = useState<{name: string, content: string, type: string} | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Simulated upload progress
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    // If files are selected, auto-switch to file mode
    if (selectedFiles.length > 0) setInputMode('file');
    // If text is present and no files, auto-switch to text mode (initial load maybe)
    else if (value.length > 0) setInputMode('text');
  }, []); // Run once on mount logic if needed, or rely on manual switch

  useEffect(() => {
    if (isLoading && selectedFiles.length > 0) {
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const next = { ...prev };
          selectedFiles.forEach(f => {
            const current = next[f.name] || 0;
            if (current < 100) {
              // Finish faster visually
              next[f.name] = Math.min(100, current + Math.random() * 25);
            }
          });
          return next;
        });
      }, 300);
      return () => clearInterval(interval);
    } else {
      setUploadProgress({});
    }
  }, [isLoading, selectedFiles]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setInputMode('file');
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
        if (file.size > 100 * 1024 * 1024) {
            alert(`文件 ${file.name} 过大，请上传小于 100MB 的文件。`);
            return false;
        }
        return true;
    });
    
    const newProgress = { ...uploadProgress };
    validFiles.forEach(f => newProgress[f.name] = 0);
    setUploadProgress(newProgress);

    onFilesChange([...selectedFiles, ...validFiles]);
    if (validFiles.length > 0) onChange(''); // Clear text if files added
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
    if (newFiles.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handlePreview = async (file: File) => {
    setIsPreviewLoading(true);
    try {
        let contentToDisplay = "";
        let type = "text";

        if (file.type.startsWith('image/')) {
            contentToDisplay = URL.createObjectURL(file);
            type = "image";
        } else {
            const text = await extractTextFromFile(file);
            contentToDisplay = text;

            if (text === "__PDF_NATIVE_PREVIEW__") {
                contentToDisplay = URL.createObjectURL(file);
                type = "pdf";
            } else if (text === "__MEDIA_NATIVE_PREVIEW__") {
                contentToDisplay = URL.createObjectURL(file);
                type = file.type.startsWith('video/') ? "video" : "audio";
            }
        }
        
        setPreviewFile({
            name: file.name,
            content: contentToDisplay,
            type: type
        });
    } catch (e) {
        alert("无法预览此文件，但它仍可被 AI 处理。");
    } finally {
        setIsPreviewLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('audio/')) return <FileAudio className="w-6 h-6 text-secondary-500" />; 
    if (type.startsWith('video/')) return <FileVideo className="w-6 h-6 text-primary-500" />; 
    if (type.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-accent-500" />; 
    if (type.includes('pdf')) return <FileIcon className="w-6 h-6 text-red-400" />;
    return <FileText className="w-6 h-6 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-black text-slate-800 uppercase tracking-wider">
          输入源素材
        </label>
        
        {/* Toggle Switch */}
        <div className="bg-slate-100 p-1 rounded-lg flex items-center">
            <button 
                onClick={() => setInputMode('file')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${inputMode === 'file' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Paperclip size={14} /> 文件上传
            </button>
            <button 
                onClick={() => setInputMode('text')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${inputMode === 'text' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Type size={14} /> 文本输入
            </button>
        </div>
      </div>

      <div className="relative space-y-4">
        
        {/* File Upload Mode */}
        {inputMode === 'file' && (
          <div 
            className={`relative border-2 border-dashed rounded-3xl p-8 transition-all text-center group min-h-[200px] flex flex-col justify-center
              ${dragActive ? 'border-primary-500 bg-primary-50 scale-[1.02]' : 'border-slate-200 bg-slate-50/50 hover:border-primary-400 hover:bg-white'}
              ${selectedFiles.length > 0 ? 'border-solid border-primary-200 bg-white shadow-xl shadow-primary-500/5 items-stretch justify-start' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
             <input 
                ref={fileInputRef}
                type="file" 
                multiple
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }}
                accept="audio/*,video/*,image/*,application/pdf,text/*,.docx,.doc,.md,.csv,.json,.txt"
             />

             {selectedFiles.length > 0 ? (
               <div className="space-y-3 w-full">
                 <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                   {selectedFiles.map((file, idx) => {
                     const progress = uploadProgress[file.name] || 0;
                     const isProcessing = isLoading;
                     const isAudio = file.type.startsWith('audio/');

                     return (
                       <div key={`${file.name}-${idx}`} className="relative overflow-hidden p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm animate-fade-in group/file">
                         
                         {/* Progress Background Bar */}
                         {isProcessing && (
                           <div 
                              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary-400 to-secondary-500 transition-all duration-300 ease-out" 
                              style={{ width: `${Math.min(progress, 100)}%` }} 
                           />
                         )}

                         <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4 overflow-hidden flex-1">
                                <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                                  {getFileIcon(file.type)}
                                </div>
                                <div className="text-left min-w-0 flex-1">
                                  <p className="font-bold text-slate-800 text-sm truncate">{file.name}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] text-slate-500 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    {isProcessing && (
                                        <span className="text-[10px] text-primary-600 font-bold animate-pulse">
                                          • 上传解析中 {Math.round(progress)}%
                                        </span>
                                    )}
                                  </div>
                                  {/* Inline Audio Player for Audio Files */}
                                  {isAudio && <MiniAudioPlayer file={file} />}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                              {isLoading ? (
                                 <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-primary-600">{Math.round(progress)}%</span>
                                    {progress < 100 ? <Loader2 className="w-4 h-4 text-primary-500 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                 </div>
                              ) : (
                                <>
                                  {/* Hide preview button for audio files since they have inline player */}
                                  {!isAudio && (
                                    <button 
                                        onClick={() => handlePreview(file)}
                                        className="p-2 bg-white text-primary-500 rounded-full shadow-sm hover:bg-primary-50 transition-colors"
                                        title="预览内容"
                                    >
                                        <Eye size={16} />
                                    </button>
                                  )}
                                  <button onClick={() => removeFile(idx)} className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                                      <X size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
                 
                 <div className="pt-4 flex justify-center">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-5 py-2.5 rounded-full transition-all border border-primary-200 shadow-sm hover:shadow-md"
                        disabled={isLoading}
                    >
                        <Plus size={16} />
                        添加更多文件
                    </button>
                 </div>
               </div>
             ) : (
               <div className="cursor-pointer w-full h-full flex flex-col items-center justify-center py-4" onClick={() => fileInputRef.current?.click()}>
                 <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mb-4 text-primary-500 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    <UploadCloud size={32} />
                 </div>
                 <p className="text-base font-bold text-slate-700 group-hover:text-primary-600 transition-colors">点击上传或拖拽文件到此处</p>
                 <p className="text-xs text-slate-400 mt-2 font-medium">支持: 音视频, PDF, DOCX, 图片, 文本 (最大 100MB)</p>
               </div>
             )}
          </div>
        )}

        {/* Text Area Mode */}
        {inputMode === 'text' && (
          <div className="relative group animate-fade-in">
            <textarea
              value={value}
              onChange={(e) => {
                  onChange(e.target.value);
                  if (selectedFiles.length > 0 && e.target.value.length > 0) {
                      // Optionally clear files if text is dominant? Or allow both. 
                      // Keeping both for now but UI prioritizes one.
                  }
              }}
              disabled={isLoading}
              placeholder="直接在此处粘贴会议记录、讲座笔记或头脑风暴文本..."
              className={`w-full p-6 bg-slate-50/50 border-2 border-slate-200 rounded-3xl focus:ring-0 focus:border-primary-400 transition-all resize-y font-mono text-slate-700 leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed text-sm h-64`}
            />
            {value && !isLoading && (
              <button 
                onClick={() => onChange('')}
                className="absolute top-4 right-4 p-2 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-200 transition-colors shadow-sm"
                title="清空文本"
              >
                <X size={16} />
              </button>
            )}
            <div className="absolute bottom-4 right-4 text-xs text-slate-400 font-bold bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                {value.length} 字符
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={onAnalyze}
          disabled={(!value.trim() && selectedFiles.length === 0) || isLoading}
          className={`flex-1 flex items-center justify-center gap-3 py-4 px-8 rounded-2xl font-black text-white text-lg shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0
            ${(!value.trim() && selectedFiles.length === 0) || isLoading 
              ? 'bg-slate-300 cursor-not-allowed shadow-none' 
              : 'bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-600 hover:shadow-secondary-500/40 animate-gradient bg-[length:200%_auto]'
            }`}
        >
          {isLoading ? (
            <>AI 正在思考...</>
          ) : (
            <>
              <Play size={20} fill="currentColor" />
              生成战略蓝图
            </>
          )}
        </button>
      </div>
      
      {/* File Preview Modal (Using Portal to break out of parent transforms) */}
      {previewFile && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setPreviewFile(null)}></div>
            
            {/* Window Container */}
            <div 
                className={`relative z-10 bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col transition-all duration-300
                    ${(previewFile.type === 'video' || previewFile.type === 'image') 
                        ? 'w-auto h-auto max-w-[95vw] max-h-[95vh] bg-black border border-white/10' 
                        : 'w-full max-w-5xl h-[85vh]'
                    }
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button - Floating Top Right */}
                <button 
                    onClick={() => setPreviewFile(null)} 
                    className={`absolute top-4 right-4 z-50 p-2 rounded-full transition-all shadow-lg backdrop-blur-sm
                        ${(previewFile.type === 'video' || previewFile.type === 'image') 
                            ? 'bg-black/50 text-white hover:bg-red-600 hover:text-white border border-white/20' 
                            : 'bg-slate-100/80 text-slate-500 hover:bg-red-500 hover:text-white'
                        }
                    `}
                    title="关闭预览"
                >
                    <X size={24} />
                </button>

                {/* Content Area */}
                <div className="flex-1 overflow-auto flex items-center justify-center relative w-full h-full bg-slate-50/50">
                    {previewFile.type === 'pdf' ? (
                        <iframe src={previewFile.content} className="w-full h-full" title="PDF Preview" />
                    ) : previewFile.type === 'image' ? (
                        <img src={previewFile.content} alt={previewFile.name} className="max-w-full max-h-full object-contain" />
                    ) : previewFile.type === 'video' ? (
                        <video controls autoPlay src={previewFile.content} className="max-w-full max-h-full object-contain" />
                    ) : previewFile.type === 'audio' ? (
                        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-slate-100 text-center relative z-10">
                            <div className="w-20 h-20 bg-secondary-50 text-secondary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FileAudio size={40} />
                            </div>
                            <h4 className="font-bold text-slate-800 mb-6 truncate px-4">{previewFile.name}</h4>
                            <audio controls src={previewFile.content} className="w-full" />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-white p-8 overflow-auto">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed max-w-4xl mx-auto">
                                {previewFile.content}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
      )}

      {isPreviewLoading && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-bold text-slate-700">正在提取内容...</span>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};