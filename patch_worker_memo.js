import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/FieldPortal.tsx');
let content = fs.readFileSync(file, 'utf8');

const hookBlock = `  const itemActivities = activities.filter(act => 
    act.workItemId === (currentWorkItem?.id || '')
  );`;

const hookBlockWithWorkers = `  const itemActivities = activities.filter(act => 
    act.workItemId === (currentWorkItem?.id || '')
  );

  const projectWorkerIds = React.useMemo(() => {
    const pwiIds = workItems.filter(wi => wi.projectId === selectedProjectId).map(wi => wi.id);
    const workerSet = new Set<string>();
    activities
      .filter(a => pwiIds.includes(a.workItemId))
      .forEach(a => a.workerIds.forEach(wid => workerSet.add(wid)));
    return workerSet;
  }, [selectedProjectId, workItems, activities]);`;

content = content.replace(hookBlock, hookBlockWithWorkers);
fs.writeFileSync(file, content);
console.log("Added projectWorkerIds memo");
