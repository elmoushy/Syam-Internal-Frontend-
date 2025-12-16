<template>
  <div :class="$style.userManagement" :data-theme="currentTheme" >
    <!-- Header Section -->
    <header :class="$style.header">
      <div :class="$style.headerContent">
    
        
        <div :class="$style.headerActions" v-if="isCurrentUserAdmin">
              
          <button 
            :class="[$style.actionBtn, $style.primaryBtn]" 
            @click="openGroupModal('create')"
          >
            <i class="fas fa-users"></i>
            {{ t('userManagement.groups.addGroup') }}
          </button>
          <button 
            :class="[$style.actionBtn, $style.primaryBtn]" 
            @click="openUserModal('create')"
          >
            <i class="fas fa-user-plus"></i>
            {{ t('userManagement.users.addUser') }}
          </button>
      
          
          <!-- <button 
            :class="[$style.actionBtn, $style.refreshBtn]" 
            @click="refreshData"
            :disabled="loading"
          >
            <i class="fas fa-sync-alt" :class="{ [$style.spinning]: loading }"></i>
            {{ t('userManagement.buttons.refresh') }}
          </button> -->
        </div>
            <div :class="$style.headerInfo">
          <h1 :class="$style.title">{{ t('userManagement.title') }}</h1>
        </div>
      </div>
    </header>

    <!-- Dashboard Stats -->
    <section :class="$style.statsSection" v-if="dashboardStats">
      <div :class="$style.statsGrid">
        <div :class="[$style.statCard, $style.totalUsers]">
     
          <div :class="$style.statContent">
            <div :class="$style.statLabel">{{ t('userManagement.dashboard.totalUsers') }}</div>
            <div :class="$style.statNumber">{{ dashboardStats.total_users }} <span :class="$style.statspan">مستخدم</span></div>
          </div>
        </div>
        
        <div :class="[$style.statCard, $style.activeUsers]">
         
          <div :class="$style.statContent">
            <div :class="$style.statLabel">{{ t('userManagement.dashboard.activeUsers') }}</div>
            <div :class="$style.statNumber">{{ dashboardStats.active_users }} <span :class="$style.statspan">مستخدم نشط</span></div>
          </div>
        </div>
        
        <div :class="[$style.statCard, $style.totalGroups]">
       
          <div :class="$style.statContent">
            <div :class="$style.statLabel">{{ t('userManagement.dashboard.totalGroups') }}</div>
            <div :class="$style.statNumber">{{ dashboardStats.total_groups }} <span :class="$style.statspan">مجموعة</span></div>
          </div>
        </div>
        
        <div :class="[$style.statCard, $style.admins]">
        
          <div :class="$style.statContent">
            <div :class="$style.statLabel">{{ t('userManagement.dashboard.admins') }}  </div>
            <div :class="$style.statNumber">{{ dashboardStats.admins }} <span :class="$style.statspan">مدير</span></div>
          </div>
        </div>
      </div>
    </section>
  <div :class="$style.tabsHeader">
          <button 
            :class="[$style.tabBtn, activeTab === 'users' ? $style.tabBtnActive : '']"
            @click="setActiveTab('users')"
          >
            {{ t('userManagement.users.title') }}
          </button>
          
          <button 
            :class="[$style.tabBtn, activeTab === 'groups' ? $style.tabBtnActive : '']"
            @click="setActiveTab('groups')"
          >
            {{ t('userManagement.groups.title') }}
          </button>
          
          <!-- Roles Tab - super_admin only -->
          <button 
            v-if="isSuperAdmin"
            :class="[$style.tabBtn, activeTab === 'roles' ? $style.tabBtnActive : '']"
            @click="setActiveTab('roles')"
          >
            {{ t('roleManagement.tabTitle') }}
          </button>
        </div>
        
    <!-- Main Content Tabs -->
    <main :class="$style.mainContent">
      <div :class="$style.tabsContainer">
      

        <!-- Tab Content -->
        <div :class="$style.tabContent">
          <!-- Users Tab -->
          <div v-if="activeTab === 'users'" :class="$style.tabPane">
            <UserManagementTable
              :users="paginatedUsers"
              :loading="loading"
              :selected-users="selectedUsers"
              :current-user="currentUser"
              :total-pages="totalUsersPages"
              :current-page="usersPage"
              :filters="userFilters"
              :sort="userSort"
              :roles="roles"
              @user-selected="toggleUserSelection"
              @select-all="selectAllUsersOnPage"
              @clear-selection="clearUserSelection"
              @page-changed="goToUsersPage"
              @filters-changed="updateUserFilters"
              @sort-changed="updateUserSort"
              @user-action="handleUserAction"
              @bulk-action="handleBulkAction"
            />
          </div>

          <!-- Groups Tab -->
          <div v-if="activeTab === 'groups'" :class="$style.tabPane">
            <GroupManagementTable
              :groups="paginatedGroups"
              :loading="loading"
              :selected-groups="selectedGroups"
              :current-user="currentUser"
              :total-pages="totalGroupsPages"
              :current-page="groupsPage"
              :filters="groupFilters"
              :sort="groupSort"
              @group-selected="toggleGroupSelection"
              @clear-selection="clearGroupSelection"
              @page-changed="goToGroupsPage"
              @filters-changed="updateGroupFilters"
              @sort-changed="updateGroupSort"
              @group-action="handleGroupAction"
            />
          </div>

          <!-- Roles Tab - super_admin only -->
          <div v-if="activeTab === 'roles' && isSuperAdmin" :class="$style.tabPane">
            <RoleManagementTable
              :roles="rolesWithPermissions"
              :available-pages="availablePages"
              :loading="rolesLoading"
              @role-action="handleRoleAction"
              @create-role="handleCreateRole"
            />
          </div>
        </div>
      </div>
    </main>

    <!-- User Modal -->
    <UserModal
      v-if="userModalVisible"
      :mode="userModalMode"
      :user="selectedUser"
      :roles="roles"
      :groups="groupsDropdown"
      @save="handleUserSave"
      @close="closeUserModal"
    />

    <!-- Group Modal -->
    <GroupModal
      v-if="groupModalVisible"
      :mode="groupModalMode"
      :group="selectedGroup"
      @save="handleGroupSave"
      @close="closeGroupModal"
    />

    <!-- Bulk Action Modal -->
    <BulkActionModal
      v-if="bulkActionModalVisible"
      :mode="bulkActionMode"
      :selected-users="selectedUsers"
      :groups="groupsDropdown"
      :roles="roles"
      @save="handleBulkActionApply"
      @close="closeBulkActionModal"
    />

    <!-- Add Users to Group Modal -->
    <AddUsersToGroupModal
      :visible="addUsersToGroupModalVisible"
      :group="selectedGroupForAddUsers"
      @success="handleAddUsersToGroupSuccess"
      @close="closeAddUsersToGroupModal"
    />

    <!-- User Role Change Modal -->
    <UserRoleModal
      :visible="userRoleModalVisible"
      :user="selectedUserForRole"
      @success="handleUserRoleChangeSuccess"
      @close="closeUserRoleModal"
    />

    <!-- Reset Password Modal -->
    <ResetPasswordModal
      :visible="resetPasswordModalVisible"
      :user="selectedUserForResetPassword"
      :loading="resetPasswordLoading"
      @save="handleResetPasswordSubmit"
      @close="closeResetPasswordModal"
    />

    <!-- Assign Permission Modal (Roles Tab) -->
    <AssignPermissionModal
      :visible="assignPermissionModalVisible"
      :role="selectedRoleForPermissions"
      :available-pages="availablePages"
      :loading="assignPermissionLoading"
      @save="handleAssignPermissionsSave"
      @close="closeAssignPermissionModal"
    />

    <!-- Assign Users to Role Modal -->
    <AssignUsersToRoleModal
      :visible="assignUsersToRoleModalVisible"
      :role="selectedRoleForAssignUsers"
      :users="assignableUsers"
      :loading-users="loadingAssignableUsers"
      @success="handleAssignUsersToRoleSuccess"
      @close="closeAssignUsersToRoleModal"
    />

    <!-- Create Role Modal -->
    <CreateRoleModal
      :visible="createRoleModalVisible"
      :loading="createRoleLoading"
      @save="handleCreateRoleSave"
      @close="closeCreateRoleModal"
    />

    <!-- Loading Overlay -->
    <!-- <div v-if="loading" :class="$style.loadingOverlay">
      <div :class="$style.loadingSpinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>{{ t('common.loading') }}...</p>
      </div>
    </div> -->

    <!-- Error Message -->
    <div v-if="error" :class="$style.errorMessage">
      <div :class="$style.errorContent">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ error }}</span>
        <button @click="clearError" :class="$style.errorClose">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '../../../stores/useAppStore'
import { useUserManagement } from '../../../composables/useUserManagement'
import { useBulkDelete } from '../../../composables/useBulkDelete'
import { bulkDeleteUsers, resetUserPassword, getAssignableUsers } from '../../../services/userManagementService'
import userManagementService from '../../../services/userManagementService'
import roleManagementService, { 
  type RoleWithPermissions, 
  type AvailablePage 
} from '../../../services/roleManagementService'
import Swal from 'sweetalert2'
import UserManagementTable from '../../../components/UserManagementTable/UserManagementTable.vue'
import GroupManagementTable from '../../../components/GroupManagementTable/GroupManagementTable.vue'
import RoleManagementTable from '../../../components/RoleManagementTable/RoleManagementTable.vue'
import UserModal from '../../../components/UserModal/UserModal.vue'
import GroupModal from '../../../components/GroupModal/GroupModal.vue'
import BulkActionModal from '../../../components/BulkActionModal/BulkActionModal.vue'
import AddUsersToGroupModal from '../../../components/AddUsersToGroupModal/AddUsersToGroupModal.vue'
import UserRoleModal from '../../../components/UserRoleModal/UserRoleModal.vue'
import ResetPasswordModal from '../../../components/ResetPasswordModal/ResetPasswordModal.vue'
import AssignPermissionModal from '../../../components/AssignPermissionModal/AssignPermissionModal.vue'
import AssignUsersToRoleModal from '../../../components/AssignUsersToRoleModal/AssignUsersToRoleModal.vue'
import CreateRoleModal from '../../../components/CreateRoleModal/CreateRoleModal.vue'
import type { 
  User, 
  Group,
  UserModalMode,
  GroupModalMode,
  BulkActionMode,
  CreateGroupRequest,
  UpdateGroupRequest,
  InviteUserRequest,
  UpdateUserRoleRequest,
  CreateUserRequest,
  BulkDeleteRequest
} from '../../../types/user-management.types'

// Store and composables
const store = useAppStore()
const userManagement = useUserManagement()
const bulkDelete = useBulkDelete()

// Computed properties
const currentTheme = computed(() => store.currentTheme)
// const isRTL = computed(() => store.currentLanguage === 'ar') // Unused - RTL is handled by store
const t = computed(() => store.t)

// Destructure user management composable
const {
  loading,
  error,
  currentUser,
  users,
  // groups, // Unused - commenting out
  selectedUsers,
  selectedGroups,
  dashboardStats,
  roles,
  groupsDropdown,
  userFilters,
  groupFilters,
  userSort,
  groupSort,
  usersPage,
  groupsPage,
  paginatedUsers,
  paginatedGroups,
  totalUsersPages,
  totalGroupsPages,
  isCurrentUserAdmin,
  toggleUserSelection,
  toggleGroupSelection,
  selectAllUsersOnPage,
  clearUserSelection,
  clearGroupSelection,
  goToUsersPage,
  goToGroupsPage,
  updateUserFilters,
  updateGroupFilters,
  updateUserSort,
  updateGroupSort,
  initialize,
  refreshData,
  clearError,
  createNewGroup,
  updateExistingGroup,
  deleteExistingGroup,
  inviteNewUser,
  createNewUser,
  updateExistingUserRole,
  // addUserToExistingGroup, // Unused - commenting out
  // removeUserFromExistingGroup, // Unused - commenting out
  bulkAddUsersToExistingGroup
} = userManagement

// Local state
const activeTab = ref<'users' | 'groups' | 'roles'>('users')
const userModalVisible = ref(false)
const groupModalVisible = ref(false)
const bulkActionModalVisible = ref(false)
const selectedUser = ref<User | null>(null)
const selectedGroup = ref<Group | null>(null)
const userModalMode = ref<UserModalMode>({ type: 'create' })
const groupModalMode = ref<GroupModalMode>({ type: 'create' })
const bulkActionMode = ref<BulkActionMode>({ type: 'add_to_group', selected_users: [] })

// New modals
const addUsersToGroupModalVisible = ref(false)
const selectedGroupForAddUsers = ref<Group | null>(null)
const userRoleModalVisible = ref(false)
const selectedUserForRole = ref<User | null>(null)
const resetPasswordModalVisible = ref(false)
const selectedUserForResetPassword = ref<User | null>(null)
const resetPasswordLoading = ref(false)

// Role Management State (super_admin only)
const rolesWithPermissions = ref<RoleWithPermissions[]>([])
const availablePages = ref<AvailablePage[]>([])
const rolesLoading = ref(false)
const assignPermissionModalVisible = ref(false)
const selectedRoleForPermissions = ref<RoleWithPermissions | null>(null)
const assignPermissionLoading = ref(false)

// Assign Users to Role Modal State
const assignUsersToRoleModalVisible = ref(false)
const selectedRoleForAssignUsers = ref<RoleWithPermissions | null>(null)
const assignUsersToRoleLoading = ref(false)
const assignableUsers = ref<User[]>([])
const loadingAssignableUsers = ref(false)

// Computed: Check if current user is super_admin
const isSuperAdmin = computed(() => currentUser.value?.role === 'super_admin')

// Methods
const setActiveTab = (tab: 'users' | 'groups' | 'roles') => {
  activeTab.value = tab
  // Load roles data when switching to roles tab
  if (tab === 'roles' && isSuperAdmin.value) {
    loadRolesData()
  }
}

const openUserModal = (type: 'create' | 'edit' | 'view' | 'invite', user?: User) => {
  userModalMode.value = { type, user }
  selectedUser.value = user || null
  userModalVisible.value = true
}

const closeUserModal = () => {
  userModalVisible.value = false
  selectedUser.value = null
}

const openGroupModal = (type: 'create' | 'edit' | 'view', group?: Group) => {
  groupModalMode.value = { type, group }
  selectedGroup.value = group || null
  groupModalVisible.value = true
}

const closeGroupModal = () => {
  groupModalVisible.value = false
  selectedGroup.value = null
}

const openBulkActionModal = (type: 'add_to_group' | 'remove_from_group' | 'change_role') => {
  bulkActionMode.value = { type, selected_users: selectedUsers.value }
  bulkActionModalVisible.value = true
}

const closeBulkActionModal = () => {
  bulkActionModalVisible.value = false
}

const handleResetPassword = (user: User) => {
  selectedUserForResetPassword.value = user
  resetPasswordModalVisible.value = true
}

const closeResetPasswordModal = () => {
  resetPasswordModalVisible.value = false
  selectedUserForResetPassword.value = null
  resetPasswordLoading.value = false
}

const handleResetPasswordSubmit = async (newPassword: string) => {
  if (!selectedUserForResetPassword.value) return
  
  try {
    resetPasswordLoading.value = true
    
    // Call the reset password API
    await resetUserPassword(selectedUserForResetPassword.value.id, newPassword)
    
    // Store user email before closing modal
    const userEmail = selectedUserForResetPassword.value.email
    
    // Close modal and show success message
    closeResetPasswordModal()
    
    await Swal.fire({
      title: t.value('userManagement.messages.resetPassword.success.title'),
      text: t.value('userManagement.messages.resetPassword.success.text').replace('{{email}}', userEmail),
      icon: 'success',
      confirmButtonText: t.value('userManagement.buttons.ok'),
      confirmButtonColor: '#28a745',
      customClass: {
        popup: 'swal-rtl-popup',
        title: 'swal-rtl-title',
        htmlContainer: 'swal-rtl-content'
      }
    })
  } catch (error: any) {
    console.error('API Error:', error)
    resetPasswordLoading.value = false
    
    let title = t.value('userManagement.messages.resetPassword.error.title')
    let text = t.value('userManagement.messages.resetPassword.error.text')
    
    if (error.response) {
      const status = error.response.status
      const data = error.response.data
      
      switch (status) {
        case 400:
          if (data.errors?.new_password) {
            const serverMessage = data.errors.new_password[0] || text
            // Translate specific password validation messages
            if (serverMessage.includes('too common')) {
              text = t.value('userManagement.validation.password.tooCommon')
            } else if (serverMessage.includes('only numbers')) {
              text = t.value('userManagement.validation.password.onlyNumbers')
            } else if (serverMessage.includes('too similar')) {
              text = t.value('userManagement.validation.password.tooSimilar')
            } else if (serverMessage.includes('at least 8 characters')) {
              text = t.value('userManagement.validation.password.minLength')
            } else {
              text = serverMessage
            }
          } else if (data.errors?.user_id) {
            text = data.errors.user_id[0] || text
          } else {
            text = data.detail || text
          }
          break
        case 403:
          title = t.value('userManagement.messages.resetPassword.error.forbidden.title')
          text = t.value('userManagement.messages.resetPassword.error.forbidden.text')
          break
        case 404:
          text = t.value('userManagement.messages.resetPassword.error.userNotFound')
          break
      }
    }
    
    await Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: t.value('userManagement.buttons.ok'),
      confirmButtonColor: '#dc3545',
      customClass: {
        popup: 'swal-rtl-popup',
        title: 'swal-rtl-title',
        htmlContainer: 'swal-rtl-content'
      }
    })
  }
}

/**
 * Handle updating user's access level role (super_admin/admin/user)
 * Uses endpoint: PUT /api/auth/users/{id}/role/
 */
const handleUpdateAccessLevelRole = async (user: User) => {
  try {
    // Get role display names
    const getRoleDisplayName = (role: string) => {
      const roleItem = roles.value.find(r => r.value === role)
      return roleItem?.display || role
    }
    
    // Build options for the dropdown - only access level roles
    const accessLevelRoles = [
      { value: 'user', display: t.value('userManagement.users.roles.user') },
      { value: 'admin', display: t.value('userManagement.users.roles.admin') },
      { value: 'super_admin', display: t.value('userManagement.users.roles.super_admin') }
    ]
    
    const roleOptions = accessLevelRoles
      .map(role => `<option value="${role.value}" ${user.role === role.value ? 'selected' : ''}>${role.display}</option>`)
      .join('')
    
    const result = await Swal.fire({
      title: t.value('userManagement.modals.changeRole.title'),
      html: `
        <div style="text-align:right;direction:rtl;">
          <div style="margin-bottom:16px;padding:12px;background:rgba(183,138,65,0.1);border-radius:8px;">
            <strong>${user.full_name}</strong>
            <br/>
            <span style="color:#6b7280;font-size:0.9rem;">${user.email}</span>
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
              ${t.value('userManagement.modals.changeRole.currentRole')}
            </label>
            <div style="padding:8px 12px;background:#f3f4f6;border-radius:6px;color:#374151;">
              ${getRoleDisplayName(user.role)}
            </div>
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
              ${t.value('userManagement.modals.changeRole.newRole')}
            </label>
            <select 
              id="swal-access-role-select" 
              class="swal2-select" 
              style="width:100%;margin:0;text-align:right;direction:rtl;padding:10px;border:1px solid #d1d5db;border-radius:8px;"
            >
              ${roleOptions}
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: t.value('common.save'),
      cancelButtonText: t.value('common.cancel'),
      confirmButtonColor: '#b78a41',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'swal-rtl-popup',
        title: 'swal-rtl-title',
        htmlContainer: 'swal-rtl-content'
      },
      preConfirm: () => {
        const select = document.getElementById('swal-access-role-select') as HTMLSelectElement
        return select?.value || null
      }
    })
    
    if (result.isConfirmed && result.value) {
      const selectedRole = result.value as 'super_admin' | 'admin' | 'user'
      
      // Only update if role changed
      if (selectedRole !== user.role) {
        // Call the updateExistingUserRole function which uses PUT /api/auth/users/{id}/role/
        await updateExistingUserRole(user.id, { role: selectedRole })
        
        await Swal.fire({
          title: t.value('userManagement.messages.roleUpdated'),
          icon: 'success',
          confirmButtonText: t.value('common.ok'),
          confirmButtonColor: '#28a745'
        })
        
        // Refresh data to show updated role
        await refreshData()
      }
    }
  } catch (error: any) {
    console.error('Error updating access level role:', error)
    await Swal.fire({
      title: t.value('userManagement.messages.error'),
      text: error.response?.data?.error || error.message || t.value('userManagement.messages.unknownError'),
      icon: 'error',
      confirmButtonText: t.value('common.ok'),
      confirmButtonColor: '#dc3545'
    })
  }
}

/**
 * Handle assigning a user to a Role from the Role table
 * This sets the user_role FK and grants page permissions
 */
const handleAssignUserRole = async (user: User) => {
  try {
    // First, make sure we have the roles loaded
    if (rolesWithPermissions.value.length === 0) {
      await loadRolesData()
    }
    
    // Build options for the dropdown
    const roleOptions = rolesWithPermissions.value
      .map(role => `<option value="${role.id}" ${user.user_role_id === role.id ? 'selected' : ''}>${role.display_name || role.name}</option>`)
      .join('')
    
    const currentRoleName = user.user_role_name || t.value('userManagement.assignRole.noRole')
    
    const result = await Swal.fire({
      title: t.value('userManagement.assignRole.title'),
      html: `
        <div style="text-align:right;direction:rtl;">
          <div style="margin-bottom:16px;padding:12px;background:rgba(183,138,65,0.1);border-radius:8px;">
            <strong>${user.full_name}</strong>
            <br/>
            <span style="color:#6b7280;font-size:0.9rem;">${user.email}</span>
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
              ${t.value('userManagement.assignRole.currentRole')}
            </label>
            <div style="padding:8px 12px;background:#f3f4f6;border-radius:6px;color:#374151;">
              ${currentRoleName}
            </div>
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
              ${t.value('userManagement.assignRole.selectRole')}
            </label>
            <select 
              id="swal-role-select" 
              class="swal2-select" 
              style="width:100%;margin:0;text-align:right;direction:rtl;padding:10px;border:1px solid #d1d5db;border-radius:8px;"
            >
              <option value="">${t.value('userManagement.assignRole.noRoleOption')}</option>
              ${roleOptions}
            </select>
          </div>
          <div style="padding:10px;background:#fef3c7;border-radius:8px;font-size:0.85rem;color:#92400e;">
            <i class="fas fa-info-circle" style="margin-left:6px;"></i>
            ${t.value('userManagement.assignRole.infoNote')}
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: t.value('common.save'),
      cancelButtonText: t.value('common.cancel'),
      confirmButtonColor: '#b78a41',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'swal-rtl-popup',
        title: 'swal-rtl-title',
        htmlContainer: 'swal-rtl-content'
      },
      preConfirm: () => {
        const select = document.getElementById('swal-role-select') as HTMLSelectElement
        return select?.value || null
      }
    })
    
    if (result.isConfirmed) {
      const selectedRoleId = result.value
      
      if (selectedRoleId) {
        // Assign user to the selected role
        await roleManagementService.assignUserToRole(user.id, { role_id: parseInt(selectedRoleId) })
        
        await Swal.fire({
          title: t.value('userManagement.assignRole.success.title'),
          text: t.value('userManagement.assignRole.success.text'),
          icon: 'success',
          confirmButtonText: t.value('common.ok'),
          confirmButtonColor: '#28a745'
        })
      } else if (user.user_role_id) {
        // Remove user from current role
        await roleManagementService.removeUserFromRole(user.id)
        
        await Swal.fire({
          title: t.value('userManagement.assignRole.removed.title'),
          text: t.value('userManagement.assignRole.removed.text'),
          icon: 'success',
          confirmButtonText: t.value('common.ok'),
          confirmButtonColor: '#28a745'
        })
      }
      
      // Refresh data to show updated role
      await refreshData()
      await loadRolesData()
    }
  } catch (error: any) {
    console.error('Error assigning role:', error)
    await Swal.fire({
      title: t.value('userManagement.assignRole.error.title'),
      text: error.response?.data?.error || error.message || t.value('userManagement.assignRole.error.text'),
      icon: 'error',
      confirmButtonText: t.value('common.ok'),
      confirmButtonColor: '#dc3545'
    })
  }
}

const handleUserAction = async (action: string, user: User) => {
  try {
    switch (action) {
      case 'view':
        openUserModal('view', user)
        break
      case 'edit':
        // Open modal to update access level role (super_admin/admin/user)
        await handleUpdateAccessLevelRole(user)
        break
      case 'delete':
        const userDeleteResult = await Swal.fire({
          title: t.value('userManagement.messages.singleDelete.confirm.title'),
          text: t.value('userManagement.messages.singleDelete.confirm.text').replace('{{email}}', user.email),
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: t.value('userManagement.messages.singleDelete.confirm.confirmButtonText'),
          cancelButtonText: t.value('userManagement.messages.singleDelete.confirm.cancelButtonText'),
          confirmButtonColor: '#ff6b6b',
          cancelButtonColor: '#6c757d',
          reverseButtons: true,
          customClass: {
            popup: 'swal-rtl-popup',
            title: 'swal-rtl-title',
            htmlContainer: 'swal-rtl-content'
          }
        })
        
        if (userDeleteResult.isConfirmed) {
          try {
            // Use the same bulk delete API with single user
            const deleteRequest: BulkDeleteRequest = {
              user_ids: [user.id]
            }
            
            const response = await bulkDeleteUsers(deleteRequest)
            
            // Refresh data after successful deletion
            await refreshData()
            
            // Show success message for single user
            if (response.summary.successful_deletions === 1) {
              await Swal.fire({
                title: t.value('userManagement.messages.singleDelete.results.success.title'),
                text: t.value('userManagement.messages.singleDelete.results.success.text').replace('{{email}}', user.email),
                icon: 'success',
                confirmButtonText: t.value('userManagement.messages.singleDelete.results.success.confirmButtonText'),
                customClass: {
                  popup: 'swal-rtl-popup',
                  title: 'swal-rtl-title',
                  htmlContainer: 'swal-rtl-content'
                }
              })
            } else {
              // Show error if deletion failed
              await Swal.fire({
                title: t.value('userManagement.messages.singleDelete.results.error.title'),
                text: response.results.failed[0]?.error || t.value('userManagement.messages.singleDelete.results.error.text'),
                icon: 'error',
                confirmButtonText: t.value('userManagement.messages.singleDelete.results.error.confirmButtonText'),
                customClass: {
                  popup: 'swal-rtl-popup',
                  title: 'swal-rtl-title',
                  htmlContainer: 'swal-rtl-content'
                }
              })
            }
          } catch (deleteError: any) {
            let title = t.value('userManagement.messages.singleDelete.results.error.title')
            let text = t.value('userManagement.messages.singleDelete.results.error.text')
            
            if (deleteError.response) {
              const status = deleteError.response.status
              const data = deleteError.response.data
              
              switch (status) {
                case 400:
                  if (data.message?.includes('cannot delete yourself') || data.message?.includes('self')) {
                    title = t.value('userManagement.messages.bulkDelete.results.badRequest.texts.cannotDeleteCurrentUser')
                    text = t.value('userManagement.messages.bulkDelete.results.badRequest.texts.cannotDeleteCurrentUserDesc')
                  } else if (data.message?.includes('last super admin')) {
                    title = t.value('userManagement.messages.bulkDelete.results.badRequest.texts.cannotDeleteLastSuperAdmin')
                    text = t.value('userManagement.messages.bulkDelete.results.badRequest.texts.cannotDeleteLastSuperAdminDesc')
                  } else {
                    text = data.message || text
                  }
                  break
                case 403:
                  title = t.value('userManagement.messages.bulkDelete.results.forbidden.title')
                  text = t.value('userManagement.messages.bulkDelete.results.forbidden.text')
                  break
              }
            }
            
            await Swal.fire({
              title,
              text,
              icon: 'error',
              confirmButtonText: t.value('userManagement.messages.singleDelete.results.error.confirmButtonText'),
              customClass: {
                popup: 'swal-rtl-popup',
                title: 'swal-rtl-title',
                htmlContainer: 'swal-rtl-content'
              }
            })
          }
        }
        break
      case 'change_role':
        openUserRoleModal(user)
        break
      case 'reset_password':
        await handleResetPassword(user)
        break
      case 'view_groups':
        // TODO: Show user groups modal
        break
    }
  } catch (err: any) {
    // Logging removed for production
    await Swal.fire({
      title: 'خطأ في عملية المستخدم',
      text: err.message || 'فشل في تنفيذ العملية المطلوبة',
      icon: 'error',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#dc3545'
    })
  }
}

const handleGroupAction = async (action: string, group: Group) => {
  // Logging removed for production
  try {
    switch (action) {
      case 'view':
        openGroupModal('view', group)
        break
      case 'edit':
        openGroupModal('edit', group)
        break
      case 'delete':
        const groupDeleteResult = await Swal.fire({
          title: 'تأكيد حذف المجموعة',
          text: 'هل أنت متأكد من حذف هذه المجموعة؟ لا يمكن التراجع عن هذا الإجراء.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'نعم، احذف',
          cancelButtonText: 'إلغاء',
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#6c757d'
        })
        
        if (groupDeleteResult.isConfirmed) {
          await deleteExistingGroup(group.id)
          await Swal.fire({
            title: 'تم الحذف',
            text: 'تم حذف المجموعة بنجاح',
            icon: 'success',
            confirmButtonText: 'موافق',
            confirmButtonColor: '#28a745'
          })
        }
        break
      case 'add_users':
        // Logging removed for production
        openAddUsersToGroupModal(group)
        break
      case 'view_members':
        openGroupModal('view', group)
        break
    }
  } catch (err: any) {
    // Logging removed for production
    await Swal.fire({
      title: 'خطأ في عملية المجموعة',
      text: err.message || 'فشل في تنفيذ العملية المطلوبة',
      icon: 'error',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#dc3545'
    })
  }
}

const handleBulkAction = async (action: string) => {
  if (selectedUsers.value.length === 0) return
  
  if (action === 'bulk_delete') {
    const success = await bulkDelete.executeBulkDelete(selectedUsers.value, currentUser.value)
    if (success) {
      // Refresh the user list and clear selection
      await refreshData()
      clearUserSelection()
    }
  } else {
    openBulkActionModal(action as 'add_to_group' | 'remove_from_group' | 'change_role')
  }
}

const handleUserSave = async (userData: any) => {
  try {
    switch (userModalMode.value.type) {
      case 'create':
        await createNewUser(userData as CreateUserRequest)
        break
      case 'edit':
        if (selectedUser.value) {
          await updateExistingUserRole(selectedUser.value.id, userData as UpdateUserRoleRequest)
        }
        break
      case 'invite':
        await inviteNewUser(userData as InviteUserRequest)
        break
    }
    closeUserModal()
    await Swal.fire({
      title: 'تم بنجاح',
      text: 'تمت عملية المستخدم بنجاح',
      icon: 'success',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#28a745'
    })
  } catch (err: any) {
    // Logging removed for production
    await Swal.fire({
      title: 'خطأ في حفظ المستخدم',
      text: err.message || 'فشل في حفظ بيانات المستخدم',
      icon: 'error',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#dc3545'
    })
  }
}

const handleGroupSave = async (groupData: any) => {
  try {
    let createdGroup: Group | null = null
    
    switch (groupModalMode.value.type) {
      case 'create':
        const response = await createNewGroup(groupData as CreateGroupRequest)
        createdGroup = response.group
        break
      case 'edit':
        if (selectedGroup.value) {
          await updateExistingGroup(selectedGroup.value.id, groupData as UpdateGroupRequest)
        }
        break
    }
    closeGroupModal()
    
    // If group was just created, optionally show add users modal
    if (createdGroup && groupModalMode.value.type === 'create') {
      // Auto-open the add users modal for newly created groups
      setTimeout(() => {
        openAddUsersToGroupModal(createdGroup!)
      }, 300) // Small delay to allow modal transition
    }
    
    await Swal.fire({
      title: 'تم بنجاح',
      text: 'تمت عملية المجموعة بنجاح',
      icon: 'success',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#28a745'
    })
  } catch (err: any) {
    // Logging removed for production
    await Swal.fire({
      title: 'خطأ في حفظ المجموعة',
      text: err.message || 'فشل في حفظ بيانات المجموعة',
      icon: 'error',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#dc3545'
    })
  }
}

const handleBulkActionApply = async (actionData: any) => {
  try {
    switch (bulkActionMode.value.type) {
      case 'add_to_group':
        await bulkAddUsersToExistingGroup(actionData)
        break
      case 'remove_from_group':
        // TODO: Implement bulk remove from group
        break
      case 'change_role':
        // TODO: Implement bulk role change
        break
    }
    closeBulkActionModal()
    clearUserSelection()
    await Swal.fire({
      title: 'تم بنجاح',
      text: 'تمت العملية المجمعة بنجاح',
      icon: 'success',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#28a745'
    })
  } catch (err: any) {
    // Logging removed for production
    await Swal.fire({
      title: 'خطأ في العملية المجمعة',
      text: err.message || 'فشل في تنفيذ العملية المجمعة',
      icon: 'error',
      confirmButtonText: 'موافق',
      confirmButtonColor: '#dc3545'
    })
  }
}

// Add Users to Group Modal Functions
const openAddUsersToGroupModal = async (group: Group) => {
  try {
    // Logging removed for production
    
    // Timeout Promise for 15 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 15000)
    })
    
    // Fetch the detailed groups information with members and admins
    const detailedGroupsResponse = await Promise.race([
      userManagementService.getGroupsWithDetails(),
      timeoutPromise
    ]) as any
    
    // Find the detailed group data with members
    const detailedGroup = detailedGroupsResponse.groups.find((g: Group) => g.id === group.id)
    if (!detailedGroup) {
      // Logging removed for production
      return
    }
    
    // Logging removed for production
    selectedGroupForAddUsers.value = detailedGroup
    addUsersToGroupModalVisible.value = true
  } catch (error: any) {
    // Logging removed for production
    if (error.message === 'TIMEOUT') {
      await Swal.fire({
        title: 'انتهت مهلة الطلب',
        text: 'فشل في تحميل بيانات المجموعة خلال 15 ثانية. يرجى المحاولة مرة أخرى.',
        icon: 'error',
        confirmButtonText: 'موافق',
        confirmButtonColor: '#dc3545'
      })
    } else {
      await Swal.fire({
        title: 'خطأ في تحميل البيانات',
        text: 'فشل في تحميل بيانات المجموعة. سيتم استخدام البيانات الأساسية.',
        icon: 'warning',
        confirmButtonText: 'موافق',
        confirmButtonColor: '#ffc107'
      })
    }
    // Fallback to the original group if detailed fetch fails
    selectedGroupForAddUsers.value = group
    addUsersToGroupModalVisible.value = true
  }
}

const closeAddUsersToGroupModal = () => {
  addUsersToGroupModalVisible.value = false
  selectedGroupForAddUsers.value = null
}

const handleAddUsersToGroupSuccess = async () => {
  // Logging removed for production
  
  // Refresh the data
  await initialize()
  
  // Close the modal
  closeAddUsersToGroupModal()
  
  // You could show a success notification here
  // showNotification(`Added users to group successfully`)
}

// User Role Change Modal Functions
const openUserRoleModal = (user: User) => {
  selectedUserForRole.value = user
  userRoleModalVisible.value = true
}

const closeUserRoleModal = () => {
  userRoleModalVisible.value = false
  selectedUserForRole.value = null
}

const handleUserRoleChangeSuccess = async () => {
  // Logging removed for production
  
  // Refresh the data
  await initialize()
  
  // Close the modal
  closeUserRoleModal()
  
  // You could show a success notification here
  // showNotification(`Changed ${data.user.full_name}'s role from ${data.oldRole} to ${data.newRole}`)
}

// ============================================================================
// ROLE MANAGEMENT FUNCTIONS (super_admin only)
// ============================================================================

const loadRolesData = async () => {
  if (!isSuperAdmin.value) return
  
  try {
    rolesLoading.value = true
    
    // Load roles and available pages in parallel
    const [rolesResponse, pagesResponse] = await Promise.all([
      roleManagementService.getRolesWithPermissions(),
      roleManagementService.getAvailablePages()
    ])
    
    rolesWithPermissions.value = rolesResponse.roles
    availablePages.value = pagesResponse.pages
  } catch (err: any) {
    console.error('Error loading roles data:', err)
    await Swal.fire({
      title: t.value('roleManagement.errors.loadFailed'),
      text: roleManagementService.getErrorMessage(err),
      icon: 'error',
      confirmButtonText: t.value('common.ok'),
      confirmButtonColor: '#dc3545'
    })
  } finally {
    rolesLoading.value = false
  }
}

// Create Role Modal State
const createRoleModalVisible = ref(false)
const createRoleLoading = ref(false)

/**
 * Handle opening the create role modal
 */
const handleCreateRole = () => {
  createRoleModalVisible.value = true
}

/**
 * Handle closing the create role modal
 */
const closeCreateRoleModal = () => {
  createRoleModalVisible.value = false
}

/**
 * Handle saving a new role from the modal
 */
const handleCreateRoleSave = async (data: { name: string; display_name?: string; description?: string; is_system_role: boolean }) => {
  createRoleLoading.value = true
  try {
    await roleManagementService.createRole(data)
    createRoleModalVisible.value = false
    await Swal.fire({
      title: t.value('roleManagement.createRole.success'),
      icon: 'success',
      confirmButtonText: t.value('common.ok'),
      confirmButtonColor: '#10b981',
      timer: 2000
    })
    // Refresh roles data
    await loadRolesData()
  } catch (error: any) {
    console.error('Error creating role:', error)
    await Swal.fire({
      title: t.value('roleManagement.createRole.error'),
      text: roleManagementService.getErrorMessage(error),
      icon: 'error',
      confirmButtonText: t.value('common.ok'),
      confirmButtonColor: '#ef4444'
    })
  } finally {
    createRoleLoading.value = false
  }
}

const handleRoleAction = async (action: string, role: RoleWithPermissions) => {
  switch (action) {
    case 'manage-permissions':
      openAssignPermissionModal(role)
      break
    case 'assign-users':
      openAssignUsersToRoleModal(role)
      break
    case 'view':
      // Show role details in a Swal modal
      const pagesHtml = role.pages.length > 0 
        ? role.pages.map(p => {
            const page = availablePages.value.find(ap => ap.name === p)
            return `<span style="display:inline-block;background:rgba(183,138,65,0.12);color:#8b6914;padding:4px 12px;border-radius:20px;margin:4px;font-size:0.85rem;">${page?.display_name || p}</span>`
          }).join('')
        : `<span style="color:#9ca3af;font-style:italic;">${t.value('roleManagement.noPages')}</span>`
      
      await Swal.fire({
        title: role.display_name || role.name,
        html: `
          <div style="text-align:right;direction:rtl;">
            <p style="margin-bottom:12px;color:#6b7280;">${role.description || t.value('roleManagement.noDescription')}</p>
            <div style="margin-top:16px;">
              <strong style="display:block;margin-bottom:8px;">${t.value('roleManagement.assignedPages')}:</strong>
              <div style="display:flex;flex-wrap:wrap;justify-content:flex-end;">${pagesHtml}</div>
            </div>
            <p style="margin-top:16px;font-size:0.875rem;color:#9ca3af;">
              ${t.value('roleManagement.usersWithRole')}: <strong>${role.users_count}</strong>
            </p>
          </div>
        `,
        confirmButtonText: t.value('common.close'),
        confirmButtonColor: '#b78a41',
        customClass: {
          popup: 'swal-rtl-popup',
          title: 'swal-rtl-title',
          htmlContainer: 'swal-rtl-content'
        }
      })
      break
    case 'edit':
      // Open edit role modal using SweetAlert2
      if (role.is_system_role) {
        await Swal.fire({
          title: t.value('roleManagement.errors.cannotEditSystem'),
          icon: 'warning',
          confirmButtonText: t.value('common.ok'),
          confirmButtonColor: '#ffc107'
        })
        return
      }
      
      const editResult = await Swal.fire({
        title: t.value('roleManagement.editRole.title'),
        html: `
          <div style="text-align:right;direction:rtl;">
            <div style="margin-bottom:16px;">
              <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
                ${t.value('roleManagement.editRole.displayName')}
              </label>
              <input 
                id="swal-display-name" 
                class="swal2-input" 
                style="width:100%;margin:0;text-align:right;direction:rtl;"
                value="${role.display_name || ''}"
                placeholder="${t.value('roleManagement.editRole.displayNamePlaceholder')}"
              >
            </div>
            <div style="margin-bottom:16px;">
              <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">
                ${t.value('roleManagement.editRole.description')}
              </label>
              <textarea 
                id="swal-description" 
                class="swal2-textarea" 
                style="width:100%;margin:0;text-align:right;direction:rtl;min-height:100px;"
                placeholder="${t.value('roleManagement.editRole.descriptionPlaceholder')}"
              >${role.description || ''}</textarea>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: t.value('common.save'),
        cancelButtonText: t.value('common.cancel'),
        confirmButtonColor: '#b78a41',
        cancelButtonColor: '#6b7280',
        customClass: {
          popup: 'swal-rtl-popup',
          title: 'swal-rtl-title',
          htmlContainer: 'swal-rtl-content'
        },
        preConfirm: () => {
          const displayName = (document.getElementById('swal-display-name') as HTMLInputElement)?.value
          const description = (document.getElementById('swal-description') as HTMLTextAreaElement)?.value
          return { display_name: displayName, description }
        }
      })
      
      if (editResult.isConfirmed && editResult.value) {
        try {
          await roleManagementService.updateRole(role.id, editResult.value)
          await Swal.fire({
            title: t.value('roleManagement.editRole.success'),
            icon: 'success',
            confirmButtonText: t.value('common.ok'),
            confirmButtonColor: '#10b981',
            timer: 2000
          })
          // Refresh roles data
          await loadRolesData()
        } catch (error) {
          console.error('Error updating role:', error)
          await Swal.fire({
            title: t.value('roleManagement.editRole.error'),
            icon: 'error',
            confirmButtonText: t.value('common.ok'),
            confirmButtonColor: '#ef4444'
          })
        }
      }
      break
    case 'delete':
      if (role.is_system_role) {
        await Swal.fire({
          title: t.value('roleManagement.errors.cannotDeleteSystem'),
          icon: 'warning',
          confirmButtonText: t.value('common.ok'),
          confirmButtonColor: '#ffc107'
        })
        return
      }
      if (role.users_count > 0) {
        await Swal.fire({
          title: t.value('roleManagement.errors.cannotDeleteWithUsers'),
          text: t.value('roleManagement.errors.usersAssigned').replace('{{count}}', String(role.users_count)),
          icon: 'warning',
          confirmButtonText: t.value('common.ok'),
          confirmButtonColor: '#ffc107'
        })
        return
      }
      // Confirm delete
      const result = await Swal.fire({
        title: t.value('roleManagement.confirmDelete.title'),
        text: t.value('roleManagement.confirmDelete.text').replace('{{name}}', role.display_name || role.name),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t.value('common.delete'),
        cancelButtonText: t.value('common.cancel'),
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d'
      })
      
      if (result.isConfirmed) {
        try {
          await roleManagementService.deleteRole(role.id)
          await loadRolesData()
          await Swal.fire({
            title: t.value('roleManagement.deleteSuccess'),
            icon: 'success',
            confirmButtonText: t.value('common.ok'),
            confirmButtonColor: '#28a745'
          })
        } catch (err: any) {
          await Swal.fire({
            title: t.value('roleManagement.errors.deleteFailed'),
            text: roleManagementService.getErrorMessage(err),
            icon: 'error',
            confirmButtonText: t.value('common.ok'),
            confirmButtonColor: '#dc3545'
          })
        }
      }
      break
  }
}

const openAssignPermissionModal = (role: RoleWithPermissions) => {
  selectedRoleForPermissions.value = role
  assignPermissionModalVisible.value = true
}

const closeAssignPermissionModal = () => {
  assignPermissionModalVisible.value = false
  selectedRoleForPermissions.value = null
  assignPermissionLoading.value = false
}

// Assign Users to Role Modal Functions
const openAssignUsersToRoleModal = async (role: RoleWithPermissions) => {
  selectedRoleForAssignUsers.value = role
  assignUsersToRoleModalVisible.value = true
  
  try {
    loadingAssignableUsers.value = true
    const response = await getAssignableUsers()
    assignableUsers.value = response.users
  } catch (err) {
    console.error('Error loading assignable users:', err)
  } finally {
    loadingAssignableUsers.value = false
  }
}

const closeAssignUsersToRoleModal = () => {
  assignUsersToRoleModalVisible.value = false
  selectedRoleForAssignUsers.value = null
  assignUsersToRoleLoading.value = false
}

const handleAssignUsersToRoleSuccess = async () => {
  // Refresh both users and roles data
  await Promise.all([initialize(), loadRolesData()])
  closeAssignUsersToRoleModal()
}

const handleAssignPermissionsSave = async (data: { role_id: number; page_names: string[] }) => {
  try {
    assignPermissionLoading.value = true
    
    // Use the replace endpoint to set all pages at once
    await roleManagementService.replacePagesForRole(data.role_id, {
      page_names: data.page_names
    })
    
    // Reload roles data
    await loadRolesData()
    
    // Close modal
    closeAssignPermissionModal()
    
    // Show success
    await Swal.fire({
      title: t.value('roleManagement.permissionsSaved'),
      icon: 'success',
      confirmButtonText: t.value('common.ok'),
      confirmButtonColor: '#28a745',
      timer: 2000,
      showConfirmButton: false
    })
  } catch (err: any) {
    assignPermissionLoading.value = false
    await Swal.fire({
      title: t.value('roleManagement.errors.saveFailed'),
      text: roleManagementService.getErrorMessage(err),
      icon: 'error',
      confirmButtonText: t.value('common.ok'),
      confirmButtonColor: '#dc3545'
    })
  }
}

// Lifecycle
onMounted(() => {
  initialize()
})
</script>

<style module src="./UserManagement.module.css">
/* CSS Module styles are imported from UserManagement.module.css */
</style>
