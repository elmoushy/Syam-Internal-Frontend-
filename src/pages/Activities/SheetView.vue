<!-- src/pages/Activities/SheetView.vue -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import Swal from 'sweetalert2'
import { useActivitySheet } from '@/composables/useActivitySheet'

const route = useRoute()
const router = useRouter()

const {
  currentSheet,
  sheetColumns,
  isLoading,
  isSaving,
  saveProgress,
  hasUnsavedChanges,
  lastError,
  loadSheet,
  updateCell,
  addRow,
  deleteRows,
  saveRows,
  clearState,
  _rows: rows
} = useActivitySheet()

// Local state
const editingCell = ref<{ row: number; col: string } | null>(null)
const editValue = ref('')
const selectedRows = ref<Set<number>>(new Set())
const errorMessage = ref('')
const successMessage = ref('')

// Get sheet ID from route
const sheetId = computed(() => Number(route.params.id))

// Load sheet data
const loadData = async () => {
  errorMessage.value = ''
  try {
    await loadSheet(sheetId.value)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.detail || 'فشل تحميل الورقة'
  }
}

// Cell editing
const startEditing = (rowNumber: number, columnKey: string) => {
  const row = rows.value.find(r => r.row_number === rowNumber)
  editingCell.value = { row: rowNumber, col: columnKey }
  editValue.value = row?.data[columnKey] || ''
}

const finishEditing = () => {
  if (editingCell.value) {
    updateCell(editingCell.value.row, editingCell.value.col, editValue.value)
  }
  editingCell.value = null
  editValue.value = ''
}

const cancelEditing = () => {
  editingCell.value = null
  editValue.value = ''
}

const handleCellKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    finishEditing()
  } else if (event.key === 'Escape') {
    cancelEditing()
  } else if (event.key === 'Tab') {
    event.preventDefault()
    finishEditing()
    // Move to next cell
    if (editingCell.value) {
      const colIndex = sheetColumns.value.findIndex((c: { key: string }) => c.key === editingCell.value!.col)
      if (colIndex < sheetColumns.value.length - 1) {
        startEditing(editingCell.value.row, sheetColumns.value[colIndex + 1].key)
      }
    }
  }
}

// Row selection
const toggleRowSelection = (rowNumber: number) => {
  if (selectedRows.value.has(rowNumber)) {
    selectedRows.value.delete(rowNumber)
  } else {
    selectedRows.value.add(rowNumber)
  }
  // Force reactivity
  selectedRows.value = new Set(selectedRows.value)
}

const selectAllRows = () => {
  if (selectedRows.value.size === rows.value.length) {
    selectedRows.value = new Set()
  } else {
    selectedRows.value = new Set(rows.value.map(r => r.row_number))
  }
}

const isAllSelected = computed(() => 
  rows.value.length > 0 && selectedRows.value.size === rows.value.length
)

// Row actions
const handleAddRow = () => {
  addRow()
  // Scroll to bottom after adding
  setTimeout(() => {
    const container = document.querySelector('[class*="tableContainer"]')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, 50)
}

const handleDeleteSelected = async () => {
  if (selectedRows.value.size === 0) return
  
  const result = await Swal.fire({
    icon: 'warning',
    title: 'تأكيد الحذف',
    text: `هل أنت متأكد من حذف ${selectedRows.value.size} صف؟`,
    showCancelButton: true,
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#d33'
  })
  
  if (!result.isConfirmed) return
  
  deleteRows(Array.from(selectedRows.value))
  selectedRows.value = new Set()
}

// Save
const handleSave = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    const result = await saveRows()
    
    if (result.failedChunks.length > 0) {
      errorMessage.value = `فشل حفظ ${result.failedChunks.length} مجموعات من الصفوف`
    } else {
      successMessage.value = `تم حفظ ${result.created + result.updated} صف بنجاح`
      setTimeout(() => { successMessage.value = '' }, 3000)
    }
  } catch (error: any) {
    errorMessage.value = error.message || 'فشل الحفظ'
  }
}

// Navigation guard for unsaved changes
onBeforeRouteLeave(async (_to, _from, next) => {
  if (hasUnsavedChanges.value) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'تغييرات غير محفوظة',
      text: 'لديك تغييرات غير محفوظة. هل تريد المغادرة؟',
      showCancelButton: true,
      confirmButtonText: 'نعم، غادر',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#d33'
    })
    
    if (result.isConfirmed) {
      next()
    } else {
      next(false)
    }
  } else {
    next()
  }
})

// Browser close/refresh warning
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// Get cell value
const getCellValue = (rowNumber: number, columnKey: string): string => {
  const row = rows.value.find(r => r.row_number === rowNumber)
  return row?.data[columnKey] || ''
}

// Format display value based on data type
const formatDisplayValue = (value: string, dataType: string): string => {
  if (!value) return ''
  
  switch (dataType) {
    case 'boolean':
      return value === 'true' || value === '1' ? 'نعم' : 'لا'
    case 'date':
      try {
        return new Date(value).toLocaleDateString('ar-EG')
      } catch {
        return value
      }
    default:
      return value
  }
}

onMounted(() => {
  loadData()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  clearState()
})
</script>

<template>
  <div :class="$style.container">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.titleSection">
        <button :class="$style.backBtn" @click="router.push('/activities/sheets')">
          <i class="fas fa-arrow-right"></i>
        </button>
        <div>
          <h1 :class="$style.title">{{ currentSheet?.name || 'جاري التحميل...' }}</h1>
          <p :class="$style.subtitle">
            <span v-if="currentSheet">
              {{ currentSheet.template_name || 'بدون قالب' }} • 
              {{ rows.length }} صف • 
              {{ sheetColumns.length }} عمود
            </span>
          </p>
        </div>
      </div>
      
      <div :class="$style.headerActions">
        <span v-if="hasUnsavedChanges" :class="$style.unsavedBadge">
          <i class="fas fa-circle"></i>
          تغييرات غير محفوظة
        </span>
        
        <button 
          :class="$style.saveBtn" 
          @click="handleSave"
          :disabled="isSaving || !hasUnsavedChanges"
        >
          <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          حفظ
        </button>
      </div>
    </div>

    <!-- Progress bar when saving -->
    <div v-if="isSaving" :class="$style.progressBar">
      <div 
        :class="$style.progressFill" 
        :style="{ width: `${(saveProgress.saved / saveProgress.total) * 100}%` }"
      ></div>
      <span>جاري الحفظ... {{ saveProgress.saved }}/{{ saveProgress.total }}</span>
    </div>

    <!-- Messages -->
    <div v-if="successMessage" :class="$style.successMsg">
      <i class="fas fa-check-circle"></i>
      {{ successMessage }}
    </div>
    <div v-if="errorMessage || lastError" :class="$style.errorMsg">
      <i class="fas fa-exclamation-circle"></i>
      {{ errorMessage || lastError }}
    </div>

    <!-- Loading -->
    <div v-if="isLoading" :class="$style.loading">
      <i class="fas fa-spinner fa-spin"></i>
      جاري تحميل البيانات...
    </div>

    <!-- Toolbar -->
    <div v-else-if="currentSheet" :class="$style.toolbar">
      <div :class="$style.toolbarLeft">
        <button :class="$style.toolBtn" @click="handleAddRow" title="إضافة صف">
          <i class="fas fa-plus"></i>
          إضافة صف
        </button>
        
        <button 
          :class="[$style.toolBtn, $style.deleteBtn]"
          @click="handleDeleteSelected"
          :disabled="selectedRows.size === 0"
          title="حذف المحدد"
        >
          <i class="fas fa-trash"></i>
          حذف ({{ selectedRows.size }})
        </button>
      </div>
      
      <div :class="$style.toolbarRight">
        <span :class="$style.rowCount">
          {{ rows.length }} صف
        </span>
      </div>
    </div>

    <!-- Table -->
    <div v-if="currentSheet && !isLoading" :class="$style.tableContainer">
      <table :class="$style.table">
        <thead>
          <tr>
            <th :class="$style.checkboxCol">
              <input 
                type="checkbox" 
                :checked="isAllSelected"
                @change="selectAllRows"
              />
            </th>
            <th :class="$style.rowNumCol">#</th>
            <th
              v-for="col in sheetColumns"
              :key="col.key"
              :class="$style.headerCell"
              :style="{ width: `${col.width}px`, minWidth: `${col.width}px` }"
            >
              <div :class="$style.headerContent">
                <span :class="$style.headerLabel">{{ col.label }}</span>
                <span v-if="col.isRequired" :class="$style.requiredMark">*</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="row in rows" 
            :key="row.row_number"
            :class="{ [$style.selectedRow]: selectedRows.has(row.row_number) }"
          >
            <td :class="$style.checkboxCol">
              <input 
                type="checkbox" 
                :checked="selectedRows.has(row.row_number)"
                @change="toggleRowSelection(row.row_number)"
              />
            </td>
            <td :class="$style.rowNumCol">{{ row.row_number }}</td>
            <td
              v-for="col in sheetColumns"
              :key="`${row.row_number}-${col.key}`"
              :class="[
                $style.dataCell,
                editingCell?.row === row.row_number && editingCell?.col === col.key && $style.editing
              ]"
              @dblclick="startEditing(row.row_number, col.key)"
            >
              <!-- Editing mode -->
              <template v-if="editingCell?.row === row.row_number && editingCell?.col === col.key">
                <input
                  v-if="col.dataType === 'text' || col.dataType === 'number'"
                  v-model="editValue"
                  :type="col.dataType === 'number' ? 'number' : 'text'"
                  :class="$style.cellInput"
                  @keydown="handleCellKeydown"
                  @blur="finishEditing"
                  autofocus
                />
                <input
                  v-else-if="col.dataType === 'date'"
                  v-model="editValue"
                  type="date"
                  :class="$style.cellInput"
                  @keydown="handleCellKeydown"
                  @blur="finishEditing"
                  autofocus
                />
                <select
                  v-else-if="col.dataType === 'boolean'"
                  v-model="editValue"
                  :class="$style.cellInput"
                  @keydown="handleCellKeydown"
                  @blur="finishEditing"
                  autofocus
                >
                  <option value="">-</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </template>
              
              <!-- Display mode -->
              <span v-else :class="$style.cellValue">
                {{ formatDisplayValue(getCellValue(row.row_number, col.key), col.dataType) }}
              </span>
            </td>
          </tr>
          
          <!-- Empty state row -->
          <tr v-if="rows.length === 0">
            <td :colspan="sheetColumns.length + 2" :class="$style.emptyRow">
              <i class="fas fa-inbox"></i>
              <p>لا توجد بيانات</p>
              <button @click="handleAddRow">
                <i class="fas fa-plus"></i>
                إضافة صف
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style module>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  direction: rtl;
  background: var(--bg-secondary, #f8fafc);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  flex-wrap: wrap;
  gap: 12px;
}

.titleSection {
  display: flex;
  align-items: center;
  gap: 16px;
}

.backBtn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: white;
  border-radius: 8px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.backBtn:hover {
  border-color: var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  margin: 0;
}

.subtitle {
  color: var(--text-secondary, #64748b);
  font-size: 0.85rem;
  margin: 4px 0 0 0;
}

.headerActions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.unsavedBadge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.unsavedBadge i {
  font-size: 0.5rem;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.saveBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--primary-color, #4361ee);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.saveBtn:hover:not(:disabled) {
  background: var(--primary-dark, #3651d4);
}

.saveBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progressBar {
  position: relative;
  height: 28px;
  background: #e2e8f0;
  overflow: hidden;
}

.progressFill {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(90deg, #4361ee, #06b6d4);
  transition: width 0.3s ease;
}

.progressBar span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 500;
  color: #1e293b;
  z-index: 1;
}

.successMsg,
.errorMsg {
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
}

.successMsg {
  background: #d1fae5;
  color: #065f46;
}

.errorMsg {
  background: #fee2e2;
  color: #991b1b;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #64748b);
  font-size: 1.1rem;
}

.loading i {
  margin-left: 10px;
  color: var(--primary-color, #4361ee);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.toolbarLeft {
  display: flex;
  gap: 8px;
}

.toolBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-secondary, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  color: var(--text-primary, #1e293b);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toolBtn:hover:not(:disabled) {
  background: white;
  border-color: var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
}

.toolBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolBtn.deleteBtn:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
}

.rowCount {
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
}

.tableContainer {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-size: 0.9rem;
}

.table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f8fafc;
}

.table th {
  padding: 12px 14px;
  text-align: right;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  border-bottom: 2px solid var(--border-color, #e2e8f0);
  white-space: nowrap;
}

.checkboxCol {
  width: 40px;
  text-align: center !important;
}

.checkboxCol input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.rowNumCol {
  width: 50px;
  text-align: center !important;
  color: var(--text-secondary, #94a3b8);
  font-weight: 500;
}

.headerCell {
  border-left: 1px solid var(--border-color, #e2e8f0);
}

.headerContent {
  display: flex;
  align-items: center;
  gap: 4px;
}

.headerLabel {
  overflow: hidden;
  text-overflow: ellipsis;
}

.requiredMark {
  color: #ef4444;
  font-size: 0.8rem;
}

.table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  vertical-align: middle;
}

.selectedRow {
  background: #eff6ff !important;
}

.selectedRow td {
  background: #eff6ff;
}

.dataCell {
  border-left: 1px solid var(--border-color, #e2e8f0);
  cursor: text;
  position: relative;
  min-height: 40px;
}

.dataCell:hover {
  background: #f8fafc;
}

.dataCell.editing {
  padding: 4px;
  background: white;
}

.cellInput {
  width: 100%;
  padding: 8px 10px;
  border: 2px solid var(--primary-color, #4361ee);
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  outline: none;
}

.cellValue {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.emptyRow {
  text-align: center !important;
  padding: 60px 20px !important;
  color: var(--text-secondary, #94a3b8);
}

.emptyRow i {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

.emptyRow p {
  margin: 0 0 16px 0;
}

.emptyRow button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--primary-color, #4361ee);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.emptyRow button:hover {
  background: var(--primary-dark, #3651d4);
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    padding: 12px 16px;
  }
  
  .toolbar {
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .toolbarLeft {
    flex-wrap: wrap;
  }
}
</style>
