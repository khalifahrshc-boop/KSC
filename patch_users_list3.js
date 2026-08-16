import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/UsersList.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /<td className="p-3\.5">\s*<span className=\{\`inline-block border text-\[10px\] px-2 py-0\.5 rounded-md font-bold \$\{getRoleBadgeColor\(user\.role\)\}\`\}>\s*\{getRoleTranslation\(user\.role\)\}\s*<\/span>\s*<\/td>/;

const replacement = `<td className="p-3.5">
  <div className="flex gap-1.5 flex-wrap">
    {(user.roles || []).map((r, i) => (
      <span key={i} className={\`inline-block border text-[10px] px-2 py-0.5 rounded-md font-bold \${getRoleBadgeColor(r)}\`}>
        {getRoleTranslation(r)}
      </span>
    ))}
  </div>
</td>`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log("Patched UsersList 3!");
