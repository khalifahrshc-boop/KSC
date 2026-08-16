import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/UsersList.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /<div className="flex gap-1\.5 flex-wrap">[\s\S]*?getRoleTranslation\(user\.role\)[\s\S]*?<\/div>/m;
const roleDisplayReplacement = `                          <div className="flex gap-1.5 flex-wrap">
                            {(user.roles || []).map((r, i) => (
                              <span key={i} className={\`inline-block border text-[10px] px-2 py-0.5 rounded-md font-bold \${getRoleBadgeColor(r)}\`}>
                                {getRoleTranslation(r)}
                              </span>
                            ))}
                          </div>`;

content = content.replace(regex, roleDisplayReplacement);
fs.writeFileSync(file, content);
console.log("Patched UsersList 2!");
