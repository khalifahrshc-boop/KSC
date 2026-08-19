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
  initialAttendanceRecords,
  seedMorningMeetingPlans
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
  FieldWorkSubmission,
  QuickNote,
  MorningMeetingPlan,
  StartCard,
  WorkPermit,
  PermitTypeConfig,
  PermitAuditLog
} from './types';
import { 
  seedStartCards, 
  seedPermits, 
  seedPermitTypes, 
  seedPermitAuditLogs 
} from './data/ptwSeedData';
import { translations } from './utils/translation';
import { dbApi } from './lib/api';
import { backfillActivities } from './utils/progressCalculations';
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
import AdminPanel from './components/AdminPanel';
import MainLogin from './components/MainLogin';
import PTWManagementPanel from './components/ptw/PTWManagementPanel';
import StartCardModal from './components/ptw/StartCardModal';
import PermitModal from './components/ptw/PermitModal';

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
  Shield, 
  ShieldCheck,
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
  ChevronRight,
  ChevronUp,
  Trash2,
  Square,
  CheckSquare,
  LayoutGrid,
  MoreHorizontal,
  Smartphone,
  Sparkles
} from 'lucide-react';

export default function App() {
  // Load initial settings or setup client local storage
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    const saved = localStorage.getItem('pm_preferred_lang');
    return (saved as 'ar' | 'en') || 'ar'; // Default Language is Arabic
  });

  const [darkMode, setDarkMode] = useState<boolean>(false);

  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [preselectedReport, setPreselectedReport] = useState<{category: any, id: string | string[], action?: 'print' | 'pdf'} | null>(null);
  const [isBackgroundPrinting, setIsBackgroundPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Real team users stored in local database
  const [users, setUsers] = useState<User[]>([]);

  // Real active user (Role-Based Access Control)
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[0]);

  // Administrator login session state
  const [currentAdmin, setCurrentAdmin] = useState<{ idNumber: string; name: string } | null>(() => {
    const saved = localStorage.getItem('pm_active_admin');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleAdminLogin = (admin: { idNumber: string; name: string }) => {
    setCurrentAdmin(admin);
    localStorage.setItem('pm_active_admin', JSON.stringify(admin));
    // Synchronize the current user for RBAC to reflect the logged-in admin
    const syncedUser: User = {
      id: admin.idNumber,
      name: admin.name,
      roles: ['Super Admin'],
      email: `${admin.idNumber}@admin.local`,
      badgeNumber: admin.idNumber
    };
    setCurrentUser(syncedUser);
    logSystemAction('ADMIN_LOGIN', `Admin ${admin.name} (ID: ${admin.idNumber}) logged in`);
  };

  const handleAdminLogout = () => {
    if (currentAdmin) {
      logSystemAction('ADMIN_LOGOUT', `Admin ${currentAdmin.name} (ID: ${currentAdmin.idNumber}) logged out`);
    }
    setCurrentAdmin(null);
    localStorage.removeItem('pm_active_admin');
  };

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
  const [selectedAuditLogIds, setSelectedAuditLogIds] = useState<string[]>([]);
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
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [morningMeetingPlans, setMorningMeetingPlans] = useState<MorningMeetingPlan[]>([]);

  // Start Card & Permit to Work (PTW) Module State
  const [startCards, setStartCards] = useState<StartCard[]>([]);
  const [permits, setPermits] = useState<WorkPermit[]>([]);
  const [permitTypes, setPermitTypes] = useState<PermitTypeConfig[]>([]);
  const [permitAuditLogs, setPermitAuditLogs] = useState<PermitAuditLog[]>([]);

  // Start Card & PTW Modals state
  const [isStartCardModalOpen, setIsStartCardModalOpen] = useState(false);
  const [selectedStartCard, setSelectedStartCard] = useState<StartCard | null>(null);
  const [initialActivityIdForStartCard, setInitialActivityIdForStartCard] = useState<string | undefined>(undefined);

  const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<WorkPermit | null>(null);
  const [initialActivityIdForPermit, setInitialActivityIdForPermit] = useState<string | undefined>(undefined);
  const [initialStartCardIdForPermit, setInitialStartCardIdForPermit] = useState<string | undefined>(undefined);

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
          dbSafety, dbDelays, dbIssues, dbSavedKpiReports, dbFieldSubmissions,
          dbQuickNotes, dbMorningMeetingPlans,
          dbStartCards, dbWorkPermits, dbPermitTypes, dbPermitAuditLogs
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
          dbApi.getAll<FieldWorkSubmission>('fieldSubmissions').catch(() => []),
          dbApi.getAll<QuickNote>('quickNotes').catch(() => []),
          dbApi.getAll<MorningMeetingPlan>('morningMeetingPlans').catch(() => []),
          dbApi.getAll<StartCard>('startCards').catch(() => []),
          dbApi.getAll<WorkPermit>('workPermits').catch(() => []),
          dbApi.getAll<PermitTypeConfig>('permitTypes').catch(() => []),
          dbApi.getAll<PermitAuditLog>('permitAuditLogs').catch(() => [])
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
            dbApi.bulkSave('issueReports', initialIssues),
            dbApi.bulkSave('morningMeetingPlans', seedMorningMeetingPlans)
          ]);
          // Refresh after seeding
          window.location.reload();
          return;
        }

        // Migrate old user records
        dbUsers.forEach(u => {
          if ((u as any).role && !u.roles) {
            u.roles = [(u as any).role];
          }
          if (!u.roles) u.roles = ['Viewer'];
        });

        // Strictly sanitize and purge orphaned records to ensure only authentic active data is loaded
        const currentProjectIds = new Set(dbProjects.map(p => p.id));
        const validWorkItems = dbWorkItems.filter(wi => currentProjectIds.has(wi.projectId));
        const validWorkItemIds = new Set(validWorkItems.map(wi => wi.id));
        const validActivities = dbActivities.filter(act => validWorkItemIds.has(act.workItemId));
        const validActivityIds = new Set(validActivities.map(act => act.id));
        const validProgressUpdates = (dbProgress || []).filter(upd => 
          validActivityIds.has(upd.activityId) && (!upd.projectId || currentProjectIds.has(upd.projectId))
        );

        // Permanently prune any ghost or previously orphaned records from the persistence store
        const orphanWorkItemIds = dbWorkItems.filter(wi => !currentProjectIds.has(wi.projectId)).map(w => w.id);
        const orphanActivityIds = dbActivities.filter(act => !validWorkItemIds.has(act.workItemId)).map(a => a.id);
        const orphanProgressIds = (dbProgress || []).filter(upd => !validActivityIds.has(upd.activityId)).map(u => u.id);

        if (orphanWorkItemIds.length > 0 || orphanActivityIds.length > 0 || orphanProgressIds.length > 0) {
          Promise.all([
            ...orphanWorkItemIds.map(id => dbApi.delete('workItems', id)),
            ...orphanActivityIds.map(id => dbApi.delete('activities', id)),
            ...orphanProgressIds.map(id => dbApi.delete('progressUpdates', id)),
          ]).catch(err => console.warn("Cleanup of orphaned records:", err));
        }

        setUsers(dbUsers);
        setProjects(dbProjects);
        setWorkItems(validWorkItems);
        const backfilled = backfillActivities(validActivities, dbWorkers, validWorkItems, dbProjects);
        setActivities(backfilled);
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
        setQuickNotes(dbQuickNotes || []);
        
        let finalMorningPlans = dbMorningMeetingPlans || [];
        if (finalMorningPlans.length === 0 && seedMorningMeetingPlans.length > 0) {
          finalMorningPlans = seedMorningMeetingPlans;
          await dbApi.bulkSave('morningMeetingPlans', seedMorningMeetingPlans).catch(console.error);
        }
        setMorningMeetingPlans(finalMorningPlans);

        // Start Cards & PTW Initialization
        let finalStartCards = dbStartCards || [];
        if (finalStartCards.length === 0 && seedStartCards.length > 0) {
          finalStartCards = seedStartCards;
          await dbApi.bulkSave('startCards', seedStartCards).catch(console.error);
        }

        let finalPermits = dbWorkPermits || [];
        if (finalPermits.length === 0 && seedPermits.length > 0) {
          finalPermits = seedPermits;
          await dbApi.bulkSave('workPermits', seedPermits).catch(console.error);
        }

        let finalPermitTypes = dbPermitTypes || [];
        if (finalPermitTypes.length === 0 && seedPermitTypes.length > 0) {
          finalPermitTypes = seedPermitTypes;
          await dbApi.bulkSave('permitTypes', seedPermitTypes).catch(console.error);
        }
        setPermitTypes(finalPermitTypes);

        let finalPermitAuditLogs = dbPermitAuditLogs || [];
        if (finalPermitAuditLogs.length === 0 && seedPermitAuditLogs.length > 0) {
          finalPermitAuditLogs = seedPermitAuditLogs;
          await dbApi.bulkSave('permitAuditLogs', seedPermitAuditLogs).catch(console.error);
        }

        // Strictly sanitize and purge orphaned PTW records (Fake / Deleted Data Cleanup)
        const validStartCards = finalStartCards.filter(sc => 
          (!sc.activityId || validActivityIds.has(sc.activityId)) &&
          (!sc.workItemId || validWorkItemIds.has(sc.workItemId)) &&
          currentProjectIds.has(sc.projectId)
        );
        const validStartCardIds = new Set(validStartCards.map(sc => sc.id));

        const validWorkPermits = finalPermits.filter(ptw => 
          (!ptw.activityId || validActivityIds.has(ptw.activityId)) &&
          (!ptw.startCardId || validStartCardIds.has(ptw.startCardId)) &&
          currentProjectIds.has(ptw.projectId)
        );
        const validPermitIds = new Set(validWorkPermits.map(p => p.id));
        
        const validAuditLogs = finalPermitAuditLogs.filter(log =>
          (log.recordType === 'StartCard' && validStartCardIds.has(log.recordId)) ||
          (log.recordType === 'WorkPermit' && validPermitIds.has(log.recordId)) ||
          (log.recordType === 'WorkExecution' && validActivityIds.has(log.recordId))
        );

        const orphanStartCardIds = finalStartCards.filter(sc => !validStartCardIds.has(sc.id)).map(sc => sc.id);
        const orphanPermitIds = finalPermits.filter(p => !validPermitIds.has(p.id)).map(p => p.id);
        const orphanAuditLogIds = finalPermitAuditLogs.filter(l => !validAuditLogs.includes(l)).map(l => l.id);

        if (orphanStartCardIds.length > 0 || orphanPermitIds.length > 0 || orphanAuditLogIds.length > 0) {
          Promise.all([
            ...orphanStartCardIds.map(id => dbApi.delete('startCards', id)),
            ...orphanPermitIds.map(id => dbApi.delete('workPermits', id)),
            ...orphanAuditLogIds.map(id => dbApi.delete('permitAuditLogs', id)),
          ]).catch(err => console.warn("Cleanup of orphaned PTW records:", err));
        }

        setStartCards(validStartCards);
        setPermits(validWorkPermits);
        setPermitAuditLogs(validAuditLogs);
        
        setCurrentUser(dbUsers.find(u => u.roles?.includes('Super Admin')) || dbUsers[0] || mockUsers[0]);


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
      userRoles: currentUser.roles,
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
      logSystemAction('ADD_USER', `Added user card: ${user.name} with role ${user.roles?.join(', ')}`);
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
    logSystemAction('SWITCH_USER_IDENTITY', `Assumed active sandbox role of: ${user.name} as ${user.roles?.join(', ')}`);
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

      // Release resources if project completed
      if (updated.isCompleted && !existing.isCompleted) {
        const projectActivities = activities.filter(a => {
          const wi = workItems.find(w => w.id === a.workItemId);
          return wi?.projectId === id;
        });

        for (const act of projectActivities) {
          // Release Materials
          if (act.materialAllocations) {
            for (const alloc of act.materialAllocations) {
              const mat = materials.find(m => m.id === alloc.id);
              if (mat) {
                const updMat = {
                  ...mat,
                  quantity: mat.quantity + alloc.quantity,
                  reservedStock: Math.max(0, (mat.reservedStock || 0) - alloc.quantity)
                };
                await dbApi.save('warehouseMaterials', updMat);
                setMaterials(prev => prev.map(m => m.id === mat.id ? updMat : m));
              }
            }
          }

          // Release Equipment
          if (act.equipmentAllocations) {
            for (const alloc of act.equipmentAllocations) {
              const eq = equipment.find(e => e.id === alloc.id);
              if (eq) {
                const updEq = {
                  ...eq,
                  totalQuantity: eq.totalQuantity + alloc.quantity,
                  reservedQuantity: Math.max(0, (eq.reservedQuantity || 0) - alloc.quantity)
                };
                await dbApi.save('equipmentItems', updEq);
                setEquipment(prev => prev.map(e => e.id === eq.id ? updEq : e));
              }
            }
          }

          // Clear Workers and Allocations
          const updatedAct = {
            ...act,
            workerIds: [],
            materialAllocations: [],
            equipmentAllocations: []
          };
          await dbApi.save('activities', updatedAct);
          setActivities(prev => prev.map(a => a.id === act.id ? updatedAct : a));
        }
      }

      logSystemAction('UPDATE_PROJECT', `Updated project metadata id: ${id}`);
    } catch (e) {
      alert("Error updating project");
    }
  };

  const handleAddMorningMeetingPlan = async (plan: Omit<MorningMeetingPlan, 'id'>) => {
    try {
      const newId = `plan-${Date.now()}`;
      const newPlan: MorningMeetingPlan = {
        ...plan,
        id: newId,
        createdAt: new Date().toISOString()
      };
      await dbApi.save('morningMeetingPlans', newPlan);
      setMorningMeetingPlans(prev => [newPlan, ...prev]);
      logSystemAction('ADD_MORNING_PLAN', `Created morning plan for project: ${plan.projectId} date: ${plan.date}`);
    } catch (e) {
      console.error(e);
      alert("Error saving morning meeting plan");
    }
  };

  const handleUpdateMorningMeetingPlan = async (id: string, updated: Partial<MorningMeetingPlan>) => {
    try {
      const existing = morningMeetingPlans.find(p => p.id === id);
      if (!existing) return;
      const updatedPlan = { ...existing, ...updated };
      await dbApi.save('morningMeetingPlans', updatedPlan);
      setMorningMeetingPlans(prev => prev.map(p => p.id === id ? updatedPlan : p));
      logSystemAction('UPDATE_MORNING_PLAN', `Updated morning plan id: ${id}`);
    } catch (e) {
      console.error(e);
      alert("Error updating morning meeting plan");
    }
  };

  const handleDeleteMorningMeetingPlan = async (id: string) => {
    try {
      await dbApi.delete('morningMeetingPlans', id);
      setMorningMeetingPlans(prev => prev.filter(p => p.id !== id));
      logSystemAction('DELETE_MORNING_PLAN', `Deleted morning meeting plan id: ${id}`);
    } catch (e) {
      console.error(e);
      alert("Error deleting morning meeting plan");
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      // Find all associated work items and activities to purge
      const targetWorkItems = workItems.filter(wi => wi.projectId === id);
      const targetWorkItemIds = new Set(targetWorkItems.map(wi => wi.id));
      const targetActivities = activities.filter(act => targetWorkItemIds.has(act.workItemId));
      const targetActivityIds = new Set(targetActivities.map(act => act.id));

      await Promise.all([
        dbApi.delete('projects', id),
        ...targetWorkItems.map(wi => dbApi.delete('workItems', wi.id)),
        ...targetActivities.map(act => dbApi.delete('activities', act.id)),
      ]);

      setProjects(prev => prev.filter(p => p.id !== id));

      // Cascade delete related entities locally
      setWorkItems(prev => prev.filter(wi => wi.projectId !== id));
      setActivities(prev => prev.filter(a => !targetWorkItemIds.has(a.workItemId)));
      setProgressUpdates(prev => prev.filter(p => p.projectId !== id && !targetActivityIds.has(p.activityId)));
      setAttendanceRecords(prev => prev.filter(a => a.projectId !== id));
      setCheckIns(prev => prev.filter(c => c.projectId !== id));
      setIssues(prev => prev.filter(i => i.projectId !== id));
      setDelays(prev => prev.filter(d => d.projectId !== id));
      setSafetyRecords(prev => prev.filter(s => s.projectId !== id));
      setMorningMeetingPlans(prev => prev.filter(m => m.projectId !== id));

      logSystemAction('DELETE_PROJECT', `Ejected project id: ${id} and all cascaded work items, activities, and logs.`);
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
      const idSet = new Set(ids);
      const targetWorkItems = workItems.filter(wi => idSet.has(wi.projectId));
      const targetWorkItemIds = new Set(targetWorkItems.map(wi => wi.id));
      const targetActivities = activities.filter(act => targetWorkItemIds.has(act.workItemId));
      const targetActivityIds = new Set(targetActivities.map(act => act.id));

      const targetStartCards = startCards.filter(sc => idSet.has(sc.projectId) || (sc.workItemId && targetWorkItemIds.has(sc.workItemId)) || (sc.activityId && targetActivityIds.has(sc.activityId)));
      const targetStartCardIds = new Set(targetStartCards.map(sc => sc.id));

      const targetWorkPermits = permits.filter(p => idSet.has(p.projectId) || (p.workItemId && targetWorkItemIds.has(p.workItemId)) || (p.activityId && targetActivityIds.has(p.activityId)) || (p.startCardId && targetStartCardIds.has(p.startCardId)));
      const targetPermitIds = new Set(targetWorkPermits.map(p => p.id));

      const targetPermitAuditLogs = permitAuditLogs.filter(log => idSet.has(log.projectId) || (log.recordType === 'StartCard' && targetStartCardIds.has(log.recordId)) || (log.recordType === 'WorkPermit' && targetPermitIds.has(log.recordId)) || (log.recordType === 'WorkExecution' && targetActivityIds.has(log.recordId)));

      await Promise.all([
        ...ids.map(id => dbApi.delete('projects', id)),
        ...targetWorkItems.map(wi => dbApi.delete('workItems', wi.id)),
        ...targetActivities.map(act => dbApi.delete('activities', act.id)),
        ...targetStartCards.map(sc => dbApi.delete('startCards', sc.id)),
        ...targetWorkPermits.map(p => dbApi.delete('workPermits', p.id)),
        ...targetPermitAuditLogs.map(log => dbApi.delete('permitAuditLogs', log.id)),
      ]);

      setProjects(prev => prev.filter(p => !idSet.has(p.id)));
      setWorkItems(prev => prev.filter(wi => !idSet.has(wi.projectId)));
      setActivities(prev => prev.filter(a => !targetWorkItemIds.has(a.workItemId)));
      setProgressUpdates(prev => prev.filter(p => (!p.projectId || !idSet.has(p.projectId)) && !targetActivityIds.has(p.activityId)));
      setAttendanceRecords(prev => prev.filter(a => !idSet.has(a.projectId)));
      setCheckIns(prev => prev.filter(c => !idSet.has(c.projectId)));
      setIssues(prev => prev.filter(i => !idSet.has(i.projectId)));
      setDelays(prev => prev.filter(d => !idSet.has(d.projectId)));
      setSafetyRecords(prev => prev.filter(s => !idSet.has(s.projectId)));
      setMorningMeetingPlans(prev => prev.filter(m => !idSet.has(m.projectId)));
      setStartCards(prev => prev.filter(sc => !idSet.has(sc.projectId) && (!sc.workItemId || !targetWorkItemIds.has(sc.workItemId)) && (!sc.activityId || !targetActivityIds.has(sc.activityId))));
      setPermits(prev => prev.filter(p => !idSet.has(p.projectId) && (!p.workItemId || !targetWorkItemIds.has(p.workItemId)) && (!p.activityId || !targetActivityIds.has(p.activityId))));
      setPermitAuditLogs(prev => prev.filter(log => !targetPermitAuditLogs.includes(log)));

      logSystemAction('BULK_DELETE_PROJECTS', `Deleted ${ids.length} projects and cascaded child work items/activities.`);
    } catch (e) {
      alert("Error during bulk delete");
    }
  };

  const handleAddQuickNote = async (noteContent: string) => {
    try {
      const newNote: QuickNote = {
        id: `note-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        content: noteContent,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      };
      await dbApi.save('quickNotes', newNote);
      setQuickNotes(prev => [newNote, ...prev]);
      logSystemAction('ADD_QUICK_NOTE', `Rapid status memo added: "${noteContent.substring(0, 30)}..."`);
    } catch (e) {
      console.error('Failed to save quick note:', e);
      alert('Error saving quick note');
    }
  };

  const handleDeleteQuickNote = async (id: string) => {
    try {
      await dbApi.delete('quickNotes', id);
      setQuickNotes(prev => prev.filter(n => n.id !== id));
      logSystemAction('DELETE_QUICK_NOTE', `Ejected quick note id: ${id}`);
    } catch (e) {
      console.error('Failed to delete quick note:', e);
      alert('Error deleting quick note');
    }
  };

  const handleUpdateQuickNote = async (id: string, content: string) => {
    try {
      const existing = quickNotes.find(n => n.id === id);
      if (!existing) return;
      const updatedNote: QuickNote = {
        ...existing,
        content,
        timestamp: new Date().toISOString()
      };
      await dbApi.save('quickNotes', updatedNote);
      setQuickNotes(prev => prev.map(n => n.id === id ? updatedNote : n));
      logSystemAction('UPDATE_QUICK_NOTE', `Updated quick note content: "${content.substring(0, 30)}..."`);
    } catch (e) {
      console.error('Failed to update quick note:', e);
      alert('Error updating quick note');
    }
  };

  const handleDeleteAuditLog = async (id: string) => {
    try {
      await dbApi.delete('auditLogs', id);
      setAuditLogs(prev => prev.filter(log => log.id !== id));
      setSelectedAuditLogIds(prev => prev.filter(selectedId => selectedId !== id));
    } catch (e) {
      console.error('Failed to delete audit log:', e);
      alert('Error deleting audit log');
    }
  };

  const handleDeleteSelectedAuditLogs = async () => {
    if (selectedAuditLogIds.length === 0) return;
    try {
      await Promise.all(selectedAuditLogIds.map(id => dbApi.delete('auditLogs', id)));
      setAuditLogs(prev => prev.filter(log => !selectedAuditLogIds.includes(log.id)));
      setSelectedAuditLogIds([]);
    } catch (e) {
      console.error('Failed to delete selected audit logs:', e);
      alert('Error deleting selected audit logs');
    }
  };

  // Nested WorkItems
  const handleAddWorkItem = async (wi: WorkItem) => {
    if (!wi.id) wi.id = `wi-${Date.now()}`;
    const saved = await dbApi.save('workItems', wi);
    setWorkItems(prev => {
      const idx = prev.findIndex(item => item.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
    logSystemAction('ADD_WORK_ITEM', `Saved work item category: ${wi.itemNumber}`);
  };

  const handleDeleteWorkItem = async (id: string) => {
    try {
      const childActivities = activities.filter(act => act.workItemId === id);
      const childActivityIds = new Set(childActivities.map(a => a.id));

      const targetStartCards = startCards.filter(sc => sc.workItemId === id || (sc.activityId && childActivityIds.has(sc.activityId)));
      const targetStartCardIds = new Set(targetStartCards.map(sc => sc.id));

      const targetWorkPermits = permits.filter(p => p.workItemId === id || (p.activityId && childActivityIds.has(p.activityId)) || (p.startCardId && targetStartCardIds.has(p.startCardId)));
      const targetPermitIds = new Set(targetWorkPermits.map(p => p.id));

      const targetPermitAuditLogs = permitAuditLogs.filter(log => (log.recordType === 'StartCard' && targetStartCardIds.has(log.recordId)) || (log.recordType === 'WorkPermit' && targetPermitIds.has(log.recordId)) || (log.recordType === 'WorkExecution' && childActivityIds.has(log.recordId)));

      await Promise.all([
        dbApi.delete('workItems', id),
        ...childActivities.map(act => dbApi.delete('activities', act.id)),
        ...targetStartCards.map(sc => dbApi.delete('startCards', sc.id)),
        ...targetWorkPermits.map(p => dbApi.delete('workPermits', p.id)),
        ...targetPermitAuditLogs.map(log => dbApi.delete('permitAuditLogs', log.id)),
      ]);

      // Release any material/equipment allocated to child activities
      for (const act of childActivities) {
        if (act.materialAllocations) {
          for (const alloc of act.materialAllocations) {
            const mat = materials.find(m => m.id === alloc.id);
            if (mat) {
              const updMat = {
                ...mat,
                quantity: mat.quantity + alloc.quantity,
                reservedStock: Math.max(0, (mat.reservedStock || 0) - alloc.quantity)
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
                totalQuantity: eq.totalQuantity + alloc.quantity,
                reservedQuantity: Math.max(0, (eq.reservedQuantity || 0) - alloc.quantity)
              };
              await dbApi.save('equipmentItems', updEq);
              setEquipment(prev => prev.map(e => e.id === eq.id ? updEq : e));
            }
          }
        }
      }

      setWorkItems(prev => prev.filter(wi => wi.id !== id));
      setActivities(prev => prev.filter(act => act.workItemId !== id));
      setProgressUpdates(prev => prev.filter(upd => !childActivityIds.has(upd.activityId)));

      logSystemAction('DELETE_WORK_ITEM', `Removed categoric sector id: ${id} and cascaded its nested activities.`);
    } catch (e) {
      console.error(e);
      alert("Error deleting work item");
    }
  };

  const handleAddActivity = async (act: Activity) => {
    if (!act.id) act.id = `act-${Date.now()}`;
    const saved = await dbApi.save('activities', act);
    setActivities(prev => backfillActivities([...prev, saved], workers, workItems, projects));
    
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
    try {
      const act = activities.find(a => a.id === id);
      if (act) {
        // Return allocated materials to warehouse
        if (act.materialAllocations) {
          for (const alloc of act.materialAllocations) {
            const mat = materials.find(m => m.id === alloc.id);
            if (mat) {
              const updMat = {
                ...mat,
                quantity: mat.quantity + alloc.quantity,
                reservedStock: Math.max(0, (mat.reservedStock || 0) - alloc.quantity)
              };
              await dbApi.save('warehouseMaterials', updMat);
              setMaterials(prev => prev.map(m => m.id === mat.id ? updMat : m));
            }
          }
        }
        // Return allocated equipment
        if (act.equipmentAllocations) {
          for (const alloc of act.equipmentAllocations) {
            const eq = equipment.find(e => e.id === alloc.id);
            if (eq) {
              const updEq = {
                ...eq,
                totalQuantity: eq.totalQuantity + alloc.quantity,
                reservedQuantity: Math.max(0, (eq.reservedQuantity || 0) - alloc.quantity)
              };
              await dbApi.save('equipmentItems', updEq);
              setEquipment(prev => prev.map(e => e.id === eq.id ? updEq : e));
            }
          }
        }
      }

      const targetStartCards = startCards.filter(sc => sc.activityId === id || (sc.targetActivityIds && sc.targetActivityIds.includes(id)));
      const targetStartCardIds = new Set(targetStartCards.map(sc => sc.id));

      const targetWorkPermits = permits.filter(p => p.activityId === id || (p.startCardId && targetStartCardIds.has(p.startCardId)));
      const targetPermitIds = new Set(targetWorkPermits.map(p => p.id));

      const targetPermitAuditLogs = permitAuditLogs.filter(log => (log.recordType === 'StartCard' && targetStartCardIds.has(log.recordId)) || (log.recordType === 'WorkPermit' && targetPermitIds.has(log.recordId)) || (log.recordType === 'WorkExecution' && log.recordId === id));

      await Promise.all([
        dbApi.delete('activities', id),
        ...targetStartCards.map(sc => dbApi.delete('startCards', sc.id)),
        ...targetWorkPermits.map(p => dbApi.delete('workPermits', p.id)),
        ...targetPermitAuditLogs.map(log => dbApi.delete('permitAuditLogs', log.id)),
      ]);

      setActivities(prev => prev.filter(a => a.id !== id));
      setProgressUpdates(prev => prev.filter(upd => upd.activityId !== id));
      setStartCards(prev => prev.filter(sc => !targetStartCardIds.has(sc.id)));
      setPermits(prev => prev.filter(p => !targetPermitIds.has(p.id)));
      setPermitAuditLogs(prev => prev.filter(log => !targetPermitAuditLogs.includes(log)));
      logSystemAction('DELETE_ACTIVITY', `Removed sub-activity: ${id}`);
    } catch (e) {
      console.error(e);
      alert("Error deleting activity");
    }
  };

  const handleUpdateActivity = async (id: string, updated: Partial<Activity>) => {
    const existing = activities.find(a => a.id === id);
    if (!existing) return;
    const upd = { ...existing, ...updated };
    await dbApi.save('activities', upd);
    setActivities(prev => backfillActivities(prev.map(act => act.id === id ? upd : act), workers, workItems, projects));
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

  // --- START CARD & PERMIT TO WORK (PTW) HANDLERS ---
  const handleSaveStartCard = async (card: StartCard) => {
    try {
      if (!card.id) card.id = `sc-${Date.now()}`;
      await dbApi.save<StartCard>('startCards', card);
      setStartCards(prev => {
        const idx = prev.findIndex(c => c.id === card.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = card;
          return updated;
        }
        return [card, ...prev];
      });

      const log: PermitAuditLog = {
        id: `pal-${Date.now()}`,
        recordType: 'StartCard',
        recordId: card.id,
        recordNumber: card.cardNumber,
        projectId: card.projectId,
        userId: currentUser.id,
        userName: currentUser.name,
        userRoles: currentUser.roles,
        action: card.status === 'Approved' ? 'Approved' : (card.status === 'Submitted' ? 'Submitted' : 'Saved'),
        newStatus: card.status,
        comments: `Start Card ${card.cardNumber} updated (${card.status})`,
        timestamp: new Date().toISOString()
      };
      await dbApi.save('permitAuditLogs', log);
      setPermitAuditLogs(prev => [log, ...prev]);

      logSystemAction('SAVE_START_CARD', `Start Card ${card.cardNumber} saved with status ${card.status}`);
    } catch (e) {
      console.error('Failed to save Start Card:', e);
    }
  };

  const handleDeleteStartCard = async (id: string) => {
    try {
      await dbApi.delete('startCards', id);
      setStartCards(prev => prev.filter(c => c.id !== id));
      logSystemAction('DELETE_START_CARD', `Start Card ${id} deleted`);
    } catch (e) {
      console.error('Failed to delete Start Card:', e);
    }
  };

  const handleSavePermit = async (permit: WorkPermit) => {
    try {
      if (!permit.id) permit.id = `ptw-${Date.now()}`;
      await dbApi.save<WorkPermit>('workPermits', permit);
      setPermits(prev => {
        const idx = prev.findIndex(p => p.id === permit.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = permit;
          return updated;
        }
        return [permit, ...prev];
      });

      const log: PermitAuditLog = {
        id: `pal-${Date.now()}`,
        recordType: 'WorkPermit',
        recordId: permit.id,
        recordNumber: permit.permitNumber,
        projectId: permit.projectId,
        userId: currentUser.id,
        userName: currentUser.name,
        userRoles: currentUser.roles,
        action: permit.status === 'Approved' || permit.status === 'Active' ? 'Approved' : (permit.status === 'Submitted' ? 'Submitted' : 'Saved'),
        newStatus: permit.status,
        comments: `Permit ${permit.permitNumber} updated (${permit.status})`,
        timestamp: new Date().toISOString()
      };
      await dbApi.save('permitAuditLogs', log);
      setPermitAuditLogs(prev => [log, ...prev]);

      logSystemAction('SAVE_WORK_PERMIT', `Work Permit ${permit.permitNumber} saved with status ${permit.status}`);
    } catch (e) {
      console.error('Failed to save Work Permit:', e);
    }
  };

  const handleDeletePermit = async (id: string) => {
    try {
      await dbApi.delete('workPermits', id);
      setPermits(prev => prev.filter(p => p.id !== id));
      logSystemAction('DELETE_WORK_PERMIT', `Work Permit ${id} deleted`);
    } catch (e) {
      console.error('Failed to delete Work Permit:', e);
    }
  };

  const handleSavePermitType = async (typeConfig: PermitTypeConfig) => {
    try {
      await dbApi.save<PermitTypeConfig>('permitTypes', typeConfig);
      setPermitTypes(prev => {
        const idx = prev.findIndex(t => t.id === typeConfig.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = typeConfig;
          return updated;
        }
        return [...prev, typeConfig];
      });
      logSystemAction('SAVE_PERMIT_TYPE', `Permit Type ${typeConfig.nameEn} updated`);
    } catch (e) {
      console.error('Failed to save Permit Type:', e);
    }
  };

  const handleOverrideAuthorization = async (activityId: string, reason: string) => {
    try {
      const act = activities.find(a => a.id === activityId);
      if (!act) return;
      const updated: Activity = {
        ...act,
        overrideUsed: true,
        overrideReason: reason,
        overrideBy: currentUser.name || 'Super Admin',
        overrideAt: new Date().toISOString()
      };
      await dbApi.save('activities', updated);
      setActivities(prev => prev.map(a => a.id === activityId ? updated : a));

      const log: PermitAuditLog = {
        id: `pal-${Date.now()}`,
        recordType: 'WorkExecution',
        recordId: activityId,
        recordNumber: act.code || act.id,
        projectId: act.projectId || '',
        userId: currentUser.id,
        userName: currentUser.name,
        userRoles: currentUser.roles,
        action: 'Override Applied',
        newStatus: 'Authorized to Start',
        comments: `Emergency administrative override applied: ${reason}`,
        timestamp: new Date().toISOString()
      };
      await dbApi.save('permitAuditLogs', log);
      setPermitAuditLogs(prev => [log, ...prev]);

      logSystemAction('OVERRIDE_AUTHORIZATION', `Emergency override applied to activity ${act.nameAr} (${activityId}): ${reason}`);
    } catch (e) {
      console.error('Failed to apply authorization override:', e);
    }
  };

  const handleOpenStartCardModal = (card?: StartCard | null, activityId?: string) => {
    setSelectedStartCard(card || null);
    setInitialActivityIdForStartCard(activityId);
    setIsStartCardModalOpen(true);
  };

  const handleOpenPermitModal = (permit?: WorkPermit | null, activityId?: string, startCardId?: string) => {
    setSelectedPermit(permit || null);
    setInitialActivityIdForPermit(activityId);
    setInitialStartCardIdForPermit(startCardId);
    setIsPermitModalOpen(true);
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
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#FAF6F0]' : 'bg-slate-50'}`}>
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="w-12 h-12 border-4 border-[#0080FF] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-[#040957] uppercase tracking-widest">
            {lang === 'ar' ? 'جاري الاتصال السحابي الآمن...' : 'ESTABLISHING SECURE CLOUD SYNC...'}
          </p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#FAF6F0]' : 'bg-slate-50'}`}>
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-200 max-w-md text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-gray-800">
            {lang === 'ar' ? 'فشل الاتصال بقاعدة البيانات' : 'DATABASE_CONNECTION_FAILED'}
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar' 
              ? 'لم نتمكن من الوصول إلى سجلات المشروع. يرجى التأكد من اتصال الإنترنت أو صلاحيات الوصول.' 
              : 'Unable to reach project ledgers. Verify network connectivity or RBAC permissions.'}
          </p>
          <p className="text-[10px] font-mono text-red-400 bg-red-50 p-2 rounded">
            {initError}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-[#0080FF] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#0080FF]/90 transition"
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
        className="min-h-screen bg-slate-50 text-slate-800"
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
            morningMeetingPlans={morningMeetingPlans}
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

  if (!currentAdmin) {
    return (
      <MainLogin 
        lang={lang} 
        onLogin={handleAdminLogin} 
        settings={settings}
      />
    );
  }

  const isAllSelected = auditLogs.length > 0 && selectedAuditLogIds.length === auditLogs.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedAuditLogIds([]);
    } else {
      setSelectedAuditLogIds(auditLogs.map(log => log.id));
    }
  };

  const toggleSelectLog = (id: string) => {
    setSelectedAuditLogIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div 
      id="app-main-layout"
      className={`min-h-screen ${darkMode ? 'bg-[#FCF9F2] text-[#422006]' : 'bg-slate-50 text-slate-800'}`}

      style={{ 
        fontFamily: lang === 'ar' ? 'Cairo, sans-serif' : 'Inter, sans-serif',
        direction: lang === 'ar' ? 'rtl' : 'ltr'
      }}
    >
      
      {/* Active Admin Session Welcome Banner */}
      {currentAdmin && (
        <div className="bg-[#040957] text-white px-6 py-2.5 flex items-center justify-between text-xs font-bold border-b border-white/10 relative z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="font-sans">
              {lang === 'ar' 
                ? `مرحباً بك مجدداً، المسؤول ${currentAdmin.name}` 
                : `Welcome back, Administrator ${currentAdmin.name}`}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveModule('adminPanel')}
              className="text-emerald-400 hover:text-emerald-300 transition text-[11px] underline cursor-pointer"
            >
              {lang === 'ar' ? 'لوحة المسؤول' : 'Admin Panel'}
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={handleAdminLogout}
              className="text-rose-400 hover:text-rose-300 transition text-[11px] cursor-pointer"
            >
              {lang === 'ar' ? 'خروج' : 'Logout'}
            </button>
          </div>
        </div>
      )}

      {/* Universal Enterprise Corporate Top-Header */}
      <header className={`sticky top-0 z-40 px-3 py-2.5 md:px-6 md:py-4 flex items-center justify-between border-b ${darkMode ? 'bg-[#F5EFEB] border-[#E8DCD3]' : 'bg-white border-slate-200'} shadow-xs`}>
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Logo brand */}
          <div className="flex items-center gap-2.5">
            {settings.companyLogoUrl && (settings.companyLogoUrl.startsWith('data:') || settings.companyLogoUrl.startsWith('http')) ? (
              <img src={settings.companyLogoUrl} alt="Logo" className="h-9 md:h-10 w-auto object-contain shrink-0 rounded-lg shadow-xs" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 md:w-10 md:h-10 bg-[#0080FF] text-white flex items-center justify-center rounded-xl text-xl md:text-2xl font-bold shadow-xs overflow-hidden shrink-0">
                {settings.companyLogoUrl || '🏢'}
              </div>
            )}
            <div>
              <h1 className="text-xs sm:text-sm font-black text-[#040957] hover:text-[#0080FF] transition tracking-tight truncate max-w-[140px] sm:max-w-none">
                {lang === 'ar' ? settings.companyNameAr : settings.companyNameEn}
              </h1>
              <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider hidden sm:block">
                {textDict.subtitle}
              </p>
              {/* Mobile Active Section Tag */}
              <div className="flex items-center gap-1 text-[10px] text-[#0080FF] font-black sm:hidden">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0080FF] animate-pulse" />
                <span className="truncate">
                  {(() => {
                    switch (activeModule) {
                      case 'dashboard': return lang === 'ar' ? 'الرئيسية' : 'Dashboard';
                      case 'kpiDashboard': return lang === 'ar' ? 'مؤشرات KPI' : 'KPIs';
                      case 'projects': return lang === 'ar' ? 'المشاريع' : 'Projects';
                      case 'workItems': return lang === 'ar' ? 'التخطيط الذكي' : 'Planning';
                      case 'ptw': return lang === 'ar' ? 'تصاريح العمل وبطاقات البدء (PTW)' : 'Start Cards & PTW';
                      case 'fieldOps': return lang === 'ar' ? 'العمليات الميدانية' : 'Field';
                      case 'warehouse': return lang === 'ar' ? 'المستودع والمواد' : 'Warehouse';
                      case 'users': return lang === 'ar' ? 'المستخدمين' : 'Users';
                      case 'settings': return lang === 'ar' ? 'الإعدادات' : 'Settings';
                      case 'reports': return lang === 'ar' ? 'التقارير' : 'Reports';
                      case 'logs': return lang === 'ar' ? 'سجلات الأمان' : 'Security Logs';
                      case 'adminPanel': return lang === 'ar' ? 'لوحة المسؤول' : 'Admin Panel';
                      default: return '';
                    }
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action controllers navbar */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Dedicated Field Portal Quick Access (Desktop only, mobile has dedicated card in bottom sheet) */}
          <button 
            onClick={() => {
              const portalUrl = `${window.location.origin}${window.location.pathname}?portal=field#portal=field`;
              window.history.replaceState({}, document.title, portalUrl);
              setIsFieldPortal(true);
            }}
            className="hidden md:flex bg-amber-400 hover:bg-amber-500 text-slate-950 py-1.5 px-3 rounded-lg text-xs font-black transition items-center gap-1.5 shadow-xs"
            title={lang === 'ar' ? 'فتح البوابة الميدانية للمشرفين' : 'Open Field Portal for Supervisors'}
          >
            <span>📱</span>
            <span>{lang === 'ar' ? 'بوابة المشرف الميداني' : 'Field Portal'}</span>
          </button>

          {/* Direct Role Access Sandbox selector (Both Desktop & Mobile) */}
          <div className="relative">
            <button 
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="bg-gray-100/90 hover:bg-[#0080FF]/15 border border-gray-200/90 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-gray-700"
            >
              <div className="w-5 h-5 rounded-full bg-blue-50 text-[#0080FF] flex items-center justify-center font-black text-[10px]">
                <UserCircle className="w-4 h-4" />
              </div>
              <span className="hidden md:inline">{textDict.roleLabel}:</span>
              <span className="text-[#040957] font-black text-[11px] sm:text-xs">{currentUser.roles?.[0] || 'User'}</span>
            </button>

            {showRoleSelector && (
              <div className={`absolute top-full mt-2 ${lang === 'ar' ? 'left-0' : 'right-0'} z-50 bg-white border border-gray-200 shadow-2xl rounded-2xl w-60 py-2 text-xs divide-y divide-gray-100`}>
                <div className="px-4 py-2 font-black text-[#040957] uppercase tracking-wider">{lang === 'ar' ? 'مسح واختبار الهويات' : 'Test strict RBAC Access'}</div>
                {mockUsers.map(usr => (
                  <button
                    key={usr.id}
                    onClick={() => {
                      setCurrentUser(usr);
                      setShowRoleSelector(false);
                      logSystemAction('ROLE_SWITCH', `Switched active credentials to ${usr.roles?.join(', ')}`);
                    }}
                    className="w-full text-right p-2.5 px-4 block hover:bg-blue-50/50 font-semibold transition text-gray-700 flex justify-between items-center"
                  >
                    <span>{usr.name}</span>
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-bold">{usr.roles?.join(', ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lang switcher (Desktop only, mobile has it inside the bottom sheet) */}
          <button 
            onClick={handleToggleLanguage}
            className="hidden md:flex p-2 bg-gray-100 hover:bg-[#0080FF]/15 border border-gray-200 rounded-lg text-gray-700 hover:text-[#0080FF] transition"
            title={textDict.langToggle}
          >
            <Globe className="w-4.5 h-4.5" />
          </button>

          {/* Light/Warm comfort mode toggle (Desktop only, mobile has it inside the bottom sheet) */}
          <button 
            onClick={handleToggleDarkMode}
            className="hidden md:flex p-2 bg-gray-100 hover:bg-[#0080FF]/15 border border-gray-200 rounded-lg text-gray-700 hover:text-[#0080FF] transition items-center gap-1.5"
            title={lang === 'ar' ? 'تغيير المظهر الفاتح (حديث / دافئ)' : 'Toggle Light Theme (Modern Slate / Warm Sand)'}
          >
            {darkMode ? (
              <>
                <Sun className="w-4.5 h-4.5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="text-[9px] font-black uppercase text-amber-700 hidden sm:inline">{lang === 'ar' ? 'مظهر دافئ' : 'Warm Sand'}</span>
              </>
            ) : (
              <>
                <Moon className="w-4.5 h-4.5 text-slate-500" />
                <span className="text-[9px] font-black uppercase text-slate-700 hidden sm:inline">{lang === 'ar' ? 'مظهر حديث' : 'Slate Light'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Structural Layout Wrapper */}
      <div className="flex">
        
        {/* DESKTOP SIDEBAR NAVIGATION PANEL */}
        <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} border-e hidden md:flex flex-col min-h-[calc(100vh-76px)] flex-shrink-0 transition-all duration-300 ease-in-out ${darkMode ? 'bg-[#FAF6F0] border-[#E8DCD3]' : 'bg-white border-slate-200'}`}>
          <div className="p-4 space-y-1 flex-1 overflow-y-auto scrollbar-hide">
            <span className={`text-[9px] uppercase tracking-widest text-gray-400 font-bold px-3 block mb-3 transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
              {lang === 'ar' ? 'الرقابة التنظيمية' : 'Corporate Modules'}
            </span>

            {[
              { id: 'dashboard', label: textDict.dashboard, icon: ActivityIcon },
              { id: 'kpiDashboard', label: lang === 'ar' ? 'مؤشرات الأداء KPI' : 'KPI Analytics', icon: BarChart3 },
              { id: 'projects', label: textDict.projects, icon: Briefcase },
              { id: 'workItems', label: textDict.smartPlanning, icon: Layers },
              { id: 'ptw', label: lang === 'ar' ? 'تصاريح العمل وبطاقات البدء (PTW)' : 'Start Cards & PTW', icon: ShieldCheck },
              { id: 'fieldOps', label: textDict.fieldOps, icon: Clock },
              { id: 'warehouse', label: textDict.warehouse, icon: Package },
              { id: 'users', label: lang === 'ar' ? 'المستخدمين والصلاحيات' : 'Users & Permissions', icon: Users },
              { id: 'settings', label: textDict.settings, icon: Building2 },
              { id: 'reports', label: textDict.reports, icon: FileText },
              { id: 'logs', label: textDict.logs, icon: ShieldAlert },
              { 
                id: 'adminPanel', 
                label: currentAdmin 
                  ? (lang === 'ar' ? `لوحة المسؤول (${currentAdmin.name})` : `Admin Panel (${currentAdmin.name})`) 
                  : (lang === 'ar' ? 'تسجيل دخول المسؤول' : 'Admin Login'), 
                icon: Shield 
              }
            ].map(m => {
              const active = activeModule === m.id;
              const Icon = m.icon;

              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id)}
                  title={isSidebarCollapsed ? m.label : ''}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${active ? 'bg-[#0080FF] text-white shadow-md' : 'text-gray-500 hover:bg-blue-50/50 hover:text-[#0080FF]'} ${isSidebarCollapsed ? 'justify-center px-0' : 'text-right'}`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0`} />
                  {!isSidebarCollapsed && <span className="truncate">{m.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Quick Stats sidebar widget */}
          <div className={`p-4 transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden p-0' : 'opacity-100'}`}>
            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-[#F5EFEB] border-[#E8DCD3]' : 'bg-slate-50 border-slate-200'} border text-xs space-y-2`}>
              <div className="font-extrabold text-[#040957]">{lang === 'ar' ? 'الإنتاج السحابي' : 'Cloud Synchronization'}</div>
              <p className="text-[10px] text-gray-400 leading-relaxed">{lang === 'ar' ? 'قاعدة البيانات الميدانية مشفرة ومصادقة بالكامل وفقاً لمنظومة الهاس.' : 'Automatic encryption ledger synced to central servers continuously.'}</p>
              <div className="text-[10px] text-emerald-600 font-bold font-mono text-right animate-pulse">● CONNECTED_SSL_OK</div>
            </div>
          </div>

          {/* Toggle Button at the bottom */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleToggleSidebar}
              className={`w-full py-2.5 flex items-center justify-center rounded-xl text-gray-400 hover:bg-slate-50 hover:text-[#040957] transition-all bg-slate-50/50`}
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

        {/* MOBILE APP-STYLE BOTTOM NAVIGATION BAR (Visible strictly on mobile screens) */}
        <nav 
          aria-label="Mobile Navigation" 
          className={`fixed bottom-0 inset-x-0 z-40 md:hidden border-t shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-1 py-1.5 ${
            darkMode 
              ? 'bg-[#FAF6F0]/95 border-[#E8DCD3] text-slate-800' 
              : 'bg-white/95 border-slate-200 text-slate-700'
          } backdrop-blur-md pb-[max(0.375rem,env(safe-area-inset-bottom))]`}
        >
          <div className="flex items-center justify-around max-w-md mx-auto">
            {[
              { id: 'dashboard', label: lang === 'ar' ? 'الرئيسية' : 'Home', icon: ActivityIcon },
              { id: 'kpiDashboard', label: lang === 'ar' ? 'المؤشرات' : 'KPIs', icon: BarChart3 },
              { id: 'projects', label: lang === 'ar' ? 'المشاريع' : 'Projects', icon: Briefcase },
              { id: 'workItems', label: lang === 'ar' ? 'التخطيط' : 'Planning', icon: Layers },
              { id: 'fieldOps', label: lang === 'ar' ? 'الميدان' : 'Field', icon: Clock }
            ].map(tab => {
              const active = activeModule === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveModule(tab.id);
                    setIsSidebarMobileOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 min-w-[58px] relative ${
                    active 
                      ? 'text-[#0080FF] font-black' 
                      : 'text-slate-400 hover:text-slate-600 font-medium'
                  }`}
                >
                  {active && (
                    <span className="absolute -top-1 w-6 h-1 bg-[#0080FF] rounded-full shadow-[0_0_8px_rgba(0,128,255,0.6)]" />
                  )}
                  <div className={`p-1 rounded-lg transition-transform ${active ? 'bg-blue-50 text-[#0080FF] scale-110' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] tracking-tight truncate mt-0.5">{tab.label}</span>
                </button>
              );
            })}

            {/* "More / المزيد" Bottom Navigation Tab */}
            {(() => {
              const isMoreActive = ['ptw', 'warehouse', 'users', 'settings', 'reports', 'logs', 'adminPanel'].includes(activeModule);
              return (
                <button
                  onClick={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 min-w-[58px] relative ${
                    isMoreActive || isSidebarMobileOpen
                      ? 'text-[#0080FF] font-black' 
                      : 'text-slate-400 hover:text-slate-600 font-medium'
                  }`}
                >
                  {(isMoreActive || isSidebarMobileOpen) && (
                    <span className="absolute -top-1 w-6 h-1 bg-[#0080FF] rounded-full shadow-[0_0_8px_rgba(0,128,255,0.6)]" />
                  )}
                  <div className={`p-1 rounded-lg transition-transform relative ${isMoreActive || isSidebarMobileOpen ? 'bg-blue-50 text-[#0080FF] scale-110' : ''}`}>
                    <LayoutGrid className="w-5 h-5" />
                    {isMoreActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight truncate mt-0.5">
                    {lang === 'ar' ? 'المزيد' : 'More'}
                  </span>
                </button>
              );
            })()}
          </div>
        </nav>

        {/* MOBILE BOTTOM SHEET ACTION DRAWER (All Sections & Quick Services) */}
        {isSidebarMobileOpen && (
          <div className="fixed inset-0 z-[100] md:hidden flex flex-col justify-end">
            {/* Backdrop with smooth blur */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300" 
              onClick={() => setIsSidebarMobileOpen(false)}
            />
            
            {/* Bottom Sheet Modal Container */}
            <div 
              className={`relative w-full max-h-[85vh] rounded-t-3xl border-t border-slate-200/80 shadow-2xl flex flex-col z-[101] overflow-hidden ${
                darkMode ? 'bg-[#FAF6F0]' : 'bg-white'
              } animate-in slide-in-from-bottom duration-300`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle Indicator */}
              <div 
                className="pt-3 pb-1.5 flex justify-center cursor-pointer select-none" 
                onClick={() => setIsSidebarMobileOpen(false)}
              >
                <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
              </div>

              {/* Sheet Header */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0080FF] flex items-center justify-center font-bold">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#040957]">
                      {lang === 'ar' ? 'كافة أقسام وخدمات المنظومة' : 'All Modules & Services'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {lang === 'ar' ? 'اختر القسم للانتقال المباشر' : 'Tap any module to navigate directly'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSidebarMobileOpen(false)} 
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Modules Content */}
              <div className="p-4 overflow-y-auto space-y-3.5 pb-20">
                
                {/* Highlight Field Portal Card */}
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-3 text-white shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-lg">
                      📱
                    </div>
                    <div>
                      <div className="font-black text-xs">
                        {lang === 'ar' ? 'بوابة المشرف الميداني' : 'Field Supervisor Portal'}
                      </div>
                      <div className="text-[10px] text-amber-100">
                        {lang === 'ar' ? 'واجهة تفاعلية لتسجيل الإنجاز والمواد' : 'Direct mobile reporting interface'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsSidebarMobileOpen(false);
                      const portalUrl = `${window.location.origin}${window.location.pathname}?portal=field#portal=field`;
                      window.history.replaceState({}, document.title, portalUrl);
                      setIsFieldPortal(true);
                    }}
                    className="bg-white text-amber-950 px-3 py-1.5 rounded-xl text-xs font-black hover:bg-amber-50 transition shadow-xs flex items-center gap-1 shrink-0"
                  >
                    <span>{lang === 'ar' ? 'فتح البوابة' : 'Launch'}</span>
                    <ChevronRight className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* 2-Column Responsive Grid for all 12 modules */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'dashboard', labelAr: 'لوحة القيادة', labelEn: 'Dashboard', icon: ActivityIcon, desc: lang === 'ar' ? 'نظرة عامة وإحصائيات' : 'Overview & statistics' },
                    { id: 'kpiDashboard', labelAr: 'مؤشرات الأداء KPI', labelEn: 'KPI Analytics', icon: BarChart3, desc: lang === 'ar' ? 'تحليل الإنتاج والإنجاز' : 'Productivity & analytics' },
                    { id: 'projects', labelAr: 'إدارة المشاريع', labelEn: 'Projects', icon: Briefcase, desc: lang === 'ar' ? 'عقود وبيانات المشاريع' : 'Projects & contracts' },
                    { id: 'workItems', labelAr: 'البنود والتخطيط الذكي', labelEn: 'Smart Planning', icon: Layers, desc: lang === 'ar' ? 'حزم الأعمال والأنشطة' : 'Work packages & activities' },
                    { id: 'ptw', labelAr: 'تصاريح العمل وبطاقات البدء (PTW)', labelEn: 'Start Cards & PTW', icon: ShieldCheck, desc: lang === 'ar' ? 'إصدار بطاقات البدء والتصاريح' : 'Permits to work & authorization' },
                    { id: 'fieldOps', labelAr: 'العمليات الميدانية', labelEn: 'Field Operations', icon: Clock, desc: lang === 'ar' ? 'تقارير الإشراف اليومية' : 'Daily supervisor submissions' },
                    { id: 'warehouse', labelAr: 'المستودع والمواد', labelEn: 'Warehouse', icon: Package, desc: lang === 'ar' ? 'المخزون وحركة التوريد' : 'Stock & materials ledger' },
                    { id: 'users', labelAr: 'المستخدمين والصلاحيات', labelEn: 'Users & Roles', icon: Users, desc: lang === 'ar' ? 'إدارة الهويات والأذونات' : 'Team access & permissions' },
                    { id: 'settings', labelAr: 'الإعدادات والشركة', labelEn: 'Settings', icon: Building2, desc: lang === 'ar' ? 'بيانات وهوية المنشأة' : 'Company & system preferences' },
                    { id: 'reports', labelAr: 'التقارير والمطابقة', labelEn: 'Reports', icon: FileText, desc: lang === 'ar' ? 'التقارير التفصيلية والتصدير' : 'Detailed analytics & exports' },
                    { id: 'logs', labelAr: 'سجلات الأمان والتدقيق', labelEn: 'Security Logs', icon: ShieldAlert, desc: lang === 'ar' ? 'سجل العمليات والأحداث' : 'Audit logs & safety events' },
                    { 
                      id: 'adminPanel', 
                      labelAr: currentAdmin ? `لوحة المسؤول (${currentAdmin.name})` : 'تسجيل دخول المسؤول',
                      labelEn: currentAdmin ? `Admin Panel (${currentAdmin.name})` : 'Admin Login',
                      icon: Shield, 
                      desc: lang === 'ar' ? 'التحكم الإداري المتقدم' : 'Advanced system administration'
                    }
                  ].map(m => {
                    const active = activeModule === m.id;
                    const Icon = m.icon;

                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setActiveModule(m.id);
                          setIsSidebarMobileOpen(false);
                        }}
                        className={`p-3 rounded-2xl text-right transition-all flex flex-col gap-1.5 border text-xs font-bold relative ${
                          active 
                            ? 'bg-[#0080FF] text-white border-[#0080FF] shadow-md' 
                            : darkMode 
                              ? 'bg-white/70 border-slate-200/90 text-slate-800 hover:bg-white' 
                              : 'bg-slate-50/80 border-slate-200/80 text-slate-800 hover:bg-blue-50/50 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${active ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#0080FF]'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {active && (
                            <span className="text-[9px] bg-white text-[#0080FF] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                              {lang === 'ar' ? 'نشط' : 'Active'}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 text-right w-full">
                          <div className="font-black truncate">{lang === 'ar' ? m.labelAr : m.labelEn}</div>
                          <div className={`text-[9.5px] truncate font-normal ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                            {m.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* System Settings & User Session Bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => {
                      handleToggleLanguage();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleToggleDarkMode();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100"
                  >
                    {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{darkMode ? (lang === 'ar' ? 'الوضع الحديث' : 'Slate') : (lang === 'ar' ? 'الوضع الدافئ' : 'Warm')}</span>
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY SCROLLABLE SPACE */}
        <main className={`flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-500 ${isSidebarCollapsed ? 'max-w-none w-full px-4 md:px-12' : 'max-w-7xl mx-auto'} space-y-6 relative pb-28 md:pb-8`}>
          
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
              quickNotes={quickNotes}
              onSaveQuickNote={handleAddQuickNote}
              onDeleteQuickNote={handleDeleteQuickNote}
              onUpdateQuickNote={handleUpdateQuickNote}
              openConfirm={openConfirm}
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
              userRoles={currentUser.roles?.join(', ')}
              workers={workers}
              equipment={equipment}
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
              users={users}
              userRoles={currentUser.roles?.join(', ')}
              onAddWorkItem={handleAddWorkItem}
              onDeleteWorkItem={handleDeleteWorkItem}
              onAddActivity={handleAddActivity}
              onDeleteActivity={handleDeleteActivity}
              onUpdateActivity={handleUpdateActivity}
              onUpdateWorker={handleUpdateWorker}
              openConfirm={openConfirm}
              startCards={startCards}
              permits={permits}
              onOpenStartCard={handleOpenStartCardModal}
              onOpenPermit={handleOpenPermitModal}
            />
          )}

          {/* START CARDS & PERMIT TO WORK (PTW) AUTHORIZATION MANAGEMENT */}
          {activeModule === 'ptw' && (
            <PTWManagementPanel
              projects={projects}
              workItems={workItems}
              activities={activities}
              workers={workers}
              equipment={equipment}
              materials={materials}
              startCards={startCards}
              permits={permits}
              permitTypes={permitTypes}
              auditLogs={permitAuditLogs}
              settings={settings}
              userRoles={currentUser.roles || ['Admin']}
              currentUserName={currentUser.name}
              onSaveStartCard={handleSaveStartCard}
              onDeleteStartCard={handleDeleteStartCard}
              onSavePermit={handleSavePermit}
              onDeletePermit={handleDeletePermit}
              onLogAudit={async (logData) => {
                const log: PermitAuditLog = {
                  ...logData,
                  id: `pal-${Date.now()}`,
                  timestamp: new Date().toISOString()
                };
                await dbApi.save('permitAuditLogs', log);
                setPermitAuditLogs(prev => [log, ...prev]);
              }}
              lang={lang}
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
              userRoles={currentUser.roles?.join(', ')}
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
              onUpdateProject={handleUpdateProject}
              morningMeetingPlans={morningMeetingPlans}
              onAddMorningMeetingPlan={handleAddMorningMeetingPlan}
              onUpdateMorningMeetingPlan={handleUpdateMorningMeetingPlan}
              onDeleteMorningMeetingPlan={handleDeleteMorningMeetingPlan}
              openConfirm={openConfirm}
            />
          )}


          {/* WAREHOUSE, MACHINERY & HR REGISTRIES PANEL */}
          {activeModule === 'warehouse' && (
            <InventoryModules 
              lang={lang}
              t={textDict}
              materials={materials}
              projects={projects}
              equipment={equipment}
              workers={workers}
              attendanceRecords={attendanceRecords}
              settings={settings}
              userRoles={currentUser.roles?.join(', ')}
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
                userRoles={currentUser.roles?.join(', ')}
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
              userRoles={currentUser.roles?.join(', ')}
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
              userRoles={currentUser.roles?.join(', ')}
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
              <div className="border-b border-gray-150 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#040957] font-sans flex items-center gap-1.5">
                    <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                    {textDict.systemLogsTitle}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar' ? 'سجل رقابي مشفر فوري لجميع عمليات الإضافة والحذف وتجربة الهويات لتلبية شروط الهيئة الهندسية.' : 'High-security trace detailing system logins, role selections, and data edits.'}
                  </p>
                </div>
                {selectedAuditLogIds.length > 0 && (
                  <button
                    onClick={() => {
                      openConfirm(
                        lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion',
                        lang === 'ar' 
                          ? `هل أنت متأكد من حذف السجلات المحددة (${selectedAuditLogIds.length})؟` 
                          : `Are you sure you want to delete the selected (${selectedAuditLogIds.length}) audit log entries?`,
                        () => handleDeleteSelectedAuditLogs(),
                        true
                      );
                    }}
                    className="bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg text-xs uppercase flex items-center gap-1.5 border border-red-200 cursor-pointer transition shadow-sm"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>{lang === 'ar' ? `حذف المحدد (${selectedAuditLogIds.length})` : `Delete Selected (${selectedAuditLogIds.length})`}</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-wider border-b border-gray-100">
                      <th className="p-3 w-12 text-center">
                        <button 
                          type="button" 
                          onClick={toggleSelectAll} 
                          className="focus:outline-none flex justify-center items-center mx-auto"
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4.5 h-4.5 text-[#0080FF]" />
                          ) : (
                            <Square className="w-4.5 h-4.5 text-gray-300 hover:text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="p-3 w-40">{lang === 'ar' ? 'مشرف العملية' : textDict.userLog}</th>
                      <th className="p-3 w-32">{lang === 'ar' ? 'البوابة' : 'Section'}</th>
                      <th className="p-3">{textDict.actionLog}</th>
                      <th className="p-3 text-right w-44">{textDict.timeLog}</th>
                      <th className="p-3 w-16 text-center">{lang === 'ar' ? 'خيارات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-xs text-gray-700">
                    {auditLogs.map(log => (
                      <tr 
                        key={log.id} 
                        className={`hover:bg-gray-50/50 transition ${selectedAuditLogIds.includes(log.id) ? 'bg-blue-50/25' : ''}`}
                      >
                        <td className="p-3 w-12 text-center">
                          <button 
                            type="button" 
                            onClick={() => toggleSelectLog(log.id)} 
                            className="focus:outline-none flex justify-center items-center mx-auto"
                          >
                            {selectedAuditLogIds.includes(log.id) ? (
                              <CheckSquare className="w-4.5 h-4.5 text-[#0080FF]" />
                            ) : (
                              <Square className="w-4.5 h-4.5 text-gray-300 hover:text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-bold text-gray-800">
                          {log.userName}
                          <span className="block text-[8px] text-gray-400 uppercase font-black tracking-widest">{log.userRoles}</span>
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
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              openConfirm(
                                lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion',
                                lang === 'ar' ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this log entry?',
                                () => handleDeleteAuditLog(log.id),
                                true
                              );
                            }}
                            className="text-gray-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 cursor-pointer transition flex items-center justify-center mx-auto"
                            title={lang === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 font-bold italic">
                          {lang === 'ar' ? 'لا توجد سجلات تدقيق متوفرة حالياً.' : 'No audit logs available at this time.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECURE ADMINISTRATOR LOGIN & MANAGEMENT PANEL */}
          {activeModule === 'adminPanel' && (
            <AdminPanel
              lang={lang}
              currentAdmin={currentAdmin}
              onAdminLogin={handleAdminLogin}
              onAdminLogout={handleAdminLogout}
              openConfirm={openConfirm}
            />
          )}

        </main>
      </div>

      {/* START CARD MODAL (GLOBAL WORK ITEMS TRIGGER) */}
      {isStartCardModalOpen && (
        <StartCardModal 
          isOpen={isStartCardModalOpen}
          onClose={() => {
            setIsStartCardModalOpen(false);
            setSelectedStartCard(null);
            setInitialActivityIdForStartCard(undefined);
          }}
          startCard={selectedStartCard}
          initialActivityId={initialActivityIdForStartCard}
          projects={projects}
          workItems={workItems}
          activities={activities}
          settings={settings}
          userRoles={currentUser.roles || ['Admin']}
          currentUserName={currentUser.name}
          onSave={async (card) => {
            await handleSaveStartCard(card);
            setIsStartCardModalOpen(false);
            setSelectedStartCard(null);
            setInitialActivityIdForStartCard(undefined);
          }}
          onLogAudit={async (logData) => {
            const log: PermitAuditLog = {
              ...logData,
              id: `pal-${Date.now()}`,
              timestamp: new Date().toISOString()
            };
            await dbApi.save('permitAuditLogs', log);
            setPermitAuditLogs(prev => [log, ...prev]);
          }}
          lang={lang}
        />
      )}

      {/* PERMIT TO WORK (PTW) MODAL (GLOBAL TRIGGER) */}
      {isPermitModalOpen && (
        <PermitModal 
          isOpen={isPermitModalOpen}
          onClose={() => {
            setIsPermitModalOpen(false);
            setSelectedPermit(null);
            setInitialActivityIdForPermit(undefined);
            setInitialStartCardIdForPermit(undefined);
          }}
          permit={selectedPermit}
          initialActivityId={initialActivityIdForPermit}
          initialStartCardId={initialStartCardIdForPermit}
          startCards={startCards}
          permitTypes={permitTypes}
          projects={projects}
          workItems={workItems}
          activities={activities}
          workers={workers}
          equipment={equipment}
          materials={materials}
          settings={settings}
          userRoles={currentUser.roles || ['Admin']}
          currentUserName={currentUser.name}
          onSave={async (permit) => {
            await handleSavePermit(permit);
            setIsPermitModalOpen(false);
            setSelectedPermit(null);
            setInitialActivityIdForPermit(undefined);
            setInitialStartCardIdForPermit(undefined);
          }}
          onLogAudit={async (logData) => {
            const log: PermitAuditLog = {
              ...logData,
              id: `pal-${Date.now()}`,
              timestamp: new Date().toISOString()
            };
            await dbApi.save('permitAuditLogs', log);
            setPermitAuditLogs(prev => [log, ...prev]);
          }}
          lang={lang}
        />
      )}

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
