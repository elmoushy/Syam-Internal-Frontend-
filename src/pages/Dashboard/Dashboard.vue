<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import StatKpiCard from '../../components/Dashboard/StatKpiCard.vue';
import StatusDonutChart from '../../components/Dashboard/StatusDonutChart.vue';
import QuarterlyBarChart from '../../components/Dashboard/QuarterlyBarChart.vue';
import MonthlyPlannedActualLineChart from '../../components/Dashboard/MonthlyPlannedActualLineChart.vue';
import ProgramPerformanceCard from '../../components/Dashboard/ProgramPerformanceCard.vue';
import { dashboardService } from '../../services/dashboardService';
import type { KPICardData, ProgramPerformance } from '../../types/dashboard.types';

// Loading and error states
const isLoading = ref(true);
const error = ref<string | null>(null);

// Year selection
const selectedYear = ref(new Date().getFullYear());
const years = ref<number[]>([]);

// Search for programs
const programSearch = ref('');

// KPI Card Data - reactive from API
const kpiData = ref<KPICardData[]>([
	{
		title: 'إجمالي الأنشطة',
		icon: 'bi bi-activity',
		value: 0,
		valueLabel: 'نشاط',
		trend: 'flat',
		percentage: 0,
		footerText: 'في هذا الشهر'
	},
	{
		title: 'الأقسام المشاركة',
		icon: 'bi bi-building',
		value: 0,
		valueLabel: 'قسم مشارك',
		trend: 'flat',
		percentage: 0,
		footerText: 'في هذا الشهر'
	},
	{
		title: 'الأقسام غير المشاركة',
		icon: 'bi bi-x-circle',
		value: 0,
		valueLabel: 'أقسام غير مشاركة',
		trend: 'flat',
		percentage: 0,
		footerText: 'في هذا الشهر'
	},
	{
		title: 'معدل الإنجاز الإجمالي',
		icon: 'bi bi-check-circle',
		value: '0%',
		valueLabel: '',
		trend: 'flat',
		percentage: 0,
		footerText: 'في هذا الشهر'
	}
]);

// Donut Chart Data - reactive from API
const donutData = ref<Record<number, { total: number; items: { label: string; value: number; color: string }[] }>>({});

// Bar Chart Data - reactive from API  
const barChartData = ref<Record<number, { quarters: { label: string; planned: number; actual: number }[] }>>({});

// Line Chart Data - reactive from API
const lineMonths = ref<string[]>([]);
const lineActualSeries = ref<{ label: string; value: number }[]>([]);
const linePlannedSeries = ref<{ label: string; value: number }[]>([]);

// Programs Data - reactive from API
const programCards = ref<ProgramPerformance[]>([]);

// Filtered programs based on search
const filteredPrograms = computed(() => {
	if (!programSearch.value.trim()) {
		return programCards.value;
	}
	const searchTerm = programSearch.value.toLowerCase();
	return programCards.value.filter(program =>
		program.title.toLowerCase().includes(searchTerm) ||
		program.description.toLowerCase().includes(searchTerm)
	);
});

// Fetch all dashboard data
async function fetchDashboardData() {
	isLoading.value = true;
	error.value = null;
	
	try {
		// Fetch full dashboard data in single request
		const data = await dashboardService.getFullDashboard({ year: selectedYear.value });
		
		// Update available years
		years.value = data.availableYears;
		
		// Update KPI cards using transform helper
		kpiData.value = dashboardService.transformToKPICards(data.kpis);
		
		// Update donut chart data
		donutData.value = dashboardService.transformStatusDistributionByYear(
			data.statusDistribution,
			years.value
		);
		
		// Update bar chart data
		barChartData.value = dashboardService.transformQuarterlyDataByYear(
			data.quarterlyData,
			years.value
		);
		
		// Update line chart data
		const monthlyData = dashboardService.transformMonthlyTrend(data.monthlyTrend);
		lineMonths.value = monthlyData.months;
		lineActualSeries.value = monthlyData.actualSeries;
		linePlannedSeries.value = monthlyData.plannedSeries;
		
		// Update programs
		programCards.value = data.programs;
		
	} catch (err: any) {
		console.error('Failed to fetch dashboard data:', err);
		error.value = err.response?.data?.error || 'فشل في تحميل بيانات لوحة المعلومات';
	} finally {
		isLoading.value = false;
	}
}

// Search programs with debounce
let searchTimeout: ReturnType<typeof setTimeout>;
async function searchPrograms() {
	clearTimeout(searchTimeout);
	searchTimeout = setTimeout(async () => {
		if (programSearch.value.trim()) {
			try {
				const programs = await dashboardService.getPrograms({
					year: selectedYear.value,
					search: programSearch.value
				});
				programCards.value = programs;
			} catch (err) {
				console.error('Failed to search programs:', err);
			}
		} else {
			// If search cleared, reload all programs
			const programs = await dashboardService.getPrograms({ year: selectedYear.value });
			programCards.value = programs;
		}
	}, 300);
}

// Watch for year changes
watch(selectedYear, () => {
	fetchDashboardData();
});

// Watch for search changes
watch(programSearch, () => {
	searchPrograms();
});

// Initial load
onMounted(() => {
	fetchDashboardData();
});
</script>

<template>
	<div class="dashboard-container">
		<div class="dashboard-header">
			<h1 class="page-title">لوحة أداء الاستراتيجية</h1>
			<div class="header-actions">
				<!-- Year Filter Dropdown -->
				<select v-model="selectedYear" class="btn-filter">
					<option v-for="year in years" :key="year" :value="year">{{ year }}</option>
				</select>
				<!-- Export Button -->
				<button class="btn-export">
					<i class="bi bi-download"></i> تصدير البيانات
				</button>
			</div>
		</div>

		<!-- WRAPPER for Grid -->
		<div class="dashboard-content">

			<!-- KPI Row -->
			<div class="kpi-grid">
				<StatKpiCard v-for="(kpi, index) in kpiData" :key="index" v-bind="kpi" class="kpi-item" />
			</div>

			<!-- Charts Row -->
			<div class="charts-grid">
				<div class="chart-col">
					<QuarterlyBarChart v-model="selectedYear" :years="years" :data-by-year="barChartData" />
				</div>
				<div class="chart-col">
					<StatusDonutChart v-model="selectedYear" :years="years" :data-by-year="donutData"
						title="حالة الأقسام" />
				</div>
			</div>

			<div class="line-chart-section">
				<MonthlyPlannedActualLineChart :months="lineMonths" :actual-series="lineActualSeries"
					:planned-series="linePlannedSeries" :year-options="years" />
			</div>

			<div class="programs-section">
				<div class="programs-header">
					<div class="search-wrapper">
						<i class="bi bi-search"></i>
						<input v-model="programSearch" class="search-input" type="text" placeholder="البحث في النماذج" />
					</div>
					<div class="programs-title-group">
						<h2 class="programs-title">إدارة النماذج</h2>
						<span class="programs-subtitle">لمحة عن جميع النماذج</span>
					</div>
				</div>

				<div class="programs-grid">
					<ProgramPerformanceCard v-for="program in filteredPrograms" :key="program.title" v-bind="program" />
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.dashboard-container {
	padding: 2rem;
	background-color: #F9FAFB;
	min-height: 100vh;
	direction: rtl;
	font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	/* Fallback */
}

.dashboard-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 2rem;
}

.page-title {
	font-size: 1.5rem;
	font-weight: 700;
	color: #111827;
}

.header-actions {
	display: flex;
	gap: 1rem;
}

.btn-filter,
.btn-export {
	background: white;
	border: 1px solid #E5E7EB;
	padding: 0.5rem 1rem;
	border-radius: 8px;
	color: #374151;
	font-size: 0.875rem;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.btn-export {
	background-color: #A18018;
	/* Goldish color */
	color: white;
	border: none;
}

.kpi-grid {
	display: grid;
	grid-template-columns: repeat(1, 1fr);
	gap: 1.5rem;
	margin-bottom: 2rem;
}

@media (min-width: 768px) {
	.kpi-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (min-width: 1200px) {
	.kpi-grid {
		grid-template-columns: repeat(4, 1fr);
	}
}

/* Charts Grid */
.charts-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 1.5rem;
}

@media (min-width: 1024px) {
	.charts-grid {
		grid-template-columns: 5fr 2fr;
		gap: 1.5rem;
	}
}

.line-chart-section {
	margin-top: 1.75rem;
}

.programs-section {
	margin-top: 1.75rem;
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
	background-color: white;
	padding: 1.25rem;
	border-radius: 16px;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
	
}

.programs-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-direction: row-reverse;
	gap: 1.5rem;
	flex-wrap: wrap;
}

.search-wrapper {
	background: #ffffff;
	border-radius: 999px;
	padding: 0.45rem 1rem;
	border: 1px solid #E5E7EB;
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

.programs-title-group {
	text-align: right;
}

.programs-title {
	margin: 0;
	font-size: 1rem;
	font-weight: 700;
	color: #111827;
}

.programs-subtitle {
	font-size: 0.8rem;
	color: #9ca3af;
}

.programs-grid {
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 1.25rem;
}

@media (min-width: 900px) {
	.programs-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}
</style>
