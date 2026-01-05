
import React from 'react';
import { AppData } from './types';

export const INITIAL_DATA: AppData = {
  attendance: [],
  timetable: [],
  exams: [],
  scholarships: [],
  internships: [],
  events: [],
  complaints: [],
  rawKnowledge: [],
  campusMapImage: undefined,
  uploadLogs: []
};

export const GRADIENTS = {
  vpai: 'from-violet-500 to-fuchsia-500',
  attendance: 'from-emerald-400 to-teal-600',
  timetable: 'from-blue-400 to-indigo-600',
  scholarship: 'from-amber-400 to-orange-500',
  events: 'from-pink-500 to-rose-500',
  exams: 'from-red-500 to-orange-600',
  complaint: 'from-slate-600 to-slate-800',
  internship: 'from-cyan-400 to-blue-500',
  map: 'from-lime-400 to-green-600',
};
