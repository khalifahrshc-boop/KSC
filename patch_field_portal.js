import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/FieldPortal.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix missing overflow-x-auto
content = content.replace(/<div className="border border-gray-150 rounded-2xl overflow-hidden bg-gray-50\/50">/g, '<div className="border border-gray-150 rounded-2xl overflow-hidden bg-gray-50/50 overflow-x-auto">');

fs.writeFileSync(file, content);
console.log("Patched FieldPortal.tsx");
