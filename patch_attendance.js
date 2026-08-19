import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/FieldPortal.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix worker attendance default state issue in step 3
content = content.replace(/workers\.filter\(w => workerAttendanceState\[w\.id\]\?\.isPresent\)/g, 'workers.filter(w => workerAttendanceState[w.id] ? workerAttendanceState[w.id].isPresent : true)');

fs.writeFileSync(file, content);
console.log("Patched workerAttendanceState usage");
