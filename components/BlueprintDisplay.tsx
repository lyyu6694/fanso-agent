import React, { useRef, useState, useEffect } from 'react';
import { AnalysisResult, ChatMessage } from '../types';
import { Target, Anchor, Download, Loader2, X, FileText, Palette, Check, MessageSquareQuote, ListTodo, Zap, Layout, Network, Grid, CheckCircle2, ShieldAlert, TrendingUp, Feather, Star, ArrowRight, Activity, Lightbulb, ChevronDown, ChevronUp, Link, RefreshCcw, Box, ArrowUpRight, Compass, MousePointerClick, ChevronRight, BarChart3, Settings2, Coins, Users, Lock, Globe, Scale, Briefcase, Building, Cpu, Database, PieChart, ShieldCheck, HeartHandshake } from 'lucide-react';
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

// Helper to check keywords for Smart Icons
const getSmartIcon = (text: string) => {
  const t = text.toLowerCase();
  if (t.includes('cost') || t.includes('finance') || t.includes('money') || t.includes('成本') || t.includes('资金')) return <Coins size={40} />;
  if (t.includes('risk') || t.includes('security') || t.includes('compliance') || t.includes('风险') || t.includes('合规')) return <ShieldCheck size={40} />;
  if (t.includes('growth') || t.includes('scale') || t.includes('expand') || t.includes('增长') || t.includes('扩张')) return <TrendingUp size={40} />;
  if (t.includes('tech') || t.includes('data') || t.includes('ai') || t.includes('技术') || t.includes('数据')) return <Cpu size={40} />;
  if (t.includes('people') || t.includes('team') || t.includes('talent') || t.includes('人员') || t.includes('团队')) return <Users size={40} />;
  if (t.includes('efficiency') || t.includes('process') || t.includes('speed') || t.includes('效率') || t.includes('流程')) return <Zap size={40} />;
  if (t.includes('legal') || t.includes('law') || t.includes('regula') || t.includes('法律') || t.includes('政策')) return <Scale size={40} />;
  if (t.includes('global') || t.includes('market') || t.includes('international') || t.includes('全球') || t.includes('市场')) return <Globe size={40} />;
  return <Lightbulb size={40} />; // Default
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

  // Apply Theme Colors to CSS Variables
  useEffect(() => {
    const root = document.documentElement;
    let p, s;

    if (activeThemeId === 'custom') {
        p = generatePalette(customPrimary);
        s = generatePalette(customSecondary);
    } else {
        const theme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];
        p = generatePalette(theme.colors.primary);
        s = generatePalette(theme.colors.secondary);
    }

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
           width: 2200px; /* Increased for wider export */
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

      {/* FIXED CAPSULE NAVIGATION - Strictly positioned at 100px left */}
      <div className="fixed left-[100px] top-1/2 -translate-y-1/2 z-[80] no-export flex flex-col gap-4 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl shadow-slate-900/20 rounded-2xl p-2 flex flex-col items-center gap-3 transition-all">
           
           <NavButton 
             onClick={() => setActiveModal('transcript')} 
             icon={<FileText size={20} />} 
             color="text-primary-500"
             tooltip="查看原文"
           />
           
           <NavButton 
             onClick={() => setActiveModal('tasks')} 
             icon={<ListTodo size={20} />} 
             color="text-secondary-500"
             tooltip="任务清单"
           />
           
           <div className="w-8 h-px bg-slate-200"></div>
           
           <div className="relative group/theme">
              <button 
                onClick={() => setShowThemeSelector(!showThemeSelector)} 
                className="p-3 rounded-xl hover:bg-slate-100 transition-colors relative"
              >
                 <Palette size={20} className="text-primary-500" />
                 <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: activeThemeId === 'custom' ? customPrimary : undefined }}>
                    {activeThemeId !== 'custom' && <div className="w-full h-full rounded-full bg-primary-500"></div>}
                 </div>
              </button>
              
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover/theme:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  切换配色
              </div>

              {showThemeSelector && (
                 <div className="absolute left-full top-0 ml-4 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-fade-in origin-top-left z-[90]">
                     <div className="text-xs font-bold text-slate-400 px-3 py-2 uppercase">预设主题</div>
                     {THEMES.map(t => (
                         <button key={t.id} onClick={() => { setActiveThemeId(t.id); setShowThemeSelector(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-slate-50 transition-colors ${activeThemeId === t.id ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}>
                             <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    <div className="w-3 h-3 rounded-full" style={{background: t.colors.primary}}></div>
                                    <div className="w-3 h-3 rounded-full" style={{background: t.colors.secondary}}></div>
                                </div>
                                {t.name}
                             </div>
                             {activeThemeId === t.id && <Check size={12} />}
                         </button>
                     ))}
                      <div className="border-t border-slate-100 my-2"></div>
                      <div className="px-3 pb-2">
                         <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setActiveThemeId('custom')}>
                            <span className="text-xs font-bold text-slate-700">自定义颜色</span>
                            {activeThemeId === 'custom' && <Check size={12} className="text-primary-500" />}
                         </div>
                         <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-400 block mb-1">主色</label>
                                <div className="h-8 rounded-lg border border-slate-200 overflow-hidden relative">
                                    <input type="color" value={customPrimary} onChange={(e) => { setCustomPrimary(e.target.value); setActiveThemeId('custom'); }} className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer border-none p-0 m-0" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-400 block mb-1">辅色</label>
                                <div className="h-8 rounded-lg border border-slate-200 overflow-hidden relative">
                                    <input type="color" value={customSecondary} onChange={(e) => { setCustomSecondary(e.target.value); setActiveThemeId('custom'); }} className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer border-none p-0 m-0" />
                                </div>
                            </div>
                         </div>
                      </div>
                 </div>
              )}
           </div>

           <div className="w-8 h-px bg-slate-200"></div>
           
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
        {/* Increased Width to 2400px (approx 50% more than usual 6xl which is ~1152px, so 1.5x is ~1700px. 2400px covers large screens well) */}
        <div ref={contentRef} className="w-full max-w-[95vw] lg:max-w-[2400px] rounded-none sm:rounded-[32px] flex flex-col font-sans">
           
           {/* EXTRACTED HEADER CARD */}
           <div className="relative z-10 mx-4 sm:mx-12 mt-8 mb-[-40px]">
               <div className="bg-white rounded-[2.5rem] p-12 sm:p-16 shadow-2xl shadow-slate-900/10 border border-slate-100 overflow-hidden animate-extract-up relative">
                    {/* Animated Background Blobs inside card */}
                    <div className="absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-primary-100/40 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob pointer-events-none"></div>
                    <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary-100/40 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto">
                        <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
                            <span className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-primary-50 text-primary-600 border border-primary-100 shadow-sm">
                                Strategic Blueprint
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{new Date().toLocaleDateString()}</span>
                        </div>
                        
                        <h1 className="text-6xl sm:text-7xl font-black text-slate-900 mb-10 tracking-tight leading-tight animate-fade-in-up bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-primary-600 max-w-4xl">
                            {data.main_title}
                        </h1>
                        
                        <div className="flex items-center justify-center gap-6 animate-fade-in-up w-full" style={{ animationDelay: '100ms' }}>
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-32"></div>
                            <p className="text-2xl sm:text-3xl font-medium text-slate-600 leading-relaxed max-w-4xl">
                                {data.subtitle}
                            </p>
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-32"></div>
                        </div>
                    </div>
               </div>
           </div>

           {/* MAIN CONTENT BODY */}
           <div className="pt-24 pb-12 px-12 sm:px-16 bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-24">
             
             {/* 1. Core Veins - Enhanced Interactivity & Smart Icons */}
             <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <SectionHeader title="核心发展脉络" icon={<Activity className="w-6 h-6 text-white" />} color="bg-primary-600" />
                <div className="relative mt-12">
                    <div className="hidden md:block absolute top-20 left-[16%] w-[68%] h-0.5 border-t-2 border-dashed border-slate-200 -z-10"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                        {data.core_veins.map((vein, idx) => (
                            <div 
                                key={idx} 
                                className="animate-pop-in flex flex-col items-center bg-white rounded-[2.5rem] p-10 border border-slate-100 hover:border-primary-200 shadow-lg hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-500 group relative transform hover:-translate-y-2"
                                style={{ animationDelay: `${300 + idx * 200}ms` }}
                            >
                                <div className={`w-28 h-28 rounded-3xl flex items-center justify-center text-white shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 mb-8 ${idx === 0 ? 'bg-gradient-to-br from-primary-500 to-primary-600' : idx === 1 ? 'bg-gradient-to-br from-secondary-500 to-secondary-600' : 'bg-gradient-to-br from-accent-500 to-amber-600'}`}>
                                    {/* Smart Icon Selection */}
                                    {getSmartIcon(vein.title + vein.tag + vein.strategic_focus)}
                                </div>
                                
                                <h3 className="text-3xl font-black text-slate-800 mb-4 text-center group-hover:text-primary-600 transition-colors">{vein.title}</h3>
                                
                                <div className={`inline-block px-5 py-2 rounded-full text-sm font-bold mb-8 border tracking-wide uppercase ${idx === 0 ? 'bg-primary-50 text-primary-700 border-primary-100' : idx === 1 ? 'bg-secondary-50 text-secondary-700 border-secondary-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                    {vein.tag}
                                </div>
                                
                                <p className="text-slate-500 text-lg leading-relaxed text-center mb-10 px-4 flex-grow">
                                    {vein.description}
                                </p>

                                {/* Dimensions reveal on hover */}
                                <div className="w-full grid grid-cols-2 gap-4 mt-auto opacity-80 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-slate-50/80 rounded-2xl p-5 text-center border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                                        <div className="text-[11px] text-slate-400 font-bold uppercase mb-2 flex items-center justify-center gap-1"><Compass size={12} /> 战略聚焦</div>
                                        <div className="text-base font-bold text-slate-700 truncate" title={vein.strategic_focus}>{vein.strategic_focus || "Efficiency"}</div>
                                    </div>
                                    <div className="bg-slate-50/80 rounded-2xl p-5 text-center border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                                        <div className="text-[11px] text-slate-400 font-bold uppercase mb-2 flex items-center justify-center gap-1"><MousePointerClick size={12} /> 关键举措</div>
                                        <div className="text-base font-bold text-slate-700 truncate" title={vein.key_action}>{vein.key_action || "Execution"}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>

             {/* 2. Implementation Paths - Interactive Flow Diagram */}
             <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <SectionHeader title="关键实施路径" icon={<ListTodo className="w-6 h-6 text-white" />} color="bg-secondary-600" />
                <div className="mt-12 space-y-12">
                    {data.implementation_paths.map((path, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-10 hover:bg-white hover:shadow-xl hover:shadow-secondary-500/5 transition-all duration-500 group">
                            <div className="flex items-center gap-6 mb-10">
                                <div className="bg-secondary-100 text-secondary-600 p-4 rounded-2xl">
                                    <Layout size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-4">
                                        {path.title}
                                        <span className="text-sm px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-500">{path.tag}</span>
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2 text-sm font-bold text-slate-400">
                                        <Target size={14} /> 目标底线: <span className="text-slate-600">{path.bottom_line}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Interactive Step Flow */}
                            <div className="relative">
                                {/* Connecting Line */}
                                <div className="absolute top-8 left-0 w-full h-1 bg-slate-200 rounded-full"></div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                                    {path.points.map((step, si) => (
                                        <div key={si} className="group/step relative pt-4">
                                            {/* Dot on line */}
                                            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-5 h-5 bg-slate-100 border-4 border-slate-300 rounded-full z-10 transition-all duration-300 group-hover/step:bg-secondary-500 group-hover/step:border-secondary-200 group-hover/step:scale-125"></div>
                                            
                                            {/* Step Card */}
                                            <div className="mt-8 bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-secondary-300 hover:-translate-y-2 transition-all duration-300 shadow-sm relative overflow-hidden">
                                                <div className="absolute -right-4 -top-4 text-9xl font-black text-slate-50 opacity-50 z-0 select-none">{si + 1}</div>
                                                <h4 className="font-bold text-lg text-slate-700 mb-2 relative z-10 group-hover/step:text-secondary-700">步骤 {si + 1}</h4>
                                                <p className="text-sm text-slate-500 leading-relaxed relative z-10 font-medium">
                                                    {step}
                                                </p>
                                                {/* Hover Detail Hint */}
                                                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-end text-secondary-500 opacity-0 group-hover/step:opacity-100 transition-opacity transform translate-y-2 group-hover/step:translate-y-0">
                                                    <span className="text-xs font-bold uppercase tracking-wider mr-1">Detail View</span>
                                                    <ArrowRight size={14} />
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
                <SectionHeader title="技术实现优势" icon={<Zap className="w-6 h-6 text-white" />} color="bg-amber-500" />
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {data.advantages.map((adv, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-[2.5rem] p-0 overflow-hidden hover:shadow-2xl hover:border-amber-300 transition-all duration-300 group flex flex-col hover:-translate-y-1">
                            <div className="p-10 pb-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center group-hover:bg-amber-50/30 transition-colors">
                                 <h3 className="text-2xl font-bold text-slate-800">{adv.title}</h3>
                                 <div className="bg-white border border-slate-200 p-3 rounded-2xl text-amber-500 shadow-sm"><Activity size={24} /></div>
                            </div>
                            <div className="p-10 flex-1 flex flex-col">
                                <div className="mb-8 flex-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key Features</span>
                                    <ul className="space-y-4 mt-4">
                                        {adv.features.map((f, fi) => (
                                            <li key={fi} className="flex items-start gap-3 text-sm text-slate-600 font-medium"><CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />{f}</li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div className="space-y-4 mt-auto">
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 flex gap-3 items-center group-hover:bg-amber-50 group-hover:border-amber-100 group-hover:text-amber-700 transition-colors">
                                        <Star size={18} className="text-amber-400 fill-amber-400"/> Impact: {adv.impact}
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400 uppercase">ROI / Metric</span>
                                        <span className="text-sm font-bold text-amber-600 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-100 shadow-sm">{adv.performance_metric || "TBD"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* 4. Values */}
             <div className="animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                <SectionHeader title="目标与价值" icon={<Target className="w-6 h-6 text-white" />} color="bg-primary-600" />
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-10">
                     {data.values.map((val, idx) => {
                         // Alternate subtle backgrounds
                         const bgClass = idx % 2 === 0 ? 'bg-gradient-to-br from-slate-50 to-white' : 'bg-white';
                         return (
                            <div key={idx} className={`${bgClass} border border-slate-100 rounded-[2.5rem] p-10 transition-all duration-500 hover:shadow-xl hover:border-primary-200 group flex flex-col hover:-translate-y-1`}>
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-50 text-primary-600 group-hover:scale-110 transition-transform"><TrendingUp size={28} /></div>
                                    <h3 className="text-2xl font-bold text-slate-800">{val.title}</h3>
                                </div>
                                <div className="relative mb-10 flex-1">
                                    <MessageSquareQuote className="absolute -top-4 -left-4 text-primary-100 w-12 h-12 opacity-50" />
                                    <p className="text-lg font-medium text-slate-700 italic relative z-10 pl-6 border-l-4 border-primary-200 leading-relaxed">"{val.motto}"</p>
                                </div>
                                <div className="space-y-3 mb-8">
                                    {val.benefits.map((b, bi) => (
                                        <div key={bi} className="flex items-center gap-3 text-sm font-bold text-slate-600 bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                                            <div className="w-2 h-2 rounded-full bg-primary-400"></div>{b}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold opacity-60 uppercase text-slate-500">
                                        <BarChart3 size={16} />
                                        <span>Key Indicator</span>
                                    </div>
                                    <span className="text-sm font-bold bg-slate-900 text-white px-4 py-1.5 rounded-full shadow-lg shadow-slate-900/20">{val.kpi || "Undefined"}</span>
                                </div>
                            </div>
                         );
                     })}
                </div>
             </div>

             {/* 5. Risks & Opportunities - Large 2-Col Grid */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                 <div className="bg-rose-50 border border-rose-100 rounded-[2.5rem] p-12 hover:shadow-2xl hover:shadow-rose-500/10 transition-shadow group">
                     <div className="flex items-center gap-6 mb-10">
                         <div className="p-5 bg-white text-rose-600 rounded-2xl shadow-md border border-rose-100 group-hover:scale-110 transition-transform">
                            <ShieldAlert size={40} />
                         </div>
                         <div>
                            <h3 className="font-black text-3xl text-slate-800">潜在风险预警</h3>
                            <p className="text-sm text-rose-600/70 font-bold uppercase tracking-wide mt-1">Risk Assessment</p>
                         </div>
                     </div>
                     <div className="space-y-6">
                         {data.risks && data.risks.map((risk, idx) => (
                             <div key={idx} className="flex flex-col bg-white p-8 rounded-3xl border border-rose-100 shadow-sm hover:-translate-y-1 transition-transform relative overflow-hidden group/item">
                                 <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
                                 <div className="flex items-center justify-between mb-4 pl-4">
                                     <h4 className="font-bold text-slate-800 text-xl">{risk.title}</h4>
                                     <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wide text-white ${risk.severity === 'High' ? 'bg-rose-600' : 'bg-orange-400'}`}>
                                         {risk.severity === 'High' ? 'High Risk' : risk.severity}
                                     </span>
                                 </div>
                                 <p className="text-base text-slate-600 pl-4 mb-2 leading-relaxed">{risk.mitigation}</p>
                             </div>
                         ))}
                     </div>
                 </div>

                 <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-12 hover:shadow-2xl hover:shadow-emerald-500/10 transition-shadow group">
                     <div className="flex items-center gap-6 mb-10">
                         <div className="p-5 bg-white text-emerald-600 rounded-2xl shadow-md border border-emerald-100 group-hover:scale-110 transition-transform">
                            <Zap size={40} fill="currentColor" />
                         </div>
                         <div>
                             <h3 className="font-black text-3xl text-slate-800">战略机会点</h3>
                             <p className="text-sm text-emerald-600/70 font-bold uppercase tracking-wide mt-1">Growth Opportunities</p>
                         </div>
                     </div>
                     <div className="space-y-6">
                         {data.opportunities && data.opportunities.map((opp, idx) => (
                             <div key={idx} className="flex flex-col bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm hover:-translate-y-1 transition-transform relative overflow-hidden group/item">
                                 <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                                 <div className="flex items-center justify-between mb-4 pl-4">
                                     <h4 className="font-bold text-slate-800 text-xl">{opp.title}</h4>
                                     <ArrowUpRight size={24} className="text-emerald-500 group-hover/item:translate-x-1 group-hover/item:-translate-y-1 transition-transform" />
                                 </div>
                                 <p className="text-base text-slate-600 pl-4 leading-relaxed">{opp.description}</p>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>

             {/* 6. Mind Map */}
             <div className="border-t border-slate-100 pt-16 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
                 <button onClick={() => setShowMindMap(!showMindMap)} className="flex items-center justify-between w-full text-left group p-8 rounded-[2.5rem] hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                     <div className="flex items-center gap-6">
                        <div className="bg-slate-800 p-4 rounded-2xl text-white shadow-xl shadow-slate-900/20 group-hover:scale-105 transition-transform"><Network size={32} /></div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">全景思维导图</h2>
                            <p className="text-base text-slate-400 font-bold mt-1">Full-Text Summary Mindmap</p>
                        </div>
                     </div>
                     <div className="text-slate-400 group-hover:text-slate-600 transition-colors p-3 bg-slate-100 rounded-full">{showMindMap ? <ChevronUp size={24} /> : <ChevronDown size={24} />}</div>
                 </button>
                 {showMindMap && (
                     <div className="mt-10 border border-slate-100 rounded-[2.5rem] overflow-hidden bg-slate-50/30 h-[900px] shadow-inner animate-fade-in">
                         <MermaidDiagram chart={generateMindMap()} />
                     </div>
                 )}
             </div>
           </div>

           {/* 7. Footer */}
           <div className="bg-slate-50 p-20 border-t border-slate-100 mt-12 rounded-[3rem]">
               <div className="max-w-7xl mx-auto space-y-20">
                   {/* Golden Sentence */}
                   <div className="bg-white p-16 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row items-center gap-12 transform hover:scale-[1.01] transition-transform duration-500 group relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-4 h-full bg-yellow-400"></div>
                       <div className="p-10 bg-yellow-50 text-yellow-600 rounded-full shrink-0 group-hover:rotate-12 transition-transform duration-500 shadow-inner border border-yellow-100">
                           <Star size={64} fill="currentColor" />
                       </div>
                       <div className="text-center md:text-left flex-1">
                           <h3 className="font-black text-sm text-slate-400 mb-8 uppercase tracking-[0.3em] flex items-center justify-center md:justify-start gap-4">
                               核心战略结论 <span className="w-20 h-px bg-slate-200"></span>
                           </h3>
                           <p className="text-4xl sm:text-5xl font-serif font-bold text-slate-800 italic leading-relaxed text-balance">
                               "{data.core_conclusion}"
                           </p>
                       </div>
                   </div>

                   {/* Executive Summary */}
                   <div className="space-y-10 bg-white p-16 rounded-[3.5rem] border border-slate-200 shadow-sm relative">
                       <div className="absolute -top-6 left-16 inline-flex items-center gap-3 bg-slate-900 text-white font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-2xl shadow-xl">
                           <Feather size={18} /> 执行摘要 Executive Summary
                       </div>
                       <div className="pt-8">
                            <p className="text-slate-600 leading-10 text-xl font-medium text-justify indent-12">
                                {data.executive_summary || "暂无执行摘要。"}
                            </p>
                       </div>
                   </div>
                   
                   <div className="text-center pt-12 border-t border-slate-200/60">
                       <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Generated by 凡硕财税高级专家顾问 · Powered by Gemini 3 Pro · {new Date().toLocaleDateString()}</p>
                   </div>
               </div>
           </div>
        </div>
      </div>
      
      {/* MODALS - Transcript & Tasks */}
      {activeModal === 'transcript' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in no-export">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden transform scale-100 transition-all">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4"><div className="p-3 rounded-2xl bg-primary-50 text-primary-600"><FileText size={24} /></div> 对话原文全览</h3>
                    <button onClick={() => setActiveModal(null)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-white">
                    {data.transcript_segments && data.transcript_segments.length > 0 ? (
                        data.transcript_segments.map((seg, idx) => (
                        <div key={idx} className="flex gap-6 group">
                            <div className="flex-shrink-0 flex flex-col items-center pt-2">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold shadow-sm text-lg border border-slate-200">{seg.speaker.slice(0, 1)}</div>
                            </div>
                            <div className="flex-1 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-bold text-slate-800 text-base">{seg.speaker}</span>
                                    {seg.timestamp && <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{seg.timestamp}</span>}
                                </div>
                                <p className="text-base text-slate-700 leading-relaxed bg-slate-50/50 p-6 rounded-3xl rounded-tl-none border border-slate-100 hover:border-primary-200 hover:shadow-sm transition-all">{seg.text}</p>
                            </div>
                        </div>
                        ))
                    ) : <div className="text-center py-20 text-slate-400">暂无原文记录</div>}
                </div>
            </div>
        </div>
      )}

      {activeModal === 'tasks' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in no-export">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden transform scale-100 transition-all">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4"><div className="p-3 rounded-2xl bg-secondary-50 text-secondary-600"><ListTodo size={24} /></div> 战略实施任务清单</h3>
                    <button onClick={() => setActiveModal(null)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/50">
                     {data.implementation_paths.map((path, idx) => (
                      <div key={idx} className="bg-white rounded-[2rem] p-10 border-l-8 border-secondary-500 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                             <h4 className="font-bold text-slate-800 text-2xl">{path.title}</h4>
                             <div className="bg-secondary-50 text-secondary-700 font-bold px-4 py-2 rounded-xl text-sm self-start sm:self-auto border border-secondary-100">{path.tag}</div>
                          </div>
                          <div className="space-y-5 mb-8">
                              {path.points.map((p, pi) => (
                                  <div key={pi} className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                                      <CheckCircle2 size={20} className="text-secondary-400 shrink-0 mt-0.5" />
                                      <span className="text-base text-slate-700 leading-relaxed">{p}</span>
                                  </div>
                              ))}
                          </div>
                          <div className="text-sm font-medium text-slate-500 italic pt-6 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50 p-4 rounded-xl -mx-4 -mb-4 mt-6">
                             <Target size={18} className="text-secondary-400" />
                             <span className="font-bold text-xs uppercase tracking-wider text-slate-400 mr-2">目标底线</span> "{path.bottom_line}"
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
            className={`p-3 rounded-xl hover:bg-slate-100 transition-colors ${color} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {icon}
        </button>
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {tooltip}
        </div>
    </div>
);

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; color: string; }> = ({ title, icon, color }) => (
  <div className="flex items-center gap-5 cursor-default group mb-12">
    <div className={`${color} p-4 rounded-[1.2rem] shadow-xl shadow-black/5 transform group-hover:scale-110 transition-transform duration-300 text-white ring-4 ring-white`}>{icon}</div>
    <h2 className="text-4xl font-black text-slate-800 tracking-tight">{title}</h2>
  </div>
);

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);