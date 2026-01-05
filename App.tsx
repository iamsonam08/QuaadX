
import React, { useState, useEffect, useRef } from 'react';
import { AppData, ModuleType, Announcement, AttendanceRecord, TimetableEntry, ExamSchedule, ScholarshipItem, CampusEvent, InternshipItem, Complaint } from './types';
import { INITIAL_DATA } from './constants';
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

  const logoTaps = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  // Global Real-time Firestore Listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Helper to setup a listener
    const setupListener = (collName: string, updateKey: keyof AppData) => {
      const q = query(collection(db, collName), orderBy("timestamp", "desc"));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAppData(prev => ({ ...prev, [updateKey]: items }));
        if (isLoading) setIsLoading(false);
      }, (err) => console.error(`Error in ${collName} listener:`, err));
    };

    // Initialize all listeners
    const unsubscribes = [
      setupListener('attendance', 'attendance'),
      setupListener('timetable', 'timetable'),
      setupListener('exams', 'exams'),
      setupListener('scholarships', 'scholarships'),
      setupListener('internships', 'internships'),
      setupListener('events', 'events'),
      setupListener('complaints', 'complaints'),
      
      // Announcements listener
      onSnapshot(query(collection(db, "announcements"), orderBy("timestamp", "desc")), (snapshot) => {
        setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
      })
    ];

    // Minimal delay to show loader for UX
    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - logoTaps.current.lastTime < 1000) logoTaps.current.count += 1;
    else logoTaps.current.count = 1;
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
    } else alert('Access Denied');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Logo className="w-32 h-32 mb-8 animate-pulse" />
        <p className="text-blue-500 font-black tracking-[0.4em] text-[10px] uppercase">Syncing Campus Data...</p>
      </div>
    );
  }

  if (isAdminMode) {
    return <AdminPanel appData={appData} setAppData={setAppData} onExit={() => setIsAdminMode(false)} />;
  }

  const renderModule = () => {
    switch (currentModule) {
      case 'VPAI': return <VPai data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'ATTENDANCE': return <Attendance data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'TIMETABLE': return <Timetable data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'EXAM_INFO': return <ExamInfo data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'SCHOLARSHIP': return <Scholarship data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'EVENT_INFO': return <EventInfo data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'COMPLAINT_BOX': return <ComplaintBox setAppData={async (data) => {}} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'INTERNSHIP': return <Internship data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      case 'CAMPUS_MAP': return <CampusMap data={appData} onBack={() => setCurrentModule('DASHBOARD')} />;
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden transition-all duration-1000 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] ${isDarkMode ? 'bg-blue-600/10' : 'bg-blue-400/10'}`}></div>
        <div className={`absolute -bottom-32 right-1/4 w-64 h-64 rounded-full blur-[80px] ${isDarkMode ? 'bg-emerald-600/10' : 'bg-emerald-400/10'}`}></div>
      </div>

      <header className="p-6 pb-2 relative z-20">
        <div className="flex justify-between items-center mb-6">
          <div onClick={handleLogoClick} className="cursor-pointer select-none group flex items-center gap-3">
            <Logo className="w-14 h-14 transition-all duration-700 group-hover:scale-110 active:scale-90" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent tracking-tighter leading-none">QUADX</h1>
              <span className="text-[8px] font-bold text-slate-400 tracking-[0.2em] uppercase opacity-70 mt-1">Global Base Active</span>
            </div>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-slate-400 transition-all active:scale-90">
            <i className={`fa-solid ${isDarkMode ? 'fa-sun text-amber-400' : 'fa-moon text-indigo-400'} text-lg`}></i>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 relative z-20 overflow-y-auto no-scrollbar">
        {currentModule === 'DASHBOARD' ? (
          <div className="flex flex-col gap-6">
            <div className="animate-slideUp px-2 pt-2">
              <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter mb-4 flex items-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative rounded-full h-3 w-3 bg-rose-500"></span></span>
                📢 Announcements (Live)
              </h3>
              <div className="flex flex-col gap-4">
                {announcements.length > 0 ? announcements.map((ann) => (
                  <div key={ann.id} className="bg-white dark:bg-slate-900 border-2 border-indigo-500/10 p-6 rounded-[2.5rem] shadow-sm">
                    <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 uppercase mb-2">{ann.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{ann.message}</p>
                  </div>
                )) : <div className="p-10 text-center opacity-30 text-[10px] font-bold uppercase">Scanning Network...</div>}
              </div>
            </div>

            <div className="mb-2 px-2"><h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">Campus Intelligence⚡</h2><p className="text-slate-500 italic text-sm mt-1">Digital portal for modern students.</p></div>

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
        ) : <div className="animate-fadeIn h-full">{renderModule()}</div>}
      </main>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-2xl font-black mb-1 text-center text-slate-800 dark:text-white uppercase">Admin Access</h3>
            <form onSubmit={handleAdminLogin} className="mt-8">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-3xl p-5 mb-6 text-center text-2xl outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm">Verify</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
