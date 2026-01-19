<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Get the sheet ID and activity ID from the route params
const sheetId = computed(() => route.params.id)
const activityId = computed(() => route.params.activityId)

// Mock data - replace with actual API call
const activity = ref({
  id: 1,
  title: 'ورش العمل - لمراجعة خطط الطوارئ',
  status: 'submitted',
  createdBy: 'أحمد محمد السعيدي',
  createdAt: '14 يناير 2026 - 3:45 مساءً',
  lastModified: '10 يناير 2026, 2:05 م',
  
  // Activity Details
  activityForum: 'قسم إدارة الأزمات والطوارئ',
  activityScope: 'محلي - على مستوى الإمارة',
  activitySource: 'مبادرة داخلية - قسم التخطيط',
  participatingEntities: [
    'قسم إدارة الأزمات والطوارئ',
    'قسم التخطيط الاستراتيجي',
    'قسم العمليات',
    'إدارة الجودة الشاملة'
  ],
  
  // Meeting Info
  hasMeetingMinutes: true,
  meetingDate: '10 يناير 2026',
  meetingTime: '3:45 مساءً',
  meetingTemplate: 'قالب الاجتماعات التنفيذية - نسخة 2.0',
  
  // Main Outputs
  mainOutputs: 'مراجعة شاملة لخطط الطوارئ الحالية وتحديث الإجراءات التشغيلية بما يتماشى مع أحدث المعايير الدولية. تحديد نقاط الضعف في الخطط الموجودة واقتراح التحسينات اللازمة. إعداد تقرير مفصل بالتوصيات والإجراءات المطلوبة مع جدول زمني للتنفيذ. مراجعة شاملة لخطط الطوارئ الحالية وتحديث الإجراءات التشغيلية بما يتماشى مع أحدث المعايير الدولية. تحديد نقاط الضعف في الخطط الموجودة واقتراح التحسينات اللازمة.',
  
  // Attachments
  attachments: [
    { name: 'خطط_الطوارئ_2026.pdf', type: 'PDF', size: '2.4 MB' },
    { name: 'جدول_الاجتماع.docx', type: 'DOCX', size: '124 KB' },
    { name: 'عرض_تقديمي.pptx', type: 'PPTX', size: '5.8 MB' }
  ]
})

const goBack = () => {
  router.push(`/activities/local/${sheetId.value}`)
}

const handleEdit = () => {
  console.log('Edit activity:', activityId.value)
  // Navigate to edit page
}

const handleDownload = (attachment: any) => {
  console.log('Download attachment:', attachment.name)
}

onMounted(() => {
  // Load activity details
  console.log('Loading activity:', activityId.value, 'from sheet:', sheetId.value)
})
</script>

<template>
  <div :class="$style.container">
    <!-- Page Header -->
    <div :class="$style.pageHeader">
      <div :class="$style.headerRight">
        <button :class="$style.backBtn" @click="goBack">
          <i class="fas fa-arrow-right"></i>
          رجوع
        </button>
        
        <h1 :class="$style.pageTitle">{{ activity.title }}</h1>
        
        <span 
          :class="[
            $style.statusBadge,
            activity.status === 'draft' ? $style.statusDraft : $style.statusSubmitted
          ]"
        >
          {{ activity.status === 'draft' ? 'مسودة' : 'تم التقديم' }}
        </span>
      </div>
      
      <button :class="$style.editBtn" @click="handleEdit">
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
            <!-- المعلومات الأساسية -->
            <div :class="$style.detailCard">
              <div :class="$style.cardHeader">
                <i class="fas fa-file-alt" :class="$style.cardIcon"></i>
                <h2 :class="$style.cardTitle">المعلومات الأساسية</h2>
              </div>
              
              <div :class="$style.cardBody">
                <div :class="$style.detailRow">
                  <span :class="$style.label">القسم المستودع</span>
                  <span :class="$style.value">{{ activity.activityForum }}</span>
                </div>
                
                <div :class="$style.detailRow">
                  <span :class="$style.label">نوع النشاط</span>
                  <span :class="$style.value">اجتماع تنسيقي</span>
                </div>
                
                <div :class="$style.detailRow">
                  <span :class="$style.label">نطاق النشاط</span>
                  <span :class="$style.value">{{ activity.activityScope }}</span>
                </div>
                
                <div :class="$style.detailRow">
                  <span :class="$style.label">مصدر النشاط</span>
                  <span :class="$style.value">{{ activity.activitySource }}</span>
                </div>
                
                <div :class="$style.detailRow">
                  <span :class="$style.label">يوجد محضر اجتماع</span>
                  <span :class="[$style.value, $style.greenText]">نعم</span>
                </div>
              </div>
            </div>

            <!-- الجهات المشاركة -->
            <div :class="$style.detailCard">
              <div :class="$style.cardHeader">
                <i class="fas fa-users" :class="$style.cardIcon"></i>
                <h2 :class="$style.cardTitle">الجهات المشاركة</h2>
              </div>
              
              <div :class="$style.cardBody">
                <div :class="$style.tagsList">
                  <span 
                    v-for="(entity, index) in activity.participatingEntities" 
                    :key="index"
                    :class="$style.tag"
                  >
                    {{ entity }}
                  </span>
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
                  <span :class="$style.value">{{ activity.createdBy }}</span>
                </div>
                
                <div :class="$style.detailRow">
                  <span :class="$style.label">تاريخ الإنشاء</span>
                  <span :class="$style.value">{{ activity.createdAt }}</span>
                </div>
                
                <div :class="$style.detailRow">
                  <span :class="$style.label">آخر تحديث</span>
                  <span :class="$style.value">{{ activity.lastModified }}</span>
                </div>
              </div>
            </div>

            <!-- المخرجات الرئيسية -->
            <div :class="$style.detailCard">
              <div :class="$style.cardHeader">
                <i class="fas fa-check-circle" :class="$style.cardIcon"></i>
                <h2 :class="$style.cardTitle">المخرجات الرئيسية</h2>
              </div>
              
              <div :class="$style.cardBody">
                <p :class="$style.outputText">{{ activity.mainOutputs }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Left Column - Attachments and System Info -->
        <div :class="$style.leftColumn">
          <!-- المرفقات -->
          <div :class="$style.sideCard">
            <div :class="$style.sideCardHeader">
              <i class="fas fa-paperclip"></i>
              <h3 :class="$style.sideCardTitle">المرفقات</h3>
            </div>
            
            <div :class="$style.attachmentsList">
              <div 
                v-for="(attachment, index) in activity.attachments" 
                :key="index"
                :class="$style.attachmentItem"
                @click="handleDownload(attachment)"
              >
                <div :class="$style.fileIconSmall">
                  <i 
                    :class="[
                      'fas',
                      attachment.type === 'PDF' ? 'fa-file-pdf' : 
                      attachment.type === 'DOCX' ? 'fa-file-word' : 
                      'fa-file-powerpoint'
                    ]"
                    :style="{
                      color: attachment.type === 'PDF' ? '#D44333' : 
                             attachment.type === 'DOCX' ? '#2B579A' : 
                             '#D24726'
                    }"
                  ></i>
                </div>
                <div :class="$style.fileInfo">
                  <span :class="$style.fileNameSmall">{{ attachment.name }}</span>
                  <span :class="$style.fileSizeSmall">{{ attachment.type }} • {{ attachment.size }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- معلومات الاجتماع -->
          <div :class="$style.sideCard">
            <div :class="$style.sideCardHeader">
              <i class="fas fa-calendar-alt"></i>
              <h3 :class="$style.sideCardTitle">معلومات النظام</h3>
            </div>
            
            <div :class="$style.sideCardBody">
              <div :class="$style.infoRow">
                <i class="fas fa-user" :class="$style.infoIcon"></i>
                <div :class="$style.infoContent">
                  <span :class="$style.infoLabel">أنشئ بواسطة</span>
                  <span :class="$style.infoValue">{{ activity.createdBy }}</span>
                </div>
              </div>
              
              <div :class="$style.infoRow">
                <i class="fas fa-calendar" :class="$style.infoIcon"></i>
                <div :class="$style.infoContent">
                  <span :class="$style.infoLabel">تاريخ الإنشاء</span>
                  <span :class="$style.infoValue">{{ activity.meetingDate }}</span>
                </div>
              </div>
              
              <div :class="$style.infoRow">
                <i class="fas fa-clock" :class="$style.infoIcon"></i>
                <div :class="$style.infoContent">
                  <span :class="$style.infoLabel">آخر تحديث</span>
                  <span :class="$style.infoValue">{{ activity.meetingTime }}</span>
                </div>
              </div>
              
              <div :class="$style.infoRow">
                <i class="fas fa-file-alt" :class="$style.infoIcon"></i>
                <div :class="$style.infoContent">
                  <span :class="$style.infoLabel">القالب المستخدم</span>
                  <span :class="$style.infoValue">{{ activity.meetingTemplate }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
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
  cursor: pointer;
}

.attachmentItem:hover {
  background: #F5F5F5;
  border-color: #A17D23;
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
</style>
