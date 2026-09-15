sed -i -e '/const runBootstrap = async (firebaseUser: any, activeAdminRaw: string | null) => {/,/}, \[currentAdmin\]);/c\
    const runBootstrap = async (firebaseUser: any) => {\
      console.log(`[BOOT] ${new Date().toISOString()} Authenticated session detected. Starting bootstrap.`);\
\
      const timeoutId = setTimeout(() => {\
        if (isMounted && isLoading) {\
          console.warn(`[BOOT] ${new Date().toISOString()} Critical bootstrap timed out after 5000ms.`);\
          setInitError(lang === '"'"'ar'"'"' ? '"'"'انتهت مهلة الاتصال بقاعدة البيانات'"'"' : '"'"'Cloud sync timeout exceeded.'"'"');\
          setIsLoading(false);\
        }\
      }, 5000);\
\
      try {\
        console.log(`[BOOT] ${new Date().toISOString()} Critical bootstrap queries started`);\
        \
        let myUserDoc: any = null;\
        if (firebaseUser) {\
          myUserDoc = await dbApi.getById<any>('"'"'users'"'"', firebaseUser.uid).catch(() => null);\
        }\
\
        if (!myUserDoc) {\
          console.warn(`[BOOT] User document not found for authenticated UID. Forcing signout.`);\
          await auth.signOut();\
          setCurrentAdmin(null);\
          setCurrentUser(null);\
          setIsLoading(false);\
          clearTimeout(timeoutId);\
          return;\
        }\
\
        const isSuper = myUserDoc?.isSuperAdmin === true || myUserDoc?.role === '"'"'SUPER_ADMIN'"'"';\
        const targetTenantId = myUserDoc?.tenantId;\
\
        const [\
          dbUsers, dbSettings, dbSaasPlans, dbSaasCustomers, dbSaasSubscriptions, dbSaasSettings\
        ] = await Promise.all([\
          isSuper ? dbApi.getAll<User>('"'"'users'"'"').catch(() => []) : dbApi.getByTenant<User>('"'"'users'"'"', targetTenantId).catch(() => []),\
          dbApi.getById<SystemSettings>('"'"'systemSettings'"'"', '"'"'settings-global'"'"').catch(() => null),\
          dbApi.getAll<SaaSPlan>('"'"'saasPlans'"'"').catch(() => []),\
          isSuper \
            ? dbApi.getAll<SaaSCustomer>('"'"'saasCustomers'"'"').catch(() => []) \
            : dbApi.getById<SaaSCustomer>('"'"'saasCustomers'"'"', targetTenantId).then(c => c ? [c] : []).catch(() => []),\
          isSuper \
            ? dbApi.getAll<SaaSSubscription>('"'"'saasSubscriptions'"'"').catch(() => [])\
            : dbApi.getByTenant<SaaSSubscription>('"'"'saasSubscriptions'"'"', targetTenantId).catch(() => []),\
          dbApi.getById<SaaSSettings>('"'"'saasSettings'"'"', '"'"'settings-saas'"'"').catch(() => null)\
        ]);\
\
        clearTimeout(timeoutId);\
        if (!isMounted) return;\
\
        console.log(`[BOOT] ${new Date().toISOString()} Critical bootstrap completed`);\
\
        const resolvedUser: User = {\
          id: firebaseUser.uid,\
          name: myUserDoc.name || firebaseUser.displayName || firebaseUser.email || '"'"'User'"'"',\
          roles: myUserDoc.roles || (myUserDoc.role === '"'"'OWNER'"'"' ? ['"'"'Project Manager'"'"'] : ['"'"'Viewer'"'"']),\
          email: myUserDoc.email || firebaseUser.email || '"'"''"'"',\
          badgeNumber: myUserDoc.badgeNumber || '"'"'EMP-0001'"'"',\
          ...myUserDoc\
        };\
\
        console.log(`[BOOT] User profile & tenant resolved: ${resolvedUser.name} (${targetTenantId})`);\
        \
        setUsers(dbUsers.length > 0 ? dbUsers : [resolvedUser]);\
        setCurrentUser(resolvedUser);\
        setCurrentAdmin({ idNumber: resolvedUser.id, name: resolvedUser.name });\
        setActiveTenantId(targetTenantId);\
\
        if (dbSettings) setSettings(dbSettings);\
        if (dbSaasPlans && dbSaasPlans.length > 0) setSaasPlans(dbSaasPlans);\
        if (dbSaasCustomers && dbSaasCustomers.length > 0) setSaasCustomers(dbSaasCustomers);\
        if (dbSaasSubscriptions && dbSaasSubscriptions.length > 0) setSaasSubscriptions(dbSaasSubscriptions);\
        if (dbSaasSettings) setSaasSettings(dbSaasSettings);\
\
        setIsLoading(false);\
\
        if (targetTenantId) {\
          loadOperationalData(targetTenantId, isSuper);\
        }\
\
      } catch (error: any) {\
        clearTimeout(timeoutId);\
        console.error(`[BOOT] ${new Date().toISOString()} Database bootstrap failed:`, error);\
        if (isMounted) {\
          setInitError(error.message || "Failed to connect to database");\
          setIsLoading(false);\
        }\
      }\
    };\
\
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {\
      if (!isMounted) return;\
      \
      if (!firebaseUser) {\
        console.log(`[BOOT] ${new Date().toISOString()} No Firebase session detected. Rendering login immediately.`);\
        setCurrentAdmin(null);\
        setCurrentUser(null);\
        setIsLoading(false);\
        return;\
      }\
\
      runBootstrap(firebaseUser);\
    });\
\
    return () => {\
      isMounted = false;\
      unsubscribeAuth();\
    };\
  }, []);' src/App.tsx
