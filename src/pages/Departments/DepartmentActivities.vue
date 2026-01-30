<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import StatKpiCard from '../../components/Dashboard/StatKpiCard.vue';
import StatusDonutChart from '../../components/Dashboard/StatusDonutChart.vue';
import MonthlyPlannedActualLineChart from '../../components/Dashboard/MonthlyPlannedActualLineChart.vue';
import ActivityCard from '../../components/Dashboard/ActivityCard.vue';
import { dashboardService } from '../../services/dashboardService';
import type { KPICardData, DepartmentActivityItem } from '../../types/dashboard.types';

const route = useRoute();
const departmentId = computed(() => route.params.id as string);
const statusFilter = route.query.status as string | undefined;

// Loading and error state
const isLoading = ref(true);
const error = ref<string | null>(null);

// Department info
const departmentName = ref('');

// Dynamic data from API
const selectedYear = ref(new Date().getFullYear());
const years = ref<number[]>([]);
const kpiData = ref<KPICardData[]>([]);
const allActivities = ref<DepartmentActivityItem[]>([]);

// Donut chart data
const donutData = ref<Record<number, { total: number; items: { label: string; value: number; color: string }[] }>>({});

// Line chart data
const lineMonths = ref<string[]>([]);
const lineActualSeries = ref<{ label: string; value: number }[]>([]);
const linePlannedSeries = ref<{ label: string; value: number }[]>([]);

// Search query for activities
const searchQuery = ref('');

/**
 * Fetch department data from API
 */
async function fetchDepartmentData() {
	isLoading.value = true;
	error.value = null;
	
	try {
		const data = await dashboardService.getDepartmentDetail(
			Number(departmentId.value),
			selectedYear.value
		);
		
		// Set department info
		departmentName.value = data.name;
		
		// Set available years
		years.value = data.availableYears.length > 0 
			? data.availableYears 
			: [new Date().getFullYear()];
		
		// Set KPIs
		kpiData.value = data.kpis;
		
		// Set donut chart data
		donutData.value = {
			[data.statusDistribution.year]: {
				total: data.statusDistribution.total,
				items: data.statusDistribution.items
			}
		};
		
		// Set line chart data (weekly trend)
		lineMonths.value = data.weeklyTrend.weeks;
		lineActualSeries.value = data.weeklyTrend.weeks.map((week, index) => ({
			label: week,
			value: data.weeklyTrend.actual[index] || 0
		}));
		linePlannedSeries.value = data.weeklyTrend.weeks.map((week, index) => ({
			label: week,
			value: data.weeklyTrend.planned[index] || 0
		}));
		
		// Set activities
		allActivities.value = data.activities;
		
	} catch (err: any) {
		console.error('Error fetching department data:', err);
		error.value = err?.response?.data?.error || 'حدث خطأ أثناء تحميل البيانات';
	} finally {
		isLoading.value = false;
	}
}

// Filtered activities based on status and search
const filteredActivities = computed(() => {
	let result = allActivities.value;
	
	// Filter by status if specified
	if (statusFilter) {
		const statusMap: Record<string, 'completed' | 'in_progress' | 'late' | 'cancelled'> = {
			completed: 'completed',
			in_progress: 'in_progress',
			late: 'late',
			cancelled: 'cancelled'
		};
		const targetStatus = statusMap[statusFilter];
		result = result.filter(activity => activity.status === targetStatus);
	}
	
	// Filter by search query
	if (searchQuery.value.trim()) {
		const query = searchQuery.value.trim().toLowerCase();
		result = result.filter(activity => 
			activity.title.toLowerCase().includes(query) ||
			activity.assignee.toLowerCase().includes(query)
		);
	}
	
	return result;
});

// Watch for year changes to refetch data
watch(selectedYear, () => {
	fetchDepartmentData();
});

// Fetch data on mount
onMounted(() => {
	fetchDepartmentData();
});
</script>

<template>
	<div class="activities-page">
		<div class="page-header">
			<div class="breadcrumbs">
				<span class="breadcrumb-item">قائمة حصر الانشطة</span>
				<span class="breadcrumb-sep">/</span>
				<span class="breadcrumb-item active">{{ departmentName || 'لوحة أداء الأنشطة' }}</span>
			</div>
			<div class="header-actions">
				<button class="btn-filter btn-gold">
					اختر قسم <i class="bi bi-chevron-down"></i>
				</button>
				<select v-model="selectedYear" class="btn-filter">
					<option v-for="year in years" :key="year" :value="year">{{ year }}</option>
				</select>
				<button class="btn-export">
					<i class="bi bi-download"></i> تصدير البيانات
				</button>
			</div>
		</div>

		<!-- Loading State -->
		<div v-if="isLoading" class="loading-state">
			<i class="bi bi-arrow-repeat spin"></i>
			<span>جاري تحميل البيانات...</span>
		</div>

		<!-- Error State -->
		<div v-else-if="error" class="error-state">
			<i class="bi bi-exclamation-triangle"></i>
			<span>{{ error }}</span>
			<button @click="fetchDepartmentData" class="btn-retry">إعادة المحاولة</button>
		</div>

		<!-- Content -->
		<template v-else>
			<div class="kpi-grid">
				<StatKpiCard v-for="(kpi, idx) in kpiData" :key="idx" v-bind="kpi" />
			</div>

			<div class="charts-row">
				<div class="chart-card">
					<StatusDonutChart v-model="selectedYear" :years="years" :data-by-year="donutData"
						title="الأنشطة حسب الحالة" />
				</div>
				<div class="chart-card">
					<MonthlyPlannedActualLineChart title="المخطط مقابل الفعلي - اسبوعياً" :months="lineMonths"
						:actual-series="lineActualSeries" :planned-series="linePlannedSeries" :year-options="years" />
				</div>
			</div>

			<div class="activities-section">
				<div class="activities-header">
					<div class="search-wrapper">
						<i class="bi bi-search"></i>
						<input v-model="searchQuery" class="search-input" type="text" placeholder="ابحث عن نشاط..." />
						<span class="search-shortcut">⌘ F</span>
					</div>
					<div class="activities-title-group">
						<h2 class="activities-title">جميع الأنشطة</h2>
						<span class="activities-subtitle">{{ filteredActivities.length }} نشاط</span>
					</div>
				</div>

				<div v-if="filteredActivities.length > 0" class="activities-grid">
					<ActivityCard v-for="(activity, idx) in filteredActivities" :key="idx" v-bind="activity" />
				</div>
				<div v-else class="empty-state">
					<i class="bi bi-inbox"></i>
					<span>لا توجد أنشطة</span>
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped>
.activities-page {
	padding: 1.5rem;
	background: #f5f7fb;
	min-height: 100vh;
	direction: rtl;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	
	gap: 1rem;
	flex-wrap: wrap;
}

.breadcrumbs {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.9rem;
	color: #6b7280;
}

.breadcrumb-item {
	color: #9ca3af;
}

.breadcrumb-item.active {
	color: #a67c1e;
	font-weight: 600;
}

.breadcrumb-sep {
	color: #d1d5db;
}

.header-actions {
	display: flex;
	gap: 0.75rem;
	align-items: center;
	flex-direction: row-reverse;
}

.btn-filter,
.btn-export {
	background: white;
	border: 1px solid #e5e7eb;
	padding: 0.5rem 1rem;
	border-radius: 8px;
	color: #374151;
	font-size: 0.875rem;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.btn-gold {
	background-color: #a67c1e;
	color: white;
	border: none;
}

.btn-export {
	background-color: #a67c1e;
	color: white;
	border: none;
}

.kpi-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 1rem;
}

.charts-row {
	display: grid;
	grid-template-columns: 1fr 2fr;
	gap: 1rem;
	align-items: stretch;
}

.chart-card {
	background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
	padding: 1rem;
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.activities-section {
	margin-top: 0.5rem;
	background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
	padding: 1.25rem 1.5rem 1.5rem;
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.activities-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 1.5rem;
	flex-wrap: wrap;
	flex-direction: row-reverse;
}

.search-wrapper {
	background: #f9fafb;
	border-radius: 999px;
	padding: 0.45rem 1rem;
	border: 1px solid #e5e7eb;
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	min-width: 260px;
	position: relative;
}

.search-wrapper i {
	color: #9ca3af;
}

.search-input {
	border: none;
	outline: none;
	font-size: 0.85rem;
	width: 100%;
	color: #111827;
	background: transparent;
}

.search-input::placeholder {
	color: #9ca3af;
}

.search-shortcut {
	font-size: 0.7rem;
	color: #9ca3af;
	background: #e5e7eb;
	padding: 0.15rem 0.4rem;
	border-radius: 4px;
}

.activities-title-group {
	text-align: right;
}

.activities-title {
	margin: 0;
	font-size: 1rem;
	font-weight: 700;
	color: #111827;
}

.activities-subtitle {
	font-size: 0.8rem;
	color: #9ca3af;
}

.activities-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: 1.25rem;
}

/* Loading, Error, and Empty States */
.loading-state,
.error-state,
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1rem;
	padding: 3rem;
	background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
	color: #6b7280;
	font-size: 1rem;
}

.loading-state i,
.error-state i,
.empty-state i {
	font-size: 2.5rem;
	color: #a67c1e;
}

.error-state i {
	color: #ef4444;
}

.spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.btn-retry {
	background: #a67c1e;
	color: white;
	border: none;
	padding: 0.5rem 1.5rem;
	border-radius: 8px;
	cursor: pointer;
	font-size: 0.875rem;
}

.btn-retry:hover {
	background: #8c6818;
}

@media (max-width: 1024px) {
	.charts-row {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 768px) {
	.activities-grid {
		grid-template-columns: 1fr;
	}
}
</style>
