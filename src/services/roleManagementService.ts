/**
 * Role Management Service
 * 
 * API service for managing roles and page permissions.
 * These endpoints are available to super_admin users only.
 */

import { apiClient } from './jwtAuthService'
import type { AxiosResponse } from 'axios'

// ============================================================================
// TYPES
// ============================================================================

export interface PagePermission {
  id: number
  name: string
  display_name: string
  description: string
  role?: number
  role_name?: string
  role_display_name?: string
  created_at?: string
}

export interface RoleWithPermissions {
  id: number
  name: string
  display_name: string
  description: string
  is_system_role: boolean
  page_permissions: PagePermission[]
  pages: string[]
  users_count: number
  created_at: string
  updated_at: string
}

export interface AvailablePage {
  name: string
  display_name: string
  description: string
  assigned_roles: string[]
}

// Request types
export interface CreateRoleRequest {
  name: string
  display_name?: string
  description?: string
  is_system_role?: boolean
}

export interface UpdateRoleRequest {
  display_name?: string
  description?: string
}

export interface AssignPageRequest {
  page_name: string
  display_name?: string
  description?: string
}

export interface BulkAssignPagesRequest {
  page_names: string[]
}

export interface RemovePageRequest {
  page_name: string
}

// Response types
export interface RolesListResponse {
  roles: RoleWithPermissions[]
  total: number
}

export interface RoleDetailResponse {
  role: RoleWithPermissions
  message?: string
}

export interface RolePermissionsResponse {
  role_id: number
  role_name: string
  permissions: PagePermission[]
}

export interface AssignPageResponse {
  permission: PagePermission
  message: string
}

export interface BulkAssignResponse {
  message: string
  created: string[]
  skipped: string[]
}

export interface BulkReplaceResponse {
  message: string
  pages: string[]
  role: RoleWithPermissions
}

export interface AvailablePagesResponse {
  pages: AvailablePage[]
  total: number
}

export interface MessageResponse {
  message: string
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all roles with their permissions (super_admin only)
 */
export const getRolesWithPermissions = async (): Promise<RolesListResponse> => {
  const response: AxiosResponse<RolesListResponse> = await apiClient.get('/auth/roles/manage/')
  return response.data
}

/**
 * Get a specific role by ID
 */
export const getRoleById = async (roleId: number): Promise<RoleDetailResponse> => {
  const response: AxiosResponse<RoleDetailResponse> = await apiClient.get(`/auth/roles/manage/${roleId}/`)
  return response.data
}

/**
 * Create a new role
 */
export const createRole = async (data: CreateRoleRequest): Promise<RoleDetailResponse> => {
  const response: AxiosResponse<RoleDetailResponse> = await apiClient.post('/auth/roles/manage/', data)
  return response.data
}

/**
 * Update an existing role
 */
export const updateRole = async (roleId: number, data: UpdateRoleRequest): Promise<RoleDetailResponse> => {
  const response: AxiosResponse<RoleDetailResponse> = await apiClient.patch(`/auth/roles/manage/${roleId}/`, data)
  return response.data
}

/**
 * Delete a role (only non-system roles with no users)
 */
export const deleteRole = async (roleId: number): Promise<MessageResponse> => {
  const response: AxiosResponse<MessageResponse> = await apiClient.delete(`/auth/roles/manage/${roleId}/`)
  return response.data
}

/**
 * Get all permissions for a specific role
 */
export const getRolePermissions = async (roleId: number): Promise<RolePermissionsResponse> => {
  const response: AxiosResponse<RolePermissionsResponse> = await apiClient.get(`/auth/roles/manage/${roleId}/permissions/`)
  return response.data
}

/**
 * Assign a single page permission to a role
 */
export const assignPageToRole = async (roleId: number, data: AssignPageRequest): Promise<AssignPageResponse> => {
  const response: AxiosResponse<AssignPageResponse> = await apiClient.post(`/auth/roles/manage/${roleId}/permissions/`, data)
  return response.data
}

/**
 * Remove a page permission from a role
 */
export const removePageFromRole = async (roleId: number, data: RemovePageRequest): Promise<MessageResponse> => {
  const response: AxiosResponse<MessageResponse> = await apiClient.delete(`/auth/roles/manage/${roleId}/permissions/`, { data })
  return response.data
}

/**
 * Bulk assign multiple pages to a role (adds to existing)
 */
export const bulkAssignPagesToRole = async (roleId: number, data: BulkAssignPagesRequest): Promise<BulkAssignResponse> => {
  const response: AxiosResponse<BulkAssignResponse> = await apiClient.post(`/auth/roles/manage/${roleId}/permissions/bulk/`, data)
  return response.data
}

/**
 * Replace all permissions for a role with a new list
 */
export const replacePagesForRole = async (roleId: number, data: BulkAssignPagesRequest): Promise<BulkReplaceResponse> => {
  const response: AxiosResponse<BulkReplaceResponse> = await apiClient.put(`/auth/roles/manage/${roleId}/permissions/bulk/`, data)
  return response.data
}

/**
 * Get all available pages that can be assigned to roles
 */
export const getAvailablePages = async (): Promise<AvailablePagesResponse> => {
  const response: AxiosResponse<AvailablePagesResponse> = await apiClient.get('/auth/available-pages/')
  return response.data
}

// ============================================================================
// USER-ROLE ASSIGNMENT FUNCTIONS
// ============================================================================

export interface AssignUserRoleRequest {
  role_id: number
}

export interface AssignUserRoleResponse {
  user: {
    id: number
    email: string
    role: string
    user_role_id: number | null
    user_role_name: string | null
    allowed_pages: string[]
  }
  old_user_role: string | null
  new_user_role: string
  message: string
}

export interface RemoveUserRoleResponse {
  user: {
    id: number
    email: string
    role: string
    user_role_id: number | null
    user_role_name: string | null
  }
  old_user_role: string
  message: string
}

/**
 * Assign a user to a role from the Role table
 * This sets the user_role FK and automatically updates the role column
 */
export const assignUserToRole = async (
  userId: number, 
  data: AssignUserRoleRequest
): Promise<AssignUserRoleResponse> => {
  const response: AxiosResponse<AssignUserRoleResponse> = await apiClient.put(
    `/auth/users/${userId}/assign-role/`,
    data
  )
  return response.data
}

/**
 * Remove a user from their assigned role
 */
export const removeUserFromRole = async (
  userId: number,
  resetRole: boolean = true
): Promise<RemoveUserRoleResponse> => {
  const response: AxiosResponse<RemoveUserRoleResponse> = await apiClient.delete(
    `/auth/users/${userId}/assign-role/`,
    { data: { reset_role: resetRole } }
  )
  return response.data
}

/**
 * Helper function to extract error message from API errors
 */
export const getErrorMessage = (error: any): string => {
  if (error.response?.data) {
    const data = error.response.data
    if (data.detail) return data.detail
    if (data.message) return data.message
    if (data.errors) {
      const firstKey = Object.keys(data.errors)[0]
      if (firstKey) {
        const errorValue = data.errors[firstKey]
        return Array.isArray(errorValue) ? errorValue[0] : errorValue
      }
    }
  }
  return error.message || 'An unexpected error occurred'
}

// Default export with all functions
export default {
  getRolesWithPermissions,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  assignPageToRole,
  removePageFromRole,
  bulkAssignPagesToRole,
  replacePagesForRole,
  getAvailablePages,
  assignUserToRole,
  removeUserFromRole,
  getErrorMessage
}
