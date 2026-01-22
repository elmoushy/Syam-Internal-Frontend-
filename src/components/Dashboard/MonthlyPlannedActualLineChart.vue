<script setup lang="ts">
import { computed, ref } from 'vue';

type SeriesPoint = {
	label: string;
	value: number;
};

const props = defineProps({
	title: {
		type: String,
		default: 'المخطط مقابل الفعلي - شهرياً'
	},
	legendActualLabel: {
		type: String,
		default: 'الفعلي'
	},
	legendPlannedLabel: {
		type: String,
		default: 'المخطط'
	},
	months: {
		type: Array as () => string[],
		required: true
	},
	actualSeries: {
		type: Array as () => SeriesPoint[],
		required: true
	},
	plannedSeries: {
		type: Array as () => SeriesPoint[],
		required: true
	},
	yearOptions: {
		type: Array as () => (number | string)[],
		required: true
	}
});

const selectedYear = ref(props.yearOptions[0] ?? '');
// reserved for future: project/department filters

const maxValue = computed(() => {
	const values = [...props.actualSeries, ...props.plannedSeries].map((p) => p.value);
	if (!values.length) return 1;
	const max = Math.max(...values);
	// Round up to the next multiple of 10
	return Math.ceil(max / 10) * 10;
});

const viewBoxWidth = 600;
const viewBoxHeight = 220;
const chartPadding = { top: 30, right: 20, bottom: 30, left: 10 };

const xStep = computed(() => {
	if (!props.months.length) return 0;
	const width = viewBoxWidth - chartPadding.left - chartPadding.right;
	return width / (props.months.length - 1 || 1);
});

const yScale = computed(() => {
	const height = viewBoxHeight - chartPadding.top - chartPadding.bottom;
	const max = maxValue.value || 1;
	return height / max;
});

type XY = { x: number; y: number };

function getPoints(series: SeriesPoint[]): XY[] {
	return series.map((point, index) => {
		const x = chartPadding.left + index * xStep.value;
		const y = viewBoxHeight - chartPadding.bottom - point.value * yScale.value;
		return { x, y };
	});
}

// Smooth path using Catmull–Rom to cubic Bezier conversion
function buildSmoothPath(series: SeriesPoint[]): string {
	const pts = getPoints(series);
	if (!pts.length) return '';
	if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
	if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

	let d = `M ${pts[0].x} ${pts[0].y}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[i + 2] ?? p2;

		const c1x = p1.x + (p2.x - p0.x) / 6;
		const c1y = p1.y + (p2.y - p0.y) / 6;
		const c2x = p2.x - (p3.x - p1.x) / 6;
		const c2y = p2.y - (p3.y - p1.y) / 6;

		d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
	}
	return d;
}

const actualPath = computed(() => buildSmoothPath(props.actualSeries));
const plannedPath = computed(() => buildSmoothPath(props.plannedSeries));

const plannedAreaPath = computed(() => {
	if (!props.plannedSeries.length) return '';
	const baseY = viewBoxHeight - chartPadding.bottom;

	const line = buildSmoothPath(props.plannedSeries);
	const lastX = chartPadding.left + (props.plannedSeries.length - 1) * xStep.value;
	const firstX = chartPadding.left;
	return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
});
</script>

<template>
	<div class="line-card">
		<div class="line-card__header">
			<div class="filters-left">
				<button class="pill-button">
					<span class="pill-label">{{ selectedYear }}</span>
					<i class="bi bi-chevron-down"></i>
				</button>
				<button class="pill-button pill-secondary">
					<span class="pill-label">اختر المشروع</span>
					<i class="bi bi-chevron-down"></i>
				</button>
				<button class="pill-button pill-secondary">
					<span class="pill-label">اختر القسم</span>
					<i class="bi bi-chevron-down"></i>
				</button>
			</div>
			<div class="header-right">
				<div class="legend">
					<span class="legend-item">
						<span class="dot actual"></span>
						{{ legendActualLabel }}
					</span>
					<span class="legend-item">
						<span class="dot planned"></span>
						{{ legendPlannedLabel }}
					</span>
				</div>
				<h3 class="line-card__title">{{ title }}</h3>
			</div>
		</div>

		<div class="chart-wrapper">
			<svg :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`" preserveAspectRatio="none" class="line-chart-svg">
				<defs>
					<linearGradient id="plannedAreaGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="#F3F4F6" stop-opacity="0.9" />
						<stop offset="100%" stop-color="#F3F4F6" stop-opacity="0" />
					</linearGradient>
				</defs>

				<g class="grid-group">
					<line v-for="tick in 4" :key="tick" class="grid-line"
						:y1="chartPadding.top + ((viewBoxHeight - chartPadding.top - chartPadding.bottom) / 4) * tick"
						:y2="chartPadding.top + ((viewBoxHeight - chartPadding.top - chartPadding.bottom) / 4) * tick"
						:x1="chartPadding.left" :x2="viewBoxWidth - chartPadding.right" />
				</g>

				<path v-if="plannedAreaPath" :d="plannedAreaPath" fill="url(#plannedAreaGradient)" />

				<path v-if="plannedPath" :d="plannedPath" class="line planned" fill="none" />
				<path v-if="actualPath" :d="actualPath" class="line actual" fill="none" />
			</svg>

			<div class="x-axis">
				<span v-for="month in months" :key="month" class="x-label">
					{{ month }}
				</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.line-card {
	background-color: #ffffff;
	border-radius: 16px;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
	padding: 1.25rem 1.5rem 1.5rem;
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
	direction: rtl;
}

.line-card__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-direction: row-reverse;
	gap: 1rem;
	flex-wrap: wrap;
}

.filters-left {
	display: flex;
	gap: 0.75rem;
	align-items: center;
}

.pill-button {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.55rem 1.25rem;
	border-radius: 999px;
	border: 1px solid #E5E7EB;
	background: #F9FAFB;
	color: #111827;
	font-size: 0.85rem;
	cursor: pointer;
}

.pill-secondary {
	background: #ffffff;
}

.pill-label {
	white-space: nowrap;
}

.header-right {
	display: flex;
	align-items: center;
	gap: 1.5rem;
}

.line-card__title {
	margin: 0;
	font-size: 0.95rem;
	font-weight: 700;
	color: #111827;
}

.legend {
	display: flex;
	gap: 0.9rem;
	font-size: 0.85rem;
	color: #4b5563;
}

.legend-item {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
}

.dot {
	width: 11px;
	height: 11px;
	border-radius: 50%;
	display: inline-block;
}

.dot.actual {
	background-color: #a67c1e;
}

.dot.planned {
	background-color: #e5e7eb;
}

.chart-wrapper {
	position: relative;
}

.line-chart-svg {
	width: 100%;
	height: 230px;
}

.grid-line {
	stroke: #f3f4f6;
	stroke-width: 1;
}

.line {
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.line.actual {
	stroke: #a67c1e;
}

.line.planned {
	stroke: #d1d5db;
	stroke-dasharray: 4 4;
}

.x-axis {
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	margin-top: 0.4rem;
	font-size: 0.8rem;
	color: #9ca3af;
	text-align: center;
}

.x-label {
	white-space: nowrap;
}

@media (max-width: 768px) {
	.line-card__header {
		flex-direction: column;
		align-items: flex-start;
	}

	.header-right {
		width: 100%;
		justify-content: space-between;
	}
}
</style>

