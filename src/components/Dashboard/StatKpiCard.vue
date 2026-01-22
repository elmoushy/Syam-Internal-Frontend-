<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
	title: {
		type: String,
		required: true
	},
	icon: {
		type: String,
		default: 'bi bi-activity'
	},
	value: {
		type: [String, Number],
		required: true
	},
	valueLabel: {
		type: String,
		default: ''
	},
	trend: {
		type: String as () => 'up' | 'down' | 'flat',
		default: 'up'
	},
	percentage: {
		type: Number,
		default: 0
	},
	footerText: {
		type: String,
		default: ''
	}
});

const trendColor = computed(() => {
	if (props.trend === 'down') return '#E76F51';
	if (props.trend === 'flat') return '#00A350';
	return '#00A651';
});

const trendIcon = computed(() => {
	if (props.trend === 'down') return 'bi bi-arrow-down-left';
	if (props.trend === 'flat') return 'bi bi-arrow-up-right';
	return 'bi bi-arrow-up';
});
</script>

<template>
	<div class="kpi-card">
		<div class="kpi-card__top">
			<span class="trend-icon" :style="{ color: trendColor }">
				<i :class="trendIcon" aria-hidden="true"></i>
			</span>
			
			<div class="kpi-card__title">
			<p class="kpi-title">{{ title }}</p>
			<span class="kpi-icon" aria-hidden="true">
				<i :class="icon"></i>
			</span>
			</div>
		</div>

		<div class="kpi-card__body">
			<div class="kpi-value-wrapper">
				<span class="kpi-value">{{ value }}</span>
				<span v-if="valueLabel" class="kpi-value-label">{{ valueLabel }}</span>
			</div>
		</div>

		<div class="kpi-card__footer">
			<span class="trend-text" :style="{ color: trendColor }">
				{{ trend === 'flat' ? '' : `${trend === 'up' ? '+' : ''}${percentage}%` }}
			</span>
			<span class="footer-text">{{ footerText }}</span>
		</div>
	</div>
</template>

<style scoped>
.kpi-card {
	background: #fff;
	border-radius: 14px;
	padding: 1rem 1.25rem;
	box-shadow: 0 8px 24px rgba(17, 24, 39, 0.06);
	border: 1px solid #f1f2f6;
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	direction: rtl;
}

.kpi-card__top {
	display: flex;
	justify-content: space-between;
	flex-direction: row-reverse;
	align-items: center;
}

.trend-icon {
	width: 28px;
	height: 28px;
	border-radius: 10px;
	background: #f0fdf4;
	display: inline-flex;
	justify-content: center;
	align-items: center;
	font-size: 1rem;
}

.kpi-card__title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-direction: row-reverse;
	gap: 0.5rem;
}

.kpi-icon {
	width: 34px;
	height: 34px;
	border-radius: 12px;
	background: #f8fafc;
	color: #a67c1e;
	display: inline-flex;
	justify-content: center;
	align-items: center;
	font-size: 1rem;
	border: 1px solid #f3f4f6;
}

.kpi-card__body {
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
}

.kpi-title {
	margin: 0;
	font-size: 0.95rem;
	color: #4b5563;
	font-weight: 600;
}

.kpi-value-wrapper {
	display: flex;
	align-items: center;
	gap: 0.35rem;
}

.kpi-value {
	font-size: 1.6rem;
	font-weight: 700;
	color: #0f172a;
}

.kpi-value-label {
	font-size: 0.9rem;
	color: #6b7280;
}

.kpi-card__footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-direction: row-reverse;
	font-size: 0.8rem;
	color: #6b7280;
}

.trend-text {
	font-weight: 600;
}

.footer-text {
	color: #9ca3af;
}
</style>
