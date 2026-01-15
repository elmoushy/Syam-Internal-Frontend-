<!-- src/pages/Activities/admin/ColumnManagement.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Swal from 'sweetalert2'
import { columnService } from '@/services/activityService'
import type { ColumnDefinition, ColumnDefinitionCreate, DataType } from '@/types/activity.types'
import ValidationRulesModal from './ValidationRulesModal.vue'

// State
const columns = ref<ColumnDefinition[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const showAddModal = ref(false)
const showValidationModal = ref(false)
const editingColumn = ref<ColumnDefinition | null>(null)
const selectedColumnForValidation = ref<ColumnDefinition | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

// Form state
const form = ref<ColumnDefinitionCreate>({
  key: '',
  label: '',
  data_type: 'text',
  default_width: 120,
  min_width: 80,
  options: []
})

// Options textarea value
const optionsText = ref('')

const dataTypes: { value: DataType; label: string }[] = [
  { value: 'text', label: 'نص' },
  { value: 'number', label: 'رقم' },
  { value: 'date', label: 'تاريخ' },
  { value: 'boolean', label: 'نعم/لا' },
  { value: 'select', label: 'قائمة منسدلة' }
]

// Filter state
const searchQuery = ref('')
const showInactive = ref(false)

// Filtered columns
const filteredColumns = computed(() => {
  let result = columns.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c => 
      c.key.toLowerCase().includes(query) || 
      c.label.toLowerCase().includes(query)
    )
  }
  
  return result
})

// Load columns
const loadColumns = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    columns.value = await columnService.getAll({ show_inactive: showInactive.value })
  } catch (error: any) {
    console.error('Failed to load columns:', error)
    errorMessage.value = error.response?.data?.detail || 'فشل في تحميل الأعمدة'
  } finally {
    isLoading.value = false
  }
}

// Open add modal
const openAddModal = () => {
  editingColumn.value = null
  form.value = {
    key: '',
    label: '',
    data_type: 'text',
    default_width: 120,
    min_width: 80,
    options: []
  }
  optionsText.value = ''
  showAddModal.value = true
}

// Open edit modal
const openEditModal = (column: ColumnDefinition) => {
  editingColumn.value = column
  form.value = {
    key: column.key,
    label: column.label,
    data_type: column.data_type,
    default_width: column.default_width,
    min_width: column.min_width,
    options: column.options || []
  }
  optionsText.value = (column.options || []).join('\n')
  showAddModal.value = true
}

// Close modal
const closeModal = () => {
  showAddModal.value = false
  editingColumn.value = null
  errorMessage.value = ''
}

// Save column
const saveColumn = async () => {
  errorMessage.value = ''
  
  // Parse options from textarea
  if (form.value.data_type === 'select') {
    form.value.options = optionsText.value.split('\n').filter(o => o.trim())
    if (form.value.options.length === 0) {
      errorMessage.value = 'يجب إضافة خيار واحد على الأقل للقائمة المنسدلة'
      return
    }
  }
  
  // Validate key format (for new columns)
  if (!editingColumn.value && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(form.value.key)) {
    errorMessage.value = 'المفتاح يجب أن يبدأ بحرف ويحتوي على أحرف وأرقام وشرطات سفلية فقط'
    return
  }
  
  isSaving.value = true
  try {
    if (editingColumn.value) {
      // Update - exclude key from update payload
      const { key, ...updateData } = form.value
      await columnService.update(editingColumn.value.id, updateData)
      successMessage.value = 'تم تحديث العمود بنجاح'
    } else {
      await columnService.create(form.value)
      successMessage.value = 'تم إنشاء العمود بنجاح'
    }
    closeModal()
    await loadColumns()
    
    // Clear success message after 3 seconds
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error: any) {
    console.error('Failed to save column:', error)
    errorMessage.value = error.response?.data?.detail || 
      error.response?.data?.key?.[0] ||
      'فشل في حفظ العمود'
  } finally {
    isSaving.value = false
  }
}

// Delete column
const deleteColumn = async (column: ColumnDefinition) => {
  if (column.is_system) {
    errorMessage.value = 'لا يمكن حذف الأعمدة الأساسية'
    setTimeout(() => { errorMessage.value = '' }, 3000)
    return
  }
  
  if (!column.can_delete) {
    await Swal.fire({
      title: 'غير مسموح',
      text: 'لا يمكن حذف العمود لأنه مستخدم في قوالب',
      icon: 'error',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً'
    })
    return
  }
  
  const result = await Swal.fire({
    title: 'تأكيد الحذف',
    text: `هل أنت متأكد من حذف العمود "${column.label}"؟`,
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
    await columnService.delete(column.id)
    await Swal.fire({
      title: 'تم الحذف!',
      text: 'تم حذف العمود بنجاح',
      icon: 'success',
      confirmButtonColor: '#A17D23',
      confirmButtonText: 'حسناً',
      timer: 2000,
      timerProgressBar: true
    })
    await loadColumns()
  } catch (error: any) {
    console.error('Failed to delete column:', error)
    errorMessage.value = error.response?.data?.error || 'فشل في حذف العمود'
    setTimeout(() => { errorMessage.value = '' }, 3000)
  }
}

// Open validation modal
const openValidationModal = (column: ColumnDefinition) => {
  selectedColumnForValidation.value = column
  showValidationModal.value = true
}

// Close validation modal
const closeValidationModal = () => {
  showValidationModal.value = false
  selectedColumnForValidation.value = null
}

// Handle validation update
const onValidationUpdated = async () => {
  await loadColumns()
}

// Drag and drop reorder
const draggedIndex = ref<number | null>(null)

const onDragStart = (event: DragEvent, index: number) => {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const onDrop = async (event: DragEvent, targetIndex: number) => {
  event.preventDefault()
  
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    draggedIndex.value = null
    return
  }
  
  // Reorder locally
  const items = [...columns.value]
  const item = items.splice(draggedIndex.value, 1)[0]
  items.splice(targetIndex, 0, item)
  columns.value = items
  
  // Save order to server
  try {
    const orderedIds = items.map(c => c.id)
    await columnService.reorder(orderedIds)
  } catch (error) {
    console.error('Failed to save order:', error)
    // Reload on error
    await loadColumns()
  }
  
  draggedIndex.value = null
}

const onDragEnd = () => {
  draggedIndex.value = null
}

// Get data type label
const getDataTypeLabel = (type: DataType): string => {
  return dataTypes.find(dt => dt.value === type)?.label || type
}

onMounted(loadColumns)
</script>

<template>
  <div :class="$style.container">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.titleSection">
        <h1 :class="$style.title">
          <i class="fas fa-columns"></i>
          إدارة الأعمدة
        </h1>
        <p :class="$style.subtitle">
          إدارة تعريفات الأعمدة وقواعد التحقق للأنشطة
        </p>
      </div>
      <button :class="$style.addBtn" @click="openAddModal">
        <i class="fas fa-plus"></i>
        إضافة عمود جديد
      </button>
    </div>

    <!-- Messages -->
    <div v-if="successMessage" :class="$style.successMsg">
      <i class="fas fa-check-circle"></i>
      {{ successMessage }}
    </div>
    <div v-if="errorMessage && !showAddModal" :class="$style.errorMsg">
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
          placeholder="بحث بالمفتاح أو التسمية..."
        />
      </div>
      <label :class="$style.checkbox">
        <input type="checkbox" v-model="showInactive" @change="loadColumns" />
        <span>عرض المحذوفة</span>
      </label>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" :class="$style.loading">
      <i class="fas fa-spinner fa-spin"></i>
      جاري التحميل...
    </div>

    <!-- Columns List -->
    <div v-else :class="$style.columnsList">
      <div v-if="filteredColumns.length === 0" :class="$style.emptyState">
        <i class="fas fa-inbox"></i>
        <p>لا توجد أعمدة</p>
      </div>
      
      <div
        v-for="(column, index) in filteredColumns"
        :key="column.id"
        :class="[
          $style.columnCard, 
          column.is_system && $style.systemColumn,
          !column.is_active && $style.inactiveColumn,
          draggedIndex === index && $style.dragging
        ]"
        draggable="true"
        @dragstart="onDragStart($event, index)"
        @dragover="onDragOver"
        @drop="onDrop($event, index)"
        @dragend="onDragEnd"
      >
        <div :class="$style.dragHandle">
          <i class="fas fa-grip-vertical"></i>
        </div>
        
        <div :class="$style.columnInfo">
          <div :class="$style.columnHeader">
            <span :class="$style.columnKey">{{ column.key }}</span>
            <span :class="$style.columnLabel">{{ column.label }}</span>
          </div>
          <div :class="$style.columnMeta">
            <span :class="[$style.badge, $style[column.data_type]]">
              {{ getDataTypeLabel(column.data_type) }}
            </span>
            <span v-if="column.is_system" :class="$style.systemBadge">
              <i class="fas fa-lock"></i> أساسي
            </span>
            <span v-if="!column.is_active" :class="$style.inactiveBadge">
              <i class="fas fa-eye-slash"></i> محذوف
            </span>
            <span :class="$style.validationCount" :title="`${column.validations.length} قواعد تحقق`">
              <i class="fas fa-check-double"></i> {{ column.validations.length }}
            </span>
            <span v-if="column.usage_count > 0" :class="$style.usageCount" :title="`مستخدم في ${column.usage_count} قوالب`">
              <i class="fas fa-link"></i> {{ column.usage_count }}
            </span>
          </div>
        </div>

        <div :class="$style.columnActions">
          <button
            :class="$style.actionBtn"
            title="قواعد التحقق"
            @click="openValidationModal(column)"
          >
            <i class="fas fa-check-circle"></i>
          </button>
          <button
            :class="$style.actionBtn"
            title="تعديل"
            @click="openEditModal(column)"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            v-if="!column.is_system && column.can_delete"
            :class="[$style.actionBtn, $style.deleteBtn]"
            title="حذف"
            @click="deleteColumn(column)"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" :class="$style.modalOverlay" @click.self="closeModal">
        <div :class="$style.modal">
          <div :class="$style.modalHeader">
            <h2>{{ editingColumn ? 'تعديل عمود' : 'إضافة عمود جديد' }}</h2>
            <button :class="$style.closeBtn" @click="closeModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div :class="$style.modalBody">
            <!-- Error in modal -->
            <div v-if="errorMessage" :class="$style.modalError">
              <i class="fas fa-exclamation-triangle"></i>
              {{ errorMessage }}
            </div>
            
            <div :class="$style.formGroup">
              <label>المفتاح (Key) <span class="required">*</span></label>
              <input
                v-model="form.key"
                type="text"
                :disabled="!!editingColumn"
                placeholder="مثال: columnName"
                :class="{ disabled: !!editingColumn }"
              />
              <span :class="$style.hint">يجب أن يكون بالإنجليزية بدون مسافات (مثال: activityType)</span>
            </div>
            
            <div :class="$style.formGroup">
              <label>التسمية <span class="required">*</span></label>
              <input
                v-model="form.label"
                type="text"
                placeholder="اسم العمود الظاهر للمستخدم"
              />
            </div>
            
            <div :class="$style.formGroup">
              <label>نوع البيانات</label>
              <select v-model="form.data_type" :disabled="editingColumn?.is_system">
                <option v-for="dt in dataTypes" :key="dt.value" :value="dt.value">
                  {{ dt.label }}
                </option>
              </select>
            </div>
            
            <div :class="$style.formRow">
              <div :class="$style.formGroup">
                <label>العرض الافتراضي (px)</label>
                <input v-model.number="form.default_width" type="number" min="50" max="500" />
              </div>
              <div :class="$style.formGroup">
                <label>الحد الأدنى للعرض (px)</label>
                <input v-model.number="form.min_width" type="number" min="30" max="300" />
              </div>
            </div>
            
            <!-- Options for select type -->
            <div v-if="form.data_type === 'select'" :class="$style.formGroup">
              <label>الخيارات <span class="required">*</span></label>
              <textarea
                v-model="optionsText"
                placeholder="خيار واحد في كل سطر"
                rows="5"
              ></textarea>
              <span :class="$style.hint">أدخل كل خيار في سطر منفصل</span>
            </div>
          </div>
          
          <div :class="$style.modalFooter">
            <button :class="$style.cancelBtn" @click="closeModal" :disabled="isSaving">
              إلغاء
            </button>
            <button :class="$style.saveBtn" @click="saveColumn" :disabled="isSaving || !form.key || !form.label">
              <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
              <span v-else>{{ editingColumn ? 'تحديث' : 'إنشاء' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Validation Modal -->
    <ValidationRulesModal
      v-if="showValidationModal && selectedColumnForValidation"
      :column="selectedColumnForValidation"
      @close="closeValidationModal"
      @updated="onValidationUpdated"
    />
  </div>
</template>

<style module>
.container {
  padding: 24px;
  max-width: 1200px;
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
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #1a1a2e);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title i {
  color: var(--primary-color, #4361ee);
}

.subtitle {
  color: var(--text-secondary, #64748b);
  margin: 0;
  font-size: 0.95rem;
}

.addBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--primary-color, #4361ee);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.addBtn:hover {
  background: var(--primary-dark, #3651d4);
  transform: translateY(-1px);
}

.successMsg,
.errorMsg {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
}

.successMsg {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.errorMsg {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.searchBox {
  position: relative;
  flex: 1;
  min-width: 250px;
  max-width: 400px;
}

.searchBox i {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #64748b);
}

.searchBox input {
  width: 100%;
  padding: 10px 40px 10px 14px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.95rem;
  background: var(--bg-secondary, #f8fafc);
  transition: all 0.2s;
}

.searchBox input:focus {
  outline: none;
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
}

.checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary, #64748b);
  font-size: 1.1rem;
}

.loading i {
  margin-left: 10px;
  color: var(--primary-color, #4361ee);
}

.columnsList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.emptyState {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary, #64748b);
}

.emptyState i {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.columnCard {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  transition: all 0.2s;
}

.columnCard:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--primary-color, #4361ee);
}

.systemColumn {
  background: linear-gradient(to left, #f0f9ff, white);
  border-color: #bae6fd;
}

.inactiveColumn {
  opacity: 0.6;
  background: #f8fafc;
}

.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.dragHandle {
  cursor: grab;
  color: var(--text-secondary, #94a3b8);
  padding: 8px;
  font-size: 1.1rem;
}

.dragHandle:active {
  cursor: grabbing;
}

.columnInfo {
  flex: 1;
  min-width: 0;
}

.columnHeader {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.columnKey {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9rem;
  color: var(--primary-color, #4361ee);
  background: var(--bg-secondary, #f1f5f9);
  padding: 4px 10px;
  border-radius: 4px;
}

.columnLabel {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.columnMeta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.badge.text {
  background: #e0e7ff;
  color: #3730a3;
}

.badge.number {
  background: #fef3c7;
  color: #92400e;
}

.badge.date {
  background: #d1fae5;
  color: #065f46;
}

.badge.boolean {
  background: #fce7f3;
  color: #9d174d;
}

.badge.select {
  background: #e0f2fe;
  color: #0369a1;
}

.systemBadge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.inactiveBadge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.validationCount,
.usageCount {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-secondary, #64748b);
  border-radius: 20px;
  font-size: 0.8rem;
}

.columnActions {
  display: flex;
  gap: 8px;
}

.actionBtn {
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

.actionBtn:hover {
  background: var(--primary-color, #4361ee);
  color: white;
}

.deleteBtn:hover {
  background: #ef4444;
}

/* Modal Styles */
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
  max-width: 520px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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

.modalError {
  padding: 12px 16px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
}

.formGroup {
  margin-bottom: 20px;
}

.formGroup label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
}

.formGroup label .required {
  color: #ef4444;
}

.formGroup input,
.formGroup select,
.formGroup textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
  background: white;
}

.formGroup input:focus,
.formGroup select:focus,
.formGroup textarea:focus {
  outline: none;
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

.formGroup input.disabled,
.formGroup input:disabled {
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-secondary, #64748b);
  cursor: not-allowed;
}

.formGroup textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

.hint {
  display: block;
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
  padding: 12px 24px;
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

/* Responsive */
@media (max-width: 640px) {
  .container {
    padding: 16px;
  }
  
  .header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .addBtn {
    justify-content: center;
  }
  
  .columnCard {
    flex-wrap: wrap;
  }
  
  .formRow {
    grid-template-columns: 1fr;
  }
  
  .modal {
    max-height: 100vh;
    border-radius: 0;
  }
}
</style>
