import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/FieldPortal.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldWorkItems = `  const projectWorkItems = workItems.filter(wi => 
    wi.projectId === selectedProjectId && 
    (wi.responsiblePerson === supName || activities.some(act => act.workItemId === wi.id && act.supervisorId === supUserId))
  );`;

const newWorkItems = `  const projectWorkItems = workItems.filter(wi => 
    wi.projectId === selectedProjectId
  );`;

const oldActivities = `  const itemActivities = activities.filter(act => 
    act.workItemId === (currentWorkItem?.id || '') &&
    (!supUserId || act.supervisorId === supUserId || currentWorkItem?.responsiblePerson === supName)
  );`;

const newActivities = `  const itemActivities = activities.filter(act => 
    act.workItemId === (currentWorkItem?.id || '')
  );`;

content = content.replace(oldWorkItems, newWorkItems);
content = content.replace(oldActivities, newActivities);

fs.writeFileSync(file, content);
console.log("Patched projectWorkItems and itemActivities");
