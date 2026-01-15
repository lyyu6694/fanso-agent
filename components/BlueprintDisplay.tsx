import React, { useRef, useState, useEffect } from 'react';
import { AnalysisResult, ChatMessage } from '../types';
import { Target, Anchor, Download, Loader2, X, FileText, Palette, Check, MessageSquareQuote, ListTodo, Zap, Layout, Network, Grid, CheckCircle2, ShieldAlert, TrendingUp, Feather, Star, ArrowRight, Activity, Lightbulb, ChevronDown, ChevronUp, Link, RefreshCcw, Box, ArrowUpRight, Compass, MousePointerClick } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BlueprintChat } from './BlueprintChat';
import { MermaidDiagram } from './MermaidDiagram';

interface BlueprintDisplayProps {
  data: AnalysisResult;
  chatHistory: ChatMessage[];
  onChatUpdate: (messages: ChatMessage[]) => void;
}

// --- Theme Configuration ---
interface Theme {
  id: string;
  name: string;
  primary: string; 
  secondary: string;
  accent: string;
  colors: {
      primaryHex: string; 
  }
}

const THEMES: Theme[] = [
  { 
    id: 'dopamine', 
    name: '多巴胺 (默认)', 
    primary: 'primary', 
    secondary: 'secondary', 
    accent: 'accent', 
    colors: { primaryHex: '#f97316' }
  },
  { 
    id: 'business', 
    name: '商务灰金', 
    primary: 'slate', 
    secondary: 'amber', 
    accent: 'blue', 
    colors: { primaryHex: '#475569' }
  },
  { 
    id: 'ocean', 
    name: '深海蓝调', 
    primary: 'blue', 
    secondary: 'cyan', 
    accent: 'sky', 
    colors: { primaryHex: '#3b82f6' }
  },
  {
    id: 'custom',
    name: '自定义配色',
    primary: 'custom', 
    secondary: 'secondary',
    accent: 'accent', 
    colors: { primaryHex: '#3b82f6' } 
  }
];

// --- Palette Generators ---
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
};

const mixColors = (c1: {r:number,g:number,b:number}, c2: {r:number,g:number,b:number}, weight: number) => {
    const w = 2 * weight - 1;
    const w1 = ((w * 0 === -1 ? w : (w + 0) / (1 + w * 0)) + 1) / 2;
    const w2 = 1 - w1;
    return {
        r: Math.round(w1 * c1.r + w2 * c2.r),
        g: Math.round(w1 * c1.g + w2 * c2.g),
        b: Math.round(w1 * c1.b + w2 * c2.b)
    };
};

const generatePalette = (hex: string) => {
  const base = hexToRgb(hex);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  
  return {
    50: mixColors(white, base, 0.95),
    100: mixColors(white, base, 0.9),
    200: mixColors(white, base, 0.75),
    300: mixColors(white, base, 0.6),
    400: mixColors(white, base, 0.3),
    500: base,
    600: mixColors(black, base, 0.1),
    700: mixColors(black, base, 0.3),
    800: mixColors(black, base, 0.5),
    900: mixColors(black, base, 0.7),
    950: mixColors(black, base, 0.85),
  };
};

const PASTEL_STYLES = [
    { bg: 'bg-purple-50', border: 'border-purple-100', hoverBorder: 'hover:border-purple-300', text: 'text-purple-900', tagBg: 'bg-purple-100', tagText: 'text-purple-700', icon: 'text-purple-500' },
    { bg: 'bg-orange-50', border: 'border-orange-100', hoverBorder: 'hover:border-orange-300', text: 'text-orange-900', tagBg: 'bg-orange-100', tagText: 'text-orange-700', icon: 'text-orange-500' },
    { bg: 'bg-cyan-50', border: 'border-cyan-100', hoverBorder: 'hover:border-cyan-300', text: 'text-cyan-900', tagBg: 'bg-cyan-100', tagText: 'text-cyan-700', icon: 'text-cyan-500' },
    { bg: 'bg-emerald-50', border: 'border-emerald-100', hoverBorder: 'hover:border-emerald-300', text: 'text-emerald-900', tagBg: 'bg-emerald-100', tagText: 'text-emerald-700', icon: 'text-emerald-500' },
    { bg: 'bg-blue-50', border: 'border-blue-100', hoverBorder: 'hover:border-blue-300', text: 'text-blue-900', tagBg: 'bg-blue-100', tagText: 'text-blue-700', icon: 'text-blue-500' },
];

export const BlueprintDisplay: React.FC<BlueprintDisplayProps> = ({ data, chatHistory, onChatUpdate }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeThemeId, setActiveThemeId] = useState('dopamine');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [customHex, setCustomHex] = useState('#3b82f6');
  const [activeModal, setActiveModal] = useState<'transcript' | 'tasks' | null>(null);
  const [showMindMap, setShowMindMap] = useState(true);

  const activeTheme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];

  useEffect(() => {
    if (activeThemeId === 'custom') {
        const palette = generatePalette(customHex);
        const root = document.documentElement;
        Object.entries(palette).forEach(([shade, rgb]) => {
            root.style.setProperty(`--c-${shade}`, `${rgb.r} ${rgb.g} ${rgb.b}`);
        });
        activeTheme.colors.primaryHex = customHex;
    }
  }, [activeThemeId, customHex]);

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);

  const withExportMode = async (callback: () => Promise<void>) => {
    setIsExportMode(true);
    const wasMindMapVisible = showMindMap;
    if (!wasMindMapVisible) setShowMindMap(true);

    await new Promise(resolve => setTimeout(resolve, 1000)); 
    try {
      await callback();
    } finally {
      setIsExportMode(false);
      if (!wasMindMapVisible) setShowMindMap(false);
    }
  };

  const handleDownloadPDF = async () => {
     if (!contentRef.current) return;
     setIsExportingPDF(true);
     await withExportMode(async () => {
        try {
            const canvas = await html2canvas(contentRef.current!, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: "#ffffff",
                logging: false,
                ignoreElements: (element) => element.classList.contains('no-export')
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgWidthPx = canvas.width;
            const imgHeightPx = canvas.height;
            const pdfWidthMm = 297; 
            const pdfHeightMm = (imgHeightPx * pdfWidthMm) / imgWidthPx;
            
            const pdf = new jsPDF({ orientation: pdfHeightMm > pdfWidthMm ? 'p' : 'l', unit: 'mm', format: [pdfWidthMm, pdfHeightMm] });
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMm, pdfHeightMm);
            pdf.save(`凡硕战略蓝图-${data.main_title.slice(0, 10)}.pdf`);
        } catch (err) { alert("导出 PDF 失败"); console.error(err); } 
     });
     setIsExportingPDF(false);
  };

  const generateMermaidChart = () => {
    return `
    graph TD
      root("${data.main_title}"):::root
      ${data.core_veins.map((vein, i) => `
        root --> vein${i}("${vein.title}"):::vein
        vein${i} --> desc${i}["${vein.tag}<br/>${vein.description.slice(0, 30)}..."]:::desc
      `).join('\n')}

      classDef root fill:${activeTheme.colors.primaryHex},stroke:none,color:#fff,rx:6,ry:6,font-weight:bold,font-size:16px;
      classDef vein fill:${activeThemeId === 'custom' ? '#64748b' : activeTheme.colors.primaryHex},stroke:none,color:#fff,rx:4,ry:4,font-weight:bold;
      classDef desc fill:#fff,stroke:${activeTheme.colors.primaryHex},stroke-width:1px,color:#64748b,rx:0,ry:0,stroke-dasharray: 5 5;
    `;
  };

  return (
    <div className={`space-y-8 ${isExportMode ? 'print-layout' : ''}`}>
      <style>{`
        .print-layout {
           width: 1400px;
           margin: 0 auto;
           background-color: #ffffff;
        }
        .print-layout * {
           transform: none !important;
           box-shadow: none !important;
           animation: none !important;
           transition: none !important;
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in {
          animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          opacity: 0; 
        }
      `}</style>

      {/* Top Floating Toolbar */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 no-export w-max max-w-[90vw] pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-200/40 rounded-full px-2 py-1.5 flex items-center gap-1 transition-all">
           <button onClick={() => setActiveModal('transcript')} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors text-xs font-bold">
              <FileText size={16} className={`text-${activeTheme.primary}-500`} /> <span>查看原文</span>
           </button>
           <button onClick={() => setActiveModal('tasks')} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors text-xs font-bold">
              <ListTodo size={16} className={`text-${activeTheme.secondary}-500`} /> <span>任务清单</span>
           </button>
           <div className="w-px h-4 bg-slate-200 mx-2"></div>
           
           <div className="relative">
              <button onClick={() => setShowThemeSelector(!showThemeSelector)} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors text-xs font-bold">
                 <Palette size={16} className={`text-${activeTheme.primary}-500`} /> <span>配色</span>
                 <div className="w-3 h-3 rounded-full ml-1 border border-slate-200" style={{ backgroundColor: activeThemeId === 'custom' ? customHex : undefined }}>
                    {activeThemeId !== 'custom' && <div className={`w-full h-full rounded-full bg-${activeTheme.primary}-500`}></div>}
                 </div>
              </button>
              {showThemeSelector && (
                 <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-fade-in-up origin-top-right">
                     {THEMES.filter(t => t.id !== 'custom').map(t => (
                         <button key={t.id} onClick={() => { setActiveThemeId(t.id); setShowThemeSelector(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-slate-50 transition-colors ${activeThemeId === t.id ? `text-${t.primary}-600 bg-${t.primary}-50` : 'text-slate-600'}`}>
                             <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full bg-${t.primary}-500`}></div>{t.name}</div>
                             {activeThemeId === t.id && <Check size={12} />}
                         </button>
                     ))}
                      <div className="border-t border-slate-100 my-2"></div>
                      <div className="px-2 pb-1">
                         <div className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${activeThemeId === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'}`} onClick={() => setActiveThemeId('custom')}>
                             <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 shrink-0">
                                <input type="color" value={customHex} onChange={(e) => { setCustomHex(e.target.value); setActiveThemeId('custom'); }} className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer border-none p-0 m-0" />
                             </div>
                             <div className="flex-1"><span className="text-xs font-bold text-slate-700 block">自定义颜色</span></div>
                             {activeThemeId === 'custom' && <Check size={12} className="text-blue-500" />}
                         </div>
                      </div>
                 </div>
              )}
           </div>

           <div className="w-px h-4 bg-slate-200 mx-2"></div>
           <button onClick={handleDownloadPDF} disabled={isExportingPDF} className={`flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-all ${isExportingPDF ? 'opacity-70' : ''}`}>
             {isExportingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} <span>导出PDF</span>
           </button>
        </div>
      </div>

      <div className="flex justify-center pb-20 pt-28 px-4 sm:px-6">
        <div ref={contentRef} className="w-full max-w-[1600px] bg-white rounded-none sm:rounded-[4px] shadow-2xl shadow-slate-200/50 flex flex-col overflow-hidden font-sans">
           
           {/* Header */}
           <div className="p-12 pb-6 border-b border-slate-100 bg-white relative overflow-hidden">
               <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-${activeTheme.primary}-50 to-transparent opacity-50 -z-10 rounded-bl-[100px] pointer-events-none`}></div>
               <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight animate-fade-in-up">{data.main_title}</h1>
               <div className="flex flex-wrap items-center gap-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                   <div className={`bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider shadow-md`}>本次深度研讨</div>
                   <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
                   <p className="text-lg font-medium text-slate-600 italic bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">{data.subtitle}</p>
               </div>
           </div>

           <div className="p-12 space-y-16 bg-white">
             
             {/* 1. Core Veins (Enhanced with Pop-in Animations & More Dimensions) */}
             <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <SectionHeader title="核心发展脉络" icon={<Activity className="w-5 h-5 text-white" />} color={`bg-${activeTheme.primary}-600`} />
                <div className="relative mt-12">
                    {/* Connecting Line */}
                    <div className="hidden md:block absolute top-12 left-[16%] w-[68%] h-0.5 border-t-2 border-dashed border-slate-200 -z-10"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {data.core_veins.map((vein, idx) => (
                            <div 
                                key={idx} 
                                className="animate-pop-in flex flex-col items-center bg-white rounded-3xl p-6 border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 group relative"
                                style={{ animationDelay: `${300 + idx * 200}ms` }}
                            >
                                {/* Header / Icon Area */}
                                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white text-4xl shadow-lg transition-transform duration-500 group-hover:scale-110 mb-6 ${idx === 0 ? `bg-gradient-to-br from-${activeTheme.primary}-500 to-${activeTheme.primary}-700` : idx === 1 ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-orange-500 to-orange-700'}`}>
                                    {idx === 0 ? <LinkIcon /> : idx === 1 ? <Zap size={40} /> : <TrendingUp size={40} />}
                                </div>
                                
                                <h3 className={`text-2xl font-black text-slate-800 mb-2 group-hover:text-${activeTheme.primary}-600 transition-colors`}>{vein.title}</h3>
                                
                                <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-6 border tracking-wide uppercase ${idx === 0 ? `bg-${activeTheme.primary}-50 text-${activeTheme.primary}-700 border-${activeTheme.primary}-100` : idx === 1 ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                    {vein.tag}
                                </div>
                                
                                <p className="text-slate-500 text-sm leading-relaxed text-center mb-8 px-2 flex-grow">
                                    {vein.description}
                                </p>

                                {/* New Analysis Dimensions */}
                                <div className="w-full grid grid-cols-2 gap-2 mt-auto">
                                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-center gap-1"><Compass size={10} /> 战略聚焦</div>
                                        <div className="text-xs font-bold text-slate-700 truncate" title={vein.strategic_focus}>{vein.strategic_focus || "Efficiency"}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-center gap-1"><MousePointerClick size={10} /> 关键举措</div>
                                        <div className="text-xs font-bold text-slate-700 truncate" title={vein.key_action}>{vein.key_action || "Execution"}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>

             {/* 2. Implementation Paths */}
             <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <SectionHeader title="关键实施路径" icon={<ListTodo className="w-5 h-5 text-white" />} color="bg-purple-600" />
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {data.implementation_paths.map((path, idx) => {
                        const style = PASTEL_STYLES[idx % PASTEL_STYLES.length];
                        return (
                            <div key={idx} className={`group relative ${style.bg} ${style.border} ${style.hoverBorder} border-2 p-6 rounded-2xl flex flex-col h-full hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className={`p-2.5 rounded-xl bg-white shadow-sm ${style.icon} group-hover:scale-110 transition-transform`}><Layout size={20} /></div>
                                    <h3 className={`text-lg font-bold ${style.text}`}>{path.title}</h3>
                                </div>
                                <span className={`self-start px-3 py-1 rounded-lg text-xs font-bold ${style.tagBg} ${style.tagText} mb-5 border border-white/50`}>{path.tag}</span>
                                <ul className="space-y-3 mb-6 flex-1">
                                    {path.points.map((p, pi) => (
                                        <li key={pi} className="flex items-start gap-2 text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-slate-300 group-hover:bg-slate-400`}></div>{p}
                                        </li>
                                    ))}
                                </ul>
                                <div className="pt-4 border-t border-black/5 text-xs font-bold text-slate-500 flex items-center gap-2">
                                    <Target size={14} className={style.icon} /> 目标底线: {path.bottom_line}
                                </div>
                            </div>
                        );
                    })}
                </div>
             </div>

             {/* 3. Advantages */}
             <div className="animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                <SectionHeader title="技术实现优势" icon={<Zap className="w-5 h-5 text-white" />} color="bg-orange-500" />
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {data.advantages.map((adv, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-0 overflow-hidden hover:shadow-lg hover:border-orange-300 transition-all duration-300 group">
                            <div className="p-6 pb-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center group-hover:bg-orange-50/30 transition-colors">
                                 <h3 className="text-lg font-bold text-slate-800">{adv.title}</h3>
                                 <div className="bg-white border border-slate-200 p-1.5 rounded-lg text-orange-500 shadow-sm"><Activity size={18} /></div>
                            </div>
                            <div className="p-6">
                                <div className="mb-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Features</span>
                                    <ul className="space-y-2 mt-2">
                                        {adv.features.map((f, fi) => (
                                            <li key={fi} className="flex items-start gap-2 text-xs text-slate-600 font-medium"><Check className="w-3.5 h-3.5 mt-0.5 text-green-500" />{f}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-bold text-slate-600 flex gap-2 items-center group-hover:bg-orange-50 group-hover:border-orange-100 group-hover:text-orange-700 transition-colors">
                                    <Star size={12} className="text-orange-400 fill-orange-400"/> Impact: {adv.impact}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* 4. Values */}
             <div className="animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                <SectionHeader title="目标与价值" icon={<Target className="w-5 h-5 text-white" />} color="bg-emerald-600" />
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                     {data.values.map((val, idx) => {
                         const gradients = ['from-emerald-50 to-teal-50 hover:to-emerald-100', 'from-cyan-50 to-blue-50 hover:to-cyan-100', 'from-violet-50 to-purple-50 hover:to-violet-100'];
                         const textColors = ['text-emerald-800', 'text-cyan-800', 'text-violet-800'];
                         const borderColors = ['border-emerald-100', 'border-cyan-100', 'border-violet-100'];
                         return (
                            <div key={idx} className={`bg-gradient-to-br ${gradients[idx % 3]} border ${borderColors[idx % 3]} rounded-2xl p-6 transition-all duration-500 hover:shadow-md group`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm"><TrendingUp size={18} className={textColors[idx % 3]} /></div>
                                    <h3 className={`text-lg font-bold ${textColors[idx % 3]}`}>{val.title}</h3>
                                </div>
                                <div className="relative mb-6">
                                    <MessageSquareQuote className="absolute -top-2 -left-1 text-black/5 w-8 h-8" />
                                    <p className="text-sm font-medium text-slate-700 italic relative z-10 pl-4 border-l-2 border-black/10">"{val.motto}"</p>
                                </div>
                                <div className="space-y-2">
                                    {val.benefits.map((b, bi) => (
                                        <div key={bi} className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white/40 p-2 rounded-lg">
                                            <div className={`w-1.5 h-1.5 rounded-full ${textColors[idx % 3].replace('text', 'bg')}`}></div>{b}
                                        </div>
                                    ))}
                                </div>
                            </div>
                         );
                     })}
                </div>
             </div>

             {/* 5. Risks & Opportunities (Distinct Split Color Coding) */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                 {/* Risks - Red Theme */}
                 <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-rose-500/10 transition-shadow group">
                     <div className="flex items-center gap-4 mb-8">
                         <div className="p-3 bg-white text-rose-600 rounded-2xl shadow-sm border border-rose-100 group-hover:scale-110 transition-transform">
                            <ShieldAlert size={28} />
                         </div>
                         <div>
                            <h3 className="font-black text-2xl text-slate-800">潜在风险预警</h3>
                            <p className="text-xs text-rose-600/70 font-bold uppercase tracking-wide">Risk Assessment</p>
                         </div>
                     </div>
                     <div className="space-y-4">
                         {data.risks && data.risks.map((risk, idx) => (
                             <div key={idx} className="flex flex-col bg-white p-5 rounded-2xl border border-rose-100 shadow-sm hover:-translate-y-1 transition-transform relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                                 <div className="flex items-center justify-between mb-2 pl-2">
                                     <h4 className="font-bold text-slate-800">{risk.title}</h4>
                                     <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide text-white ${risk.severity === 'High' ? 'bg-rose-600' : 'bg-orange-400'}`}>
                                         {risk.severity === 'High' ? 'High Risk' : risk.severity}
                                     </span>
                                 </div>
                                 <p className="text-sm text-slate-600 pl-2 mb-2">{risk.mitigation}</p>
                             </div>
                         ))}
                     </div>
                 </div>

                 {/* Opportunities - Emerald/Blue Theme */}
                 <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-emerald-500/10 transition-shadow group">
                     <div className="flex items-center gap-4 mb-8">
                         <div className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform">
                            <Lightbulb size={28} />
                         </div>
                         <div>
                             <h3 className="font-black text-2xl text-slate-800">战略机会点</h3>
                             <p className="text-xs text-emerald-600/70 font-bold uppercase tracking-wide">Growth Opportunities</p>
                         </div>
                     </div>
                     <div className="space-y-4">
                         {data.opportunities && data.opportunities.map((opp, idx) => (
                             <div key={idx} className="flex flex-col bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:-translate-y-1 transition-transform relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                 <div className="flex items-center justify-between mb-2 pl-2">
                                     <h4 className="font-bold text-slate-800">{opp.title}</h4>
                                     <ArrowUpRight size={16} className="text-emerald-500" />
                                 </div>
                                 <p className="text-sm text-slate-600 pl-2 leading-relaxed">{opp.description}</p>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>

             {/* 6. Architecture / Mind Map (Collapsible) */}
             <div className="border-t border-slate-100 pt-8 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
                 <button onClick={() => setShowMindMap(!showMindMap)} className="flex items-center justify-between w-full text-left group p-4 rounded-xl hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="bg-slate-700 p-2 rounded-lg text-white shadow-sm group-hover:scale-105 transition-transform"><Network size={20} /></div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">系统架构视图</h2>
                     </div>
                     <div className="text-slate-400 group-hover:text-slate-600 transition-colors">{showMindMap ? <ChevronUp /> : <ChevronDown />}</div>
                 </button>
                 {showMindMap && (
                     <div className="mt-6 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30 h-[600px] shadow-inner animate-fade-in">
                         <MermaidDiagram chart={generateMermaidChart()} />
                     </div>
                 )}
             </div>
           </div>

           {/* 7. Footer: Golden Sentence & Detailed Summary */}
           <div className="bg-slate-50 p-12 border-t border-slate-100">
               <div className="max-w-5xl mx-auto space-y-12">
                   {/* Golden Sentence */}
                   <div className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row items-center gap-8 transform hover:scale-[1.01] transition-transform duration-500 group relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400"></div>
                       <div className="p-6 bg-yellow-50 text-yellow-600 rounded-full shrink-0 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
                           <Star size={40} fill="currentColor" />
                       </div>
                       <div className="text-center md:text-left">
                           <h3 className="font-black text-sm text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center justify-center md:justify-start gap-3">
                               核心战略结论 <span className="w-12 h-px bg-slate-200"></span>
                           </h3>
                           <p className="text-2xl sm:text-3xl font-serif font-bold text-slate-800 italic leading-relaxed text-balance">
                               "{data.core_conclusion}"
                           </p>
                       </div>
                   </div>

                   {/* Executive Summary (Prominent) */}
                   <div className="space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative">
                       <div className="absolute -top-4 left-8 inline-flex items-center gap-2 bg-slate-800 text-white font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-lg shadow-lg">
                           <Feather size={14} /> 执行摘要 Executive Summary
                       </div>
                       <div className="pt-4">
                            <p className="text-slate-600 leading-8 text-lg font-medium text-justify">
                                {data.executive_summary || "暂无执行摘要。"}
                            </p>
                       </div>
                   </div>
                   
                   <div className="text-center pt-10 border-t border-slate-200/60">
                       <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Generated by 凡硕财税高级专家顾问 · Powered by Gemini 3 Pro · {new Date().toLocaleDateString()}</p>
                   </div>
               </div>
           </div>
        </div>
      </div>
      
      {/* --- MODALS --- */}
      
      {/* Transcript Modal */}
      {activeModal === 'transcript' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in no-export">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
            <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden transform scale-100 transition-all">
                <div className={`p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20`}>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><div className={`p-2 rounded-xl bg-${activeTheme.primary}-50 text-${activeTheme.primary}-600`}><FileText size={24} /></div> 对话原文全览</h3>
                    <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
                    {data.transcript_segments && data.transcript_segments.length > 0 ? (
                        data.transcript_segments.map((seg, idx) => (
                        <div key={idx} className="flex gap-4 group">
                            <div className="flex-shrink-0 flex flex-col items-center pt-1">
                                <div className={`w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold shadow-sm text-sm border border-slate-200`}>{seg.speaker.slice(0, 1)}</div>
                            </div>
                            <div className="flex-1 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`font-bold text-slate-800 text-sm`}>{seg.speaker}</span>
                                    {seg.timestamp && <span className={`text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100`}>{seg.timestamp}</span>}
                                </div>
                                <p className={`text-sm text-slate-700 leading-relaxed bg-slate-50/50 p-5 rounded-2xl rounded-tl-none border border-slate-100 hover:border-${activeTheme.primary}-200 hover:shadow-sm transition-all`}>{seg.text}</p>
                            </div>
                        </div>
                        ))
                    ) : <div className="text-center py-20 text-slate-400">暂无原文记录</div>}
                </div>
            </div>
        </div>
      )}

      {/* Task List Modal */}
      {activeModal === 'tasks' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in no-export">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
            <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden transform scale-100 transition-all">
                <div className={`p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20`}>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><div className={`p-2 rounded-xl bg-purple-50 text-purple-600`}><ListTodo size={24} /></div> 战略实施任务清单</h3>
                    <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
                     {data.implementation_paths.map((path, idx) => (
                      <div key={idx} className={`bg-white rounded-2xl p-8 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                             <h4 className={`font-bold text-slate-800 text-xl`}>{path.title}</h4>
                             <div className={`bg-purple-50 text-purple-700 font-bold px-3 py-1.5 rounded-lg text-xs self-start sm:self-auto border border-purple-100`}>{path.tag}</div>
                          </div>
                          <div className="space-y-4 mb-6">
                              {path.points.map((p, pi) => (
                                  <div key={pi} className={`flex items-start gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors`}>
                                      <CheckCircle2 size={18} className={`text-purple-400 shrink-0 mt-0.5`} />
                                      <span className={`text-sm text-slate-700 leading-relaxed`}>{p}</span>
                                  </div>
                              ))}
                          </div>
                          <div className={`text-sm font-medium text-slate-500 italic pt-4 border-t border-slate-100 flex items-center gap-2 bg-slate-50/50 p-3 rounded-lg -mx-2 -mb-2 mt-4`}>
                             <Target size={16} className={`text-purple-400`} />
                             <span className="font-bold text-xs uppercase tracking-wider text-slate-400 mr-2">目标底线</span> "{path.bottom_line}"
                          </div>
                      </div>
                   ))}
                </div>
            </div>
        </div>
      )}

      {/* Chat is outside contentRef so it won't be captured in Image/PDF */}
      <div className="no-export">
        <BlueprintChat blueprint={data} initialHistory={chatHistory} onHistoryUpdate={onChatUpdate} />
      </div>
    </div>
  );
};

// --- Sub Components ---

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; color: string; }> = ({ title, icon, color }) => (
  <div className="flex items-center gap-3 cursor-default group mb-6">
    <div className={`${color} p-2.5 rounded-xl shadow-lg shadow-black/5 transform group-hover:scale-110 transition-transform duration-300 text-white ring-2 ring-white`}>{icon}</div>
    <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
  </div>
);

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);