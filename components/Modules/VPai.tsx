
import React, { useState, useRef, useEffect } from 'react';
import { AppData } from '../../types';
import { askVPai } from '../../services/geminiService';

interface VPaiProps {
  data: AppData;
  onBack: () => void;
}

const VPai: React.FC<VPaiProps> = ({ data, onBack }) => {
  const [messages, setMessages] = useState<{ text: string; sender: 'USER' | 'AI' }[]>([
    { text: "Hi! I'm VPai, your campus companion. What's on your mind?", sender: 'AI' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { text: userMsg, sender: 'USER' }]);
    setInput('');
    setIsTyping(true);

    try {
      const aiResponse = await askVPai(userMsg, data);
      setMessages(prev => [...prev, { text: aiResponse || "I couldn't process that.", sender: 'AI' }]);
    } catch (e) {
      setMessages(prev => [...prev, { text: "Connection issues! Please try again in a bit.", sender: 'AI' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[78vh] animate-fadeIn">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm active:scale-90 transition-all">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="flex flex-col">
          <h2 className="text-xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent leading-none">VPai Assistant</h2>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Always Online</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 pb-6 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'USER' ? 'justify-end' : 'justify-start'} animate-slideUp`}>
            <div className={`max-w-[85%] p-4 rounded-3xl ${
              m.sender === 'USER' 
                ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-500/10' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-800 rounded-bl-none'
            }`}>
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl rounded-bl-none shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex gap-1.5 px-2">
                <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="w-16 h-16 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-500/20 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all active:scale-90"
        >
          <i className="fa-solid fa-paper-plane text-xl"></i>
        </button>
      </div>
    </div>
  );
};

export default VPai;
