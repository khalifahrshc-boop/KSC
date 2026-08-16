import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/UsersList.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const \[formRole, setFormRole\] = useState<UserRole>\('Viewer'\);/g, "const [formRoles, setFormRoles] = useState<UserRole[]>(['Viewer']);");

content = content.replace(/setFormRole\(user\.role\);/g, "setFormRoles(user.roles || ['Viewer']);");

content = content.replace(/role: formRole/g, "roles: formRoles");

content = content.replace(/currentUser\.role === 'Super Admin'/g, "currentUser.roles?.includes('Super Admin')");

content = content.replace(/u\.role\.toLowerCase\(\)\.includes/g, "u.roles?.join(', ').toLowerCase().includes");

const roleDisplayTarget = `                          <div className="flex gap-1.5 flex-wrap">
                            <span className={\`inline-block border text-[10px] px-2 py-0.5 rounded-md font-bold \${getRoleBadgeColor(user.role)}\`}>
                              {getRoleTranslation(user.role)}
                            </span>
                          </div>`;
const roleDisplayReplacement = `                          <div className="flex gap-1.5 flex-wrap">
                            {(user.roles || []).map((r, i) => (
                              <span key={i} className={\`inline-block border text-[10px] px-2 py-0.5 rounded-md font-bold \${getRoleBadgeColor(r)}\`}>
                                {getRoleTranslation(r)}
                              </span>
                            ))}
                          </div>`;
content = content.replace(roleDisplayTarget, roleDisplayReplacement);

const selectTarget = `                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none transition font-bold"
                    >
                      {rolesList.map((r) => (
                        <option key={r} value={r}>
                          {getRoleTranslation(r)}
                        </option>
                      ))}
                    </select>`;

const selectReplacement = `                    <div className="flex flex-wrap gap-2 mt-2">
                      {rolesList.map((r) => {
                        const isSelected = formRoles.includes(r);
                        return (
                          <button
                            type="button"
                            key={r}
                            onClick={() => {
                              if (isSelected) {
                                if (formRoles.length > 1) {
                                  setFormRoles(formRoles.filter(role => role !== r));
                                }
                              } else {
                                setFormRoles([...formRoles, r]);
                              }
                            }}
                            className={\`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all \${
                              isSelected ? getRoleBadgeColor(r) : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                            }\`}
                          >
                            {getRoleTranslation(r)}
                          </button>
                        );
                      })}
                    </div>`;
content = content.replace(selectTarget, selectReplacement);

content = content.replace(/<span className="block text-gray-400 text-xs mt-0.5">\{getRoleTranslation\(user\.role\)\}<\/span>/g, `<span className="block text-gray-400 text-xs mt-0.5">{(user.roles || []).map(r => getRoleTranslation(r)).join(' | ')}</span>`);

content = content.replace(/currentUser\.role === role \?/g, "currentUser.roles?.includes(role) ?");
content = content.replace(/currentUser\.role === role &&/g, "currentUser.roles?.includes(role) &&");

fs.writeFileSync(file, content);
console.log("Patched UsersList!");
