<!-- src/pages/Activities/SheetList.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useActivitySheet } from '@/composables/useActivitySheet'
import type { SheetListItem } from '@/types/activity.types'

const router = useRouter()
const { 
  sheets,
  isLoading, 
  lastError,
  loadSheets,
  deleteSheet
} = useActivitySheet()

// State
const showDeleteModal = ref(false)
const sheetToDelete = ref<SheetListItem | null>(null)
const isDeleting = ref(false)
const actionError = ref('')
const searchQuery = ref('')

// Filtered sheets
const filteredSheets = computed(() => {
  if (!searchQuery.value) return sheets.value
  
  const query = searchQuery.value.toLowerCase()
  return sheets.value.filter(s => 
    s.name.toLowerCase().includes(query) ||
    (s.template_name && s.template_name.toLowerCase().includes(query))
  )
})

// Group sheets by template
const groupedSheets = computed(() => {
  const groups: { [key: string]: SheetListItem[] } = {}
  
  for (const sheet of filteredSheets.value) {
    const templateName = sheet.template_name || 'بدون قالب'
    if (!groups[templateName]) {
      groups[templateName] = []
    }
    groups[templateName].push(sheet)
  }
  
  return groups
})

// Navigate to sheet spreadsheet view
const openSheet = (sheet: SheetListItem) => {
  router.push(`/activities/spreadsheet/${sheet.id}`)
}

// Open delete modal
const confirmDelete = (sheet: SheetListItem) => {
  sheetToDelete.value = sheet
  showDeleteModal.value = true
  actionError.value = ''
}

// Close delete modal
const closeDeleteModal = () => {
  showDeleteModal.value = false
  sheetToDelete.value = null
  actionError.value = ''
}

// Handle delete
const handleDelete = async () => {
  if (!sheetToDelete.value) return
  
  isDeleting.value = true
  actionError.value = ''
  
  try {
    await deleteSheet(sheetToDelete.value.id)
    closeDeleteModal()
  } catch (error: any) {
    actionError.value = error.response?.data?.detail || 'فشل حذف الورقة'
  } finally {
    isDeleting.value = false
  }
}

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  await loadSheets()
})
</script>

<template>
  <div :class="$style.container">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.titleSection">
        <h1 :class="$style.title">
          <i class="fas fa-file-alt"></i>
          أوراق الأنشطة
        </h1>
        <p :class="$style.subtitle">جميع أوراق العمل الخاصة بك</p>
      </div>
      
      <router-link to="/activities/templates" :class="$style.templatesLink">
        <i class="fas fa-layer-group"></i>
        إدارة القوالب
      </router-link>
    </div>

    <!-- Error Message -->
    <div v-if="lastError" :class="$style.errorMsg">
      <i class="fas fa-exclamation-circle"></i>
      {{ lastError }}
    </div>

    <!-- Search -->
    <div :class="$style.searchSection">
      <div :class="$style.searchBox">
        <i class="fas fa-search"></i>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="بحث في الأوراق..."
        />
      </div>
      
      <div :class="$style.stats">
        <span>
          <i class="fas fa-file-alt"></i>
          {{ sheets.length }} ورقة
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" :class="$style.loading">
      <i class="fas fa-spinner fa-spin"></i>
      جاري التحميل...
    </div>

    <!-- Empty State -->
    <div v-else-if="sheets.length === 0" :class="$style.emptyState">
      <i class="fas fa-folder-open"></i>
      <p>لا توجد أوراق بعد</p>
      <p :class="$style.hint">أنشئ ورقة جديدة من أحد القوالب المنشورة</p>
      <router-link to="/activities/templates" :class="$style.emptyBtn">
        <i class="fas fa-layer-group"></i>
        عرض القوالب
      </router-link>
    </div>

    <!-- No results -->
    <div v-else-if="filteredSheets.length === 0" :class="$style.emptyState">
      <i class="fas fa-search"></i>
      <p>لا توجد نتائج تطابق البحث</p>
    </div>

    <!-- Sheets grouped by template -->
    <div v-else :class="$style.groupsContainer">
      <div 
        v-for="(groupSheets, templateName) in groupedSheets" 
        :key="templateName"
        :class="$style.group"
      >
        <div :class="$style.groupHeader">
          <h3>
            <i class="fas fa-layer-group"></i>
            {{ templateName }}
          </h3>
          <span :class="$style.groupCount">{{ groupSheets.length }}</span>
        </div>
        
        <div :class="$style.sheetsGrid">
          <div
            v-for="sheet in groupSheets"
            :key="sheet.id"
            :class="$style.sheetCard"
            @click="openSheet(sheet)"
          >
            <div :class="$style.cardHeader">
              <h4 :class="$style.sheetName">{{ sheet.name }}</h4>
              <button 
                :class="$style.deleteBtn"
                @click.stop="confirmDelete(sheet)"
                title="حذف الورقة"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
            
            <div :class="$style.cardMeta">
              <span :title="`${sheet.row_count} صفوف`">
                <i class="fas fa-table"></i>
                {{ sheet.row_count }} صف
              </span>
              <span :title="`${sheet.column_count} أعمدة`">
                <i class="fas fa-columns"></i>
                {{ sheet.column_count }} عمود
              </span>
            </div>
            
            <div :class="$style.cardFooter">
              <span :class="$style.dateCreated" :title="formatDateTime(sheet.created_at)">
                <i class="fas fa-calendar-plus"></i>
                {{ formatDate(sheet.created_at) }}
              </span>
              <span :class="$style.dateUpdated" :title="formatDateTime(sheet.updated_at)">
                <i class="fas fa-clock"></i>
                {{ formatDate(sheet.updated_at) }}
              </span>
            </div>
            
            <div :class="$style.cardOverlay">
              <i class="fas fa-external-link-alt"></i>
              فتح الورقة
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" :class="$style.modalOverlay" @click.self="closeDeleteModal">
        <div :class="$style.modal">
          <div :class="$style.modalHeader">
            <h2>
              <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
              تأكيد الحذف
            </h2>
            <button :class="$style.closeBtn" @click="closeDeleteModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div :class="$style.modalBody">
            <div v-if="actionError" :class="$style.modalError">
              <i class="fas fa-exclamation-circle"></i>
              {{ actionError }}
            </div>
            
            <p>
              هل أنت متأكد من حذف الورقة 
              <strong>"{{ sheetToDelete?.name }}"</strong>؟
            </p>
            <p :class="$style.warning">
              <i class="fas fa-info-circle"></i>
              سيتم حذف جميع البيانات الموجودة في هذه الورقة نهائياً ولا يمكن استرجاعها.
            </p>
          </div>
          
          <div :class="$style.modalFooter">
            <button :class="$style.cancelBtn" @click="closeDeleteModal" :disabled="isDeleting">
              إلغاء
            </button>
            <button :class="$style.confirmDeleteBtn" @click="handleDelete" :disabled="isDeleting">
              <i v-if="isDeleting" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-trash"></i>
              حذف نهائياً
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

.templatesLink {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  color: var(--text-primary, #1e293b);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
}

.templatesLink:hover {
  border-color: var(--primary-color, #4361ee);
  color: var(--primary-color, #4361ee);
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

.searchSection {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.searchBox {
  position: relative;
  flex: 1;
  max-width: 400px;
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

.stats {
  display: flex;
  gap: 16px;
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
}

.stats span {
  display: flex;
  align-items: center;
  gap: 6px;
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
  margin: 0 0 8px 0;
}

.emptyState .hint {
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.emptyBtn {
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
  text-decoration: none;
  transition: all 0.2s;
}

.emptyBtn:hover {
  background: var(--primary-dark, #3651d4);
}

.groupsContainer {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.group {
  background: white;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
}

.groupHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(to left, #f8fafc, white);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.groupHeader h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  display: flex;
  align-items: center;
  gap: 10px;
}

.groupHeader h3 i {
  color: var(--primary-color, #4361ee);
}

.groupCount {
  background: var(--primary-color, #4361ee);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.sheetsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
}

.sheetCard {
  position: relative;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.sheetCard:hover {
  border-color: var(--primary-color, #4361ee);
  box-shadow: 0 4px 12px rgba(67, 97, 238, 0.15);
  transform: translateY(-2px);
}

.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.sheetName {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  margin: 0;
  flex: 1;
  line-height: 1.4;
}

.deleteBtn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  opacity: 0;
}

.sheetCard:hover .deleteBtn {
  opacity: 1;
}

.deleteBtn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.cardMeta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.cardMeta span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
}

.cardMeta i {
  font-size: 0.8rem;
  opacity: 0.7;
}

.cardFooter {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.dateCreated,
.dateUpdated {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
}

.cardOverlay {
  position: absolute;
  inset: 0;
  background: rgba(67, 97, 238, 0.95);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  opacity: 0;
  transition: all 0.2s;
}

.sheetCard:hover .cardOverlay {
  opacity: 1;
}

/* Modal */
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
  display: flex;
  align-items: center;
  gap: 10px;
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

.modalBody p {
  margin: 0 0 16px 0;
  color: var(--text-primary, #1e293b);
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

.warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 8px;
  font-size: 0.9rem;
}

.warning i {
  margin-top: 2px;
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
.confirmDeleteBtn {
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

.confirmDeleteBtn {
  background: #ef4444;
  border: none;
  color: white;
}

.confirmDeleteBtn:hover:not(:disabled) {
  background: #dc2626;
}

.confirmDeleteBtn:disabled,
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
  
  .templatesLink {
    justify-content: center;
  }
  
  .sheetsGrid {
    grid-template-columns: 1fr;
  }
}
</style>
