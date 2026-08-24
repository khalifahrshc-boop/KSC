import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Lazy initialization of Gemini SDK as mandated by guidelines
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it via the Settings > Secrets panel.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API HEALTH CHECK
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- SAAS SUBSCRIPTION, BILLING, LICENSE & TENANT MANAGEMENT ENDPOINTS ---

  // 1. SaaS State Transition Engine
  const SAAS_VALID_TRANSITIONS: Record<string, string[]> = {
    TRIAL: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'PENDING_PAYMENT'],
    PENDING_PAYMENT: ['ACTIVE', 'CANCELLED', 'SUSPENDED'],
    ACTIVE: ['PAST_DUE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'],
    PAST_DUE: ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'],
    SUSPENDED: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
    EXPIRED: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
    CANCELLED: ['ACTIVE', 'TRIAL']
  };

  // Enforcement Evaluation Helper API
  app.post("/api/saas/enforce", (req, res) => {
    try {
      const { subscription, usersCount = 0, projectsCount = 0, devicesCount = 0 } = req.body;
      
      if (!subscription) {
        res.status(403).json({
          isAllowed: false,
          status: 'EXPIRED',
          isReadOnly: true,
          errorCode: 'SUBSCRIPTION_EXPIRED',
          messageEn: 'No active subscription found for tenant. Access restricted.',
          messageAr: 'لم يتم العثور على اشتراك نشط للمؤسسة. الوصول محظور.'
        });
        return;
      }

      const today = new Date();
      today.setHours(0,0,0,0);
      const expiry = new Date(subscription.endDate || today);
      expiry.setHours(0,0,0,0);
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let effectiveStatus = subscription.status || 'ACTIVE';
      if (subscription.status !== 'SUSPENDED' && subscription.status !== 'CANCELLED') {
        if (diffDays <= 0) {
          const grace = subscription.gracePeriodDays || 7;
          if (Math.abs(diffDays) <= grace) {
            effectiveStatus = 'PAST_DUE';
          } else {
            effectiveStatus = 'EXPIRED';
          }
        }
      }

      if (effectiveStatus === 'SUSPENDED') {
        res.status(403).json({
          isAllowed: false,
          status: 'SUSPENDED',
          isReadOnly: true,
          daysRemaining: diffDays,
          errorCode: 'SUBSCRIPTION_SUSPENDED',
          messageEn: 'Subscription suspended by system owner.',
          messageAr: 'تم تعليق الاشتراك من قبل إدارة المنصة.'
        });
        return;
      }

      if (effectiveStatus === 'EXPIRED') {
        const isReadOnly = subscription.readOnlyOnExpiry ?? true;
        res.status(403).json({
          isAllowed: !isReadOnly,
          status: 'EXPIRED',
          isReadOnly,
          daysRemaining: diffDays,
          errorCode: 'SUBSCRIPTION_EXPIRED',
          messageEn: isReadOnly
            ? 'Subscription expired. Application operating in Read-Only mode.'
            : 'Subscription expired. Access restricted.',
          messageAr: isReadOnly
            ? 'انتهت صلاحية الاشتراك. التطبيق يعمل في وضع القراءة فقط.'
            : 'انتهت صلاحية الاشتراك. الوصول محظور.'
        });
        return;
      }

      // Check User Limit
      if (subscription.maxUsers !== -1 && usersCount >= subscription.maxUsers) {
        res.json({
          isAllowed: true,
          status: effectiveStatus,
          isReadOnly: false,
          daysRemaining: diffDays,
          errorCode: 'USER_LIMIT_REACHED',
          messageEn: `User limit reached (${usersCount}/${subscription.maxUsers}). Upgrade plan to add users.`,
          messageAr: `تم الوصول إلى الحد الأقصى للمستخدمين (${usersCount}/${subscription.maxUsers}). يرجى ترقية الباقة.`,
          currentUsers: usersCount,
          maxUsers: subscription.maxUsers
        });
        return;
      }

      // Check Project Limit
      if (subscription.maxProjects !== -1 && projectsCount >= subscription.maxProjects) {
        res.json({
          isAllowed: true,
          status: effectiveStatus,
          isReadOnly: false,
          daysRemaining: diffDays,
          errorCode: 'PROJECT_LIMIT_REACHED',
          messageEn: `Project limit reached (${projectsCount}/${subscription.maxProjects}). Upgrade plan to create projects.`,
          messageAr: `تم الوصول إلى الحد الأقصى للمشاريع (${projectsCount}/${subscription.maxProjects}). يرجى ترقية الباقة.`,
          currentProjects: projectsCount,
          maxProjects: subscription.maxProjects
        });
        return;
      }

      res.json({
        isAllowed: true,
        status: effectiveStatus,
        isReadOnly: false,
        daysRemaining: diffDays,
        currentUsers: usersCount,
        maxUsers: subscription.maxUsers,
        currentProjects: projectsCount,
        maxProjects: subscription.maxProjects
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Enforcement calculation failed" });
    }
  });

  // State Transition API for Subscriptions
  app.post("/api/saas/subscriptions/transition", (req, res) => {
    try {
      const { currentStatus, targetStatus, action, reason } = req.body;
      
      if (!currentStatus || !targetStatus) {
        res.status(400).json({ error: "Missing state transition parameters" });
        return;
      }

      const allowed = SAAS_VALID_TRANSITIONS[currentStatus]?.includes(targetStatus) || currentStatus === targetStatus;
      if (!allowed) {
        res.status(400).json({
          error: "INVALID_SUBSCRIPTION_STATE_TRANSITION",
          messageEn: `Cannot transition subscription from ${currentStatus} to ${targetStatus}`,
          messageAr: `لا يمكن نقل حالة الاشتراك من ${currentStatus} إلى ${targetStatus}`
        });
        return;
      }

      res.json({
        success: true,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        action,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI-POWERED FIELD REPORT AUDIT & PROCESS IMPROVEMENT ENDPOINT
  app.post("/api/gemini/audit-submission", async (req, res) => {
    try {
      const { submission, activities, workers } = req.body;

      if (!submission) {
        res.status(400).json({ error: "Missing submission payload" });
        return;
      }

      // 1. Get the lazily initialized Gemini Client
      const ai = getGeminiClient();

      // 2. Formulate a rich domain-specific prompt to identify over-reporting (fake achievements)
      // and provide practical process/decision support advice.
      const prompt = `
You are an expert construction inspector, field scheduler, and project integrity auditor.
Your goal is to cross-reference a supervisor's submitted Daily Field Work Report against known project assets to detect "fake achievements" (bloated/unrealistic output, reporting work on blocked activities, mismatch between attendance and labor types, ignoring critical delays) and output high-value decision support for the project manager.

--- FIELD SUBMISSION DETAILS ---
Supervisor Name: ${submission.supervisorName}
Submission Timestamp: ${submission.timestamp}
Date of Log: ${submission.date}

1. WORKFORCE ATTENDANCE RECORD:
${JSON.stringify(submission.attendanceRecords || [])}

2. PRODUCTION OUTPUTS & PROGRESS REPORTED:
${JSON.stringify(submission.progressUpdates || [])}

3. EHS SAFETY RECORD STATUS:
${JSON.stringify(submission.safetyRecord || "None reported")}

4. DISRUPTION & DELAY RECORD:
${JSON.stringify(submission.delayRecord || "No delay registered")}

5. EMERGENCY CRITICAL ISSUES:
${JSON.stringify(submission.issueReport || "No issue reported")}

--- CURRENT PROJECT REFERENCE CONTEXT ---
Activities Master Config:
${JSON.stringify(activities || [])}

Active Crew Masters Config:
${JSON.stringify(workers || [])}

--- INSTRUCTIONS ---
Perform a rigorous analysis on:
1. Workforce Feasibility check: Are the reported production quantities physically possible given the active manpower and their professions present today? (e.g., high masonry with 0 masons, or a single worker completing 5 days worth of heavy labor).
2. Physical Integrity: Are quantities logical? (e.g., claiming to pour 500 cubic meters of concrete with 1 labor, or claiming progress on a dependent activity when the prerequisite activity is not even started or is blocked).
3. Coherence Check: If a delay is reported (like "Severe Storm/Rain") that shuts down the site, but full production progress is reported, flag this as a critical weather mismatch.
4. Process Support: Based on delays, weather, or safety violations reported, formulate 2-3 precise, realistic actions the manager or supervisor can take to recover schedule or improve work processes.
5. Prevent Fake Achievements: Give an overall Integrity/Safety score (0 to 100). If you suspect inflated quantities or fictitious work logs, lower the score significantly and raise a "High Risk" anomaly flag.

Provide your feedback strictly in the specified JSON structure. Be direct, literal, and highly professional. Avoid any placeholder text or metadata.
`;

      // 3. Call Gemini using the official schema format from the gemini-api skill
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              integrityScore: {
                type: Type.INTEGER,
                description: "A percentage (0-100) scoring the logical consistency and truthfulness of this field report.",
              },
              status: {
                type: Type.STRING,
                description: "Must be one of: 'Verified', 'Warning', 'High Risk'",
              },
              verificationSummaryEn: {
                type: Type.STRING,
                description: "A summary explanation of the audit findings in English.",
              },
              verificationSummaryAr: {
                type: Type.STRING,
                description: "A summary explanation of the audit findings in Arabic.",
              },
              anomalies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    typeEn: { type: Type.STRING, description: "Type of anomaly (e.g. 'Workforce Mismatch', 'Unrealistic Productivity', 'Contradictory Log')" },
                    typeAr: { type: Type.STRING, description: "Type of anomaly in Arabic" },
                    severity: { type: Type.STRING, description: "Severity: 'Low', 'Medium', 'High'" },
                    detailsEn: { type: Type.STRING, description: "Detailed mismatch justification in English." },
                    detailsAr: { type: Type.STRING, description: "Detailed mismatch justification in Arabic." }
                  },
                  required: ["typeEn", "typeAr", "severity", "detailsEn", "detailsAr"]
                },
                description: "Anomalies, contradictions, or suspicions of over-reporting.",
              },
              processImprovements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    titleEn: { type: Type.STRING, description: "Action title in English" },
                    titleAr: { type: Type.STRING, description: "Action title in Arabic" },
                    descriptionEn: { type: Type.STRING, description: "Step-by-step optimization step in English" },
                    descriptionAr: { type: Type.STRING, description: "Step-by-step optimization step in Arabic" },
                    impact: { type: Type.STRING, description: "Specific focus, e.g., 'Schedule Recovery', 'Safety Mitigation', 'Resource Optimization'" }
                  },
                  required: ["titleEn", "titleAr", "descriptionEn", "descriptionAr", "impact"]
                },
                description: "Strategic decision support and process optimization recommendations.",
              }
            },
            required: [
              "integrityScore",
              "status",
              "verificationSummaryEn",
              "verificationSummaryAr",
              "anomalies",
              "processImprovements"
            ],
          },
        },
      });

      const responseText = response.text || "{}";
      const auditResult = JSON.parse(responseText.trim());

      res.json(auditResult);
    } catch (error: any) {
      console.error("Gemini Audit Error:", error);
      res.status(500).json({ 
        error: error.message || "An unexpected error occurred during the smart AI audit",
        isConfigError: error.message?.includes("GEMINI_API_KEY") 
      });
    }
  });

  // --- VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
