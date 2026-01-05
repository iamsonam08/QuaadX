
import React, { useState, useMemo } from 'react';
import { AppData } from '../../types';

interface InternshipProps {
  data: AppData;
  onBack: () => void;
}

const Internship: React.FC<InternshipProps> = ({ data, onBack }) => {
  const branches = ['Comp', 'IT', 'Civil', 'Mech', 'Elect', 'AIDS', 'E&TC'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  const [selBranch, setSelBranch] = useState(branches[0]);
  const [selYear, setSelYear] = useState(years[0]);

  const filteredInternships = useMemo(() => {
    return data.internships.filter(job => 
      job.branch === selBranch && job.year === selYear
    );
  }, [data.internships, selBranch, selYear]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-2xl font-black text-cyan-600 tracking-tighter">Placement Hub</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
          <select value={selBranch} onChange={(e) => setSelBranch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-2 text-[10px] font-black outline-none border-none">
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
          <select value={selYear} onChange={(e) => setSelYear(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-2 text-[10px] font-black outline-none border-none">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredInternships.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-16 rounded-[3rem] text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <i className="fa-solid fa-briefcase text-4xl text-slate-200 mb-4"></i>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">No Listings</h3>
            <p className="text-[9px] mt-1 text-slate-500 font-bold uppercase tracking-widest">Check back soon for {selBranch}!</p>
          </div>
        ) : (
          filteredInternships.map((job, i) => (
            <div key={job.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-cyan-50 dark:border-slate-800 flex gap-4 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <i className="fa-solid fa-building text-cyan-600 text-lg"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase text-[11px] truncate leading-none">{job.role}</h3>
                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md shrink-0 ml-2">{job.stipend}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{job.company}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 flex items-center gap-1 font-black uppercase">
                    <i className="fa-solid fa-location-dot text-cyan-500"></i> {job.location}
                  </span>
                  <button className="text-[8px] font-black uppercase tracking-widest text-white bg-cyan-600 px-4 py-1.5 rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-100 dark:shadow-none">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Internship;
