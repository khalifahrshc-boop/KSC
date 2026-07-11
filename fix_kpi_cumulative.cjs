const fs = require('fs');
let code = fs.readFileSync('src/components/KPIDashboard.tsx', 'utf8');

const targetDailyTargetStr = `  const totalDailyTarget = useMemo(() => {
    return filteredActivities.reduce((acc, act) => {
      const wi = workItems.find(w => w.id === act.workItemId);
      if (!wi) return acc;
      const proj = projects.find(p => p.id === wi.projectId);
      if (!proj) return acc;
      
      // Check if project is active today
      const start = new Date(proj.startDate);
      const end = new Date(proj.endDate);
      if (sysNow < start || sysNow > end) return acc;

      // Sum of worker's daily productivity assigned to this activity
      const activeWorkers = workers.filter(w => act.workerIds.includes(w.id));
      const sumProductivity = activeWorkers.reduce((wAcc, curr) => wAcc + (curr.dailyProductivity || 0), 0);
      
      return acc + (sumProductivity || 10); // Baseline fallback
    }, 0);
  }, [filteredActivities, workItems, projects, workers, sysNow]);`;

const replaceDailyTargetStr = `  const totalDailyTarget = useMemo(() => {
    return filteredActivities.reduce((acc, act) => {
      const wi = workItems.find(w => w.id === act.workItemId);
      if (!wi) return acc;
      const proj = projects.find(p => p.id === wi.projectId);
      if (!proj) return acc;
      
      const start = new Date(proj.startDate);
      const end = new Date(proj.endDate);
      if (sysNow < start || sysNow > end) return acc;

      if (act.plannedDailyProduction && act.plannedDailyProduction > 0) {
        return acc + act.plannedDailyProduction;
      }
      
      const activeWorkers = workers.filter(w => act.workerIds.includes(w.id));
      const sumProductivity = activeWorkers.reduce((wAcc, curr) => wAcc + (curr.dailyProductivity || 0), 0);
      return acc + sumProductivity;
    }, 0);
  }, [filteredActivities, workItems, projects, workers, sysNow]);`;

code = code.replace(targetDailyTargetStr, replaceDailyTargetStr);

const targetProductivityStr = `  const dailyProductivityPercentage = useMemo(() => {
    if (totalDailyTarget === 0) return 0;
    return Math.round((totalActualToday / totalDailyTarget) * 100);
  }, [totalActualToday, totalDailyTarget]);`;

const replaceProductivityStr = `  const dailyProductivityPercentage = useMemo(() => {
    const dailyWorkingHours = 10;
    let maxHour = 7;
    todayUpdates.forEach(u => {
      const d = new Date(u.timestamp);
      if (d.getHours() > maxHour) {
        maxHour = d.getHours();
      }
    });
    
    const hoursElapsed = Math.max(0, Math.min(dailyWorkingHours, maxHour - 7));
    const cumulativeTargetToDate = totalDailyTarget * (hoursElapsed / dailyWorkingHours);
    
    if (cumulativeTargetToDate === 0) return 0;
    return Math.round((totalActualToday / cumulativeTargetToDate) * 100);
  }, [totalActualToday, totalDailyTarget, todayUpdates]);`;

code = code.replace(targetProductivityStr, replaceProductivityStr);

fs.writeFileSync('src/components/KPIDashboard.tsx', code);
console.log('Fixed KPI cumulative logic');
