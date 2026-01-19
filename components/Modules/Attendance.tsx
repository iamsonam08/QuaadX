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
    return data.attendance.filter(a => a.studentId.trim().toUpperCase() === studentId.trim().toUpperCase());
  }, [data.attendance, studentId, isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!data.attendance || data.attendance.length === 0) {
      setLoginError('No attendance records found in the database.');
      return;
    }

    const match = data.attendance.find(
      a => a.studentId.trim().toUpperCase() === studentId.trim().toUpperCase() && a.password === password
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
      totalAttended += (Number(r.theoryAttended) + Number(r.labAttended));
      totalConducted += (Number(r.theoryTotal) + Number(r.labTotal));
    });

    const percentage = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 0;
    
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
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3 relative z-10">
            <i className="fa-solid fa-user-lock text-3xl"></i>
          </div>
          <h2 className="text-2xl font-black text-center text-slate-800 dark:text-white mb-2 uppercase tracking-tighter">Student Login</h2>
          <p className="text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-8">Access Attendance Portal</p>
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <input 
              type="text" 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="ID (e.g. STU001)"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 dark:text-white"
              required
            />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 dark:text-white"
              required
            />
            {loginError && <p className="text-rose-500 text-[10px] font-black text-center uppercase">{loginError}</p>}
            <button type="submit" className="w-full py-5 bg-[#10b981] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-2">Unlock Records</button>
            <button type="button" onClick={onBack} className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all mt-2">Back to dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-20 max-w-md mx-auto">
      {/* Header aligned exactly with reference image */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md active:scale-90 transition-all text-[#f43f5e] border border-slate-50 dark:border-slate-800">
             <i className="fa-solid fa-right-from-bracket text-xl transform rotate-180"></i>
          </button>
          <div className="flex flex-col">
            <h2 className="text-[2rem] font-black text-[#10b981] tracking-tighter leading-none mb-1">Attendance</h2>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {studentId.toUpperCase()}</span>
          </div>
        </div>
        <div className={`px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${stats?.isSafe ? 'bg-[#dcfce7] text-[#10b981]' : 'bg-rose-100 text-rose-600'}`}>
          {stats?.isSafe ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
        </div>
      </div>

      {/* Main Stats Card redesigned to fix overlap and clipping */}
      <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.06)] border border-slate-50 dark:border-slate-800 relative overflow-hidden group">
        {/* Abstract watermark graphic */}
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
           <i className="fa-solid fa-chart-line text-[220px] text-slate-900 dark:text-white"></i>
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Centered Circular Progress with proper ViewBox to prevent clipping */}
          <div className="relative w-52 h-52 mb-8">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {/* Background Track Circle */}
              <circle 
                cx="100" cy="100" r="85" 
                stroke="currentColor" 
                strokeWidth="10" 
                fill="transparent" 
                className="text-slate-100 dark:text-slate-800" 
              />
              {/* Progress Circle Arc */}
              <circle 
                cx="100" cy="100" r="85" 
                stroke="currentColor" 
                strokeWidth="14" 
                fill="transparent" 
                strokeDasharray={534}
                strokeDashoffset={534 - (534 * (stats?.percentage || 0)) / 100}
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-in-out ${stats?.isSafe ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-slate-800 dark:text-white leading-none">{stats?.percentage}%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">AVERAGE</span>
            </div>
          </div>

          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.35em] mb-10">SEMESTER PERFORMANCE</h3>
          
          <div className="w-full h-px bg-slate-50 dark:bg-slate-800 mb-10"></div>
          
          <div className="grid grid-cols-2 gap-8 w-full">
            <div className="text-center relative">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">ATTENDED</p>
              <p className="text-4xl font-black text-slate-800 dark:text-white leading-none">{stats?.totalAttended}</p>
              {/* Divider in grid */}
              <div className="absolute right-[-4px] top-2 bottom-2 w-px bg-slate-100 dark:bg-slate-800"></div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">CONDUCTED</p>
              <p className="text-4xl font-black text-slate-800 dark:text-white leading-none">{stats?.totalConducted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Threshold and Eligibility Alerts */}
      <div className="px-2 space-y-4">
        {!stats?.isSafe && stats?.classesNeeded !== undefined && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-8 rounded-[3rem] animate-pulse flex items-center gap-6">
            <div className="w-14 h-14 bg-[#f43f5e] text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
              <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
            </div>
            <div>
              <h4 className="text-[#e11d48] dark:text-rose-400 font-black text-[11px] uppercase tracking-widest mb-1">LOW ATTENDANCE ALERT</h4>
              <p className="text-slate-600 dark:text-rose-300 text-[12px] font-medium leading-snug">
                You need exactly <span className="font-black text-rose-600">{stats.classesNeeded} more sessions</span> to reach 75%.
              </p>
            </div>
          </div>
        )}

        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6 pt-2 mb-2">Detailed Course Report</h3>
        
        {/* Detailed Breakdown with fixed spacing */}
        <div className="space-y-4 pb-12">
          {studentRecords.map((r, i) => {
            const subTotalAtt = Number(r.theoryAttended) + Number(r.labAttended);
            const subTotalCond = Number(r.theoryTotal) + Number(r.labTotal);
            const subPerc = subTotalCond > 0 ? Math.round((subTotalAtt / subTotalCond) * 100) : 0;
            const tPerc = r.theoryTotal > 0 ? Math.round((r.theoryAttended / r.theoryTotal) * 100) : 0;
            const lPerc = r.labTotal > 0 ? Math.round((r.labAttended / r.labTotal) * 100) : 0;

            return (
              <div key={r.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex justify-between items-start mb-6">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-800 dark:text-slate-100 text-base tracking-tight truncate leading-none mb-1.5">{r.subject}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Academic Module</p>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-[12px] font-black shrink-0 ${subPerc < 75 ? 'text-[#f43f5e] bg-rose-50 dark:bg-rose-950/20' : 'text-[#10b981] bg-emerald-50 dark:bg-emerald-950/20'}`}>
                    {subPerc}%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-50 dark:bg-slate-800 -translate-x-1/2"></div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">THEORY</span>
                      <span className="text-[10px] font-black text-slate-800 dark:text-slate-300">{tPerc}%</span>
                    </div>
                    <div className="h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#10b981] rounded-full transition-all duration-1000" style={{ width: `${tPerc}%` }}></div>
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 text-center">{r.theoryAttended} / {r.theoryTotal}</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LAB</span>
                      <span className="text-[10px] font-black text-slate-800 dark:text-slate-300">{lPerc}%</span>
                    </div>
                    <div className="h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${lPerc}%` }}></div>
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 text-center">{r.labAttended} / {r.labTotal}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Attendance;