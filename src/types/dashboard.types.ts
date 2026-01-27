// src/types/dashboard.types.ts
// TypeScript types for Dashboard API responses

/**
 * Department information
 */
export interface Department {
  id: number
  name: string
  code: string
  description: string
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * KPI Summary data from API
 */
export interface KPISummary {
  total_activities: number
  participating_departments: number
  non_participating_departments: number
  overall_completion_rate: number
  trend: 'up' | 'down' | 'flat'
  change_percentage: number
  current_month_activities: number
}

/**
 * Status item for donut chart
 */
export interface StatusItem {
  label: string
  value: number
  color: string
}

/**
 * Status distribution for donut chart
 */
export interface StatusDistribution {
  year: number
  total: number
  items: StatusItem[]
}

/**
 * Quarter data for bar chart
 */
export interface QuarterData {
  label: string
  planned: number
  actual: number
}

/**
 * Quarterly data response
 */
export interface QuarterlyData {
  year: number
  quarters: QuarterData[]
}

/**
 * Monthly trend for line chart
 */
export interface MonthlyTrend {
  year: number
  months: string[]
  planned: number[]
  actual: number[]
}

/**
 * Program/Template performance card data
 * Matches ProgramPerformanceCard.vue props
 */
export interface ProgramPerformance {
  id: number
  title: string
  description: string
  completionRate: number
  departmentsCount: number
  activitiesTotal: number
  mode: 'gold' | 'danger'
  detailsLink: string
}

/**
 * Full dashboard data response
 */
export interface FullDashboardData {
  kpis: KPISummary
  statusDistribution: StatusDistribution
  quarterlyData: QuarterlyData
  monthlyTrend: MonthlyTrend
  programs: ProgramPerformance[]
  availableYears: number[]
}

/**
 * KPI Card data for StatKpiCard component
 * Matches StatKpiCard.vue props
 */
export interface KPICardData {
  title: string
  icon: string
  value: number | string
  valueLabel: string
  trend: 'up' | 'down' | 'flat'
  percentage: number
  footerText: string
}

/**
 * Department statistics (admin view)
 */
export interface DepartmentStats {
  department_id: number
  department_name: string
  department_code: string
  total_activities: number
  participating_departments: number
  non_participating_departments: number
  overall_completion_rate: number
  trend: 'up' | 'down' | 'flat'
  change_percentage: number
}

/**
 * Available years response
 */
export interface AvailableYearsResponse {
  years: number[]
}

/**
 * Dashboard query parameters
 */
export interface DashboardQueryParams {
  year?: number
  department_id?: number
  search?: string
}

// ============================================================================
// Program Detail Types (for ProgramDetails page)
// ============================================================================

/**
 * Bucket item for department status counts
 */
export interface BucketItem {
  label: string
  count: number
}

/**
 * Department status buckets
 */
export interface DepartmentBuckets {
  cancelled: BucketItem
  late: BucketItem
  in_progress: BucketItem
  completed: BucketItem
}

/**
 * Department stats card data for ProgramDetails page
 * Matches DepartmentStatsCard.vue props
 */
export interface ProgramDepartmentStats {
  departmentId: number
  title: string
  completionRate: number
  totalActivities: number
  icon: string
  buckets: DepartmentBuckets
}

/**
 * Overall completion data for OverallCompletionCard
 */
export interface OverallCompletion {
  percentage: number
  completed: number
  total: number
  departmentsCount: number
}

/**
 * Bar chart data structure (keyed by year)
 */
export type BarChartDataByYear = Record<number | string, {
  quarters: QuarterData[]
}>

/**
 * Program detail response from API
 */
export interface ProgramDetailData {
  id: number
  title: string
  description: string
  kpis: KPICardData[]
  overall: OverallCompletion
  barChartData: BarChartDataByYear
  departmentStats: ProgramDepartmentStats[]
  availableYears: number[]
}
