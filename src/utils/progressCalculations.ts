/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity, WorkItem, Project, ProgressUpdate, WarehouseMaterial, AttendanceRecord } from '../types';

/**
 * Calculates the actual progress percentage of a single Activity based on its Progress Updates.
 */
export function getActivityProgress(activity: Activity, progressUpdates: ProgressUpdate[]): number {
  const updates = progressUpdates.filter(upd => upd.activityId === activity.id);
  const totalCompleted = updates.reduce((sum, upd) => sum + (upd.completedQuantity || 0), 0);
  if (!activity.totalQuantity || activity.totalQuantity <= 0) return 0;
  const percentage = (totalCompleted / activity.totalQuantity) * 100;
  return Math.min(100, Math.round(percentage));
}

/**
 * Calculates the actual completed quantity of a single Activity based on its Progress Updates.
 */
export function getActivityCompletedQuantity(activity: Activity, progressUpdates: ProgressUpdate[]): number {
  const updates = progressUpdates.filter(upd => upd.activityId === activity.id);
  return updates.reduce((sum, upd) => sum + (upd.completedQuantity || 0), 0);
}

/**
 * Calculates the actual progress percentage of a single WorkItem based on its nested Activities.
 */
export function getWorkItemProgress(
  workItem: WorkItem, 
  activities: Activity[], 
  progressUpdates: ProgressUpdate[]
): number {
  const wiActivities = activities.filter(act => act.workItemId === workItem.id);
  if (wiActivities.length === 0) return 0;
  const totalActProgress = wiActivities.reduce((sum, act) => sum + getActivityProgress(act, progressUpdates), 0);
  return Math.round(totalActProgress / wiActivities.length);
}

/**
 * Calculates the actual progress percentage of a single Project based on its nested WorkItems.
 */
export function getProjectProgress(
  project: Project, 
  workItems: WorkItem[], 
  activities: Activity[], 
  progressUpdates: ProgressUpdate[]
): number {
  const projWorkItems = workItems.filter(wi => wi.projectId === project.id);
  if (projWorkItems.length === 0) return 0;
  const totalWiProgress = projWorkItems.reduce((sum, wi) => sum + getWorkItemProgress(wi, activities, progressUpdates), 0);
  return Math.round(totalWiProgress / projWorkItems.length);
}

export function getSystemToday(): Date {
  const realNow = new Date();
  if (realNow.getFullYear() === 2026) {
    return realNow;
  }
  return new Date('2026-07-19');
}

/**
 * Calculates the planned progress percentage of a single Project based on its schedule timeline.
 */
export function getProjectPlannedProgress(project: Project): number {
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  const now = getSystemToday().getTime();
  
  if (now <= start) return 0;
  if (now >= end) return 100;
  
  const total = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

/**
 * Determines the operational status of an activity based on deadlines, progress, and resources.
 */
export function getActivityStatus(
  activity: Activity,
  progressUpdates: ProgressUpdate[],
  materials: WarehouseMaterial[],
  project?: Project,
  allActivities?: Activity[]
): { status: 'On Track' | 'Delayed' | 'Completed' | 'Ahead'; reason?: string } {
  const progress = getActivityProgress(activity, progressUpdates);
  if (progress >= 100) return { status: 'Completed' };

  const now = new Date();
  const deadline = activity.expectedFinishDate ? new Date(activity.expectedFinishDate) : null;

  // 1. Deadline Check
  if (deadline && now > deadline) {
    return { status: 'Delayed', reason: 'Past Deadline' };
  }

  // 2. Resource Check (Operational Integration - Inventory)
  const linkedMaterials = materials.filter(m => activity.materialIds.includes(m.id));
  const lowStock = linkedMaterials.some(m => m.quantity < m.minThreshold);
  if (lowStock) {
    return { status: 'Delayed', reason: 'Material Shortage' };
  }

  // 3. Dynamic Progress-to-Schedule Comparison
  if (project) {
    let startStr = project.startDate;
    if (activity.dependsOnActivityId && allActivities) {
      const dep = allActivities.find(a => a.id === activity.dependsOnActivityId);
      if (dep && dep.expectedFinishDate) {
        startStr = dep.expectedFinishDate;
      }
    }
    const endStr = activity.expectedFinishDate || project.endDate;

    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();

    const nowTime = getSystemToday().getTime();

    if (nowTime > start) {
      const total = end - start;
      if (total > 0) {
        const elapsed = nowTime - start;
        const plannedProgress = Math.min(100, Math.round((elapsed / total) * 100));

        if (progress > plannedProgress + 5) {
          return { status: 'Ahead' };
        } else if (progress < plannedProgress - 5) {
          return { status: 'Delayed', reason: 'Behind Schedule' };
        }
      }
    }
  }

  return { status: 'On Track' };
}

/**
 * Aggregates operational data for a project to provide a high-level status.
 */
export function getProjectStatusDetails(
  project: Project,
  workItems: WorkItem[],
  activities: Activity[],
  progressUpdates: ProgressUpdate[],
  attendance: AttendanceRecord[],
  materials: WarehouseMaterial[]
): { 
  status: 'Ahead' | 'On Track' | 'Delayed'; 
  reasons: string[]; 
  progress: number;
  planned: number;
} {
  const actual = getProjectProgress(project, workItems, activities, progressUpdates);
  const planned = getProjectPlannedProgress(project);
  const reasons: string[] = [];

  // 1. Progress Lag
  if (actual < planned - 5) {
    reasons.push('Progress lagging behind schedule');
  }

  // 2. Attendance Check (Operational Integration - HR)
  const projectAttendance = attendance.filter(r => r.projectId === project.id);
  if (projectAttendance.length > 0) {
    const presentCount = projectAttendance.filter(r => r.isPresent).length;
    const rate = (presentCount / projectAttendance.length) * 100;
    if (rate < 75) {
      reasons.push(`Low workforce attendance (${Math.round(rate)}%)`);
    }
  }

  // 3. Activity Level Delays
  const projectActivities = activities.filter(act => 
    workItems.some(wi => wi.id === act.workItemId && wi.projectId === project.id)
  );
  
  const delayedActs = projectActivities.filter(act => {
    const s = getActivityStatus(act, progressUpdates, materials, project, activities);
    return s.status === 'Delayed';
  });

  if (delayedActs.length > 0) {
    reasons.push(`${delayedActs.length} active activities are delayed`);
  }

  // 4. Critical Activity Delays (Crucial constraint: delay in critical activity delays project delivery)
  const delayedCriticalActs = projectActivities.filter(act => 
    act.isCritical && getActivityStatus(act, progressUpdates, materials, project, activities).status === 'Delayed'
  );

  delayedCriticalActs.forEach(act => {
    reasons.push(`Critical activity "${act.nameEn}" is delayed! This automatically postpones project delivery.`);
  });

  const hasDelayedCritical = delayedCriticalActs.length > 0;
  const status = (actual >= planned - 2 && !hasDelayedCritical) ? (actual > planned + 5 ? 'Ahead' : 'On Track') : 'Delayed';

  return { status, reasons, progress: actual, planned };
}

/**
 * Calculates the actual progress of a project at a specific point in time.
 */
export function getProjectProgressAtDate(
  project: Project, 
  workItems: WorkItem[], 
  activities: Activity[], 
  progressUpdates: ProgressUpdate[],
  targetDate: Date
): number {
  const filteredUpdates = progressUpdates.filter(upd => new Date(upd.timestamp) <= targetDate);
  return getProjectProgress(project, workItems, activities, filteredUpdates);
}

/**
 * Calculates the planned progress of a project at a specific point in time.
 */
export function getProjectPlannedProgressAtDate(project: Project, targetDate: Date): number {
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  const now = targetDate.getTime();
  
  if (now <= start) return 0;
  if (now >= end) return 100;
  
  const total = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

/**
 * Backfills activities with schedule properties (plannedDailyProduction, expectedDurationDays, expectedFinishDate)
 * based on assigned workers and work items dependencies.
 */
export function backfillActivities(
  activities: Activity[],
  workers: any[],
  workItems: any[],
  projects: any[]
): Activity[] {
  const result = activities.map(act => ({ ...act }));
  
  for (let iter = 0; iter < 5; iter++) {
    let changed = false;
    for (const act of result) {
      if (!act.expectedFinishDate || !act.plannedDailyProduction || !act.expectedDurationDays) {
        const activeWorkers = workers.filter(w => act.workerIds.includes(w.id));
        const sumProductivity = activeWorkers.reduce((acc, curr) => acc + (curr.dailyProductivity || 0), 0) || 5;
        const expectedDurationDays = Math.ceil(act.totalQuantity / sumProductivity);
        
        const wi = workItems.find(w => w.id === act.workItemId);
        const proj = projects.find(p => p.id === wi?.projectId);
        
        let startStr = proj ? proj.startDate : '2026-01-10';
        if (act.dependsOnActivityId) {
          const dep = result.find(a => a.id === act.dependsOnActivityId);
          if (dep && dep.expectedFinishDate) {
            startStr = dep.expectedFinishDate;
          }
        }
        
        const expectedFinish = new Date(startStr);
        expectedFinish.setDate(expectedFinish.getDate() + expectedDurationDays);
        const expectedFinishDateStr = expectedFinish.toISOString().split('T')[0];
        
        if (!act.plannedDailyProduction) act.plannedDailyProduction = sumProductivity;
        if (!act.expectedDurationDays) act.expectedDurationDays = expectedDurationDays;
        if (!act.expectedFinishDate) act.expectedFinishDate = expectedFinishDateStr;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return result;
}

