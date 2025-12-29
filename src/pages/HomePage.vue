<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/useAppStore'
import NewsSlider from '../components/news/NewsSlider.vue'
import { surveyService } from '../services/surveyService'
import type { SharedSurvey } from '../types/survey.types'

// Store for theme
const store = useAppStore()
const { currentTheme, currentLanguage } = storeToRefs(store)
const isRTL = computed(() => currentLanguage.value === 'ar')
const router = useRouter()

// Surveys state
const surveys = ref<SharedSurvey[]>([])
const isLoadingSurveys = ref(false)

// Fetch latest 3 surveys
const fetchLatestSurveys = async () => {
  try {
    isLoadingSurveys.value = true
    const response = await surveyService.getMySharedSurveys({
      page: 1,
      page_size: 3
    })
    
    // Handle paginated response
    if (response && 'results' in response) {
      surveys.value = response.results.slice(0, 3)
    }
  } catch (err) {
    console.error('Failed to load surveys:', err)
  } finally {
    isLoadingSurveys.value = false
  }
}

// Check if user can take survey
const canTakeSurvey = (survey: SharedSurvey): boolean => {
  if (!survey.is_active || survey.is_locked) return false
  if (survey.access_info.has_submitted) return false
  return true
}

// Navigate to survey
const takeSurvey = (survey: SharedSurvey) => {
  if (canTakeSurvey(survey)) {
    router.push({ name: 'AuthSurveyTake', params: { id: survey.id } })
  }
}

// Navigate to all surveys page
const viewAllSurveys = () => {
  router.push({ name: 'Surveys' })
}

// Navigate to specific pages
const navigateToSurveys = () => {
  router.push({ name: 'Surveys' })
}

const navigateToNews = () => {
  router.push({ name: 'News' })
}

// Lifecycle
onMounted(() => {
  fetchLatestSurveys()
})
</script>

<template>
  <div :class="$style.homePage" :data-theme="currentTheme" :dir="isRTL ? 'rtl' : 'ltr'">
    <div :class="$style.container">
      <!-- Hero Section with Slider -->
      <section :class="$style.heroSection">
        <NewsSlider />
      </section>

      <!-- Services Section -->
      <section :class="$style.servicesSection">
        <h2 :class="$style.sectionTitle">جميع الخدمات</h2>
        
        <div :class="$style.servicesGrid">
          <!-- Service Card 1 - Surveys -->
          <div :class="[$style.serviceCard, $style.clickableCard]" @click="navigateToSurveys">
            <div :class="$style.serviceIcon">
              <i class="fas fa-poll"></i>
            </div>
            <h3 :class="$style.serviceTitle">الاستطلاعات</h3>
            <p :class="$style.serviceSubtitle">منصة الاستطلاعات والاستبيانات</p>
          </div>

          <!-- Service Card 2 - News -->
          <div :class="[$style.serviceCard, $style.clickableCard]" @click="navigateToNews">
            <div :class="$style.serviceIcon">
              <i class="fas fa-newspaper"></i>
            </div>
            <h3 :class="$style.serviceTitle">الأخبار</h3>
            <p :class="$style.serviceSubtitle">آخر الأخبار والإعلانات</p>
          </div>

          <!-- Service Card 3 - ERP -->
          <div :class="$style.serviceCard">
            <div :class="$style.serviceIcon">
              <i class="fas fa-sitemap"></i>
            </div>
            <h3 :class="$style.serviceTitle">Enterprise Resource Planning</h3>
            <p :class="$style.serviceSubtitle">برنامج إدارة الموارد</p>
            <span :class="$style.comingSoon">قريباً...</span>
          </div>

          <!-- Service Card 4 - Time & Attendance -->
          <div :class="$style.serviceCard">
            <div :class="$style.serviceIcon">
              <i class="fas fa-clock"></i>
            </div>
            <h3 :class="$style.serviceTitle">Time and Attendance</h3>
            <p :class="$style.serviceSubtitle">برنامج إدارة الحضور والانصراف</p>
            <span :class="$style.comingSoon">قريباً...</span>
          </div>

          <!-- Service Card 5 - Correspondence -->
          <div :class="$style.serviceCard">
            <div :class="$style.serviceIcon">
              <i class="fas fa-file-lines"></i>
            </div>
            <h3 :class="$style.serviceTitle">Enterprise Correspondence Management</h3>
            <p :class="$style.serviceSubtitle">منصة المراسلات والأرشفة</p>
            <span :class="$style.comingSoon">قريباً...</span>
          </div>

          <!-- Service Card 6 - Support -->
          <div :class="$style.serviceCard">
            <div :class="$style.serviceIcon">
              <i class="fas fa-headset"></i>
            </div>
            <h3 :class="$style.serviceTitle">Technical and Administrative Support Services</h3>
            <p :class="$style.serviceSubtitle">خدمة الدعم الفني والإداري</p>
            <span :class="$style.comingSoon">قريباً...</span>
          </div>

          <!-- Service Card 7 - AI -->
          <div :class="$style.serviceCard">
            <div :class="$style.serviceIcon">
              <i class="fas fa-brain"></i>
            </div>
            <h3 :class="$style.serviceTitle">Artificial Intelligence (AI)</h3>
            <p :class="$style.serviceSubtitle">منصة الذكاء الاصطناعي</p>
            <span :class="$style.comingSoon">قريباً...</span>
          </div>
        </div>
      </section>

    <!-- Latest Surveys Section -->
    <section :class="$style.surveysSection">
      <div :class="$style.sectionHeader">
        <h2 :class="$style.sectionTitle">احدث الاستطلاعات</h2>
        <button :class="$style.viewAllButton" @click="viewAllSurveys">
          <span>عرض جميع الاستطلاعات</span>
          <i class="fas fa-arrow-left"></i>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingSurveys" :class="$style.loadingGrid">
        <div v-for="i in 3" :key="i" :class="$style.skeletonCard"></div>
      </div>

      <!-- Surveys Grid -->
      <div v-else-if="surveys.length > 0" :class="$style.latestSurveysGrid">
        <div 
          v-for="survey in surveys" 
          :key="survey.id" 
          :class="[$style.surveyCard, { [$style.nonClickable]: !canTakeSurvey(survey) && !survey.access_info.has_submitted }]"
          @click="canTakeSurvey(survey) || survey.access_info.has_submitted ? takeSurvey(survey) : null"
        >
          <div :class="$style.cardHeader">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="44" height="44" rx="22" fill="#F5F7FA"/>
              <path d="M13 20C13 16.2288 13 14.3431 14.1716 13.1716C15.3431 12 17.2288 12 21 12H23C26.7712 12 28.6569 12 29.8284 13.1716C31 14.3431 31 16.2288 31 20V24C31 27.7712 31 29.6569 29.8284 30.8284C28.6569 32 26.7712 32 23 32H21C17.2288 32 15.3431 32 14.1716 30.8284C13 29.6569 13 27.7712 13 24V20Z" stroke="#A17D23" stroke-width="1.5"/>
              <path d="M18 20H26" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M18 24H23" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <div :class="$style.cardTitle">{{ survey.title }}</div>
          </div>
          
          <p :class="$style.cardDescription">{{ survey.description || 'لا يوجد وصف' }}</p>
          
          <div :class="$style.cardDivider"></div>
          
          <div :class="$style.cardContent">
            <div :class="$style.cardChips">
              <div :class="$style.chip">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M7.99967 0.833374C6.25077 0.833374 4.83301 2.25114 4.83301 4.00004C4.83301 5.74894 6.25077 7.16671 7.99967 7.16671C9.74858 7.16671 11.1663 5.74894 11.1663 4.00004C11.1663 2.25114 9.74858 0.833374 7.99967 0.833374ZM5.83301 4.00004C5.83301 2.80342 6.80306 1.83337 7.99967 1.83337C9.19629 1.83337 10.1663 2.80342 10.1663 4.00004C10.1663 5.19666 9.19629 6.16671 7.99967 6.16671C6.80306 6.16671 5.83301 5.19666 5.83301 4.00004Z" fill="#717784"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M7.99967 8.16671C6.64012 8.16671 5.38469 8.48054 4.45177 9.01363C3.53301 9.53864 2.83301 10.3401 2.83301 11.3334C2.83301 12.3266 3.53301 13.1281 4.45177 13.6531C5.38469 14.1862 6.64012 14.5 7.99967 14.5C9.35923 14.5 10.6147 14.1862 11.5476 13.6531C12.4663 13.1281 13.1663 12.3266 13.1663 11.3334C13.1663 10.3401 12.4663 9.53864 11.5476 9.01363C10.6147 8.48054 9.35923 8.16671 7.99967 8.16671ZM3.83301 11.3334C3.83301 10.8539 4.17768 10.322 4.94791 9.88188C5.704 9.44983 6.7819 9.16671 7.99967 9.16671C9.21745 9.16671 10.2953 9.44983 11.0514 9.88188C11.8217 10.322 12.1663 10.8539 12.1663 11.3334C12.1663 11.8129 11.8217 12.3447 11.0514 12.7849C10.2953 13.2169 9.21745 13.5 7.99967 13.5C6.7819 13.5 5.704 13.2169 4.94791 12.7849C4.17768 12.3447 3.83301 11.8129 3.83301 11.3334Z" fill="#717784"/>
                </svg>
                <span>أنشئ بواسطة: {{ survey.creator.name || survey.creator.email }}</span>
              </div>
              
              <div :class="$style.chip">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.25 7.5C1.25 4.55372 1.25 3.08058 2.16529 2.16529C3.08058 1.25 4.55372 1.25 7.5 1.25C10.4463 1.25 11.9194 1.25 12.8347 2.16529C13.75 3.08058 13.75 4.55372 13.75 7.5C13.75 10.4463 13.75 11.9194 12.8347 12.8347C11.9194 13.75 10.4463 13.75 7.5 13.75C4.55372 13.75 3.08058 13.75 2.16529 12.8347C1.25 11.9194 1.25 10.4463 1.25 7.5Z" stroke="#717784" stroke-width="0.9375"/>
                  <path d="M6.32812 5.54688C6.32812 4.89967 6.85279 4.375 7.5 4.375C8.14721 4.375 8.67188 4.89967 8.67188 5.54688C8.67188 5.97653 8.44065 6.35218 8.09585 6.55617C7.79877 6.73194 7.5 6.99857 7.5 7.34375V8.125" stroke="#717784" stroke-width="0.9375" stroke-linecap="round"/>
                  <circle cx="7.5" cy="10" r="0.625" fill="#717784"/>
                </svg>
                <span>{{ survey.questions_count }} سؤال</span>
              </div>
            </div>
          </div>
          
          <div :class="$style.cardActions">
            <button 
              v-if="canTakeSurvey(survey)" 
              :class="[$style.actionButton, $style.primary]"
              @click.stop="takeSurvey(survey)"
            >
              <i class="fas fa-play"></i>
              بدء الاستطلاع
            </button>
            
            <button 
              v-else-if="survey.access_info.has_submitted" 
              :class="[$style.actionButton, $style.completed]"
              disabled
            >
              <i class="fas fa-check"></i>
              تم الإرسال
            </button>
            
            <button 
              v-else 
              :class="[$style.actionButton, $style.disabled]"
              disabled
            >
              <i class="fas fa-eye"></i>
              عرض فقط
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else :class="$style.emptyState">
        <p>لا توجد استطلاعات متاحة حالياً</p>
      </div>
    </section>
    </div>
  </div>
</template>

<style module>
.homePage {
  min-height: 100vh;
  background: #F8FAFC;
  padding: 40px 20px;
  direction: rtl;
}

.homePage[data-theme="night"] {
  background: #0F172A;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.heroSection {
  width: 100%;
  margin-bottom: 60px;
}

/* Services Section */
.servicesSection {
  width: 100%;
  padding: 60px 0;
}

.sectionTitle {
  font-size: 32px;
  font-weight: 700;
  color: #0F172A;
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: -0.5px;
}

.homePage[data-theme="night"] .sectionTitle {
  color: #F8FAFC;
}

.servicesGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.serviceCard {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
}

.serviceCard:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(161, 125, 35, 0.15);
}

.clickableCard {
  cursor: pointer;
}

.clickableCard:hover {
  background: linear-gradient(135deg, rgba(183, 138, 65, 0.05), rgba(161, 125, 35, 0.05));
}

.homePage[data-theme="night"] .clickableCard:hover {
  background: linear-gradient(135deg, rgba(201, 168, 76, 0.1), rgba(183, 138, 65, 0.08));
}

.homePage[data-theme="night"] .serviceCard {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(248, 250, 252, 0.08);
}

.homePage[data-theme="night"] .serviceCard:hover {
  background: rgba(30, 41, 59, 0.8);
  box-shadow: 0 12px 40px rgba(201, 168, 76, 0.2);
}

.serviceIcon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #B78A41, #A17D23);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(161, 125, 35, 0.25);
}

.serviceIcon i {
  font-size: 32px;
  color: #FFFFFF;
}

.serviceTitle {
  font-size: 18px;
  font-weight: 600;
  color: #0F172A;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.homePage[data-theme="night"] .serviceTitle {
  color: #F8FAFC;
}

.serviceSubtitle {
  font-size: 16px;
  font-weight: 500;
  color: #64748B;
  margin: 0;
  line-height: 1.6;
}

.homePage[data-theme="night"] .serviceSubtitle {
  color: #94A3B8;
}

.comingSoon {
  display: inline-block;
  margin-top: 16px;
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(161, 125, 35, 0.15), rgba(183, 138, 65, 0.1));
  color: #A17D23;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid rgba(161, 125, 35, 0.2);
}

.homePage[data-theme="night"] .comingSoon {
  background: linear-gradient(135deg, rgba(201, 168, 76, 0.2), rgba(212, 168, 85, 0.15));
  color: #C9A84C;
  border-color: rgba(201, 168, 76, 0.3);
}

/* Latest Surveys Section */
.surveysSection {
  width: 100%;
  padding: 60px 0;
}

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40px;
}

.viewAllButton {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #B78A41, #A17D23);
  color: white;
  border: none;
  padding: 12px 28px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(161, 125, 35, 0.25);
}

.viewAllButton:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(161, 125, 35, 0.35);
}

.viewAllButton i {
  font-size: 14px;
}

.homePage[data-theme="night"] .viewAllButton {
  background: linear-gradient(135deg, #C9A84C, #B78A41);
}

.loadingGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.skeletonCard {
  height: 320px;
  background: linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%);
  background-size: 200% 100%;
  border-radius: 20px;
  animation: shimmer 1.5s infinite;
}

.homePage[data-theme="night"] .skeletonCard {
  background: linear-gradient(90deg, rgba(30, 41, 59, 0.6) 25%, rgba(30, 41, 59, 0.8) 50%, rgba(30, 41, 59, 0.6) 75%);
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.latestSurveysGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.surveyCard {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  border: 1px solid transparent;
}

.surveyCard:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(161, 125, 35, 0.12);
  border-color: rgba(161, 125, 35, 0.1);
}

.surveyCard.nonClickable {
  cursor: not-allowed;
  opacity: 0.7;
}

.surveyCard.nonClickable:hover {
  transform: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.homePage[data-theme="night"] .surveyCard {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(248, 250, 252, 0.08);
}

.homePage[data-theme="night"] .surveyCard:hover {
  background: rgba(30, 41, 59, 0.8);
  box-shadow: 0 12px 40px rgba(201, 168, 76, 0.15);
  border-color: rgba(201, 168, 76, 0.2);
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: 14px;
}

.cardHeader svg rect {
  fill: #F5F7FA;
}

.homePage[data-theme="night"] .cardHeader svg rect {
  fill: rgba(248, 250, 252, 0.08);
}

.cardTitle {
  font-size: 18px;
  font-weight: 700;
  color: #0F172A;
  line-height: 1.4;
}

.homePage[data-theme="night"] .cardTitle {
  color: #F8FAFC;
}

.cardDescription {
  font-size: 14px;
  color: #64748B;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.homePage[data-theme="night"] .cardDescription {
  color: #94A3B8;
}

.cardDivider {
  height: 1px;
  background: #E2E8F0;
  margin: 4px 0;
}

.homePage[data-theme="night"] .cardDivider {
  background: rgba(248, 250, 252, 0.1);
}

.cardContent {
  flex: 1;
}

.cardChips {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748B;
}

.homePage[data-theme="night"] .chip {
  color: #94A3B8;
}

.chip svg {
  flex-shrink: 0;
}

.cardActions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.actionButton {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.actionButton.primary {
  background: linear-gradient(135deg, #B78A41, #A17D23);
  color: white;
  box-shadow: 0 4px 16px rgba(161, 125, 35, 0.25);
}

.actionButton.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(161, 125, 35, 0.35);
}

.homePage[data-theme="night"] .actionButton.primary {
  background: linear-gradient(135deg, #C9A84C, #B78A41);
}

.actionButton.completed {
  background: #10B981;
  color: white;
  cursor: not-allowed;
}

.actionButton.disabled {
  background: #E2E8F0;
  color: #94A3B8;
  cursor: not-allowed;
}

.homePage[data-theme="night"] .actionButton.disabled {
  background: rgba(248, 250, 252, 0.1);
  color: #64748B;
}

.emptyState {
  text-align: center;
  padding: 60px 20px;
  color: #64748B;
}

.homePage[data-theme="night"] .emptyState {
  color: #94A3B8;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .homePage {
    padding: 32px 16px;
  }
  
  .heroSection {
    margin-bottom: 48px;
  }

  .servicesSection {
    padding: 48px 0;
  }

  .sectionTitle {
    font-size: 28px;
    margin-bottom: 40px;
  }

  .servicesGrid {
    gap: 24px;
  }

  .serviceCard {
    padding: 40px 28px;
  }

  .surveysSection {
    padding: 48px 0;
  }

  .sectionHeader {
    margin-bottom: 32px;
  }

  .viewAllButton {
    padding: 10px 24px;
    font-size: 14px;
  }

  .latestSurveysGrid {
    gap: 20px;
  }

  .surveyCard {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .homePage {
    padding: 24px 12px;
  }
  
  .heroSection {
    margin-bottom: 40px;
  }

  .servicesSection {
    padding: 40px 0;
  }

  .sectionTitle {
    font-size: 24px;
    margin-bottom: 32px;
  }

  .servicesGrid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .serviceCard {
    padding: 36px 24px;
  }

  .serviceIcon {
    width: 70px;
    height: 70px;
  }

  .serviceIcon i {
    font-size: 28px;
  }

  .serviceTitle {
    font-size: 17px;
  }

  .serviceSubtitle {
    font-size: 15px;
  }

  .surveysSection {
    padding: 40px 0;
  }

  .sectionHeader {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 28px;
  }

  .viewAllButton {
    width: 100%;
    justify-content: center;
  }

  .latestSurveysGrid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .surveyCard {
    padding: 20px;
  }

  .cardTitle {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .homePage {
    padding: 20px 8px;
  }
  
  .heroSection {
    margin-bottom: 32px;
  }

  .servicesSection {
    padding: 32px 0;
  }

  .sectionTitle {
    font-size: 22px;
    margin-bottom: 28px;
  }

  .servicesGrid {
    gap: 16px;
  }

  .serviceCard {
    padding: 32px 20px;
  }

  .serviceIcon {
    width: 60px;
    height: 60px;
  }

  .serviceIcon i {
    font-size: 24px;
  }

  .serviceTitle {
    font-size: 16px;
  }

  .serviceSubtitle {
    font-size: 14px;
  }

  .comingSoon {
    font-size: 13px;
    padding: 5px 14px;
  }

  .surveysSection {
    padding: 32px 0;
  }

  .sectionTitle {
    font-size: 20px;
  }

  .viewAllButton {
    padding: 10px 20px;
    font-size: 13px;
  }
}

/* RTL Support */
.homePage[dir="ltr"] {
  direction: ltr;
}
</style>
