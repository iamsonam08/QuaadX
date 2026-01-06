import React, { useState, useRef } from 'react';
import { AppData } from '../../types';
import { extractCategoryData, stylizeMapImage } from '../../services/geminiService';
import { PersistenceService } from '../../services/persistenceService';
import Logo from '../Logo';
import * as XLSX from 'xlsx';

interface AdminPanelProps {
  appData: AppData;
  setAppData: (data: AppData) => void;
  onExit: () => void;
}

type AdminCategory = 'TIMETABLE' | 'SCHOLARSHIP' | 'EVENT' | 'EXAM' | 'INTERNSHIP' | 'CAMPUS_MAP' | 'COMPLAINTS' | 'ATTENDANCE';

const CATEGORY_MAP: Record<string, { label: string, icon: string, color: string, dataKey?: keyof AppData }> = {
  TIMETABLE: { label: 'Timetable', icon: 'fa-calendar-week', color: 'text-indigo-400', dataKey: 'timetable' },
  ATTENDANCE: { label: 'Attendance', icon: 'fa-chart-pie', color: 'text-emerald-400', dataKey: 'attendance' },
  SCHOLARSHIP: { label: 'Scholarship', icon: 'fa-graduation-cap', color: 'text-amber-400', dataKey: 'scholarships' },
  EVENT: { label: 'Event Info', icon: 'fa-masks-theater', color: 'text-pink-400', dataKey: 'events' },
  EXAM: { label: 'Exam Info', icon: 'fa-file-signature', color: 'text-rose-400', dataKey: 'exams' },
  INTERNSHIP: { label: 'Internship', icon: 'fa-briefcase', color: 'text-cyan-400', dataKey: 'internships' },
  CAMPUS_MAP: { label: 'Campus Map', icon: 'fa-map-location-dot', color: 'text-lime-400' },
  COMPLAINTS: { label: 'Complaints', icon: 'fa-box-archive', color: 'text-slate-400', dataKey: 'complaints' },
};

const AdminPanel: React.FC<AdminPanelProps> = ({ appData, setAppData, onExit }) => {
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [manualText, setManualText] = useState('');
  const [inputMode, setInputMode] = useState<'FILE' | 'TEXT'>('FILE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncGlobalChanges = async (newData: AppData) => {
    setIsProcessing(true);
    setStatusMsg('SYNCING CLOUD...');
    
    const success = await PersistenceService.saveData(newData);
    
    if (success) {
      setAppData(newData);
      setStatusMsg('SYNC SUCCESS ✅');
    } else {
      setStatusMsg('SYNC FAILED ❌');
    }
    
    setIsProcessing(false);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCategory) return;

    setIsProcessing(true);
    setStatusMsg(`READING ${file.name.toUpperCase()}...`);

    const reader = new FileReader();
    const isSpreadsheet = /\.(xlsx|xls|csv)$/i.test(file.name);
    const isImage = file.type.startsWith('image/');

    reader.onload = async (event) => {
      try {
        let content = '';
        let mime = file.type || 'text/plain';

        if (selectedCategory === 'CAMPUS_MAP' && isImage) {
          const base64 = event.target?.result as string;
          setStatusMsg('AI MAP PROCESSING...');
          const stylized = await stylizeMapImage(base64);
          const updated: AppData = { 
            ...appData, 
            campusMapImage: base64, 
            stylizedMapImage: stylized || null 
          };
          await syncGlobalChanges(updated);
          return;
        }

        if (isSpreadsheet) {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          content = JSON.stringify(json, null, 2);
          mime = 'application/json';
        } else {
          content = event.target?.result as string;
        }

        await extractAndDeploy(content, mime);
      } catch (err) {
        console.error("Admin Error:", err);
        setStatusMsg('ERROR READING FILE');
        setIsProcessing(false);
      }
    };

    if (isSpreadsheet) reader.readAsArrayBuffer(file);
    else reader.readAsDataURL(file);
  };

  const handleManualTextSubmit = async () => {
    if (!manualText.trim() || !selectedCategory) return;
    setIsProcessing(true);
    setStatusMsg('AI EXTRACTING...');
    await extractAndDeploy(manualText, 'text/plain');
    setManualText('');
  };

  const extractAndDeploy = async (content: string, mime: string) => {
    try {
      if (!selectedCategory) return;
      const extracted = await extractCategoryData(selectedCategory, content, mime);
      
      if (extracted && extracted.length > 0) {
        const key = CATEGORY_MAP[selectedCategory].dataKey;
        if (key) {
          const currentList = Array.isArray(appData[key]) ? appData[key] as any[] : [];
          const updated = { 
            ...appData, 
            [key]: [...currentList, ...extracted] 
          };
          await syncGlobalChanges(updated);
        }
      } else {
        setStatusMsg('AI: NO DATA FOUND');
        setIsProcessing(false);
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (e) {
      console.error("Extraction Failed:", e);
      setStatusMsg('EXTRACTION ERROR');
      setIsProcessing(false);
    }
  };

  const deleteItem = async (category: AdminCategory, id: string) => {
    const key = CATEGORY_MAP[category].dataKey;
    if (!key) return;
    const currentList = Array.isArray(appData[key]) ? appData[key] as any[] : [];
    const updated = { ...appData, [key]: currentList.filter(i => i.id !== id) };
    await syncGlobalChanges(updated);
  };

  const clearSection = async (category: AdminCategory) => {
    const key = CATEGORY_MAP[category].dataKey;
    if (!key || !confirm(`Wipe all ${CATEGORY_MAP[category].label} data?`)) return;
    const updated = { ...appData, [key]: [] };
    await syncGlobalChanges(updated);
  };

  const renderView = (catKey: AdminCategory) => {
    const cat = CATEGORY_MAP[catKey];
    const items = cat.dataKey ? (Array.isArray(appData[cat.dataKey]) ? appData[cat.dataKey] as any[] : []) : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedCategory(null)} className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-blue-500 border border-slate-800 active:scale-90 transition-all">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h3 className="text-lg font-black text-white uppercase tracking-tighter">{cat.label}</h3>
          <button onClick={() => clearSection(catKey)} className="text-[10px] font-black text-rose-500 uppercase px-3 py-1 bg-rose-500/10 rounded-full hover:bg-rose-500 transition-all">Reset</button>
        </div>

        <div className="flex gap-2 p-1.5 bg-slate-900 rounded-3xl border border-slate-800">
          <button onClick={() => setInputMode('FILE')} className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${inputMode === 'FILE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Upload File</button>
          <button onClick={() => setInputMode('TEXT')} className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${inputMode === 'TEXT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Paste Text</button>
        </div>
        
        {inputMode === 'FILE' ? (
          <div className="bg-slate-900 border-4 border-slate-800 border-dashed rounded-[3.5rem] p-10 text-center group cursor-pointer hover:border-blue-600/50 transition-colors">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".txt,.xlsx,.xls,.csv,.pdf,image/*" />
            <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-3xl bg-blue-600/10 text-blue-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-cloud-arrow-up text-3xl"></i>
            </button>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Campus File</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-6 space-y-4 shadow-xl">
            <textarea 
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste spreadsheet data or announcements here..."
              className="w-full h-32 bg-slate-800 rounded-3xl p-5 text-xs text-slate-200 outline-none border border-slate-700 focus:border-blue-500 transition-all font-bold no-scrollbar"
            />
            <button onClick={handleManualTextSubmit} disabled={!manualText.trim() || isProcessing} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 disabled:opacity-50">Process with AI</button>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-slate-600 uppercase px-6 tracking-widest">Global Records ({items.length})</h4>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar pb-10">
            {items.length === 0 ? (
              <div className="p-12 border border-slate-900 rounded-[2.5rem] text-center text-[9px] text-slate-700 font-black uppercase tracking-[0.3em]">Database Empty</div>
            ) : (
              items.map((item: any) => (
                <div key={item.id} className="bg-slate-900/50 p-5 rounded-[2.5rem] border border-slate-800 flex justify-between items-center group hover:bg-slate-900 transition-colors">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-[11px] font-black text-slate-200 uppercase truncate">{item.subject || item.name || item.title || item.day}</span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase mt-1 tracking-widest">{item.branch} • {item.year}</span>
                  </div>
                  <button onClick={() => deleteItem(catKey, item.id)} className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex-shrink-0">
                    <i className="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto relative overflow-hidden">
      <header className="p-8 border-b border-slate-900 flex justify-between items-center bg-slate-950/90 backdrop-blur-3xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Logo className="w-12 h-12" />
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-blue-500 tracking-tighter uppercase leading-none">Admin Hub</h1>
            <span className="text-[9px] font-bold text-slate-600 uppercase mt-1">Cloud Controller</span>
          </div>
        </div>
        <button onClick={onExit} className="bg-slate-900 w-11 h-11 rounded-2xl flex items-center justify-center text-rose-500 border border-slate-800 active:scale-90 transition-all hover:bg-rose-500/10"><i className="fa-solid fa-xmark"></i></button>
      </header>
      
      <main className="flex-1 p-8 overflow-y-auto no-scrollbar pb-32">
        {selectedCategory ? renderView(selectedCategory) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
              <p className="text-blue-500 text-[9px] font-black uppercase tracking-[0.3em] mb-3">Cloud Status: Active</p>
              <h2 className="text-3xl font-black text-white tracking-tighter leading-tight">Campus Management</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(CATEGORY_MAP) as AdminCategory[]).map(key => (
                <button key={key} onClick={() => setSelectedCategory(key)} className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-[3rem] flex flex-col items-center justify-center group hover:bg-slate-900 transition-all active:scale-95 shadow-lg">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                    <i className={`fa-solid ${CATEGORY_MAP[key].icon} text-xl ${CATEGORY_MAP[key].color}`}></i>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 group-hover:text-white transition-colors">{CATEGORY_MAP[key].label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {statusMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl z-[100] animate-bounce text-center border-2 border-white/20">
          {statusMsg}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;