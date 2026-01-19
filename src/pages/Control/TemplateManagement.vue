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
      <div v-for="template in templates" :key="template.id" :class="$style.templateCard">
        <!-- Card Actions (Top Left) -->
        <div :class="$style.cardRow">
          <div :class="$style.menuCardLogo">
            <img :class="$style.menuCardLogoImg" src="/icons/Document.svg" alt="Document" />
          </div>

          <div :class="$style.cardActions">
            <span v-if="template.is_active" :class="$style.statusBadge"> نشط </span>

            <span
              v-if="template.is_active"
              :style="{ borderLeft: '1px solid #e2e8f0', height: '24px', margin: '0 4px' }"></span>
            <button :class="$style.actionBtn" @click.stop="handleDeleteTemplate(template)" :title="'حذف'">
              <img :class="$style.actionIcon" src="/icons/Delete.svg" alt="Delete" />
            </button>
            <button :class="$style.actionBtn" @click.stop="handleEditTemplate(template)" :title="'تعديل'">
              <img :class="$style.actionIcon" src="/icons/Edit.svg" alt="Edit" />
            </button>
            <button
              :class="[$style.actionBtn, { [$style.starred]: template.is_favorite }]"
              @click.stop="handleToggleFavorite(template)"
              :title="template.is_favorite ? 'إلغاء التفضيل' : 'إضافة للمفضلة'">
              <img :class="$style.actionIcon" src="/icons/star.svg" alt="Star" />
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
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/stores/useAppStore";
import { templateService } from "@/services/templateService";
import type { SurveyTemplate } from "@/types/survey.types";

const router = useRouter();
const store = useAppStore();

const currentTheme = computed(() => store.currentTheme);

// State
const templates = ref<any[]>([
  {
    id: 1,
    name: "حصر الأنشطة الدورية",
    description:
      "هذا نص تجريبي، يستخدم لملئ المساحات المخصصة الوصف. ولا يعبر عن محتوى فعلي، وهدفه فقط الى عرض شكل النص وتنظيمه داخل الملف الى حين إدخال البيانات الفعلية.",
    is_active: true,
    is_favorite: false,
    created_at: "2024-01-15T10:30:00Z",
    question_count: 12,
  },
  {
    id: 2,
    name: "حصر الأنشطة الدورية",
    description:
      "هذا نص تجريبي، يستخدم لملئ المساحات المخصصة الوصف. ولا يعبر عن محتوى فعلي، وهدفه فقط الى عرض شكل النص وتنظيمه داخل الملف الى حين إدخال البيانات الفعلية.",
    is_active: true,
    is_favorite: false,
    created_at: "2024-01-14T09:15:00Z",
    question_count: 8,
  },
  {
    id: 3,
    name: "حصر الأنشطة الدورية",
    description:
      "هذا نص تجريبي، يستخدم لملئ المساحات المخصصة الوصف. ولا يعبر عن محتوى فعلي، وهدفه فقط الى عرض شكل النص وتنظيمه داخل الملف الى حين إدخال البيانات الفعلية.",
    is_active: true,
    is_favorite: true,
    created_at: "2024-01-13T14:45:00Z",
    question_count: 15,
  },
  {
    id: 4,
    name: "حصر الأنشطة الدورية",
    description:
      "هذا نص تجريبي، يستخدم لملئ المساحات المخصصة الوصف. ولا يعبر عن محتوى فعلي، وهدفه فقط الى عرض شكل النص وتنظيمه داخل الملف الى حين إدخال البيانات الفعلية.",
    is_active: true,
    is_favorite: false,
    created_at: "2024-01-12T11:20:00Z",
    question_count: 10,
  },
  {
    id: 5,
    name: "حصر الأنشطة الدورية",
    description:
      "هذا نص تجريبي، يستخدم لملئ المساحات المخصصة الوصف. ولا يعبر عن محتوى فعلي، وهدفه فقط الى عرض شكل النص وتنظيمه داخل الملف الى حين إدخال البيانات الفعلية.",
    is_active: true,
    is_favorite: false,
    created_at: "2024-01-11T16:00:00Z",
    question_count: 20,
  },
  {
    id: 6,
    name: "حصر الأنشطة الدورية",
    description:
      "هذا نص تجريبي، يستخدم لملئ المساحات المخصصة الوصف. ولا يعبر عن محتوى فعلي، وهدفه فقط الى عرض شكل النص وتنظيمه داخل الملف الى حين إدخال البيانات الفعلية.",
    is_active: true,
    is_favorite: false,
    created_at: "2024-01-10T08:30:00Z",
    question_count: 6,
  },
]);
const isLoading = ref(false);
const errorMessage = ref("");

// Load templates (using static data)
const loadTemplates = async () => {
  // Static data is already loaded, no need to fetch
  isLoading.value = false;
  errorMessage.value = "";
};

// Handle create template
const handleCreateTemplate = () => {
  router.push("/control/templates/create");
};

// Handle edit template
const handleEditTemplate = (template: SurveyTemplate) => {
  // Navigate to edit page or open modal
  console.log("Edit template:", template);
  router.push(`/control/surveys/edit/${template.id}`);
};

// Handle view template
const handleViewTemplate = (template: SurveyTemplate) => {
  console.log("View template:", template);
};

// Handle delete template
const handleDeleteTemplate = async (template: SurveyTemplate) => {
  if (!confirm(`هل أنت متأكد من حذف القالب "${template.name}"؟`)) {
    return;
  }

  try {
    // Implement delete API call here
    console.log("Delete template:", template);
    // await templateService.deleteTemplate(template.id)
    await loadTemplates();
  } catch (error: any) {
    console.error("Failed to delete template:", error);
    alert("فشل في حذف القالب");
  }
};

// Handle toggle favorite
const handleToggleFavorite = async (template: SurveyTemplate) => {
  try {
    // Implement toggle favorite API call here
    console.log("Toggle favorite:", template);
    template.is_favorite = !template.is_favorite;
  } catch (error: any) {
    console.error("Failed to toggle favorite:", error);
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
