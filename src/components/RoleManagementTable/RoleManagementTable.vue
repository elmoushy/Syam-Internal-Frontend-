<template>
  <div :class="$style.roleTable" :dir="isRTL ? 'rtl' : 'ltr'">
    <!-- Header Section -->
    <div :class="$style.tableHeader">
      <div :class="$style.headerCopy">
        <h2 :class="$style.headerTitle">
          {{ t('roleManagement.title') }}
        </h2>
        <p :class="$style.headerDescription">
          {{ t('roleManagement.description') }}
        </p>
      </div>

      <div :class="$style.searchSection">
        <button 
          :class="$style.createRoleBtn"
          @click="$emit('create-role')"
          :title="t('roleManagement.createRole.buttonTitle')"
        >
          <i class="fas fa-plus"></i>
          {{ t('roleManagement.createRole.buttonText') }}
        </button>
        <div :class="$style.searchBox">
          <i class="fas fa-search" :class="$style.searchIcon"></i>
          <input
            type="text"
            :placeholder="t('roleManagement.searchPlaceholder')"
            v-model="searchQuery"
            :class="$style.searchInput"
            autocomplete="off"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" :class="$style.loadingState">
      <i class="fas fa-spinner fa-spin" :class="$style.loadingIcon"></i>
      <p>{{ t('common.loading') }}...</p>
    </div>

    <!-- Table Container -->
    <div v-else :class="$style.tableContainer">
      <table :class="$style.table">
        <thead :class="$style.tableHead">
          <tr>
            <th :class="$style.nameColumn">{{ t('roleManagement.columns.name') }}</th>
            <!-- <th :class="$style.displayColumn">{{ t('roleManagement.columns.displayName') }}</th> -->
            <th :class="$style.pagesColumn">{{ t('roleManagement.columns.pages') }}</th>
            <th :class="$style.usersColumn">{{ t('roleManagement.columns.usersCount') }}</th>
            <th :class="$style.typeColumn">{{ t('roleManagement.columns.type') }}</th>
            <th :class="$style.actionsColumn">{{ t('roleManagement.columns.actions') }}</th>
          </tr>
        </thead>
        <tbody :class="$style.tableBody">
          <tr 
            v-for="role in filteredRoles" 
            :key="role.id" 
            :class="[$style.tableRow, role.is_system_role ? $style.systemRole : '']"
          >
            <td :class="$style.nameCell">
              <span :class="$style.roleName">{{ role.name }}</span>
            </td>
            <!-- <td :class="$style.displayCell">
              {{ role.display_name || role.name }}
            </td> -->
            <td :class="$style.pagesCell">
              <div :class="$style.pagesContainer">
                <span 
                  v-for="page in role.pages.slice(0, 3)" 
                  :key="page"
                  :class="$style.pageTag"
                >
                  {{ getPageDisplayName(page) }}
                </span>
                <span 
                  v-if="role.pages.length > 3" 
                  :class="$style.moreTag"
                  :title="role.pages.slice(3).map(p => getPageDisplayName(p)).join(', ')"
                >
                  +{{ role.pages.length - 3 }}
                </span>
                <span v-if="role.pages.length === 0" :class="$style.noPagesTag">
                  {{ t('roleManagement.noPages') }}
                </span>
              </div>
            </td>
            <td :class="$style.usersCell">
              <span :class="$style.usersCount">{{ role.users_count }}</span>
            </td>
            <td :class="$style.typeCell">
              <span :class="[role.is_system_role ? $style.systemBadge : $style.customBadge]">
                {{ role.is_system_role ? t('roleManagement.systemRole') : t('roleManagement.customRole') }}
              </span>
            </td>
            <td :class="$style.actionsCell">
              <div :class="$style.actionButtons">
                <button
                  :class="[$style.actionBtn, $style.assignUsersBtn]"
                  @click="$emit('role-action', 'assign-users', role)"
                  :title="t('roleManagement.actions.assignUsers')"
                >
                  <i class="fas fa-user-plus"></i>
                </button>
                <button
                  :class="[$style.actionBtn, $style.permissionsBtn]"
                  @click="$emit('role-action', 'manage-permissions', role)"
                  :title="t('roleManagement.actions.managePermissions')"
                >
                  <i class="fas fa-key"></i>
                </button>
                <!-- <button
                  :class="[$style.actionBtn, $style.viewBtn]"
                  @click="$emit('role-action', 'view', role)"
                  :title="t('roleManagement.actions.view')"
                >
                  <i class="fas fa-eye"></i>
                </button> -->
                <button
                  :class="[$style.actionBtn, $style.editBtn]"
                  @click="$emit('role-action', 'edit', role)"
                  :title="t('roleManagement.actions.edit')"
                  :disabled="role.is_system_role"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  :class="[$style.actionBtn, $style.deleteBtn]"
                  @click="$emit('role-action', 'delete', role)"
                  :title="t('roleManagement.actions.delete')"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="filteredRoles.length === 0 && !loading" :class="$style.emptyState">
        <i class="fas fa-user-shield" :class="$style.emptyIcon"></i>
        <h3 :class="$style.emptyTitle">{{ t('roleManagement.noRolesFound') }}</h3>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../../stores/useAppStore'
import type { RoleWithPermissions, AvailablePage } from '../../services/roleManagementService'

interface Props {
  roles: RoleWithPermissions[]
  availablePages: AvailablePage[]
  loading?: boolean
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'role-action', action: string, role: RoleWithPermissions): void
  (e: 'create-role'): void
}>()

const store = useAppStore()
const isRTL = computed(() => store.currentLanguage === 'ar')
const t = computed(() => store.t)

const searchQuery = ref('')

const filteredRoles = computed(() => {
  if (!searchQuery.value.trim()) return props.roles
  
  const query = searchQuery.value.toLowerCase()
  return props.roles.filter(role => 
    role.name.toLowerCase().includes(query) ||
    (role.display_name && role.display_name.toLowerCase().includes(query))
  )
})

const getPageDisplayName = (pageName: string): string => {
  const page = props.availablePages.find(p => p.name === pageName)
  return page?.display_name || pageName
}
</script>

<style module>
.roleTable {
  width: 100%;
}

.tableHeader {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.headerCopy {
  flex: 1;
  min-width: 200px;
}

.headerTitle {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #1f2937);
  margin: 0 0 4px 0;
}

.headerDescription {
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  margin: 0;
}

.searchSection {
  display: flex;
  gap: 12px;
  align-items: center;
}

.searchBox {
  position: relative;
  display: flex;
  align-items: center;
}

.searchIcon {
  position: absolute;
  right: 12px;
  color: var(--text-secondary, #9ca3af);
  font-size: 14px;
  pointer-events: none;
}

.searchInput {
  padding: 10px 40px 10px 16px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  font-size: 14px;
  width: 260px;
  background: var(--bg-secondary, #f9fafb);
  transition: all 0.2s ease;
}

.searchInput:focus {
  outline: none;
  border-color: #b78a41;
  box-shadow: 0 0 0 3px rgba(183, 138, 65, 0.1);
  background: white;
}

.createRoleBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #b78a41 0%, #d4a853 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(183, 138, 65, 0.25);
}

.createRoleBtn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(183, 138, 65, 0.35);
}

.createRoleBtn:active {
  transform: translateY(0);
}

.createRoleBtn i {
  font-size: 12px;
}

.loadingState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary, #6b7280);
}

.loadingIcon {
  font-size: 32px;
  margin-bottom: 12px;
  color: #b78a41;
}

.tableContainer {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.tableHead {
  background: var(--bg-secondary, #f9fafb);
}

.tableHead th {
  padding: 14px 16px;
  text-align: right;
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.tableBody tr {
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  transition: background 0.15s ease;
}

.tableBody tr:hover {
  background: var(--bg-hover, #f9fafb);
}

.tableBody tr:last-child {
  border-bottom: none;
}

.tableBody td {
  padding: 16px;
  font-size: 0.875rem;
  color: var(--text-primary, #1f2937);
}

.systemRole {
  background: rgba(183, 138, 65, 0.05);
}

.nameColumn { width: 15%; }
.displayColumn { width: 18%; }
.pagesColumn { width: 30%; }
.usersColumn { width: 10%; text-align: center; }
.typeColumn { width: 12%; }
.actionsColumn { width: 15%; }

.roleName {
  font-family: 'Fira Code', 'Monaco', monospace;
  font-size: 0.8rem;
  background: var(--bg-secondary, #f3f4f6);
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--text-primary, #374151);
}

.pagesContainer {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pageTag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: rgba(183, 138, 65, 0.12);
  color: #8b6914;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 20px;
}

.moreTag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--bg-secondary, #e5e7eb);
  color: var(--text-secondary, #6b7280);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 20px;
  cursor: help;
}

.noPagesTag {
  color: var(--text-secondary, #9ca3af);
  font-size: 0.8rem;
  font-style: italic;
}

.usersCount {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 28px;
  padding: 0 10px;
  background: var(--bg-secondary, #f3f4f6);
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
}

.systemBadge,
.customBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 20px;
}

.systemBadge {
  background: rgba(183, 138, 65, 0.15);
  color: #8b6914;
}

.customBadge {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.actionButtons {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
}

.actionBtn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
}

.actionBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.permissionsBtn {
  background: rgba(183, 138, 65, 0.12);
  color: #b78a41;
}

.permissionsBtn:hover:not(:disabled) {
  background: #b78a41;
  color: white;
}

.assignUsersBtn {
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
}

.assignUsersBtn:hover:not(:disabled) {
  background: #8b5cf6;
  color: white;
}

.viewBtn {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.viewBtn:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
}

.editBtn {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.editBtn:hover:not(:disabled) {
  background: #10b981;
  color: white;
}

.deleteBtn {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.deleteBtn:hover:not(:disabled) {
  background: #ef4444;
  color: white;
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.emptyIcon {
  font-size: 48px;
  color: var(--text-secondary, #d1d5db);
  margin-bottom: 16px;
}

.emptyTitle {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-secondary, #6b7280);
  margin: 0;
}

/* Night mode */
:global([data-theme="night"]) .tableContainer {
  background: #1e1e1e;
}

:global([data-theme="night"]) .tableHead {
  background: #252525;
}

:global([data-theme="night"]) .tableHead th {
  color: #a1a1aa;
  border-color: #333;
}

:global([data-theme="night"]) .tableBody tr {
  border-color: #333;
}

:global([data-theme="night"]) .tableBody tr:hover {
  background: #252525;
}

:global([data-theme="night"]) .tableBody td {
  color: #e5e5e5;
}

:global([data-theme="night"]) .headerTitle {
  color: #f5f5f5;
}

:global([data-theme="night"]) .searchInput {
  background: #252525;
  border-color: #333;
  color: #e5e5e5;
}

:global([data-theme="night"]) .roleName {
  background: #333;
  color: #e5e5e5;
}

:global([data-theme="night"]) .systemRole {
  background: rgba(183, 138, 65, 0.1);
}
</style>
