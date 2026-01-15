import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, AlertCircle, Sparkles, Command, History, Trash2, Clock, ChevronRight, X, LogOut, Settings, Hammer, PenTool, Braces, Layers } from 'lucide-react';
import { TranscriptInput } from './components/TranscriptInput';
import { BlueprintDisplay } from './components/BlueprintDisplay';
import { BlueprintChat } from './components/BlueprintChat';
import { Login } from './components/Login';
import { SettingsModal } from './components/SettingsModal';
import { AuthService } from './services/authService';
import { generateBlueprint } from './services/geminiService';
import { AnalysisResult, HistoryItem, User, ChatMessage } from './types';

const LOADING_MESSAGES = [
  "正在调用凡硕专家知识库...",
  "正在全网搜索最新财税政策...",
  "正在解构对话逻辑...",
  "正在提取核心战略脉络...",
  "正在绘制实施路径图...",
  "正在综合技术优势与价值...",
  "正在为您的战略蓝图注入灵魂..."
];

const LOADING_ICONS = [
  Layers,
  Braces,
  PenTool,
  Hammer,
  Sparkles
];

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // App State
  const [transcript, setTranscript] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);

  // Refs for mouse follower
  const cursorBubbleRef = useRef<HTMLDivElement>(null);

  // Check login on mount
  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) setUser(currentUser);

    const savedHistory = localStorage.getItem('fs_agent_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) { console.error(e); }
    }
  }, []);

  // Prevent accidental exit during loading & Mouse Follower Logic
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome/modern browsers
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (cursorBubbleRef.current) {
            // Move the bubble to mouse position with a slight offset
            cursorBubbleRef.current.style.transform = `translate(${e.clientX + 20}px, ${e.clientY + 20}px)`;
        }
    };

    if (loading) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [loading]);

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
  };

  // Cycle loading messages
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000); 
    } else {
      setLoadingMsgIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const saveToHistory = (newResult: AnalysisResult) => {
    const newId = Date.now().toString();
    const newItem: HistoryItem = {
      id: newId,
      date: Date.now(),
      result: newResult,
      chatHistory: [] // Init empty chat
    };
    const updatedHistory = [newItem, ...history].slice(0, 50); // Keep last 50
    setHistory(updatedHistory);
    localStorage.setItem('fs_agent_history', JSON.stringify(updatedHistory));
    setCurrentHistoryId(newId);
    return newId;
  };

  const updateChatHistory = (messages: ChatMessage[]) => {
    // If viewing a historical/current report, save chat to it
    if (currentHistoryId) {
        const updatedHistory = history.map(item => {
            if (item.id === currentHistoryId) {
                return { ...item, chatHistory: messages };
            }
            return item;
        });
        setHistory(updatedHistory);
        localStorage.setItem('fs_agent_history', JSON.stringify(updatedHistory));
    } else {
        // If "Global Chat" without specific report context, we might just keep it ephemeral 
        // or store in a special "global" key. For now, ephemeral or tied to last session if we wanted.
        // But requirements imply context aware. 
        // We will pass `messages` back to BlueprintChat local state mostly.
    }
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('fs_agent_history', JSON.stringify(updated));
    if (currentHistoryId === id) {
        setResult(null);
        setCurrentHistoryId(null);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setResult(item.result);
    setCurrentHistoryId(item.id);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyze = async () => {
    if (!transcript.trim() && selectedFiles.length === 0) return;

    setLoading(true);
    // Auto-scroll to top to show the loading view clearly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setProgress(0);
    setError(null);
    setResult(null);
    setCurrentHistoryId(null);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const increment = Math.max(0.5, (95 - prev) / 20);
        return prev + increment;
      });
    }, 200);

    try {
      const input = selectedFiles.length > 0 ? selectedFiles : transcript;
      const data = await generateBlueprint(input);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Save successful result to history
      saveToHistory(data); // This sets currentHistoryId

      setTimeout(() => {
         setResult(data);
         setLoading(false);
      }, 600);

    } catch (err: any) {
      clearInterval(progressInterval);
      setLoading(false);
      setError(err.message || "分析失败，请检查 API Key 或文件格式后重试。");
    }
  };

  const handleReset = () => {
    setResult(null);
    setTranscript('');
    setSelectedFiles([]);
    setError(null);
    setProgress(0);
    setCurrentHistoryId(null);
  };

  // Determine current chat context
  const currentChatHistory = history.find(h => h.id === currentHistoryId)?.chatHistory || [];
  
  // Create global context string from history
  const globalContextSummary = history.map(item => {
      return `- [${new Date(item.date).toLocaleDateString()}] ${item.result.main_title}: ${item.result.subtitle}`;
  }).join('\n');

  // --- Render Logic ---

  if (!user) {
    return <Login onLogin={setUser} />;
  }
  
  const CurrentLoadingIcon = LOADING_ICONS[loadingMsgIndex % LOADING_ICONS.length];

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50 relative overflow-x-hidden selection:bg-primary-200 selection:text-primary-900">
      
      {/* Loading Overlay - FULL SCREEN, HIGH Z-INDEX */}
      {loading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-white/80 backdrop-blur-md transition-all duration-300">
            <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full text-center relative overflow-hidden pointer-events-auto animate-fade-in-up">
                {/* Background decoration inside card */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400 via-secondary-500 to-primary-400 animate-gradient bg-[length:200%_auto]"></div>
                
                <div className="relative mb-8 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <LayoutDashboard size={80} className="text-slate-400" />
                    </div>
                    <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl flex items-center justify-center text-primary-600 shadow-inner">
                        <CurrentLoadingIcon size={40} className="animate-bounce" />
                    </div>
                </div>

                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">正在构建活力蓝图</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">AI Consultant Working</p>

                <div className="h-12 flex items-center justify-center">
                    <p className="text-primary-600 font-bold text-lg animate-fade-in-up key={loadingMsgIndex}">
                        {LOADING_MESSAGES[loadingMsgIndex]}
                    </p>
                </div>
              
                {/* Progress Bar */}
                <div className="mt-8 relative">
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-primary-400 to-secondary-500 h-3 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-400 mt-2">
                          <span>进度</span>
                          <span>{Math.round(progress)}%</span>
                    </div>
                </div>

                <p className="text-xs text-slate-400 mt-8 italic">
                    正在调用 Gemini 3 Pro 深度思考模型，请稍候...
                </p>
            </div>
        </div>
      )}
      
      {/* Mouse Follower Bubble - Only visible during loading */}
      {loading && (
        <div 
          ref={cursorBubbleRef}
          className="fixed top-0 left-0 z-[10000] pointer-events-none bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border-2 border-primary-100 text-primary-600 text-sm font-bold flex items-center gap-2 animate-pulse"
          style={{ willChange: 'transform' }}
        >
          <Sparkles size={16} className="animate-spin-slow text-secondary-500 fill-secondary-500" />
          <span>顾问分析中...</span>
        </div>
      )}

      {/* Background Blobs for Dopamine Effect */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-secondary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-20 w-[500px] h-[500px] bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="bg-white/70 border-b border-white/50 sticky top-0 z-40 shadow-sm backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary-400 to-secondary-500 p-2.5 rounded-xl text-white shadow-lg shadow-primary-500/20 transform hover:scale-105 transition-transform">
              <LayoutDashboard size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600 tracking-tight">凡硕财税Agent</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {user.role === 'admin' ? '高级专家顾问版' : 'Powered by Gemini 3 Pro'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {/* Only Admin can see Settings */}
             {user.role === 'admin' && (
               <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-slate-500 hover:text-white hover:bg-slate-900 rounded-full transition-colors relative group"
                  title="管理员设置"
                  disabled={loading}
               >
                 <Settings size={20} />
                 <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    系统设置
                 </span>
               </button>
             )}

             <button 
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors px-4 py-2 rounded-full hover:bg-white/80"
                disabled={loading}
              >
                <History size={18} />
                <span className="hidden sm:inline">历史</span>
             </button>
             {result && (
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors px-5 py-2 rounded-full shadow-lg shadow-slate-900/20"
                >
                  <Command size={16} />
                  新建
                </button>
             )}
             <button
               onClick={handleLogout}
               className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2"
               title="退出登录"
               disabled={loading}
             >
                <LogOut size={18} />
             </button>
          </div>
        </div>
      </header>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} />

      {/* History Sidebar */}
      <div 
        className={`fixed inset-0 z-50 transition-visibility duration-300 ${showHistory ? 'visible' : 'invisible'}`}
      >
        <div 
          className={`absolute inset-0 bg-slate-900/10 backdrop-blur-sm transition-opacity duration-300 ${showHistory ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowHistory(false)}
        />
        <div 
          className={`absolute right-0 top-0 h-full w-full sm:w-96 bg-white/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-out flex flex-col border-l border-white/50 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-secondary-50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock size={20} className="text-primary-500" />
              分析历史
            </h2>
            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white rounded-full text-slate-500 transition-colors shadow-sm">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <History size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm">暂无历史记录</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                  className="group relative bg-white border border-slate-100 rounded-2xl p-4 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-100/50 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2 pr-6 group-hover:text-primary-600 transition-colors">
                      {item.result.main_title}
                    </h3>
                    <button 
                      onClick={(e) => deleteHistoryItem(e, item.id)}
                      className="text-slate-300 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-all absolute top-3 right-3 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3">{item.result.subtitle}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-primary-600 font-bold bg-primary-50 px-2 py-0.5 rounded-full">
                      {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-all">
                        <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 relative z-10">
        {!result ? (
          <div className="max-w-3xl mx-auto space-y-10 animate-fade-in-up">
            
            {/* Conditional Rendering: Show Input only when NOT loading */}
            {!loading && (
              <>
                <div className="text-center space-y-6 py-4">
                  <h2 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                    将对话转化为 <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-600 animate-gradient">多巴胺战略蓝图</span>
                  </h2>
                  <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
                    凡硕财税Agent 能帮您提取会议、咨询录音中的核心逻辑，一键生成<span className="text-primary-600 font-bold">温暖、高能、可视化</span>的结构化咨询报告。
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-primary-900/10 border border-white/50 overflow-hidden relative group transform hover:scale-[1.01] transition-all duration-500">
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary-400 via-secondary-500 to-accent-500" />
                  <div className="p-8 sm:p-10">
                    <TranscriptInput 
                      value={transcript} 
                      onChange={setTranscript} 
                      selectedFiles={selectedFiles}
                      onFilesChange={setSelectedFiles}
                      onAnalyze={handleAnalyze} 
                      isLoading={loading}
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 animate-fade-in shadow-lg shadow-red-100/50">
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <BlueprintDisplay 
              data={result} 
              chatHistory={currentChatHistory}
              onChatUpdate={updateChatHistory}
            />
          </div>
        )}
      </main>
      
      <footer className="py-8 text-center text-slate-400 text-sm font-medium relative z-10">
        <p>© {new Date().getFullYear()} 凡硕财税Agent · Powered by Gemini.</p>
      </footer>
      
      {/* GLOBAL CHAT ASSISTANT - Always available but contextual */}
      <BlueprintChat 
          blueprint={result} 
          globalContext={globalContextSummary}
          initialHistory={currentChatHistory} 
          onHistoryUpdate={updateChatHistory} 
      />
    </div>
  );
};

export default App;