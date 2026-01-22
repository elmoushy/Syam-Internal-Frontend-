<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
	title: { type: String, default: 'الإنجاز الإجمالي' },
	yearOptions: { type: Array as () => (number | string)[], default: () => [] },
	modelValue: { type: [Number, String], default: '' },
	percentage: { type: Number, required: true },
	completed: { type: Number, required: true },
	total: { type: Number, required: true },
	departmentsCount: { type: Number, required: true }
});

const emit = defineEmits(['update:modelValue']);

const selectedYear = computed({
	get: () => props.modelValue,
	set: (val) => emit('update:modelValue', val)
});

const size = 220;
const strokeWidth = 18;
const radius = (size - strokeWidth) / 2;
const circumference = 2 * Math.PI * radius;

const dashArray = computed(() => {
	const pct = Math.min(Math.max(props.percentage, 0), 100);
	const filled = (pct / 100) * circumference;
	return `${filled} ${circumference - filled}`;
});
</script>

<template>
	<div class="completion-card">
		<div class="card-header">
			<h3 class="title">{{ title }}</h3>
			<div class="year-selector" v-if="yearOptions.length">
				<select v-model="selectedYear" class="year-select">
					<option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
				</select>
				<span class="chevron">
					<i class="bi bi-chevron-down"></i>
				</span>
			</div>
		</div>

		<div class="donut-wrap">
			<svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="donut-svg">
				<circle :cx="size / 2" :cy="size / 2" :r="radius" class="donut-bg" :stroke-width="strokeWidth" />
				<circle :cx="size / 2" :cy="size / 2" :r="radius" class="donut-progress" :stroke-width="strokeWidth"
					:stroke-dasharray="dashArray" />
			</svg>
			<div class="center-text">
				<span class="center-label">إنجاز</span>
				<span class="center-value">{{ Math.round(percentage) }}%</span>
			</div>
		</div>

		<div class="meta">
			<div class="meta-row">
				<span class="meta-number">
					{{ total }} <span class="gold">من {{ completed }}</span>
				</span>
				<span class="meta-label">الأنشطة المكتملة</span>
			</div>
			<div class="meta-row">
				<span class="meta-number">{{ departmentsCount }}</span>
				<span class="meta-label">عدد الأقسام</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.completion-card {
	background: #fff;
	border-radius: 18px;
	box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
	padding: 1.25rem 1.35rem 1.5rem;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	direction: rtl;
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.title {
	margin: 0;
	font-size: 1rem;
	font-weight: 700;
	color: #111827;
}

.year-selector {
	position: relative;
}

.year-select {
	background: #f5f6fa;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	padding: 0.45rem 2rem 0.45rem 0.85rem;
	font-size: 0.9rem;
	color: #111827;
	cursor: pointer;
	appearance: none;
	direction: ltr;
}

.chevron {
	position: absolute;
	right: 8px;
	top: 50%;
	transform: translateY(-50%);
	color: #6b7280;
	pointer-events: none;
}

.donut-wrap {
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
}

.donut-svg {
	transform: rotate(-90deg);
}

.donut-bg {
	fill: none;
	stroke: #f1f2f6;
}

.donut-progress {
	fill: none;
	stroke: #a67c1e;
	stroke-linecap: round;
	transition: stroke-dasharray 0.3s ease;
}

.center-text {
	position: absolute;
	text-align: center;
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
}

.center-label {
	color: #6b7280;
	font-size: 0.9rem;
}

.center-value {
	color: #a67c1e;
	font-size: 1.6rem;
	font-weight: 700;
}

.meta {
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
	font-size: 0.95rem;
}

.meta-row {
	display: flex;
	justify-content: space-between;
	flex-direction: row-reverse;
	align-items: center;
}

.meta-number {
	color: #111827;
}

.meta-label {
	color: #6b7280;
}

.gold {
	color: #a67c1e;
	font-weight: 700;
}
</style>
