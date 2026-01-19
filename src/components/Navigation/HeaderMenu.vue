<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChat } from "../../composables/useChat";
import { useAppStore } from "../../stores/useAppStore";
import { useSimpleAuth } from "../../composables/useSimpleAuth";
import { notificationService } from "../../services/notificationService";
import { websocketService } from "../../services/websocketService";
import { NOTIFICATION_ICONS, PRIORITY_COLORS } from "../../types/notifications.types";
import type { Notification } from "../../types/notifications.types";

const props = defineProps<{
  userRole?: string | null;
  allowedPages?: string[];
}>();

const emit = defineEmits<{
  (e: "logout"): void;
  (e: "toggleTheme"): void;
}>();

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const currentTheme = computed(() => store.currentTheme);
const currentLanguage = computed(() => store.currentLanguage);
const t = computed(() => store.t);

// JWT Authentication
const { userFullName: userDisplayName, user, logout: authLogout } = useSimpleAuth();

// Computed user email
const userEmail = computed(() => user.value?.email || "");

// Computed user role
const computedUserRole = computed(() => user.value?.role || "");

// Mobile menu state
const isMobileMenuOpen = ref(false);

// Dropdown states
const showUserMenu = ref(false);
const showNotifications = ref(false);

// Notifications state
const notifications = ref<Notification[]>([]);
const isLoadingNotifications = ref(false);
const isMarkingAllRead = ref(false);
const hasLoadedNotifications = ref(false);
const loadNotificationError = ref<string | null>(null);

// Loading timeout and retry configuration
const NOTIFICATION_LOAD_TIMEOUT = 20000;
const MAX_LOAD_RETRIES = 3;
const loadRetryCount = ref(0);
const loadTimeoutTimer = ref<NodeJS.Timeout | null>(null);
const stuckLoadingRecoveryTimer = ref<NodeJS.Timeout | null>(null);

// WebSocket connection state
const wsConnected = ref(false);
const wsConnecting = ref(false);
const wsConnectionError = ref<string | null>(null);
const wsNotificationCount = ref(-1);

// Track if listeners have been registered
const listenersRegistered = ref(false);

// Combined notification count
const notificationCount = computed(() => {
  if (wsConnected.value && wsNotificationCount.value > -1) {
    return wsNotificationCount.value;
  }
  return notifications.value.filter((n) => !n.is_read).length;
});

type NavItem = {
  name: string;
  label: string;
  icon: string;
  path?: string;
  permissionName?: string;
  badge?: number | string;
  getBadge?: () => number | string | undefined;
  isManagement?: boolean;
};

// Get unread count from chat composable (for future use with chat feature)
const { totalUnreadCount: _totalUnreadCount } = useChat();

/**
 * Check if user has permission to view a nav item.
 */
const hasPermission = (item: NavItem): boolean => {
  if (props.userRole === "super_admin") return true;
  if (!item.permissionName) return true;
  if (props.allowedPages && props.allowedPages.length > 0) {
    return props.allowedPages.includes(item.permissionName);
  }
  return false;
};

// Main navigation items
const mainNavItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { name: "home", path: "/", icon: "fas fa-home", label: "الرئيسية" },
    { name: "news", path: "/news", icon: "fas fa-newspaper", label: "الأخبار" },
    { name: "quick-links", path: "/quick-links", icon: "fas fa-link", label: "الروابط السريعة" },
    { name: "activities", path: "/activities/local", icon: "fas fa-table-list", label: "قائمة الأنشطة" },
    { name: "surveys-overview", path: "/surveys", icon: "fas fa-list-check", label: "الاستطلاعات" },
  ];
  return items.filter((item) => hasPermission(item));
});

// Management navigation items (admin only)
const managementNavItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    {
      name: "manage-surveys",
      path: "/control/surveys",
      icon: "fas fa-table-cells-large",
      label: "إدارة الاستطلاعات",
      permissionName: "manage-surveys",
      isManagement: true,
    },
    {
      name: "manage-templates",
      path: "/control/templates",
      icon: "fas fa-file-alt",
      label: "إدارة النماذج",
      permissionName: "manage-surveys",
      isManagement: true,
    },
    {
      name: "manage-news",
      path: "/control/news",
      icon: "fas fa-newspaper",
      label: "إدارة الأخبار",
      permissionName: "manage-news",
      isManagement: true,
    },
    {
      name: "manage-quicklinks",
      path: "/control/quicklinks",
      icon: "fas fa-link",
      label: "إدارة الروابط السريعة",
      permissionName: "manage-quicklinks",
      isManagement: true,
    },
    {
      name: "manage-users",
      path: "/control/users",
      icon: "fas fa-user-group",
      label: "إدارة المستخدمين",
      permissionName: "manage-users",
      isManagement: true,
    },
    {
      name: "manage-audit",
      path: "/control/audit",
      icon: "fas fa-clipboard-list",
      label: "سجل التدقيق",
      permissionName: "manage-audit",
      isManagement: true,
    },
  ];
  return items.filter((item) => hasPermission(item));
});

// Combined items for mobile
const allNavItems = computed(() => [...mainNavItems.value, ...managementNavItems.value]);

// Check if management dropdown should show
const showManagementDropdown = ref(false);

const isActive = (path?: string) => {
  if (!path) return false;
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
};

const isManagementActive = computed(() => {
  return route.path.startsWith("/control");
});

const handleNav = (item: NavItem) => {
  if (!item.path || item.path === "#") return;
  if (item.path.startsWith("http://") || item.path.startsWith("https://")) {
    window.location.href = item.path;
    return;
  }
  router.push(item.path);
  showManagementDropdown.value = false;
  isMobileMenuOpen.value = false;
};

const toggleManagementDropdown = () => {
  showManagementDropdown.value = !showManagementDropdown.value;
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

// User Menu methods
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
  showNotifications.value = false;
  showManagementDropdown.value = false;
};

// Notification methods
const clearLoadingTimers = () => {
  if (loadTimeoutTimer.value) {
    clearTimeout(loadTimeoutTimer.value);
    loadTimeoutTimer.value = null;
  }
  if (stuckLoadingRecoveryTimer.value) {
    clearTimeout(stuckLoadingRecoveryTimer.value);
    stuckLoadingRecoveryTimer.value = null;
  }
};

const resetLoadingState = () => {
  clearLoadingTimers();
  isLoadingNotifications.value = false;
  loadNotificationError.value = null;
};

const loadNotifications = async () => {
  if (isLoadingNotifications.value) return;

  clearLoadingTimers();
  isLoadingNotifications.value = true;
  loadNotificationError.value = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    loadTimeoutTimer.value = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, NOTIFICATION_LOAD_TIMEOUT);
  });

  stuckLoadingRecoveryTimer.value = setTimeout(() => {
    if (isLoadingNotifications.value) {
      resetLoadingState();
      loadNotificationError.value =
        currentLanguage.value === "ar" ? "انتهت المهلة، انقر للمحاولة مرة أخرى" : "Timed out, click to retry";
    }
  }, NOTIFICATION_LOAD_TIMEOUT + 2000);

  try {
    const lang = currentLanguage.value as "en" | "ar";
    const recentNotifications = await Promise.race([notificationService.getRecentNotifications(lang), timeoutPromise]);

    clearLoadingTimers();
    notifications.value = recentNotifications.sort(
      (a: Notification, b: Notification) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    hasLoadedNotifications.value = true;
    loadRetryCount.value = 0;
    loadNotificationError.value = null;
  } catch (error: any) {
    clearLoadingTimers();

    if (error.message === "TIMEOUT") {
      loadNotificationError.value =
        currentLanguage.value === "ar" ? "انتهت المهلة، انقر للمحاولة مرة أخرى" : "Loading timed out, click to retry";
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      loadNotificationError.value =
        currentLanguage.value === "ar"
          ? "انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى"
          : "Session expired, please login again";
      loadRetryCount.value = MAX_LOAD_RETRIES;
    } else {
      loadNotificationError.value =
        currentLanguage.value === "ar" ? "فشل التحميل، انقر للمحاولة مرة أخرى" : "Failed to load, click to retry";
    }

    if (loadRetryCount.value < MAX_LOAD_RETRIES && error.response?.status !== 401 && error.response?.status !== 403) {
      loadRetryCount.value++;
      setTimeout(() => {
        if (showNotifications.value) loadNotifications();
      }, 2000);
    }
  } finally {
    isLoadingNotifications.value = false;
  }
};

const retryLoadNotifications = () => {
  loadRetryCount.value = 0;
  loadNotificationError.value = null;
  loadNotifications();
};

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value;
  showUserMenu.value = false;
  showManagementDropdown.value = false;

  if (showNotifications.value) {
    loadNotifications();
  }
};

const handleNotificationClick = async (notification: Notification) => {
  try {
    if (!notification.is_read) {
      await notificationService.updateNotification(notification.id, true);
      notification.is_read = true;
    }

    if (notification.action_url) {
      router.push(notification.action_url);
      closeAllDropdowns();
    }
  } catch (error) {
    console.error("Failed to handle notification click:", error);
  }
};

const markAllAsRead = async () => {
  if (isMarkingAllRead.value) return;

  isMarkingAllRead.value = true;
  try {
    const lang = currentLanguage.value as "en" | "ar";
    await notificationService.markAllAsRead(lang);
    notifications.value.forEach((n) => {
      n.is_read = true;
    });
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
  } finally {
    isMarkingAllRead.value = false;
  }
};

// Generate avatar URL
const generateAvatarUrl = (email: string) => {
  if (!email) return "";
  const name = userDisplayName.value ? encodeURIComponent(userDisplayName.value) : "User";
  return `https://ui-avatars.com/api/?name=${name}&background=667eea&color=fff&size=128&rounded=true`;
};

// Utility functions for notifications
const getNotificationIcon = (notificationType: string): string => {
  return NOTIFICATION_ICONS[notificationType as keyof typeof NOTIFICATION_ICONS] || "fas fa-info-circle";
};

const getPriorityColor = (priority: string): string => {
  return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || "#667eea";
};

const formatTime = (createdAt: string): string => {
  const now = new Date();
  const notificationDate = new Date(createdAt);
  const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return "Just now";
  else if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  else if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  else return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

// WebSocket handlers
const handleNotificationCount = (data: { type: string; count: number; timestamp: string }) => {
  wsNotificationCount.value = data.count;
};

const handleWsConnected = () => {
  wsConnected.value = true;
  wsConnecting.value = false;
  wsConnectionError.value = null;

  if (showNotifications.value && hasLoadedNotifications.value) {
    loadNotifications();
  }
};

const handleWsDisconnected = () => {
  wsConnected.value = false;
  wsConnecting.value = false;

  if (isLoadingNotifications.value) {
    resetLoadingState();
  }
};

const handleWsError = (data: any) => {
  wsConnectionError.value = data?.message || "Connection error";
  wsConnecting.value = false;
};

const registerWebSocketListeners = () => {
  if (listenersRegistered.value) return;

  websocketService.on("notification.count", handleNotificationCount);
  websocketService.on("notification.connected", handleWsConnected);
  websocketService.on("notification.disconnected", handleWsDisconnected);
  websocketService.on("notification.error", handleWsError);
  listenersRegistered.value = true;
};

const connectToNotificationWebSocket = async () => {
  const wsServiceConnected = websocketService.isNotificationConnected.value;

  if (wsServiceConnected) {
    wsConnected.value = true;
    wsConnecting.value = false;
    wsConnectionError.value = null;
    registerWebSocketListeners();
    return;
  }

  if (wsConnected.value || wsConnecting.value) return;

  wsConnecting.value = true;
  wsConnectionError.value = null;

  const connectTimeout = setTimeout(() => {
    if (wsConnecting.value && !wsConnected.value) {
      wsConnecting.value = false;
      wsConnectionError.value = "Connection timeout";
    }
  }, 15000);

  try {
    registerWebSocketListeners();
    await websocketService.connectToNotifications();
    clearTimeout(connectTimeout);
  } catch (error) {
    clearTimeout(connectTimeout);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    wsConnectionError.value = errorMessage;
    wsConnecting.value = false;
  }
};

const disconnectFromNotificationWebSocket = () => {
  websocketService.off("notification.count", handleNotificationCount);
  websocketService.off("notification.connected", handleWsConnected);
  websocketService.off("notification.disconnected", handleWsDisconnected);
  websocketService.off("notification.error", handleWsError);
  listenersRegistered.value = false;

  websocketService.disconnectFromNotifications();
  wsConnected.value = false;
  wsConnecting.value = false;
  wsNotificationCount.value = -1;
};

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement;
  if (
    !target.closest("[data-management-dropdown]") &&
    !target.closest("[data-user-dropdown]") &&
    !target.closest("[data-notification-dropdown]")
  ) {
    showManagementDropdown.value = false;
    showUserMenu.value = false;
    showNotifications.value = false;
  }
};

const closeAllDropdowns = () => {
  showManagementDropdown.value = false;
  showUserMenu.value = false;
  showNotifications.value = false;
  isMobileMenuOpen.value = false;
};

// Close mobile menu on route change
watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
    showManagementDropdown.value = false;
    showUserMenu.value = false;
    showNotifications.value = false;
  },
);

// Watch websocketService connection state
const wsServiceConnected = computed(() => websocketService.isNotificationConnected.value);

watch(
  wsServiceConnected,
  (isConnected) => {
    if (isConnected) {
      wsConnected.value = true;
      wsConnecting.value = false;
      wsConnectionError.value = null;
    } else {
      wsConnected.value = false;
    }
  },
  { immediate: true },
);

// Watch for user authentication changes
watch(
  () => user.value,
  (currentUser, previousUser) => {
    if (currentUser && !previousUser) {
      connectToNotificationWebSocket();
    } else if (!currentUser && previousUser) {
      disconnectFromNotificationWebSocket();
    }
  },
  { immediate: false },
);

onMounted(() => {
  document.addEventListener("click", handleClickOutside);

  // Sync WebSocket state on mount
  if (wsServiceConnected.value) {
    wsConnected.value = true;
    wsConnecting.value = false;
    wsConnectionError.value = null;
    registerWebSocketListeners();
  } else if (user.value) {
    connectToNotificationWebSocket();
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  clearLoadingTimers();
  disconnectFromNotificationWebSocket();
});

const handleLogout = async () => {
  try {
    await authLogout();
    // The authLogout function will handle redirecting to login page
  } catch (error) {
    // Fallback: redirect to login page
    router.push("/login");
  }
};
const toggleTheme = () => emit("toggleTheme");
</script>

<template>
  <div :class="$style.headerMenu" :data-theme="currentTheme">
    <!-- Desktop Navigation -->
    <nav :class="$style.desktopNav">
      <!-- Logo -->
      <div :class="$style.logoSection">
        <router-link to="/" :class="$style.logoLink">
          <img src="/New-logo.png" :class="$style.logo" alt="NCEMA Logo" />
          <img src="/white-Logo-text.png" :class="$style.logoText" alt="Logo Text" />
        </router-link>
      </div>

      <!-- Main Navigation Items -->
      <div :class="$style.mainNav">
        <button
          v-for="item in mainNavItems"
          :key="item.name"
          type="button"
          :class="[$style.navItem, { [$style.active]: isActive(item.path) }]"
          @click="handleNav(item)">
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>

        <!-- Management Dropdown (Admin Only) -->
        <div v-if="managementNavItems.length > 0" :class="$style.managementDropdownContainer" data-management-dropdown>
          <button
            type="button"
            :class="[$style.navItem, $style.managementTrigger, { [$style.active]: isManagementActive }]"
            @click.stop="toggleManagementDropdown">
            <i class="fas fa-cog"></i>
            <span>لوحة التحكم</span>
            <i :class="['fas fa-chevron-down', $style.dropdownArrow, { [$style.rotated]: showManagementDropdown }]"></i>
          </button>

          <Transition name="dropdown">
            <div v-if="showManagementDropdown" :class="$style.managementDropdown">
              <button
                v-for="item in managementNavItems"
                :key="item.name"
                type="button"
                :class="[$style.dropdownItem, { [$style.active]: isActive(item.path) }]"
                @click="handleNav(item)">
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Theme Toggle -->
      <div :class="$style.rightSection">
        <!-- Notifications Button -->
        <div :class="$style.iconButtonWrap" data-notification-dropdown>
          <button type="button" :class="$style.iconButton" @click.stop="toggleNotifications">
            <i
              class="fas fa-bell"
              :class="{ [$style.wsConnected]: wsConnected, [$style.wsDisconnected]: !wsConnected }"></i>
            <span v-if="notificationCount > 0" :class="$style.badge">{{ notificationCount }}</span>
          </button>

          <div v-if="wsConnecting" :class="$style.wsStatus" title="Connecting...">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
          <div v-else-if="wsConnectionError" :class="$style.wsError" :title="`Error: ${wsConnectionError}`">
            <i class="fas fa-exclamation-triangle"></i>
          </div>

          <!-- Notifications Dropdown -->
          <Transition name="dropdown">
            <div v-if="showNotifications" :class="$style.notificationDropdown" @click.stop>
              <div :class="$style.dropdownHeader">
                <h3>{{ t("notifications.title") }}</h3>
                <div :class="$style.headerActions">
                  <button
                    @click="retryLoadNotifications"
                    :class="$style.refreshBtn"
                    :disabled="isLoadingNotifications"
                    :title="currentLanguage === 'ar' ? 'تحديث' : 'Refresh'">
                    <i :class="isLoadingNotifications ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'"></i>
                  </button>
                  <button
                    @click="markAllAsRead"
                    :class="$style.markAllRead"
                    :disabled="isMarkingAllRead || notifications.length === 0">
                    <i v-if="isMarkingAllRead" class="fas fa-spinner fa-spin"></i>
                    {{ t("notifications.markAllRead") }}
                  </button>
                </div>
              </div>
              <div :class="$style.notificationsList">
                <!-- Error state -->
                <div
                  v-if="loadNotificationError && !isLoadingNotifications"
                  :class="$style.errorNotifications"
                  @click="retryLoadNotifications">
                  <i class="fas fa-exclamation-circle"></i>
                  <p>{{ loadNotificationError }}</p>
                  <button :class="$style.retryBtn">
                    <i class="fas fa-redo"></i>
                    {{ currentLanguage === "ar" ? "إعادة المحاولة" : "Retry" }}
                  </button>
                </div>
                <!-- Initial state -->
                <div
                  v-else-if="!hasLoadedNotifications && !isLoadingNotifications && !loadNotificationError"
                  :class="$style.noNotifications">
                  <i class="fas fa-bell"></i>
                  <p>{{ currentLanguage === "ar" ? "انقر لتحميل الإشعارات" : "Click to load notifications" }}</p>
                </div>
                <!-- Empty state -->
                <div
                  v-else-if="notifications.length === 0 && !isLoadingNotifications && hasLoadedNotifications"
                  :class="$style.noNotifications">
                  <i class="fas fa-bell-slash"></i>
                  <p>{{ t("notifications.noNotifications") }}</p>
                </div>
                <!-- Loading state -->
                <div v-if="isLoadingNotifications" :class="$style.loadingNotifications">
                  <i class="fas fa-spinner fa-spin"></i>
                  <p>{{ currentLanguage === "ar" ? "جاري التحميل..." : "Loading..." }}</p>
                </div>
                <!-- Notification items -->
                <div
                  v-for="notification in notifications"
                  :key="notification.id"
                  :class="[$style.notificationItem, { [$style.unread]: !notification.is_read }]"
                  @click="handleNotificationClick(notification)">
                  <i
                    :class="getNotificationIcon(notification.notification_type)"
                    :style="{ color: getPriorityColor(notification.priority) }"></i>
                  <div :class="$style.notificationContent">
                    <p :class="$style.notificationTitle">{{ notification.title_localized }}</p>
                    <p :class="$style.notificationBody">{{ notification.body_localized }}</p>
                    <span :class="$style.notificationTime">{{ formatTime(notification.created_at) }}</span>
                  </div>
                  <div v-if="!notification.is_read" :class="$style.unreadDot"></div>
                </div>
              </div>
              <div v-if="notifications.length > 0" :class="$style.notificationFooter">
                <router-link to="/notifications" @click="closeAllDropdowns" :class="$style.viewAllLink">
                  {{ t("notifications.viewAll") }}
                </router-link>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Theme Toggle -->
        <button
          type="button"
          :class="[$style.themeBtn, { [$style.active]: currentTheme === 'night' }]"
          @click="toggleTheme"
          :title="currentTheme === 'night' ? 'الوضع النهاري' : 'الوضع الليلي'">
          <i :class="currentTheme === 'night' ? 'fas fa-sun' : 'fas fa-moon'"></i>
        </button>

        <!-- Profile Card - Compact & Expandable -->
        <div :class="$style.profileWrapper" data-user-dropdown>
          <div
            :class="$style.profileCard"
            @click.stop="toggleUserMenu"
            role="button"
            tabindex="0"
            @keydown.enter.prevent="toggleUserMenu"
            @keydown.space.prevent="toggleUserMenu"
            :title="userEmail">
            <span :class="$style.profileAvatar">
              <img v-if="userDisplayName" :src="generateAvatarUrl(userEmail)" :alt="userDisplayName" />
              <i v-else class="fas fa-user"></i>
              <span :class="$style.onlineIndicator"></span>
            </span>
            <span :class="$style.profileInfo">
              <span :class="$style.profileName">{{ userDisplayName || "زائر" }}</span>
              <span :class="$style.profileEmail">{{ userEmail || "company@mail.com" }}</span>
            </span>
            <span :class="$style.profileArrow">
              <i class="fas fa-chevron-down" :class="{ [$style.rotated]: showUserMenu }"></i>
            </span>
          </div>

          <!-- User Dropdown - Outside overflow container -->
          <Transition name="dropdown">
            <div v-if="showUserMenu" :class="$style.userDropdown" @click.stop>
              <div :class="$style.userDropdownHeader">
                <div :class="$style.userProfileSection">
                  <div :class="$style.userAvatarLarge">
                    <img v-if="userDisplayName" :src="generateAvatarUrl(userEmail)" :alt="userDisplayName" />
                    <i v-else class="fas fa-user"></i>
                  </div>
                  <div :class="$style.userDetailsSection">
                    <div :class="$style.userDisplayName">{{ userDisplayName || "Guest User" }}</div>
                    <div :class="$style.userEmailText">{{ userEmail || "No email available" }}</div>
                    <div :class="$style.userRoleText">{{ computedUserRole || "No role assigned" }}</div>
                    <div :class="$style.userStatus">
                      <div :class="$style.statusIndicator"></div>
                      <span>Online</span>
                    </div>
                  </div>
                </div>
              </div>
              <div :class="$style.userDropdownContent">
                <div :class="$style.dropdownDivider"></div>
                <button @click="handleLogout" :class="[$style.userDropdownLink, $style.logoutButton]">
                  <div :class="$style.linkIcon">
                    <i class="fas fa-sign-out-alt"></i>
                  </div>
                  <div :class="$style.linkContent">
                    <span :class="$style.linkTitle">تسجيل الخروج</span>
                  </div>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </nav>

    <!-- Mobile Navigation Toggle -->
    <div :class="$style.mobileHeader">
      <router-link to="/" :class="$style.mobileLogo">
        <img src="/logomobile.png" :class="$style.mobileLogoImg" alt="الشعار" />
      </router-link>

      <button type="button" :class="$style.mobileMenuBtn" @click="toggleMobileMenu" :aria-expanded="isMobileMenuOpen">
        <i :class="isMobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
      </button>
    </div>

    <!-- Mobile Menu Overlay -->
    <Transition name="fade">
      <div v-if="isMobileMenuOpen" :class="$style.mobileOverlay" @click="closeMobileMenu"></div>
    </Transition>

    <!-- Mobile Menu Panel -->
    <Transition name="slide">
      <nav v-if="isMobileMenuOpen" :class="$style.mobileNav">
        <div :class="$style.mobileNavHeader">
          <img src="/Logo.png" :class="$style.mobileNavLogo" alt="الشعار" />
        </div>

        <!-- Mobile User Profile -->
        <div :class="$style.mobileUserProfile">
          <div :class="$style.mobileUserInfo">
            <div :class="$style.userAvatar">
              <img v-if="userDisplayName" :src="generateAvatarUrl(userEmail)" :alt="userDisplayName" />
              <i v-else class="fas fa-user"></i>
            </div>
            <div :class="$style.mobileUserDetails">
              <div :class="$style.mobileUserName">{{ userDisplayName || "Guest User" }}</div>
              <div :class="$style.mobileUserEmail">{{ userEmail || "No email available" }}</div>
              <div :class="$style.mobileUserRole">{{ computedUserRole || "No role assigned" }}</div>
            </div>
          </div>
        </div>

        <div :class="$style.mobileNavDivider"></div>

        <div :class="$style.mobileNavItems">
          <button
            v-for="item in allNavItems"
            :key="item.name"
            type="button"
            :class="[
              $style.mobileNavItem,
              { [$style.active]: isActive(item.path), [$style.management]: item.isManagement },
            ]"
            @click="handleNav(item)">
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
          </button>
        </div>

        <div :class="$style.mobileNavFooter">
          <button type="button" :class="$style.mobileThemeBtn" @click="toggleTheme">
            <i :class="currentTheme === 'night' ? 'fas fa-sun' : 'fas fa-moon'"></i>
            <span>{{ currentTheme === "night" ? "الوضع النهاري" : "الوضع الليلي" }}</span>
          </button>

          <button type="button" :class="$style.mobileLogoutBtn" @click="handleLogout">
            <i class="fas fa-sign-out-alt"></i>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </nav>
    </Transition>

    <!-- Overlay -->
    <div
      v-if="showUserMenu || showNotifications || isMobileMenuOpen"
      :class="$style.overlay"
      @click="closeAllDropdowns"></div>
  </div>
</template>

<style module src="./HeaderMenu.module.css"></style>
