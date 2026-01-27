<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import StatKpiCard from '../../components/Dashboard/StatKpiCard.vue';
import OverallCompletionCard from '../../components/Dashboard/OverallCompletionCard.vue';
import QuarterlyBarChart from '../../components/Dashboard/QuarterlyBarChart.vue';
import DepartmentStatsCard from '../../components/Dashboard/DepartmentStatsCard.vue';
import { dashboardService } from '@/services/dashboardService';
import type { 
	KPICardData, 
	BarChartDataByYear,
	ProgramDepartmentStats 
} from '@/types/dashboard.types';

// Route
const route = useRoute();
const programId = computed(() => Number(route.params.id));

// State
const loading = ref(true);
const error = ref<string | null>(null);
const selectedYear = ref(new Date().getFullYear());
const years = ref<number[]>([2024, 2025, 2026]);

// Program info
const programTitle = ref('تحميل...');
const programDescription = ref('');

// KPI data
const kpiData = ref<KPICardData[]>([
	{ title: 'إجمالي الأنشطة', icon: 'bi bi-activity', value: 0, valueLabel: 'نشاط', trend: 'flat', percentage: 0, footerText: 'في هذا الشهر' },
	{ title: 'مكتمل', icon: 'bi bi-check-circle', value: 0, valueLabel: 'نشاط', trend: 'flat', percentage: 0, footerText: 'في هذا الشهر' },
	{ title: 'قيد التنفيذ', icon: 'bi bi-clock-history', value: 0, valueLabel: 'نشاط', trend: 'flat', percentage: 0, footerText: 'في هذا الشهر' },
	{ title: 'متأخر', icon: 'bi bi-exclamation-triangle', value: 0, valueLabel: 'نشاط', trend: 'flat', percentage: 0, footerText: 'في هذا الشهر' },
	{ title: 'ملغي', icon: 'bi bi-x-circle', value: 0, valueLabel: 'نشاط', trend: 'flat', percentage: 0, footerText: 'في هذا الشهر' }
]);

// Overall completion
const overall = ref({
	percentage: 0,
	completed: 0,
	total: 0,
	departments: 0
});

// Bar chart data (by department)
const barChartData = ref<BarChartDataByYear>({});

// Department stats
const departmentsStats = ref<ProgramDepartmentStats[]>([]);

// Search
const departmentSearch = ref('');

// Filtered departments based on search
const filteredDepartments = computed(() => {
	if (!departmentSearch.value) {
		return departmentsStats.value;
	}
	const search = departmentSearch.value.toLowerCase();
	return departmentsStats.value.filter(dept =>
		dept.title.toLowerCase().includes(search)
	);
});

// Fetch program data
async function fetchProgramData() {
	loading.value = true;
	error.value = null;
	
	try {
		const data = await dashboardService.getProgramDetail(programId.value, selectedYear.value);
		
		// Update program info
		programTitle.value = data.title;
		programDescription.value = data.description;
		
		// Update years
		if (data.availableYears?.length > 0) {
			years.value = data.availableYears;
			if (!years.value.includes(selectedYear.value)) {
				selectedYear.value = years.value[0];
			}
		}
		
		// Update KPIs
		kpiData.value = data.kpis;
		
		// Update overall completion
		overall.value = {
			percentage: data.overall.percentage,
			completed: data.overall.completed,
			total: data.overall.total,
			departments: data.overall.departmentsCount
		};
		
		// Update bar chart data
		barChartData.value = data.barChartData;
		
		// Update department stats
		departmentsStats.value = data.departmentStats;
		
	} catch (err: any) {
		console.error('Failed to fetch program data:', err);
		error.value = err.response?.data?.error || 'فشل في تحميل بيانات البرنامج';
	} finally {
		loading.value = false;
	}
}

// Watch for year changes
watch(selectedYear, () => {
	fetchProgramData();
});

// Watch for program ID changes (navigation)
watch(programId, () => {
	fetchProgramData();
});

// Initial load
onMounted(() => {
	fetchProgramData();
});
</script>

<template>
	<div class="details-page">
		<div class="page-header">
			<h1>{{ programTitle }}</h1>
			<div class="crumbs">قائمة حصر الأنشطة / لوحة أداء الأنشطة</div>
		</div>

		<div class="kpi-grid">
			<StatKpiCard v-for="(kpi, idx) in kpiData" :key="idx" v-bind="kpi" />
		</div>

		<div class="charts-row">
			<div class="chart-card wide">
				<QuarterlyBarChart v-model="selectedYear" :years="years" :data-by-year="barChartData" />
			</div>
			<div class="chart-card">
				<OverallCompletionCard v-model="selectedYear" :year-options="years" title="الإنجاز الإجمالي"
					:percentage="overall.percentage" :completed="overall.completed" :total="overall.total"
					:departments-count="overall.departments" />
			</div>
		</div>

		<div class="departments-section">
			<div class="departments-header">
				<div class="search-wrapper">
					<i class="bi bi-search" />
					<input v-model="departmentSearch" class="search-input" type="text" placeholder="بحث عن قسم..." />
				</div>
				<div class="departments-title-group">
					<h2 class="departments-title">إحصائيات الأقسام</h2>
					<span class="departments-subtitle">{{ filteredDepartments.length }} أقسام</span>
				</div>
			</div>

		<div class="departments-grid">
			<DepartmentStatsCard v-for="(dept, idx) in filteredDepartments" :key="dept.title" v-bind="dept"
				:department-id="dept.departmentId || idx + 1" />
		</div>
		</div>
	</div>
</template>

<style scoped>
.details-page {
	padding: 1.5rem;
	background: #f5f7fb;
	min-height: 100vh;
	direction: rtl;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.page-header h1 {
	margin: 0;
	font-size: 1.4rem;
	color: #111827;
}

.crumbs {
	color: #9ca3af;
	font-size: 0.9rem;
	margin-top: 0.25rem;
}

.kpi-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 1rem;
}

.charts-row {
	display: grid;
	grid-template-columns: 2fr 1fr;
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

.chart-card.wide {
	padding: 0.5rem 1rem;
}

.donut-meta {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	margin-top: 0.5rem;
}

.meta-row {
	display: flex;
	justify-content: space-between;
	color: #111827;
	font-size: 0.9rem;
}

.muted {
	color: #9ca3af;
}

.gold {
	color: #a67c1e;
	font-weight: 700;
}

 .departments-section {
 	margin-top: 1.5rem;
 	background: #ffffff;
 	border-radius: 16px;
 	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
 	padding: 1.25rem 1.5rem 1.5rem;
 	display: flex;
 	flex-direction: column;
 	gap: 1.1rem;
 }

 .departments-header {
 	display: flex;
 	justify-content: space-between;
 	align-items: center;
 	gap: 1.5rem;
 	flex-wrap: wrap;
	flex-direction: row-reverse;
 }

 .departments-title-group {
 	text-align: right;
 }

 .departments-title {
 	margin: 0;
 	font-size: 1rem;
 	font-weight: 700;
 	color: #111827;
 }

 .departments-subtitle {
 	font-size: 0.8rem;
 	color: #9ca3af;
 }

 .departments-grid {
 	display: grid;
 	grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
 	gap: 1rem;
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
 }

 .search-input::placeholder {
 	color: #9ca3af;
 }

@media (max-width: 1024px) {
	.charts-row {
		grid-template-columns: 1fr;
	}
}
</style>

