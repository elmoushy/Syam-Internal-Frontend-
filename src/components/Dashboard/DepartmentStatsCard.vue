<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

type BucketKey = 'cancelled' | 'late' | 'in_progress' | 'completed';

const props = defineProps({
	title: { type: String, required: true },
	completionRate: { type: Number, required: true },
	totalActivities: { type: Number, required: true },
	icon: { type: String, default: 'bi bi-building' },
	departmentId: { type: [String, Number], default: null },
	buckets: {
		type: Object as () => Record<
			BucketKey,
			{
				label: string;
				count: number;
			}
		>,
		required: true
	}
});

const router = useRouter();

const handleCardClick = () => {
	if (props.departmentId) {
		router.push(`/departments/${props.departmentId}/activities`);
	}
};

const bucketOrder: BucketKey[] = ['completed', 'in_progress', 'late','cancelled'];

const orderedBuckets = computed(() =>
	bucketOrder
		.filter((key) => props.buckets[key])
		.map((key) => ({
			key,
			...props.buckets[key]
		}))
);

const totalForProgress = computed(() =>
	orderedBuckets.value.reduce((sum, b) => sum + b.count, 0) || 1
);
</script>

<template>
	<div class="dept-card" :class="{ 'dept-card--clickable': departmentId }" @click="handleCardClick">
		<div class="dept-header">
			<div class="left">
				<div class="percent">{{ completionRate }}%</div>
				<div class="percent-label">معدل الإنجاز</div>
			</div>
			<div class="right">
				<div class="icon-pill">
					<i :class="icon"></i>
				</div>
				<div class="title-block">
					<h3 class="title">{{ title }}</h3>
					<div class="subtitle">
						<span>إجمالي {{ totalActivities }} نشاط</span>
					</div>
				</div>
			</div>
		</div>

		<div class="buckets">
			<div v-for="bucket in orderedBuckets" :key="bucket.key" class="bucket" :class="`bucket--${bucket.key}`">
				<div class="bucket-count">{{ bucket.count }}</div>
				<div class="bucket-label">{{ bucket.label }}</div>
			</div>
			<div class="bucket bucket--total">
				<div class="bucket-count">{{ totalActivities }}</div>
				<div class="bucket-label">الإجمالي</div>
			</div>
		</div>

		<div class="progress-track">
			<div v-for="bucket in orderedBuckets" :key="bucket.key" class="segment"
				:class="`segment--${bucket.key}`"
				:style="{ width: `${(bucket.count / totalForProgress) * 100}%` }" />
		</div>
	</div>
</template>

<style scoped>
.dept-card {
	background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
	padding: 1rem 1.25rem 1.1rem;
	display: flex;
	flex-direction: column;
	gap: 1.1rem;
	direction: rtl;
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.dept-card--clickable {
	cursor: pointer;
}

.dept-card--clickable:hover {
	transform: translateY(-2px);
	box-shadow: 0 12px 35px rgba(15, 23, 42, 0.1);
}

.dept-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	flex-direction: row-reverse;
}

.left .percent {
	color: #a67c1e;
	font-weight: 700;
	font-size: 1.4rem;
}

.left .percent-label {
	font-size: 0.8rem;
	color: #6b7280;
}

.right {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.icon-pill {
	width: 36px;
	height: 36px;
	border-radius: 999px;
	border: 1px solid #e5e7eb;
	background: #f9fafb;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #a67c1e;
}

.title-block {
	text-align: right;
}

.title {
	margin: 0;
	font-size: 0.95rem;
	font-weight: 700;
	color: #111827;
}

.subtitle {
	font-size: 0.8rem;
	color: #9ca3af;
}

.buckets {
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 0.75rem;
	
}

.bucket {
	border-radius: 16px;
	padding: 0.6rem 0.4rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	font-size: 0.8rem;
}

.bucket-count {
	font-weight: 700;
	font-size: 1rem;
	margin-bottom: 0.25rem;
}

.bucket-label {
	color: #6b7280;
}

.bucket--cancelled {
	background: #fef2f2;
	color: #b91c1c;
}

.bucket--late {
	background: #fff7ed;
	color: #ea580c;
}

.bucket--in_progress {
	background: #fffbeb;
	color: #a16207;
}

.bucket--completed {
	background: #ecfdf3;
	color: #15803d;
}

.bucket--total {
	background: #f3f4f6;
	color: #111827;
}

.progress-track {
	margin-top: 0.4rem;
	height: 6px;
	border-radius: 999px;
	background: #f3f4f6;
	display: flex;
	overflow: hidden;
}

.segment {
	height: 100%;
}

.segment--cancelled {
	background: #f97373;
}

.segment--late {
	background: #fbbf24;
}

.segment--in_progress {
	background: #f59e0b;
}

.segment--completed {
	background: #22c55e;
}
</style>

