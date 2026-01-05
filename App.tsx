import React, { useState, useEffect, useRef } from 'react';
import { AppData, ModuleType } from './types';
import { INITIAL_DATA } from './constants';
import { PersistenceService } from './services/persistenceService';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const logoTaps = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  // Initial Data Load & Global Sync Polling
  useEffect(() => {
    const syncData = async (silent = false) => {
      if (!silent) setIsLoading(true);
      const data = await PersistenceService.loadData();
      if (data) setAppData(data);
      if (!silent) setIsLoading(false);
    };

    syncData();

    // Background Polling: Refresh every 15 seconds to catch global admin updates
    const pollInterval = setInterval(() => syncData(true), 15000);

    const handleCloudSync = (event: any) => {
      if (event.detail) setAppData(event.detail);
    };
    window.addEventListener('quadx_cloud_sync', handleCloudSync);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('quadx_cloud_sync', handleCloudSync);
    };
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
      alert('Incorrect Password');
    }
  };

  const updateAppDataAndSync = async (newData: AppData) => {
    setAppData(newData);
    await PersistenceService.saveData(newData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Logo className="w-24 h-24 mb-4 animate-pulse" />
        <p className="text-blue-500 font-black tracking-widest text-[10px] uppercase">Connecting to Campus Cloud Hub...</p>
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
    <div className={`min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
      {currentModule === 'DASHBOARD' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-1/2 -right-24 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        </div>
      )}

      <header className="p-6 pb-2 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div onClick={handleLogoClick} className="cursor-pointer select-none group flex items-center gap-2">
            <Logo className="w-16 h-16 transition-transform duration-500 group-hover:scale-110 active:scale-95" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent tracking-tighter leading-none">QUADX</h1>
              <span className="text-[8px] font-bold text-slate-400 tracking-[0.3em] uppercase opacity-60">Global Cloud Sync</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all active:scale-90"
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun text-amber-400' : 'fa-moon text-indigo-400'} text-lg`}></i>
            </button>
          </div>
        </div>

        {currentModule === 'DASHBOARD' && (
          <div className="mb-6 animate-fadeIn px-2">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">QuadX Campus ⚡</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium italic">Synced with College Base.</p>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 pb-10 relative z-10 overflow-y-auto no-scrollbar">
        {currentModule === 'DASHBOARD' ? (
          <div className="grid grid-cols-2 gap-5 animate-slideUp">
            <FeatureCard title="VPai Assistant" icon="fa-robot" gradient="from-violet-600 to-fuchsia-600" onClick={() => setCurrentModule('VPAI')} className="col-span-2 py-10" desc="Talk to the database" />
            <FeatureCard title="Attendance" icon="fa-chart-pie" gradient="from-emerald-400 to-teal-600" onClick={() => setCurrentModule('ATTENDANCE')} desc="Live progress" />
            <FeatureCard title="Timetable" icon="fa-calendar-week" gradient="from-blue-400 to-indigo-600" onClick={() => setCurrentModule('TIMETABLE')} desc="Class schedules" />
            <FeatureCard title="Scholarship" icon="fa-graduation-cap" gradient="from-amber-400 to-orange-500" onClick={() => setCurrentModule('SCHOLARSHIP')} desc="Financial aid" />
            <FeatureCard title="Events" icon="fa-masks-theater" gradient="from-pink-500 to-rose-500" onClick={() => setCurrentModule('EVENT_INFO')} desc="What's happening" />
            <FeatureCard title="Exam Info" icon="fa-file-signature" gradient="from-red-500 to-orange-600" onClick={() => setCurrentModule('EXAM_INFO')} desc="Finals prep" />
            <FeatureCard title="Complaints" icon="fa-box-archive" gradient="from-slate-600 to-slate-800" onClick={() => setCurrentModule('COMPLAINT_BOX')} desc="Report issues" />
            <FeatureCard title="Internship" icon="fa-briefcase" gradient="from-cyan-400 to-blue-500" onClick={() => setCurrentModule('INTERNSHIP')} desc="Career goals" />
            <FeatureCard title="Campus Map" icon="fa-map-location-dot" gradient="from-lime-400 to-green-600" onClick={() => setCurrentModule('CAMPUS_MAP')} desc="Find your way" />
          </div>
        ) : (
          <div className="animate-fadeIn h-full">
            {renderModule()}
          </div>
        )}
      </main>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full p-10 shadow-2xl animate-scaleIn border border-slate-100 dark:border-slate-800">
            <Logo className="w-24 h-24 mb-6 mx-auto" />
            <h3 className="text-2xl font-black mb-2 text-center text-slate-800 dark:text-white uppercase tracking-tighter">Admin Access</h3>
            <form onSubmit={handleAdminLogin}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 mb-6 text-center text-2xl text-slate-800 dark:text-white" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold">Verify</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;