import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/components/UsersList.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /<select[\s\S]*?value=\{formRole\}[\s\S]*?onChange=\{\(e\) => setFormRole\(e\.target\.value as UserRole\)\}[\s\S]*?className="w-full text-xs p-2\.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none transition font-bold"[\s\S]*?>[\s\S]*?\{rolesList\.map\(\(r\) => \([\s\S]*?<option key=\{r\} value=\{r\}>[\s\S]*?\{isRtl \? getRoleTranslation\(r\) : r\}[\s\S]*?<\/option>[\s\S]*?\)\)\}[\s\S]*?<\/select>/m;

const replacement = `<div className="flex flex-wrap gap-2 mt-2">
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
        {isRtl ? getRoleTranslation(r) : r}
      </button>
    );
  })}
</div>`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log("Patched UsersList 4!");
