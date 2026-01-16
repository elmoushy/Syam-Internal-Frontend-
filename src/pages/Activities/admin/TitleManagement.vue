<!-- src/pages/Activities/admin/TitleManagement.vue -->
<!-- Admin page to manage Titles (Templates) with columns and validations -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { templateService, titleService } from '@/services/activityService'
import type { 
  TemplateListItem, 
  Template 
} from '@/types/activity.types'
import type { SubmittedSheetItem, PaginationInfo } from '@/services/activityService'

// Column definition interface for inline creation
interface InlineColumn {
  id?: number  // Only for existing columns
  label: string
  data_type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  options: string[]
  optionsInput?: string  // Temp input for adding options
}

// Router for navigation
const router = useRouter()
const route = useRoute()

// Tab state
const activeTab = ref<'titles' | 'submitted'>('titles')

// State
const titles = ref<TemplateListItem[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Submitted sheets state
const submittedSheets = ref<SubmittedSheetItem[]>([])
const submittedPagination = ref<PaginationInfo>({
  page: 1,
  page_size: 20,
  total_count: 0,
  total_pages: 1,
  has_next: false,
  has_prev: false
})
const submittedLoading = ref(false)
const submittedSearch = ref('')
const submittedTitleFilter = ref<number | null>(null)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showColumnsModal = ref(false)
const showImportModal = ref(false)
const editingTitle = ref<Template | null>(null)

// Create modal tab state
const createModalTab = ref<'details' | 'columns'>('details')

// Drag and drop state
const draggedColumnIndex = ref<number | null>(null)
const dragOverColumnIndex = ref<number | null>(null)

// Import from Excel state
const importFileInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const importError = ref('')
const importedColumns = ref<InlineColumn[]>([])
const importPreviewName = ref('')

// Form state for creating/editing title (includes columns)
const titleForm = ref({
  name: '',
  description: '',
  columns: [] as InlineColumn[]
})

// State for column editing modal (separate from create/edit)
const selectedTitleForColumns = ref<Template | null>(null)
const columnsForm = ref<InlineColumn[]>([])

// Data type labels
const dataTypeLabels: Record<string, string> = {
  text: 'نص',
  number: 'رقم',
  date: 'تاريخ',
  boolean: 'نعم/لا',
  select: 'قائمة اختيار'
}

// Filter state
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const viewMode = ref<'cards' | 'table'>('cards')

// Filtered titles
const filteredTitles = computed(() => {
  let result = titles.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.description?.toLowerCase().includes(query)
    )
  }
  
  if (statusFilter.value !== 'all') {
    result = result.filter(t => t.status === statusFilter.value)
  }
  
  return result
})

// Published titles for filter dropdown
const publishedTitles = computed(() => {
  return titles.value.filter(t => t.status === 'published')
})

// Load titles
const loadTitles = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    titles.value = await templateService.getAll({ mine_only: false })
  } catch (error: any) {
    console.error('Failed to load titles:', error)
    errorMessage.value = 'فشل في تحميل العناوين'
  } finally {
    isLoading.value = false
  }
}

// Load submitted sheets
const loadSubmittedSheets = async (page: number = 1) => {
  submittedLoading.value = true
  try {
    const response = await titleService.getSubmittedSheets({
      title_id: submittedTitleFilter.value || undefined,
      search: submittedSearch.value || undefined,
      page,
      page_size: 20
    })
    submittedSheets.value = response.sheets
    submittedPagination.value = response.pagination
  } catch (error: any) {
    console.error('Failed to load submitted sheets:', error)
    errorMessage.value = 'فشل في تحميل الجداول المقدمة'
  } finally {
    submittedLoading.value = false
  }
}

// Set title as active
const setActiveTitle = async (title: TemplateListItem) => {
  if (title.status !== 'published') {
    await Swal.fire({
      title: 'غير مسموح',
      text: 'يجب أن يكون العنوان منشوراً لتعيينه كنشط',
      icon: 'error',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً'
    })
    return
  }
  
  const result = await Swal.fire({
    title: 'تأكيد التفعيل',
    text: `هل أنت متأكد من تعيين "${title.name}" كعنوان نشط؟ سيتم إلغاء تنشيط أي عنوان آخر.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#A17D23',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'نعم، فعّل',
    cancelButtonText: 'إلغاء',
    reverseButtons: true
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  try {
    await titleService.setActiveTitle(title.id)
    await Swal.fire({
      title: 'تم التفعيل!',
      text: `تم تعيين "${title.name}" كعنوان نشط`,
      icon: 'success',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً',
      timer: 2000,
      timerProgressBar: true
    })
    await loadTitles()
  } catch (error: any) {
    await Swal.fire({
      title: 'خطأ',
      text: error.response?.data?.error || 'فشل في تعيين العنوان كنشط',
      icon: 'error',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً'
    })
  }
}

// Deactivate title
const deactivateTitle = async (title: TemplateListItem) => {
  const result = await Swal.fire({
    title: 'تأكيد إلغاء التفعيل',
    text: `هل أنت متأكد من إلغاء تنشيط "${title.name}"؟`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'نعم، ألغِ التفعيل',
    cancelButtonText: 'إلغاء',
    reverseButtons: true
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  try {
    await titleService.deactivateTitle(title.id)
    successMessage.value = `تم إلغاء تنشيط "${title.name}"`
    await loadTitles()
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'فشل في إلغاء تنشيط العنوان'
    setTimeout(() => { errorMessage.value = '' }, 3000)
  }
}

// Add a new column to the form
const addColumn = (target: 'form' | 'modal' = 'form') => {
  const newColumn: InlineColumn = {
    label: '',
    data_type: 'text',
    options: [],
    optionsInput: ''
  }
  if (target === 'form') {
    titleForm.value.columns.push(newColumn)
  } else {
    columnsForm.value.push(newColumn)
  }
}

// Remove a column from the form
const removeColumn = (index: number, target: 'form' | 'modal' = 'form') => {
  if (target === 'form') {
    titleForm.value.columns.splice(index, 1)
  } else {
    columnsForm.value.splice(index, 1)
  }
}

// Move column up
const moveColumnUp = (index: number, target: 'form' | 'modal' = 'form') => {
  const columns = target === 'form' ? titleForm.value.columns : columnsForm.value
  if (index > 0) {
    const temp = columns[index]
    columns[index] = columns[index - 1]
    columns[index - 1] = temp
  }
}

// Move column down
const moveColumnDown = (index: number, target: 'form' | 'modal' = 'form') => {
  const columns = target === 'form' ? titleForm.value.columns : columnsForm.value
  if (index < columns.length - 1) {
    const temp = columns[index]
    columns[index] = columns[index + 1]
    columns[index + 1] = temp
  }
}

// Add option to select column
const addOption = (column: InlineColumn) => {
  if (column.optionsInput && column.optionsInput.trim()) {
    column.options.push(column.optionsInput.trim())
    column.optionsInput = ''
  }
}

// Remove option from select column
const removeOption = (column: InlineColumn, index: number) => {
  column.options.splice(index, 1)
}

// Drag and drop handlers for columns
const handleDragStart = (index: number) => {
  draggedColumnIndex.value = index
}

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault()
  dragOverColumnIndex.value = index
}

const handleDragLeave = () => {
  dragOverColumnIndex.value = null
}

const handleDrop = (index: number, target: 'form' | 'modal' = 'form') => {
  if (draggedColumnIndex.value === null || draggedColumnIndex.value === index) {
    draggedColumnIndex.value = null
    dragOverColumnIndex.value = null
    return
  }
  
  const columns = target === 'form' ? titleForm.value.columns : columnsForm.value
  const draggedItem = columns[draggedColumnIndex.value]
  
  // Remove from original position
  columns.splice(draggedColumnIndex.value, 1)
  
  // Insert at new position
  const newIndex = draggedColumnIndex.value < index ? index - 1 : index
  columns.splice(newIndex, 0, draggedItem)
  
  draggedColumnIndex.value = null
  dragOverColumnIndex.value = null
}

const handleDragEnd = () => {
  draggedColumnIndex.value = null
  dragOverColumnIndex.value = null
}

// Go to columns tab (only if name is filled)
const goToColumnsTab = () => {
  if (titleForm.value.name.trim()) {
    createModalTab.value = 'columns'
  }
}

// Go to next step (from details to columns)
const goToNextStep = () => {
  if (titleForm.value.name.trim()) {
    createModalTab.value = 'columns'
  } else {
    errorMessage.value = 'يرجى إدخال اسم العنوان أولاً'
    setTimeout(() => { errorMessage.value = '' }, 3000)
  }
}

// Open create modal
const openCreateModal = () => {
  titleForm.value = { name: '', description: '', columns: [] }
  createModalTab.value = 'details'
  showCreateModal.value = true
}

// Open edit modal
const openEditModal = async (title: TemplateListItem) => {
  try {
    editingTitle.value = await templateService.getById(title.id)
    titleForm.value = {
      name: editingTitle.value.name,
      description: editingTitle.value.description || '',
      columns: []
    }
    showEditModal.value = true
  } catch (error: any) {
    errorMessage.value = 'فشل في تحميل بيانات العنوان'
  }
}

// Close modals
const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  showColumnsModal.value = false
  editingTitle.value = null
  selectedTitleForColumns.value = null
  columnsForm.value = []
  errorMessage.value = ''
}

// Create new title with columns
const createTitle = async () => {
  if (!titleForm.value.name.trim()) {
    errorMessage.value = 'اسم العنوان مطلوب'
    return
  }
  
  // Validate columns
  for (const col of titleForm.value.columns) {
    if (!col.label.trim()) {
      errorMessage.value = 'اسم العمود مطلوب لجميع الأعمدة'
      return
    }
    if (col.data_type === 'select' && col.options.length === 0) {
      errorMessage.value = `العمود "${col.label}" يحتاج إلى خيارات واحدة على الأقل`
      return
    }
  }
  
  isSaving.value = true
  errorMessage.value = ''
  
  try {
    // Prepare columns data for API
    const columnsData = titleForm.value.columns.map(col => ({
      label: col.label,
      data_type: col.data_type,
      options: col.data_type === 'select' ? col.options : []
    }))
    
    await templateService.create({
      name: titleForm.value.name,
      description: titleForm.value.description,
      columns: columnsData
    })
    successMessage.value = 'تم إنشاء العنوان بنجاح'
    closeModal()
    await loadTitles()
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || error.response?.data?.error || 'فشل في إنشاء العنوان'
  } finally {
    isSaving.value = false
  }
}

// Update title
const updateTitle = async () => {
  if (!editingTitle.value || !titleForm.value.name.trim()) {
    errorMessage.value = 'اسم العنوان مطلوب'
    return
  }
  
  isSaving.value = true
  errorMessage.value = ''
  
  try {
    await templateService.update(editingTitle.value.id, {
      name: titleForm.value.name,
      description: titleForm.value.description
    })
    successMessage.value = 'تم تحديث العنوان بنجاح'
    closeModal()
    await loadTitles()
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || 'فشل في تحديث العنوان'
  } finally {
    isSaving.value = false
  }
}

// Open columns modal for editing existing template columns
const openColumnsModal = async (title: TemplateListItem) => {
  try {
    const fullTitle = await templateService.getById(title.id)
    selectedTitleForColumns.value = fullTitle
    
    // Get current columns and convert to InlineColumn format
    const currentColumns = await templateService.getColumns(title.id)
    columnsForm.value = currentColumns.map(c => ({
      id: c.column_definition_id,
      label: c.column_definition.label,
      data_type: c.column_definition.data_type as InlineColumn['data_type'],
      options: c.column_definition.options || [],
      optionsInput: ''
    }))
    
    showColumnsModal.value = true
  } catch (error: any) {
    errorMessage.value = 'فشل في تحميل أعمدة العنوان'
  }
}

// Save columns for existing template
const saveColumns = async () => {
  if (!selectedTitleForColumns.value) return
  
  // Validate columns
  for (const col of columnsForm.value) {
    if (!col.label.trim()) {
      errorMessage.value = 'اسم العمود مطلوب لجميع الأعمدة'
      return
    }
    if (col.data_type === 'select' && col.options.length === 0) {
      errorMessage.value = `العمود "${col.label}" يحتاج إلى خيارات واحدة على الأقل`
      return
    }
  }
  
  isSaving.value = true
  errorMessage.value = ''
  
  try {
    const columnsData = columnsForm.value.map(col => ({
      label: col.label,
      data_type: col.data_type,
      options: col.data_type === 'select' ? col.options : []
    }))
    
    await templateService.updateColumns(selectedTitleForColumns.value.id, columnsData)
    successMessage.value = 'تم حفظ الأعمدة بنجاح'
    closeModal()
    await loadTitles()
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'فشل في حفظ الأعمدة'
  } finally {
    isSaving.value = false
  }
}

// Publish title
const publishTitle = async (title: TemplateListItem) => {
  if (title.column_count === 0) {
    await Swal.fire({
      title: 'غير مسموح',
      text: 'لا يمكن نشر عنوان بدون أعمدة',
      icon: 'error',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً'
    })
    return
  }
  
  const result = await Swal.fire({
    title: 'تأكيد النشر',
    text: `هل أنت متأكد من نشر "${title.name}"؟ لن تتمكن من تعديل الأعمدة بعد النشر.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#A17D23',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'نعم، انشر',
    cancelButtonText: 'إلغاء',
    reverseButtons: true
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  try {
    await templateService.publish(title.id)
    await Swal.fire({
      title: 'تم النشر!',
      text: 'تم نشر العنوان بنجاح',
      icon: 'success',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً',
      timer: 2000,
      timerProgressBar: true
    })
    await loadTitles()
  } catch (error: any) {
    await Swal.fire({
      title: 'خطأ',
      text: error.response?.data?.error || 'فشل في نشر العنوان',
      icon: 'error',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً'
    })
  }
}

// Archive title
const archiveTitle = async (title: TemplateListItem) => {
  const result = await Swal.fire({
    title: 'تأكيد الأرشفة',
    text: `هل أنت متأكد من أرشفة "${title.name}"؟`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#A17D23',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'نعم، أرشف',
    cancelButtonText: 'إلغاء',
    reverseButtons: true
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  try {
    await templateService.archive(title.id)
    await Swal.fire({
      title: 'تم الأرشفة!',
      text: 'تم أرشفة العنوان بنجاح',
      icon: 'success',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً',
      timer: 2000,
      timerProgressBar: true
    })
    await loadTitles()
  } catch (error: any) {
    await Swal.fire({
      title: 'خطأ',
      text: error.response?.data?.error || 'فشل في أرشفة العنوان',
      icon: 'error',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً'
    })
  }
}

// Delete title
const deleteTitle = async (title: TemplateListItem) => {
  const result = await Swal.fire({
    title: 'تأكيد الحذف',
    text: `هل أنت متأكد من حذف "${title.name}"؟`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء',
    reverseButtons: true
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  try {
    await templateService.delete(title.id)
    await Swal.fire({
      title: 'تم الحذف!',
      text: 'تم حذف العنوان بنجاح',
      icon: 'success',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً',
      timer: 2000,
      timerProgressBar: true
    })
    await loadTitles()
  } catch (error: any) {
    await Swal.fire({
      title: 'خطأ',
      text: error.response?.data?.error || 'فشل في حذف العنوان',
      icon: 'error',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً'
    })
  }
}
// Get status label
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'draft': return 'مسودة'
    case 'published': return 'منشور'
    case 'archived': return 'مؤرشف'
    default: return status
  }
}

// Get status class
const getStatusClass = (status: string) => {
  switch (status) {
    case 'draft': return 'draft'
    case 'published': return 'published'
    case 'archived': return 'archived'
    default: return ''
  }
}

// Format date for display
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Watch for tab change to load data
const switchTab = (tab: 'titles' | 'submitted') => {
  activeTab.value = tab
  if (tab === 'submitted' && submittedSheets.value.length === 0) {
    loadSubmittedSheets()
  }
  if (tab === 'titles' && titles.value.length === 0) {
    loadTitles()
  }
}

// Navigate to view a submitted sheet
const viewSubmittedSheet = (sheet: SubmittedSheetItem) => {
  // Navigate to ListingActivities with admin view mode
  router.push({
    path: '/activities',
    query: {
      admin_view: 'true',
      sheet_id: String(sheet.id)
    }
  })
}

// ============================================================================
// IMPORT FROM EXCEL FUNCTIONALITY
// ============================================================================

// Open import modal
const openImportModal = () => {
  importError.value = ''
  importedColumns.value = []
  importPreviewName.value = ''
  showImportModal.value = true
}

// Close import modal
const closeImportModal = () => {
  showImportModal.value = false
  importError.value = ''
  importedColumns.value = []
  importPreviewName.value = ''
  if (importFileInput.value) {
    importFileInput.value.value = ''
  }
}

// Trigger file input click
const triggerImportFileInput = () => {
  importFileInput.value?.click()
}

// Detect data type from sample values
const detectDataType = (values: string[]): 'text' | 'number' | 'date' | 'boolean' | 'select' => {
  const nonEmptyValues = values.filter(v => v && v.toString().trim() !== '')
  if (nonEmptyValues.length === 0) return 'text'
  
  // Check if all values are numbers
  const allNumbers = nonEmptyValues.every(v => !isNaN(Number(v)) && v.toString().trim() !== '')
  if (allNumbers) return 'number'
  
  // Check if all values are dates
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,  // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/   // DD-MM-YYYY
  ]
  const allDates = nonEmptyValues.every(v => 
    datePatterns.some(p => p.test(v.toString().trim())) || 
    !isNaN(Date.parse(v.toString()))
  )
  if (allDates) return 'date'
  
  // Check if boolean-like
  const booleanValues = ['نعم', 'لا', 'yes', 'no', 'true', 'false', '1', '0', 'صح', 'خطأ']
  const allBoolean = nonEmptyValues.every(v => 
    booleanValues.includes(v.toString().trim().toLowerCase())
  )
  if (allBoolean) return 'boolean'
  
  // If limited unique values, could be select
  const uniqueValues = [...new Set(nonEmptyValues.map(v => v.toString().trim()))]
  if (uniqueValues.length <= 10 && uniqueValues.length < nonEmptyValues.length / 2) {
    return 'select'
  }
  
  return 'text'
}

// Process Excel file and extract columns
const handleImportFile = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Check file extension
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    importError.value = 'يرجى اختيار ملف Excel (.xlsx أو .xls)'
    return
  }
  
  isImporting.value = true
  importError.value = ''
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Get range of the sheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    // Determine which row contains headers
    // Check if row 1 might be an image/logo row by checking:
    // 1. If it's merged across many columns
    // 2. If it has very few values compared to row 2
    // 3. If the values in row 1 don't look like column headers
    
    let headerRowIndex = 0 // 0-based index (row 1)
    
    // Check if row 1 is likely a header image row
    const row1Values: string[] = []
    const row2Values: string[] = []
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell1Address = XLSX.utils.encode_cell({ r: 0, c: col })
      const cell2Address = XLSX.utils.encode_cell({ r: 1, c: col })
      
      const cell1 = worksheet[cell1Address]
      const cell2 = worksheet[cell2Address]
      
      if (cell1 && cell1.v !== undefined && cell1.v !== null) {
        row1Values.push(cell1.v.toString().trim())
      }
      if (cell2 && cell2.v !== undefined && cell2.v !== null) {
        row2Values.push(cell2.v.toString().trim())
      }
    }
    
    // Check for merged cells in row 1 (indicates image/header area)
    const merges = worksheet['!merges'] || []
    const row1HasLargeMerge = merges.some(merge => 
      merge.s.r === 0 && // Starts at row 1
      (merge.e.c - merge.s.c) >= 3 // Spans 4+ columns
    )
    
    // Decision logic:
    // 1. If row 1 has a large merge (likely image), use row 2
    // 2. If row 1 has very few values compared to row 2, use row 2
    // 3. If row 1 is empty, use row 2
    
    if (
      row1HasLargeMerge || 
      row1Values.length === 0 ||
      (row2Values.length > 0 && row1Values.length < row2Values.length / 2)
    ) {
      headerRowIndex = 1 // Use row 2 (0-based index = 1)
      console.log('Detected header row: Row 2 (image/merged header in row 1)')
    } else {
      console.log('Detected header row: Row 1')
    }
    
    // Get headers from the determined row
    const headers: string[] = []
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col })
      const cell = worksheet[cellAddress]
      
      if (cell && cell.v !== undefined && cell.v !== null) {
        const value = cell.v.toString().trim()
        if (value && value !== '#' && !/^\d+$/.test(value)) { // Skip row number columns
          headers.push(value)
        }
      }
    }
    
    if (headers.length === 0) {
      importError.value = 'لم يتم العثور على أعمدة في الملف'
      return
    }
    
    // Get sample data from subsequent rows for type detection
    const sampleData: Record<string, string[]> = {}
    headers.forEach(h => sampleData[h] = [])
    
    const dataStartRow = headerRowIndex + 1
    const maxSampleRows = Math.min(dataStartRow + 10, range.e.r + 1)
    
    for (let row = dataStartRow; row < maxSampleRows; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col })
        const headerCell = worksheet[cellAddress]
        
        if (headerCell && headerCell.v !== undefined) {
          const headerValue = headerCell.v.toString().trim()
          if (headerValue && headerValue !== '#' && !/^\d+$/.test(headerValue) && sampleData[headerValue]) {
            const dataCellAddress = XLSX.utils.encode_cell({ r: row, c: col })
            const dataCell = worksheet[dataCellAddress]
            if (dataCell && dataCell.v !== undefined && dataCell.v !== null) {
              sampleData[headerValue].push(dataCell.v.toString())
            }
          }
        }
      }
    }
    
    // Create columns from headers with detected types
    importedColumns.value = headers.map(header => {
      const samples = sampleData[header] || []
      const detectedType = detectDataType(samples)
      
      const column: InlineColumn = {
        label: header,
        data_type: detectedType,
        options: [],
        optionsInput: ''
      }
      
      // If detected as select, populate options
      if (detectedType === 'select') {
        const uniqueOptions = [...new Set(samples.map(s => s.trim()).filter(s => s))]
        column.options = uniqueOptions.slice(0, 20) // Limit to 20 options
      }
      
      return column
    })
    
    // Use filename as suggested title name
    importPreviewName.value = file.name.replace(/\.(xlsx|xls)$/i, '')
    
    successMessage.value = `تم استخراج ${importedColumns.value.length} عمود من الملف`
    setTimeout(() => { successMessage.value = '' }, 3000)
    
  } catch (error) {
    console.error('Import error:', error)
    importError.value = 'حدث خطأ أثناء قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة.'
  } finally {
    isImporting.value = false
    // Reset file input
    if (importFileInput.value) {
      importFileInput.value.value = ''
    }
  }
}

// Apply imported columns to create form
const applyImportedColumns = () => {
  if (importedColumns.value.length === 0) {
    importError.value = 'لا توجد أعمدة للاستيراد'
    return
  }
  
  // Set form data
  titleForm.value = {
    name: importPreviewName.value || '',
    description: '',
    columns: importedColumns.value.map(col => ({ ...col }))
  }
  
  // Close import modal and open create modal
  closeImportModal()
  showCreateModal.value = true
}

onMounted(() => {
  // Check for tab query parameter
  const tabParam = route.query.tab
  if (tabParam === 'submitted') {
    activeTab.value = 'submitted'
    loadSubmittedSheets()
  } else {
    loadTitles()
  }
})
</script>

<template>
  <div :class="$style.container">
    <!-- Header -->
    <div :class="$style.header">
      <h1 :class="$style.pageTitle">إدارة جداول البيانات</h1>
      <div :class="$style.headerActions">
        <button v-if="activeTab === 'titles'" :class="$style.addBtn" @click="openCreateModal">
          <i class="fas fa-plus"></i>
          إنشاء عنوان جديد
        </button>
        <button v-if="activeTab === 'titles'" :class="$style.secondaryBtn" @click="openImportModal">
          <i class="fas fa-file-import"></i>
          استيراد
        </button>
       
      </div>
    </div>

    <!-- Tabs -->
    <div :class="$style.tabsContainer">
      <button 
        :class="[$style.tabBtn, activeTab === 'titles' && $style.activeTab]"
        @click="switchTab('titles')"
      >
        ادارة العناوين
      </button>
      <button 
        :class="[$style.tabBtn, activeTab === 'submitted' && $style.activeTab]"
        @click="switchTab('submitted')"
      >
        الجداول المقدمة
      </button>
    </div>

    <!-- Main Content Card -->
    <div :class="$style.contentCard">
      <!-- Messages -->
      <div v-if="successMessage" :class="$style.successMsg">
        <i class="fas fa-check-circle"></i>
        {{ successMessage }}
      </div>
      <div v-if="errorMessage && !showCreateModal && !showEditModal && !showColumnsModal" :class="$style.errorMsg">
        <i class="fas fa-exclamation-circle"></i>
        {{ errorMessage }}
      </div>

      <!-- ===== TITLES TAB ===== -->
      <template v-if="activeTab === 'titles'">
        <!-- Table Header with Search and Filters -->
        <div :class="$style.tableHeader">
           <div :class="$style.searchSection">
            <div :class="$style.searchBox">
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="ابحث في العناوين..."
                :class="$style.searchInput"
              />
              <i class="fas fa-search" :class="$style.searchIcon"></i>
            </div>
          </div>
          <div :class="$style.filterSection">
                   <div :class="$style.viewToggle">
              <button 
                :class="[$style.viewBtn, viewMode === 'table' && $style.viewBtnActive]"
                @click="viewMode = 'table'"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.5 6.66667H2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M17.5 10H2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M17.5 13.3333H2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
              <button 
                :class="[$style.viewBtn, viewMode === 'cards' && $style.viewBtnActive]"
                @click="viewMode = 'cards'"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2.5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                  <rect x="11.5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                  <rect x="2.5" y="11.5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                  <rect x="11.5" y="11.5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </button>
            </div>
            <select v-model="statusFilter" :class="$style.filterSelect">
              <option value="all">جميع الحالات</option>
              <option value="draft">المسودات</option>
              <option value="published">المنشورة</option>
              <option value="archived">المؤرشفة</option>
            </select>
     
          </div>
         
        </div>

        <!-- Loading -->
        <div v-if="isLoading" :class="$style.loading">
          <i class="fas fa-spinner fa-spin"></i>
          جاري التحميل...
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredTitles.length === 0" :class="$style.tableContainer">
          <div :class="$style.emptyState">
            <i class="fas fa-folder-open"></i>
            <p>لا توجد عناوين</p>
            <button :class="$style.addBtnEmpty" @click="openCreateModal">
              <i class="fas fa-plus"></i>
              إنشاء عنوان جديد
            </button>
          </div>
        </div>

        <!-- Cards View -->
        <div v-else-if="viewMode === 'cards'" :class="$style.cardsContainer">
          <div 
            v-for="title in filteredTitles"
            :key="title.id"
            :class="$style.titleCard"
          >
            <!-- Top Row: Actions LEFT, Title + Badges RIGHT -->
            <div :class="$style.cardTopRow">
              <!-- Title + Badges on RIGHT -->
              <div :class="$style.cardTopRight">
                <div :class="$style.cardBadges">
                  <!-- Active badge (if active) -->
                  <span v-if="(title as any).is_active_title" :class="$style.activeBadge">نشط</span>
                  
                  <span :class="[$style.statusBadge, $style[getStatusClass(title.status)]]">
                    {{ getStatusLabel(title.status) }}
                  </span>
                </div>
                
                <h3 :class="$style.cardTitle">
                  {{ title.name.length > 20 ? title.name.substring(0, 20) + '...' : title.name }}
                </h3>
              </div>
              <!-- Actions on LEFT -->
              <div :class="$style.cardTopActions">
                  <!-- Star button -->
                  <button 
                    v-if="(title as any).is_active_title"
                    :class="[$style.cardIconBtn, $style.starBtnActive]"
                    @click.stop="deactivateTitle(title)"
                    title="نشط - اضغط لإلغاء التنشيط"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 1L12.39 6.26L18 7.27L14 11.14L14.94 17L10 14.26L5.06 17L6 11.14L2 7.27L7.61 6.26L10 1Z" fill="#A17D23" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    v-else-if="title.status === 'published'"
                    :class="$style.cardIconBtn"
                    @click.stop="setActiveTitle(title)"
                    title="تعيين كنشط"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 1L12.39 6.26L18 7.27L14 11.14L14.94 17L10 14.26L5.06 17L6 11.14L2 7.27L7.61 6.26L10 1Z" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  
                  <!-- Archive button (published) -->
                  <button 
                    v-if="title.status === 'published'"
                    :class="$style.cardIconBtn"
                    @click.stop="archiveTitle(title)"
                    title="أرشفة"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M9 5V9L11.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </button>
                  
                  <!-- Edit button (draft only) -->
                  <button 
                    v-if="title.status === 'draft'"
                    :class="$style.cardIconBtn"
                    @click.stop="openEditModal(title)"
                    title="تعديل"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9.03516 12.9834H13.333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M8.46353 3.11747C8.92317 2.56814 9.74944 2.48758 10.3102 2.93788C10.3412 2.96231 11.3373 3.73614 11.3373 3.73614C11.9533 4.10852 12.1447 4.90018 11.7639 5.50431C11.7437 5.53667 6.11209 12.581 6.11209 12.581C5.92472 12.8147 5.64031 12.9527 5.33636 12.956L3.17969 12.9831L2.69376 10.9264C2.62569 10.6372 2.69376 10.3335 2.88113 10.0997L8.46353 3.11747Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M7.42188 4.4248L10.6528 6.90606" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  
                  <!-- Delete button -->
                  <button 
                    :class="$style.cardIconBtn"
                    @click.stop="deleteTitle(title)"
                    title="حذف"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.25 4.5H15.75M14.25 4.5V14.25C14.25 15 13.5 15.75 12.75 15.75H5.25C4.5 15.75 3.75 15 3.75 14.25V4.5M6 4.5V3C6 2.25 6.75 1.5 7.5 1.5H10.5C11.25 1.5 12 2.25 12 3V4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
                
            
            </div>
            
            <!-- Description -->
            <p :class="$style.cardDescription">{{ title.description || 'نص تجريبي للوصف' }}</p>
            
            <!-- Divider + Stats -->
            <div :class="$style.cardBottomRow">
              <div :class="$style.cardStat">
                <svg width="17" height="15" viewBox="0 0 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.3125 3.1875C4.3125 2.1345 4.3125 1.60725 4.56525 1.22925C4.67472 1.0654 4.8154 0.924717 4.97925 0.81525C5.35725 0.5625 5.8845 0.5625 6.9375 0.5625H12.9375C13.9905 0.5625 14.5178 0.5625 14.8958 0.81525C15.0596 0.924717 15.2003 1.0654 15.3098 1.22925C15.5625 1.60725 15.5625 2.1345 15.5625 3.1875C15.5625 4.2405 15.5625 4.76775 15.3098 5.14575C15.2003 5.3096 15.0596 5.45028 14.8958 5.55975C14.5178 5.8125 13.9905 5.8125 12.9375 5.8125H6.9375C5.8845 5.8125 5.35725 5.8125 4.97925 5.55975C4.8154 5.45028 4.67472 5.3096 4.56525 5.14575C4.3125 4.76775 4.3125 4.2405 4.3125 3.1875ZM4.3125 11.4375C4.3125 10.3845 4.3125 9.85725 4.56525 9.47925C4.67472 9.3154 4.8154 9.17472 4.97925 9.06525C5.35725 8.8125 5.8845 8.8125 6.9375 8.8125H12.9375C13.9905 8.8125 14.5178 8.8125 14.8958 9.06525C15.0593 9.17475 15.2003 9.31575 15.3098 9.47925C15.5625 9.85725 15.5625 10.3845 15.5625 11.4375C15.5625 12.4905 15.5625 13.0178 15.3098 13.3958C15.2003 13.5596 15.0596 13.7003 14.8958 13.8098C14.5178 14.0625 13.9905 14.0625 12.9375 14.0625H6.9375C5.8845 14.0625 5.35725 14.0625 4.97925 13.8098C4.8154 13.7003 4.67472 13.5596 4.56525 13.3958C4.3125 13.0178 4.3125 12.4905 4.3125 11.4375Z" stroke="#717784" stroke-width="1.125"/>
                  <path d="M0.5625 5.0625L1.71225 6.252C2.196 6.7515 2.4375 7.002 2.4375 7.3125C2.4375 7.623 2.196 7.8735 1.71225 8.373L0.5625 9.5625" stroke="#717784" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>{{ title.column_count }} عواميد</span>
              </div>
              <div :class="$style.cardStat">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M9 0.9375C7.03249 0.9375 5.4375 2.53249 5.4375 4.5C5.4375 6.46751 7.03249 8.0625 9 8.0625C10.9675 8.0625 12.5625 6.46751 12.5625 4.5C12.5625 2.53249 10.9675 0.9375 9 0.9375ZM6.5625 4.5C6.5625 3.15381 7.65381 2.0625 9 2.0625C10.3462 2.0625 11.4375 3.15381 11.4375 4.5C11.4375 5.84619 10.3462 6.9375 9 6.9375C7.65381 6.9375 6.5625 5.84619 6.5625 4.5Z" fill="#717784"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M9 9.1875C7.4705 9.1875 6.05814 9.54056 5.00861 10.1403C3.975 10.7309 3.1875 11.6326 3.1875 12.75C3.1875 13.8674 3.975 14.7691 5.00861 15.3597C6.05814 15.9594 7.4705 16.3125 9 16.3125C10.5295 16.3125 11.9419 15.9594 12.9914 15.3597C14.025 14.7691 14.8125 13.8674 14.8125 12.75C14.8125 11.6326 14.025 10.7309 12.9914 10.1403C11.9419 9.54056 10.5295 9.1875 9 9.1875ZM4.3125 12.75C4.3125 12.2105 4.70025 11.6122 5.56677 11.1171C6.41737 10.631 7.63001 10.3125 9 10.3125C10.37 10.3125 11.5826 10.631 12.4332 11.1171C13.2997 11.6122 13.6875 12.2105 13.6875 12.75C13.6875 13.2895 13.2997 13.8878 12.4332 14.3829C11.5826 14.869 10.37 15.1875 9 15.1875C7.63001 15.1875 6.41737 14.869 5.56677 14.3829C4.70025 13.8878 4.3125 13.2895 4.3125 12.75Z" fill="#717784"/>
                </svg>
                <span>{{ title.sheet_count || 0 }} مستخدمين</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div v-else :class="$style.tableContainer">
          <table :class="$style.table">
            <thead :class="$style.tableHead">
              <tr>
                <th>اسم</th>
                <th>الوصف</th>
                <th>عدد الاعمدة</th>
                <th>عدد المستخدمين</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody :class="$style.tableBody">
              <tr 
                v-for="title in filteredTitles"
                :key="title.id"
                :class="$style.tableRow"
              >
                <td>
                  <span :class="$style.sheetNameCell">{{ title.name }}</span>
                </td>
                <td>
                  <span :class="$style.sheetNameCell">{{ title.description || 'نص تجريبي' }}</span>
                </td>
                <td>{{ title.column_count }}</td>
                <td>{{ title.sheet_count || 0 }}</td>
                <td>
                  <span :class="[$style.statusBadge, $style[getStatusClass(title.status)]]">
                    {{ getStatusLabel(title.status) }}
                  </span>
                </td>
                <td>
                  <div :class="$style.actionButtons">
                    <!-- Set Active button (published only) - not active star -->
                    <button 
                      v-if="title.status === 'published' && !(title as any).is_active_title"
                      :class="[$style.actionBtn, $style.starBtn]"
                      @click.stop="setActiveTitle(title)"
                      title="تعيين كنشط"
                    >
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 0.5C21.4558 0.5 27.5 6.54416 27.5 14C27.5 21.4558 21.4558 27.5 14 27.5C6.54416 27.5 0.5 21.4558 0.5 14C0.5 6.54416 6.54416 0.5 14 0.5Z" fill="white"/>
                        <path d="M14 0.5C21.4558 0.5 27.5 6.54416 27.5 14C27.5 21.4558 21.4558 27.5 14 27.5C6.54416 27.5 0.5 21.4558 0.5 14C0.5 6.54416 6.54416 0.5 14 0.5Z" stroke="#F2F5F8"/>
                        <path d="M11.7225 8.7267C12.7359 6.9089 13.2425 6 14 6C14.7575 6 15.2641 6.9089 16.2775 8.7267L16.5396 9.19699C16.8276 9.71355 16.9716 9.97183 17.196 10.1422C17.4205 10.3127 17.7001 10.3759 18.2593 10.5024L18.7684 10.6176C20.7361 11.0628 21.72 11.2855 21.9541 12.0382C22.1881 12.7909 21.5174 13.5753 20.1759 15.1439L19.8289 15.5498C19.4477 15.9955 19.2571 16.2184 19.1713 16.4942C19.0856 16.7699 19.1144 17.0673 19.172 17.662L19.2245 18.2035C19.4273 20.2965 19.5287 21.343 18.9159 21.8082C18.3031 22.2734 17.3819 21.8492 15.5395 21.0009L15.0628 20.7815C14.5393 20.5404 14.2775 20.4199 14 20.4199C13.7225 20.4199 13.4607 20.5404 12.9372 20.7815L12.4605 21.0009C10.6181 21.8492 9.69694 22.2734 9.08412 21.8082C8.4713 21.343 8.5727 20.2965 8.77552 18.2035L8.82799 17.662C8.88562 17.0673 8.91444 16.7699 8.82869 16.4942C8.74294 16.2184 8.55234 15.9955 8.17113 15.5498L7.82408 15.1439C6.4826 13.5753 5.81186 12.7909 6.04594 12.0382C6.28001 11.2855 7.26389 11.0628 9.23163 10.6176L9.74071 10.5024C10.2999 10.3759 10.5795 10.3127 10.804 10.1422C11.0284 9.97183 11.1724 9.71355 11.4604 9.19699L11.7225 8.7267Z" stroke="#717784" stroke-width="1.5"/>
                      </svg>
                    </button>
                    
                    <!-- Active indicator - gold star -->
                    <button 
                      v-if="(title as any).is_active_title"
                      :class="[$style.actionBtn, $style.starBtn]"
                      @click.stop="deactivateTitle(title)"
                      title="نشط - اضغط لإلغاء التنشيط"
                    >
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 14C0 6.26801 6.26801 0 14 0C21.732 0 28 6.26801 28 14C28 21.732 21.732 28 14 28C6.26801 28 0 21.732 0 14Z" fill="#A17D23"/>
                        <path d="M11.7225 8.7267C12.7359 6.9089 13.2425 6 14 6C14.7575 6 15.2641 6.9089 16.2775 8.7267L16.5396 9.19699C16.8276 9.71355 16.9716 9.97183 17.196 10.1422C17.4205 10.3127 17.7001 10.3759 18.2593 10.5024L18.7684 10.6176C20.7361 11.0628 21.72 11.2855 21.9541 12.0382C22.1881 12.7909 21.5174 13.5753 20.1759 15.1439L19.8289 15.5498C19.4477 15.9955 19.2571 16.2184 19.1713 16.4942C19.0856 16.7699 19.1144 17.0673 19.172 17.662L19.2245 18.2035C19.4273 20.2965 19.5287 21.343 18.9159 21.8082C18.3031 22.2734 17.3819 21.8492 15.5395 21.0009L15.0628 20.7815C14.5393 20.5404 14.2775 20.4199 14 20.4199C13.7225 20.4199 13.4607 20.5404 12.9372 20.7815L12.4605 21.0009C10.6181 21.8492 9.69694 22.2734 9.08412 21.8082C8.4713 21.343 8.5727 20.2965 8.77552 18.2035L8.82799 17.662C8.88562 17.0673 8.91444 16.7699 8.82869 16.4942C8.74294 16.2184 8.55234 15.9955 8.17113 15.5498L7.82408 15.1439C6.4826 13.5753 5.81186 12.7909 6.04594 12.0382C6.28001 11.2855 7.26389 11.0628 9.23163 10.6176L9.74071 10.5024C10.2999 10.3759 10.5795 10.3127 10.804 10.1422C11.0284 9.97183 11.1724 9.71355 11.4604 9.19699L11.7225 8.7267Z" fill="white" stroke="white"/>
                      </svg>
                    </button>
                    
                    <!-- Edit button (draft only) -->
                    <button 
                      v-if="title.status === 'draft'"
                      :class="$style.actionBtn"
                      @click.stop="openEditModal(title)"
                      title="تعديل"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.03516 12.9834H13.333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M8.46353 3.11747C8.92317 2.56814 9.74944 2.48758 10.3102 2.93788C10.3412 2.96231 11.3373 3.73614 11.3373 3.73614C11.9533 4.10852 12.1447 4.90018 11.7639 5.50431C11.7437 5.53667 6.11209 12.581 6.11209 12.581C5.92472 12.8147 5.64031 12.9527 5.33636 12.956L3.17969 12.9831L2.69376 10.9264C2.62569 10.6372 2.69376 10.3335 2.88113 10.0997L8.46353 3.11747Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M7.42188 4.4248L10.6528 6.90606" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    
                    <!-- Columns button (draft only) -->
                    <button 
                      v-if="title.status === 'draft'"
                      :class="$style.actionBtn"
                      @click.stop="openColumnsModal(title)"
                      title="إدارة الأعمدة"
                    >
                      <i class="fas fa-th-list"></i>
                    </button>
                    
                    <!-- Publish button (draft only) - globe icon -->
                    <button 
                      v-if="title.status === 'draft'"
                      :class="$style.actionBtn"
                      @click.stop="publishTitle(title)"
                      title="نشر"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 0C3.584 0 0 3.584 0 8C0 12.416 3.584 16 8 16C12.416 16 16 12.416 16 8C16 3.584 12.416 0 8 0ZM1.6 8C1.6 7.512 1.664 7.032 1.768 6.576L5.592 10.4V11.2C5.592 12.08 6.312 12.8 7.192 12.8V14.344C4.048 13.944 1.6 11.256 1.6 8ZM12.712 12.32C12.504 11.672 11.912 11.2 11.192 11.2H10.392V8.8C10.392 8.36 10.032 8 9.592 8H4.792V6.4H6.392C6.832 6.4 7.192 6.04 7.192 5.6V4H8.792C9.672 4 10.392 3.28 10.392 2.4V2.072C12.736 3.016 14.4 5.32 14.4 8C14.4 9.664 13.752 11.184 12.712 12.32Z" fill="currentColor"/>
                      </svg>
                    </button>
                    
                    <!-- Archive/View button (published) -->
                    <button 
                      v-if="title.status === 'published'"
                      :class="$style.actionBtn"
                      @click.stop="archiveTitle(title)"
                      title="أرشفة"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 0C3.584 0 0 3.584 0 8C0 12.416 3.584 16 8 16C12.416 16 16 12.416 16 8C16 3.584 12.416 0 8 0ZM1.6 8C1.6 7.512 1.664 7.032 1.768 6.576L5.592 10.4V11.2C5.592 12.08 6.312 12.8 7.192 12.8V14.344C4.048 13.944 1.6 11.256 1.6 8ZM12.712 12.32C12.504 11.672 11.912 11.2 11.192 11.2H10.392V8.8C10.392 8.36 10.032 8 9.592 8H4.792V6.4H6.392C6.832 6.4 7.192 6.04 7.192 5.6V4H8.792C9.672 4 10.392 3.28 10.392 2.4V2.072C12.736 3.016 14.4 5.32 14.4 8C14.4 9.664 13.752 11.184 12.712 12.32Z" fill="currentColor"/>
                      </svg>
                    </button>
                    
                    <!-- Delete button -->
                    <button 
                      :class="$style.actionBtn"
                      @click.stop="deleteTitle(title)"
                      title="حذف"
                    >
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="filteredTitles.length > 0" :class="$style.paginationContainer">
          <div :class="$style.paginationLeft">
            <button :class="$style.paginationBtn">
              <i class="fas fa-chevron-right"></i>
            </button>
            <button :class="[$style.paginationBtn, $style.paginationBtnActive]">1</button>
            <button :class="$style.paginationBtn">2</button>
            <span :class="$style.paginationDots">...</span>
            <button :class="$style.paginationBtn">10</button>
            <button :class="$style.paginationBtn">11</button>
            <button :class="$style.paginationBtn">
              <i class="fas fa-chevron-left"></i>
            </button>
          </div>
          <div :class="$style.paginationRight">
            <span>من {{ titles.length }}</span>
            <select :class="$style.pageSizeSelect">
              <option value="6">6</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
            <span>عرض</span>
          </div>
        </div>
      </template>

      <!-- ===== SUBMITTED SHEETS TAB ===== -->
      <template v-if="activeTab === 'submitted'">
        <!-- Table Header with Search and Filters -->
        <div :class="$style.tableHeader">
          <div :class="$style.filterSection">
            <select v-model="submittedTitleFilter" :class="$style.filterSelect" @change="loadSubmittedSheets(1)">
              <option :value="null">جميع العناوين</option>
              <option v-for="t in publishedTitles" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div :class="$style.searchSection">
            <div :class="$style.searchBox">
              <input 
                v-model="submittedSearch"
                type="text" 
                placeholder="ابحث..."
                :class="$style.searchInput"
                @keyup.enter="loadSubmittedSheets(1)"
              />
              <i class="fas fa-search" :class="$style.searchIcon"></i>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="submittedLoading" :class="$style.loading">
          <i class="fas fa-spinner fa-spin"></i>
          جاري التحميل...
        </div>

        <!-- Submitted Sheets Table -->
        <div v-else :class="$style.tableContainer">
          <div v-if="submittedSheets.length === 0" :class="$style.emptyState">
            <i class="fas fa-inbox"></i>
            <p>لا توجد جداول مقدمة</p>
          </div>
          
          <table v-else :class="$style.table">
            <thead :class="$style.tableHead">
              <tr>
                <th>اسم الجدول</th>
                <th>العنوان</th>
                <th>المستخدم</th>
                <th>تاريخ التقديم</th>
              </tr>
            </thead>
            <tbody :class="$style.tableBody">
              <tr 
                v-for="sheet in submittedSheets" 
                :key="sheet.id"
                :class="$style.tableRow"
                @click="viewSubmittedSheet(sheet)"
              >
                <td>
                  <div :class="$style.sheetNameCell">
                    <span :class="$style.excelIcon">
                      <i class="fas fa-file-excel"></i>
                    </span>
                    <span :class="$style.sheetNameText">{{ sheet.name }}</span>
                  </div>
                </td>
                <td>{{ sheet.template_name }}</td>
                <td>{{ sheet.owner_name }}</td>
                <td>{{ formatDate(sheet.submitted_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="submittedPagination.total_pages > 1" :class="$style.paginationContainer">
          <div :class="$style.paginationLeft">
            <button 
              :class="$style.paginationBtn"
              :disabled="!submittedPagination.has_prev"
              @click="loadSubmittedSheets(submittedPagination.page - 1)"
            >
              <i class="fas fa-chevron-right"></i>
            </button>
            <button 
              v-for="page in submittedPagination.total_pages" 
              :key="page" 
              :class="[$style.paginationBtn, page === submittedPagination.page && $style.paginationBtnActive]"
              @click="loadSubmittedSheets(page)"
            >
              {{ page }}
            </button>
            <button 
              :class="$style.paginationBtn"
              :disabled="!submittedPagination.has_next"
              @click="loadSubmittedSheets(submittedPagination.page + 1)"
            >
              <i class="fas fa-chevron-left"></i>
            </button>
          </div>
          <div :class="$style.paginationRight">
            <span>من {{ submittedPagination.total_count }}</span>
            <select :class="$style.pageSizeSelect">
              <option value="6">6</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
            <span>عرض</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Import from Excel Modal -->
    <Teleport to="body">
      <div v-if="showImportModal" :class="$style.modalOverlay" @click.self="closeImportModal">
        <div :class="[$style.modal, $style.importModal]">
          <div :class="$style.modalHeader">
            <h2><i class="fas fa-file-import"></i> استيراد عنوان من Excel</h2>
            <button :class="$style.closeBtn" @click="closeImportModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div :class="$style.modalBody">
            <div v-if="importError" :class="$style.errorMsg">
              <i class="fas fa-exclamation-circle"></i>
              {{ importError }}
            </div>
            
            <!-- Upload Section -->
            <div v-if="importedColumns.length === 0" :class="$style.importUploadSection">
              <div :class="$style.importIcon">
                <i class="fas fa-file-excel"></i>
              </div>
              <h3>رفع ملف Excel</h3>
              <p :class="$style.importDesc">
                قم برفع ملف Excel لاستخراج أسماء الأعمدة منه تلقائياً.
                <br>
                <small>سيتم الكشف تلقائياً عن صف الأعمدة سواء كان في الصف الأول أو الثاني.</small>
              </p>
              
              <input
                ref="importFileInput"
                type="file"
                accept=".xlsx,.xls"
                :class="$style.hiddenInput"
                @change="handleImportFile"
              />
              
              <button 
                :class="$style.uploadBtn" 
                @click="triggerImportFileInput"
                :disabled="isImporting"
              >
                <i v-if="isImporting" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-upload"></i>
                {{ isImporting ? 'جاري القراءة...' : 'اختر ملف Excel' }}
              </button>
              
              <div :class="$style.importHint">
                <i class="fas fa-info-circle"></i>
                يدعم ملفات .xlsx و .xls
              </div>
            </div>
            
            <!-- Preview Section -->
            <div v-else :class="$style.importPreviewSection">
              <div :class="$style.importSuccessIcon">
                <i class="fas fa-check-circle"></i>
              </div>
              <h3>تم استخراج {{ importedColumns.length }} عمود</h3>
              
              <div :class="$style.formGroup">
                <label>اسم العنوان المقترح</label>
                <input 
                  v-model="importPreviewName" 
                  type="text" 
                  placeholder="أدخل اسم العنوان"
                />
              </div>
              
              <div :class="$style.importColumnsList">
                <h4>الأعمدة المستخرجة:</h4>
                <div :class="$style.importColumnsGrid">
                  <div 
                    v-for="(col, index) in importedColumns" 
                    :key="index"
                    :class="$style.importColumnItem"
                  >
                    <span :class="$style.importColumnNum">{{ index + 1 }}</span>
                    <span :class="$style.importColumnLabel">{{ col.label }}</span>
                    <span :class="[$style.typeBadge, $style[col.data_type]]">
                      {{ dataTypeLabels[col.data_type] }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div :class="$style.importActions">
                <button :class="$style.cancelBtn" @click="closeImportModal">
                  إلغاء
                </button>
                <button :class="$style.uploadBtn" @click="triggerImportFileInput">
                  <i class="fas fa-redo"></i>
                  ملف آخر
                </button>
                <button :class="$style.saveBtn" @click="applyImportedColumns">
                  <i class="fas fa-check"></i>
                  متابعة الإنشاء
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" :class="$style.modalOverlay" @click.self="closeModal">
        <div :class="[$style.modal, $style.createModal]">
          <div :class="$style.createModalHeader">
            <h2>إنشاء عنوان جديد</h2>
            <button :class="$style.createCloseBtn" @click="closeModal">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- Modal Tabs -->
          <div :class="$style.createModalTabs">
            <button 
              :class="[$style.createModalTab, createModalTab === 'details' && $style.activeModalTab]"
              @click="createModalTab = 'details'"
            >
              تفاصيل العنوان  
            </button>
            <button 
              :class="[$style.createModalTab, createModalTab === 'columns' && $style.activeModalTab, !titleForm.name.trim() && $style.disabledTab]"
              @click="goToColumnsTab"
              :disabled="!titleForm.name.trim()"
            >
              الأعمدة
            </button>
          </div>

          <div :class="$style.createModalBody">
            <div v-if="errorMessage" :class="$style.errorMsg">
              <i class="fas fa-exclamation-circle"></i>
              {{ errorMessage }}
            </div>
            
            <!-- Details Tab -->
            <div v-if="createModalTab === 'details'" :class="$style.detailsTab">
              <div :class="$style.createFormGroup">
                <label>اسم العنوان</label>
                <input 
                  v-model="titleForm.name" 
                  type="text" 
                  placeholder="ادخل اسم العنوان"
                  :disabled="isSaving"
                  :class="$style.createInput"
                />
              </div>
              
              <div :class="$style.createFormGroup">
                <label>الوصف</label>
                <textarea 
                  v-model="titleForm.description" 
                  placeholder="وصف اختياري للعنوان"
                  :disabled="isSaving"
                  rows="4"
                  :class="$style.createTextarea"
                ></textarea>
              </div>
            </div>
            
            <!-- Columns Tab -->
            <div v-if="createModalTab === 'columns'" :class="$style.columnsTab">
              <button 
                type="button" 
                :class="$style.addColumnBtnNew" 
                @click="addColumn('form')"
                :disabled="isSaving"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                اضافة عمود
              </button>
              
              <div v-if="titleForm.columns.length === 0" :class="$style.noColumnsNew">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/>
                  <path d="M10 6V10.5M10 14V13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                لم يتم اضافة اعمدة بعد. يمكنك إضافة الأعمدة الآن أو لاحقاً.
              </div>
              
              <div v-else :class="$style.columnCards">
                <div 
                  v-for="(column, index) in titleForm.columns" 
                  :key="index" 
                  :class="[$style.columnCard, dragOverColumnIndex === index && $style.columnCardDragOver]"
                  draggable="true"
                  @dragstart="handleDragStart(index)"
                  @dragover="handleDragOver($event, index)"
                  @dragleave="handleDragLeave"
                  @drop="handleDrop(index, 'form')"
                  @dragend="handleDragEnd"
                >
                  <div :class="$style.columnCardHeader">
                         <div :class="$style.columnCardRight">
                      <div :class="$style.columnDragHandle">
                        <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="2" cy="2" r="1.5" fill="#9CA3AF"/>
                          <circle cx="8" cy="2" r="1.5" fill="#9CA3AF"/>
                          <circle cx="2" cy="8" r="1.5" fill="#9CA3AF"/>
                          <circle cx="8" cy="8" r="1.5" fill="#9CA3AF"/>
                          <circle cx="2" cy="14" r="1.5" fill="#9CA3AF"/>
                          <circle cx="8" cy="14" r="1.5" fill="#9CA3AF"/>
                        </svg>
                      </div>
                          <span :class="$style.columnNumberBadge">{{ index + 1 }}</span>
                    
                    </div>
                    <div :class="$style.columnCardLeft">
                       <div :class="$style.columnOrderBtnsNew">
                        <button 
                          type="button"
                          @click="moveColumnUp(index, 'form')" 
                          :disabled="index === 0 || isSaving"
                          title="تحريك لأعلى"
                        >
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5L5 1L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </button>
                        <button 
                          type="button"
                          @click="moveColumnDown(index, 'form')" 
                          :disabled="index === titleForm.columns.length - 1 || isSaving"
                          title="تحريك لأسفل"
                        >
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </button>
                      </div>
                      <button 
                        type="button"
                        :class="$style.columnDeleteBtn" 
                        @click="removeColumn(index, 'form')"
                        :disabled="isSaving"
                        title="حذف العمود"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="8" cy="8" r="7" fill="#DC2626"/>
                          <path d="M5 5L11 11M5 11L11 5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                      </button>
                     
                    </div>
               
                  </div>
                  
                  <div :class="$style.columnCardBody">
                    <div :class="$style.columnFieldLabel">اسم العمود</div>
                    <div :class="$style.columnFieldsRow">
                     <input 
                        v-model="column.label" 
                        type="text" 
                        placeholder="ادخل اسم العمود"
                        :disabled="isSaving"
                        :class="$style.columnNameInput"
                      />
                      <select 
                        v-model="column.data_type" 
                        :disabled="isSaving"
                        :class="$style.columnTypeSelect"
                      >
                        <option value="text">{{ dataTypeLabels.text }}</option>
                        <option value="number">{{ dataTypeLabels.number }}</option>
                        <option value="date">{{ dataTypeLabels.date }}</option>
                        <option value="boolean">{{ dataTypeLabels.boolean }}</option>
                        <option value="select">{{ dataTypeLabels.select }}</option>
                      </select>
                     
                    </div>
                    
                    <!-- Options for select type -->
                    <div v-if="column.data_type === 'select'" :class="$style.optionsSectionNew">
                      <label>الخيارات *</label>
                      <div :class="$style.optionsListNew">
                        <span 
                          v-for="(opt, optIndex) in column.options" 
                          :key="optIndex" 
                          :class="$style.optionTagNew"
                        >
                          {{ opt }}
                          <button 
                            type="button"
                            @click="removeOption(column, optIndex)"
                            :disabled="isSaving"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 1L9 9M1 9L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                          </button>
                        </span>
                      </div>
                      <div :class="$style.addOptionRowNew">
                        <input 
                          v-model="column.optionsInput" 
                          type="text" 
                          placeholder="أضف خيار..."
                          @keyup.enter="addOption(column)"
                          :disabled="isSaving"
                        />
                        <button 
                          type="button"
                          @click="addOption(column)"
                          :disabled="isSaving || !column.optionsInput?.trim()"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 1V11M1 6H11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div :class="$style.createModalFooter">
            <button :class="$style.createCancelBtn" @click="closeModal" :disabled="isSaving">
              الغاء
            </button>
            <!-- Show "التالي" button in details tab -->
            <button 
              v-if="createModalTab === 'details'"
              :class="$style.nextStepBtn" 
              @click="goToNextStep" 
              :disabled="!titleForm.name.trim()"
            >
              التالي
            </button>
            <!-- Show "انشاء" button in columns tab -->
            <button 
              v-if="createModalTab === 'columns'"
              :class="$style.createSubmitBtn" 
              @click="createTitle" 
              :disabled="isSaving"
            >
              <span v-if="isSaving"><i class="fas fa-spinner fa-spin"></i> جاري الحفظ...</span>
              <span v-else>انشاء</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" :class="$style.modalOverlay" @click.self="closeModal">
        <div :class="[$style.modal, $style.createModal]">
          <div :class="$style.createModalHeader">
            <h2>تعديل العنوان</h2>
            <button :class="$style.createCloseBtn" @click="closeModal">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div :class="$style.createModalBody">
            <div v-if="errorMessage" :class="$style.errorMsg">
              <i class="fas fa-exclamation-circle"></i>
              {{ errorMessage }}
            </div>
            
            <div :class="$style.detailsTab">
              <div :class="$style.createFormGroup">
                <label>اسم العنوان</label>
                <input 
                  v-model="titleForm.name" 
                  type="text" 
                  placeholder="ادخل اسم العنوان"
                  :disabled="isSaving"
                  :class="$style.createInput"
                />
              </div>
              
              <div :class="$style.createFormGroup">
                <label>الوصف</label>
                <textarea 
                  v-model="titleForm.description" 
                  placeholder="وصف اختياري للعنوان"
                  :disabled="isSaving"
                  rows="4"
                  :class="$style.createTextarea"
                ></textarea>
              </div>
            </div>
          </div>
          <div :class="$style.createModalFooter">
              <button :class="$style.addColumnBtnNew" @click="updateTitle" :disabled="isSaving">
              <span v-if="isSaving"><i class="fas fa-spinner fa-spin"></i> جاري الحفظ...</span>
              <span v-else>حفظ</span>
            </button>
            <button :class="$style.createCancelBtn" @click="closeModal" :disabled="isSaving">
              الغاء
            </button>
         
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Columns Modal -->
    <Teleport to="body">
      <div v-if="showColumnsModal" :class="$style.modalOverlay" @click.self="closeModal">
        <div :class="[$style.modal, $style.createModal]">
          <div :class="$style.createModalHeader">
            <h2>إدارة أعمدة "{{ selectedTitleForColumns?.name }}"</h2>
            <button :class="$style.createCloseBtn" @click="closeModal">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div :class="$style.createModalBody">
            <div v-if="errorMessage" :class="$style.errorMsg">
              <i class="fas fa-exclamation-circle"></i>
              {{ errorMessage }}
            </div>
            
            <!-- Columns Section with new design -->
            <div :class="$style.columnsTab">
              <button 
                type="button" 
                :class="$style.addColumnBtnNew" 
                @click="addColumn('modal')"
                :disabled="isSaving"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                اضافة عمود
              </button>
              
              <div v-if="columnsForm.length === 0" :class="$style.noColumnsNew">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/>
                  <path d="M10 6V10.5M10 14V13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                لم يتم إضافة أعمدة بعد.
              </div>
              
              <div v-else :class="$style.columnCards">
                <div 
                  v-for="(column, index) in columnsForm" 
                  :key="index" 
                  :class="[$style.columnCard, dragOverColumnIndex === index && $style.columnCardDragOver]"
                  draggable="true"
                  @dragstart="handleDragStart(index)"
                  @dragover="handleDragOver($event, index)"
                  @dragleave="handleDragLeave"
                  @drop="handleDrop(index, 'modal')"
                  @dragend="handleDragEnd"
                >
                  <div :class="$style.columnCardHeader">
                    <div :class="$style.columnCardRight">
                      <div :class="$style.columnDragHandle">
                        <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="2" cy="2" r="1.5" fill="#9CA3AF"/>
                          <circle cx="8" cy="2" r="1.5" fill="#9CA3AF"/>
                          <circle cx="2" cy="8" r="1.5" fill="#9CA3AF"/>
                          <circle cx="8" cy="8" r="1.5" fill="#9CA3AF"/>
                          <circle cx="2" cy="14" r="1.5" fill="#9CA3AF"/>
                          <circle cx="8" cy="14" r="1.5" fill="#9CA3AF"/>
                        </svg>
                      </div>
                      <span :class="$style.columnNumberBadge">{{ index + 1 }}</span>
                    </div>
                    <div :class="$style.columnCardLeft">
                      <div :class="$style.columnOrderBtnsNew">
                        <button 
                          type="button"
                          @click="moveColumnUp(index, 'modal')" 
                          :disabled="index === 0 || isSaving"
                          title="تحريك لأعلى"
                        >
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5L5 1L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </button>
                        <button 
                          type="button"
                          @click="moveColumnDown(index, 'modal')" 
                          :disabled="index === columnsForm.length - 1 || isSaving"
                          title="تحريك لأسفل"
                        >
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </button>
                      </div>
                      <button 
                        type="button"
                        :class="$style.columnDeleteBtn" 
                        @click="removeColumn(index, 'modal')"
                        :disabled="isSaving"
                        title="حذف العمود"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="8" cy="8" r="7" fill="#DC2626"/>
                          <path d="M5 5L11 11M5 11L11 5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div :class="$style.columnCardBody">
                    <div :class="$style.columnFieldLabel">اسم العمود</div>
                    <div :class="$style.columnFieldsRow">
                      <input 
                        v-model="column.label" 
                        type="text" 
                        placeholder="ادخل اسم العمود"
                        :disabled="isSaving"
                        :class="$style.columnNameInput"
                      />
                      <select 
                        v-model="column.data_type" 
                        :disabled="isSaving"
                        :class="$style.columnTypeSelect"
                      >
                        <option value="text">{{ dataTypeLabels.text }}</option>
                        <option value="number">{{ dataTypeLabels.number }}</option>
                        <option value="date">{{ dataTypeLabels.date }}</option>
                        <option value="boolean">{{ dataTypeLabels.boolean }}</option>
                        <option value="select">{{ dataTypeLabels.select }}</option>
                      </select>
                    </div>
                    
                    <!-- Options for select type -->
                    <div v-if="column.data_type === 'select'" :class="$style.optionsSectionNew">
                      <label>الخيارات *</label>
                      <div :class="$style.optionsListNew">
                        <span 
                          v-for="(opt, optIndex) in column.options" 
                          :key="optIndex" 
                          :class="$style.optionTagNew"
                        >
                          {{ opt }}
                          <button 
                            type="button"
                            @click="removeOption(column, optIndex)"
                            :disabled="isSaving"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 1L9 9M1 9L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                          </button>
                        </span>
                      </div>
                      <div :class="$style.addOptionRowNew">
                        <input 
                          v-model="column.optionsInput" 
                          type="text" 
                          placeholder="أضف خيار..."
                          @keyup.enter="addOption(column)"
                          :disabled="isSaving"
                        />
                        <button 
                          type="button"
                          @click="addOption(column)"
                          :disabled="isSaving || !column.optionsInput?.trim()"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 1V11M1 6H11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div :class="$style.createModalFooter">
            <button :class="$style.addColumnBtnNew" @click="saveColumns" :disabled="isSaving">
              <span v-if="isSaving"><i class="fas fa-spinner fa-spin"></i> جاري الحفظ...</span>
              <span v-else>حفظ الأعمدة</span>
            </button>
            <button :class="$style.createCancelBtn" @click="closeModal" :disabled="isSaving">
              الغاء
            </button>
           
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style module>
.container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  direction: rtl;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.pageTitle {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
}

.headerActions {
  display: flex;
  gap: 12px;
}

.secondaryBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 1.5px solid #A17D23;
  border-radius: 8px;
  color: #A17D23;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.secondaryBtn:hover {
  background: #fef9ec;
}

.addBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #A17D23;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.addBtn:hover {
  background: #8a6b1e;
}

/* Tabs Container */
.tabsContainer {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.tabBtn {
  padding: 12px 24px;
  background:white;
  border: none;
  border-radius: 8px;
  color: #525866;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tabBtn:hover {
  background: #f5f5f5;
}

.tabBtn.activeTab {
  background: #A17D23;
  color: white;
}

/* Content Card */
.contentCard {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* Table Header */
.tableHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.filterSection {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filterSelect {
  padding: 10px 16px;
  padding-left: 36px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: white;
  color: #525866;
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M6 8l4 4 4-4' stroke='%2364748B' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: left 12px center;
  background-size: 14px;
}

.viewToggle {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.viewBtn {
  padding: 8px 12px;
  background: white;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.viewBtn:hover {
  background: #f8fafc;
  color: #525866;
}

.viewBtnActive {
  background: #f8fafc;
  color: #A17D23;
}

.searchSection {
  flex: 1;
  max-width: 400px;
}

.searchBox {
  position: relative;
  width: 100%;
}

.searchInput {
  width: 100%;
  padding: 10px 16px;
  padding-left: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: white;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s;
}

.searchInput:focus {
  outline: none;
  border-color: #A17D23;
  box-shadow: 0 0 0 3px rgba(161, 125, 35, 0.1);
}

.searchInput::placeholder {
  color: #94a3b8;
}

.searchIcon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 14px;
}

/* Cards Container */
.cardsContainer {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 0;
}

@media (max-width: 1200px) {
  .cardsContainer {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .cardsContainer {
    grid-template-columns: 1fr;
  }
}

.titleCard {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  padding: 16px 0px;
  gap: 12px;
}

.titleCard:hover {
  border-color: #A17D23;
  box-shadow: 0 4px 12px rgba(161, 125, 35, 0.1);
}

.cardTopRow {
  display: flex;
  justify-content: space-between; /* Full space between */
  align-items: flex-start;
  gap: 16px;
  width: 100%;
}

.cardTitle {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  font-family: 'Cairo', sans-serif;
  text-align: right;
  direction: rtl;
}

.cardTopRight {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 0; /* Stick to right */
  flex-direction: row-reverse; /* Badges then Title */
}

.cardTopActions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 0; /* Stick to left */
}

.cardIconBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #f8fafc;
  color: #717784;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.cardIconBtn:hover {
  background: #f1f5f9;
  color: #525866;
}

.starBtnActive {
  background: transparent;
}

.cardBadges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activeBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: #A17D23;
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  font-family: 'Cairo', sans-serif;
}

.cardDescription {
  font-size: 14px;
  color: #717784;
  margin: 0;
  line-height: 1.5;
  font-family: 'Cairo', sans-serif;
  text-align: right;
  width:100%;
  direction: rtl;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.cardBottomRow {
  display: flex;
  justify-content: space-between; /* One right, one left */
  align-items: center;
  width: 100%;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.cardStat {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #717784;
  font-size: 13px;
  font-family: 'Cairo', sans-serif;
}

.cardStat:first-child {
  margin-right: 0; /* Stick to right */
}

.cardStat:last-child {
  margin-left: 0; /* Stick to left */
}

.cardStat svg {
  flex-shrink: 0;
}

/* Legacy card styles - keep for compatibility */
.cardMainContent {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 40px;
  min-width: 0;
}

.cardTitleSection {
  flex: 1;
  min-width: 200px;
}

.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.cardActions {
  display: flex;
  gap: 8px;
}

.cardBody {
  padding: 16px;
}

.cardTitle {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
  font-family: 'Cairo', sans-serif;
}

.cardDescription {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
  font-family: 'Cairo', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.cardStatsRow {
  display: flex;
  gap: 32px;
}

.cardStats {
  display: flex;
  gap: 24px;
}

.cardStat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.statLabel {
  font-size: 11px;
  color: #94a3b8;
  font-family: 'Cairo', sans-serif;
}

.statValue {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.cardStatusSection {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  border-right: 1px solid #e2e8f0;
  border-left: 1px solid #e2e8f0;
}

.cardActionsSection {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cardFooter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
}

.cardActionBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #525866;
  font-size: 13px;
  font-family: 'Cairo', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
}

.cardActionBtn:hover {
  border-color: #A17D23;
  color: #A17D23;
}

.cardActionBtnPrimary {
  background: #A17D23;
  border-color: #A17D23;
  color: white;
}

.cardActionBtnPrimary:hover {
  background: #8a6a1e;
  border-color: #8a6a1e;
  color: white;
}

.cardActionBtnDanger {
  color: #ef4444;
  border-color: #fecaca;
}

.cardActionBtnDanger:hover {
  background: #fef2f2;
  border-color: #ef4444;
  color: #dc2626;
}

/* Table Container */
.tableContainer {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.tableHead {
  background: #f8fafc;
}

.tableHead th {
  padding: 14px 16px;
  text-align: right;
  font-weight: 600;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

.tableBody {
  background: white;
}

.tableRow {
  transition: background 0.2s;
  cursor: pointer;
}

.tableRow:hover {
  background: #fafafa;
}

.tableRow td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  color: #1a1a1a;
}

.tableRow:last-child td {
  border-bottom: none;
}

.titleName {
  font-weight: 600;
  color: #1a1a1a;
}

.titleDesc {
  color: #64748b;
}

/* Status Badge */
.statusBadge {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

.statusBadge.draft {
  background: #f1f5f9;
  color: #475569;
}

.statusBadge.published {
  background: #22c55e;
  color: white;
}

.statusBadge.archived {
  background: #fee2e2;
  color: #b91c1c;
}

/* Action Buttons */
.actionButtons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.actionBtn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.actionBtn:hover {
  background: #f1f5f9;
  color: #1a1a1a;
}

.starBtn {
  width: auto;
  height: auto;
  padding: 0;
  background: transparent;
}

.starBtn:hover {
  background: transparent;
  transform: scale(1.1);
}

/* Pagination */
.paginationContainer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0 0;
  border-top: 1px solid #f1f5f9;
  margin-top: 16px;
}

.paginationLeft {
  display: flex;
  align-items: center;
  gap: 4px;
}

.paginationBtn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #525866;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.paginationBtn:hover:not(:disabled) {
  border-color: #A17D23;
  color: #A17D23;
}

.paginationBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.paginationBtnActive {
  background: #A17D23;
  border-color: #A17D23;
  color: white;
}

.paginationBtnActive:hover {
  background: #8a6b1e;
}

.paginationDots {
  padding: 0 8px;
  color: #94a3b8;
}

.paginationRight {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 14px;
}

.pageSizeSelect {
  padding: 8px 12px;
  padding-left: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #525866;
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M6 8l4 4 4-4' stroke='%2364748B' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: left 8px center;
  background-size: 12px;
}

/* Submitted Sheets Tab Styles */
.sheetNameCell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.excelIcon {
  width: 32px;
  height: 32px;
  background: #22c55e;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.sheetNameText {
  font-weight: 600;
  color: #1a1a1a;
}

/* Active Title Badge */
.activeBadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.activeBadge i {
  font-size: 0.65rem;
}

.titleCard.activeTitle {
  border-right: 4px solid #f59e0b;
  background: linear-gradient(to left, rgba(251, 191, 36, 0.05), transparent);
}

/* Set Active Button */
.activeBtn:hover {
  background: #fef3c7;
  color: #b45309;
  border-color: #f59e0b;
}

.deactivateBtn:hover {
  background: #fef3c7;
  color: #92400e;
  border-color: #f59e0b;
}

/* Search Button */
.searchBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--primary-color, #4361ee);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.searchBtn:hover {
  background: var(--primary-dark, #3651d4);
}

/* Submitted Sheets Table */
.submittedList {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  overflow: hidden;
}

.submittedTable {
  overflow-x: auto;
}

.submittedTable table {
  width: 100%;
  border-collapse: collapse;
}

.submittedTable th,
.submittedTable td {
  padding: 14px 16px;
  text-align: right;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.submittedTable th {
  background: var(--bg-secondary, #f8fafc);
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  font-size: 0.9rem;
}

.submittedTable td {
  color: var(--text-primary, #1e293b);
  font-size: 0.95rem;
}

.submittedTable tbody tr:hover {
  background: var(--bg-secondary, #f8fafc);
}

.submittedTable tbody tr:last-child td {
  border-bottom: none;
}

/* Clickable row styles */
.clickableRow {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickableRow:hover {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%) !important;
}

.viewSheetAction {
  display: flex;
  align-items: center;
  gap: 8px;
}

.viewIcon {
  opacity: 0;
  color: #10b981;
  font-size: 0.85rem;
  transition: opacity 0.2s ease;
}

.clickableRow:hover .viewIcon {
  opacity: 1;
}

.sheetName {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.sheetName i {
  color: #10b981;
}

.sheetDesc {
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  margin-top: 4px;
}

.userName {
  font-weight: 500;
}

.userUsername {
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.pagination button {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  background: white;
  color: var(--text-primary, #1e293b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
  background: var(--bg-secondary, #f1f5f9);
  border-color: var(--primary-color, #4361ee);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pageInfo {
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
}

/* Messages */
.successMsg, .errorMsg {
  padding: 14px 18px;
  border-radius: 10px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
}

.successMsg {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.errorMsg {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

/* Filters */
.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.searchBox {
  flex: 1;
  min-width: 250px;
  position: relative;
}

.searchBox i {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #94a3b8);
}

.searchBox input {
  width: 100%;
  padding: 12px 44px 12px 14px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.searchBox input:focus {
  outline: none;
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

.statusSelect {
  padding: 12px 16px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  font-size: 0.95rem;
  min-width: 150px;
  cursor: pointer;
}

/* Loading */
.loading {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary, #64748b);
}

.loading i {
  margin-left: 10px;
  color: var(--primary-color, #4361ee);
}

/* Empty State */
.emptyState {
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-secondary, #f8fafc);
  border-radius: 16px;
  border: 2px dashed var(--border-color, #e2e8f0);
}

.emptyState i {
  font-size: 3.5rem;
  color: var(--text-secondary, #94a3b8);
  margin-bottom: 16px;
}

.emptyState p {
  color: var(--text-secondary, #64748b);
  margin: 0 0 20px 0;
  font-size: 1.1rem;
}

.addBtnEmpty {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--primary-color, #4361ee);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

/* Titles List */
.titlesList {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.titleCard {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  transition: all 0.2s;
}

.titleCard:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.titleCard.draft {
  border-right: 4px solid #f59e0b;
}

.titleCard.published {
  border-right: 4px solid #10b981;
}

.titleCard.archived {
  border-right: 4px solid #94a3b8;
  opacity: 0.7;
}

.titleInfo {
  flex: 1;
}

.titleHeader {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.titleName {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.statusBadge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.statusBadge.draft {
  background: #fef3c7;
  color: #92400e;
}

.statusBadge.published {
  background: #d1fae5;
  color: #065f46;
}

.statusBadge.archived {
  background: #f1f5f9;
  color: #64748b;
}

.titleDesc {
  margin: 0 0 10px 0;
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
}

.titleMeta {
  display: flex;
  gap: 16px;
}

.metaItem {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary, #94a3b8);
}

.metaItem i {
  font-size: 0.9rem;
}

/* Actions */
.titleActions {
  display: flex;
  gap: 8px;
}

.actionBtn {
  width: 38px;
  height: 38px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  background: white;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.actionBtn:hover {
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-primary, #1e293b);
}

.publishBtn:hover {
  background: #d1fae5;
  color: #065f46;
  border-color: #10b981;
}

.archiveBtn:hover {
  background: #fef3c7;
  color: #92400e;
  border-color: #f59e0b;
}

.deleteBtn:hover {
  background: #fee2e2;
  color: #991b1b;
  border-color: #ef4444;
}

/* Modal */
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.columnsModal {
  max-width: 900px;
}

.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.modalHeader h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.closeBtn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.closeBtn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.modalBody {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.formGroup {
  margin-bottom: 20px;
}

.formGroup label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary, #1e293b);
}

.formGroup input,
.formGroup textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.formGroup input:focus,
.formGroup textarea:focus {
  outline: none;
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

.formGroup textarea {
  resize: vertical;
  min-height: 80px;
}

.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-secondary, #f8fafc);
}

.cancelBtn,
.saveBtn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cancelBtn {
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-secondary, #64748b);
}

.cancelBtn:hover:not(:disabled) {
  background: var(--bg-secondary, #f1f5f9);
}

.saveBtn {
  background: var(--primary-color, #4361ee);
  border: none;
  color: white;
}

.saveBtn:hover:not(:disabled) {
  background: var(--primary-dark, #3651d4);
}

.saveBtn:disabled,
.cancelBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Columns Modal Layout */
.columnsLayout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.columnsPanel {
  display: flex;
  flex-direction: column;
}

.columnsPanel h3 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.columnsList2 {
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
}

.columnItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  cursor: pointer;
  transition: all 0.2s;
}

.columnItem:last-child {
  border-bottom: none;
}

.columnItem:hover {
  background: var(--bg-secondary, #f8fafc);
}

.columnItem.selected {
  background: #e0e7ff;
}

.columnCheck i {
  font-size: 1.1rem;
  color: var(--primary-color, #4361ee);
}

.columnDetails {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.columnLabel {
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  font-size: 0.9rem;
}

.columnKey {
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
  font-family: monospace;
}

.typeBadge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.typeBadge.text {
  background: #dbeafe;
  color: #1e40af;
}

.typeBadge.number {
  background: #dcfce7;
  color: #166534;
}

.typeBadge.date {
  background: #fef3c7;
  color: #92400e;
}

.typeBadge.boolean {
  background: #f3e8ff;
  color: #7c3aed;
}

.typeBadge.select {
  background: #ffe4e6;
  color: #be123c;
}

.noColumns {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9rem;
}

.orderedColumnItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  background: white;
}

.orderedColumnItem:last-child {
  border-bottom: none;
}

.orderNum {
  width: 24px;
  height: 24px;
  background: var(--primary-color, #4361ee);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
}

.orderButtons {
  display: flex;
  gap: 4px;
}

.orderButtons button {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  background: white;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.orderButtons button:hover:not(:disabled) {
  background: var(--bg-secondary, #f1f5f9);
  color: var(--primary-color, #4361ee);
}

.orderButtons button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Wide Modal */
.wideModal {
  max-width: 800px;
}

/* ==================== CREATE MODAL NEW DESIGN ==================== */
.createModal {
  max-width: 700px;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
}

.createModalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: none;
}

.createModalHeader h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
}

.createCloseBtn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.createCloseBtn:hover {
  background: #f1f5f9;
  color: #1a1a1a;
}

.createModalTabs {
  display: flex;
  padding: 0;
  gap: 0;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 12px;
  margin: 0 28px 24px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.createModalTab {
  flex: 1;
  padding: 14px 24px;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 0;
  text-align: center;
}

.createModalTab:first-child {
  border-radius: 0 12px 12px 0;
}

.createModalTab:last-child {
  border-radius: 12px 0 0 12px;
}

.createModalTab:hover {
  color: #1a1a1a;
}

.activeModalTab {
  background: #A17D23;
  color: white !important;
}

.createModalBody {
  padding: 0 28px 24px;
  max-height: 60vh;
  overflow-y: auto;
}

/* Details Tab */
.detailsTab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.createFormGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.createFormGroup label {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  text-align: right;
}

.createInput,
.createTextarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  font-family: 'Cairo', sans-serif;
  color: #1a1a1a;
  background: white;
  transition: all 0.2s;
  text-align: right;
}

.createInput::placeholder,
.createTextarea::placeholder {
  color: #94a3b8;
}

.createInput:focus,
.createTextarea:focus {
  outline: none;
  border-color: #A17D23;
  box-shadow: 0 0 0 3px rgba(161, 125, 35, 0.1);
}

.createTextarea {
  resize: vertical;
  min-height: 120px;
}

/* Columns Tab */
.columnsTab {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
}

.addColumnBtnNew {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #A17D23;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Cairo', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  width: fit-content;
}

.addColumnBtnNew:hover:not(:disabled) {
  background: #8a6a1e;
}

.addColumnBtnNew:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.noColumnsNew {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
  color: #64748b;
  font-size: 14px;
}

.columnCards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.columnCard {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s;
  cursor: grab;
}

.columnCard:active {
  cursor: grabbing;
}

.columnCardDragOver {
  border-color: #A17D23;
  background: #fef9ec;
  transform: scale(1.01);
  box-shadow: 0 4px 12px rgba(161, 125, 35, 0.2);
}

.columnCardHeader {
  display: flex;
  
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.columnCardLeft {
  display: flex;
  align-items: center;
  gap: 12px;
}

.columnDeleteBtn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.columnDeleteBtn:hover {
  transform: scale(1.1);
}

.columnOrderBtnsNew {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.columnOrderBtnsNew button {
  width: 24px;
  height: 18px;
  border: none;
  background: transparent;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.columnOrderBtnsNew button:hover:not(:disabled) {
  color: #1a1a1a;
}

.columnOrderBtnsNew button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.columnCardRight {
  display: flex;
  align-items: center;
  gap: 12px;
}

.columnNumberBadge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #A17D23;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.columnDragHandle {
  color: #9CA3AF;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.columnDragHandle:active {
  cursor: grabbing;
}

.columnCardBody {
  padding: 0 20px 20px;
}

.columnFieldLabel {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 10px;
  text-align: right;
}

.columnFieldsRow {
  display: flex;
  gap: 12px;
}

.columnTypeSelect {
  width: 160px;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-family: 'Cairo', sans-serif;
  color: #64748b;
  background: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 16px center;
  padding-left: 40px;
}

.columnTypeSelect:focus {
  outline: none;
  border-color: #A17D23;
}

.columnNameInput {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-family: 'Cairo', sans-serif;
  color: #1a1a1a;
  background: white;
  text-align: right;
}

.columnNameInput::placeholder {
  color: #94a3b8;
}

.columnNameInput:focus {
  outline: none;
  border-color: #A17D23;
}

/* Options Section New */
.optionsSectionNew {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.optionsSectionNew label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  display: block;
  margin-bottom: 8px;
  text-align: right;
}

.optionsListNew {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.optionTagNew {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #fef9ec;
  border: 1px solid #A17D23;
  border-radius: 8px;
  font-size: 13px;
  color: #A17D23;
}

.optionTagNew button {
  background: none;
  border: none;
  color: #A17D23;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}

.optionTagNew button:hover {
  color: #8a6a1e;
}

.addOptionRowNew {
  display: flex;
  gap: 8px;
}

.addOptionRowNew input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-family: 'Cairo', sans-serif;
  text-align: right;
}

.addOptionRowNew input:focus {
  outline: none;
  border-color: #A17D23;
}

.addOptionRowNew button {
  width: 40px;
  height: 40px;
  border: none;
  background: #A17D23;
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.addOptionRowNew button:hover:not(:disabled) {
  background: #8a6a1e;
}

.addOptionRowNew button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal Footer New */
.createModalFooter {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  padding: 20px 28px;
  border-top: 1px solid #f1f5f9;
  background: white;
}

.createCancelBtn {
  padding: 12px 32px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Cairo', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
}

.createCancelBtn:hover {
  background: #f1f5f9;
  color: #1a1a1a;
}

.createSubmitBtn {
  padding: 12px 32px;
  border: none;
  border-radius: 10px;
  background: #475569;
  color: white;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Cairo', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
}

.nextStepBtn {
  padding: 12px 32px;
  border: none;
  border-radius: 10px;
  background: #A17D23;
  color: white;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Cairo', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
}

.nextStepBtn:hover:not(:disabled) {
  background: #8a6a1e;
}

.nextStepBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.disabledTab {
  opacity: 0.5;
  cursor: not-allowed !important;
}

.createSubmitBtn:hover:not(:disabled) {
  background: #334155;
}

.createSubmitBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Columns Section (Inline creation) */
.columnsSection {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.columnsSectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.columnsSectionHeader h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  display: flex;
  align-items: center;
  gap: 8px;
}

.columnsSectionHeader h3 i {
  color: var(--primary-color, #4361ee);
}

.addColumnBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--primary-color, #4361ee);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.addColumnBtn:hover:not(:disabled) {
  background: var(--primary-dark, #3651d4);
}

.addColumnBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.noColumnsMsg {
  padding: 24px;
  text-align: center;
  background: var(--bg-secondary, #f8fafc);
  border: 2px dashed var(--border-color, #e2e8f0);
  border-radius: 10px;
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.columnFormList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.columnFormItem {
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  overflow: hidden;
  background: white;
}

.columnFormHeader {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-secondary, #f8fafc);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.columnNumber {
  width: 26px;
  height: 26px;
  background: var(--primary-color, #4361ee);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
}

.columnOrderBtns {
  display: flex;
  gap: 4px;
  margin-right: auto;
}

.columnOrderBtns button {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  background: white;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.columnOrderBtns button:hover:not(:disabled) {
  background: var(--bg-secondary, #f1f5f9);
  color: var(--primary-color, #4361ee);
}

.columnOrderBtns button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.removeColumnBtn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  background: white;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.removeColumnBtn:hover:not(:disabled) {
  background: #fee2e2;
  color: #ef4444;
  border-color: #ef4444;
}

.removeColumnBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.columnFormBody {
  padding: 14px;
}

.columnFormRow {
  display: grid;
  grid-template-columns: 1fr 150px;
  gap: 12px;
}

.columnFormField label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--text-primary, #1e293b);
}

.columnFormField input,
.columnFormField select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.columnFormField input:focus,
.columnFormField select:focus {
  outline: none;
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

/* Options Section for select type */
.optionsSection {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color, #e2e8f0);
}

.optionsSection > label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--text-primary, #1e293b);
}

.optionsList {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 32px;
  margin-bottom: 8px;
}

.optionTag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 16px;
  font-size: 0.85rem;
}

.optionTag button {
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.optionTag button:hover {
  color: #ef4444;
}

.addOptionRow {
  display: flex;
  gap: 8px;
}

.addOptionRow input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.9rem;
}

.addOptionRow input:focus {
  outline: none;
  border-color: var(--primary-color, #4361ee);
}

.addOptionRow button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: var(--primary-color, #4361ee);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.addOptionRow button:hover:not(:disabled) {
  background: var(--primary-dark, #3651d4);
}

.addOptionRow button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
  }
  
  .headerActions {
    width: 100%;
  }
  
  .addBtn, .secondaryBtn {
    flex: 1;
    justify-content: center;
  }
  
  .columnsLayout {
    grid-template-columns: 1fr;
  }
  
  .titleCard {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .titleActions {
    width: 100%;
    justify-content: flex-end;
  }
}

/* ============================================================================
   IMPORT MODAL STYLES
   ============================================================================ */

.importModal {
  max-width: 600px;
}

.hiddenInput {
  display: none;
}

.importUploadSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.importIcon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.importIcon i {
  font-size: 2.5rem;
  color: #10b981;
}

.importUploadSection h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-color, #1e293b);
  margin: 0 0 12px 0;
}

.importDesc {
  color: var(--text-secondary, #64748b);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 24px;
}

.importDesc small {
  font-size: 0.85rem;
  opacity: 0.8;
}

.uploadBtn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.uploadBtn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.uploadBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.importHint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 10px 16px;
  background: #f8fafc;
  border-radius: 8px;
  color: var(--text-secondary, #64748b);
  font-size: 0.85rem;
}

.importHint i {
  color: var(--primary-color, #4361ee);
}

/* Preview Section */
.importPreviewSection {
  padding: 20px;
}

.importSuccessIcon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.importSuccessIcon i {
  font-size: 1.75rem;
  color: #10b981;
}

.importPreviewSection h3 {
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: #10b981;
  margin: 0 0 20px 0;
}

.importColumnsList {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  margin: 20px 0;
}

.importColumnsList h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  margin: 0 0 12px 0;
}

.importColumnsGrid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 250px;
  overflow-y: auto;
}

.importColumnItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: white;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.importColumnNum {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary-color, #4361ee);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.importColumnLabel {
  flex: 1;
  font-weight: 500;
  color: var(--text-color, #1e293b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.importActions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.importActions .uploadBtn {
  background: linear-gradient(135deg, #64748b, #475569);
  box-shadow: none;
  padding: 12px 20px;
}

.importActions .uploadBtn:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3);
}

/* Night mode for import modal */
:global(.night) .importIcon {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
}

:global(.night) .importUploadSection h3,
:global(.night) .importPreviewSection h3 {
  color: #34d399;
}

:global(.night) .importDesc {
  color: #94a3b8;
}

:global(.night) .importHint {
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
}

:global(.night) .importColumnsList {
  background: rgba(255, 255, 255, 0.05);
}

:global(.night) .importColumnsList h4 {
  color: #94a3b8;
}

:global(.night) .importColumnItem {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

:global(.night) .importColumnLabel {
  color: #e2e8f0;
}

:global(.night) .importSuccessIcon {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
}

/* ==================== DARK MODE FOR NEW TABLE DESIGN ==================== */
:global(.night) .container {
  background: #0f172a;
}

:global(.night) .pageTitle {
  color: #f1f5f9;
}

:global(.night) .secondaryBtn {
  background: #1e293b;
  border-color: #A17D23;
  color: #A17D23;
}

:global(.night) .secondaryBtn:hover {
  background: #2d3a4f;
}

:global(.night) .tabBtn {
  color: #94a3b8;
}

:global(.night) .tabBtn:hover {
  background: #1e293b;
}

:global(.night) .tabBtn.activeTab {
  background: #A17D23;
  color: white;
}

:global(.night) .contentCard {
  background: #1e293b;
}

:global(.night) .filterSelect,
:global(.night) .searchInput,
:global(.night) .pageSizeSelect {
  background: #0f172a;
  border-color: #334155;
  color: #e2e8f0;
}

:global(.night) .filterSelect:focus,
:global(.night) .searchInput:focus {
  border-color: #A17D23;
}

:global(.night) .searchInput::placeholder {
  color: #64748b;
}

:global(.night) .viewBtn {
  background: #0f172a;
  border-color: #334155;
  color: #64748b;
}

:global(.night) .viewBtnActive {
  color: #A17D23;
}

/* Cards Dark Mode */
:global(.night) .cardsContainer {
  background: transparent;
}

:global(.night) .titleCard {
  background: #1e293b;
  border-color: #334155;
}

:global(.night) .titleCard:hover {
  border-color: #A17D23;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:global(.night) .cardHeader {
  border-color: #334155;
}

:global(.night) .cardStatusSection {
  border-color: #334155;
}

:global(.night) .cardTitle {
  color: #f1f5f9;
}

:global(.night) .cardDescription {
  color: #94a3b8;
}

:global(.night) .cardIconBtn {
  background: #334155;
  color: #94a3b8;
}

:global(.night) .cardIconBtn:hover {
  background: #475569;
  color: #e2e8f0;
}

:global(.night) .starBtnActive {
  background: transparent;
}

:global(.night) .cardBottomRow {
  border-color: #334155;
}

:global(.night) .cardStat {
  color: #94a3b8;
}

:global(.night) .statLabel {
  color: #64748b;
}

:global(.night) .statValue {
  color: #f1f5f9;
}

:global(.night) .cardFooter {
  background: #0f172a;
  border-color: #334155;
}

:global(.night) .cardActionBtn {
  background: #1e293b;
  border-color: #334155;
  color: #94a3b8;
}

:global(.night) .cardActionBtn:hover {
  border-color: #A17D23;
  color: #A17D23;
}

:global(.night) .cardActionBtnPrimary {
  background: #A17D23;
  border-color: #A17D23;
  color: white;
}

:global(.night) .cardActionBtnDanger {
  color: #f87171;
  border-color: #7f1d1d;
}

:global(.night) .cardActionBtnDanger:hover {
  background: #450a0a;
  border-color: #f87171;
}

:global(.night) .tableHead {
  background: #0f172a;
}

:global(.night) .tableHead th {
  color: #94a3b8;
  border-color: #334155;
}

:global(.night) .tableRow:hover {
  background: #0f172a;
}

:global(.night) .tableRow td {
  border-color: #334155;
  color: #e2e8f0;
}

:global(.night) .titleName {
  color: #f1f5f9;
}

:global(.night) .titleDesc {
  color: #94a3b8;
}

:global(.night) .statusBadge.draft {
  background: #334155;
  color: #94a3b8;
}

:global(.night) .actionBtn {
  color: #94a3b8;
}

:global(.night) .actionBtn:hover {
  background: #334155;
  color: #f1f5f9;
}

:global(.night) .paginationContainer {
  border-color: #334155;
}

:global(.night) .paginationBtn {
  background: #0f172a;
  border-color: #334155;
  color: #94a3b8;
}

:global(.night) .paginationBtn:hover:not(:disabled) {
  border-color: #A17D23;
  color: #A17D23;
}

:global(.night) .paginationBtnActive {
  background: #A17D23;
  border-color: #A17D23;
  color: white;
}

:global(.night) .paginationRight {
  color: #94a3b8;
}

:global(.night) .excelIcon {
  background: #16a34a;
}

:global(.night) .sheetNameText {
  color: #f1f5f9;
}

/* ==================== DARK MODE FOR CREATE MODAL ==================== */
:global(.night) .createModal {
  background: #1e293b;
}

:global(.night) .createModalHeader h2 {
  color: #f1f5f9;
}

:global(.night) .createCloseBtn {
  background: #0f172a;
  border-color: #334155;
  color: #94a3b8;
}

:global(.night) .createCloseBtn:hover {
  background: #334155;
  color: #f1f5f9;
}

:global(.night) .createModalTabs {
  background: #0f172a;
}

:global(.night) .createModalTab {
  color: #94a3b8;
}

:global(.night) .createModalTab:hover {
  color: #f1f5f9;
}

:global(.night) .activeModalTab {
  background: #A17D23;
  color: white !important;
}

:global(.night) .createFormGroup label {
  color: #e2e8f0;
}

:global(.night) .createInput,
:global(.night) .createTextarea {
  background: #0f172a;
  border-color: #334155;
  color: #e2e8f0;
}

:global(.night) .createInput::placeholder,
:global(.night) .createTextarea::placeholder {
  color: #64748b;
}

:global(.night) .createInput:focus,
:global(.night) .createTextarea:focus {
  border-color: #A17D23;
}

:global(.night) .addColumnBtnNew {
  background: #A17D23;
}

:global(.night) .noColumnsNew {
  background: #0f172a;
  color: #94a3b8;
}

:global(.night) .columnCard {
  background: #0f172a;
  border-color: #334155;
}

:global(.night) .columnOrderBtnsNew button {
  color: #64748b;
}

:global(.night) .columnOrderBtnsNew button:hover:not(:disabled) {
  color: #f1f5f9;
}

:global(.night) .columnFieldLabel {
  color: #e2e8f0;
}

:global(.night) .columnTypeSelect {
  background: #1e293b;
  border-color: #334155;
  color: #94a3b8;
}

:global(.night) .columnNameInput {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

:global(.night) .columnNameInput::placeholder {
  color: #64748b;
}

:global(.night) .optionsSectionNew {
  border-color: #334155;
}

:global(.night) .optionsSectionNew label {
  color: #94a3b8;
}

:global(.night) .optionTagNew {
  background: rgba(161, 125, 35, 0.2);
  border-color: #A17D23;
  color: #A17D23;
}

:global(.night) .addOptionRowNew input {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

:global(.night) .createModalFooter {
  background: #1e293b;
  border-color: #334155;
}

:global(.night) .createCancelBtn {
  background: #0f172a;
  border-color: #334155;
  color: #94a3b8;
}

:global(.night) .createCancelBtn:hover {
  background: #334155;
  color: #f1f5f9;
}

:global(.night) .createSubmitBtn {
  background: #475569;
}

:global(.night) .createSubmitBtn:hover:not(:disabled) {
  background: #64748b;
}
</style>
