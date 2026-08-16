import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/App.tsx');
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /\{\/\* MOBILE SIDEBAR PANEL DRAWER BACKDROP \*\/\}[\s\S]*?<div className="flex flex-col gap-1">/;

const replacement = `        {/* MOBILE SIDEBAR PANEL DRAWER BACKDROP */}
        {isSidebarMobileOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsSidebarMobileOpen(false)}></div>
            <div 
              className={\`fixed top-0 bottom-0 \${lang === 'ar' ? 'right-0' : 'left-0'} w-[280px] p-5 flex flex-col \${darkMode ? 'bg-[#FAF6F0]' : 'bg-white'} animate-slideIn shadow-2xl z-[101]\`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-4 mb-4 border-b shrink-0">
                <span className="font-black text-[#040957]">{lang === 'ar' ? 'القائمة الرئيسية' : 'Quick Navigation'}</span>
                <button onClick={() => setIsSidebarMobileOpen(false)} className="text-gray-400 p-2 -mr-2"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto flex-1 pb-10">`;

content = content.replace(targetRegex, replacement);
fs.writeFileSync(file, content);
console.log("Patched!");
