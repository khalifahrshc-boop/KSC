import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/FieldPortal.tsx');
let content = fs.readFileSync(file, 'utf8');

const filterToReplace = 'workers.filter(w => workerAttendanceState[w.id] ? workerAttendanceState[w.id].isPresent : true)';
const replacement = "workers.filter(w => w.status === 'Active' && projectWorkerIds.has(w.id) && (workerAttendanceState[w.id] ? workerAttendanceState[w.id].isPresent : true))";

content = content.replace(new RegExp(filterToReplace.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), replacement);

fs.writeFileSync(file, content);
console.log("Patched step 3 filter");
