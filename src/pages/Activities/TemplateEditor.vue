<!-- src/pages/Activities/TemplateEditor.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { useActivitySheet } from '@/composables/useActivitySheet'
import { templateService } from '@/services/activityService'
import type { ColumnDefinition, Template } from '@/types/activity.types'

const route = useRoute()
const router = useRouter()
const { columns, loadColumns } = useActivitySheet()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const template = ref<Template | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

const isNew = computed(() => !route.params.id || route.params.id === 'new')
const canEdit = computed(() => isNew.value || template.value?.status === 'draft')

// Form
const form = ref({
  name: '',
  description: ''
})

// Selected columns (by ID, in order)
const selectedColumnIds = ref<number[]>([])

// Available columns (not selected)
const availableColumns = computed(() => {
  return columns.value
    .filter(c => c.is_active && !selectedColumnIds.value.includes(c.id))
    .sort((a, b) => a.order - b.order)
})

// Selected columns (with full data)
const selectedColumns = computed(() => {
  return selectedColumnIds.value
    .map(id => columns.value.find(c => c.id === id))
    .filter(Boolean) as ColumnDefinition[]
})

// Data type helpers
const getDataTypeLabel = (type: string) => {
  switch (type) {
    case 'text': return 'نص'
    case 'number': return 'رقم'
    case 'date': return 'تاريخ'
    case 'boolean': return 'نعم/لا'
    case 'select': return 'قائمة'
    default: return type
  }
}

const getDataTypeClass = (type: string) => {
  return `dataType${type.charAt(0).toUpperCase() + type.slice(1)}`
}

// Load template for editing
const loadTemplate = async () => {
  if (isNew.value) return
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const id = Number(route.params.id)
    template.value = await templateService.getById(id)
    
    form.value.name = template.value.name
    form.value.description = template.value.description
    
    // Load selected columns from template
    selectedColumnIds.value = template.value.template_columns
      .sort((a, b) => a.order - b.order)
      .map(tc => tc.column_definition.id)
      
  } catch (error: any) {
    console.error('Failed to load template:', error)
    errorMessage.value = error.response?.data?.detail || 'فشل تحميل القالب'
    setTimeout(() => router.push('/activities/templates'), 2000)
  } finally {
    isLoading.value = false
  }
}

// Add column to selection
const addColumn = (column: { id: number }) => {
  if (!canEdit.value) return
  selectedColumnIds.value.push(column.id)
}

// Remove column from selection
const removeColumn = (index: number) => {
  if (!canEdit.value) return
  selectedColumnIds.value.splice(index, 1)
}

// Move column up
const moveUp = (index: number) => {
  if (!canEdit.value || index === 0) return
  const ids = [...selectedColumnIds.value]
  ;[ids[index], ids[index - 1]] = [ids[index - 1], ids[index]]
  selectedColumnIds.value = ids
}

// Move column down
const moveDown = (index: number) => {
  if (!canEdit.value || index >= selectedColumnIds.value.length - 1) return
  const ids = [...selectedColumnIds.value]
  ;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
  selectedColumnIds.value = ids
}

// Drag and drop for selected columns
const draggedIndex = ref<number | null>(null)

const onDragStart = (event: DragEvent, index: number) => {
  if (!canEdit.value) return
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

const onDrop = (event: DragEvent, targetIndex: number) => {
  event.preventDefault()
  if (!canEdit.value || draggedIndex.value === null || draggedIndex.value === targetIndex) {
    draggedIndex.value = null
    return
  }
  
  const ids = [...selectedColumnIds.value]
  const item = ids.splice(draggedIndex.value, 1)[0]
  ids.splice(targetIndex, 0, item)
  selectedColumnIds.value = ids
  draggedIndex.value = null
}

const onDragEnd = () => {
  draggedIndex.value = null
}

// Save template
const saveTemplate = async (publish = false) => {
  errorMessage.value = ''
  successMessage.value = ''
  
  if (!form.value.name.trim()) {
    errorMessage.value = 'الرجاء إدخال اسم القالب'
    return
  }
  
  if (selectedColumnIds.value.length === 0) {
    errorMessage.value = 'الرجاء اختيار عمود واحد على الأقل'
    return
  }
  
  isSaving.value = true
  
  try {
    const columnConfigs = selectedColumnIds.value.map((id) => {
      const col = columns.value.find(c => c.id === id)
      if (!col) throw new Error(`Column ${id} not found`)
      return {
        label: col.label,
        data_type: col.data_type,
        options: col.options ? [...col.options] : []
      }
    })
    
    let savedTemplate: Template
    
    if (isNew.value) {
      savedTemplate = await templateService.create({
        name: form.value.name,
        description: form.value.description,
        columns: columnConfigs
      })
      
      successMessage.value = 'تم إنشاء القالب بنجاح'
      
    } else {
      // Update name/description first
      savedTemplate = await templateService.update(template.value!.id, {
        name: form.value.name,
        description: form.value.description
      })
      // Then update columns separately using updateColumns (inline format)
      await templateService.updateColumns(template.value!.id, columnConfigs)
      
      successMessage.value = 'تم تحديث القالب بنجاح'
    }
    
    template.value = savedTemplate
    
    // Publish if requested
    if (publish && savedTemplate.status === 'draft') {
      await templateService.publish(savedTemplate.id)
      successMessage.value = 'تم نشر القالب بنجاح'
    }
    
    // Navigate after short delay
    setTimeout(() => {
      router.push('/activities/templates')
    }, 1500)
    
  } catch (error: any) {
    console.error('Failed to save template:', error)
    errorMessage.value = error.response?.data?.detail || 
      error.response?.data?.name?.[0] ||
      'فشل حفظ القالب'
  } finally {
    isSaving.value = false
  }
}

// Cancel and go back
const handleCancel = async () => {
  if (form.value.name || selectedColumnIds.value.length > 0) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'تأكيد الإلغاء',
      text: 'هل أنت متأكد من الإلغاء؟ سيتم فقدان التغييرات غير المحفوظة.',
      showCancelButton: true,
      confirmButtonText: 'نعم، ألغ',
      cancelButtonText: 'لا',
      confirmButtonColor: '#d33'
    })
    
    if (!result.isConfirmed) {
      return
    }
  }
  router.push('/activities/templates')
}

onMounted(async () => {
  await loadColumns()
  await loadTemplate()
})
</script>

<template>
  <div :class="$style.container">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.titleSection">
        <button :class="$style.backBtn" @click="handleCancel">
          <i class="fas fa-arrow-right"></i>
        </button>
        <div>
          <h1 :class="$style.title">
            {{ isNew ? 'إنشاء قالب جديد' : 'تعديل القالب' }}
          </h1>
          <p :class="$style.subtitle">
            {{ isNew ? 'حدد الأعمدة التي سيحتويها القالب' : `تعديل "${template?.name}"` }}
          </p>
        </div>
      </div>
      
      <div v-if="!canEdit" :class="$style.readOnlyBadge">
        <i class="fas fa-lock"></i>
        للقراءة فقط - القالب منشور
      </div>
    </div>

    <!-- Messages -->
    <div v-if="successMessage" :class="$style.successMsg">
      <i class="fas fa-check-circle"></i>
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" :class="$style.errorMsg">
      <i class="fas fa-exclamation-circle"></i>
      {{ errorMessage }}
    </div>

    <!-- Loading -->
    <div v-if="isLoading" :class="$style.loading">
      <i class="fas fa-spinner fa-spin"></i>
      جاري التحميل...
    </div>

    <template v-else>
      <!-- Form Section -->
      <div :class="$style.formSection">
        <div :class="$style.formGrid">
          <div :class="$style.formGroup">
            <label>اسم القالب <span class="required">*</span></label>
            <input 
              v-model="form.name" 
              type="text" 
              placeholder="مثال: تقرير الأنشطة الشهري"
              :disabled="!canEdit"
            />
          </div>
          
          <div :class="$style.formGroup">
            <label>الوصف</label>
            <input 
              v-model="form.description" 
              type="text" 
              placeholder="وصف مختصر للقالب (اختياري)"
              :disabled="!canEdit"
            />
          </div>
        </div>
      </div>

      <!-- Columns Selection -->
      <div :class="$style.columnsSection">
        <!-- Available Columns -->
        <div :class="$style.columnsPanel">
          <div :class="$style.panelHeader">
            <h3>
              <i class="fas fa-list"></i>
              الأعمدة المتاحة
            </h3>
            <span :class="$style.count">{{ availableColumns.length }}</span>
          </div>
          
          <div v-if="availableColumns.length === 0" :class="$style.emptyPanel">
            <i class="fas fa-check-circle"></i>
            <p>تم اختيار جميع الأعمدة</p>
          </div>
          
          <div v-else :class="$style.columnsList">
            <div
              v-for="column in availableColumns"
              :key="column.id"
              :class="[$style.columnItem, !canEdit && $style.disabled]"
              @click="addColumn(column)"
            >
              <div :class="$style.columnInfo">
                <span :class="$style.columnLabel">{{ column.label }}</span>
                <span :class="$style.columnKey">{{ column.key }}</span>
              </div>
              <div :class="$style.columnMeta">
                <span :class="[$style.dataTypeBadge, $style[getDataTypeClass(column.data_type)]]">
                  {{ getDataTypeLabel(column.data_type) }}
                </span>
                <span v-if="column.is_system" :class="$style.systemBadge">
                  <i class="fas fa-lock"></i>
                </span>
              </div>
              <button v-if="canEdit" :class="$style.addBtn" title="إضافة">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Arrow -->
        <div :class="$style.arrow">
          <i class="fas fa-arrow-left"></i>
        </div>

        <!-- Selected Columns -->
        <div :class="$style.columnsPanel">
          <div :class="$style.panelHeader">
            <h3>
              <i class="fas fa-check-double"></i>
              الأعمدة المختارة
            </h3>
            <span :class="$style.count">{{ selectedColumns.length }}</span>
          </div>
          
          <div v-if="selectedColumns.length === 0" :class="$style.emptyPanel">
            <i class="fas fa-hand-pointer"></i>
            <p>اختر الأعمدة من القائمة</p>
          </div>
          
          <div v-else :class="$style.selectedList">
            <div
              v-for="(column, index) in selectedColumns"
              :key="column.id"
              :class="[
                $style.selectedItem,
                draggedIndex === index && $style.dragging,
                !canEdit && $style.disabled
              ]"
              :draggable="canEdit"
              @dragstart="onDragStart($event, index)"
              @dragover="onDragOver"
              @drop="onDrop($event, index)"
              @dragend="onDragEnd"
            >
              <div v-if="canEdit" :class="$style.dragHandle">
                <i class="fas fa-grip-vertical"></i>
              </div>
              
              <span :class="$style.orderNumber">{{ index + 1 }}</span>
              
              <div :class="$style.columnInfo">
                <span :class="$style.columnLabel">{{ column.label }}</span>
                <span :class="$style.columnKey">{{ column.key }}</span>
              </div>
              
              <div :class="$style.columnMeta">
                <span :class="[$style.dataTypeBadge, $style[getDataTypeClass(column.data_type)]]">
                  {{ getDataTypeLabel(column.data_type) }}
                </span>
              </div>
              
              <div v-if="canEdit" :class="$style.selectedActions">
                <button 
                  :class="$style.moveBtn" 
                  :disabled="index === 0"
                  @click="moveUp(index)"
                  title="تحريك لأعلى"
                >
                  <i class="fas fa-chevron-up"></i>
                </button>
                <button 
                  :class="$style.moveBtn" 
                  :disabled="index >= selectedColumns.length - 1"
                  @click="moveDown(index)"
                  title="تحريك لأسفل"
                >
                  <i class="fas fa-chevron-down"></i>
                </button>
                <button 
                  :class="$style.removeBtn"
                  @click="removeColumn(index)"
                  title="إزالة"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div :class="$style.actions">
        <button :class="$style.cancelBtn" @click="handleCancel" :disabled="isSaving">
          إلغاء
        </button>
        
        <div :class="$style.saveActions">
          <button 
            v-if="canEdit"
            :class="$style.saveDraftBtn" 
            @click="saveTemplate(false)"
            :disabled="isSaving || !form.name.trim() || selectedColumnIds.length === 0"
          >
            <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-save"></i>
            {{ isNew ? 'حفظ كمسودة' : 'حفظ التغييرات' }}
          </button>
          
          <button 
            v-if="canEdit && (isNew || template?.status === 'draft')"
            :class="$style.publishBtn"
            @click="saveTemplate(true)"
            :disabled="isSaving || !form.name.trim() || selectedColumnIds.length === 0"
          >
            <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-check-circle"></i>
            حفظ ونشر
          </button>
        </div>
      </div>
    </template>
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
  gap: 16px;
  flex-wrap: wrap;
}

.titleSection {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.backBtn {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: white;
  border-radius: 10px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.backBtn:hover {
  border-color: var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #1a1a2e);
  margin: 0 0 4px 0;
}

.subtitle {
  color: var(--text-secondary, #64748b);
  margin: 0;
  font-size: 0.9rem;
}

.readOnlyBadge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
}

.successMsg,
.errorMsg {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
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

.formSection {
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.formGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
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

.formGroup input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.formGroup input:focus {
  outline: none;
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

.formGroup input:disabled {
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-secondary, #64748b);
  cursor: not-allowed;
}

.columnsSection {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.columnsPanel {
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.panelHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-secondary, #f8fafc);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.panelHeader h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panelHeader h3 i {
  color: var(--primary-color, #4361ee);
}

.count {
  background: var(--primary-color, #4361ee);
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.emptyPanel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #94a3b8);
  padding: 40px;
  text-align: center;
}

.emptyPanel i {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

.emptyPanel p {
  margin: 0;
  font-size: 0.95rem;
}

.columnsList,
.selectedList {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.columnItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.columnItem:hover:not(.disabled) {
  border-color: var(--primary-color, #4361ee);
  background: white;
}

.columnItem.disabled {
  cursor: default;
  opacity: 0.7;
}

.selectedItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.selectedItem:hover:not(.disabled) {
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 2px 8px rgba(67, 97, 238, 0.1);
}

.selectedItem.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.selectedItem.disabled {
  background: var(--bg-secondary, #f8fafc);
}

.dragHandle {
  cursor: grab;
  color: var(--text-secondary, #94a3b8);
  padding: 4px;
}

.dragHandle:active {
  cursor: grabbing;
}

.orderNumber {
  width: 24px;
  height: 24px;
  background: var(--primary-color, #4361ee);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.columnInfo {
  flex: 1;
  min-width: 0;
}

.columnLabel {
  display: block;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  font-size: 0.95rem;
  margin-bottom: 2px;
}

.columnKey {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.columnMeta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dataTypeBadge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.dataTypeText {
  background: #e0e7ff;
  color: #3730a3;
}

.dataTypeNumber {
  background: #fef3c7;
  color: #92400e;
}

.dataTypeDate {
  background: #d1fae5;
  color: #065f46;
}

.dataTypeBoolean {
  background: #fce7f3;
  color: #9d174d;
}

.dataTypeSelect {
  background: #e0f2fe;
  color: #0369a1;
}

.systemBadge {
  color: var(--text-secondary, #94a3b8);
  font-size: 0.75rem;
}

.addBtn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: var(--primary-color, #4361ee);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
  opacity: 0;
}

.columnItem:hover .addBtn {
  opacity: 1;
}

.addBtn:hover {
  background: var(--primary-dark, #3651d4);
}

.selectedActions {
  display: flex;
  gap: 4px;
}

.moveBtn,
.removeBtn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 4px;
  background: white;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 0.75rem;
}

.moveBtn:hover:not(:disabled) {
  border-color: var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
}

.moveBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.removeBtn:hover {
  border-color: #ef4444;
  background: #fee2e2;
  color: #ef4444;
}

.arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #94a3b8);
  font-size: 1.5rem;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
}

.saveActions {
  display: flex;
  gap: 12px;
}

.cancelBtn,
.saveDraftBtn,
.publishBtn {
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

.saveDraftBtn {
  background: white;
  border: 1px solid var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
}

.saveDraftBtn:hover:not(:disabled) {
  background: rgba(67, 97, 238, 0.05);
}

.publishBtn {
  background: #10b981;
  border: none;
  color: white;
}

.publishBtn:hover:not(:disabled) {
  background: #059669;
}

.saveDraftBtn:disabled,
.publishBtn:disabled,
.cancelBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 1024px) {
  .columnsSection {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .arrow {
    display: none;
  }
  
  .columnsPanel {
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
  
  .formGrid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
    gap: 16px;
  }
  
  .saveActions {
    width: 100%;
    flex-direction: column;
  }
  
  .cancelBtn,
  .saveDraftBtn,
  .publishBtn {
    width: 100%;
    justify-content: center;
  }
}
</style>
