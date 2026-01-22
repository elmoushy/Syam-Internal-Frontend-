<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/useAppStore'
import { fetchQuickLinks, recordQuickLinkClick, toggleQuickLinkPin } from '../../services/quickLinksService'
import AuthenticatedImage from '../../components/AuthenticatedImage.vue'
import type { QuickLink } from '../../types/quicklinks.types'

// Store
const store = useAppStore()
const { currentTheme, currentLanguage } = storeToRefs(store)

// RTL support
const isRTL = computed(() => currentLanguage.value === 'ar')

// State
const quickLinks = ref<QuickLink[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const pinningId = ref<number | null>(null) // Track which link is being pinned
const hoveredId = ref<number | null>(null) // Track hovered card for pin button visibility

// Load quick links
const loadQuickLinks = async () => {
  try {
    isLoading.value = true
    error.value = null
    // Use fetchQuickLinks to get active links (same as sidebar)
    const response = await fetchQuickLinks({ page_size: 100 })
    // Backend now returns ordered by: pinned first, then recent, then position
    quickLinks.value = response.data.results
  } catch (err: any) {
    console.error('Failed to load quick links:', err)
    error.value = 'Failed to load quick links. Please try again.'
  } finally {
    isLoading.value = false
  }
}

// Handle link click
const handleLinkClick = async (link: QuickLink) => {
  if (!link.redirect_url) return

  // Record click
  try {
    recordQuickLinkClick(link.id)
  } catch (e) {
    console.error('Failed to record click', e)
  }

  // Open link
  window.open(link.redirect_url, '_blank')
}

// Toggle pin status
const togglePin = async (link: QuickLink, event: Event) => {
  event.stopPropagation() // Prevent opening the link
  
  if (pinningId.value === link.id) return // Already processing
  
  try {
    pinningId.value = link.id
    const response = await toggleQuickLinkPin(link.id)
    
    // Update local state
    const idx = quickLinks.value.findIndex(l => l.id === link.id)
    if (idx !== -1) {
      quickLinks.value[idx].is_pinned = response.data.is_pinned
    }
    
    // Reload to get correct order
    await loadQuickLinks()
  } catch (error) {
    console.error('Failed to toggle pin:', error)
  } finally {
    pinningId.value = null
  }
}

// Load on mount
onMounted(() => {
  loadQuickLinks()
})
</script>

<template>
  <div :class="$style.page" :data-theme="currentTheme" :dir="isRTL ? 'rtl' : 'ltr'">
    <div :class="$style.container">
      
      <!-- Header -->
      <div :class="$style.pageHeader">
          <div>
            <h1 :class="$style.pageTitle">
              {{ isRTL ? 'الروابط السريعة' : 'Quick Links' }}
            </h1>
          </div>
      </div>

      <!-- Content -->
      <div :class="$style.linksSection">
        
        <!-- Loading State -->
        <div v-if="isLoading" :class="$style.loadingGrid">
          <div v-for="n in 8" :key="n" :class="$style.skeletonCard">
            <div :class="$style.skeletonIcon"></div>
            <div :class="$style.skeletonText"></div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" :class="$style.errorState">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>{{ error }}</p>
          <button @click="loadQuickLinks">
            {{ isRTL ? 'إعادة المحاولة' : 'Retry' }}
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="quickLinks.length === 0" :class="$style.emptyState">
          <div :class="$style.emptyIcon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </div>
          <h3>{{ isRTL ? 'لا توجد روابط سريعة' : 'No Quick Links Found' }}</h3>
          <p>{{ isRTL ? 'لم يتم إضافة أي روابط سريعة بعد.' : 'No quick links have been added yet.' }}</p>
        </div>

        <!-- Links Grid -->
        <div v-else :class="$style.linksGrid">
          <div 
            v-for="link in quickLinks" 
            :key="link.id" 
            :class="[$style.linkCard, { [$style.pinned]: link.is_pinned }]"
            @click="handleLinkClick(link)"
            @mouseenter="hoveredId = link.id"
            @mouseleave="hoveredId = null"
          >
            <!-- Pin Button (Corner - appears on hover or when pinned) -->
            <Transition name="scale">
              <button
                v-if="link.is_pinned || hoveredId === link.id"
                :class="[$style.pinBtn, { [$style.pinnedBtn]: link.is_pinned }]"
                @click.stop="togglePin(link, $event)"
                :title="link.is_pinned 
                  ? (isRTL ? 'إلغاء التثبيت' : 'Unpin') 
                  : (isRTL ? 'تثبيت' : 'Pin')"
              >
                <span v-if="pinningId === link.id" :class="$style.pinSpinner"></span>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z"/>
                </svg>
              </button>
            </Transition>
            
            <!-- Icon -->
            <div :class="$style.linkIconWrapper">
              <AuthenticatedImage 
                v-if="link.icon_url" 
                :src="link.icon_url" 
                :alt="link.name"
                :class="$style.linkIcon"
              />
              <span v-else :class="$style.iconFallback">
                {{ link.name.charAt(0).toUpperCase() }}
              </span>
            </div>

            <!-- Info -->
            <div :class="$style.linkInfo">
              <h3 :class="$style.linkName" :title="link.name">{{ link.name }}</h3>
              <p :class="$style.linkUrl" :title="link.redirect_url">{{ link.redirect_url }}</p>
            </div>

            <!-- External Link Icon -->
            <div :class="$style.actionIcon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style module>
/* ========= Brand Palette (matching News.vue) ========= */
.page {
  --gold-700: #A17D23;
  --gold-600: #B78A41;
  --gold-500: #CEA55B;
  --gold-400: #D3B079;

  --gray-900: #231F20;
  --gray-700: #4D4D4F;
  --gray-500: #808285;
  --gray-100: #E5E8E1;

  --beige-700: #C2BA98;
  --beige-600: #D1C6AC;
  --beige-500: #D8CFBB;

  /* Light mode defaults */
  --panel-background: #F5F7FA;
  --panel-foreground: var(--gray-900);
  --panel-overlay-1: linear-gradient(45deg, rgba(161,125,35,.03) 0%, transparent 100%);
  --panel-overlay-2: linear-gradient(-45deg, rgba(183,138,65,.03) 0%, transparent 100%);
  
  --section-background: #ffffff;
  --section-shadow: 0 16px 36px rgba(15,23,42,0.08);
  --section-border: rgba(15,23,42,0.05);
  
  --card-background: #ffffff;
  --card-border: rgba(209,217,230,0.75);
  --card-border-hover: rgba(161, 125, 35, 0.4);
  --card-shadow-hover: 0 12px 40px rgba(161, 125, 35, 0.15);
  --card-title-color: #231F20;
  --card-divider: #F2F5F8;
  --card-text: #4D4D4F;
  
  --control-background: rgba(255, 255, 255, 0.9);
  --control-border: rgba(161, 125, 35, 0.2);
  --control-text: #4D4D4F;
  --control-muted-text: #717784;
  
  --badge-background: #e5e7eb;
  --badge-text: #374151;
  
  min-height: 100vh;
  background: var(--panel-background);
  color: var(--panel-foreground);
  padding: 32px 20px;
  position: relative;
  overflow-x: hidden;
  transition: all 0.4s cubic-bezier(.4,0,.2,1);
}

.page::before {
  content: '';
  position: fixed;
  inset: 0;
  background: var(--panel-overlay-1), var(--panel-overlay-2);
  pointer-events: none;
  z-index: 0;
}

/* Dark Mode */
.page[data-theme="night"] {
  --panel-background: 
    radial-gradient(circle at 20% 20%, rgba(161,125,35,.06) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(183,138,65,.08) 0%, transparent 50%),
    #1a1e24;
  --panel-foreground: #E5E8E1;
  --panel-overlay-1: linear-gradient(45deg, rgba(161,125,35,.05) 0%, transparent 100%);
  --panel-overlay-2: linear-gradient(-45deg, rgba(183,138,65,.05) 0%, transparent 100%);
  
  --section-background: rgba(27, 30, 36, 0.92);
  --section-shadow: 0 22px 48px rgba(0, 0, 0, 0.6);
  --section-border: rgba(161, 125, 35, 0.18);
  
  --card-background: rgba(40, 43, 51, 0.7);
  --card-border: rgba(226, 232, 240, 0.18);
  --card-border-hover: rgba(226, 232, 240, 0.32);
  --card-shadow-hover: 0 16px 48px rgba(0, 0, 0, 0.4);
  --card-title-color: #E5E8E1;
  --card-divider: rgba(255,255,255,0.08);
  --card-text: rgba(226, 232, 240, 0.78);
  
  --control-background: rgba(17, 24, 39, 0.78);
  --control-border: rgba(107, 114, 128, 0.32);
  --control-text: rgba(226, 232, 240, 0.82);
  --control-muted-text: rgba(209, 213, 219, 0.78);
  
  --badge-background: rgba(77, 77, 79, 0.35);
  --badge-text: #E5E8E1;
  
  background: var(--panel-background);
  color: var(--panel-foreground);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}

/* Dark mode container enhancement */
.page[data-theme="night"] .container {
  filter: brightness(1);
}

/* ==================== PAGE HEADER ==================== */
.pageHeader {
  margin-bottom: 64px;
  text-align: center;
  position: relative;
}

.headerContent {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  position: relative;
}

/* Decorative icon above title */
.headerContent::before {
  content: '🔗';
  font-size: 48px;
  margin-bottom: 8px;
  display: block;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(161, 125, 35, 0.3));
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.pageTitle {
  font-size: 56px;
  font-weight: 800;
  color: var(--card-title-color);
  margin: 0;
  transition: all 0.3s ease;
  letter-spacing: -0.02em;
  line-height: 1.1;
  position: relative;
}

.page[data-theme="night"] .pageTitle {
  background: linear-gradient(135deg, #E5E8E1 0%, #D1C6AC 50%, #B78A41 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Decorative underline */
.pageTitle::after {
  content: '';
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--gold-500), transparent);
  border-radius: 2px;
}

.pageSubtitle {
  font-size: 18px;
  color: var(--control-muted-text);
  margin: 12px 0 0 0;
  max-width: 600px;
  line-height: 1.7;
  opacity: 0.85;
  font-weight: 500;
}

/* ==================== SECTION ==================== */
.linksSection {
  background: var(--section-background);
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow: var(--section-shadow);
  border: 1px solid var(--section-border);
  position: relative;
  overflow: hidden;
}

/* Decorative corner accents */
.linksSection::before,
.linksSection::after {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  opacity: 0.03;
  pointer-events: none;
}

.linksSection::before {
  top: -100px;
  right: -100px;
  background: radial-gradient(circle, var(--gold-500) 0%, transparent 70%);
}

.linksSection::after {
  bottom: -100px;
  left: -100px;
  background: radial-gradient(circle, var(--gold-400) 0%, transparent 70%);
}

.page[data-theme="night"] .linksSection::before,
.page[data-theme="night"] .linksSection::after {
  opacity: 0.08;
}

/* ==================== LOADING STATE ==================== */
.loadingGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}

.skeletonCard {
  background: var(--card-background);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.skeletonIcon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeletonText {
  flex: 1;
  height: 20px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.page[data-theme="night"] .skeletonIcon,
.page[data-theme="night"] .skeletonText {
  background: linear-gradient(90deg, #2d2d2d 25%, #3d3d3d 50%, #2d2d2d 75%);
  background-size: 200% 100%;
}

/* ==================== ERROR STATE ==================== */
.errorState {
  text-align: center;
  padding: 60px 20px;
  color: var(--control-muted-text);
}

.errorState svg {
  color: #dc2626;
  margin-bottom: 16px;
}

.errorState p {
  margin: 0 0 20px 0;
  font-size: 16px;
}

.errorState button {
  background: linear-gradient(135deg, #A17D23, #B78A41);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.errorState button:hover {
  background: linear-gradient(135deg, #B78A41, #CEA55B);
}

/* ==================== EMPTY STATE ==================== */
.emptyState {
  text-align: center;
  padding: 80px 20px;
}

.emptyIcon {
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, rgba(161, 125, 35, 0.1) 0%, rgba(183, 138, 65, 0.1) 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emptyIcon svg {
  color: var(--gold-600);
}

.emptyState h3 {
  font-size: 22px;
  font-weight: 700;
  color: var(--card-title-color);
  margin: 0 0 8px 0;
}

.emptyState p {
  font-size: 15px;
  color: var(--control-muted-text);
  margin: 0 0 24px 0;
}

/* ==================== LINKS GRID ==================== */
.linksGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 28px;
  perspective: 1000px;
}

.linkCard {
  position: relative;
  background: var(--card-background);
  border: 1px solid var(--card-border);
  border-radius: 28px;
  padding: 36px 28px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  min-height: 300px;
  gap: 24px;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

/* Decorative gradient overlay */
.linkCard::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(161, 125, 35, 0.03) 0%, rgba(183, 138, 65, 0.06) 50%, transparent 100%);
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
  z-index: 0;
}

.linkCard:hover::before {
  opacity: 1;
}

/* Animated border gradient */
.linkCard::after {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, var(--gold-500), var(--gold-400), var(--beige-500));
  border-radius: 28px;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.5s ease;
}

.linkCard:hover::after {
  opacity: 0.15;
}

.linkCard:hover {
  border-color: var(--card-border-hover);
  box-shadow: 
    0 20px 60px rgba(161, 125, 35, 0.12),
    0 8px 24px rgba(161, 125, 35, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-8px) scale(1.02);
}

.page[data-theme="night"] .linkCard:hover {
  box-shadow: 
    0 20px 60px rgba(161, 125, 35, 0.25),
    0 8px 24px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Link Icon */
.linkIconWrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 26px;
  background: 
    linear-gradient(135deg, rgba(161, 125, 35, 0.08), rgba(183, 138, 65, 0.12)),
    var(--card-background);
  border: 2px solid rgba(161, 125, 35, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  margin-bottom: 4px;
  box-shadow: 
    0 12px 32px rgba(161, 125, 35, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 2;
}

/* Glow effect behind icon */
.linkIconWrapper::before {
  content: '';
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(161, 125, 35, 0.15) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.5s ease;
  z-index: -1;
}

.linkCard:hover .linkIconWrapper::before {
  opacity: 1;
}

.linkCard:hover .linkIconWrapper {
  transform: scale(1.15) translateY(-8px) rotate(5deg);
  background: 
    linear-gradient(135deg, rgba(161, 125, 35, 0.18), rgba(183, 138, 65, 0.22)),
    var(--card-background);
  box-shadow: 
    0 20px 48px rgba(161, 125, 35, 0.25),
    0 8px 20px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  border-color: rgba(161, 125, 35, 0.35);
}

.page[data-theme="night"] .linkIconWrapper {
  background: 
    linear-gradient(135deg, rgba(161, 125, 35, 0.15), rgba(183, 138, 65, 0.18)),
    rgba(40, 43, 51, 0.9);
  box-shadow: 
    0 12px 32px rgba(161, 125, 35, 0.2),
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.page[data-theme="night"] .linkCard:hover .linkIconWrapper {
  background: 
    linear-gradient(135deg, rgba(161, 125, 35, 0.25), rgba(183, 138, 65, 0.28)),
    rgba(40, 43, 51, 0.95);
  box-shadow: 
    0 20px 48px rgba(161, 125, 35, 0.35),
    0 8px 20px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.linkIcon {
  width: 56px;
  height: 56px;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(161, 125, 35, 0.2));
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.linkCard:hover .linkIcon {
  filter: drop-shadow(0 8px 16px rgba(161, 125, 35, 0.3));
  transform: scale(1.05);
}

.iconFallback {
  font-size: 40px;
  font-weight: 800;
  background: linear-gradient(135deg, #A17D23, #CEA55B);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 4px 12px rgba(161, 125, 35, 0.3);
}

/* Link Info */
.linkInfo {
  width: 100%;
  z-index: 2;
  text-align: center;
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.linkName {
  font-size: 20px;
  font-weight: 700;
  color: var(--card-title-color);
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.3;
  transition: all 0.3s ease;
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.linkCard:hover .linkName {
  background: linear-gradient(135deg, #A17D23, #CEA55B);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transform: scale(1.02);
}

.linkUrl {
  font-size: 12px;
  color: var(--control-muted-text);
  margin: 0;
  opacity: 0.65;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-weight: 500;
  padding: 6px 16px;
  background: rgba(161, 125, 35, 0.06);
  border-radius: 12px;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.3s ease;
  border: 1px solid rgba(161, 125, 35, 0.1);
}

.linkCard:hover .linkUrl {
  opacity: 0.85;
  background: rgba(161, 125, 35, 0.12);
  border-color: rgba(161, 125, 35, 0.2);
}

.actionIcon {
  position: absolute;
  bottom: 24px;
  right: 24px;
  color: var(--control-muted-text);
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  opacity: 0;
  padding: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(161, 125, 35, 0.08), rgba(183, 138, 65, 0.12));
  border: 1px solid rgba(161, 125, 35, 0.15);
  box-shadow: 0 4px 12px rgba(161, 125, 35, 0.15);
  z-index: 3;
}

.page[dir="rtl"] .actionIcon {
  right: auto;
  left: 24px;
}
.pinBtn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid white;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  padding: 0;
}

.page[dir="rtl"] .pinBtn {
  right: auto;
  left: 20px;
}

.pinBtn:hover {
  background: #B78A41;
  color: white;
  transform: scale(1.15);
  box-shadow: 0 6px 16px rgba(183, 138, 65, 0.4);
}

.pinBtn.pinnedBtn {
  background: linear-gradient(135deg, #B78A41 0%, #A17D23 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(183, 138, 65, 0.4);
}

.pinBtn.pinnedBtn:hover {
  background: #ef4444;
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.pinSpinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(100, 116, 139, 0.3);
  border-top-color: #64748b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.pinBtn.pinnedBtn .pinSpinner {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.page[data-theme="night"] .pinBtn {
  background: #3f3f46;
  color: #a1a1aa;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.page[data-theme="night"] .pinBtn:hover {
  background: #D4A855;
  color: white;
}

.page[data-theme="night"] .pinBtn.pinnedBtn {
  background: linear-gradient(135deg, #D4A855 0%, #B78A41 100%);
  box-shadow: 0 4px 12px rgba(212, 168, 85, 0.4);
}

.page[data-theme="night"] .pinBtn.pinnedBtn:hover {
  background: #ef4444;
}

/* Pin badge indicator for pinned cards */
.linkCard.pinned {
  position: relative;
}

.linkCard.pinned::before {
  opacity: 0.8;
}

/* ==================== TRANSITIONS ==================== */
:global(.scale-enter-active),
:global(.scale-leave-active) {
  transition: all 0.2s ease;
}

:global(.scale-enter-from),
:global(.scale-leave-to) {
  opacity: 0;
  transform: scale(0.5);
}

/* ==================== 
.linkCard:hover .actionIcon {
  color: var(--gold-600);
  opacity: 1;
  background: linear-gradient(135deg, rgba(161, 125, 35, 0.15), rgba(183, 138, 65, 0.2));
  transform: scale(1.15) rotate(15deg);
  box-shadow: 0 6px 20px rgba(161, 125, 35, 0.25);
  border-color: rgba(161, 125, 35, 0.3);
}

.page[data-theme="night"] .actionIcon {
  background: linear-gradient(135deg, rgba(161, 125, 35, 0.15), rgba(183, 138, 65, 0.18));
}

.page[data-theme="night"] .linkCard:hover .actionIcon {
  background: linear-gradient(135deg, rgba(161, 125, 35, 0.25), rgba(183, 138, 65, 0.3));
  box-shadow: 0 6px 20px rgba(161, 125, 35, 0.35);
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 1024px) {
  .pageTitle {
    font-size: 42px;
  }
  
  .linksGrid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 24px;
  }
}

@media (max-width: 768px) {
  .page {
    padding: 24px 16px;
  }
  
  .pageHeader {
    margin-bottom: 40px;
  }
  
  .headerContent::before {
    font-size: 36px;
  }
  
  .pageTitle {
    font-size: 32px;
  }
  
  .pageTitle::after {
    width: 80px;
    height: 3px;
  }
  
  .pageSubtitle {
    font-size: 15px;
  }
  
  .linksSection {
    padding: 32px 20px;
  }
  
  .linksGrid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
  }
  
  .linkCard {
    min-height: 260px;
    padding: 28px 20px;
  }
  
  .linkIconWrapper {
    width: 80px;
    height: 80px;
  }
  
  .linkIcon {
    width: 44px;
    height: 44px;
  }
  
  .linkName {
    font-size: 18px;
  }
  
  .linkUrl {
    font-size: 11px;
  }
}
</style>
