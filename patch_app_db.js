import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/App.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /setUsers\(dbUsers\);/g;
const replacement = `// Migrate old user records
        dbUsers.forEach(u => {
          if ((u as any).role && !u.roles) {
            u.roles = [(u as any).role];
          }
          if (!u.roles) u.roles = ['Viewer'];
        });
        setUsers(dbUsers);`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log("Patched App.tsx dbUsers!");
