<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps({
	title: {
		type: String,
		default: 'الأنشطة حسب الربع السنوي'
	},
	years: {
		type: Array as () => (number | string)[],
		required: true
	},
	modelValue: {
		type: [Number, String],
		required: true
	},
	dataByYear: {
		type: Object as () => Record<
			string | number,
			{
				quarters: {
					label: string;
					planned: number;
					actual: number;
				}[];
			}
		>,
		required: true
	}
});

const emit = defineEmits(['update:modelValue']);

const selectedYear = computed({
	get: () => props.modelValue,
	set: (val) => emit('update:modelValue', val)
});

const currentData = computed(() => {
	return props.dataByYear[String(selectedYear.value)] || { quarters: [] };
});

const maxValue = computed(() => {
	const values = currentData.value.quarters.flatMap((q) => [q.planned, q.actual]);
	return values.length ? Math.max(...values, 1) : 1;
});

const yTicks = computed(() => {
	const step = 45;
	const maxRounded = Math.max(step * 4, Math.ceil(maxValue.value / step) * step);
	const ticks: number[] = [];
	for (let v = maxRounded; v >= 0; v -= step) {
		ticks.push(v);
	}
	return ticks;
});

const chartRef = ref<HTMLElement | null>(null);
const hovered = ref<{
	label: string;
	planned: number;
	actual: number;
	x: number;
	y: number;
} | null>(null);

const setHoverPosition = (quarter: { label: string; planned: number; actual: number }, event: MouseEvent) => {
	const parentRect = chartRef.value?.getBoundingClientRect();
	if (!parentRect) return;
	const targetRect = (event.currentTarget as HTMLElement)?.getBoundingClientRect();
	const centerX = targetRect ? targetRect.left + targetRect.width / 2 : event.clientX;
	const centerY = targetRect ? targetRect.top + targetRect.height / 2 : event.clientY;
	hovered.value = {
		label: quarter.label,
		planned: quarter.planned,
		actual: quarter.actual,
		x: centerX - parentRect.left,
		y: centerY - parentRect.top
	};
};

const onEnter = (quarter: { label: string; planned: number; actual: number }, event: MouseEvent) => {
	setHoverPosition(quarter, event);
};

const onLeave = () => {
	hovered.value = null;
};

const onMove = (event: MouseEvent) => {
	if (!hovered.value) return;
	setHoverPosition(
		{
			label: hovered.value.label,
			planned: hovered.value.planned,
			actual: hovered.value.actual
		},
		event
	);
};
</script>

<template>
	<div class="bar-card">
		<div class="bar-card__header">
			<div class="title-group">
				<h3 class="bar-card__title">{{ title }}</h3>
			</div>
			<div class="header-actions">
				<div class="legend">
					<span class="legend-item">
						<span class="dot actual"></span>
						الفعلي
					</span>
					<span class="legend-item">
						<span class="dot planned"></span>
						المخطط
					</span>
				</div>
				<div class="year-selector">
					<select v-model="selectedYear" class="year-select">
						<option v-for="year in years" :key="year" :value="year">
							{{ year }}
						</option>
					</select>
					<span class="chevron">
						<i class="bi bi-chevron-down"></i>
					</span>
				</div>
			</div>
		</div>

		<div class="chart-area" ref="chartRef" @mousemove="onMove">
			<div class="y-axis">
				<span v-for="tick in yTicks" :key="tick" class="y-tick">{{ tick }}</span>
			</div>
			<div class="grid-lines">
				<span v-for="tick in yTicks" :key="tick" class="grid-line"></span>
			</div>
			<div class="bar-groups">
				<div v-for="quarter in currentData.quarters" :key="quarter.label" class="bar-group"
					@mouseenter="onEnter(quarter, $event)" @mousemove="onEnter(quarter, $event)" @mouseleave="onLeave">
					<div class="bars">
						<div class="bar planned" :style="{ height: `${(quarter.planned / maxValue) * 100}%` }"></div>
						<div class="bar actual" :style="{ height: `${(quarter.actual / maxValue) * 100}%` }"></div>
					</div>
					<div class="label">{{ quarter.label }}</div>
				</div>
			</div>

			<div v-if="hovered" class="tooltip" :style="{ left: `${hovered.x}px`, top: `${hovered.y - 12}px` }">
				<div class="tooltip-main">
					<div class="tooltip-header-row">
						<span class="muted">المخطط</span>
						<span class="actual-label">الفعلي</span>
					</div>
					<div class="tooltip-values-row">
						<span class="value">{{ hovered.planned }}</span>
						<span class="value actual">{{ hovered.actual }}</span>
					</div>
				</div>
				<div class="tooltip-quarter">
					{{ hovered.label }}
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.bar-card {
	background: #fff;
	border-radius: 12px;
	padding: 1.25rem;
	box-shadow: 0 8px 24px rgba(17, 24, 39, 0.06);
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	direction: rtl;
}

.bar-card__header {
	display: flex;
	justify-content: space-between;
	gap: 1rem;
	align-items: center;
}

.bar-card__title {
	margin: 0;
	font-size: 1rem;
	font-weight: 700;
	color: #111827;
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 1rem;
}

.legend {
	display: flex;
	gap: 0.75rem;
	font-size: 0.85rem;
	color: #4b5563;
}

.legend-item {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
}

.dot {
	width: 12px;
	height: 12px;
	border-radius: 4px;
	display: inline-block;
}

.dot.actual {
	background: #a67c1e;
}

.dot.planned {
	background: #e9eaee;
}

.year-selector {
	position: relative;
	display: inline-flex;
	align-items: center;
}

.year-select {
	background-color: #F3F4F6;
	border: 1px solid #E5E7EB;
	border-radius: 10px;
	padding: 0.45rem 2rem 0.45rem 0.85rem;
	font-size: 0.85rem;
	color: #111827;
	cursor: pointer;
	outline: none;
	direction: ltr;
	appearance: none;
}

.chevron {
	position: absolute;
	right: 8px;
	top: 50%;
	transform: translateY(-50%);
	color: #6B7280;
	pointer-events: none;
}

.chart-area {
	position: relative;
	flex: 1;
	padding: 0.5rem 0.75rem 0rem 3.25rem;
}

.bar-groups {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 1.25rem;
	align-items: end;
	height: 240px;
	position: absolute;
	bottom: 0;
	width: 90%
}

.bar-group {
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
	align-items: center;
	height: 100%;
}

.bars {
	display: grid;
	grid-template-columns: repeat(2, 0.6fr);
	gap: 0.35rem;
	align-items: end;
	width: 68%;
	height: 100%;
	justify-content: center;
	justify-items: center;
	z-index: 2;
}

.bar {
	border-radius: 6px 6px 0 0;
	width: 100%;
	transition: transform 0.2s ease, opacity 0.2s ease;
}

.bar.planned {
	background: #e9eaee;
}

.bar.actual {
	background: #a67c1e;
}

.bar-group:hover .bar.actual,
.bar-group:hover .bar.planned {
	opacity: 0.9;
	transform: translateY(-4px);
}

.label {
	font-size: 0.9rem;
	color: #6b7280;
}

.y-axis {
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 3rem;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: flex-start;
	padding: 0.35rem 0.5rem 0.1rem 0;
	color: #9ca3af;
	font-size: 0.85rem;
}

.grid-lines {
	position: absolute;
	bottom: 0;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	pointer-events: none;
	z-index: 1;
}

.grid-line {
	display: block;
	width: 100%;
	border-top: 1px solid #f0f2f5;
}

.tooltip {
	position: absolute;
	background: transparent;
	transform: translate(-50%, -110%);
	min-width: 140px;
	pointer-events: none;
	display: flex;
	align-items: center;
	gap: 0.5rem;
	z-index: 1000;
}

.tooltip-main {
	background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
	padding: 0.55rem 0.9rem;
	border: 1px solid #f3f4f6;
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
}

.tooltip-header-row,
.tooltip-values-row {
	display: flex;
	justify-content: space-between;
	font-size: 0.8rem;
}

.tooltip-header-row {
	margin-bottom: 0.05rem;
}

.muted {
	color: #9ca3af;
}

.actual-label {
	color: #a67c1e;
	font-weight: 600;
}

.value {
	font-weight: 700;
	color: #111827;
}

.value.actual {
	color: #a67c1e;
}

.tooltip-quarter {
	background: #ffffff;
	border-radius: 999px;
	min-width: 38px;
	height: 38px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.85rem;
	font-weight: 700;
	color: #a67c1e;
	box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
	border: 1px solid #f5f5f7;
}

@media (max-width: 900px) {
	.bar-card__header {
		flex-direction: column;
		align-items: flex-start;
	}

	.header-actions {
		width: 100%;
		justify-content: space-between;
	}
}
</style>
