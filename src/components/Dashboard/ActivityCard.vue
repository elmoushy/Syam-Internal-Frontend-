<script setup lang="ts">
import { computed } from 'vue';

type Status = 'completed' | 'in_progress' | 'late' | 'cancelled';

const props = defineProps({
	title: { type: String, required: true },
	status: { type: String as () => Status, required: true },
	assignee: { type: String, required: true },
	startDate: { type: String, required: true },
	endDate: { type: String, required: true },
	completionRate: { type: Number, required: true }
});

const statusConfig = computed(() => {
	const configs = {
		completed: { label: 'مكتمل', bg: '#ecfdf3', color: '#15803d' },
		in_progress: { label: 'قيد التنفيذ', bg: '#fffbeb', color: '#a16207' },
		late: { label: 'متأخر', bg: '#fff7ed', color: '#ea580c' },
		cancelled: { label: 'ملغي', bg: '#fef2f2', color: '#b91c1c' }
	};
	return configs[props.status] || configs.completed;
});
</script>

<template>
	<div class="activity-card">
		<div class="card-header">
			<div class="status-badge" :style="{ backgroundColor: statusConfig.bg, color: statusConfig.color }">
				{{ statusConfig.label }}
			</div>
			<div class="menu-icon">
				<i class="bi bi-list"></i>
			</div>
		</div>

		<div class="card-body">
			<h3 class="activity-title">{{ title }}</h3>

			<div class="assignee-row">
				<i class="bi bi-person"></i>
				<span class="assignee-name">{{ assignee }}</span>
			</div>

			<div class="dates-row">
				<div class="date-item">
					<i class="bi bi-calendar"></i>
					<span>{{ startDate }}</span>
				</div>
				<div class="date-item">
					<i class="bi bi-calendar"></i>
					<span>{{ endDate }}</span>
				</div>
			</div>
		</div>

		<div class="card-footer">
			<div class="progress-label">نسبة الإنجاز</div>
			<div class="progress-section">
				<div class="progress-bar">
					<div class="progress-fill" :style="{
						width: `${completionRate}%`,
						backgroundColor: statusConfig.color
					}"></div>
				</div>
				<span class="progress-percentage">{{ completionRate }}%</span>

			</div>
		</div>
	</div>
</template>

<style scoped>
.activity-card {
	background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
	padding: 1rem 1.25rem 1.1rem;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	direction: rtl;
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.activity-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-direction: row-reverse;
}

.status-badge {
	padding: 0.35rem 0.9rem;
	border-radius: 999px;
	font-size: 0.8rem;
	font-weight: 600;
}

.menu-icon {
	width: 28px;
	height: 28px;
	border-radius: 8px;
	background: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #6b7280;
	cursor: pointer;
}

.card-body {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.activity-title {
	margin: 0;
	font-size: 0.95rem;
	font-weight: 700;
	color: #111827;
	line-height: 1.5;
}

.assignee-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: #6b7280;
	font-size: 0.85rem;
}

.assignee-row i {
	color: #9ca3af;
}

.assignee-name {
	color: #374151;
}

.dates-row {
	display: flex;
	gap: 1rem;
	flex-wrap: wrap;
}

.date-item {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	color: #6b7280;
	font-size: 0.8rem;
}

.date-item i {
	color: #9ca3af;
	font-size: 0.85rem;
}

.card-footer {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	margin-top: 0.25rem;
}

.progress-label {
	font-size: 0.8rem;
	color: #6b7280;
}

.progress-section {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.progress-percentage {
	font-size: 0.85rem;
	font-weight: 700;
	color: #111827;
	min-width: 45px;
}

.progress-bar {
	flex: 1;
	height: 8px;
	border-radius: 999px;
	background: #f3f4f6;
	overflow: hidden;
	flex-direction: row-reverse;
	position: relative;
}

.progress-fill {
	height: 100%;
	border-radius: 999px;
	transition: width 0.3s ease;
	position: absolute;
	right: 0;
	
}
</style>
