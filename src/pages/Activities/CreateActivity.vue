<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userActivitiesService, type TitleColumn } from '@/services/activityService'
import FormInput from '@/components/shared/FormInput.vue'
import FormSelect from '@/components/shared/FormSelect.vue'
import FormRadio from '@/components/shared/FormRadio.vue'

const route = useRoute()
const router = useRouter()

const templateId = ref(Number(route.params.id))

// State
const isLoading = ref(true)
const isSubmitting = ref(false)
const isSavingDraft = ref(false)
const errorMessage = ref('')

// Template and columns data
const templateInfo = ref<{ id: number; name: string; description: string } | null>(null)
const columns = ref<TitleColumn[]>([])
const formData = ref<Record<string, any>>({
  has_meeting_minutes: false
})
const formErrors = ref<Record<string, string>>({})

// Attachment state
const attachments = ref<Record<string, File | null>>({
  meeting_minutes: null,
  outputs_file: null
})

// Load template columns
const loadTemplateColumns = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // Use getActivities to get template info and columns
    const response = await userActivitiesService.getActivities(templateId.value, 1, 1)
    templateInfo.value = response.template
    columns.value = response.columns || []
    
    // Initialize form data with empty values
    columns.value.forEach(col => {
      formData.value[col.key] = ''
      if (col.allows_attachment) {
        attachments.value[col.key] = null
      }
    })
  } catch (error: any) {
    console.error('Error loading template columns:', error)
    errorMessage.value = error.response?.data?.error || 'حدث خطأ أثناء تحميل النموذج'
  } finally {
    isLoading.value = false
  }
}

// Handle meeting minutes file upload
const handleMeetingMinutesUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (file) {
    attachments.value.meeting_minutes = file
  }
}

// Remove meeting minutes
const removeMeetingMinutes = () => {
  attachments.value.meeting_minutes = null
}

// Handle outputs file upload
const handleOutputsUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (file) {
    attachments.value.outputs_file = file
  }
}

// Remove outputs file
const removeOutputsFile = () => {
  attachments.value.outputs_file = null
}

// Get file icon based on type
const getFileIcon = (file: File): string => {
  if (file.type.startsWith('image/')) return 'fas fa-image'
  if (file.type === 'application/pdf') return 'fas fa-file-pdf'
  if (file.type.includes('word')) return 'fas fa-file-word'
  if (file.type.includes('excel') || file.type.includes('spreadsheet')) return 'fas fa-file-excel'
  return 'fas fa-file'
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Validate form
const validateForm = (): boolean => {
  let isValid = true
  formErrors.value = {}
  
  for (const column of columns.value) {
    const value = formData.value[column.key]
    
    if (column.is_required) {
      // Check if value is empty based on its type
      const isEmpty = value === undefined || value === null || value === '' || 
        (typeof value === 'string' && value.trim() === '')
      
      if (isEmpty) {
        formErrors.value[column.key] = `${column.label} مطلوب`
        isValid = false
        continue
      }
    }
    
    // Check attachment required
    if (column.attachment_required && !attachments.value[column.key]) {
      formErrors.value[column.key] = `المرفق مطلوب لـ ${column.label}`
      isValid = false
    }
  }
  
  return isValid
}

// Upload attachments for an activity
const uploadAttachments = async (activityId: number) => {
  for (const column of columns.value) {
    const file = attachments.value[column.key]
    if (file) {
      try {
        await userActivitiesService.uploadAttachment(activityId, column.key, file)
      } catch (error) {
        console.error(`Error uploading attachment for ${column.key}:`, error)
      }
    }
  }
}

// Handle submit
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''
  
  try {
    // Create the activity
    const activity = await userActivitiesService.createActivity(templateId.value, formData.value)
    
    // Upload attachments
    await uploadAttachments(activity.id)
    
    // Submit this specific activity
    await userActivitiesService.submitActivity(activity.id)
    
    // Navigate back to the detail page
    router.push(`/activities/local/${templateId.value}`)
  } catch (error: any) {
    console.error('Error submitting activity:', error)
    errorMessage.value = error.response?.data?.error || 'حدث خطأ أثناء إنشاء وتقديم النشاط'
  } finally {
    isSubmitting.value = false
  }
}

// Handle save draft (same as submit for now)
const handleSaveDraft = async () => {
  isSavingDraft.value = true
  errorMessage.value = ''
  
  try {
    const activity = await userActivitiesService.createActivity(templateId.value, formData.value)
    
    // Upload attachments
    await uploadAttachments(activity.id)
    
    // Navigate back to the detail page
    router.push(`/activities/local/${templateId.value}`)
  } catch (error: any) {
    console.error('Error saving draft:', error)
    errorMessage.value = error.response?.data?.error || 'حدث خطأ أثناء حفظ المسودة'
  } finally {
    isSavingDraft.value = false
  }
}

// Handle cancel
const handleCancel = () => {
  router.push(`/activities/local/${templateId.value}`)
}

onMounted(() => {
  loadTemplateColumns()
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
        <h1 :class="$style.pageTitle">إنشاء نشاط جديد</h1>
      </div>
      
      <div :class="$style.headerActions">
        <button :class="$style.submitBtn" @click="handleSubmit" :disabled="isSubmitting || isLoading">
          <i v-if="isSubmitting" class="fas fa-spinner fa-spin"></i>
          إنشاء
        </button>
   
        <button :class="$style.draftBtn" @click="handleSaveDraft" :disabled="isSavingDraft || isLoading">
          <i v-if="isSavingDraft" class="fas fa-spinner fa-spin"></i>
          <svg width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.07031 12.1231C2.41774 10.2374 6.5046 4.88022 11.2909 1.86822C14.8892 -0.398061 18.2852 2.59337 15.6503 5.60537C13.0737 8.55051 9.61946 12.6048 8.14346 14.6174C6.61431 16.7037 9.23203 19.2288 11.8515 16.8254C13.6 15.2208 15.4257 13.3745 17.2789 12.0099C19.7817 10.1688 21.928 11.7939 20.836 13.8699C20.0475 15.3699 19.4732 16.0317 18.8132 17.2951C18.1549 18.5568 18.8526 20.0705 19.852 20.2008C21.0897 20.3602 21.8732 19.4739 22.9309 18.0905" stroke="#A17D23" stroke-width="2.14286" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          مسودة
        </button>
        <button :class="$style.cancelBtn" @click="handleCancel">
          إلغاء
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" :class="$style.errorMessage">
      <i class="fas fa-exclamation-circle"></i>
      {{ errorMessage }}
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" :class="$style.loadingState">
      <i class="fas fa-spinner fa-spin"></i>
      <span>جاري تحميل النموذج...</span>
    </div>

    <!-- Form Content -->
    <div v-else :class="$style.mainContent">
      <form :class="$style.form" @submit.prevent="handleSubmit">
        
        <!-- Section 1: نوع النشاط -->
        <div :class="$style.formSection">
          <FormInput
            v-model="formData.activity_type"
            label="نوع النشاط"
            placeholder="ادخل نوع النشاط"
            type="text"
            :required="true"
          />
        </div>

        <!-- Section 2: يوجد محضر اجتماع + Upload -->
        <div :class="$style.formSection">
          <FormRadio
            v-model="formData.has_meeting_minutes"
            label="يوجد محضر اجتماع"
            :required="true"
          />

          <!-- Conditional Attachment Upload -->
          <div v-if="formData.has_meeting_minutes" :class="$style.attachmentSection">
            <label :class="$style.attachmentLabel">
              <i class="fas fa-paperclip"></i>
              رفع محضر الاجتماع
              <span :class="$style.required">*</span>
            </label>
            
            <!-- File Input -->
            <div v-if="!attachments.meeting_minutes" :class="$style.attachmentUpload">
              <input
                type="file"
                id="attachment-meeting-minutes"
                @change="handleMeetingMinutesUpload"
                :class="$style.fileInput"
                accept=".pdf,.doc,.docx"
              />
              <label for="attachment-meeting-minutes" :class="$style.uploadLabel">
                <i class="fas fa-cloud-upload-alt"></i>
                <span>اسحب المرفق هنا أو اختر ملف من الحاسوب</span>
                <small>الملفات المدعومة: PDF, .bmp, .svg, .webp, .gif, .png, .jpeg, .jpg</small>
              </label>
            </div>
            
            <!-- File Preview -->
            <div v-else :class="$style.attachmentPreview">
              <div :class="$style.fileInfo">
                <i :class="getFileIcon(attachments.meeting_minutes!)"></i>
                <div :class="$style.fileDetails">
                  <span :class="$style.fileName">{{ attachments.meeting_minutes!.name }}</span>
                  <span :class="$style.fileSize">{{ formatFileSize(attachments.meeting_minutes!.size) }}</span>
                </div>
              </div>
              <button type="button" :class="$style.removeBtn" @click="removeMeetingMinutes">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Section 3: القسم المعني + اسم النشاط -->
        <div :class="$style.formSection">
          <div :class="$style.gridRow">
            <FormInput
              v-model="formData.department"
              label="القسم المعني"
              placeholder="ادخل القسم المعني"
              type="text"
              :required="true"
            />
            <FormInput
              v-model="formData.activity_name"
              label="اسم النشاط"
              placeholder="ادخل اسم النشاط"
              type="text"
              :required="true"
            />
          </div>
        </div>

        <!-- Section 4: نوع التمثيل + نطاق النشاط -->
        <div :class="$style.formSection">
          <div :class="$style.gridRow">
            <FormSelect
              v-model="formData.representation_type"
              label="نوع التمثيل"
              placeholder="اختر نوع التمثيل"
              :options="[
                { value: 'type1', label: 'نوع 1' },
                { value: 'type2', label: 'نوع 2' },
                { value: 'type3', label: 'نوع 3' }
              ]"
              :searchable="true"
              :required="true"
            />
            <FormSelect
              v-model="formData.activity_scope"
              label="نطاق النشاط"
              placeholder="اختر نطاق النشاط"
              :options="[
                { value: 'local', label: 'محلي' },
                { value: 'regional', label: 'إقليمي' },
                { value: 'international', label: 'دولي' }
              ]"
              :searchable="true"
              :required="true"
            />
          </div>
        </div>

        <!-- Section 5: مصدر النشاط + الجهات المشاركة -->
        <div :class="$style.formSection">
          <div :class="$style.gridRow">
            <FormSelect
              v-model="formData.activity_source"
              label="مصدر النشاط"
              placeholder="اختر مصدر النشاط"
              :options="[
                { value: 'internal', label: 'داخلي' },
                { value: 'external', label: 'خارجي' },
                { value: 'partnership', label: 'شراكة' }
              ]"
              :searchable="true"
              :required="true"
            />
            <FormInput
              v-model="formData.participating_parties"
              label="الجهات المشاركة"
              placeholder="ادخل الجهات المشاركة"
              type="text"
              :required="false"
            />
          </div>
        </div>

        <!-- Section 6: المخرجات + المرفقات -->
        <div :class="$style.formSection">
          <FormInput
            v-model="formData.outputs"
            label="المخرجات"
            placeholder="ادخل المخرجات"
            type="text"
            :required="false"
          />

          <!-- Attachments -->
          <div :class="$style.attachmentSection">
            <label :class="$style.attachmentLabel">
              <i class="fas fa-paperclip"></i>
              المرفقات
            </label>
            
            <!-- File Input -->
            <div v-if="!attachments.outputs_file" :class="$style.attachmentUpload">
              <input
                type="file"
                id="attachment-outputs"
                @change="handleOutputsUpload"
                :class="$style.fileInput"
                accept=".pdf,.doc,.docx,.bmp,.svg,.webp,.gif,.png,.jpeg,.jpg"
              />
              <label for="attachment-outputs" :class="$style.uploadLabel">
                <i class="fas fa-cloud-upload-alt"></i>
                <span>اسحب المرفق هنا أو اختر ملف من الحاسوب</span>
                <small>الملفات المدعومة: PDF, .bmp, .svg, .webp, .gif, .png, .jpeg, .jpg</small>
              </label>
            </div>
            
            <!-- File Preview -->
            <div v-else :class="$style.attachmentPreview">
              <div :class="$style.fileInfo">
                <i :class="getFileIcon(attachments.outputs_file!)"></i>
                <div :class="$style.fileDetails">
                  <span :class="$style.fileName">{{ attachments.outputs_file!.name }}</span>
                  <span :class="$style.fileSize">{{ formatFileSize(attachments.outputs_file!.size) }}</span>
                </div>
              </div>
              <button type="button" :class="$style.removeBtn" @click="removeOutputsFile">
                <i class="fas fa-times"></i>
              </button>
            </div>
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
  gap: 0;
  background: transparent;
  border-radius: 8px;
  gap: 8px;
  /* overflow: hidden; */
}

.cancelBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px ;
  color: #717784;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancelBtn:hover {
  background: #F5F7FA;
  color: #0E121B;
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

.draftBtn i {
  font-size: 12px;
}

.submitBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  background: #A17D23;
  border: 1px solid #A17D23;
  border-radius:  8px ;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submitBtn:hover:not(:disabled) {
  background: #8a6b1e;
  border-color: #8a6b1e;
}

.submitBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submitBtn i {
  font-size: 12px;
}

/* ==================== MAIN CONTENT ==================== */
.mainContent {
  background: white;
  border-radius: 16px;
  padding: 32px;
  flex: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.formSection {
  border: 1px solid #E1E4EA;
  border-radius: 10px;
  padding: 20px;
  background: white;
}

.gridRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.fullWidth {
  width: 100%;
}

@media (max-width: 768px) {
  .gridRow {
    grid-template-columns: 1fr;
  }
}

/* ==================== CHECKBOX FIELD (BOOLEAN) ==================== */
.toggleField {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-bottom: 16px;
}

.toggleLabel {
  font-size: 14px;
  font-weight: 600;
  color: #0E121B;
}

.toggleSwitch {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggleInput {
  display: none;
}

.toggleSlider {
  position: relative;
  width: 48px;
  height: 24px;
  background: #E1E4EA;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggleSlider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggleInput:checked + .toggleSlider {
  background: #00A350;
}

.toggleInput:checked + .toggleSlider::before {
  transform: translateX(24px);
}

.toggleText {
  font-size: 14px;
  font-weight: 600;
  color: #0E121B;
  min-width: 32px;
}

.checkboxField {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  grid-column: 1 / -1;
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

@media (max-width: 768px) {
  .form {
    grid-template-columns: 1fr;
  }
}

/* ==================== ATTACHMENT STYLES ==================== */
.attachmentSection {
  margin-top: 16px;
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

.attachmentPreview {
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

/* ==================== PERCENTAGE FIELD STYLES ==================== */
.percentageField {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.percentageLabel {
  font-size: 14px;
  font-weight: 600;
  color: #0E121B;
}

.percentageInputWrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.percentageInput {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 1px solid #E1E4EA;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #0E121B;
  background: #FAFAFA;
  transition: all 0.2s ease;
  text-align: center;
}

.percentageInput:focus {
  outline: none;
  border-color: #A17D23;
  background: white;
  box-shadow: 0 0 0 3px rgba(161, 125, 35, 0.1);
}

.percentageInput.hasError {
  border-color: #D44333;
  background: #FFF5F5;
}

.percentageInput::-webkit-inner-spin-button,
.percentageInput::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.percentageInput[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.percentageSymbol {
  position: absolute;
  top: 12px;
  left: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #A17D23;
}

.percentageBar {
  width: 100%;
  height: 8px;
  background: #E1E4EA;
  border-radius: 4px;
  overflow: hidden;
}

.percentageFill {
  height: 100%;
  background: linear-gradient(90deg, #A17D23 0%, #C9A84C 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}
</style>
