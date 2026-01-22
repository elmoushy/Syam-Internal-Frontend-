<template>
  <div v-if="visible" :class="$style.modalOverlay" @click.self="$emit('close')">
    <div :class="$style.modal" :dir="isRTL ? 'rtl' : 'ltr'">
      <div :class="$style.modalHeader">
        <h3 :class="$style.modalTitle">
          {{ t('userManagement.modals.changeRole.title') }}
        </h3>
        <button :class="$style.closeBtn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div :class="$style.modalBody">
        <!-- User Info Section -->
        <div :class="$style.userInfo">
          <div :class="$style.userAvatar">
            <div :class="$style.avatarCircle">
              {{ user?.initials || user?.full_name?.charAt(0) || '?' }}
            </div>
          </div>
          <div :class="$style.userDetails">
            <div :class="$style.userName">{{ user?.full_name }}</div>
            <div :class="$style.userEmail">{{ user?.email }}</div>
            <div :class="$style.currentRoles">
              <div :class="$style.roleItem">
                <span :class="$style.roleLabel">{{ t('userManagement.modals.changeRole.accessLevel') }}:</span>
                <span :class="[$style.roleTag, $style[user?.role || 'user']]">
                  {{ getRoleDisplayName(user?.role) }}
                </span>
              </div>
              <div v-if="user?.user_role_name" :class="$style.roleItem">
                <span :class="$style.roleLabel">{{ t('userManagement.modals.changeRole.pageRole') }}:</span>
                <span :class="[$style.roleTag, $style.customRole]">
                  {{ user?.user_role_name }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div :class="$style.tabs">
          <button 
            :class="[$style.tab, activeTab === 'access' ? $style.activeTab : '']"
            @click="activeTab = 'access'"
          >
            <i class="fas fa-shield-alt"></i>
            {{ t('userManagement.modals.changeRole.accessLevelTab') }}
          </button>
          <button 
            :class="[$style.tab, activeTab === 'pageRole' ? $style.activeTab : '']"
            @click="activeTab = 'pageRole'"
          >
            <i class="fas fa-user-tag"></i>
            {{ t('userManagement.modals.changeRole.pageRoleTab') }}
          </button>
        </div>

        <!-- Access Level Tab Content -->
        <div v-if="activeTab === 'access'" :class="$style.tabContent">
          <p :class="$style.tabDescription">
            {{ t('userManagement.modals.changeRole.accessLevelDescription') }}
          </p>
          
          <div :class="$style.roleCards">
            <div 
              v-for="role in accessLevelRoles" 
              :key="role.value"
              :class="[
                $style.roleCard, 
                selectedAccessLevel === role.value ? $style.selectedCard : '',
                role.value === user?.role ? $style.currentCard : ''
              ]"
              @click="selectAccessLevel(role.value)"
            >
              <div :class="$style.roleCardIcon">
                <i :class="role.icon"></i>
              </div>
              <div :class="$style.roleCardContent">
                <div :class="$style.roleCardTitle">{{ role.display }}</div>
                <div :class="$style.roleCardDesc">{{ role.description }}</div>
              </div>
              <div v-if="role.value === user?.role" :class="$style.currentBadge">
                {{ t('userManagement.modals.changeRole.current') }}
              </div>
              <div v-else-if="selectedAccessLevel === role.value" :class="$style.selectedBadge">
                <i class="fas fa-check"></i>
              </div>
            </div>
          </div>

          <div v-if="selectedAccessLevel && hasAccessLevelWarning" :class="$style.warning">
            <i class="fas fa-exclamation-triangle"></i>
            {{ getAccessLevelWarning() }}
          </div>
        </div>

        <!-- Page Role Tab Content -->
        <div v-if="activeTab === 'pageRole'" :class="$style.tabContent">
          <p :class="$style.tabDescription">
            {{ t('userManagement.modals.changeRole.pageRoleDescription') }}
          </p>

          <!-- Loading State -->
          <div v-if="loadingRoles" :class="$style.loadingState">
            <i class="fas fa-spinner fa-spin"></i>
            {{ t('common.loading') }}...
          </div>

          <!-- Role Selection -->
          <div v-else :class="$style.pageRoleSelect">
            <div :class="$style.selectWrapper">
              <select 
                v-model="selectedPageRole" 
                :class="$style.select"
              >
                <option :value="null">{{ t('userManagement.modals.changeRole.noPageRole') }}</option>
                <option 
                  v-for="role in availablePageRoles" 
                  :key="role.id" 
                  :value="role.id"
                >
                  {{ role.display_name || role.name }}
                </option>
              </select>
            </div>

            <!-- Selected Role Info -->
            <div v-if="selectedPageRoleInfo" :class="$style.selectedRoleInfo">
              <div :class="$style.roleInfoHeader">
                <i class="fas fa-info-circle"></i>
                <span>{{ selectedPageRoleInfo.display_name || selectedPageRoleInfo.name }}</span>
              </div>
              <div v-if="selectedPageRoleInfo.description" :class="$style.roleInfoDesc">
                {{ selectedPageRoleInfo.description }}
              </div>
              <div v-if="selectedPageRoleInfo.pages && selectedPageRoleInfo.pages.length > 0" :class="$style.roleInfoPages">
                <span :class="$style.pagesLabel">{{ t('userManagement.modals.changeRole.accessiblePages') }}:</span>
                <div :class="$style.pagesList">
                  <span 
                    v-for="page in selectedPageRoleInfo.pages" 
                    :key="page" 
                    :class="$style.pageTag"
                  >
                    {{ page }}
                  </span>
                </div>
              </div>
              <div v-else :class="$style.noPagesNote">
                <i class="fas fa-exclamation-circle"></i>
                {{ t('userManagement.modals.changeRole.noPagesAssigned') }}
              </div>
            </div>

            <!-- Current Page Role Indicator -->
            <div v-if="user?.user_role_id && selectedPageRole === user.user_role_id" :class="$style.currentIndicator">
              <i class="fas fa-check-circle"></i>
              {{ t('userManagement.modals.changeRole.currentlyAssigned') }}
            </div>
          </div>
        </div>
      </div>
      
      <div :class="$style.modalFooter">
        <button 
          type="button" 
          :class="[$style.btn, $style.cancelBtn]" 
          @click="$emit('close')"
        >
          {{ t('userManagement.buttons.cancel') }}
        </button>
        <button 
          type="button" 
          :class="[$style.btn, $style.saveBtn]" 
          @click="handleSave"
          :disabled="!hasChanges || saving"
        >
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          {{ saving ? t('common.saving') : t('userManagement.buttons.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAppStore } from '../../stores/useAppStore'
import userManagementService from '../../services/userManagementService'
import { 
  type RoleWithPermissions,
  getRolesWithPermissions,
  assignUserToRole,
  removeUserFromRole
} from '../../services/roleManagementService'
import type { User } from '../../types/user-management.types'

interface Props {
  visible: boolean
  user: User | null
}

const props = defineProps<Props>()

interface Emits {
  (e: 'close'): void
  (e: 'success', data: { user: User; oldRole: string; newRole: string }): void
}

const emit = defineEmits<Emits>()

const store = useAppStore()
const isRTL = computed(() => store.currentLanguage === 'ar')
const t = computed(() => store.t)

// State
const activeTab = ref<'access' | 'pageRole'>('access')
const selectedAccessLevel = ref<string | null>(null)
const selectedPageRole = ref<number | null>(null)
const saving = ref(false)
const loadingRoles = ref(false)
const availablePageRoles = ref<RoleWithPermissions[]>([])

// Access Level Roles
const accessLevelRoles = computed(() => [
  { 
    value: 'user', 
    display: t.value('userManagement.roles.user'),
    description: t.value('userManagement.modals.changeRole.descriptions.user'),
    icon: 'fas fa-user'
  },
  { 
    value: 'admin', 
    display: t.value('userManagement.roles.admin'),
    description: t.value('userManagement.modals.changeRole.descriptions.admin'),
    icon: 'fas fa-user-cog'
  },
  { 
    value: 'super_admin', 
    display: t.value('userManagement.roles.super_admin'),
    description: t.value('userManagement.modals.changeRole.descriptions.super_admin'),
    icon: 'fas fa-crown'
  }
])

// Computed
const selectedPageRoleInfo = computed(() => {
  if (selectedPageRole.value === null) return null
  return availablePageRoles.value.find(r => r.id === selectedPageRole.value) || null
})

const hasAccessLevelWarning = computed(() => {
  if (!props.user || !selectedAccessLevel.value) return false
  if (selectedAccessLevel.value === props.user.role) return false
  
  // Show warning when demoting from super_admin
  if (props.user.role === 'super_admin' && selectedAccessLevel.value !== 'super_admin') {
    return true
  }
  
  // Show warning when promoting to super_admin
  if (selectedAccessLevel.value === 'super_admin') {
    return true
  }
  
  return false
})

const hasChanges = computed(() => {
  if (!props.user) return false
  
  // Check access level changes
  if (selectedAccessLevel.value && selectedAccessLevel.value !== props.user.role) {
    return true
  }
  
  // Check page role changes
  const currentPageRoleId = props.user.user_role_id || null
  if (selectedPageRole.value !== currentPageRoleId) {
    return true
  }
  
  return false
})

// Methods
const getRoleDisplayName = (role?: string): string => {
  switch (role) {
    case 'user': return t.value('userManagement.roles.user')
    case 'admin': return t.value('userManagement.roles.admin')
    case 'super_admin': return t.value('userManagement.roles.super_admin')
    default: return role || ''
  }
}

const selectAccessLevel = (role: string) => {
  if (role === props.user?.role) {
    selectedAccessLevel.value = null
  } else {
    selectedAccessLevel.value = role
  }
}

const getAccessLevelWarning = (): string => {
  if (!props.user || !selectedAccessLevel.value) return ''
  
  if (props.user.role === 'super_admin' && selectedAccessLevel.value !== 'super_admin') {
    return t.value('userManagement.modals.changeRole.warnings.demoteFromSuperAdmin')
  }
  
  if (selectedAccessLevel.value === 'super_admin') {
    return t.value('userManagement.modals.changeRole.warnings.promoteToSuperAdmin')
  }
  
  return ''
}

const loadPageRoles = async () => {
  try {
    loadingRoles.value = true
    const response = await getRolesWithPermissions()
    availablePageRoles.value = response.roles
  } catch (error) {
    console.error('Error loading roles:', error)
  } finally {
    loadingRoles.value = false
  }
}

const handleSave = async () => {
  if (!props.user || !hasChanges.value) return
  
  try {
    saving.value = true
    
    let updatedUser = props.user
    const oldRole = props.user.role
    let newRole: 'super_admin' | 'admin' | 'user' = oldRole
    
    // Update access level if changed
    if (selectedAccessLevel.value && selectedAccessLevel.value !== props.user.role) {
      const response = await userManagementService.updateUserRole(
        props.user.id,
        { role: selectedAccessLevel.value as 'super_admin' | 'admin' | 'user' }
      )
      updatedUser = response.user
      newRole = selectedAccessLevel.value as 'super_admin' | 'admin' | 'user'
    }
    
    // Update page role if changed
    const currentPageRoleId = props.user.user_role_id || null
    if (selectedPageRole.value !== currentPageRoleId) {
      if (selectedPageRole.value === null) {
        // Remove role
        const response = await removeUserFromRole(props.user.id, true)
        updatedUser = response.user as User
      } else {
        // Assign new role
        const response = await assignUserToRole(props.user.id, { role_id: selectedPageRole.value })
        updatedUser = response.user as User
        // Note: When assigning a custom role, the backend auto-updates the access level
        newRole = updatedUser.role
      }
    }
    
    emit('success', {
      user: updatedUser,
      oldRole,
      newRole
    })
    
  } catch (error) {
    console.error('Error updating role:', error)
  } finally {
    saving.value = false
  }
}

// Reset form when modal opens/closes
watch(() => props.visible, async (visible) => {
  if (visible) {
    activeTab.value = 'access'
    selectedAccessLevel.value = null
    selectedPageRole.value = props.user?.user_role_id || null
    
    // Load page roles if not loaded
    if (availablePageRoles.value.length === 0) {
      await loadPageRoles()
    }
  }
})

// Initialize on mount
onMounted(() => {
  if (props.visible) {
    selectedPageRole.value = props.user?.user_role_id || null
    loadPageRoles()
  }
})
</script>

<style module>
.modalOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.modal {
  background: var(--bg-card, #fff);
  border-radius: 16px;
  border: 1px solid var(--border-color, #e5e7eb);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 95%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modalHeader {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.modalTitle {
  margin: 0;
  color: var(--text-primary, #1f2937);
  font-size: 1.25rem;
  font-weight: 600;
}

.closeBtn {
  background: none;
  border: none;
  color: var(--text-muted, #9ca3af);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.closeBtn:hover {
  background: var(--bg-glass, #f3f4f6);
  color: var(--text-primary, #1f2937);
}

.modalBody {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

/* User Info */
.userInfo {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--bg-glass, #f9fafb);
  border-radius: 12px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.avatarCircle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #b78a41, #d4a84b);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  flex-shrink: 0;
}

.userDetails {
  flex: 1;
  min-width: 0;
}

.userName {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin-bottom: 0.15rem;
}

.userEmail {
  color: var(--text-secondary, #6b7280);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.currentRoles {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.roleItem {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.roleLabel {
  color: var(--text-muted, #9ca3af);
}

.roleTag {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-weight: 500;
  font-size: 0.75rem;
}

.roleTag.super_admin {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.roleTag.admin {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.roleTag.user {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.roleTag.customRole {
  background: rgba(183, 138, 65, 0.15);
  color: #8b6914;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  background: var(--bg-glass, #f3f4f6);
  padding: 0.35rem;
  border-radius: 10px;
}

.tab {
  flex: 1;
  padding: 0.65rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-secondary, #6b7280);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.tab:hover {
  color: var(--text-primary, #1f2937);
  background: rgba(255, 255, 255, 0.5);
}

.activeTab {
  background: white;
  color: #b78a41;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Tab Content */
.tabContent {
  min-height: 200px;
}

.tabDescription {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

/* Role Cards */
.roleCards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.roleCard {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  position: relative;
}

.roleCard:hover {
  border-color: #b78a41;
  background: rgba(183, 138, 65, 0.03);
}

.selectedCard {
  border-color: #b78a41;
  background: rgba(183, 138, 65, 0.08);
}

.currentCard {
  border-color: var(--border-color, #d1d5db);
  background: var(--bg-glass, #f9fafb);
}

.roleCardIcon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--bg-glass, #f3f4f6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: var(--text-secondary, #6b7280);
  flex-shrink: 0;
}

.selectedCard .roleCardIcon {
  background: rgba(183, 138, 65, 0.15);
  color: #b78a41;
}

.roleCardContent {
  flex: 1;
  min-width: 0;
}

.roleCardTitle {
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin-bottom: 0.2rem;
}

.roleCardDesc {
  font-size: 0.8rem;
  color: var(--text-secondary, #6b7280);
  line-height: 1.4;
}

.currentBadge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.2rem 0.5rem;
  background: var(--bg-glass, #e5e7eb);
  color: var(--text-muted, #6b7280);
  font-size: 0.7rem;
  font-weight: 500;
  border-radius: 6px;
}

.selectedBadge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #b78a41;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  flex-shrink: 0;
}

/* Warning */
.warning {
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px;
  color: #92400e;
  font-size: 0.85rem;
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  line-height: 1.5;
}

.warning i {
  color: #f59e0b;
  margin-top: 0.1rem;
  flex-shrink: 0;
}

/* Page Role Select */
.pageRoleSelect {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.selectWrapper {
  position: relative;
}

.select {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 10px;
  background: white;
  color: var(--text-primary, #1f2937);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.25rem;
  padding-right: 2.5rem;
}

.select:focus {
  outline: none;
  border-color: #b78a41;
  box-shadow: 0 0 0 3px rgba(183, 138, 65, 0.12);
}

/* Selected Role Info */
.selectedRoleInfo {
  padding: 1rem;
  background: rgba(183, 138, 65, 0.08);
  border: 1px solid rgba(183, 138, 65, 0.2);
  border-radius: 10px;
}

.roleInfoHeader {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #8b6914;
  margin-bottom: 0.5rem;
}

.roleInfoDesc {
  font-size: 0.85rem;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.roleInfoPages {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pagesLabel {
  font-size: 0.8rem;
  color: var(--text-muted, #9ca3af);
  font-weight: 500;
}

.pagesList {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pageTag {
  padding: 0.25rem 0.6rem;
  background: rgba(183, 138, 65, 0.15);
  color: #8b6914;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 6px;
}

.noPagesNote {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted, #9ca3af);
  font-style: italic;
}

.currentIndicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  color: #059669;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Loading State */
.loadingState {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--text-secondary, #6b7280);
}

/* Footer */
.modalFooter {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-shrink: 0;
}

.btn {
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancelBtn {
  background: var(--bg-glass, #f3f4f6);
  color: var(--text-secondary, #6b7280);
  border: 1px solid var(--border-color, #e5e7eb);
}

.cancelBtn:hover:not(:disabled) {
  background: var(--bg-glass-hover, #e5e7eb);
  color: var(--text-primary, #1f2937);
}

.saveBtn {
  background: linear-gradient(135deg, #b78a41, #d4a84b);
  color: white;
}

.saveBtn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(183, 138, 65, 0.35);
}

/* Night Mode */
:global([data-theme="night"]) .modal {
  background: #1e1e1e;
  border-color: #333;
}

:global([data-theme="night"]) .userInfo,
:global([data-theme="night"]) .tabs {
  background: #252525;
  border-color: #333;
}

:global([data-theme="night"]) .roleCard {
  background: #252525;
  border-color: #333;
}

:global([data-theme="night"]) .roleCard:hover {
  background: #2a2a2a;
}

:global([data-theme="night"]) .selectedCard {
  background: rgba(183, 138, 65, 0.1);
}

:global([data-theme="night"]) .select {
  background: #252525;
  border-color: #333;
  color: #e5e5e5;
}

:global([data-theme="night"]) .activeTab {
  background: #333;
}

:global([data-theme="night"]) .cancelBtn {
  background: #333;
  border-color: #444;
  color: #e5e5e5;
}
</style>
