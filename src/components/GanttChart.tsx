/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Project, 
  WorkItem, 
  Activity, 
  ProgressUpdate,
  WarehouseMaterial
} from '../types';
import { 
  getActivityProgress, 
  getActivityStatus,
  getProjectStatusDetails,
  getProjectProgress,
  getProjectPlannedProgress,
  getSystemToday
} from '../utils/progressCalculations';
import { 
  Calendar, 
  ChevronRight, 
  Clock, 
  Info, 
  UserCheck, 
  AlertTriangle, 
  Flag, 
  Hourglass, 
  CheckCircle2, 
  TrendingUp, 
  AlertCircle, 
  Sliders, 
  Sparkles,
  Search,
  ArrowRightLeft
} from 'lucide-react';

interface GanttChartProps {
  lang: 'ar' | 'en';
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  progressUpdates: ProgressUpdate[];
  materials?: WarehouseMaterial[];
}

export default function GanttChart({
  lang,
  projects,
  workItems,
  activities,
  progressUpdates,
  materials = []
}: GanttChartProps) {
  const isRtl = lang === 'ar';
  
  // Interactive filters
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  
  // Fixed Today's reference date matching the system current local time
  const todayDate = useMemo(() => getSystemToday(), []);

  // Compute the total project bounds
  const timelineData = useMemo(() => {
    const allDates = projects.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
    if (allDates.length === 0) return null;

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add small paddings to frame the project cleanly
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    return { minDate, maxDate, totalDays };
  }, [projects]);

  // Generate a flat list of days within the padded range
  const daysList = useMemo(() => {
    if (!timelineData) return [];
    const list = [];
    let curr = new Date(timelineData.minDate);
    const maxIterations = 400; // Safety cap covering full calendar year with padding
    let count = 0;
    while (curr <= timelineData.maxDate && count < maxIterations) {
      list.push(new Date(curr));
      curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
      count++;
    }
    return list;
  }, [timelineData]);

  // Group days by month to render the top spanning month row
  const monthsGroup = useMemo(() => {
    const groups: { monthStr: string; count: number; date: Date }[] = [];
    daysList.forEach(d => {
      const monthStr = d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' });
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.monthStr === monthStr) {
        lastGroup.count++;
      } else {
        groups.push({ monthStr, count: 1, date: d });
      }
    });
    return groups;
  }, [daysList, lang]);

  // Compute status details for each project
  const projectStatuses = useMemo(() => {
    return projects.map(p => {
      const stats = getProjectStatusDetails(p, workItems, activities, progressUpdates, [], materials);
      
      const projStart = new Date(p.startDate);
      const projEnd = new Date(p.endDate);
      const totalDaysCount = Math.ceil((projEnd.getTime() - projStart.getTime()) / (1000 * 60 * 60 * 24));
      
      // Elapsed and remaining days relative to today (July 19, 2026)
      const elapsedDays = Math.max(0, Math.min(totalDaysCount, Math.ceil((todayDate.getTime() - projStart.getTime()) / (1000 * 60 * 60 * 24))));
      const remainingDays = Math.max(0, Math.ceil((projEnd.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysLeftPercent = Math.round((remainingDays / totalDaysCount) * 100);

      // Find next critical activity milestone
      const projectActivities = activities.filter(act => 
        workItems.some(wi => wi.id === act.workItemId && wi.projectId === p.id)
      );
      const criticalActs = projectActivities.filter(act => act.isCritical);
      const upcomingMilestone = criticalActs
        .map(act => {
          const actFinish = act.expectedFinishDate ? new Date(act.expectedFinishDate) : projEnd;
          const left = Math.ceil((actFinish.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          return { act, left, date: actFinish };
        })
        .filter(m => m.left >= 0)
        .sort((a, b) => a.left - b.left)[0];

      return { 
        project: p, 
        totalDays: totalDaysCount, 
        elapsedDays, 
        remainingDays, 
        daysLeftPercent,
        upcomingMilestone,
        ...stats 
      };
    });
  }, [projects, workItems, activities, progressUpdates, materials, todayDate]);

  // Scroll handler to center on Today
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const handleScrollToToday = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const todayElement = container.querySelector('.bg-rose-50');
      if (todayElement) {
        // Scroll smoothly to center the element
        const containerWidth = container.clientWidth;
        const elemLeft = (todayElement as HTMLElement).offsetLeft;
        const elemWidth = (todayElement as HTMLElement).clientWidth;
        container.scrollTo({
          left: elemLeft - (containerWidth / 2) + (elemWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  };

  // Run on mount or when timelineData updates to keep view focused on Today
  useEffect(() => {
    // Small delay to ensure render layout completes
    const timer = setTimeout(() => {
      handleScrollToToday();
    }, 300);
    return () => clearTimeout(timer);
  }, [daysList]);

  if (!timelineData || projects.length === 0) return (
    <div className="p-10 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <span className="text-sm font-bold">
        {isRtl ? 'لا توجد بيانات متاحة لعرض المخطط الزمني للمشاريع' : 'No project data available for timeline rendering'}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      
      {/* Dynamic Project Path HUD & Countdowns Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Real-time Anchor Card */}
        <div className="bg-[#040957] text-white p-5 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden border border-blue-950">
          <div className="absolute right-[-10%] bottom-[-10%] opacity-15 pointer-events-none">
            <Sparkles className="w-40 h-40 text-blue-300" />
          </div>
          <div className="space-y-2 z-10">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-extrabold uppercase text-blue-200 tracking-wider bg-blue-900/60 px-2.5 py-1 rounded-full border border-blue-700/40">
                {isRtl ? 'حالة المخطط الميداني اليومي' : 'Daily Field Timeline Status'}
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h3 className="text-xl font-black font-sans leading-tight pt-1 tracking-tight">
              {todayDate.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-[10.5px] text-blue-100 font-medium leading-relaxed opacity-95">
              {isRtl 
                ? 'مزامنة دقيقة للمسار الحرج والتقدم الفعلي بالموقع.' 
                : 'Precise real-time alignment of critical paths with on-field accomplishments.'}
            </p>
          </div>
          
          <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between z-10">
            <span className="text-[9.5px] font-bold text-blue-200/80">
              {isRtl ? 'تحديث تلقائي للمسار الميداني' : 'Auto-synced field timeline'}
            </span>
            <button 
              onClick={handleScrollToToday}
              className="bg-white/10 hover:bg-white/20 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
              <span>{isRtl ? 'التركيز على اليوم' : 'Focus Today'}</span>
            </button>
          </div>
        </div>

        {/* Countdowns Card */}
        {projectStatuses.slice(0, 2).map((ps, index) => {
          const progressPercent = ps.progress;
          const plannedPercent = ps.planned;
          const isDelayed = ps.status === 'Delayed';
          
          return (
            <div key={ps.project.id} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                      {isRtl ? 'المشروع النشط' : 'Active Project'}
                    </span>
                    <span className="text-xs font-black text-slate-800 line-clamp-1 mt-1">
                      {isRtl ? ps.project.nameAr : ps.project.nameEn}
                    </span>
                  </div>
                  <span className={`text-[9.5px] font-extrabold px-2.5 py-1 rounded-full flex-shrink-0 border ${
                    ps.status === 'Ahead' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                    ps.status === 'On Track' ? 'bg-blue-50 text-blue-800 border-blue-100' :
                    'bg-rose-50 text-rose-800 border-rose-100'
                  }`}>
                    {ps.status === 'Ahead' ? (isRtl ? '🚀 متقدم' : 'Ahead') :
                     ps.status === 'On Track' ? (isRtl ? '👍 في المسار' : 'On Track') :
                     (isRtl ? '⚠️ متأخر' : 'Behind')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1.5">
                  <div className="text-center bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                    <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-wider leading-tight">{isRtl ? 'المنقضية' : 'Elapsed'}</span>
                    <span className="font-mono text-[11px] font-black text-slate-800 block mt-0.5">{ps.elapsedDays} {isRtl ? 'يوم' : 'd'}</span>
                  </div>
                  <div className="text-center bg-[#040957]/5 p-2 rounded-xl border border-[#040957]/10">
                    <span className="block text-[8px] text-[#040957] font-extrabold uppercase tracking-wider leading-tight">{isRtl ? 'المتبقية' : 'Remaining'}</span>
                    <span className="font-mono text-[11px] font-black text-[#040957] block mt-0.5">{ps.remainingDays} {isRtl ? 'يوم' : 'd'}</span>
                  </div>
                  <div className="text-center bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                    <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-wider leading-tight">{isRtl ? 'التقدم الفعلي' : 'Actual %'}</span>
                    <span className="font-mono text-[11px] font-black text-blue-600 block mt-0.5">{progressPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar & Upcoming Milestone */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-bold">{isRtl ? 'الجدول الزمني المنجز:' : 'Timeline Accomplished:'}</span>
                  <span className="font-mono font-bold text-slate-700">{progressPercent}% / {plannedPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isDelayed ? 'bg-rose-500' : 'bg-blue-600'}`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                {ps.upcomingMilestone ? (
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-semibold bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <Flag className={`w-3.5 h-3.5 flex-shrink-0 ${ps.upcomingMilestone.left <= 5 ? 'text-rose-500 animate-pulse' : 'text-blue-500'}`} />
                    <span className="truncate">
                      {isRtl ? 'المحطة القادمة:' : 'Next Milestone:'}{' '}
                      <strong className="text-slate-800">
                        {isRtl ? ps.upcomingMilestone.act.nameAr : ps.upcomingMilestone.act.nameEn}
                      </strong>
                      {' '} ({ps.upcomingMilestone.left} {isRtl ? 'أيام متبقية' : 'days left'})
                    </span>
                  </div>
                ) : (
                  <div className="text-[8.5px] text-slate-400 font-semibold italic text-center">
                    {isRtl ? 'لا توجد محطات حرجة متبقية قريباً' : 'No upcoming critical milestones soon'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Controls Panel */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 text-[#040957] rounded-xl border border-slate-100 flex-shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {isRtl ? 'تصفية وجدولة الخطط التفصيلية' : 'Interactive Filter & Planner Layout'}
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold">
              {isRtl 
                ? 'استعرض المخطط على أساس يومي وقم بفرز المسارات الحرجة لتبسيط الرقابة.' 
                : 'Browse activities on a daily calendar with options to prioritize delayed paths.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={isRtl ? 'البحث في المهام والأنشطة...' : 'Search tasks & activities...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-[11px] font-semibold border border-slate-200 rounded-xl w-52 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder-slate-400"
            />
          </div>

          {/* Toggle Critical Path */}
          <button
            onClick={() => setShowCriticalOnly(!showCriticalOnly)}
            className={`py-2 px-3.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 ${
              showCriticalOnly 
                ? 'bg-rose-100 text-rose-800 border border-rose-200 shadow-xs' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/50'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${showCriticalOnly ? 'text-rose-600 animate-bounce' : 'text-slate-400'}`} />
            <span>{isRtl ? 'مسار حرج فقط' : 'Critical Path Only'}</span>
          </button>
        </div>
      </div>

      {/* Main Unified Scrolling Daily and Monthly Grid Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto custom-scrollbar relative"
        >
          <div className="min-w-max flex flex-col">
            
            {/* MONTH ROW */}
            <div className="flex border-b border-slate-200 bg-slate-50 h-11 items-stretch">
              {/* Sticky Corner Header */}
              <div className="w-48 md:w-64 lg:w-80 shrink-0 sticky left-0 z-30 bg-slate-100 border-r border-slate-200 flex items-center px-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider shadow-xs">
                {isRtl ? 'بند العمل / الأنشطة والمؤشرات' : 'Work Item / Activities & KPI'}
              </div>
              
              {/* Spanning Month Cells */}
              {monthsGroup.map((m, i) => (
                <div
                  key={i}
                  className="border-r border-slate-200 flex items-center justify-center text-[10px] font-extrabold text-[#040957] uppercase tracking-wider bg-slate-50 flex-shrink-0"
                  style={{ width: `${m.count * 40}px` }}
                >
                  <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs font-extrabold">
                    {m.monthStr}
                  </span>
                </div>
              ))}
            </div>

            {/* DAY NUMBER ROW */}
            <div className="flex border-b border-slate-200 bg-white h-14 items-stretch">
              {/* Sticky Details Sub-header */}
              <div className="w-48 md:w-64 lg:w-80 shrink-0 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 flex items-center justify-between px-4 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider shadow-xs">
                <span>{isRtl ? 'الخطة والإنتاجية اليومية المستهدفة' : 'Day Counts & Target Production'}</span>
                <span className="font-mono text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-extrabold">
                  {daysList.length}d
                </span>
              </div>

              {/* Days List Grid Numbers */}
              {daysList.map((d, i) => {
                const isToday = d.toDateString() === todayDate.toDateString();
                const isWeekend = d.getDay() === 5 || d.getDay() === 6; // Friday and Saturday
                const dayNum = d.getDate();
                const dayLabel = d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'narrow' });
                
                return (
                  <div
                    key={i}
                    className={`border-r border-slate-100 flex flex-col items-center justify-center text-[10px] transition-all relative flex-shrink-0 ${
                      isToday 
                        ? 'bg-rose-50/80 text-rose-700 font-black border-r-rose-200 border-l-rose-200 ring-2 ring-rose-500/35 z-10' 
                        : isWeekend 
                        ? 'bg-slate-100/50 text-slate-400' 
                        : 'text-slate-500 hover:bg-slate-50/80'
                    }`}
                    style={{ width: '40px' }}
                  >
                    <span className="text-[8px] opacity-75 font-bold uppercase">{dayLabel}</span>
                    <span className="text-xs font-black font-sans mt-0.5">{dayNum}</span>
                    {isToday && (
                      <span className="absolute -top-1 bg-rose-500 text-white text-[7px] font-black px-1 rounded-sm uppercase tracking-wider">
                        {isRtl ? 'اليوم' : 'NOW'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BODY ROWS (PROJECTS -> WORK ITEMS -> ACTIVITIES) */}
            {projects.map(project => {
              const projectWorkItems = workItems.filter(wi => wi.projectId === project.id);
              
              return (
                <React.Fragment key={project.id}>
                  {/* PROJECT ROW HEADER */}
                  <div className="flex bg-blue-50/30 border-b border-slate-200 items-stretch">
                    <div className="w-48 md:w-64 lg:w-80 shrink-0 sticky left-0 z-20 bg-blue-50/95 border-r border-slate-200 p-3.5 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                        <span className="font-extrabold text-xs text-[#040957] truncate">
                          {isRtl ? project.nameAr : project.nameEn}
                        </span>
                      </div>
                      <span className="font-mono text-[8px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-black flex-shrink-0 uppercase tracking-wider">
                        {isRtl ? 'مشروع كلي' : 'Overall'}
                      </span>
                    </div>

                    {/* Overall Project Timeline Background highlight */}
                    <div className="flex flex-shrink-0">
                      {daysList.map((d, i) => {
                        const start = new Date(project.startDate);
                        const end = new Date(project.endDate);
                        const inRange = d >= start && d <= end;
                        const isToday = d.toDateString() === todayDate.toDateString();
                        const isWeekend = d.getDay() === 5 || d.getDay() === 6;

                        return (
                          <div 
                            key={i} 
                            className={`border-r border-slate-100 h-12 relative ${
                              inRange ? 'bg-blue-50/15' : ''
                            } ${isToday ? 'bg-rose-50/20' : ''} ${isWeekend ? 'bg-slate-50/50' : ''}`}
                            style={{ width: '40px' }}
                          >
                            {inRange && d.toDateString() === start.toDateString() && (
                              <div className="absolute left-0 top-2 h-8 bg-blue-500 text-white text-[8px] font-black px-1.5 rounded-r-md flex items-center select-none z-10 whitespace-nowrap uppercase tracking-wider shadow-2xs">
                                {isRtl ? 'البداية' : 'Start'}
                              </div>
                            )}
                            {inRange && d.toDateString() === end.toDateString() && (
                              <div className="absolute right-0 top-2 h-8 bg-[#040957] text-white text-[8px] font-black px-1.5 rounded-l-md flex items-center select-none z-10 whitespace-nowrap uppercase tracking-wider shadow-2xs">
                                {isRtl ? 'النهاية 🏁' : 'End 🏁'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* WORK ITEMS LOOP */}
                  {projectWorkItems.map(wi => {
                    const wiActivities = activities.filter(act => act.workItemId === wi.id);
                    
                    // Filter activities based on interactive controls
                    const filteredActivities = wiActivities.filter(act => {
                      if (showCriticalOnly && !act.isCritical) return false;
                      if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        const matchesAr = act.nameAr.toLowerCase().includes(term);
                        const matchesEn = act.nameEn.toLowerCase().includes(term);
                        return matchesAr || matchesEn;
                      }
                      return true;
                    });

                    if (wiActivities.length > 0 && filteredActivities.length === 0) {
                      return null;
                    }

                    return (
                      <React.Fragment key={wi.id}>
                        {/* WORK ITEM ROW */}
                        <div className="flex border-b border-slate-100 bg-slate-50/20 items-stretch">
                          <div className="w-48 md:w-64 lg:w-80 shrink-0 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 p-3 pl-6 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-1.5 truncate">
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-extrabold text-[11px] text-slate-700 truncate">
                                {isRtl ? wi.nameAr : wi.nameEn}
                              </span>
                            </div>
                            <span className="text-[8.5px] font-extrabold text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                              {wi.itemNumber}
                            </span>
                          </div>

                          {/* Empty Background for Work Item Row */}
                          <div className="flex flex-shrink-0">
                            {daysList.map((d, i) => {
                              const isWeekend = d.getDay() === 5 || d.getDay() === 6;
                              return (
                                <div 
                                  key={i} 
                                  className={`border-r border-slate-50 h-11 ${
                                    d.toDateString() === todayDate.toDateString() ? 'bg-rose-50/20' : ''
                                  } ${isWeekend ? 'bg-slate-100/20' : ''}`}
                                  style={{ width: '40px' }}
                                ></div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ACTIVITIES LOOP (THE ACTUAL PLAN DAILY GRID) */}
                        {filteredActivities.map(act => {
                          const progress = getActivityProgress(act, progressUpdates);
                          const statusDetails = getActivityStatus(act, progressUpdates, materials, project, activities);
                          const actStatus = statusDetails.status;

                          // Deduce exact Activity Start and Expected Finish Dates
                          let startStr = project.startDate;
                          if (act.dependsOnActivityId) {
                            const dep = activities.find(a => a.id === act.dependsOnActivityId);
                            if (dep && dep.expectedFinishDate) {
                              startStr = dep.expectedFinishDate;
                            }
                          }
                          const endStr = act.expectedFinishDate || project.endDate;
                          
                          const actStart = new Date(startStr);
                          const actEnd = new Date(endStr);
                          
                          const totalDaysAct = Math.ceil((actEnd.getTime() - actStart.getTime()) / (1000 * 60 * 60 * 24)) || 1;
                          const elapsedDaysAct = Math.max(0, Math.ceil((todayDate.getTime() - actStart.getTime()) / (1000 * 60 * 60 * 24)));
                          const remainingDaysAct = progress >= 100 ? 0 : Math.max(0, Math.ceil((actEnd.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));

                          // Check if completed ahead of schedule
                          const isCompleted = progress >= 100;
                          let isAheadOfSchedule = false;
                          let savedDaysVal = 0;
                          let completionDate = todayDate;
                          if (isCompleted) {
                            const updates = progressUpdates.filter(upd => upd.activityId === act.id);
                            const lastUpdate = updates.length > 0
                              ? [...updates].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[updates.length - 1]
                              : null;
                            completionDate = lastUpdate ? new Date(lastUpdate.timestamp) : todayDate;
                            if (completionDate < actEnd) {
                              isAheadOfSchedule = true;
                              const diffMs = actEnd.getTime() - completionDate.getTime();
                              savedDaysVal = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                            }
                          }

                          // Dynamic calculation of scheduling overlaps with sibling activities in the same work item
                          const siblingActivities = activities.filter(a => a.id !== act.id && a.workItemId === act.workItemId);
                          const overlappingSiblings = siblingActivities.filter(sibling => {
                            let sibStartStr = project.startDate;
                            if (sibling.dependsOnActivityId) {
                              const dep = activities.find(a => a.id === sibling.dependsOnActivityId);
                              if (dep && dep.expectedFinishDate) {
                                sibStartStr = dep.expectedFinishDate;
                              }
                            }
                            const sibEndStr = sibling.expectedFinishDate || project.endDate;
                            const sibStart = new Date(sibStartStr);
                            const sibEnd = new Date(sibEndStr);

                            const maxStart = Math.max(actStart.getTime(), sibStart.getTime());
                            const minEnd = Math.min(actEnd.getTime(), sibEnd.getTime());
                            return maxStart < minEnd; // true if scheduling overlaps
                          });

                          const hasOverlap = overlappingSiblings.length > 0;

                          // Interactive dependency chain state detection
                          const isHovered = hoveredActivityId === act.id;
                          const isPredecessorOfHovered = hoveredActivityId ? (() => {
                            const hoveredAct = activities.find(a => a.id === hoveredActivityId);
                            return hoveredAct?.dependsOnActivityId === act.id;
                          })() : false;
                          const isDependentOfHovered = hoveredActivityId ? act.dependsOnActivityId === hoveredActivityId : false;

                          let rowAccentClass = '';
                          if (isHovered) {
                            rowAccentClass = 'bg-[#0080FF]/5 border-l-4 border-l-[#0080FF]';
                          } else if (isPredecessorOfHovered) {
                            rowAccentClass = 'bg-violet-50/20 border-l-4 border-l-violet-500';
                          } else if (isDependentOfHovered) {
                            rowAccentClass = 'bg-emerald-50/10 border-l-4 border-l-emerald-500';
                          }

                          return (
                            <div 
                              key={act.id} 
                              className={`flex border-b border-slate-100 hover:bg-slate-50/30 group transition-all duration-150 items-stretch ${rowAccentClass}`}
                              onMouseEnter={() => setHoveredActivityId(act.id)}
                              onMouseLeave={() => setHoveredActivityId(null)}
                            >
                              
                              {/* Sticky Activity Info Column */}
                              <div className={`w-48 md:w-64 lg:w-80 shrink-0 sticky left-0 z-20 border-r border-slate-200 p-3 pl-8 flex flex-col justify-center shadow-xs transition-all ${
                                isHovered ? 'bg-blue-50/95' :
                                isPredecessorOfHovered ? 'bg-violet-50/90' :
                                isDependentOfHovered ? 'bg-emerald-50/90' :
                                'bg-white group-hover:bg-slate-50'
                              }`}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-extrabold text-[10.5px] text-slate-800 truncate max-w-[190px]">
                                    {isRtl ? act.nameAr : act.nameEn}
                                  </span>
                                  <span className="font-mono text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                                    {progress}%
                                  </span>
                                </div>

                                {/* Dynamic Indicators & Countdowns for Clarity */}
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  {act.isCritical && (
                                    <span className="text-[7.5px] font-black text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded uppercase animate-pulse">
                                      {isRtl ? 'حرج 🚨' : 'Critical 🚨'}
                                    </span>
                                  )}
                                  
                                  {/* Days Countdown Badge */}
                                  <span className={`text-[7.5px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                    remainingDaysAct === 0 ? 'bg-slate-100 text-slate-500' :
                                    act.isCritical ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                                    actStatus === 'Delayed' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                                    'bg-blue-50 text-blue-800 border border-blue-100'
                                  }`}>
                                    <Hourglass className="w-2.5 h-2.5" />
                                    <span>
                                      {remainingDaysAct === 0 ? (isRtl ? 'منتهي' : 'Finished') :
                                       isRtl ? `${remainingDaysAct} يوم` : `${remainingDaysAct}d left`}
                                    </span>
                                  </span>

                                  {/* Status badge */}
                                  <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded ${
                                    progress >= 100 ? 'bg-emerald-100 text-emerald-800' :
                                    actStatus === 'Ahead' ? 'bg-emerald-50 text-emerald-700' :
                                    actStatus === 'Delayed' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                    'bg-[#040957]/5 text-blue-700'
                                  }`}>
                                    {progress >= 100 ? (isRtl ? 'مكتمل' : 'Completed') :
                                     actStatus === 'Ahead' ? (isRtl ? 'متقدم 🚀' : 'Ahead') :
                                     actStatus === 'Delayed' ? (isRtl ? 'متأخر ⚠️' : 'Delayed') :
                                     (isRtl ? 'في المسار' : 'On Track')}
                                  </span>

                                  {progress >= 100 && isAheadOfSchedule && (
                                    <span className="text-[7.5px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5 animate-pulse">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>
                                        {savedDaysVal > 0 
                                          ? (isRtl ? `توفير ${savedDaysVal} يومّ!` : `Saved ${savedDaysVal}d!`)
                                          : (isRtl ? `توفير ${Math.max(1, Math.floor((actEnd.getTime() - completionDate.getTime()) / (1000 * 60 * 60)))} ساعة!` : `Saved ${Math.max(1, Math.floor((actEnd.getTime() - completionDate.getTime()) / (1000 * 60 * 60)))}h!`)}
                                      </span>
                                    </span>
                                  )}

                                  {/* Dynamic Dependency Badge */}
                                  {act.dependsOnActivityId && (() => {
                                    const depAct = activities.find(a => a.id === act.dependsOnActivityId);
                                    if (!depAct) return null;
                                    return (
                                      <span 
                                        className="text-[7.5px] font-bold text-violet-800 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded flex items-center gap-0.5" 
                                        title={isRtl ? `يعتمد على: ${depAct.nameAr}` : `Depends on: ${depAct.nameEn}`}
                                      >
                                        <ArrowRightLeft className="w-2.5 h-2.5 text-violet-500" />
                                        <span>
                                          {isRtl ? `بعد: ${depAct.nameAr.slice(0, 10)}...` : `After: ${depAct.nameEn.slice(0, 10)}...`}
                                        </span>
                                      </span>
                                    );
                                  })()}

                                  {/* Dynamic Overlap Badge */}
                                  {hasOverlap && (
                                    <span 
                                      className="text-[7.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse" 
                                      title={isRtl 
                                        ? `تداخل مع: ${overlappingSiblings.map(s => isRtl ? s.nameAr : s.nameEn).join(', ')}` 
                                        : `Overlaps with: ${overlappingSiblings.map(s => s.nameEn).join(', ')}`
                                      }
                                    >
                                      <AlertCircle className="w-2.5 h-2.5 text-amber-500" />
                                      <span>
                                        {isRtl ? 'تداخل زمني ⚠️' : 'Overlap ⚠️'}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Day Columns containing the dynamic Plan target & Milestone flags */}
                              <div className="flex flex-shrink-0">
                                {daysList.map((d, i) => {
                                  const isPlannedOnDay = d >= actStart && d <= actEnd;
                                  const isToday = d.toDateString() === todayDate.toDateString();
                                  const isFinishDay = d.toDateString() === actEnd.toDateString();
                                  const isWeekend = d.getDay() === 5 || d.getDay() === 6;

                                  // Calculate target production for the day if planned
                                  const dailyPlannedQty = act.plannedDailyProduction 
                                    ? act.plannedDailyProduction 
                                    : act.totalQuantity 
                                    ? Math.round(act.totalQuantity / totalDaysAct) 
                                    : 0;

                                  // Choose color code for planned cells
                                  let cellBgClass = '';
                                  let cellBorderClass = 'border-slate-100/60';
                                  
                                  if (isPlannedOnDay) {
                                    if (progress >= 100) {
                                      cellBgClass = 'bg-emerald-100/50 hover:bg-emerald-150/70 text-emerald-800';
                                      cellBorderClass = 'border-emerald-200';
                                    } else if (isHovered) {
                                      cellBgClass = 'bg-[#0080FF]/30 hover:bg-[#0080FF]/40 text-[#0080FF] font-extrabold shadow-sm';
                                      cellBorderClass = 'border-[#0080FF]';
                                    } else if (isPredecessorOfHovered) {
                                      cellBgClass = 'bg-violet-100/40 hover:bg-violet-200/50 text-violet-900 font-extrabold';
                                      cellBorderClass = 'border-violet-300';
                                    } else if (isDependentOfHovered) {
                                      cellBgClass = 'bg-teal-100/40 hover:bg-teal-200/50 text-teal-900 font-extrabold';
                                      cellBorderClass = 'border-teal-300';
                                    } else if (act.isCritical) {
                                      cellBgClass = 'bg-rose-100/40 hover:bg-rose-200/50 text-rose-900 font-extrabold';
                                      cellBorderClass = 'border-rose-300';
                                    } else if (actStatus === 'Delayed') {
                                      cellBgClass = 'bg-amber-100/45 hover:bg-amber-200/60 text-amber-900';
                                      cellBorderClass = 'border-amber-200';
                                    } else if (actStatus === 'Ahead') {
                                      cellBgClass = 'bg-emerald-50 hover:bg-emerald-100/60 text-emerald-800';
                                      cellBorderClass = 'border-emerald-100';
                                    } else {
                                      cellBgClass = 'bg-blue-100/35 hover:bg-blue-100/55 text-blue-900';
                                      cellBorderClass = 'border-blue-200';
                                    }
                                  } else {
                                    cellBgClass = isWeekend ? 'bg-slate-50/50' : 'bg-transparent';
                                  }

                                  return (
                                    <div
                                      key={i}
                                      className={`border-r h-13 flex flex-col items-center justify-center relative transition-all duration-100 group/cell flex-shrink-0 ${cellBgClass} ${cellBorderClass} ${
                                        isToday ? 'ring-2 ring-rose-500/40 z-10 bg-rose-50/20' : ''
                                      }`}
                                      style={{ width: '40px' }}
                                    >
                                      {/* Planned Quantity Indicator inside cell */}
                                      {isPlannedOnDay && dailyPlannedQty > 0 && (
                                        <span className="text-[9px] font-mono font-black select-none leading-none opacity-95">
                                          {dailyPlannedQty}
                                        </span>
                                      )}

                                      {/* Hover tooltip for Employee */}
                                      <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 hidden group-hover/cell:flex flex-col bg-white text-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 z-50 w-56 text-[10px] pointer-events-none transition-all duration-200 ease-out">
                                        <div className="font-extrabold text-[11px] text-[#0080FF] border-b border-slate-100 pb-1.5 mb-1.5">
                                          {isRtl ? act.nameAr : act.nameEn}
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex justify-between">
                                            <span className="text-slate-500">{isRtl ? 'التاريخ المخطط:' : 'Planned Date:'}</span>
                                            <span className="font-bold text-slate-800">{d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' })}</span>
                                          </div>
                                          {isPlannedOnDay && (
                                            <div className="flex justify-between items-center">
                                              <span className="text-slate-500">{isRtl ? 'الإنتاجية اليومية:' : 'Daily Target:'}</span>
                                              <strong className="text-[#0080FF] font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{dailyPlannedQty} {act.unit}</strong>
                                            </div>
                                          )}
                                          <div className="flex justify-between">
                                            <span className="text-slate-500">{isRtl ? 'متبقي للنشاط:' : 'Activity days left:'}</span>
                                            <span className="font-bold text-amber-600">{remainingDaysAct}d</span>
                                          </div>
                                        </div>
                                      </div>

                                    </div>
                                  );
                                })}
                              </div>

                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}

          </div>
        </div>

        {/* Legend / Footer with explicit instructions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col gap-3">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {isRtl ? 'دليل الرموز ومؤشرات المسار الحرج والتداخلات الزمنية والتبعية للمشروع' : 'Visual Legend, Dependencies & Scheduling Overlaps Tracker'}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
            
            <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200/60 p-2.5 rounded-xl shadow-2xs">
              <div className="w-4 h-4 bg-rose-500 rounded border border-rose-600 flex-shrink-0 animate-pulse"></div>
              <div>
                <span className="block text-[8.5px] font-black text-rose-800 uppercase leading-none">{isRtl ? 'مسار حرج' : 'Critical Path'}</span>
                <span className="text-[7.5px] text-rose-600/80 font-bold leading-none">{isRtl ? 'خطة الإنتاج الحرجة' : 'Daily Critical Target'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200/60 p-2.5 rounded-xl shadow-2xs">
              <div className="w-4 h-4 bg-emerald-500 rounded border border-emerald-600 flex-shrink-0"></div>
              <div>
                <span className="block text-[8.5px] font-black text-emerald-800 uppercase leading-none">{isRtl ? 'مكتمل' : 'Completed Plan'}</span>
                <span className="text-[7.5px] text-emerald-600/80 font-bold leading-none">{isRtl ? 'تم إنجاز الأنشطة بالكامل' : '100% completed task'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200/60 p-2.5 rounded-xl shadow-2xs">
              <div className="w-4 h-4 bg-blue-400 rounded border border-blue-500 flex-shrink-0"></div>
              <div>
                <span className="block text-[8.5px] font-black text-blue-800 uppercase leading-none">{isRtl ? 'في المسار' : 'On Track Plan'}</span>
                <span className="text-[7.5px] text-blue-600/80 font-bold leading-none">{isRtl ? 'إنتاجية طبيعية مستهدفة' : 'Planned standard target'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200/60 p-2.5 rounded-xl shadow-2xs">
              <div className="w-4 h-4 bg-amber-500 rounded border border-amber-600 flex-shrink-0"></div>
              <div>
                <span className="block text-[8.5px] font-black text-amber-800 uppercase leading-none">{isRtl ? 'متأخر' : 'Delayed Plan'}</span>
                <span className="text-[7.5px] text-amber-600/80 font-bold leading-none">{isRtl ? 'يتطلب تعويض الإنتاجية' : 'Needs recovery plan'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-violet-50 border border-violet-200 p-2.5 rounded-xl shadow-2xs">
              <div className="w-4 h-4 bg-violet-500 rounded border border-violet-600 flex-shrink-0"></div>
              <div>
                <span className="block text-[8.5px] font-black text-violet-800 uppercase leading-none">{isRtl ? 'النشاط المسبق' : 'Predecessor'}</span>
                <span className="text-[7.5px] text-violet-600/80 font-bold leading-none">{isRtl ? 'تعتمد عليه المهمة المحددة' : 'Hovered task depends on'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-teal-50 border border-teal-200 p-2.5 rounded-xl shadow-2xs">
              <div className="w-4 h-4 bg-teal-500 rounded border border-teal-600 flex-shrink-0"></div>
              <div>
                <span className="block text-[8.5px] font-black text-teal-800 uppercase leading-none">{isRtl ? 'النشاط التابع' : 'Dependent'}</span>
                <span className="text-[7.5px] text-teal-600/80 font-bold leading-none">{isRtl ? 'يعتمد على المهمة المحددة' : 'Depends on hovered task'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
              <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">150</span>
              <div>
                <span className="block text-[8.5px] font-black text-slate-700 uppercase leading-none">{isRtl ? 'رقم الخلية' : 'Cell value'}</span>
                <span className="text-[7.5px] text-slate-500 font-bold leading-none">{isRtl ? 'الإنتاج المستهدف للنشاط' : 'Target production qty'}</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
