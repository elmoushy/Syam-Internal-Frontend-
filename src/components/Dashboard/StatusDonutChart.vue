<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps({
	title: {
		type: String,
		default: "حالة الأقسام"
	},
	years: {
		type: Array as () => (number | string)[],
		required: true
	},
	modelValue: {
		type: [Number, String],
		required: true
	},
	totalLabel: {
		type: String,
		default: "إجمالي الأنشطة"
	},
	dataByYear: {
		type: Object as () => Record<
			string | number,
			{
				total: number;
				items: {
					label: string;
					value: number;
					color: string;
				}[];
			}
		>,
		required: true
	}
});

const emit = defineEmits(['update:modelValue']);

// Handle undefined modelValue or years gracefully if needed, 
// but assuming parent passes correct data as per 'required: true'

const selectedYear = computed({
	get: () => props.modelValue,
	set: (val) => emit('update:modelValue', val)
});

const currentData = computed(() => {
	return props.dataByYear[String(selectedYear.value)] || { total: 0, items: [] };
});

// SVG Chart Logic
const size = 200;
const strokeWidth = 35; // Thicker donut
const radius = (size - strokeWidth) / 2;
const center = size / 2;
const circumference = 2 * Math.PI * radius;

interface ChartSegment {
	label: string;
	value: number;
	color: string;
	strokeDasharray: string;
	strokeDashoffset: number;
	percentage: number;
}

const segments = computed<ChartSegment[]>(() => {
	let accumulatedLength = 0;
	const total = currentData.value.total;

	if (total === 0) return [];

	return currentData.value.items.map((item) => {
		const itemLength = (item.value / total) * circumference;
		const gap = currentData.value.items.length > 1 ? 6 : 0;
		const adjustedLength = Math.max(0, itemLength - gap);

		const segment: ChartSegment = {
			...item,
			percentage: Math.round((item.value / total) * 100),
			strokeDasharray: `${adjustedLength} ${circumference - adjustedLength}`,
			strokeDashoffset: -accumulatedLength
		};

		accumulatedLength += itemLength;
		return segment;
	});
});

// Tooltip Logic
const hoveredSegment = ref<ChartSegment | null>(null);
const tooltipPos = ref({ x: 0, y: 0 });
const chartWrapper = ref<HTMLElement | null>(null);

const onMouseEnter = (segment: ChartSegment, event: MouseEvent) => {
	hoveredSegment.value = segment;
	updateTooltipPos(event);
};

const onMouseMove = (event: MouseEvent) => {
	if (hoveredSegment.value) {
		updateTooltipPos(event);
	}
};

const onMouseLeave = () => {
	hoveredSegment.value = null;
};

const updateTooltipPos = (event: MouseEvent) => {
	const wrapper = chartWrapper.value;
	if (!wrapper) return;
	const rect = wrapper.getBoundingClientRect();
	tooltipPos.value = {
		x: event.clientX - rect.left,
		y: event.clientY - rect.top
	};
};

</script>

<template>
	<div class="donut-card">
		<!-- Header -->
		<div class="donut-card__header">
			<h3 class="donut-card__title">{{ title }}</h3>

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

		<!-- Chart Container -->
		<div class="donut-card__chart-container">
			<div class="chart-wrapper" ref="chartWrapper">
				<svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="donut-chart-svg"
					@mousemove="onMouseMove">
					<circle :cx="center" :cy="center" :r="radius" fill="none" stroke="#F3F4F6"
						:stroke-width="strokeWidth" />

					<circle v-for="(segment, index) in segments" :key="index" :cx="center" :cy="center" :r="radius"
						fill="none" :stroke="segment.color" :stroke-width="strokeWidth"
						:stroke-dasharray="segment.strokeDasharray" :stroke-dashoffset="segment.strokeDashoffset"
						stroke-linecap="round" class="chart-segment" @mouseenter="onMouseEnter(segment, $event)"
						@mouseleave="onMouseLeave" />
				</svg>

				<div class="chart-center-text">
					<span class="center-label">{{ totalLabel }}</span>
					<span class="center-value">{{ currentData.total }}</span>
				</div>

				<div v-if="hoveredSegment" class="chart-tooltip"
					:style="{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y - 20}px` }">
					<div class="tooltip-header">
						<span class="tooltip-dot" :style="{ backgroundColor: hoveredSegment.color }"></span>
						<span>{{ hoveredSegment.label }}</span>
					</div>
					<div class="tooltip-values">
						<span class="tooltip-val">{{ hoveredSegment.value }}</span>
						<span class="tooltip-pct">({{ hoveredSegment.percentage }}%)</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Legend -->
		<div class="donut-card__legend">
			<div v-for="(item, index) in currentData.items" :key="index" class="legend-item">
				<span class="legend-color" :style="{ backgroundColor: item.color }"></span>
				<span class="legend-label">{{ item.label }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.donut-card {
	background-color: white;
	border-radius: 12px;
	padding: 1.5rem;
	box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	height: 100%;
	direction: rtl;
	position: relative;
}

.donut-card__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.donut-card__title {
	font-size: 1rem;
	font-weight: 600;
	color: #374151;
	margin: 0;
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
	padding: 0.5rem 2rem 0.5rem 0.85rem;
	font-size: 0.875rem;
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

/* Chart */
.donut-card__chart-container {
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
}

.chart-wrapper {
	position: relative;
	width: 210px;
	height: 210px;
}

.donut-chart-svg {
	transform: rotate(-90deg);
	/* Start from top */
	overflow: visible;
}

.chart-segment {
	transition: opacity 0.2s;
	cursor: pointer;
}

.chart-segment:hover {
	opacity: 0.9;
}

/* Center Text */
.chart-center-text {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	text-align: center;
	display: flex;
	flex-direction: column;
	pointer-events: none;
}

.center-label {
	font-size: 0.75rem;
	color: #6B7280;
	margin-bottom: 0.25rem;
}

.center-value {
	font-size: 1.5rem;
	font-weight: 700;
	color: #111827;
}

/* Tooltip */
.chart-tooltip {
	position: absolute;
	transform: translate(-50%, -100%);
	background-color: #1F2937;
	color: white;
	padding: 0.5rem 0.75rem;
	border-radius: 6px;
	font-size: 0.75rem;
	pointer-events: none;
	z-index: 10;
	white-space: nowrap;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.tooltip-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 0.25rem;
}

.tooltip-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.tooltip-values {
	display: flex;
	gap: 0.5rem;
	justify-content: space-between;
}

.tooltip-val {
	font-weight: 600;
}

/* Legend */
.donut-card__legend {
	display: flex;
	justify-content: center;
	gap: 1.5rem;
	flex-wrap: wrap;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.legend-color {
	width: 12px;
	height: 12px;
	border-radius: 4px;
	/* Soft square */
}

.legend-label {
	font-size: 0.875rem;
	color: #374151;
	font-weight: 500;
}
</style>
