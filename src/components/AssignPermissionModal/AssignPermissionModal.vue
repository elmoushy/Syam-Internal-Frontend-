<template>
  <Teleport to="body">
    <div v-if="visible" :class="$style.modalOverlay" @click.self="handleClose">
      <div :class="$style.modal" :dir="isRTL ? 'rtl' : 'ltr'">
        <!-- Header -->
        <div :class="$style.header">
          <div :class="$style.headerContent">
            <i class="fas fa-key" :class="$style.headerIcon"></i>
            <div>
              <h2 :class="$style.title">{{ t('roleManagement.assignPermissions.title') }}</h2>
              <p :class="$style.subtitle">
                {{ t('roleManagement.assignPermissions.subtitle') }}: 
                <strong>{{ role?.display_name || role?.name }}</strong>
              </p>
            </div>
          </div>
          <button :class="$style.closeBtn" @click="handleClose">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Content -->
        <div :class="$style.content">
          <!-- Search -->
          <div :class="$style.searchSection">
            <div :class="$style.searchBox">
              <i class="fas fa-search" :class="$style.searchIcon"></i>
              <input
                type="text"
                :placeholder="t('roleManagement.assignPermissions.searchPlaceholder')"
                v-model="searchQuery"
                :class="$style.searchInput"
              />
            </div>
            <div :class="$style.filterTabs">
              <button 
                :class="[$style.filterTab, filterMode === 'all' ? $style.filterTabActive : '']"
                @click="filterMode = 'all'"
              >
                {{ t('roleManagement.assignPermissions.filterAll') }}
              </button>
              <button 
                :class="[$style.filterTab, filterMode === 'assigned' ? $style.filterTabActive : '']"
                @click="filterMode = 'assigned'"
              >
                {{ t('roleManagement.assignPermissions.filterAssigned') }}
              </button>
              <button 
                :class="[$style.filterTab, filterMode === 'unassigned' ? $style.filterTabActive : '']"
                @click="filterMode = 'unassigned'"
              >
                {{ t('roleManagement.assignPermissions.filterUnassigned') }}
              </button>
            </div>
          </div>

          <!-- Pages Grid -->
          <div :class="$style.pagesGrid">
            <div
              v-for="page in filteredPages"
              :key="page.name"
              :class="[
                $style.pageCard,
                isPageAssigned(page.name) ? $style.assigned : '',
                pendingChanges.has(page.name) ? $style.pending : ''
              ]"
              @click="togglePage(page.name)"
            >
              <div :class="$style.pageCheckbox">
                <i :class="isPageAssigned(page.name) ? 'fas fa-check-circle' : 'far fa-circle'"></i>
              </div>
              <div :class="$style.pageInfo">
                <h4 :class="$style.pageName">{{ page.display_name }}</h4>
                <p :class="$style.pageDescription">{{ page.description }}</p>
                <span :class="$style.pageKey">{{ page.name }}</span>
              </div>
              <div v-if="pendingChanges.has(page.name)" :class="$style.pendingBadge">
                {{ pendingChanges.get(page.name) === 'add' ? '+' : '-' }}
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="filteredPages.length === 0" :class="$style.emptyState">
            <i class="fas fa-inbox" :class="$style.emptyIcon"></i>
            <p>{{ t('roleManagement.assignPermissions.noPages') }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div :class="$style.footer">
          <div :class="$style.changesSummary">
            <span v-if="hasChanges" :class="$style.changesText">
              {{ t('roleManagement.assignPermissions.pendingChanges') }}: 
              <strong>{{ pendingChanges.size }}</strong>
            </span>
          </div>
          <div :class="$style.footerActions">
            <button :class="$style.cancelBtn" @click="handleClose" :disabled="loading">
              {{ t('common.cancel') }}
            </button>
            <button 
              :class="$style.saveBtn" 
              @click="handleSave" 
              :disabled="loading || !hasChanges"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../../stores/useAppStore'
import type { RoleWithPermissions, AvailablePage } from '../../services/roleManagementService'

interface Props {
  visible: boolean
  role: RoleWithPermissions | null
  availablePages: AvailablePage[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: { role_id: number; page_names: string[] }): void
}>()

const store = useAppStore()
const isRTL = computed(() => store.currentLanguage === 'ar')
const t = computed(() => store.t)

const searchQuery = ref('')
const filterMode = ref<'all' | 'assigned' | 'unassigned'>('all')

// Track the currently assigned pages (from role)
const assignedPages = ref<Set<string>>(new Set())

// Track pending changes: Map<pageName, 'add' | 'remove'>
const pendingChanges = ref<Map<string, 'add' | 'remove'>>(new Map())

// Initialize assigned pages when role changes
watch(() => props.role, (newRole) => {
  if (newRole) {
    assignedPages.value = new Set(newRole.pages || [])
    pendingChanges.value = new Map()
  }
}, { immediate: true })

// Reset when modal opens
watch(() => props.visible, (visible) => {
  if (visible && props.role) {
    assignedPages.value = new Set(props.role.pages || [])
    pendingChanges.value = new Map()
    searchQuery.value = ''
    filterMode.value = 'all'
  }
})

const filteredPages = computed(() => {
  let pages = props.availablePages
  
  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    pages = pages.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.display_name.toLowerCase().includes(query)
    )
  }
  
  // Filter by mode
  if (filterMode.value === 'assigned') {
    pages = pages.filter(p => isPageAssigned(p.name))
  } else if (filterMode.value === 'unassigned') {
    pages = pages.filter(p => !isPageAssigned(p.name))
  }
  
  return pages
})

const isPageAssigned = (pageName: string): boolean => {
  const pending = pendingChanges.value.get(pageName)
  if (pending === 'add') return true
  if (pending === 'remove') return false
  return assignedPages.value.has(pageName)
}

const togglePage = (pageName: string) => {
  const currentlyAssigned = assignedPages.value.has(pageName)
  const pending = pendingChanges.value.get(pageName)
  
  if (currentlyAssigned) {
    // Currently assigned in DB
    if (pending === 'remove') {
      // Cancel removal
      pendingChanges.value.delete(pageName)
    } else {
      // Mark for removal
      pendingChanges.value.set(pageName, 'remove')
    }
  } else {
    // Not assigned in DB
    if (pending === 'add') {
      // Cancel addition
      pendingChanges.value.delete(pageName)
    } else {
      // Mark for addition
      pendingChanges.value.set(pageName, 'add')
    }
  }
}

const hasChanges = computed(() => pendingChanges.value.size > 0)

const getFinalPages = (): string[] => {
  const pages = new Set(assignedPages.value)
  
  pendingChanges.value.forEach((action, pageName) => {
    if (action === 'add') {
      pages.add(pageName)
    } else {
      pages.delete(pageName)
    }
  })
  
  return Array.from(pages)
}

const handleClose = () => {
  emit('close')
}

const handleSave = () => {
  if (!props.role || !hasChanges.value) return
  
  emit('save', {
    role_id: props.role.id,
    page_names: getFinalPages()
  })
}
</script>

<style module>
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.headerContent {
  display: flex;
  align-items: center;
  gap: 16px;
}

.headerIcon {
  font-size: 24px;
  color: #b78a41;
  background: rgba(183, 138, 65, 0.12);
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #1f2937);
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  margin: 4px 0 0 0;
}

.closeBtn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg-secondary, #f3f4f6);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #6b7280);
  transition: all 0.2s ease;
}

.closeBtn:hover {
  background: var(--bg-hover, #e5e7eb);
  color: var(--text-primary, #1f2937);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.searchSection {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.searchBox {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.searchIcon {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #9ca3af);
  font-size: 14px;
}

.searchInput {
  width: 100%;
  padding: 12px 44px 12px 16px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  font-size: 14px;
  background: var(--bg-secondary, #f9fafb);
}

.searchInput:focus {
  outline: none;
  border-color: #b78a41;
  background: white;
}

.filterTabs {
  display: flex;
  gap: 8px;
}

.filterTab {
  padding: 10px 16px;
  border: 1px solid var(--border-color, #e5e7eb);
  background: white;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filterTab:hover {
  border-color: #b78a41;
  color: #b78a41;
}

.filterTabActive {
  background: #b78a41;
  border-color: #b78a41;
  color: white;
}

.filterTabActive:hover {
  color: white;
}

.pagesGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.pageCard {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary, #f9fafb);
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.pageCard:hover {
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.pageCard.assigned {
  background: rgba(183, 138, 65, 0.08);
  border-color: rgba(183, 138, 65, 0.3);
}

.pageCard.pending {
  border-style: dashed;
}

.pageCheckbox {
  font-size: 22px;
  color: var(--text-secondary, #d1d5db);
  flex-shrink: 0;
  margin-top: 2px;
}

.pageCard.assigned .pageCheckbox {
  color: #b78a41;
}

.pageInfo {
  flex: 1;
  min-width: 0;
}

.pageName {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin: 0 0 4px 0;
}

.pageDescription {
  font-size: 0.8rem;
  color: var(--text-secondary, #6b7280);
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.pageKey {
  display: inline-block;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.06);
  padding: 3px 8px;
  border-radius: 6px;
  color: var(--text-secondary, #6b7280);
}

.pendingBadge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 22px;
  height: 22px;
  background: #b78a41;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary, #9ca3af);
}

.emptyIcon {
  font-size: 40px;
  margin-bottom: 12px;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  background: var(--bg-secondary, #f9fafb);
  border-radius: 0 0 20px 20px;
}

.changesSummary {
  flex: 1;
}

.changesText {
  font-size: 0.875rem;
  color: #b78a41;
}

.footerActions {
  display: flex;
  gap: 12px;
}

.cancelBtn,
.saveBtn {
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.cancelBtn {
  background: white;
  border: 1px solid var(--border-color, #e5e7eb);
  color: var(--text-secondary, #6b7280);
}

.cancelBtn:hover:not(:disabled) {
  background: var(--bg-secondary, #f3f4f6);
}

.saveBtn {
  background: linear-gradient(135deg, #b78a41, #a17d23);
  border: none;
  color: white;
}

.saveBtn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(183, 138, 65, 0.3);
}

.saveBtn:disabled,
.cancelBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Night mode */
:global([data-theme="night"]) .modal {
  background: #1e1e1e;
}

:global([data-theme="night"]) .header {
  border-color: #333;
}

:global([data-theme="night"]) .title {
  color: #f5f5f5;
}

:global([data-theme="night"]) .pageCard {
  background: #252525;
}

:global([data-theme="night"]) .pageCard:hover {
  background: #2a2a2a;
}

:global([data-theme="night"]) .pageCard.assigned {
  background: rgba(183, 138, 65, 0.15);
}

:global([data-theme="night"]) .pageName {
  color: #e5e5e5;
}

:global([data-theme="night"]) .footer {
  background: #252525;
  border-color: #333;
}

:global([data-theme="night"]) .searchInput,
:global([data-theme="night"]) .filterTab {
  background: #252525;
  border-color: #333;
  color: #e5e5e5;
}

:global([data-theme="night"]) .cancelBtn {
  background: #333;
  border-color: #444;
  color: #e5e5e5;
}
</style>
