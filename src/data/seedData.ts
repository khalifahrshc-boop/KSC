/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Project, 
  WorkItem, 
  Activity, 
  WarehouseMaterial, 
  EquipmentItem, 
  Worker, 
  SystemSettings, 
  SystemNotification, 
  AuditLog,
  User,
  ProgressUpdate,
  SafetyRecord,
  DelayRecord,
  IssueReport,
  AttendanceRecord
} from '../types';

export const mockUsers: User[] = [
  { id: 'usr-1', name: 'Mishaal Al-Sudairi', role: 'Super Admin', email: 'mishaal@sudairicorp.com', badgeNumber: 'EMP-9901' },
  { id: 'usr-2', name: 'Khalid Bin Abdulaziz', role: 'Project Manager', email: 'khalid@sudairicorp.com', badgeNumber: 'EMP-4412' },
  { id: 'usr-3', name: 'Yousef Al-Harbi', role: 'Site Supervisor', email: 'yousef@sudairicorp.com', badgeNumber: 'EMP-8854' },
  { id: 'usr-4', name: 'Majed Al-Ghamdi', role: 'Warehouse Manager', email: 'majed@sudairicorp.com', badgeNumber: 'EMP-2210' },
  { id: 'usr-5', name: 'Faisal Al-Otaibi', role: 'Viewer', email: 'faisal@sudairicorp.com', badgeNumber: 'EMP-1102' }
];

export const seedProjects: Project[] = [
  {
    id: 'proj-1',
    projectNumber: 'PRJ-2026-001',
    nameAr: 'مترو الرياض - مسار قطار العليا 4A',
    nameEn: 'Riyadh Metro - Olaya Line 4A Trackway',
    clientAr: 'الهيئة الملكية لمدينة الرياض',
    clientEn: 'Royal Commission for Riyadh City',
    locationAr: 'العليا، تقاطع الملك فهد، الرياض',
    locationEn: 'Olaya, King Fahd Junction, Riyadh',
    startDate: '2026-01-10',
    endDate: '2026-12-25',
    projectManager: 'Eng. Khalid Bin Abdulaziz',
    status: 'On Track',
    budget: 450000000
  },
  {
    id: 'proj-2',
    projectNumber: 'PRJ-2026-002',
    nameAr: 'نيوم - محطة الهيدروجين الأخضر للأعمدة الكبرى',
    nameEn: 'NEOM - Green Hydrogen Plant Piling Structure',
    clientAr: 'شركة نيوم للتقنية والمياه',
    clientEn: 'NEOM Tech & Energy Holding',
    locationAr: 'المنطقة الصناعية (أوكساجون)، تبوك',
    locationEn: 'Oxagon Industrial Zone, Tabuk',
    startDate: '2026-02-15',
    endDate: '2026-09-30',
    projectManager: 'Eng. Faisal Saud Al-Ahmed',
    status: 'Ahead',
    budget: 820000000
  },
  {
    id: 'proj-3',
    projectNumber: 'PRJ-2026-003',
    nameAr: 'توسعة ميناء جدة الإسلامي - الرصيف رقم ٩',
    nameEn: 'Jeddah Islamic Port Expansion - Berth No. 9',
    clientAr: 'الهيئة العامة للموانئ (موانئ)',
    clientEn: 'Saudi Ports Authority (Mawani)',
    locationAr: 'منطقة الموانئ البحرية، جدة',
    locationEn: 'Maritime Core Coastline, Jeddah',
    startDate: '2025-11-01',
    endDate: '2026-08-15',
    projectManager: 'Eng. Tareq Bin Al-Waleed',
    status: 'Delayed',
    budget: 290000000
  }
];

export const seedWorkItems: WorkItem[] = [
  // Riyadh Metro (proj-1)
  {
    id: 'wi-101',
    projectId: 'proj-1',
    itemNumber: 'WI-RYD-001',
    nameAr: 'أعمال الحفر وتشييد الأساسات العميقة',
    nameEn: 'Excavation & Deep Piling Construction',
    workType: 'Primary',
    responsiblePerson: 'Lead Sup. Yousef Al-Harbi'
  },
  {
    id: 'wi-102',
    projectId: 'proj-1',
    itemNumber: 'WI-RYD-002',
    nameAr: 'صب الجسور العلوية سابقة الصب',
    nameEn: 'Precast Segmental Viaduct Girder Casting',
    workType: 'Primary',
    responsiblePerson: 'Lead Sup. Hassan Mahmoud'
  },
  {
    id: 'wi-103',
    projectId: 'proj-1',
    itemNumber: 'WI-RYD-003',
    nameAr: 'تمديدات كابلات الجهد العالي والتحكم',
    nameEn: 'High-Voltage Traction & Control Cable Layout',
    workType: 'Secondary',
    responsiblePerson: 'Lead Sup. Amin Al-Garni'
  },

  // Neom Hydrogen (proj-2)
  {
    id: 'wi-201',
    projectId: 'proj-2',
    itemNumber: 'WI-NEO-001',
    nameAr: 'صب الخوازيق الفولاذية للمحولات الضخمة',
    nameEn: 'Heavy Transformer Steel Foundation Piles',
    workType: 'Primary',
    responsiblePerson: 'Lead Sup. Yahya Al-Najjar'
  },
  {
    id: 'wi-202',
    projectId: 'proj-2',
    itemNumber: 'WI-NEO-002',
    nameAr: 'تجهيز الهياكل المعدنية المقاومة للحرائق',
    nameEn: 'Fire-Resistant Structural Steel Framework',
    workType: 'Primary',
    responsiblePerson: 'Lead Sup. Ahmed Al-Malki'
  },

  // Jeddah Port (proj-3)
  {
    id: 'wi-301',
    projectId: 'proj-3',
    itemNumber: 'WI-JED-001',
    nameAr: 'حاجز الأمواج البحري الجنوبي والخراسانات العائمة',
    nameEn: 'South Marine Breakwater & Floating Blocks',
    workType: 'Primary',
    responsiblePerson: 'Lead Sup. Khalid Al-Amri'
  }
];

export const seedActivities: Activity[] = [
  // For Riyadh Metro - Excavation & Deep Piling (wi-101)
  {
    id: 'act-1011',
    workItemId: 'wi-101',
    nameAr: 'حفر خوازيق بعمق ٢٤ متراً وتدعيم الجوانب',
    nameEn: '24m Bored Pile Drilling & Trench Support',
    totalQuantity: 240,
    unit: 'm', // linear meters
    descriptionAr: 'حفر خوازيق خرسانية مسلحة لتدعيم الجدار الاستنادي المحيط بمسار قطار الأنفاق الرئيسي بالموقع الفرعي 14-B',
    descriptionEn: 'Drilling reinforced concrete bored piles to preserve the retaining wall alongside Sub-Station 14-B trackway',
    materialIds: ['mat-1', 'mat-2'],
    equipmentIds: ['eq-1', 'eq-2'],
    workerIds: ['wrk-1', 'wrk-2']
  },
  {
    id: 'act-1012',
    workItemId: 'wi-101',
    nameAr: 'صب الخرسانة المقاومة للكبريتات في أساس الدعامة',
    nameEn: 'Sulfate-Resistant Concrete Pouring for Piers',
    totalQuantity: 1800,
    unit: 'm³', // cubic meters
    descriptionAr: 'صب مباشر بإستخدام مضخات ٤٢ متر للخرسانة الجاهزة عيار ٤٥٠ مقاوم للكبريتات',
    descriptionEn: 'Continuous pouring of Sulphate Resistant ready-mix cement grade C45 using 42m boom pumps',
    materialIds: ['mat-1', 'mat-3'],
    equipmentIds: ['eq-4'],
    workerIds: ['wrk-1', 'wrk-3']
  },

  // Riyadh Metro - Precast Girders (wi-102)
  {
    id: 'act-1021',
    workItemId: 'wi-102',
    nameAr: 'شد كابلات حديد مسبق الإجهاد للروافد الكرانية',
    nameEn: 'Post-Tensioning Segmental Rail Girders',
    totalQuantity: 80,
    unit: 'Pcs',
    descriptionAr: 'هندسة الشد اللاحق لكابلات الضغط العالي بقوة مدروسة واختبار جودة الاستطالة المتبادلة',
    descriptionEn: 'Execution of high tensile stress post-tension jacks on segmental metro girders with elongation logs',
    materialIds: ['mat-2'],
    equipmentIds: ['eq-3'],
    workerIds: ['wrk-2', 'wrk-4']
  },

  // NEOM - Foundation Pile (wi-201)
  {
    id: 'act-2011',
    workItemId: 'wi-201',
    nameAr: 'حفر وصب القواعد الدائرية العميقة قطر ١.٥م',
    nameEn: 'Drilling Deep Circular Bases (1.5m Diameter)',
    totalQuantity: 120,
    unit: 'Pcs',
    descriptionAr: 'حفر وتجويف وتدعيم بالبنتونايت لمنع الانهيار الرملي بمشروع محطة تحويل طاقة الهيدروجين',
    descriptionEn: 'Excavation and bentonite drilling mud circulation to structurally reinforce sandy desert soil layers',
    materialIds: ['mat-1', 'mat-2', 'mat-4'],
    equipmentIds: ['eq-1', 'eq-2'],
    workerIds: ['wrk-1', 'wrk-5']
  },
  // Riyadh Metro - Cabling (wi-103)
  {
    id: 'act-1031',
    workItemId: 'wi-103',
    nameAr: 'تمديد واختبار كابلات الضغط العالي والتحكم المترابط',
    nameEn: 'Laying & Testing Interconnected HV Traction Cables',
    totalQuantity: 10000,
    unit: 'm',
    descriptionAr: 'تمديد كابلات الجهد العالي بسفن الخنادق وربط الغرف والتحكم بالشبكة الرئيسية',
    descriptionEn: 'Installation of high-voltage cabling in utility trenches with primary grid interlocking systems',
    materialIds: ['mat-5'],
    equipmentIds: ['eq-5'],
    workerIds: ['wrk-1', 'wrk-2']
  },
  // NEOM - Fire Structural Frame (wi-202)
  {
    id: 'act-2021',
    workItemId: 'wi-202',
    nameAr: 'تركيب ودهان الهياكل المعدنية المقاومة للحريق الفئة أ',
    nameEn: 'Erection & Coating of Class-A Fire-Resistant Steel Framework',
    totalQuantity: 500,
    unit: 'Ton',
    descriptionAr: 'تركيب الأعمدة الحديدية الهيكلية المطلي بمادة مقاومة للحريق والحرارة العالية',
    descriptionEn: 'Erecting heavy duty structural steel rebar columns with passive fireproofing chemical layers',
    materialIds: ['mat-2'],
    equipmentIds: ['eq-3'],
    workerIds: ['wrk-2', 'wrk-4']
  },
  // Jeddah Port - Breakwater (wi-301)
  {
    id: 'act-3011',
    workItemId: 'wi-301',
    nameAr: 'صب وتركيب مصدات الكتل الخرسانية سابقة الإجهاد لمكعبات الأمواج',
    nameEn: 'Casting & Placement of Precast Floating Breakwater Blocks',
    totalQuantity: 300,
    unit: 'Pcs',
    descriptionAr: 'صب مباشر وتجفيف وتركيب الكتل المانعة للأمواج النشطة بمحاذاة الشاطئ الجنوبي للميناء',
    descriptionEn: 'Continuous maritime concrete casting and marine barge crane placement of 30-ton wave blocks',
    materialIds: ['mat-1', 'mat-3'],
    equipmentIds: ['eq-3', 'eq-4'],
    workerIds: ['wrk-3', 'wrk-5']
  }
];

export const seedWarehouse: WarehouseMaterial[] = [
  { id: 'mat-1', nameAr: 'خرسانة جاهزة مقاومة للكبريتات C45', nameEn: 'Ready-Mix Sulfate Resistant Concrete C45', code: 'CON-C45-SR', unit: 'm³', quantity: 4500, reservedStock: 1200, minThreshold: 500 },
  { id: 'mat-2', nameAr: 'حديد تسليح ضغط عالي قطر ٢٠ مم', nameEn: 'High-Tensile Steel Rebar D20 (Grade 60)', code: 'STL-RB20', unit: 'Ton', quantity: 380, reservedStock: 140, minThreshold: 50 },
  { id: 'mat-3', nameAr: 'أسمنت بورتلاندي عادي مقاوم للكبريتات الكيميائية', nameEn: 'Portland Sulfate Resistant Cement', code: 'CMT-PORT-SR', unit: 'Sack', quantity: 1800, reservedStock: 1100, minThreshold: 300 },
  { id: 'mat-4', nameAr: 'مادة البنتونايت السائلة لتثبيت جوانب الحفر', nameEn: 'Bentonite Drilling Fluid Powder', code: 'BEN-POWD', unit: 'Bag', quantity: 95, reservedStock: 80, minThreshold: 100 }, // Low Stock! Trigger Alert!
  { id: 'mat-5', nameAr: 'أنابيب الصرف الصحي البلاستيكية عالية الكثافة HDPE', nameEn: 'HDPE High Density Drainage Pipelines', code: 'HDPE-DR-400', unit: 'Meter', quantity: 1250, reservedStock: 150, minThreshold: 200 }
];

export const seedEquipment: EquipmentItem[] = [
  { id: 'eq-1', nameAr: 'حفارة خوازيق عميقة بقوة ٢٨٠ كيلونيوتن - Sany SR-285', nameEn: 'Deep Rotary Drilling Rig Sany SR-285', code: 'EQ-DR-01', totalQuantity: 3, reservedQuantity: 2, status: 'Excellent', locationAr: 'العليا، الرياض', locationEn: 'Olaya, Riyadh' },
  { id: 'eq-2', nameAr: 'حفار مجنزرة ثقيلة - CAT 320D3', nameEn: 'Heavy Crawler Excavator CAT 320D3', code: 'EQ-EX-04', totalQuantity: 6, reservedQuantity: 4, status: 'Excellent', locationAr: 'أوكساجون، نيوم', locationEn: 'Oxagon, NEOM' },
  { id: 'eq-3', nameAr: 'رافعة متحركة للأوزان الكبرى - Liebherr LTM 1250', nameEn: 'Heavy Mobile Crane Liebherr LTM 1250', code: 'EQ-CR-02', totalQuantity: 2, reservedQuantity: 1, status: 'Excellent', locationAr: 'العليا، الرياض', locationEn: 'Olaya, Riyadh' },
  { id: 'eq-4', nameAr: 'مضخة خرسانة ذراعية يبلغ مداها ٤٢ متراً', nameEn: '42m Truck-Mounted Concrete Boom Pump', code: 'EQ-PM-07', totalQuantity: 4, reservedQuantity: 1, status: 'Available', locationAr: 'ميناء جدة المستمر', locationEn: 'Jeddah Harbor Site' },
  { id: 'eq-5', nameAr: 'مولد كهربائي كليبر ديزل بقوة ٥٠٠ كيلوفولت', nameEn: '500kVA Cummins Diesel Silent Generator', code: 'EQ-GEN-03', totalQuantity: 10, reservedQuantity: 8, status: 'Available', locationAr: 'أوكساجون، نيوم', locationEn: 'Oxagon, NEOM' }
];

export const seedWorkers: Worker[] = [
  { id: 'wrk-1', fullName: 'Faisal Mohammed Al-Qahtani', nationalId: '1098471201', badgeNumber: 'BDG-771', professionAr: 'فني تشغيل حفارات عميقة والات دوارة', professionEn: 'Bored Rig Senior Operator', dailyProductivity: 12, hoursPerDay: 10, status: 'Active', salary: 14500 },
  { id: 'wrk-2', fullName: 'Hassan Mahmoud Radwan', nationalId: '2283940192', badgeNumber: 'BDG-204', professionAr: 'مهندس جودة وملاحظ حديد التسليح الكربوني', professionEn: 'Senior Rebar Quality Lead', dailyProductivity: 15, hoursPerDay: 8, status: 'Active', salary: 18000 },
  { id: 'wrk-3', fullName: 'Sajid Ali Farooqi', nationalId: '2109485712', badgeNumber: 'BDG-993', professionAr: 'فني صب ومعايرة الخرسانة الميدانية', professionEn: 'Certified Concrete Pouring Specialist', dailyProductivity: 30, hoursPerDay: 10, status: 'Active', salary: 9500 },
  { id: 'wrk-4', fullName: 'Tariq Saeed Al-Zahrani', nationalId: '1084719204', badgeNumber: 'BDG-404', professionAr: 'ملاحظ كابلات ضغط عالي وتوصيلات', professionEn: 'Senior Electrical Substation Inspector', dailyProductivity: 25, hoursPerDay: 8, status: 'Active', salary: 16000 },
  { id: 'wrk-5', fullName: 'Abdullah Omar Shaker', nationalId: '1138401934', badgeNumber: 'BDG-102', professionAr: 'منسق لوجستي وإمداد كيميائي ميداني', professionEn: 'Chemical Mud Logistics Coordinater', dailyProductivity: 20, hoursPerDay: 9, status: 'Active', salary: 11000 },
  { id: 'wrk-6', fullName: 'Mohammed Bin Abdulhadi', nationalId: '1249581023', badgeNumber: 'BDG-551', professionAr: 'عامل شد إنشائي وقوالب خشبية', professionEn: 'Structural Formwork Specialist', dailyProductivity: 18, hoursPerDay: 8, status: 'On Leave', salary: 8200 }
];

export const defaultSettings: SystemSettings = {
  id: 'settings-global',
  companyNameAr: 'مجموعة السديري للتشييد والبنى التحتية الكبرى',
  companyNameEn: 'Al-Sudairi Construction & Civil Infrastructure Group',
  companyLogoUrl: '🏢', // Fallback emoji styling
  officialStampUrl: '💮', // Fallback visual
  companyPhone: '+966 11 482 9900',
  companyEmail: 'operations@sudairicorp.com',
  officialAddressAr: 'شارع التخصصي، حي المعذر الشمالي، الرياض ١١٤٥١، المملكة العربية السعودية',
  officialAddressEn: 'Takhassusi Street, Al Maather Ash Shamali, Riyadh 11451, Kingdom of Saudi Arabia',
  commercialRegistration: "",
  taxNumber: "",
  companyWebsite: 'www.sudairicorp.com',
  managerNameAr: 'المهندس مشعل السديري - نائب الرئيس التنفيذي للعمليات',
  managerNameEn: 'Eng. Mishaal Al-Sudairi - Executive VP of Operations',
  managerSignature: 'Mishaal.Sudairi.Opr',
  reportTemplateType: 'Executive'
};

export const initialNotifications: SystemNotification[] = [];

export const initialAuditLogs: AuditLog[] = [];

export const initialProgressUpdates: ProgressUpdate[] = [
  // Day 1 (2026-06-19)
  {
    id: 'upd-101',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1011',
    completedQuantity: 12,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 5,
    photos: [],
    documents: [],
    notes: 'Excavation of pile #12 and #13 completed successfully.',
    reporterName: 'Yousef Al-Harbi',
    time: '09:00 AM',
    timestamp: '2026-06-19T09:00:00.000Z'
  },
  {
    id: 'upd-102',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1012',
    completedQuantity: 80,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-4'],
    completionPercentage: 4,
    photos: [],
    documents: [],
    notes: 'Sulfate-Resistant cement poured for Pier #4.',
    reporterName: 'Yousef Al-Harbi',
    time: '01:00 PM',
    timestamp: '2026-06-19T13:00:00.000Z'
  },
  {
    id: 'upd-103',
    projectId: 'proj-2',
    workItemId: 'wi-201',
    activityId: 'act-2011',
    completedQuantity: 4,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 3,
    photos: [],
    documents: [],
    notes: 'Drilling deep base #1 done.',
    reporterName: 'Ahmed Al-Malki',
    time: '11:00 AM',
    timestamp: '2026-06-19T11:00:00.000Z'
  },

  // Day 2 (2026-06-20)
  {
    id: 'upd-104',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1011',
    completedQuantity: 15,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 11,
    photos: [],
    documents: [],
    notes: 'Bored pile #14 and #15 trench support verified.',
    reporterName: 'Yousef Al-Harbi',
    time: '11:00 AM',
    timestamp: '2026-06-20T11:00:00.000Z'
  },
  {
    id: 'upd-105',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1012',
    completedQuantity: 120,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-4'],
    completionPercentage: 11,
    photos: [],
    documents: [],
    notes: 'Casting work completed for main station support beam.',
    reporterName: 'Yousef Al-Harbi',
    time: '03:00 PM',
    timestamp: '2026-06-20T15:00:00.000Z'
  },
  {
    id: 'upd-106',
    projectId: 'proj-2',
    workItemId: 'wi-201',
    activityId: 'act-2011',
    completedQuantity: 6,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 8,
    photos: [],
    documents: [],
    notes: 'Bentonite mud circulation active on base #2.',
    reporterName: 'Ahmed Al-Malki',
    time: '01:00 PM',
    timestamp: '2026-06-20T13:00:00.000Z'
  },

  // Day 3 (2026-06-21)
  {
    id: 'upd-107',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1011',
    completedQuantity: 10,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 15,
    photos: [],
    documents: [],
    notes: 'Site soil layers verified prior to drilling.',
    reporterName: 'Yousef Al-Harbi',
    time: '09:00 AM',
    timestamp: '2026-06-21T09:00:00.000Z'
  },
  {
    id: 'upd-108',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1012',
    completedQuantity: 95,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-4'],
    completionPercentage: 16,
    photos: [],
    documents: [],
    notes: 'Pier structure #5 pouring completed.',
    reporterName: 'Yousef Al-Harbi',
    time: '01:00 PM',
    timestamp: '2026-06-21T13:00:00.000Z'
  },
  {
    id: 'upd-109',
    projectId: 'proj-1',
    workItemId: 'wi-102',
    activityId: 'act-1021',
    completedQuantity: 3,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-3'],
    completionPercentage: 4,
    photos: [],
    documents: [],
    notes: 'Tensioning jacks logged for segmental girder #1.',
    reporterName: 'Yousef Al-Harbi',
    time: '11:00 AM',
    timestamp: '2026-06-21T11:00:00.000Z'
  },

  // Day 4 (2026-06-22)
  {
    id: 'upd-110',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1011',
    completedQuantity: 18,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 23,
    photos: [],
    documents: [],
    notes: 'Drilling deep piles #16 to #18.',
    reporterName: 'Yousef Al-Harbi',
    time: '11:00 AM',
    timestamp: '2026-06-22T11:00:00.000Z'
  },
  {
    id: 'upd-111',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1012',
    completedQuantity: 150,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-4'],
    completionPercentage: 24,
    photos: [],
    documents: [],
    notes: 'Ready-mix concrete delivery logs verified.',
    reporterName: 'Yousef Al-Harbi',
    time: '03:00 PM',
    timestamp: '2026-06-22T15:00:00.000Z'
  },
  {
    id: 'upd-112',
    projectId: 'proj-1',
    workItemId: 'wi-102',
    activityId: 'act-1021',
    completedQuantity: 5,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-3'],
    completionPercentage: 10,
    photos: [],
    documents: [],
    notes: 'High tensile tensioning checked.',
    reporterName: 'Yousef Al-Harbi',
    time: '01:00 PM',
    timestamp: '2026-06-22T13:00:00.000Z'
  },

  // Day 5 (2026-06-23)
  {
    id: 'upd-113',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1011',
    completedQuantity: 20,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 31,
    photos: [],
    documents: [],
    notes: 'Drilling piles #19 and #20 completed.',
    reporterName: 'Yousef Al-Harbi',
    time: '09:00 AM',
    timestamp: '2026-06-23T09:00:00.000Z'
  },
  {
    id: 'upd-114',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1012',
    completedQuantity: 110,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-4'],
    completionPercentage: 30,
    photos: [],
    documents: [],
    notes: 'Abutment concrete pour complete.',
    reporterName: 'Yousef Al-Harbi',
    time: '01:00 PM',
    timestamp: '2026-06-23T13:00:00.000Z'
  },
  {
    id: 'upd-115',
    projectId: 'proj-2',
    workItemId: 'wi-201',
    activityId: 'act-2011',
    completedQuantity: 8,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 15,
    photos: [],
    documents: [],
    notes: 'Bases #3 and #4 completed.',
    reporterName: 'Ahmed Al-Malki',
    time: '11:00 AM',
    timestamp: '2026-06-23T11:00:00.000Z'
  },

  // Day 6 (2026-06-24)
  {
    id: 'upd-116',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1011',
    completedQuantity: 22,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 40,
    photos: [],
    documents: [],
    notes: 'Excellent progress on station B pile wall.',
    reporterName: 'Yousef Al-Harbi',
    time: '11:00 AM',
    timestamp: '2026-06-24T11:00:00.000Z'
  },
  {
    id: 'upd-117',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1012',
    completedQuantity: 160,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-4'],
    completionPercentage: 39,
    photos: [],
    documents: [],
    notes: 'Sulfate resistant cement mix poured.',
    reporterName: 'Yousef Al-Harbi',
    time: '03:00 PM',
    timestamp: '2026-06-24T15:00:00.000Z'
  },
  {
    id: 'upd-118',
    projectId: 'proj-1',
    workItemId: 'wi-102',
    activityId: 'act-1021',
    completedQuantity: 4,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-3'],
    completionPercentage: 15,
    photos: [],
    documents: [],
    notes: 'Elongation checks registered.',
    reporterName: 'Yousef Al-Harbi',
    time: '01:00 PM',
    timestamp: '2026-06-24T13:00:00.000Z'
  },

  // Day 7 (2026-06-25)
  {
    id: 'upd-119',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1011',
    completedQuantity: 15,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 46,
    photos: [],
    documents: [],
    notes: 'Soil stable, final drilling logs recorded.',
    reporterName: 'Yousef Al-Harbi',
    time: '09:00 AM',
    timestamp: '2026-06-25T09:00:00.000Z'
  },
  {
    id: 'upd-120',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1012',
    completedQuantity: 130,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-4'],
    completionPercentage: 46,
    photos: [],
    documents: [],
    notes: 'Sulfate cement ready-mix on time.',
    reporterName: 'Yousef Al-Harbi',
    time: '01:00 PM',
    timestamp: '2026-06-25T13:00:00.000Z'
  },
  {
    id: 'upd-121',
    projectId: 'proj-2',
    workItemId: 'wi-201',
    activityId: 'act-2011',
    completedQuantity: 5,
    numberOfWorkers: 2,
    equipmentUsed: ['eq-1', 'eq-2'],
    completionPercentage: 19,
    photos: [],
    documents: [],
    notes: 'Oxagon sand compaction within specs.',
    reporterName: 'Ahmed Al-Malki',
    time: '11:00 AM',
    timestamp: '2026-06-25T11:00:00.000Z'
  }
];

export const initialSafetyRecords: SafetyRecord[] = [];

export const initialDelays: DelayRecord[] = [];

export const initialIssues: IssueReport[] = [];

export const initialAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'att-101',
    projectId: 'proj-1',
    date: '2026-06-29',
    workerId: 'wrk-1',
    workerName: 'Faisal Mohammed Al-Qahtani',
    professionAr: 'فني تشغيل حفارات عميقة والات دوارة',
    professionEn: 'Bored Rig Senior Operator',
    isPresent: true,
    status: 'Present',
    startTime: '07:00 AM',
    breakTime: '12:00 PM',
    endTime: '05:00 PM',
    shiftTime: '10 Hours',
    supervisorName: 'Yousef Al-Harbi',
    notes: 'On time, productive session.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'att-102',
    projectId: 'proj-1',
    date: '2026-06-29',
    workerId: 'wrk-2',
    workerName: 'Hassan Mahmoud Radwan',
    professionAr: 'مهندس جودة وملاحظ حديد التسليح الكربوني',
    professionEn: 'Senior Rebar Quality Lead',
    isPresent: true,
    status: 'Late',
    startTime: '08:30 AM',
    breakTime: '12:00 PM',
    endTime: '05:30 PM',
    shiftTime: '8 Hours',
    supervisorName: 'Yousef Al-Harbi',
    notes: 'Late arrival due to traffic.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'att-103',
    projectId: 'proj-1',
    date: '2026-06-29',
    workerId: 'wrk-3',
    workerName: 'Sajid Ali Farooqi',
    professionAr: 'فني صب ومعايرة الخرسانة الميدانية',
    professionEn: 'Certified Concrete Pouring Specialist',
    isPresent: false,
    status: 'Absent',
    startTime: '',
    breakTime: '',
    endTime: '',
    shiftTime: '10 Hours',
    supervisorName: 'Yousef Al-Harbi',
    notes: 'Emergency family matter.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'att-104',
    projectId: 'proj-1',
    date: '2026-06-29',
    workerId: 'wrk-4',
    workerName: 'Tariq Saeed Al-Zahrani',
    professionAr: 'ملاحظ كابلات ضغط عالي وتوصيلات',
    professionEn: 'Senior Electrical Substation Inspector',
    isPresent: true,
    status: 'Present',
    startTime: '07:30 AM',
    breakTime: '12:00 PM',
    endTime: '04:30 PM',
    shiftTime: '8 Hours',
    supervisorName: 'Yousef Al-Harbi',
    notes: 'Completed site inspection.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'att-105',
    projectId: 'proj-1',
    date: '2026-06-29',
    workerId: 'wrk-5',
    workerName: 'Abdullah Omar Shaker',
    professionAr: 'منسق لوجستي وإمداد كيميائي ميداني',
    professionEn: 'Chemical Mud Logistics Coordinater',
    isPresent: true,
    status: 'Present',
    startTime: '08:00 AM',
    breakTime: '12:00 PM',
    endTime: '05:00 PM',
    shiftTime: '9 Hours',
    supervisorName: 'Yousef Al-Harbi',
    notes: 'Managed bentonite supply chain.',
    timestamp: new Date().toISOString()
  }
];
