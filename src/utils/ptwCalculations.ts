/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import { 
  Activity, 
  WorkItem, 
  Project, 
  StartCard, 
  WorkPermit, 
  PermitTypeConfig, 
  AuthorizationEvaluation, 
  WorkAuthorizationStatus, 
  StartCardChecklistItem, 
  PTWHazardItem, 
  PTWSafetyControlItem, 
  PTWPPEItem,
  RiskLevel
} from '../types';

/**
 * Standard default Permit Types based on global construction safety standards
 */
export const DEFAULT_PERMIT_TYPES: PermitTypeConfig[] = [
  {
    id: 'pt-gen',
    code: 'GWP',
    nameEn: 'General Work Permit',
    nameAr: 'تصريح عمل عام',
    icon: 'FileText',
    descriptionEn: 'Standard authorization for general construction and civil works',
    descriptionAr: 'تصريح قياسي للأعمال الإنشائية والمدنية العامة بالموقع',
    defaultRiskLevel: 'Low',
    defaultValidityHours: 24,
    mandatoryControls: ['ctrl-barricade', 'ctrl-ppe', 'ctrl-housekeeping'],
    requiredPPE: ['ppe-helmet', 'ppe-shoes', 'ppe-vest'],
    isSystem: true
  },
  {
    id: 'pt-hot',
    code: 'HWP',
    nameEn: 'Hot Work Permit',
    nameAr: 'تصريح أعمال ساخنة وحرارية (لحام وقطع)',
    icon: 'Flame',
    descriptionEn: 'Required for welding, cutting, grinding, burning, or open flames',
    descriptionAr: 'إلزامي لعمليات اللحام، القطع بالصاروخ، واستخدام اللهب والحرارة العالية',
    defaultRiskLevel: 'High',
    defaultValidityHours: 8,
    mandatoryControls: ['ctrl-fire-ext', 'ctrl-fire-watch', 'ctrl-combustibles-cleared', 'ctrl-barricade', 'ctrl-gas-test'],
    requiredPPE: ['ppe-helmet', 'ppe-shoes', 'ppe-vest', 'ppe-face-shield', 'ppe-gloves-heat'],
    isSystem: true
  },
  {
    id: 'pt-height',
    code: 'WAH',
    nameEn: 'Work at Height Permit',
    nameAr: 'تصريح عمل على ارتفاعات وسقالات (> 1.8 م)',
    icon: 'Building',
    descriptionEn: 'Mandatory for all tasks performed at 1.8m or higher above ground',
    descriptionAr: 'إلزامي لكافة الأعمال المنفذة على ارتفاع 1.8 متر فأكثر عن مستوى الأرض',
    defaultRiskLevel: 'High',
    defaultValidityHours: 12,
    mandatoryControls: ['ctrl-fall-protection', 'ctrl-scaffold-tag', 'ctrl-barricade-below', 'ctrl-weather-check', 'ctrl-tool-lanyard'],
    requiredPPE: ['ppe-helmet', 'ppe-shoes', 'ppe-vest', 'ppe-harness', 'ppe-shock-lanyard'],
    isSystem: true
  },
  {
    id: 'pt-confined',
    code: 'CSE',
    nameEn: 'Confined Space Entry Permit',
    nameAr: 'تصريح دخول الأماكن المغلقة والضيقة',
    icon: 'Box',
    descriptionEn: 'For excavations deeper than 1.5m, manholes, tanks, or shafts',
    descriptionAr: 'خاص بالحفريات العميقة فوق 1.5م والمناهل والخزانات والمساحات المحصورة',
    defaultRiskLevel: 'Critical',
    defaultValidityHours: 8,
    mandatoryControls: ['ctrl-gas-test', 'ctrl-ventilation', 'ctrl-standby-man', 'ctrl-rescue-plan', 'ctrl-entry-log', 'ctrl-lighting-low-v'],
    requiredPPE: ['ppe-helmet', 'ppe-shoes', 'ppe-vest', 'ppe-respiratory', 'ppe-harness-rescue'],
    isSystem: true
  },
  {
    id: 'pt-excavation',
    code: 'EXC',
    nameEn: 'Excavation & Trenching Permit',
    nameAr: 'تصريح أعمال الحفر والخنادق الإنشائية',
    icon: 'Shovel',
    descriptionEn: 'Underground service detection, shoring, benching, and deep earthworks',
    descriptionAr: 'كشف التمديدات والخدمات الأرضية، سند جوانب الحفر، والردم الإنشائي',
    defaultRiskLevel: 'High',
    defaultValidityHours: 24,
    mandatoryControls: ['ctrl-underground-scan', 'ctrl-shoring-sloping', 'ctrl-barricade-edge', 'ctrl-ladder-access', 'ctrl-spoil-pile-distance'],
    requiredPPE: ['ppe-helmet', 'ppe-shoes', 'ppe-vest', 'ppe-gloves'],
    isSystem: true
  },
  {
    id: 'pt-lifting',
    code: 'LIFT',
    nameEn: 'Critical Lifting Permit',
    nameAr: 'تصريح عمليات الرفع والرافعات الحرجة',
    icon: 'Anchor',
    descriptionEn: 'Mobile cranes, tower cranes, tandem lifts, or hoisting over structures',
    descriptionAr: 'تشغيل الرافعات البرجية والمتحركة، الرفع المزدوج، والتحميل فوق المنشآت',
    defaultRiskLevel: 'Critical',
    defaultValidityHours: 12,
    mandatoryControls: ['ctrl-lift-plan', 'ctrl-banksman-rigger', 'ctrl-outrigger-pads', 'ctrl-crane-inspection-cert', 'ctrl-exclusion-zone'],
    requiredPPE: ['ppe-helmet', 'ppe-shoes', 'ppe-vest', 'ppe-gloves'],
    isSystem: true
  },
  {
    id: 'pt-elec',
    code: 'ELEC',
    nameEn: 'Electrical Work & Isolation (LOTO)',
    nameAr: 'تصريح أعمال الكهرباء والعزل وتأمين الطاقة (LOTO)',
    icon: 'Zap',
    descriptionEn: 'High/low voltage work, panel connections, lockout/tagout procedures',
    descriptionAr: 'أعمال الجهد المتوسط والعالي، صيانة اللوحات الكهربائية والعزل الإقفالي',
    defaultRiskLevel: 'Critical',
    defaultValidityHours: 8,
    mandatoryControls: ['ctrl-loto-applied', 'ctrl-zero-energy-test', 'ctrl-insulated-tools', 'ctrl-warning-notices', 'ctrl-competent-electrician'],
    requiredPPE: ['ppe-helmet', 'ppe-shoes-dielectric', 'ppe-vest', 'ppe-gloves-rubber', 'ppe-arc-face-shield'],
    isSystem: true
  },
  {
    id: 'pt-night',
    code: 'NIGHT',
    nameEn: 'Night Work Permit',
    nameAr: 'تصريح العمل الليلي والورديات الإضافية',
    icon: 'Moon',
    descriptionEn: 'Night shift operations requiring high-lumen tower lighting and extra supervision',
    descriptionAr: 'العمل في الورديات الليلية مع تأمين أبراج الإضاءة الكاشفة والإشراف الإضافي',
    defaultRiskLevel: 'Medium',
    defaultValidityHours: 10,
    mandatoryControls: ['ctrl-tower-lighting', 'ctrl-emergency-access-lit', 'ctrl-supervisor-present', 'ctrl-reflective-vests'],
    requiredPPE: ['ppe-helmet', 'ppe-shoes', 'ppe-vest-high-vis', 'ppe-headlamp'],
    isSystem: true
  },
  {
    id: 'pt-traffic',
    code: 'TRAF',
    nameEn: 'Road & Traffic Management Permit',
    nameAr: 'تصريح إغلاق مسارات الطرق وإدارة المرور',
    icon: 'Car',
    descriptionEn: 'Work affecting public highways, access roads, detours, and logistics routes',
    descriptionAr: 'الأعمال المؤثرة على مسارات الشوارع العامة والتحويلات المرورية بالموقع',
    defaultRiskLevel: 'High',
    defaultValidityHours: 24,
    mandatoryControls: ['ctrl-traffic-plan', 'ctrl-flashing-beacons', 'ctrl-flagman-spotter', 'ctrl-concrete-jersey-barriers'],
    requiredPPE: ['ppe-helmet', 'ppe-shoes', 'ppe-vest-class3'],
    isSystem: true
  }
];

/**
 * Default Start Card Checklist Template
 */
export const DEFAULT_START_CARD_CHECKLIST: StartCardChecklistItem[] = [
  {
    id: 'sc-chk-1',
    titleEn: 'Latest approved shop drawings available on site',
    titleAr: 'توفر أحدث المخططات التنفيذية المعتمدة (Approved Shop Drawings) بالموقع',
    category: 'Drawings',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-2',
    titleEn: 'Method Statement approved by Consultant / Engineer',
    titleAr: 'طريقة العمل والمنهجية الفنية (Method Statement) معتمدة من الاستشاري',
    category: 'Methods',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-3',
    titleEn: 'Risk Assessment (RA) / JSA approved and communicated to crew',
    titleAr: 'تقييم المخاطر (JSA / Risk Assessment) معتمد وموضح لطاقم العمل',
    category: 'Safety',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-4',
    titleEn: 'Required materials inspected and approved (MIR / Inspection)',
    titleAr: 'المواد المطلوبة معتمدة ومفحوصة بالمستودع وبالموقع (MIR)',
    category: 'Resources',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-5',
    titleEn: 'Sufficient qualified manpower & skilled workforce available',
    titleAr: 'توفر القوة البشرية والعمالة الماهرة المؤهلة لتنفيذ البند',
    category: 'Resources',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-6',
    titleEn: 'Required heavy equipment and tools inspected and calibrated',
    titleAr: 'فحص وصلاحية المعدات الثقيلة والآليات وتوافر شهادات المشغلين',
    category: 'Resources',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-7',
    titleEn: 'Survey setting-out and grid benchmarks verified by Surveyor',
    titleAr: 'الأعمال المساحية ونقاط التموضع والربط المساحي منتهية وموثقة',
    category: 'Quality',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-8',
    titleEn: 'Work area accessible, clear of obstruction and inspected',
    titleAr: 'منطقة العمل آمنة ومتاحة للدخول وخالية من المعوقات والتراكمات',
    category: 'Site',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-9',
    titleEn: 'Safety barriers, signage, and emergency access established',
    titleAr: 'تثبيت الحواجز التحذيرية واللوحات الإرشادية ومخارج الطوارئ',
    category: 'Safety',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-10',
    titleEn: 'QA/QC Inspection and Test Plan (ITP) requirements ready',
    titleAr: 'جاهزية خطة ضبط الجودة ونقاط التوقف والتفتيش (ITP)',
    category: 'Quality',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-11',
    titleEn: 'Preceding dependent activities inspected and officially handed over',
    titleAr: 'اكتمال واعتماد الأنشطة السابقة المرتبطة واستلام المحاضر رسمياً',
    category: 'Prerequisites',
    status: 'Pending',
    isMandatory: true
  },
  {
    id: 'sc-chk-12',
    titleEn: 'Required Work Permits (PTW) identified and initiated',
    titleAr: 'تحديد تصاريح العمل المطلوبة (PTW) وبدء إجراءات إصدارها',
    category: 'Safety',
    status: 'Pending',
    isMandatory: true
  }
];

/**
 * Standard Safety Controls for PTW
 */
export const DEFAULT_SAFETY_CONTROLS: PTWSafetyControlItem[] = [
  { id: 'ctrl-barricade', controlEn: 'Physical barricades & danger tape installed', controlAr: 'تثبيت الحواجز الصلبة وأشرطة التحذير حول منطقة العمل', isMandatory: true, isImplemented: false },
  { id: 'ctrl-signage', controlEn: 'Warning and safety signage displayed clearly', controlAr: 'وضع اللوحات التحذيرية وإرشادات السلامة في مكان بارز', isMandatory: true, isImplemented: false },
  { id: 'ctrl-ppe', controlEn: 'Full mandatory PPE verified and worn by all personnel', controlAr: 'التحقق من ارتداء جميع العمال لمهمات الوقاية الشخصية الإلزامية', isMandatory: true, isImplemented: false },
  { id: 'ctrl-fire-ext', controlEn: 'Certified fire extinguishers available on site (within 10m)', controlAr: 'توفر طفايات حريق صالحة ومفحوصة على مسافة لا تتجاوز 10م', isMandatory: false, isImplemented: false },
  { id: 'ctrl-fire-watch', controlEn: 'Dedicated competent Fire Watch assigned during & 30 min after work', controlAr: 'تعيين مراقب حريق مؤهل أثناء العمل ولمدة 30 دقيقة بعد الانتهاء', isMandatory: false, isImplemented: false },
  { id: 'ctrl-gas-test', controlEn: 'Multi-gas atmospheric testing performed and logged', controlAr: 'فحص نسبة الغازات والأكسجين وتسجيل القراءات في السجل', isMandatory: false, isImplemented: false },
  { id: 'ctrl-ventilation', controlEn: 'Forced mechanical ventilation/blowers operating', controlAr: 'تشغيل مراوح وشفاطات التهوية الميكانيكية المستمرة', isMandatory: false, isImplemented: false },
  { id: 'ctrl-fall-protection', controlEn: '100% fall tie-off, certified anchor points & static lines', controlAr: 'تأمين نقاط التثبيت المعتمدة واستخدام حبال الأمان المزدوجة', isMandatory: false, isImplemented: false },
  { id: 'ctrl-scaffold-tag', controlEn: 'Green scaffolding inspection tag verified and signed today', controlAr: 'التحقق من وجود كارت السقالة الأخضر ساري المفعول وموقع اليوم', isMandatory: false, isImplemented: false },
  { id: 'ctrl-loto-applied', controlEn: 'LOTO locks & tags installed with key in possession of authorized person', controlAr: 'تطبيق إجراءات القفل والعزل وتثبيت بطاقات LOTO', isMandatory: false, isImplemented: false },
  { id: 'ctrl-zero-energy-test', controlEn: 'Zero energy state verified with calibrated voltage tester', controlAr: 'التأكد من انعدام التيار واختبار الجهد الكهربائي بأجهزة معايرة', isMandatory: false, isImplemented: false },
  { id: 'ctrl-spotter', controlEn: 'Dedicated safety spotter / Banksman stationed', controlAr: 'تواجد مراقب سلامة وموجه معدات (Banksman) متفرغ', isMandatory: false, isImplemented: false },
  { id: 'ctrl-emergency-access', controlEn: 'Emergency vehicle access unobstructed and first aid kit present', controlAr: 'مسار مركبات الإسعاف والطوارئ سالك مع توفر حقيبة إسعافات', isMandatory: true, isImplemented: false },
  { id: 'ctrl-rescue-plan', controlEn: 'Confined space / working at height rescue plan and team ready', controlAr: 'جاهزية خطة وفرق الإنقاذ الميداني في حال حدوث طارئ', isMandatory: false, isImplemented: false }
];

/**
 * Standard PPE Checklist Items
 */
export const DEFAULT_PPE_ITEMS: PTWPPEItem[] = [
  { id: 'ppe-helmet', ppeEn: 'Safety Helmet (Hard Hat)', ppeAr: 'خوذة السلامة المعتمدة', isRequired: true, isAvailable: true },
  { id: 'ppe-shoes', ppeEn: 'Safety Boots (Steel Toe)', ppeAr: 'حذاء السلامة بمقدمة فولاذية', isRequired: true, isAvailable: true },
  { id: 'ppe-vest', ppeEn: 'High-Visibility Reflective Vest', ppeAr: 'سترة عاكسة للضوء عالية الوضوح', isRequired: true, isAvailable: true },
  { id: 'ppe-gloves', ppeEn: 'Safety Hand Gloves (Cut/Impact Resistant)', ppeAr: 'قفازات حماية اليدين المقاومة للصدمات والقطع', isRequired: true, isAvailable: true },
  { id: 'ppe-glasses', ppeEn: 'Safety Glasses / Goggles', ppeAr: 'نظارات حماية العين المقاومة للصدمات', isRequired: true, isAvailable: true },
  { id: 'ppe-face-shield', ppeEn: 'Full Face Shield (Grinding/Welding)', ppeAr: 'واقي الوجه الكامل لأعمال اللحام والجلخ', isRequired: false, isAvailable: false },
  { id: 'ppe-ear', ppeEn: 'Hearing Protection (Ear Plugs/Muffs)', ppeAr: 'سدادات وأغطية حماية الأذن من الضوضاء', isRequired: false, isAvailable: false },
  { id: 'ppe-respiratory', ppeEn: 'Respiratory Protection / Dust Mask / Filter', ppeAr: 'كمامة وأقنعة التنقية وفلاتر تنفس الغبار والغازات', isRequired: false, isAvailable: false },
  { id: 'ppe-harness', ppeEn: 'Full Body Safety Harness with Double Lanyard', ppeAr: 'حزام أمان كامل للجسم مع حبل مزدوج وممتص للصدمات', isRequired: false, isAvailable: false },
  { id: 'ppe-welding-leather', ppeEn: 'Leather Welding Apron & Sleeves', ppeAr: 'مريلة وأكمام جلدية واقية للحام', isRequired: false, isAvailable: false }
];

/**
 * Standard Hazards Matrix Templates
 */
export const DEFAULT_HAZARDS: PTWHazardItem[] = [
  {
    id: 'hz-1',
    hazardEn: 'Fall from height (> 1.8m) / edge exposure',
    hazardAr: 'السقوط من مكان مرتفع (> 1.8 متر) أو من حواف المبنى',
    riskLevel: 'High',
    controlMeasureEn: 'Full body harness with 100% tie-off, handrails, toe boards & safety netting',
    controlMeasureAr: 'استخدام حزام الأمان المزدوج، تثبيت حواجز الحواف، وشباك التقاط السقوط',
    responsiblePerson: 'HSE Officer & Site Sup.',
    status: 'Controlled'
  },
  {
    id: 'hz-2',
    hazardEn: 'Falling objects & tools from overhead work',
    hazardAr: 'سقوط الأدوات والمواد من الأعلى على العاملين بالأسفل',
    riskLevel: 'Medium',
    controlMeasureEn: 'Tool lanyards, toe boards, exclusion barricades below, hard hat zone',
    controlMeasureAr: 'ربط الأدوات اليدوية، حواجز الحواف السفلية، وتطويق المنطقة السفلية ومنع المرور',
    responsiblePerson: 'Site Foreman',
    status: 'Controlled'
  },
  {
    id: 'hz-3',
    hazardEn: 'Fire, sparks & hot slag ignition',
    hazardAr: 'اشتعال الحرائق وتطاير الشرر وقطع المعادن الساخنة',
    riskLevel: 'High',
    controlMeasureEn: 'Fire blanket, continuous fire watch, 2x 6kg CO2/DCP fire extinguishers within 5m',
    controlMeasureAr: 'بطانيات مقاومة للحريق، مراقب حريق مخصص، وطفايات حريق بودرة/CO2 قريبة',
    responsiblePerson: 'Fire Watcher',
    status: 'Controlled'
  },
  {
    id: 'hz-4',
    hazardEn: 'Contact with underground live electrical or utility cables',
    hazardAr: 'ملامسة أو إتلاف كابلات الكهرباء أو خطوط الخدمات المدفونة',
    riskLevel: 'Critical',
    controlMeasureEn: 'Cable locator scan, manual trial pits before mechanized excavation, permit to dig',
    controlMeasureAr: 'مسح الموقع بكاشف الكابلات، عمل حفر استكشافية يدوية قبل الحفر الميكانيكي',
    responsiblePerson: 'Surveyor & Electrical Eng.',
    status: 'Controlled'
  },
  {
    id: 'hz-5',
    hazardEn: 'Trench / excavation wall collapse',
    hazardAr: 'انهيار التربة وجوانب الحفر على العاملين بالداخل',
    riskLevel: 'Critical',
    controlMeasureEn: 'Approved trench shoring / stepping 45 degrees, spoil heap kept 1.5m away from edge',
    controlMeasureAr: 'تدعيم الجوانب بستائر معدنية أو ميول آمنة، وإبعاد نواتج الحفر 1.5م عن الحافة',
    responsiblePerson: 'Civil Engineer',
    status: 'Controlled'
  },
  {
    id: 'hz-6',
    hazardEn: 'Hazardous / toxic gases or oxygen deficiency (< 19.5%)',
    hazardAr: 'تراكم الغازات السامة أو نقص نسبة الأكسجين (< 19.5%) بالأماكن المغلقة',
    riskLevel: 'Critical',
    controlMeasureEn: 'Continuous calibrated 4-gas detector monitoring, forced blower ventilation',
    controlMeasureAr: 'قياس دوري بكاشف الغازات الرباعي، تشغيل شفاطات ومضخات هواء نقية باستمرار',
    responsiblePerson: 'HSE Gas Tester',
    status: 'Controlled'
  },
  {
    id: 'hz-7',
    hazardEn: 'Electric shock / electrocution / arc flash',
    hazardAr: 'الصعق الكهربائي، الالتماس، أو القوس الكهربائي المفاجئ',
    riskLevel: 'Critical',
    controlMeasureEn: 'LOTO isolation, lockout box, insulated rubber gloves, calibrated testing tools',
    controlMeasureAr: 'عزل القواطع وتثبيت أقفال LOTO، قفازات عازلة، وأجهزة اختبار معايرة',
    responsiblePerson: 'Senior Electrician',
    status: 'Controlled'
  }
];

/**
 * Check if a Permit has expired based on validUntil date & time
 */
export function isPermitExpired(permit: WorkPermit): boolean {
  if (!permit.validUntilDate) return false;
  const timeStr = permit.validUntilTime || '23:59';
  const expiryDateTime = new Date(`${permit.validUntilDate}T${timeStr}:00`);
  return new Date() > expiryDateTime;
}

/**
 * Check if a Permit is expiring within specified hours threshold (default 4 hours)
 */
export function isPermitExpiringSoon(permit: WorkPermit, hoursThreshold: number = 4): boolean {
  if (permit.status !== 'Approved' && permit.status !== 'Active') return false;
  if (isPermitExpired(permit)) return false;
  const timeStr = permit.validUntilTime || '23:59';
  const expiryDateTime = new Date(`${permit.validUntilDate}T${timeStr}:00`).getTime();
  const now = new Date().getTime();
  const diffHours = (expiryDateTime - now) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= hoursThreshold;
}

/**
 * Core Authorization Engine: Evaluates strict "NO AUTHORIZATION = NO START" business logic
 */
export function evaluateActivityAuthorization(
  activity: Activity,
  workItem: WorkItem | undefined,
  project: Project | undefined,
  startCards: StartCard[],
  permits: WorkPermit[],
  allowGroupInheritance: boolean = true
): AuthorizationEvaluation {
  const activityNameEn = activity.nameEn;
  const activityNameAr = activity.nameAr;
  const workItemNameEn = workItem?.nameEn || 'Work Package';
  const workItemNameAr = workItem?.nameAr || 'حزمة العمل';
  const projectId = project?.id || workItem?.projectId || '';

  // Check if admin override was explicitly applied
  if (activity.overrideUsed) {
    return {
      activityId: activity.id,
      activityNameEn,
      activityNameAr,
      workItemId: activity.workItemId,
      workItemNameEn,
      workItemNameAr,
      projectId,
      isAuthorized: true,
      status: activity.isWorkStarted ? 'Work Started' : 'Authorized to Start',
      startCard: null,
      activePermit: null,
      startCardStatus: 'Approved',
      permitStatus: 'Approved',
      missingRequirements: [],
      isOverridden: true,
      overrideDetails: {
        reason: activity.overrideReason || 'Administrative Emergency Override',
        by: activity.overrideBy || 'Super Admin',
        at: activity.overrideAt || new Date().toISOString()
      }
    };
  }

  // Check if activity is currently explicitly suspended
  if (activity.isSuspended) {
    return {
      activityId: activity.id,
      activityNameEn,
      activityNameAr,
      workItemId: activity.workItemId,
      workItemNameEn,
      workItemNameAr,
      projectId,
      isAuthorized: false,
      status: 'Suspended',
      startCard: null,
      activePermit: null,
      startCardStatus: 'None',
      permitStatus: 'Suspended',
      missingRequirements: [
        {
          en: `Activity suspended: ${activity.suspendedReason || 'Safety or compliance hold'}`,
          ar: `النشاط موقوف مؤقتاً: ${activity.suspendedReason || 'إيقاف للسلامة أو مراجعة الضوابط'}`,
          category: 'Suspension'
        }
      ],
      isOverridden: false
    };
  }

  // 1. Find matching Start Card (either activity-specific or group-level)
  let matchingStartCard = startCards.find(sc => sc.activityId === activity.id);
  if (!matchingStartCard && allowGroupInheritance) {
    matchingStartCard = startCards.find(sc => 
      sc.workItemId === activity.workItemId && 
      (sc.level === 'Group' || (sc.targetActivityIds && sc.targetActivityIds.includes(activity.id)))
    );
  }

  // 2. Find matching PTW (either activity-specific or group/startcard linked)
  let matchingPermit = permits.find(p => p.activityId === activity.id && p.status !== 'Cancelled' && p.status !== 'Rejected');
  if (!matchingPermit && matchingStartCard) {
    matchingPermit = permits.find(p => p.startCardId === matchingStartCard?.id && p.status !== 'Cancelled' && p.status !== 'Rejected');
  }
  if (!matchingPermit && allowGroupInheritance) {
    matchingPermit = permits.find(p => p.workItemId === activity.workItemId && p.status !== 'Cancelled' && p.status !== 'Rejected');
  }

  const missing: { en: string; ar: string; category: 'StartCard' | 'PTW' | 'Checklist' | 'Documents' | 'Safety' | 'Suspension' }[] = [];

  // Evaluate Start Card Gate
  if (!matchingStartCard) {
    missing.push({
      en: 'Start Card has not been created or linked',
      ar: 'لم يتم إصدار أو ربط كارت بدء العمل (Start Card)',
      category: 'StartCard'
    });
  } else if (matchingStartCard.status !== 'Approved') {
    missing.push({
      en: `Start Card is ${matchingStartCard.status} (Approval required)`,
      ar: `كارت البداية في حالة (${matchingStartCard.status}) - يتطلب الاعتماد النهائي`,
      category: 'StartCard'
    });
  } else {
    // Check mandatory checklist items in Start Card
    const failedOrPendingItems = matchingStartCard.checklist.filter(c => c.isMandatory && c.status !== 'Pass');
    if (failedOrPendingItems.length > 0) {
      missing.push({
        en: `${failedOrPendingItems.length} mandatory Start Card checklist items are incomplete or failed`,
        ar: `يوجد ${failedOrPendingItems.length} بنود فحص إلزامية في كارت البداية غير مكتملة أو لم تجتز الفحص`,
        category: 'Checklist'
      });
    }
  }

  // Evaluate PTW Gate
  if (!matchingPermit) {
    missing.push({
      en: 'Permit to Work (PTW) is required and has not been issued',
      ar: 'تصريح العمل (PTW) مطلوب ولم يتم إصداره بعد',
      category: 'PTW'
    });
  } else {
    // Check PTW status
    if (matchingPermit.status === 'Suspended') {
      missing.push({
        en: 'Permit to Work is currently suspended',
        ar: 'تصريح العمل موقوف مؤقتاً',
        category: 'PTW'
      });
    } else if (matchingPermit.status === 'Closed') {
      missing.push({
        en: 'Permit to Work has been closed',
        ar: 'تصريح العمل مغلق ومكتمل',
        category: 'PTW'
      });
    } else if (matchingPermit.status !== 'Approved' && matchingPermit.status !== 'Active') {
      missing.push({
        en: `Permit to Work is in ${matchingPermit.status} status (Approval required)`,
        ar: `تصريح العمل في حالة (${matchingPermit.status}) - يتطلب الاعتماد والتفعيل`,
        category: 'PTW'
      });
    } else if (isPermitExpired(matchingPermit)) {
      missing.push({
        en: `Permit to Work has expired on ${matchingPermit.validUntilDate} ${matchingPermit.validUntilTime || ''} (Renewal/Extension required)`,
        ar: `انتهت صلاحية تصريح العمل بتاريخ ${matchingPermit.validUntilDate} ${matchingPermit.validUntilTime || ''} (يتطلب التمديد أو التجديد)`,
        category: 'PTW'
      });
    }

    // Check mandatory safety controls in PTW
    const missingControls = matchingPermit.safetyControls.filter(ctrl => ctrl.isMandatory && !ctrl.isImplemented);
    if (missingControls.length > 0) {
      missing.push({
        en: `${missingControls.length} mandatory HSE safety controls are not yet verified / implemented`,
        ar: `يوجد ${missingControls.length} ضوابط سلامة إلزامية في التصريح لم يتم التحقق من تنفيذها ميدانياً`,
        category: 'Safety'
      });
    }
  }

  // Determine overall status
  let calculatedStatus: WorkAuthorizationStatus = 'Planned';
  if (!matchingStartCard) {
    calculatedStatus = 'Ready for Start Card';
  } else if (matchingStartCard.status === 'Draft') {
    calculatedStatus = 'Start Card Draft';
  } else if (matchingStartCard.status === 'Submitted') {
    calculatedStatus = 'Start Card Submitted';
  } else if (matchingStartCard.status === 'Approved' && !matchingPermit) {
    calculatedStatus = 'PTW Required';
  } else if (matchingPermit && matchingPermit.status === 'Draft') {
    calculatedStatus = 'PTW Draft';
  } else if (matchingPermit && matchingPermit.status === 'Submitted') {
    calculatedStatus = 'PTW Submitted';
  } else if (matchingPermit && (matchingPermit.status === 'Approved' || matchingPermit.status === 'Active')) {
    if (missing.length === 0) {
      calculatedStatus = activity.isWorkStarted ? 'Work Started' : 'Authorized to Start';
    } else {
      calculatedStatus = 'PTW Approved'; // But with missing checklist/controls
    }
  }

  const isAuthorized = missing.length === 0;

  return {
    activityId: activity.id,
    activityNameEn,
    activityNameAr,
    workItemId: activity.workItemId,
    workItemNameEn,
    workItemNameAr,
    projectId,
    isAuthorized,
    status: calculatedStatus,
    startCard: matchingStartCard || null,
    activePermit: matchingPermit || null,
    startCardStatus: matchingStartCard?.status || 'None',
    permitStatus: matchingPermit?.status || 'None',
    missingRequirements: missing,
    isOverridden: false
  };
}

/**
 * Generate QR Code Data URL for scanning and mobile verification
 */
export async function generateQRCode(
  text: string, 
  options?: { darkColor?: string; width?: number; margin?: number }
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: options?.margin ?? 1,
      width: options?.width ?? 280,
      color: {
        dark: options?.darkColor || '#040957',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

/**
 * Generate structured QR Code data for Work Permit (PTW)
 * Formatted for instant human and scanner readability on mobile devices
 */
export async function generatePTWQRCode(permit: Partial<WorkPermit>, projectName?: string): Promise<string> {
  const lines = [
    `=== OFFICIAL WORK PERMIT (PTW) ===`,
    `Permit No: ${permit.permitNumber || 'PTW-2026-000000'}`,
    `Status: ${(permit.status || 'Draft').toUpperCase()}`,
    `Type: ${permit.permitTypeNameEn || 'General Permit'}${permit.permitTypeNameAr ? ` / ${permit.permitTypeNameAr}` : ''}`,
    `Risk Level: ${permit.riskLevel || 'Low'}`,
    `Project: ${projectName || permit.workLocation || 'Site'}`,
    `Work Area: ${permit.exactWorkArea || 'Designated Work Zone'}`,
    `Validity: ${permit.validFromDate || ''} ${permit.validFromTime || ''} to ${permit.validUntilDate || ''} ${permit.validUntilTime || ''}`,
    `Supervisor: ${permit.supervisorName || 'Site Supervisor'}`,
    `Crew Count: ${permit.numberOfWorkers || 1} Workers`,
    `Emergency: ${permit.emergencyContactPhone || '+966-555-911-000'}`,
    `Auth Token: PTW-${permit.id || 'NEW'}-${Date.now().toString(36).toUpperCase()}`
  ];
  return generateQRCode(lines.join('\n'), { width: 300, darkColor: '#040957' });
}

/**
 * Generate structured QR Code data for Start Card
 * Formatted for instant human and scanner readability on mobile devices
 */
export async function generateStartCardQRCode(startCard: Partial<StartCard>, projectName?: string): Promise<string> {
  const lines = [
    `=== SITE START WORK CARD ===`,
    `Card No: ${startCard.cardNumber || 'SC-2026-0000'} (REV-${startCard.revision || 1})`,
    `Status: ${(startCard.status || 'Draft').toUpperCase()}`,
    `Project: ${projectName || startCard.projectNameEn || 'Site Project'}`,
    `Zone / Level: ${startCard.workAreaZone || ''} ${startCard.floorLevel || ''}`.trim(),
    `Planned Dates: ${startCard.plannedStartDate || ''} -> ${startCard.plannedFinishDate || ''}`,
    `Crew Lead: ${startCard.workCrewLead || startCard.supervisorForeman || 'Site Foreman'}`,
    `Crew Count: ${startCard.numberOfWorkers || 1} Workers`,
    `Readiness: HSE Pre-Execution Clearance Verified`,
    `Auth Token: SC-${startCard.id || 'NEW'}-${Date.now().toString(36).toUpperCase()}`
  ].filter(Boolean);
  return generateQRCode(lines.join('\n'), { width: 300, darkColor: '#040957' });
}

