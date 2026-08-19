/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  StartCard, 
  WorkPermit, 
  PermitTypeConfig, 
  PermitAuditLog 
} from '../types';
import { 
  DEFAULT_PERMIT_TYPES, 
  DEFAULT_START_CARD_CHECKLIST, 
  DEFAULT_SAFETY_CONTROLS, 
  DEFAULT_PPE_ITEMS, 
  DEFAULT_HAZARDS 
} from '../utils/ptwCalculations';

export const seedPermitTypes: PermitTypeConfig[] = DEFAULT_PERMIT_TYPES;

export const seedStartCards: StartCard[] = [
  {
    id: 'sc-101',
    cardNumber: 'SC-2026-00101',
    revision: 1,
    level: 'Activity',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1011',
    targetActivityIds: ['act-1011'],

    // Project Info
    projectNameEn: 'Riyadh Metro - Olaya Line 4A Trackway',
    projectNameAr: 'مترو الرياض - مسار قطار العليا 4A',
    projectNumber: 'PRJ-2026-001',
    clientEn: 'Royal Commission for Riyadh City',
    clientAr: 'الهيئة الملكية لمدينة الرياض',
    consultantEn: 'Dar Al-Handasah Engineering Consultants',
    consultantAr: 'دار الهندسة للاستشارات الهندسية',
    mainContractorEn: 'Saudi Binladin & Consolidated Contractors JV',
    mainContractorAr: 'تحالف مجموعة بن لادن واتحاد المقاولين',
    subcontractorEn: 'Al-Rashid Geotechnical Foundation Co.',
    subcontractorAr: 'شركة الرشيد للأساسات والجيوتقنية',
    projectLocationEn: 'Olaya, King Fahd Junction, Riyadh',
    projectLocationAr: 'العليا، تقاطع الملك فهد، الرياض',
    workAreaZone: 'Zone 4A - North Pier Station',
    buildingStructure: 'Viaduct Pier Foundation F-24',
    floorLevel: 'Sub-level -4.5m Depth',
    gridReference: 'Grid Line E-12 / Pier 24',
    workPackageCode: 'WP-CV-041',

    // Work Info
    workDescriptionEn: 'Deep mechanical excavation and soil shoring for foundation pier F-24',
    workDescriptionAr: 'أعمال الحفر الميكانيكي العميق وسند جوانب التربة لقاعدة العمود F-24',
    scopeOfWorkEn: 'Excavation to -4.5m depth, installation of trench box shoring, continuous groundwater dewatering, setting benchmark survey points, and soil compaction verification.',
    scopeOfWorkAr: 'الحفر إلى عمق 4.5 متر، تركيب ستائر التدعيم وصناديق سند الحفر، سحب المياه الجوفية، تثبيت علامات التموضع المساحي، والتحقق من دك التربة.',
    plannedStartDate: '2026-08-15',
    plannedFinishDate: '2026-08-25',
    expectedDurationDays: 10,
    workShift: 'Morning',
    workLocationDetails: 'Sector 4, Pier 24 North Embankment adjacent to King Fahd Road',
    workCrewLead: 'Lead Sup. Yousef Al-Harbi',
    numberOfWorkers: 12,
    requiredEquipmentDetails: '1x CAT 336 Excavator, 2x Mercedes 24-Ton Dump Trucks, 1x 4-inch Dewatering Pump, 1x Trench Plate Shoring Rig',
    requiredToolsDetails: 'Air compressor breaker, spade shovels, survey optical level, soil moisture gauge, laser distance meter',
    requiredMaterialsDetails: 'Structural backfill A-1-a aggregate, geotextile membrane Class 1, warning caution tiles',

    // Key Responsible Personnel
    projectManager: 'Eng. Khalid Bin Abdulaziz',
    constructionManager: 'Eng. Sami Al-Mansoor',
    siteEngineer: 'Eng. Yousef Al-Harbi',
    supervisorForeman: 'Foreman Ahmed Saber',
    hseOfficer: 'HSE Eng. Tariq Al-Ghamdi',
    qaqcEngineer: 'QA/QC Eng. Badr Al-Sharif',
    surveyor: 'Chief Surveyor Omar Farooq',
    permitReceiver: 'Foreman Ahmed Saber',
    permitIssuer: 'HSE Eng. Tariq Al-Ghamdi',

    // Checklists & Attachments
    checklist: DEFAULT_START_CARD_CHECKLIST.map(c => ({
      ...c,
      status: 'Pass',
      checkedBy: 'Eng. Yousef Al-Harbi',
      checkedAt: '2026-08-14 16:30'
    })),
    attachments: [
      {
        id: 'att-1',
        title: 'Approved Shop Drawing - Pier 24 Shoring & Excavation',
        documentType: 'Approved Drawing',
        fileName: 'DWG-RYD-041-REV3.pdf',
        fileSize: '4.2 MB',
        uploadedBy: 'Eng. Yousef Al-Harbi',
        uploadedAt: '2026-08-14 11:20',
        status: 'Approved'
      },
      {
        id: 'att-2',
        title: 'Method Statement for Deep Earthworks & Shoring',
        documentType: 'Method Statement',
        fileName: 'MS-EXC-002-APPROVED.pdf',
        fileSize: '2.8 MB',
        uploadedBy: 'Eng. Sami Al-Mansoor',
        uploadedAt: '2026-08-13 14:00',
        status: 'Approved'
      },
      {
        id: 'att-3',
        title: 'Job Safety Analysis (JSA) - Deep Trenching & Traffic Proximity',
        documentType: 'JSA',
        fileName: 'JSA-RYD-EXC-24.pdf',
        fileSize: '1.5 MB',
        uploadedBy: 'HSE Eng. Tariq Al-Ghamdi',
        uploadedAt: '2026-08-14 09:15',
        status: 'Approved'
      }
    ],

    // Approvals
    approvals: [
      {
        id: 'app-sc-1',
        order: 1,
        roleNameEn: 'Site Engineer',
        roleNameAr: 'مهندس الموقع',
        assignedUserName: 'Eng. Yousef Al-Harbi',
        status: 'Approved',
        decisionDate: '2026-08-14',
        decisionTime: '15:10',
        decisionComments: 'All site prerequisites, survey benchmarks, and crew inspections verified.',
        signatureType: 'Typed',
        signatureData: 'Eng. Yousef Al-Harbi',
        approverName: 'Eng. Yousef Al-Harbi',
        approverRole: 'Site Engineer',
        approverBadge: 'EMP-8854'
      },
      {
        id: 'app-sc-2',
        order: 2,
        roleNameEn: 'QA/QC Engineer',
        roleNameAr: 'مهندس ضبط الجودة (QA/QC)',
        assignedUserName: 'QA/QC Eng. Badr Al-Sharif',
        status: 'Approved',
        decisionDate: '2026-08-14',
        decisionTime: '16:00',
        decisionComments: 'Approved drawings Rev 3 in place, inspection test plan (ITP) ready.',
        signatureType: 'Typed',
        signatureData: 'QA/QC Eng. Badr Al-Sharif',
        approverName: 'QA/QC Eng. Badr Al-Sharif',
        approverRole: 'QA/QC Lead',
        approverBadge: 'EMP-3312'
      },
      {
        id: 'app-sc-3',
        order: 3,
        roleNameEn: 'HSE Officer',
        roleNameAr: 'مسؤول السلامة والصحة المهنية (HSE)',
        assignedUserName: 'HSE Eng. Tariq Al-Ghamdi',
        status: 'Approved',
        decisionDate: '2026-08-14',
        decisionTime: '16:45',
        decisionComments: 'JSA briefing completed, barricading in place, PTW-2026-000101 verified.',
        signatureType: 'Typed',
        signatureData: 'HSE Eng. Tariq Al-Ghamdi',
        approverName: 'HSE Eng. Tariq Al-Ghamdi',
        approverRole: 'HSE Manager',
        approverBadge: 'EMP-5509'
      },
      {
        id: 'app-sc-4',
        order: 4,
        roleNameEn: 'Construction Manager',
        roleNameAr: 'مدير التنفيذ الإنشائي',
        assignedUserName: 'Eng. Sami Al-Mansoor',
        status: 'Approved',
        decisionDate: '2026-08-14',
        decisionTime: '17:30',
        decisionComments: 'Equipment mobilization completed and logistics approved.',
        signatureType: 'Typed',
        signatureData: 'Eng. Sami Al-Mansoor',
        approverName: 'Eng. Sami Al-Mansoor',
        approverRole: 'Construction Manager',
        approverBadge: 'EMP-2201'
      },
      {
        id: 'app-sc-5',
        order: 5,
        roleNameEn: 'Project Manager',
        roleNameAr: 'مدير المشروع',
        assignedUserName: 'Eng. Khalid Bin Abdulaziz',
        status: 'Approved',
        decisionDate: '2026-08-14',
        decisionTime: '18:00',
        decisionComments: 'Officially authorized for mobilization and commencement.',
        signatureType: 'Typed',
        signatureData: 'Eng. Khalid Bin Abdulaziz',
        approverName: 'Eng. Khalid Bin Abdulaziz',
        approverRole: 'Project Manager',
        approverBadge: 'EMP-4412'
      }
    ],
    currentApprovalIndex: 5,

    status: 'Approved',
    createdAt: '2026-08-13T10:00:00.000Z',
    createdBy: 'Eng. Yousef Al-Harbi',
    approvedAt: '2026-08-14T18:00:00.000Z',
    approvedBy: 'Eng. Khalid Bin Abdulaziz',
    notes: 'Critical foundation milestone for Pier 24. Full safety compliance mandatory.'
  },
  {
    id: 'sc-102',
    cardNumber: 'SC-2026-00102',
    revision: 1,
    level: 'Group',
    projectId: 'proj-1',
    workItemId: 'wi-102',
    activityId: 'act-1021',
    targetActivityIds: ['act-1021'],

    // Project Info
    projectNameEn: 'Riyadh Metro - Olaya Line 4A Trackway',
    projectNameAr: 'مترو الرياض - مسار قطار العليا 4A',
    projectNumber: 'PRJ-2026-001',
    clientEn: 'Royal Commission for Riyadh City',
    clientAr: 'الهيئة الملكية لمدينة الرياض',
    consultantEn: 'Dar Al-Handasah Engineering Consultants',
    consultantAr: 'دار الهندسة للاستشارات الهندسية',
    projectLocationEn: 'Olaya, King Fahd Junction, Riyadh',
    projectLocationAr: 'العليا، تقاطع الملك فهد، الرياض',
    workAreaZone: 'Zone 4B - Precast Yard',
    buildingStructure: 'Segmental Viaduct Span S-12',
    floorLevel: 'Elevated Deck +8.0m',
    workPackageCode: 'WP-CV-042',

    // Work Info
    workDescriptionEn: 'Precast viaduct girder casting, lifting, and post-tensioning segment erection',
    workDescriptionAr: 'صب الجسور العلوية سابقة الصب وتركيب القطع والشد اللاحق للكابلات',
    scopeOfWorkEn: 'Precast girder formwork assembly, post-tensioning duct alignment, concrete casting, high-tonnage crane tandem lifting and span launching.',
    scopeOfWorkAr: 'تجهيز قوالب الصب للجسور، تمديد مجاري كابلات الشد اللاحق، صب الخرسانة عالية الإجهاد، ورفع وتركيب الجسور بالرافعات الثقيلة.',
    plannedStartDate: '2026-08-20',
    plannedFinishDate: '2026-09-15',
    expectedDurationDays: 26,
    workShift: 'Morning',
    numberOfWorkers: 18,
    requiredEquipmentDetails: '2x 250-Ton Liebherr Mobile Cranes, 1x Launching Gantry Rig, 1x Hydraulic Post-Tensioning Jack Unit',
    requiredToolsDetails: 'Torque wrenches, survey total stations, vibrators, safety static lines',

    projectManager: 'Eng. Khalid Bin Abdulaziz',
    constructionManager: 'Eng. Sami Al-Mansoor',
    siteEngineer: 'Eng. Hassan Mahmoud',
    supervisorForeman: 'Lead Sup. Hassan Mahmoud',
    hseOfficer: 'HSE Eng. Tariq Al-Ghamdi',
    qaqcEngineer: 'QA/QC Eng. Badr Al-Sharif',

    checklist: DEFAULT_START_CARD_CHECKLIST.map((c, i) => ({
      ...c,
      status: i < 8 ? 'Pass' : 'Pending',
      checkedBy: i < 8 ? 'Eng. Hassan Mahmoud' : undefined,
      checkedAt: i < 8 ? '2026-08-16 14:00' : undefined
    })),
    attachments: [
      {
        id: 'att-201',
        title: 'Lifting Study & Critical Tandem Lift Calculation Plan',
        documentType: 'Lifting Plan',
        fileName: 'LIFT-PLAN-SPAN-S12.pdf',
        fileSize: '5.6 MB',
        uploadedBy: 'Eng. Hassan Mahmoud',
        uploadedAt: '2026-08-16 10:00',
        status: 'Approved'
      }
    ],

    approvals: [
      {
        id: 'app-sc2-1',
        order: 1,
        roleNameEn: 'Site Engineer',
        roleNameAr: 'مهندس الموقع',
        assignedUserName: 'Eng. Hassan Mahmoud',
        status: 'Approved',
        decisionDate: '2026-08-16',
        decisionTime: '14:30',
        decisionComments: 'Formwork and survey benchmarks ready.',
        signatureType: 'Typed',
        signatureData: 'Eng. Hassan Mahmoud',
        approverName: 'Eng. Hassan Mahmoud',
        approverRole: 'Site Engineer'
      },
      {
        id: 'app-sc2-2',
        order: 2,
        roleNameEn: 'QA/QC Engineer',
        roleNameAr: 'مهندس ضبط الجودة (QA/QC)',
        assignedUserName: 'QA/QC Eng. Badr Al-Sharif',
        status: 'Approved',
        decisionDate: '2026-08-16',
        decisionTime: '17:00',
        decisionComments: 'Precast batch test certificates reviewed and acceptable.',
        signatureType: 'Typed',
        signatureData: 'QA/QC Eng. Badr Al-Sharif',
        approverName: 'QA/QC Eng. Badr Al-Sharif',
        approverRole: 'QA/QC Lead'
      },
      {
        id: 'app-sc2-3',
        order: 3,
        roleNameEn: 'HSE Officer',
        roleNameAr: 'مسؤول السلامة والصحة المهنية (HSE)',
        assignedUserName: 'HSE Eng. Tariq Al-Ghamdi',
        status: 'Pending',
        approverName: 'HSE Eng. Tariq Al-Ghamdi',
        approverRole: 'HSE Manager'
      }
    ],
    currentApprovalIndex: 2,

    status: 'Submitted',
    createdAt: '2026-08-15T09:00:00.000Z',
    createdBy: 'Eng. Hassan Mahmoud'
  },
  {
    id: 'sc-201',
    cardNumber: 'SC-2026-00201',
    revision: 1,
    level: 'Activity',
    projectId: 'proj-2',
    workItemId: 'wi-201',
    activityId: 'act-2011',
    targetActivityIds: ['act-2011'],

    // Project Info
    projectNameEn: 'NEOM - Green Hydrogen Plant Piling Structure',
    projectNameAr: 'نيوم - محطة الهيدروجين الأخضر للأعمدة الكبرى',
    projectNumber: 'PRJ-2026-002',
    clientEn: 'NEOM Tech & Energy Holding',
    clientAr: 'شركة نيوم للتقنية والمياه',
    projectLocationEn: 'Oxagon Industrial Zone, Tabuk',
    projectLocationAr: 'المنطقة الصناعية (أوكساجون)، تبوك',
    workAreaZone: 'Zone H2 - Transformer Substation A',
    buildingStructure: 'Heavy Transformer Pad Piling',
    workPackageCode: 'WP-NEOM-PIL-01',

    // Work Info
    workDescriptionEn: 'Driven steel pipe piling and casing installation for hydrogen compressor platform',
    workDescriptionAr: 'دق وتركيب الخوازيق الفولاذية والقمصان المعدنية لمنصة ضواغط الهيدروجين',
    plannedStartDate: '2026-08-22',
    plannedFinishDate: '2026-09-10',
    expectedDurationDays: 19,
    workShift: 'Morning',
    numberOfWorkers: 15,
    requiredEquipmentDetails: '1x Bauer BG-36 Piling Rig, 1x Vibro-Hammer Rig, 1x 100-Ton Crawler Crane',

    projectManager: 'Eng. Faisal Saud Al-Ahmed',
    siteEngineer: 'Eng. Mansoor Al-Harbi',
    hseOfficer: 'HSE Eng. Zaid Al-Omari',

    checklist: DEFAULT_START_CARD_CHECKLIST.map(c => ({
      ...c,
      status: 'Pending'
    })),
    attachments: [],
    approvals: [
      {
        id: 'app-sc3-1',
        order: 1,
        roleNameEn: 'Site Engineer',
        roleNameAr: 'مهندس الموقع',
        assignedUserName: 'Eng. Mansoor Al-Harbi',
        status: 'Pending',
        approverName: 'Eng. Mansoor Al-Harbi'
      }
    ],
    currentApprovalIndex: 0,
    status: 'Draft',
    createdAt: '2026-08-16T11:00:00.000Z',
    createdBy: 'Eng. Mansoor Al-Harbi'
  }
];

export const seedWorkPermits: WorkPermit[] = [
  {
    id: 'ptw-101',
    permitNumber: 'PTW-2026-000101',
    startCardId: 'sc-101',
    projectId: 'proj-1',
    workItemId: 'wi-101',
    activityId: 'act-1011',

    // General Info
    permitTypeId: 'pt-excavation',
    permitTypeNameEn: 'Excavation & Trenching Permit',
    permitTypeNameAr: 'تصريح أعمال الحفر والخنادق الإنشائية',
    riskLevel: 'High',
    workLocation: 'Riyadh Metro - Olaya Line 4A Trackway',
    exactWorkArea: 'Pier 24 Footprint - North Embankment Zone 4A',
    descriptionOfWorkEn: 'Deep mechanical excavator trenching to -4.5m for foundation base F-24 with steel shoring boxes',
    descriptionOfWorkAr: 'حفر ميكانيكي عميق لمنسوب -4.5م لقاعدة العمود F-24 مع تثبيت صناديق السند الفولاذية',
    shift: 'Morning',
    numberOfWorkers: 12,

    // Validity Windows (Valid from today for 24 hours)
    validFromDate: '2026-08-17',
    validFromTime: '06:00',
    validUntilDate: '2026-08-18',
    validUntilTime: '18:00',
    actualStartDate: '2026-08-17',
    actualStartTime: '07:00',

    // Hazards Matrix
    hazards: [
      {
        id: 'hz-101',
        hazardEn: 'Trench collapse & soil bank failure',
        hazardAr: 'انهيار جوانب الحفر والتربة على العمال',
        riskLevel: 'Critical',
        controlMeasureEn: 'Modular trench box shoring installed immediately at depths exceeding 1.2m',
        controlMeasureAr: 'تركيب صناديق السند المعدنية الهيدروليكية فور تجاوز عمق الحفر 1.2م',
        responsiblePerson: 'Civil Eng. Yousef Al-Harbi',
        status: 'Controlled'
      },
      {
        id: 'hz-102',
        hazardEn: 'Underground live power & fiber optic utility strike',
        hazardAr: 'ملامسة أو إتلاف كابلات الجهد العالي والألياف البصرية المدفونة',
        riskLevel: 'Critical',
        controlMeasureEn: 'Underground utility locator scan completed with SEC clearance cert #SEC-RYD-991',
        controlMeasureAr: 'مسح الموقع بكاشف الخدمات الإلكتروني وتوفر تصريح شركة الكهرباء رقم SEC-RYD-991',
        responsiblePerson: 'Chief Surveyor Omar Farooq',
        status: 'Controlled'
      },
      {
        id: 'hz-103',
        hazardEn: 'Heavy machinery swing radius & pedestrian worker contact',
        hazardAr: 'اصطدام دوران الحفارة بالعمال أو الآليات المجاورة',
        riskLevel: 'High',
        controlMeasureEn: 'Physical exclusion barricade at 5m radius with dedicated full-time Banksman spotter',
        controlMeasureAr: 'تطويق نطاق دوران المعدة 5 أمتار وتعيين موجه معدات (Banksman) متفرغ',
        responsiblePerson: 'Banksman Spotter Fahad',
        status: 'Controlled'
      }
    ],

    // Safety Controls & PPE
    safetyControls: DEFAULT_SAFETY_CONTROLS.map(c => ({
      ...c,
      isImplemented: true,
      verifiedBy: 'HSE Eng. Tariq Al-Ghamdi',
      notes: 'Inspected and verified at 06:45 AM briefing'
    })),
    ppeChecklist: DEFAULT_PPE_ITEMS.map(p => ({
      ...p,
      isAvailable: true
    })),
    emergencyContactName: 'HSE Response Command / Paramedic Unit',
    emergencyContactPhone: '+966-555-911-004',
    assemblyPoint: 'Assembly Station Zone 4 North Gate',

    attachments: [
      {
        id: 'att-p1',
        title: 'SEC No-Objection Certificate & Utility Locator Map',
        documentType: 'Survey Report',
        fileName: 'NOC-SEC-UTILITY-CLEAR.pdf',
        fileSize: '3.1 MB',
        uploadedBy: 'HSE Eng. Tariq Al-Ghamdi',
        uploadedAt: '2026-08-16 15:00',
        status: 'Approved'
      }
    ],

    // Approvals
    approvals: [
      {
        id: 'app-p1-1',
        order: 1,
        roleNameEn: 'Permit Receiver',
        roleNameAr: 'مستلم التصريح (المشرف الميداني)',
        assignedUserName: 'Foreman Ahmed Saber',
        status: 'Approved',
        decisionDate: '2026-08-17',
        decisionTime: '06:15',
        decisionComments: 'All crew briefed on JSA, gas and shoring controls confirmed.',
        signatureType: 'Typed',
        signatureData: 'Foreman Ahmed Saber',
        approverName: 'Foreman Ahmed Saber',
        approverRole: 'Permit Receiver'
      },
      {
        id: 'app-p1-2',
        order: 2,
        roleNameEn: 'HSE Officer / Permit Issuer',
        roleNameAr: 'مُصدر التصريح (مسؤول السلامة)',
        assignedUserName: 'HSE Eng. Tariq Al-Ghamdi',
        status: 'Approved',
        decisionDate: '2026-08-17',
        decisionTime: '06:40',
        decisionComments: 'Site inspected, barricades and gas detector verified. Permit granted.',
        signatureType: 'Typed',
        signatureData: 'HSE Eng. Tariq Al-Ghamdi',
        approverName: 'HSE Eng. Tariq Al-Ghamdi',
        approverRole: 'Permit Issuer / HSE Lead'
      },
      {
        id: 'app-p1-3',
        order: 3,
        roleNameEn: 'Authorized Project Approver',
        roleNameAr: 'الاعتماد النهائي للموقع (مدير المشروع)',
        assignedUserName: 'Eng. Khalid Bin Abdulaziz',
        status: 'Approved',
        decisionDate: '2026-08-17',
        decisionTime: '07:00',
        decisionComments: 'Work officially authorized to proceed.',
        signatureType: 'Typed',
        signatureData: 'Eng. Khalid Bin Abdulaziz',
        approverName: 'Eng. Khalid Bin Abdulaziz',
        approverRole: 'Project Manager'
      }
    ],
    currentApprovalIndex: 3,

    extensions: [],
    suspensions: [],

    status: 'Active',
    createdAt: '2026-08-16T16:00:00.000Z',
    createdBy: 'HSE Eng. Tariq Al-Ghamdi',
    approvedAt: '2026-08-17T07:00:00.000Z',
    approvedBy: 'Eng. Khalid Bin Abdulaziz',
    notes: 'Permit fully active. Continuous shoring monitoring required.'
  },
  {
    id: 'ptw-102',
    permitNumber: 'PTW-2026-000102',
    startCardId: 'sc-102',
    projectId: 'proj-1',
    workItemId: 'wi-102',
    activityId: 'act-1021',

    permitTypeId: 'pt-hot',
    permitTypeNameEn: 'Hot Work Permit',
    permitTypeNameAr: 'تصريح أعمال ساخنة وحرارية (لحام وقطع)',
    riskLevel: 'High',
    workLocation: 'Riyadh Metro - Olaya Line 4A Trackway',
    exactWorkArea: 'Segmental Viaduct Span S-12 - Rebar Cutting & Welding',
    descriptionOfWorkEn: 'Oxy-acetylene cutting and electric arc welding for reinforcement steel couplers',
    descriptionOfWorkAr: 'أعمال القطع بالأكسجين واللحام بالقوس الكهربائي لوصلات حديد التسليح العلوية',
    shift: 'Morning',
    numberOfWorkers: 6,

    validFromDate: '2026-08-18',
    validFromTime: '07:00',
    validUntilDate: '2026-08-18',
    validUntilTime: '16:00',

    hazards: DEFAULT_HAZARDS.slice(2, 4),
    safetyControls: DEFAULT_SAFETY_CONTROLS.map((c, i) => ({
      ...c,
      isImplemented: i < 5,
      notes: i < 5 ? 'Ready' : 'Pending inspection'
    })),
    ppeChecklist: DEFAULT_PPE_ITEMS.map(p => ({
      ...p,
      isAvailable: true
    })),

    attachments: [],
    approvals: [
      {
        id: 'app-p2-1',
        order: 1,
        roleNameEn: 'Permit Receiver',
        roleNameAr: 'مستلم التصريح (المشرف الميداني)',
        assignedUserName: 'Foreman Hassan Mahmoud',
        status: 'Approved',
        decisionDate: '2026-08-17',
        decisionTime: '15:00',
        decisionComments: 'Fire blankets and extinguishers stationed.',
        signatureType: 'Typed',
        signatureData: 'Foreman Hassan Mahmoud',
        approverName: 'Foreman Hassan Mahmoud',
        approverRole: 'Permit Receiver'
      },
      {
        id: 'app-p2-2',
        order: 2,
        roleNameEn: 'HSE Officer / Permit Issuer',
        roleNameAr: 'مُصدر التصريح (مسؤول السلامة)',
        assignedUserName: 'HSE Eng. Tariq Al-Ghamdi',
        status: 'Pending',
        approverName: 'HSE Eng. Tariq Al-Ghamdi'
      }
    ],
    currentApprovalIndex: 1,

    extensions: [],
    suspensions: [],

    status: 'Submitted',
    createdAt: '2026-08-17T14:00:00.000Z',
    createdBy: 'Foreman Hassan Mahmoud'
  },
  {
    id: 'ptw-103',
    permitNumber: 'PTW-2026-000103',
    startCardId: 'sc-102',
    projectId: 'proj-1',
    workItemId: 'wi-102',
    activityId: 'act-1021',

    permitTypeId: 'pt-height',
    permitTypeNameEn: 'Work at Height Permit',
    permitTypeNameAr: 'تصريح عمل على ارتفاعات وسقالات (> 1.8 م)',
    riskLevel: 'High',
    workLocation: 'Riyadh Metro - Olaya Line 4A Trackway',
    exactWorkArea: 'Pier 24 to 25 Gantry Span (+8.5m Elevation)',
    descriptionOfWorkEn: 'Installation of high-level cantilever formwork brackets and safety netting',
    descriptionOfWorkAr: 'تركيب كوابيل الشدات الخرسانية العلوية المعلقة وشباك الحماية من السقوط',
    shift: 'Morning',
    numberOfWorkers: 8,

    validFromDate: '2026-08-19',
    validFromTime: '07:00',
    validUntilDate: '2026-08-19',
    validUntilTime: '18:00',

    hazards: DEFAULT_HAZARDS.slice(0, 2),
    safetyControls: DEFAULT_SAFETY_CONTROLS,
    ppeChecklist: DEFAULT_PPE_ITEMS,
    attachments: [],
    approvals: [
      {
        id: 'app-p3-1',
        order: 1,
        roleNameEn: 'Permit Receiver',
        roleNameAr: 'مستلم التصريح (المشرف الميداني)',
        assignedUserName: 'Lead Sup. Hassan Mahmoud',
        status: 'Pending'
      }
    ],
    currentApprovalIndex: 0,
    extensions: [],
    suspensions: [],
    status: 'Draft',
    createdAt: '2026-08-17T16:30:00.000Z',
    createdBy: 'Lead Sup. Hassan Mahmoud'
  }
];

export const seedPermits: WorkPermit[] = seedWorkPermits;

export const seedPermitAuditLogs: PermitAuditLog[] = [
  {
    id: 'pal-1',
    recordType: 'StartCard',
    recordId: 'sc-101',
    recordNumber: 'SC-2026-00101',
    projectId: 'proj-1',
    userId: 'usr-3',
    userName: 'Eng. Yousef Al-Harbi',
    userRoles: ['Site Supervisor'],
    action: 'Created',
    newStatus: 'Draft',
    comments: 'Initial Start Card generated for Pier 24 excavation.',
    timestamp: '2026-08-13T10:00:00.000Z'
  },
  {
    id: 'pal-2',
    recordType: 'StartCard',
    recordId: 'sc-101',
    recordNumber: 'SC-2026-00101',
    projectId: 'proj-1',
    userId: 'usr-3',
    userName: 'Eng. Yousef Al-Harbi',
    userRoles: ['Site Supervisor'],
    action: 'Submitted',
    previousStatus: 'Draft',
    newStatus: 'Submitted',
    comments: 'All 12 checklist gates completed and shop drawings attached.',
    timestamp: '2026-08-14T15:10:00.000Z'
  },
  {
    id: 'pal-3',
    recordType: 'StartCard',
    recordId: 'sc-101',
    recordNumber: 'SC-2026-00101',
    projectId: 'proj-1',
    userId: 'usr-2',
    userName: 'Eng. Khalid Bin Abdulaziz',
    userRoles: ['Project Manager'],
    action: 'Approved',
    previousStatus: 'Submitted',
    newStatus: 'Approved',
    comments: 'Final Project Manager sign-off approved after QA/QC & HSE clearance.',
    timestamp: '2026-08-14T18:00:00.000Z'
  },
  {
    id: 'pal-4',
    recordType: 'WorkPermit',
    recordId: 'ptw-101',
    recordNumber: 'PTW-2026-000101',
    projectId: 'proj-1',
    userId: 'usr-2',
    userName: 'Eng. Khalid Bin Abdulaziz',
    userRoles: ['Project Manager'],
    action: 'Approved',
    previousStatus: 'Submitted',
    newStatus: 'Active',
    comments: 'Permit granted and validated on site with QR token PTW-2026-000101.',
    timestamp: '2026-08-17T07:00:00.000Z'
  },
  {
    id: 'pal-5',
    recordType: 'WorkExecution',
    recordId: 'act-1011',
    recordNumber: 'ACT-RYD-001',
    projectId: 'proj-1',
    userId: 'usr-3',
    userName: 'Eng. Yousef Al-Harbi',
    userRoles: ['Site Supervisor'],
    action: 'Work Started',
    previousStatus: 'Authorized to Start',
    newStatus: 'Work Started',
    comments: 'Crew mobilized on site. Excavator CAT 336 started trenching.',
    timestamp: '2026-08-17T07:15:00.000Z'
  }
];
