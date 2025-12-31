<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChat } from '../../composables/useChat'
import { useAppStore } from '../../stores/useAppStore'
import { useSimpleAuth } from '../../composables/useSimpleAuth'
import { notificationService } from '../../services/notificationService'
import { websocketService } from '../../services/websocketService'
import { NOTIFICATION_ICONS, PRIORITY_COLORS } from '../../types/notifications.types'
import type { Notification } from '../../types/notifications.types'

const props = defineProps<{
  userRole?: string | null
  allowedPages?: string[]
}>()

const emit = defineEmits<{
  (e: 'logout'): void
  (e: 'toggleTheme'): void
}>()

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const currentTheme = computed(() => store.currentTheme)
const currentLanguage = computed(() => store.currentLanguage)
const t = computed(() => store.t)

// JWT Authentication
const { 
  userFullName: userDisplayName, 
  user,
  logout: authLogout
} = useSimpleAuth()

// Computed user email
const userEmail = computed(() => user.value?.email || '')

// Computed user role
const computedUserRole = computed(() => user.value?.role || '')

// Mobile menu state
const isMobileMenuOpen = ref(false)

// Dropdown states
const showUserMenu = ref(false)
const showNotifications = ref(false)

// Notifications state
const notifications = ref<Notification[]>([])
const isLoadingNotifications = ref(false)
const isMarkingAllRead = ref(false)
const hasLoadedNotifications = ref(false)
const loadNotificationError = ref<string | null>(null)

// Loading timeout and retry configuration
const NOTIFICATION_LOAD_TIMEOUT = 20000
const MAX_LOAD_RETRIES = 3
const loadRetryCount = ref(0)
const loadTimeoutTimer = ref<NodeJS.Timeout | null>(null)
const stuckLoadingRecoveryTimer = ref<NodeJS.Timeout | null>(null)

// WebSocket connection state
const wsConnected = ref(false)
const wsConnecting = ref(false)
const wsConnectionError = ref<string | null>(null)
const wsNotificationCount = ref(-1)

// Track if listeners have been registered
const listenersRegistered = ref(false)

// Combined notification count
const notificationCount = computed(() => {
  if (wsConnected.value && wsNotificationCount.value > -1) {
    return wsNotificationCount.value
  }
  return notifications.value.filter(n => !n.is_read).length
})

type NavItem = {
  name: string
  label: string
  icon: string
  path?: string
  permissionName?: string
  badge?: number | string
  getBadge?: () => number | string | undefined
  isManagement?: boolean
}

// Get unread count from chat composable (for future use with chat feature)
const { totalUnreadCount: _totalUnreadCount } = useChat()

/**
 * Check if user has permission to view a nav item.
 */
const hasPermission = (item: NavItem): boolean => {
  if (props.userRole === 'super_admin') return true
  if (!item.permissionName) return true
  if (props.allowedPages && props.allowedPages.length > 0) {
    return props.allowedPages.includes(item.permissionName)
  }
  return false
}

// Main navigation items
const mainNavItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { name: 'home', path: '/', icon: 'fas fa-home', label: 'الرئيسية' },
    { name: 'news', path: '/news', icon: 'fas fa-newspaper', label: 'الأخبار' },
    { name: 'quick-links', path: '/quick-links', icon: 'fas fa-link', label: 'الروابط السريعة' },
    { name: 'surveys-overview', path: '/surveys', icon: 'fas fa-list-check', label: 'الاستطلاعات' },
  ]
  return items.filter(item => hasPermission(item))
})

// Management navigation items (admin only)
const managementNavItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { name: 'manage-surveys', path: '/control/surveys', icon: 'fas fa-table-cells-large', label: 'إدارة الاستطلاعات', permissionName: 'manage-surveys', isManagement: true },
    { name: 'manage-news', path: '/control/news', icon: 'fas fa-newspaper', label: 'إدارة الأخبار', permissionName: 'manage-news', isManagement: true },
    { name: 'manage-quicklinks', path: '/control/quicklinks', icon: 'fas fa-link', label: 'إدارة الروابط السريعة', permissionName: 'manage-quicklinks', isManagement: true },
    { name: 'manage-users', path: '/control/users', icon: 'fas fa-user-group', label: 'إدارة المستخدمين', permissionName: 'manage-users', isManagement: true },
    { name: 'manage-audit', path: '/control/audit', icon: 'fas fa-clipboard-list', label: 'سجل التدقيق', permissionName: 'manage-audit', isManagement: true },
  ]
  return items.filter(item => hasPermission(item))
})

// Combined items for mobile
const allNavItems = computed(() => [...mainNavItems.value, ...managementNavItems.value])

// Check if management dropdown should show
const showManagementDropdown = ref(false)

const isActive = (path?: string) => {
  if (!path) return false
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const isManagementActive = computed(() => {
  return route.path.startsWith('/control')
})

const handleNav = (item: NavItem) => {
  if (!item.path || item.path === '#') return
  if (item.path.startsWith('http://') || item.path.startsWith('https://')) {
    window.location.href = item.path
    return
  }
  router.push(item.path)
  showManagementDropdown.value = false
  isMobileMenuOpen.value = false
}

const toggleManagementDropdown = () => {
  showManagementDropdown.value = !showManagementDropdown.value
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// User Menu methods
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  showNotifications.value = false
  showManagementDropdown.value = false
}

// Notification methods
const clearLoadingTimers = () => {
  if (loadTimeoutTimer.value) {
    clearTimeout(loadTimeoutTimer.value)
    loadTimeoutTimer.value = null
  }
  if (stuckLoadingRecoveryTimer.value) {
    clearTimeout(stuckLoadingRecoveryTimer.value)
    stuckLoadingRecoveryTimer.value = null
  }
}

const resetLoadingState = () => {
  clearLoadingTimers()
  isLoadingNotifications.value = false
  loadNotificationError.value = null
}

const loadNotifications = async () => {
  if (isLoadingNotifications.value) return
  
  clearLoadingTimers()
  isLoadingNotifications.value = true
  loadNotificationError.value = null
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    loadTimeoutTimer.value = setTimeout(() => {
      reject(new Error('TIMEOUT'))
    }, NOTIFICATION_LOAD_TIMEOUT)
  })
  
  stuckLoadingRecoveryTimer.value = setTimeout(() => {
    if (isLoadingNotifications.value) {
      resetLoadingState()
      loadNotificationError.value = currentLanguage.value === 'ar' 
        ? 'انتهت المهلة، انقر للمحاولة مرة أخرى' 
        : 'Timed out, click to retry'
    }
  }, NOTIFICATION_LOAD_TIMEOUT + 2000)
  
  try {
    const lang = currentLanguage.value as 'en' | 'ar'
    const recentNotifications = await Promise.race([
      notificationService.getRecentNotifications(lang),
      timeoutPromise
    ])
    
    clearLoadingTimers()
    notifications.value = recentNotifications.sort((a: Notification, b: Notification) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    hasLoadedNotifications.value = true
    loadRetryCount.value = 0
    loadNotificationError.value = null
  } catch (error: any) {
    clearLoadingTimers()
    
    if (error.message === 'TIMEOUT') {
      loadNotificationError.value = currentLanguage.value === 'ar' 
        ? 'انتهت المهلة، انقر للمحاولة مرة أخرى' 
        : 'Loading timed out, click to retry'
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      loadNotificationError.value = currentLanguage.value === 'ar' 
        ? 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى' 
        : 'Session expired, please login again'
      loadRetryCount.value = MAX_LOAD_RETRIES
    } else {
      loadNotificationError.value = currentLanguage.value === 'ar' 
        ? 'فشل التحميل، انقر للمحاولة مرة أخرى' 
        : 'Failed to load, click to retry'
    }
    
    if (loadRetryCount.value < MAX_LOAD_RETRIES && error.response?.status !== 401 && error.response?.status !== 403) {
      loadRetryCount.value++
      setTimeout(() => {
        if (showNotifications.value) loadNotifications()
      }, 2000)
    }
  } finally {
    isLoadingNotifications.value = false
  }
}

const retryLoadNotifications = () => {
  loadRetryCount.value = 0
  loadNotificationError.value = null
  loadNotifications()
}

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  showUserMenu.value = false
  showManagementDropdown.value = false
  
  if (showNotifications.value) {
    loadNotifications()
  }
}

const handleNotificationClick = async (notification: Notification) => {
  try {
    if (!notification.is_read) {
      await notificationService.updateNotification(notification.id, true)
      notification.is_read = true
    }
    
    if (notification.action_url) {
      router.push(notification.action_url)
      closeAllDropdowns()
    }
  } catch (error) {
    console.error('Failed to handle notification click:', error)
  }
}

const markAllAsRead = async () => {
  if (isMarkingAllRead.value) return
  
  isMarkingAllRead.value = true
  try {
    const lang = currentLanguage.value as 'en' | 'ar'
    await notificationService.markAllAsRead(lang)
    notifications.value.forEach(n => { n.is_read = true })
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
  } finally {
    isMarkingAllRead.value = false
  }
}

// Generate avatar URL
const generateAvatarUrl = (email: string) => {
  if (!email) return ''
  const name = userDisplayName.value ? encodeURIComponent(userDisplayName.value) : 'User'
  return `https://ui-avatars.com/api/?name=${name}&background=667eea&color=fff&size=128&rounded=true`
}

// Utility functions for notifications
const getNotificationIcon = (notificationType: string): string => {
  return NOTIFICATION_ICONS[notificationType as keyof typeof NOTIFICATION_ICONS] || 'fas fa-info-circle'
}

const getPriorityColor = (priority: string): string => {
  return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || '#667eea'
}

const formatTime = (createdAt: string): string => {
  const now = new Date()
  const notificationDate = new Date(createdAt)
  const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return 'Just now'
  else if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  else if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  else return `${Math.floor(diffInMinutes / 1440)}d ago`
}

// WebSocket handlers
const handleNotificationCount = (data: { type: string; count: number; timestamp: string }) => {
  wsNotificationCount.value = data.count
}

const handleWsConnected = () => {
  wsConnected.value = true
  wsConnecting.value = false
  wsConnectionError.value = null
  
  if (showNotifications.value && hasLoadedNotifications.value) {
    loadNotifications()
  }
}

const handleWsDisconnected = () => {
  wsConnected.value = false
  wsConnecting.value = false
  
  if (isLoadingNotifications.value) {
    resetLoadingState()
  }
}

const handleWsError = (data: any) => {
  wsConnectionError.value = data?.message || 'Connection error'
  wsConnecting.value = false
}

const registerWebSocketListeners = () => {
  if (listenersRegistered.value) return
  
  websocketService.on('notification.count', handleNotificationCount)
  websocketService.on('notification.connected', handleWsConnected)
  websocketService.on('notification.disconnected', handleWsDisconnected)
  websocketService.on('notification.error', handleWsError)
  listenersRegistered.value = true
}

const connectToNotificationWebSocket = async () => {
  const wsServiceConnected = websocketService.isNotificationConnected.value
  
  if (wsServiceConnected) {
    wsConnected.value = true
    wsConnecting.value = false
    wsConnectionError.value = null
    registerWebSocketListeners()
    return
  }
  
  if (wsConnected.value || wsConnecting.value) return
  
  wsConnecting.value = true
  wsConnectionError.value = null
  
  const connectTimeout = setTimeout(() => {
    if (wsConnecting.value && !wsConnected.value) {
      wsConnecting.value = false
      wsConnectionError.value = 'Connection timeout'
    }
  }, 15000)
  
  try {
    registerWebSocketListeners()
    await websocketService.connectToNotifications()
    clearTimeout(connectTimeout)
  } catch (error) {
    clearTimeout(connectTimeout)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    wsConnectionError.value = errorMessage
    wsConnecting.value = false
  }
}

const disconnectFromNotificationWebSocket = () => {
  websocketService.off('notification.count', handleNotificationCount)
  websocketService.off('notification.connected', handleWsConnected)
  websocketService.off('notification.disconnected', handleWsDisconnected)
  websocketService.off('notification.error', handleWsError)
  listenersRegistered.value = false
  
  websocketService.disconnectFromNotifications()
  wsConnected.value = false
  wsConnecting.value = false
  wsNotificationCount.value = -1
}

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('[data-management-dropdown]') && !target.closest('[data-user-dropdown]') && !target.closest('[data-notification-dropdown]')) {
    showManagementDropdown.value = false
    showUserMenu.value = false
    showNotifications.value = false
  }
}

const closeAllDropdowns = () => {
  showManagementDropdown.value = false
  showUserMenu.value = false
  showNotifications.value = false
  isMobileMenuOpen.value = false
}

// Close mobile menu on route change
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
  showManagementDropdown.value = false
  showUserMenu.value = false
  showNotifications.value = false
})

// Watch websocketService connection state
const wsServiceConnected = computed(() => websocketService.isNotificationConnected.value)

watch(wsServiceConnected, (isConnected) => {
  if (isConnected) {
    wsConnected.value = true
    wsConnecting.value = false
    wsConnectionError.value = null
  } else {
    wsConnected.value = false
  }
}, { immediate: true })

// Watch for user authentication changes
watch(() => user.value, (currentUser, previousUser) => {
  if (currentUser && !previousUser) {
    connectToNotificationWebSocket()
  } else if (!currentUser && previousUser) {
    disconnectFromNotificationWebSocket()
  }
}, { immediate: false })

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  
  // Sync WebSocket state on mount
  if (wsServiceConnected.value) {
    wsConnected.value = true
    wsConnecting.value = false
    wsConnectionError.value = null
    registerWebSocketListeners()
  } else if (user.value) {
    connectToNotificationWebSocket()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  clearLoadingTimers()
  disconnectFromNotificationWebSocket()
})

const handleLogout = async () => {
  try {
    await authLogout()
    // The authLogout function will handle redirecting to login page
  } catch (error) {
    // Fallback: redirect to login page
    router.push('/login')
  }
}
const toggleTheme = () => emit('toggleTheme')
</script>

<template>
  <div :class="$style.headerMenu" :data-theme="currentTheme">
    <!-- Desktop Navigation -->
    <nav :class="$style.desktopNav">
      <!-- Logo -->
      <div :class="$style.logoSection">
        <router-link to="/" :class="$style.logoLink">
          <img src="/Logo.png" :class="$style.logo" alt="الشعار" />
        </router-link>
      </div>

      <!-- Main Navigation Items -->
      <div :class="$style.mainNav">
        <button
          v-for="item in mainNavItems"
          :key="item.name"
          type="button"
          :class="[$style.navItem, { [$style.active]: isActive(item.path) }]"
          @click="handleNav(item)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>

        <!-- Management Dropdown (Admin Only) -->
        <div 
          v-if="managementNavItems.length > 0" 
          :class="$style.managementDropdownContainer"
          data-management-dropdown
        >
          <button
            type="button"
            :class="[$style.navItem, $style.managementTrigger, { [$style.active]: isManagementActive }]"
            @click.stop="toggleManagementDropdown"
          >
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
                @click="handleNav(item)"
              >
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
          <button
            type="button"
            :class="$style.iconButton"
            @click.stop="toggleNotifications"
          >
            <i class="fas fa-bell" :class="{ [$style.wsConnected]: wsConnected, [$style.wsDisconnected]: !wsConnected }"></i>
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
                <h3>{{ t('notifications.title') }}</h3>
                <div :class="$style.headerActions">
                  <button 
                    @click="retryLoadNotifications" 
                    :class="$style.refreshBtn" 
                    :disabled="isLoadingNotifications"
                    :title="currentLanguage === 'ar' ? 'تحديث' : 'Refresh'"
                  >
                    <i :class="isLoadingNotifications ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'"></i>
                  </button>
                  <button @click="markAllAsRead" :class="$style.markAllRead" :disabled="isMarkingAllRead || notifications.length === 0">
                    <i v-if="isMarkingAllRead" class="fas fa-spinner fa-spin"></i>
                    {{ t('notifications.markAllRead') }}
                  </button>
                </div>
              </div>
              <div :class="$style.notificationsList">
                <!-- Error state -->
                <div v-if="loadNotificationError && !isLoadingNotifications" :class="$style.errorNotifications" @click="retryLoadNotifications">
                  <i class="fas fa-exclamation-circle"></i>
                  <p>{{ loadNotificationError }}</p>
                  <button :class="$style.retryBtn">
                    <i class="fas fa-redo"></i>
                    {{ currentLanguage === 'ar' ? 'إعادة المحاولة' : 'Retry' }}
                  </button>
                </div>
                <!-- Initial state -->
                <div v-else-if="!hasLoadedNotifications && !isLoadingNotifications && !loadNotificationError" :class="$style.noNotifications">
                  <i class="fas fa-bell"></i>
                  <p>{{ currentLanguage === 'ar' ? 'انقر لتحميل الإشعارات' : 'Click to load notifications' }}</p>
                </div>
                <!-- Empty state -->
                <div v-else-if="notifications.length === 0 && !isLoadingNotifications && hasLoadedNotifications" :class="$style.noNotifications">
                  <i class="fas fa-bell-slash"></i>
                  <p>{{ t('notifications.noNotifications') }}</p>
                </div>
                <!-- Loading state -->
                <div v-if="isLoadingNotifications" :class="$style.loadingNotifications">
                  <i class="fas fa-spinner fa-spin"></i>
                  <p>{{ currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...' }}</p>
                </div>
                <!-- Notification items -->
                <div
                  v-for="notification in notifications"
                  :key="notification.id"
                  :class="[$style.notificationItem, { [$style.unread]: !notification.is_read }]"
                  @click="handleNotificationClick(notification)"
                >
                  <i :class="getNotificationIcon(notification.notification_type)" :style="{ color: getPriorityColor(notification.priority) }"></i>
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
                  {{ t('notifications.viewAll') }}
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
          :title="currentTheme === 'night' ? 'الوضع النهاري' : 'الوضع الليلي'"
        >
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
            :title="userEmail"
          >
            <span :class="$style.profileAvatar">
              <img v-if="userDisplayName" :src="generateAvatarUrl(userEmail)" :alt="userDisplayName" />
              <i v-else class="fas fa-user"></i>
              <span :class="$style.onlineIndicator"></span>
            </span>
            <span :class="$style.profileInfo">
              <span :class="$style.profileName">{{ userDisplayName || 'زائر' }}</span>
              <span :class="$style.profileEmail">{{ userEmail || 'company@mail.com' }}</span>
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
                    <div :class="$style.userDisplayName">{{ userDisplayName || 'Guest User' }}</div>
                    <div :class="$style.userEmailText">{{ userEmail || 'No email available' }}</div>
                    <div :class="$style.userRoleText">{{ computedUserRole || 'No role assigned' }}</div>
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

      <button
        type="button"
        :class="$style.mobileMenuBtn"
        @click="toggleMobileMenu"
        :aria-expanded="isMobileMenuOpen"
      >
        <i :class="isMobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
      </button>
    </div>

    <!-- Mobile Menu Overlay -->
    <Transition name="fade">
      <div 
        v-if="isMobileMenuOpen" 
        :class="$style.mobileOverlay"
        @click="closeMobileMenu"
      ></div>
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
              <div :class="$style.mobileUserName">{{ userDisplayName || 'Guest User' }}</div>
              <div :class="$style.mobileUserEmail">{{ userEmail || 'No email available' }}</div>
              <div :class="$style.mobileUserRole">{{ computedUserRole || 'No role assigned' }}</div>
            </div>
          </div>
        </div>

        <div :class="$style.mobileNavDivider"></div>

        <div :class="$style.mobileNavItems">
          <button
            v-for="item in allNavItems"
            :key="item.name"
            type="button"
            :class="[$style.mobileNavItem, { [$style.active]: isActive(item.path), [$style.management]: item.isManagement }]"
            @click="handleNav(item)"
          >
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
          </button>
        </div>

        <div :class="$style.mobileNavFooter">
          <button
            type="button"
            :class="$style.mobileThemeBtn"
            @click="toggleTheme"
          >
            <i :class="currentTheme === 'night' ? 'fas fa-sun' : 'fas fa-moon'"></i>
            <span>{{ currentTheme === 'night' ? 'الوضع النهاري' : 'الوضع الليلي' }}</span>
          </button>
          
          <button
            type="button"
            :class="$style.mobileLogoutBtn"
            @click="handleLogout"
          >
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
      @click="closeAllDropdowns"
    ></div>
  </div>
</template>

<style module>
.headerMenu {
  background: #ffffff;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
}

.headerMenu[data-theme="night"] {
  background: #181a1f;
  border-bottom-color: rgba(248, 250, 252, 0.08);
}

/* Desktop Navigation */
.desktopNav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 2rem;
  gap: 2rem;
  direction: rtl;
}

.logoSection {
  flex-shrink: 0;
}

.logoLink {
  display: flex;
  align-items: center;
}

.logo {
  height: 50px;
  width: auto;
  object-fit: contain;
}

.mainNav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  justify-content: center;
}

.navItem {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border: none;
  background: transparent;
  color: #334155;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.navItem:hover {
  background: #f4f6fb;
  color: #A17D23;
}

.navItem.active {
  background: linear-gradient(135deg, #B78A41, #A17D23);
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(161, 125, 35, 0.25);
}

.navItem i {
  font-size: 1rem;
}

.headerMenu[data-theme="night"] .navItem {
  color: #e2e8f0;
}

.headerMenu[data-theme="night"] .navItem:hover {
  background: rgba(248, 250, 252, 0.08);
  color: #C9A84C;
}

.headerMenu[data-theme="night"] .navItem.active {
  background: linear-gradient(135deg, rgba(183, 138, 65, 0.3), rgba(161, 125, 35, 0.2));
  color: #F8FAFC;
}

/* Management Dropdown */
.managementDropdownContainer {
  position: relative;
}

.managementTrigger {
  position: relative;
}

.dropdownArrow {
  font-size: 0.7rem;
  transition: transform 0.2s ease;
  margin-inline-start: 0.25rem;
}

.dropdownArrow.rotated {
  transform: rotate(180deg);
}

.managementDropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.15);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  z-index: 1000;
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.headerMenu[data-theme="night"] .managementDropdown {
  background: #1e2127;
  border-color: rgba(248, 250, 252, 0.08);
}

.dropdownItem {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: #334155;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: right;
  width: 100%;
}

.dropdownItem:hover {
  background: #f4f6fb;
  color: #A17D23;
}

.dropdownItem.active {
  background: rgba(183, 138, 65, 0.12);
  color: #A17D23;
}

.dropdownItem i {
  width: 20px;
  text-align: center;
  font-size: 0.9rem;
}

.headerMenu[data-theme="night"] .dropdownItem {
  color: #e2e8f0;
}

.headerMenu[data-theme="night"] .dropdownItem:hover {
  background: rgba(248, 250, 252, 0.08);
  color: #C9A84C;
}

.headerMenu[data-theme="night"] .dropdownItem.active {
  background: rgba(183, 138, 65, 0.2);
  color: #C9A84C;
}

/* Theme Toggle */
.themeToggle {
  flex-shrink: 0;
}

.rightSection {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.themeBtn {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: none;
  background: #f4f6fb;
  color: #334155;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.1rem;
}

.themeBtn:hover {
  background: #e5ebf5;
  transform: translateY(-2px);
}

.themeBtn.active {
  background: linear-gradient(135deg, #B78A41, #A17D23);
  color: #ffffff;
}

.headerMenu[data-theme="night"] .themeBtn {
  background: rgba(248, 250, 252, 0.08);
  color: #e2e8f0;
}

.headerMenu[data-theme="night"] .themeBtn:hover {
  background: rgba(248, 250, 252, 0.15);
}

/* Icon Button (Notifications) */
.iconButtonWrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Fixed width prevents dropdown shift */
  width: 42px;
}

.iconButton {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: none;
  background: #f4f6fb;
  color: #334155;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.iconButton:hover {
  background: #e5ebf5;
  transform: translateY(-2px);
}

.headerMenu[data-theme="night"] .iconButton {
  background: rgba(248, 250, 252, 0.08);
  color: #e2e8f0;
}

.headerMenu[data-theme="night"] .iconButton:hover {
  background: rgba(248, 250, 252, 0.15);
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: linear-gradient(135deg, #A17D23, #B78A41);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
  min-width: 18px;
  text-align: center;
}

.wsStatus,
.wsError {
  position: absolute;
  top: -6px;
  left: -6px;
  font-size: 0.7rem;
  color: #64748b;
}

.wsError {
  color: #ef4444;
}

.wsConnected {
  color: #334155;
}

.wsDisconnected {
  color: #94a3b8;
}

/* Profile Card Wrapper - Contains both card and dropdown */
.profileWrapper {
  position: relative;
  display: flex;
  align-items: center;
  /* Fixed width prevents dropdown shift on hover expand */
  width: 52px;
}

/* Profile Card - Compact Expandable Design */
.profileCard {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0.35rem;
  border-radius: 999px;
  background: #f4f6fb;
  cursor: pointer;
  border: 1px solid rgba(148, 163, 184, 0.18);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  max-width: 52px;
}

.profileCard:hover {
  background: #e5ebf5;
  max-width: 280px;
  gap: 0.6rem;
  padding: 0.35rem 0.6rem 0.35rem 0.35rem;
  /* Expand towards the center (left in RTL) without moving wrapper */
  position: relative;
  z-index: 5;
}

.profileCard:focus-visible {
  outline: 2px solid #A17D23;
  outline-offset: 2px;
}

.headerMenu[data-theme="night"] .profileCard {
  background: rgba(248, 250, 252, 0.08);
  border-color: rgba(248, 250, 252, 0.08);
}

.headerMenu[data-theme="night"] .profileCard:hover {
  background: rgba(248, 250, 252, 0.12);
}

.profileAvatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: visible;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #B78A41, #A17D23);
  color: #fff;
  flex-shrink: 0;
  position: relative;
  box-shadow: 0 2px 8px rgba(161, 125, 35, 0.3);
}

.profileAvatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.onlineIndicator {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 10px;
  height: 10px;
  background: #10b981;
  border-radius: 50%;
  border: 2px solid #f4f6fb;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
}

.headerMenu[data-theme="night"] .onlineIndicator {
  border-color: #181a1f;
}

.profileInfo {
  display: flex;
  flex-direction: column;
  text-align: right;
  min-width: 0;
  opacity: 0;
  width: 0;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.profileCard:hover .profileInfo {
  opacity: 1;
  width: auto;
  min-width: 100px;
}

.profileName {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.8rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.profileEmail {
  font-size: 0.65rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.headerMenu[data-theme="night"] .profileName {
  color: #f8fafc;
}

.headerMenu[data-theme="night"] .profileEmail {
  color: rgba(248, 250, 252, 0.7);
}

.profileArrow {
  width: 0;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: transparent;
  color: #334155;
  font-size: 0.65rem;
  opacity: 0;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.profileCard:hover .profileArrow {
  opacity: 1;
  width: 20px;
}

.headerMenu[data-theme="night"] .profileArrow {
  background: transparent;
  color: #e2e8f0;
}

.rotated {
  transform: rotate(180deg);
}

/* Notification Dropdown */
.notificationDropdown {
  position: absolute;
  top: calc(100% + 12px);
  /* Anchor to the end side for RTL stability */
  inset-inline-end: 0;
  width: 360px;
  max-width: calc(100vw - 2rem);
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 52px rgba(15, 23, 42, 0.18);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  z-index: 1001;
  border: 1px solid rgba(148, 163, 184, 0.14);
  /* Prevent movement from other elements */
  transform-origin: top right;
}

.headerMenu[data-theme="night"] .notificationDropdown {
  background: #1e2127;
  border-color: rgba(248, 250, 252, 0.08);
}

.dropdownHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.dropdownHeader h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.headerMenu[data-theme="night"] .dropdownHeader h3 {
  color: #f8fafc;
}

.headerActions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refreshBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 0.85rem;
  color: #64748b;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refreshBtn:hover:not(:disabled) {
  color: #A17D23;
  background: rgba(183, 138, 65, 0.1);
  border-color: #A17D23;
}

.refreshBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.headerMenu[data-theme="night"] .refreshBtn {
  color: rgba(248, 250, 252, 0.7);
  border-color: rgba(255, 255, 255, 0.15);
}

.headerMenu[data-theme="night"] .refreshBtn:hover:not(:disabled) {
  color: #C9A84C;
  background: rgba(183, 138, 65, 0.15);
}

.markAllRead {
  border: none;
  background: #eef1f7;
  color: #334155;
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.markAllRead:hover:not(:disabled) {
  background: linear-gradient(135deg, #A17D23, #B78A41);
  color: #fff;
}

.markAllRead:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.headerMenu[data-theme="night"] .markAllRead {
  background: rgba(248, 250, 252, 0.08);
  color: #e2e8f0;
}

.notificationsList {
  max-height: 340px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.noNotifications,
.loadingNotifications {
  padding: 2rem 1rem;
  text-align: center;
  color: #64748b;
  display: grid;
  place-items: center;
  gap: 0.5rem;
}

.noNotifications i,
.loadingNotifications i {
  font-size: 1.6rem;
  color: #A17D23;
}

.headerMenu[data-theme="night"] .noNotifications,
.headerMenu[data-theme="night"] .loadingNotifications {
  color: rgba(248, 250, 252, 0.7);
}

.errorNotifications {
  padding: 2rem 1rem;
  text-align: center;
  color: #ef4444;
  display: grid;
  place-items: center;
  gap: 0.75rem;
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.2s ease;
}

.errorNotifications:hover {
  background: rgba(239, 68, 68, 0.08);
}

.errorNotifications i {
  font-size: 1.8rem;
}

.errorNotifications p {
  margin: 0;
  font-size: 0.9rem;
  color: #334155;
}

.headerMenu[data-theme="night"] .errorNotifications p {
  color: rgba(248, 250, 252, 0.85);
}

.retryBtn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  background: #A17D23;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retryBtn:hover {
  background: #B78A41;
  transform: translateY(-1px);
}

.notificationItem {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border-radius: 14px;
  background: #eef1f7;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notificationItem:hover {
  transform: translateY(-2px);
  background: #fff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.headerMenu[data-theme="night"] .notificationItem {
  background: rgba(248, 250, 252, 0.06);
}

.headerMenu[data-theme="night"] .notificationItem:hover {
  background: rgba(183, 138, 65, 0.12);
}

.notificationItem i {
  font-size: 1.1rem;
}

.notificationContent {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.notificationTitle {
  margin: 0;
  font-weight: 700;
  color: #0f172a;
  font-size: 0.9rem;
}

.headerMenu[data-theme="night"] .notificationTitle {
  color: #f8fafc;
}

.notificationBody {
  margin: 0;
  font-size: 0.8rem;
  color: #64748b;
}

.headerMenu[data-theme="night"] .notificationBody {
  color: rgba(248, 250, 252, 0.7);
}

.notificationTime {
  font-size: 0.7rem;
  color: #94a3b8;
}

.unread {
  background: #fff;
  box-shadow: 0 8px 20px rgba(183, 138, 65, 0.15);
}

.headerMenu[data-theme="night"] .unread {
  background: rgba(183, 138, 65, 0.1);
}

.unreadDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #A17D23;
}

.notificationFooter {
  text-align: center;
  padding-top: 0.5rem;
}

.viewAllLink {
  color: #A17D23;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s ease;
}

.viewAllLink:hover {
  color: #B78A41;
}

.headerMenu[data-theme="night"] .viewAllLink {
  color: #C9A84C;
}

/* User Dropdown */
.userDropdown {
  position: absolute;
  top: calc(100% + 12px);
  /* Anchor to the end side (right in RTL = left visually) for stability */
  inset-inline-end: 0;
  /* Expand towards center of page */
  width: 320px;
  max-width: calc(100vw - 2rem);
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 52px rgba(15, 23, 42, 0.18);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  z-index: 1001;
  border: 1px solid rgba(148, 163, 184, 0.14);
  direction: rtl;
  /* Prevent movement from hover expansion */
  transform-origin: top right;
}

.headerMenu[data-theme="night"] .userDropdown {
  background: #1e2127;
  border-color: rgba(248, 250, 252, 0.08);
}

.userDropdownHeader {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.userProfileSection {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.userAvatarLarge {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #A17D23, #B78A41);
  display: grid;
  place-items: center;
  color: #fff;
  overflow: hidden;
  flex-shrink: 0;
}

.userAvatarLarge img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.userDetailsSection {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: right;
}

.userDisplayName {
  font-weight: 800;
  color: #0f172a;
  font-size: 0.95rem;
}

.headerMenu[data-theme="night"] .userDisplayName {
  color: #f8fafc;
}

.userEmailText,
.userRoleText {
  font-size: 0.8rem;
  color: #64748b;
}

.headerMenu[data-theme="night"] .userEmailText,
.headerMenu[data-theme="night"] .userRoleText {
  color: rgba(248, 250, 252, 0.7);
}

.userStatus {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #64748b;
}

.statusIndicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
}

.userDropdownContent {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dropdownDivider {
  height: 1px;
  background: rgba(148, 163, 184, 0.2);
  margin: 0.25rem 0;
}

.headerMenu[data-theme="night"] .dropdownDivider {
  background: rgba(248, 250, 252, 0.1);
}

.userDropdownLink {
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  width: 100%;
}

.userDropdownLink:hover {
  background: rgba(183, 138, 65, 0.08);
}

.headerMenu[data-theme="night"] .userDropdownLink:hover {
  background: rgba(183, 138, 65, 0.12);
}

.logoutButton {
  color: #A17D23;
}

.linkIcon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(183, 138, 65, 0.12);
  display: grid;
  place-items: center;
}

.linkContent {
  display: flex;
  flex-direction: column;
  text-align: right;
}

.linkTitle {
  font-weight: 700;
  font-size: 0.9rem;
}

/* Overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.2);
  z-index: 99;
}

/* Mobile Header */
.mobileHeader {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  direction: rtl;
}

.mobileLogo {
  display: flex;
  align-items: center;
}

.mobileLogoImg {
  height: 40px;
  width: auto;
}

.mobileMenuBtn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: #f4f6fb;
  color: #334155;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s ease;
}

.mobileMenuBtn:hover {
  background: #e5ebf5;
}

.headerMenu[data-theme="night"] .mobileMenuBtn {
  background: rgba(248, 250, 252, 0.08);
  color: #e2e8f0;
}

/* Mobile Overlay */
.mobileOverlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 998;
}

/* Mobile Navigation Panel */
.mobileNav {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  max-width: 85vw;
  height: 100vh;
  background: #ffffff;
  z-index: 999;
  display: flex;
  flex-direction: column;
  direction: rtl;
  box-shadow: -8px 0 32px rgba(15, 23, 42, 0.15);
}

.headerMenu[data-theme="night"] .mobileNav {
  background: #181a1f;
}

.mobileNavHeader {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.headerMenu[data-theme="night"] .mobileNavHeader {
  border-bottom-color: rgba(248, 250, 252, 0.08);
}

.mobileNavLogo {
  height: 45px;
  width: auto;
}

/* Mobile User Profile */
.mobileUserProfile {
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mobileUserInfo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.userAvatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #A17D23, #B78A41);
  display: grid;
  place-items: center;
  color: #fff;
  overflow: hidden;
  flex-shrink: 0;
}

.userAvatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mobileUserDetails {
  display: flex;
  flex-direction: column;
  text-align: right;
  gap: 0.15rem;
}

.mobileUserName {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.95rem;
}

.mobileUserEmail {
  font-size: 0.8rem;
  color: #64748b;
}

.mobileUserRole {
  font-size: 0.75rem;
  color: #94a3b8;
}

.headerMenu[data-theme="night"] .mobileUserName {
  color: #f8fafc;
}

.headerMenu[data-theme="night"] .mobileUserEmail,
.headerMenu[data-theme="night"] .mobileUserRole {
  color: rgba(248, 250, 252, 0.7);
}

.mobileNavDivider {
  height: 1px;
  background: rgba(148, 163, 184, 0.15);
  margin: 0 1rem;
}

.headerMenu[data-theme="night"] .mobileNavDivider {
  background: rgba(248, 250, 252, 0.08);
}

.mobileNavItems {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobileNavItem {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: none;
  background: transparent;
  color: #334155;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: right;
  width: 100%;
}

.mobileNavItem:hover {
  background: #f4f6fb;
  color: #A17D23;
}

.mobileNavItem.active {
  background: linear-gradient(135deg, #B78A41, #A17D23);
  color: #ffffff;
}

.mobileNavItem.management {
  padding-inline-start: 1.5rem;
  font-size: 0.85rem;
}

.mobileNavItem i {
  width: 20px;
  text-align: center;
}

.headerMenu[data-theme="night"] .mobileNavItem {
  color: #e2e8f0;
}

.headerMenu[data-theme="night"] .mobileNavItem:hover {
  background: rgba(248, 250, 252, 0.08);
  color: #C9A84C;
}

.headerMenu[data-theme="night"] .mobileNavItem.active {
  background: linear-gradient(135deg, rgba(183, 138, 65, 0.3), rgba(161, 125, 35, 0.2));
}

.mobileNavFooter {
  padding: 1rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.headerMenu[data-theme="night"] .mobileNavFooter {
  border-top-color: rgba(248, 250, 252, 0.08);
}

.mobileThemeBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem;
  border: none;
  background: #f4f6fb;
  color: #334155;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mobileThemeBtn:hover {
  background: #e5ebf5;
}

.headerMenu[data-theme="night"] .mobileThemeBtn {
  background: rgba(248, 250, 252, 0.08);
  color: #e2e8f0;
}

.mobileLogoutBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.5rem;
}

.mobileLogoutBtn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.headerMenu[data-theme="night"] .mobileLogoutBtn {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.headerMenu[data-theme="night"] .mobileLogoutBtn:hover {
  background: rgba(239, 68, 68, 0.25);
}

/* Responsive */
@media (max-width: 1024px) {
  .desktopNav {
    display: none;
  }

  .mobileHeader {
    display: flex;
  }
}

/* Desktop - All sizes use compact expandable profile */
@media (min-width: 1025px) {
  .mobileHeader,
  .mobileOverlay,
  .mobileNav {
    display: none !important;
  }
  
  /* Smaller nav items on tighter screens */
  .desktopNav {
    gap: 1rem;
  }
}

/* Medium screens - tighter spacing */
@media (min-width: 1025px) and (max-width: 1280px) {
  .desktopNav {
    padding: 0.5rem 1rem;
    gap: 0.75rem;
  }
  
  .navItem {
    padding: 0.5rem 0.85rem;
    font-size: 0.82rem;
    gap: 0.4rem;
  }
  
  .navItem i {
    font-size: 0.9rem;
  }
  
  .logo {
    height: 42px;
  }
  
  .themeBtn,
  .iconButton {
    width: 36px;
    height: 36px;
    font-size: 0.95rem;
  }
  
  .profileAvatar {
    width: 34px;
    height: 34px;
  }
  
  .onlineIndicator {
    width: 8px;
    height: 8px;
  }
  
  .rightSection {
    gap: 0.5rem;
  }
}

/* Large screens */
@media (min-width: 1281px) and (max-width: 1440px) {
  .desktopNav {
    padding: 0.5rem 1.5rem;
    gap: 1.25rem;
  }
  
  .navItem {
    padding: 0.55rem 1rem;
    font-size: 0.85rem;
  }
}

/* Extra large screens - more space */
@media (min-width: 1441px) {
  .profileCard:hover {
    max-width: 320px;
  }
  
  .profileName {
    max-width: 180px;
  }
  
  .profileEmail {
    max-width: 180px;
  }
}

/* Dropdown Animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Slide Animation for Mobile */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Fade Animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
