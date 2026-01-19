<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SidePanel from '@/components/shared/SidePanel.vue'

const route = useRoute()
const router = useRouter()

// Get the sheet ID from the route params
const sheetId = computed(() => route.params.id)

// Mock data - replace with actual API call
const sheetName = ref('ورش العمل')
const activities = ref([
  {
    id: 1,
    title: 'اجتماع',
    description: 'اجتماع مناقشة ملف مينا قيرس طاوارى وأزمات المواد الخطرة في جائزة مؤسسة الإمارات للطاقة النووية',
    author: 'أحمد محمد السعيدي',
    date: '10 يناير 2025, 2:05 م',
    status: 'submitted' // or 'draft'
  },
  {
    id: 2,
    title: 'أخرى',
    description: 'مقابلات توظيف ( قسم المعلومات / قسم البحث والتطوير)',
    author: 'كريم محمد',
    date: '10 يناير 2025, 5:05 م',
    status: 'draft'
  },
  {
    id: 3,
    title: 'اجتماع',
    description: 'اجتماع مناقشة ملف مينا قيرس طاوارى وأزمات المواد الخطرة في جائزة مؤسسة الإمارات للطاقة النووية',
    author: 'سامي محمد احمد',
    date: '10 يناير 2025, 5:05 م',
    status: 'submitted'
  },
  {
    id: 4,
    title: 'ورش العمل',
    description: 'اجتماع مناقشة ملف مينا قيرس طاوارى وأزمات المواد الخطرة في جائزة مؤسسة الإمارات للطاقة النووية',
    author: 'محمد ابراهيم',
    date: '10 يناير 2025, 5:05 م',
    status: 'draft'
  }
])

// Side panel state
const isPanelOpen = ref(false)
const selectedActivity = ref<any>(null)

const handleCardClick = (activity: any) => {
  selectedActivity.value = activity
  isPanelOpen.value = true
}

const handleClosePanel = () => {
  isPanelOpen.value = false
  selectedActivity.value = null
}

const handleViewFullDetails = () => {
  if (selectedActivity.value) {
    router.push(`/activities/local/${sheetId.value}/activity/${selectedActivity.value.id}`)
  }
}

const handleEditActivity = () => {
  if (selectedActivity.value) {
    console.log('Edit activity:', selectedActivity.value.id)
    // You can navigate to edit page or open edit modal here
  }
}

const handleCreateNew = () => {
  router.push(`/activities/local/${sheetId.value}/create`)
}

const handleEdit = (activityId: number) => {
  console.log('Edit activity:', activityId)
}

const handleDelete = (activityId: number) => {
  if (confirm('هل أنت متأكد من حذف هذا النشاط؟')) {
    activities.value = activities.value.filter(a => a.id !== activityId)
  }
}

const goBack = () => {
  router.push('/activities/local')
}

onMounted(() => {
  // Load activities for this sheet
  console.log('Loading activities for sheet:', sheetId.value)
})
</script>

<template>
  <div :class="$style.container">
    <!-- Page Header -->
    <div :class="$style.pageHeader">
      <div :class="$style.breadcrumb">
        <span :class="$style.breadcrumbLink" @click="goBack">حصر الأنشطة</span>
        <span :class="$style.breadcrumbSeparator">/</span>
        <span :class="$style.breadcrumbCurrent">{{ sheetName }}</span>
      </div>
      
      <button :class="$style.createNewBtn" @click="handleCreateNew">
        <i class="fas fa-plus"></i>
        إنشاء نشاط جديد
      </button>
    </div>

    <!-- Activities Grid -->
    <div :class="$style.mainContent">
      <div :class="$style.activitiesGrid">
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
            <p :class="$style.cardDesc">{{ activity.description }}</p>
          </div>

          <!-- Card Footer -->
          <div :class="$style.cardFooter">
                <div :class="$style.cardDate">
              <i class="fas fa-clock"></i>
              {{ activity.date }}
            </div>
            <div v-if="activity.status !== 'draft'" :class="$style.cardAuthor">
              <i class="fas fa-user"></i>
              {{ activity.author }}
            </div>
        
              
            <div v-if="activity.status === 'draft'" :class="$style.cardActions">
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
    </div>

    <!-- Side Panel -->
    <SidePanel 
      v-model:isOpen="isPanelOpen" 
      :title="selectedActivity?.title || 'ورش عمل'"
      @close="handleClosePanel"
    >
      <div v-if="selectedActivity" :class="$style.panelContent">
        <!-- Header Buttons -->
        <div :class="$style.headerButtons">
          <button :class="$style.viewFullBtn" @click="handleViewFullDetails">عرض التفاصيل الكاملة</button>
          <button :class="$style.editBtn" @click="handleEditActivity">تعديل النشاط</button>
        </div>

        <!-- Activity Details Sections -->
        <div :class="$style.detailsContainer">
          <!-- Section 1: منتدى النشاط -->
          <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">منتدى النشاط</h3>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">القسم / الجهة المستودعة</span>
              <span :class="$style.itemValue">قسم إدارة الأزمات والطوارئ</span>
            </div>
          </div>

          <!-- Section 2: نطاق النشاط -->
          <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">نطاق النشاط</h3>
            <div :class="$style.detailItem">
              <span :class="$style.itemValue">محلي - على مستوى الإمارة</span>
            </div>
          </div>

          <!-- Section 3: إدارة جوانب المواد الخطرة -->
          <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">إدارة جوانب المواد الخطرة</h3>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">الجهات المشاركة</span>
              <span :class="$style.itemValue">{{ selectedActivity.description }}</span>
            </div>
          </div>

          <!-- Section 4: مبادرة داخلية - قسم التخطيط -->
          <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">مبادرة داخلية - قسم التخطيط</h3>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">مصدر النشاط</span>
              <span :class="$style.itemValue">مبادرة داخلية - قسم التخطيط</span>
            </div>
          </div>

          <!-- Section 5: يوجد محضر اجتماع -->
          <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">يوجد محضر اجتماع</h3>
            <div :class="$style.detailItem">
              <span :class="[$style.itemValue, $style.greenText]">نعم</span>
            </div>
          </div>

          <!-- Section 6: معلومات النظام -->
          <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">معلومات النظام</h3>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">أنشئ بواسطة</span>
              <span :class="$style.itemValue">{{ selectedActivity.author }}</span>
            </div>
            <div :class="$style.detailItem">
              <span :class="$style.itemLabel">تاريخ الإنشاء</span>
              <span :class="$style.itemValue">{{ selectedActivity.date }}</span>
            </div>
          </div>

          <!-- Section 7: المخرجات الرئيسية -->
          <div :class="$style.detailSection">
            <h3 :class="$style.sectionTitle">المخرجات الرئيسية</h3>
            <div :class="$style.detailItem">
              <p :class="$style.itemValue">
                مراجعة شاملة لخطط الطوارئ الحالية وتحديث الإجراءات التشغيلية بما يتماشى مع أحدث المعايير الدولية. تحديد نقاط الضعف في الخطط الموجودة واقتراح التحسينات اللازمة. إعداد تقرير مفصل بالتوصيات والإجراءات المطلوبة مع جدول زمني للتنفيذ.
              </p>
              <a href="#" :class="$style.viewMoreLink">عرض المزيد</a>
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
  background: #FFF8ED;
  color: #A17D23;
  border: 1px solid #F3D6A7;
}

.statusSubmitted {
  background: #E8F5E9;
  color: #2E7D32;
  border: 1px solid #A5D6A7;
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
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.detailItem:last-child {
  margin-bottom: 0;
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
  color: #2E7D32 !important;
  font-weight: 600;
}

.viewMoreLink {
  color: #A17D23;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  margin-top: 8px;
  display: inline-block;
}

.viewMoreLink:hover {
  text-decoration: underline;
}
</style>

