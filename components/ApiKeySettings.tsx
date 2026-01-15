import React, { useState, useEffect } from 'react';
import { X, Key, Save, Check, AlertTriangle } from 'lucide-react';

interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('fs_custom_api_key');
      if (stored) setApiKey(stored);
      setSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('fs_custom_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('fs_custom_api_key');
    }
    setSaved(true);
    setTimeout(() => {
        setSaved(false);
        onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in-up">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Key size={20} className="text-primary-400" />
            <h2 className="font-bold text-lg">API Key 配置</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
           <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3 text-sm text-amber-800">
             <AlertTriangle size={18} className="shrink-0 mt-0.5" />
             <p>建议使用您自己的 Gemini API Key 以获得更稳定的服务体验。Key 仅保存在您的本地浏览器中。</p>
           </div>

           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gemini API Key</label>
             <input 
               type="password" 
               value={apiKey}
               onChange={(e) => setApiKey(e.target.value)}
               placeholder="sk-..."
               className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary-500 focus:bg-white outline-none font-mono text-sm transition-all"
             />
           </div>

           <button 
             onClick={handleSave}
             className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                 saved ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
             }`}
           >
             {saved ? (
                 <>
                   <Check size={18} /> 已保存
                 </>
             ) : (
                 <>
                   <Save size={18} /> 保存配置
                 </>
             )}
           </button>
        </div>
      </div>
    </div>
  );
};