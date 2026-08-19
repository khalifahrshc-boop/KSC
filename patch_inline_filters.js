import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/FieldPortal.tsx');
let content = fs.readFileSync(file, 'utf8');

const filter1 = `                      {workers.filter(w => {
                        const isActive = w.status === 'Active';
                        const projectWorkItemIds = workItems.filter(wi => wi.projectId === selectedProjectId).map(wi => wi.id);
                        const projectWorkerIds = new Set<string>();
                        activities
                          .filter(a => projectWorkItemIds.includes(a.workItemId))
                          .forEach(a => a.workerIds.forEach(wid => projectWorkerIds.add(wid)));
                        
                        return isActive && projectWorkerIds.has(w.id);
                      }).map(w => {`;

const newFilter1 = `                      {workers.filter(w => w.status === 'Active' && projectWorkerIds.has(w.id)).map(w => {`;

const filter2 = `workers.filter(w => workerAttendanceState[w.id] ? workerAttendanceState[w.id].isPresent : true)`;
const newFilter2 = `workers.filter(w => w.status === 'Active' && projectWorkerIds.has(w.id) && (workerAttendanceState[w.id] ? workerAttendanceState[w.id].isPresent : true))`;

content = content.replace(filter1, newFilter1);
content = content.replace(new RegExp(filter2.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), newFilter2);

fs.writeFileSync(file, content);
console.log("Patched inline filters");
