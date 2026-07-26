/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  Users, 
  Filter, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Download, 
  MapPin, 
  User, 
  Wrench, 
  Layers, 
  Briefcase, 
  Grid,
  TrendingUp,
  Maximize2,
  Minimize2,
  Info
} from 'lucide-react';
import { 
  Project, 
  WorkItem, 
  Activity, 
  ProgressUpdate,
  WarehouseMaterial,
  Worker,
  EquipmentItem,
  AttendanceRecord
} from '../types';
import { 
  getActivityProgress, 
  getActivityStatus, 
  getSystemToday, 
  getProjectProgress 
} from '../utils/progressCalculations';

interface GanttChartProps {
  lang: 'ar' | 'en';
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  progressUpdates: ProgressUpdate[];
  materials?: WarehouseMaterial[];
  workers?: Worker[];
  equipment?: EquipmentItem[];
  attendanceRecords?: AttendanceRecord[];
}

export default function GanttChart({
  lang,
  projects,
  workItems,
  activities,
  progressUpdates = [],
  materials = [],
  workers = [],
  equipment = [],
  attendanceRecords = []
}: GanttChartProps) {
  const isRtl = lang === 'ar';
  const todayDate = useMemo(() => getSystemToday(), []);
  const todayDateStr = useMemo(() => todayDate.toISOString().split('T')[0], [todayDate]);

  // View States
  const [timeView, setTimeView] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [collapsedWorkItems, setCollapsedWorkItems] = useState<Record<string, boolean>>({});
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);

  // Responsive column sizing state
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const leftWidth = useMemo(() => {
    if (windowWidth < 640) return 220; // Mobile
    if (windowWidth < 1024) return 340; // iPad/Tablet
    return 480; // Desktop
  }, [windowWidth]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Touch screen helper scrolling function
  const scrollTimeline = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      const factor = isRtl ? -1 : 1;
      scrollContainerRef.current.scrollBy({ left: scrollAmount * factor, behavior: 'smooth' });
    }
  };

  // Parse custom dates safely
  const parseDateLocal = (str: string) => {
    if (!str) return new Date();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // 1. Calculate Activity start/end based on project start and dependencies
  const getActivityDates = useMemo(() => {
    return (act: Activity, project: Project) => {
      let startStr = project.startDate;
      if (act.dependsOnActivityId) {
        const dep = activities.find(a => a.id === act.dependsOnActivityId);
        if (dep && dep.expectedFinishDate) {
          startStr = dep.expectedFinishDate;
        }
      }
      const endStr = act.expectedFinishDate || project.endDate;
      return {
        start: parseDateLocal(startStr),
        end: parseDateLocal(endStr)
      };
    };
  }, [activities]);

  // 2. Timeline Boundaries based on projects
  const timelineData = useMemo(() => {
    const allDates = projects.flatMap(p => [parseDateLocal(p.startDate), parseDateLocal(p.endDate)]);
    if (allDates.length === 0) {
      const fallbackMin = new Date('2026-07-01');
      const fallbackMax = new Date('2026-08-31');
      return { minDate: fallbackMin, maxDate: fallbackMax, totalDays: 60 };
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Padded boundaries for visual framing
    minDate.setDate(minDate.getDate() - 5);
    maxDate.setDate(maxDate.getDate() + 15);
    
    minDate.setHours(0,0,0,0);
    maxDate.setHours(23,59,59,999);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return { minDate, maxDate, totalDays };
  }, [projects]);

  // 3. Grid Columns Generation
  const columnsList = useMemo(() => {
    const { minDate, maxDate } = timelineData;
    const columns = [];

    if (timeView === 'days') {
      const curr = new Date(minDate);
      while (curr <= maxDate) {
        columns.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }
    } else if (timeView === 'weeks') {
      const curr = new Date(minDate);
      // Align to start of week (Sunday)
      curr.setDate(curr.getDate() - curr.getDay());
      while (curr <= maxDate) {
        columns.push(new Date(curr));
        curr.setDate(curr.getDate() + 7);
      }
    } else {
      // months view
      const curr = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1);
      while (curr <= end) {
        columns.push(new Date(curr));
        curr.setMonth(curr.getMonth() + 1);
      }
    }
    return columns;
  }, [timelineData, timeView]);

  // Width Constants & Coordinate Formulas
  const colWidth = timeView === 'days' ? 48 : timeView === 'weeks' ? 120 : 200;
  const gridStart = columnsList[0] || timelineData.minDate;

  const getXCoordinate = (date: Date): number => {
    const diffMs = date.getTime() - gridStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (timeView === 'days') {
      return diffDays * colWidth;
    } else if (timeView === 'weeks') {
      return (diffDays / 7) * colWidth;
    } else {
      // Month calculation (approx 30.4 days per month)
      return (diffDays / 30.4) * colWidth;
    }
  };

  const getWidth = (startDate: Date, endDate: Date): number => {
    const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
    if (timeView === 'days') {
      return durationDays * colWidth;
    } else if (timeView === 'weeks') {
      return (durationDays / 7) * colWidth;
    } else {
      return (durationDays / 30.4) * colWidth;
    }
  };

  // Auto-scroll to center on "Today"
  const todayLeft = useMemo(() => {
    return getXCoordinate(todayDate);
  }, [todayDate, gridStart, timeView, colWidth]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const todayScrollPos = todayLeft - 250; // offset slightly to provide past context
      scrollContainerRef.current.scrollLeft = todayScrollPos > 0 ? todayScrollPos : 0;
    }
  }, [timeView, todayLeft]);

  // 4. Dynamic Live KPI Calculations
  const kpiStats = useMemo(() => {
    const totalProjects = projects.length;
    if (totalProjects === 0) return {
      overallProgress: 0,
      todayTarget: 0,
      todayActual: 0,
      cumulTarget: 0,
      completed: 0,
      pending: 0,
      delayed: 0,
      workersToday: 0,
      equipToday: 0
    };

    // Overall Progress
    const sumProgress = projects.reduce((sum, p) => sum + getProjectProgress(p, workItems, activities, progressUpdates), 0);
    const overallProgress = Math.round(sumProgress / totalProjects);

    // Today's Progress Updates
    const todayUpdates = progressUpdates.filter(upd => {
      if (!upd.timestamp) return false;
      return upd.timestamp.startsWith(todayDateStr);
    });

    const todayActual = todayUpdates.reduce((sum, u) => sum + (u.completedQuantity || 0), 0);

    // Cumulative Target & Today's Target
    let todayTarget = 0;
    let cumulTarget = 0;
    let completed = 0;
    let pending = 0;
    let delayed = 0;

    activities.forEach(act => {
      const progress = getActivityProgress(act, progressUpdates);
      if (progress >= 100) {
        completed++;
      } else {
        pending++;
      }

      const proj = projects.find(p => workItems.find(w => w.id === act.workItemId)?.projectId === p.id);
      const statusObj = getActivityStatus(act, progressUpdates, materials, proj, activities);
      if (statusObj.status === 'Delayed' && progress < 100) {
        delayed++;
      }

      // Check if act is scheduled today
      if (proj) {
        const { start, end } = getActivityDates(act, proj);
        if (todayDate >= start && todayDate <= end) {
          todayTarget += act.plannedDailyProduction || 5;
        }
      }

      cumulTarget += act.totalQuantity;
    });

    // Workers & Equipment today
    const workersToday = attendanceRecords.filter(r => r.date === todayDateStr && r.isPresent).length || 
      todayUpdates.reduce((acc, u) => acc + (u.numberOfWorkers || 0), 0) || 14;

    const equipToday = todayUpdates.flatMap(u => u.equipmentUsed || []).length || 
      equipment.filter(e => e.status === 'Excellent' || e.status === 'Available').length || 6;

    return {
      overallProgress,
      todayTarget,
      todayActual,
      cumulTarget,
      completed,
      pending,
      delayed,
      workersToday,
      equipToday
    };
  }, [projects, workItems, activities, progressUpdates, attendanceRecords, equipment, todayDateStr, todayDate, materials]);

  // 5. Filter & Flatten Tree Rows
  const visibleTreeRows = useMemo(() => {
    const rows: {
      type: 'project' | 'workItem' | 'activity';
      id: string;
      item: any;
      parentProjectId?: string;
      parentWorkItemId?: string;
      wbsCode: string;
      level: number;
    }[] = [];

    projects.forEach((proj, pIdx) => {
      const pWbs = `${pIdx + 1}`;
      
      // Filter projects by term if matching name
      const projMatchesSearch = searchTerm === '' || 
        proj.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) || 
        proj.nameAr.includes(searchTerm);

      const projWorkItems = workItems.filter(wi => wi.projectId === proj.id);
      
      let workItemsAdded = false;

      projWorkItems.forEach((wi, wIdx) => {
        const wiWbs = `${pWbs}.${wIdx + 1}`;
        const wiActivities = activities.filter(act => act.workItemId === wi.id);

        const filteredActs = wiActivities.filter(act => {
          // Search filter
          const matchesSearch = searchTerm === '' || 
            act.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) || 
            act.nameAr.includes(searchTerm) ||
            wi.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wi.nameAr.includes(searchTerm);

          // Status filter
          const progress = getActivityProgress(act, progressUpdates);
          const rawStatus = getActivityStatus(act, progressUpdates, materials, proj, activities).status;
          let mappedStatus = 'Not Started';
          if (progress >= 100) mappedStatus = 'Completed';
          else if (rawStatus === 'Delayed') mappedStatus = 'Delayed';
          else if (act.isCritical && progress > 0 && progress < 40) mappedStatus = 'At Risk';
          else if (progress > 0) mappedStatus = 'In Progress';

          const matchesStatus = statusFilter === 'all' || 
            (statusFilter === 'Completed' && mappedStatus === 'Completed') ||
            (statusFilter === 'Delayed' && mappedStatus === 'Delayed') ||
            (statusFilter === 'At Risk' && mappedStatus === 'At Risk') ||
            (statusFilter === 'In Progress' && mappedStatus === 'In Progress') ||
            (statusFilter === 'Not Started' && mappedStatus === 'Not Started');

          return matchesSearch && matchesStatus;
        });

        if (filteredActs.length > 0 || searchTerm === '') {
          // If project collapsed, hide work items
          const isProjCollapsed = collapsedProjects[proj.id];
          if (!isProjCollapsed && (projMatchesSearch || filteredActs.length > 0)) {
            rows.push({
              type: 'workItem',
              id: wi.id,
              item: wi,
              parentProjectId: proj.id,
              wbsCode: wiWbs,
              level: 1
            });
            workItemsAdded = true;
          }

          const isWiCollapsed = collapsedWorkItems[wi.id];
          if (!isProjCollapsed && !isWiCollapsed) {
            filteredActs.forEach((act, aIdx) => {
              rows.push({
                type: 'activity',
                id: act.id,
                item: act,
                parentProjectId: proj.id,
                parentWorkItemId: wi.id,
                wbsCode: `${wiWbs}.${aIdx + 1}`,
                level: 2
              });
            });
          }
        }
      });

      // Insert project node at the top if there are children or it matches the search
      if (projMatchesSearch || workItemsAdded || searchTerm === '') {
        rows.splice(rows.findIndex(r => r.parentProjectId === proj.id), 0, {
          type: 'project',
          id: proj.id,
          item: proj,
          wbsCode: pWbs,
          level: 0
        });
      }
    });

    // Remove duplicates or invalid project orderings
    const uniqueRows: typeof rows = [];
    const seen = new Set<string>();
    rows.forEach(r => {
      const key = `${r.type}-${r.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRows.push(r);
      }
    });

    return uniqueRows;
  }, [projects, workItems, activities, progressUpdates, materials, searchTerm, statusFilter, collapsedProjects, collapsedWorkItems]);

  // Calculate coordinates for Dependency curves
  const dependencyLines = useMemo(() => {
    const lines: {
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      isCritical: boolean;
      id: string;
    }[] = [];

    visibleTreeRows.forEach((row, rIdx) => {
      if (row.type !== 'activity') return;
      const act = row.item as Activity;
      if (!act.dependsOnActivityId) return;

      // Find predecessor row in visible rows
      const predRowIdx = visibleTreeRows.findIndex(r => r.type === 'activity' && r.id === act.dependsOnActivityId);
      if (predRowIdx === -1) return; // predecessor is hidden or collapsed

      const predRow = visibleTreeRows[predRowIdx];
      const predAct = predRow.item as Activity;
      const proj = projects.find(p => p.id === row.parentProjectId);
      if (!proj) return;

      const predDates = getActivityDates(predAct, proj);
      const actDates = getActivityDates(act, proj);

      // Coordinates
      const predEndLoc = getXCoordinate(predDates.end) + getWidth(predDates.start, predDates.end);
      const actStartLoc = getXCoordinate(actDates.start);

      // Heights match. The index gives the row, let's offset by the vertical row height.
      // Header row = 64px, and each subsequent row = 56px (h-14)
      const predY = predRowIdx * 56 + 28 + 64; // +64 to shift past header row
      const actY = rIdx * 56 + 28 + 64;

      lines.push({
        fromX: predEndLoc,
        fromY: predY,
        toX: actStartLoc,
        toY: actY,
        isCritical: act.isCritical || predAct.isCritical || false,
        id: `${predAct.id}-${act.id}`
      });
    });

    return lines;
  }, [visibleTreeRows, projects, getActivityDates, gridStart, timeView, colWidth]);

  // Total width of the timeline grid
  const timelineWidth = columnsList.length * colWidth;

  return (
    <div className="w-full flex flex-col gap-6" id="gantt-chart-section">
      
      {/* 1. Header Bar with view controllers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-black tracking-widest text-[#0080FF] flex items-center gap-1.5 leading-none">
            <TrendingUp className="w-3.5 h-3.5 animate-pulse" />
            {isRtl ? 'نظام التحكم والجدولة الزمنية' : 'Scheduling & Execution Control System'}
          </span>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1">
            {isRtl ? 'مخططات وجداول المشاريع الزمنية (Gantt)' : 'Enterprise Construction Timelines (Gantt Chart)'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRtl ? 'تخطيط العمليات والموارد على أساس المسار الحرج وجدول التبعيات الزمني.' : 'Dynamic operational planning on Primavera P6 models with critical path logic.'}
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Zoom Level Switchers */}
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center border border-slate-200/50">
            <button 
              onClick={() => setTimeView('days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${timeView === 'days' ? 'bg-white text-[#0080FF] shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
            >
              {isRtl ? 'أيام' : 'Days'}
            </button>
            <button 
              onClick={() => setTimeView('weeks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${timeView === 'weeks' ? 'bg-white text-[#0080FF] shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
            >
              {isRtl ? 'أسابيع' : 'Weeks'}
            </button>
            <button 
              onClick={() => setTimeView('months')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${timeView === 'months' ? 'bg-white text-[#0080FF] shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
            >
              {isRtl ? 'أشهر' : 'Months'}
            </button>
          </div>

          {/* Quick Scroll Shift Buttons (Handy for touch devices) */}
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center border border-slate-200/50 gap-1 select-none">
            <button 
              onClick={() => scrollTimeline('left')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-black bg-white text-slate-700 hover:text-[#0080FF] hover:bg-slate-50 border border-slate-200/60 shadow-3xs flex items-center justify-center transition-all active:scale-95"
              title={isRtl ? 'إزاحة لليمين' : 'Scroll Left'}
            >
              &larr;
            </button>
            <button 
              onClick={() => scrollTimeline('right')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-black bg-white text-slate-700 hover:text-[#0080FF] hover:bg-slate-50 border border-slate-200/60 shadow-3xs flex items-center justify-center transition-all active:scale-95"
              title={isRtl ? 'إزاحة لليسار' : 'Scroll Right'}
            >
              &rarr;
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder={isRtl ? 'بحث في الأنشطة...' : 'Search activities...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-44 md:w-56 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white transition-all"
            >
              <option value="all">{isRtl ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="Completed">{isRtl ? 'مكتمل' : 'Completed'}</option>
              <option value="In Progress">{isRtl ? 'تحت التنفيذ' : 'In Progress'}</option>
              <option value="Delayed">{isRtl ? 'متأخر' : 'Delayed'}</option>
              <option value="At Risk">{isRtl ? 'في خطر' : 'At Risk'}</option>
              <option value="Not Started">{isRtl ? 'لم يبدأ' : 'Not Started'}</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          {/* Today Button */}
          <button 
            onClick={() => {
              if (scrollContainerRef.current) {
                const todayScrollPos = todayLeft - 250;
                scrollContainerRef.current.scrollTo({ left: todayScrollPos > 0 ? todayScrollPos : 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100/80 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-150 shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5" />
            {isRtl ? 'اليوم' : 'Today'}
          </button>

        </div>
      </div>

      {/* 2. Top KPI Cards Block */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        
        {/* KPI Card 1 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block leading-none">
            {isRtl ? 'التقدم الإجمالي للمشاريع' : 'Overall Progress'}
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-lg font-black text-slate-800 leading-none">{kpiStats.overallProgress}%</span>
            <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">Avg</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-[#0080FF] h-full" style={{ width: `${kpiStats.overallProgress}%` }} />
          </div>
        </div>

        {/* KPI Card 2 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block leading-none">
            {isRtl ? 'الإنتاج اليومي المستهدف' : 'Daily Target'}
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-black text-slate-800 leading-none">{kpiStats.todayTarget}</span>
            <span className="text-[8px] font-bold text-slate-400">units/day</span>
          </div>
          <div className="text-[8.5px] text-slate-400 mt-2 font-medium">Scheduled for today</div>
        </div>

        {/* KPI Card 3 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block leading-none">
            {isRtl ? 'المنجز الفعلي اليوم' : 'Today Actual'}
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-black text-[#0080FF] leading-none">{kpiStats.todayActual}</span>
            <span className="text-[8px] font-bold text-[#0080FF]">units</span>
          </div>
          <div className="w-full mt-2">
            <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-0.5">
              <span>Performance</span>
              <span className={kpiStats.todayActual >= kpiStats.todayTarget ? 'text-emerald-600' : 'text-amber-500'}>
                {kpiStats.todayTarget > 0 ? Math.round((kpiStats.todayActual / kpiStats.todayTarget) * 100) : 100}%
              </span>
            </div>
          </div>
        </div>

        {/* KPI Card 4 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block leading-none">
            {isRtl ? 'الكمية المستهدفة التراكمية' : 'Cumul. Target'}
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-black text-slate-800 leading-none">{kpiStats.cumulTarget}</span>
            <span className="text-[8px] font-bold text-slate-400">units total</span>
          </div>
          <div className="text-[8.5px] text-slate-400 mt-2 font-medium">Sum of all workscopes</div>
        </div>

        {/* KPI Card 5 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-emerald-700 tracking-wide block leading-none">
            {isRtl ? 'الأنشطة المكتملة' : 'Completed Tasks'}
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-black text-emerald-600 leading-none">{kpiStats.completed}</span>
            <span className="text-[8px] text-slate-400 font-bold">/ {activities.length}</span>
          </div>
          <span className="text-[8.5px] text-emerald-500/80 font-bold mt-2 flex items-center gap-0.5">
            <CheckCircle className="w-2.5 h-2.5" />
            {Math.round((kpiStats.completed / activities.length) * 100 || 0)}% of project scope
          </span>
        </div>

        {/* KPI Card 6 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-[#0080FF] tracking-wide block leading-none">
            {isRtl ? 'الأنشطة قيد التنفيذ' : 'Pending Tasks'}
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-black text-[#0080FF] leading-none">{kpiStats.pending}</span>
            <span className="text-[8px] text-slate-400 font-bold">remaining</span>
          </div>
          <span className="text-[8.5px] text-slate-400 mt-2 block font-medium">Active scheduling block</span>
        </div>

        {/* KPI Card 7 */}
        <div className="bg-white p-3.5 rounded-xl border border-red-200/50 bg-red-50/10 shadow-2xs flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-red-700 tracking-wide block leading-none">
            {isRtl ? 'الأنشطة المتأخرة' : 'Delayed Tasks'}
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-black text-red-600 leading-none">{kpiStats.delayed}</span>
            <span className="text-[8px] text-red-400 font-bold">needs recovery</span>
          </div>
          <span className={`text-[8.5px] font-black mt-2 flex items-center gap-0.5 ${kpiStats.delayed > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
            <AlertTriangle className="w-2.5 h-2.5" />
            {kpiStats.delayed > 0 ? (isRtl ? 'تنبيه مسار حرج' : 'Critical warning') : (isRtl ? 'لا يوجد تأخير حرج' : 'No delayed tracks')}
          </span>
        </div>

        {/* KPI Card 8 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block leading-none">
            {isRtl ? 'القوى العاملة اليوم' : 'Total Workers'}
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-black text-slate-800 leading-none">{kpiStats.workersToday}</span>
            <span className="text-[8px] text-slate-400 font-bold">on site</span>
          </div>
          <span className="text-[8.5px] text-slate-500 font-bold mt-2 flex items-center gap-1">
            <Users className="w-2.5 h-2.5 text-[#0080FF]" />
            Active roster HR
          </span>
        </div>

        {/* KPI Card 9 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block leading-none">
            {isRtl ? 'المعدات والآليات' : 'Heavy Equipment'}
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-lg font-black text-slate-800 leading-none">{kpiStats.equipToday}</span>
            <span className="text-[8px] text-slate-400 font-bold">deployed</span>
          </div>
          <span className="text-[8.5px] text-slate-500 font-bold mt-2 flex items-center gap-1">
            <Wrench className="w-2.5 h-2.5 text-[#0080FF]" />
            Fleet utilization
          </span>
        </div>

      </div>

      {/* 3. Main Split Tree-Timeline Block */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col">
        
        {/* Scrollable Container with sticky left column inside a table layout */}
        <div 
          ref={scrollContainerRef}
          className="w-full overflow-x-auto overflow-y-hidden select-none"
        >
          <div 
            className="flex flex-col relative"
            style={{ minWidth: `${timelineWidth + leftWidth}px` }} // Left column: dynamic, Right timeline width
          >
            
            {/* SVG Dependency overlay drawn on top of the grid rows */}
            <svg 
              className="absolute inset-0 pointer-events-none z-10"
              width={timelineWidth + leftWidth}
              height={visibleTreeRows.length * 56 + 64} // rowHeight = 56px, headerHeight = 64px
            >
              <defs>
                <marker 
                  id="arrow-marker" 
                  viewBox="0 0 10 10" 
                  refX="8" 
                  refY="5" 
                  markerWidth="5" 
                  markerHeight="5" 
                  orient="auto"
                >
                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#3B82F6" />
                </marker>
                <marker 
                  id="arrow-critical" 
                  viewBox="0 0 10 10" 
                  refX="8" 
                  refY="5" 
                  markerWidth="5" 
                  markerHeight="5" 
                  orient="auto"
                >
                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#EF4444" />
                </marker>
              </defs>

              {dependencyLines.map(line => {
                const startX = line.fromX + leftWidth; // Shifted past sticky left column
                const startY = line.fromY;
                const endX = line.toX + leftWidth;
                const endY = line.toY;
                
                // Draw a sleek Primavera P6 style stepped line
                const midX = startX + (endX - startX) * 0.4;
                const pathD = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
                
                return (
                  <path 
                    key={line.id}
                    d={pathD}
                    fill="none"
                    stroke={line.isCritical ? '#EF4444' : '#3B82F6'}
                    strokeWidth={line.isCritical ? 1.75 : 1.25}
                    strokeDasharray={line.isCritical ? 'none' : '3 3'}
                    markerEnd={`url(#${line.isCritical ? 'arrow-critical' : 'arrow-marker'})`}
                    className="opacity-70 transition-all duration-300 hover:opacity-100 hover:stroke-width-2"
                  />
                );
              })}
            </svg>

            {/* Today's Vertical Line */}
            <div 
              className="absolute top-0 bottom-0 w-[1.5px] bg-rose-500 z-20 pointer-events-none"
              style={{ left: `${todayLeft + leftWidth}px` }}
            >
              <div className="absolute top-1 -translate-x-1/2 bg-rose-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                {isRtl ? 'اليوم' : 'Today'}
              </div>
            </div>

            {/* A. Header Row */}
            <div className="flex h-16 border-b border-slate-200 sticky top-0 z-30 bg-slate-50/95 backdrop-blur-xs">
              
              {/* Sticky Left Header Column */}
              <div 
                className="shrink-0 sticky left-0 rtl:left-auto rtl:right-0 bg-slate-100 border-r rtl:border-r-0 rtl:border-l border-slate-200 px-3 sm:px-4 md:px-5 flex items-center justify-between z-40"
                style={{ width: `${leftWidth}px` }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Briefcase className="w-4 h-4 text-[#0080FF] shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-wider truncate">
                    {isRtl ? 'تقسيم العمل (WBS)' : 'WBS / Description'}
                  </span>
                </div>
                {leftWidth >= 280 && (
                  <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                    {isRtl ? 'الرمز والحالة والتقدم' : 'Code / Status / Progress'}
                  </div>
                )}
              </div>

              {/* Scrolling Columns Header */}
              <div className="flex flex-1 overflow-hidden relative">
                {columnsList.map((col, idx) => {
                  let headerText = '';
                  let subText = '';
                  const colDay = col.getDay();
                  const isWeekend = colDay === 5 || colDay === 6; // Friday/Saturday are standard weekends

                  if (timeView === 'days') {
                    headerText = col.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' });
                    subText = col.getDate().toString();
                  } else if (timeView === 'weeks') {
                    const startDay = col.getDate();
                    const monthText = col.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' });
                    headerText = `${monthText} ${startDay}`;
                    subText = `W${idx + 1}`;
                  } else {
                    headerText = col.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric' });
                    subText = col.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'long' });
                  }

                  return (
                    <div 
                      key={idx}
                      className={`h-full border-r border-slate-200/60 shrink-0 flex flex-col justify-center items-center text-center transition-colors duration-150 ${isWeekend ? 'bg-slate-150/40' : ''}`}
                      style={{ width: `${colWidth}px` }}
                    >
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">
                        {headerText}
                      </span>
                      <span className="text-xs font-black text-slate-700 tracking-tight mt-0.5">
                        {subText}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* B. Tree Grid Rows list */}
            <div className="flex flex-col">
              
              {visibleTreeRows.length === 0 ? (
                <div className="flex items-center justify-center p-16 text-slate-400 text-xs font-bold w-full bg-slate-50/30">
                  {isRtl ? 'لا توجد أنشطة مطابقة للبحث أو الفلترة.' : 'No tasks matching current filter or search queries.'}
                </div>
              ) : (
                visibleTreeRows.map((row, rIdx) => {
                  const isProj = row.type === 'project';
                  const isWi = row.type === 'workItem';
                  const isAct = row.type === 'activity';

                  // Collapse state indicators
                  const isCollapsed = isProj 
                    ? collapsedProjects[row.id] 
                    : isWi 
                    ? collapsedWorkItems[row.id] 
                    : false;

                  const toggleNode = () => {
                    if (isProj) {
                      setCollapsedProjects(prev => ({ ...prev, [row.id]: !prev[row.id] }));
                    } else if (isWi) {
                      setCollapsedWorkItems(prev => ({ ...prev, [row.id]: !prev[row.id] }));
                    }
                  };

                  // Styling row height: standard h-14 (56px) for perfect alignment
                  const rowClass = `flex h-14 border-b border-slate-100 group transition-colors duration-150 relative ${
                    isProj ? 'bg-blue-50/15 hover:bg-blue-50/25' : isWi ? 'bg-slate-50/30 hover:bg-slate-50/60' : 'hover:bg-slate-50/10'
                  }`;

                  return (
                    <div key={`${row.type}-${row.id}`} className={rowClass}>
                      
                      {/* Left sticky details cell */}
                      <div 
                        style={{ width: `${leftWidth}px` }}
                        className={`shrink-0 sticky left-0 rtl:left-auto rtl:right-0 z-20 flex items-center justify-between border-r rtl:border-r-0 rtl:border-l border-slate-200 px-2 sm:px-3 md:px-5 relative ${
                          isProj ? 'bg-slate-100 font-black' : isWi ? 'bg-slate-50 font-extrabold' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden flex-1">
                          
                          {/* Folder collapse handles with generous touch-targets */}
                          {(isProj || isWi) ? (
                            <button 
                              onClick={toggleNode}
                              className="p-1.5 sm:p-2 rounded-md text-slate-500 hover:bg-slate-200/50 transition-colors shrink-0 flex items-center justify-center"
                              style={{ minWidth: '28px', minHeight: '28px' }}
                            >
                              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          ) : (
                            <div className="w-7 sm:w-8 shrink-0" />
                          )}

                          {/* WBS Badge */}
                          <span className={`text-[9px] sm:text-[10px] font-mono font-black shrink-0 px-1 sm:px-1.5 py-0.5 rounded select-none ${
                            isProj ? 'bg-blue-100 text-blue-800' : isWi ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {row.wbsCode}
                          </span>

                          {/* Item/Activity name */}
                          <span className="truncate text-xs font-extrabold text-slate-800" title={isRtl ? row.item.nameAr : row.item.nameEn}>
                            {isRtl ? row.item.nameAr : row.item.nameEn}
                          </span>

                        </div>

                        {/* Status + Progress % Indicators for left pane */}
                        <div className="flex items-center gap-1.5 md:gap-3 shrink-0 pl-1">
                          
                          {isAct && (() => {
                            const act = row.item as Activity;
                            const progress = getActivityProgress(act, progressUpdates);
                            const rawStatus = getActivityStatus(act, progressUpdates, materials, projects.find(p => p.id === row.parentProjectId), activities).status;
                            
                            // Map Status
                            let mappedStatus: 'Completed' | 'In Progress' | 'Delayed' | 'At Risk' | 'Not Started' = 'Not Started';
                            let statusColor = 'bg-slate-100 text-slate-500 border-slate-200';
                            let dotColor = 'bg-slate-400';
                            let statusTextEn = 'Not Started';
                            let statusTextAr = 'لم يبدأ';

                            if (progress >= 100) {
                              mappedStatus = 'Completed';
                              statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              dotColor = 'bg-emerald-500';
                              statusTextEn = 'Completed';
                              statusTextAr = 'مكتمل';
                            } else if (rawStatus === 'Delayed') {
                              mappedStatus = 'Delayed';
                              statusColor = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
                              dotColor = 'bg-rose-500';
                              statusTextEn = 'Delayed';
                              statusTextAr = 'متأخر';
                            } else if (act.isCritical && progress > 0 && progress < 40) {
                              mappedStatus = 'At Risk';
                              statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
                              dotColor = 'bg-amber-500';
                              statusTextEn = 'At Risk';
                              statusTextAr = 'في خطر';
                            } else if (progress > 0) {
                              mappedStatus = 'In Progress';
                              statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
                              dotColor = 'bg-[#0080FF]';
                              statusTextEn = 'In Progress';
                              statusTextAr = 'تحت التنفيذ';
                            }

                            return (
                              <div className="flex items-center gap-1 sm:gap-2">
                                {/* Status capsule badge / dot indicator */}
                                {leftWidth >= 280 ? (
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${statusColor} select-none`}>
                                    {isRtl ? statusTextAr : statusTextEn}
                                  </span>
                                ) : (
                                  <span 
                                    className={`w-2.5 h-2.5 rounded-full ${dotColor} border border-white shadow-2xs shrink-0 block`} 
                                    title={isRtl ? statusTextAr : statusTextEn}
                                  />
                                )}
                                
                                {/* Percentage bubble */}
                                <span className="text-[10px] font-mono font-black text-slate-700 bg-slate-100 px-1 py-0.5 rounded border border-slate-200/50 w-8 text-right block shrink-0">
                                  {progress}%
                                </span>
                              </div>
                            );
                          })()}

                          {isWi && (() => {
                            const wi = row.item as WorkItem;
                            // Calculate average progress of activities inside work item
                            const wiActivities = activities.filter(a => a.workItemId === wi.id);
                            if (wiActivities.length === 0) return null;
                            const totalProgress = wiActivities.reduce((acc, a) => acc + getActivityProgress(a, progressUpdates), 0);
                            const avgProgress = Math.round(totalProgress / wiActivities.length);
                            return (
                              <span className="text-[10px] font-mono font-black text-[#0080FF] bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100 w-10 text-right block shrink-0">
                                {avgProgress}%
                              </span>
                            );
                          })()}

                          {isProj && (() => {
                            const proj = row.item as Project;
                            const progress = getProjectProgress(proj, workItems, activities, progressUpdates);
                            return (
                              <span className="text-[10px] font-mono font-black text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-10 text-right block shrink-0">
                                {progress}%
                              </span>
                            );
                          })()}

                        </div>

                        {/* Subtle edge shadow for overlapping scrolled items */}
                        <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-r from-transparent to-black/5 pointer-events-none" />

                      </div>

                      {/* Right timeline canvas row */}
                      <div className="flex flex-1 overflow-hidden relative items-center">
                        
                        {/* Shaded weekend columns as row-level indicators */}
                        {columnsList.map((col, cIdx) => {
                          const isWeekend = col.getDay() === 5 || col.getDay() === 6; // Fri/Sat
                          return (
                            <div 
                              key={cIdx}
                              className={`h-full border-r border-slate-200/60 shrink-0 ${isWeekend ? 'bg-slate-100/15' : ''}`}
                              style={{ width: `${colWidth}px` }}
                            />
                          );
                        })}

                        {/* 1. If row is an Activity, draw the progress timeline pill bar */}
                        {isAct && (() => {
                          const act = row.item as Activity;
                          const proj = projects.find(p => p.id === row.parentProjectId);
                          if (!proj) return null;

                          const dates = getActivityDates(act, proj);
                          const leftPos = getXCoordinate(dates.start);
                          const barWidth = getWidth(dates.start, dates.end);
                          const progress = getActivityProgress(act, progressUpdates);

                          // Determine status representation
                          const rawStatus = getActivityStatus(act, progressUpdates, materials, proj, activities).status;
                          let barColorClass = 'bg-[#0080FF]'; // In Progress (Blue)
                          let barBgClass = 'bg-blue-100/60 border-blue-200';
                          
                          if (progress >= 100) {
                            barColorClass = 'bg-[#22C55E]'; // Completed (Green)
                            barBgClass = 'bg-emerald-100/40 border-emerald-200';
                          } else if (rawStatus === 'Delayed') {
                            barColorClass = 'bg-[#EF4444]'; // Delayed (Red)
                            barBgClass = 'bg-rose-100/40 border-rose-200';
                          } else if (act.isCritical && progress > 0 && progress < 40) {
                            barColorClass = 'bg-[#F59E0B]'; // At Risk (Orange)
                            barBgClass = 'bg-amber-100/40 border-amber-200';
                          } else if (progress === 0) {
                            barColorClass = 'bg-[#94A3B8]'; // Not started (Gray)
                            barBgClass = 'bg-slate-100 border-slate-200';
                          }

                          const isMilestone = act.unit?.toLowerCase() === 'milestone' || act.totalQuantity === 0;

                          // Resources
                          const allocatedWorkers = workers.filter(w => act.workerIds.includes(w.id));
                          const allocatedWorkersCount = allocatedWorkers.length || 4;
                          
                          const allocatedEquip = equipment.filter(e => act.equipmentIds.includes(e.id));
                          const allocatedEquipName = allocatedEquip.map(e => isRtl ? e.nameAr : e.nameEn).join(', ') || '';

                          return (
                            <div 
                              className="absolute top-0 bottom-0 flex items-center z-20"
                              style={{ left: `${leftPos}px`, width: `${barWidth}px` }}
                              onMouseEnter={() => setHoveredActivityId(act.id)}
                              onMouseLeave={() => setHoveredActivityId(null)}
                            >
                              
                              {/* Milestone rendering (Diamond shape) */}
                              {isMilestone ? (
                                <div className="relative group/ms select-none cursor-pointer flex items-center justify-center">
                                  <div 
                                    className={`w-5 h-5 rotate-45 transform border border-white shadow-md transition-all duration-200 hover:scale-125 ${
                                      progress >= 100 ? 'bg-emerald-500' : 'bg-[#0080FF]'
                                    }`}
                                  />
                                  <span className="absolute left-6 whitespace-nowrap text-[9px] font-black text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">
                                    {isRtl ? 'حجر زاوية / تسليم' : 'Milestone Delivery'}
                                  </span>
                                </div>
                              ) : (
                                
                                /* Standard Progress Pill Bar */
                                <div 
                                  className={`h-7 w-full rounded-lg border flex items-center relative overflow-hidden transition-all duration-200 shadow-3xs cursor-pointer ${barBgClass}`}
                                >
                                  
                                  {/* Animated Foreground Progress Fill */}
                                  <motion.div 
                                    className={`absolute left-0 top-0 bottom-0 ${barColorClass} opacity-85`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                  />

                                  {/* Internal textual details inside/over the bar */}
                                  <div className="absolute inset-0 flex items-center justify-between px-2.5 z-10 pointer-events-none">
                                    <span className="text-[9.5px] font-black text-slate-800 drop-shadow-xs truncate pr-1">
                                      {isRtl ? act.nameAr : act.nameEn}
                                    </span>
                                    <span className="text-[9px] font-mono font-black text-slate-800 bg-white/60 px-1 py-0.2 rounded leading-none select-none">
                                      {progress}%
                                    </span>
                                  </div>

                                </div>
                              )}

                              {/* Resource metadata attached to the right of the Gantt bar */}
                              {!isMilestone && barWidth > 35 && (
                                <div className="absolute left-full ml-3 flex items-center gap-2 select-none pointer-events-none text-[9.5px] font-bold text-slate-500 whitespace-nowrap">
                                  <span className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                    <Users className="w-2.5 h-2.5 text-[#0080FF]" />
                                    <span>{allocatedWorkersCount}</span>
                                  </span>
                                  {allocatedEquipName && (
                                    <span className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                      <Wrench className="w-2.5 h-2.5 text-[#0080FF]" />
                                      <span>{allocatedEquipName}</span>
                                    </span>
                                  )}
                                  <span className="text-[8.5px] text-slate-400 font-mono">
                                    {Math.ceil((dates.end.getTime() - dates.start.getTime()) / (1000 * 60 * 60 * 24) + 1)}d
                                  </span>
                                </div>
                              )}

                              {/* 2. Premium Tooltip Hover Card Popover */}
                              <AnimatePresence>
                                {hoveredActivityId === act.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white border border-slate-200 p-4 rounded-xl shadow-xl z-50 w-80 text-left pointer-events-auto"
                                    onMouseEnter={() => setHoveredActivityId(act.id)}
                                    onMouseLeave={() => setHoveredActivityId(null)}
                                  >
                                    {/* Tooltip Header */}
                                    <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                                      <div>
                                        <span className="text-[9px] font-mono font-black text-[#0080FF] bg-blue-50 px-1.5 py-0.5 rounded-sm border border-blue-100 uppercase">
                                          {row.wbsCode}
                                        </span>
                                        <h4 className="text-xs font-black text-slate-800 tracking-tight mt-1">
                                          {isRtl ? act.nameAr : act.nameEn}
                                        </h4>
                                      </div>
                                      <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full border ${
                                        progress >= 100 
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                          : rawStatus === 'Delayed'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-blue-50 text-blue-700 border-blue-200'
                                      }`}>
                                        {progress}%
                                      </span>
                                    </div>

                                    {/* Tooltip body grid */}
                                    <div className="space-y-1.5 text-[10.5px]">
                                      
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">{isRtl ? 'تاريخ البدء المخطط:' : 'Start Date:'}</span>
                                        <span className="font-extrabold text-slate-800">{dates.start.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                      </div>

                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">{isRtl ? 'تاريخ الانتهاء المتوقع:' : 'Finish Date:'}</span>
                                        <span className="font-extrabold text-slate-800">{dates.end.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                      </div>

                                      <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-500 font-medium">{isRtl ? 'المدة الإجمالية:' : 'Duration:'}</span>
                                        <span className="font-mono font-black text-[#0080FF]">{Math.ceil((dates.end.getTime() - dates.start.getTime()) / (1000 * 60 * 60 * 24) + 1)} days</span>
                                      </div>

                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">{isRtl ? 'الكمية الإجمالية للمخطط:' : 'Total Scope Qty:'}</span>
                                        <span className="font-bold text-slate-800">{act.totalQuantity} {act.unit}</span>
                                      </div>

                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">{isRtl ? 'الكمية المنفذة فعلياً:' : 'Completed Qty:'}</span>
                                        <span className="font-bold text-slate-800">
                                          {progressUpdates.filter(u => u.activityId === act.id).reduce((sum, u) => sum + (u.completedQuantity || 0), 0)} {act.unit}
                                        </span>
                                      </div>

                                      <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-500 font-medium">{isRtl ? 'المعدل المستهدف اليومي:' : 'Daily Target Rate:'}</span>
                                        <span className="font-black text-slate-800">{act.plannedDailyProduction || 5} {act.unit}/day</span>
                                      </div>

                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">{isRtl ? 'المهندس المسؤول:' : 'Supervisor:'}</span>
                                        <span className="font-extrabold text-slate-700">{proj.projectManager || 'Site Supervisor'}</span>
                                      </div>

                                      {allocatedWorkers.length > 0 && (
                                        <div className="flex flex-col gap-0.5 border-t border-slate-100 pt-1.5 mt-1">
                                          <span className="text-slate-400 text-[8.5px] uppercase font-black tracking-wider">{isRtl ? 'فريق العمل الميداني:' : 'Assigned Site Team:'}</span>
                                          <span className="font-bold text-slate-700 leading-tight text-[9.5px]">
                                            {allocatedWorkers.map(w => w.fullName).join(', ')}
                                          </span>
                                        </div>
                                      )}

                                      {act.descriptionEn && (
                                        <div className="flex flex-col gap-0.5 border-t border-slate-100 pt-1.5 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200/50">
                                          <span className="text-slate-400 text-[8.5px] uppercase font-black tracking-wider flex items-center gap-1">
                                            <Info className="w-3 h-3 text-blue-500" />
                                            {isRtl ? 'ملاحظات وتوجيهات تشغيلية:' : 'Operational Remarks:'}
                                          </span>
                                          <span className="font-medium text-slate-600 leading-tight italic text-[9.5px]">
                                            {isRtl ? act.descriptionAr : act.descriptionEn}
                                          </span>
                                        </div>
                                      )}

                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                            </div>
                          );
                        })()}

                      </div>

                    </div>
                  );
                })
              )}

            </div>

          </div>
        </div>

        {/* 4. Legend Footer */}
        <div className="bg-slate-50 border-t border-slate-200/60 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              {isRtl ? 'رموز جدول جودة المسارات الزمنية والتبعية المتبادلة للمشروع' : 'Visual Legend & CPM Schedule Logic Guide'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-3xs">
              <span className="w-2.5 h-2.5 bg-[#22C55E] rounded-full border border-emerald-600" />
              <span>{isRtl ? 'مكتمل' : 'Completed (100%)'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-3xs">
              <span className="w-2.5 h-2.5 bg-[#0080FF] rounded-full border border-blue-600" />
              <span>{isRtl ? 'تحت التنفيذ' : 'In Progress'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-3xs">
              <span className="w-2.5 h-2.5 bg-[#EF4444] rounded-full border border-red-600 animate-pulse" />
              <span>{isRtl ? 'متأخر حرج' : 'Delayed'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-3xs">
              <span className="w-2.5 h-2.5 bg-[#F59E0B] rounded-full border border-amber-600" />
              <span>{isRtl ? 'في خطر' : 'At Risk'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-3xs">
              <span className="w-2.5 h-2.5 bg-[#94A3B8] rounded-full border border-slate-400" />
              <span>{isRtl ? 'لم يبدأ' : 'Not Started'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-3xs">
              <div className="w-3 h-3 rotate-45 transform bg-[#0080FF] border border-white" />
              <span>{isRtl ? 'حجر زاوية (Milestone)' : 'Milestone'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full shadow-3xs">
              <span className="w-3 border-t border-red-500 border-dashed shrink-0" />
              <span>{isRtl ? 'مسار حرج' : 'Critical Path Dependency'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full shadow-3xs">
              <span className="w-3 border-t border-blue-500 shrink-0" />
              <span>{isRtl ? 'تبعية مجدولة' : 'Standard Dependency'}</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
