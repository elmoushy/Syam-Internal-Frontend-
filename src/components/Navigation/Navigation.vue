<template>
  <Transition name="slide-fade">
    <header 
      v-show="isVisible" 
      :class="[$style.header, { [$style.hidden]: !isVisible }]" 
      :data-theme="currentTheme"
    >
      <!-- <nav :class="$style.nav">
        <div :class="$style.greetingBlock">
          <h1 :class="$style.greetingTitle">{{ greetingHeading }}</h1>
          <span :class="$style.greetingDate">{{ todayFormatted }}</span>
        </div>
      </nav> -->
    </header>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../../stores/useAppStore'
import { useSimpleAuth } from '../../composables/useSimpleAuth'

// Store
const store = useAppStore()

// JWT Authentication
const { userFullName: userDisplayName } = useSimpleAuth()

// Computed properties
const currentLanguage = computed(() => store.currentLanguage)
const currentTheme = computed(() => store.currentTheme)

// Scroll-based visibility
const isVisible = ref(true)
const lastScrollY = ref(0)
const scrollThreshold = 100 // Minimum scroll before hiding
const headerHeight = 62 // Fixed header height (adjust if needed)

const handleScroll = () => {
  const currentScrollY = window.scrollY
  
  // Always show when at top of page
  if (currentScrollY <= headerHeight + 20) {
    isVisible.value = true
    lastScrollY.value = currentScrollY
    return
  }
  
  // Determine scroll direction
  const scrollDiff = currentScrollY - lastScrollY.value
  
  // Scrolling down - hide navigation
  if (scrollDiff > 10 && currentScrollY > scrollThreshold) {
    isVisible.value = false
  }
  // Scrolling up - show navigation
  else if (scrollDiff < -10) {
    isVisible.value = true
  }
  
  lastScrollY.value = currentScrollY
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const greetingName = computed(() => {
  const raw = userDisplayName.value?.trim()
  if (raw) {
    const parts = raw.split(/\s+/)
    if (parts.length > 0) return parts[0]
    return raw
  }
  return currentLanguage.value === 'ar' ? 'صديقي' : 'Friend'
})

// Used in template
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const greetingHeading = computed(() => {
  return currentLanguage.value === 'ar'
    ? `اهلا بك يا ${greetingName.value}`
    : `Welcome back, ${greetingName.value}`
})

// Used in template
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const todayFormatted = computed(() => {
  const now = new Date()
  const formatted = now.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `${formatted}`
})

// Some TypeScript setups don't detect `<template>` usage for `script setup`.
// These no-op references prevent ts(6133) without changing runtime behavior.
void greetingHeading
void todayFormatted
</script>

<style module>
.header {
  background-color: #ffffff;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  position: sticky;
  top: 62px; /* Height of the fixed HeaderMenu */
  z-index: 90;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}

.header.hidden {
  transform: translateY(-100%);
  opacity: 0;
}

.header[data-theme="night"] {
  background: rgba(24, 26, 31, 0.92);
}

.nav {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 1rem 2rem;
}

.greetingBlock {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.greetingTitle {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: #a17d23;
  letter-spacing: 0.01em;
}

.header[data-theme="night"] .greetingTitle {
  color: #C9A84C;
}

.greetingDate {
  font-size: 0.75rem;
  color: #64748b;
}

.header[data-theme="night"] .greetingDate {
  color: rgba(248, 250, 252, 0.7);
}

@media (max-width: 768px) {
  .nav {
    padding: 0.75rem 1rem;
  }

  .greetingTitle {
    font-size: 1.1rem;
  }
}

@media (max-width: 1024px) {
  .header {
    top: 56px; /* Adjust for mobile header height */
  }
}
</style>

<style>
/* Global transition for v-show */
.slide-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>