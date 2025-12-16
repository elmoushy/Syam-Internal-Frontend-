<template>
  <div v-if="visible" :class="$style.modalOverlay" @click.self="$emit('close')">
    <div :class="$style.modal" :dir="isRTL ? 'rtl' : 'ltr'">
      <div :class="$style.modalHeader">
        <h3 :class="$style.modalTitle">
          {{ t('roleManagement.assignUsers.title') }}
        </h3>
        <button :class="$style.closeBtn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div :class="$style.modalBody">
        <!-- Role Info -->
        <div :class="$style.roleInfo">
          <div :class="$style.roleIcon">
            <i class="fas fa-user-tag"></i>
          </div>
          <div :class="$style.roleDetails">
            <div :class="$style.roleName">{{ role?.display_name || role?.name }}</div>
            <div :class="$style.roleDesc">{{ role?.description || t('roleManagement.noDescription') }}</div>
            <div v-if="role?.pages && role.pages.length > 0" :class="$style.rolePages">
              <span :class="$style.pagesLabel">{{ t('userManagement.modals.changeRole.accessiblePages') }}:</span>
              <span v-for="page in role.pages.slice(0, 3)" :key="page" :class="$style.pageTag">
                {{ page }}
              </span>
              <span v-if="role.pages.length > 3" :class="$style.moreTag">
                +{{ role.pages.length - 3 }}
              </span>
            </div>
          </div>
        </div>

        <!-- Search -->
        <div :class="$style.searchSection">
          <div :class="$style.searchBox">
            <i class="fas fa-search" :class="$style.searchIcon"></i>
            <input
              type="text"
              :placeholder="t('roleManagement.assignUsers.searchPlaceholder')"
              v-model="searchQuery"
              :class="$style.searchInput"
              autocomplete="off"
            />
          </div>
        </div>

        <!-- User List -->
        <div v-if="loadingUsers" :class="$style.loadingState">
          <i class="fas fa-spinner fa-spin"></i>
          {{ t('common.loading') }}...
        </div>

        <div v-else :class="$style.usersList">
          <div v-if="filteredUsers.length === 0" :class="$style.emptyState">
            <i class="fas fa-users"></i>
            <p>{{ t('roleManagement.assignUsers.noUsersFound') }}</p>
          </div>
          
          <div 
            v-for="user in filteredUsers" 
            :key="user.id" 
            :class="[$style.userItem, selectedUserIds.includes(user.id) ? $style.selected : '']"
            @click="toggleUserSelection(user)"
          >
            <div :class="$style.userCheckbox">
              <input 
                type="checkbox" 
                :checked="selectedUserIds.includes(user.id)"
                @click.stop
                @change="toggleUserSelection(user)"
              />
            </div>
            <div :class="$style.userAvatar">
              {{ user.full_name?.charAt(0) || user.email?.charAt(0) || '?' }}
            </div>
            <div :class="$style.userInfo">
              <div :class="$style.userName">{{ user.full_name || user.email }}</div>
              <div :class="$style.userEmail">{{ user.email }}</div>
            </div>
            <div :class="$style.userCurrentRole">
              <span v-if="user.user_role_id === role?.id" :class="$style.assignedBadge">
                <i class="fas fa-check-circle"></i>
                {{ t('roleManagement.assignUsers.alreadyAssigned') }}
              </span>
              <span v-else-if="user.user_role_name" :class="$style.otherRoleBadge">
                {{ user.user_role_name }}
              </span>
              <span v-else :class="$style.noRoleBadge">
                {{ t('roleManagement.assignUsers.noRole') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Selected Count -->
        <div v-if="selectedUserIds.length > 0" :class="$style.selectedInfo">
          <i class="fas fa-info-circle"></i>
          {{ getSelectedCountText() }}
        </div>
      </div>
      
      <div :class="$style.modalFooter">
        <button 
          type="button" 
          :class="[$style.btn, $style.cancelBtn]" 
          @click="$emit('close')"
        >
          {{ t('common.cancel') }}
        </button>
        <button 
          type="button" 
          :class="[$style.btn, $style.saveBtn]" 
          @click="handleAssign"
          :disabled="saving"
        >
          <i v-if="saving" class="fas fa-spinner fa-spin"></i>
          {{ saving ? t('common.saving') : t('roleManagement.assignUsers.assignButton') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../../stores/useAppStore'
import { assignUserToRole, removeUserFromRole } from '../../services/roleManagementService'
import type { RoleWithPermissions } from '../../services/roleManagementService'
import type { User } from '../../types/user-management.types'

interface Props {
  visible: boolean
  role: RoleWithPermissions | null
  users: User[]
  loadingUsers?: boolean
}

const props = defineProps<Props>()

interface Emits {
  (e: 'close'): void
  (e: 'success'): void
}

const emit = defineEmits<Emits>()

const store = useAppStore()
const isRTL = computed(() => store.currentLanguage === 'ar')
const t = computed(() => store.t)

// State
const searchQuery = ref('')
const selectedUserIds = ref<number[]>([])
const saving = ref(false)

// Filter users
const filteredUsers = computed(() => {
  if (!props.users || props.users.length === 0) return []
  if (!searchQuery.value.trim()) return props.users
  
  const query = searchQuery.value.toLowerCase()
  return props.users.filter(user => 
    user.full_name?.toLowerCase().includes(query) ||
    user.email?.toLowerCase().includes(query)
  )
})

// Methods
const toggleUserSelection = (user: User) => {
  const index = selectedUserIds.value.indexOf(user.id)
  if (index === -1) {
    selectedUserIds.value.push(user.id)
  } else {
    selectedUserIds.value.splice(index, 1)
  }
}

const getSelectedCountText = (): string => {
  const template = t.value('roleManagement.assignUsers.selectedCount')
  return template.replace(/\{\{count\}\}/g, String(selectedUserIds.value.length))
}

const handleAssign = async () => {
  if (!props.role) return
  
  try {
    saving.value = true
    
    // Identify users currently assigned to this role
    const currentRoleUserIds = props.users
      .filter(u => u.user_role_id === props.role!.id)
      .map(u => u.id)
    
    // Users to add: Selected but not currently assigned
    const usersToAdd = selectedUserIds.value.filter(id => !currentRoleUserIds.includes(id))
    
    // Users to remove: Currently assigned but not selected
    const usersToRemove = currentRoleUserIds.filter(id => !selectedUserIds.value.includes(id))
    
    const promises = [
      ...usersToAdd.map(userId => assignUserToRole(userId, { role_id: props.role!.id })),
      ...usersToRemove.map(userId => removeUserFromRole(userId))
    ]
    
    await Promise.all(promises)
    
    emit('success')
    
  } catch (error) {
    console.error('Error assigning/removing users from role:', error)
  } finally {
    saving.value = false
  }
}

const initSelection = () => {
  if (!props.role || !props.users) return
  // Pre-select users who already have this role
  selectedUserIds.value = props.users
    .filter(u => u.user_role_id === props.role!.id)
    .map(u => u.id)
}

// Reset/Init when modal opens
watch(() => props.visible, (visible) => {
  if (visible) {
    searchQuery.value = ''
    initSelection()
  }
})

// Update selection if users data loads while modal is open
watch(() => props.users, () => {
  if (props.visible) {
    initSelection()
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
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modalHeader {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.closeBtn:hover {
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-primary, #1f2937);
}

.modalBody {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
}

.roleInfo {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(139, 92, 246, 0.08);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.roleIcon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.roleDetails {
  flex: 1;
}

.roleName {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin-bottom: 0.25rem;
}

.roleDesc {
  font-size: 0.85rem;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 0.5rem;
}

.rolePages {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.pagesLabel {
  font-size: 0.75rem;
  color: var(--text-muted, #9ca3af);
}

.pageTag {
  font-size: 0.7rem;
  padding: 2px 8px;
  background: rgba(139, 92, 246, 0.15);
  color: #7c3aed;
  border-radius: 12px;
}

.moreTag {
  font-size: 0.7rem;
  padding: 2px 8px;
  background: var(--bg-secondary, #e5e7eb);
  color: var(--text-secondary, #6b7280);
  border-radius: 12px;
}

.searchSection {
  margin-bottom: 1rem;
}

.searchBox {
  position: relative;
}

.searchIcon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted, #9ca3af);
  font-size: 14px;
}

.searchInput {
  width: 100%;
  padding: 10px 40px 10px 16px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 10px;
  font-size: 14px;
  background: var(--bg-secondary, #f9fafb);
  transition: all 0.2s;
}

.searchInput:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  background: white;
}

.loadingState {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-secondary, #6b7280);
}

.usersList {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-secondary, #9ca3af);
}

.emptyState i {
  font-size: 2rem;
}

.userItem {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  cursor: pointer;
  transition: background 0.15s;
}

.userItem:last-child {
  border-bottom: none;
}

.userItem:hover {
  background: var(--bg-secondary, #f9fafb);
}

.userItem.selected {
  background: rgba(139, 92, 246, 0.08);
}

.userItem.currentlyAssigned {
  background: rgba(16, 185, 129, 0.08);
  cursor: default;
}

.userCheckbox {
  flex-shrink: 0;
}

.userCheckbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #8b5cf6;
}

.userCheckbox input:disabled {
  cursor: default;
}

.userAvatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #b78a41, #d4a855);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.userInfo {
  flex: 1;
  min-width: 0;
}

.userName {
  font-weight: 500;
  color: var(--text-primary, #1f2937);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.userEmail {
  font-size: 0.8rem;
  color: var(--text-secondary, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.userCurrentRole {
  flex-shrink: 0;
}

.assignedBadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  padding: 4px 10px;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border-radius: 20px;
}

.otherRoleBadge {
  font-size: 0.75rem;
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  border-radius: 20px;
}

.noRoleBadge {
  font-size: 0.75rem;
  padding: 4px 10px;
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-muted, #9ca3af);
  border-radius: 20px;
}

.selectedInfo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(139, 92, 246, 0.08);
  border-radius: 8px;
  font-size: 0.85rem;
  color: #7c3aed;
}

.modalFooter {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancelBtn {
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-secondary, #6b7280);
}

.cancelBtn:hover:not(:disabled) {
  background: var(--bg-hover, #e5e7eb);
  color: var(--text-primary, #1f2937);
}

.saveBtn {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  color: white;
}

.saveBtn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
}

/* Night mode */
:global([data-theme="night"]) .modal {
  background: #1e1e1e;
  border-color: #333;
}

:global([data-theme="night"]) .modalHeader,
:global([data-theme="night"]) .modalFooter {
  border-color: #333;
}

:global([data-theme="night"]) .searchInput {
  background: #252525;
  border-color: #333;
  color: #e5e5e5;
}

:global([data-theme="night"]) .usersList {
  border-color: #333;
}

:global([data-theme="night"]) .userItem {
  border-color: #333;
}

:global([data-theme="night"]) .userItem:hover {
  background: #252525;
}
</style>
