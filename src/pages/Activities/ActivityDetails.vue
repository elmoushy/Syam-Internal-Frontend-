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

// Removed unused functions - attachments now shown in sidebar only
// const getColumnAttachments = (columnKey: string): ActivityAttachment[] => {
//   return attachments.value.filter(att => att.column_key === columnKey)
// }

// const columnHasAttachments = (columnKey: string): boolean => {
//   return attachments.value.some(att => att.column_key === columnKey)
// }

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
            <i class="fas fa-arrow-left"></i>
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
        
        <div :class="$style.headerLeft">
          <button v-if="!isSubmitted" :class="$style.editBtn" @click="handleEdit">
            <i class="fas fa-edit"></i>
            تعديل النشاط
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div :class="$style.mainContent">
        <!-- Two Column Layout -->
        <div :class="$style.twoColumnLayout">
          <!-- Right Column - Details -->
          <div :class="$style.rightColumn">
            <!-- Details Cards -->
            <div :class="$style.detailsContainer">
              <!-- المعلومات الأساسية -->
              <div :class="$style.detailCard">
                <div :class="$style.cardHeader">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.5026 1.66602H5.0026C4.56058 1.66602 4.13665 1.84161 3.82409 2.15417C3.51153 2.46673 3.33594 2.89065 3.33594 3.33268V16.666C3.33594 17.108 3.51153 17.532 3.82409 17.8445C4.13665 18.1571 4.56058 18.3327 5.0026 18.3327H15.0026C15.4446 18.3327 15.8686 18.1571 16.1811 17.8445C16.4937 17.532 16.6693 17.108 16.6693 16.666V5.83268L12.5026 1.66602Z" stroke="#A17D23" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M11.6641 1.66602V4.99935C11.6641 5.44138 11.8397 5.8653 12.1522 6.17786C12.4648 6.49042 12.8887 6.66602 13.3307 6.66602H16.6641" stroke="#A17D23" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8.33073 7.5H6.66406" stroke="#A17D23" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13.3307 10.834H6.66406" stroke="#A17D23" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13.3307 14.166H6.66406" stroke="#A17D23" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <h2 :class="$style.cardTitle">المعلومات الأساسية</h2>
                </div>
                
                <div :class="$style.cardBody">
                  <div :class="$style.infoGrid">
                    <div :class="$style.infoItem">
                      <span :class="$style.infoLabel">نوع النشاط</span>
                      <span :class="$style.infoValue">{{ getColumnValue('activity_type') || 'اجتماع تنسيقي' }}</span>
                    </div>
                    
                    <div :class="$style.infoItem">
                      <span :class="$style.infoLabel">القسم المستهدف</span>
                      <span :class="$style.infoValue">{{ getColumnValue('department') || 'قسم إدارة الأزمات والطوارئ' }}</span>
                    </div>
                    
                    <div :class="$style.infoItem">
                      <span :class="$style.infoLabel">نطاق النشاط</span>
                      <span :class="$style.infoValue">{{ getColumnValue('activity_scope') || 'محلي - على مستوى الإمارة' }}</span>
                    </div>
                    
                    <div :class="$style.infoItem">
                      <span :class="$style.infoLabel">نوع التمويل</span>
                      <span :class="$style.infoValue">{{ getColumnValue('funding_type') || 'تمويل حكومي' }}</span>
                    </div>
                    
                    <div :class="$style.infoItem">
                      <span :class="$style.infoLabel">مصدر النشاط</span>
                      <span :class="$style.infoValue">{{ getColumnValue('activity_source') || 'مبادرة داخلية - قسم التخطيط' }}</span>
                    </div>
                    
                    <div :class="$style.infoItem">
                      <span :class="$style.infoLabel">يوجد محضر اجتماع</span>
                      <span :class="[$style.infoValue, $style.greenText]">{{ getColumnValue('has_meeting_minutes') === 'true' ? 'نعم' : 'لا' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- المخرجات الرئيسية -->
              <div :class="$style.detailCard">
                <div :class="$style.cardHeader">
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M18.1708 8.33357C18.5513 10.2013 18.2801 12.1431 17.4023 13.8351C16.5245 15.527 15.0932 16.8669 13.347 17.6313C11.6009 18.3957 9.64545 18.5384 7.80684 18.0355C5.96823 17.5327 4.35758 16.4147 3.24349 14.8681C2.12939 13.3214 1.57919 11.4396 1.68464 9.53639C1.79009 7.63318 2.54482 5.82364 3.82297 4.40954C5.10111 2.99545 6.82541 2.06226 8.70831 1.76561C10.5912 1.46897 12.5189 1.82679 14.1699 2.7794" stroke="#A17D23" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.5 9.16732L10 11.6673L18.3333 3.33398" stroke="#A17D23" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

                  <h2 :class="$style.cardTitle">المخرجات الرئيسية</h2>
                </div>
                
                <div :class="$style.cardBody">
                  <p :class="$style.outputText">
                    {{ getColumnValue('outputs') || 'مراجعة شاملة لخطط الطوارئ الحالية وتحديث الإجراءات التشغيلية بما يتماشى مع أحدث المعايير الدولية، تحديد نقاط الضعف في الخطط الموجودة وأفراد التحسينات الرئيسية. إعداد تقرير مفصل بالتوصيات والإجراءات المطلوبة مع جدول زمني للتنفيذ.' }}
                  </p>
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
  background: white;
  padding: 16px 24px;
  border-radius: 16px;
  margin-bottom: 24px;
  border: 1px solid #E1E4EA;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 10px;
}

.headerLeft {
  display: flex;
  align-items: center;
}

.backBtn {
  display: inline-flex;
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
  white-space: nowrap;
  flex-shrink: 0;
  border-radius: 6px;
}

.backBtn:hover {
  background: #FFF8ED;
}

.backBtn i {
  font-size: 14px;
}

.pageTitle {
  font-size: 24px;
  font-weight: 600;
  color: #0E121B;
  margin: 0;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.statusBadge {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.statusDraft {
  background: #F2F5F8;
  color: #2B303B;
}

.statusSubmitted {
  background: #00A350;
  color: white;
}

.editBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
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

/* ==================== INFO GRID (2 columns layout) ==================== */
.infoGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px 20px;
}

.infoItem {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.infoLabel {
  font-size: 14px;
  color: #717784;
  font-weight: 400;
}

.infoValue {
  font-size: 14px;
  color: #0E121B;
  font-weight: 500;
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
    margin-bottom: 20px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 16px;
  }
  
  .headerRight {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .headerLeft {
    width: 100%;
  }
  
  .editBtn {
    width: 100%;
    justify-content: center;
  }

  .pageTitle {
    font-size: 20px;
  }

  .detailCard,
  .sideCard {
    padding: 16px;
  }
  
  .infoGrid {
    grid-template-columns: 1fr;
    gap: 20px;
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
