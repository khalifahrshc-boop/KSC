import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/App.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix Header padding
content = content.replace(/px-6 py-4 flex items-center justify-between border-b/g, 'px-3 py-3 md:px-6 md:py-4 flex items-center justify-between border-b');

// Fix company name text visibility on mobile
content = content.replace(/<div>\s*<h1 className="text-sm font-black text-\[#040957\] hover:text-\[#0080FF\] transition tracking-tight">/g, '<div className="hidden sm:block">\n              <h1 className="text-sm font-black text-[#040957] hover:text-[#0080FF] transition tracking-tight">');

// Fix Sandbox button text on mobile
content = content.replace(/<span className="text-\[#040957\] font-black">\{currentUser\.roles\?\.join\(\', \'\)\}<\/span>/g, '<span className="text-[#040957] font-black hidden sm:inline">{currentUser.roles?.join(\', \')}</span>');

// Change Main Body padding
content = content.replace(/<main className=\{\`flex-1 p-6 md:p-8/g, '<main className={`flex-1 p-4 md:p-8');

fs.writeFileSync(file, content);
console.log("Patched App.tsx");
