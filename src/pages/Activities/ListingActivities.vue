<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { titleService, type TitleItem, type TitleColumn, type TitleSheetItem, type PaginationInfo, type RowOperations } from '@/services/activityService'

// ============================================================================
// TITLE & SHEET SELECTION STATE
// ============================================================================
const availableTitles = ref<TitleItem[]>([])
const selectedTitleId = ref<number | null>(null)
const selectedTitle = computed(() => availableTitles.value.find(t => t.id === selectedTitleId.value))

// Sheet selection state
const userSheets = ref<TitleSheetItem[]>([])
const selectedSheetId = ref<number | null>(null)
const selectedSheet = computed(() => userSheets.value.find(s => s.id === selectedSheetId.value))
const isLoadingSheetsForTitle = ref(false)

// Create sheet modal state
const showCreateSheetModal = ref(false)
const newSheetName = ref('')
const newSheetDescription = ref('')
const isCreatingSheet = ref(false)

const isLoadingTitles = ref(false)
const isLoadingData = ref(false)
const isSavingData = ref(false)
const dataError = ref<string | null>(null)
const saveSuccess = ref<string | null>(null)
const currentSheetId = ref<number | null>(null)

// ============================================================================
// PAGINATION STATE
// ============================================================================
const pagination = ref<PaginationInfo>({
  page: 1,
  page_size: 100,
  total_count: 0,
  total_pages: 1,
  has_next: false,
  has_prev: false
})
const pageSize = ref(100)  // Rows per page
const goToPageInput = ref<string>('')

// ============================================================================
// ROW IDENTITY TRACKING (CRITICAL for data integrity)
// ============================================================================
/**
 * IMPORTANT: Row identification system
 * 
 * - `displayId`: Frontend display ID (the row.id in localRows) - used for UI rendering
 * - `databaseId`: Stable database primary key - NEVER changes for existing rows
 * - `displayOrder`: Current visual position (1-indexed) - CAN change with inserts/deletes
 * 
 * The original snapshot stores data keyed by DATABASE ID, not display position.
 * This ensures we can always match frontend rows to their database counterparts.
 */

// Map displayId -> databaseId (for rows loaded from server)
const displayToDatabaseId = ref<Map<number, number>>(new Map())

// Map databaseId -> original data (for change detection)
const originalRowsSnapshot = ref<Map<number, { 
  data: Record<string, string>, 
  styles: Record<string, any>, 
  height: number,
  originalOrder: number  // The order when loaded
}>>(new Map())

// Track modified rows by their DATABASE ID
const modifiedDatabaseIds = ref<Set<number>>(new Set())

// Track new rows (have displayId but no databaseId) - displayIds of new rows
const newRowDisplayIds = ref<Set<number>>(new Set())

// Track inserted rows with their target positions
// Map: displayId -> insertAtOrder (the position where row should be inserted)
const insertedRowPositions = ref<Map<number, number>>(new Map())

// Track deleted rows by DATABASE ID
const deletedDatabaseIds = ref<Set<number>>(new Set())

// Flag for trailing empty row (not a real change)
const trailingEmptyRowId = ref<number | null>(null)

// ============================================================================
// BACKEND FILTER & SORT STATE (defined early for use in loadPageData)
// ============================================================================
// Current sort state (applied on backend)
const currentSortColumn = ref<string | null>(null)
const currentSortOrder = ref<'asc' | 'desc'>('asc')

// Column filters state (will be populated per-column later)
const columnFilters = ref<Record<string, {
  excludedValues: Set<string>
  showBlanks: boolean
  searchQuery: string
  availableValues: string[]
  hasBlanks: boolean
  isLoading: boolean
}>>({})

// Build filters object for backend API
const buildBackendFilters = (): Record<string, { excluded: string[], show_blanks: boolean }> | undefined => {
  const filters: Record<string, { excluded: string[], show_blanks: boolean }> = {}
  
  for (const colKey in columnFilters.value) {
    const filter = columnFilters.value[colKey]
    if (!filter) continue
    
    if (filter.excludedValues.size > 0 || !filter.showBlanks) {
      filters[colKey] = {
        excluded: Array.from(filter.excludedValues),
        show_blanks: filter.showBlanks
      }
    }
  }
  
  return Object.keys(filters).length > 0 ? filters : undefined
}

// ============================================================================
// HELPER: Get database ID for a display row
// ============================================================================
const getDatabaseId = (displayId: number): number | undefined => {
  return displayToDatabaseId.value.get(displayId)
}

// Load published titles for dropdown
const loadTitles = async () => {
  isLoadingTitles.value = true
  dataError.value = null
  try {
    availableTitles.value = await titleService.getPublishedTitles()
  } catch (error: any) {
    console.error('Failed to load titles:', error)
    dataError.value = 'فشل في تحميل العناوين'
  } finally {
    isLoadingTitles.value = false
  }
}

// Load user's sheets when title is selected
const loadUserSheets = async () => {
  if (!selectedTitleId.value) {
    userSheets.value = []
    selectedSheetId.value = null
    return
  }
  
  isLoadingSheetsForTitle.value = true
  dataError.value = null
  
  try {
    const result = await titleService.getUserSheets(selectedTitleId.value)
    userSheets.value = result.sheets
    
    // Reset sheet selection
    selectedSheetId.value = null
    
    // Reset spreadsheet to default
    localColumns.value = [...defaultColumns]
    localRows.value = generateInitialRows()
    
  } catch (error: any) {
    console.error('Failed to load sheets:', error)
    dataError.value = error.response?.data?.error || 'فشل في تحميل الجداول'
  } finally {
    isLoadingSheetsForTitle.value = false
  }
}

// Load sheet data when sheet is selected
const onSheetSelected = async () => {
  if (!selectedTitleId.value || !selectedSheetId.value) {
    return
  }
  
  // Reset to first page when sheet changes
  pagination.value.page = 1
  await loadPageData(1)
}

// Load data for a specific page
const loadPageData = async (page: number) => {
  if (!selectedTitleId.value || !selectedSheetId.value) {
    return
  }
  
  isLoadingData.value = true
  dataError.value = null
  
  try {
    // Build filters for backend
    const backendFilters = buildBackendFilters()
    
    // Get user's data for this sheet with pagination, sorting, and filtering
    const userData = await titleService.getUserData(
      selectedTitleId.value, 
      selectedSheetId.value,
      page,
      pageSize.value,
      currentSortColumn.value || undefined,
      currentSortOrder.value,
      backendFilters
    )
    currentSheetId.value = userData.sheet_id
    
    // Set columns from backend (use default widths, ignore backend width/min_width)
    localColumns.value = userData.columns.map((col: TitleColumn, index: number) => ({
      id: `col-${index + 1}`,
      key: col.key,
      label: col.label,
      width: 150,  // Default width
      minWidth: 100,  // Default min width
      data_type: col.data_type,  // Use from backend
      options: col.options  // Use from backend
    }))
    
    // Update pagination info
    pagination.value = userData.pagination
    
    // CRITICAL: Reset ALL change tracking for new page load
    displayToDatabaseId.value.clear()
    originalRowsSnapshot.value.clear()
    modifiedDatabaseIds.value.clear()
    newRowDisplayIds.value.clear()
    insertedRowPositions.value.clear()
    deletedDatabaseIds.value.clear()
    trailingEmptyRowId.value = null
    
    // Set rows from backend or create empty rows
    if (userData.rows.length > 0) {
      localRows.value = userData.rows.map((row, index) => {
        // Use row_order if available, otherwise fallback to row_number for backward compat
        const displayOrder = row.row_order ?? row.row_number ?? (index + 1)
        const databaseId = row.id!
        
        // Map displayId -> databaseId
        // We use displayOrder as displayId initially (they match when loaded)
        displayToDatabaseId.value.set(displayOrder, databaseId)
        
        // Store original snapshot keyed by DATABASE ID
        originalRowsSnapshot.value.set(databaseId, {
          data: JSON.parse(JSON.stringify(row.data)),
          styles: JSON.parse(JSON.stringify(row.styles || {})),
          height: row.height || 32,
          originalOrder: displayOrder
        })
        
        return {
          id: displayOrder,  // displayId = displayOrder when first loaded
          height: row.height || 32,
          cells: row.data,
          styles: row.styles || {}
        }
      })
      
      // Add one empty row at the end for easy data entry (only on last page)
      if (!pagination.value.has_next) {
        addTrailingEmptyRow()
      }
    } else {
      // Generate empty rows with the new columns (first page with no data)
      localRows.value = generateInitialRows()
      // Mark all initial empty rows as new (not from database)
      localRows.value.forEach(row => {
        newRowDisplayIds.value.add(row.id)
      })
      trailingEmptyRowId.value = localRows.value[localRows.value.length - 1]?.id || null
    }
    
    // Re-initialize filters for new columns
    initializeFilters()
    isDirty.value = false
    
  } catch (error: any) {
    console.error('Failed to load sheet data:', error)
    dataError.value = error.response?.data?.error || 'فشل في تحميل البيانات'
  } finally {
    isLoadingData.value = false
  }
}

// Add a trailing empty row for easy data entry
const addTrailingEmptyRow = () => {
  const lastRow = localRows.value[localRows.value.length - 1]
  const newDisplayId = lastRow ? lastRow.id + 1 : 1
  
  const cells: Record<string, string> = {}
  const styles: Record<string, CellStyle> = {}
  columns.value.forEach((col: Column) => {
    cells[col.key] = ''
    styles[col.key] = {}
  })
  
  localRows.value.push({ id: newDisplayId, height: 32, cells, styles })
  trailingEmptyRowId.value = newDisplayId
  newRowDisplayIds.value.add(newDisplayId)  // It's a new row (no database ID)
}

// Check if a row is empty (all cells are empty)
const isRowEmpty = (row: Row): boolean => {
  return !Object.values(row.cells).some(v => v && v.trim() !== '')
}

// Check if there are meaningful changes (excluding trailing empty rows)
const hasMeaningfulChanges = computed(() => {
  // Check if any existing rows were modified
  if (modifiedDatabaseIds.value.size > 0) return true
  
  // Check if any rows were deleted
  if (deletedDatabaseIds.value.size > 0) return true
  
  // Check if any rows were inserted in the middle
  if (insertedRowPositions.value.size > 0) return true
  
  // Check if any new rows have data (not just empty trailing rows)
  for (const displayId of newRowDisplayIds.value) {
    if (displayId === trailingEmptyRowId.value) continue  // Skip trailing empty row
    if (insertedRowPositions.value.has(displayId)) continue  // Already counted
    const row = localRows.value.find(r => r.id === displayId)
    if (row && !isRowEmpty(row)) return true
  }
  
  return false
})

// ============================================================================
// PAGINATION NAVIGATION
// ============================================================================
const goToFirstPage = async () => {
  if (pagination.value.page === 1) return
  await loadPageData(1)
}

const goToPrevPage = async () => {
  if (!pagination.value.has_prev) return
  await loadPageData(pagination.value.page - 1)
}

const goToNextPage = async () => {
  if (!pagination.value.has_next) return
  await loadPageData(pagination.value.page + 1)
}

const goToLastPage = async () => {
  if (pagination.value.page === pagination.value.total_pages) return
  await loadPageData(pagination.value.total_pages)
}

const goToPage = async () => {
  const pageNum = parseInt(goToPageInput.value)
  if (isNaN(pageNum) || pageNum < 1 || pageNum > pagination.value.total_pages) {
    goToPageInput.value = ''
    return
  }
  goToPageInput.value = ''
  await loadPageData(pageNum)
}

const changePageSize = async (newSize: number) => {
  pageSize.value = newSize
  await loadPageData(1)  // Reset to first page with new page size
}

// Open create sheet modal
const openCreateSheetModal = () => {
  newSheetName.value = ''
  newSheetDescription.value = ''
  showCreateSheetModal.value = true
}

// Close create sheet modal
const closeCreateSheetModal = () => {
  showCreateSheetModal.value = false
  newSheetName.value = ''
  newSheetDescription.value = ''
}

// Create new sheet
const createSheet = async () => {
  if (!selectedTitleId.value || !newSheetName.value.trim()) {
    dataError.value = 'اسم الجدول مطلوب'
    return
  }
  
  isCreatingSheet.value = true
  dataError.value = null
  
  try {
    const newSheet = await titleService.createSheet(
      selectedTitleId.value,
      newSheetName.value.trim(),
      newSheetDescription.value.trim()
    )
    
    // Add to list and select it
    userSheets.value.unshift(newSheet)
    selectedSheetId.value = newSheet.id
    
    closeCreateSheetModal()
    saveSuccess.value = 'تم إنشاء الجدول بنجاح'
    setTimeout(() => { saveSuccess.value = null }, 3000)
    
    // Load the new sheet data
    await onSheetSelected()
    
  } catch (error: any) {
    console.error('Failed to create sheet:', error)
    dataError.value = error.response?.data?.error || 'فشل في إنشاء الجدول'
  } finally {
    isCreatingSheet.value = false
  }
}

// Delete sheet
const deleteSheet = async (sheetId: number) => {
  if (!confirm('هل أنت متأكد من حذف هذا الجدول؟')) {
    return
  }
  
  try {
    await titleService.deleteSheet(sheetId)
    
    // Remove from list
    userSheets.value = userSheets.value.filter(s => s.id !== sheetId)
    
    // If was selected, reset
    if (selectedSheetId.value === sheetId) {
      selectedSheetId.value = null
      localColumns.value = [...defaultColumns]
      localRows.value = generateInitialRows()
    }
    
    saveSuccess.value = 'تم حذف الجدول بنجاح'
    setTimeout(() => { saveSuccess.value = null }, 3000)
    
  } catch (error: any) {
    console.error('Failed to delete sheet:', error)
    dataError.value = error.response?.data?.error || 'فشل في حذف الجدول'
  }
}

// Save user data to backend (EFFICIENT DIFFERENTIAL SAVE with proper row ordering)
const saveUserData = async () => {
  if (!selectedTitleId.value || !selectedSheetId.value) {
    dataError.value = 'الرجاء اختيار جدول أولاً'
    return
  }
  
  // Don't save if no meaningful changes
  if (!hasMeaningfulChanges.value) {
    saveSuccess.value = 'لا توجد تغييرات لحفظها'
    setTimeout(() => { saveSuccess.value = null }, 2000)
    return
  }
  
  isSavingData.value = true
  dataError.value = null
  saveSuccess.value = null
  
  try {
    // Build the operations object
    const operations: RowOperations = {
      updates: [],
      insertions: [],
      deletions: [],
      appends: []
    }
    
    // 1. UPDATES: Existing rows that were modified (identified by database ID)
    for (const dbId of modifiedDatabaseIds.value) {
      // Find the current display row that corresponds to this database ID
      let displayId: number | null = null
      for (const [dispId, databaseId] of displayToDatabaseId.value.entries()) {
        if (databaseId === dbId) {
          displayId = dispId
          break
        }
      }
      
      if (displayId !== null) {
        const row = localRows.value.find(r => r.id === displayId)
        if (row && !isRowEmpty(row)) {
          operations.updates!.push({
            id: dbId,  // Use DATABASE ID, not display ID
            data: row.cells,
            styles: row.styles,
            height: row.height
          })
        }
      }
    }
    
    // 2. INSERTIONS: New rows inserted at specific positions (not at end)
    for (const [displayId, insertAtOrder] of insertedRowPositions.value.entries()) {
      const row = localRows.value.find(r => r.id === displayId)
      if (row && !isRowEmpty(row)) {
        operations.insertions!.push({
          insert_at_order: insertAtOrder,
          data: row.cells,
          styles: row.styles,
          height: row.height
        })
      }
    }
    
    // 3. DELETIONS: Rows deleted by database ID
    operations.deletions = Array.from(deletedDatabaseIds.value)
    
    // 4. APPENDS: New rows added at the end (have data, not insertions)
    for (const displayId of newRowDisplayIds.value) {
      // Skip trailing empty row
      if (displayId === trailingEmptyRowId.value) continue
      // Skip if it's an insertion (already handled)
      if (insertedRowPositions.value.has(displayId)) continue
      
      const row = localRows.value.find(r => r.id === displayId)
      if (row && !isRowEmpty(row)) {
        operations.appends!.push({
          data: row.cells,
          styles: row.styles,
          height: row.height
        })
      }
    }
    
    // Use the new operations-based API
    const result = await titleService.updateUserDataWithOperations(
      selectedTitleId.value,
      selectedSheetId.value,
      operations
    )
    
    if (result.success) {
      const insertedCount = result.inserted_count ?? 0
      saveSuccess.value = `${result.message} (تحديث: ${result.updated_count}, إدراج: ${insertedCount}, جديد: ${result.created_count}, حذف: ${result.deleted_count})`
      
      // Reset ALL change tracking
      modifiedDatabaseIds.value.clear()
      newRowDisplayIds.value.clear()
      insertedRowPositions.value.clear()
      deletedDatabaseIds.value.clear()
      
      // Reload the current page to get updated data with correct IDs
      await loadPageData(pagination.value.page)
      
      isDirty.value = false
      setTimeout(() => { saveSuccess.value = null }, 3000)
      
      // Update sheet row count in sidebar
      const sheet = userSheets.value.find(s => s.id === selectedSheetId.value)
      if (sheet) {
        sheet.row_count = result.row_count
      }
      pagination.value.total_count = result.row_count
    } else {
      // Handle errors
      if (result.errors && result.errors.length > 0) {
        dataError.value = `فشل في حفظ بعض البيانات: ${result.errors.map(e => e.error).join(', ')}`
      }
    }
  } catch (error: any) {
    console.error('Failed to save data:', error)
    dataError.value = error.response?.data?.error || 'فشل في حفظ البيانات'
  } finally {
    isSavingData.value = false
  }
}

// Track dirty state
const isDirty = ref(false)

// Helper function for date formatting
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return 'اليوم'
  } else if (days === 1) {
    return 'أمس'
  } else if (days < 7) {
    return `منذ ${days} أيام`
  } else {
    return date.toLocaleDateString('ar-EG', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
}

// Watch for title selection changes - load sheets
watch(selectedTitleId, () => {
  loadUserSheets()
})

// Watch for sheet selection changes - load data
watch(selectedSheetId, () => {
  if (selectedSheetId.value) {
    onSheetSelected()
  }
})

// ============================================================================
// TYPES
// ============================================================================
interface Column {
  id: string
  key: string
  label: string
  width: number
  minWidth: number
  data_type?: string  // 'text', 'select', 'number', etc.
  options?: string[]  // For select type columns
}

interface CellStyle {
  bold?: boolean
  italic?: boolean
  backgroundColor?: string
  textColor?: string
}

interface Row {
  id: number
  height: number
  cells: Record<string, string>
  styles: Record<string, CellStyle>
}

interface CellPosition {
  rowId: number
  colKey: string
}

// Extended color palette like Office apps
const colorPalette = [
  // Row 1 - Theme colors
  '#ffffff', '#000000', '#1e3a5f', '#2d4a6f', '#b78a41', '#c9a961', '#4a5568', '#718096',
  // Row 2 - Standard colors
  '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0',
  // Row 3 - Light tints
  '#f8d7da', '#fce8e8', '#fff3cd', '#fffde7', '#d4edda', '#c3e6cb', '#d1ecf1', '#cce5ff',
  // Row 4 - Medium tints  
  '#f5c6cb', '#f8d4d4', '#ffeeba', '#fff9c4', '#c3e6cb', '#a3d9a5', '#bee5eb', '#b8daff',
  // Row 5 - Pastels
  '#fecaca', '#fed7d7', '#fef08a', '#fef9a7', '#bbf7d0', '#86efac', '#a5f3fc', '#93c5fd',
  // Row 6 - Vivid
  '#ef4444', '#f87171', '#eab308', '#facc15', '#22c55e', '#4ade80', '#06b6d4', '#3b82f6'
]

// Theme colors for quick access
const themeColors = [
  { name: 'أبيض', color: '#ffffff' },
  { name: 'أسود', color: '#000000' },
  { name: 'أزرق داكن', color: '#1e3a5f' },
  { name: 'ذهبي', color: '#b78a41' },
  { name: 'أحمر', color: '#dc2626' },
  { name: 'أخضر', color: '#16a34a' },
  { name: 'أزرق', color: '#2563eb' },
  { name: 'بنفسجي', color: '#7c3aed' },
]

// Default column definitions (used in local mode)
const defaultColumns: Column[] = [
  { id: 'col-1', key: 'activityType', label: 'نوع النشاط\nType of activity', width: 120, minWidth: 80 },
  { id: 'col-2', key: 'hasMeetingMinutes', label: 'يوجد محضر اجتماع', width: 140, minWidth: 100 },
  { id: 'col-3', key: 'department', label: 'القسم المعني', width: 140, minWidth: 100 },
  { id: 'col-4', key: 'activityName', label: 'اسم النشاط', width: 180, minWidth: 120 },
  { id: 'col-5', key: 'representationType', label: 'نوع التمثيل', width: 120, minWidth: 80 },
  { id: 'col-6', key: 'activityScope', label: 'نطاق النشاط', width: 120, minWidth: 80 },
  { id: 'col-7', key: 'activitySource', label: 'مصدر النشاط', width: 140, minWidth: 100 },
  { id: 'col-8', key: 'participatingEntities', label: 'الجهات المشاركة', width: 160, minWidth: 120 },
  { id: 'col-9', key: 'outputs', label: 'المخرجات', width: 200, minWidth: 150 },
]

const localColumns = ref<Column[]>([...defaultColumns])

// Columns - directly use localColumns (updated when title is selected)
const columns = computed({
  get: () => localColumns.value,
  set: (val) => {
    localColumns.value = val
  }
})


// Initialize filters for all columns
const initializeFilters = () => {
  columns.value.forEach((col: Column) => {
    columnFilters.value[col.key] = {
      excludedValues: new Set<string>(),  // Empty = all values shown
      showBlanks: true,
      searchQuery: '',
      availableValues: [],
      hasBlanks: false,
      isLoading: false
    }
  })
  // Reset sort state when reinitializing
  currentSortColumn.value = null
  currentSortOrder.value = 'asc'
}

// Active filter dropdown state
const activeFilterColumn = ref<string | null>(null)
const filterDropdownPosition = ref({ top: 0, left: 0 })

// Load unique values from backend for a column
const loadColumnFilterValues = async (colKey: string) => {
  if (!selectedTitleId.value || !selectedSheetId.value) return
  
  const filter = columnFilters.value[colKey]
  if (!filter || filter.isLoading) return
  
  filter.isLoading = true
  
  try {
    const result = await titleService.getColumnValues(
      selectedTitleId.value,
      selectedSheetId.value,
      colKey
    )
    filter.availableValues = result.values
    filter.hasBlanks = result.has_blanks
  } catch (error) {
    console.error('Failed to load column values:', error)
    filter.availableValues = []
    filter.hasBlanks = false
  } finally {
    filter.isLoading = false
  }
}

// Get values for filter dropdown (from backend)
const getColumnFilterValues = (colKey: string): string[] => {
  const filter = columnFilters.value[colKey]
  return filter?.availableValues || []
}

// Check if column has active filter
const hasActiveFilter = (colKey: string): boolean => {
  const filter = columnFilters.value[colKey]
  if (!filter) return false
  return filter.excludedValues.size > 0 || !filter.showBlanks
}

// Filtered rows - NOW DIRECTLY FROM BACKEND (no local filtering)
const filteredRows = computed(() => {
  // Backend handles filtering, just return all rows from current page
  return rows.value
})

// Open filter dropdown
// Filter dropdown dimensions
const FILTER_DROPDOWN_WIDTH = 280
const FILTER_DROPDOWN_HEIGHT = 420

const openFilterDropdown = async (colKey: string, event: MouseEvent) => {
  event.stopPropagation()
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Calculate initial position (below and aligned with button)
  let top = rect.bottom + 4
  let left = rect.left
  
  // Check if dropdown exceeds bottom of screen
  if (top + FILTER_DROPDOWN_HEIGHT > viewportHeight - 10) {
    // Open above the button instead
    top = rect.top - FILTER_DROPDOWN_HEIGHT - 4
    
    // If still doesn't fit above, position at top of viewport
    if (top < 10) {
      top = 10
    }
  }
  
  // Check if dropdown exceeds right edge (RTL consideration)
  if (left + FILTER_DROPDOWN_WIDTH > viewportWidth - 10) {
    // Align to right edge of button instead
    left = rect.right - FILTER_DROPDOWN_WIDTH
  }
  
  // Check if dropdown exceeds left edge
  if (left < 10) {
    left = 10
  }
  
  filterDropdownPosition.value = { top, left }
  
  // Reset search query when opening
  if (columnFilters.value[colKey]) {
    columnFilters.value[colKey].searchQuery = ''
  }
  
  activeFilterColumn.value = colKey
  
  // Load values from backend (if not already loaded)
  await loadColumnFilterValues(colKey)
}

// Close filter dropdown
const closeFilterDropdown = () => {
  activeFilterColumn.value = null
}

// Toggle filter value selection (toggle exclusion)
const toggleFilterValue = (colKey: string, value: string) => {
  const filter = columnFilters.value[colKey]
  if (!filter) return
  
  // If value is excluded, include it (remove from excluded)
  // If value is included, exclude it (add to excluded)
  if (filter.excludedValues.has(value)) {
    filter.excludedValues.delete(value)
  } else {
    filter.excludedValues.add(value)
  }
}

// Toggle blanks filter
const toggleBlanksFilter = (colKey: string) => {
  const filter = columnFilters.value[colKey]
  if (filter) {
    filter.showBlanks = !filter.showBlanks
  }
}

// Select all filter values (clear all exclusions)
const selectAllFilterValues = (colKey: string) => {
  const filter = columnFilters.value[colKey]
  if (!filter) return
  
  filter.excludedValues.clear()  // Clear exclusions = show all
  filter.showBlanks = true
}

// Check if "Select All" should be checked
const isSelectAllChecked = (colKey: string): boolean => {
  const filter = columnFilters.value[colKey]
  if (!filter) return true
  return filter.excludedValues.size === 0 && filter.showBlanks
}

// Clear filter for a column and reload data
const clearColumnFilter = async (colKey: string) => {
  const filter = columnFilters.value[colKey]
  if (filter) {
    filter.excludedValues.clear()
    filter.showBlanks = true
    filter.searchQuery = ''
  }
  closeFilterDropdown()
  
  // Reload data from backend with updated filters
  pagination.value.page = 1
  await loadPageData(1)
}

// Filter values based on search query
const getFilteredFilterValues = (colKey: string): string[] => {
  const values = getColumnFilterValues(colKey)
  const filter = columnFilters.value[colKey]
  if (!filter || !filter.searchQuery) return values
  
  const query = filter.searchQuery.toLowerCase()
  return values.filter(v => v.toLowerCase().includes(query))
}

// Apply filter and reload data from backend
const applyFilter = async () => {
  closeFilterDropdown()
  
  // Reset to page 1 and reload with new filters
  pagination.value.page = 1
  await loadPageData(1)
}

// Sort column A to Z (backend-based)
const sortColumnAtoZ = async (colKey: string) => {
  currentSortColumn.value = colKey
  currentSortOrder.value = 'asc'
  closeFilterDropdown()
  
  // Reset to page 1 and reload with sorting
  pagination.value.page = 1
  await loadPageData(1)
}

// Sort column Z to A (backend-based)
const sortColumnZtoA = async (colKey: string) => {
  currentSortColumn.value = colKey
  currentSortOrder.value = 'desc'
  closeFilterDropdown()
  
  // Reset to page 1 and reload with sorting
  pagination.value.page = 1
  await loadPageData(1)
}

// Initialize filters on setup
initializeFilters()

// Generate initial rows for local mode
const generateInitialRows = (): Row[] => {
  const rows: Row[] = []
  for (let i = 1; i <= 20; i++) {
    const cells: Record<string, string> = {}
    const styles: Record<string, CellStyle> = {}
    localColumns.value.forEach(col => {
      cells[col.key] = ''
      styles[col.key] = {}
    })
    rows.push({ id: i, height: 32, cells, styles })
  }
  return rows
}

const localRows = ref<Row[]>(generateInitialRows())

// Rows - directly use localRows (updated when title is selected)
const rows = computed({
  get: () => localRows.value,
  set: (val) => {
    localRows.value = val
    // Only mark dirty if there are meaningful changes
    isDirty.value = hasMeaningfulChanges.value
  }
})

// State
const activeCell = ref<CellPosition | null>(null)
const editingCell = ref<CellPosition | null>(null)
const selectedRange = ref<{ start: CellPosition; end: CellPosition } | null>(null)
const isResizingCol = ref(false)
const isResizingRow = ref(false)
const resizingColIndex = ref(-1)
const resizingRowIndex = ref(-1)
const startX = ref(0)
const startY = ref(0)
const startWidth = ref(0)
const startHeight = ref(0)
const copiedCells = ref<{ cells: Record<string, string>[]; colKeys: string[] } | null>(null)

// Context menu state
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuRow = ref<number | null>(null)
const contextMenuCell = ref<CellPosition | null>(null)
const contextMenuType = ref<'row' | 'cell'>('cell')
const contextMenuRef = ref<HTMLElement | null>(null)

// Selected rows for row operations
const selectedRows = ref<Set<number>>(new Set())
const showColorPicker = ref(false)
const colorPickerTarget = ref<'bg' | 'text'>('bg')

// Submenu state for flyout color pickers
const activeSubmenu = ref<'bg' | 'text' | null>(null)
const submenuPosition = ref<{ top: number; left: number; openLeft: boolean }>({ top: 0, left: 0, openLeft: false })
const lockedColorTarget = ref<'bg' | 'text' | null>(null) // Locked when flyout opens, used for color application

// Cut mode tracking
const cutMode = ref(false)
const cutSource = ref<{ type: 'cell' | 'row'; rowIds?: number[]; cell?: CellPosition } | null>(null)

// Computed
const totalWidth = computed(() => {
  return columns.value.reduce((sum: number, col: Column) => sum + col.width, 0) + 50 // +50 for row numbers
})

// Methods
const getCellId = (rowId: number, colKey: string) => `cell-${rowId}-${colKey}`

const isCellActive = (rowId: number, colKey: string) => {
  return activeCell.value?.rowId === rowId && activeCell.value?.colKey === colKey
}

const isCellEditing = (rowId: number, colKey: string) => {
  return editingCell.value?.rowId === rowId && editingCell.value?.colKey === colKey
}

const isCellSelected = (rowId: number, colKey: string) => {
  // Check if entire row is selected
  if (selectedRows.value.has(rowId)) return true
  
  if (!selectedRange.value) return isCellActive(rowId, colKey)
  
  const { start, end } = selectedRange.value
  const minRow = Math.min(start.rowId, end.rowId)
  const maxRow = Math.max(start.rowId, end.rowId)
  const startColIndex = columns.value.findIndex((c: Column) => c.key === start.colKey)
  const endColIndex = columns.value.findIndex((c: Column) => c.key === end.colKey)
  const minCol = Math.min(startColIndex, endColIndex)
  const maxCol = Math.max(startColIndex, endColIndex)
  const colIndex = columns.value.findIndex((c: Column) => c.key === colKey)
  
  return rowId >= minRow && rowId <= maxRow && colIndex >= minCol && colIndex <= maxCol
}

const isRowSelected = (rowId: number) => {
  return selectedRows.value.has(rowId)
}

const isCellCut = (rowId: number, colKey: string) => {
  if (!cutMode.value || !cutSource.value) return false
  if (cutSource.value.type === 'row') {
    return cutSource.value.rowIds?.includes(rowId) || false
  }
  if (cutSource.value.type === 'cell' && cutSource.value.cell) {
    return cutSource.value.cell.rowId === rowId && cutSource.value.cell.colKey === colKey
  }
  return false
}

const getCellStyle = (rowId: number, colKey: string) => {
  const row = rows.value.find(r => r.id === rowId)
  if (!row || !row.styles || !row.styles[colKey]) return {}
  const style = row.styles[colKey]
  const cssStyle: Record<string, string> = {}
  if (style.backgroundColor) {
    cssStyle.backgroundColor = style.backgroundColor
  }
  if (style.textColor) {
    cssStyle.color = style.textColor
  }
  if (style.bold) cssStyle.fontWeight = 'bold'
  if (style.italic) cssStyle.fontStyle = 'italic'
  return cssStyle
}

// Check if cell has a custom background color
const hasCustomBackground = (rowId: number, colKey: string): boolean => {
  const row = rows.value.find(r => r.id === rowId)
  return !!(row?.styles?.[colKey]?.backgroundColor)
}

// Check if any cell in a row has a custom background color
const rowHasCustomBackground = (rowId: number): boolean => {
  const row = rows.value.find(r => r.id === rowId)
  if (!row?.styles) return false
  return columns.value.some((col: Column) => !!row.styles?.[col.key]?.backgroundColor)
}

const selectCell = (rowId: number, colKey: string, event?: MouseEvent | KeyboardEvent) => {
  // Clear row selection when selecting individual cell
  if (!event?.ctrlKey && !event?.metaKey) {
    selectedRows.value.clear()
  }
  
  if (event?.shiftKey && activeCell.value) {
    selectedRange.value = {
      start: activeCell.value,
      end: { rowId, colKey }
    }
  } else {
    activeCell.value = { rowId, colKey }
    selectedRange.value = null
  }
  editingCell.value = null
}

const selectRow = (rowId: number, event?: MouseEvent) => {
  if (event?.ctrlKey || event?.metaKey) {
    // Toggle row selection with Ctrl/Cmd
    if (selectedRows.value.has(rowId)) {
      selectedRows.value.delete(rowId)
    } else {
      selectedRows.value.add(rowId)
    }
  } else if (event?.shiftKey && selectedRows.value.size > 0) {
    // Range selection with Shift
    const lastSelected = Array.from(selectedRows.value).pop() || rowId
    const minRow = Math.min(lastSelected, rowId)
    const maxRow = Math.max(lastSelected, rowId)
    for (let i = minRow; i <= maxRow; i++) {
      selectedRows.value.add(i)
    }
  } else {
    // Single row selection
    selectedRows.value.clear()
    selectedRows.value.add(rowId)
  }
  // Set active cell to first column of this row
  activeCell.value = { rowId, colKey: columns.value[0].key }
  selectedRange.value = null
  editingCell.value = null
}

const startEditing = (rowId: number, colKey: string) => {
  activeCell.value = { rowId, colKey }
  editingCell.value = { rowId, colKey }
  selectedRange.value = null
  nextTick(() => {
    const cellId = getCellId(rowId, colKey)
    // Try to focus select dropdown first, then input
    const selectElement = document.querySelector(`[data-cell-id="${cellId}"] select`)
    const inputElement = document.querySelector(`[data-cell-id="${cellId}"] input`)
    
    if (selectElement instanceof HTMLSelectElement) {
      selectElement.focus()
      // For select, we can trigger click to open dropdown immediately
      selectElement.click()
    } else if (inputElement instanceof HTMLInputElement) {
      inputElement.focus()
      inputElement.select()
    }
  })
}

const finishEditing = () => {
  editingCell.value = null
}

const updateCellValue = (rowId: number, colKey: string, value: string, autoFinish: boolean = false) => {
  const row = localRows.value.find(r => r.id === rowId)
  if (row) {
    row.cells[colKey] = value
    
    // Auto-adjust row height based on content
    const lines = value.split('\n').length
    const minHeight = 32
    const lineHeight = 24
    row.height = Math.max(minHeight, lines * lineHeight)
    
    // Track change using DATABASE ID if this is an existing row
    const databaseId = getDatabaseId(rowId)
    if (databaseId !== undefined) {
      // This is an existing row from the database
      const original = originalRowsSnapshot.value.get(databaseId)!
      
      // Check if any cell in this row differs from original
      const rowChanged = columns.value.some((col: Column) => {
        const currentVal = row.cells[col.key] || ''
        const origVal = original.data[col.key] || ''
        return currentVal !== origVal
      })
      
      if (rowChanged) {
        modifiedDatabaseIds.value.add(databaseId)
      } else {
        modifiedDatabaseIds.value.delete(databaseId)
      }
    }
    
    // If this was the trailing empty row and now has data, create a new trailing empty row
    if (rowId === trailingEmptyRowId.value && value.trim() !== '') {
      trailingEmptyRowId.value = null  // This row is no longer trailing empty
      // Add new trailing empty row
      if (!pagination.value.has_next) {  // Only on last page
        addTrailingEmptyRow()
      }
    }
    
    // Update dirty state based on meaningful changes
    isDirty.value = hasMeaningfulChanges.value
  }
  // Auto-finish editing if specified (for select dropdowns)
  if (autoFinish) {
    finishEditing()
  }
}

// Column resize
const startColResize = (event: MouseEvent, index: number) => {
  event.preventDefault()
  isResizingCol.value = true
  resizingColIndex.value = index
  startX.value = event.clientX
  startWidth.value = columns.value[index].width
  document.addEventListener('mousemove', onColResize)
  document.addEventListener('mouseup', stopColResize)
}

const onColResize = (event: MouseEvent) => {
  if (!isResizingCol.value) return
  const diff = startX.value - event.clientX // RTL: reversed
  const newWidth = Math.max(columns.value[resizingColIndex.value].minWidth, startWidth.value + diff)
  columns.value[resizingColIndex.value].width = newWidth
}

const stopColResize = () => {
  isResizingCol.value = false
  resizingColIndex.value = -1
  document.removeEventListener('mousemove', onColResize)
  document.removeEventListener('mouseup', stopColResize)
}

// Row resize
const startRowResize = (event: MouseEvent, index: number) => {
  event.preventDefault()
  isResizingRow.value = true
  resizingRowIndex.value = index
  startY.value = event.clientY
  startHeight.value = rows.value[index].height
  document.addEventListener('mousemove', onRowResize)
  document.addEventListener('mouseup', stopRowResize)
}

const onRowResize = (event: MouseEvent) => {
  if (!isResizingRow.value) return
  const diff = event.clientY - startY.value
  const newHeight = Math.max(24, startHeight.value + diff)
  rows.value[resizingRowIndex.value].height = newHeight
}

const stopRowResize = () => {
  isResizingRow.value = false
  resizingRowIndex.value = -1
  document.removeEventListener('mousemove', onRowResize)
  document.removeEventListener('mouseup', stopRowResize)
}

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (!activeCell.value) return
  
  const { rowId, colKey } = activeCell.value
  const colIndex = columns.value.findIndex((c: Column) => c.key === colKey)
  const rowIndex = rows.value.findIndex(r => r.id === rowId)
  
  // If editing, only handle Enter and Escape
  if (editingCell.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      finishEditing()
      
      // Move to next row, or add new row if at the end
      if (rowIndex < rows.value.length - 1) {
        selectCell(rows.value[rowIndex + 1].id, colKey)
      } else {
        // At the last row - add a new row and move to it
        addMoreRows()
        nextTick(() => {
          const newRowId = localRows.value[localRows.value.length - 1].id
          selectCell(newRowId, colKey)
        })
      }
    } else if (event.key === 'Escape') {
      finishEditing()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      finishEditing()
      if (event.shiftKey) {
        // Move left (RTL: actually right visually)
        if (colIndex < columns.value.length - 1) {
          selectCell(rowId, columns.value[colIndex + 1].key)
        }
      } else {
        // Move right (RTL: actually left visually)
        if (colIndex > 0) {
          selectCell(rowId, columns.value[colIndex - 1].key)
        }
      }
    }
    return
  }
  
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      if (rowIndex > 0) {
        selectCell(rows.value[rowIndex - 1].id, colKey, event)
      }
      break
    case 'ArrowDown':
      event.preventDefault()
      if (rowIndex < rows.value.length - 1) {
        selectCell(rows.value[rowIndex + 1].id, colKey, event)
      }
      break
    case 'ArrowLeft':
      event.preventDefault()
      // RTL: ArrowLeft moves to next column
      if (colIndex < columns.value.length - 1) {
        selectCell(rowId, columns.value[colIndex + 1].key, event)
      }
      break
    case 'ArrowRight':
      event.preventDefault()
      // RTL: ArrowRight moves to previous column
      if (colIndex > 0) {
        selectCell(rowId, columns.value[colIndex - 1].key, event)
      }
      break
    case 'Enter':
      event.preventDefault()
      startEditing(rowId, colKey)
      break
    case 'Tab':
      event.preventDefault()
      if (event.shiftKey) {
        if (colIndex < columns.value.length - 1) {
          selectCell(rowId, columns.value[colIndex + 1].key)
        }
      } else {
        if (colIndex > 0) {
          selectCell(rowId, columns.value[colIndex - 1].key)
        }
      }
      break
    case 'Delete':
    case 'Backspace':
      event.preventDefault()
      if (selectedRange.value) {
        clearSelectedCells()
      } else {
        updateCellValue(rowId, colKey, '')
      }
      break
    case 'c':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        copyCells()
      }
      break
    case 'v':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        pasteCells()
      }
      break
    case 'x':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        cutCells()
      }
      break
    default:
      // Start editing on any printable character
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        startEditing(rowId, colKey)
      }
  }
}

const clearSelectedCells = () => {
  if (!selectedRange.value) return
  
  const { start, end } = selectedRange.value
  const minRow = Math.min(start.rowId, end.rowId)
  const maxRow = Math.max(start.rowId, end.rowId)
  const startColIndex = columns.value.findIndex((c: Column) => c.key === start.colKey)
  const endColIndex = columns.value.findIndex((c: Column) => c.key === end.colKey)
  const minCol = Math.min(startColIndex, endColIndex)
  const maxCol = Math.max(startColIndex, endColIndex)
  
  rows.value.forEach(row => {
    if (row.id >= minRow && row.id <= maxRow) {
      for (let i = minCol; i <= maxCol; i++) {
        row.cells[columns.value[i].key] = ''
      }
    }
  })
}

const copyCells = () => {
  if (!activeCell.value) return
  
  const cellsToCopy: Record<string, string>[] = []
  const colKeys: string[] = []
  
  if (selectedRange.value) {
    const { start, end } = selectedRange.value
    const minRow = Math.min(start.rowId, end.rowId)
    const maxRow = Math.max(start.rowId, end.rowId)
    const startColIndex = columns.value.findIndex((c: Column) => c.key === start.colKey)
    const endColIndex = columns.value.findIndex((c: Column) => c.key === end.colKey)
    const minCol = Math.min(startColIndex, endColIndex)
    const maxCol = Math.max(startColIndex, endColIndex)
    
    for (let i = minCol; i <= maxCol; i++) {
      colKeys.push(columns.value[i].key)
    }
    
    rows.value.forEach(row => {
      if (row.id >= minRow && row.id <= maxRow) {
        const cellData: Record<string, string> = {}
        colKeys.forEach(key => {
          cellData[key] = row.cells[key]
        })
        cellsToCopy.push(cellData)
      }
    })
  } else {
    const { rowId, colKey } = activeCell.value
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      colKeys.push(colKey)
      cellsToCopy.push({ [colKey]: row.cells[colKey] })
    }
  }
  
  copiedCells.value = { cells: cellsToCopy, colKeys }
}

const cutCells = () => {
  copyCells()
  clearSelectedCells()
  if (!selectedRange.value && activeCell.value) {
    updateCellValue(activeCell.value.rowId, activeCell.value.colKey, '')
  }
}

const pasteCells = () => {
  if (!copiedCells.value || !activeCell.value) return
  
  const { cells, colKeys } = copiedCells.value
  const { rowId, colKey } = activeCell.value
  const startRowIndex = rows.value.findIndex(r => r.id === rowId)
  const startColIndex = columns.value.findIndex((c: Column) => c.key === colKey)
  
  cells.forEach((cellData, rowOffset) => {
    const targetRowIndex = startRowIndex + rowOffset
    if (targetRowIndex >= rows.value.length) return
    
    colKeys.forEach((key, colOffset) => {
      const targetColIndex = startColIndex + colOffset
      if (targetColIndex >= columns.value.length) return
      
      const targetColKey = columns.value[targetColIndex].key
      rows.value[targetRowIndex].cells[targetColKey] = cellData[key] || ''
    })
  })
}

// Add one row at a time
const addMoreRows = () => {
  const currentLength = localRows.value.length
  const lastRow = localRows.value[currentLength - 1]
  const newDisplayId = lastRow ? lastRow.id + 1 : 1
  
  const cells: Record<string, string> = {}
  const styles: Record<string, CellStyle> = {}
  columns.value.forEach((col: Column) => {
    cells[col.key] = ''
    styles[col.key] = {}
  })
  
  localRows.value.push({ id: newDisplayId, height: 32, cells, styles })
  
  // Track as new row (no database ID)
  newRowDisplayIds.value.add(newDisplayId)
  
  // Update trailing empty row tracking
  // If we're adding a row, the old trailing becomes non-trailing if it has data
  if (trailingEmptyRowId.value && lastRow && !isRowEmpty(lastRow)) {
    trailingEmptyRowId.value = null
  }
  // New row becomes the trailing empty row
  trailingEmptyRowId.value = newDisplayId
}

// Context menu operations
const MENU_WIDTH = 220 // Approximate menu width
const MENU_HEIGHT = 400 // Approximate max menu height

const calculateMenuPosition = (clientX: number, clientY: number) => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  let x = clientX
  let y = clientY
  
  // Check right edge (in RTL, this is the visual left)
  if (clientX + MENU_WIDTH > viewportWidth) {
    x = clientX - MENU_WIDTH
  }
  
  // Check left edge (in RTL, this is the visual right)
  if (x < 0) {
    x = 10 // Small margin from edge
  }
  
  // Check bottom edge
  if (clientY + MENU_HEIGHT > viewportHeight) {
    y = viewportHeight - MENU_HEIGHT - 10
  }
  
  // Check top edge
  if (y < 0) {
    y = 10
  }
  
  return { x, y }
}

// Watch for context menu visibility to adjust position after render
watch(showContextMenu, (isVisible) => {
  if (isVisible) {
    nextTick(() => {
      if (contextMenuRef.value) {
        const menuRect = contextMenuRef.value.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        let newX = contextMenuX.value
        let newY = contextMenuY.value
        
        // Adjust if menu exceeds right edge
        if (menuRect.right > viewportWidth) {
          newX = viewportWidth - menuRect.width - 10
        }
        
        // Adjust if menu exceeds left edge
        if (newX < 0) {
          newX = 10
        }
        
        // Adjust if menu exceeds bottom edge
        if (menuRect.bottom > viewportHeight) {
          newY = viewportHeight - menuRect.height - 10
        }
        
        // Adjust if menu exceeds top edge
        if (newY < 0) {
          newY = 10
        }
        
        contextMenuX.value = newX
        contextMenuY.value = newY
      }
    })
  }
})

const showRowContextMenu = (event: MouseEvent, rowId: number) => {
  event.preventDefault()
  event.stopPropagation()
  
  // Select the row if not already selected
  if (!selectedRows.value.has(rowId)) {
    if (!event.ctrlKey && !event.metaKey) {
      selectedRows.value.clear()
    }
    selectedRows.value.add(rowId)
  }
  
  const { x, y } = calculateMenuPosition(event.clientX, event.clientY)
  
  contextMenuRow.value = rowId
  contextMenuCell.value = null
  contextMenuType.value = 'row'
  contextMenuX.value = x
  contextMenuY.value = y
  showContextMenu.value = true
  showColorPicker.value = false
}

const showCellContextMenu = (event: MouseEvent, rowId: number, colKey: string) => {
  event.preventDefault()
  event.stopPropagation()
  
  // Select the cell
  activeCell.value = { rowId, colKey }
  selectedRows.value.clear()
  
  const { x, y } = calculateMenuPosition(event.clientX, event.clientY)
  
  contextMenuCell.value = { rowId, colKey }
  contextMenuRow.value = rowId
  contextMenuType.value = 'cell'
  contextMenuX.value = x
  contextMenuY.value = y
  showContextMenu.value = true
  showColorPicker.value = false
}

const closeContextMenu = () => {
  showContextMenu.value = false
  contextMenuRow.value = null
  contextMenuCell.value = null
  showColorPicker.value = false
  activeSubmenu.value = null
  submenuHovered.value = false
  menuItemHovered.value = false
  lockedColorTarget.value = null
}

const copyRow = () => {
  const rowsToCopy = selectedRows.value.size > 0 
    ? Array.from(selectedRows.value) 
    : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
  
  if (rowsToCopy.length === 0) return
  
  const cellsToCopy: Record<string, string>[] = []
  const colKeys = columns.value.map((col: Column) => col.key)
  
  rowsToCopy.sort((a, b) => a - b).forEach(rowId => {
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      cellsToCopy.push({ ...row.cells })
    }
  })
  
  copiedCells.value = { cells: cellsToCopy, colKeys }
  cutMode.value = false
  cutSource.value = null
  closeContextMenu()
}

const cutRow = () => {
  const rowsToCut = selectedRows.value.size > 0 
    ? Array.from(selectedRows.value) 
    : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
  
  if (rowsToCut.length === 0) return
  
  const cellsToCopy: Record<string, string>[] = []
  const colKeys = columns.value.map((col: Column) => col.key)
  
  rowsToCut.sort((a, b) => a - b).forEach(rowId => {
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      cellsToCopy.push({ ...row.cells })
    }
  })
  
  copiedCells.value = { cells: cellsToCopy, colKeys }
  cutMode.value = true
  cutSource.value = { type: 'row', rowIds: [...rowsToCut] }
  closeContextMenu()
}

const copyCell = () => {
  if (!contextMenuCell.value) return
  const { rowId, colKey } = contextMenuCell.value
  const row = rows.value.find(r => r.id === rowId)
  if (row) {
    copiedCells.value = { 
      cells: [{ [colKey]: row.cells[colKey] }], 
      colKeys: [colKey] 
    }
  }
  cutMode.value = false
  cutSource.value = null
  closeContextMenu()
}

const cutCell = () => {
  if (!contextMenuCell.value) return
  const { rowId, colKey } = contextMenuCell.value
  const row = rows.value.find(r => r.id === rowId)
  if (row) {
    copiedCells.value = { 
      cells: [{ [colKey]: row.cells[colKey] }], 
      colKeys: [colKey] 
    }
    cutMode.value = true
    cutSource.value = { type: 'cell', cell: { rowId, colKey } }
  }
  closeContextMenu()
}

const pasteToCell = () => {
  pasteCells()
  // Clear cut source after paste if in cut mode
  if (cutMode.value && cutSource.value) {
    if (cutSource.value.type === 'row' && cutSource.value.rowIds) {
      cutSource.value.rowIds.forEach(rowId => {
        const row = rows.value.find(r => r.id === rowId)
        if (row) {
          columns.value.forEach((col: Column) => {
            row.cells[col.key] = ''
          })
        }
      })
    } else if (cutSource.value.type === 'cell' && cutSource.value.cell) {
      const { rowId, colKey } = cutSource.value.cell
      const row = rows.value.find(r => r.id === rowId)
      if (row) {
        row.cells[colKey] = ''
      }
    }
    cutMode.value = false
    cutSource.value = null
  }
  closeContextMenu()
}

const duplicateRow = () => {
  const rowsToDuplicate = selectedRows.value.size > 0 
    ? Array.from(selectedRows.value).sort((a, b) => a - b)
    : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
  
  if (rowsToDuplicate.length === 0) return
  
  // Find the last row index to insert after
  const lastRowId = rowsToDuplicate[rowsToDuplicate.length - 1]
  const lastRowIndex = rows.value.findIndex(r => r.id === lastRowId)
  if (lastRowIndex === -1) return
  
  // Get max ID for new display IDs
  let maxId = Math.max(...localRows.value.map(r => r.id), 0)
  
  // Create duplicate rows with proper tracking
  const duplicatedRows: Row[] = []
  rowsToDuplicate.forEach((rowId, idx) => {
    const sourceRow = rows.value.find(r => r.id === rowId)
    if (sourceRow) {
      const newDisplayId = ++maxId
      const insertAtOrder = lastRowIndex + 2 + idx  // After the last selected row (1-indexed)
      
      duplicatedRows.push({
        id: newDisplayId,
        height: sourceRow.height,
        cells: { ...sourceRow.cells },
        styles: JSON.parse(JSON.stringify(sourceRow.styles))
      })
      
      // Track as new rows inserted at specific positions
      newRowDisplayIds.value.add(newDisplayId)
      insertedRowPositions.value.set(newDisplayId, insertAtOrder)
    }
  })
  
  // Insert after the last selected row
  rows.value.splice(lastRowIndex + 1, 0, ...duplicatedRows)
  
  isDirty.value = hasMeaningfulChanges.value
  closeContextMenu()
}

const insertRowAbove = () => {
  const targetRowId = contextMenuRow.value ?? (selectedRows.value.size > 0 ? Math.min(...selectedRows.value) : null)
  if (targetRowId === null) return
  
  const rowIndex = rows.value.findIndex(r => r.id === targetRowId)
  if (rowIndex === -1) return
  
  // Calculate the insert position (1-indexed for backend)
  const insertAtOrder = rowIndex + 1  // Insert AT this position (shifts current row down)
  
  // Create new row with a unique display ID
  const maxId = Math.max(...localRows.value.map(r => r.id), 0)
  const newDisplayId = maxId + 1
  
  const cells: Record<string, string> = {}
  const styles: Record<string, CellStyle> = {}
  columns.value.forEach((col: Column) => {
    cells[col.key] = ''
    styles[col.key] = {}
  })
  const newRow: Row = { id: newDisplayId, height: 32, cells, styles }
  
  // Insert into the array
  rows.value.splice(rowIndex, 0, newRow)
  
  // Track this as an INSERTION at a specific position
  newRowDisplayIds.value.add(newDisplayId)
  insertedRowPositions.value.set(newDisplayId, insertAtOrder)
  
  // Update display IDs for all rows after the insertion to maintain uniqueness
  // Note: We do NOT re-index all rows anymore - we keep original IDs stable
  // The backend handles the actual position shifting
  
  isDirty.value = hasMeaningfulChanges.value
  closeContextMenu()
}

const insertRowBelow = () => {
  const targetRowId = contextMenuRow.value ?? (selectedRows.value.size > 0 ? Math.max(...selectedRows.value) : null)
  if (targetRowId === null) return
  
  const rowIndex = rows.value.findIndex(r => r.id === targetRowId)
  if (rowIndex === -1) return
  
  // Calculate the insert position (1-indexed for backend)
  // Insert AFTER the current row = at position rowIndex + 2 (1-indexed)
  const insertAtOrder = rowIndex + 2
  
  // Create new row with a unique display ID
  const maxId = Math.max(...localRows.value.map(r => r.id), 0)
  const newDisplayId = maxId + 1
  
  const cells: Record<string, string> = {}
  const styles: Record<string, CellStyle> = {}
  columns.value.forEach((col: Column) => {
    cells[col.key] = ''
    styles[col.key] = {}
  })
  const newRow: Row = { id: newDisplayId, height: 32, cells, styles }
  
  // Insert into the array
  rows.value.splice(rowIndex + 1, 0, newRow)
  
  // Track this as an INSERTION at a specific position
  newRowDisplayIds.value.add(newDisplayId)
  insertedRowPositions.value.set(newDisplayId, insertAtOrder)
  
  isDirty.value = hasMeaningfulChanges.value
  closeContextMenu()
}

const deleteRow = () => {
  const rowsToDelete = selectedRows.value.size > 0 
    ? Array.from(selectedRows.value) 
    : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
  
  if (rowsToDelete.length === 0) return
  
  // Track deletions properly
  rowsToDelete.forEach(displayId => {
    // Check if this row has a database ID (existing row from server)
    const databaseId = getDatabaseId(displayId)
    if (databaseId !== undefined) {
      // This was a server row - mark for deletion by DATABASE ID
      deletedDatabaseIds.value.add(databaseId)
      modifiedDatabaseIds.value.delete(databaseId)  // No need to update if deleted
      displayToDatabaseId.value.delete(displayId)  // Remove the mapping
      originalRowsSnapshot.value.delete(databaseId)  // Remove from snapshot
    }
    
    // If it was a new row (not from server), just remove from tracking
    newRowDisplayIds.value.delete(displayId)
    insertedRowPositions.value.delete(displayId)
    
    // Handle trailing empty row
    if (displayId === trailingEmptyRowId.value) {
      trailingEmptyRowId.value = null
    }
  })
  
  // Remove rows from display (from end to start to maintain indices)
  rowsToDelete.sort((a, b) => b - a).forEach(displayId => {
    const rowIndex = localRows.value.findIndex(r => r.id === displayId)
    if (rowIndex !== -1) {
      localRows.value.splice(rowIndex, 1)
    }
  })
  
  // NOTE: We do NOT re-index rows anymore
  // The backend handles renumbering when save is called
  // This preserves the mapping between displayId and databaseId for remaining rows
  
  isDirty.value = hasMeaningfulChanges.value
  selectedRows.value.clear()
  closeContextMenu()
}

const clearRow = () => {
  const rowsToClear = selectedRows.value.size > 0 
    ? Array.from(selectedRows.value) 
    : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
  
  rowsToClear.forEach(rowId => {
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      columns.value.forEach((col: Column) => {
        row.cells[col.key] = ''
      })
    }
  })
  closeContextMenu()
}

const clearCell = () => {
  if (!contextMenuCell.value) return
  const { rowId, colKey } = contextMenuCell.value
  const row = rows.value.find(r => r.id === rowId)
  if (row) {
    row.cells[colKey] = ''
  }
  closeContextMenu()
}

// Cell formatting functions
const toggleBold = () => {
  if (contextMenuType.value === 'cell' && contextMenuCell.value) {
    const { rowId, colKey } = contextMenuCell.value
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      if (!row.styles[colKey]) row.styles[colKey] = {}
      row.styles[colKey].bold = !row.styles[colKey].bold
    }
  } else if (contextMenuType.value === 'row') {
    const rowsToFormat = selectedRows.value.size > 0 
      ? Array.from(selectedRows.value) 
      : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
    
    rowsToFormat.forEach(rowId => {
      const row = rows.value.find(r => r.id === rowId)
      if (row) {
        columns.value.forEach((col: Column) => {
          if (!row.styles[col.key]) row.styles[col.key] = {}
          row.styles[col.key].bold = !row.styles[col.key].bold
        })
      }
    })
  }
  closeContextMenu()
}

const toggleItalic = () => {
  if (contextMenuType.value === 'cell' && contextMenuCell.value) {
    const { rowId, colKey } = contextMenuCell.value
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      if (!row.styles[colKey]) row.styles[colKey] = {}
      row.styles[colKey].italic = !row.styles[colKey].italic
    }
  } else if (contextMenuType.value === 'row') {
    const rowsToFormat = selectedRows.value.size > 0 
      ? Array.from(selectedRows.value) 
      : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
    
    rowsToFormat.forEach(rowId => {
      const row = rows.value.find(r => r.id === rowId)
      if (row) {
        columns.value.forEach((col: Column) => {
          if (!row.styles[col.key]) row.styles[col.key] = {}
          row.styles[col.key].italic = !row.styles[col.key].italic
        })
      }
    })
  }
  closeContextMenu()
}

// Hover timeout to prevent accidental switching
const hoverTimeout = ref<number | null>(null)

// Handle submenu hover for flyout color pickers
const handleSubmenuHover = (target: 'bg' | 'text', event: MouseEvent) => {
  // If flyout is already open with a locked target, don't change it unless we hover for a while
  if (submenuHovered.value && lockedColorTarget.value !== null) {
    return
  }
  
  // If already active on this target, do nothing
  if (activeSubmenu.value === target) return

  const menuItem = event.currentTarget as HTMLElement
  
  // Clear any existing timeout
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }
  
  // Set delay to switch submenu (prevents accidental switching when moving mouse diagonally)
  hoverTimeout.value = window.setTimeout(() => {
    const rect = menuItem.getBoundingClientRect()
    const contextMenuEl = contextMenuRef.value
    
    if (!contextMenuEl) return
    
    const contextRect = contextMenuEl.getBoundingClientRect()
    const submenuWidth = 280 // Width of color picker submenu
    const viewportWidth = window.innerWidth
    
    // Determine if submenu should open to the left or right
    // In RTL, default is to open to the left (visual right)
    let openLeft = true
    let left = contextRect.left - submenuWidth - 4
    
    // If not enough space on left, open to the right
    if (left < 10) {
      openLeft = false
      left = contextRect.right + 4
    }
    
    // If still not enough space on right, force left with scroll
    if (left + submenuWidth > viewportWidth - 10) {
      left = viewportWidth - submenuWidth - 10
    }
    
    // Calculate top position aligned with menu item
    let top = rect.top - 8
    
    // Check bottom edge
    const submenuHeight = 320 // Approximate height
    if (top + submenuHeight > window.innerHeight - 10) {
      top = window.innerHeight - submenuHeight - 10
    }
    
    // Check top edge
    if (top < 10) {
      top = 10
    }
    
    // Double check we haven't entered the flyout in the meantime
    if (submenuHovered.value) return

    submenuPosition.value = { top, left, openLeft }
    activeSubmenu.value = target
    colorPickerTarget.value = target
    lockedColorTarget.value = target // Lock the target
    menuItemHovered.value = true
  }, 200) // 200ms delay to prevent accidental switches
}

const handleMenuItemLeave = () => {
  // Clear the open timeout if we leave before it fires
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
    hoverTimeout.value = null
  }
  
  menuItemHovered.value = false
  closeSubmenu()
}

const closeSubmenu = () => {
  // Use a longer delay to allow moving to submenu
  setTimeout(() => {
    if (!submenuHovered.value && !menuItemHovered.value) {
      activeSubmenu.value = null
    }
  }, 150)
}

// Track if hovering over submenu or menu item
const submenuHovered = ref(false)
const menuItemHovered = ref(false)

// Keep submenu open when hovering over it
const handleSubmenuEnter = () => {
  // If we receive a pending switch to another submenu but we entered the flyout,
  // we should likely cancel that switch because the user intention was to interact 
  // with the CURRENT flyout, not the one they briefly crossed.
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
    hoverTimeout.value = null
  }
  
  submenuHovered.value = true
}

const handleSubmenuLeave = () => {
  submenuHovered.value = false
  setTimeout(() => {
    if (!menuItemHovered.value) {
      activeSubmenu.value = null
    }
  }, 100)
}

const applyColor = (color: string) => {
  // Use the locked target - this is the target that was set when the flyout opened
  const target = lockedColorTarget.value || colorPickerTarget.value
  
  if (contextMenuType.value === 'cell' && contextMenuCell.value) {
    const { rowId, colKey } = contextMenuCell.value
    const rowIndex = rows.value.findIndex(r => r.id === rowId)
    if (rowIndex !== -1) {
      const row = rows.value[rowIndex]
      if (!row.styles) row.styles = {}
      if (!row.styles[colKey]) row.styles[colKey] = {}
      
      if (target === 'bg') {
        if (color === '') {
          row.styles[colKey].backgroundColor = undefined
        } else {
          row.styles[colKey].backgroundColor = color
        }
      } else {
        if (color === '') {
          row.styles[colKey].textColor = undefined
        } else {
          row.styles[colKey].textColor = color
        }
      }
      // Force reactivity update
      rows.value[rowIndex] = { ...row }
    }
  } else if (contextMenuType.value === 'row') {
    const rowsToFormat = selectedRows.value.size > 0 
      ? Array.from(selectedRows.value) 
      : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
    
    rowsToFormat.forEach(rowId => {
      const rowIndex = rows.value.findIndex(r => r.id === rowId)
      if (rowIndex !== -1) {
        const row = rows.value[rowIndex]
        if (!row.styles) row.styles = {}
        
        columns.value.forEach((col: Column) => {
          if (!row.styles[col.key]) row.styles[col.key] = {}
          if (target === 'bg') {
            if (color === '') {
              row.styles[col.key].backgroundColor = undefined
            } else {
              row.styles[col.key].backgroundColor = color
            }
          } else {
            if (color === '') {
              row.styles[col.key].textColor = undefined
            } else {
              row.styles[col.key].textColor = color
            }
          }
        })
        // Force reactivity update
        rows.value[rowIndex] = { ...row }
      }
    })
  }
  // Reset all states
  lockedColorTarget.value = null
  activeSubmenu.value = null
  submenuHovered.value = false
  menuItemHovered.value = false
  setTimeout(() => {
    closeContextMenu()
  }, 50)
}

const clearFormatting = () => {
  if (contextMenuType.value === 'cell' && contextMenuCell.value) {
    const { rowId, colKey } = contextMenuCell.value
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      row.styles[colKey] = {}
    }
  } else if (contextMenuType.value === 'row') {
    const rowsToFormat = selectedRows.value.size > 0 
      ? Array.from(selectedRows.value) 
      : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
    
    rowsToFormat.forEach(rowId => {
      const row = rows.value.find(r => r.id === rowId)
      if (row) {
        columns.value.forEach((col: Column) => {
          row.styles[col.key] = {}
        })
      }
    })
  }
  closeContextMenu()
}

// Double-click to auto-fit column width
const autoFitColumn = (index: number) => {
  const colKey = columns.value[index].key
  let maxWidth = columns.value[index].minWidth
  
  // Check header width
  const headerWidth = columns.value[index].label.length * 12
  maxWidth = Math.max(maxWidth, headerWidth)
  
  // Check all cells in this column
  rows.value.forEach(row => {
    const cellContent = row.cells[colKey]
    if (cellContent) {
      const contentWidth = cellContent.length * 10 + 20
      maxWidth = Math.max(maxWidth, contentWidth)
    }
  })
  
  columns.value[index].width = Math.min(maxWidth, 400) // Max 400px
}

// Import/Export state
const showImportModal = ref(false)
const isExporting = ref(false)
const isImporting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const importMode = ref<'replace' | 'append'>('replace') // 'replace' = remove old data, 'append' = add to existing
const importError = ref<string | null>(null)

// Create Excel workbook from scratch with header image
// Create Excel workbook from scratch with header image
const createExcelWorkbook = async (includeData: boolean = false): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'NCEMA Activities System'
  workbook.created = new Date()
  
  // Use sheet name or default
  const sheetDisplayName = selectedSheet.value?.name || selectedTitle.value?.name || 'الأنشطة'
  const worksheet = workbook.addWorksheet(sheetDisplayName, {
    views: [{ rightToLeft: true }] // RTL for Arabic
  })
  
  // Build dynamic column headers from current columns
  const excelHeaders = columns.value.map(col => ({
    key: col.key,
    header: col.label,
    width: Math.max(Math.ceil(col.width / 7), 15) // Convert pixel width to Excel width units
  }))
  
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
  // Merge cells for header row dynamically based on column count
  worksheet.mergeCells(`A1:${lastColLetter}1`)
  worksheet.getRow(1).height = 70
  
  // Add white background to merged header cell
  const headerCell = worksheet.getCell('A1')
  headerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFFF' } // White background
  }
  
  // Try to add header image with actual dimensions (790x161 pixels)
  try {
    const imageResponse = await fetch('/excel_header.png')
    if (imageResponse.ok) {
      const imageBuffer = await imageResponse.arrayBuffer()
      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: 'png',
      })
      
      // Add image at actual size (790x161 pixels) starting from top-left of A1
      // Position image within the merged cell without stretching
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 590, height: 91 } // Actual image dimensions in pixels
      })
    }
  } catch (error) {
    console.warn('Could not load header image:', error)
    // If image fails, add text header instead
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
  
  // If including data, add rows starting from row 3
  if (includeData) {
    let currentRow = 3
    
    rows.value.forEach(row => {
      // Check if row has any data
      const hasData = Object.values(row.cells).some(v => v && v.trim() !== '')
      if (!hasData) return
      
      const dataRow = worksheet.getRow(currentRow)
      dataRow.height = 25
      
      // Use dynamic column keys from excelHeaders
      excelHeaders.forEach((col, index) => {
        const cell = dataRow.getCell(index + 1) // Start from column A (index 1)
        cell.value = row.cells[col.key] || ''
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
  }
  
  // Enable AutoFilter on header row (row 2) for all data columns
  worksheet.autoFilter = {
    from: { row: 2, column: 1 }, // Start from A2
    to: { row: 2, column: columnCount }    // End at last column
  }
  
  return workbook
}

// Download template (creates new Excel with header image and column names only)
const downloadTemplate = async () => {
  try {
    const workbook = await createExcelWorkbook(false)
    
    // Add a few empty rows for template
    const worksheet = workbook.worksheets[0]
    const columnCount = columns.value.length
    
    for (let i = 3; i <= 12; i++) {
      const row = worksheet.getRow(i)
      row.height = 25
      
      // Empty data cells with borders (dynamic column count)
      for (let col = 1; col <= columnCount; col++) {
        const cell = row.getCell(col)
        cell.value = ''
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        }
        if (i % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
          }
        }
      }
    }
    
    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    
    // Use dynamic filename based on selected title/sheet
    const titleName = selectedTitle.value?.name || 'activities'
    const sheetName = selectedSheet.value?.name || ''
    const filename = sheetName 
      ? `${titleName}_${sheetName}_template.xlsx`
      : `${titleName}_template.xlsx`
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Template download error:', error)
  }
}

// Export to Excel (creates new Excel with header image, column names, and data)
const exportToExcel = async () => {
  isExporting.value = true
  
  try {
    // Use ExcelJS to create Excel locally
    const workbook = await createExcelWorkbook(true)
    
    // Generate filename with date and sheet name
    const date = new Date().toISOString().split('T')[0]
    const titleName = selectedTitle.value?.name || 'activities'
    const sheetName = selectedSheet.value?.name || ''
    const filename = sheetName 
      ? `${titleName}_${sheetName}_export_${date}.xlsx`
      : `${titleName}_export_${date}.xlsx`
    
    // Write to buffer and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export error:', error)
  } finally {
    isExporting.value = false
  }
}

// Open import modal
const openImportModal = () => {
  importError.value = null
  importMode.value = 'replace' // Default to replace mode
  showImportModal.value = true
}

// Close import modal
const closeImportModal = () => {
  showImportModal.value = false
  importError.value = null
  // Reset file input
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// Trigger file input click
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

// Handle file upload
const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Check file extension
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    importError.value = 'يرجى اختيار ملف Excel (.xlsx أو .xls)'
    return
  }
  
  isImporting.value = true
  importError.value = null
  
  try {
    // Process Excel file locally
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Excel format (created by our system):
    // Row 1: Header image (logo) - skip this row
    // Row 2: Column names (headers) - Column A is row number, B-J are data columns
    // Row 3+: Data
    
    // Read starting from row 2 (index 1) as header, data starts from row 3
    // range: 1 means skip row 1 (0-indexed), so headers are read from row 2
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { 
      defval: '',
      range: 1  // Skip row 1 (image), use row 2 as headers
    })
    
    if (jsonData.length === 0) {
      importError.value = 'الملف لا يحتوي على بيانات'
      return
    }
    
    // Debug: log the keys to see what headers were detected
    console.log('Detected headers from row 2:', jsonData.length > 0 ? Object.keys(jsonData[0]) : [])
    
    // Build dynamic header mappings from current columns
    // Each column's label can have multiple lines (e.g., "نوع النشاط\nType of activity")
    const headerMappings: { patterns: string[], key: string }[] = columns.value.map(col => {
      // Split label by newlines and trim each part as patterns
      const patterns = col.label.split('\n').map(p => p.trim()).filter(p => p.length > 0)
      // Also add the column key itself as a pattern
      patterns.push(col.key)
      return {
        patterns,
        key: col.key
      }
    })
    
    // Find the matching column key for an Excel header
    const findColumnKey = (excelHeader: string): string | null => {
      const normalized = excelHeader.replace(/\s+/g, ' ').trim().toLowerCase()
      
      for (const mapping of headerMappings) {
        for (const pattern of mapping.patterns) {
          const normalizedPattern = pattern.toLowerCase()
          if (normalized.includes(normalizedPattern) || normalizedPattern.includes(normalized)) {
            return mapping.key
          }
        }
      }
      return null
    }
    
    // Map imported data to rows
    const newRows: Row[] = []
    
    jsonData.forEach((rowData) => {
      const cells: Record<string, string> = {}
      const styles: Record<string, CellStyle> = {}
      
      // Initialize all columns with empty values
      columns.value.forEach((col: Column) => {
        cells[col.key] = ''
        styles[col.key] = {}
      })
      
      // Map each Excel column to our column key
      Object.entries(rowData).forEach(([excelHeader, value]) => {
        // Skip the row number column (usually empty header or number)
        if (!excelHeader || excelHeader === '' || !isNaN(Number(value))) {
          // Check if this is just a row number
          const numValue = Number(value)
          if (!isNaN(numValue) && numValue > 0 && numValue < 1000) {
            return // Skip row numbers
          }
        }
        
        const colKey = findColumnKey(excelHeader)
        if (colKey) {
          cells[colKey] = String(value).trim()
        }
      })
      
      // Only add rows with actual data (skip empty rows or placeholder rows)
      const hasRealData = Object.values(cells).some(v => 
        v !== '' && v !== 'اختار' && v !== 'اختيار'
      )
      if (hasRealData) {
        newRows.push({
          id: newRows.length + 1,
          height: 32,
          cells,
          styles
        })
      }
    })
    
    if (newRows.length === 0) {
      importError.value = 'لم يتم العثور على بيانات صالحة في الملف'
      return
    }
    
    // Handle based on import mode
    if (importMode.value === 'append') {
      // Append mode: Add new rows to existing data
      // Find existing rows with data
      const existingDataRows = rows.value.filter(row => 
        Object.values(row.cells).some(v => v && v.trim() !== '')
      )
      
      // Combine existing + new rows
      const combinedRows: Row[] = [
        ...existingDataRows,
        ...newRows.map((row, idx) => ({
          ...row,
          id: existingDataRows.length + idx + 1
        }))
      ]
      
      // Add empty rows to reach minimum of 20
      while (combinedRows.length < 20) {
        const cells: Record<string, string> = {}
        const styles: Record<string, CellStyle> = {}
        columns.value.forEach((col: Column) => {
          cells[col.key] = ''
          styles[col.key] = {}
        })
        combinedRows.push({
          id: combinedRows.length + 1,
          height: 32,
          cells,
          styles
        })
      }
      
      rows.value = combinedRows
      saveSuccess.value = `تم إضافة ${newRows.length} صف جديد بنجاح`
    } else {
      // Replace mode: Remove old data and use new data
      // Add empty rows to reach minimum of 20
      while (newRows.length < 20) {
        const cells: Record<string, string> = {}
        const styles: Record<string, CellStyle> = {}
        columns.value.forEach((col: Column) => {
          cells[col.key] = ''
          styles[col.key] = {}
        })
        newRows.push({
          id: newRows.length + 1,
          height: 32,
          cells,
          styles
        })
      }
      
      rows.value = newRows
      saveSuccess.value = `تم استبدال البيانات بـ ${newRows.filter(r => Object.values(r.cells).some(v => v && v.trim())).length} صف بنجاح`
    }
    
    // Mark as dirty (unsaved changes)
    isDirty.value = true
    setTimeout(() => { saveSuccess.value = null }, 3000)
    
    // Close modal
    closeImportModal()
  } catch (error) {
    console.error('Import error:', error)
    importError.value = 'حدث خطأ أثناء قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة.'
  } finally {
    isImporting.value = false
    // Reset file input
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

// Handle drag and drop file upload
const handleDrop = (event: DragEvent) => {
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    // Create a synthetic event with the file
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    if (fileInputRef.value) {
      fileInputRef.value.files = dataTransfer.files
      handleFileUpload({ target: fileInputRef.value } as unknown as Event)
    }
  }
}

// Handle click outside to close filter dropdown
const handleClickOutside = (event: MouseEvent) => {
  if (activeFilterColumn.value) {
    const target = event.target as HTMLElement
    const filterDropdown = document.querySelector('[class*="filterDropdown"]')
    const filterBtn = target.closest('[class*="filterBtn"]')
    
    if (!filterDropdown?.contains(target) && !filterBtn) {
      closeFilterDropdown()
    }
  }
}

// Browser close/refresh warning
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasMeaningfulChanges.value && selectedTitleId.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// Navigation guard for unsaved changes
onBeforeRouteLeave((_to, _from, next) => {
  if (hasMeaningfulChanges.value && selectedTitleId.value) {
    if (confirm('لديك تغييرات غير محفوظة. هل تريد المغادرة؟')) {
      next()
    } else {
      next(false)
    }
  } else {
    next()
  }
})

// Lifecycle
onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', closeContextMenu)
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // Load available titles on mount
  await loadTitles()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div :class="$style.container">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.headerContent">
        <!-- Title Selection Dropdown -->
        <div :class="$style.titleSelector">
          <label :class="$style.titleLabel">اختر العنوان:</label>
          <select 
            v-model="selectedTitleId" 
            :class="$style.titleDropdown"
            :disabled="isLoadingTitles || isLoadingData"
          >
            <option :value="null">-- اختر عنواناً --</option>
            <option 
              v-for="title in availableTitles" 
              :key="title.id" 
              :value="title.id"
            >
              {{ title.name }} ({{ title.column_count }} عمود)
            </option>
          </select>
          <span v-if="isLoadingTitles" :class="$style.loadingText">
            <i class="fas fa-spinner fa-spin"></i>
          </span>
        </div>
        
        <!-- Sheet Selection Dropdown (shows when title is selected) -->
        <div v-if="selectedTitleId && !isLoadingSheetsForTitle" :class="$style.sheetSelector">
          <label :class="$style.titleLabel">اختر الجدول:</label>
          <select 
            v-model="selectedSheetId" 
            :class="$style.titleDropdown"
            :disabled="isLoadingData"
          >
            <option :value="null">-- اختر جدولاً --</option>
            <option 
              v-for="sheet in userSheets" 
              :key="sheet.id" 
              :value="sheet.id"
            >
              {{ sheet.name }} ({{ sheet.row_count }} صف)
            </option>
          </select>
          <button 
            :class="$style.newSheetBtn"
            @click="openCreateSheetModal"
            title="إنشاء جدول جديد"
          >
            <i class="fas fa-plus"></i>
          </button>
        </div>
        
        <!-- Loading sheets indicator -->
        <span v-if="isLoadingSheetsForTitle" :class="$style.loadingText">
          <i class="fas fa-spinner fa-spin"></i>
          جاري تحميل الجداول...
        </span>
        
        <!-- Selected sheet info -->
        <span v-if="selectedSheet" :class="$style.selectedTitleInfo">
          {{ selectedSheet.description || selectedTitle?.description }}
        </span>
      </div>
      
      <div :class="$style.toolbar">
        <!-- Unsaved indicator -->
        <span v-if="hasMeaningfulChanges && selectedSheetId" :class="$style.unsavedIndicator">
          <i class="fas fa-circle"></i>
          تغييرات غير محفوظة
        </span>
        
        <!-- Save button -->
        <button 
          v-if="selectedSheetId"
          :class="[$style.toolbarBtn, $style.saveBtn]" 
          title="حفظ"
          @click="saveUserData"
          :disabled="!hasMeaningfulChanges || isSavingData"
        >
          <i v-if="isSavingData" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          <span>{{ isSavingData ? 'جاري الحفظ...' : 'حفظ' }}</span>
        </button>
        
        <button :class="$style.toolbarBtn" title="إضافة صفوف" @click="addMoreRows" :disabled="!selectedSheetId">
          <i class="fas fa-plus"></i>
          <span>إضافة صفوف</span>
        </button>
        <button :class="$style.toolbarBtn" title="استيراد من Excel" @click="openImportModal" :disabled="!selectedSheetId">
          <i class="fas fa-file-import"></i>
          <span>استيراد</span>
        </button>
        <button :class="$style.toolbarBtn" title="تصدير إلى Excel" @click="exportToExcel" :disabled="isExporting || !selectedSheetId">
          <i class="fas fa-file-export"></i>
          <span>{{ isExporting ? 'جاري التصدير...' : 'تصدير' }}</span>
        </button>
      </div>
    </div>

    <!-- Success/Error messages -->
    <div v-if="saveSuccess" :class="$style.successMessage">
      <i class="fas fa-check-circle"></i>
      {{ saveSuccess }}
    </div>
    <div v-if="dataError" :class="$style.errorMessage">
      <i class="fas fa-exclamation-circle"></i>
      {{ dataError }}
    </div>

    <!-- Loading sheets state -->
    <div v-if="isLoadingSheetsForTitle" :class="$style.loadingSheets">
      <i class="fas fa-spinner"></i>
      <span>جاري تحميل الجداول...</span>
    </div>

    <!-- Loading state -->
    <div v-if="isLoadingData && !isLoadingSheetsForTitle" :class="$style.loadingOverlay">
      <i class="fas fa-spinner fa-spin"></i>
      جاري تحميل البيانات...
    </div>

    <!-- No title selected message -->
    <div v-if="!selectedTitleId && !isLoadingTitles" :class="$style.noTitleSelected">
      <i class="fas fa-table"></i>
      <p>اختر عنواناً من القائمة لعرض الجدول</p>
      <p v-if="availableTitles.length === 0" :class="$style.hint">
        لا توجد عناوين منشورة. اطلب من المسؤول إنشاء عنوان.
      </p>
    </div>

    <!-- Sheet selection / creation when title is selected but no sheet -->
    <div v-if="selectedTitleId && !selectedSheetId && !isLoadingSheetsForTitle && !isLoadingData" :class="$style.sheetSelectionArea">
      <div :class="$style.sheetsHeader">
        <h3 :class="$style.sheetsTitle"><i class="fas fa-file-spreadsheet"></i> جداولك لهذا العنوان</h3>
        <button :class="$style.createSheetBtn" @click="openCreateSheetModal">
          <i class="fas fa-plus"></i>
          إنشاء جدول جديد
        </button>
      </div>
      
      <div v-if="userSheets.length === 0" :class="$style.noSheetsMessage">
        <div :class="$style.noSheetsIcon"><i class="fas fa-folder-open"></i></div>
        <p :class="$style.noSheetsText">لم تقم بإنشاء أي جدول لهذا العنوان بعد</p>
        <p :class="$style.noSheetsDesc">أنشئ جدولك الأول لبدء إدخال البيانات</p>
        <button :class="$style.createFirstSheetBtn" @click="openCreateSheetModal">
          <i class="fas fa-plus"></i>
          إنشاء جدولك الأول
        </button>
      </div>
      
      <div v-else :class="$style.sheetsList">
        <div 
          v-for="sheet in userSheets" 
          :key="sheet.id" 
          :class="$style.sheetCard"
          @click="selectedSheetId = sheet.id"
        >
          <div :class="$style.sheetCardIcon">
            <i class="fas fa-file-spreadsheet"></i>
          </div>
          <div :class="$style.sheetCardContent">
            <h4 :class="$style.sheetName">{{ sheet.name }}</h4>
            <p v-if="sheet.description" :class="$style.sheetDescription">{{ sheet.description }}</p>
            <div :class="$style.sheetMeta">
              <span><i class="fas fa-rows"></i> {{ sheet.row_count }} صف</span>
              <span><i class="fas fa-clock"></i> {{ formatDate(sheet.updated_at) }}</span>
            </div>
          </div>
          <div :class="$style.sheetCardActions">
            <button 
              :class="$style.sheetActionBtn"
              @click.stop="deleteSheet(sheet.id)"
              title="حذف الجدول"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Spreadsheet (shows when both title and sheet are selected) -->
    <div v-if="selectedSheetId" :class="$style.spreadsheetWrapper">
      <div 
        ref="tableRef"
        :class="$style.spreadsheet"
        :style="{ minWidth: totalWidth + 'px' }"
      >
        <!-- Column Headers -->
        <div :class="$style.headerRow">
          <!-- Row number header -->
          <div :class="[$style.headerCell, $style.rowNumberHeader]">
            #
          </div>
          <!-- Column headers -->
          <div
            v-for="(col, index) in columns"
            :key="col.id"
            :class="$style.headerCell"
            :style="{ width: col.width + 'px' }"
            @dblclick="autoFitColumn(index)"
          >
            <span :class="$style.headerText">{{ col.label }}</span>
            <!-- Filter button -->
            <button
              :class="[$style.filterBtn, { [$style.filterActive]: hasActiveFilter(col.key) }]"
              @click.stop="openFilterDropdown(col.key, $event)"
              :title="'تصفية ' + col.label.split('\n')[0]"
            >
              <i class="fas fa-caret-down"></i>
            </button>
            <!-- Column resize handle -->
            <div
              :class="$style.colResizeHandle"
              @mousedown="startColResize($event, index)"
            ></div>
          </div>
        </div>

        <!-- Data Rows -->
        <div :class="$style.dataRows">
          <div
            v-for="(row, rowIndex) in filteredRows"
            :key="row.id"
            :class="[$style.dataRow, { [$style.rowSelected]: isRowSelected(row.id) }, { [$style.rowHasCustomBg]: rowHasCustomBackground(row.id) }]"
            :style="{ height: row.height + 'px' }"
          >
            <!-- Row number -->
            <div 
              :class="[$style.cell, $style.rowNumberCell, { [$style.rowNumberSelected]: isRowSelected(row.id) }]"
              @click="selectRow(row.id, $event)"
              @contextmenu="showRowContextMenu($event, row.id)"
            >
              {{ row.id }}
              <!-- Row resize handle -->
              <div
                :class="$style.rowResizeHandle"
                @mousedown.stop="startRowResize($event, rowIndex)"
              ></div>
            </div>
            <!-- Data cells -->
            <div
              v-for="col in columns"
              :key="getCellId(row.id, col.key)"
              :data-cell-id="getCellId(row.id, col.key)"
              :class="[
                $style.cell,
                { [$style.cellActive]: isCellActive(row.id, col.key) },
                { [$style.cellSelected]: isCellSelected(row.id, col.key) },
                { [$style.cellEditing]: isCellEditing(row.id, col.key) },
                { [$style.cellCut]: isCellCut(row.id, col.key) },
                { [$style.hasCustomBg]: hasCustomBackground(row.id, col.key) }
              ]"
              :style="{ width: col.width + 'px', ...getCellStyle(row.id, col.key) }"
              @click="selectCell(row.id, col.key, $event)"
              @dblclick="startEditing(row.id, col.key)"
              @contextmenu="showCellContextMenu($event, row.id, col.key)"
            >
              <template v-if="isCellEditing(row.id, col.key)">
                <!-- Boolean checkbox/select for boolean type columns -->
                <select
                  v-if="col.data_type === 'boolean'"
                  :class="$style.cellInput"
                  :value="row.cells[col.key]"
                  @change="updateCellValue(row.id, col.key, ($event.target as HTMLSelectElement).value, true)"
                  @keydown.esc="finishEditing"
                  @keydown.stop
                  @click.stop
                >
                  <option value="">-- اختر --</option>
                  <option value="نعم">نعم</option>
                  <option value="لا">لا</option>
                </select>
                <!-- Select dropdown for select type columns -->
                <select
                  v-else-if="col.data_type === 'select' && col.options && col.options.length > 0"
                  :class="$style.cellInput"
                  :value="row.cells[col.key]"
                  @change="updateCellValue(row.id, col.key, ($event.target as HTMLSelectElement).value, true)"
                  @keydown.esc="finishEditing"
                  @keydown.stop
                  @click.stop
                >
                  <option value="">-- اختر --</option>
                  <option v-for="option in col.options" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
                <!-- Date input for date type columns -->
                <input
                  v-else-if="col.data_type === 'date'"
                  type="date"
                  :class="$style.cellInput"
                  :value="row.cells[col.key]"
                  @change="updateCellValue(row.id, col.key, ($event.target as HTMLInputElement).value, true)"
                  @keydown.esc="finishEditing"
                  @keydown.stop
                  @click.stop
                />
                <!-- Number input for number type columns -->
                <input
                  v-else-if="col.data_type === 'number'"
                  type="number"
                  :class="$style.cellInput"
                  :value="row.cells[col.key]"
                  @input="updateCellValue(row.id, col.key, ($event.target as HTMLInputElement).value)"
                  @blur="finishEditing"
                  @keydown.stop
                />
                <!-- Text input for text type columns (default) -->
                <input
                  v-else
                  type="text"
                  :class="$style.cellInput"
                  :value="row.cells[col.key]"
                  @input="updateCellValue(row.id, col.key, ($event.target as HTMLInputElement).value)"
                  @blur="finishEditing"
                  @keydown.stop
                />
              </template>
              <template v-else>
                <span :class="$style.cellContent">{{ row.cells[col.key] }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Pagination Controls -->
      <div :class="$style.paginationBar">
        <div :class="$style.paginationInfo">
          <span>
            {{ pagination.total_count.toLocaleString('ar-EG') }} صف إجمالي
          </span>
          <span v-if="pagination.total_pages > 1">
            • صفحة {{ pagination.page }} من {{ pagination.total_pages }}
          </span>
        </div>
        
        <div :class="$style.paginationControls">
          <!-- Page size selector -->
          <div :class="$style.pageSizeSelector">
            <label>صفوف:</label>
            <select 
              :value="pageSize"
              @change="changePageSize(Number(($event.target as HTMLSelectElement).value))"
              :disabled="isLoadingData"
            >
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option :value="200">200</option>
              <option :value="500">500</option>
            </select>
          </div>
          
          <!-- Navigation buttons -->
          <div :class="$style.paginationNav">
            <button 
              :class="[$style.paginationBtn, { [$style.disabled]: !pagination.has_prev || isLoadingData }]"
              @click="goToFirstPage"
              :disabled="!pagination.has_prev || isLoadingData"
              title="الصفحة الأولى"
            >
              <i class="fas fa-angle-double-right"></i>
            </button>
            <button 
              :class="[$style.paginationBtn, { [$style.disabled]: !pagination.has_prev || isLoadingData }]"
              @click="goToPrevPage"
              :disabled="!pagination.has_prev || isLoadingData"
              title="الصفحة السابقة"
            >
              <i class="fas fa-angle-right"></i>
            </button>
            
            <!-- Page input -->
            <div :class="$style.pageInputWrapper">
              <input 
                type="number"
                v-model="goToPageInput"
                :placeholder="String(pagination.page)"
                :min="1"
                :max="pagination.total_pages"
                @keydown.enter="goToPage"
                :class="$style.pageInput"
                :disabled="isLoadingData || pagination.total_pages <= 1"
              />
              <span :class="$style.pageInputSeparator">/</span>
              <span :class="$style.totalPages">{{ pagination.total_pages }}</span>
            </div>
            
            <button 
              :class="[$style.paginationBtn, { [$style.disabled]: !pagination.has_next || isLoadingData }]"
              @click="goToNextPage"
              :disabled="!pagination.has_next || isLoadingData"
              title="الصفحة التالية"
            >
              <i class="fas fa-angle-left"></i>
            </button>
            <button 
              :class="[$style.paginationBtn, { [$style.disabled]: !pagination.has_next || isLoadingData }]"
              @click="goToLastPage"
              :disabled="!pagination.has_next || isLoadingData"
              title="الصفحة الأخيرة"
            >
              <i class="fas fa-angle-double-left"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <Transition name="fade">
      <div
        v-if="showContextMenu"
        ref="contextMenuRef"
        :class="$style.contextMenu"
        :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
        @click.stop
      >
        <!-- Cell-specific options -->
        <template v-if="contextMenuType === 'cell'">
          <button :class="$style.contextMenuItem" @click="copyCell">
            <i class="fas fa-copy"></i>
            <span>نسخ الخلية</span>
          </button>
          <button :class="$style.contextMenuItem" @click="cutCell">
            <i class="fas fa-scissors"></i>
            <span>قص الخلية</span>
          </button>
          <button :class="$style.contextMenuItem" @click="pasteToCell">
            <i class="fas fa-paste"></i>
            <span>لصق</span>
          </button>
          <div :class="$style.contextMenuDivider"></div>
          <button :class="$style.contextMenuItem" @click="clearCell">
            <i class="fas fa-eraser"></i>
            <span>مسح المحتوى</span>
          </button>
          <div :class="$style.contextMenuDivider"></div>
        </template>
        
        <!-- Row-specific options -->
        <template v-if="contextMenuType === 'row'">
          <button :class="$style.contextMenuItem" @click="copyRow">
            <i class="fas fa-copy"></i>
            <span>نسخ الصف{{ selectedRows.size > 1 ? 'وف' : '' }}</span>
          </button>
          <button :class="$style.contextMenuItem" @click="cutRow">
            <i class="fas fa-scissors"></i>
            <span>قص الصف{{ selectedRows.size > 1 ? 'وف' : '' }}</span>
          </button>
          <button :class="$style.contextMenuItem" @click="pasteToCell">
            <i class="fas fa-paste"></i>
            <span>لصق</span>
          </button>
          <button :class="$style.contextMenuItem" @click="duplicateRow">
            <i class="fas fa-clone"></i>
            <span>تكرار الصف{{ selectedRows.size > 1 ? 'وف' : '' }}</span>
          </button>
          <div :class="$style.contextMenuDivider"></div>
          <button :class="$style.contextMenuItem" @click="clearRow">
            <i class="fas fa-eraser"></i>
            <span>مسح المحتوى</span>
          </button>
          <button :class="[$style.contextMenuItem, $style.danger]" @click="deleteRow">
            <i class="fas fa-trash"></i>
            <span>حذف الصف{{ selectedRows.size > 1 ? 'وف' : '' }}</span>
          </button>
          <div :class="$style.contextMenuDivider"></div>
        </template>
        
        <!-- Formatting options (for both cell and row) -->
        <div :class="$style.contextMenuSection">
          <span :class="$style.contextMenuLabel">التنسيق</span>
        </div>

                <!-- Background Color with Flyout -->
        <div 
          :class="[$style.contextMenuItem, $style.hasSubmenu, { [$style.submenuActive]: activeSubmenu === 'bg' }]"
          @mouseenter="handleSubmenuHover('bg', $event)"
          @mouseleave="handleMenuItemLeave"
        >
          <i class="fas fa-fill-drip"></i>
          <span>لون الخلفية</span>
          <i class="fas fa-chevron-left" :class="$style.submenuArrow"></i>
        </div>

                <!-- Text Color with Flyout -->
        <div 
          :class="[$style.contextMenuItem, $style.hasSubmenu, { [$style.submenuActive]: activeSubmenu === 'text' }]"
          @mouseenter="handleSubmenuHover('text', $event)"
          @mouseleave="handleMenuItemLeave"
        >
          <i class="fas fa-font"></i>
          <span>لون النص</span>
          <i class="fas fa-chevron-left" :class="$style.submenuArrow"></i>
        </div>

        <button :class="$style.contextMenuItem" @click="toggleBold">
          <i class="fas fa-bold"></i>
          <span>عريض</span>
        </button>
        <button :class="$style.contextMenuItem" @click="toggleItalic">
          <i class="fas fa-italic"></i>
          <span>مائل</span>
        </button>
        

        

        
        <button :class="$style.contextMenuItem" @click="clearFormatting">
          <i class="fas fa-remove-format"></i>
          <span>إزالة التنسيق</span>
        </button>
        
        <template v-if="contextMenuType === 'row'">
          <div :class="$style.contextMenuDivider"></div>
          <button :class="$style.contextMenuItem" @click="insertRowAbove">
            <i class="fas fa-arrow-up"></i>
            <span>إدراج صف أعلى</span>
          </button>
          <button :class="$style.contextMenuItem" @click="insertRowBelow">
            <i class="fas fa-arrow-down"></i>
            <span>إدراج صف أسفل</span>
          </button>
        </template>
      </div>
    </Transition>

    <!-- Color Picker Flyout Submenu -->
    <Transition name="fade">
      <div
        v-if="activeSubmenu && showContextMenu"
        :class="$style.colorPickerFlyout"
        :style="{ 
          top: submenuPosition.top + 'px', 
          left: submenuPosition.left + 'px'
        }"
        @mouseenter="handleSubmenuEnter"
        @mouseleave="handleSubmenuLeave"
        @click.stop
      >
        <div :class="$style.colorPickerHeader">
          <span>{{ activeSubmenu === 'bg' ? 'لون الخلفية' : 'لون النص' }}</span>
        </div>
        
        <!-- Theme Colors Section -->
        <div :class="$style.colorSection">
          <span :class="$style.colorSectionLabel">ألوان السمة</span>
          <div :class="$style.themeColorsRow">
            <button
              v-for="(tc, index) in themeColors"
              :key="'theme-' + index"
              :class="$style.themeColorBtn"
              :style="{ backgroundColor: tc.color }"
              :title="tc.name"
              @click="applyColor(tc.color)"
            >
              <span v-if="tc.color === '#ffffff'" :class="$style.whiteColorBorder"></span>
            </button>
          </div>
        </div>
        
        <!-- Standard Colors Section -->
        <div :class="$style.colorSection">
          <span :class="$style.colorSectionLabel">الألوان القياسية</span>
          <div :class="$style.colorGrid">
            <button
              v-for="(color, index) in colorPalette"
              :key="'standard-' + index"
              :class="$style.colorOption"
              :style="{ backgroundColor: color }"
              @click="applyColor(color)"
            >
              <span v-if="color === '#ffffff'" :class="$style.whiteColorBorder"></span>
            </button>
          </div>
        </div>
        
        <!-- No Color Option -->
        <div :class="$style.colorPickerFooter">
          <button :class="$style.noColorBtn" @click="applyColor('')">
            <i class="fas fa-ban"></i>
            <span>بدون {{ activeSubmenu === 'bg' ? 'خلفية' : 'لون' }}</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Column Filter Dropdown -->
    <Transition name="fade">
      <div
        v-if="activeFilterColumn"
        :class="$style.filterDropdown"
        :style="{ top: filterDropdownPosition.top + 'px', left: filterDropdownPosition.left + 'px' }"
        @click.stop
      >
        <!-- Filter Header -->
        <div :class="$style.filterHeader">
          <span>{{ columns.find(c => c.key === activeFilterColumn)?.label?.split('\n')[0] }}</span>
          <button :class="$style.filterCloseBtn" @click="closeFilterDropdown">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Sort Options -->
        <div :class="$style.filterSortSection">
          <button :class="$style.filterSortBtn" @click="sortColumnAtoZ(activeFilterColumn!)">
            <i class="fas fa-sort-alpha-down"></i>
            <span>Sort A to Z</span>
          </button>
          <button :class="$style.filterSortBtn" @click="sortColumnZtoA(activeFilterColumn!)">
            <i class="fas fa-sort-alpha-up"></i>
            <span>Sort Z to A</span>
          </button>
        </div>

        <div :class="$style.filterDivider"></div>

        <!-- Clear Filter -->
        <button 
          :class="[$style.filterClearBtn, { [$style.disabled]: !hasActiveFilter(activeFilterColumn!) }]"
          @click="clearColumnFilter(activeFilterColumn!)"
          :disabled="!hasActiveFilter(activeFilterColumn!)"
        >
          <i class="fas fa-filter-circle-xmark"></i>
          <span>Clear Filter From "{{ columns.find(c => c.key === activeFilterColumn)?.label?.split('\n')[0] }}"</span>
        </button>

        <div :class="$style.filterDivider"></div>

        <!-- Text Filters Label -->
        <div :class="$style.filterLabel">
          <span>Text Filters</span>
          <i class="fas fa-chevron-left"></i>
        </div>

        <div :class="$style.filterDivider"></div>

        <!-- Search Input -->
        <div :class="$style.filterSearchWrapper">
          <i class="fas fa-search" :class="$style.filterSearchIcon"></i>
          <input
            type="text"
            :class="$style.filterSearchInput"
            placeholder="Search"
            v-model="columnFilters[activeFilterColumn!].searchQuery"
          />
        </div>

        <!-- Filter Values List -->
        <div :class="$style.filterValuesList">
          <!-- Loading indicator -->
          <div v-if="columnFilters[activeFilterColumn!]?.isLoading" :class="$style.filterLoadingState">
            <i class="fas fa-spinner fa-spin"></i>
            <span>جاري تحميل القيم...</span>
          </div>
          
          <template v-else>
            <!-- Select All -->
            <label :class="$style.filterValueItem">
              <input
                type="checkbox"
                :class="$style.filterCheckbox"
                :checked="isSelectAllChecked(activeFilterColumn!)"
                @change="selectAllFilterValues(activeFilterColumn!)"
              />
              <span>(Select All)</span>
            </label>

            <!-- Dynamic Values from Backend -->
            <label
              v-for="value in getFilteredFilterValues(activeFilterColumn!)"
              :key="value"
              :class="$style.filterValueItem"
            >
              <input
                type="checkbox"
                :class="$style.filterCheckbox"
                :checked="!columnFilters[activeFilterColumn!].excludedValues.has(value)"
                @change="toggleFilterValue(activeFilterColumn!, value)"
              />
              <span>{{ value }}</span>
            </label>

            <!-- Blanks (only show if column has blanks in data) -->
            <label v-if="columnFilters[activeFilterColumn!]?.hasBlanks" :class="$style.filterValueItem">
              <input
                type="checkbox"
                :class="$style.filterCheckbox"
                :checked="columnFilters[activeFilterColumn!].showBlanks"
                @change="toggleBlanksFilter(activeFilterColumn!)"
              />
              <span>(Blanks)</span>
            </label>
            
            <!-- No values message -->
            <div v-if="getFilteredFilterValues(activeFilterColumn!).length === 0 && !columnFilters[activeFilterColumn!]?.hasBlanks" :class="$style.filterNoValues">
              لا توجد قيم في هذا العمود
            </div>
          </template>
        </div>

        <!-- Footer Buttons -->
        <div :class="$style.filterFooter">
          <button :class="$style.filterOkBtn" @click="applyFilter">OK</button>
          <button :class="$style.filterCancelBtn" @click="closeFilterDropdown">Cancel</button>
        </div>
      </div>
    </Transition>

    <!-- Status Bar -->
    <div :class="$style.statusBar">
      <span v-if="selectedTitle">
        <i class="fas fa-file-alt"></i>
        {{ selectedTitle.name }}
      </span>
      <span v-if="activeCell">
        الخلية: {{ activeCell.rowId }} - {{ columns.find(c => c.key === activeCell?.colKey)?.label?.split('\n')[0] }}
      </span>
      <span>
        <i class="fas fa-table"></i>
        {{ filteredRows.length }} / {{ rows.length }} صف × {{ columns.length }} عمود
      </span>
      <span v-if="selectedTitleId" :class="isDirty ? $style.unsavedStatus : $style.savedStatus">
        <i :class="isDirty ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'"></i>
        {{ isDirty ? 'تغييرات غير محفوظة' : 'محفوظ' }}
      </span>
    </div>

    <!-- Create Sheet Modal -->
    <Transition name="fade">
      <div v-if="showCreateSheetModal" :class="$style.modalOverlay" @click="closeCreateSheetModal">
        <div :class="$style.createSheetModal" @click.stop>
          <div :class="$style.modalHeader">
            <h3 :class="$style.modalTitle">
              <i class="fas fa-plus-circle"></i>
              إنشاء جدول جديد
            </h3>
            <button :class="$style.modalCloseBtn" @click="closeCreateSheetModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div :class="$style.modalBody">
            <div :class="$style.formGroup">
              <label :class="$style.formLabel">اسم الجدول *</label>
              <input 
                v-model="newSheetName"
                type="text"
                :class="$style.formInput"
                placeholder="أدخل اسم الجدول"
                :disabled="isCreatingSheet"
              />
            </div>
            
            <div :class="$style.formGroup">
              <label :class="$style.formLabel">الوصف (اختياري)</label>
              <textarea 
                v-model="newSheetDescription"
                :class="$style.formTextarea"
                placeholder="أدخل وصفاً للجدول (اختياري)"
                rows="3"
                :disabled="isCreatingSheet"
              ></textarea>
            </div>
          </div>

          <div :class="$style.modalFooter">
            <button :class="$style.cancelBtn" @click="closeCreateSheetModal" :disabled="isCreatingSheet">
              إلغاء
            </button>
            <button 
              :class="$style.saveBtn" 
              @click="createSheet"
              :disabled="isCreatingSheet || !newSheetName.trim()"
            >
              <i v-if="isCreatingSheet" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-plus"></i>
              {{ isCreatingSheet ? 'جاري الإنشاء...' : 'إنشاء' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Import Modal -->
    <Transition name="fade">
      <div v-if="showImportModal" :class="$style.modalOverlay" @click="closeImportModal">
        <div :class="$style.importModal" @click.stop>
          <div :class="$style.modalHeader">
            <h3 :class="$style.modalTitle">
              <i class="fas fa-file-import"></i>
              استيراد البيانات من Excel
            </h3>
            <button :class="$style.modalCloseBtn" @click="closeImportModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div :class="$style.modalBody">
            <!-- Download Template Section -->
            <div :class="$style.importSection">
              <div :class="$style.sectionIcon">
                <i class="fas fa-download"></i>
              </div>
              <div :class="$style.sectionContent">
                <h4 :class="$style.sectionTitle">الخطوة 1: تحميل القالب</h4>
                <p :class="$style.sectionDesc">
                  قم بتحميل قالب Excel الجاهز وملء البيانات المطلوبة
                </p>
                <button :class="$style.downloadBtn" @click="downloadTemplate">
                  <i class="fas fa-file-excel"></i>
                  تحميل القالب
                </button>
              </div>
            </div>

            <div :class="$style.sectionDivider">
              <span :class="$style.dividerLine"></span>
              <span :class="$style.dividerText">ثم</span>
              <span :class="$style.dividerLine"></span>
            </div>

            <!-- Import Mode Selection -->
            <div :class="$style.importModeSection">
              <h4 :class="$style.sectionTitle">الخطوة 2: اختر طريقة الاستيراد</h4>
              <div :class="$style.importModeOptions">
                <label :class="[$style.importModeOption, { [$style.importModeActive]: importMode === 'replace' }]">
                  <input type="radio" v-model="importMode" value="replace" :class="$style.radioInput" />
                  <div :class="$style.importModeContent">
                    <i class="fas fa-sync-alt" :class="$style.importModeIcon"></i>
                    <div>
                      <span :class="$style.importModeTitle">استبدال البيانات</span>
                      <span :class="$style.importModeDesc">حذف البيانات الحالية واستبدالها بالبيانات الجديدة</span>
                    </div>
                  </div>
                </label>
                <label :class="[$style.importModeOption, { [$style.importModeActive]: importMode === 'append' }]">
                  <input type="radio" v-model="importMode" value="append" :class="$style.radioInput" />
                  <div :class="$style.importModeContent">
                    <i class="fas fa-plus-circle" :class="$style.importModeIcon"></i>
                    <div>
                      <span :class="$style.importModeTitle">إضافة للبيانات</span>
                      <span :class="$style.importModeDesc">الاحتفاظ بالبيانات الحالية وإضافة البيانات الجديدة</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div :class="$style.sectionDivider">
              <span :class="$style.dividerLine"></span>
              <span :class="$style.dividerText">ثم</span>
              <span :class="$style.dividerLine"></span>
            </div>

            <!-- Upload Section -->
            <div :class="$style.importSection">
              <div :class="$style.sectionIcon">
                <i class="fas fa-upload"></i>
              </div>
              <div :class="$style.sectionContent">
                <h4 :class="$style.sectionTitle">الخطوة 3: رفع الملف</h4>
                <p :class="$style.sectionDesc">
                  بعد ملء القالب، قم برفع الملف لاستيراد البيانات
                </p>
                <div :class="$style.uploadArea" @dragover.prevent @drop.prevent="handleDrop">
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept=".xlsx,.xls"
                    :class="$style.fileInput"
                    @change="handleFileUpload"
                    @click.stop
                  />
                  <div :class="$style.uploadContent" @click="triggerFileInput">
                    <i class="fas fa-cloud-upload-alt" :class="$style.uploadIcon"></i>
                    <span :class="$style.uploadText">
                      {{ isImporting ? 'جاري الاستيراد...' : 'اضغط أو اسحب الملف هنا' }}
                    </span>
                    <span :class="$style.uploadHint">ملفات Excel فقط (.xlsx, .xls)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="importError" :class="$style.errorMessage">
              <i class="fas fa-exclamation-circle"></i>
              {{ importError }}
            </div>
          </div>

          <div :class="$style.modalFooter">
            <button :class="$style.cancelBtn" @click="closeImportModal">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style module src="./ListingActivities.module.css"></style>
