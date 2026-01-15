import React, { useRef, useState, useEffect } from 'react';
import { AnalysisResult, ChatMessage } from '../types';
import { Target, Anchor, Download, Loader2, X, FileText, Palette, Check, MessageSquareQuote, ListTodo, Zap, Layout, Network, Grid, CheckCircle2, ShieldAlert, TrendingUp, Feather, Star, ArrowRight, Activity, Lightbulb, ChevronDown, ChevronUp, Link, RefreshCcw, Box, ArrowUpRight, Compass, MousePointerClick, ChevronRight, BarChart3, Settings2, Coins, Users, Lock, Globe, Scale, Briefcase, Building, Cpu, Database, PieChart, ShieldCheck, HeartHandshake, Rocket, Brain, Gavel, Workflow, Layers, Search, Map } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  colors: {
    primary: string; // Hex
    secondary: string; // Hex
  }
}

const THEMES: Theme[] = [
  { 
    id: 'dopamine', 
    name: '多巴胺 (默认)', 
    colors: { primary: '#f97316', secondary: '#f43f5e' } // Orange / Rose
  },
  { 
    id: 'business', 
    name: '商务灰金', 
    colors: { primary: '#475569', secondary: '#d97706' } // Slate / Amber
  },
  { 
    id: 'ocean', 
    name: '深海蓝调', 
    colors: { primary: '#0ea5e9', secondary: '#6366f1' } // Sky / Indigo
  },
  { 
    id: 'nature', 
    name: '森系清新', 
    colors: { primary: '#10b981', secondary: '#84cc16' } // Emerald / Lime
  },
  { 
    id: 'tech', 
    name: '极客紫夜', 
    colors: { primary: '#8b5cf6', secondary: '#ec4899' } // Violet / Pink
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

// --- Smart Icon System ---
const getSmartIcon = (text: string) => {
  const t = text.toLowerCase();
  // Finance / Cost / Money
  if (t.match(/cost|finance|money|budget|revenue|profit|price|funding|capital|资金|成本|财务|利润|收入|价格|预算|资本/)) return <Coins size={48} />;
  // Risk / Security / Law
  if (t.match(/risk|security|compliance|audit|legal|law|regulation|protect|safe|风险|安全|合规|审计|法律|法务|监管|保护/)) return <ShieldCheck size={48} />;
  // Growth / Strategy / Future
  if (t.match(/growth|scale|expand|strategy|future|vision|roadmap|plan|launch|增长|扩张|战略|未来|愿景|规划|启动/)) return <Rocket size={48} />;
  // Tech / Digital / Data
  if (t.match(/tech|data|ai|digital|system|platform|code|software|app|cloud|it|技术|数据|数字化|系统|平台|软件|云/)) return <Cpu size={48} />;
  // People / Team / Culture
  if (t.match(/people|team|talent|hr|culture|employee|staff|human|人员|团队|人才|文化|员工|人力/)) return <Users size={48} />;
  // Efficiency / Process / Operations
  if (t.match(/efficiency|process|speed|workflow|optimize|autom|operation|exec|效率|流程|速度|优化|自动化|运营|执行/)) return <Workflow size={48} />;
  // Market / Global / Sales
  if (t.match(/market|global|international|sales|marketing|customer|client|brand|市场|全球|国际|销售|营销|客户|品牌/)) return <Globe size={48} />;
  // Management / Governance
  if (t.match(/manage|govern|admin|lead|control|direct|管理|治理|领导|控制|指挥/)) return <Briefcase size={48} />;
  // Analysis / Insight / Research
  if (t.match(/analy|insight|report|intell|research|study|learn|know|分析|洞察|报告|智能|研究|学习/)) return <Brain size={48} />;
  // Legal specific
  if (t.match(/contract|agreement|dispute|court|合同|协议|纠纷|法庭/)) return <Gavel size={48} />;
  
  // Default fallback
  return <Lightbulb size={48} />; 
};

// Helper to sanitize text for Mermaid diagrams
const sanitizeForMermaid = (str: string) => {
    if (!str) return '';
    return str.replace(/["()\[\]]/g, "'").replace(/\n/g, ' ').replace(/[:;]/g, ' ').trim();
};

export const BlueprintDisplay: React.FC<BlueprintDisplayProps> = ({ data, chatHistory, onChatUpdate }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Theme State
  const [activeThemeId, setActiveThemeId] = useState('dopamine');
  const [customPrimary, setCustomPrimary] = useState('#f97316');
  const [customSecondary, setCustomSecondary] = useState('#f43f5e');
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // Layout State
  const [activeModal, setActiveModal] = useState<'transcript' | 'tasks' | null>(null);
  const [showMindMap, setShowMindMap] = useState(true);

  // Init Theme State from Storage on Mount
  useEffect(() => {
    const storedPrimary = localStorage.getItem('fs_theme_primary');
    const storedSecondary = localStorage.getItem('fs_theme_secondary');
    
    // Check if it matches a preset
    if (storedPrimary && storedSecondary) {
       const preset = THEMES.find(t => t.colors.primary === storedPrimary && t.colors.secondary === storedSecondary);
       if (preset) {
           setActiveThemeId(preset.id);
       } else {
           setActiveThemeId('custom');
           setCustomPrimary(storedPrimary);
           setCustomSecondary(storedSecondary);
       }
    }
  }, []);

  // Apply Theme Colors to CSS Variables & Persist
  useEffect(() => {
    const root = document.documentElement;
    let pHex, sHex;

    if (activeThemeId === 'custom') {
        pHex = customPrimary;
        sHex = customSecondary;
    } else {
        const theme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];
        pHex = theme.colors.primary;
        sHex = theme.colors.secondary;
    }

    // Save to storage
    localStorage.setItem('fs_theme_primary', pHex);
    localStorage.setItem('fs_theme_secondary', sHex);

    const p = generatePalette(pHex);
    const s = generatePalette(sHex);

    // Apply Primary Shades
    Object.entries(p).forEach(([shade, val]) => {
        const rgb = val as { r: number, g: number, b: number };
        root.style.setProperty(`--c-primary-${shade}`, `${rgb.r} ${rgb.g} ${rgb.b}`);
    });
    // Apply Secondary Shades
    Object.entries(s).forEach(([shade, val]) => {
        const rgb = val as { r: number, g: number, b: number };
        root.style.setProperty(`--c-secondary-${shade}`, `${rgb.r} ${rgb.g} ${rgb.b}`);
    });
  }, [activeThemeId, customPrimary, customSecondary]);


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
            const pdfWidthMm = 297; // A4 Landscape roughly, or A3
            const pdfHeightMm = (imgHeightPx * pdfWidthMm) / imgWidthPx;
            
            const pdf = new jsPDF({ orientation: pdfHeightMm > pdfWidthMm ? 'p' : 'l', unit: 'mm', format: [pdfWidthMm, pdfHeightMm] });
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMm, pdfHeightMm);
            pdf.save(`凡硕战略蓝图-${data.main_title.slice(0, 10)}.pdf`);
        } catch (err) { alert("导出 PDF 失败"); console.error(err); } 
     });
     setIsExportingPDF(false);
  };

  const generateMindMap = () => {
    const rootTitle = sanitizeForMermaid(data.main_title);
    let mm = `mindmap\n`;
    mm += `  root(("${rootTitle}"))\n`;
    mm += `    核心发展脉络\n`;
    data.core_veins.forEach(vein => {
        mm += `      ${sanitizeForMermaid(vein.title)}\n`;
        mm += `        [${sanitizeForMermaid(vein.tag)}]\n`;
    });
    mm += `    关键实施路径\n`;
    data.implementation_paths.forEach(path => {
        mm += `      ${sanitizeForMermaid(path.title)}\n`;
        path.points.slice(0, 2).forEach(p => {
             mm += `        ${sanitizeForMermaid(p.slice(0, 20))}...\n`;
        });
    });
    mm += `    目标与价值\n`;
    data.values.forEach(val => {
        mm += `      ${sanitizeForMermaid(val.title)}\n`;
    });
    if (data.risks && data.risks.length > 0) {
        mm += `    风险控制\n`;
        data.risks.forEach(r => {
            mm += `      ${sanitizeForMermaid(r.title)}\n`;
        });
    }
    return mm;
  };

  return (
    <div className={`space-y-8 ${isExportMode ? 'print-layout' : ''}`}>
      <style>{`
        .print-layout {
           width: 2400px; /* Enhanced Width */
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

      {/* FIXED CAPSULE NAVIGATION - Strictly positioned at left 100px */}
      <div className="fixed left-[100px] top-1/2 -translate-y-1/2 z-[80] no-export flex flex-col gap-4 pointer-events-auto">
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-900/10 rounded-2xl p-2.5 flex flex-col items-center gap-4 transition-all">
           
           <NavButton 
             onClick={() => setActiveModal('transcript')} 
             icon={<FileText size={20} />} 
             color="text-primary-600"
             tooltip="查看原文"
           />
           
           <NavButton 
             onClick={() => setActiveModal('tasks')} 
             icon={<ListTodo size={20} />} 
             color="text-secondary-600"
             tooltip="任务清单"
           />
           
           <div className="w-10 h-px bg-slate-200/80"></div>
           
           <div className="relative group/theme">
              <button 
                onClick={() => setShowThemeSelector(!showThemeSelector)} 
                className="p-3.5 rounded-xl hover:bg-white hover:shadow-md transition-all relative group/btn"
              >
                 <Palette size={20} className="text-primary-500 group-hover/btn:scale-110 transition-transform" />
                 <div className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: activeThemeId === 'custom' ? customPrimary : undefined }}>
                    {activeThemeId !== 'custom' && <div className="w-full h-full rounded-full bg-primary-500"></div>}
                 </div>
              </button>
              
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover/theme:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                  切换配色
              </div>

              {showThemeSelector && (
                 <div className="absolute left-full top-0 ml-5 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-3 animate-fade-in origin-top-left z-[90]">
                     <div className="text-[10px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wider">预设主题</div>
                     {THEMES.map(t => (
                         <button key={t.id} onClick={() => { setActiveThemeId(t.id); setShowThemeSelector(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-slate-50 transition-colors ${activeThemeId === t.id ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}>
                             <div className="flex items-center gap-3">
                                <div className="flex gap-1">
                                    <div className="w-3.5 h-3.5 rounded-full ring-1 ring-black/5" style={{background: t.colors.primary}}></div>
                                    <div className="w-3.5 h-3.5 rounded-full ring-1 ring-black/5" style={{background: t.colors.secondary}}></div>
                                </div>
                                {t.name}
                             </div>
                             {activeThemeId === t.id && <Check size={14} className="text-primary-500" />}
                         </button>
                     ))}
                      <div className="border-t border-slate-100 my-2"></div>
                      <div className="px-3 pb-2">
                         <div className="flex items-center justify-between mb-3 cursor-pointer hover:opacity-80" onClick={() => setActiveThemeId('custom')}>
                            <span className="text-xs font-bold text-slate-700">自定义颜色</span>
                            {activeThemeId === 'custom' && <Check size={14} className="text-primary-500" />}
                         </div>
                         <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-400 block mb-1.5 font-bold">主色 (Primary)</label>
                                <div className="h-9 rounded-lg border border-slate-200 overflow-hidden relative shadow-sm">
                                    <input type="color" value={customPrimary} onChange={(e) => { setCustomPrimary(e.target.value); setActiveThemeId('custom'); }} className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer border-none p-0 m-0" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-400 block mb-1.5 font-bold">辅色 (Secondary)</label>
                                <div className="h-9 rounded-lg border border-slate-200 overflow-hidden relative shadow-sm">
                                    <input type="color" value={customSecondary} onChange={(e) => { setCustomSecondary(e.target.value); setActiveThemeId('custom'); }} className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer border-none p-0 m-0" />
                                </div>
                            </div>
                         </div>
                      </div>
                 </div>
              )}
           </div>

           <div className="w-10 h-px bg-slate-200/80"></div>
           
           <NavButton 
             onClick={handleDownloadPDF} 
             icon={isExportingPDF ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />} 
             color="text-slate-700"
             tooltip="导出PDF"
             disabled={isExportingPDF}
           />
        </div>
      </div>

      <div className="flex justify-center pb-24 pt-4 px-4 sm:px-12">
        {/* Main Content Width Increased by ~0.5x (max-w-[2400px]) */}
        <div ref={contentRef} className="w-full max-w-[98vw] lg:max-w-[2400px] rounded-none sm:rounded-[32px] flex flex-col font-sans">
           
           {/* EXTRACTED HEADER CARD */}
           <div className="relative z-10 mx-4 sm:mx-16 mt-8 mb-[-48px]">
               <div className="bg-white rounded-[3rem] p-16 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden animate-extract-up relative backdrop-blur-sm">
                    {/* Animated Background Blobs inside card */}
                    <div className="absolute top-[-50%] right-[-10%] w-[800px] h-[800px] bg-primary-100/30 rounded-full blur-3xl mix-blend-multiply opacity-60 animate-blob pointer-events-none"></div>
                    <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-secondary-100/30 rounded-full blur-3xl mix-blend-multiply opacity-60 animate-blob animation-delay-2000 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col items-center text-center max-w-6xl mx-auto">
                        <div className="flex items-center gap-4 mb-10 animate-fade-in-up">
                            <span className="px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-white/80 text-primary-600 border border-primary-100 shadow-sm backdrop-blur-md">
                                Strategic Blueprint
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{new Date().toLocaleDateString()}</span>
                        </div>
                        
                        <h1 className="text-6xl sm:text-8xl font-black text-slate-900 mb-12 tracking-tight leading-[1.1] animate-fade-in-up bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-primary-600 max-w-5xl drop-shadow-sm">
                            {data.main_title}
                        </h1>
                        
                        <div className="flex items-center justify-center gap-8 animate-fade-in-up w-full" style={{ animationDelay: '100ms' }}>
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent w-48"></div>
                            <p className="text-2xl sm:text-3xl font-medium text-slate-600 leading-relaxed max-w-5xl">
                                {data.subtitle}
                            </p>
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent w-48"></div>
                        </div>
                    </div>
               </div>
           </div>

           {/* MAIN CONTENT BODY */}
           <div className="pt-32 pb-16 px-12 sm:px-20 bg-white/90 backdrop-blur-xl rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-white/50 space-y-32">
             
             {/* 1. Core Veins - Enhanced Interactivity & Smart Icons */}
             <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <SectionHeader title="核心发展脉络" icon={<Activity className="w-7 h-7 text-white" />} color="bg-primary-600" />
                <div className="relative mt-16">
                    <div className="hidden md:block absolute top-24 left-[16%] w-[68%] h-0.5 border-t-2 border-dashed border-slate-200 -z-10"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
                        {data.core_veins.map((vein, idx) => (
                            <div 
                                key={idx} 
                                className="animate-pop-in flex flex-col items-center bg-white rounded-[3rem] p-12 border border-slate-100 hover:border-primary-200 shadow-xl hover:shadow-[0_20px_50px_-12px_rgba(var(--c-primary-500),0.15)] transition-all duration-500 group relative transform hover:-translate-y-3"
                                style={{ animationDelay: `${300 + idx * 200}ms` }}
                            >
                                <div className={`w-32 h-32 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 mb-10 ${idx === 0 ? 'bg-gradient-to-br from-primary-500 to-primary-600' : idx === 1 ? 'bg-gradient-to-br from-secondary-500 to-secondary-600' : 'bg-gradient-to-br from-accent-500 to-amber-600'}`}>
                                    {/* Smart Icon Selection */}
                                    {getSmartIcon(vein.title + vein.tag + vein.strategic_focus)}
                                </div>
                                
                                <h3 className="text-3xl font-black text-slate-800 mb-5 text-center group-hover:text-primary-600 transition-colors">{vein.title}</h3>
                                
                                <div className={`inline-block px-6 py-2.5 rounded-full text-sm font-bold mb-10 border tracking-wide uppercase ${idx === 0 ? 'bg-primary-50 text-primary-700 border-primary-100' : idx === 1 ? 'bg-secondary-50 text-secondary-700 border-secondary-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                    {vein.tag}
                                </div>
                                
                                <p className="text-slate-500 text-xl leading-relaxed text-center mb-12 px-2 flex-grow font-medium">
                                    {vein.description}
                                </p>

                                {/* Dimensions reveal on hover */}
                                <div className="w-full grid grid-cols-2 gap-5 mt-auto opacity-80 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-slate-50/80 rounded-3xl p-6 text-center border border-slate-100 group-hover:bg-white group-hover:shadow-md transition-all">
                                        <div className="text-xs text-slate-400 font-bold uppercase mb-2 flex items-center justify-center gap-1.5"><Compass size={14} /> 战略聚焦</div>
                                        <div className="text-lg font-bold text-slate-700 truncate" title={vein.strategic_focus}>{vein.strategic_focus || "Efficiency"}</div>
                                    </div>
                                    <div className="bg-slate-50/80 rounded-3xl p-6 text-center border border-slate-100 group-hover:bg-white group-hover:shadow-md transition-all">
                                        <div className="text-xs text-slate-400 font-bold uppercase mb-2 flex items-center justify-center gap-1.5"><MousePointerClick size={14} /> 关键举措</div>
                                        <div className="text-lg font-bold text-slate-700 truncate" title={vein.key_action}>{vein.key_action || "Execution"}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>

             {/* 2. Implementation Paths - Visual Flowchart with Arrows */}
             <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <SectionHeader title="关键实施路径" icon={<ListTodo className="w-7 h-7 text-white" />} color="bg-secondary-600" />
                <div className="mt-16 space-y-16">
                    {data.implementation_paths.map((path, idx) => (
                        <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-[3rem] p-12 hover:bg-white hover:shadow-xl hover:shadow-secondary-500/5 transition-all duration-500 group relative">
                            <div className="flex items-center gap-8 mb-12">
                                <div className="bg-secondary-100 text-secondary-600 p-5 rounded-3xl">
                                    <Map size={36} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-slate-800 flex items-center gap-5">
                                        {path.title}
                                        <span className="text-sm px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 shadow-sm">{path.tag}</span>
                                    </h3>
                                    <div className="flex items-center gap-3 mt-3 text-base font-bold text-slate-400">
                                        <Target size={18} /> 目标底线: <span className="text-slate-600">{path.bottom_line}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Visual Flow Diagram */}
                            <div className="relative">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                                    {path.points.map((step, si) => (
                                        <div key={si} className="group/step relative flex flex-col h-full">
                                            {/* Arrow between cards (hidden on last item) */}
                                            {si < path.points.length - 1 && (
                                                <div className="hidden md:flex absolute top-1/2 -right-8 w-8 items-center justify-center text-slate-300 z-0">
                                                    <ArrowRight size={32} strokeWidth={3} className="opacity-50" />
                                                </div>
                                            )}
                                            
                                            {/* Step Card */}
                                            <div className="flex-1 bg-white border-2 border-slate-100 rounded-3xl p-8 hover:border-secondary-300 hover:shadow-lg hover:shadow-secondary-100/50 transition-all duration-300 relative overflow-hidden transform hover:-translate-y-2">
                                                <div className="absolute -right-6 -top-6 text-[8rem] font-black text-slate-50 opacity-60 z-0 select-none font-serif italic">{si + 1}</div>
                                                
                                                <div className="relative z-10">
                                                    <div className="w-10 h-10 rounded-full bg-secondary-50 text-secondary-600 font-bold flex items-center justify-center mb-6 text-sm border border-secondary-100">
                                                        {si + 1}
                                                    </div>
                                                    <h4 className="font-bold text-xl text-slate-700 mb-4 group-hover/step:text-secondary-700 transition-colors">阶段 {si + 1}</h4>
                                                    <p className="text-base text-slate-500 leading-relaxed font-medium">
                                                        {step}
                                                    </p>
                                                </div>

                                                {/* Hover Detail Hint */}
                                                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-end text-secondary-500 opacity-0 group-hover/step:opacity-100 transition-opacity transform translate-y-2 group-hover/step:translate-y-0">
                                                    <span className="text-xs font-bold uppercase tracking-wider mr-2">Detail View</span>
                                                    <ArrowRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* 3. Advantages - Wider Grid */}
             <div className="animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                <SectionHeader title="技术实现优势" icon={<Zap className="w-7 h-7 text-white" />} color="bg-amber-500" />
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {data.advantages.map((adv, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-[3rem] p-0 overflow-hidden hover:shadow-2xl hover:border-amber-300 transition-all duration-300 group flex flex-col hover:-translate-y-2">
                            <div className="p-10 pb-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center group-hover:bg-amber-50/30 transition-colors">
                                 <h3 className="text-2xl font-bold text-slate-800">{adv.title}</h3>
                                 <div className="bg-white border border-slate-200 p-3.5 rounded-2xl text-amber-500 shadow-sm"><Activity size={28} /></div>
                            </div>
                            <div className="p-10 flex-1 flex flex-col">
                                <div className="mb-10 flex-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">核心特性 (Key Features)</span>
                                    <ul className="space-y-5 mt-5">
                                        {adv.features.map((f, fi) => (
                                            <li key={fi} className="flex items-start gap-4 text-base text-slate-600 font-medium"><CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />{f}</li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div className="space-y-5 mt-auto">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-sm font-bold text-slate-600 flex gap-3 items-center group-hover:bg-amber-50 group-hover:border-amber-100 group-hover:text-amber-700 transition-colors">
                                        <Star size={20} className="text-amber-400 fill-amber-400"/> 业务影响: {adv.impact}
                                    </div>
                                    <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400 uppercase">预估 ROI / 指标</span>
                                        <span className="text-base font-bold text-amber-600 bg-amber-50 px-5 py-2 rounded-full border border-amber-100 shadow-sm">{adv.performance_metric || "待定"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* 4. Values */}
             <div className="animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                <SectionHeader title="目标与价值" icon={<Target className="w-7 h-7 text-white" />} color="bg-primary-600" />
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
                     {data.values.map((val, idx) => {
                         // Alternate subtle backgrounds
                         const bgClass = idx % 2 === 0 ? 'bg-gradient-to-br from-slate-50 to-white' : 'bg-white';
                         return (
                            <div key={idx} className={`${bgClass} border border-slate-100 rounded-[3rem] p-12 transition-all duration-500 hover:shadow-xl hover:border-primary-200 group flex flex-col hover:-translate-y-2`}>
                                <div className="flex items-center gap-6 mb-10">
                                    <div className="p-5 bg-white rounded-3xl shadow-md border border-slate-50 text-primary-600 group-hover:scale-110 transition-transform"><TrendingUp size={32} /></div>
                                    <h3 className="text-2xl font-bold text-slate-800">{val.title}</h3>
                                </div>
                                <div className="relative mb-12 flex-1">
                                    <MessageSquareQuote className="absolute -top-6 -left-6 text-primary-100 w-16 h-16 opacity-50" />
                                    <p className="text-xl font-medium text-slate-700 italic relative z-10 pl-8 border-l-4 border-primary-200 leading-relaxed">"{val.motto}"</p>
                                </div>
                                <div className="space-y-4 mb-10">
                                    {val.benefits.map((b, bi) => (
                                        <div key={bi} className="flex items-center gap-4 text-sm font-bold text-slate-600 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                                            <div className="w-2.5 h-2.5 rounded-full bg-primary-400"></div>{b}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold opacity-60 uppercase text-slate-500">
                                        <BarChart3 size={18} />
                                        <span>关键指标 (KPI)</span>
                                    </div>
                                    <span className="text-base font-bold bg-slate-900 text-white px-5 py-2 rounded-full shadow-lg shadow-slate-900/20">{val.kpi || "待定义"}</span>
                                </div>
                            </div>
                         );
                     })}
                </div>
             </div>

             {/* 5. Risks & Opportunities - Large 2-Col Grid */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 pt-8 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                 <div className="bg-rose-50 border border-rose-100 rounded-[3rem] p-16 hover:shadow-2xl hover:shadow-rose-500/10 transition-shadow group">
                     <div className="flex items-center gap-8 mb-12">
                         <div className="p-6 bg-white text-rose-600 rounded-3xl shadow-md border border-rose-100 group-hover:scale-110 transition-transform">
                            <ShieldAlert size={48} />
                         </div>
                         <div>
                            <h3 className="font-black text-3xl text-slate-800">潜在风险预警</h3>
                            <p className="text-sm text-rose-600/70 font-bold uppercase tracking-wide mt-2">Risk Assessment</p>
                         </div>
                     </div>
                     <div className="space-y-8">
                         {data.risks && data.risks.map((risk, idx) => (
                             <div key={idx} className="flex flex-col bg-white p-10 rounded-[2rem] border border-rose-100 shadow-sm hover:-translate-y-1 transition-transform relative overflow-hidden group/item">
                                 <div className="absolute top-0 left-0 w-3 h-full bg-rose-500"></div>
                                 <div className="flex items-center justify-between mb-5 pl-5">
                                     <h4 className="font-bold text-slate-800 text-xl">{risk.title}</h4>
                                     <span className={`text-xs px-4 py-2 rounded-full font-bold uppercase tracking-wide text-white ${risk.severity === 'High' ? 'bg-rose-600' : 'bg-orange-400'}`}>
                                         {risk.severity === 'High' ? '高风险' : risk.severity}
                                     </span>
                                 </div>
                                 <p className="text-lg text-slate-600 pl-5 mb-2 leading-relaxed">{risk.mitigation}</p>
                             </div>
                         ))}
                     </div>
                 </div>

                 <div className="bg-emerald-50 border border-emerald-100 rounded-[3rem] p-16 hover:shadow-2xl hover:shadow-emerald-500/10 transition-shadow group">
                     <div className="flex items-center gap-8 mb-12">
                         <div className="p-6 bg-white text-emerald-600 rounded-3xl shadow-md border border-emerald-100 group-hover:scale-110 transition-transform">
                            <Zap size={48} fill="currentColor" />
                         </div>
                         <div>
                             <h3 className="font-black text-3xl text-slate-800">战略机会点</h3>
                             <p className="text-sm text-emerald-600/70 font-bold uppercase tracking-wide mt-2">Growth Opportunities</p>
                         </div>
                     </div>
                     <div className="space-y-8">
                         {data.opportunities && data.opportunities.map((opp, idx) => (
                             <div key={idx} className="flex flex-col bg-white p-10 rounded-[2rem] border border-emerald-100 shadow-sm hover:-translate-y-1 transition-transform relative overflow-hidden group/item">
                                 <div className="absolute top-0 left-0 w-3 h-full bg-emerald-500"></div>
                                 <div className="flex items-center justify-between mb-5 pl-5">
                                     <h4 className="font-bold text-slate-800 text-xl">{opp.title}</h4>
                                     <ArrowUpRight size={28} className="text-emerald-500 group-hover/item:translate-x-1 group-hover/item:-translate-y-1 transition-transform" />
                                 </div>
                                 <p className="text-lg text-slate-600 pl-5 leading-relaxed">{opp.description}</p>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>

             {/* 6. Mind Map */}
             <div className="border-t border-slate-100 pt-20 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
                 <button onClick={() => setShowMindMap(!showMindMap)} className="flex items-center justify-between w-full text-left group p-10 rounded-[3rem] hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                     <div className="flex items-center gap-8">
                        <div className="bg-slate-800 p-5 rounded-3xl text-white shadow-xl shadow-slate-900/20 group-hover:scale-105 transition-transform"><Network size={36} /></div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">全景思维导图</h2>
                            <p className="text-lg text-slate-400 font-bold mt-2">Full-Text Strategy Mindmap</p>
                        </div>
                     </div>
                     <div className="text-slate-400 group-hover:text-slate-600 transition-colors p-4 bg-slate-100 rounded-full">{showMindMap ? <ChevronUp size={28} /> : <ChevronDown size={28} />}</div>
                 </button>
                 {showMindMap && (
                     <div className="mt-12 border border-slate-100 rounded-[3rem] overflow-hidden bg-slate-50/30 h-[900px] shadow-inner animate-fade-in">
                         <MermaidDiagram chart={generateMindMap()} />
                     </div>
                 )}
             </div>
           </div>

           {/* 7. Footer */}
           <div className="bg-slate-50 p-24 border-t border-slate-100 mt-16 rounded-[4rem]">
               <div className="max-w-7xl mx-auto space-y-24">
                   {/* Golden Sentence */}
                   <div className="bg-white p-20 rounded-[4rem] shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row items-center gap-16 transform hover:scale-[1.01] transition-transform duration-500 group relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-5 h-full bg-yellow-400"></div>
                       <div className="p-12 bg-yellow-50 text-yellow-600 rounded-full shrink-0 group-hover:rotate-12 transition-transform duration-500 shadow-inner border border-yellow-100">
                           <Star size={72} fill="currentColor" />
                       </div>
                       <div className="text-center md:text-left flex-1">
                           <h3 className="font-black text-base text-slate-400 mb-10 uppercase tracking-[0.3em] flex items-center justify-center md:justify-start gap-6">
                               核心战略结论 <span className="w-24 h-px bg-slate-200"></span>
                           </h3>
                           <p className="text-5xl sm:text-6xl font-serif font-bold text-slate-800 italic leading-relaxed text-balance">
                               "{data.core_conclusion}"
                           </p>
                       </div>
                   </div>

                   {/* Executive Summary */}
                   <div className="space-y-12 bg-white p-20 rounded-[4rem] border border-slate-200 shadow-sm relative">
                       <div className="absolute -top-8 left-20 inline-flex items-center gap-4 bg-slate-900 text-white font-bold text-base uppercase tracking-widest px-10 py-5 rounded-3xl shadow-xl">
                           <Feather size={20} /> 执行摘要 Executive Summary
                       </div>
                       <div className="pt-8">
                            <p className="text-slate-600 leading-[2.5] text-2xl font-medium text-justify indent-16">
                                {data.executive_summary || "暂无执行摘要。"}
                            </p>
                       </div>
                   </div>
                   
                   <div className="text-center pt-16 border-t border-slate-200/60">
                       <p className="text-base font-bold text-slate-300 uppercase tracking-widest">Generated by 凡硕财税高级专家顾问 · Powered by Gemini 3 Pro · {new Date().toLocaleDateString()}</p>
                   </div>
               </div>
           </div>
        </div>
      </div>
      
      {/* MODALS - Transcript & Tasks */}
      {activeModal === 'transcript' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in no-export">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
            <div className="bg-white rounded-[3rem] w-full max-w-6xl h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden transform scale-100 transition-all">
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-5"><div className="p-4 rounded-3xl bg-primary-50 text-primary-600"><FileText size={28} /></div> 对话原文全览</h3>
                    <button onClick={() => setActiveModal(null)} className="p-4 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={28} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-white">
                    {data.transcript_segments && data.transcript_segments.length > 0 ? (
                        data.transcript_segments.map((seg, idx) => (
                        <div key={idx} className="flex gap-8 group">
                            <div className="flex-shrink-0 flex flex-col items-center pt-3">
                                <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold shadow-sm text-xl border border-slate-200">{seg.speaker.slice(0, 1)}</div>
                            </div>
                            <div className="flex-1 pb-6">
                                <div className="flex items-center gap-4 mb-3">
                                    <span className="font-bold text-slate-800 text-lg">{seg.speaker}</span>
                                    {seg.timestamp && <span className="text-sm text-slate-400 font-mono bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">{seg.timestamp}</span>}
                                </div>
                                <p className="text-lg text-slate-700 leading-relaxed bg-slate-50/50 p-8 rounded-[2rem] rounded-tl-none border border-slate-100 hover:border-primary-200 hover:shadow-sm transition-all">{seg.text}</p>
                            </div>
                        </div>
                        ))
                    ) : <div className="text-center py-32 text-slate-400">暂无原文记录</div>}
                </div>
            </div>
        </div>
      )}

      {activeModal === 'tasks' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in no-export">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
            <div className="bg-white rounded-[3rem] w-full max-w-6xl h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden transform scale-100 transition-all">
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-5"><div className="p-4 rounded-3xl bg-secondary-50 text-secondary-600"><ListTodo size={28} /></div> 战略实施任务清单</h3>
                    <button onClick={() => setActiveModal(null)} className="p-4 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={28} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-slate-50/50">
                     {data.implementation_paths.map((path, idx) => (
                      <div key={idx} className="bg-white rounded-[2.5rem] p-12 border-l-8 border-secondary-500 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                             <h4 className="font-bold text-slate-800 text-3xl">{path.title}</h4>
                             <div className="bg-secondary-50 text-secondary-700 font-bold px-5 py-2.5 rounded-2xl text-base self-start sm:self-auto border border-secondary-100">{path.tag}</div>
                          </div>
                          <div className="space-y-6 mb-10">
                              {path.points.map((p, pi) => (
                                  <div key={pi} className="flex items-start gap-5 p-5 hover:bg-slate-50 rounded-3xl transition-colors">
                                      <CheckCircle2 size={24} className="text-secondary-400 shrink-0 mt-0.5" />
                                      <span className="text-lg text-slate-700 leading-relaxed">{p}</span>
                                  </div>
                              ))}
                          </div>
                          <div className="text-base font-medium text-slate-500 italic pt-8 border-t border-slate-100 flex items-center gap-4 bg-slate-50/50 p-6 rounded-2xl -mx-6 -mb-6 mt-8">
                             <Target size={20} className="text-secondary-400" />
                             <span className="font-bold text-sm uppercase tracking-wider text-slate-400 mr-2">目标底线</span> "{path.bottom_line}"
                          </div>
                      </div>
                   ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const NavButton: React.FC<{ onClick: () => void; icon: React.ReactNode; color: string; tooltip: string; disabled?: boolean }> = ({ onClick, icon, color, tooltip, disabled }) => (
    <div className="relative group flex items-center">
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`p-3.5 rounded-xl hover:bg-white hover:shadow-md transition-all ${color} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {icon}
        </button>
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
            {tooltip}
        </div>
    </div>
);

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; color: string; }> = ({ title, icon, color }) => (
  <div className="flex items-center gap-6 cursor-default group mb-16">
    <div className={`${color} p-5 rounded-[1.5rem] shadow-xl shadow-black/5 transform group-hover:scale-110 transition-transform duration-300 text-white ring-4 ring-white`}>{icon}</div>
    <h2 className="text-5xl font-black text-slate-800 tracking-tight">{title}</h2>
  </div>
);

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);