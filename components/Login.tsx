import React, { useState } from 'react';
import { Lock, Shield, ArrowRight, UserCheck, Key, Mail, User as UserIcon, LogIn } from 'lucide-react';
import { AuthService } from '../services/authService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

type LoginMode = 'code_entry' | 'register_details' | 'email_login' | 'admin_login';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<LoginMode>('code_entry');
  
  // Form States
  const [inputCode, setInputCode] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [adminPass, setAdminPass] = useState('');
  
  const [error, setError] = useState<string | null>(null);

  const handleVerifyCode = () => {
    if (!inputCode.trim()) { setError("请输入邀请码"); return; }
    
    const result = AuthService.validateInvitationCode(inputCode);
    if (result.valid) {
      setError(null);
      setMode('register_details');
    } else {
      setError(result.message || "验证失败");
    }
  };

  const handleRegister = () => {
    if (!nickname || !email || !password) { setError("请填写所有字段"); return; }
    try {
        const user = AuthService.registerUser(inputCode, nickname, email, password);
        onLogin(user);
    } catch (e: any) {
        setError(e.message);
    }
  };

  const handleEmailLogin = () => {
      if (!email || !password) { setError("请输入邮箱和密码"); return; }
      try {
          const user = AuthService.loginWithEmail(email, password);
          onLogin(user);
      } catch (e: any) {
          setError(e.message);
      }
  };

  const handleAdminLogin = () => {
    if (AuthService.verifyAdminPassword(adminPass)) {
      const user = AuthService.loginAdmin();
      onLogin(user);
    } else {
      setError("管理员密码错误");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-secondary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-12 rounded-3xl shadow-2xl border border-white/50 w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white mb-6 shadow-lg transform rotate-3">
             <Lock size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">凡硕财税Agent</h1>
          <p className="text-slate-500 font-medium">企业级智能战略顾问</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center gap-2 animate-pulse">
             <Shield size={16} /> {error}
          </div>
        )}

        {/* --- Mode: Code Entry --- */}
        {mode === 'code_entry' && (
          <div className="space-y-6 animate-fade-in">
             <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">首次使用 ? 请输入邀请码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key size={18} />
                  </div>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => { setInputCode(e.target.value); setError(null); }}
                    placeholder="请输入32位邀请码"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-primary-400 focus:bg-white outline-none transition-all font-mono text-sm"
                  />
                </div>
              </div>
              <button onClick={handleVerifyCode} className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                <span>验证邀请码</span> <ArrowRight size={18} />
              </button>
              <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-300 uppercase">Or</span>
                  <div className="flex-grow border-t border-slate-200"></div>
              </div>
              <button onClick={() => { setMode('email_login'); setError(null); }} className="w-full py-3 bg-white text-slate-600 border-2 border-slate-100 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all">
                  已有账号登录
              </button>
          </div>
        )}

        {/* --- Mode: Registration --- */}
        {mode === 'register_details' && (
           <div className="space-y-4 animate-fade-in">
              <div className="text-center text-sm text-green-600 font-bold mb-4 flex items-center justify-center gap-1">
                  <UserCheck size={16} /> 邀请码验证成功，请完善信息
              </div>
              <div className="relative">
                 <UserIcon size={16} className="absolute top-3.5 left-3 text-slate-400"/>
                 <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="您的昵称" className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-400" />
              </div>
              <div className="relative">
                 <Mail size={16} className="absolute top-3.5 left-3 text-slate-400"/>
                 <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="绑定邮箱" className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-400" />
              </div>
              <div className="relative">
                 <Lock size={16} className="absolute top-3.5 left-3 text-slate-400"/>
                 <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="设置密码" className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-400" />
              </div>
              <button onClick={handleRegister} className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-all mt-4">
                  完成注册并登录
              </button>
              <button onClick={() => setMode('code_entry')} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600">返回</button>
           </div>
        )}

        {/* --- Mode: Email Login --- */}
        {mode === 'email_login' && (
           <div className="space-y-4 animate-fade-in">
              <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">账号登录</label>
                 <div className="space-y-3">
                    <div className="relative">
                        <Mail size={18} className="absolute top-3.5 left-3 text-slate-400"/>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="邮箱" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-400" />
                    </div>
                    <div className="relative">
                        <Lock size={18} className="absolute top-3.5 left-3 text-slate-400"/>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary-400" />
                    </div>
                 </div>
              </div>
              <button onClick={handleEmailLogin} className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all mt-2 flex items-center justify-center gap-2">
                  <LogIn size={18} /> 立即登录
              </button>
              <button onClick={() => { setMode('code_entry'); setError(null); }} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600">
                  没有账号？使用邀请码注册
              </button>
           </div>
        )}

        {/* --- Mode: Admin Login --- */}
        {mode === 'admin_login' && (
           <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">管理员密码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Shield size={18} />
                  </div>
                  <input type="password" value={adminPass} onChange={(e) => { setAdminPass(e.target.value); setError(null); }} placeholder="••••••••" className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-secondary-400 focus:bg-white outline-none transition-all font-mono text-sm" />
                </div>
              </div>
              <button onClick={handleAdminLogin} className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                <span>管理员登录</span> <UserCheck size={18} />
              </button>
              <button onClick={() => { setMode('code_entry'); setError(null); }} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600">返回</button>
           </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          {mode !== 'admin_login' && (
            <button onClick={() => { setMode('admin_login'); setError(null); setAdminPass(''); }} className="text-xs font-bold text-slate-300 hover:text-primary-500 transition-colors">
                我是管理员
            </button>
          )}
        </div>
      </div>
    </div>
  );
};