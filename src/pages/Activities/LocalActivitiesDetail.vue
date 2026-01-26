<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import SidePanel from '@/components/shared/SidePanel.vue'
import { userActivitiesService, type UserActivity, type UserActivitiesListResponse, type TitleColumn } from '@/services/activityService'

const route = useRoute()
const router = useRouter()

// Get the template ID from the route params
const templateId = computed(() => Number(route.params.id))

// Loading and error states
const isLoading = ref(false)
const isDeleting = ref(false)
const error = ref<string | null>(null)

// Data from API
const templateInfo = ref<{ id: number; name: string; description: string; is_active_title: boolean } | null>(null)
const sheetInfo = ref<{ id: number; name: string; is_submitted: boolean; submitted_at: string | null } | null>(null)
const activities = ref<UserActivity[]>([])
const columns = ref<TitleColumn[]>([])

// Computed: Check if template is active (allows adding/submitting)
const isTemplateActive = computed(() => templateInfo.value?.is_active_title ?? false)

// Pagination
const pagination = ref({
  page: 1,
  page_size: 20,
  total_count: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false
})

// Side panel state
const isPanelOpen = ref(false)
const selectedActivity = ref<UserActivity | null>(null)

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Load activities from API
const loadActivities = async (page: number = 1) => {
  if (!templateId.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    const response: UserActivitiesListResponse = await userActivitiesService.getActivities(
      templateId.value,
      page,
      pagination.value.page_size
    )
    
    templateInfo.value = response.template
    sheetInfo.value = response.sheet || null
    activities.value = response.activities
    columns.value = response.columns
    pagination.value = response.pagination
  } catch (err: any) {
    console.error('Failed to load activities:', err)
    error.value = err.response?.data?.error || 'فشل في تحميل الأنشطة'
  } finally {
    isLoading.value = false
  }
}

const handleCardClick = (activity: UserActivity) => {
  selectedActivity.value = activity
  isPanelOpen.value = true
}

const handleClosePanel = () => {
  isPanelOpen.value = false
  selectedActivity.value = null
}

const handleViewFullDetails = () => {
  if (selectedActivity.value) {
    router.push(`/activities/local/${templateId.value}/activity/${selectedActivity.value.id}`)
  }
}

const handleEditActivity = () => {
  if (!isTemplateActive.value) {
    Swal.fire({
      icon: 'warning',
      title: 'النموذج غير نشط',
      text: 'لا يمكن تعديل الأنشطة في نموذج غير نشط',
      confirmButtonText: 'حسناً'
    })
    return
  }
  if (selectedActivity.value && !selectedActivity.value.is_submitted) {
    router.push(`/activities/local/${templateId.value}/edit/${selectedActivity.value.id}`)
  }
}

const handleCreateNew = () => {
  console.log('Create new button clicked')
  console.log('Template ID:', templateId.value)
  console.log('Template info:', templateInfo.value)
  
  // Check if template is active
  if (!isTemplateActive.value) {
    Swal.fire({
      icon: 'warning',
      title: 'النموذج غير نشط',
      text: 'لا يمكن إضافة أنشطة إلى نموذج غير نشط',
      confirmButtonText: 'حسناً'
    })
    return
  }
  
  // Backend will validate if template is active/inactive
  router.push(`/activities/local/${templateId.value}/create`)
}

const handleEdit = (activityId: number) => {
  if (!isTemplateActive.value) {
    Swal.fire({
      icon: 'warning',
      title: 'النموذج غير نشط',
      text: 'لا يمكن تعديل الأنشطة في نموذج غير نشط',
      confirmButtonText: 'حسناً'
    })
    return
  }
  router.push(`/activities/local/${templateId.value}/edit/${activityId}`)
}

const handleDelete = async (activityId: number) => {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'تأكيد الحذف',
    text: 'هل أنت متأكد من حذف هذا النشاط؟',
    showCancelButton: true,
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#d33'
  })
  
  if (!result.isConfirmed) {
    return
  }
  
  isDeleting.value = true
  
  try {
    await userActivitiesService.deleteActivity(activityId)
    // Remove from local list
    activities.value = activities.value.filter(a => a.id !== activityId)
    // Update total count
    pagination.value.total_count = Math.max(0, pagination.value.total_count - 1)
  } catch (err: any) {
    console.error('Failed to delete activity:', err)
    error.value = err.response?.data?.error || 'فشل في حذف النشاط'
  } finally {
    isDeleting.value = false
  }
}

const goBack = () => {
  router.push('/activities/local')
}

// Pagination handlers
const goToPage = (page: number) => {
  if (page >= 1 && page <= pagination.value.total_pages) {
    loadActivities(page)
  }
}

// Get activity column value by key
const getColumnValue = (activity: UserActivity, colKey: string): string => {
  return activity.data?.[colKey] || ''
}

// Watch for route changes
watch(templateId, (newVal) => {
  if (newVal) {
    loadActivities()
  }
})

onMounted(() => {
  loadActivities()
})
</script>

<template>
  <div :class="$style.container">
    <!-- Inactive Template Banner -->
    <div v-if="templateInfo && !isTemplateActive" :class="$style.inactiveBanner">
      <i class="fas fa-lock"></i>
      <span>هذا النموذج غير نشط - للقراءة فقط، لا يمكن إضافة أو تقديم أنشطة</span>
    </div>

    <!-- Page Header -->
    <div :class="$style.pageHeader">
      <div :class="$style.breadcrumb">
        <span :class="$style.breadcrumbLink" @click="goBack">حصر الأنشطة</span>
        <span :class="$style.breadcrumbSeparator">/</span>
        <span :class="$style.breadcrumbCurrent">{{ templateInfo?.name || 'جاري التحميل...' }}</span>
        <span v-if="templateInfo && !isTemplateActive" :class="$style.inactiveTag">
          <i class="fas fa-lock"></i>
          غير نشط
        </span>
      </div>
      
      <!-- Only show create button if template is active -->
      <button 
        v-if="isTemplateActive"
        :class="$style.createNewBtn" 
        @click="handleCreateNew"
      >
        <i class="fas fa-plus"></i>
        إنشاء نشاط جديد
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" :class="$style.errorMessage">
      <i class="fas fa-exclamation-circle"></i>
      {{ error }}
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" :class="$style.loadingState">
      <i class="fas fa-spinner fa-spin"></i>
      <span>جاري تحميل الأنشطة...</span>
    </div>

    <!-- Activities Grid -->
    <div v-else :class="$style.mainContent">
      <!-- Empty State -->
      <div v-if="activities.length === 0" :class="$style.emptyState">
        <div :class="$style.emptyIcon"><i class="fas fa-folder-open"></i></div>
        <p :class="$style.emptyText">لا توجد أنشطة حالياً</p>
        <p v-if="isTemplateActive" :class="$style.emptyDesc">ابدأ بإنشاء نشاط جديد</p>
        <p v-else :class="$style.emptyDesc">هذا النموذج غير نشط - لا يمكن إضافة أنشطة</p>
        <button 
          v-if="isTemplateActive"
          :class="$style.createNewBtn" 
          @click="handleCreateNew"
        >
          <i class="fas fa-plus"></i>
          إنشاء نشاط جديد
        </button>
      </div>

      <div v-else :class="$style.activitiesGrid">
        <div 
          v-for="activity in activities" 
          :key="activity.id"
          :class="$style.activityCard"
          @click="handleCardClick(activity)"
        >
          <!-- Card Content -->
          <div :class="$style.cardBody">
            <div :class="$style.cardHeader">
              <h3 :class="$style.cardTitle">{{ activity.title }}</h3>
              <span 
                :class="[
                  $style.statusBadge,
                  activity.status === 'draft' ? $style.statusDraft : $style.statusSubmitted
                ]"
              >
                {{ activity.status === 'draft' ? 'مسودة' : 'تم التقديم' }}
              </span>
            </div>
            <p :class="$style.cardDesc">{{ activity.description || 'لا يوجد وصف' }}</p>
          </div>

          <!-- Card Footer -->
          <div :class="$style.cardFooter">
            <div :class="$style.cardDate">
              <i class="fas fa-clock"></i>
              {{ formatDate(activity.updated_at) }}
            </div>
            <div v-if="activity.status !== 'draft'" :class="$style.cardAuthor">
              <i class="fas fa-user"></i>
              {{ activity.author }}
            </div>
        
            <!-- Only show edit/delete actions for draft activities AND when template is active -->
            <div v-if="activity.status === 'draft' && isTemplateActive" :class="$style.cardActions">
              <button 
                :class="$style.actionBtn"
                @click.stop="handleEdit(activity.id)"
                title="تعديل"
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 0.5C21.4558 0.5 27.5 6.54416 27.5 14C27.5 21.4558 21.4558 27.5 14 27.5C6.54416 27.5 0.5 21.4558 0.5 14C0.5 6.54416 6.54416 0.5 14 0.5Z" fill="white"/>
                  <path d="M14 0.5C21.4558 0.5 27.5 6.54416 27.5 14C27.5 21.4558 21.4558 27.5 14 27.5C6.54416 27.5 0.5 21.4558 0.5 14C0.5 6.54416 6.54416 0.5 14 0.5Z" stroke="#F3D6A7"/>
                  <path d="M15.0312 18.9824H19.3291" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M14.4596 9.11747C14.9193 8.56814 15.7455 8.48758 16.3063 8.93788C16.3373 8.96231 17.3334 9.73614 17.3334 9.73614C17.9494 10.1085 18.1408 10.9002 17.76 11.5043C17.7398 11.5367 12.1082 18.581 12.1082 18.581C11.9208 18.8147 11.6364 18.9527 11.3325 18.956L9.17578 18.9831L8.68986 16.9264C8.62179 16.6372 8.68986 16.3335 8.87722 16.0997L14.4596 9.11747Z" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13.4141 10.4258L16.645 12.907" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              
              <button 
                :class="$style.actionBtn"
                @click.stop="handleDelete(activity.id)"
                title="حذف"
                :disabled="isDeleting"
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 0.5C21.4558 0.5 27.5 6.54416 27.5 14C27.5 21.4558 21.4558 27.5 14 27.5C6.54416 27.5 0.5 21.4558 0.5 14C0.5 6.54416 6.54416 0.5 14 0.5Z" fill="white"/>
                  <path d="M14 0.5C21.4558 0.5 27.5 6.54416 27.5 14C27.5 21.4558 21.4558 27.5 14 27.5C6.54416 27.5 0.5 21.4558 0.5 14C0.5 6.54416 6.54416 0.5 14 0.5Z" stroke="#FADBD7"/>
                  <path d="M11.5496 9C11.7551 8.53796 12.2134 8.24023 12.7191 8.24023H14.957C15.4628 8.24023 15.921 8.53796 16.1266 9L16.3975 9.60915C16.5003 9.84017 16.7294 9.98903 16.9823 9.98903H18.1836C18.7361 9.98903 19.184 10.4369 19.184 10.9894C19.184 11.5419 18.7361 11.9898 18.1836 11.9898H9.49258C8.94008 11.9898 8.49219 11.5419 8.49219 10.9894C8.49219 10.4369 8.94008 9.98903 9.49258 9.98903H10.6939C10.9467 9.98903 11.1759 9.84017 11.2786 9.60915L11.5496 9Z" stroke="#D44333" stroke-width="1.44" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M15.3477 14.4746H12.3359" stroke="#D44333" stroke-width="1.44" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M18.042 11.9902L17.5472 17.9983C17.4651 18.9942 16.6329 19.7607 15.6337 19.7607H12.0412C11.0419 19.7607 10.2097 18.9942 10.1277 17.9983L9.63281 11.9902" stroke="#D44333" stroke-width="1.44" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total_pages > 1" :class="$style.paginationContainer">
        <button 
          :class="$style.paginationBtn"
          :disabled="!pagination.has_prev"
          @click="goToPage(pagination.page - 1)"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
        
        <span :class="$style.paginationInfo">
          صفحة {{ pagination.page }} من {{ pagination.total_pages }}
        </span>
        
        <button 
          :class="$style.paginationBtn"
          :disabled="!pagination.has_next"
          @click="goToPage(pagination.page + 1)"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
      </div>
    </div>

    <!-- Side Panel -->
    <SidePanel 
      v-model:isOpen="isPanelOpen" 
      :title="selectedActivity?.title || 'تفاصيل النشاط'"
      @close="handleClosePanel"
    >
      <div v-if="selectedActivity" :class="$style.panelContent">
        <!-- Inactive Template Notice in Panel -->
        <div v-if="!isTemplateActive" :class="$style.panelInactiveNotice">
          <i class="fas fa-lock"></i>
          <span>النموذج غير نشط - للقراءة فقط</span>
        </div>

        <!-- Header Buttons -->
        <div :class="$style.headerButtons">
          <button :class="$style.viewFullBtn" @click="handleViewFullDetails">عرض التفاصيل الكاملة</button>
          <!-- Only show edit button if template is active AND activity not submitted -->
          <button 
            v-if="!selectedActivity.is_submitted && isTemplateActive"
            :class="$style.editBtn" 
            @click="handleEditActivity"
          >
            تعديل النشاط
          </button>
        </div>

        <!-- Activity Details Sections - Dynamic from columns -->
        <div :class="$style.detailsContainer">
          <!-- <template v-for="column in columns" :key="column.key">
            <div v-if="getColumnValue(selectedActivity, column.key)" :class="$style.detailSection">
              <h3 :class="$style.sectionTitle">{{ column.label }}</h3>
              <div :class="$style.detailItem">
                <span :class="$style.itemValue">{{ getColumnValue(selectedActivity, column.key) }}</span>
              </div>
            </div>
          </template> -->
          

               <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">ملخص النشاط</h3>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">القسم / الجهة المستهدفة</span>
              <span :class="$style.itemValue">{{ selectedActivity.author }}</span>
            </div>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">نطاق النشاط</span>
              <span :class="$style.itemValue">{{ formatDate(selectedActivity.created_at) }}</span>
            </div>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">الجهات المشاركة</span>
              <span :class="$style.itemValue">{{ formatDate(selectedActivity.updated_at) }}</span>
            </div>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">مصدر النشاط</span>
              <span :class="[$style.itemValue, selectedActivity.is_submitted ? $style.greenText : '']">
                {{ selectedActivity.is_submitted ? 'تم التقديم' : 'مسودة' }}
              </span>
              
            </div>
               <div :class="$style.detailItem">
              <span :class="$style.itemLabel">يوجد محضر اجتماع</span>
              <span :class="[$style.itemValue, selectedActivity.is_submitted ? $style.greenText : $style.redText]">
                {{ selectedActivity.is_submitted ? 'نعم' : 'لا' }}
              </span>
              
            </div>
          </div>

          <!-- Main Outputs Section -->
          <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">المخرجات الرئيسية</h3>
            <div :class="$style.outputContent">
              <p :class="$style.outputText">
                مراجعة شاملة لخطط الطوارئ الحالية وتحديث الإجراءات التشغيلية بها بتماشي مع أحدث المعايير الدولية. تحديد نقاط الضعف في الخطط الموجودة واقتراح التحسينات اللازمة. إعداد تقرير مفصل بالتوصيات والإجراءات المطلوبة مع جدول زمني للتنفيذ.
              </p>
              <a :class="$style.viewMoreLink">عرض المزيد</a>
            </div>
          </div>

          <!-- System Info Section -->
          <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">معلومات النظام</h3>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">أنشئ بواسطة</span>
              <span :class="$style.itemValue">{{ selectedActivity.author }}</span>
            </div>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">تاريخ الإنشاء</span>
              <span :class="$style.itemValue">{{ formatDate(selectedActivity.created_at) }}</span>
            </div>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">آخر تحديث</span>
              <span :class="$style.itemValue">{{ formatDate(selectedActivity.updated_at) }}</span>
            </div>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">الحالة</span>
              <span :class="[$style.itemValue, selectedActivity.is_submitted ? $style.greenText : '']">
                {{ selectedActivity.is_submitted ? 'تم التقديم' : 'مسودة' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SidePanel>
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

/* ==================== INACTIVE TEMPLATE BANNER ==================== */
.inactiveBanner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: #FFF3E0;
  border: 1px solid #FFB74D;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #E65100;
  font-size: 14px;
  font-weight: 600;
}

.inactiveBanner i {
  font-size: 18px;
}

.inactiveTag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #ff9800;
  color: white;
  font-size: 14px;
  font-weight: 600;
  border-radius: 20px;
  margin-right: 12px;
}

.inactiveTag i {
  font-size: 12px;
}

/* ==================== PAGE HEADER ==================== */
.pageHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 32px;
  font-weight: 400;
}

.breadcrumbLink {
  color: #A17D23;
  cursor: pointer;
  transition: all 0.2s ease;
}

.breadcrumbLink:hover {
  text-decoration: underline;
}

.breadcrumbSeparator {
  color: #999;
}

.breadcrumbCurrent {
  color: #121011;
  font-weight: 400;
}

.createNewBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #A17D23 0%, #8a6b1e 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(161, 125, 35, 0.25);
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
}

.createNewBtn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(161, 125, 35, 0.35);
}

.createNewBtn i {
  font-size: 14px;
}

/* ==================== MAIN CONTENT ==================== */
.mainContent {
  background: white;
  border-radius: 16px;
  padding: 24px;
  flex: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* ==================== ACTIVITIES GRID ==================== */
.activitiesGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .activitiesGrid {
    grid-template-columns: 1fr;
  }
}

.activityCard {
  position: relative;
  background: white;
  border: 0.5px solid #E1E4EA;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.activityCard:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* ==================== CARD HEADER ==================== */
.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.statusBadge {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.statusDraft {
  background: #F2F5F8;
  color: #2B303B;
  border: none;
}

.statusSubmitted {
  background: #00A350;
  color: #FFFFFF;
  border: none;
}

.cardActions {
  display: flex;
  gap: 8px;
}

.actionBtn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.actionBtn:hover {
  transform: scale(1.1);
}

.actionBtn svg {
  width: 28px;
  height: 28px;
}

/* ==================== CARD BODY ==================== */
.cardBody {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.cardTitle {
  font-size: 18px;
  font-weight: 700;
  color: #0E121B;
  margin: 0;
}

.cardDesc {
  font-size: 14px;
  color: #717784;
  line-height: 1.6;
  margin: 0;
}

/* ==================== CARD FOOTER ==================== */
.cardFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #E1E4EA;
  font-size: 13px;
  color: #717784;
}

.cardAuthor,
.cardDate {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cardAuthor i,
.cardDate i {
  font-size: 12px;
  color: #A17D23;
}

/* ==================== SIDE PANEL CONTENT ==================== */
.panelContent {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.panelInactiveNotice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #FFF3E0;
  border: 1px solid #FFB74D;
  border-radius: 10px;
  margin-bottom: 16px;
  color: #E65100;
  font-size: 13px;
  font-weight: 600;
}

.panelInactiveNotice i {
  font-size: 14px;
}

.headerButtons {
  display: flex;
  gap: 6px;
  margin-bottom: 24px;
}

.viewFullBtn,
.editBtn {
  flex: 1;
  padding: 12px 10px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  border: none;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
}

.viewFullBtn {
  background: #A17D23;
  color: white;
}

.viewFullBtn:hover {
  background: #8a6b1e;
}

.editBtn {
  background: white;
  color: #A17D23;
  border: 1px solid #A17D23;
}

.editBtn:hover {
  background: #FFF8ED;
}

.detailsContainer {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.detailSection {
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.detailSection:last-child {
  margin-bottom: 0;
}

.sectionTitle {
  font-size: 16px;
  font-weight: 700;
  color: #0E121B;
  margin: 0 0 16px 0;
}

.detailItem {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  border-bottom: 1px solid #F2F5F8;
  gap: 8px;
  padding-bottom: 14px;
  margin-bottom: 14px;
}

.detailItem:last-child {
  margin-bottom: 0;
  border-bottom: 0px;
  padding-bottom: 0;
}

.itemLabel {
  font-size: 13px;
  color: #717784;
  font-weight: 500;
}

.itemValue {
  font-size: 14px;
  color: #0E121B;
  line-height: 1.6;
}

.itemValue p {
  margin: 0;
}

.greenText {
  color: #00A350 !important;
  font-weight: 600;
}

.redText {
  color: #D44333 !important;
  font-weight: 600;
}

.viewMoreLink {
  color: #A17D23;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
}

.viewMoreLink:hover {
  text-decoration: underline;
}

.outputContent {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.outputText {
  font-size: 14px;
  color: #717784;
  line-height: 1.8;
  margin: 0;
  text-align: right;
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

/* ==================== EMPTY STATE ==================== */
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.emptyIcon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF8ED;
  border-radius: 50%;
  margin-bottom: 24px;
}

.emptyIcon i {
  font-size: 32px;
  color: #A17D23;
}

.emptyText {
  font-size: 18px;
  font-weight: 600;
  color: #0E121B;
  margin: 0 0 8px 0;
}

.emptyDesc {
  font-size: 14px;
  color: #717784;
  margin: 0 0 24px 0;
}

/* ==================== PAGINATION ==================== */
.paginationContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #E1E4EA;
}

.paginationBtn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #717784;
}

.paginationBtn:hover:not(:disabled) {
  background: #FFF8ED;
  border-color: #A17D23;
  color: #A17D23;
}

.paginationBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.paginationInfo {
  font-size: 14px;
  color: #717784;
}
</style>

