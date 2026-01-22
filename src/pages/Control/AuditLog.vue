<template>
  <div :class="$style.auditPanel" :data-theme="currentTheme" :dir="isRTL ? 'rtl' : 'ltr'">
    <!-- Hero Section -->
    <section :class="$style.heroSection">
      <div :class="$style.heroContent">
        <div :class="$style.heroText">
          <div :class="$style.sectionHerto">
            <h1>{{ isRTL ? 'سجل التدقيق' : 'Audit Log' }}</h1>
            <p :class="$style.heroSubtitle">
              {{ isRTL ? 'تتبع جميع الإجراءات الحرجة في النظام' : 'Track all critical system actions' }}
            </p>
          </div>
        </div>
        <div :class="$style.heroActions">
          <button :class="$style.secondaryButton" @click="refreshData" :disabled="isLoading">
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoading }"></i>
            {{ isRTL ? 'تحديث' : 'Refresh' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section :class="$style.statsSection" v-if="stats">
      <div :class="$style.kpiGrid">
        <!-- Total Logs -->
        <div :class="$style.kpiCard">
          <div :class="$style.kpiTop">
            <div :class="$style.kpiHead">
              <div :class="$style.kpiBadge">
                <i class="fas fa-clipboard-list"></i>
              </div>
              <div :class="$style.kpiTitle">{{ isRTL ? 'إجمالي السجلات' : 'Total Logs' }}</div>
            </div>
          </div>
          <div :class="$style.kpiMain">
            <span :class="$style.kpiNumber">{{ stats.total_logs?.toLocaleString() || 0 }}</span>
            <span :class="$style.kpiUnit">{{ isRTL ? 'سجل' : 'entries' }}</span>
          </div>
        </div>

        <!-- Today's Logs -->
        <div :class="$style.kpiCard">
          <div :class="$style.kpiTop">
            <div :class="$style.kpiHead">
              <div :class="$style.kpiBadge">
                <i class="fas fa-calendar-day"></i>
              </div>
              <div :class="$style.kpiTitle">{{ isRTL ? 'سجلات اليوم' : 'Today\'s Logs' }}</div>
            </div>
          </div>
          <div :class="$style.kpiMain">
            <span :class="$style.kpiNumber">{{ stats.logs_today?.toLocaleString() || 0 }}</span>
            <span :class="$style.kpiUnit">{{ isRTL ? 'سجل' : 'entries' }}</span>
          </div>
        </div>

        <!-- This Week's Logs -->
        <div :class="$style.kpiCard">
          <div :class="$style.kpiTop">
            <div :class="$style.kpiHead">
              <div :class="$style.kpiBadge">
                <i class="fas fa-calendar-week"></i>
              </div>
              <div :class="$style.kpiTitle">{{ isRTL ? 'سجلات الأسبوع' : 'This Week' }}</div>
            </div>
          </div>
          <div :class="$style.kpiMain">
            <span :class="$style.kpiNumber">{{ stats.logs_this_week?.toLocaleString() || 0 }}</span>
            <span :class="$style.kpiUnit">{{ isRTL ? 'سجل' : 'entries' }}</span>
          </div>
        </div>

        <!-- Top Actor -->
        <div :class="$style.kpiCard">
          <div :class="$style.kpiTop">
            <div :class="$style.kpiHead">
              <div :class="$style.kpiBadge">
                <i class="fas fa-user-shield"></i>
              </div>
              <div :class="$style.kpiTitle">{{ isRTL ? 'الأكثر نشاطاً' : 'Top Actor' }}</div>
            </div>
          </div>
          <div :class="$style.kpiMain">
            <span :class="$style.kpiName">{{ topActor?.actor_name || (isRTL ? 'لا يوجد' : 'N/A') }}</span>
            <span :class="$style.kpiUnit" v-if="topActor">{{ topActor.count }} {{ isRTL ? 'إجراء' : 'actions' }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Filters Section -->
    <section :class="$style.filtersSection">
      <div :class="$style.filtersGroup">
        <!-- Actor Filter -->
        <div :class="$style.filterItem">
          <label :class="$style.filterLabel">{{ isRTL ? 'المستخدم' : 'Actor' }}</label>
          <select v-model="filters.actor_name" :class="$style.filterSelect" @change="applyFilters">
            <option value="">{{ isRTL ? 'جميع المستخدمين' : 'All Actors' }}</option>
            <option v-for="actor in actors" :key="actor" :value="actor">{{ actor }}</option>
          </select>
        </div>

        <!-- Action Filter -->
        <div :class="$style.filterItem">
          <label :class="$style.filterLabel">{{ isRTL ? 'نوع الإجراء' : 'Action Type' }}</label>
          <select v-model="filters.action" :class="$style.filterSelect" @change="applyFilters">
            <option value="">{{ isRTL ? 'جميع الإجراءات' : 'All Actions' }}</option>
            <option v-for="action in actions" :key="action.value" :value="action.value">{{ action.label }}</option>
          </select>
        </div>

        <!-- Start Date -->
        <div :class="$style.filterItem">
          <label :class="$style.filterLabel">{{ isRTL ? 'من تاريخ' : 'Start Date' }}</label>
          <input 
            type="date" 
            v-model="filters.start_date" 
            :class="$style.filterInput"
            @change="applyFilters"
          />
        </div>

        <!-- End Date -->
        <div :class="$style.filterItem">
          <label :class="$style.filterLabel">{{ isRTL ? 'إلى تاريخ' : 'End Date' }}</label>
          <input 
            type="date" 
            v-model="filters.end_date" 
            :class="$style.filterInput"
            @change="applyFilters"
          />
        </div>

        <!-- Clear Filters -->
        <button :class="$style.clearButton" @click="clearFilters" v-if="hasActiveFilters">
          <i class="fas fa-times"></i>
          {{ isRTL ? 'مسح الفلاتر' : 'Clear Filters' }}
        </button>
      </div>
    </section>

    <!-- Logs Table Section -->
    <section :class="$style.logsSection">
      <!-- Loading State -->
      <div v-if="isLoading" :class="$style.loadingState">
        <div :class="$style.spinner"></div>
        <p>{{ isRTL ? 'جاري تحميل السجلات...' : 'Loading logs...' }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="logs.length === 0" :class="$style.emptyState">
        <i class="fas fa-inbox"></i>
        <h3>{{ isRTL ? 'لا توجد سجلات' : 'No Logs Found' }}</h3>
        <p>{{ isRTL ? 'لم يتم العثور على سجلات تطابق معايير البحث' : 'No logs match your search criteria' }}</p>
      </div>

      <!-- Logs Table -->
      <div v-else :class="$style.tableWrapper">
        <table :class="$style.logsTable">
          <thead>
            <tr>
              <th>{{ isRTL ? 'التاريخ والوقت' : 'Date & Time' }}</th>
              <th>{{ isRTL ? 'المستخدم' : 'Actor' }}</th>
              <th>{{ isRTL ? 'الإجراء' : 'Action' }}</th>
              <th>{{ isRTL ? 'العنصر' : 'Object' }}</th>
              <th>{{ isRTL ? 'الوصف' : 'Description' }}</th>
              <!-- <th>{{ isRTL ? 'التغييرات' : 'Changes' }}</th> -->
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td :class="$style.timestampCell">
                <div :class="$style.timestamp">
                  <span :class="$style.date">{{ formatDate(log.timestamp) }}</span>
                  <span :class="$style.time">{{ formatTime(log.timestamp) }}</span>
                </div>
              </td>
              <td :class="$style.actorCell">
                <div :class="$style.actorInfo">
                  <div :class="$style.actorAvatar">
                    <i class="fas fa-user"></i>
                  </div>
                  <span>{{ log.actor_name }}</span>
                </div>
              </td>
              <td>
                <span :class="[$style.actionBadge, getActionClass(log.action)]">
                  {{ log.action_display }}
                </span>
              </td>
              <td :class="$style.objectCell">{{ log.object_name }}</td>
              <td :class="$style.descriptionCell">{{ log.description }}</td>
              <!-- <td :class="$style.changesCell">
                <button 
                  v-if="Object.keys(log.changes || {}).length > 0" 
                  :class="$style.viewChangesBtn"
                  @click="showChanges(log)"
                >
                  <i class="fas fa-eye"></i>
                  {{ isRTL ? 'عرض' : 'View' }}
                </button>
                <span v-else :class="$style.noChanges">-</span>
              </td> -->
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" :class="$style.pagination">
        <button 
          :class="$style.pageButton" 
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          <i :class="isRTL ? 'fas fa-chevron-right' : 'fas fa-chevron-left'"></i>
        </button>

        <div :class="$style.pageInfo">
          <span>{{ isRTL ? 'صفحة' : 'Page' }}</span>
          <input 
            type="number" 
            :value="currentPage" 
            :min="1" 
            :max="totalPages"
            :class="$style.pageInput"
            @change="handlePageInput"
          />
          <span>{{ isRTL ? 'من' : 'of' }} {{ totalPages }}</span>
        </div>

        <button 
          :class="$style.pageButton" 
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <i :class="isRTL ? 'fas fa-chevron-left' : 'fas fa-chevron-right'"></i>
        </button>

        <div :class="$style.totalCount">
          {{ isRTL ? `${totalCount} سجل` : `${totalCount} entries` }}
        </div>
      </div>
    </section>

    <!-- Changes Modal -->
    <Teleport to="body">
      <div v-if="showChangesModal" :class="$style.modalOverlay" @click.self="closeChangesModal">
        <div :class="$style.modal" :dir="isRTL ? 'rtl' : 'ltr'">
          <div :class="$style.modalHeader">
            <h3>{{ isRTL ? 'تفاصيل التغييرات' : 'Change Details' }}</h3>
            <button :class="$style.closeButton" @click="closeChangesModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div :class="$style.modalBody">
            <div v-if="selectedLog" :class="$style.changesList">
              <div 
                v-for="(change, field) in selectedLog.changes" 
                :key="field" 
                :class="$style.changeItem"
              >
                <div :class="$style.changeField">{{ field }}</div>
                <div :class="$style.changeValues">
                  <div :class="$style.oldValue">
                    <span :class="$style.valueLabel">{{ isRTL ? 'القديم:' : 'Old:' }}</span>
                    <span>{{ change.old || (isRTL ? 'فارغ' : 'Empty') }}</span>
                  </div>
                  <i class="fas fa-arrow-left" :class="$style.changeArrow"></i>
                  <div :class="$style.newValue">
                    <span :class="$style.valueLabel">{{ isRTL ? 'الجديد:' : 'New:' }}</span>
                    <span>{{ change.new || (isRTL ? 'فارغ' : 'Empty') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, useCssModule } from 'vue'
import { useAppStore } from '../../stores/useAppStore'
import { 
  getAuditLogs, 
  getAuditStats, 
  getAuditActors, 
  getAuditActions,
  type AuditLogEntry,
  type AuditStatsResponse,
  type ActionItem,
  type AuditLogsParams
} from '../../services/auditService'

// CSS Module
const $style = useCssModule()

// Store
const store = useAppStore()

// Computed from store
const currentTheme = computed(() => store.currentTheme)
const isRTL = computed(() => store.currentLanguage === 'ar')

// State
const isLoading = ref(false)
const logs = ref<AuditLogEntry[]>([])
const stats = ref<AuditStatsResponse | null>(null)
const actors = ref<string[]>([])
const actions = ref<ActionItem[]>([])

// Pagination
const currentPage = ref(1)
const pageSize = ref(50)
const totalCount = ref(0)
const totalPages = ref(1)

// Filters
const filters = reactive<AuditLogsParams>({
  action: '',
  actor_name: '',
  start_date: '',
  end_date: ''
})

// Modal
const showChangesModal = ref(false)
const selectedLog = ref<AuditLogEntry | null>(null)

// Computed
const hasActiveFilters = computed(() => {
  return filters.action || filters.actor_name || filters.start_date || filters.end_date
})

const topActor = computed(() => {
  if (stats.value?.top_actors?.length) {
    return stats.value.top_actors[0]
  }
  return null
})

// Methods
const fetchLogs = async () => {
  isLoading.value = true
  try {
    const params: AuditLogsParams = {
      page: currentPage.value,
      page_size: pageSize.value
    }
    
    if (filters.action) params.action = filters.action
    if (filters.actor_name) params.actor_name = filters.actor_name
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date
    
    const response = await getAuditLogs(params)
    logs.value = response.results
    totalCount.value = response.count
    totalPages.value = response.total_pages
  } catch (error) {
    console.error('Failed to fetch logs:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchStats = async () => {
  try {
    stats.value = await getAuditStats()
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }
}

const fetchActors = async () => {
  try {
    const response = await getAuditActors()
    actors.value = response.actors
  } catch (error) {
    console.error('Failed to fetch actors:', error)
  }
}

const fetchActions = async () => {
  try {
    const response = await getAuditActions()
    actions.value = response.actions
  } catch (error) {
    console.error('Failed to fetch actions:', error)
  }
}

const refreshData = async () => {
  await Promise.all([
    fetchLogs(),
    fetchStats()
  ])
}

const applyFilters = () => {
  currentPage.value = 1
  fetchLogs()
}

const clearFilters = () => {
  filters.action = ''
  filters.actor_name = ''
  filters.start_date = ''
  filters.end_date = ''
  currentPage.value = 1
  fetchLogs()
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchLogs()
  }
}

const handlePageInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const page = parseInt(target.value, 10)
  if (!isNaN(page)) {
    goToPage(page)
  }
}

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString(isRTL.value ? 'ar-AE' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString(isRTL.value ? 'ar-AE' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getActionClass = (action: string) => {
  if (action.includes('CREATE')) return $style.actionCreate
  if (action.includes('UPDATE')) return $style.actionUpdate
  if (action.includes('DELETE')) return $style.actionDelete
  if (action.includes('ACTIVATE')) return $style.actionActivate
  if (action.includes('DEACTIVATE')) return $style.actionDeactivate
  if (action.includes('SUBMIT')) return $style.actionSubmit
  if (action.includes('ASSIGN') || action.includes('GRANT')) return $style.actionGrant
  if (action.includes('REVOKE')) return $style.actionRevoke
  return $style.actionDefault
}


const closeChangesModal = () => {
  showChangesModal.value = false
  selectedLog.value = null
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchLogs(),
    fetchStats(),
    fetchActors(),
    fetchActions()
  ])
})
</script>

<style module src="./AuditLog.module.css">
/* CSS Module styles are imported from AuditLog.module.css */
</style>
