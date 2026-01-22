<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps({
	title: {
		type: String,
		required: true
	},
	description: {
		type: String,
		required: true
	},
	completionRate: {
		type: Number,
		required: true
	},
	departmentsCount: {
		type: Number,
		required: true
	},
	activitiesTotal: {
		type: Number,
		required: true
	},
	mode: {
		type: String as () => 'gold' | 'danger',
		default: 'gold'
	},
	detailsLink: {
		type: String,
		default: ''
	}
});

const percentageString = computed(() => `${props.completionRate}%`);
</script>

<template>
	<div class="program-card">
		<div class="program-card__header">
			<div class="percentage-block" :class="`percentage-block--${mode}`">
				<span class="percentage-value">{{ percentageString }}</span>
				<span class="percentage-label">معدل الإنجاز</span>
			</div>
			<button class="icon-pill" type="button">
				<i class="bi bi-clipboard-data"></i>
			</button>
		</div>

		<div class="program-card__body">
			<h4 class="program-title">{{ title }}</h4>
			<p class="program-description">
				{{ description }}
			</p>

			<div class="stat-row">
				<div class="stat-input">
					<span class="stat-label">الأقسام</span>
					<span>{{ departmentsCount }}</span>
				</div>
			</div>
			<div class="stat-row">
				<div class="stat-input">
					<span class="stat-label">إجمالي الأنشطة</span>
					<span>{{ activitiesTotal }}</span>
				</div>
			</div>

			<div class="progress-track">
				<div class="progress-bar" :class="`progress-bar--${mode}`" :style="{ width: percentageString }"></div>
			</div>
		</div>

		<div class="program-card__footer">
			<RouterLink v-if="detailsLink" :to="detailsLink" class="details-link">
				<span>عرض التفاصيل</span>
				<i class="bi bi-arrow-up-right"></i>
			</RouterLink>
			<button v-else class="details-link" type="button">
				<span>عرض التفاصيل</span>
				<i class="bi bi-arrow-up-right"></i>
			</button>
		</div>
	</div>
</template>

<style scoped>
.program-card {
	background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
	padding: 1.25rem 1.4rem 1.1rem;
	display: flex;
	flex-direction: column;
	gap: 2rem;
	direction: rtl;
}

.program-card__header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	flex-direction: row-reverse;
}

.percentage-block {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 0.15rem;
	color: #a67c1e;
}

.percentage-block--danger {
	color: #dc2626;
}

.percentage-value {
	font-size: 1.3rem;
	font-weight: 700;
}

.percentage-label {
	font-size: 0.75rem;
}

.icon-pill {
	border-radius: 999px;
	border: 1px solid #e5e7eb;
	background: #f9fafb;
	width: 34px;
	height: 34px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #9ca3af;
	cursor: pointer;
}

.program-card__body {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.program-title {
	margin: 0;
	font-size: 0.95rem;
	font-weight: 700;
	color: #111827;
}

.program-description {
	margin: 0;
	font-size: 0.78rem;
	line-height: 1.6;
	color: #6b7280;
}

.stat-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
}

.stat-label {
	font-size: 0.8rem;
	color: #6b7280;
}

.stat-input {
	border-radius: 999px;
	background: #f9fafb;
	border: 1px solid #e5e7eb;
	padding: 0.3rem 0.9rem;
	font-size: 0.78rem;
	color: #111827;
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-direction: row;
	gap: 0.75rem;
	width: 100%;
}

.progress-track {
	margin: 1rem 0;
	height: 8px;
	border-radius: 999px;
	background: #f3f4f6;
	overflow: hidden;
}

.progress-bar {
	height: 100%;
	border-radius: inherit;
}

.progress-bar--gold {
	background: #f4b000;
}

.progress-bar--danger {
	background: #ef4444;
}

.program-card__footer {
	margin: 1rem 0;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: row-reverse;
}

.details-link {
	background: transparent;
	border: none;
	padding: 0;
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	font-size: 0.8rem;
	color: #a67c1e;
	cursor: pointer;
}
</style>

