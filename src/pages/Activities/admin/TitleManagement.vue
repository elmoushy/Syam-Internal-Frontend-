<!-- src/pages/Activities/admin/TitleManagement.vue -->
<!-- Admin page to manage Titles (Templates) with columns and validations -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
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
    errorMessage.value = 'يجب أن يكون العنوان منشوراً لتعيينه كنشط'
    setTimeout(() => { errorMessage.value = '' }, 3000)
    return
  }
  
  const result = await Swal.fire({
    icon: 'question',
    title: 'تأكيد التعيين',
    text: `هل أنت متأكد من تعيين "${title.name}" كعنوان نشط؟ سيتم إلغاء تنشيط أي عنوان آخر.`,
    showCancelButton: true,
    confirmButtonText: 'نعم، عين',
    cancelButtonText: 'إلغاء'
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  try {
    await titleService.setActiveTitle(title.id)
    successMessage.value = `تم تعيين "${title.name}" كعنوان نشط`
    await loadTitles()
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'فشل في تعيين العنوان كنشط'
    setTimeout(() => { errorMessage.value = '' }, 3000)
  }
}

// Deactivate title
const deactivateTitle = async (title: TemplateListItem) => {
  const result = await Swal.fire({
    icon: 'question',
    title: 'تأكيد إلغاء التنشيط',
    text: `هل أنت متأكد من إلغاء تنشيط "${title.name}"؟`,
    showCancelButton: true,
    confirmButtonText: 'نعم، ألغ التنشيط',
    cancelButtonText: 'إلغاء'
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

// Open create modal
const openCreateModal = () => {
  titleForm.value = { name: '', description: '', columns: [] }
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
    errorMessage.value = 'لا يمكن نشر عنوان بدون أعمدة'
    setTimeout(() => { errorMessage.value = '' }, 3000)
    return
  }
  
  const result = await Swal.fire({
    icon: 'question',
    title: 'تأكيد النشر',
    text: `هل أنت متأكد من نشر "${title.name}"؟ لن تتمكن من تعديل الأعمدة بعد النشر.`,
    showCancelButton: true,
    confirmButtonText: 'نعم، انشر',
    cancelButtonText: 'إلغاء'
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  try {
    await templateService.publish(title.id)
    successMessage.value = 'تم نشر العنوان بنجاح'
    await loadTitles()
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'فشل في نشر العنوان'
    setTimeout(() => { errorMessage.value = '' }, 3000)
  }
}

// Archive title
const archiveTitle = async (title: TemplateListItem) => {
  const result = await Swal.fire({
    icon: 'question',
    title: 'تأكيد الأرشفة',
    text: `هل أنت متأكد من أرشفة "${title.name}"؟`,
    showCancelButton: true,
    confirmButtonText: 'نعم، أرشف',
    cancelButtonText: 'إلغاء'
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  try {
    await templateService.archive(title.id)
    successMessage.value = 'تم أرشفة العنوان بنجاح'
    await loadTitles()
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'فشل في أرشفة العنوان'
    setTimeout(() => { errorMessage.value = '' }, 3000)
  }
}

// Delete title
const deleteTitle = async (title: TemplateListItem) => {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'تأكيد الحذف',
    text: `هل أنت متأكد من حذف "${title.name}"؟`,
    showCancelButton: true,
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#d33'
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  try {
    await templateService.delete(title.id)
    successMessage.value = 'تم حذف العنوان بنجاح'
    await loadTitles()
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'فشل في حذف العنوان'
    setTimeout(() => { errorMessage.value = '' }, 3000)
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
      <div :class="$style.titleSection">
        <h1 :class="$style.title">
          <i class="fas fa-layer-group"></i>
          إدارة العناوين
        </h1>
        <p :class="$style.subtitle">
          إنشاء وإدارة العناوين وأعمدتها للمستخدمين
        </p>
      </div>
      <div :class="$style.headerActions">
        <button v-if="activeTab === 'titles'" :class="$style.secondaryBtn" @click="openImportModal">
          <i class="fas fa-file-import"></i>
          استيراد من Excel
        </button>
        <button v-if="activeTab === 'titles'" :class="$style.addBtn" @click="openCreateModal">
          <i class="fas fa-plus"></i>
          إنشاء عنوان جديد
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div :class="$style.tabs">
      <button 
        :class="[$style.tabBtn, activeTab === 'titles' && $style.activeTab]"
        @click="switchTab('titles')"
      >
        <i class="fas fa-layer-group"></i>
        العناوين
      </button>
      <button 
        :class="[$style.tabBtn, activeTab === 'submitted' && $style.activeTab]"
        @click="switchTab('submitted')"
      >
        <i class="fas fa-paper-plane"></i>
        الجداول المقدمة
      </button>
    </div>

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
      <!-- Filters -->
      <div :class="$style.filters">
        <div :class="$style.searchBox">
          <i class="fas fa-search"></i>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="بحث في العناوين..."
          />
        </div>
        <select v-model="statusFilter" :class="$style.statusSelect">
          <option value="all">جميع الحالات</option>
          <option value="draft">المسودات</option>
          <option value="published">المنشورة</option>
          <option value="archived">المؤرشفة</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" :class="$style.loading">
        <i class="fas fa-spinner fa-spin"></i>
        جاري التحميل...
      </div>

      <!-- Titles List -->
      <div v-else :class="$style.titlesList">
        <div v-if="filteredTitles.length === 0" :class="$style.emptyState">
          <i class="fas fa-folder-open"></i>
          <p>لا توجد عناوين</p>
          <button :class="$style.addBtnEmpty" @click="openCreateModal">
            <i class="fas fa-plus"></i>
            إنشاء عنوان جديد
          </button>
        </div>
        
        <div
          v-for="title in filteredTitles"
          :key="title.id"
          :class="[$style.titleCard, $style[getStatusClass(title.status)], (title as any).is_active_title && $style.activeTitle]"
        >
          <div :class="$style.titleInfo">
            <div :class="$style.titleHeader">
              <h3 :class="$style.titleName">{{ title.name }}</h3>
              <span :class="[$style.statusBadge, $style[getStatusClass(title.status)]]">
                {{ getStatusLabel(title.status) }}
              </span>
              <span v-if="(title as any).is_active_title" :class="$style.activeBadge">
                <i class="fas fa-star"></i>
                نشط
              </span>
            </div>
            <p v-if="title.description" :class="$style.titleDesc">{{ title.description }}</p>
            <div :class="$style.titleMeta">
              <span :class="$style.metaItem">
                <i class="fas fa-columns"></i>
                {{ title.column_count }} عمود
              </span>
              <span v-if="title.sheet_count" :class="$style.metaItem">
                <i class="fas fa-users"></i>
                {{ title.sheet_count }} مستخدم
              </span>
            </div>
          </div>
          
          <div :class="$style.titleActions">
            <!-- Set Active button (published only) -->
            <button 
              v-if="title.status === 'published' && !(title as any).is_active_title"
              :class="[$style.actionBtn, $style.activeBtn]"
              @click="setActiveTitle(title)"
              title="تعيين كنشط"
            >
              <i class="fas fa-star"></i>
            </button>
            
            <!-- Deactivate button (active only) -->
            <button 
              v-if="(title as any).is_active_title"
              :class="[$style.actionBtn, $style.deactivateBtn]"
              @click="deactivateTitle(title)"
              title="إلغاء التنشيط"
            >
              <i class="far fa-star"></i>
            </button>
            
            <!-- Edit button (draft only) -->
            <button 
              v-if="title.status === 'draft'"
              :class="$style.actionBtn"
              @click="openEditModal(title)"
              title="تعديل"
            >
              <i class="fas fa-edit"></i>
            </button>
            
            <!-- Columns button (draft only) -->
            <button 
              v-if="title.status === 'draft'"
              :class="$style.actionBtn"
              @click="openColumnsModal(title)"
              title="إدارة الأعمدة"
            >
              <i class="fas fa-th-list"></i>
            </button>
            
            <!-- Publish button (draft only) -->
            <button 
              v-if="title.status === 'draft'"
              :class="[$style.actionBtn, $style.publishBtn]"
              @click="publishTitle(title)"
              title="نشر"
            >
              <i class="fas fa-globe"></i>
            </button>
            
            <!-- Archive button (published only) -->
            <button 
              v-if="title.status === 'published'"
              :class="[$style.actionBtn, $style.archiveBtn]"
              @click="archiveTitle(title)"
              title="أرشفة"
            >
              <i class="fas fa-archive"></i>
            </button>
            
            <!-- Delete button -->
            <button 
              :class="[$style.actionBtn, $style.deleteBtn]"
              @click="deleteTitle(title)"
              title="حذف"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== SUBMITTED SHEETS TAB ===== -->
    <template v-if="activeTab === 'submitted'">
      <!-- Filters for Submitted -->
      <div :class="$style.filters">
        <div :class="$style.searchBox">
          <i class="fas fa-search"></i>
          <input 
            v-model="submittedSearch"
            type="text" 
            placeholder="بحث بالاسم أو المستخدم..."
            @keyup.enter="loadSubmittedSheets(1)"
          />
        </div>
        <select v-model="submittedTitleFilter" :class="$style.statusSelect" @change="loadSubmittedSheets(1)">
          <option :value="null">جميع العناوين</option>
          <option v-for="t in publishedTitles" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <button :class="$style.searchBtn" @click="loadSubmittedSheets(1)">
          <i class="fas fa-search"></i>
          بحث
        </button>
      </div>

      <!-- Loading -->
      <div v-if="submittedLoading" :class="$style.loading">
        <i class="fas fa-spinner fa-spin"></i>
        جاري التحميل...
      </div>

      <!-- Submitted Sheets List -->
      <div v-else :class="$style.submittedList">
        <div v-if="submittedSheets.length === 0" :class="$style.emptyState">
          <i class="fas fa-inbox"></i>
          <p>لا توجد جداول مقدمة</p>
        </div>
        
        <div :class="$style.submittedTable" v-else>
          <table>
            <thead>
              <tr>
                <th>اسم الجدول</th>
                <th>العنوان</th>
                <th>المستخدم</th>
                <th>عدد الصفوف</th>
                <th>تاريخ التقديم</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="sheet in submittedSheets" 
                :key="sheet.id"
                :class="$style.clickableRow"
                @click="viewSubmittedSheet(sheet)"
              >
                <td>
                  <div :class="$style.sheetName">
                    <i class="fas fa-file-excel"></i>
                    {{ sheet.name }}
                  </div>
                  <div v-if="sheet.description" :class="$style.sheetDesc">{{ sheet.description }}</div>
                </td>
                <td>{{ sheet.template_name }}</td>
                <td>
                  <div :class="$style.userName">{{ sheet.owner_name }}</div>
                  <div :class="$style.userUsername">@{{ sheet.owner_username }}</div>
                </td>
                <td>{{ sheet.row_count }}</td>
                <td>
                  <div :class="$style.viewSheetAction">
                    {{ formatDate(sheet.submitted_at) }}
                    <i class="fas fa-external-link-alt" :class="$style.viewIcon"></i>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="submittedPagination.total_pages > 1" :class="$style.pagination">
          <button 
            :disabled="!submittedPagination.has_prev"
            @click="loadSubmittedSheets(submittedPagination.page - 1)"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
          <span :class="$style.pageInfo">
            صفحة {{ submittedPagination.page }} من {{ submittedPagination.total_pages }}
            ({{ submittedPagination.total_count }} جدول)
          </span>
          <button 
            :disabled="!submittedPagination.has_next"
            @click="loadSubmittedSheets(submittedPagination.page + 1)"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
        </div>
      </div>
    </template>

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
        <div :class="[$style.modal, $style.wideModal]">
          <div :class="$style.modalHeader">
            <h2>إنشاء عنوان جديد</h2>
            <button :class="$style.closeBtn" @click="closeModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div :class="$style.modalBody">
            <div v-if="errorMessage" :class="$style.errorMsg">
              <i class="fas fa-exclamation-circle"></i>
              {{ errorMessage }}
            </div>
            
            <div :class="$style.formGroup">
              <label>اسم العنوان *</label>
              <input 
                v-model="titleForm.name" 
                type="text" 
                placeholder="أدخل اسم العنوان"
                :disabled="isSaving"
              />
            </div>
            
            <div :class="$style.formGroup">
              <label>الوصف</label>
              <textarea 
                v-model="titleForm.description" 
                placeholder="وصف اختياري للعنوان"
                :disabled="isSaving"
                rows="2"
              ></textarea>
            </div>
            
            <!-- Columns Section -->
            <div :class="$style.columnsSection">
              <div :class="$style.columnsSectionHeader">
                <h3><i class="fas fa-columns"></i> الأعمدة</h3>
                <button 
                  type="button" 
                  :class="$style.addColumnBtn" 
                  @click="addColumn('form')"
                  :disabled="isSaving"
                >
                  <i class="fas fa-plus"></i>
                  إضافة عمود
                </button>
              </div>
              
              <div v-if="titleForm.columns.length === 0" :class="$style.noColumnsMsg">
                <i class="fas fa-info-circle"></i>
                لم يتم إضافة أعمدة بعد. يمكنك إضافة الأعمدة الآن أو لاحقاً.
              </div>
              
              <div v-else :class="$style.columnFormList">
                <div 
                  v-for="(column, index) in titleForm.columns" 
                  :key="index" 
                  :class="$style.columnFormItem"
                >
                  <div :class="$style.columnFormHeader">
                    <span :class="$style.columnNumber">{{ index + 1 }}</span>
                    <div :class="$style.columnOrderBtns">
                      <button 
                        type="button"
                        @click="moveColumnUp(index, 'form')" 
                        :disabled="index === 0 || isSaving"
                        title="تحريك لأعلى"
                      >
                        <i class="fas fa-chevron-up"></i>
                      </button>
                      <button 
                        type="button"
                        @click="moveColumnDown(index, 'form')" 
                        :disabled="index === titleForm.columns.length - 1 || isSaving"
                        title="تحريك لأسفل"
                      >
                        <i class="fas fa-chevron-down"></i>
                      </button>
                    </div>
                    <button 
                      type="button"
                      :class="$style.removeColumnBtn" 
                      @click="removeColumn(index, 'form')"
                      :disabled="isSaving"
                      title="حذف العمود"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                  
                  <div :class="$style.columnFormBody">
                    <div :class="$style.columnFormRow">
                      <div :class="$style.columnFormField">
                        <label>اسم العمود *</label>
                        <input 
                          v-model="column.label" 
                          type="text" 
                          placeholder="مثال: اسم الموظف"
                          :disabled="isSaving"
                        />
                      </div>
                      <div :class="$style.columnFormField">
                        <label>نوع البيانات</label>
                        <select v-model="column.data_type" :disabled="isSaving">
                          <option value="text">{{ dataTypeLabels.text }}</option>
                          <option value="number">{{ dataTypeLabels.number }}</option>
                          <option value="date">{{ dataTypeLabels.date }}</option>
                          <option value="boolean">{{ dataTypeLabels.boolean }}</option>
                          <option value="select">{{ dataTypeLabels.select }}</option>
                        </select>
                      </div>
                    </div>
                    
                    <!-- Options for select type -->
                    <div v-if="column.data_type === 'select'" :class="$style.optionsSection">
                      <label>الخيارات *</label>
                      <div :class="$style.optionsList">
                        <span 
                          v-for="(opt, optIndex) in column.options" 
                          :key="optIndex" 
                          :class="$style.optionTag"
                        >
                          {{ opt }}
                          <button 
                            type="button"
                            @click="removeOption(column, optIndex)"
                            :disabled="isSaving"
                          >
                            <i class="fas fa-times"></i>
                          </button>
                        </span>
                      </div>
                      <div :class="$style.addOptionRow">
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
                          <i class="fas fa-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div :class="$style.modalFooter">
            <button :class="$style.cancelBtn" @click="closeModal" :disabled="isSaving">
              إلغاء
            </button>
            <button :class="$style.saveBtn" @click="createTitle" :disabled="isSaving">
              <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
              <span>{{ isSaving ? 'جاري الحفظ...' : 'إنشاء' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" :class="$style.modalOverlay" @click.self="closeModal">
        <div :class="$style.modal">
          <div :class="$style.modalHeader">
            <h2>تعديل العنوان</h2>
            <button :class="$style.closeBtn" @click="closeModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div :class="$style.modalBody">
            <div v-if="errorMessage" :class="$style.errorMsg">
              <i class="fas fa-exclamation-circle"></i>
              {{ errorMessage }}
            </div>
            
            <div :class="$style.formGroup">
              <label>اسم العنوان *</label>
              <input 
                v-model="titleForm.name" 
                type="text" 
                :disabled="isSaving"
              />
            </div>
            
            <div :class="$style.formGroup">
              <label>الوصف</label>
              <textarea 
                v-model="titleForm.description" 
                :disabled="isSaving"
                rows="3"
              ></textarea>
            </div>
          </div>
          <div :class="$style.modalFooter">
            <button :class="$style.cancelBtn" @click="closeModal" :disabled="isSaving">
              إلغاء
            </button>
            <button :class="$style.saveBtn" @click="updateTitle" :disabled="isSaving">
              <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
              <span>{{ isSaving ? 'جاري الحفظ...' : 'حفظ' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Columns Modal -->
    <Teleport to="body">
      <div v-if="showColumnsModal" :class="$style.modalOverlay" @click.self="closeModal">
        <div :class="[$style.modal, $style.wideModal]">
          <div :class="$style.modalHeader">
            <h2>إدارة أعمدة "{{ selectedTitleForColumns?.name }}"</h2>
            <button :class="$style.closeBtn" @click="closeModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div :class="$style.modalBody">
            <div v-if="errorMessage" :class="$style.errorMsg">
              <i class="fas fa-exclamation-circle"></i>
              {{ errorMessage }}
            </div>
            
            <!-- Inline Column Creation -->
            <div :class="$style.columnsSection">
              <div :class="$style.columnsSectionHeader">
                <h3><i class="fas fa-columns"></i> الأعمدة</h3>
                <button 
                  type="button" 
                  :class="$style.addColumnBtn" 
                  @click="addColumn('modal')"
                  :disabled="isSaving"
                >
                  <i class="fas fa-plus"></i>
                  إضافة عمود
                </button>
              </div>
              
              <div v-if="columnsForm.length === 0" :class="$style.noColumnsMsg">
                <i class="fas fa-info-circle"></i>
                لم يتم إضافة أعمدة بعد.
              </div>
              
              <div v-else :class="$style.columnFormList">
                <div 
                  v-for="(column, index) in columnsForm" 
                  :key="index" 
                  :class="$style.columnFormItem"
                >
                  <div :class="$style.columnFormHeader">
                    <span :class="$style.columnNumber">{{ index + 1 }}</span>
                    <div :class="$style.columnOrderBtns">
                      <button 
                        type="button"
                        @click="moveColumnUp(index, 'modal')" 
                        :disabled="index === 0 || isSaving"
                        title="تحريك لأعلى"
                      >
                        <i class="fas fa-chevron-up"></i>
                      </button>
                      <button 
                        type="button"
                        @click="moveColumnDown(index, 'modal')" 
                        :disabled="index === columnsForm.length - 1 || isSaving"
                        title="تحريك لأسفل"
                      >
                        <i class="fas fa-chevron-down"></i>
                      </button>
                    </div>
                    <button 
                      type="button"
                      :class="$style.removeColumnBtn" 
                      @click="removeColumn(index, 'modal')"
                      :disabled="isSaving"
                      title="حذف العمود"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                  
                  <div :class="$style.columnFormBody">
                    <div :class="$style.columnFormRow">
                      <div :class="$style.columnFormField">
                        <label>اسم العمود *</label>
                        <input 
                          v-model="column.label" 
                          type="text" 
                          placeholder="مثال: اسم الموظف"
                          :disabled="isSaving"
                        />
                      </div>
                      <div :class="$style.columnFormField">
                        <label>نوع البيانات</label>
                        <select v-model="column.data_type" :disabled="isSaving">
                          <option value="text">{{ dataTypeLabels.text }}</option>
                          <option value="number">{{ dataTypeLabels.number }}</option>
                          <option value="date">{{ dataTypeLabels.date }}</option>
                          <option value="boolean">{{ dataTypeLabels.boolean }}</option>
                          <option value="select">{{ dataTypeLabels.select }}</option>
                        </select>
                      </div>
                    </div>
                    
                    <!-- Options for select type -->
                    <div v-if="column.data_type === 'select'" :class="$style.optionsSection">
                      <label>الخيارات *</label>
                      <div :class="$style.optionsList">
                        <span 
                          v-for="(opt, optIndex) in column.options" 
                          :key="optIndex" 
                          :class="$style.optionTag"
                        >
                          {{ opt }}
                          <button 
                            type="button"
                            @click="removeOption(column, optIndex)"
                            :disabled="isSaving"
                          >
                            <i class="fas fa-times"></i>
                          </button>
                        </span>
                      </div>
                      <div :class="$style.addOptionRow">
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
                          <i class="fas fa-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div :class="$style.modalFooter">
            <button :class="$style.cancelBtn" @click="closeModal" :disabled="isSaving">
              إلغاء
            </button>
            <button :class="$style.saveBtn" @click="saveColumns" :disabled="isSaving">
              <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
              <span>{{ isSaving ? 'جاري الحفظ...' : 'حفظ الأعمدة' }}</span>
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
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.titleSection {
  flex: 1;
}

.title {
  margin: 0 0 8px 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #1e293b);
  display: flex;
  align-items: center;
  gap: 12px;
}

.title i {
  color: var(--primary-color, #4361ee);
}

.subtitle {
  margin: 0;
  color: var(--text-secondary, #64748b);
  font-size: 0.95rem;
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
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  color: var(--text-primary, #1e293b);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.secondaryBtn:hover {
  border-color: var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
}

.addBtn {
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

.addBtn:hover {
  background: var(--primary-dark, #3651d4);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid var(--border-color, #e2e8f0);
  padding-bottom: 0;
}

.tabBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary, #64748b);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tabBtn:hover {
  color: var(--primary-color, #4361ee);
}

.tabBtn.activeTab {
  color: var(--primary-color, #4361ee);
  border-bottom-color: var(--primary-color, #4361ee);
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
</style>
