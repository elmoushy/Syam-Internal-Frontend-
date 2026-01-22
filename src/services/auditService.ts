/**
 * Audit Service
 * 
 * API service for fetching audit logs and statistics.
 * These endpoints are available to super_admin users only.
 */

import { apiClient } from './jwtAuthService'
import type { AxiosResponse } from 'axios'

// ============================================================================
// TYPES
// ============================================================================

export interface AuditLogEntry {
  id: number
  actor: number | null
  actor_name: string
  action: string
  action_display: string
  object_name: string
  description: string
  changes: Record<string, { old: string; new: string }>
  timestamp: string
}

export interface AuditLogsResponse {
  count: number
  page: number
  page_size: number
  total_pages: number
  results: AuditLogEntry[]
}

export interface AuditStatsResponse {
  total_logs: number
  logs_today: number
  logs_this_week: number
  action_breakdown: Record<string, number>
  top_actors: Array<{ actor_name: string; count: number }>
}

export interface ActorItem {
  name: string
}

export interface ActorsResponse {
  count: number
  actors: string[]
}

export interface ActionItem {
  value: string
  label: string
}

export interface ActionsResponse {
  count: number
  actions: ActionItem[]
}

export interface AuditLogsParams {
  action?: string
  actor?: string
  actor_name?: string
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const AUDIT_BASE_URL = '/audit'

/**
 * Fetch audit logs with optional filters and pagination
 */
export const getAuditLogs = async (params: AuditLogsParams = {}): Promise<AuditLogsResponse> => {
  try {
    const response: AxiosResponse<AuditLogsResponse> = await apiClient.get(`${AUDIT_BASE_URL}/logs/`, {
      params: {
        action: params.action || undefined,
        actor: params.actor || undefined,
        actor_name: params.actor_name || undefined,
        start_date: params.start_date || undefined,
        end_date: params.end_date || undefined,
        page: params.page || 1,
        page_size: params.page_size || 50
      }
    })
    return response.data
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    throw error
  }
}

/**
 * Fetch audit statistics
 */
export const getAuditStats = async (): Promise<AuditStatsResponse> => {
  try {
    const response: AxiosResponse<AuditStatsResponse> = await apiClient.get(`${AUDIT_BASE_URL}/stats/`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch audit stats:', error)
    throw error
  }
}

/**
 * Fetch list of actors (users) for filter dropdown
 */
export const getAuditActors = async (): Promise<ActorsResponse> => {
  try {
    const response: AxiosResponse<ActorsResponse> = await apiClient.get(`${AUDIT_BASE_URL}/actors/`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch audit actors:', error)
    throw error
  }
}

/**
 * Fetch list of action types for filter dropdown
 */
export const getAuditActions = async (): Promise<ActionsResponse> => {
  try {
    const response: AxiosResponse<ActionsResponse> = await apiClient.get(`${AUDIT_BASE_URL}/actions/`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch audit actions:', error)
    throw error
  }
}

// Export all functions as default object for convenience
export default {
  getAuditLogs,
  getAuditStats,
  getAuditActors,
  getAuditActions
}
