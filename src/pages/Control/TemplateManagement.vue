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
            <img :class="$style.menuCardLogoImg" src="/icons/Document.svg" alt="Document" />
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
            <button :class="$style.actionBtn" @click.stop="handleDeleteTemplate(template)" :title="'حذف'">
              <img :class="$style.actionIcon" src="/icons/Delete.svg" alt="Delete" />
            </button>
            
            <!-- Edit Button (only for drafts) -->
            <button 
              v-if="template.status === 'draft'"
              :class="$style.actionBtn" 
              @click.stop="handleEditTemplate(template)" 
              :title="'تعديل'">
              <img :class="$style.actionIcon" src="/icons/Edit.svg" alt="Edit" />
            </button>
            
            <!-- Toggle Active Title (only for published templates) -->
            <button
              v-if="template.status === 'published'"
              :class="[$style.actionBtn, { [$style.starred]: template.is_active_title }]"
              @click.stop="handleToggleActiveTitle(template)"
              :disabled="isTogglingActive === template.id"
              :title="template.is_active_title ? 'إلغاء التفعيل' : 'تعيين كنشط'">
              <i v-if="isTogglingActive === template.id" class="fas fa-spinner fa-spin" :style="{ fontSize: '14px' }"></i>
              <img v-else :class="$style.actionIcon" src="/icons/star.svg" alt="Star" />
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
  min-height: calc(100vh - 124px);
  background-color: #f8fafc;
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
  width: 34px;
  height: 34px;
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
  background-color: #f59e0b;
  color: white;
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

.actionIcon {
  width: 18px;
  height: 18px;
  display: block;
}

.menuCardLogo {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
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
