/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  mockUsers, 
  seedProjects, 
  seedWorkItems, 
  seedActivities, 
  seedWarehouse, 
  seedEquipment, 
  seedWorkers, 
  defaultSettings, 
  initialNotifications, 
  initialAuditLogs,
  initialProgressUpdates,
  initialSafetyRecords,
  initialDelays,
  initialIssues,
  initialAttendanceRecords
} from './data/seedData';
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
  UserRole, 
  User,
  SupervisorCheckIn,
  AttendanceRecord,
  ProgressUpdate,
  SafetyRecord,
  DelayRecord,
  IssueReport,
  SavedKpiReport,
  FieldRequest,
  FieldWorkSubmission
} from './types';
import { translations } from './utils/translation';
import { dbApi } from './lib/api';
import Dashboard from './components/Dashboard';
import KPIDashboard from './components/KPIDashboard';
import ProjectList from './components/ProjectList';
import WorkItemsList from './components/WorkItemsList';
import FieldOperations from './components/FieldOperations';
import InventoryModules from './components/InventoryModules';
import Settings from './components/Settings';
import ReportsPanel from './components/ReportsPanel';
import ConfirmModal from './components/ConfirmModal';
import UsersList from './components/UsersList';
import FieldPortal from './components/FieldPortal';

import { 
  Briefcase, 
  Layers, 
  Workflow, 
  Package, 
  Wrench, 
  Users, 
  Clock, 
  Building2, 
  FileText, 
  ShieldAlert, 
  Sun, 
  Moon, 
  Globe, 
  UserCircle, 
  Bell, 
  Activity as ActivityIcon,
  HelpCircle,
  Menu,
  X,
  Printer,
  BarChart3,
  ChevronRight
} from 'lucide-react';

export default function App() {
  // Load initial settings or setup client local storage
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    const saved = localStorage.getItem('pm_preferred_lang');
    return (saved as 'ar' | 'en') || 'ar'; // Default Language is Arabic
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('pm_dark_active') === 'true';
  });

  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [preselectedReport, setPreselectedReport] = useState<{category: any, id: string | string[], action?: 'print' | 'pdf'} | null>(null);
  const [isBackgroundPrinting, setIsBackgroundPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Real team users stored in local database
  const [users, setUsers] = useState<User[]>([]);

  // Real active user (Role-Based Access Control)
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[0]);

  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('pm_sidebar_collapsed') === 'true' || window.innerWidth < 1280;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280 && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    document.title = lang === 'ar' ? 'إدارة أنشطة المشروع' : 'Project Activities Management';
  }, [lang]);

  // Core databases
  const [projects, setProjects] = useState<Project[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fieldRequests, setFieldRequests] = useState<FieldRequest[]>([]);
  const [materials, setMaterials] = useState<WarehouseMaterial[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const handleAddFieldRequest = async (request: Omit<FieldRequest, 'id'>) => {
    try {
      const newRequest = {
        ...request,
        id: `req-${Date.now()}`
      };
      await dbApi.save('fieldRequests', newRequest);
      setFieldRequests(prev => [...prev, newRequest]);
    } catch (error) {
      console.error('Failed to save field request:', error);
    }
  };

  const handleUpdateFieldRequest = async (request: FieldRequest) => {
    try {
      await dbApi.save('fieldRequests', request);
      setFieldRequests(prev => prev.map(r => r.id === request.id ? request : r));
    } catch (error) {
      console.error('Failed to update field request:', error);
    }
  };
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  // Site Operations Submissions
  const [checkIns, setCheckIns] = useState<SupervisorCheckIn[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [safetyRecords, setSafetyRecords] = useState<SafetyRecord[]>([]);
  const [delays, setDelays] = useState<DelayRecord[]>([]);
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [savedKpiReports, setSavedKpiReports] = useState<SavedKpiReport[]>([]);
  const [fieldSubmissions, setFieldSubmissions] = useState<FieldWorkSubmission[]>([]);
  const [isFieldPortal, setIsFieldPortal] = useState<boolean>(() => {
    return window.location.search.includes('portal=field') || window.location.hash.includes('portal=field');
  });

  // Listen to URL changes (for back button, hash navigation, popstate, etc.)
  useEffect(() => {
    const handleUrlChange = () => {
      const hasPortal = window.location.search.includes('portal=field') || window.location.hash.includes('portal=field');
      setIsFieldPortal(hasPortal);
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    // Initial sync
    handleUrlChange();
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);


  // --- CONFIRMATION MODAL STATE ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDestructive: true,
    onConfirm: () => {},
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, isDestructive: boolean = true) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, isDestructive });
  };

  // Database Initialization Logic
  useEffect(() => {
    const initData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all data in parallel
        const [
          dbUsers, dbProjects, dbWorkItems, dbActivities, 
          dbMaterials, dbEquipment, dbWorkers, dbNotifications, 
          dbAuditLogs, dbSettings, dbCheckIns, dbAttendance, dbProgress, 
          dbSafety, dbDelays, dbIssues, dbSavedKpiReports, dbFieldSubmissions
        ] = await Promise.all([
          dbApi.getAll<User>('users'),
          dbApi.getAll<Project>('projects'),
          dbApi.getAll<WorkItem>('workItems'),
          dbApi.getAll<Activity>('activities'),
          dbApi.getAll<WarehouseMaterial>('warehouseMaterials'),
          dbApi.getAll<EquipmentItem>('equipmentItems'),
          dbApi.getAll<Worker>('workers'),
          dbApi.getAll<SystemNotification>('notifications'),
          dbApi.getAll<AuditLog>('auditLogs'),
          dbApi.getById<SystemSettings>('systemSettings', 'settings-global'),
          dbApi.getAll<SupervisorCheckIn>('checkIns'),
          dbApi.getAll<AttendanceRecord>('attendanceRecords'),
          dbApi.getAll<ProgressUpdate>('progressUpdates'),
          dbApi.getAll<SafetyRecord>('safetyRecords'),
          dbApi.getAll<DelayRecord>('delayRecords'),
          dbApi.getAll<IssueReport>('issueReports'),
          dbApi.getAll<SavedKpiReport>('savedKpiReports').catch(() => []),
          dbApi.getAll<FieldWorkSubmission>('fieldSubmissions').catch(() => [])
        ]);


        // Seed if completely empty (no users AND no projects)
        if (dbUsers.length === 0 && dbProjects.length === 0) {
          console.log("Seeding Database...");
          await Promise.all([
            dbApi.bulkSave('users', mockUsers),
            dbApi.bulkSave('projects', seedProjects),
            dbApi.bulkSave('workItems', seedWorkItems),
            dbApi.bulkSave('activities', seedActivities),
            dbApi.bulkSave('warehouseMaterials', seedWarehouse),
            dbApi.bulkSave('equipmentItems', seedEquipment),
            dbApi.bulkSave('workers', seedWorkers),
            dbApi.bulkSave('notifications', initialNotifications),
            dbApi.bulkSave('auditLogs', initialAuditLogs),
            dbApi.save('systemSettings', { ...defaultSettings, id: 'settings-global' }, true),
            dbApi.bulkSave('progressUpdates', initialProgressUpdates),
            dbApi.bulkSave('safetyRecords', initialSafetyRecords),
            dbApi.bulkSave('delayRecords', initialDelays),
            dbApi.bulkSave('issueReports', initialIssues)
          ]);
          // Refresh after seeding
          window.location.reload();
          return;
        }

        setUsers(dbUsers);
        setProjects(dbProjects);
        setWorkItems(dbWorkItems);
        setActivities(dbActivities);
        setMaterials(dbMaterials);
        setEquipment(dbEquipment);
        setWorkers(dbWorkers);
        setNotifications(dbNotifications);
        setAuditLogs(dbAuditLogs);
        
        // Ensure settings exist in DB, if not save defaults
        let effectiveSettings = dbSettings;
        if (!effectiveSettings) {
          effectiveSettings = { ...defaultSettings, id: 'settings-global' };
          dbApi.save('systemSettings', effectiveSettings, true).catch(console.error);
        }
        setSettings(effectiveSettings);
        
        setCheckIns(dbCheckIns);
        setAttendanceRecords(dbAttendance || []);
        let finalProgress = dbProgress;
        if (dbProgress.length === 0 && initialProgressUpdates.length > 0) {
          finalProgress = initialProgressUpdates;
          await dbApi.bulkSave('progressUpdates', initialProgressUpdates);
        }
        setProgressUpdates(finalProgress);
        setSafetyRecords(dbSafety);
        setDelays(dbDelays);
        setIssues(dbIssues);
        setSavedKpiReports(dbSavedKpiReports || []);
        setFieldSubmissions(dbFieldSubmissions || []);
        
        setCurrentUser(dbUsers[0] || mockUsers[0]);


      } catch (error: any) {
        console.error("Database connection failed:", error);
        setInitError(error.message || "Failed to connect to database");
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  // Language trigger helper
  const handleToggleLanguage = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('pm_preferred_lang', nextLang);
  };

  const handleToggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    localStorage.setItem('pm_dark_active', String(nextDark));
  };

  const handleToggleSidebar = () => {
    const nextCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextCollapsed);
    localStorage.setItem('pm_sidebar_collapsed', String(nextCollapsed));
  };

  // Log action automatically (Audit logs)
  const logSystemAction = async (actionName: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: actionName,
      timestamp: new Date().toISOString(),
      details: details
    };
    try {
      await dbApi.save('auditLogs', newLog);
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (e) {
      console.error("Failed to log action", e);
    }
  };

  // --- USER ACCESS MANAGEMENT SYSTEM HANDLERS ---
  const handleAddUser = async (user: User) => {
    try {
      if (!user.id) user.id = `user-${Date.now()}`;
      const savedUser = await dbApi.save<User>('users', user);
      setUsers(prev => [savedUser, ...prev]);
      logSystemAction('ADD_USER', `Added user card: ${user.name} with role ${user.role}`);
    } catch (e) {
      alert("Error saving user");
    }
  };

  const handleUpdateUser = async (id: string, updated: Partial<User>) => {
    try {
      const existing = users.find(u => u.id === id);
      if (!existing) return;
      const updatedUser = { ...existing, ...updated };
      await dbApi.save('users', updatedUser);
      setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
      if (id === currentUser.id) {
        setCurrentUser(updatedUser);
      }
      logSystemAction('UPDATE_USER', `Modified properties for user id: ${id}`);
    } catch (e) {
      alert("Error updating user");
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await dbApi.delete('users', id);
      setUsers(prev => prev.filter(u => u.id !== id));
      logSystemAction('DELETE_USER', `Ejected user account id: ${id}`);
    } catch (e) {
      alert("Error deleting user");
    }
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    logSystemAction('SWITCH_USER_IDENTITY', `Assumed active sandbox role of: ${user.name} as ${user.role}`);
  };

  // --- STATE MUTATORS / API INTEGRATION ---
  const handleAddProject = async (proj: Project) => {
    try {
      if (!proj.id) proj.id = `proj-${Date.now()}`;
      const saved = await dbApi.save<Project>('projects', proj);
      setProjects(prev => [saved, ...prev]);
      logSystemAction('ADD_PROJECT', `Created project: ${proj.projectNumber} - ${proj.nameEn}`);
    } catch (e) {
      alert("Error saving project");
    }
  };

  const handleUpdateProject = async (id: string, updated: Partial<Project>) => {
    try {
      const existing = projects.find(p => p.id === id);
      if (!existing) return;
      const updatedProject = { ...existing, ...updated };
      await dbApi.save('projects', updatedProject);
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      logSystemAction('UPDATE_PROJECT', `Updated project metadata id: ${id}`);
    } catch (e) {
      alert("Error updating project");
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await dbApi.delete('projects', id);
      setProjects(prev => prev.filter(p => p.id !== id));

      // Cascade delete related entities locally
      setWorkItems(prev => prev.filter(wi => wi.projectId !== id));
      setActivities(prev => prev.filter(a => {
        const wi = workItems.find(w => w.id === a.workItemId);
        return wi?.projectId !== id;
      }));
      setProgressUpdates(prev => prev.filter(p => p.projectId !== id));
      setAttendanceRecords(prev => prev.filter(a => a.projectId !== id));
      setCheckIns(prev => prev.filter(c => c.projectId !== id));
      setIssues(prev => prev.filter(i => i.projectId !== id));
      setDelays(prev => prev.filter(d => d.projectId !== id));
      setSafetyRecords(prev => prev.filter(s => s.projectId !== id));

      logSystemAction('DELETE_PROJECT', `Ejected project id: ${id}`);
    } catch (e) {
      alert("Error deleting project");
    }
  };

  const handleDuplicateProject = async (id: string) => {
    const parent = projects.find(p => p.id === id);
    if (!parent) return;

    const newId = `proj-${Date.now()}`;
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const duplicatedProj: Project = {
      ...parent,
      id: newId,
      projectNumber: `${parent.projectNumber}-DUP${randSuffix}`,
      nameAr: `${parent.nameAr} (مكرر)`,
      nameEn: `${parent.nameEn} (Dpl)`,
    };

    await dbApi.save('projects', duplicatedProj);
    setProjects(prev => [duplicatedProj, ...prev]);

    // Mirror linked WorkItems too!
    const parentWi = workItems.filter(wi => wi.projectId === id);
    for (const wi of parentWi) {
      const nextWiId = `wi-${Date.now()}-${Math.random()}`;
      const duplicatedWi: WorkItem = {
        ...wi,
        id: nextWiId,
        projectId: newId,
        itemNumber: `${wi.itemNumber}-D`
      };
      await dbApi.save('workItems', duplicatedWi);
      setWorkItems(prev => [...prev, duplicatedWi]);

      // Mirror Activities nested inside duplicated WorkItem!
      const parentActivities = activities.filter(act => act.workItemId === wi.id);
      for (const act of parentActivities) {
        const nextAct: Activity = {
          ...act,
          id: `act-${Date.now()}-${Math.random()}`,
          workItemId: nextWiId
        };
        await dbApi.save('activities', nextAct);
        setActivities(prev => [...prev, nextAct]);
      }
    }

    logSystemAction('DUPLICATE_PROJECT', `Duplicated project structure: ${parent.projectNumber}`);
  };

  const handleDeleteProjects = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => dbApi.delete('projects', id)));
      setProjects(prev => prev.filter(p => !ids.includes(p.id)));
      logSystemAction('BULK_DELETE_PROJECTS', `Deleted ${ids.length} projects successfully.`);
    } catch (e) {
      alert("Error during bulk delete");
    }
  };

  // Nested WorkItems
  const handleAddWorkItem = async (wi: WorkItem) => {
    if (!wi.id) wi.id = `wi-${Date.now()}`;
    const saved = await dbApi.save('workItems', wi);
    setWorkItems(prev => [...prev, saved]);
    logSystemAction('ADD_WORK_ITEM', `Added work item category: ${wi.itemNumber}`);
  };

  const handleDeleteWorkItem = async (id: string) => {
    await dbApi.delete('workItems', id);
    setWorkItems(prev => prev.filter(wi => wi.id !== id));
    logSystemAction('DELETE_WORK_ITEM', `Removed categoric sector id: ${id}`);
  };

  const handleAddActivity = async (act: Activity) => {
    if (!act.id) act.id = `act-${Date.now()}`;
    const saved = await dbApi.save('activities', act);
    setActivities(prev => [...prev, saved]);
    
    // Auto deduct inventory stocks
    if (act.materialAllocations) {
      for (const alloc of act.materialAllocations) {
        const mat = materials.find(m => m.id === alloc.id);
        if (mat) {
          const updMat = { 
            ...mat, 
            quantity: Math.max(0, mat.quantity - alloc.quantity),
            reservedStock: (mat.reservedStock || 0) + alloc.quantity
          };
          await dbApi.save('warehouseMaterials', updMat);
          setMaterials(prev => prev.map(m => m.id === mat.id ? updMat : m));
        }
      }
    }

    if (act.equipmentAllocations) {
      for (const alloc of act.equipmentAllocations) {
        const eq = equipment.find(e => e.id === alloc.id);
        if (eq) {
          const updEq = {
            ...eq,
            totalQuantity: Math.max(0, eq.totalQuantity - alloc.quantity),
            reservedQuantity: (eq.reservedQuantity || 0) + alloc.quantity
          };
          await dbApi.save('equipmentItems', updEq);
          setEquipment(prev => prev.map(e => e.id === eq.id ? updEq : e));
        }
      }
    }

    logSystemAction('ADD_ACTIVITY', `Created sub-activity: ${act.nameEn}`);
  };

  const handleDeleteActivity = async (id: string) => {
    await dbApi.delete('activities', id);
    setActivities(prev => prev.filter(act => act.id !== id));
    logSystemAction('DELETE_ACTIVITY', `Removed sub-activity: ${id}`);
  };

  const handleUpdateActivity = async (id: string, updated: Partial<Activity>) => {
    const existing = activities.find(a => a.id === id);
    if (!existing) return;
    const upd = { ...existing, ...updated };
    await dbApi.save('activities', upd);
    setActivities(prev => prev.map(act => act.id === id ? upd : act));
  };

  // Warehouse Material Stocks
  const handleAddMaterial = async (m: WarehouseMaterial) => {
    if (!m.id) m.id = `mat-${Date.now()}`;
    const saved = await dbApi.save('warehouseMaterials', m);
    setMaterials(prev => [...prev, saved]);
    logSystemAction('ADD_MATERIAL', `Catalogued raw material stock: ${m.code}`);
  };

  const handleUpdateMaterial = async (id: string, updated: Partial<WarehouseMaterial>) => {
    const existing = materials.find(m => m.id === id);
    if (!existing) return;
    const upd = { ...existing, ...updated };
    await dbApi.save('warehouseMaterials', upd);
    setMaterials(prev => prev.map(m => m.id === id ? upd : m));
  };

  const handleDeleteMaterial = async (id: string) => {
    await dbApi.delete('warehouseMaterials', id);
    setMaterials(prev => prev.filter(m => m.id !== id));
    logSystemAction('DELETE_MATERIAL', `Removed warehouse stock profile ID: ${id}`);
  };

  // Heavy Machinery Fleet
  const handleAddEquipment = async (e: EquipmentItem) => {
    if (!e.id) e.id = `eq-${Date.now()}`;
    const saved = await dbApi.save('equipmentItems', e);
    setEquipment(prev => [...prev, saved]);
    logSystemAction('ADD_EQUIPMENT', `Incorporated heavy fleet asset: ${e.code}`);
  };

  const handleUpdateEquipment = async (id: string, updated: Partial<EquipmentItem>) => {
    const existing = equipment.find(e => e.id === id);
    if (!existing) return;
    const upd = { ...existing, ...updated };
    await dbApi.save('equipmentItems', upd);
    setEquipment(prev => prev.map(e => e.id === id ? upd : e));
  };

  const handleDeleteEquipment = async (id: string) => {
    await dbApi.delete('equipmentItems', id);
    setEquipment(prev => prev.filter(e => e.id !== id));
    logSystemAction('DELETE_EQUIPMENT', `Ejected fleet asset: ${id}`);
  };

  // HR Workforce registry
  const handleAddWorker = async (w: Worker) => {
    if (!w.id) w.id = `worker-${Date.now()}`;
    const saved = await dbApi.save('workers', w);
    setWorkers(prev => [...prev, saved]);
    logSystemAction('ADD_WORKER', `Enrolled labour resource ID: ${w.badgeNumber}`);
  };

  const handleUpdateWorker = async (id: string, updated: Partial<Worker>) => {
    const existing = workers.find(w => w.id === id);
    if (!existing) return;
    const upd = { ...existing, ...updated };
    await dbApi.save('workers', upd);
    setWorkers(prev => prev.map(w => w.id === id ? upd : w));
  };

  const handleDeleteWorker = async (id: string) => {
    await dbApi.delete('workers', id);
    setWorkers(prev => prev.filter(w => w.id !== id));
    logSystemAction('DELETE_WORKER', `Enrollment terminated worker id: ${id}`);
  };

  // Notifications Queue
  const handleMarkNotificationRead = async (id: string) => {
    try {
      const notif = notifications.find(n => n.id === id);
      if (notif) {
        const updated = { ...notif, isRead: true };
        await dbApi.save('notifications', updated);
        setNotifications(prev => prev.map(n => n.id === id ? updated : n));
      }
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      // Delete all notifications from Firestore
      await Promise.all(notifications.map(n => dbApi.delete('notifications', n.id)));
      setNotifications([]);
    } catch (e) {
      console.error("Failed to clear notifications", e);
    }
  };

  const handleUpdateSettings = async (updated: SystemSettings) => {
    try {
      const payload = { ...updated, id: 'settings-global' };
      // Force overwrite to clear out any old large fields that might cause 1MB limit issues
      await dbApi.save('systemSettings', payload, true);
      setSettings(payload);
      logSystemAction('UPDATE_SETTINGS', 'Reconfigured Corporate letterheads and VP seal credentials.');
    } catch (e) {
      console.error("Failed to update settings", e);
      alert(lang === 'ar' ? "فشل حفظ الإعدادات - قد يكون حجم الملف كبيراً جداً" : "Failed to update settings - document size may be too large");
    }
  };

  // Supervisor portal logs checkins
  const handleAddCheckIn = async (checkIn: SupervisorCheckIn) => {
    try {
      if (!checkIn.id) checkIn.id = `ci-${Date.now()}`;
      const saved = await dbApi.save<SupervisorCheckIn>('checkIns', checkIn);
      setCheckIns(prev => [saved, ...prev]);
      logSystemAction('SUPERVISOR_CHECKIN', `Verified حضور as ${checkIn.supervisorName}`);
    } catch (e) {
      console.error("Failed to save check-in", e);
      alert(lang === 'ar' ? "فشل حفظ تسجيل الحضور" : "Failed to save check-in record");
    }
  };

  const handleAddAttendanceRecords = async (records: AttendanceRecord[]) => {
    try {
      const savedRecords = await Promise.all(
        records.map(async rec => {
          if (!rec.id) rec.id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          return await dbApi.save<AttendanceRecord>('attendanceRecords', rec);
        })
      );
      setAttendanceRecords(prev => [...savedRecords, ...prev]);
      logSystemAction('SUPERVISOR_ATTENDANCE', `Registered daily attendance for ${records.length} employees`);
    } catch (e) {
      console.error("Failed to save attendance records", e);
      alert(lang === 'ar' ? "فشل حفظ كشف تحضير الموظفين" : "Failed to save employee attendance records");
    }
  };

  // --- FIELD WORK PORTAL SUBMISSIONS & APPROVALS ---
  const handleAddPendingSubmission = async (submission: FieldWorkSubmission) => {
    try {
      const saved = await dbApi.save<FieldWorkSubmission>('fieldSubmissions', submission);
      setFieldSubmissions(prev => [saved, ...prev]);
      
      // Release workers immediately on submission if an activity is completed in this update
      if (submission.progressUpdates && submission.progressUpdates.length > 0) {
        const updatedActivities = [...activities];
        let hasChanges = false;
        
        for (const upd of submission.progressUpdates) {
          const actIdx = updatedActivities.findIndex(a => a.id === upd.activityId);
          if (actIdx !== -1) {
            const act = updatedActivities[actIdx];
            const currentTotal = progressUpdates
              .filter(p => p.activityId === act.id)
              .reduce((sum, p) => sum + p.completedQuantity, 0);
            
            if (currentTotal + upd.completedQuantity >= act.totalQuantity) {
              updatedActivities[actIdx] = { ...act, workerIds: [] };
              hasChanges = true;
              await dbApi.save('activities', updatedActivities[actIdx]);
            }
          }
        }
        
        if (hasChanges) {
          setActivities(updatedActivities);
        }
      }

      logSystemAction('ADD_PENDING_FIELD_SUBMISSION', `Supervisor ${submission.supervisorName} submitted daily field logs.`);
    } catch (e) {
      console.error("Failed to save field submission", e);
      throw e;
    }
  };

  const handleApproveSubmission = async (submissionId: string, managerName: string) => {
    try {
      const sub = fieldSubmissions.find(s => s.id === submissionId);
      if (!sub) return;

      const updatedSub: FieldWorkSubmission = {
        ...sub,
        status: 'Approved',
        approvedAt: new Date().toISOString(),
        approvedBy: managerName
      };

      await dbApi.save<FieldWorkSubmission>('fieldSubmissions', updatedSub);
      setFieldSubmissions(prev => prev.map(s => s.id === submissionId ? updatedSub : s));

      // Import supervisor check-in
      if (sub.checkIn) {
        await handleAddCheckIn(sub.checkIn);
      }

      // Import attendance logs
      if (sub.attendanceRecords && sub.attendanceRecords.length > 0) {
        await handleAddAttendanceRecords(sub.attendanceRecords);
      }

      // Finalize Material Deliveries and Consumptions
      // Deliveries are logged. Actual deduction from warehouse stock happens on consumption 
      // or during planning (reserved). Here we just ensure deliveries are recorded in the system.
      if (sub.materialDeliveries && sub.materialDeliveries.length > 0) {
        for (const del of sub.materialDeliveries) {
          await dbApi.save('materialDeliveries', del);
        }
      }

      // Import progress/production updates (this will trigger stock deduction in handleAddProgressUpdate)
      if (sub.progressUpdates && sub.progressUpdates.length > 0) {
        for (const p of sub.progressUpdates) {
          await handleAddProgressUpdate(p);
        }
      }

      // Import safety records
      if (sub.safetyRecord) {
        await handleAddSafetyRecord(sub.safetyRecord);
      }

      // Import delay records
      if (sub.delayRecord) {
        await handleAddDelayRecord(sub.delayRecord);
      }

      // Import issue tickets
      if (sub.issueReport) {
        await handleAddIssueReport(sub.issueReport);
      }

      // System notification dispatch
      const approvalNotice: SystemNotification = {
        id: `approve-${Date.now()}`,
        titleAr: `تم اعتماد التقرير الميداني للمشروع`,
        titleEn: `Field Report Approved & Synced`,
        messageAr: `اعتمد المهندس ${managerName} التقرير المقدم من المشرف ${sub.supervisorName} وتم إدراج البيانات في المنصة الرئيسية بنجاح.`,
        messageEn: `Manager ${managerName} approved supervisor ${sub.supervisorName}'s daily field logs. Data successfully merged into active ledger.`,
        type: 'progress',
        timestamp: new Date().toISOString(),
        isRead: false
      };
      await dbApi.save('notifications', approvalNotice);
      setNotifications(prev => [approvalNotice, ...prev]);

      logSystemAction('APPROVE_FIELD_SUBMISSION', `Approved and merged daily report id: ${submissionId}`);
    } catch (e) {
      console.error("Failed to approve field submission", e);
      alert(lang === 'ar' ? "فشل اعتماد التقرير" : "Failed to approve report");
    }
  };

  const handleRejectSubmission = async (submissionId: string, reason: string) => {
    try {
      const sub = fieldSubmissions.find(s => s.id === submissionId);
      if (!sub) return;

      const updatedSub: FieldWorkSubmission = {
        ...sub,
        status: 'Rejected',
        rejectionReason: reason,
        approvedAt: new Date().toISOString()
      };

      await dbApi.save<FieldWorkSubmission>('fieldSubmissions', updatedSub);
      setFieldSubmissions(prev => prev.map(s => s.id === submissionId ? updatedSub : s));

      logSystemAction('REJECT_FIELD_SUBMISSION', `Rejected supervisor daily report id: ${submissionId} for reason: ${reason}`);
    } catch (e) {
      console.error("Failed to reject field submission", e);
      alert(lang === 'ar' ? "فشل رفض التقرير" : "Failed to reject report");
    }
  };

  const handleAddProgressUpdate = async (upd: ProgressUpdate) => {
    try {
      if (!upd.id) upd.id = `upd-${Date.now()}`;
      const saved = await dbApi.save<ProgressUpdate>('progressUpdates', upd);
      setProgressUpdates(prev => [saved, ...prev]);

      // Recalculate and update the overall project completion / S-curve metrics dynamically!
      // Deduct materials from stock based on actual consumptions
      if (upd.materialConsumptions && upd.materialConsumptions.length > 0) {
        for (const cons of upd.materialConsumptions) {
          const m = materials.find(mat => mat.id === cons.materialId);
          if (m) {
            // Subtract from reserved stock (since planning already moved it there)
            // or from regular quantity if reserved is insufficient
            const reservedToDeduct = Math.min(m.reservedStock || 0, cons.quantityUsed);
            const extraToDeduct = Math.max(0, cons.quantityUsed - reservedToDeduct);

            const updatedMat = { 
              ...m, 
              reservedStock: Math.max(0, (m.reservedStock || 0) - reservedToDeduct),
              quantity: Math.max(0, m.quantity - extraToDeduct) 
            };
            await dbApi.save('warehouseMaterials', updatedMat);
            setMaterials(prev => prev.map(mat => mat.id === m.id ? updatedMat : mat));

            // Trigger threshold notification alerts if stock dips below safety margin!
            const currentTotal = updatedMat.quantity;
            if (currentTotal < m.minThreshold) {
              const shortageNotice: SystemNotification = {
                id: `short-${Date.now()}-${m.id}`,
                titleAr: `تنبيه حرج بالمخزن: المادة ${m.nameAr} قاربت النفاد`,
                titleEn: `Low stock trigger: ${m.nameEn} is under boundary limit`,
                messageAr: `المخزون المتوفر (${currentTotal} ${m.unit}) هو اقل من حد الأمان المحدد بـ ${m.minThreshold}. يرجى الشراء السريع.`,
                messageEn: `Actual quantity (${currentTotal}) plummeted under critical buffer of ${m.minThreshold}.`,
                timestamp: new Date().toISOString(),
                type: 'inventory',
                isRead: false
              };
              await dbApi.save('notifications', shortageNotice);
              setNotifications(notifs => [shortageNotice, ...notifs]);
            }
          }
        }
      }

      // Check if activity is completed and release workers if so
      const act = activities.find(a => a.id === upd.activityId);
      if (act) {
        const totalDone = progressUpdates
          .filter(p => p.activityId === act.id)
          .reduce((sum, p) => sum + p.completedQuantity, 0) + upd.completedQuantity;
          
        if (totalDone >= act.totalQuantity) {
          // Activity is finished! Release workers to available workforce pool
          const releasedAct = {
            ...act,
            workerIds: [] 
          };
          await dbApi.save('activities', releasedAct);
          setActivities(prev => prev.map(a => a.id === act.id ? releasedAct : a));
          
          // Add completion notification
          const completionNotice: SystemNotification = {
            id: `done-${Date.now()}-${act.id}`,
            titleAr: `تم إنجاز النشاط: ${act.nameAr}`,
            titleEn: `Activity Completed: ${act.nameEn}`,
            messageAr: `تم إنجاز كافة الكميات المخططة لهذا النشاط بنجاح. تم تحرير العمالة المخصصة.`,
            messageEn: `All planned quantities for this activity have been completed. Assigned workforce is now available.`,
            timestamp: new Date().toISOString(),
            type: 'progress',
            isRead: false
          };
          await dbApi.save('notifications', completionNotice);
          setNotifications(notifs => [completionNotice, ...notifs]);
        }
      }

      logSystemAction('PROGRESS_UPDATE', `Submitted progressive site update at ${upd.time}`);
    } catch (e) {
      console.error("Failed to save progress update", e);
      alert(lang === 'ar' ? "فشل حفظ تحديث الإنجاز" : "Failed to save progress update");
    }
  };

  const handleDeleteProgressUpdate = async (id: string) => {
    try {
      await dbApi.delete('progressUpdates', id);
      setProgressUpdates(prev => prev.filter(u => u.id !== id));
      logSystemAction('DELETE_PROGRESS', `Removed field update ID: ${id}`);
    } catch (e) {
      console.error("Failed to delete progress update", e);
      alert(lang === 'ar' ? "فشل حذف التحديث" : "Failed to delete update");
    }
  };

  const handleDeleteAttendanceRecord = async (id: string) => {
    try {
      await dbApi.delete('attendanceRecords', id);
      setAttendanceRecords(prev => prev.filter(r => r.id !== id));
      logSystemAction('DELETE_ATTENDANCE', `Removed attendance record ID: ${id}`);
    } catch (e) {
      console.error("Failed to delete attendance record", e);
      alert(lang === 'ar' ? "فشل حذف سجل الحضور" : "Failed to delete attendance record");
    }
  };

  const handleSaveKpiReport = async (report: Omit<SavedKpiReport, 'id'>) => {
    try {
      const generatedId = `kpi-${Date.now()}`;
      const saved = await dbApi.save<SavedKpiReport>('savedKpiReports', { ...report, id: generatedId } as any);
      setSavedKpiReports(prev => [saved, ...prev]);

      // Save duplicate to the universal savedReports collection
      const universalReport = {
        id: `rep-kpi-${Date.now()}`,
        reportType: 'kpi',
        reportNumber: report.reportNumber,
        reportDate: report.reportDate,
        projectId: report.projectId,
        projectNameEn: report.projectNameEn,
        projectNameAr: report.projectNameAr,
        createdByName: report.createdByName,
        timestamp: report.timestamp,
        supervisorNotes: report.supervisorNotes,
        data: {
          targetQuantity: report.targetQuantity,
          actualQuantity: report.actualQuantity,
          attendanceRate: report.attendanceRate,
          presentWorkers: report.presentWorkers,
          absentWorkers: report.absentWorkers,
          efficiency: report.efficiency,
          safetyScore: report.safetyScore,
          openIssuesCount: report.openIssuesCount,
          capacityUtilization: report.capacityUtilization
        }
      };
      await dbApi.save('savedReports', universalReport);

      logSystemAction('SAVE_KPI', `Saved Daily KPI report: ${report.reportNumber}`);
    } catch (e) {
      console.error("Failed to save KPI report:", e);
      alert(lang === 'ar' ? "فشل حفظ تقرير KPI اليومي" : "Failed to save daily KPI report");
    }
  };

  const handleDeleteKpiReport = async (id: string) => {
    try {
      await dbApi.delete('savedKpiReports', id);
      setSavedKpiReports(prev => prev.filter(r => r.id !== id));
      logSystemAction('DELETE_KPI', `Deleted Saved KPI report ID: ${id}`);
    } catch (e) {
      console.error("Failed to delete KPI report:", e);
      alert(lang === 'ar' ? "فشل حذف تقرير KPI" : "Failed to delete KPI report");
    }
  };

  const handleAddSafetyRecord = async (src: SafetyRecord) => {
    try {
      if (!src.id) src.id = `saf-${Date.now()}`;
      const saved = await dbApi.save<SafetyRecord>('safetyRecords', src);
      setSafetyRecords(prev => [saved, ...prev]);
      logSystemAction('SAFETY_AUDIT', `Stamped site compliance. Safe: ${String(src.isSafe)}`);
    } catch (e) {
      console.error("Failed to save safety record", e);
      alert(lang === 'ar' ? "فشل حفظ سجل السلامة" : "Failed to save safety record");
    }
  };

  const handleAddDelayRecord = async (del: DelayRecord) => {
    try {
      if (!del.id) del.id = `del-${Date.now()}`;
      const saved = await dbApi.save<DelayRecord>('delayRecords', del);
      setDelays(prev => [saved, ...prev]);

      // Automatically recalculate project finish date schedules and dispatch alerts!
      const proj = projects.find(p => p.id === del.projectId);
      if (proj) {
        const updatedProj = { ...proj, status: 'Delayed' as const };
        await dbApi.save('projects', updatedProj);
        setProjects(prev => prev.map(p => p.id === proj.id ? updatedProj : p));
      }

      const warnNotice: SystemNotification = {
        id: `delay-${Date.now()}`,
        titleAr: `تغيير حالة المشروع للتعطيل: ${del.delayType}`,
        titleEn: `Project marked DELAYED: due to ${del.delayType}`,
        messageAr: `سجل المشرف معوقاً ميدانياً بسبب: ${del.reasonAr}`,
        messageEn: `Project status adjusted due to: ${del.reasonEn}. Timeline recalculated.`,
        type: 'delay',
        timestamp: new Date().toISOString(),
        isRead: false
      };
      await dbApi.save('notifications', warnNotice);
      setNotifications(prev => [warnNotice, ...prev]);

      logSystemAction('DELAY_DETECTED', `Log Delay type: ${del.delayType} under project ID: ${del.projectId}`);
    } catch (e) {
      console.error("Failed to save delay record", e);
      alert(lang === 'ar' ? "فشل حفظ سجل التأخير" : "Failed to save delay record");
    }
  };

  const handleAddIssueReport = async (rep: IssueReport) => {
    try {
      if (!rep.id) rep.id = `iss-${Date.now()}`;
      const saved = await dbApi.save<IssueReport>('issueReports', rep);
      setIssues(prev => [saved, ...prev]);
      
      // Dispatch issue alert to PM
      const problemNotice: SystemNotification = {
        id: `iss-notif-${Date.now()}`,
        titleAr: `بلاغ مشكلة عاجلة بالموقع`,
        titleEn: `CRITICAL FIELD INCIDENT REPORTED`,
        messageAr: `${rep.description}. الأولوية: ${rep.priority}`,
        messageEn: `${rep.description}. Escalated Priority: ${rep.priority}`,
        type: 'delay',
        timestamp: new Date().toISOString(),
        isRead: false
      };
      await dbApi.save('notifications', problemNotice);
      setNotifications(prev => [problemNotice, ...prev]);

      logSystemAction('ISSUE_Escalated', `E-Ticket dispatched priority: ${rep.priority}`);
    } catch (e) {
      console.error("Failed to save issue report", e);
      alert(lang === 'ar' ? "فشل حفظ بلاغ المشكلة" : "Failed to save issue report");
    }
  };


  const textDict = translations[lang];

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0F141F]' : 'bg-[#F1F1F1]'}`}>
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="w-12 h-12 border-4 border-[#0080FF] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-[#040957] dark:text-[#0080FF] uppercase tracking-widest">
            {lang === 'ar' ? 'جاري الاتصال السحابي الآمن...' : 'ESTABLISHING SECURE CLOUD SYNC...'}
          </p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0F141F]' : 'bg-[#F1F1F1]'}`}>
        <div className="bg-white dark:bg-[#1C2638] p-8 rounded-2xl shadow-xl border border-red-200 max-w-md text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-gray-800 dark:text-white">
            {lang === 'ar' ? 'فشل الاتصال بقاعدة البيانات' : 'DATABASE_CONNECTION_FAILED'}
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar' 
              ? 'لم نتمكن من الوصول إلى سجلات المشروع. يرجى التأكد من اتصال الإنترنت أو صلاحيات الوصول.' 
              : 'Unable to reach project ledgers. Verify network connectivity or RBAC permissions.'}
          </p>
          <p className="text-[10px] font-mono text-red-400 bg-red-50 dark:bg-red-900/10 p-2 rounded">
            {initError}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-[#040957] text-white py-3 rounded-xl font-bold text-xs hover:bg-blue-700 transition"
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'RETRY_SYNC'}
          </button>
        </div>
      </div>
    );
  }

  if (isFieldPortal) {
    return (
      <div 
        className={`min-h-screen ${darkMode ? 'bg-[#0F141F] text-gray-100' : 'bg-[#F1F1F1] text-gray-800'}`}
        style={{ 
          fontFamily: lang === 'ar' ? 'Cairo, sans-serif' : 'Inter, sans-serif',
          direction: lang === 'ar' ? 'rtl' : 'ltr'
        }}
      >
        <div className="p-4 md:p-6">
          <FieldPortal
            settings={settings}
            lang={lang}
            projects={projects}
            workItems={workItems}
            activities={activities}
            workers={workers}
            materials={materials}
            equipment={equipment}
            progressUpdates={progressUpdates}
            fieldRequests={fieldRequests}
            onAddPendingSubmission={handleAddPendingSubmission}
            onAddFieldRequest={handleAddFieldRequest}
            onReturnToMain={() => {
              const newUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, document.title, newUrl);
              setIsFieldPortal(false);
            }}
            onToggleLanguage={handleToggleLanguage}
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      id="app-main-layout"
      className={`min-h-screen ${darkMode ? 'bg-[#0F141F] text-gray-100' : 'bg-[#F1F1F1] text-gray-800'}`}

      style={{ 
        fontFamily: lang === 'ar' ? 'Cairo, sans-serif' : 'Inter, sans-serif',
        direction: lang === 'ar' ? 'rtl' : 'ltr'
      }}
    >
      
      {/* Universal Enterprise Corporate Top-Header */}
      <header className={`sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b ${darkMode ? 'bg-[#182132] border-[#222E45]' : 'bg-white border-gray-250'} shadow-sm`}>
        <div className="flex items-center gap-4">
          {/* Mobile Sidebar open button */}
          <button 
            onClick={() => setIsSidebarMobileOpen(true)}
            className="md:hidden text-gray-500 hover:text-[#0080FF] transition"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo brand */}
          <div className="flex items-center gap-2.5">
            {settings.companyLogoUrl && (settings.companyLogoUrl.startsWith('data:') || settings.companyLogoUrl.startsWith('http')) ? (
              <img src={settings.companyLogoUrl} alt="Logo" className="h-10 w-auto object-contain shrink-0 rounded-lg shadow-sm" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 bg-[#040957] text-white flex items-center justify-center rounded-xl text-2xl font-bold shadow-md overflow-hidden shrink-0">
                {settings.companyLogoUrl || '🏢'}
              </div>
            )}
            <div>
              <h1 className="text-sm font-black text-[#040957] hover:text-[#0080FF] transition tracking-tight">
                {lang === 'ar' ? settings.companyNameAr : settings.companyNameEn}
              </h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {textDict.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Action controllers navbar */}
        <div className="flex items-center gap-3">
          
          {/* Dedicated Field Portal Quick Access */}
          <button 
            onClick={() => {
              const portalUrl = `${window.location.origin}${window.location.pathname}?portal=field#portal=field`;
              window.history.replaceState({}, document.title, portalUrl);
              setIsFieldPortal(true);
            }}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 py-1.5 px-3 rounded-lg text-xs font-black transition flex items-center gap-1.5 shadow-sm"
            title={lang === 'ar' ? 'فتح البوابة الميدانية للمشرفين' : 'Open Field Portal for Supervisors'}
          >
            <span>📱</span>
            <span className="hidden sm:inline">{lang === 'ar' ? 'بوابة المشرف الميداني' : 'Field Portal'}</span>
          </button>

          {/* Direct Role Access Sandbox selector */}

          <div className="relative">
            <button 
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="bg-gray-100 dark:bg-[#202B3E] hover:bg-[#0080FF]/15 border border-gray-200 dark:border-gray-700 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-gray-700 dark:text-gray-200"
            >
              <UserCircle className="w-4 h-4 text-[#0080FF]" />
              <span className="hidden md:inline">{textDict.roleLabel}:</span>
              <span className="text-[#040957] dark:text-[#0080FF] font-black">{currentUser.role}</span>
            </button>

            {showRoleSelector && (
              <div className={`absolute top-full mt-2 ${lang === 'ar' ? 'left-0' : 'right-0'} z-50 bg-white dark:bg-[#1C2638] border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl w-60 py-2 text-xs divide-y divide-gray-100 dark:divide-gray-800`}>
                <div className="px-4 py-2 font-black text-[#040957] dark:text-[#0080FF] uppercase tracking-wider">{lang === 'ar' ? 'مسح واختبار الهويات' : 'Test strict RBAC Access'}</div>
                {mockUsers.map(usr => (
                  <button
                    key={usr.id}
                    onClick={() => {
                      setCurrentUser(usr);
                      setShowRoleSelector(false);
                      logSystemAction('ROLE_SWITCH', `Switched active credentials to ${usr.role}`);
                    }}
                    className="w-full text-right p-2.5 px-4 block hover:bg-blue-50/50 dark:hover:bg-blue-900/20 font-semibold transition text-gray-700 dark:text-gray-300 flex justify-between items-center"
                  >
                    <span>{usr.name}</span>
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500 font-bold">{usr.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lang switcher */}
          <button 
            onClick={handleToggleLanguage}
            className="p-2 bg-gray-100 dark:bg-[#202B3E] hover:bg-[#0080FF]/15 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:text-[#0080FF] transition"
            title={textDict.langToggle}
          >
            <Globe className="w-4.5 h-4.5" />
          </button>

          {/* Dark light toggling */}
          <button 
            onClick={handleToggleDarkMode}
            className="p-2 bg-gray-100 dark:bg-[#202B3E] hover:bg-[#0080FF]/15 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:text-[#0080FF] transition"
          >
            {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-gray-600" />}
          </button>
        </div>
      </header>

      {/* Main Structural Layout Wrapper */}
      <div className="flex">
        
        {/* DESKTOP SIDEBAR NAVIGATION PANEL */}
        <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} border-e hidden md:flex flex-col min-h-[calc(100vh-76px)] flex-shrink-0 transition-all duration-300 ease-in-out ${darkMode ? 'bg-[#141B29] border-[#222E45]' : 'bg-white border-gray-250'}`}>
          <div className="p-4 space-y-1 flex-1 overflow-y-auto scrollbar-hide">
            <span className={`text-[9px] uppercase tracking-widest text-gray-400 font-bold px-3 block mb-3 transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
              {lang === 'ar' ? 'الرقابة التنظيمية' : 'Corporate Modules'}
            </span>

            {[
              { id: 'dashboard', label: textDict.dashboard, icon: ActivityIcon },
              { id: 'kpiDashboard', label: lang === 'ar' ? 'مؤشرات الأداء KPI' : 'KPI Analytics', icon: BarChart3 },
              { id: 'projects', label: textDict.projects, icon: Briefcase },
              { id: 'workItems', label: textDict.smartPlanning, icon: Layers },
              { id: 'fieldOps', label: textDict.fieldOps, icon: Clock },
              { id: 'warehouse', label: textDict.warehouse, icon: Package },
              { id: 'users', label: lang === 'ar' ? 'المستخدمين والصلاحيات' : 'Users & Permissions', icon: Users },
              { id: 'settings', label: textDict.settings, icon: Building2 },
              { id: 'reports', label: textDict.reports, icon: FileText },
              { id: 'logs', label: textDict.logs, icon: ShieldAlert }
            ].map(m => {
              const active = activeModule === m.id;
              const Icon = m.icon;

              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id)}
                  title={isSidebarCollapsed ? m.label : ''}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${active ? 'bg-[#040957] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-805 hover:text-[#040957]'} ${isSidebarCollapsed ? 'justify-center px-0' : 'text-right'}`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isSidebarCollapsed ? '' : ''}`} />
                  {!isSidebarCollapsed && <span className="truncate">{m.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Quick Stats sidebar widget */}
          <div className={`p-4 transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden p-0' : 'opacity-100'}`}>
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-[#1C2638] border-[#25334B]' : 'bg-[#F1F1F1] border-gray-220'} border text-xs space-y-2`}>
              <div className="font-extrabold text-[#040957] dark:text-[#0080FF]">{lang === 'ar' ? 'الإنتاج السحابي' : 'Cloud Synchronization'}</div>
              <p className="text-[10px] text-gray-400 leading-relaxed">{lang === 'ar' ? 'قاعدة البيانات الميدانية مشفرة ومصادقة بالكامل وفقاً لمنظومة الهاس.' : 'Automatic encryption ledger synced to central servers continuously.'}</p>
              <div className="text-[10px] text-emerald-600 font-bold font-mono text-right animate-pulse">● CONNECTED_SSL_OK</div>
            </div>
          </div>

          {/* Toggle Button at the bottom */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleToggleSidebar}
              className={`w-full py-2.5 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#040957] dark:hover:text-[#0080FF] transition-all bg-slate-50/50 dark:bg-transparent`}
            >
              {isSidebarCollapsed ? (
                <div className="flex items-center gap-2">
                   <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full px-3">
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${lang === 'ar' ? '' : 'rotate-180'}`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{lang === 'ar' ? 'تصغير' : 'Collapse Sidebar'}</span>
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* MOBILE SIDEBAR PANEL DRAWER BACKDROP */}
        {isSidebarMobileOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 md:hidden" onClick={() => setIsSidebarMobileOpen(false)}>
            <div 
              className={`w-64 h-full p-5 space-y-4 absolute top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} ${darkMode ? 'bg-[#141B29]' : 'bg-white'} animate-slideIn`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-black text-[#040957] dark:text-[#0080FF]">{lang === 'ar' ? 'القائمة الرئيسية' : 'Quick Navigation'}</span>
                <button onClick={() => setIsSidebarMobileOpen(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex flex-col gap-1">
                {[
                  { id: 'dashboard', label: textDict.dashboard, icon: ActivityIcon },
                  { id: 'kpiDashboard', label: lang === 'ar' ? 'مؤشرات الأداء KPI' : 'KPI Analytics', icon: BarChart3 },
                  { id: 'projects', label: textDict.projects, icon: Briefcase },
                  { id: 'workItems', label: textDict.smartPlanning, icon: Layers },
                  { id: 'fieldOps', label: textDict.fieldOps, icon: Clock },
                  { id: 'warehouse', label: textDict.warehouse, icon: Package },
                  { id: 'users', label: lang === 'ar' ? 'المستخدمين والصلاحيات' : 'Users & Permissions', icon: Users },
                  { id: 'settings', label: textDict.settings, icon: Building2 },
                  { id: 'reports', label: textDict.reports, icon: FileText },
                  { id: 'logs', label: textDict.logs, icon: ShieldAlert }
                ].map(m => {
                  const active = activeModule === m.id;
                  const Icon = m.icon;

                  return (
                    <button
                      key={m.id}
                      onClick={() => { setActiveModule(m.id); setIsSidebarMobileOpen(false); }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-right flex items-center gap-3 ${active ? 'bg-[#040957] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY SCROLLABLE SPACE */}
        <main className={`flex-1 p-6 md:p-8 overflow-y-auto transition-all duration-500 ${isSidebarCollapsed ? 'max-w-none w-full px-4 md:px-12' : 'max-w-7xl mx-auto'} space-y-6 relative`}>
          
          {/* BACKGROUND PRINTING INDICATOR */}
          {isBackgroundPrinting && (
            <div className="fixed inset-0 z-[200] bg-white/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center gap-4 max-w-sm text-center relative">
                <button 
                  onClick={() => setIsBackgroundPrinting(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <Printer className="w-6 h-6 text-blue-600 absolute inset-0 m-auto" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-[#040957]">
                    {lang === 'ar' ? 'جاري تحضير التقرير الرسمي' : 'Preparing Official Document'}
                  </h3>
                  <p className="text-sm font-bold text-gray-500 leading-relaxed">
                    {lang === 'ar' ? 'يرجى الانتظار، يتم معالجة البيانات وتصدير القالب المعتمد الآن...' : 'Please wait while we process the data and export the official template...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DASHBOARD MODULE PANEL */}
          {activeModule === 'dashboard' && (
            <Dashboard 
              lang={lang}
              t={textDict}
              projects={projects}
              workItems={workItems}
              activities={activities}
              workers={workers}
              progressUpdates={progressUpdates}
              attendanceRecords={attendanceRecords}
              materials={materials}
              notifications={notifications}
              onMarkNotificationRead={handleMarkNotificationRead}
              onClearAllNotifications={handleClearAllNotifications}
              currentUser={currentUser}
              onNavigate={(mod) => setActiveModule(mod)}
              onDeleteProgressUpdate={handleDeleteProgressUpdate}
              settings={settings}
            />
          )}

          {/* KPI ANALYTICS DASHBOARD PANEL */}
          {activeModule === 'kpiDashboard' && (
            <KPIDashboard
              lang={lang}
              t={textDict}
              projects={projects}
              workItems={workItems}
              activities={activities}
              workers={workers}
              attendanceRecords={attendanceRecords}
              progressUpdates={progressUpdates}
              materials={materials}
              equipment={equipment}
              safetyRecords={safetyRecords}
              delays={delays}
              issues={issues}
              onDeleteProgressUpdate={handleDeleteProgressUpdate}
              onDeleteAttendanceRecord={handleDeleteAttendanceRecord}
              savedKpiReports={savedKpiReports}
              onSaveKpiReport={handleSaveKpiReport}
              onDeleteKpiReport={handleDeleteKpiReport}
              currentUser={currentUser}
              settings={settings}
            />
          )}

          {/* PROJECT CRUD REGISTER PANEL */}
          {activeModule === 'projects' && (
            <ProjectList 
              lang={lang}
              t={textDict}
              projects={projects}
              workItems={workItems}
              activities={activities}
              progressUpdates={progressUpdates}
              attendanceRecords={attendanceRecords}
              materials={materials}
              settings={settings}
              userRole={currentUser.role}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onDeleteProjects={handleDeleteProjects}
              onDuplicateProject={handleDuplicateProject}
              openConfirm={openConfirm}
              onNavigate={(mod) => setActiveModule(mod)}
            />
          )}

          {/* WORKITEM & CHECKLIST ACTIVITES PLANNING PANEL */}
          {activeModule === 'workItems' && (
            <WorkItemsList 
              lang={lang}
              t={textDict}
              settings={settings}
              projects={projects}
              workItems={workItems}
              activities={activities}
              progressUpdates={progressUpdates}
              materials={materials}
              equipment={equipment}
              workers={workers}
              userRole={currentUser.role}
              onAddWorkItem={handleAddWorkItem}
              onDeleteWorkItem={handleDeleteWorkItem}
              onAddActivity={handleAddActivity}
              onDeleteActivity={handleDeleteActivity}
              onUpdateActivity={handleUpdateActivity}
              onUpdateWorker={handleUpdateWorker}
              openConfirm={openConfirm}
            />
          )}

          {/* TABLET FIELD INSPECTOR UPDATES PANEL */}
          {activeModule === 'fieldOps' && (
            <FieldOperations 
              settings={settings}
              lang={lang}
              t={textDict}
              projects={projects}
              workItems={workItems}
              activities={activities}
              progressUpdates={progressUpdates}
              workers={workers}
              attendanceRecords={attendanceRecords}
              userRole={currentUser.role}
              onAddCheckIn={handleAddCheckIn}
              onAddAttendanceRecords={handleAddAttendanceRecords}
              onAddProgressUpdate={handleAddProgressUpdate}
              onAddSafetyRecord={handleAddSafetyRecord}
              onAddDelayRecord={handleAddDelayRecord}
              onAddIssueReport={handleAddIssueReport}
              fieldSubmissions={fieldSubmissions}
              onApproveSubmission={handleApproveSubmission}
              onRejectSubmission={handleRejectSubmission}
              currentUser={currentUser}
              materials={materials}
              fieldRequests={fieldRequests}
              onUpdateFieldRequest={handleUpdateFieldRequest}
            />
          )}


          {/* WAREHOUSE, MACHINERY & HR REGISTRIES PANEL */}
          {activeModule === 'warehouse' && (
            <InventoryModules 
              lang={lang}
              t={textDict}
              materials={materials}
              equipment={equipment}
              workers={workers}
              userRole={currentUser.role}
              onAddMaterial={handleAddMaterial}
              onUpdateMaterial={handleUpdateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onAddEquipment={handleAddEquipment}
              onUpdateEquipment={handleUpdateEquipment}
              onDeleteEquipment={handleDeleteEquipment}
              onAddWorker={handleAddWorker}
              onUpdateWorker={handleUpdateWorker}
              onDeleteWorker={handleDeleteWorker}
              openConfirm={openConfirm}
              onPrintReport={(category, id, action) => {
                setPreselectedReport({ category, id, action });
                setIsBackgroundPrinting(true);
              }}
            />
          )}

          {/* Hidden ReportsPanel for background printing */}
          {isBackgroundPrinting && activeModule !== 'reports' && (
            <div 
              className="fixed top-0 left-0 w-[1200px] bg-white opacity-0 pointer-events-none -z-[100] overflow-hidden"
              style={{ height: '2000px' }}
            >
              <ReportsPanel 
                lang={lang}
                t={textDict}
                projects={projects}
                workItems={workItems}
                activities={activities}
                workers={workers}
                equipment={equipment}
                materials={materials}
                progressUpdates={progressUpdates}
                attendanceRecords={attendanceRecords}
                settings={settings}
                userRole={currentUser.role}
                preselectedReport={preselectedReport}
                onClearPreselected={() => {
                  setPreselectedReport(null);
                  setIsBackgroundPrinting(false);
                }}
                onReturn={() => setIsBackgroundPrinting(false)}
              />
            </div>
          )}

          {/* CENTRAL APP DESIGN SETTINGS PANEL */}
          {activeModule === 'settings' && (
            <Settings 
              lang={lang}
              t={textDict}
              settings={settings}
              userRole={currentUser.role}
              onUpdateSettings={handleUpdateSettings}
              openConfirm={openConfirm}
            />
          )}

          {/* DPF / PRINT ACCREDITATION REPORTS PANEL */}
          {activeModule === 'reports' && (
            <ReportsPanel 
              lang={lang}
              t={textDict}
              projects={projects}
              workItems={workItems}
              activities={activities}
              workers={workers}
              equipment={equipment}
              materials={materials}
              progressUpdates={progressUpdates}
              attendanceRecords={attendanceRecords}
              settings={settings}
              userRole={currentUser.role}
              preselectedReport={activeModule === 'reports' ? preselectedReport : null}
              onClearPreselected={() => setPreselectedReport(null)}
              onReturn={(module) => setActiveModule(module)}
            />
          )}

          {/* USER ROLES & ACCESS CONTROL PANEL */}
          {activeModule === 'users' && (
            <UsersList
              lang={lang}
              t={textDict}
              users={users}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onSwitchUser={handleSwitchUser}
              openConfirm={openConfirm}
            />
          )}

          {/* AUDIT CRITICAL SYSTEMS TRANSACTIONS LOG PANEL */}
          {activeModule === 'logs' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <div className="border-b border-gray-150 pb-3">
                <h2 className="text-lg font-black text-[#040957] font-sans flex items-center gap-1.5">
                  <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                  {textDict.systemLogsTitle}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {lang === 'ar' ? 'سجل رقابي مشفر فوري لجميع عمليات الإضافة والحذف وتجربة الهويات لتلبية شروط الهيئة الهندسية.' : 'High-security trace detailing system logins, role selections, and data edits.'}
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-wider border-b border-gray-100">
                      <th className="p-3 w-40">{lang === 'ar' ? 'مشرف العملية' : textDict.userLog}</th>
                      <th className="p-3 w-32">{lang === 'ar' ? 'البوابة' : 'Section'}</th>
                      <th className="p-3">{textDict.actionLog}</th>
                      <th className="p-3 text-right w-44">{textDict.timeLog}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-xs text-gray-700">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition">
                        <td className="p-3 font-bold text-gray-800">
                          {log.userName}
                          <span className="block text-[8px] text-gray-400 uppercase font-black tracking-widest">{log.userRole}</span>
                        </td>
                        <td className="p-3">
                          <span className="bg-[#040957]/15 text-[#040957] px-2 py-0.5 rounded font-bold text-[9px] font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500">
                          {log.details}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-400 text-[10px]">
                          {new Date(log.timestamp).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* GLOBAL CONFIRMATION MODAL */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        confirmText={confirmModal.isDestructive ? textDict.delete : textDict.confirm}
        cancelText={textDict.cancel}
      />

    </div>
  );
}
