<template>
  <div :class="$style.container" :data-theme="currentTheme">
    <!-- Header -->
    <div :class="$style.header">
      <h1 :class="$style.title">إدارة النماذج</h1>
      <button :class="$style.createBtn" @click="handleCreateTemplate">
        <i class="fas fa-plus"></i>
        إنشاء قالب جديد
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" :class="$style.loadingContainer">
      <i class="fas fa-spinner fa-spin"></i>
      <p>جاري التحميل...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" :class="$style.errorContainer">
      <i class="fas fa-exclamation-circle"></i>
      <p>{{ errorMessage }}</p>
      <button @click="loadTemplates" :class="$style.retryBtn">
        <i class="fas fa-redo"></i>
        إعادة المحاولة
      </button>
    </div>

    <!-- Templates Grid -->
    <div v-else-if="templates.length > 0" :class="$style.templatesGrid">
      <div 
        v-for="template in templates" 
        :key="template.id" 
        :class="$style.templateCard"
        @click="handleViewActivities(template)"
      >
        <!-- Card Actions (Top Left) -->
        <div :class="$style.cardRow">
          <div :class="$style.menuCardLogo">
<svg width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3.80469 12.6938C3.80469 7.90683 3.80469 5.51333 5.29182 4.0262C6.77895 2.53906 9.17246 2.53906 13.9595 2.53906H16.4982C21.2852 2.53906 23.6787 2.53906 25.1658 4.0262C26.6529 5.51333 26.6529 7.90683 26.6529 12.6938V17.7712C26.6529 22.5582 26.6529 24.9517 25.1658 26.4389C23.6787 27.926 21.2852 27.926 16.4982 27.926H13.9595C9.17246 27.926 6.77895 27.926 5.29182 26.4389C3.80469 24.9517 3.80469 22.5582 3.80469 17.7712V12.6938Z" stroke="#A17D23" stroke-width="1.90402"/>
<path d="M10.1562 12.6934H20.311" stroke="#A17D23" stroke-width="1.90402" stroke-linecap="round"/>
<path d="M10.1562 17.7705H16.503" stroke="#A17D23" stroke-width="1.90402" stroke-linecap="round"/>
</svg>
          </div>

          <div :class="$style.cardActions">
            <!-- Status Badges -->
            <span v-if="template.status === 'published'" :class="$style.statusBadge"> نشط </span>
            <span v-else-if="template.status === 'draft'" :class="$style.draftBadge"> مسودة </span>

            <span
              v-if="template.status"
              :style="{ borderLeft: '1px solid #e2e8f0', height: '24px', margin: '0 4px' }"></span>
            
            <!-- Publish Button (only for drafts) -->
            <button 
              v-if="template.status === 'draft'" 
              :class="[$style.actionBtn, $style.publishBtn]" 
              @click.stop="handlePublishTemplate(template)" 
              :title="'نشر القالب'"
              :disabled="isPublishing === template.id">
              <i :class="isPublishing === template.id ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'" :style="{ fontSize: '14px', color: '#10b981' }"></i>
            </button>
            
            <!-- Delete Button -->
            <button :class="[$style.actionBtn, $style.deleteBtn]" @click.stop="handleDeleteTemplate(template)" :title="'حذف'">
<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.54961 3C5.75514 2.53796 6.21344 2.24023 6.71914 2.24023H8.95703C9.46276 2.24023 9.921 2.53796 10.1266 3L10.3975 3.60915C10.5003 3.84017 10.7294 3.98903 10.9823 3.98903H12.1836C12.7361 3.98903 13.184 4.43693 13.184 4.98942C13.184 5.54193 12.7361 5.98982 12.1836 5.98982H3.49258C2.94008 5.98982 2.49219 5.54193 2.49219 4.98942C2.49219 4.43693 2.94008 3.98903 3.49258 3.98903H4.69389C4.94674 3.98903 5.17588 3.84017 5.27865 3.60915L5.54961 3Z" stroke="#D44333" stroke-width="1.44" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.34773 8.47461H6.33594" stroke="#D44333" stroke-width="1.44" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.042 5.99023L11.5472 11.9983C11.4651 12.9942 10.6329 13.7607 9.63365 13.7607H6.04118C5.04189 13.7607 4.20968 12.9942 4.12765 11.9983L3.63281 5.99023" stroke="#D44333" stroke-width="1.44" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
            </button>
            
            <!-- Edit Button (only for drafts) -->
            <button 
              v-if="template.status === 'draft'"
              :class="[$style.actionBtn, $style.editBtn]" 
              @click.stop="handleEditTemplate(template)" 
              :title="'تعديل'">
<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.03125 12.9834H13.3291" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M8.45962 3.11747C8.91926 2.56814 9.74554 2.48758 10.3063 2.93788C10.3373 2.96231 11.3334 3.73614 11.3334 3.73614C11.9494 4.10852 12.1408 4.90018 11.76 5.50431C11.7398 5.53667 6.10818 12.581 6.10818 12.581C5.92082 12.8147 5.63641 12.9527 5.33245 12.956L3.17578 12.9831L2.68986 10.9264C2.62179 10.6372 2.68986 10.3335 2.87722 10.0997L8.45962 3.11747Z" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.41406 4.4248L10.645 6.90606" stroke="#A17D23" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
            </button>
            
            <!-- Toggle Active Title (only for published templates) -->
            <button
              v-if="template.status === 'published'"
              :class="[$style.actionBtn2, { [$style.starred]: template.is_active_title }]"
              @click.stop="handleToggleActiveTitle(template)"
              :disabled="isTogglingActive === template.id"
              :title="template.is_active_title ? 'إلغاء التفعيل' : 'تعيين كنشط'">
              <i v-if="isTogglingActive === template.id" class="fas fa-spinner fa-spin" :style="{ fontSize: '14px' }"></i>
              <svg v-else-if="template.is_active_title" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 14C0 6.26801 6.26801 0 14 0C21.732 0 28 6.26801 28 14C28 21.732 21.732 28 14 28C6.26801 28 0 21.732 0 14Z" fill="#A17D23"/>
                <path d="M11.7225 8.7267C12.7359 6.9089 13.2425 6 14 6C14.7575 6 15.2641 6.9089 16.2775 8.7267L16.5396 9.19699C16.8276 9.71355 16.9716 9.97183 17.196 10.1422C17.4205 10.3127 17.7001 10.3759 18.2593 10.5024L18.7684 10.6176C20.7361 11.0628 21.72 11.2855 21.9541 12.0382C22.1881 12.7909 21.5174 13.5753 20.1759 15.1439L19.8289 15.5498C19.4477 15.9955 19.2571 16.2184 19.1713 16.4942C19.0856 16.7699 19.1144 17.0673 19.172 17.662L19.2245 18.2035C19.4273 20.2965 19.5287 21.343 18.9159 21.8082C18.3031 22.2734 17.3819 21.8492 15.5395 21.0009L15.0628 20.7815C14.5393 20.5404 14.2775 20.4199 14 20.4199C13.7225 20.4199 13.4607 20.5404 12.9372 20.7815L12.4605 21.0009C10.6181 21.8492 9.69694 22.2734 9.08412 21.8082C8.4713 21.343 8.5727 20.2965 8.77552 18.2035L8.82799 17.662C8.88562 17.0673 8.91444 16.7699 8.82869 16.4942C8.74294 16.2184 8.55234 15.9955 8.17113 15.5498L7.82408 15.1439C6.4826 13.5753 5.81186 12.7909 6.04594 12.0382C6.28001 11.2855 7.26389 11.0628 9.23163 10.6176L9.74071 10.5024C10.2999 10.3759 10.5795 10.3127 10.804 10.1422C11.0284 9.97183 11.1724 9.71355 11.4604 9.19699L11.7225 8.7267Z" fill="white" stroke="white"/>
              </svg>
              <svg v-else width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 0.5C21.4558 0.5 27.5 6.54416 27.5 14C27.5 21.4558 21.4558 27.5 14 27.5C6.54416 27.5 0.5 21.4558 0.5 14C0.5 6.54416 6.54416 0.5 14 0.5Z" fill="white"/>
                <path d="M14 0.5C21.4558 0.5 27.5 6.54416 27.5 14C27.5 21.4558 21.4558 27.5 14 27.5C6.54416 27.5 0.5 21.4558 0.5 14C0.5 6.54416 6.54416 0.5 14 0.5Z" stroke="#E1E4EA"/>
                <path d="M11.7225 8.7267C12.7359 6.9089 13.2425 6 14 6C14.7575 6 15.2641 6.9089 16.2775 8.7267L16.5396 9.19699C16.8276 9.71355 16.9716 9.97183 17.196 10.1422C17.4205 10.3127 17.7001 10.3759 18.2593 10.5024L18.7684 10.6176C20.7361 11.0628 21.72 11.2855 21.9541 12.0382C22.1881 12.7909 21.5174 13.5753 20.1759 15.1439L19.8289 15.5498C19.4477 15.9955 19.2571 16.2184 19.1713 16.4942C19.0856 16.7699 19.1144 17.0673 19.172 17.662L19.2245 18.2035C19.4273 20.2965 19.5287 21.343 18.9159 21.8082C18.3031 22.2734 17.3819 21.8492 15.5395 21.0009L15.0628 20.7815C14.5393 20.5404 14.2775 20.4199 14 20.4199C13.7225 20.4199 13.4607 20.5404 12.9372 20.7815L12.4605 21.0009C10.6181 21.8492 9.69694 22.2734 9.08412 21.8082C8.4713 21.343 8.5727 20.2965 8.77552 18.2035L8.82799 17.662C8.88562 17.0673 8.91444 16.7699 8.82869 16.4942C8.74294 16.2184 8.55234 15.9955 8.17113 15.5498L7.82408 15.1439C6.4826 13.5753 5.81186 12.7909 6.04594 12.0382C6.28001 11.2855 7.26389 11.0628 9.23163 10.6176L9.74071 10.5024C10.2999 10.3759 10.5795 10.3127 10.804 10.1422C11.0284 9.97183 11.1724 9.71355 11.4604 9.19699L11.7225 8.7267Z" stroke="#717784" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Status Badge -->

        <!-- Menu Button (Top Right) -->

        <!-- Card Content -->
        <div :class="$style.cardContent" >
          <h3 :class="$style.cardTitle">{{ template.name }}</h3>
          <p v-if="template.description" :class="$style.cardDescription">
            {{ template.description }}
          </p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else :class="$style.emptyState">
      <i class="fas fa-file-alt"></i>
      <p>لا توجد نماذج متاحة</p>
      <button :class="$style.createBtn" @click="handleCreateTemplate">
        <i class="fas fa-plus"></i>
        إنشاء أول قالب
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/stores/useAppStore";
import { templateService } from "@/services/activityService";
import type { TemplateListItem } from "@/types/activity.types";
import Swal from "sweetalert2";

const router = useRouter();
const store = useAppStore();

const currentTheme = computed(() => store.currentTheme);

// State - now typed with the correct interface
const templates = ref<TemplateListItem[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");
const isPublishing = ref<number | null>(null);
const isTogglingActive = ref<number | null>(null);

// Load templates from backend API
const loadTemplates = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  
  try {
    // Fetch templates from /activities/templates/ endpoint
    const data = await templateService.getAll();
    templates.value = data;
  } catch (error: any) {
    console.error("Failed to load templates:", error);
    errorMessage.value = error.response?.data?.message || error.message || "فشل في تحميل النماذج";
  } finally {
    isLoading.value = false;
  }
};

// Handle toggle active title (via backend API)
const handleToggleActiveTitle = async (template: TemplateListItem) => {
  const newActiveState = !template.is_active_title;
  
  // Confirm activation (since it will deactivate other templates)
  if (newActiveState) {
    const result = await Swal.fire({
      title: 'تأكيد التفعيل',
      html: `هل تريد تعيين "${template.name}" كالقالب النشط؟<br/>سيتم إلغاء تفعيل القوالب الأخرى.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، تفعيل',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#a17d23',
      cancelButtonColor: '#64748b',
    });
    if (!result.isConfirmed) return;
  }
  
  isTogglingActive.value = template.id;
  
  try {
    await templateService.update(template.id, { is_active_title: newActiveState });
    // Reload templates to reflect changes
    await loadTemplates();
  } catch (error: any) {
    console.error("Failed to toggle active title:", error);
    const message = error.response?.data?.error || error.response?.data?.is_active_title?.[0] || error.message || "فشل في تغيير حالة القالب";
    await Swal.fire({
      title: 'خطأ',
      text: message,
      icon: 'error',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#a17d23',
    });
  } finally {
    isTogglingActive.value = null;
  }
};

// Handle create template
const handleCreateTemplate = () => {
  router.push("/control/templates/create");
};

// Handle edit template
const handleEditTemplate = (template: TemplateListItem) => {
  // Navigate to edit page with template ID
  router.push(`/control/templates/edit/${template.id}`);
};

// Handle view template
const handleViewTemplate = (template: TemplateListItem) => {
  router.push(`/control/templates/${template.id}`);
};

// Handle view activities for template (navigate to activities detail page)
const handleViewActivities = (template: TemplateListItem) => {
  router.push(`/control/templates/${template.id}/activities`);
};

// Handle delete template
const handleDeleteTemplate = async (template: TemplateListItem) => {
  const result = await Swal.fire({
    title: 'تأكيد الحذف',
    text: `هل أنت متأكد من حذف القالب "${template.name}"؟`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'نعم، احذف',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
  });
  if (!result.isConfirmed) return;

  try {
    await templateService.delete(template.id);
    // Reload templates after deletion
    await loadTemplates();
  } catch (error: any) {
    console.error("Failed to delete template:", error);
    const message = error.response?.data?.error || error.message || "فشل في حذف القالب";
    await Swal.fire({
      title: 'خطأ',
      text: message,
      icon: 'error',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#a17d23',
    });
  }
};

// Handle publish template (change status from draft to published)
const handlePublishTemplate = async (template: TemplateListItem) => {
  const result = await Swal.fire({
    title: 'تأكيد النشر',
    text: `هل أنت متأكد من نشر القالب "${template.name}"؟`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'نعم، انشر',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#64748b',
  });
  if (!result.isConfirmed) return;

  isPublishing.value = template.id;
  
  try {
    await templateService.update(template.id, { status: 'published' });
    // Reload templates after publishing
    await loadTemplates();
  } catch (error: any) {
    console.error("Failed to publish template:", error);
    const message = error.response?.data?.error || error.message || "فشل في نشر القالب";
    await Swal.fire({
      title: 'خطأ',
      text: message,
      icon: 'error',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#a17d23',
    });
  } finally {
    isPublishing.value = null;
  }
};

// Format date
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Load templates on mount
onMounted(() => {
  loadTemplates();
});
</script>

<style module>
.container {
  padding: 2rem;
  height: calc(100vh - 124px);
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
}

.container[data-theme="night"] {
  background-color: #0f172a;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
  flex-shrink: 0;
}

.title {
  font-size: 2rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.container[data-theme="night"] .title {
  color: #f8fafc;
}

.createBtn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #a17d23;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.createBtn:hover {
  background-color: #8a6b1e;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(161, 125, 35, 0.3);
}

.createBtn i {
  font-size: 0.875rem;
}

/* Loading State */
.loadingContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  flex: 1;
}

.loadingContainer i {
  font-size: 3rem;
  color: #a17d23;
}

.loadingContainer p {
  font-size: 1.125rem;
  color: #64748b;
}

.container[data-theme="night"] .loadingContainer p {
  color: #94a3b8;
}

/* Error State */
.errorContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  flex: 1;
}

.errorContainer i {
  font-size: 3rem;
  color: #ef4444;
}

.errorContainer p {
  font-size: 1.125rem;
  color: #64748b;
}

.container[data-theme="night"] .errorContainer p {
  color: #94a3b8;
}

.retryBtn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retryBtn:hover {
  background-color: #2563eb;
}

/* Templates Grid */
.templatesGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  background-color: white;
  padding: 25px;
  border-radius: 10px;
  flex: 1;
  overflow-y: auto;
  align-content: start;
}

@media (max-width: 768px) {
  .templatesGrid {
    grid-template-columns: 1fr;
  }
}

/* Template Card */
.templateCard {
  position: relative;
  background-color: white;
  border-radius: 16px;
  overflow: hidden;
  border: 0.5px solid #e1e4ea;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: space-between;
}

.container[data-theme="night"] .templateCard {
  background-color: #1e293b;
  border-color: #334155;
}

.templateCard:hover {
  background: linear-gradient(135deg, #c9a961 10%, #a17d23 80%, #a17d23 100%);
  border-color: #a17d23;
}

/* Card Actions (Top Left) */
.cardActions {
  display: flex;
  align-items: center;
  gap: 4px;
  
  z-index: 2;
}

.actionBtn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 50%;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.actionBtn2 {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}
.deleteBtn {
  border-color: #FADBD7 !important;
}

.editBtn {
  border-color: #F3D6A7 !important;
}

.container[data-theme="night"] .actionBtn {
  background-color: #0f172a;
  border-color: #334155;
}

.actionBtn:hover {
  background-color: #ffffff;
  border-color: #cbd5e1;
  color: #1e293b;
}

.container[data-theme="night"] .actionBtn:hover {
  background-color: #1e293b;
  border-color: #475569;
  color: #f8fafc;
}

.actionBtn.starred {
  border-color: #fbbf24;
  background-color: #fff7ed;
}



.container[data-theme="night"] .actionBtn.starred {
  background-color: #451a03;
}

.actionBtn.starred:hover {
  background-color: #fef3c7;
}

.container[data-theme="night"] .actionBtn.starred:hover {
  background-color: #5c2e06;
}

/* Status Badge */
.statusBadge {
  padding: 0.25rem 0.75rem;
  background-color: #10b981;
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 400;
}

.draftBadge {
  padding: 0.25rem 0.75rem;
  background-color: #F2F5F8;
  color: #2B303B;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 400;
}

.publishBtn {
  border-color: #10b981 !important;
  background-color: #ecfdf5 !important;
}

.container[data-theme="night"] .publishBtn {
  background-color: #064e3b !important;
  border-color: #10b981 !important;
}

.publishBtn:hover {
  background-color: #d1fae5 !important;
}

.container[data-theme="night"] .publishBtn:hover {
  background-color: #065f46 !important;
}

/* Menu Button (Top Right) */
.menuBtn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #c9a961 0%, #a17d23 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
}

.container[data-theme="night"] .menuBtn {
  background: linear-gradient(135deg, #c9a961 0%, #a17d23 100%);
}

.menuBtn i {
  font-size: 1.125rem;
  color: #ffffff;
}

.menuBtn:hover {
  transform: scale(1.05);
}

/* Card Content */
.cardContent {
  padding: 20px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  width: 100%;
  text-align: right;
}

.cardTitle {
  font-size: 1.125rem;
  font-weight: 500;
  color: #0e121b;
  margin: 0;
  transition: all 0.0s ease;
  
  width: 100%;
}

.container[data-theme="night"] .cardTitle {
  color: #f8fafc;
}

.cardDescription {
  font-size: 0.7rem;
  color: #717784;
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  width: 100%;
  transition: all 0.0s ease
}

.container[data-theme="night"] .cardDescription {
  color: #94a3b8;
}

.cardRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menuCardLogo {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F7FA;
  border-radius: 50%;
  z-index: 2;
}

menuCardLogoImg {
  width: 24px;
  height: 24px;
}

.templateCard:hover .cardTitle,
.templateCard:hover .cardDescription {
  color: #ffffff;
}

/* Empty State */
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1.5rem;
  flex: 1;
  background-color: white;
  border-radius: 10px;
}

.container[data-theme="night"] .emptyState {
  background-color: #1e293b;
}

.emptyState i {
  font-size: 4rem;
  color: #cbd5e1;
}

.container[data-theme="night"] .emptyState i {
  color: #475569;
}

.emptyState p {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
}

.container[data-theme="night"] .emptyState p {
  color: #94a3b8;
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .title {
    font-size: 1.5rem;
    
  }

  .createBtn {
    width: 100%;
    justify-content: center;
  }
}
</style>
