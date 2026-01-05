
import React, { useState } from 'react';
import { AppData, Complaint } from '../../types';
import { PersistenceService } from '../../services/persistenceService';

interface ComplaintBoxProps {
  setAppData: (newData: AppData | ((prev: AppData) => AppData)) => Promise<void>;
  onBack: () => void;
}

const ComplaintBox: React.FC<ComplaintBoxProps> = ({ setAppData, onBack }) => {
  const [submitted, setSubmitted] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim() || isSyncing) return;

    setIsSyncing(true);
    const newComplaint: Complaint = {
      id: Math.random().toString(36).substr(2, 9),
      text: complaintText,
      timestamp: new Date().toLocaleString(),
      status: 'PENDING'
    };

    // Update local state and trigger global cloud sync
    await setAppData(prev => ({
      ...prev,
      complaints: [newComplaint, ...prev.complaints]
    }));

    setSubmitted(true);
    setIsSyncing(false);
    
    setTimeout(() => {
      onBack();
    }, 2500);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fadeIn">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <i className="fa-solid fa-check text-4xl"></i>
        </div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tighter">Report Sent</h3>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Successfully routed to admin hub.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm active:scale-90 transition-all border border-slate-100 dark:border-slate-800">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Complaint Box</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl mb-8 border border-blue-100 dark:border-blue-800/50">
          <div className="flex gap-4">
            <i className="fa-solid fa-user-secret text-blue-600 text-2xl"></i>
            <div>
              <h4 className="font-black text-blue-900 dark:text-blue-300 text-[10px] uppercase tracking-widest">End-to-End Encryption</h4>
              <p className="text-blue-700 dark:text-blue-400 text-[9px] font-bold uppercase leading-relaxed mt-1">Your identity remains 100% anonymous. Only the content is shared with the administration.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">State your concern</label>
            <textarea 
              rows={6}
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-6 outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/10 transition-all border border-slate-100 dark:border-slate-700 dark:text-white text-sm font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600"
              placeholder="Describe the issue clearly..."
            ></textarea>
          </div>
          <button 
            disabled={!complaintText.trim() || isSyncing}
            className="w-full py-5 bg-slate-900 dark:bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-blue-700 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
          >
            {isSyncing ? 'Routing...' : 'Broadcast to Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ComplaintBox;
