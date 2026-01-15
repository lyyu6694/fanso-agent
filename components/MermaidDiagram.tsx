import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download, Maximize2, Minimize2, Loader2, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

interface MermaidDiagramProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false, // Important: We handle rendering manually
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const renderDiagram = async () => {
      setIsLoading(true);
      setError(false);
      setSvg(''); // Clear previous

      // Small delay to ensure DOM is ready and state is settled
      await new Promise(resolve => setTimeout(resolve, 300));

      if (containerRef.current) {
        try {
          // Generate a truly unique ID for this render cycle
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          
          // Mermaid render can sometimes fail if container dimensions are 0, etc.
          // We wrap in a try/catch.
          const { svg } = await mermaid.render(id, chart);
          setSvg(svg);
        } catch (error) {
          console.error('Mermaid render error:', error);
          setError(true);
        } finally {
          setIsLoading(false);
        }
      }
    };

    renderDiagram();
  }, [chart]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (containerRef.current) {
        try {
            const canvas = await html2canvas(containerRef.current, { backgroundColor: '#ffffff', scale: 2 });
            const link = document.createElement('a');
            link.download = 'system-architecture.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Export failed", err);
            alert("导出图片失败");
        }
    }
  };

  return (
    <div className={`relative group transition-all duration-300 bg-white ${isExpanded ? 'fixed inset-4 z-[9999] shadow-2xl rounded-2xl border border-slate-200 flex flex-col' : 'w-full h-full min-h-[500px] flex flex-col'}`}>
       
       <style>{`
         .mermaid-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
         }
         .mermaid-wrapper svg {
           max-width: 100%;
           height: auto;
           max-height: 100%;
         }
         
         /* Animations */
         @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
         }
         
         @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
         }

         .mermaid-wrapper .node {
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0; 
         }
         
         .mermaid-wrapper .edgePath {
             animation: fadeIn 0.8s ease-out 0.3s forwards;
             opacity: 0;
         }

         /* Styling overrides */
         .mermaid-wrapper .node rect, .mermaid-wrapper .node circle, .mermaid-wrapper .node polygon {
           transition: all 0.3s ease;
           filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05));
         }
         .mermaid-wrapper .node:hover rect, .mermaid-wrapper .node:hover circle {
           filter: drop-shadow(0 8px 12px rgba(0,0,0,0.1));
           stroke-width: 3px !important;
         }
         .mermaid-wrapper .edgePath path {
           stroke-width: 2px;
         }
       `}</style>

       {/* Toolbar */}
       {!isLoading && !error && (
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button 
                onClick={handleDownload}
                className="p-2 bg-white text-slate-600 rounded-lg shadow-md hover:text-primary-600 hover:bg-primary-50 border border-slate-100 transition-colors"
                title="导出图片"
            >
                <Download size={16} />
            </button>
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 bg-white text-slate-600 rounded-lg shadow-md hover:text-primary-600 hover:bg-primary-50 border border-slate-100 transition-colors"
                title={isExpanded ? "退出全屏" : "全屏查看"}
            >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
        </div>
       )}
      
      {/* Loading Overlay */}
      {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity duration-300">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-2" />
              <span className="text-xs font-bold text-slate-400">正在绘制思维导图...</span>
          </div>
      )}

      {/* Error State */}
      {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-50/50">
              <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
              <span className="text-sm font-bold text-red-500">导图生成失败</span>
              <p className="text-xs text-red-300 mt-1">请尝试切换视图或刷新重试</p>
          </div>
      )}

      <div 
        className={`mermaid-wrapper w-full h-full p-8 overflow-auto ${isExpanded ? 'bg-slate-50' : 'bg-white'} transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        ref={containerRef} 
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};