import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, X, MessageSquare, Loader2, Maximize2, Minimize2, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { AnalysisResult, ChatMessage } from '../types';
import { BlueprintChatService } from '../services/geminiService';
import { GenerateContentResponse } from "@google/genai";

interface BlueprintChatProps {
  blueprint: AnalysisResult | null;
  globalContext: string;
  initialHistory: ChatMessage[];
  onHistoryUpdate: (messages: ChatMessage[]) => void;
}

export const BlueprintChat: React.FC<BlueprintChatProps> = ({ blueprint, globalContext, initialHistory, onHistoryUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Feedback Input State
  const [feedbackInputId, setFeedbackInputId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const chatServiceRef = useRef<BlueprintChatService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Re-initialize chat service when blueprint or global context changes significantly
  // (Using a ref to avoid recreating on every render, but updating if context changes)
  useEffect(() => {
    chatServiceRef.current = new BlueprintChatService(blueprint, globalContext);
  }, [blueprint, globalContext]);

  useEffect(() => {
    if (initialHistory && initialHistory.length > 0) {
      setMessages(initialHistory);
    } else {
      const welcomeText = blueprint 
        ? '你好！我是您的凡硕财税高级专家顾问。我已经详细分析了这份战略蓝图，您可以随时向我咨询关于实施细节、潜在风险或任何需要澄清的专业问题。'
        : '你好！我是您的凡硕财税全局顾问。我可以基于您过往的分析历史为您提供咨询，或解答通用的财税战略问题。';

      setMessages([{
        id: 'init',
        role: 'model',
        text: welcomeText,
        timestamp: Date.now()
      }]);
    }
  }, [initialHistory, blueprint]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateParentHistory = (newMessages: ChatMessage[]) => {
      onHistoryUpdate(newMessages);
  };

  const handleFeedback = (msgId: string, type: 'like' | 'dislike') => {
      const newMessages = messages.map(msg => {
          if (msg.id === msgId) {
              const newFeedback = msg.feedback === type ? undefined : type;
              return { ...msg, feedback: newFeedback };
          }
          return msg;
      });
      setMessages(newMessages);
      updateParentHistory(newMessages);
      
      // Open text input if feedback set
      if (type) {
        setFeedbackInputId(msgId);
        // Pre-fill existing text if any
        const msg = newMessages.find(m => m.id === msgId);
        setFeedbackText(msg?.feedbackText || '');
      } else {
        setFeedbackInputId(null);
      }
  };

  const submitFeedbackText = (msgId: string) => {
    const newMessages = messages.map(msg => {
        if (msg.id === msgId) {
            return { ...msg, feedbackText: feedbackText };
        }
        return msg;
    });
    setMessages(newMessages);
    updateParentHistory(newMessages);
    setFeedbackInputId(null);
    setFeedbackText('');
  };

  // Helper to clean and format AI text
  const formatMessageText = (text: string) => {
    let formatted = text;

    // 1. Remove raw JSON or Code Block markers
    formatted = formatted.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    
    // 2. Format Headers (### Title) -> Bold Title
    formatted = formatted.replace(/^###\s+(.*$)/gm, '<h3 class="font-bold text-slate-800 mt-3 mb-1 text-sm">$1</h3>');
    formatted = formatted.replace(/^##\s+(.*$)/gm, '<h2 class="font-bold text-slate-800 mt-4 mb-2">$1</h2>');

    // 3. Format Bold (**text**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary-700 font-bold">$1</strong>');
    
    // 4. Format Italic (*text*)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="text-slate-600">$1</em>');

    // 5. Format Lists
    // Bullet points (- or *)
    formatted = formatted.replace(/^\s*[-*]\s+(.*)/gm, '<div class="flex items-start gap-2 my-1"><span class="text-primary-500 font-bold mt-1.5 text-[6px] shrink-0">●</span><span class="flex-1">$1</span></div>');
    // Numbered lists (1. )
    formatted = formatted.replace(/^\s*(\d+)\.\s+(.*)/gm, '<div class="flex items-start gap-2 my-1"><span class="text-secondary-600 font-bold text-xs shrink-0 mt-0.5">$1.</span><span class="flex-1">$2</span></div>');

    // 6. Handle Newlines
    formatted = formatted.replace(/\n/g, '<br/>');
    formatted = formatted.replace(/(<br\/>){3,}/g, '<br/><br/>');

    return formatted;
  };

  const handleSend = async () => {
    if (!input.trim() || !chatServiceRef.current || isTyping) return;

    const userMsg: ChatMessage = { 
        id: Date.now().toString(),
        role: 'user', 
        text: input, 
        timestamp: Date.now() 
    };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    updateParentHistory(updatedMsgs);
    
    setInput('');
    setIsTyping(true);

    try {
      const streamResult = await chatServiceRef.current.sendMessageStream(userMsg.text);
      
      let fullResponse = "";
      const modelMsgId = (Date.now() + 1).toString();
      const modelMsg: ChatMessage = { 
          id: modelMsgId,
          role: 'model', 
          text: "", 
          timestamp: Date.now() 
      };
      
      setMessages(prev => [...prev, modelMsg]);

      for await (const chunk of streamResult) {
          const c = chunk as GenerateContentResponse;
          if (c.text) {
              fullResponse += c.text;
              setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...modelMsg, text: fullResponse };
                  return newMsgs;
              });
          }
      }
      
      setMessages(prev => {
         updateParentHistory(prev);
         return prev;
      });

    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
          id: Date.now().toString(), 
          role: 'model', 
          text: '抱歉，我遇到了一些问题，请稍后再试。', 
          timestamp: Date.now() 
      };
      const finalMsgs = [...messages, userMsg, errorMsg];
      setMessages(finalMsgs);
      updateParentHistory(finalMsgs);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-1/2 right-4 -translate-y-1/2 p-4 bg-gradient-to-br from-primary-600 to-secondary-600 text-white rounded-full shadow-2xl hover:shadow-primary-500/50 transition-all transform hover:scale-110 z-[100] flex flex-col items-center justify-center gap-1 group border-4 border-white"
        title={blueprint ? "咨询当前报告" : "凡硕财税全局顾问"}
      >
        <Bot size={28} />
        <span className="text-[10px] font-bold mt-1 opacity-0 group-hover:opacity-100 absolute -bottom-6 transition-opacity whitespace-nowrap bg-slate-800 text-white px-2 py-1 rounded">
           {blueprint ? "报告顾问" : "全局顾问"}
        </span>
      </button>
    );
  }

  return (
    <div 
        className={`fixed z-[100] flex flex-col overflow-hidden transition-all duration-300 bg-white shadow-2xl border border-slate-200
            ${isExpanded 
                ? 'bottom-6 right-6 w-[80vw] h-[80vh] sm:w-[600px] sm:h-[700px] rounded-2xl' 
                : 'top-1/2 right-6 -translate-y-1/2 w-[90vw] h-[60vh] sm:w-[380px] sm:h-[500px] rounded-2xl'
            }
        `}
    >
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
             <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">凡硕财税{blueprint ? '专家' : '全局'}顾问</h3>
            <p className="text-[10px] text-primary-100 opacity-90">{blueprint ? 'Focus: Current Report' : 'Global Context Mode'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
                <X size={18} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm relative group/msg
                ${msg.role === 'user' 
                  ? 'bg-gradient-to-br from-primary-600 to-secondary-600 text-white rounded-br-none' 
                  : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                }`}
            >
              {msg.role === 'model' ? (
                  <div className="markdown-body" dangerouslySetInnerHTML={{ 
                      __html: formatMessageText(msg.text)
                  }} />
              ) : (
                  msg.text
              )}
            </div>
            
            {/* Feedback Section */}
            {msg.role === 'model' && (
                <div className="mt-1">
                    <div className="flex gap-2 px-1">
                        <button 
                            onClick={() => handleFeedback(msg.id, 'like')}
                            className={`p-1 rounded hover:bg-slate-200 transition-colors ${msg.feedback === 'like' ? 'text-green-500' : 'text-slate-300'}`}
                        >
                            <ThumbsUp size={12} />
                        </button>
                        <button 
                            onClick={() => handleFeedback(msg.id, 'dislike')}
                            className={`p-1 rounded hover:bg-slate-200 transition-colors ${msg.feedback === 'dislike' ? 'text-red-500' : 'text-slate-300'}`}
                        >
                            <ThumbsDown size={12} />
                        </button>
                    </div>

                    {/* Feedback Text Input Popover */}
                    {feedbackInputId === msg.id && (
                        <div className="mt-2 bg-white p-2 rounded-lg border border-slate-200 shadow-md w-64 animate-fade-in z-10 relative">
                            <textarea 
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder={msg.feedback === 'like' ? "这哪里做得好？" : "哪里可以改进？"}
                                className="w-full text-xs p-2 bg-slate-50 rounded border border-slate-100 outline-none h-16 resize-none mb-2"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setFeedbackInputId(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">取消</button>
                                <button onClick={() => submitFeedbackText(msg.id)} className="text-xs bg-primary-500 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-primary-600">
                                    提交 <Check size={10} />
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Display submitted feedback if any */}
                    {msg.feedbackText && msg.id !== feedbackInputId && (
                        <div className="mt-1 ml-1 text-[10px] text-slate-400 italic max-w-[200px] truncate bg-slate-100 px-2 py-1 rounded">
                            "{msg.feedbackText}"
                        </div>
                    )}
                </div>
            )}
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none p-3 shadow-sm">
               <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={blueprint ? "询问关于本报告的问题..." : "询问全局历史或通用问题..."}
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm transition-all"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};