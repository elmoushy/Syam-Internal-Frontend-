<!-- src/pages/Activities/admin/ValidationRulesModal.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Swal from 'sweetalert2'
import { columnService } from '@/services/activityService'
import type { ColumnDefinition, ValidationRule, ValidationRuleType, ValidationRuleCreate } from '@/types/activity.types'

const props = defineProps<{
  column: ColumnDefinition
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

// State
const validations = ref<ValidationRule[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const showAddForm = ref(false)
const editingValidation = ref<ValidationRule | null>(null)
const errorMessage = ref('')

// Validation rule types based on column data type
const availableRuleTypes = computed<{ value: ValidationRuleType; label: string; description: string }[]>(() => {
  const baseRules: { value: ValidationRuleType; label: string; description: string }[] = [
    { value: 'required', label: 'مطلوب', description: 'القيمة مطلوبة ولا يمكن تركها فارغة' }
  ]
  
  switch (props.column.data_type) {
    case 'text':
      return [
        ...baseRules,
        { value: 'min_length', label: 'الحد الأدنى للطول', description: 'أقل عدد من الحروف المسموح' },
        { value: 'max_length', label: 'الحد الأقصى للطول', description: 'أكبر عدد من الحروف المسموح' },
        { value: 'regex', label: 'نمط منتظم (Regex)', description: 'تعبير منتظم للتحقق من التنسيق' }
      ]
    case 'number':
      return [
        ...baseRules,
        { value: 'min_value', label: 'الحد الأدنى للقيمة', description: 'أقل قيمة رقمية مسموحة' },
        { value: 'max_value', label: 'الحد الأقصى للقيمة', description: 'أكبر قيمة رقمية مسموحة' }
      ]
    case 'date':
      return [
        ...baseRules,
        { value: 'date_range', label: 'نطاق التاريخ', description: 'نطاق التواريخ المسموح' }
      ]
    default:
      return baseRules
  }
})

// Check if rule type needs value input
const needsValueInput = (ruleType: ValidationRuleType): boolean => {
  return ['min_length', 'max_length', 'min_value', 'max_value', 'regex', 'date_range'].includes(ruleType)
}

// Get value input label
const getValueLabel = (ruleType: ValidationRuleType): string => {
  switch (ruleType) {
    case 'min_length':
    case 'max_length':
      return 'عدد الحروف'
    case 'min_value':
    case 'max_value':
      return 'القيمة'
    case 'regex':
      return 'النمط (Regex)'
    case 'date_range':
      return 'النطاق (JSON)'
    default:
      return 'القيمة'
  }
}

// Get value input type
const getValueInputType = (ruleType: ValidationRuleType): string => {
  switch (ruleType) {
    case 'min_length':
    case 'max_length':
    case 'min_value':
    case 'max_value':
      return 'number'
    default:
      return 'text'
  }
}

// Form state
const form = ref<ValidationRuleCreate>({
  rule_type: 'required',
  rule_value: '',
  error_message: ''
})

// Load validations
const loadValidations = async () => {
  isLoading.value = true
  try {
    validations.value = await columnService.getValidations(props.column.id)
  } catch (error) {
    console.error('Failed to load validations:', error)
    errorMessage.value = 'فشل في تحميل قواعد التحقق'
  } finally {
    isLoading.value = false
  }
}

// Open add form
const openAddForm = () => {
  editingValidation.value = null
  form.value = {
    rule_type: 'required',
    rule_value: '',
    error_message: ''
  }
  showAddForm.value = true
}

// Open edit form
const openEditForm = (validation: ValidationRule) => {
  editingValidation.value = validation
  form.value = {
    rule_type: validation.rule_type,
    rule_value: validation.rule_value || '',
    error_message: validation.error_message
  }
  showAddForm.value = true
}

// Cancel form
const cancelForm = () => {
  showAddForm.value = false
  editingValidation.value = null
  errorMessage.value = ''
}

// Save validation
const saveValidation = async () => {
  errorMessage.value = ''
  
  // Validate value if needed
  if (needsValueInput(form.value.rule_type) && !form.value.rule_value) {
    errorMessage.value = 'القيمة مطلوبة لهذا النوع من القواعد'
    return
  }
  
  isSaving.value = true
  try {
    const payload: ValidationRuleCreate = {
      rule_type: form.value.rule_type,
      rule_value: needsValueInput(form.value.rule_type) ? form.value.rule_value : '',
      error_message: form.value.error_message
    }
    
    if (editingValidation.value) {
      await columnService.updateValidation(editingValidation.value.id, payload)
    } else {
      await columnService.addValidation(props.column.id, payload)
    }
    
    cancelForm()
    await loadValidations()
    emit('updated')
  } catch (error: any) {
    console.error('Failed to save validation:', error)
    errorMessage.value = error.response?.data?.detail || 
      error.response?.data?.rule_type?.[0] ||
      'فشل في حفظ قاعدة التحقق'
  } finally {
    isSaving.value = false
  }
}

// Delete validation
const deleteValidation = async (validation: ValidationRule) => {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'تأكيد الحذف',
    text: `هل أنت متأكد من حذف قاعدة "${getRuleLabel(validation.rule_type)}"؟`,
    showCancelButton: true,
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#d33'
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  try {
    await columnService.deleteValidation(validation.id)
    await loadValidations()
    emit('updated')
  } catch (error: any) {
    console.error('Failed to delete validation:', error)
    errorMessage.value = error.response?.data?.error || 'فشل في حذف قاعدة التحقق'
  }
}

// Get rule type label
const getRuleLabel = (ruleType: ValidationRuleType): string => {
  const found = availableRuleTypes.value.find(r => r.value === ruleType)
  return found?.label || ruleType
}

// Check if rule type already exists (except when editing that same rule)
const isRuleTypeUsed = (ruleType: ValidationRuleType): boolean => {
  if (editingValidation.value?.rule_type === ruleType) return false
  return validations.value.some(v => v.rule_type === ruleType)
}

onMounted(loadValidations)
</script>

<template>
  <Teleport to="body">
    <div :class="$style.overlay" @click.self="emit('close')">
      <div :class="$style.modal">
        <!-- Header -->
        <div :class="$style.header">
          <div :class="$style.headerInfo">
            <h2>قواعد التحقق</h2>
            <p>
              <span :class="$style.columnKey">{{ column.key }}</span>
              <span :class="$style.columnLabel">{{ column.label }}</span>
            </p>
          </div>
          <button :class="$style.closeBtn" @click="emit('close')">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div :class="$style.body">
          <!-- Error message -->
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
            <!-- Empty state -->
            <div v-if="validations.length === 0 && !showAddForm" :class="$style.emptyState">
              <i class="fas fa-check-double"></i>
              <p>لا توجد قواعد تحقق</p>
              <button :class="$style.addBtnEmpty" @click="openAddForm">
                <i class="fas fa-plus"></i>
                إضافة قاعدة
              </button>
            </div>

            <!-- Validations list -->
            <div v-else-if="!showAddForm" :class="$style.validationsList">
              <div
                v-for="validation in validations"
                :key="validation.id"
                :class="$style.validationCard"
              >
                <div :class="$style.validationInfo">
                  <div :class="$style.validationType">
                    <i class="fas fa-check-circle"></i>
                    {{ getRuleLabel(validation.rule_type) }}
                  </div>
                  <div v-if="validation.rule_value" :class="$style.validationValue">
                    القيمة: <code>{{ validation.rule_value }}</code>
                  </div>
                  <div :class="$style.validationMessage">
                    <i class="fas fa-comment-alt"></i>
                    {{ validation.error_message || 'رسالة افتراضية' }}
                  </div>
                </div>
                <div :class="$style.validationActions">
                  <button
                    :class="$style.editBtn"
                    title="تعديل"
                    @click="openEditForm(validation)"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    :class="$style.deleteBtn"
                    title="حذف"
                    @click="deleteValidation(validation)"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Add/Edit form -->
            <div v-if="showAddForm" :class="$style.form">
              <h3>{{ editingValidation ? 'تعديل قاعدة' : 'إضافة قاعدة جديدة' }}</h3>
              
              <div :class="$style.formGroup">
                <label>نوع القاعدة</label>
                <select 
                  v-model="form.rule_type" 
                  :disabled="!!editingValidation"
                >
                  <option 
                    v-for="rule in availableRuleTypes" 
                    :key="rule.value" 
                    :value="rule.value"
                    :disabled="isRuleTypeUsed(rule.value)"
                  >
                    {{ rule.label }}
                    {{ isRuleTypeUsed(rule.value) ? '(مستخدم)' : '' }}
                  </option>
                </select>
                <span :class="$style.hint">
                  {{ availableRuleTypes.find(r => r.value === form.rule_type)?.description }}
                </span>
              </div>

              <div v-if="needsValueInput(form.rule_type)" :class="$style.formGroup">
                <label>{{ getValueLabel(form.rule_type) }}</label>
                <input
                  v-model="form.rule_value"
                  :type="getValueInputType(form.rule_type)"
                  :placeholder="form.rule_type === 'regex' ? '^[أ-ي\\s]+$' : ''"
                />
                <span v-if="form.rule_type === 'regex'" :class="$style.hint">
                  تعبير منتظم للتحقق من القيمة
                </span>
                <span v-if="form.rule_type === 'date_range'" :class="$style.hint">
                  مثال: {"min": "2024-01-01", "max": "2025-12-31"}
                </span>
              </div>

              <div :class="$style.formGroup">
                <label>رسالة الخطأ (اختياري)</label>
                <input
                  v-model="form.error_message"
                  type="text"
                  placeholder="الرسالة التي تظهر عند عدم تحقق القاعدة"
                />
                <span :class="$style.hint">
                  اترك فارغاً لاستخدام الرسالة الافتراضية
                </span>
              </div>

              <div :class="$style.formActions">
                <button :class="$style.cancelFormBtn" @click="cancelForm" :disabled="isSaving">
                  إلغاء
                </button>
                <button :class="$style.saveFormBtn" @click="saveValidation" :disabled="isSaving">
                  <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
                  <span v-else>{{ editingValidation ? 'تحديث' : 'إضافة' }}</span>
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div v-if="!showAddForm && validations.length > 0" :class="$style.footer">
          <button :class="$style.addBtn" @click="openAddForm">
            <i class="fas fa-plus"></i>
            إضافة قاعدة
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style module>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  direction: rtl;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  background: linear-gradient(to left, #f8fafc, white);
}

.headerInfo h2 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.headerInfo p {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.columnKey {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.85rem;
  color: var(--primary-color, #4361ee);
  background: var(--bg-secondary, #e0e7ff);
  padding: 2px 8px;
  border-radius: 4px;
}

.columnLabel {
  font-size: 0.95rem;
  color: var(--text-secondary, #64748b);
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
  flex-shrink: 0;
}

.closeBtn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.errorMsg {
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

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary, #64748b);
}

.loading i {
  margin-left: 10px;
  color: var(--primary-color, #4361ee);
}

.emptyState {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary, #64748b);
}

.emptyState i {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.4;
}

.emptyState p {
  margin: 0 0 20px 0;
}

.addBtnEmpty {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--primary-color, #4361ee);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.addBtnEmpty:hover {
  background: var(--primary-dark, #3651d4);
}

.validationsList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.validationCard {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  transition: all 0.2s;
}

.validationCard:hover {
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 2px 8px rgba(67, 97, 238, 0.1);
}

.validationInfo {
  flex: 1;
  min-width: 0;
}

.validationType {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  margin-bottom: 8px;
}

.validationType i {
  color: var(--primary-color, #4361ee);
}

.validationValue {
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  margin-bottom: 6px;
}

.validationValue code {
  font-family: 'Fira Code', 'Consolas', monospace;
  background: white;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.validationMessage {
  font-size: 0.85rem;
  color: var(--text-secondary, #94a3b8);
  display: flex;
  align-items: center;
  gap: 6px;
}

.validationActions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.editBtn,
.deleteBtn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: white;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border: 1px solid var(--border-color, #e2e8f0);
}

.editBtn:hover {
  background: var(--primary-color, #4361ee);
  color: white;
  border-color: var(--primary-color, #4361ee);
}

.deleteBtn:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

/* Form Styles */
.form {
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 20px;
}

.form h3 {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.formGroup {
  margin-bottom: 16px;
}

.formGroup label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--text-primary, #1e293b);
}

.formGroup input,
.formGroup select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  transition: all 0.2s;
}

.formGroup input:focus,
.formGroup select:focus {
  outline: none;
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

.formGroup select:disabled {
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-secondary, #64748b);
  cursor: not-allowed;
}

.hint {
  display: block;
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.cancelFormBtn,
.saveFormBtn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cancelFormBtn {
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-secondary, #64748b);
}

.cancelFormBtn:hover:not(:disabled) {
  background: var(--bg-secondary, #f1f5f9);
}

.saveFormBtn {
  background: var(--primary-color, #4361ee);
  border: none;
  color: white;
}

.saveFormBtn:hover:not(:disabled) {
  background: var(--primary-dark, #3651d4);
}

.saveFormBtn:disabled,
.cancelFormBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Footer */
.footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-secondary, #f8fafc);
  display: flex;
  justify-content: center;
}

.addBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 1px dashed var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.addBtn:hover {
  background: var(--primary-color, #4361ee);
  border-style: solid;
  color: white;
}

/* Responsive */
@media (max-width: 560px) {
  .modal {
    max-height: 100vh;
    border-radius: 0;
  }
  
  .validationCard {
    flex-direction: column;
  }
  
  .validationActions {
    align-self: flex-end;
  }
}
</style>
