import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download, Maximize2, Minimize2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';

interface MermaidDiagramProps {
  chart: string;
}

// Initialize only once
mermaid.initialize({
  startOnLoad: false, 
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: '"Noto Sans SC", sans-serif',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis'
  }
});

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart) return;
      
      setStatus('loading');
      setSvg(''); 
      
      // Small delay to ensure DOM is ready and state is settled
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
        setStatus('success');
      } catch (error) {
        console.error('Mermaid render error:', error);
        setStatus('error');
      }
    };

    renderDiagram();
  }, [chart]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (containerRef.current) {
        try {
            // Locate the SVG element specifically
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
                // Ensure SVG has explicit dimensions for html2canvas
                const bbox = svgElement.getBoundingClientRect();
                svgElement.setAttribute('width', bbox.width.toString());
                svgElement.setAttribute('height', bbox.height.toString());
            }

            const canvas = await html2canvas(containerRef.current, { 
                backgroundColor: '#ffffff', 
                scale: 3, // Higher scale for better quality
                logging: false
            });
            const link = document.createElement('a');
            link.download = `blueprint-architecture-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Export failed", err);
            alert("导出图片失败");
        }
    }
  };

  return (
    <div 
        className={`relative group transition-all duration-300 bg-white overflow-hidden
        ${isExpanded 
            ? 'fixed inset-4 z-[9999] shadow-2xl rounded-2xl border border-slate-200 flex flex-col' 
            : 'w-full h-full min-h-[500px] flex flex-col rounded-2xl'
        }`}
    >
       <style>{`
         .mermaid-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: #fafafa; /* Slate-50 equivalent */
            background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
            background-size: 20px 20px;
         }
         .mermaid-wrapper svg {
           max-width: 100%;
           height: auto;
         }
         
         /* Node Entrance Animations */
         .mermaid-wrapper .node {
            opacity: 0;
            animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
         }
         
         .mermaid-wrapper .edgePath {
             opacity: 0;
             animation: drawLine 0.8s ease-out 0.4s forwards;
         }

         @keyframes popIn {
            from { opacity: 0; transform: scale(0.9) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
         }
         
         @keyframes drawLine {
            from { opacity: 0; }
            to { opacity: 1; }
         }

         /* Interactive Node Styling */
         .mermaid-wrapper .node rect, 
         .mermaid-wrapper .node circle, 
         .mermaid-wrapper .node polygon {
           transition: all 0.3s ease;
           cursor: default;
         }
         .mermaid-wrapper .node:hover rect, 
         .mermaid-wrapper .node:hover circle,
         .mermaid-wrapper .node:hover polygon {
           filter: drop-shadow(0 8px 16px rgba(0,0,0,0.15));
           stroke-width: 2px !important;
         }
       `}</style>

       {/* Toolbar */}
       <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            {status === 'success' && (
                <button 
                    onClick={handleDownload}
                    className="p-2 bg-white text-slate-600 rounded-lg shadow-md hover:text-primary-600 hover:bg-primary-50 border border-slate-100 transition-colors"
                    title="导出图片"
                >
                    <Download size={16} />
                </button>
            )}
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 bg-white text-slate-600 rounded-lg shadow-md hover:text-primary-600 hover:bg-primary-50 border border-slate-100 transition-colors"
                title={isExpanded ? "退出全屏" : "全屏查看"}
            >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
       </div>

       {/* Content Area */}
       <div className="flex-1 w-full h-full relative" ref={containerRef}>
            {status === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10">
                    <Loader2 size={32} className="text-primary-500 animate-spin mb-3" />
                    <p className="text-sm font-bold text-slate-500 animate-pulse">正在构建架构图谱...</p>
                </div>
            )}

            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/50 z-10">
                    <AlertCircle size={32} className="text-red-400 mb-3" />
                    <p className="text-sm font-bold text-red-600">图谱生成失败</p>
                    <button onClick={() => setStatus('loading')} className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold shadow-sm hover:bg-red-50">
                        <RefreshCw size={12} className="inline mr-1"/> 重试
                    </button>
                </div>
            )}
            
            {status === 'success' && (
                <div 
                    className="mermaid-wrapper p-8"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            )}
       </div>
       
       {isExpanded && (
           <div className="bg-slate-50 p-3 text-center border-t border-slate-200">
               <p className="text-xs text-slate-400 font-mono">System Architecture View • Generated by Mermaid.js</p>
           </div>
       )}
    </div>
  );
};