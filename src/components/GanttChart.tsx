/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Project, 
  WorkItem, 
  Activity, 
  ProgressUpdate 
} from '../types';
import { getActivityProgress } from '../utils/progressCalculations';
import { Calendar, ChevronRight, Clock, Info } from 'lucide-react';

interface GanttChartProps {
  lang: 'ar' | 'en';
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  progressUpdates: ProgressUpdate[];
}

export default function GanttChart({
  lang,
  projects,
  workItems,
  activities,
  progressUpdates
}: GanttChartProps) {
  const isRtl = lang === 'ar';

  // We'll focus on one project at a time or all? 
  // Let's show all active projects as top level groups
  
  const timelineData = useMemo(() => {
    // Determine the overall date range for the chart
    const allDates = projects.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
    if (allDates.length === 0) return null;

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add some padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    return { minDate, maxDate, totalDays };
  }, [projects]);

  if (!timelineData) return (
    <div className="p-10 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
      {isRtl ? 'لا توجد بيانات لمخطط غانت' : 'No data available for Gantt chart'}
    </div>
  );

  const { minDate, totalDays } = timelineData;

  const getPosition = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Math.max(0, date.getTime() - minDate.getTime());
    return (diff / (1000 * 60 * 60 * 24) / totalDays) * 100;
  };

  // Generate timeline markers (months)
  const months = [];
  let current = new Date(minDate);
  while (current <= timelineData.maxDate) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
      {/* Chart Header / Timeline */}
      <div className="bg-gray-50 border-b border-gray-100 flex overflow-hidden">
        <div className="w-64 flex-shrink-0 border-r border-gray-200 p-4 font-bold text-xs text-[#040957] uppercase tracking-wider bg-gray-100/50">
          {isRtl ? 'المشروع / المهمة' : 'Project / Task'}
        </div>
        <div className="flex-grow relative h-14 overflow-x-auto overflow-y-hidden no-scrollbar">
          <div className="absolute inset-0 flex">
            {months.map((m, i) => (
              <div 
                key={i} 
                className="flex-shrink-0 border-r border-gray-200 px-2 py-3 text-[10px] font-black text-gray-400 uppercase"
                style={{ width: `${(30 / totalDays) * 100}%`, minWidth: '100px' }}
              >
                {m.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar">
        {projects.map(project => {
          const projectWorkItems = workItems.filter(wi => wi.projectId === project.id);
          
          return (
            <div key={project.id} className="border-b border-gray-100 last:border-0">
              {/* Project Header Row */}
              <div className="flex bg-blue-50/30 group">
                <div className="w-64 flex-shrink-0 border-r border-gray-200 p-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="font-bold text-xs text-[#040957] truncate">
                    {isRtl ? project.nameAr : project.nameEn}
                  </span>
                </div>
                <div className="flex-grow relative h-12">
                  {/* Project Bar */}
                  <div 
                    className="absolute top-3 h-6 bg-blue-200/50 border border-blue-300 rounded-md flex items-center px-2"
                    style={{ 
                      left: `${getPosition(project.startDate)}%`, 
                      width: `${getPosition(project.endDate) - getPosition(project.startDate)}%` 
                    }}
                  >
                    <span className="text-[9px] font-bold text-blue-800 whitespace-nowrap overflow-hidden">
                      {isRtl ? 'الجدول الزمني الكلي' : 'Full Timeline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Work Items and Activities */}
              {projectWorkItems.map(wi => {
                const wiActivities = activities.filter(act => act.workItemId === wi.id);
                
                return (
                  <div key={wi.id}>
                    {/* Work Item Row (Sub-header) */}
                    <div className="flex border-t border-gray-50 bg-white hover:bg-gray-50/50 transition">
                      <div className="w-64 flex-shrink-0 border-r border-gray-200 p-3 pl-6 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                        <span className="font-semibold text-[11px] text-gray-600 truncate">
                          {isRtl ? wi.nameAr : wi.nameEn}
                        </span>
                      </div>
                      <div className="flex-grow relative h-10">
                        {/* Summary line for Work Item could go here if dates were per WI */}
                        <div className="absolute inset-0 border-b border-gray-50/50 border-dashed"></div>
                      </div>
                    </div>

                    {/* Activity Rows */}
                    {wiActivities.map(act => {
                      const progress = getActivityProgress(act, progressUpdates);
                      
                      // Derive start/end for activity
                      // If it depends on another activity, its start is that activity's end
                      let startStr = project.startDate;
                      if (act.dependsOnActivityId) {
                        const dependency = activities.find(a => a.id === act.dependsOnActivityId);
                        if (dependency && dependency.expectedFinishDate) {
                          startStr = dependency.expectedFinishDate;
                        }
                      }
                      
                      const endStr = act.expectedFinishDate || project.endDate;
                      
                      const startPos = getPosition(startStr);
                      const endPos = getPosition(endStr);
                      const width = Math.max(2, endPos - startPos);

                      return (
                        <div key={act.id} className="flex border-t border-gray-50 hover:bg-gray-50/80 transition group relative">
                          <div className="w-64 flex-shrink-0 border-r border-gray-200 p-3 pl-10 flex flex-col">
                            <span className="font-medium text-[10px] text-gray-500 truncate">
                              {isRtl ? act.nameAr : act.nameEn}
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                              {act.dependsOnActivityId && (
                                <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded flex items-center gap-0.5">
                                  <Clock className="w-2 h-2" />
                                  {isRtl ? 'تبع' : 'Dep'}
                                </span>
                              )}
                              <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                                {progress}%
                              </span>
                            </div>
                          </div>
                          <div className="flex-grow relative h-12 bg-gray-50/20">
                            {/* Dependency Line Connector (Simplified) */}
                            {act.dependsOnActivityId && (
                              <div 
                                className="absolute h-px bg-blue-300 border-dashed border-t"
                                style={{ 
                                  left: 0, 
                                  width: `${startPos}%`,
                                  top: '50%',
                                  opacity: 0.4
                                }}
                              ></div>
                            )}

                            {/* Activity Bar */}
                            <motion.div 
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: `${width}%`, opacity: 1 }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="absolute top-3.5 h-5 bg-white border border-gray-200 rounded shadow-sm overflow-hidden flex items-center group-hover:border-blue-400 transition-colors z-10"
                              style={{ left: `${startPos}%` }}
                            >
                              {/* Progress Fill */}
                              <div 
                                className="absolute inset-y-0 left-0 bg-blue-500/10 border-r border-blue-500/20"
                                style={{ width: `${progress}%` }}
                              ></div>
                              
                              {/* Label */}
                              <div className="relative px-2 flex items-center justify-between w-full">
                                <span className="text-[8px] font-black text-gray-400 truncate uppercase">
                                  {isRtl ? 'مخطط' : 'Planned'}
                                </span>
                                {progress > 0 && (
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                )}
                              </div>
                            </motion.div>

                            {/* Tooltip on hover (simplified as absolute info) */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded px-1.5 py-0.5 shadow-sm flex items-center gap-1 z-10">
                              <Info className="w-2.5 h-2.5 text-gray-400" />
                              <span className="text-[8px] font-bold text-gray-600">{isRtl ? 'التفاصيل' : 'Details'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend / Footer */}
      <div className="bg-gray-50 border-t border-gray-100 p-3 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-200 border border-blue-300 rounded"></div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">{isRtl ? 'نطاق المشروع' : 'Project Scope'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">{isRtl ? 'نشاط مخطط' : 'Planned Activity'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500/10 border border-blue-500/20 rounded"></div>
            <span className="text-[10px] font-bold text-gray-500 uppercase">{isRtl ? 'الإنجاز الفعلي' : 'Actual Progress'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono">
            {minDate.toLocaleDateString()} - {timelineData.maxDate.toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
