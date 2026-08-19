import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/FieldPortal.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldFilter = `                        const supervisedWorkItemIds = workItems.filter(wi => wi.responsiblePerson === supName || activities.some(act => act.workItemId === wi.id && act.supervisorId === supUserId)).map(wi => wi.id);
                        const supervisedWorkerIds = new Set<string>();
                        activities
                          .filter(a => supervisedWorkItemIds.includes(a.workItemId) || a.supervisorId === supUserId)
                          .forEach(a => a.workerIds.forEach(wid => supervisedWorkerIds.add(wid)));
                        
                        return isActive && supervisedWorkerIds.has(w.id);`;

const newFilter = `                        const projectWorkItemIds = workItems.filter(wi => wi.projectId === selectedProjectId).map(wi => wi.id);
                        const projectWorkerIds = new Set<string>();
                        activities
                          .filter(a => projectWorkItemIds.includes(a.workItemId))
                          .forEach(a => a.workerIds.forEach(wid => projectWorkerIds.add(wid)));
                        
                        return isActive && projectWorkerIds.has(w.id);`;

content = content.replace(oldFilter, newFilter);
fs.writeFileSync(file, content);
console.log("Patched workers filter");
