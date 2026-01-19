<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { userActivitiesService, type UserActivityDetailResponse, type TitleColumn, type ActivityAttachment } from '@/services/activityService'
import FormInput from '@/components/shared/FormInput.vue'
import FormTextarea from '@/components/shared/FormTextarea.vue'
import FormSelect from '@/components/shared/FormSelect.vue'

const route = useRoute()
const router = useRouter()

const templateId = ref(Number(route.params.id))
const activityId = ref(Number(route.params.activityId))

// State
const isLoading = ref(true)
const isSaving = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Activity data
const activity = ref<UserActivityDetailResponse | null>(null)
const columns = ref<TitleColumn[]>([])
const formData = ref<Record<string, string>>({})
const formErrors = ref<Record<string, string>>({})

// Attachment state
const existingAttachments = ref<Record<string, ActivityAttachment>>({})
const newAttachments = ref<Record<string, File | null>>({})
const attachmentPreviews = ref<Record<string, string>>({})
const deletedAttachments = ref<number[]>([])

// Computed
const isSubmitted = computed(() => activity.value?.is_submitted || false)
const canEdit = computed(() => !isSubmitted.value)

// Load activity data
const loadActivity = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const response = await userActivitiesService.getActivity(activityId.value)
    activity.value = response
    columns.value = response.columns || []
    
    // Initialize form data from activity data
    formData.value = { ...response.data }
    
    // Initialize existing attachments by column_key
    // Backend can return attachments as array or as object grouped by column_key
    if (response.attachments) {
      if (Array.isArray(response.attachments)) {
        // Array format - iterate and assign
        for (const att of response.attachments) {
          existingAttachments.value[att.column_key] = att
        }
      } else {
        // Object format { column_key: [attachments] } - only take first attachment per column
        for (const [columnKey, attList] of Object.entries(response.attachments)) {
          if (attList && attList.length > 0) {
            existingAttachments.value[columnKey] = attList[0]
          }
        }
      }
    }
    
    // Initialize new attachments state
    columns.value.forEach(col => {
      if (col.allows_attachment) {
        newAttachments.value[col.key] = null
      }
    })
    
    // Check if sheet is submitted
    if (response.is_submitted) {
      errorMessage.value = 'لا يمكن تعديل النشاط بعد تقديم النموذج'
    }
  } catch (error: any) {
    console.error('Error loading activity:', error)
    errorMessage.value = error.response?.data?.error || 'حدث خطأ أثناء تحميل النشاط'
  } finally {
    isLoading.value = false
  }
}

// Get input type based on column data type
const getInputType = (column: TitleColumn): 'text' | 'number' | 'date' | 'email' | 'tel' | 'password' | 'url' | 'time' | 'datetime-local' => {
  switch (column.data_type) {
    case 'number':
      return 'number'
    case 'date':
      return 'date'
    case 'email':
      return 'email'
    case 'tel':
      return 'tel'
    default:
      return 'text'
  }
}

// Check if column should use textarea
const isTextareaColumn = (column: TitleColumn): boolean => {
  return column.data_type === 'text' || column.data_type === 'textarea'
}

// Check if column should use select
const isSelectColumn = (column: TitleColumn): boolean => {
  return column.data_type === 'select' || (column.options && column.options.length > 0)
}

// Check if column is boolean type
const isBooleanColumn = (column: TitleColumn): boolean => {
  return column.data_type === 'boolean'
}

// Get select options for a column
const getSelectOptions = (column: TitleColumn) => {
  if (!column.options) return []
  return column.options.map((opt) => ({
    value: opt,
    label: opt
  }))
}

// Validate form
const validateForm = (): boolean => {
  let isValid = true
  formErrors.value = {}
  
  for (const column of columns.value) {
    if (column.is_required && !formData.value[column.key]?.trim()) {
      formErrors.value[column.key] = `${column.label} مطلوب`
      isValid = false
    }
    
    // Check attachment required (if not existing and not new)
    if (column.attachment_required && 
        !existingAttachments.value[column.key] && 
        !newAttachments.value[column.key] &&
        !deletedAttachments.value.includes(existingAttachments.value[column.key]?.id)) {
      formErrors.value[column.key] = `المرفق مطلوب لـ ${column.label}`
      isValid = false
    }
  }
  
  return isValid
}

// Handle file selection for attachment
const handleFileSelect = (column: TitleColumn, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (file) {
    newAttachments.value[column.key] = file
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        attachmentPreviews.value[column.key] = e.target?.result as string
      }
      reader.readAsDataURL(file)
    } else {
      attachmentPreviews.value[column.key] = ''
    }
  }
}

// Remove new attachment
const removeNewAttachment = (columnKey: string) => {
  newAttachments.value[columnKey] = null
  attachmentPreviews.value[columnKey] = ''
}

// Mark existing attachment for deletion
const markAttachmentForDeletion = (columnKey: string) => {
  const attachment = existingAttachments.value[columnKey]
  if (attachment) {
    deletedAttachments.value.push(attachment.id)
    delete existingAttachments.value[columnKey]
  }
}

// Get file icon based on type
const getFileIcon = (file: File | ActivityAttachment): string => {
  const type = 'type' in file ? file.type : file.mime_type
  if (!type) return 'fas fa-file'
  if (type.startsWith('image/')) return 'fas fa-image'
  if (type === 'application/pdf') return 'fas fa-file-pdf'
  if (type.includes('word')) return 'fas fa-file-word'
  if (type.includes('excel') || type.includes('spreadsheet')) return 'fas fa-file-excel'
  return 'fas fa-file'
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Download existing attachment via authenticated API
const handleExistingDownload = async (attachment: ActivityAttachment) => {
  try {
    await userActivitiesService.downloadAttachment(attachment.id)
  } catch (error: any) {
    console.error('Error downloading attachment:', error)
    Swal.fire({
      icon: 'error',
      title: 'خطأ',
      text: error.response?.data?.error || 'حدث خطأ أثناء تحميل الملف',
      confirmButtonText: 'حسناً'
    })
  }
}

// Preview existing attachment via authenticated API
const handleExistingPreview = async (attachment: ActivityAttachment) => {
  try {
    const result = await userActivitiesService.previewAttachment(attachment.id)
    // Open in new window with data URL
    const win = window.open()
    if (win) {
      win.document.write(`<html><head><title>${result.filename}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#333;"><img src="${result.dataUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;"/></body></html>`)
    }
  } catch (error: any) {
    console.error('Error previewing attachment:', error)
    Swal.fire({
      icon: 'error',
      title: 'خطأ',
      text: error.response?.data?.error || 'حدث خطأ أثناء عرض الملف',
      confirmButtonText: 'حسناً'
    })
  }
}

// Upload new attachments and delete removed ones
const processAttachments = async () => {
  // Delete marked attachments
  for (const attachmentId of deletedAttachments.value) {
    try {
      await userActivitiesService.deleteAttachment(attachmentId)
    } catch (error) {
      console.error(`Error deleting attachment ${attachmentId}:`, error)
    }
  }
  
  // Upload new attachments
  for (const column of columns.value) {
    const file = newAttachments.value[column.key]
    if (file) {
      try {
        await userActivitiesService.uploadAttachment(activityId.value, column.key, file)
      } catch (error) {
        console.error(`Error uploading attachment for ${column.key}:`, error)
      }
    }
  }
}

// Handle save
const handleSave = async () => {
  if (!canEdit.value) {
    errorMessage.value = 'لا يمكن تعديل النشاط بعد تقديم النموذج'
    return
  }
  
  if (!validateForm()) {
    return
  }
  
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    await userActivitiesService.updateActivity(activityId.value, formData.value)
    
    // Process attachments (upload new, delete removed)
    await processAttachments()
    
    successMessage.value = 'تم حفظ التعديلات بنجاح'
    
    // Navigate back after short delay
    setTimeout(() => {
      router.push(`/activities/local/${templateId.value}`)
    }, 1000)
  } catch (error: any) {
    console.error('Error saving activity:', error)
    errorMessage.value = error.response?.data?.error || 'حدث خطأ أثناء حفظ النشاط'
  } finally {
    isSaving.value = false
  }
}

// Handle submit (update and submit this activity)
const handleSubmit = async () => {
  if (!canEdit.value) {
    errorMessage.value = 'لا يمكن تعديل النشاط بعد تقديمه'
    return
  }
  
  if (!validateForm()) {
    return
  }
  
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    // Update the activity
    await userActivitiesService.updateActivity(activityId.value, formData.value)
    
    // Process attachments (upload new, delete removed)
    await processAttachments()
    
    // Submit this specific activity
    await userActivitiesService.submitActivity(activityId.value)
    
    successMessage.value = 'تم حفظ التعديلات وتقديم النشاط بنجاح'
    
    // Navigate back after short delay
    setTimeout(() => {
      router.push(`/activities/local/${templateId.value}`)
    }, 1000)
  } catch (error: any) {
    console.error('Error submitting activity:', error)
    errorMessage.value = error.response?.data?.error || 'حدث خطأ أثناء حفظ وتقديم النشاط'
  } finally {
    isSubmitting.value = false
  }
}

// Handle cancel
const handleCancel = () => {
  router.push(`/activities/local/${templateId.value}`)
}

onMounted(() => {
  loadActivity()
})
</script>

<template>
  <div :class="$style.container">
    <!-- Page Header -->
    <div :class="$style.pageHeader">
      <div :class="$style.titleSection">
        <button :class="$style.backBtn" @click="handleCancel" title="رجوع">
          <i class="fas fa-arrow-left"></i>
          رجوع
        </button>
        <h1 :class="$style.pageTitle">تعديل النشاط</h1>
      </div>
      
      <div :class="$style.headerActions">
        <button 
          :class="$style.submitBtn" 
          @click="handleSubmit" 
          :disabled="isSubmitting || !canEdit"
        >
          <i v-if="isSubmitting" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-check"></i>
          إنشاء
        </button>
        
        <button 
          :class="$style.draftBtn" 
          @click="handleSave" 
          :disabled="isSaving || !canEdit"
        >
          <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
          <svg v-else width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.07031 12.1231C2.41774 10.2374 6.5046 4.88022 11.2909 1.86822C14.8892 -0.398061 18.2852 2.59337 15.6503 5.60537C13.0737 8.55051 9.61946 12.6048 8.14346 14.6174C6.61431 16.7037 9.23203 19.2288 11.8515 16.8254C13.6 15.2208 15.4257 13.3745 17.2789 12.0099C19.7817 10.1688 21.928 11.7939 20.836 13.8699C20.0475 15.3699 19.4732 16.0317 18.8132 17.2951C18.1549 18.5568 18.8526 20.0705 19.852 20.2008C21.0897 20.3602 21.8732 19.4739 22.9309 18.0905" stroke="#A17D23" stroke-width="2.14286" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          حفظ مسودة
        </button>
        
        <button :class="$style.cancelBtn" @click="handleCancel">
          إلغاء
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div v-if="errorMessage" :class="$style.errorMessage">
      <i class="fas fa-exclamation-circle"></i>
      {{ errorMessage }}
    </div>
    
    <div v-if="successMessage" :class="$style.successMessage">
      <i class="fas fa-check-circle"></i>
      {{ successMessage }}
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" :class="$style.loadingState">
      <i class="fas fa-spinner fa-spin"></i>
      <span>جاري تحميل النشاط...</span>
    </div>

    <!-- Submitted Warning -->
    <div v-else-if="isSubmitted" :class="$style.warningMessage">
      <i class="fas fa-lock"></i>
      تم تقديم هذا النموذج ولا يمكن تعديله
    </div>

    <!-- Form Content -->
    <div v-else :class="$style.mainContent">
      <form :class="$style.form" @submit.prevent="handleSave">
        <div v-for="column in columns" :key="column.key" :class="$style.formRow">
          <!-- Boolean/Checkbox Field -->
          <div v-if="isBooleanColumn(column)" :class="$style.checkboxField">
            <label :class="$style.checkboxLabel">
              <input
                type="checkbox"
                v-model="formData[column.key]"
                :class="$style.checkboxInput"
                :disabled="!canEdit"
                :true-value="'true'"
                :false-value="'false'"
              />
              <span :class="$style.checkboxText">
                {{ column.label }}
                <span v-if="column.is_required" :class="$style.required">*</span>
              </span>
            </label>
            <div v-if="formErrors[column.key]" :class="$style.fieldError">
              {{ formErrors[column.key] }}
            </div>
          </div>
          
          <!-- Select Field -->
          <FormSelect
            v-else-if="isSelectColumn(column)"
            v-model="formData[column.key]"
            :label="column.label"
            :placeholder="`اختر ${column.label}`"
            :options="getSelectOptions(column)"
            :searchable="true"
            :required="column.is_required"
            :error="formErrors[column.key]"
            :disabled="!canEdit"
          />
          
          <!-- Textarea Field -->
          <FormTextarea
            v-else-if="isTextareaColumn(column)"
            v-model="formData[column.key]"
            :label="column.label"
            :placeholder="`ادخل ${column.label}`"
            :rows="4"
            :required="column.is_required"
            :error="formErrors[column.key]"
            :disabled="!canEdit"
          />
          
          <!-- Input Field -->
          <FormInput
            v-else
            v-model="formData[column.key]"
            :label="column.label"
            :placeholder="`ادخل ${column.label}`"
            :type="getInputType(column)"
            :required="column.is_required"
            :error="formErrors[column.key]"
            :disabled="!canEdit"
          />
          
          <!-- Attachment Section (if column allows) -->
          <div v-if="column.allows_attachment" :class="$style.attachmentSection">
            <label :class="$style.attachmentLabel">
              <i class="fas fa-paperclip"></i>
              المرفقات
              <span v-if="column.attachment_required" :class="$style.required">*</span>
            </label>
            
            <!-- Existing Attachment -->
            <div v-if="existingAttachments[column.key]" :class="$style.existingAttachment">
              <div :class="$style.fileInfo">
                <i :class="getFileIcon(existingAttachments[column.key])"></i>
                <div :class="$style.fileDetails">
                  <span :class="$style.fileName">{{ existingAttachments[column.key].original_filename }}</span>
                  <span :class="$style.fileSize">{{ formatFileSize(existingAttachments[column.key].file_size) }}</span>
                </div>
              </div>
              <div :class="$style.attachmentActions">
                <button 
                  type="button"
                  @click="handleExistingDownload(existingAttachments[column.key])"
                  :class="$style.downloadBtn"
                  title="تحميل"
                >
                  <i class="fas fa-download"></i>
                </button>
                <button 
                  v-if="existingAttachments[column.key].is_image"
                  type="button"
                  @click="handleExistingPreview(existingAttachments[column.key])"
                  :class="$style.previewBtn"
                  title="معاينة"
                >
                  <i class="fas fa-eye"></i>
                </button>
                <button 
                  v-if="canEdit"
                  type="button" 
                  :class="$style.removeBtn" 
                  @click="markAttachmentForDeletion(column.key)"
                  title="حذف"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            
            <!-- New Attachment Upload (if no existing or adding new) -->
            <template v-if="canEdit && !existingAttachments[column.key]">
              <!-- File Input -->
              <div v-if="!newAttachments[column.key]" :class="$style.attachmentUpload">
                <input
                  type="file"
                  :id="`attachment-${column.key}`"
                  @change="handleFileSelect(column, $event)"
                  :class="$style.fileInput"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                />
                <label :for="`attachment-${column.key}`" :class="$style.uploadLabel">
                  <i class="fas fa-cloud-upload-alt"></i>
                  <span>اختر ملف أو اسحب وأفلت</span>
                  <small>PDF, Word, Excel, Images (max 10MB)</small>
                </label>
              </div>
              
              <!-- New File Preview -->
              <div v-else :class="$style.attachmentPreview">
                <div :class="$style.fileInfo">
                  <i :class="getFileIcon(newAttachments[column.key]!)"></i>
                  <div :class="$style.fileDetails">
                    <span :class="$style.fileName">{{ newAttachments[column.key]!.name }}</span>
                    <span :class="$style.fileSize">{{ formatFileSize(newAttachments[column.key]!.size) }}</span>
                  </div>
                </div>
                <button type="button" :class="$style.removeBtn" @click="removeNewAttachment(column.key)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              
              <!-- Image Preview -->
              <img 
                v-if="attachmentPreviews[column.key]" 
                :src="attachmentPreviews[column.key]" 
                :class="$style.imagePreview" 
                alt="معاينة"
              />
            </template>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<style module>
.container {
  display: flex;
  flex-direction: column;
  width: 100%;
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
  background-color: white;
  padding: 10px;
  border-radius: 20px;
  margin-bottom: 24px;
}

.titleSection {
  display: flex;
  align-items: center;
  gap: 16px;
}

.backBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: #A17D23;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.backBtn:hover {
  background: #FFF8ED;
}

.backBtn i {
  font-size: 14px;
}

.pageTitle {
  font-size: 32px;
  font-weight: 400;
  color: #121011;
  margin: 0;
}

.headerActions {
  display: flex;
  gap: 8px;
}

.cancelBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  color: #717784;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancelBtn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.submitBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  background: #A17D23;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submitBtn:hover:not(:disabled) {
  background: #8A6B1E;
}

.submitBtn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.draftBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  color: #717784;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.draftBtn:hover:not(:disabled) {
  background: #FFF8ED;
  color: #A17D23;
}

.draftBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ==================== MESSAGES ==================== */
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

.successMessage {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #F0FFF4;
  border: 1px solid #C6F6D5;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #38A169;
  font-size: 14px;
}

.successMessage i {
  font-size: 18px;
}

.warningMessage {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #FFFBF0;
  border: 1px solid #F6E05E;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #B7791F;
  font-size: 14px;
}

.warningMessage i {
  font-size: 18px;
}

/* ==================== LOADING STATE ==================== */
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

/* ==================== FORM ==================== */
.mainContent {
  background: white;
  border-radius: 16px;
  padding: 24px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.formRow {
  width: 100%;
}

/* ==================== CHECKBOX FIELD (BOOLEAN) ==================== */
.checkboxField {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
}

.checkboxLabel {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.checkboxInput {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #A17D23;
}

.checkboxInput:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.checkboxText {
  font-size: 14px;
  font-weight: 500;
  color: #0E121B;
}

.required {
  color: #D44333;
  margin-right: 4px;
}

.fieldError {
  color: #D44333;
  font-size: 12px;
  margin-top: 4px;
}

/* ==================== ATTACHMENT STYLES ==================== */
.attachmentSection {
  margin-top: 12px;
  padding-top: 16px;
  border-top: 1px dashed #E1E4EA;
}

.attachmentLabel {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0E121B;
  margin-bottom: 12px;
}

.attachmentLabel i {
  color: #A17D23;
}

.required {
  color: #D44333;
}

.attachmentUpload {
  position: relative;
  border: 2px dashed #E1E4EA;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.2s ease;
  background: #FAFAFA;
}

.attachmentUpload:hover {
  border-color: #A17D23;
  background: #FFF8ED;
}

.fileInput {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  opacity: 0;
  cursor: pointer;
}

.uploadLabel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #717784;
  cursor: pointer;
}

.uploadLabel i {
  font-size: 32px;
  color: #A17D23;
}

.uploadLabel span {
  font-size: 14px;
  font-weight: 500;
  color: #0E121B;
}

.uploadLabel small {
  font-size: 12px;
  color: #9CA3AF;
}

.attachmentPreview,
.existingAttachment {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #F5F7FA;
  border: 1px solid #E1E4EA;
  border-radius: 10px;
}

.fileInfo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fileInfo > i {
  font-size: 24px;
  color: #A17D23;
}

.fileDetails {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fileName {
  font-size: 14px;
  font-weight: 500;
  color: #0E121B;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fileSize {
  font-size: 12px;
  color: #717784;
}

.attachmentActions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.downloadBtn,
.previewBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  color: #A17D23;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.downloadBtn:hover,
.previewBtn:hover {
  background: #FFF8ED;
  border-color: #A17D23;
}

.removeBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  color: #D44333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.removeBtn:hover {
  background: #FFF5F5;
  border-color: #D44333;
}

.imagePreview {
  margin-top: 12px;
  max-width: 200px;
  max-height: 150px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #E1E4EA;
}
</style>
