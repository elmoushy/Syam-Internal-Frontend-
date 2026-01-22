<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import Navigation from './components/Navigation/Navigation.vue'
import HeaderMenu from './components/Navigation/HeaderMenu.vue'
import QuickLinksSidebar from './components/QuickLinks/QuickLinksSidebar.vue'
import { useSimpleAuth } from './composables/useSimpleAuth'
import { useAppStore } from './stores/useAppStore'
import { websocketService } from './services/websocketService'

const route = useRoute()
const showNavigation = computed(
  () => route.meta?.requiresAuth === true && route.meta?.hideNavigation !== true
)

const store = useAppStore()

const toggleTheme = () => store.toggleTheme()

const { isAuthenticated } = useSimpleAuth()

// Track if WebSocket setup is complete
const wsSetupComplete = ref(false)
const hasAttemptedConnection = ref(false)

// Setup global notification WebSocket connection
const setupNotificationWebSocket = () => {
  if (wsSetupComplete.value) return
  
  // Listen for chat unread updates
  websocketService.on('chat.unread.update', (_data: any) => {
    // Chat unread update received
  })
  
  // Listen for connection events
  websocketService.on('notification.connected', () => {
    // Notification WebSocket connected
  })
  
  websocketService.on('notification.disconnected', () => {
    // Notification WebSocket disconnected
  })
  
  wsSetupComplete.value = true
}

// Attempt WebSocket connection - now checks for actual token availability
const attemptWebSocketConnection = async (force = false) => {
  if (hasAttemptedConnection.value && !force) {
    return
  }
  
  // Import the auth initialization and wait for it
  const { initializeAuth, getAccessToken } = await import('./services/jwtAuthService')
  
  // Ensure auth is initialized first
  await initializeAuth()
  
  // Now check if token is available
  const token = getAccessToken()
  if (!token) {
    hasAttemptedConnection.value = false // Allow retry
    return
  }
  
  hasAttemptedConnection.value = true
  
  try {
    await websocketService.connectToNotifications()
  } catch (_error) {
    hasAttemptedConnection.value = false // Allow retry
  }
}

// Connect/disconnect based on authentication state
watch(isAuthenticated, async (authenticated, wasAuthenticated) => {
  if (authenticated) {
    // User is authenticated - connect WebSocket
    if (wasAuthenticated === undefined) {
      // Initial load with existing token - connect immediately
      await attemptWebSocketConnection()
    } else if (!wasAuthenticated) {
      // Transition from unauthenticated to authenticated (fresh login)
      // Add small delay to ensure token is saved
      setTimeout(async () => {
        await attemptWebSocketConnection(true) // Force reconnect
      }, 200)
    }
  } else if (wasAuthenticated) {
    // Only disconnect when we transition from authenticated to unauthenticated
    websocketService.disconnectFromNotifications()
    hasAttemptedConnection.value = false
  }
}, { immediate: true }) // Run immediately on component mount

// Setup on mount
onMounted(async () => {
  setupNotificationWebSocket()
  
  // Check authentication and connect if needed
  // The watch will handle this with immediate: true, but we add a fallback
  if (isAuthenticated.value && !hasAttemptedConnection.value) {
    setTimeout(async () => {
      await attemptWebSocketConnection()
    }, 500) // Slightly longer delay for safety
  }
})

// Cleanup on unmount
onUnmounted(() => {
  websocketService.disconnectFromNotifications()
})

const { user, logout } = useSimpleAuth()
const userRole = computed(() => user.value?.role ?? null)
const userAllowedPages = computed(() => user.value?.allowed_pages ?? [])

const handleLogout = async () => {
  await logout()
}
</script>

<template>
  <div :data-theme="store.currentTheme">
    <!-- Header Navigation Menu -->
    <HeaderMenu
      v-if="showNavigation"
      :user-role="userRole"
      :allowed-pages="userAllowedPages"
      @toggleTheme="toggleTheme"
      @logout="handleLogout"
    />

    <!-- Quick Links Sidebar (Left) - floating over content -->
    <QuickLinksSidebar v-if="showNavigation" />

    <br>
    <main :class="['app-main', { 'app-main--with-nav': showNavigation }]">
      <Navigation v-if="showNavigation" />
      <RouterView />
    </main>
  </div>
</template>

<style>
.app-main { 
  min-height: 100vh;
}

/* Add padding when header is visible */
.app-main--with-nav {
  padding-top: 62px; /* Height of the fixed HeaderMenu */
}

@media (max-width: 1024px) {
  .app-main--with-nav {
    padding-top: 56px; /* Mobile header height */
  }
}

/* Desktop Large Screen - Enhanced header offset */
@media (min-width: 1600px) {
  .app-main--with-nav {
    padding-top: 80px;
  }
}
</style>
