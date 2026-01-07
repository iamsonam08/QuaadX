import React, { useState, useMemo } from 'react';
import { AppData } from '../../types';

interface AttendanceProps {
  data: AppData;
  onBack: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ data, onBack }) => {
  const branches = ['Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  const [selBranch, setSelBranch] = useState(branches[0]);
  const [selYear, setSelYear] = useState(years[0]);

  const filteredAttendance = useMemo(() => {
    return data.attendance.filter(a => a.branch === selBranch && a.year === selYear);
  }, [data.attendance, selBranch, selYear]);

  const averageAttendance = useMemo(() => {
    if (filteredAttendance.length === 0) return 0;
    const total = filteredAttendance.reduce((acc, curr) => acc + curr.percentage, 0);
    return Math.round(total / filteredAttendance.length);
  }, [filteredAttendance]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm active:scale-90 transition-all border border-slate-100 dark:border-slate-800">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-2xl font-black text-emerald-600 tracking-tighter">Attendance Pro</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
          <select value={selBranch} onChange={(e) => setSelBranch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-2 text-[10px] font-black outline-none border-none dark:text-white">
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
          <select value={selYear} onChange={(e) => setSelYear(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-2 text-[10px] font-black outline-none border-none dark:text-white">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-xl border border-emerald-50 dark:border-slate-800">
        {filteredAttendance.length === 0 ? (
          <div className="text-center py-10">
            <i className="fa-solid fa-chart-line text-4xl text-slate-200 dark:text-slate-700 mb-4"></i>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No local records found</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10 relative">
              <div className="text-6xl font-black text-emerald-600 tracking-tighter">{averageAttendance}%</div>
              <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-2">Overall Performance</div>
            </div>

            <div className="space-y-8">
              {filteredAttendance.map((a, i) => (
                <div key={a.id} className="space-y-3 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="text-slate-700 dark:text-slate-300">{a.subject}</span>
                    <span className={a.percentage < 75 ? 'text-rose-500' : 'text-emerald-500'}>
                      {a.percentage}%
                    </span>
                  </div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${a.percentage < 75 ? 'bg-gradient-to-r from-rose-400 to-rose-600' : 'bg-gradient-to-r from-emerald-400 to-teal-600'}`}
                      style={{ width: `${a.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{a.attendedClasses} / {a.totalClasses} Classes</span>
                    {a.percentage < 75 && <span className="text-rose-500">Defaulter Warning</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      <div className="bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-6 rounded-[2.5rem]">
        <h4 className="text-amber-800 dark:text-amber-400 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation"></i> Academic Notice
        </h4>
        <p className="text-amber-700 dark:text-amber-500 text-[9px] font-bold uppercase leading-relaxed">Mandatory 75% attendance required per subject for exam eligibility as per university norms.</p>
      </div>
    </div>
  );
};

export default Attendance;