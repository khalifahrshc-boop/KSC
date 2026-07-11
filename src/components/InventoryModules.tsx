/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  WarehouseMaterial, 
  EquipmentItem, 
  Worker, 
  UserRole 
} from '../types';
import { 
  Package, 
  Wrench, 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertTriangle, 
  Check, 
  BadgeHelp, 
  SlidersHorizontal, 
  Download, 
  Printer, 
  BadgePercent, 
  CheckCircle,
  X
} from 'lucide-react';

interface InventoryModulesProps {
  lang: 'ar' | 'en';
  t: any;
  materials: WarehouseMaterial[];
  equipment: EquipmentItem[];
  workers: Worker[];
  userRole: UserRole;
  onAddMaterial: (m: WarehouseMaterial) => void;
  onUpdateMaterial: (id: string, updated: Partial<WarehouseMaterial>) => void;
  onDeleteMaterial: (id: string) => void;
  onAddEquipment: (e: EquipmentItem) => void;
  onUpdateEquipment: (id: string, updated: Partial<EquipmentItem>) => void;
  onDeleteEquipment: (id: string) => void;
  onAddWorker: (w: Worker) => void;
  onUpdateWorker: (id: string, updated: Partial<Worker>) => void;
  onDeleteWorker: (id: string) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
  onPrintReport?: (category: 'equipment' | 'labor' | 'inventory', id: string | string[], action: 'print' | 'pdf') => void;
}

export default function InventoryModules({
  lang,
  t,
  materials,
  equipment,
  workers,
  userRole,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onAddEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
  onAddWorker,
  onUpdateWorker,
  onDeleteWorker,
  openConfirm,
  onPrintReport
}: InventoryModulesProps) {
  const isRtl = lang === 'ar';
  const isReadOnly = userRole === 'Viewer';

  // Sub Module layout State
  const [activeTab, setActiveTab] = useState<'materials' | 'equipment' | 'workers'>('materials');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals visibility toggles
  const [isAddMatOpen, setIsAddMatOpen] = useState(false);
  const [isAddEqOpen, setIsAddEqOpen] = useState(false);
  const [isAddWrkOpen, setIsAddWrkOpen] = useState(false);

  // Edit state
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);

  // Selection state for batch printing
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());

  // Helper to toggle selection
  const toggleSelection = (id: string, set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    const newSet = new Set(set);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setter(newSet);
  };

  // --- FORM VALUES STATE ---
  // Material Form
  const [matNameAr, setMatNameAr] = useState('');
  const [matNameEn, setMatNameEn] = useState('');
  const [matCode, setMatCode] = useState('');
  const [matUnit, setMatUnit] = useState('m³');
  const [matQty, setMatQty] = useState(200);
  const [matMin, setMatMin] = useState(50);

  // Equipment Form
  const [eqNameAr, setEqNameAr] = useState('');
  const [eqNameEn, setEqNameEn] = useState('');
  const [eqCode, setEqCode] = useState('');
  const [eqTotal, setEqTotal] = useState(5);
  const [eqStatus, setEqStatus] = useState<'Excellent' | 'Under Maintenance' | 'Available'>('Excellent');
  const [eqLocAr, setEqLocAr] = useState('');
  const [eqLocEn, setEqLocEn] = useState('');

  // Worker Form
  const [wrkName, setWrkName] = useState('');
  const [wrkID, setWrkID] = useState('');
  const [wrkBadge, setWrkBadge] = useState('');
  const [wrkProfAr, setWrkProfAr] = useState('');
  const [wrkProfEn, setWrkProfEn] = useState('');
  const [wrkProd, setWrkProd] = useState(15);
  const [wrkHours, setWrkHours] = useState(8);
  const [wrkSalary, setWrkSalary] = useState(9000);
  const [wrkStatus, setWrkStatus] = useState<Worker['status']>('Active');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- SUBMISSIONS HANDLERS ---
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    
    if (editingMaterialId) {
      onUpdateMaterial(editingMaterialId, {
        nameAr: matNameAr,
        nameEn: matNameEn,
        code: matCode,
        unit: matUnit,
        quantity: Number(matQty),
        minThreshold: Number(matMin)
      });
      setEditingMaterialId(null);
      triggerToast(isRtl ? 'تم تحديث بيانات المادة بنجاح' : 'Material updated successfully');
    } else {
      const newM: WarehouseMaterial = {
        id: `mat-${Date.now()}`,
        nameAr: matNameAr,
        nameEn: matNameEn,
        code: matCode || `MAT-SEC-00${materials.length + 1}`,
        unit: matUnit,
        quantity: Number(matQty),
        reservedStock: 0,
        minThreshold: Number(matMin)
      };
      onAddMaterial(newM);
      triggerToast(isRtl ? 'تم إدخال المادة للمستودع المركزي' : 'Material catalogued into Central database');
    }

    setIsAddMatOpen(false);
  };

  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (editingEquipmentId) {
      onUpdateEquipment(editingEquipmentId, {
        nameAr: eqNameAr,
        nameEn: eqNameEn,
        code: eqCode,
        totalQuantity: Number(eqTotal),
        status: eqStatus,
        locationAr: eqLocAr,
        locationEn: eqLocEn
      });
      setEditingEquipmentId(null);
      triggerToast(isRtl ? 'تم تحديث بيانات المعدة بنجاح' : 'Equipment updated successfully');
    } else {
      const newE: EquipmentItem = {
        id: `eq-${Date.now()}`,
        nameAr: eqNameAr,
        nameEn: eqNameEn,
        code: eqCode || `EQ-SEC-00${equipment.length + 1}`,
        totalQuantity: Number(eqTotal),
        reservedQuantity: 0,
        status: eqStatus,
        locationAr: eqLocAr || 'المستودع الرئيسي',
        locationEn: eqLocEn || 'Main Depot Yard'
      };
      onAddEquipment(newE);
      triggerToast(isRtl ? 'تم قيد وتسجيل المعدة بالأسطول' : 'Heavy machinery logged onto operational registry');
    }
    
    setIsAddEqOpen(false);
  };

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (editingWorkerId) {
      onUpdateWorker(editingWorkerId, {
        fullName: wrkName,
        nationalId: wrkID,
        badgeNumber: wrkBadge,
        professionAr: wrkProfAr,
        professionEn: wrkProfEn,
        dailyProductivity: Number(wrkProd),
        hoursPerDay: Number(wrkHours),
        status: wrkStatus,
        salary: Number(wrkSalary)
      });
      setEditingWorkerId(null);
      triggerToast(isRtl ? 'تم تحديث بيانات الموظف بنجاح' : 'Personnel updated successfully');
    } else {
      const newW: Worker = {
        id: `wrk-${Date.now()}`,
        fullName: wrkName,
        nationalId: wrkID,
        badgeNumber: wrkBadge,
        professionAr: wrkProfAr,
        professionEn: wrkProfEn,
        dailyProductivity: Number(wrkProd),
        hoursPerDay: Number(wrkHours),
        status: wrkStatus,
        salary: Number(wrkSalary)
      };
      onAddWorker(newW);
      triggerToast(isRtl ? 'تم قيد الموظف بقاعدة القوى البشرية' : 'New workforce member enrolled in central registry');
    }
    
    setIsAddWrkOpen(false);
  };

  const handleEditMaterial = (m: WarehouseMaterial) => {
    setEditingMaterialId(m.id);
    setMatNameAr(m.nameAr);
    setMatNameEn(m.nameEn);
    setMatCode(m.code);
    setMatUnit(m.unit);
    setMatQty(m.quantity);
    setMatMin(m.minThreshold);
    setIsAddMatOpen(true);
  };

  const handleEditEquipment = (eq: EquipmentItem) => {
    setEditingEquipmentId(eq.id);
    setEqNameAr(eq.nameAr);
    setEqNameEn(eq.nameEn);
    setEqCode(eq.code);
    setEqTotal(eq.totalQuantity);
    setEqStatus(eq.status);
    setEqLocAr(eq.locationAr);
    setEqLocEn(eq.locationEn);
    setIsAddEqOpen(true);
  };

  const handleEditWorker = (w: Worker) => {
    setEditingWorkerId(w.id);
    setWrkName(w.fullName);
    setWrkID(w.nationalId);
    setWrkBadge(w.badgeNumber);
    setWrkProfAr(w.professionAr);
    setWrkProfEn(w.professionEn);
    setWrkProd(w.dailyProductivity);
    setWrkHours(w.hoursPerDay);
    setWrkSalary(w.salary);
    setWrkStatus(w.status);
    setIsAddWrkOpen(true);
  };

  const openAddMaterial = () => {
    setEditingMaterialId(null);
    setMatNameAr('');
    setMatNameEn('');
    setMatCode('');
    setMatUnit('m³');
    setMatQty(200);
    setMatMin(50);
    setIsAddMatOpen(true);
  };

  const openAddEquipment = () => {
    setEditingEquipmentId(null);
    setEqNameAr('');
    setEqNameEn('');
    setEqCode('');
    setEqTotal(5);
    setEqStatus('Excellent');
    setEqLocAr('');
    setEqLocEn('');
    setIsAddEqOpen(true);
  };

  const openAddWorker = () => {
    setEditingWorkerId(null);
    setWrkName('');
    setWrkID('');
    setWrkBadge('');
    setWrkProfAr('');
    setWrkProfEn('');
    setWrkProd(15);
    setWrkHours(8);
    setWrkSalary(9000);
    setWrkStatus('Active');
    setIsAddWrkOpen(true);
  };

  // CSV spreadsheet downloads
  const downloadSpreadsheet = () => {
    let header = '';
    let rows = '';
    let fileName = '';

    if (activeTab === 'materials') {
      header = 'Code,Material Name,Available Quantity,Unit,Min Threshold,Alert\n';
      rows = materials.map(m => 
        `"${m.code}","${isRtl ? m.nameAr : m.nameEn}",${m.quantity},"${m.unit}",${m.minThreshold},"${m.quantity < m.minThreshold ? 'LOW' : 'SAFE'}"`
      ).join('\n');
      fileName = 'Central_Warehouse_Materials';
    } else if (activeTab === 'equipment') {
      header = 'Code,Machinery AssetName,Total Quantity,Operational Status,Site Location\n';
      rows = equipment.map(e => 
        `"${e.code}","${isRtl ? e.nameAr : e.nameEn}",${e.totalQuantity},"${e.status}","${isRtl ? e.locationAr : e.locationEn}"`
      ).join('\n');
      fileName = 'Heavy_Asset_Fleet';
    } else {
      header = 'Badge ID,Labor Member FullName,Profession,Daily Output,Duty Hours,Wage (SAR),Operational Status\n';
      rows = workers.map(w => 
        `"${w.badgeNumber}","${w.fullName}","${isRtl ? w.professionAr : w.professionEn}",${w.dailyProductivity},${w.hoursPerDay},${w.salary},"${w.status}"`
      ).join('\n');
      fileName = 'Certified_Resource_Workforce';
    }

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(isRtl ? 'تم حفظ ملف الجدول المساعد' : 'Spreadsheet table exported successfully');
  };

  // Dynamic state selectors
  const currentSelectedSet = activeTab === 'materials' ? selectedMaterialIds : activeTab === 'equipment' ? selectedEquipmentIds : selectedWorkerIds;
  const currentSelectedArray = Array.from(currentSelectedSet);

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed bottom-5 ${isRtl ? 'left-5' : 'right-5'} z-50 bg-[#040957] text-white p-3 rounded-xl shadow-2xl flex items-center gap-2 border border-blue-400`}>
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold font-sans">{toastMessage}</span>
        </div>
      )}

      {/* Top Selector Grid Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tab 1: Warehouse */}
        <button
          onClick={() => { setActiveTab('materials'); setSearchTerm(''); }}
          className={`p-4 rounded-2xl border text-right transition-all duration-300 flex items-center justify-between ${activeTab === 'materials' ? 'bg-[#040957] border-[#040957] text-white shadow-lg' : 'bg-white border-gray-200 text-[#040957] hover:shadow-md'}`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-blue-300">{isRtl ? 'قسم المواد الخام واللوجستيات' : 'Central Materials Hub'}</span>
            <h3 className="text-lg font-black font-sans">{t.warehouse}</h3>
            <p className={`text-[10px] ${activeTab === 'materials' ? 'text-blue-100' : 'text-gray-400'}`}>
              {materials.length} {isRtl ? 'أصناف مخزنة' : 'catalogued supplies'}
            </p>
          </div>
          <Package className={`w-10 h-10 ${activeTab === 'materials' ? 'text-blue-200' : 'text-gray-300'}`} />
        </button>

        {/* Tab 2: Equipment */}
        <button
          onClick={() => { setActiveTab('equipment'); setSearchTerm(''); }}
          className={`p-4 rounded-2xl border text-right transition-all duration-300 flex items-center justify-between ${activeTab === 'equipment' ? 'bg-[#040957] border-[#040957] text-white shadow-lg' : 'bg-white border-gray-200 text-[#040957] hover:shadow-md'}`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-blue-300">{isRtl ? 'أسطول الآليات الثقيلة والرافعات' : 'Machinery Logistics Yard'}</span>
            <h3 className="text-lg font-black font-sans">{t.equipment}</h3>
            <p className={`text-[10px] ${activeTab === 'equipment' ? 'text-blue-100' : 'text-gray-400'}`}>
              {equipment.length} {isRtl ? 'أسطول نشط' : 'heavy plant files'}
            </p>
          </div>
          <Wrench className={`w-10 h-10 ${activeTab === 'equipment' ? 'text-blue-200' : 'text-gray-300'}`} />
        </button>

        {/* Tab 3: Workers */}
        <button
          onClick={() => { setActiveTab('workers'); setSearchTerm(''); }}
          className={`p-4 rounded-2xl border text-right transition-all duration-300 flex items-center justify-between ${activeTab === 'workers' ? 'bg-[#040957] border-[#040957] text-white shadow-lg' : 'bg-white border-gray-200 text-[#040957] hover:shadow-md'}`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-blue-300">{isRtl ? 'سجل العمال والمهندسين المسجلين' : 'Certified Resource Registry'}</span>
            <h3 className="text-lg font-black font-sans">{t.workers}</h3>
            <p className={`text-[10px] ${activeTab === 'workers' ? 'text-blue-100' : 'text-gray-400'}`}>
              {workers.length} {isRtl ? 'عمال مسجلين' : 'labor/HR records'}
            </p>
          </div>
          <Users className={`w-10 h-10 ${activeTab === 'workers' ? 'text-blue-200' : 'text-gray-300'}`} />
        </button>
      </div>

      {/* Main Table Panel Box */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        
        {/* Table top header filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-white text-gray-800 rounded-xl text-xs outline-none"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end items-center">
            {/* Batch actions */}
            {currentSelectedSet.size > 0 && (
              <div className="flex items-center gap-1 mr-2 rtl:ml-2 rtl:mr-0 border-r rtl:border-r-0 rtl:border-l border-gray-200 pr-3 rtl:pr-0 rtl:pl-3">
                <span className="text-[10px] font-bold text-gray-500">{currentSelectedSet.size} {isRtl ? 'محدد' : 'Selected'}</span>
                <button 
                  onClick={() => onPrintReport?.(activeTab === 'materials' ? 'inventory' : activeTab === 'equipment' ? 'equipment' : 'labor', currentSelectedArray as string[], 'pdf')}
                  className="bg-emerald-50 border border-emerald-100 p-2 text-emerald-600 rounded-xl hover:bg-emerald-100 transition"
                  title={isRtl ? 'تحميل PDF للمحدد' : 'Download PDF for selected'}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onPrintReport?.(activeTab === 'materials' ? 'inventory' : activeTab === 'equipment' ? 'equipment' : 'labor', currentSelectedArray as string[], 'print')}
                  className="bg-blue-50 border border-blue-100 p-2 text-blue-600 rounded-xl hover:bg-blue-100 transition"
                  title={isRtl ? 'طباعة المحدد' : 'Print selected'}
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Spreadsheet download */}
            <button 
              onClick={downloadSpreadsheet}
              className="bg-gray-50 border border-gray-200 p-2 text-gray-650 rounded-xl hover:text-emerald-600 transition"
              title={isRtl ? 'تحميل تقرير إكسل لجميع المواد' : 'Download spreadsheet layout'}
            >
              <Download className="w-4 h-4" />
            </button>

            {/* ReadOnly Warning / Add Item */}
            {isReadOnly ? (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-bold max-w-xs truncate">
                🛡️ {t.viewer_read_only.slice(0, 40)}...
              </span>
            ) : (
              <button
                onClick={() => {
                  if (activeTab === 'materials') openAddMaterial();
                  else if (activeTab === 'equipment') openAddEquipment();
                  else openAddWorker();
                }}
                className="bg-[#0080FF] text-white hover:bg-[#040957] font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {activeTab === 'materials' ? t.addMaterial : activeTab === 'equipment' ? t.addEquipment : t.addWorker}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* CONDITIONAL COMPONENT 1: WAREHOUSE MATERIALS TABLE */}
        {activeTab === 'materials' && (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase border-b border-gray-100">
                  <th className="p-3">{t.code}</th>
                  <th className="p-3">{t.materialName}</th>
                  <th className="p-3 text-right">{t.availableStock}</th>
                  <th className="p-3 text-right">{t.reservedStock}</th>
                  <th className="p-3 text-right">{t.minThreshold}</th>
                  <th className="p-3 text-center">{t.status}</th>
                  <th className="p-3 text-right w-24">⚙️</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {materials
                  .filter(m => (m.nameAr+m.nameEn+m.code).toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(m => {
                    const isLow = m.quantity < m.minThreshold;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50 transition">
                        <td className="p-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-[#0080FF] focus:ring-[#0080FF]"
                            checked={selectedMaterialIds.has(m.id)}
                            onChange={() => toggleSelection(m.id, selectedMaterialIds, setSelectedMaterialIds)}
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-[#040957]">{m.code}</td>
                        <td className="p-3">
                          <div className="font-bold text-[#040957] font-sans">
                            {isRtl ? m.nameAr : m.nameEn}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-gray-800 font-mono">
                          {m.quantity} {m.unit}
                        </td>
                        <td className="p-3 text-right text-gray-400 font-mono">
                          {m.reservedStock} {m.unit}
                        </td>
                        <td className="p-3 text-right text-gray-400 font-mono">
                          {m.minThreshold} {m.unit}
                        </td>
                        <td className="p-3 text-center">
                          {isLow ? (
                            <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-100 text-[9px] animate-pulse flex items-center gap-1 justify-center max-w-[90px] mx-auto">
                              <AlertTriangle className="w-3 h-3" />
                              {isRtl ? 'شحيح!' : 'Low Stock!'}
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100 text-[9px] flex items-center gap-1 justify-center max-w-[90px] mx-auto">
                              <CheckCircle className="w-3 h-3" />
                              {isRtl ? 'آمن' : 'Safe Stock'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onPrintReport?.('inventory', m.id, 'pdf')}
                              className="text-gray-300 hover:text-emerald-500 transition"
                              title={isRtl ? 'تحميل PDF مباشر' : 'Download Direct PDF'}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onPrintReport?.('inventory', m.id, 'print')}
                              className="text-gray-300 hover:text-[#0080FF] transition"
                              title={isRtl ? 'طباعة مباشرة' : 'Direct Print'}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditMaterial(m)}
                              disabled={isReadOnly}
                              className="text-gray-300 hover:text-[#040957] transition disabled:opacity-30"
                              title={isRtl ? 'تعديل البيانات' : 'Edit Details'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                openConfirm(
                                  t.confirmDelete,
                                  isRtl ? 'هل تريد حذف هذه المادة نهائياً من المستودع؟' : 'Permanently remove this material from warehouse stock?',
                                  () => onDeleteMaterial(m.id)
                                );
                              }}
                              disabled={isReadOnly}
                              className="text-gray-300 hover:text-red-500 transition disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* CONDITIONAL COMPONENT 2: EQUIPMENT FLEET TABLE */}
        {activeTab === 'equipment' && (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase border-b border-gray-100">
                  <th className="p-3 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-[#0080FF] focus:ring-[#0080FF]"
                      checked={equipment.length > 0 && equipment.filter(e => (e.nameAr+e.nameEn+e.code).toLowerCase().includes(searchTerm.toLowerCase())).every(e => selectedEquipmentIds.has(e.id))}
                      onChange={(e) => {
                        const filtered = equipment.filter(eq => (eq.nameAr+eq.nameEn+eq.code).toLowerCase().includes(searchTerm.toLowerCase()));
                        if (e.target.checked) {
                          setSelectedEquipmentIds(new Set(filtered.map(eq => eq.id)));
                        } else {
                          setSelectedEquipmentIds(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="p-3">{t.code}</th>
                  <th className="p-3">{t.equipmentName}</th>
                  <th className="p-3 text-right">{isRtl ? 'الأسطول الكلي' : 'Total Fleet'}</th>
                  <th className="p-3 text-right">{isRtl ? 'المحجوز الفعلي' : 'On Active Duty'}</th>
                  <th className="p-3">{isRtl ? 'الموقع الفني للمعدة' : 'Site allocation'}</th>
                  <th className="p-3 text-center">{t.statusLabel}</th>
                  <th className="p-3 text-right w-24">⚙️</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {equipment
                  .filter(e => (e.nameAr+e.nameEn+e.code).toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(e => {
                    let badgeStyles = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    let statusTxt = isRtl ? 'ممتازة ومتاحة' : 'Excellent available';
                    if (e.status === 'Under Maintenance' || e.totalQuantity === e.reservedQuantity) {
                      badgeStyles = 'bg-amber-50 text-amber-700 border-amber-100';
                      statusTxt = isRtl ? 'قيد الصيانة الدورية' : 'Fleet Active';
                    }

                    return (
                      <tr key={e.id} className="hover:bg-gray-50/50 transition">
                        <td className="p-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-[#0080FF] focus:ring-[#0080FF]"
                            checked={selectedEquipmentIds.has(e.id)}
                            onChange={() => toggleSelection(e.id, selectedEquipmentIds, setSelectedEquipmentIds)}
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-[#040957]">{e.code}</td>
                        <td className="p-3">
                          <div className="font-bold text-[#040957] font-sans">
                            {isRtl ? e.nameAr : e.nameEn}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-gray-800 font-mono">{e.totalQuantity}</td>
                        <td className="p-3 text-right text-[#0080FF] font-mono font-black">{e.reservedQuantity}</td>
                        <td className="p-3 text-gray-500 font-semibold">{isRtl ? e.locationAr : e.locationEn}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase ${badgeStyles}`}>
                            {statusTxt}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onPrintReport?.('equipment', e.id, 'pdf')}
                              className="text-gray-300 hover:text-emerald-500 transition"
                              title={isRtl ? 'تحميل PDF مباشر للمعدة' : 'Download Equipment PDF'}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onPrintReport?.('equipment', e.id, 'print')}
                              className="text-gray-300 hover:text-[#0080FF] transition"
                              title={isRtl ? 'طباعة المعدة' : 'Print Equipment'}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditEquipment(e)}
                              disabled={isReadOnly}
                              className="text-gray-300 hover:text-[#040957] transition disabled:opacity-30"
                              title={isRtl ? 'تعديل البيانات' : 'Edit Details'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                openConfirm(
                                  t.confirmDelete,
                                  isRtl ? 'حذف المعدة من السجل العملياتي؟' : 'Remove equipment from operational registry?',
                                  () => onDeleteEquipment(e.id)
                                );
                              }}
                              disabled={isReadOnly}
                              className="text-gray-300 hover:text-red-500 transition disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* CONDITIONAL COMPONENT 3: CERTIFIED LABORS HR TABLE */}
        {activeTab === 'workers' && (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase border-b border-gray-100">
                  <th className="p-3 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-[#0080FF] focus:ring-[#0080FF]"
                      checked={workers.length > 0 && workers.filter(w => (w.fullName+w.professionEn+w.professionAr+w.badgeNumber).toLowerCase().includes(searchTerm.toLowerCase())).every(w => selectedWorkerIds.has(w.id))}
                      onChange={(e) => {
                        const filtered = workers.filter(w => (w.fullName+w.professionEn+w.professionAr+w.badgeNumber).toLowerCase().includes(searchTerm.toLowerCase()));
                        if (e.target.checked) {
                          setSelectedWorkerIds(new Set(filtered.map(w => w.id)));
                        } else {
                          setSelectedWorkerIds(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="p-3">{t.badgeNumber}</th>
                  <th className="p-3">{t.employeeName}</th>
                  <th className="p-3">{t.profession}</th>
                  <th className="p-3 text-right">{t.dailyProductivity}</th>
                  <th className="p-3 text-right">{t.workingHours}</th>
                  <th className="p-3 text-right">{t.salary}</th>
                  <th className="p-3 text-center">{t.workerStatus}</th>
                  <th className="p-3 text-right w-24">⚙️</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
                {workers
                  .filter(w => (w.fullName+w.professionEn+w.professionAr+w.badgeNumber).toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(w => {
                    let stBadge = 'bg-emerald-50 text-emerald-700';
                    let stTxt = t.active;
                    if (w.status === 'On Leave') {
                      stBadge = 'bg-amber-50 text-amber-700';
                      stTxt = t.onLeave;
                    } else if (w.status === 'Suspended') {
                      stBadge = 'bg-red-50 text-red-700';
                      stTxt = t.suspended;
                    }

                    return (
                      <tr key={w.id} className="hover:bg-gray-50/50 transition">
                        <td className="p-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-[#0080FF] focus:ring-[#0080FF]"
                            checked={selectedWorkerIds.has(w.id)}
                            onChange={() => toggleSelection(w.id, selectedWorkerIds, setSelectedWorkerIds)}
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-gray-600">{w.badgeNumber}</td>
                        <td className="p-3">
                          <div className="font-extrabold text-[#040957] font-sans">{w.fullName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">ID: {w.nationalId}</div>
                        </td>
                        <td className="p-3 text-gray-500 font-bold">
                          {isRtl ? w.professionAr : w.professionEn}
                        </td>
                        <td className="p-3 text-right font-black text-gray-800 font-mono">
                          {w.dailyProductivity} {isRtl ? 'وحدة/يوم' : 'units/day'}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-400">{w.hoursPerDay} hrs</td>
                        <td className="p-3 text-right font-bold text-gray-700 font-mono">
                          {w.salary.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${stBadge}`}>
                            {stTxt}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onPrintReport?.('labor', w.id, 'pdf')}
                              className="text-gray-300 hover:text-emerald-500 transition"
                              title={isRtl ? 'تحميل PDF للموظف' : 'Download Worker PDF'}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onPrintReport?.('labor', w.id, 'print')}
                              className="text-gray-300 hover:text-[#0080FF] transition"
                              title={isRtl ? 'طباعة الموظف' : 'Print Worker'}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditWorker(w)}
                              disabled={isReadOnly}
                              className="text-gray-300 hover:text-[#040957] transition disabled:opacity-30"
                              title={isRtl ? 'تعديل البيانات' : 'Edit Details'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                openConfirm(
                                  t.confirmDelete,
                                  isRtl ? 'إلغاء قيد الموظف نهائياً؟' : 'Permanently unenroll workforce member?',
                                  () => onDeleteWorker(w.id)
                                );
                              }}
                              disabled={isReadOnly}
                              className="text-gray-300 hover:text-red-500 transition disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* MODAL 1: ADD MATERIAL */}
      {isAddMatOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-100 animate-scaleIn">
            <div className="bg-[#040957] text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wide">{editingMaterialId ? (isRtl ? 'تعديل بيانات المادة' : 'Edit Material') : t.addMaterial}</h3>
              <button onClick={() => setIsAddMatOpen(false)} className="text-white hover:opacity-80 p-1"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveMaterial} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">{t.code} *</label>
                <input type="text" value={matCode} onChange={(e)=>setMatCode(e.target.value)} required placeholder="E.g. CMT-C45" className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'الاسم بالعربي' : 'Name (Ar)'} *</label>
                  <input type="text" value={matNameAr} onChange={(e)=>setMatNameAr(e.target.value)} required placeholder="حديد سابك" className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'الاسم بالإنجليزي' : 'Name (En)'} *</label>
                  <input type="text" value={matNameEn} onChange={(e)=>setMatNameEn(e.target.value)} required placeholder="SABIC Rebars" className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">{t.unit}</label>
                  <input type="text" value={matUnit} onChange={(e)=>setMatUnit(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'الكمية' : 'Qty'}</label>
                  <input type="number" value={matQty} onChange={(e)=>setMatQty(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">{t.minThreshold}</label>
                  <input type="number" value={matMin} onChange={(e)=>setMatMin(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setIsAddMatOpen(false)} className="bg-gray-150 py-2 px-3 rounded-lg text-xs font-bold text-gray-600">{t.cancel}</button>
                <button type="submit" className="bg-[#040957] hover:bg-[#0080FF] text-white py-2 px-4 rounded-lg text-xs font-bold transition">{t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD EQUIPMENT */}
      {isAddEqOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-100 animate-scaleIn">
            <div className="bg-[#040957] text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wide">{editingEquipmentId ? (isRtl ? 'تعديل بيانات المعدة' : 'Edit Equipment') : t.addEquipment}</h3>
              <button onClick={() => setIsAddEqOpen(false)} className="text-white hover:opacity-80 p-1"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveEquipment} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">{t.code} *</label>
                <input type="text" value={eqCode} onChange={(e)=>setEqCode(e.target.value)} required placeholder="EQ-CR-05" className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'اسم المعدة (عربي)' : 'Name (Ar)'} *</label>
                  <input type="text" value={eqNameAr} onChange={(e)=>setEqNameAr(e.target.value)} required className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'اسم المعدة (إنجليزي)' : 'Name (En)'} *</label>
                  <input type="text" value={eqNameEn} onChange={(e)=>setEqNameEn(e.target.value)} required className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'الأسطول الكلي' : 'Total Fleet'}</label>
                  <input type="number" value={eqTotal} onChange={(e)=>setEqTotal(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">{t.statusLabel}</label>
                  <select value={eqStatus} onChange={(e)=>setEqStatus(e.target.value as any)} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs bg-white text-gray-700">
                    <option value="Excellent">{t.excellent}</option>
                    <option value="Available">{t.availability}</option>
                    <option value="Under Maintenance">{t.underMaintenance}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setIsAddEqOpen(false)} className="bg-gray-150 py-2 px-3 rounded-lg text-xs font-bold text-gray-600">{t.cancel}</button>
                <button type="submit" className="bg-[#040957] hover:bg-[#0080FF] text-white py-2 px-4 rounded-lg text-xs font-bold transition">{t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD WORKER */}
      {isAddWrkOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-100 animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="bg-[#040957] text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wide">{editingWorkerId ? (isRtl ? 'تعديل بيانات الموظف' : 'Edit Personnel') : t.addWorker}</h3>
              <button onClick={() => setIsAddWrkOpen(false)} className="text-white hover:opacity-80 p-1"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveWorker} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">{t.employeeName} *</label>
                <input type="text" value={wrkName} onChange={(e)=>setWrkName(e.target.value)} required placeholder="Ali Bin Mohammed" className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">{t.nationalId} *</label>
                  <input type="text" value={wrkID} onChange={(e)=>setWrkID(e.target.value)} required className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">{t.badgeNumber} *</label>
                  <input type="text" value={wrkBadge} onChange={(e)=>setWrkBadge(e.target.value)} required className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'المهنة (عربي)' : 'Profession (Ar)'} *</label>
                  <input type="text" value={wrkProfAr} onChange={(e)=>setWrkProfAr(e.target.value)} required className="w-full border border-gray-200 rounded-xl p-2.5 text-xs animate-pulse hover:border-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'المهنة (إنجليزي)' : 'Profession (En)'} *</label>
                  <input type="text" value={wrkProfEn} onChange={(e)=>setWrkProfEn(e.target.value)} required className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'الإنتاجية' : 'Output'}</label>
                  <input type="number" value={wrkProd} onChange={(e)=>setWrkProd(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'الراتب' : 'Salary'}</label>
                  <input type="number" value={wrkSalary} onChange={(e)=>setWrkSalary(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700">{isRtl ? 'الحالة' : 'Status'}</label>
                  <select value={wrkStatus} onChange={(e)=>setWrkStatus(e.target.value as any)} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs bg-white">
                    <option value="Active">{t.active}</option>
                    <option value="On Leave">{t.onLeave}</option>
                    <option value="Suspended">{t.suspended}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setIsAddWrkOpen(false)} className="bg-gray-150 py-2 px-3 rounded-lg text-xs font-bold text-gray-600">{t.cancel}</button>
                <button type="submit" className="bg-[#040957] hover:bg-[#0080FF] text-white py-2 px-4 rounded-lg text-xs font-bold transition">{t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
