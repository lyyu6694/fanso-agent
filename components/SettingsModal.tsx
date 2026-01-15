import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Key, Shield, Database, Save, Check, Plus, Trash2, Copy, RefreshCw, FileText, AlertTriangle, Lock, UploadCloud, File as FileIcon, BarChart3, Users, Edit2, RotateCcw, Activity, Calendar, Clock, ChevronRight } from 'lucide-react';
import { AuthService } from '../services/authService';
import { KBService } from '../services/kbService';
import { User, InvitationCode, KnowledgeBaseItem, TokenUsageRecord, UserStat } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'invites' | 'kb' | 'apikey'>('dashboard');
  
  // Dashboard Data
  const [tokenStats, setTokenStats] = useState<TokenUsageRecord[]>([]);
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  // Users Data
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

  // Invites Data
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [filterCodeStatus, setFilterCodeStatus] = useState<'all' | 'active' | 'expired'>('all');
  
  // Invite Creation Modal State
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [createDuration, setCreateDuration] = useState<number>(7);
  const [isCustomCreate, setIsCustomCreate] = useState(false);
  const [customCreateDays, setCustomCreateDays] = useState('');

  // Invite Renewal Modal State
  const [renewingCode, setRenewingCode] = useState<InvitationCode | null>(null);
  const [renewDuration, setRenewDuration] = useState<number>(7);
  const [isCustomRenew, setIsCustomRenew] = useState(false);
  const [customRenewDays, setCustomRenewDays] = useState('');

  // KB Data
  const [kbItems, setKbItems] = useState<KnowledgeBaseItem[]>([]);
  const [editingKbId, setEditingKbId] = useState<string | null>(null);
  const [kbTitle, setKbTitle] = useState('');
  const [kbContent, setKbContent] = useState('');
  const [kbError, setKbError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Key
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    if (isOpen && user.role === 'admin') {
      // Load All Data
      const storedKey = localStorage.getItem('fs_custom_api_key');
      if (storedKey) setApiKey(storedKey);
      
      refreshData();
      
      // Default tab
      setActiveTab('dashboard');
    }
  }, [isOpen, user]);

  const refreshData = () => {
      setCodes(AuthService.getCodes());
      setKbItems(KBService.getAll());
      setRegisteredUsers(AuthService.getRegisteredUsers());
      setTokenStats(AuthService.getTokenStats());
      setUserStats(AuthService.getUserStats());
      setActivityLog(AuthService.getActivityLog());
  };

  // --- Dashboard Logic ---
  const maxTokens = Math.max(...tokenStats.map(s => s.tokens), 1); // Avoid div by zero

  // --- KB Logic ---
  const handleEditKb = (item: KnowledgeBaseItem) => {
      setEditingKbId(item.id);
      setKbTitle(item.title);
      setKbContent(item.content);
      setKbError(null);
  };
  const handleSaveKb = () => {
      if (!kbTitle.trim() || !kbContent.trim()) { setKbError("标题和内容不能为空"); return; }
      try {
          if (editingKbId) {
              KBService.update(editingKbId, kbTitle, kbContent);
          } else {
              KBService.add(kbTitle, kbContent);
          }
          setEditingKbId(null);
          setKbTitle('');
          setKbContent('');
          setKbItems(KBService.getAll());
      } catch (e: any) { setKbError(e.message); }
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        for (let i = 0; i < e.target.files.length; i++) {
            await KBService.addFromFile(e.target.files[i]);
        }
        setKbItems(KBService.getAll());
        setKbError(null);
      } catch (err: any) { setKbError(err.message || "上传失败"); }
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Invite Logic ---
  const handleCreateCodeSubmit = () => {
    let days = isCustomCreate ? parseInt(customCreateDays) : createDuration;
    if (isNaN(days) || days <= 0) days = 7; // fallback
    
    AuthService.generateInvitationCode(days);
    refreshData();
    setShowCreateInvite(false);
    setCustomCreateDays('');
    setIsCustomCreate(false);
  };

  const handleRenewCodeSubmit = () => {
      if (!renewingCode) return;
      let days = isCustomRenew ? parseInt(customRenewDays) : renewDuration;
      if (isNaN(days) || days <= 0) days = 7;

      AuthService.renewCode(renewingCode.code, days);
      refreshData();
      setRenewingCode(null);
      setCustomRenewDays('');
      setIsCustomRenew(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col relative z-10 overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-gradient-to-br from-primary-500 to-secondary-500 p-2 rounded-lg">
                <Shield size={20} />
             </div>
             <div>
                <h2 className="font-bold text-lg">系统管理控制台</h2>
                <p className="text-xs text-slate-400">Admin Dashboard</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {user.role !== 'admin' ? (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                 <Lock size={48} className="mb-4 opacity-20" />
                 <p>您没有权限访问此区域。</p>
             </div>
        ) : (
            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                <div className="w-56 bg-slate-50 border-r border-slate-200 p-4 space-y-2 shrink-0 hidden md:block">
                    <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 size={16}/>} label="活动概览" />
                    <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={16}/>} label="用户管理" />
                    <NavButton active={activeTab === 'invites'} onClick={() => setActiveTab('invites')} icon={<RefreshCw size={16}/>} label="邀请码管理" />
                    <NavButton active={activeTab === 'kb'} onClick={() => setActiveTab('kb')} icon={<Database size={16}/>} label="知识库配置" />
                    <NavButton active={activeTab === 'apikey'} onClick={() => setActiveTab('apikey')} icon={<Key size={16}/>} label="API Key" />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white relative">
                    
                    {/* --- TAB: DASHBOARD --- */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Token Usage Chart */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <Activity size={18} className="text-primary-500"/> API Token 消耗趋势 (近30天)
                                    </h3>
                                    <div className="h-48 flex items-end gap-2">
                                        {tokenStats.length === 0 && <p className="text-slate-300 w-full text-center">暂无数据</p>}
                                        {tokenStats.map((stat, idx) => (
                                            <div key={idx} className="flex-1 flex flex-col items-center group relative">
                                                <div 
                                                    className="w-full bg-primary-200 rounded-t hover:bg-primary-500 transition-colors relative"
                                                    style={{ height: `${(stat.tokens / maxTokens) * 100}%`, minHeight: '4px' }}
                                                >
                                                     <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                                                        {stat.tokens} Tokens
                                                     </div>
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-2 rotate-45 origin-left truncate w-full">{stat.date.slice(5)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* User Leaderboard */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                                     <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <Users size={18} className="text-secondary-500"/> 用户活跃榜
                                    </h3>
                                    <div className="space-y-3">
                                        {userStats.length === 0 && <p className="text-slate-300 text-center">暂无活跃用户</p>}
                                        {userStats.slice(0, 5).map((u, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-secondary-100 text-secondary-600 font-bold flex items-center justify-center text-xs">
                                                        {u.nickname.slice(0,1)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-700">{u.nickname}</div>
                                                        <div className="text-[10px] text-slate-400">{u.email}</div>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-bold text-slate-600">{u.requestCount} 次请求</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Activity Log */}
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">最新系统活动</h3>
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {activityLog.map((log) => (
                                        <div key={log.id} className="text-xs flex gap-4 text-slate-600 border-b border-slate-200 pb-2 last:border-0">
                                            <span className="text-slate-400 w-32 shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                                            <span className="font-bold w-40 shrink-0 truncate">{log.userEmail}</span>
                                            <span>{log.action}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: USERS --- */}
                    {activeTab === 'users' && (
                        <div>
                            <h3 className="font-bold text-xl mb-6">注册用户列表</h3>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="p-4">昵称</th>
                                            <th className="p-4">邮箱</th>
                                            <th className="p-4">注册时间</th>
                                            <th className="p-4">关联邀请码</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {registeredUsers.map(u => (
                                            <tr key={u.email} className="hover:bg-slate-50">
                                                <td className="p-4 font-bold">{u.username}</td>
                                                <td className="p-4 text-slate-600">{u.email}</td>
                                                <td className="p-4 text-slate-500">{u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : '-'}</td>
                                                <td className="p-4 font-mono text-xs">{u.associatedCode}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: INVITES --- */}
                    {activeTab === 'invites' && (
                        <div className="space-y-6 relative">
                            {/* Create Invite Modal / Overlay (Centered & Fixed via Portal) */}
                            {showCreateInvite && createPortal(
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateInvite(false)}></div>
                                    <div className="bg-white shadow-2xl border border-slate-100 rounded-2xl p-6 w-full max-w-md space-y-6 relative z-10 transform scale-100 transition-all">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <Plus size={20} className="text-primary-500"/> 生成新邀请码
                                            </h3>
                                            <button onClick={() => setShowCreateInvite(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={18}/></button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase">选择有效期</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[1, 3, 7, 30, 365].map(days => (
                                                    <button 
                                                        key={days}
                                                        onClick={() => { setCreateDuration(days); setIsCustomCreate(false); }}
                                                        className={`py-2 rounded-lg text-sm font-bold border transition-all ${!isCustomCreate && createDuration === days ? 'bg-primary-50 border-primary-500 text-primary-600' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                                    >
                                                        {days === 365 ? '1年' : `${days}天`}
                                                    </button>
                                                ))}
                                                <button 
                                                    onClick={() => setIsCustomCreate(true)}
                                                    className={`py-2 rounded-lg text-sm font-bold border transition-all ${isCustomCreate ? 'bg-primary-50 border-primary-500 text-primary-600' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                                >
                                                    自定义
                                                </button>
                                            </div>
                                            {isCustomCreate && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <input 
                                                        type="number" 
                                                        value={customCreateDays}
                                                        onChange={e => setCustomCreateDays(e.target.value)}
                                                        placeholder="输入天数"
                                                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-400"
                                                    />
                                                    <span className="text-sm text-slate-500">天</span>
                                                </div>
                                            )}
                                        </div>

                                        <button onClick={handleCreateCodeSubmit} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary-500/30">
                                            确认生成
                                        </button>
                                    </div>
                                </div>,
                                document.body
                            )}

                             {/* Renew Invite Modal / Overlay (Centered & Fixed via Portal) */}
                             {renewingCode && createPortal(
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenewingCode(null)}></div>
                                    <div className="bg-white shadow-2xl border border-slate-100 rounded-2xl p-6 w-full max-w-md space-y-6 relative z-10 transform scale-100 transition-all">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <RotateCcw size={20} className="text-blue-500"/> 延长有效期
                                            </h3>
                                            <button onClick={() => setRenewingCode(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={18}/></button>
                                        </div>
                                        
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm mb-4">
                                            <span className="text-slate-400 block text-xs mb-1">当前代码</span>
                                            <code className="font-mono font-bold text-slate-700 block truncate">{renewingCode.code}</code>
                                            <div className="flex justify-between mt-2 text-xs">
                                                <span className="text-slate-500">当前过期时间:</span>
                                                <span className={Date.now() > renewingCode.expiresAt ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                                                    {new Date(renewingCode.expiresAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase">延长时长</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[7, 30, 90].map(days => (
                                                    <button 
                                                        key={days}
                                                        onClick={() => { setRenewDuration(days); setIsCustomRenew(false); }}
                                                        className={`py-2 rounded-lg text-sm font-bold border transition-all ${!isCustomRenew && renewDuration === days ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                                    >
                                                        +{days}天
                                                    </button>
                                                ))}
                                                <button 
                                                    onClick={() => setIsCustomRenew(true)}
                                                    className={`py-2 rounded-lg text-sm font-bold border transition-all ${isCustomRenew ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                                >
                                                    自定义
                                                </button>
                                            </div>
                                            {isCustomRenew && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <input 
                                                        type="number" 
                                                        value={customRenewDays}
                                                        onChange={e => setCustomRenewDays(e.target.value)}
                                                        placeholder="增加天数"
                                                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                                                    />
                                                    <span className="text-sm text-slate-500">天</span>
                                                </div>
                                            )}
                                        </div>

                                        <button onClick={handleRenewCodeSubmit} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30">
                                            确认延长
                                        </button>
                                    </div>
                                </div>,
                                document.body
                             )}

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-4 items-center justify-between">
                                <div className="flex gap-2">
                                    <button onClick={() => setFilterCodeStatus('all')} className={`px-3 py-1 rounded-lg text-xs font-bold ${filterCodeStatus === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>全部</button>
                                    <button onClick={() => setFilterCodeStatus('active')} className={`px-3 py-1 rounded-lg text-xs font-bold ${filterCodeStatus === 'active' ? 'bg-green-600 text-white' : 'bg-white text-slate-600'}`}>有效</button>
                                    <button onClick={() => setFilterCodeStatus('expired')} className={`px-3 py-1 rounded-lg text-xs font-bold ${filterCodeStatus === 'expired' ? 'bg-red-500 text-white' : 'bg-white text-slate-600'}`}>过期</button>
                                </div>
                                <button onClick={() => setShowCreateInvite(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-primary-700 shadow-md shadow-primary-500/20">
                                    <Plus size={14} /> 生成邀请码
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="p-4">Code</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Expires</th>
                                            <th className="p-4">Used By</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {codes.filter(c => {
                                            const isExpired = Date.now() > c.expiresAt;
                                            if (filterCodeStatus === 'active') return !isExpired;
                                            if (filterCodeStatus === 'expired') return isExpired;
                                            return true;
                                        }).map(c => {
                                            const isExpired = Date.now() > c.expiresAt;
                                            return (
                                            <tr key={c.code} className="hover:bg-slate-50">
                                                <td className="p-4 font-mono select-all text-xs w-32 truncate" title={c.code}>{c.code.slice(0, 8)}...{c.code.slice(-4)}</td>
                                                <td className="p-4">
                                                    {isExpired ? <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full">过期</span> : <span className="text-green-500 font-bold text-xs bg-green-50 px-2 py-0.5 rounded-full">有效</span>}
                                                    {c.isUsed && <span className="ml-2 text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">已用</span>}
                                                </td>
                                                <td className="p-4 text-xs text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={12}/> {new Date(c.expiresAt).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs font-medium text-slate-700">{c.usedByEmail || '-'}</td>
                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    <button onClick={() => {navigator.clipboard.writeText(c.code)}} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-primary-600 hover:border-primary-200 transition-colors" title="复制"><Copy size={14}/></button>
                                                    <button onClick={() => setRenewingCode(c)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors" title="续期"><RotateCcw size={14}/></button>
                                                    <button onClick={() => {if(confirm('确定删除此邀请码吗?')) {AuthService.deleteCode(c.code); refreshData();}}} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors" title="删除"><Trash2 size={14}/></button>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: KB --- */}
                    {activeTab === 'kb' && (
                        <div className="h-full flex flex-col space-y-6">
                             <div className="bg-white border-2 border-slate-100 rounded-xl p-4 space-y-4 shadow-sm">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    {editingKbId ? <Edit2 size={16} /> : <Plus size={16} />} 
                                    {editingKbId ? '编辑文档' : '添加新文档'}
                                </h4>
                                {kbError && <p className="text-red-500 text-xs font-bold">{kbError}</p>}
                                <input 
                                    className="w-full p-2 border-b border-slate-200 outline-none font-bold text-slate-800 focus:border-secondary-400 transition-colors"
                                    placeholder="文档标题"
                                    value={kbTitle}
                                    onChange={e => setKbTitle(e.target.value)}
                                />
                                <textarea 
                                    className="w-full p-2 h-32 outline-none text-sm text-slate-600 resize-none bg-slate-50 rounded-lg focus:bg-white focus:ring-1 focus:ring-secondary-200 transition-all"
                                    placeholder="文档内容..."
                                    value={kbContent}
                                    onChange={e => setKbContent(e.target.value)}
                                />
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.md,.csv,.json,.doc,.docx" className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-slate-500 hover:text-secondary-600 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                                            <UploadCloud size={14} /> 批量上传文件
                                        </button>
                                        <span className="text-[10px] text-slate-400">支持 DOCX, TXT, MD</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {editingKbId && <button onClick={() => { setEditingKbId(null); setKbTitle(''); setKbContent(''); }} className="text-slate-400 text-xs font-bold hover:text-slate-600 px-3">取消</button>}
                                        <button onClick={handleSaveKb} className="bg-secondary-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-secondary-700 transition-all">
                                            {editingKbId ? '更新文档' : '添加到知识库'}
                                        </button>
                                    </div>
                                </div>
                             </div>

                             <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                                {kbItems.map(item => (
                                    <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col group hover:border-secondary-300 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                 <div className={`p-1.5 rounded ${item.type === 'file' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                     {item.type === 'file' ? <FileIcon size={14}/> : <FileText size={14}/>}
                                                 </div>
                                                 <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.title}</h4>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditKb(item)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button>
                                                <button onClick={() => {if(confirm('删除?')) {KBService.remove(item.id); setKbItems(KBService.getAll())}}} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-3 mb-2 flex-1">{item.content}</p>
                                        <div className="text-[10px] text-slate-400 flex justify-between">
                                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                            {item.updatedAt && <span>Edited</span>}
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                    
                    {/* --- TAB: API KEY --- */}
                    {activeTab === 'apikey' && (
                        <div className="max-w-xl mx-auto space-y-6 mt-10">
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-sm text-amber-800">
                                <AlertTriangle size={20} className="shrink-0" />
                                <p>全局 Gemini API Key 设置。所有用户将共享此 Key 进行调用。</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Secret Key</label>
                                <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary-500 focus:bg-white outline-none font-mono text-sm transition-all"
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    if(apiKey.trim()) localStorage.setItem('fs_custom_api_key', apiKey.trim());
                                    else localStorage.removeItem('fs_custom_api_key');
                                    setKeySaved(true);
                                    setTimeout(() => setKeySaved(false), 1500);
                                }}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-white ${keySaved ? 'bg-green-500' : 'bg-slate-900 hover:bg-slate-800'}`}
                            >
                                {keySaved ? <><Check size={18} /> 已保存</> : <><Save size={18} /> 保存配置</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${active ? 'bg-white text-slate-800 shadow-md shadow-slate-200 ring-1 ring-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
  >
      <div className={`transition-colors ${active ? 'text-primary-500' : 'text-slate-400'}`}>
          {icon}
      </div>
      {label}
      {active && <ChevronRight size={14} className="ml-auto text-slate-300" />}
  </button>
);