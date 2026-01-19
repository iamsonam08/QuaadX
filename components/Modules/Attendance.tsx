import React, { useState, useMemo } from 'react';
import { AppData, AttendanceRecord } from '../../types';

interface AttendanceProps {
  data: AppData;
  onBack: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ data, onBack }) => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Validate credentials against the data pool
  const studentRecords = useMemo(() => {
    if (!isLoggedIn) return [];
    return data.attendance.filter(a => a.studentId === studentId);
  }, [data.attendance, studentId, isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (data.attendance.length === 0) {
      setLoginError('No attendance records available in the system yet.');
      return;
    }

    const match = data.attendance.find(
      a => a.studentId.trim() === studentId.trim() && a.password === password
    );

    if (match) {
      setIsLoggedIn(true);
    } else {
      setLoginError('Invalid Student ID or Password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setStudentId('');
    setPassword('');
  };

  // Calculations
  const stats = useMemo(() => {
    if (studentRecords.length === 0) return null;

    let totalAttended = 0;
    let totalConducted = 0;

    studentRecords.forEach(r => {
      totalAttended += (r.theoryAttended + r.labAttended);
      totalConducted += (r.theoryTotal + r.labTotal);
    });

    const percentage = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 0;
    
    // 75% eligibility calculation
    // ceil((0.75 * total_classes) - classes_attended)
    const requiredTotal = Math.ceil(0.75 * totalConducted);
    const classesNeeded = Math.max(0, requiredTotal - totalAttended);

    return {
      percentage: Math.round(percentage),
      totalAttended,
      totalConducted,
      classesNeeded,
      isSafe: percentage >= 75
    };
  }, [studentRecords]);

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col h-[75vh] items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
            <i className="fa-solid fa-user-lock text-3xl"></i>
          </div>
          <h2 className="text-2xl font-black text-center text-slate-800 dark:text-white mb-2 uppercase tracking-tighter">Student Login</h2>
          <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">Attendance Portal Access</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Student ID</label>
              <input 
                type="text" 
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter ID (e.g. CS101)"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                required
              />
            </div>
            {loginError && (
              <p className="text-rose-500 text-[10px] font-black text-center uppercase animate-pulse">{loginError}</p>
            )}
            <button 
              type="submit"
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all mt-4"
            >
              Verify & View
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="w-full py-4 text-slate-400 font-bold text-xs uppercase hover:text-slate-600 transition-all"
            >
              Back to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 active:scale-90 transition-all">
            <i className="fa-solid fa-right-from-bracket text-rose-500"></i>
          </button>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-emerald-600 tracking-tighter leading-none">Attendance</h2>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {studentId}</span>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${stats?.isSafe ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-rose-100 text-rose-600 border border-rose-200'}`}>
          {stats?.isSafe ? 'Eligible' : 'Low Attendance'}
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-2xl border-4 border-emerald-50 dark:border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none transform translate-x-1/4 -translate-y-1/4 group-hover:scale-150 transition-transform duration-1000">
           <i className="fa-solid fa-chart-line text-[120px]"></i>
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100 dark:text-slate-800" />
              <circle 
                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" 
                strokeDasharray={364.4}
                strokeDashoffset={364.4 - (364.4 * (stats?.percentage || 0)) / 100}
                className={`transition-all duration-1000 ease-out ${stats?.isSafe ? 'text-emerald-500' : 'text-rose-500'}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black text-slate-800 dark:text-white">{stats?.percentage}%</span>
            </div>
          </div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Overall Engagement</h3>
          
          <div className="grid grid-cols-2 gap-4 w-full border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Attended</p>
              <p className="text-xl font-black text-slate-800 dark:text-white">{stats?.totalAttended}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Conducted</p>
              <p className="text-xl font-black text-slate-800 dark:text-white">{stats?.totalConducted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Requirement Notice */}
      {!stats?.isSafe && stats?.classesNeeded !== undefined && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-100 dark:border-rose-900/50 p-6 rounded-[2.5rem] animate-pulse">
          <h4 className="text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation"></i> Critical Alert
          </h4>
          <p className="text-rose-800 dark:text-rose-300 text-[11px] font-bold leading-relaxed">
            You need to attend <span className="text-rose-600 dark:text-rose-400 font-black underline underline-offset-4">{stats.classesNeeded} more classes</span> to reach the mandatory 75% attendance threshold.
          </p>
        </div>
      )}

      {stats?.isSafe && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-900/50 p-6 rounded-[2.5rem]">
           <h4 className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
            <i className="fa-solid fa-shield-check"></i> Status: Safe
          </h4>
          <p className="text-emerald-800 dark:text-emerald-300 text-[11px] font-bold leading-relaxed">
            Your attendance is above 75%. You are currently eligible for exams. Keep maintaining it!
          </p>
        </div>
      )}

      {/* Subject Wise Details */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Subject Wise Breakdown</h3>
        {studentRecords.map((r, i) => {
          const sTotal = r.theoryTotal + r.labTotal;
          const sAtt = r.theoryAttended + r.labAttended;
          const sPerc = sTotal > 0 ? Math.round((sAtt / sTotal) * 100) : 0;
          const tPerc = r.theoryTotal > 0 ? Math.round((r.theoryAttended / r.theoryTotal) * 100) : 0;
          const lPerc = r.labTotal > 0 ? Math.round((r.labAttended / r.labTotal) * 100) : 0;

          return (
            <div key={r.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white text-sm leading-none mb-1">{r.subject}</h4>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Semester Performance</p>
                </div>
                <div className={`text-sm font-black ${sPerc < 75 ? 'text-rose-500' : 'text-emerald-500'}`}>{sPerc}%</div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter text-slate-600 dark:text-slate-400">
                    <span>Theory</span>
                    <span>{tPerc}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${tPerc}%` }}></div>
                  </div>
                  <div className="text-[8px] font-bold text-slate-400 text-center uppercase">{r.theoryAttended} / {r.theoryTotal}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter text-slate-600 dark:text-slate-400">
                    <span>Lab</span>
                    <span>{lPerc}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${lPerc}%` }}></div>
                  </div>
                  <div className="text-[8px] font-bold text-slate-400 text-center uppercase">{r.labAttended} / {r.labTotal}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Attendance;