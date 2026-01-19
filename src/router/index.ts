// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useSimpleAuth } from "../composables/useSimpleAuth";

declare module "vue-router" {
  interface RouteMeta {
    title?: string;
    requiresAuth?: boolean;
    requiresGuest?: boolean;
    requiresAdmin?: boolean;
    hideNavigation?: boolean;
  }
}

/* =========================
   Lazy-loaded Pages
   ========================= */

// Auth & Public
const JWTLogin = () => import("../pages/Auth/JWTLogin.vue");
const HomePage = () => import("../pages/HomePage.vue");
// const Register = () => import('../pages/Auth/Register.vue')

// Core
const Profile = () => import("../pages/Profile/Profile.vue");

// Development/Testing
const WebSocketTest = () => import("../components/WebSocketTest.vue");

// Control
const Control = () => import("../pages/Control/Control.vue");
const SurveyControl = () => import("../pages/Control/SurveyControl.vue");
const UserManagement = () => import("../pages/Control/UserManagement/UserManagement.vue");
const AuditLog = () => import("../pages/Control/AuditLog.vue");
const ActivityDetails = () => import("../pages/Activities/ActivityDetails.vue");
// Surveys
const Surveys = () => import("../pages/Survey/Surveys.vue");
const SurveyResponses = () => import("../pages/Survey/SurveyResponses.vue");
const SurveyAnalytics = () => import("../pages/Survey/SurveyAnalytics.vue");
const PublicSurveyView = () => import("../pages/Survey/PublicSurveyView.vue");
const PasswordProtectedSurveyView = () => import("../pages/Survey/PasswordProtectedSurveyView.vue");
const AuthSurveyView = () => import("../pages/Survey/AuthSurveyView.vue");
const SurveyEditorPage = () => import("../pages/Control/SurveyEditorPage.vue");
const CreateActivity = () => import("../pages/Activities/CreateActivity.vue");

// Notifications
const Notifications = () => import("../pages/Notifications");

// Chat
// const InternalChat = () => import("../pages/Chat/InternalChat.vue");

// News
const News = () => import("../pages/News/News.vue");
const QuickLinksPage = () => import("../pages/QuickLinks/QuickLinksPage.vue");

// Activities
const ListingActivities = () => import("../pages/Activities/ListingActivities.vue");
// const OrganizationChart = () => import("../pages/OrganizationChart/OrganizationChart.vue");
// const OrganizationDetails = () => import("../pages/OrganizationChart/OrganizationDetails.vue");
const LocalActivitiesDetail = () => import("../pages/Activities/LocalActivitiesDetail.vue");
/* =========================
   Routes
   ========================= */

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Home",
    component: HomePage,
    meta: { title: "Home - WPC | WeaponpowerCloud App", requiresAuth: true },
  },

  {
    path: "/login",
    name: "Login",
    component: JWTLogin,
    meta: { title: "Login - WPC | WeaponpowerCloud App", requiresGuest: true },
  },

  {
    path: "/quick-links",
    name: "QuickLinks",
    component: QuickLinksPage,
    meta: { title: "Quick Links - WPC | WeaponpowerCloud App", requiresAuth: true },
  },

  // Activities
  {
    path: "/activities",
    redirect: "/activities/local",
  },
  {
    path: "/activities/local",
    name: "ListingActivitiesLocal",
    component: ListingActivities,
    meta: { title: "قائمة الأنشطة - WPC | WeaponpowerCloud App", requiresAuth: true },
  },
  /*
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { title: 'Register - WPC | WeaponpowerCloud App', requiresGuest: true }
  },
  */

  // ✅ Public survey routes
  {
    path: "/activities/local/:id",
    name: "LocalActivitiesDetail",
    component: LocalActivitiesDetail,
    meta: { title: "تفاصيل الأنشطة - WPC | WeaponpowerCloud App", requiresAuth: true },
  },
  {
    path: "/survey/public/:token",
    name: "PublicSurvey",
    component: PublicSurveyView,
    meta: { title: "Public Survey - WPC | WeaponpowerCloud App" },
  },
  {
    path: "/survey/password/:token",
    name: "PasswordProtectedSurvey",
    component: PasswordProtectedSurveyView,
    meta: { title: "Protected Survey - WPC | WeaponpowerCloud App" },
  },

  // Authenticated app
  {
    path: "/surveys",
    name: "Surveys",
    component: Surveys,
    meta: { title: "Surveys - WPC | WeaponpowerCloud App", requiresAuth: true },
  },
  {
    path: "/activities/local/:id/activity/:activityId",
    name: "ActivityDetails",
    component: ActivityDetails,
    meta: { title: "تفاصيل النشاط - WPC | WeaponpowerCloud App", requiresAuth: true },
  },
  {
    path: "/surveys/take/:id",
    name: "AuthSurveyTake",
    component: AuthSurveyView,
    meta: {
      title: "Take Survey - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      hideNavigation: true,
    },
  },

  // Notifications
  {
    path: "/notifications",
    name: "Notifications",
    component: Notifications,
    meta: { title: "Notifications - WPC | WeaponpowerCloud App", requiresAuth: true },
  },

  // Internal Chat - DISABLED FOR NOW - Will enable in future release
  // {
  //   path: "/chat",
  //   name: "Chat",
  //   component: InternalChat,
  //   meta: { title: "Chat - WPC | WeaponpowerCloud App", requiresAuth: true },
  // },

  // News (All authenticated users)
  {
    path: "/news",
    name: "News",
    component: News,
    meta: { title: "News - WPC | WeaponpowerCloud App", requiresAuth: true },
  },
  {
    path: "/news/:id",
    name: "news-details",
    component: () => import("../pages/News/NewsDetails.vue"),
    meta: { title: "News Details - WPC | WeaponpowerCloud App", requiresAuth: true },
  },

  // Organization Chart - DISABLED FOR NOW - Will enable in future release
  // {
  //   path: "/organization-chart",
  //   name: "OrganizationChart",
  //   component: OrganizationChart,
  //   meta: { title: "Organization Chart - WPC | WeaponpowerCloud App", requiresAuth: true },
  // },

  // Organization Details - DISABLED FOR NOW - Will enable in future release
  // {
  //   path: "/organizationDetails/:id",
  //   name: "OrganizationDetails",
  //   component: OrganizationDetails,
  //   meta: { title: "Employee Details - WPC | WeaponpowerCloud App", requiresAuth: true },
  // },

  // WebSocket Test (Development only)
  {
    path: "/websocket-test",
    name: "WebSocketTest",
    component: WebSocketTest,
    meta: { title: "WebSocket Test - WPC | WeaponpowerCloud App", requiresAuth: true },
  },

  // Control (Admins only)
  {
    path: "/control",
    name: "Control",
    component: Control,
    meta: {
      title: "Control Panel - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/surveys",
    name: "SurveyControl",
    component: SurveyControl,
    meta: {
      title: "Survey Management - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/surveys/create",
    name: "SurveyCreate",
    component: SurveyEditorPage,
    meta: {
      title: "Create Survey - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/surveys/edit/:id",
    name: "SurveyEdit",
    component: SurveyEditorPage,
    meta: {
      title: "Edit Survey - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/users",
    name: "UserManagement",
    component: UserManagement,
    meta: {
      title: "User Management - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/news",
    name: "NewsManagement",
    component: News,
    meta: {
      title: "News Management - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/quicklinks",
    name: "QuickLinksManagement",
    component: () => import("../pages/Control/QuickLinks/QuickLinksAdmin.vue"),
    meta: {
      title: "Quick Links Management - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/audit",
    name: "AuditLog",
    component: AuditLog,
    meta: {
      title: "Audit Log - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  // Template Management (Admins only)
  {
    path: "/control/templates",
    name: "TemplateManagement",
    component: () => import("../pages/Control/TemplateManagement.vue"),
    meta: {
      title: "إدارة النماذج - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/templates/create",
    name: "SurveyTemplateCreate",
    component: () => import("../pages/Control/TemplateCreate.vue"),
    meta: {
      title: "إنشاء نموذج جديد - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/templates/edit/:id",
    name: "SurveyTemplateEdit",
    component: () => import("../pages/Control/TemplateCreate.vue"),
    meta: {
      title: "تعديل النموذج - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/templates/:id/activities",
    name: "TemplateActivitiesDetail",
    component: () => import("../pages/Control/TemplateActivitiesDetail.vue"),
    meta: {
      title: "أنشطة القالب - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  
  {
    path: "/control/surveys/:surveyId/responses",
    name: "SurveyResponses",
    component: SurveyResponses,
    meta: {
      title: "Survey Responses - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/surveys/:surveyId/analytics",
    name: "SurveyAnalytics",
    component: SurveyAnalytics,
    meta: {
      title: "Survey Analytics - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/control/responses",
    name: "AllSurveyResponses",
    component: SurveyResponses,
    meta: {
      title: "All Survey Responses - WPC | WeaponpowerCloud App",
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
    meta: { title: "Profile - WPC | WeaponpowerCloud App", requiresAuth: true },
  },

  // Activities User Pages (Authenticated users)
  {
    path: "/activities/templates",
    name: "TemplateList",
    component: () => import("../pages/Activities/TemplateList.vue"),
    meta: {
      title: "قوالب الأنشطة - WPC | WeaponpowerCloud App",
      requiresAuth: true,
    },
  },
  {
    path: "/activities/templates/new",
    name: "TemplateCreate",
    component: () => import("../pages/Activities/TemplateEditor.vue"),
    meta: {
      title: "إنشاء قالب - WPC | WeaponpowerCloud App",
      requiresAuth: true,
    },
  },
  {
    path: "/activities/local/:id/create",
    name: "CreateActivity",
    component: CreateActivity,
    meta: { title: "إنشاء نشاط جديد - WPC | WeaponpowerCloud App", requiresAuth: true },
  },
  {
    path: "/activities/local/:id/edit/:activityId",
    name: "EditActivity",
    component: () => import("../pages/Activities/EditActivity.vue"),
    meta: { title: "تعديل النشاط - WPC | WeaponpowerCloud App", requiresAuth: true },
  },

  {
    path: "/activities/templates/:id/edit",
    name: "TemplateEdit",
    component: () => import("../pages/Activities/TemplateEditor.vue"),
    meta: {
      title: "تعديل القالب - WPC | WeaponpowerCloud App",
      requiresAuth: true,
    },
  },

  // ✅ 404 fallback
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

/* =========================
   Router
   ========================= */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // ✅ BASE_URL مهم للديبلوي تحت ساب-باث
  routes,
});

/* =========================
   Global Guards
   ========================= */

router.beforeEach(async (to, _from, next) => {
  // ✅ CRITICAL: Public survey routes MUST bypass all authentication checks
  // This ensures survey links like /survey/public/:token are always accessible
  if (to.path.startsWith("/survey/")) {
    return next();
  }

  const { isAuthenticated, checkAuth, user } = useSimpleAuth();

  const requiresAuth = to.matched.some((r) => r.meta?.requiresAuth);
  const requiresGuest = to.matched.some((r) => r.meta?.requiresGuest);
  const requiresAdmin = to.matched.some((r) => r.meta?.requiresAdmin);

  let authenticated = isAuthenticated.value;

  // ✅ If authenticated user tries to access login page, redirect to home
  if (to.path === "/login" && authenticated) {
    return next("/");
  }

  // ✅ Check authentication for protected routes
  if (requiresAuth && !authenticated) {
    try {
      authenticated = await checkAuth();
    } catch {
      authenticated = false;
    }

    if (!authenticated) {
      // Redirect unauthenticated users to login page
      return next("/login");
    }
  }

  // ✅ Redirect authenticated users away from guest-only pages (login, register)
  if (requiresGuest && authenticated) {
    const redirectTo = (to.query.redirect as string) || "/";
    return next(redirectTo);
  }

  // ✅ Check admin role for admin-only routes
  if (requiresAdmin) {
    // Re-check authentication if needed
    if (!authenticated) {
      try {
        authenticated = await checkAuth();
      } catch {
        authenticated = false;
      }
    }

    if (!authenticated) {
      // Unauthenticated users trying to access admin routes → login page
      return next("/login");
    }

    const currentUser = user.value;
    const ADMIN_ROLES = new Set(["admin", "super_admin"]);

    // If user is authenticated but not an admin, redirect to home
    if (!currentUser || !ADMIN_ROLES.has(currentUser.role)) {
      return next("/");
    }
  }

  return next();
});

/* =========================
   Title Handling
   ========================= */
router.afterEach(() => {
  document.title = "WHSO Hub";
});

export default router;
