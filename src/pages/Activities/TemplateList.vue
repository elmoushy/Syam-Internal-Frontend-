<!-- src/pages/Activities/TemplateList.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { useActivitySheet } from '@/composables/useActivitySheet'
import type { TemplateListItem, TemplateStatus } from '@/types/activity.types'

const router = useRouter()
const { 
  templates, 
  isLoading, 
  lastError,
  loadTemplates, 
  publishTemplate,
  archiveTemplate,
  createSheet
} = useActivitySheet()

// State
const showCreateSheetModal = ref(false)
const selectedTemplate = ref<TemplateListItem | null>(null)
const newSheetName = ref('')
const isCreatingSheet = ref(false)
const actionError = ref('')

// Filter
const statusFilter = ref<'all' | TemplateStatus>('all')
const searchQuery = ref('')

const filteredTemplates = computed(() => {
  let result = templates.value
  
  if (statusFilter.value !== 'all') {
    result = result.filter(t => t.status === statusFilter.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t => 
      t.name.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query))
    )
  }
  
  return result
})

// Status helpers
const getStatusClass = (status: TemplateStatus) => {
  switch (status) {
    case 'draft': return 'statusDraft'
    case 'published': return 'statusPublished'
    case 'archived': return 'statusArchived'
    default: return ''
  }
}

const getStatusLabel = (status: TemplateStatus) => {
  switch (status) {
    case 'draft': return 'مسودة'
    case 'published': return 'منشور'
    case 'archived': return 'مؤرشف'
    default: return status
  }
}

const getStatusIcon = (status: TemplateStatus) => {
  switch (status) {
    case 'draft': return 'fa-pencil-alt'
    case 'published': return 'fa-check-circle'
    case 'archived': return 'fa-archive'
    default: return 'fa-file'
  }
}

// Navigation
const goToEditor = (templateId?: number) => {
  if (templateId) {
    router.push(`/activities/templates/${templateId}/edit`)
  } else {
    router.push('/activities/templates/new')
  }
}

// Actions
const handlePublish = async (template: TemplateListItem) => {
  const result = await Swal.fire({
    icon: 'question',
    title: 'تأكيد النشر',
    text: 'هل أنت متأكد من نشر هذا القالب؟ لن تتمكن من تعديل الأعمدة بعد النشر.',
    showCancelButton: true,
    confirmButtonText: 'نعم، انشر',
    cancelButtonText: 'إلغاء'
  })
  
  if (!result.isConfirmed) return
  
  actionError.value = ''
  try {
    await publishTemplate(template.id)
  } catch (error: any) {
    actionError.value = error.response?.data?.detail || 'فشل نشر القالب'
  }
}

const handleArchive = async (template: TemplateListItem) => {
  const message = template.sheet_count > 0
    ? `سيتم أرشفة هذا القالب. الأوراق الموجودة (${template.sheet_count}) ستبقى متاحة مع بياناتها.`
    : 'هل أنت متأكد من أرشفة هذا القالب؟'
  
  const result = await Swal.fire({
    icon: 'question',
    title: 'تأكيد الأرشفة',
    text: message,
    showCancelButton: true,
    confirmButtonText: 'نعم، أرشف',
    cancelButtonText: 'إلغاء'
  })
  
  if (!result.isConfirmed) return
  
  actionError.value = ''
  try {
    await archiveTemplate(template.id)
  } catch (error: any) {
    actionError.value = error.response?.data?.detail || 'فشل أرشفة القالب'
  }
}

const openCreateSheetModal = (template: TemplateListItem) => {
  selectedTemplate.value = template
  const today = new Date().toLocaleDateString('ar-EG', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  newSheetName.value = `${template.name} - ${today}`
  showCreateSheetModal.value = true
  actionError.value = ''
}

const closeCreateSheetModal = () => {
  showCreateSheetModal.value = false
  selectedTemplate.value = null
  newSheetName.value = ''
  actionError.value = ''
}

const handleCreateSheet = async () => {
  if (!selectedTemplate.value || !newSheetName.value.trim()) return
  
  isCreatingSheet.value = true
  actionError.value = ''
  
  try {
    const sheet = await createSheet(newSheetName.value, selectedTemplate.value.id)
    closeCreateSheetModal()
    router.push(`/activities/sheets/${sheet.id}`)
  } catch (error: any) {
    actionError.value = error.response?.data?.detail || 'فشل إنشاء الورقة'
  } finally {
    isCreatingSheet.value = false
  }
}

onMounted(async () => {
  await loadTemplates()
})
</script>

<template>
  <div :class="$style.container">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.titleSection">
        <h1 :class="$style.title">
          <i class="fas fa-layer-group"></i>
          قوالب الأنشطة
        </h1>
        <p :class="$style.subtitle">إنشاء وإدارة قوالب جداول الأنشطة</p>
      </div>
      
      <button :class="$style.createBtn" @click="goToEditor()">
        <i class="fas fa-plus"></i>
        قالب جديد
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="lastError || actionError" :class="$style.errorMsg">
      <i class="fas fa-exclamation-circle"></i>
      {{ actionError || lastError }}
    </div>

    <!-- Filters -->
    <div :class="$style.filters">
      <div :class="$style.statusFilters">
        <button
          v-for="status in ['all', 'draft', 'published', 'archived'] as const"
          :key="status"
          :class="[$style.filterBtn, statusFilter === status && $style.filterActive]"
          @click="statusFilter = status"
        >
          <i v-if="status !== 'all'" :class="['fas', getStatusIcon(status as TemplateStatus)]"></i>
          {{ status === 'all' ? 'الكل' : getStatusLabel(status as TemplateStatus) }}
          <span v-if="status !== 'all'" :class="$style.filterCount">
            {{ templates.filter(t => t.status === status).length }}
          </span>
        </button>
      </div>
      
      <div :class="$style.searchBox">
        <i class="fas fa-search"></i>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="بحث في القوالب..."
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" :class="$style.loading">
      <i class="fas fa-spinner fa-spin"></i>
      جاري التحميل...
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredTemplates.length === 0" :class="$style.emptyState">
      <i class="fas fa-folder-open"></i>
      <p v-if="searchQuery || statusFilter !== 'all'">
        لا توجد قوالب تطابق البحث
      </p>
      <p v-else>لا توجد قوالب بعد</p>
      <button v-if="!searchQuery && statusFilter === 'all'" @click="goToEditor()">
        <i class="fas fa-plus"></i>
        إنشاء قالب جديد
      </button>
    </div>

    <!-- Templates Grid -->
    <div v-else :class="$style.templatesGrid">
      <div
        v-for="template in filteredTemplates"
        :key="template.id"
        :class="[$style.templateCard, $style[getStatusClass(template.status)]]"
      >
        <div :class="$style.cardHeader">
          <h3 :class="$style.templateName">{{ template.name }}</h3>
          <span :class="[$style.statusBadge, $style[getStatusClass(template.status)]]">
            <i :class="['fas', getStatusIcon(template.status)]"></i>
            {{ getStatusLabel(template.status) }}
          </span>
        </div>
        
        <p :class="$style.templateDesc">
          {{ template.description || 'بدون وصف' }}
        </p>
        
        <div :class="$style.cardMeta">
          <span :class="$style.metaItem" :title="`${template.column_count} أعمدة`">
            <i class="fas fa-columns"></i>
            {{ template.column_count }} أعمدة
          </span>
          <span :class="$style.metaItem" :title="`${template.sheet_count} أوراق`">
            <i class="fas fa-file-alt"></i>
            {{ template.sheet_count }} أوراق
          </span>
          <span :class="$style.metaItem" :title="new Date(template.updated_at).toLocaleString('ar-EG')">
            <i class="fas fa-clock"></i>
            {{ new Date(template.updated_at).toLocaleDateString('ar-EG') }}
          </span>
        </div>
        
        <div :class="$style.cardActions">
          <!-- Published: Can create sheets -->
          <button
            v-if="template.status === 'published'"
            :class="$style.primaryBtn"
            @click="openCreateSheetModal(template)"
            title="إنشاء ورقة جديدة"
          >
            <i class="fas fa-plus"></i>
            إنشاء ورقة
          </button>
          
          <!-- Draft: Can edit and publish -->
          <template v-if="template.status === 'draft'">
            <button 
              :class="$style.editBtn" 
              @click="goToEditor(template.id)"
              title="تعديل القالب"
            >
              <i class="fas fa-edit"></i>
              تعديل
            </button>
            <button 
              :class="$style.publishBtn" 
              @click="handlePublish(template)"
              title="نشر القالب"
            >
              <i class="fas fa-check"></i>
              نشر
            </button>
          </template>
          
          <!-- All non-archived: Can archive -->
          <button
            v-if="template.status !== 'archived'"
            :class="$style.archiveBtn"
            @click="handleArchive(template)"
            title="أرشفة القالب"
          >
            <i class="fas fa-archive"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Create Sheet Modal -->
    <Teleport to="body">
      <div v-if="showCreateSheetModal" :class="$style.modalOverlay" @click.self="closeCreateSheetModal">
        <div :class="$style.modal">
          <div :class="$style.modalHeader">
            <h2>إنشاء ورقة جديدة</h2>
            <button :class="$style.closeBtn" @click="closeCreateSheetModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div :class="$style.modalBody">
            <div v-if="actionError" :class="$style.modalError">
              <i class="fas fa-exclamation-triangle"></i>
              {{ actionError }}
            </div>
            
            <p :class="$style.templateInfo">
              سيتم إنشاء ورقة جديدة من القالب: 
              <strong>{{ selectedTemplate?.name }}</strong>
            </p>
            
            <div :class="$style.formGroup">
              <label>اسم الورقة <span class="required">*</span></label>
              <input 
                v-model="newSheetName" 
                type="text" 
                placeholder="أدخل اسم الورقة"
                @keyup.enter="handleCreateSheet"
              />
            </div>
          </div>
          
          <div :class="$style.modalFooter">
            <button :class="$style.cancelBtn" @click="closeCreateSheetModal" :disabled="isCreatingSheet">
              إلغاء
            </button>
            <button 
              :class="$style.submitBtn" 
              @click="handleCreateSheet"
              :disabled="isCreatingSheet || !newSheetName.trim()"
            >
              <i v-if="isCreatingSheet" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-plus"></i>
              إنشاء
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style module>
.container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  direction: rtl;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.titleSection {
  flex: 1;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #1a1a2e);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title i {
  color: var(--primary-color, #4361ee);
}

.subtitle {
  color: var(--text-secondary, #64748b);
  margin: 0;
  font-size: 0.95rem;
}

.createBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--primary-color, #4361ee);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.createBtn:hover {
  background: var(--primary-dark, #3651d4);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
}

.errorMsg {
  padding: 12px 16px;
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
}

.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.statusFilters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filterBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: white;
  border-radius: 20px;
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.2s;
}

.filterBtn:hover {
  border-color: var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
}

.filterActive {
  background: var(--primary-color, #4361ee);
  color: white;
  border-color: var(--primary-color, #4361ee);
}

.filterCount {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
}

.filterActive .filterCount {
  background: rgba(255, 255, 255, 0.3);
}

.searchBox {
  position: relative;
  min-width: 250px;
}

.searchBox i {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #64748b);
}

.searchBox input {
  width: 100%;
  padding: 10px 40px 10px 14px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.95rem;
  background: var(--bg-secondary, #f8fafc);
  transition: all 0.2s;
}

.searchBox input:focus {
  outline: none;
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

.loading {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary, #64748b);
  font-size: 1.1rem;
}

.loading i {
  margin-left: 10px;
  color: var(--primary-color, #4361ee);
}

.emptyState {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary, #64748b);
}

.emptyState i {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.4;
}

.emptyState p {
  font-size: 1.1rem;
  margin-bottom: 20px;
}

.emptyState button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--primary-color, #4361ee);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.emptyState button:hover {
  background: var(--primary-dark, #3651d4);
}

.templatesGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.templateCard {
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.templateCard:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.templateCard.statusDraft {
  border-right: 4px solid #f59e0b;
}

.templateCard.statusPublished {
  border-right: 4px solid #10b981;
}

.templateCard.statusArchived {
  border-right: 4px solid #94a3b8;
  opacity: 0.8;
}

.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.templateName {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  margin: 0;
  flex: 1;
  line-height: 1.4;
}

.statusBadge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.statusBadge.statusDraft {
  background: #fef3c7;
  color: #92400e;
}

.statusBadge.statusPublished {
  background: #d1fae5;
  color: #065f46;
}

.statusBadge.statusArchived {
  background: #f1f5f9;
  color: #64748b;
}

.templateDesc {
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
  margin: 0 0 16px 0;
  line-height: 1.5;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cardMeta {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.metaItem {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
}

.metaItem i {
  font-size: 0.8rem;
  opacity: 0.7;
}

.cardActions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.cardActions button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.primaryBtn {
  flex: 1;
  justify-content: center;
  background: var(--primary-color, #4361ee);
  color: white;
  border: none;
}

.primaryBtn:hover {
  background: var(--primary-dark, #3651d4);
}

.editBtn {
  flex: 1;
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-primary, #1e293b);
}

.editBtn:hover {
  border-color: var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
}

.publishBtn {
  background: #10b981;
  color: white;
  border: none;
}

.publishBtn:hover {
  background: #059669;
}

.archiveBtn {
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-secondary, #64748b);
  padding: 8px 12px !important;
}

.archiveBtn:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
}

/* Modal Styles */
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  direction: rtl;
}

.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.modalHeader h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.closeBtn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.closeBtn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.modalBody {
  padding: 24px;
}

.modalError {
  padding: 12px 16px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
}

.templateInfo {
  margin: 0 0 20px 0;
  color: var(--text-secondary, #64748b);
  font-size: 0.95rem;
}

.templateInfo strong {
  color: var(--text-primary, #1e293b);
}

.formGroup {
  margin-bottom: 16px;
}

.formGroup label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
}

.formGroup label .required {
  color: #ef4444;
}

.formGroup input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.formGroup input:focus {
  outline: none;
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
}

.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, #e2e8f0);
  background: var(--bg-secondary, #f8fafc);
  border-radius: 0 0 16px 16px;
}

.cancelBtn,
.submitBtn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cancelBtn {
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  color: var(--text-secondary, #64748b);
}

.cancelBtn:hover:not(:disabled) {
  background: var(--bg-secondary, #f1f5f9);
}

.submitBtn {
  background: var(--primary-color, #4361ee);
  border: none;
  color: white;
}

.submitBtn:hover:not(:disabled) {
  background: var(--primary-dark, #3651d4);
}

.submitBtn:disabled,
.cancelBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
  
  .header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .createBtn {
    justify-content: center;
  }
  
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .searchBox {
    width: 100%;
  }
  
  .templatesGrid {
    grid-template-columns: 1fr;
  }
}
</style>
