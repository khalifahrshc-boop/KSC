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

/**
 * Calculates the planned progress percentage of a single Project based on its schedule timeline.
 */
export function getProjectPlannedProgress(project: Project): number {
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  // Align 'now' with the actual current date, but clamp to 2026-12-25 to prevent future years drift
  const realNow = new Date().getTime();
  const anchorTime = new Date('2026-06-25').getTime();
  const now = realNow > anchorTime ? Math.min(realNow, new Date('2026-12-25').getTime()) : anchorTime;
  
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
  materials: WarehouseMaterial[]
): { status: 'On Track' | 'Delayed' | 'Completed'; reason?: string } {
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
    const s = getActivityStatus(act, progressUpdates, materials);
    return s.status === 'Delayed';
  });

  if (delayedActs.length > 0) {
    reasons.push(`${delayedActs.length} active activities are delayed`);
  }

  const status = (actual >= planned - 2) ? (actual > planned + 5 ? 'Ahead' : 'On Track') : 'Delayed';

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

