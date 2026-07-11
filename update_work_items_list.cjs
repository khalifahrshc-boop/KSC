const fs = require('fs');
let code = fs.readFileSync('src/components/WorkItemsList.tsx', 'utf8');

// 1. Add states
code = code.replace(
  "const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);",
  `const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [materialAllocations, setMaterialAllocations] = useState<{id: string, quantity: number}[]>([]);
  const [equipmentAllocations, setEquipmentAllocations] = useState<{id: string, quantity: number}[]>([]);`
);

// 2. Add to newAct
code = code.replace(
  "equipmentIds: selectedEquipmentIds,",
  `equipmentIds: selectedEquipmentIds,
      materialAllocations: materialAllocations,
      equipmentAllocations: equipmentAllocations,`
);

// 3. Clear states on open modal
code = code.replace(
  "setSelectedEquipmentIds([]);",
  `setSelectedEquipmentIds([]);
      setMaterialAllocations([]);
      setEquipmentAllocations([]);`
);

// 4. Update material render
const materialOldRender = `{materials.map(m => {
                      const active = selectedMaterialIds.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={active}
                            onChange={() => {
                              setSelectedMaterialIds(active ? selectedMaterialIds.filter(id => id !== m.id) : [...selectedMaterialIds, m.id]);
                            }}
                          />
                          <span className="truncate">{isRtl ? m.nameAr : m.nameEn}</span>
                        </label>
                      );
                    })}`;

const materialNewRender = `{materials.map(m => {
                      const active = selectedMaterialIds.includes(m.id);
                      const alloc = materialAllocations.find(a => a.id === m.id);
                      return (
                        <div key={m.id} className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={active}
                              onChange={() => {
                                if (active) {
                                  setSelectedMaterialIds(selectedMaterialIds.filter(id => id !== m.id));
                                  setMaterialAllocations(materialAllocations.filter(a => a.id !== m.id));
                                } else {
                                  setSelectedMaterialIds([...selectedMaterialIds, m.id]);
                                  setMaterialAllocations([...materialAllocations, { id: m.id, quantity: 1 }]);
                                }
                              }}
                            />
                            <span className="truncate">{isRtl ? m.nameAr : m.nameEn} ({m.unit})</span>
                          </label>
                          {active && (
                            <input
                              type="number"
                              min="1"
                              className="border border-gray-200 rounded px-1.5 py-0.5 text-[10px] w-full"
                              placeholder={isRtl ? 'الكمية المطلوبة' : 'Required Qty'}
                              value={alloc?.quantity || ''}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setMaterialAllocations(prev => {
                                  const existing = prev.find(p => p.id === m.id);
                                  if (existing) {
                                    return prev.map(p => p.id === m.id ? { ...p, quantity: val } : p);
                                  }
                                  return [...prev, { id: m.id, quantity: val }];
                                });
                              }}
                            />
                          )}
                        </div>
                      );
                    })}`;

code = code.replace(materialOldRender, materialNewRender);

// 5. Update equipment render
const equipmentOldRender = `{equipment.map(e => {
                      const active = selectedEquipmentIds.includes(e.id);
                      return (
                        <label key={e.id} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={active}
                            onChange={() => {
                              setSelectedEquipmentIds(active ? selectedEquipmentIds.filter(id => id !== e.id) : [...selectedEquipmentIds, e.id]);
                            }}
                          />
                          <span className="truncate">{isRtl ? e.nameAr : e.nameEn}</span>
                        </label>
                      );
                    })}`;

const equipmentNewRender = `{equipment.map(e => {
                      const active = selectedEquipmentIds.includes(e.id);
                      const alloc = equipmentAllocations.find(a => a.id === e.id);
                      return (
                        <div key={e.id} className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={active}
                              onChange={() => {
                                if (active) {
                                  setSelectedEquipmentIds(selectedEquipmentIds.filter(id => id !== e.id));
                                  setEquipmentAllocations(equipmentAllocations.filter(a => a.id !== e.id));
                                } else {
                                  setSelectedEquipmentIds([...selectedEquipmentIds, e.id]);
                                  setEquipmentAllocations([...equipmentAllocations, { id: e.id, quantity: 1 }]);
                                }
                              }}
                            />
                            <span className="truncate">{isRtl ? e.nameAr : e.nameEn}</span>
                          </label>
                          {active && (
                            <input
                              type="number"
                              min="1"
                              className="border border-gray-200 rounded px-1.5 py-0.5 text-[10px] w-full"
                              placeholder={isRtl ? 'الكمية المطلوبة' : 'Required Qty'}
                              value={alloc?.quantity || ''}
                              onChange={ev => {
                                const val = Number(ev.target.value);
                                setEquipmentAllocations(prev => {
                                  const existing = prev.find(p => p.id === e.id);
                                  if (existing) {
                                    return prev.map(p => p.id === e.id ? { ...p, quantity: val } : p);
                                  }
                                  return [...prev, { id: e.id, quantity: val }];
                                });
                              }}
                            />
                          )}
                        </div>
                      );
                    })}`;

code = code.replace(equipmentOldRender, equipmentNewRender);

fs.writeFileSync('src/components/WorkItemsList.tsx', code);
console.log('Done WorkItemsList');
