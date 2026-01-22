<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import StatKpiCard from '../../components/Dashboard/StatKpiCard.vue';
import StatusDonutChart from '../../components/Dashboard/StatusDonutChart.vue';
import MonthlyPlannedActualLineChart from '../../components/Dashboard/MonthlyPlannedActualLineChart.vue';
import ActivityCard from '../../components/Dashboard/ActivityCard.vue';

const route = useRoute();
const departmentId = route.params.id as string;
const statusFilter = route.query.status as string | undefined;

const selectedYear = ref(2026);
const years = [2024, 2025, 2026];

const kpiData: {
	title: string;
	icon: string;
	value: number | string;
	valueLabel: string;
	trend: 'up' | 'down' | 'flat';
	percentage: number;
	footerText: string;
}[] = [
	{ title: 'إجمالي الأنشطة', icon: 'bi bi-activity', value: 200, valueLabel: 'نشاط', trend: 'flat', percentage: 10, footerText: 'في هذا الشهر' },
	{ title: 'مكتمل', icon: 'bi bi-check-circle', value: 80, valueLabel: 'نشاط', trend: 'flat', percentage: 10, footerText: 'في هذا الشهر' },
	{ title: 'قيد التنفيذ', icon: 'bi bi-clock-history', value: 20, valueLabel: 'نشاط', trend: 'flat', percentage: 10, footerText: 'في هذا الشهر' },
	{ title: 'ملغي', icon: 'bi bi-x-circle', value: 5, valueLabel: 'نشاط', trend: 'flat', percentage: 10, footerText: 'في هذا الشهر' }
];

const donutData = {
	2026: {
		total: 300,
		items: [
			{ label: 'مكتمل', value: 180, color: '#00A651' },
			{ label: 'قيد التنفيذ', value: 70, color: '#FFD166' },
			{ label: 'الملغاة', value: 50, color: '#E76F51' }
		]
	},
	2025: {
		total: 250,
		items: [
			{ label: 'مكتمل', value: 120, color: '#00A651' },
			{ label: 'قيد التنفيذ', value: 100, color: '#FFD166' },
			{ label: 'الملغاة', value: 30, color: '#E76F51' }
		]
	}
};

const lineMonths = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];

const lineActualSeries = [
	{ label: 'الأسبوع 1', value: 18 },
	{ label: 'الأسبوع 2', value: 22 },
	{ label: 'الأسبوع 3', value: 25 },
	{ label: 'الأسبوع 4', value: 30 }
];

const linePlannedSeries = [
	{ label: 'الأسبوع 1', value: 22 },
	{ label: 'الأسبوع 2', value: 20 },
	{ label: 'الأسبوع 3', value: 24 },
	{ label: 'الأسبوع 4', value: 26 }
];

const allActivities = [
	{
		title: 'تحديث قائمة جهات الاتصال في حالات الطوارئ',
		status: 'completed' as const,
		assignee: 'أحمد محمد السعيدي',
		startDate: '02 يناير 2026',
		endDate: '08 يناير 2026',
		completionRate: 50
	},
	{
		title: 'تحديث قائمة جهات الاتصال في حالات الطوارئ',
		status: 'in_progress' as const,
		assignee: 'أحمد محمد السعيدي',
		startDate: '02 يناير 2026',
		endDate: '08 يناير 2026',
		completionRate: 40
	},
	{
		title: 'تحديث قائمة جهات الاتصال في حالات الطوارئ',
		status: 'completed' as const,
		assignee: 'أحمد محمد السعيدي',
		startDate: '02 يناير 2026',
		endDate: '08 يناير 2026',
		completionRate: 100
	}
];

const filteredActivities = computed(() => {
	if (!statusFilter) return allActivities;
	const statusMap: Record<string, 'completed' | 'in_progress' | 'late' | 'cancelled'> = {
		completed: 'completed',
		in_progress: 'in_progress',
		late: 'late',
		cancelled: 'cancelled'
	};
	const targetStatus = statusMap[statusFilter];
	return allActivities.filter(activity => activity.status === targetStatus);
});
</script>

<template>
	<div class="activities-page">
		<div class="page-header">
			<div class="breadcrumbs">
				<span class="breadcrumb-item">قائمة حصر الانشطة</span>
				<span class="breadcrumb-sep">/</span>
				<span class="breadcrumb-item active">لوحة أداء الأنشطة</span>
			</div>
			<div class="header-actions">
				<button class="btn-filter btn-gold">
					اختر قسم <i class="bi bi-chevron-down"></i>
				</button>
				<button class="btn-filter">
					2026 <i class="bi bi-chevron-down"></i>
				</button>
				<button class="btn-export">
					<i class="bi bi-download"></i> تصدير البيانات
				</button>
			</div>
		</div>

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
					<input class="search-input" type="text" placeholder="ابحث عن قسم..." />
					<span class="search-shortcut">⌘ F</span>
				</div>
				<div class="activities-title-group">
					<h2 class="activities-title">جميع الأنشطة</h2>
					<span class="activities-subtitle">{{ filteredActivities.length }} نشاط</span>
				</div>
			</div>

			<div class="activities-grid">
				<ActivityCard v-for="(activity, idx) in filteredActivities" :key="idx" v-bind="activity" />
			</div>
		</div>
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
