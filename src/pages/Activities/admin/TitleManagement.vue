<!-- src/pages/Activities/admin/TitleManagement.vue -->
<!-- Admin page to manage Titles (Templates) with columns and validations -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { templateService } from '@/services/activityService'
import type { 
  TemplateListItem, 
  Template 
} from '@/types/activity.types'

// Column definition interface for inline creation
interface InlineColumn {
  id?: number  // Only for existing columns
  label: string
  data_type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  options: string[]
  optionsInput?: string  // Temp input for adding options
}

// State
const titles = ref<TemplateListItem[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showColumnsModal = ref(false)
const editingTitle = ref<Template | null>(null)

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
  
  if (!confirm(`هل أنت متأكد من نشر "${title.name}"؟ لن تتمكن من تعديل الأعمدة بعد النشر.`)) {
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
  if (!confirm(`هل أنت متأكد من أرشفة "${title.name}"؟`)) {
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
  if (!confirm(`هل أنت متأكد من حذف "${title.name}"؟`)) {
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

onMounted(() => {
  loadTitles()
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
        <button :class="$style.addBtn" @click="openCreateModal">
          <i class="fas fa-plus"></i>
          إنشاء عنوان جديد
        </button>
      </div>
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
        :class="[$style.titleCard, $style[getStatusClass(title.status)]]"
      >
        <div :class="$style.titleInfo">
          <div :class="$style.titleHeader">
            <h3 :class="$style.titleName">{{ title.name }}</h3>
            <span :class="[$style.statusBadge, $style[getStatusClass(title.status)]]">
              {{ getStatusLabel(title.status) }}
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
</style>
