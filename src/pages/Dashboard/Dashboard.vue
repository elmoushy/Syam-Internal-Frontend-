<script setup lang="ts">
import { ref } from 'vue';
import StatKpiCard from '../../components/Dashboard/StatKpiCard.vue';
import StatusDonutChart from '../../components/Dashboard/StatusDonutChart.vue';
import QuarterlyBarChart from '../../components/Dashboard/QuarterlyBarChart.vue';
import MonthlyPlannedActualLineChart from '../../components/Dashboard/MonthlyPlannedActualLineChart.vue';
import ProgramPerformanceCard from '../../components/Dashboard/ProgramPerformanceCard.vue';

// Mock Data for KPI Cards
const kpiData: {
	title: string;
	icon: string;
	value: number | string;
	valueLabel: string;
	trend: 'up' | 'down' | 'flat';
	percentage: number;
	footerText: string;
}[] = [
	{
		title: 'إجمالي الأنشطة',
		icon: 'bi bi-building',
		value: 300,
		valueLabel: 'نشاط',
		trend: 'flat',
		percentage: 10,
		footerText: 'في هذا الشهر'
	},
	{
		title: 'الأقسام المشاركة',
		icon: 'bi bi-building',
		value: 18,
		valueLabel: 'قسم مشارك',
		trend: 'down',
		percentage: 10,
		footerText: 'في هذا الشهر'
	},
	{
		title: 'الأقسام غير المشاركة',
		icon: 'bi bi-x-circle',
		value: 5,
		valueLabel: 'أقسام غير مشاركة',
		trend: 'flat',
		percentage: 10,
		footerText: 'في هذا الشهر'
	},
	{
		title: 'معدل الإنجاز الإجمالي',
		icon: 'bi bi-check-circle',
		value: '78%',
		valueLabel: '',
		trend: 'down',
		percentage: 10,
		footerText: 'في هذا الشهر'
	}
];

// Mock Data for Donut Chart
const selectedYear = ref(2026);
const years = [2024, 2025, 2026];

const donutData = {
	2026: {
		total: 300,
		items: [
			{ label: 'مكتمل', value: 180, color: '#00A651' },
			{ label: 'قيد التنفيذ', value: 70, color: '#FFD166' },
			{ label: 'لم يبدأ', value: 50, color: '#E76F51' }
		]
	},
	2025: {
		total: 250,
		items: [
			{ label: 'مكتمل', value: 100, color: '#00A651' },
			{ label: 'قيد التنفيذ', value: 100, color: '#FFD166' },
			{ label: 'لم يبدأ', value: 50, color: '#E76F51' }
		]
	},
	2024: {
		total: 200,
		items: [
			{ label: 'مكتمل', value: 50, color: '#00A651' },
			{ label: 'قيد التنفيذ', value: 50, color: '#FFD166' },
			{ label: 'لم يبدأ', value: 100, color: '#E76F51' }
		]
	}
};

const barChartData = {
	2026: {
		quarters: [
			{ label: 'Q1', planned: 50, actual: 130 },
			{ label: 'Q2', planned: 140, actual: 160 },
			{ label: 'Q3', planned: 150, actual: 180 },
			{ label: 'Q4', planned: 70, actual: 120 }
		]
	},
	2025: {
		quarters: [
			{ label: 'Q1', planned: 60, actual: 90 },
			{ label: 'Q2', planned: 90, actual: 120 },
			{ label: 'Q3', planned: 120, actual: 140 },
			{ label: 'Q4', planned: 80, actual: 100 }
		]
	},
	2024: {
		quarters: [
			{ label: 'Q1', planned: 40, actual: 60 },
			{ label: 'Q2', planned: 70, actual: 90 },
			{ label: 'Q3', planned: 110, actual: 120 },
			{ label: 'Q4', planned: 60, actual: 80 }
		]
	}
};

const lineMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];

const lineActualSeries = [
	{ label: 'يناير', value: 18 },
	{ label: 'فبراير', value: 22 },
	{ label: 'مارس', value: 28 },
	{ label: 'أبريل', value: 24 },
	{ label: 'مايو', value: 30 },
	{ label: 'يونيو', value: 35 }
];

const linePlannedSeries = [
	{ label: 'يناير', value: 22 },
	{ label: 'فبراير', value: 20 },
	{ label: 'مارس', value: 24 },
	{ label: 'أبريل', value: 26 },
	{ label: 'مايو', value: 32 },
	{ label: 'يونيو', value: 32 }
];

const programCards = [
	{
		title: 'حصر الأنشطة',
		description:
			'هذا نص تجريبي يُستخدم لملء المساحات المخصصة للوصف، ولا يعبّر عن محتوى فعلي، وهدفه فقط إلى عرض شكل النص.',
		completionRate: 58,
		departmentsCount: 20,
		activitiesTotal: 124,
		mode: 'gold' as const,
		detailsLink: '/programs/details/1'
	},
	{
		title: 'الفعاليات والأنشطة المجتمعية',
		description:
			'هذا نص تجريبي يُستخدم لملء المساحات المخصصة للوصف، ولا يعبّر عن محتوى فعلي، وهدفه فقط إلى عرض شكل النص.',
		completionRate: 11,
		departmentsCount: 24,
		activitiesTotal: 124,
		mode: 'danger' as const,
		detailsLink: '/programs/details/2'
	},
	{
		title: 'البرامج التدريبية',
		description:
			'هذا نص تجريبي يُستخدم لملء المساحات المخصصة للوصف، ولا يعبّر عن محتوى فعلي، وهدفه فقط إلى عرض شكل النص.',
		completionRate: 50,
		departmentsCount: 2,
		activitiesTotal: 124,
		mode: 'gold' as const,
		detailsLink: '/programs/details/3'
	}
];
</script>

<template>
	<div class="dashboard-container">
		<div class="dashboard-header">
			<h1 class="page-title">لوحة أداء الاستراتيجية</h1>
			<div class="header-actions">
				<!-- Year Filter Button (Mock) -->
				<button class="btn-filter">
					2026 <i class="bi bi-chevron-down"></i>
				</button>
				<!-- Export Button (Mock) -->
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
						<input class="search-input" type="text" placeholder="البحث في النماذج" />
					</div>
					<div class="programs-title-group">
						<h2 class="programs-title">إدارة النماذج</h2>
						<span class="programs-subtitle">لمحة عن جميع النماذج</span>
					</div>
				</div>

				<div class="programs-grid">
					<ProgramPerformanceCard v-for="program in programCards" :key="program.title" v-bind="program" />
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
