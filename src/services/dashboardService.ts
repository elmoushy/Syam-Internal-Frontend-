// src/services/dashboardService.ts
// API service for Dashboard KPIs and Analytics

import { apiClient } from './jwtAuthService'
import type {
  Department,
  KPISummary,
  StatusDistribution,
  QuarterlyData,
  MonthlyTrend,
  ProgramPerformance,
  FullDashboardData,
  DepartmentStats,
  AvailableYearsResponse,
  DashboardQueryParams,
  KPICardData,
  ProgramDetailData,
} from '@/types/dashboard.types'

const BASE_URL = '/activities/dashboard'

/**
 * Dashboard API Service
 * Provides methods for fetching dashboard KPIs and analytics data
 */
export const dashboardService = {
  /**
   * Get list of all active departments
   */
  async getDepartments(): Promise<Department[]> {
    const response = await apiClient.get(`${BASE_URL}/departments/`)
    return response.data
  },

  /**
   * Get KPI summary data
   * @param params - Query parameters (year, department_id)
   */
  async getKPISummary(params?: DashboardQueryParams): Promise<KPISummary> {
    const queryParams = new URLSearchParams()
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.department_id) queryParams.append('department_id', params.department_id.toString())
    
    const url = queryParams.toString()
      ? `${BASE_URL}/summary/?${queryParams}`
      : `${BASE_URL}/summary/`
    
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Get status distribution for donut chart
   * @param params - Query parameters (year, department_id)
   */
  async getStatusDistribution(params?: DashboardQueryParams): Promise<StatusDistribution> {
    const queryParams = new URLSearchParams()
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.department_id) queryParams.append('department_id', params.department_id.toString())
    
    const url = queryParams.toString()
      ? `${BASE_URL}/status-distribution/?${queryParams}`
      : `${BASE_URL}/status-distribution/`
    
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Get quarterly data for bar chart
   * @param params - Query parameters (year, department_id)
   */
  async getQuarterlyData(params?: DashboardQueryParams): Promise<QuarterlyData> {
    const queryParams = new URLSearchParams()
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.department_id) queryParams.append('department_id', params.department_id.toString())
    
    const url = queryParams.toString()
      ? `${BASE_URL}/quarterly/?${queryParams}`
      : `${BASE_URL}/quarterly/`
    
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Get monthly trend data for line chart
   * @param params - Query parameters (year, department_id)
   */
  async getMonthlyTrend(params?: DashboardQueryParams): Promise<MonthlyTrend> {
    const queryParams = new URLSearchParams()
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.department_id) queryParams.append('department_id', params.department_id.toString())
    
    const url = queryParams.toString()
      ? `${BASE_URL}/monthly-trend/?${queryParams}`
      : `${BASE_URL}/monthly-trend/`
    
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Get programs/templates performance data
   * @param params - Query parameters (year, department_id, search)
   */
  async getPrograms(params?: DashboardQueryParams): Promise<ProgramPerformance[]> {
    const queryParams = new URLSearchParams()
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.department_id) queryParams.append('department_id', params.department_id.toString())
    if (params?.search) queryParams.append('search', params.search)
    
    const url = queryParams.toString()
      ? `${BASE_URL}/programs/?${queryParams}`
      : `${BASE_URL}/programs/`
    
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Get list of available years with data
   */
  async getAvailableYears(): Promise<number[]> {
    const response = await apiClient.get<AvailableYearsResponse>(`${BASE_URL}/years/`)
    return response.data.years
  },

  /**
   * Get full dashboard data in a single request
   * This is the recommended method for initial dashboard load
   * @param params - Query parameters (year, department_id)
   */
  async getFullDashboard(params?: DashboardQueryParams): Promise<FullDashboardData> {
    const queryParams = new URLSearchParams()
    if (params?.year) queryParams.append('year', params.year.toString())
    if (params?.department_id) queryParams.append('department_id', params.department_id.toString())
    
    const url = queryParams.toString()
      ? `${BASE_URL}/full/?${queryParams}`
      : `${BASE_URL}/full/`
    
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Get department statistics (admin only)
   * @param year - Year to get stats for
   */
  async getDepartmentStats(year?: number): Promise<DepartmentStats[]> {
    const queryParams = new URLSearchParams()
    if (year) queryParams.append('year', year.toString())
    
    const url = queryParams.toString()
      ? `${BASE_URL}/department-stats/?${queryParams}`
      : `${BASE_URL}/department-stats/`
    
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Get detailed statistics for a specific program (template)
   * Used for ProgramDetails page
   * @param templateId - ID of the ActivityTemplate
   * @param year - Year to get stats for
   */
  async getProgramDetail(templateId: number, year?: number): Promise<ProgramDetailData> {
    const queryParams = new URLSearchParams()
    if (year) queryParams.append('year', year.toString())
    
    const url = queryParams.toString()
      ? `${BASE_URL}/programs/${templateId}/?${queryParams}`
      : `${BASE_URL}/programs/${templateId}/`
    
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Transform KPI summary to KPI card data array for StatKpiCard components
   * This adapts API response to match existing frontend component props
   * @param kpis - KPI summary from API
   */
  transformToKPICards(kpis: KPISummary): KPICardData[] {
    return [
      {
        title: 'إجمالي الأنشطة',
        icon: 'bi bi-activity',
        value: kpis.total_activities,
        valueLabel: 'نشاط',
        trend: kpis.trend,
        percentage: kpis.change_percentage,
        footerText: 'في هذا الشهر'
      },
      {
        title: 'الأقسام المشاركة',
        icon: 'bi bi-building',
        value: kpis.participating_departments,
        valueLabel: 'قسم مشارك',
        trend: kpis.participating_departments > 0 ? 'up' : 'flat',
        percentage: 0,
        footerText: 'في هذا الشهر'
      },
      {
        title: 'الأقسام غير المشاركة',
        icon: 'bi bi-x-circle',
        value: kpis.non_participating_departments,
        valueLabel: 'أقسام غير مشاركة',
        trend: kpis.non_participating_departments > 0 ? 'down' : 'flat',
        percentage: 0,
        footerText: 'في هذا الشهر'
      },
      {
        title: 'معدل الإنجاز الإجمالي',
        icon: 'bi bi-check-circle',
        value: `${kpis.overall_completion_rate}%`,
        valueLabel: '',
        trend: kpis.overall_completion_rate >= 50 ? 'up' : 'down',
        percentage: Math.abs(kpis.change_percentage),
        footerText: 'في هذا الشهر'
      }
    ]
  },

  /**
   * Transform status distribution to format expected by StatusDonutChart
   * Groups data by year for the dataByYear prop
   * @param data - Status distribution from API
   * @param years - Array of years to include
   */
  transformStatusDistributionByYear(
    data: StatusDistribution,
    years: number[]
  ): Record<number, { total: number; items: { label: string; value: number; color: string }[] }> {
    const result: Record<number, { total: number; items: { label: string; value: number; color: string }[] }> = {}
    
    // For now, we only have data for one year at a time
    // In the future, we could fetch multiple years
    result[data.year] = {
      total: data.total,
      items: data.items
    }
    
    // Fill other years with empty data if needed
    years.forEach(year => {
      if (!result[year]) {
        result[year] = {
          total: 0,
          items: [
            { label: 'مكتمل', value: 0, color: '#00A651' },
            { label: 'قيد التنفيذ', value: 0, color: '#FFD166' },
            { label: 'لم يبدأ', value: 0, color: '#E76F51' }
          ]
        }
      }
    })
    
    return result
  },

  /**
   * Transform quarterly data to format expected by QuarterlyBarChart
   * @param data - Quarterly data from API
   * @param years - Array of years to include
   */
  transformQuarterlyDataByYear(
    data: QuarterlyData,
    years: number[]
  ): Record<number, { quarters: { label: string; planned: number; actual: number }[] }> {
    const result: Record<number, { quarters: { label: string; planned: number; actual: number }[] }> = {}
    
    result[data.year] = {
      quarters: data.quarters
    }
    
    // Fill other years with empty data if needed
    years.forEach(year => {
      if (!result[year]) {
        result[year] = {
          quarters: [
            { label: 'Q1', planned: 0, actual: 0 },
            { label: 'Q2', planned: 0, actual: 0 },
            { label: 'Q3', planned: 0, actual: 0 },
            { label: 'Q4', planned: 0, actual: 0 }
          ]
        }
      }
    })
    
    return result
  },

  /**
   * Transform monthly trend to format expected by MonthlyPlannedActualLineChart
   * @param data - Monthly trend from API
   */
  transformMonthlyTrend(data: MonthlyTrend): {
    months: string[]
    actualSeries: { label: string; value: number }[]
    plannedSeries: { label: string; value: number }[]
  } {
    const actualSeries = data.months.map((month, index) => ({
      label: month,
      value: data.actual[index] || 0
    }))
    
    const plannedSeries = data.months.map((month, index) => ({
      label: month,
      value: data.planned[index] || 0
    }))
    
    return {
      months: data.months,
      actualSeries,
      plannedSeries
    }
  }
}

export default dashboardService
