import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/KPIDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace potentially cramped grids with responsive ones
content = content.replace(/className="grid grid-cols-2 gap-4"/g, 'className="grid grid-cols-1 md:grid-cols-2 gap-4"');
content = content.replace(/className="grid grid-cols-2 gap-y-4 gap-x-12 text-left"/g, 'className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 text-left"');
content = content.replace(/className="grid grid-cols-4 gap-2 mb-8"/g, 'className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8"');
content = content.replace(/className="grid grid-cols-1 lg:grid-cols-2 gap-6"/g, 'className="grid grid-cols-1 lg:grid-cols-2 gap-6"');

fs.writeFileSync(file, content);
console.log("Patched KPIDashboard.tsx grids");
