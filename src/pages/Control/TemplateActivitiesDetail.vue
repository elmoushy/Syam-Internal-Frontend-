<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExcelJS from 'exceljs'
import SidePanel from '@/components/shared/SidePanel.vue'
import { titleService, type AdminTemplateActivitiesResponse, type AdminTemplateActivity, type AdminTemplateUser, type AdminTemplateActivitiesExportResponse, type AdminTemplateExportActivity } from '@/services/activityService'

const route = useRoute()
const router = useRouter()

// Get the template ID from the route params
const templateId = computed(() => Number(route.params.id))

// Tab state
const activeTab = ref<'users' | 'activities'>('users')

// Loading and error states
const isLoading = ref(false)
const error = ref<string | null>(null)

// Data from API
const templateInfo = ref<{ id: number; name: string; description: string; status: string } | null>(null)
const activities = ref<AdminTemplateActivity[]>([])
const columns = ref<Array<{ id: number; key: string; label: string; data_type: string; order: number }>>([])
const users = ref<AdminTemplateUser[]>([])

// User view state - for showing user's activities in table
const selectedUserForTable = ref<AdminTemplateUser | null>(null)
const userActivities = ref<AdminTemplateActivity[]>([])
const isLoadingUserActivities = ref(false)

// Filters
const selectedUserId = ref<number | null>(null)
const searchQuery = ref('')
const statusFilter = ref<'' | 'submitted' | 'draft' | 'all'>('submitted')  // Default to submitted only

// Users tab search
const usersSearchQuery = ref('')

// Pagination
const pagination = ref({
  page: 1,
  page_size: 20,
  total_count: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false
})

// Side panel state
const isPanelOpen = ref(false)
const selectedActivity = ref<AdminTemplateActivity | null>(null)

// Format date for display
const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format short date
const formatShortDate = (dateString: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Load users from API (for users tab)
const loadUsers = async () => {
  if (!templateId.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    const response = await titleService.getAdminTemplateUsers(
      templateId.value,
      {
        search: usersSearchQuery.value || undefined
      }
    )
    
    templateInfo.value = response.template
    users.value = response.users
  } catch (err: any) {
    console.error('Failed to load users:', err)
    error.value = err.response?.data?.error || 'فشل في تحميل المستخدمين'
  } finally {
    isLoading.value = false
  }
}

// Load activities from API
const loadActivities = async (page: number = 1) => {
  if (!templateId.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    const response: AdminTemplateActivitiesResponse = await titleService.getAdminTemplateActivities(
      templateId.value,
      {
        user_id: selectedUserId.value || undefined,
        search: searchQuery.value || undefined,
        status: statusFilter.value || undefined,
        page,
        page_size: pagination.value.page_size
      }
    )
    
    templateInfo.value = response.template
    activities.value = response.activities
    columns.value = response.columns
    users.value = response.users
    pagination.value = response.pagination
  } catch (err: any) {
    console.error('Failed to load activities:', err)
    error.value = err.response?.data?.error || 'فشل في تحميل الأنشطة'
  } finally {
    isLoading.value = false
  }
}

// Load user's activities for table view
const loadUserActivities = async (user: AdminTemplateUser) => {
  if (!templateId.value) return
  
  selectedUserForTable.value = user
  isLoadingUserActivities.value = true
  
  try {
    const response: AdminTemplateActivitiesResponse = await titleService.getAdminTemplateActivities(
      templateId.value,
      {
        user_id: user.id,
        status: 'submitted',
        page: 1,
        page_size: 100 // Load all user activities for table
      }
    )
    
    userActivities.value = response.activities
    columns.value = response.columns
  } catch (err: any) {
    console.error('Failed to load user activities:', err)
    error.value = err.response?.data?.error || 'فشل في تحميل أنشطة المستخدم'
  } finally {
    isLoadingUserActivities.value = false
  }
}

// Handle user card click - show table view
const handleUserCardClick = (user: AdminTemplateUser) => {
  loadUserActivities(user)
}

// Go back from table view to user cards
const goBackToUserCards = () => {
  selectedUserForTable.value = null
  userActivities.value = []
}

const handleCardClick = (activity: AdminTemplateActivity) => {
  selectedActivity.value = activity
  isPanelOpen.value = true
}

const handleClosePanel = () => {
  isPanelOpen.value = false
  selectedActivity.value = null
}

const goBack = () => {
  router.push('/control/templates')
}

// Handle search in activities tab
const handleSearch = () => {
  pagination.value.page = 1
  loadActivities(1)
}

// Handle search in users tab
const handleUsersSearch = () => {
  loadUsers()
}

// Handle user filter in users tab (auto-load user's activities)
const handleUsersFilterChange = () => {
  if (selectedUserId.value) {
    const user = users.value.find(u => u.id === selectedUserId.value)
    if (user) {
      handleUserCardClick(user)
    }
  }
}

// Handle user filter change in activities tab
const handleUserFilterChange = () => {
  pagination.value.page = 1
  loadActivities(1)
}

// Clear filters (activities tab)
const clearFilters = () => {
  selectedUserId.value = null
  searchQuery.value = ''
  statusFilter.value = 'submitted'  // Reset to default: submitted only
  pagination.value.page = 1
  loadActivities(1)
}

// Clear filters (users tab)
const clearUsersFilters = () => {
  usersSearchQuery.value = ''
  selectedUserId.value = null
  selectedUserForTable.value = null
  userActivities.value = []
  loadUsers()
}

// Pagination handlers
const goToPage = (page: number) => {
  if (page >= 1 && page <= pagination.value.total_pages) {
    loadActivities(page)
  }
}

// Get activity column value by key
const getColumnValue = (activity: AdminTemplateActivity, colKey: string): string => {
  return activity.data?.[colKey] || ''
}

// Get style for a cell (from activity styles)
const getCellStyle = (activity: AdminTemplateActivity, colKey: string): Record<string, string> => {
  const style: Record<string, string> = {}
  const cellStyle = activity.styles?.[colKey]
  if (cellStyle) {
    if (cellStyle.backgroundColor) style.backgroundColor = cellStyle.backgroundColor
    if (cellStyle.color) style.color = cellStyle.color
    if (cellStyle.fontWeight) style.fontWeight = cellStyle.fontWeight
    if (cellStyle.textAlign) style.textAlign = cellStyle.textAlign
  }
  return style
}

// ============================================================================
// EXCEL EXPORT FUNCTIONALITY
// ============================================================================

// Export state
const isExporting = ref(false)
const exportProgress = ref({ current: 0, total: 0, percentage: 0 })

// Create Excel workbook from scratch with header image
const createExcelWorkbook = async (
  exportActivities: AdminTemplateExportActivity[],
  exportColumns: Array<{ id: number; key: string; label: string; data_type: string; order: number }>,
  templateName: string
): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'NCEMA Activities System'
  workbook.created = new Date()
  
  // Use template name for sheet
  const sheetDisplayName = templateName || 'الأنشطة'
  const worksheet = workbook.addWorksheet(sheetDisplayName, {
    views: [{ rightToLeft: true }] // RTL for Arabic
  })
  
  // Build dynamic column headers from columns + author column
  const excelHeaders = [
    ...exportColumns.map(col => ({
      key: col.key,
      header: col.label,
      width: 25 // Default width
    })),
    { key: 'author', header: 'المستخدم', width: 20 },
    { key: 'submitted_at', header: 'تاريخ التقديم', width: 18 }
  ]
  
  const columnCount = excelHeaders.length
  
  // Set column widths
  excelHeaders.forEach((col, index) => {
    worksheet.getColumn(index + 1).width = col.width
  })
  
  // Get last column letter for merging
  const getColumnLetter = (colNum: number): string => {
    let letter = ''
    while (colNum > 0) {
      const remainder = (colNum - 1) % 26
      letter = String.fromCharCode(65 + remainder) + letter
      colNum = Math.floor((colNum - 1) / 26)
    }
    return letter
  }
  const lastColLetter = getColumnLetter(columnCount)
  
  // ROW 1: Header with logo image
  worksheet.mergeCells(`A1:${lastColLetter}1`)
  worksheet.getRow(1).height = 70
  
  // Add white background to merged header cell
  const headerCell = worksheet.getCell('A1')
  headerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFFF' } // White background
  }
  
  // Try to add header image with actual dimensions
  try {
    const imageResponse = await fetch('/excel_header.png')
    if (imageResponse.ok) {
      const imageBuffer = await imageResponse.arrayBuffer()
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: 'png',
      })
      
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 590, height: 91 }
      })
    }
  } catch (error) {
    console.warn('Could not load header image:', error)
    headerCell.value = 'الإمارات العربية المتحدة - المجلس الأعلى للأمن الوطني'
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' }
    headerCell.font = { bold: true, size: 16 }
  }
  
  // ROW 2: Column headers with blue background
  const headerRow = worksheet.getRow(2)
  headerRow.height = 35
  
  excelHeaders.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = col.header
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' } // Dark blue background
    }
    cell.font = {
      color: { argb: 'FFFFFFFF' }, // White text
      bold: true,
      size: 11
    }
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF2D4A6F' } },
      left: { style: 'thin', color: { argb: 'FF2D4A6F' } },
      bottom: { style: 'thin', color: { argb: 'FF2D4A6F' } },
      right: { style: 'thin', color: { argb: 'FF2D4A6F' } }
    }
  })
  
  // Add data rows starting from row 3
  let currentRow = 3
  
  exportActivities.forEach(activity => {
    const dataRow = worksheet.getRow(currentRow)
    dataRow.height = 25
    
    excelHeaders.forEach((col, index) => {
      const cell = dataRow.getCell(index + 1)
      
      // Get value based on column key
      if (col.key === 'author') {
        cell.value = activity.author || ''
      } else if (col.key === 'submitted_at') {
        cell.value = activity.submitted_at 
          ? new Date(activity.submitted_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
          : '-'
      } else {
        cell.value = activity.data?.[col.key] || ''
      }
      
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
      }
      
      // Alternate row background
      if (currentRow % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' } // Light gray for odd rows
        }
      }
    })
    
    currentRow++
  })
  
  // Enable AutoFilter on header row (row 2)
  worksheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: columnCount }
  }
  
  return workbook
}

// Fetch all activities in batches for export
const fetchAllActivitiesForExport = async (userId?: number): Promise<{
  activities: AdminTemplateExportActivity[]
  columns: Array<{ id: number; key: string; label: string; data_type: string; order: number }>
  templateName: string
}> => {
  const BATCH_SIZE = 100
  const allActivities: AdminTemplateExportActivity[] = []
  let exportColumns: Array<{ id: number; key: string; label: string; data_type: string; order: number }> = []
  let templateName = ''
  let page = 1
  let hasMore = true
  
  // First fetch to get total count and columns
  const firstResponse = await titleService.getAdminTemplateActivitiesExport(
    templateId.value,
    {
      user_id: userId || undefined,
      status: 'submitted',
      page: 1,
      page_size: BATCH_SIZE
    }
  )
  
  allActivities.push(...firstResponse.activities)
  exportColumns = firstResponse.columns
  templateName = firstResponse.template.name
  exportProgress.value.total = firstResponse.export_info.total_count
  exportProgress.value.current = firstResponse.activities.length
  exportProgress.value.percentage = Math.round((exportProgress.value.current / exportProgress.value.total) * 100)
  hasMore = firstResponse.export_info.has_more
  page = 2
  
  // Fetch remaining batches if needed
  while (hasMore) {
    const response = await titleService.getAdminTemplateActivitiesExport(
      templateId.value,
      {
        user_id: userId || undefined,
        status: 'submitted',
        page,
        page_size: BATCH_SIZE
      }
    )
    
    allActivities.push(...response.activities)
    exportProgress.value.current += response.activities.length
    exportProgress.value.percentage = Math.round((exportProgress.value.current / exportProgress.value.total) * 100)
    hasMore = response.export_info.has_more
    page++
    
    // Small delay to prevent overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  return { activities: allActivities, columns: exportColumns, templateName }
}

// Export user's activities to Excel
const exportUserActivitiesToExcel = async () => {
  if (!selectedUserForTable.value || isExporting.value) return
  
  isExporting.value = true
  exportProgress.value = { current: 0, total: 0, percentage: 0 }
  
  try {
    // Fetch all activities for the selected user
    const { activities, columns: exportColumns, templateName } = await fetchAllActivitiesForExport(selectedUserForTable.value.id)
    
    if (activities.length === 0) {
      error.value = 'لا توجد بيانات للتصدير'
      return
    }
    
    // Create workbook
    const workbook = await createExcelWorkbook(activities, exportColumns, templateName)
    
    // Generate filename
    const userName = selectedUserForTable.value.full_name || selectedUserForTable.value.username
    const date = new Date().toISOString().split('T')[0]
    const filename = `أنشطة_${userName}_${date}.xlsx`
    
    // Download file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
    
  } catch (err: any) {
    console.error('Export failed:', err)
    error.value = err.response?.data?.error || 'فشل في تصدير البيانات'
  } finally {
    isExporting.value = false
    exportProgress.value = { current: 0, total: 0, percentage: 0 }
  }
}

// Watch for route changes
watch(templateId, (newVal) => {
  if (newVal) {
    loadActivities()
  }
})

// Watch for tab change
watch(activeTab, (newTab) => {
  // Reset user table view and filters when switching tabs
  selectedUserForTable.value = null
  userActivities.value = []
  selectedUserId.value = null
  
  // Load appropriate data for the active tab
  if (newTab === 'users') {
    loadUsers()
  } else if (newTab === 'activities') {
    loadActivities()
  }
})

onMounted(() => {
  // Load users by default (users tab is default)
  loadUsers()
})
</script>

<template>
  <div :class="$style.container">
    <!-- Page Header -->
    <div :class="$style.pageHeader">
      <div :class="$style.breadcrumb">
        <span :class="$style.breadcrumbLink" @click="goBack">إدارة النماذج</span>
        <span :class="$style.breadcrumbSeparator">/</span>
        <span :class="$style.breadcrumbCurrent">{{ templateInfo?.name || 'جاري التحميل...' }}</span>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div :class="$style.tabsContainer">
      <button
        :class="[$style.tabButton, activeTab === 'users' && $style.tabButtonActive]"
        @click="activeTab = 'users'"
      >
        <i class="fas fa-users"></i>
        المستخدمين
      </button>
      <button
        :class="[$style.tabButton, activeTab === 'activities' && $style.tabButtonActive]"
        @click="activeTab = 'activities'"
      >
        <i class="fas fa-list-check"></i>
        جميع الأنشطة
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" :class="$style.errorMessage">
      <i class="fas fa-exclamation-circle"></i>
      {{ error }}
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" :class="$style.loadingState">
      <i class="fas fa-spinner fa-spin"></i>
      <span>جاري تحميل البيانات...</span>
    </div>

    <!-- ========== USERS TAB CONTENT ========== -->
    <template v-else-if="activeTab === 'users'">
      <!-- Filters Section for Users Tab -->
      <div :class="$style.filtersSection">
        <div :class="$style.filtersRow">
          <!-- Search Input -->
          <div :class="$style.searchContainer">
            <i class="fas fa-search" :class="$style.searchIcon"></i>
            <input
              v-model="usersSearchQuery"
              type="text"
              :class="$style.searchInput"
              placeholder="بحث في المستخدمين..."
              @keyup.enter="handleUsersSearch"
            />
            <button v-if="usersSearchQuery" :class="$style.clearSearchBtn" @click="usersSearchQuery = ''; handleUsersSearch()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- User Filter Dropdown -->
          <div :class="$style.filterDropdown">
            <select v-model="selectedUserId" @change="handleUsersFilterChange" :class="$style.filterSelect">
              <option :value="null">اختر مستخدم</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.full_name }} ({{ user.username }})
              </option>
            </select>
          </div>

          <!-- Clear Filters Button -->
          <button 
            v-if="usersSearchQuery || selectedUserId"
            :class="$style.clearFiltersBtn" 
            @click="clearUsersFilters"
          >
            <i class="fas fa-filter-circle-xmark"></i>
            مسح الفلاتر
          </button>
        </div>

        <!-- Results Count -->
        <div :class="$style.resultsCount">
          <span>{{ users.length }} مستخدم</span>
        </div>
      </div>

      <!-- User Table View - When a user is selected -->
      <div v-if="selectedUserForTable" :class="$style.userTableView">
        <!-- Back Button and Header -->
        <div :class="$style.tableHeader">
          <button :class="$style.backButton" @click="goBackToUserCards">
            <i class="fas fa-arrow-right"></i>
            العودة للمستخدمين
          </button>
          <div :class="$style.tableHeaderInfo">
            <div :class="$style.userBadge">
              <i class="fas fa-user"></i>
              {{ selectedUserForTable.full_name }}
            </div>
            <span :class="$style.activityCount">{{ userActivities.length }} نشاط مقدم</span>
          </div>
          <!-- Export Button -->
          <button 
            :class="[$style.exportButton, isExporting && $style.exportButtonLoading]"
            @click="exportUserActivitiesToExcel"
            :disabled="isExporting || userActivities.length === 0"
          >
            <i :class="isExporting ? 'fas fa-spinner fa-spin' : 'fas fa-file-excel'"></i>
            <span v-if="isExporting && exportProgress.total > 0">
              {{ exportProgress.percentage }}% ({{ exportProgress.current }}/{{ exportProgress.total }})
            </span>
            <span v-else-if="isExporting">جاري التحميل...</span>
            <span v-else>تصدير Excel</span>
          </button>
        </div>

        <!-- Loading User Activities -->
        <div v-if="isLoadingUserActivities" :class="$style.loadingState">
          <i class="fas fa-spinner fa-spin"></i>
          <span>جاري تحميل أنشطة المستخدم...</span>
        </div>

        <!-- Excel-like Table -->
        <div v-else-if="userActivities.length > 0" :class="$style.excelTableContainer">
          <div :class="$style.tableWrapper">
            <table :class="$style.excelTable">
              <thead>
                <tr>
                  <th :class="$style.rowNumberHeader">#</th>
                  <th v-for="column in columns" :key="column.key" :class="$style.columnHeader">
                    {{ column.label }}
                  </th>
                  <th :class="$style.columnHeader">تاريخ التقديم</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(activity, index) in userActivities" 
                  :key="activity.id"
                  :class="$style.tableRow"
                  @click="handleCardClick(activity)"
                >
                  <td :class="$style.rowNumber">{{ index + 1 }}</td>
                  <td 
                    v-for="column in columns" 
                    :key="column.key"
                    :class="$style.tableCell"
                    :style="getCellStyle(activity, column.key)"
                  >
                    {{ getColumnValue(activity, column.key) || '-' }}
                  </td>
                  <td :class="$style.tableCell">{{ formatShortDate(activity.submitted_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- No Activities for User -->
        <div v-else :class="$style.emptyState">
          <div :class="$style.emptyIcon"><i class="fas fa-folder-open"></i></div>
          <p :class="$style.emptyText">لا توجد أنشطة مقدمة</p>
          <p :class="$style.emptyDesc">هذا المستخدم لم يقدم أي أنشطة بعد</p>
        </div>
      </div>

      <!-- User Cards Grid - When no user is selected -->
      <div v-else :class="$style.mainContent">
        <!-- Empty State -->
        <div v-if="users.length === 0" :class="$style.emptyState">
          <div :class="$style.emptyIcon"><i class="fas fa-users-slash"></i></div>
          <p :class="$style.emptyText">لا يوجد مستخدمين</p>
          <p :class="$style.emptyDesc">لم يقم أي مستخدم بتقديم أنشطة لهذا القالب</p>
        </div>

        <div v-else :class="$style.usersGrid">
          <div 
            v-for="user in users" 
            :key="user.id"
            :class="$style.userCard"
            @click="handleUserCardClick(user)"
          >
            <div :class="$style.userAvatar">
              <i class="fas fa-user"></i>
            </div>
            <div :class="$style.userInfo">
              <h3 :class="$style.userName">{{ user.full_name }}</h3>
              <p :class="$style.userUsername">@{{ user.username }}</p>
            </div>
            <div :class="$style.submissionCount">
              <span :class="$style.countNumber">{{ user.submitted_count }}</span>
              <span :class="$style.countLabel">نشاط مقدم</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== ACTIVITIES TAB CONTENT ========== -->
    <template v-else-if="activeTab === 'activities'">
      <!-- Filters Section -->
      <div :class="$style.filtersSection">
        <div :class="$style.filtersRow">
          <!-- Search Input -->
          <div :class="$style.searchContainer">
            <i class="fas fa-search" :class="$style.searchIcon"></i>
            <input
              v-model="searchQuery"
              type="text"
              :class="$style.searchInput"
              placeholder="بحث في الأنشطة..."
              @keyup.enter="handleSearch"
            />
            <button v-if="searchQuery" :class="$style.clearSearchBtn" @click="searchQuery = ''; handleSearch()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- User Filter Dropdown -->
          <div :class="$style.filterDropdown">
            <select v-model="selectedUserId" @change="handleUserFilterChange" :class="$style.filterSelect">
              <option :value="null">جميع المستخدمين</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.full_name }} ({{ user.username }})
              </option>
            </select>
          </div>

          <!-- Clear Filters Button -->
          <button 
            v-if="searchQuery || selectedUserId || statusFilter !== 'submitted'"
            :class="$style.clearFiltersBtn" 
            @click="clearFilters"
          >
            <i class="fas fa-filter-circle-xmark"></i>
            مسح الفلاتر
          </button>
        </div>

        <!-- Results Count -->
        <div :class="$style.resultsCount">
          <span>{{ pagination.total_count }} نشاط</span>
        </div>
      </div>

      <!-- Activities Content -->
      <div :class="$style.mainContent">
        <!-- Empty State -->
        <div v-if="activities.length === 0" :class="$style.emptyState">
          <div :class="$style.emptyIcon"><i class="fas fa-folder-open"></i></div>
          <p :class="$style.emptyText">لا توجد أنشطة</p>
          <p :class="$style.emptyDesc">لم يتم العثور على أنشطة لهذا القالب</p>
        </div>

        <div v-else :class="$style.activitiesGrid">
          <div 
            v-for="activity in activities" 
            :key="activity.id"
            :class="$style.activityCard"
            @click="handleCardClick(activity)"
          >
            <!-- Card Content -->
            <div :class="$style.cardBody">
              <div :class="$style.cardHeader">
                <h3 :class="$style.cardTitle">{{ activity.title }}</h3>
                <span 
                  :class="[
                    $style.statusBadge,
                    activity.status === 'draft' ? $style.statusDraft : $style.statusSubmitted
                  ]"
                >
                  {{ activity.status === 'draft' ? 'مسودة' : 'تم التقديم' }}
                </span>
              </div>
              <p :class="$style.cardDesc">{{ activity.description || 'لا يوجد وصف' }}</p>
            </div>

            <!-- Card Footer -->
            <div :class="$style.cardFooter">
              <div :class="$style.cardDate">
                <i class="fas fa-clock"></i>
                {{ formatDate(activity.updated_at) }}
              </div>
              <div :class="$style.cardAuthor">
                <i class="fas fa-user"></i>
                {{ activity.author }}
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.total_pages > 1" :class="$style.paginationContainer">
          <button 
            :class="$style.paginationBtn"
            :disabled="!pagination.has_prev"
            @click="goToPage(pagination.page - 1)"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
          
          <span :class="$style.paginationInfo">
            صفحة {{ pagination.page }} من {{ pagination.total_pages }}
          </span>
          
          <button 
            :class="$style.paginationBtn"
            :disabled="!pagination.has_next"
            @click="goToPage(pagination.page + 1)"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
        </div>
      </div>
    </template>

    <!-- Side Panel -->
    <SidePanel 
      v-model:isOpen="isPanelOpen" 
      :title="selectedActivity?.title || 'تفاصيل النشاط'"
      @close="handleClosePanel"
    >
      <div v-if="selectedActivity" :class="$style.panelContent">
        <!-- Activity Owner Info -->
        <div :class="$style.ownerSection">
          <div :class="$style.ownerAvatar">
            <i class="fas fa-user"></i>
          </div>
          <div :class="$style.ownerInfo">
            <span :class="$style.ownerName">{{ selectedActivity.author }}</span>
            <span :class="$style.ownerUsername">@{{ selectedActivity.owner_username }}</span>
          </div>
        </div>

        <!-- Activity Details Sections - Dynamic from columns -->
        <div :class="$style.detailsContainer">
          <template v-for="column in columns" :key="column.key">
            <div v-if="getColumnValue(selectedActivity, column.key)" :class="$style.detailSection">
              <h3 :class="$style.sectionTitle">{{ column.label }}</h3>
              <div :class="$style.detailItem">
                <span :class="$style.itemValue">{{ getColumnValue(selectedActivity, column.key) }}</span>
              </div>
            </div>
          </template>

          <!-- System Info Section -->
          <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">معلومات النظام</h3>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">المستخدم</span>
              <span :class="$style.itemValue">{{ selectedActivity.author }}</span>
            </div>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">تاريخ الإنشاء</span>
              <span :class="$style.itemValue">{{ formatDate(selectedActivity.created_at) }}</span>
            </div>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">آخر تحديث</span>
              <span :class="$style.itemValue">{{ formatDate(selectedActivity.updated_at) }}</span>
            </div>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">الحالة</span>
              <span :class="[$style.itemValue, selectedActivity.is_submitted ? $style.greenText : $style.orangeText]">
                {{ selectedActivity.is_submitted ? 'تم التقديم' : 'مسودة' }}
              </span>
            </div>
            <div v-if="selectedActivity.submitted_at" :class="$style.detailItem">
              <span :class="$style.itemLabel">تاريخ التقديم</span>
              <span :class="$style.itemValue">{{ formatDate(selectedActivity.submitted_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </SidePanel>
  </div>
</template>

<style module>
.container {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 80px);
  background: #f5f5f5;
  direction: rtl;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
  padding: 24px 40px;
}

/* ==================== PAGE HEADER ==================== */
.pageHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 32px;
  font-weight: 400;
}

.breadcrumbLink {
  color: #A17D23;
  cursor: pointer;
  transition: all 0.2s ease;
}

.breadcrumbLink:hover {
  text-decoration: underline;
}

.breadcrumbSeparator {
  color: #999;
}

.breadcrumbCurrent {
  color: #121011;
  font-weight: 400;
}

/* ==================== TABS ==================== */
.tabsContainer {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  background: white;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tabButton {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #717784;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
}

.tabButton:hover {
  background: #FFF8ED;
  color: #A17D23;
}

.tabButtonActive {
  background: #A17D23;
  color: white;
}

.tabButtonActive:hover {
  background: #8B6B1E;
  color: white;
}

/* ==================== USERS GRID ==================== */
.usersGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.userCard {
  position: relative;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
  text-align: center;
}

.userCard:hover {
  box-shadow: 0 8px 24px rgba(161, 125, 35, 0.15);
  border-color: #A17D23;
  transform: translateY(-4px);
}

.userAvatar {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #A17D23 0%, #C9A53A 100%);
  border-radius: 50%;
  color: white;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(161, 125, 35, 0.3);
}

.userInfo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.userName {
  font-size: 18px;
  font-weight: 700;
  color: #0E121B;
  margin: 0;
}

.userUsername {
  font-size: 14px;
  color: #717784;
  margin: 0;
}

.submissionCount {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 24px;
  background: #FFF8ED;
  border-radius: 12px;
  border: 1px solid #F3D6A7;
}

.countNumber {
  font-size: 32px;
  font-weight: 700;
  color: #A17D23;
  line-height: 1;
}

.countLabel {
  font-size: 13px;
  color: #8B6B1E;
  font-weight: 500;
}

/* ==================== USER TABLE VIEW ==================== */
.userTableView {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tableHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E1E4EA;
}

.backButton {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #FFF8ED;
  border: 1px solid #F3D6A7;
  border-radius: 8px;
  color: #A17D23;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
}

.backButton:hover {
  background: #A17D23;
  color: white;
}

.tableHeaderInfo {
  display: flex;
  align-items: center;
  gap: 16px;
}

.userBadge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #A17D23 0%, #C9A53A 100%);
  border-radius: 20px;
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.activityCount {
  font-size: 14px;
  color: #717784;
}

/* ==================== EXPORT BUTTON ==================== */
.exportButton {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #1D6F42 0%, #28A745 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
  margin-right: auto;
}

.exportButton:hover:not(:disabled) {
  background: linear-gradient(135deg, #155D32 0%, #1E7E34 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(29, 111, 66, 0.3);
}

.exportButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.exportButtonLoading {
  background: linear-gradient(135deg, #6c757d 0%, #868e96 100%);
}

.exportButton i {
  font-size: 16px;
}

/* ==================== EXCEL TABLE ==================== */
.excelTableContainer {
  border: 1px solid #E1E4EA;
  border-radius: 12px;
  overflow: hidden;
}

.tableWrapper {
  overflow-x: auto;
}

.excelTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.excelTable thead {
  background: linear-gradient(135deg, #A17D23 0%, #8B6B1E 100%);
}

.rowNumberHeader,
.columnHeader {
  padding: 14px 16px;
  text-align: right;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
}

.rowNumberHeader {
  width: 50px;
  text-align: center;
  background: #8B6B1E;
}

.columnHeader:last-child {
  border-left: none;
}

.tableRow {
  transition: all 0.15s ease;
  cursor: pointer;
}

.tableRow:nth-child(even) {
  background: #FAFAFA;
}

.tableRow:hover {
  background: #FFF8ED;
}

.rowNumber {
  padding: 12px 16px;
  text-align: center;
  font-weight: 600;
  color: #A17D23;
  background: #FFF8ED;
  border-left: 1px solid #E1E4EA;
  border-bottom: 1px solid #E1E4EA;
}

.tableCell {
  padding: 12px 16px;
  text-align: right;
  color: #0E121B;
  border-left: 1px solid #E1E4EA;
  border-bottom: 1px solid #E1E4EA;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tableCell:last-child {
  border-left: none;
}

/* ==================== FILTERS SECTION ==================== */
.filtersSection {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filtersRow {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.searchContainer {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.searchIcon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #717784;
  font-size: 14px;
}

.searchInput {
  width: 100%;
  padding: 12px 44px 12px 40px;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  font-size: 14px;
  color: #0E121B;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
  transition: all 0.2s ease;
}

.searchInput::placeholder {
  color: #717784;
}

.searchInput:focus {
  outline: none;
  border-color: #A17D23;
  box-shadow: 0 0 0 3px rgba(161, 125, 35, 0.1);
}

.clearSearchBtn {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #717784;
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
}

.clearSearchBtn:hover {
  color: #D44333;
}

.filterDropdown {
  min-width: 180px;
}

.filterSelect {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  font-size: 14px;
  color: #0E121B;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filterSelect:focus {
  outline: none;
  border-color: #A17D23;
  box-shadow: 0 0 0 3px rgba(161, 125, 35, 0.1);
}

.clearFiltersBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #FFF5F5;
  border: 1px solid #FADBD7;
  border-radius: 8px;
  color: #D44333;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
}

.clearFiltersBtn:hover {
  background: #FED7D2;
}

.resultsCount {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E1E4EA;
  font-size: 14px;
  color: #717784;
}

/* ==================== MAIN CONTENT ==================== */
.mainContent {
  background: white;
  border-radius: 16px;
  padding: 24px;
  flex: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* ==================== ACTIVITIES GRID ==================== */
.activitiesGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .activitiesGrid {
    grid-template-columns: 1fr;
  }
  
  .usersGrid {
    grid-template-columns: 1fr;
  }
}

.activityCard {
  position: relative;
  background: white;
  border: 0.5px solid #E1E4EA;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.activityCard:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* ==================== CARD HEADER ==================== */
.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.statusBadge {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.statusDraft {
  background: #FFF8ED;
  color: #A17D23;
  border: 1px solid #F3D6A7;
}

.statusSubmitted {
  background: #E8F5E9;
  color: #2E7D32;
  border: 1px solid #A5D6A7;
}

/* ==================== CARD BODY ==================== */
.cardBody {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.cardTitle {
  font-size: 18px;
  font-weight: 700;
  color: #0E121B;
  margin: 0;
}

.cardDesc {
  font-size: 14px;
  color: #717784;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ==================== CARD FOOTER ==================== */
.cardFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #E1E4EA;
  font-size: 13px;
  color: #717784;
}

.cardAuthor,
.cardDate {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cardAuthor i,
.cardDate i {
  font-size: 12px;
  color: #A17D23;
}

/* ==================== OWNER SECTION (Side Panel) ==================== */
.ownerSection {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #FFF8ED;
  border-radius: 12px;
  margin-bottom: 20px;
}

.ownerAvatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #A17D23;
  border-radius: 50%;
  color: white;
  font-size: 20px;
}

.ownerInfo {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ownerName {
  font-size: 16px;
  font-weight: 600;
  color: #0E121B;
}

.ownerUsername {
  font-size: 13px;
  color: #717784;
}

/* ==================== SIDE PANEL CONTENT ==================== */
.panelContent {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.detailsContainer {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.detailSection {
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.detailSection:last-child {
  margin-bottom: 0;
}

.sectionTitle {
  font-size: 16px;
  font-weight: 700;
  color: #0E121B;
  margin: 0 0 16px 0;
}

.detailItem {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.detailItem:last-child {
  margin-bottom: 0;
}

.itemLabel {
  font-size: 13px;
  color: #717784;
  font-weight: 500;
}

.itemValue {
  font-size: 14px;
  color: #0E121B;
  line-height: 1.6;
}

.itemValue p {
  margin: 0;
}

.greenText {
  color: #2E7D32 !important;
  font-weight: 600;
}

.orangeText {
  color: #A17D23 !important;
  font-weight: 600;
}

/* ==================== LOADING & ERROR STATES ==================== */
.loadingState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  gap: 16px;
  color: #717784;
  font-size: 16px;
}

.loadingState i {
  font-size: 32px;
  color: #A17D23;
}

.errorMessage {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #FFF5F5;
  border: 1px solid #FADBD7;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #D44333;
  font-size: 14px;
}

.errorMessage i {
  font-size: 18px;
}

/* ==================== EMPTY STATE ==================== */
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.emptyIcon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF8ED;
  border-radius: 50%;
  margin-bottom: 24px;
}

.emptyIcon i {
  font-size: 32px;
  color: #A17D23;
}

.emptyText {
  font-size: 18px;
  font-weight: 600;
  color: #0E121B;
  margin: 0 0 8px 0;
}

.emptyDesc {
  font-size: 14px;
  color: #717784;
  margin: 0;
}

/* ==================== PAGINATION ==================== */
.paginationContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #E1E4EA;
}

.paginationBtn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #717784;
}

.paginationBtn:hover:not(:disabled) {
  background: #FFF8ED;
  border-color: #A17D23;
  color: #A17D23;
}

.paginationBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.paginationInfo {
  font-size: 14px;
  color: #717784;
}
</style>
