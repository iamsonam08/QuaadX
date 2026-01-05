
import React, { useState, useRef } from 'react';
import { AppData } from '../../types';
import { db, storage } from '../../firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Logo from '../Logo';

type AdminCategory = 'TIMETABLE' | 'SCHOLARSHIP' | 'EVENT' | 'EXAM' | 'INTERNSHIP' | 'ATTENDANCE' | 'CAMPUS_MAP';

const CATEGORY_MAP: Record<string, { label: string, icon: string, color: string, coll: string }> = {
  TIMETABLE: { label: 'Timetable', icon: 'fa-calendar-week', color: 'text-indigo-400', coll: 'timetable' },
  ATTENDANCE: { label: 'Attendance', icon: 'fa-chart-pie', color: 'text-emerald-400', coll: 'attendance' },
  SCHOLARSHIP: { label: 'Scholarship', icon: 'fa-graduation-cap', color: 'text-amber-400', coll: 'scholarships' },
  EVENT: { label: 'Event Info', icon: 'fa-masks-theater', color: 'text-pink-400', coll: 'events' },
  EXAM: { label: 'Exam Info', icon: 'fa-file-signature', color: 'text-rose-400', coll: 'exams' },
  INTERNSHIP: { label: 'Internship', icon: 'fa-briefcase', color: 'text-cyan-400', coll: 'internships' },
  CAMPUS_MAP: { label: 'Campus Map', icon: 'fa-map-location-dot', color: 'text-lime-400', coll: 'campus_map' },
};

const AdminPanel: React.FC<{ appData: AppData, setAppData: any, onExit: () => void }> = ({ appData, onExit }) => {
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendToAIQueue = async (content: string, type: 'text' | 'file', extraData?: any) => {
    setIsProcessing(true);
    setStatusMsg('Broadcasting to AI Hub...');
    
    try {
      await addDoc(collection(db, 'processing_queue'), {
        content: type === 'text' ? content : null,
        fileUrl: type === 'file' ? content : null,
        mimeType: extraData?.mimeType || 'text/plain',
        fileName: extraData?.fileName || 'manual_entry',
        type,
        timestamp: serverTimestamp(),
        status: 'pending',
        uploadedBy: 'admin_portal'
      });
      setStatusMsg('AI Extraction Initiated ✅');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setStatusMsg('Upload Failed ❌');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMsg(`Uploading ${file.name}...`);

    try {
      const storageRef = ref(storage, `admin_uploads/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      await sendToAIQueue(downloadURL, 'file', { 
        mimeType: file.type, 
        fileName: file.name 
      });
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("File upload error:", error);
      setStatusMsg('File Upload Failed ❌');
      setIsProcessing(false);
    }
  };

  const deleteItem = async (coll: string, id: string) => {
    if (!confirm('Permanently delete this record?')) return;
    try {
      await deleteDoc(doc(db, coll, id));
      setStatusMsg('Item Removed');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (e) { alert('Delete failed'); }
  };

  const renderView = (catKey: AdminCategory) => {
    const cat = CATEGORY_MAP[catKey];
    const dataKey = cat.coll as keyof AppData;
    const items = (appData[dataKey] as any[]) || [];

    return (
      <div className="space-y-6 animate-fadeIn pb-20">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedCategory(null)} className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-blue-500 border border-slate-800 active:scale-90">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h3 className="text-lg font-black text-white uppercase">{cat.label} Management</h3>
          <div className="w-12"></div>
        </div>

        {/* Input Methods */}
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-6 space-y-6">
          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Method 1: Manual Text</label>
             <textarea 
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={`Paste ${cat.label} details here... AI will categorize it automatically.`}
              className="w-full h-32 bg-slate-800 rounded-3xl p-5 text-xs text-slate-200 outline-none border border-slate-700 focus:border-blue-500 no-scrollbar"
            />
            <button 
              onClick={() => { sendToAIQueue(manualText, 'text'); setManualText(''); }} 
              disabled={!manualText.trim() || isProcessing} 
              className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {isProcessing ? 'AI Processing...' : 'Process Text with AI'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-slate-900 text-[9px] font-black text-slate-600 uppercase">OR</span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Method 2: Upload Document</label>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="*/*"
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full py-8 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-slate-800/50 transition-all disabled:opacity-50"
            >
              <i className="fa-solid fa-cloud-arrow-up text-2xl text-blue-500"></i>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Any File</span>
              <span className="text-[8px] font-bold text-slate-600">AI will extract and sync automatically</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-6">
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Global Live Records ({items.length})</h4>
          </div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar pb-10">
            {items.map((item: any) => (
              <div key={item.id} className="bg-slate-900/50 p-5 rounded-[2.5rem] border border-slate-800 flex justify-between items-center group">
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-[11px] font-black text-slate-200 uppercase truncate">{item.subject || item.name || item.title || item.day}</span>
                  <span className="text-[8px] font-bold text-slate-600 uppercase mt-1">
                    {item.branch || 'General'} • {item.year || 'All'} {item.date ? `• ${item.date}` : ''}
                  </span>
                </div>
                <button onClick={() => deleteItem(cat.coll, item.id)} className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                  <i className="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-10 opacity-20">
                <p className="text-[10px] font-black uppercase">No records found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto">
      <header className="p-8 border-b border-slate-900 flex justify-between items-center bg-slate-950 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Logo className="w-12 h-12" />
          <h1 className="text-xl font-black text-blue-500 tracking-tighter uppercase leading-none">Admin Command</h1>
        </div>
        <button onClick={onExit} className="bg-slate-900 w-11 h-11 rounded-2xl flex items-center justify-center text-rose-500 border border-slate-800"><i className="fa-solid fa-xmark"></i></button>
      </header>
      
      <main className="flex-1 p-8 overflow-y-auto no-scrollbar pb-32">
        {selectedCategory ? renderView(selectedCategory) : (
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(CATEGORY_MAP) as AdminCategory[]).map(key => (
              <button key={key} onClick={() => setSelectedCategory(key)} className="bg-slate-900/40 border border-slate-800 p-8 rounded-[3rem] flex flex-col items-center justify-center group active:scale-95 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                  <i className={`fa-solid ${CATEGORY_MAP[key].icon} text-xl ${CATEGORY_MAP[key].color}`}></i>
                </div>
                <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-white">{CATEGORY_MAP[key].label}</span>
              </button>
            ))}
          </div>
        )}
      </main>
      
      {statusMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-8 py-4 rounded-full font-black text-[10px] uppercase shadow-2xl z-[100] animate-bounce">
          {statusMsg}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
