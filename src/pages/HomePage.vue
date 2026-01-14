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
        <div :class="$style.sectionHeader">
          <h2 :class="$style.sectionTitle">جميع الخدمات</h2>
        </div>
        
        <div :class="$style.servicesGrid">
          <!-- Row 1 - 3 Services -->
          <!-- Service Card 1 - Surveys (Clickable) -->
          <div :class="$style.serviceCard" @click="navigateToSurveys">
            <div :class="$style.serviceIconWrapper">
              <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="49" height="49" rx="24.5" fill="#A17D23"/>
                <path d="M16.3333 22.3333C16.3333 19.2876 16.3333 17.7648 17.2323 16.799C18.1313 15.8333 19.5624 15.8333 22.4247 15.8333H24.3413C27.2036 15.8333 28.6348 15.8333 29.5337 16.799C30.4327 17.7648 30.4327 19.2876 30.4327 22.3333V25.6667C30.4327 28.7124 30.4327 30.2352 29.5337 31.201C28.6348 32.1667 27.2036 32.1667 24.3413 32.1667H22.4247C19.5624 32.1667 18.1313 32.1667 17.2323 31.201C16.3333 30.2352 16.3333 28.7124 16.3333 25.6667V22.3333Z" stroke="white" stroke-width="1.5"/>
                <path d="M20.5 22.3333H26.2663" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20.5 25.6667H24.3497" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div :class="$style.serviceInfo">
              <h3 :class="$style.serviceTitle">الاستطلاعات</h3>
              <p :class="$style.serviceDescription">منصة الاستطلاعات والاستبيانات</p>
            </div>
          </div>

          <!-- Service Card 2 - News (Clickable) -->
          <div :class="$style.serviceCard" @click="navigateToNews">
            <div :class="$style.serviceIconWrapper">
              <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="49" height="49" rx="24.5" fill="#A17D23"/>
                <path d="M16.3333 22.3333C16.3333 19.2876 16.3333 17.7648 17.2323 16.799C18.1313 15.8333 19.5624 15.8333 22.4247 15.8333H24.3413C27.2036 15.8333 28.6348 15.8333 29.5337 16.799C30.4327 17.7648 30.4327 19.2876 30.4327 22.3333V25.6667C30.4327 28.7124 30.4327 30.2352 29.5337 31.201C28.6348 32.1667 27.2036 32.1667 24.3413 32.1667H22.4247C19.5624 32.1667 18.1313 32.1667 17.2323 31.201C16.3333 30.2352 16.3333 28.7124 16.3333 25.6667V22.3333Z" stroke="white" stroke-width="1.5"/>
                <path d="M20.5 22.3333H26.2663" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20.5 25.6667H24.3497" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div :class="$style.serviceInfo">
              <h3 :class="$style.serviceTitle">الأخبار</h3>
              <p :class="$style.serviceDescription">آخر الأخبار والإعلانات</p>
            </div>
          </div>

          <!-- Service Card 3 - منظمة المرسلات والارشفة (Coming Soon) -->
          <div :class="$style.serviceCard">
            <div :class="$style.comingSoonBadge">قريبًا</div>
            <div :class="$style.serviceIconWrapper">
              <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="49" height="49" rx="24.5" fill="#A17D23"/>
                <path d="M16.3333 22.3333C16.3333 19.2876 16.3333 17.7648 17.2323 16.799C18.1313 15.8333 19.5624 15.8333 22.4247 15.8333H24.3413C27.2036 15.8333 28.6348 15.8333 29.5337 16.799C30.4327 17.7648 30.4327 19.2876 30.4327 22.3333V25.6667C30.4327 28.7124 30.4327 30.2352 29.5337 31.201C28.6348 32.1667 27.2036 32.1667 24.3413 32.1667H22.4247C19.5624 32.1667 18.1313 32.1667 17.2323 31.201C16.3333 30.2352 16.3333 28.7124 16.3333 25.6667V22.3333Z" stroke="white" stroke-width="1.5"/>
                <path d="M20.5 22.3333H26.2663" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20.5 25.6667H24.3497" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div :class="$style.serviceInfo">
              <h3 :class="$style.serviceTitle">منظمة المرسلات والارشفة</h3>
              <p :class="$style.serviceDescription">مركز التواصل</p>
            </div>
          </div>

          <!-- Service Card 2 - الدعم الفني والإداري (Coming Soon) -->
          <!-- <div :class="$style.serviceCard">
            <div :class="$style.serviceIconWrapper">
              <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="49" height="49" rx="24.5" fill="#A17D23"/>
                <path d="M16.3333 22.3333C16.3333 19.2876 16.3333 17.7648 17.2323 16.799C18.1313 15.8333 19.5624 15.8333 22.4247 15.8333H24.3413C27.2036 15.8333 28.6348 15.8333 29.5337 16.799C30.4327 17.7648 30.4327 19.2876 30.4327 22.3333V25.6667C30.4327 28.7124 30.4327 30.2352 29.5337 31.201C28.6348 32.1667 27.2036 32.1667 24.3413 32.1667H22.4247C19.5624 32.1667 18.1313 32.1667 17.2323 31.201C16.3333 30.2352 16.3333 28.7124 16.3333 25.6667V22.3333Z" stroke="white" stroke-width="1.5"/>
                <path d="M20.5 22.3333H26.2663" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20.5 25.6667H24.3497" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div :class="$style.serviceInfo">
              <h3 :class="$style.serviceTitle">الدعم الفني والإداري</h3>
              <p :class="$style.serviceDescription">مركز المساعدة الخاص بك</p>
            </div>
          </div> -->

          <!-- Service Card 3 - الحضور والانصراف (Coming Soon) -->
          <div :class="$style.serviceCard">
            <div :class="$style.comingSoonBadge">قريبًا</div>
            <div :class="$style.serviceIconWrapper">
              <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="49" height="49" rx="24.5" fill="#A17D23"/>
                <path d="M16.3333 22.3333C16.3333 19.2876 16.3333 17.7648 17.2323 16.799C18.1313 15.8333 19.5624 15.8333 22.4247 15.8333H24.3413C27.2036 15.8333 28.6348 15.8333 29.5337 16.799C30.4327 17.7648 30.4327 19.2876 30.4327 22.3333V25.6667C30.4327 28.7124 30.4327 30.2352 29.5337 31.201C28.6348 32.1667 27.2036 32.1667 24.3413 32.1667H22.4247C19.5624 32.1667 18.1313 32.1667 17.2323 31.201C16.3333 30.2352 16.3333 28.7124 16.3333 25.6667V22.3333Z" stroke="white" stroke-width="1.5"/>
                <path d="M20.5 22.3333H26.2663" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20.5 25.6667H24.3497" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div :class="$style.serviceInfo">
              <h3 :class="$style.serviceTitle">الحضور والانصراف</h3>
              <p :class="$style.serviceDescription">نظرة سريعة على حضورك اليومي</p>
            </div>
          </div>

          <!-- Row 2 - 2 Services (As per Figma design) -->
          <!-- Service Card 4 - الذكاء الاصطناعي (Coming Soon with Badge) -->
          <div :class="$style.serviceCard">
            <div :class="$style.comingSoonBadge">قريبًا</div>
            <div :class="$style.serviceIconWrapper">
              <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="49" height="49" rx="24.5" fill="#A17D23"/>
                <path d="M16.3333 22.3333C16.3333 19.2876 16.3333 17.7648 17.2323 16.799C18.1313 15.8333 19.5624 15.8333 22.4247 15.8333H24.3413C27.2036 15.8333 28.6348 15.8333 29.5337 16.799C30.4327 17.7648 30.4327 19.2876 30.4327 22.3333V25.6667C30.4327 28.7124 30.4327 30.2352 29.5337 31.201C28.6348 32.1667 27.2036 32.1667 24.3413 32.1667H22.4247C19.5624 32.1667 18.1313 32.1667 17.2323 31.201C16.3333 30.2352 16.3333 28.7124 16.3333 25.6667V22.3333Z" stroke="white" stroke-width="1.5"/>
                <path d="M20.5 22.3333H26.2663" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20.5 25.6667H24.3497" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div :class="$style.serviceInfo">
              <h3 :class="$style.serviceTitle">الذكاء الاصطناعي</h3>
              <p :class="$style.serviceDescription">مساعدك الشخصي</p>
            </div>
          </div>

          <!-- Service Card 5 - برنامج ادارة الموارد (Coming Soon) -->
          <div :class="$style.serviceCard">
                        <div :class="$style.comingSoonBadge">قريبًا</div>

            <div :class="$style.serviceIconWrapper">
              <svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="49" height="49" rx="24.5" fill="#A17D23"/>
                <path d="M16.3333 22.3333C16.3333 19.2876 16.3333 17.7648 17.2323 16.799C18.1313 15.8333 19.5624 15.8333 22.4247 15.8333H24.3413C27.2036 15.8333 28.6348 15.8333 29.5337 16.799C30.4327 17.7648 30.4327 19.2876 30.4327 22.3333V25.6667C30.4327 28.7124 30.4327 30.2352 29.5337 31.201C28.6348 32.1667 27.2036 32.1667 24.3413 32.1667H22.4247C19.5624 32.1667 18.1313 32.1667 17.2323 31.201C16.3333 30.2352 16.3333 28.7124 16.3333 25.6667V22.3333Z" stroke="white" stroke-width="1.5"/>
                <path d="M20.5 22.3333H26.2663" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20.5 25.6667H24.3497" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div :class="$style.serviceInfo">
              <h3 :class="$style.serviceTitle">برنامج ادارة الموارد</h3>
              <p :class="$style.serviceDescription">ادارة الطلبات و الموافقات</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Latest Surveys Section -->
      <section :class="$style.surveysSection">
      <div :class="$style.sectionHeader">
        <h2 :class="$style.sectionTitle">احدث الاستطلاعات</h2>
        <button :class="$style.viewAllButton" @click="viewAllSurveys">
          <i class="fas fa-arrow-left"></i>
          <span>عرض جميع الاستطلاعات</span>
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
            <div :class="$style.cardIcon">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="44" height="44" rx="22" fill="#F5F7FA"/>
                <path d="M13 20C13 16.2288 13 14.3431 14.1716 13.1716C15.3431 12 17.2288 12 21 12H23C26.7712 12 28.6569 12 29.8284 13.1716C31 14.3431 31 16.2288 31 20V24C31 27.7712 31 29.6569 29.8284 30.8284C28.6569 32 26.7712 32 23 32H21C17.2288 32 15.3431 32 14.1716 30.8284C13 29.6569 13 27.7712 13 24V20Z" stroke="#A17D23" stroke-width="1.5"/>
                <path d="M18 20H26" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M18 24H23" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
          
          <div :class="$style.cardContent">
            <p :class="$style.cardTitle">{{ survey.title }}</p>
            <p :class="$style.cardDescription">{{ survey.description || 'لا يوجد وصف لى هذا الاستطلاع' }}</p>
          </div>
          
          <div :class="$style.cardDivider">
            <div :class="$style.cardMetadata">
              <div :class="$style.metaItem">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M7.99967 0.833374C6.25077 0.833374 4.83301 2.25114 4.83301 4.00004C4.83301 5.74894 6.25077 7.16671 7.99967 7.16671C9.74858 7.16671 11.1663 5.74894 11.1663 4.00004C11.1663 2.25114 9.74858 0.833374 7.99967 0.833374ZM5.83301 4.00004C5.83301 2.80342 6.80306 1.83337 7.99967 1.83337C9.19629 1.83337 10.1663 2.80342 10.1663 4.00004C10.1663 5.19666 9.19629 6.16671 7.99967 6.16671C6.80306 6.16671 5.83301 5.19666 5.83301 4.00004Z" fill="#717784"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M7.99967 8.16671C6.64012 8.16671 5.38469 8.48054 4.45177 9.01363C3.53301 9.53864 2.83301 10.3401 2.83301 11.3334C2.83301 12.3266 3.53301 13.1281 4.45177 13.6531C5.38469 14.1862 6.64012 14.5 7.99967 14.5C9.35923 14.5 10.6147 14.1862 11.5476 13.6531C12.4663 13.1281 13.1663 12.3266 13.1663 11.3334C13.1663 10.3401 12.4663 9.53864 11.5476 9.01363C10.6147 8.48054 9.35923 8.16671 7.99967 8.16671ZM3.83301 11.3334C3.83301 10.8539 4.17768 10.322 4.94791 9.88188C5.704 9.44983 6.7819 9.16671 7.99967 9.16671C9.21745 9.16671 10.2953 9.44983 11.0514 9.88188C11.8217 10.322 12.1663 10.8539 12.1663 11.3334C12.1663 11.8129 11.8217 12.3447 11.0514 12.7849C10.2953 13.2169 9.21745 13.5 7.99967 13.5C6.7819 13.5 5.704 13.2169 4.94791 12.7849C4.17768 12.3447 3.83301 11.8129 3.83301 11.3334Z" fill="#717784"/>
                </svg>
                <span>أنشئ بواسطة: {{ survey.creator.name || survey.creator.email }}</span>
              </div>
              
              <div :class="$style.metaItem">
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
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.25 7L2.625 1.75V12.25L12.25 7Z" fill="white"/>
              </svg>
              <span>بدء الاستطلاع</span>
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
  background: #F5F7FA;
  padding: 32px 16px 24px 16px;
  direction: rtl;
}

.homePage[data-theme="night"] {
  background: 
    radial-gradient(circle at 20% 20%, rgba(161,125,35,.06) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(183,138,65,.08) 0%, transparent 50%),
    #1a1e24;
}

.container {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.heroSection {
  width: 100%;
}

/* Services Section */
.servicesSection {
  width: 100%;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sectionTitle {
  font-family: 'Cairo', sans-serif;
  font-size: 40px;
  font-weight: 500;
  color: #0E121B;
  text-align: center;
  margin: 0;
  line-height: 1.3;
}

.homePage[data-theme="night"] .sectionTitle {
  color: #E5E8E1;
}

.servicesGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
}

/* Second row (items 4 and 5) spans only 2 columns centered */
.servicesGrid > *:nth-child(4) {
  grid-column: 1 / 2;
}

.servicesGrid > *:nth-child(5) {
  grid-column: 2 / 3;
}

.serviceCard {
  background: #FFFFFF;
  border-radius: 24px;
  padding: 32px 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  justify-content: flex-end;
  transition: all 0.3s ease;
  position: relative;
  cursor: pointer;
  min-height: 97px;
}

.serviceCard:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(161, 125, 35, 0.15);
}

.homePage[data-theme="night"] .serviceCard {
  background: rgba(40, 43, 51, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(161, 125, 35, 0.18);
}

.homePage[data-theme="night"] .serviceCard:hover {
  background: rgba(40, 43, 51, 0.85);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  border-color: rgba(226, 232, 240, 0.32);
}

.serviceIconWrapper {
  flex-shrink: 0;
  width: 49px;
  height: 49px;
}

.serviceIconWrapper svg {
  width: 100%;
  height: 100%;
}

.serviceInfo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
  flex: 1;
  min-width: 0;
}

.serviceTitle {
  font-family: 'Cairo', sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: #101828;
  margin: 0;
  line-height: 1.32;
}

.homePage[data-theme="night"] .serviceTitle {
  color: #E5E8E1;
}

.serviceDescription {
  font-family: 'Cairo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #717784;
  margin: 0;
  line-height: 1.7;
}

.homePage[data-theme="night"] .serviceDescription {
  color: rgba(226, 232, 240, 0.78);
}

.comingSoonBadge {
  position: absolute;
  top: 16px;
  left: 16px;
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: #A17D23;
  color: #FFFFFF;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 400;
  font-family: 'Cairo', sans-serif;
  line-height: 1;
}

.homePage[data-theme="night"] .comingSoonBadge {
  background: rgba(161, 125, 35, 0.8);
  color: #FFFFFF;
}

/* Latest Surveys Section */
.surveysSection {
  width: 100%;
  padding: 32px 40px 48px 40px;
  background: #FFFFFF;
  border-radius: 24px;
  box-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.homePage[data-theme="night"] .surveysSection {
  background: rgba(27, 30, 36, 0.92);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(161, 125, 35, 0.18);
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.6);
}

.surveysSection .sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
}

.surveysSection .sectionTitle {
  font-size: 18px;
  font-weight: 500;
  color: #0E121B;
  text-align: right;
  margin: 0;
  line-height: 1.3;
  flex: 1;
}

.homePage[data-theme="night"] .surveysSection .sectionTitle {
  color: #E5E8E1;
}

.viewAllButton {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  color: #C29958;
  border: none;
  padding: 0;
  font-size: 14px;
  font-weight: 400;
  font-family: 'Cairo', sans-serif;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.viewAllButton:hover {
  color: #A17D23;
}

.viewAllButton i {
  font-size: 14px;
  transform: rotate(180deg);
}

.homePage[data-theme="night"] .viewAllButton {
  color: #C29958;
}

.homePage[data-theme="night"] .viewAllButton:hover {
  color: #B78A41;
}

.loadingGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.skeletonCard {
  height: 320px;
  background: linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%);
  background-size: 200% 100%;
  border-radius: 16px;
  animation: shimmer 1.5s infinite;
}

.homePage[data-theme="night"] .skeletonCard {
  background: linear-gradient(90deg, rgba(40, 43, 51, 0.6) 25%, rgba(40, 43, 51, 0.8) 50%, rgba(40, 43, 51, 0.6) 75%);
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.latestSurveysGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.surveyCard {
  background: #FFFFFF;
  border: 1px solid #E1E4EA;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.surveyCard:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(161, 125, 35, 0.12);
  border-color: rgba(161, 125, 35, 0.3);
}

.surveyCard.nonClickable {
  cursor: not-allowed;
  opacity: 0.7;
}

.surveyCard.nonClickable:hover {
  transform: none;
  box-shadow: none;
  border-color: #E1E4EA;
}

.homePage[data-theme="night"] .surveyCard {
  background: rgba(40, 43, 51, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(226, 232, 240, 0.18);
}

.homePage[data-theme="night"] .surveyCard:hover {
  background: rgba(40, 43, 51, 0.85);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  border-color: rgba(226, 232, 240, 0.32);
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: 0;
  justify-content: flex-end;
}

.cardIcon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
}

.cardIcon svg {
  width: 100%;
  height: 100%;
}

.homePage[data-theme="night"] .cardIcon svg rect {
  fill: rgba(248, 250, 252, 0.08);
}

.cardContent {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cardTitle {
  font-family: 'Cairo', sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: #0E121B;
  line-height: 1.68;
  margin: 0;
  text-align: right;
}

.homePage[data-theme="night"] .cardTitle {
  color: #E5E8E1;
}

.cardDescription {
  font-family: 'Cairo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #717784;
  line-height: 1.6;
  margin: 0;
  text-align: right;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.homePage[data-theme="night"] .cardDescription {
  color: rgba(226, 232, 240, 0.78);
}

.cardDivider {
  border-top: 1px solid #F2F5F8;
  padding-top: 17px;
  padding-bottom: 16px;
}

.homePage[data-theme="night"] .cardDivider {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.cardMetadata {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.metaItem {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 16px;
  background: #F5F7FA;
  border-radius: 41px;
  font-family: 'Cairo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #717784;
  line-height: 1.7;
}

.metaItem svg {
  flex-shrink: 0;
}

.homePage[data-theme="night"] .metaItem {
  background: rgba(248, 250, 252, 0.08);
  color: rgba(226, 232, 240, 0.75);
}

.cardActions {
  display: flex;
  width: 100%;
}

.actionButton {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 0;
  border-radius: 8px;
  font-family: 'Cairo', sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.actionButton.primary {
  background: #A17D23;
  color: #FFFFFF;
}

.actionButton.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(161, 125, 35, 0.35);
  background: #B78A41;
}

.actionButton i {
  font-size: 14px;
}

.homePage[data-theme="night"] .actionButton.primary {
  background: #A17D23;
}

.homePage[data-theme="night"] .actionButton.primary:hover {
  background: #B78A41;
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
  font-family: 'Cairo', sans-serif;
}

.homePage[data-theme="night"] .emptyState {
  color: rgba(226, 232, 240, 0.75);
}

/* Desktop Large Screen - Enhanced sizes for monitors (1920px+) */
@media (min-width: 1600px) {
  .homePage {
    padding: 40px 60px 32px 60px;
  }
  
  .container {
    max-width: 1600px;
    gap: 40px;
  }
  
  .servicesSection {
    padding: 20px 0;
    gap: 56px;
  }
  
  .sectionTitle {
    font-size: 48px;
  }
  
  .servicesGrid {
    gap: 28px;
  }
  
  .serviceCard {
    border-radius: 28px;
    padding: 36px 28px;
    gap: 20px;
    min-height: 115px;
  }
  
  .serviceIconWrapper {
    width: 58px;
    height: 58px;
  }
  
  .serviceTitle {
    font-size: 18px;
  }
  
  .serviceDescription {
    font-size: 16px;
  }
  
  .comingSoonBadge {
    top: 18px;
    left: 18px;
    padding: 6px 14px;
    border-radius: 18px;
    font-size: 14px;
  }
  
  .surveysSection {
    padding: 40px 48px 56px 48px;
    border-radius: 28px;
    gap: 28px;
  }
  
  .surveysSection .sectionTitle {
    font-size: 22px;
  }
  
  .viewAllButton {
    gap: 6px;
    font-size: 16px;
  }
  
  .surveyCard {
    border-radius: 20px;
    padding: 28px;
    gap: 20px;
  }
  
  .cardTitle {
    font-size: 18px;
  }
  
  .cardDescription {
    font-size: 16px;
  }
  
  .actionButton {
    gap: 14px;
    padding: 12px 0;
    border-radius: 10px;
    font-size: 16px;
  }
}

/* Responsive Design */
@media (max-width: 1400px) {
  .homePage {
    padding: 32px 32px 24px 32px;
  }
  
  .container {
    max-width: 100%;
  }
}

@media (max-width: 1200px) {
  .homePage {
    padding: 32px 24px 24px 24px;
  }
  
  .servicesGrid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .latestSurveysGrid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .loadingGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .homePage {
    padding: 24px 32px;
  }

  .sectionTitle {
    font-size: 32px;
  }
  
  .surveysSection {
    padding: 32px;
  }
  
  .surveysSection .sectionTitle {
    font-size: 16px;
  }
}

@media (max-width: 768px) {
  .homePage {
    padding: 20px 16px;
  }

  .container {
    gap: 24px;
  }

  .servicesSection {
    gap: 32px;
  }

  .sectionTitle {
    font-size: 28px;
  }

  .servicesGrid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .serviceCard {
    padding: 24px;
  }

  .surveysSection {
    padding: 24px 20px;
  }
  
  .surveysSection .sectionTitle {
    font-size: 15px;
  }
  
  .surveysSection .sectionHeader {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .viewAllButton {
    align-self: flex-end;
  }

  .latestSurveysGrid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .loadingGrid {
    grid-template-columns: 1fr;
  }

  .surveyCard {
    padding: 20px;
  }

  .cardTitle {
    font-size: 15px;
  }
  
  .cardDescription {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .homePage {
    padding: 16px 12px;
  }

  .sectionTitle {
    font-size: 24px;
  }

  .serviceCard {
    padding: 20px 16px;
    gap: 12px;
  }

  .serviceIconWrapper {
    width: 44px;
    height: 44px;
  }

  .serviceTitle {
    font-size: 15px;
  }

  .serviceDescription {
    font-size: 13px;
  }

  .surveysSection {
    padding: 20px 16px;
  }

  .surveysSection .sectionTitle {
    font-size: 14px;
  }

  .viewAllButton {
    font-size: 13px;
  }

  .surveyCard {
    padding: 18px;
  }

  .actionButton {
    padding: 8px 0;
    font-size: 13px;
  }
}

/* RTL Support */
.homePage[dir="ltr"] {
  direction: ltr;
}

.homePage[dir="ltr"] .serviceCard {
  flex-direction: row-reverse;
}

.homePage[dir="ltr"] .serviceInfo {
  text-align: left;
}

.homePage[dir="ltr"] .cardContent {
  text-align: left;
}

.homePage[dir="ltr"] .cardTitle,
.homePage[dir="ltr"] .cardDescription {
  text-align: left;
}

.homePage[dir="ltr"] .cardMetadata {
  align-items: flex-start;
}

.homePage[dir="ltr"] .viewAllButton i {
  transform: none;
}
</style>
  