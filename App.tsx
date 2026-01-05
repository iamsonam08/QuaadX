
import React, { useState, useEffect, useRef } from 'react';
import { AppData, ModuleType, Announcement } from './types';
import { INITIAL_DATA } from './constants';
import { PersistenceService } from './services/persistenceService';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import FeatureCard from './components/FeatureCard';
import VPai from './components/Modules/VPai';
import Attendance from './components/Modules/Attendance';
import Timetable from './components/Modules/Timetable';
import ExamInfo from './components/Modules/ExamInfo';
import Scholarship from './components/Modules/Scholarship';
import EventInfo from './components/Modules/EventInfo';
import ComplaintBox from './components/Modules/ComplaintBox';
import Internship from './components/Modules/Internship';
import CampusMap from './components/Modules/CampusMap';
import AdminPanel from './components/Admin/AdminPanel';
import Logo from './components/Logo';

const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<ModuleType>('DASHBOARD');
  const [appData, setAppData] = useState<AppData>(INITIAL_DATA);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const logoTaps = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  // Initial Data Load & Global Sync Polling
  useEffect(() => {
    const syncData = async (silent = false) => {
      if (!silent) setIsLoading(true);
      setIsSyncing(true);
      const data = await PersistenceService.loadData();
      if (data) setAppData(data);
      if (!silent) setIsLoading(false);
      setTimeout(() => setIsSyncing(false), 1000);
    };

    syncData();

    // Background Polling: Refresh every 20 seconds to catch global admin updates
    const pollInterval = setInterval(() => syncData(true), 20000);

    const handleCloudSync = (event: any) => {
      if (event.detail) setAppData(event.detail);
    };
    window.addEventListener('quadx_cloud_sync', handleCloudSync);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('quadx_cloud_sync', handleCloudSync);
    };
  }, []);

  // Firestore Real-time Announcements Listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const announcementData: Announcement[] = [];
        querySnapshot.forEach((doc) => {
          announcementData.push({ id: doc.id, ...doc.data() } as Announcement);
        });
        setAnnouncements(announcementData);
      }, (error) => {
        console.warn("Firestore Listener Error:", error);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Firestore setup error:", error);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - logoTaps.current.lastTime < 1000) {
      logoTaps.current.count += 1;
    } else {
      logoTaps.current.count = 1;
    }
    logoTaps.current.lastTime = now;

    if (logoTaps.current.count === 3) {
      setShowAdminLogin(true);
      logoTaps.current.count = 0;
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'VP@123') {
      setIsAdminMode(true);
      setShowAdminLogin(false);
      setPassword('');
    } else {
      alert('Access Denied');
    }
  };

  const updateAppDataAndSync = async (newData: AppData) => {
    setAppData(newData);
    await PersistenceService.saveData(newData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Logo className="w-32 h-32 mb-8 animate-pulse" />
        <div className="space-y-2">
          <p className="text-blue-500 font-black tracking-[0.4em] text-[10px] uppercase animate-pulse">Initializing QuadX Core</p>
          <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-blue-500 animate-[loading_2s_infinite]"></div>
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  if (isAdminMode) {
    return <AdminPanel appData={appData} setAppData={updateAppDataAndSync} onExit={() => setIsAdminMode(false)} />;
  }

  const renderModule = () => {
    switch (currentModule) {
      case 'VPAI': return <VPai data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'ATTENDANCE': return <Attendance data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'TIMETABLE': return <Timetable data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'EXAM_INFO': return <ExamInfo data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'SCHOLARSHIP': return <Scholarship data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'EVENT_INFO': return <EventInfo data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'COMPLAINT_BOX': return <ComplaintBox setAppData={async (fn) => {
        const newData = typeof fn === 'function' ? fn(appData) : fn;
        setAppData(newData);
        await PersistenceService.saveData(newData);
      }} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'INTERNSHIP': return <Internship data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'CAMPUS_MAP': return <CampusMap data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col max-w-md mx-auto relative shadow-[0_0_100px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-1000 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Immersive Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] animate-blob transition-colors duration-1000 ${isDarkMode ? 'bg-blue-600/10' : 'bg-blue-400/10'}`}></div>
        <div className={`absolute top-1/2 -right-32 w-96 h-96 rounded-full blur-[120px] animate-blob animation-delay-2000 transition-colors duration-1000 ${isDarkMode ? 'bg-purple-600/10' : 'bg-purple-400/10'}`}></div>
        <div className={`absolute -bottom-32 left-1/4 w-64 h-64 rounded-full blur-[80px] animate-blob animation-delay-4000 transition-colors duration-1000 ${isDarkMode ? 'bg-emerald-600/10' : 'bg-emerald-400/10'}`}></div>
      </div>

      <header className="p-6 pb-2 relative z-20">
        <div className="flex justify-between items-center mb-6">
          <div onClick={handleLogoClick} className="cursor-pointer select-none group flex items-center gap-3">
            <Logo className="w-14 h-14 transition-all duration-700 group-hover:scale-110 active:scale-90" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent tracking-tighter leading-none">QUADX</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`}></div>
                <span className="text-[8px] font-bold text-slate-400 tracking-[0.2em] uppercase opacity-70">
                  {isSyncing ? 'Syncing Base...' : 'Global Cloud Active'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.05)] flex items-center justify-center text-slate-400 hover:text-blue-600 border border-white dark:border-slate-800 transition-all active:scale-90"
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun text-amber-400' : 'fa-moon text-indigo-400'} text-lg`}></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 relative z-20 overflow-y-auto no-scrollbar">
        {currentModule === 'DASHBOARD' ? (
          <div className="flex flex-col gap-6">
            
            {/* Real-time Announcements Display - ABSOLUTE TOP */}
            <div className="animate-slideUp px-2 pt-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  📢 Announcements (Live)
                </h3>
                <div className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Global Broadcast</span>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {announcements.length > 0 ? (
                  announcements.map((ann, idx) => (
                    <div 
                      key={ann.id} 
                      className="bg-white dark:bg-slate-900 border-2 border-indigo-500/10 dark:border-indigo-400/5 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all hover:scale-[1.01] hover:border-indigo-500/30"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    >
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
                      <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 uppercase mb-2 leading-tight flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                        {ann.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed pl-3.5">
                        {ann.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-100/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 p-10 rounded-[2.5rem] text-center">
                    <i className="fa-solid fa-satellite-dish text-3xl text-slate-200 dark:text-slate-700 mb-3 animate-pulse"></i>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scanning Campus Network...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dashboard Welcome Section */}
            <div className="mb-2 animate-fadeIn px-2">
              <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">Campus<br/>Intelligence ⚡</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium italic text-sm mt-1">Personalized portal for the digital student.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 animate-slideUp">
              <FeatureCard title="VPai Assistant" icon="fa-robot" gradient="from-violet-600 to-fuchsia-700" onClick={() => setCurrentModule('VPAI')} className="col-span-2 py-12" desc="Smart Knowledge Interface" />
              <FeatureCard title="Attendance" icon="fa-chart-pie" gradient="from-emerald-400 to-teal-600" onClick={() => setCurrentModule('ATTENDANCE')} desc="Live Progress" />
              <FeatureCard title="Timetable" icon="fa-calendar-week" gradient="from-blue-400 to-indigo-600" onClick={() => setCurrentModule('TIMETABLE')} desc="Class Schedules" />
              <FeatureCard title="Scholarship" icon="fa-graduation-cap" gradient="from-amber-400 to-orange-500" onClick={() => setCurrentModule('SCHOLARSHIP')} desc="Financial Aid" />
              <FeatureCard title="Events" icon="fa-masks-theater" gradient="from-pink-500 to-rose-500" onClick={() => setCurrentModule('EVENT_INFO')} desc="Campus Life" />
              <FeatureCard title="Exam Info" icon="fa-file-signature" gradient="from-red-500 to-orange-600" onClick={() => setCurrentModule('EXAM_INFO')} desc="Academic Hub" />
              <FeatureCard title="Complaints" icon="fa-box-archive" gradient="from-slate-600 to-slate-800" onClick={() => setCurrentModule('COMPLAINT_BOX')} desc="Anonymous Feedback" />
              <FeatureCard title="Internship" icon="fa-briefcase" gradient="from-cyan-400 to-blue-500" onClick={() => setCurrentModule('INTERNSHIP')} desc="Career Pathway" />
              <FeatureCard title="Campus Map" icon="fa-map-location-dot" gradient="from-lime-400 to-green-600" onClick={() => setCurrentModule('CAMPUS_MAP')} desc="Navigator Pro" />
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn h-full">
            {renderModule()}
          </div>
        )}
      </main>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full p-10 shadow-2xl animate-scaleIn border border-slate-100 dark:border-slate-800">
            <Logo className="w-20 h-20 mb-6 mx-auto" />
            <h3 className="text-2xl font-black mb-1 text-center text-slate-800 dark:text-white uppercase tracking-tighter">Admin Access</h3>
            <p className="text-slate-400 text-center text-[10px] font-black uppercase tracking-widest mb-8">Authorised Personnel Only</p>
            <form onSubmit={handleAdminLogin}>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 mb-6 text-center text-2xl text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                autoFocus 
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20">Verify</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite alternate;
        }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default App;
