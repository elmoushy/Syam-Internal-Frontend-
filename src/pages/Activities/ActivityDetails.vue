<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { userActivitiesService, type UserActivityDetailResponse, type TitleColumn, type ActivityAttachment } from '@/services/activityService'

const route = useRoute()
const router = useRouter()

// Get the template ID and activity ID from the route params
const templateId = computed(() => route.params.id)
const activityId = computed(() => Number(route.params.activityId))

// State
const isLoading = ref(true)
const errorMessage = ref('')
const activity = ref<UserActivityDetailResponse | null>(null)
const columns = ref<TitleColumn[]>([])
const attachments = ref<ActivityAttachment[]>([])

// Preview modal state
const showPreviewModal = ref(false)
const previewImage = ref<{ dataUrl: string; filename: string } | null>(null)
const isPreviewLoading = ref(false)
const previewError = ref('')

// Download loading state
const downloadingId = ref<number | null>(null)

// Computed
const isSubmitted = computed(() => activity.value?.is_submitted || false)
const activityTitle = computed(() => {
  if (!activity.value || columns.value.length === 0) return 'نشاط'
  const firstColumnKey = columns.value[0]?.key
  return activity.value.data[firstColumnKey] || activity.value.title || 'نشاط'
})

// Format date for Arabic display
const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Get file icon based on content type
const getFileIcon = (mimeType: string): string => {
  if (!mimeType) return 'fa-file'
  if (mimeType.startsWith('image/')) return 'fa-file-image'
  if (mimeType === 'application/pdf') return 'fa-file-pdf'
  if (mimeType.includes('word')) return 'fa-file-word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint'
  return 'fa-file'
}

// Get file icon color
const getFileIconColor = (mimeType: string): string => {
  if (!mimeType) return '#717784'
  if (mimeType.startsWith('image/')) return '#4CAF50'
  if (mimeType === 'application/pdf') return '#D44333'
  if (mimeType.includes('word')) return '#2B579A'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '#217346'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '#D24726'
  return '#717784'
}

// Get file type label
const getFileTypeLabel = (mimeType: string): string => {
  if (!mimeType) return 'ملف'
  if (mimeType.startsWith('image/')) return 'صورة'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('word')) return 'Word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PowerPoint'
  return 'ملف'
}

// Load activity data
const loadActivity = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const response = await userActivitiesService.getActivity(activityId.value)
    activity.value = response
    columns.value = response.columns || []
    
    // Handle attachments - backend returns object grouped by column_key, convert to flat array
    if (response.attachments) {
      if (Array.isArray(response.attachments)) {
        attachments.value = response.attachments
      } else {
        // Flatten object structure: { column_key: [attachments] } => [attachments]
        attachments.value = Object.values(response.attachments).flat()
      }
    } else {
      attachments.value = []
    }
  } catch (error: any) {
    console.error('Error loading activity:', error)
    errorMessage.value = error.response?.data?.error || 'حدث خطأ أثناء تحميل النشاط'
  } finally {
    isLoading.value = false
  }
}

// Get column value from activity data
const getColumnValue = (columnKey: string): string => {
  if (!activity.value) return '-'
  return activity.value.data[columnKey] || '-'
}

// Get attachments for a specific column
const getColumnAttachments = (columnKey: string): ActivityAttachment[] => {
  return attachments.value.filter(att => att.column_key === columnKey)
}

// Check if column has attachments
const columnHasAttachments = (columnKey: string): boolean => {
  return attachments.value.some(att => att.column_key === columnKey)
}

const goBack = () => {
  router.push(`/activities/local/${templateId.value}`)
}

const handleEdit = () => {
  router.push(`/activities/local/${templateId.value}/edit/${activityId.value}`)
}

// Download attachment using authenticated API call
const handleDownload = async (attachment: ActivityAttachment) => {
  try {
    downloadingId.value = attachment.id
    await userActivitiesService.downloadAttachment(attachment.id)
  } catch (error: any) {
    console.error('Error downloading attachment:', error)
    Swal.fire({
      icon: 'error',
      title: 'خطأ',
      text: error.response?.data?.error || 'حدث خطأ أثناء تحميل الملف',
      confirmButtonText: 'حسناً'
    })
  } finally {
    downloadingId.value = null
  }
}

// Preview attachment (images only) using authenticated API call
const handlePreview = async (attachment: ActivityAttachment) => {
  if (!attachment.is_image) {
    // For non-images, just download
    handleDownload(attachment)
    return
  }
  
  try {
    isPreviewLoading.value = true
    previewError.value = ''
    showPreviewModal.value = true
    
    const result = await userActivitiesService.previewAttachment(attachment.id)
    previewImage.value = {
      dataUrl: result.dataUrl,
      filename: result.filename
    }
  } catch (error: any) {
    console.error('Error previewing attachment:', error)
    previewError.value = error.response?.data?.error || 'حدث خطأ أثناء عرض الملف'
  } finally {
    isPreviewLoading.value = false
  }
}

// Close preview modal
const closePreview = () => {
  showPreviewModal.value = false
  previewImage.value = null
  previewError.value = ''
}

onMounted(() => {
  loadActivity()
})
</script>

<template>
  <div :class="$style.container">
    <!-- Loading State -->
    <div v-if="isLoading" :class="$style.loadingState">
      <i class="fas fa-spinner fa-spin"></i>
      <span>جاري تحميل النشاط...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" :class="$style.errorState">
      <i class="fas fa-exclamation-circle"></i>
      <span>{{ errorMessage }}</span>
      <button @click="goBack" :class="$style.backBtnError">رجوع</button>
    </div>

    <!-- Content -->
    <template v-else-if="activity">
      <!-- Page Header -->
      <div :class="$style.pageHeader">
        <div :class="$style.headerRight">
          <button :class="$style.backBtn" @click="goBack">
            <i class="fas fa-arrow-right"></i>
            رجوع
          </button>
          
          <h1 :class="$style.pageTitle">{{ activityTitle }}</h1>
          
          <span 
            :class="[
              $style.statusBadge,
              isSubmitted ? $style.statusSubmitted : $style.statusDraft
            ]"
          >
            {{ isSubmitted ? 'تم التقديم' : 'مسودة' }}
          </span>
        </div>
        
        <button v-if="!isSubmitted" :class="$style.editBtn" @click="handleEdit">
          <i class="fas fa-edit"></i>
          تعديل النشاط
        </button>
      </div>

      <!-- Main Content -->
      <div :class="$style.mainContent">
        <!-- Two Column Layout -->
        <div :class="$style.twoColumnLayout">
          <!-- Right Column - Details -->
          <div :class="$style.rightColumn">
            <!-- Details Cards -->
            <div :class="$style.detailsContainer">
              <!-- بيانات النشاط -->
              <div :class="$style.detailCard">
                <div :class="$style.cardHeader">
                  <i class="fas fa-file-alt" :class="$style.cardIcon"></i>
                  <h2 :class="$style.cardTitle">بيانات النشاط</h2>
                </div>
                
                <div :class="$style.cardBody">
                  <div v-for="column in columns" :key="column.key" :class="$style.detailRow">
                    <span :class="$style.label">{{ column.label }}</span>
                    <span :class="$style.value">{{ getColumnValue(column.key) }}</span>
                    
                    <!-- Show attachment indicator if column has attachments -->
                    <div v-if="columnHasAttachments(column.key)" :class="$style.columnAttachments">
                      <div 
                        v-for="att in getColumnAttachments(column.key)" 
                        :key="att.id"
                        :class="$style.miniAttachment"
                        @click="handleDownload(att)"
                      >
                        <i :class="['fas', getFileIcon(att.mime_type)]" :style="{ color: getFileIconColor(att.mime_type) }"></i>
                        <span>{{ att.original_filename }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- معلومات النظام -->
              <div :class="$style.detailCard">
                <div :class="$style.cardHeader">
                  <i class="fas fa-cog" :class="$style.cardIcon"></i>
                  <h2 :class="$style.cardTitle">معلومات النظام</h2>
                </div>
                
                <div :class="$style.cardBody">
                  <div :class="$style.detailRow">
                    <span :class="$style.label">أنشئ بواسطة</span>
                    <span :class="$style.value">{{ activity.author }}</span>
                  </div>
                  
                  <div :class="$style.detailRow">
                    <span :class="$style.label">تاريخ الإنشاء</span>
                    <span :class="$style.value">{{ formatDate(activity.created_at) }}</span>
                  </div>
                  
                  <div :class="$style.detailRow">
                    <span :class="$style.label">آخر تحديث</span>
                    <span :class="$style.value">{{ formatDate(activity.updated_at) }}</span>
                  </div>

                  <div v-if="activity.submitted_at" :class="$style.detailRow">
                    <span :class="$style.label">تاريخ التقديم</span>
                    <span :class="$style.value">{{ formatDate(activity.submitted_at) }}</span>
                  </div>

                  <div v-if="activity.template" :class="$style.detailRow">
                    <span :class="$style.label">النموذج</span>
                    <span :class="$style.value">{{ activity.template.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Left Column - Attachments -->
          <div :class="$style.leftColumn">
            <!-- المرفقات -->
            <div :class="$style.sideCard">
              <div :class="$style.sideCardHeader">
                <i class="fas fa-paperclip"></i>
                <h3 :class="$style.sideCardTitle">المرفقات ({{ attachments.length }})</h3>
              </div>
              
              <div v-if="attachments.length > 0" :class="$style.attachmentsList">
                <div 
                  v-for="attachment in attachments" 
                  :key="attachment.id"
                  :class="$style.attachmentItem"
                >
                  <div :class="$style.fileIconSmall">
                    <i 
                      :class="['fas', getFileIcon(attachment.mime_type)]"
                      :style="{ color: getFileIconColor(attachment.mime_type) }"
                    ></i>
                  </div>
                  <div :class="$style.fileInfo">
                    <span :class="$style.fileNameSmall">{{ attachment.original_filename }}</span>
                    <span :class="$style.fileSizeSmall">
                      {{ getFileTypeLabel(attachment.mime_type) }} • {{ formatFileSize(attachment.file_size) }}
                    </span>
                  </div>
                  <div :class="$style.attachmentActions">
                    <button 
                      v-if="attachment.preview_url"
                      :class="$style.actionBtn"
                      @click="handlePreview(attachment)"
                      title="معاينة"
                    >
                      <i class="fas fa-eye"></i>
                    </button>
                    <button 
                      :class="$style.actionBtn"
                      @click="handleDownload(attachment)"
                      title="تحميل"
                    >
                      <i class="fas fa-download"></i>
                    </button>
                  </div>
                </div>
              </div>
              
              <div v-else :class="$style.noAttachments">
                <i class="fas fa-folder-open"></i>
                <span>لا توجد مرفقات</span>
              </div>
            </div>

            <!-- معلومات سريعة -->
            <div :class="$style.sideCard">
              <div :class="$style.sideCardHeader">
                <i class="fas fa-info-circle"></i>
                <h3 :class="$style.sideCardTitle">معلومات سريعة</h3>
              </div>
              
              <div :class="$style.sideCardBody">
                <div :class="$style.infoRow">
                  <i class="fas fa-user" :class="$style.infoIcon"></i>
                  <div :class="$style.infoContent">
                    <span :class="$style.infoLabel">أنشئ بواسطة</span>
                    <span :class="$style.infoValue">{{ activity.author }}</span>
                  </div>
                </div>
                
                <div :class="$style.infoRow">
                  <i class="fas fa-calendar" :class="$style.infoIcon"></i>
                  <div :class="$style.infoContent">
                    <span :class="$style.infoLabel">تاريخ الإنشاء</span>
                    <span :class="$style.infoValue">{{ formatDate(activity.created_at) }}</span>
                  </div>
                </div>
                
                <div :class="$style.infoRow">
                  <i class="fas fa-clock" :class="$style.infoIcon"></i>
                  <div :class="$style.infoContent">
                    <span :class="$style.infoLabel">آخر تحديث</span>
                    <span :class="$style.infoValue">{{ formatDate(activity.updated_at) }}</span>
                  </div>
                </div>
                
                <div v-if="activity.sheet" :class="$style.infoRow">
                  <i class="fas fa-file-alt" :class="$style.infoIcon"></i>
                  <div :class="$style.infoContent">
                    <span :class="$style.infoLabel">الورقة</span>
                    <span :class="$style.infoValue">{{ activity.sheet.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Image Preview Modal -->
    <Teleport to="body">
      <div v-if="showPreviewModal" :class="$style.modalOverlay" @click.self="closePreview">
        <div :class="$style.previewModal">
          <div :class="$style.previewHeader">
            <h3 :class="$style.previewTitle">{{ previewImage?.filename || 'معاينة الصورة' }}</h3>
            <button :class="$style.closeBtn" @click="closePreview">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div :class="$style.previewBody">
            <!-- Loading -->
            <div v-if="isPreviewLoading" :class="$style.previewLoading">
              <i class="fas fa-spinner fa-spin"></i>
              <span>جاري تحميل الصورة...</span>
            </div>
            
            <!-- Error -->
            <div v-else-if="previewError" :class="$style.previewError">
              <i class="fas fa-exclamation-circle"></i>
              <span>{{ previewError }}</span>
            </div>
            
            <!-- Image -->
            <img 
              v-else-if="previewImage" 
              :src="previewImage.dataUrl" 
              :alt="previewImage.filename"
              :class="$style.previewImage"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style module>
.container {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 80px);
  background: #f5f5f5;
  direction: rtl;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
  padding: 24px 40px;
}

/* ==================== LOADING & ERROR STATES ==================== */
.loadingState,
.errorState {
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
  min-height: 300px;
}

.loadingState i {
  font-size: 32px;
  color: #A17D23;
}

.errorState i {
  font-size: 32px;
  color: #D44333;
}

.errorState {
  color: #D44333;
}

.backBtnError {
  margin-top: 16px;
  padding: 10px 24px;
  background: #A17D23;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.backBtnError:hover {
  background: #8a6b1e;
}

/* ==================== PAGE HEADER ==================== */
.pageHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 24px;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.backBtn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  color: #717784;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.backBtn:hover {
  background: #f5f5f5;
  border-color: #A17D23;
  color: #A17D23;
}

.backBtn i {
  font-size: 12px;
}

.pageTitle {
  font-size: 32px;
  font-weight: 700;
  color: #0E121B;
  margin: 0;
  flex: 1;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.statusBadge {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.statusDraft {
  background: #FFF8ED;
  color: #A17D23;
  border: 1px solid #F3D6A7;
}

.statusSubmitted {
  background: #E8F5E9;
  color: #2E7D32;
  border: 1px solid #A5D6A7;
}

.editBtn {
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
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.editBtn:hover {
  background: #8a6b1e;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(161, 125, 35, 0.25);
}

.editBtn i {
  font-size: 14px;
}

/* ==================== MAIN CONTENT ==================== */
.mainContent {
  display: flex;
  flex-direction: column;
}

/* ==================== TWO COLUMN LAYOUT ==================== */
.twoColumnLayout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  align-items: start;
}

@media (max-width: 1200px) {
  .twoColumnLayout {
    grid-template-columns: 1fr;
  }
  
  .leftColumn {
    order: -1;
  }
}

/* ==================== RIGHT COLUMN (Main Content) ==================== */
.rightColumn {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ==================== DETAILS CONTAINER ==================== */
.detailsContainer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ==================== DETAIL CARDS ==================== */
.detailCard {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #E1E4EA;
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #E1E4EA;
}

.cardIcon {
  font-size: 18px;
  color: #A17D23;
}

.cardTitle {
  font-size: 16px;
  font-weight: 700;
  color: #0E121B;
  margin: 0;
}

.cardBody {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ==================== DETAIL ROWS ==================== */
.detailRow {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #F0F0F0;
}

.detailRow:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.label {
  font-size: 14px;
  color: #717784;
  font-weight: 400;
  flex-shrink: 0;
}

.value {
  font-size: 14px;
  color: #0E121B;
  font-weight: 500;
  text-align: left;
}

.greenText {
  color: #2E7D32 !important;
  font-weight: 600;
}

/* ==================== TAGS LIST ==================== */
.tagsList {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  background: #E8F5ED;
  border: 1px solid #C8E6D4;
  border-radius: 16px;
  font-size: 13px;
  color: #2E7D32;
  font-weight: 500;
}

/* ==================== OUTPUT TEXT ==================== */
.outputText {
  font-size: 14px;
  color: #0E121B;
  line-height: 1.8;
  margin: 0;
  text-align: justify;
}

/* ==================== LEFT COLUMN (Sidebar) ==================== */
.leftColumn {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 24px;
}

/* ==================== SIDE CARDS ==================== */
.sideCard {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #E1E4EA;
}

.sideCardHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #E1E4EA;
}

.sideCardHeader i {
  font-size: 16px;
  color: #A17D23;
}

.sideCardTitle {
  font-size: 15px;
  font-weight: 700;
  color: #0E121B;
  margin: 0;
}

.sideCardBody {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ==================== ATTACHMENTS (SIDEBAR) ==================== */
.attachmentsList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attachmentItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #FAFBFC;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.attachmentItem:hover {
  background: #F5F5F5;
  border-color: #A17D23;
}

.attachmentActions {
  display: flex;
  gap: 8px;
  margin-right: auto;
}

.actionBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 6px;
  color: #A17D23;
  cursor: pointer;
  transition: all 0.2s ease;
}

.actionBtn:hover {
  background: #FFF8ED;
  border-color: #A17D23;
}

.noAttachments {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #717784;
  gap: 8px;
}

.noAttachments i {
  font-size: 32px;
  color: #E1E4EA;
}

.noAttachments span {
  font-size: 14px;
}

/* Column attachments in detail row */
.columnAttachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  width: 100%;
}

.miniAttachment {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #F5F7FA;
  border: 1px solid #E1E4EA;
  border-radius: 6px;
  font-size: 12px;
  color: #0E121B;
  cursor: pointer;
  transition: all 0.2s ease;
}

.miniAttachment:hover {
  background: #FFF8ED;
  border-color: #A17D23;
}

.miniAttachment i {
  font-size: 14px;
}

.miniAttachment span {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fileIconSmall {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
  border: 1px solid #E1E4EA;
  flex-shrink: 0;
}

.fileIconSmall i {
  font-size: 20px;
}

.fileInfo {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.fileNameSmall {
  font-size: 13px;
  color: #0E121B;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fileSizeSmall {
  font-size: 11px;
  color: #717784;
}

/* ==================== INFO ROWS (SIDEBAR) ==================== */
.infoRow {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.infoIcon {
  font-size: 16px;
  color: #A17D23;
  margin-top: 2px;
  flex-shrink: 0;
}

.infoContent {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.infoLabel {
  font-size: 12px;
  color: #717784;
  font-weight: 400;
}

.infoValue {
  font-size: 13px;
  color: #0E121B;
  font-weight: 500;
  line-height: 1.4;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 768px) {
  .container {
    padding: 16px 20px;
  }

  .pageHeader {
    margin-bottom: 24px;
    flex-direction: column;
    align-items: stretch;
  }
  
  .editBtn {
    margin-top: 0;
    width: 100%;
    justify-content: center;
  }

  .breadcrumb {
    font-size: 12px;
  }

  .pageTitle {
    font-size: 24px;
  }

  .titleRow {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .detailCard,
  .sideCard {
    padding: 16px;
  }
  
  .leftColumn {
    position: static;
  }

  .twoColumnLayout {
    gap: 16px;
  }
}

/* ==================== IMAGE PREVIEW MODAL ==================== */
.modalOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.previewModal {
  background: white;
  border-radius: 16px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.previewHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #E1E4EA;
  background: #FAFBFC;
}

.previewTitle {
  font-size: 16px;
  font-weight: 600;
  color: #0E121B;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.closeBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  color: #717784;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.closeBtn:hover {
  background: #FFF8ED;
  border-color: #A17D23;
  color: #A17D23;
}

.previewBody {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 200px;
  overflow: auto;
}

.previewLoading,
.previewError {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #717784;
  font-size: 14px;
}

.previewLoading i {
  font-size: 32px;
  color: #A17D23;
}

.previewError i {
  font-size: 32px;
  color: #D44333;
}

.previewError {
  color: #D44333;
}

.previewImage {
  max-width: 100%;
  max-height: calc(90vh - 100px);
  object-fit: contain;
  border-radius: 8px;
}
</style>
