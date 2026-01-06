import React, { useState, useRef } from 'react';
import { AppData, Complaint } from '../../types';
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
  CAMPUS_MAP: { label: 'Campus Map', icon: 'fa-map-location-dot', color: 'text-lime-400', dataKey: 'rawKnowledge' },
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
    setStatusMsg('CLOUD PUSH...');
    
    const success = await PersistenceService.saveData(newData);
    
    if (success) {
      setAppData(newData);
      setStatusMsg('SYNCED ✅');
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
          setStatusMsg('UPLOADING TO STORAGE...');
          
          // Fix for large image error: Upload to Firebase Storage instead of Firestore
          const originalUrl = await PersistenceService.uploadImage(base64, `campus_maps/original_${Date.now()}`);
          
          if (!originalUrl) {
            setStatusMsg('UPLOAD FAILED');
            setIsProcessing(false);
            return;
          }

          setStatusMsg('AI STYLIZING...');
          const stylizedBase64 = await stylizeMapImage(base64);
          let stylizedUrl = null;
          
          if (stylizedBase64) {
             stylizedUrl = await PersistenceService.uploadImage(stylizedBase64, `campus_maps/stylized_${Date.now()}`);
          }

          const updated: AppData = { 
            ...appData, 
            campusMapImage: originalUrl, 
            stylizedMapImage: stylizedUrl || null 
          };
          await syncGlobalChanges(updated);
          return;
        }

        if (isSpreadsheet) {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          
          const headers = jsonRows[0] || [];
          content = jsonRows.slice(1)
            .filter(row => row.length > 0)
            .map(row => row.map((val, i) => `${headers[i] || `Col${i+1}`}: ${val}`).join(' | '))
            .join('\n');
            
          mime = 'text/plain';
        } else {
          content = event.target?.result as string;
        }

        await extractAndDeploy(content, mime);
      } catch (err) {
        console.error("Admin Error:", err);
        setStatusMsg('FILE ERROR');
        setIsProcessing(false);
      }
    };

    if (isSpreadsheet) reader.readAsArrayBuffer(file);
    else if (isImage && selectedCategory === 'CAMPUS_MAP') reader.readAsDataURL(file);
    else reader.readAsText(file);
  };

  const handleManualTextSubmit = async () => {
    if (!manualText.trim() || !selectedCategory) return;
    setIsProcessing(true);
    setStatusMsg('AI PROCESSING...');
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
          if (selectedCategory === 'CAMPUS_MAP') {
             const infoString = extracted.map(i => i.info).join('\n');
             const updated = { ...appData, rawKnowledge: [...appData.rawKnowledge, infoString] };
             await syncGlobalChanges(updated);
          } else {
            const currentList = Array.isArray(appData[key]) ? appData[key] as any[] : [];
            const updated = { ...appData, [key]: [...currentList, ...extracted] };
            await syncGlobalChanges(updated);
          }
        }
      } else {
        setStatusMsg('AI: NO DATA FOUND');
        setIsProcessing(false);
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (e) {
      console.error("AI Failed:", e);
      setStatusMsg('AI ERROR');
      setIsProcessing(false);
    }
  };

  const deleteItem = async (category: AdminCategory, id: string) => {
    const key = CATEGORY_MAP[category].dataKey;
    if (!key) return;
    const currentList = (appData[key] as any[]).filter(i => i.id !== id);
    const updated = { ...appData, [key]: currentList };
    await syncGlobalChanges(updated);
  };

  const toggleComplaintStatus = async (id: string) => {
    const updatedComplaints = appData.complaints.map(c => 
      c.id === id ? { ...c, status: c.status === 'PENDING' ? 'RESOLVED' : 'PENDING' } : c
    );
    const updated = { ...appData, complaints: updatedComplaints as Complaint[] };
    await syncGlobalChanges(updated);
  };

  const clearSection = async (category: AdminCategory) => {
    if (category === 'CAMPUS_MAP') {
      if (!confirm(`Remove Campus Map and Knowledge?`)) return;
      const updated = { ...appData, campusMapImage: null, stylizedMapImage: null, rawKnowledge: [] };
      await syncGlobalChanges(updated);
      return;
    }
    const key = CATEGORY_MAP[category].dataKey;
    if (!key || !confirm(`Wipe all ${CATEGORY_MAP[category].label}?`)) return;
    const updated = { ...appData, [key]: [] };
    await syncGlobalChanges(updated);
  };

  const renderView = (catKey: AdminCategory) => {
    const cat = CATEGORY_MAP[catKey];
    
    // Custom View for Complaints
    if (catKey === 'COMPLAINTS') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedCategory(null)} className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-blue-500 border border-slate-800 active:scale-90 transition-all">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Student Reports</h3>
            <button onClick={() => clearSection('COMPLAINTS')} className="text-[10px] font-black text-rose-500 uppercase px-3 py-1 bg-rose-500/10 rounded-full hover:bg-rose-500 transition-all">Clear All</button>
          </div>

          <div className="space-y-4">
            {appData.complaints.length === 0 ? (
              <div className="bg-slate-900/50 p-16 rounded-[3rem] text-center border border-slate-800">
                <i className="fa-solid fa-check-double text-4xl text-emerald-500/30 mb-4"></i>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inbox is empty. No complaints pending.</p>
              </div>
            ) : (
              appData.complaints.map((c, i) => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] space-y-4 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${c.status === 'PENDING' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${c.status === 'PENDING' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {c.status}
                      </span>
                    </div>
                    <span className="text-[8px] font-bold text-slate-600 uppercase">{c.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-200 font-bold leading-relaxed bg-slate-950/50 p-5 rounded-3xl border border-slate-800/50">
                    {c.text}
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleComplaintStatus(c.id)}
                      className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        c.status === 'PENDING' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.status === 'PENDING' ? 'Mark Resolved' : 'Re-open Issue'}
                    </button>
                    <button 
                      onClick={() => deleteItem('COMPLAINTS', c.id)}
                      className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    const items = cat.dataKey ? (Array.isArray(appData[cat.dataKey]) ? appData[cat.dataKey] as any[] : []) : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedCategory(null)} className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-blue-500 border border-slate-800 active:scale-90 transition-all">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h3 className="text-lg font-black text-white uppercase tracking-tighter">{cat.label}</h3>
          <button onClick={() => clearSection(catKey)} className="text-[10px] font-black text-rose-500 uppercase px-3 py-1 bg-rose-500/10 rounded-full hover:bg-rose-500 transition-all">Wipe Hub</button>
        </div>

        <div className="flex gap-2 p-1.5 bg-slate-900 rounded-3xl border border-slate-800">
          <button onClick={() => setInputMode('FILE')} className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${inputMode === 'FILE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Upload File</button>
          <button onClick={() => setInputMode('TEXT')} className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${inputMode === 'TEXT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Paste Text</button>
        </div>
        
        {inputMode === 'FILE' ? (
          <div className="bg-slate-900 border-4 border-slate-800 border-dashed rounded-[3.5rem] p-10 text-center group cursor-pointer hover:border-blue-600/50 transition-colors">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
              accept={catKey === 'CAMPUS_MAP' ? "image/*,.txt,.xlsx,.xls,.csv" : ".txt,.xlsx,.xls,.csv"} 
            />
            <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-3xl bg-blue-600/10 text-blue-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <i className={`fa-solid ${catKey === 'CAMPUS_MAP' ? 'fa-image' : 'fa-cloud-arrow-up'} text-3xl`}></i>
            </button>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {catKey === 'CAMPUS_MAP' ? 'Select Map Image/File' : 'Select Source File'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-6 space-y-4 shadow-xl">
            <textarea 
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={catKey === 'CAMPUS_MAP' ? "Enter map notes or details here..." : "Paste schedule data or student lists here..."}
              className="w-full h-32 bg-slate-800 rounded-3xl p-5 text-xs text-slate-200 outline-none border border-slate-700 focus:border-blue-500 transition-all font-bold no-scrollbar"
            />
            <button 
              onClick={handleManualTextSubmit} 
              disabled={!manualText.trim() || isProcessing} 
              className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 disabled:opacity-50"
            >
              {catKey === 'CAMPUS_MAP' ? 'Save Map Notes' : 'Extract with AI'}
            </button>
          </div>
        )}

        {catKey === 'CAMPUS_MAP' && (
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-600 uppercase px-6 tracking-widest">Map Previews</h4>
            <div className="grid grid-cols-2 gap-4 px-2">
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-600 uppercase">Original Exact</span>
                <div className="aspect-square bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center">
                  {appData.campusMapImage ? (
                    <img src={appData.campusMapImage} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-image text-slate-800"></i>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-600 uppercase">AI Stylized</span>
                <div className="aspect-square bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center">
                  {appData.stylizedMapImage ? (
                    <img src={appData.stylizedMapImage} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-wand-magic-sparkles text-slate-800"></i>
                  )}
                </div>
              </div>
            </div>
            {appData.rawKnowledge.length > 0 && (
              <div className="mt-4 p-4 bg-slate-900/50 rounded-3xl border border-slate-800">
                <h5 className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Text Knowledge Base</h5>
                <div className="max-h-24 overflow-y-auto no-scrollbar text-[9px] text-slate-400 font-bold uppercase leading-relaxed">
                  {appData.rawKnowledge.map((k, idx) => (
                    <p key={idx} className="mb-2 pb-2 border-b border-slate-800/50 last:border-0">{k}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {catKey !== 'CAMPUS_MAP' && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-600 uppercase px-6 tracking-widest">Cloud Database ({items.length})</h4>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar pb-10">
              {items.length === 0 ? (
                <div className="p-12 border border-slate-900 rounded-[2.5rem] text-center text-[9px] text-slate-700 font-black uppercase tracking-[0.3em]">No Records Found</div>
              ) : (
                items.map((item: any) => (
                  <div key={item.id} className="bg-slate-900/50 p-5 rounded-[2.5rem] border border-slate-800 flex justify-between items-center group hover:bg-slate-900 transition-colors">
                    <div className="flex flex-col min-w-0 pr-4">
                      <span className="text-[11px] font-black text-slate-200 uppercase truncate">{item.subject || item.name || item.title || item.day}</span>
                      <span className="text-[8px] font-bold text-slate-600 uppercase mt-1 tracking-widest">{item.branch || 'Global'} • {item.year || 'All'}</span>
                    </div>
                    <button onClick={() => deleteItem(catKey, item.id)} className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex-shrink-0">
                      <i className="fa-solid fa-trash text-xs"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
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
            <span className="text-[9px] font-bold text-slate-600 uppercase mt-1">Cloud Sync Active</span>
          </div>
        </div>
        <button onClick={onExit} className="bg-slate-900 w-11 h-11 rounded-2xl flex items-center justify-center text-rose-500 border border-slate-800 active:scale-90 transition-all hover:bg-rose-500/10"><i className="fa-solid fa-xmark"></i></button>
      </header>
      
      <main className="flex-1 p-8 overflow-y-auto no-scrollbar pb-32">
        {selectedCategory ? renderView(selectedCategory) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
              <p className="text-blue-500 text-[9px] font-black uppercase tracking-[0.3em] mb-3">System Ready</p>
              <h2 className="text-3xl font-black text-white tracking-tighter leading-tight">Master Database</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(CATEGORY_MAP) as AdminCategory[]).map(key => (
                <button key={key} onClick={() => setSelectedCategory(key)} className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-[3rem] flex flex-col items-center justify-center group hover:bg-slate-900 transition-all active:scale-95 shadow-lg relative">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                    <i className={`fa-solid ${CATEGORY_MAP[key].icon} text-xl ${CATEGORY_MAP[key].color}`}></i>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 group-hover:text-white transition-colors">{CATEGORY_MAP[key].label}</span>
                  
                  {key === 'COMPLAINTS' && appData.complaints.filter(c => c.status === 'PENDING').length > 0 && (
                    <div className="absolute top-4 right-4 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[8px] font-black text-white animate-pulse">
                      {appData.complaints.filter(c => c.status === 'PENDING').length}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {statusMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl z-[100] animate-bounce text-center border-2 border-white/20 whitespace-nowrap">
          {statusMsg}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;