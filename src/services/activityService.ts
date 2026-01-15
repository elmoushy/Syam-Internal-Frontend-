// src/services/activityService.ts
// API service for the Dynamic Activities Template System

import { apiClient } from './jwtAuthService'
import type {
  ColumnDefinition,
  ColumnDefinitionCreate,
  ColumnDefinitionUpdate,
  ValidationRule,
  ValidationRuleCreate,
  Template,
  TemplateListItem,
  TemplateCreate,
  TemplateUpdate,
  TemplateColumn,
  TemplateColumnCreate,
  Sheet,
  SheetListItem,
  SheetCreate,
  SheetRow,
  SheetRowCreate,
  BulkRowsResponse,
  BulkRowsUpdateResponse,
  BulkRowsDeleteResponse,
  CursorPaginatedResponse,
  ChunkedSaveResult,
  PaginationInfo,
  PaginatedUserDataResponse,
  DifferentialUpdateRequest,
  DifferentialUpdateRequestV2,
  DifferentialUpdateResponse,
  UserRowData,
  RowOperations
} from '@/types/activity.types'

const BASE_URL = '/activities'

// ============ COLUMNS ============

export const columnService = {
  /**
   * Get all column definitions
   */
  async getAll(params?: { 
    show_inactive?: boolean
    system_only?: boolean
    data_type?: string
    search?: string 
  }): Promise<ColumnDefinition[]> {
    const queryParams = new URLSearchParams()
    if (params?.show_inactive) queryParams.append('show_inactive', 'true')
    if (params?.system_only) queryParams.append('system_only', 'true')
    if (params?.data_type) queryParams.append('data_type', params.data_type)
    if (params?.search) queryParams.append('search', params.search)
    
    const url = queryParams.toString() 
      ? `${BASE_URL}/columns/?${queryParams}` 
      : `${BASE_URL}/columns/`
    const response = await apiClient.get(url)
    return response.data.results || response.data
  },

  /**
   * Get single column by ID
   */
  async getById(id: number): Promise<ColumnDefinition> {
    const response = await apiClient.get(`${BASE_URL}/columns/${id}/`)
    return response.data
  },

  /**
   * Create new column (admin only)
   */
  async create(data: ColumnDefinitionCreate): Promise<ColumnDefinition> {
    const response = await apiClient.post(`${BASE_URL}/columns/`, data)
    return response.data
  },

  /**
   * Update column (admin only)
   */
  async update(id: number, data: ColumnDefinitionUpdate): Promise<ColumnDefinition> {
    const response = await apiClient.patch(`${BASE_URL}/columns/${id}/`, data)
    return response.data
  },

  /**
   * Delete column (admin only, soft-delete)
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/columns/${id}/`)
  },

  /**
   * Reorder columns - updates order field for each column
   */
  async reorder(orderedIds: number[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) => 
        apiClient.patch(`${BASE_URL}/columns/${id}/`, { order: index + 1 })
      )
    )
  },

  // ============ VALIDATIONS ============

  /**
   * Get validations for a column
   */
  async getValidations(columnId: number): Promise<ValidationRule[]> {
    const response = await apiClient.get(`${BASE_URL}/columns/${columnId}/validations/`)
    return response.data.results || response.data
  },

  /**
   * Add validation rule to column (admin only)
   */
  async addValidation(columnId: number, data: ValidationRuleCreate): Promise<ValidationRule> {
    const response = await apiClient.post(`${BASE_URL}/columns/${columnId}/validations/`, data)
    return response.data
  },

  /**
   * Update validation rule (admin only)
   */
  async updateValidation(validationId: number, data: Partial<ValidationRuleCreate>): Promise<ValidationRule> {
    const response = await apiClient.patch(`${BASE_URL}/validations/${validationId}/`, data)
    return response.data
  },

  /**
   * Delete validation rule (admin only)
   */
  async deleteValidation(validationId: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/validations/${validationId}/`)
  }
}

// ============ TEMPLATES ============

export const templateService = {
  /**
   * Get templates list
   */
  async getAll(params?: {
    mine_only?: boolean
    status?: string
    show_deleted?: boolean
    search?: string
  }): Promise<TemplateListItem[]> {
    const queryParams = new URLSearchParams()
    if (params?.mine_only) queryParams.append('mine_only', 'true')
    if (params?.status) queryParams.append('status', params.status)
    if (params?.show_deleted) queryParams.append('show_deleted', 'true')
    if (params?.search) queryParams.append('search', params.search)
    
    const url = queryParams.toString() 
      ? `${BASE_URL}/templates/?${queryParams}` 
      : `${BASE_URL}/templates/`
    const response = await apiClient.get(url)
    return response.data.results || response.data
  },

  /**
   * Get template detail with columns
   */
  async getById(id: number): Promise<Template> {
    const response = await apiClient.get(`${BASE_URL}/templates/${id}/`)
    return response.data
  },

  /**
   * Create new template
   */
  async create(data: TemplateCreate): Promise<Template> {
    const response = await apiClient.post(`${BASE_URL}/templates/`, data)
    return response.data
  },

  /**
   * Update template (name, description)
   */
  async update(id: number, data: TemplateUpdate): Promise<Template> {
    const response = await apiClient.patch(`${BASE_URL}/templates/${id}/`, data)
    return response.data
  },

  /**
   * Delete/archive template
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/templates/${id}/`)
  },

  /**
   * Publish template (draft -> published)
   */
  async publish(id: number): Promise<Template> {
    const response = await apiClient.post(`${BASE_URL}/templates/${id}/publish/`)
    return response.data
  },

  /**
   * Archive template
   */
  async archive(id: number): Promise<Template> {
    const response = await apiClient.post(`${BASE_URL}/templates/${id}/archive/`)
    return response.data
  },

  // ============ TEMPLATE COLUMNS ============

  /**
   * Get template columns
   */
  async getColumns(templateId: number): Promise<TemplateColumn[]> {
    const response = await apiClient.get(`${BASE_URL}/templates/${templateId}/columns/`)
    return response.data.results || response.data
  },

  /**
   * Replace all columns for a template (draft only)
   */
  async setColumns(templateId: number, columns: TemplateColumnCreate[]): Promise<TemplateColumn[]> {
    const response = await apiClient.put(`${BASE_URL}/templates/${templateId}/columns/`, { columns })
    return response.data.results || response.data
  },

  /**
   * Update columns for a template - accepts inline column definitions
   * Backend will create column definitions and link to template
   */
  async updateColumns(templateId: number, columns: { label: string, data_type: string, options?: string[] }[]): Promise<TemplateColumn[]> {
    const response = await apiClient.put(`${BASE_URL}/templates/${templateId}/columns/`, { columns })
    return response.data.results || response.data
  }
}

// ============ SHEETS ============

export const sheetService = {
  /**
   * Get user's sheets
   */
  async getAll(params?: {
    template?: number
    show_inactive?: boolean
    search?: string
    owner?: number
  }): Promise<SheetListItem[]> {
    const queryParams = new URLSearchParams()
    if (params?.template) queryParams.append('template', String(params.template))
    if (params?.show_inactive) queryParams.append('show_inactive', 'true')
    if (params?.search) queryParams.append('search', params.search)
    if (params?.owner) queryParams.append('owner', String(params.owner))
    
    const url = queryParams.toString() 
      ? `${BASE_URL}/sheets/?${queryParams}` 
      : `${BASE_URL}/sheets/`
    const response = await apiClient.get(url)
    return response.data.results || response.data
  },

  /**
   * Get sheet detail (includes column_snapshot)
   */
  async getById(id: number): Promise<Sheet> {
    const response = await apiClient.get(`${BASE_URL}/sheets/${id}/`)
    return response.data
  },

  /**
   * Create new sheet from template
   */
  async create(data: SheetCreate): Promise<Sheet> {
    const response = await apiClient.post(`${BASE_URL}/sheets/`, data)
    return response.data
  },

  /**
   * Update sheet name
   */
  async update(id: number, data: { name: string }): Promise<Sheet> {
    const response = await apiClient.patch(`${BASE_URL}/sheets/${id}/`, data)
    return response.data
  },

  /**
   * Soft-delete sheet
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/sheets/${id}/`)
  },

  // ============ ROWS (CHUNKED OPERATIONS) ============

  /**
   * Get rows with cursor pagination
   */
  async getRows(
    sheetId: number, 
    params?: { from_row?: number; to_row?: number; cursor?: string }
  ): Promise<CursorPaginatedResponse<SheetRow>> {
    let url = `${BASE_URL}/sheets/${sheetId}/rows/`
    
    if (params?.cursor) {
      // cursor is full URL
      url = params.cursor
    } else {
      const queryParams = new URLSearchParams()
      if (params?.from_row) queryParams.append('from_row', String(params.from_row))
      if (params?.to_row) queryParams.append('to_row', String(params.to_row))
      if (queryParams.toString()) url += `?${queryParams}`
    }
    
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Get ALL rows (auto-paginate through all cursors)
   */
  async getAllRows(sheetId: number): Promise<SheetRow[]> {
    const allRows: SheetRow[] = []
    let response = await this.getRows(sheetId)
    
    allRows.push(...response.rows)
    
    while (response.next_cursor) {
      response = await this.getRows(sheetId, { cursor: response.next_cursor })
      allRows.push(...response.rows)
    }
    
    return allRows.sort((a, b) => a.row_number - b.row_number)
  },

  /**
   * Create single row
   */
  async createRow(sheetId: number, data: SheetRowCreate): Promise<SheetRow> {
    const response = await apiClient.post(`${BASE_URL}/sheets/${sheetId}/rows/`, data)
    return response.data
  },

  /**
   * Bulk create rows (max 100 per request)
   */
  async bulkCreateRows(sheetId: number, rows: SheetRowCreate[], chunkId?: string): Promise<BulkRowsResponse> {
    const response = await apiClient.post(`${BASE_URL}/sheets/${sheetId}/rows/bulk/`, { 
      rows,
      chunk_id: chunkId || ''
    })
    return response.data
  },

  /**
   * Bulk update rows (max 100 per request)
   */
  async bulkUpdateRows(
    sheetId: number, 
    rows: { id?: number; row_number?: number; data?: Record<string, string>; styles?: Record<string, any>; height?: number }[],
    chunkId?: string
  ): Promise<BulkRowsUpdateResponse> {
    const response = await apiClient.put(`${BASE_URL}/sheets/${sheetId}/rows/bulk/`, { 
      rows,
      chunk_id: chunkId || ''
    })
    return response.data
  },

  /**
   * Bulk delete rows
   */
  async bulkDeleteRows(sheetId: number, rowIds?: number[], rowNumbers?: number[]): Promise<BulkRowsDeleteResponse> {
    const response = await apiClient.delete(`${BASE_URL}/sheets/${sheetId}/rows/bulk/`, {
      data: { row_ids: rowIds, row_numbers: rowNumbers }
    })
    return response.data
  },

  /**
   * Update single row
   */
  async updateRow(rowId: number, data: Partial<SheetRowCreate>): Promise<SheetRow> {
    const response = await apiClient.patch(`${BASE_URL}/rows/${rowId}/`, data)
    return response.data
  },

  /**
   * Delete single row
   */
  async deleteRow(rowId: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/rows/${rowId}/`)
  },

  // ============ CHUNKED SAVE WITH ERROR RECOVERY ============

  /**
   * Save rows in chunks (handles large datasets)
   * With error recovery - tracks successful chunks and allows retry
   */
  async saveRowsChunked(
    sheetId: number, 
    rows: SheetRowCreate[], 
    chunkSize: number = 100,
    onProgress?: (saved: number, total: number, failedRows: number[]) => void
  ): Promise<ChunkedSaveResult> {
    const chunks: { index: number; rows: SheetRowCreate[] }[] = []
    
    // Split into chunks with index tracking
    for (let i = 0; i < rows.length; i += chunkSize) {
      chunks.push({
        index: Math.floor(i / chunkSize),
        rows: rows.slice(i, i + chunkSize)
      })
    }
    
    let totalCreated = 0
    let totalUpdated = 0
    let savedCount = 0
    const failedChunks: number[] = []
    const failedRows: number[] = []
    
    // Save each chunk sequentially with error handling
    for (const chunk of chunks) {
      try {
        const result = await this.bulkCreateRows(sheetId, chunk.rows, `chunk-${chunk.index}`)
        totalCreated += result.created_count
        savedCount += chunk.rows.length
      } catch (error) {
        console.error(`Chunk ${chunk.index} failed:`, error)
        failedChunks.push(chunk.index)
        // Track failed row numbers for UI
        failedRows.push(...chunk.rows.map(r => r.row_number))
      }
      
      if (onProgress) {
        onProgress(savedCount, rows.length, failedRows)
      }
    }
    
    return {
      created: totalCreated,
      updated: totalUpdated,
      total_rows: savedCount,
      failedChunks
    }
  },

  /**
   * Retry failed chunks
   */
  async retryFailedChunks(
    sheetId: number,
    rows: SheetRowCreate[],
    failedChunkIndices: number[],
    chunkSize: number = 100,
    onProgress?: (saved: number, total: number, failedRows: number[]) => void
  ): Promise<ChunkedSaveResult> {
    // Reconstruct only failed chunks
    const failedRows: SheetRowCreate[] = []
    
    for (const chunkIndex of failedChunkIndices) {
      const start = chunkIndex * chunkSize
      const end = Math.min(start + chunkSize, rows.length)
      failedRows.push(...rows.slice(start, end))
    }
    
    // Retry with same chunking logic
    return this.saveRowsChunked(sheetId, failedRows, chunkSize, onProgress)
  },

  // ============ EXCEL IMPORT/EXPORT ============

  /**
   * Export sheet to Excel and trigger browser download
   */
  async exportToExcel(sheetId: number, sheetName: string = 'sheet'): Promise<void> {
    const response = await apiClient.get(`${BASE_URL}/sheets/${sheetId}/export/`, {
      responseType: 'blob'
    })
    
    // Create download link
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sheetName.replace(/\s+/g, '_')}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  /**
   * Export sheet as Blob (for programmatic use)
   */
  async exportToExcelBlob(sheetId: number): Promise<Blob> {
    const response = await apiClient.get(`${BASE_URL}/sheets/${sheetId}/export/`, {
      responseType: 'blob'
    })
    return new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
  },

  /**
   * Import Excel file to sheet
   */
  async importFromExcel(
    sheetId: number, 
    file: File,
    options?: { validate?: boolean; replace?: boolean }
  ): Promise<{
    success: boolean
    message?: string
    message_en?: string
    imported_count: number
    skipped_count: number
    errors?: Array<{ row_number: number; errors: Record<string, string> }>
    warnings?: string[]
  }> {
    const formData = new FormData()
    formData.append('file', file)
    if (options?.validate !== undefined) {
      formData.append('validate', String(options.validate))
    }
    if (options?.replace !== undefined) {
      formData.append('replace', String(options.replace))
    }
    
    const response = await apiClient.post(`${BASE_URL}/sheets/${sheetId}/import/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Download empty template from ActivityTemplate
   */
  async downloadTemplate(templateId: number, templateName: string = 'template'): Promise<void> {
    const response = await apiClient.get(`${BASE_URL}/templates/${templateId}/download/`, {
      responseType: 'blob'
    })
    
    // Create download link
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `template_${templateName.replace(/\s+/g, '_')}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
}

// ============ TITLES (Simplified User-Facing API) ============

export interface TitleItem {
  id: number
  name: string
  description: string
  column_count: number
  is_active_title?: boolean
  is_deleted?: boolean
  status?: string
}

export interface TitleColumn {
  key: string
  label: string
  data_type: string
  width: number
  min_width: number
  is_required: boolean
  options: string[]
  validations: Array<{
    rule_type: string
    rule_value: string
    error_message: string
  }>
}

export interface TitleColumnsResponse {
  title_id: number
  title_name: string
  columns: TitleColumn[]
}

// Re-export types for convenience
export type { 
  UserRowData, 
  PaginationInfo, 
  PaginatedUserDataResponse, 
  DifferentialUpdateRequest,
  DifferentialUpdateRequestV2,
  DifferentialUpdateResponse,
  RowOperations
}

export interface SaveUserDataResponse {
  success: boolean
  message: string
  sheet_id: number
  row_count: number
}

// Sheet for title listing
export interface TitleSheetItem {
  id: number
  name: string
  description: string
  row_count: number
  is_submitted?: boolean
  submitted_at?: string | null
  created_at: string
  updated_at: string
}

export interface TitleSheetsResponse {
  title_id: number
  title_name: string
  sheets: TitleSheetItem[]
  count: number
}

// User's all sheets (regardless of title)
export interface UserSheetItem {
  id: number
  name: string
  description: string
  template_id: number | null
  template_name: string
  template_status: string
  template_is_active: boolean
  row_count: number
  is_submitted: boolean
  submitted_at: string | null
  created_at: string
  updated_at: string
}

// Submitted sheet for admin view
export interface SubmittedSheetItem {
  id: number
  name: string
  description: string
  template_id: number | null
  template_name: string
  owner_id: number
  owner_name: string
  owner_username: string
  row_count: number
  submitted_at: string | null
  created_at: string
}

export const titleService = {
  /**
   * Get list of published titles for dropdown
   */
  async getPublishedTitles(): Promise<TitleItem[]> {
    const response = await apiClient.get(`${BASE_URL}/titles/`)
    return response.data
  },

  /**
   * Get the active title (auto-load for users)
   */
  async getActiveTitle(): Promise<TitleItem | null> {
    const response = await apiClient.get(`${BASE_URL}/titles/active/`)
    if (response.data.id) {
      return response.data
    }
    return null
  },

  /**
   * Get a template by ID (for loading non-active templates)
   */
  async getTemplateById(templateId: number): Promise<TitleItem> {
    const response = await apiClient.get(`${BASE_URL}/titles/${templateId}/`)
    return response.data
  },

  /**
   * Set a title as active (admin only)
   */
  async setActiveTitle(titleId: number): Promise<{ success: boolean, message: string, title_id: number, title_name: string }> {
    const response = await apiClient.post(`${BASE_URL}/titles/${titleId}/set-active/`)
    return response.data
  },

  /**
   * Deactivate a title (admin only)
   */
  async deactivateTitle(titleId: number): Promise<{ success: boolean, message: string }> {
    const response = await apiClient.post(`${BASE_URL}/titles/${titleId}/deactivate/`)
    return response.data
  },

  /**
   * Get columns for a specific title
   */
  async getTitleColumns(titleId: number): Promise<TitleColumnsResponse> {
    const response = await apiClient.get(`${BASE_URL}/titles/${titleId}/columns/`)
    return response.data
  },

  /**
   * Get user's sheets for a specific title
   */
  async getUserSheets(titleId: number): Promise<TitleSheetsResponse> {
    const response = await apiClient.get(`${BASE_URL}/titles/${titleId}/sheets/`)
    return response.data
  },

  /**
   * Get all user's sheets (regardless of title - for recent sheets)
   */
  async getAllUserSheets(): Promise<{ sheets: UserSheetItem[], count: number }> {
    const response = await apiClient.get(`${BASE_URL}/my-sheets/`)
    return response.data
  },

  /**
   * Create a new sheet for a title
   */
  async createSheet(titleId: number, name: string, description?: string): Promise<TitleSheetItem> {
    const response = await apiClient.post(`${BASE_URL}/titles/${titleId}/sheets/`, {
      name,
      description: description || ''
    })
    return response.data
  },

  /**
   * Submit a sheet to admin (cannot edit after submission)
   */
  async submitSheet(sheetId: number): Promise<{ success: boolean, message: string, sheet_id: number, submitted_at: string }> {
    const response = await apiClient.post(`${BASE_URL}/my-sheets/${sheetId}/submit/`)
    return response.data
  },

  /**
   * Get all submitted sheets (admin only)
   */
  async getSubmittedSheets(params?: { 
    title_id?: number, 
    search?: string, 
    page?: number, 
    page_size?: number 
  }): Promise<{ 
    sheets: SubmittedSheetItem[], 
    pagination: PaginationInfo 
  }> {
    const queryParams = new URLSearchParams()
    if (params?.title_id) queryParams.append('title_id', String(params.title_id))
    if (params?.search) queryParams.append('search', params.search)
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.page_size) queryParams.append('page_size', String(params.page_size))
    
    const url = queryParams.toString() 
      ? `${BASE_URL}/admin/submitted-sheets/?${queryParams}` 
      : `${BASE_URL}/admin/submitted-sheets/`
    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Get user's data for a specific sheet WITH PAGINATION, FILTERING, and SORTING
   */
  async getUserData(
    titleId: number, 
    sheetId: number, 
    page: number = 1, 
    pageSize: number = 100,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    filters?: Record<string, { excluded: string[], show_blanks: boolean }>
  ): Promise<PaginatedUserDataResponse> {
    const params: Record<string, string | number> = { 
      sheet_id: sheetId,
      page,
      page_size: pageSize
    }
    
    if (sortBy) {
      params.sort_by = sortBy
      params.sort_order = sortOrder || 'asc'
    }
    
    if (filters && Object.keys(filters).length > 0) {
      params.filters = JSON.stringify(filters)
    }
    
    const response = await apiClient.get(`${BASE_URL}/titles/${titleId}/my-data/`, { params })
    return response.data
  },

  /**
   * Get unique values for a column (for filter dropdowns)
   */
  async getColumnValues(
    titleId: number,
    sheetId: number,
    columnKey: string,
    limit: number = 1000
  ): Promise<{ column_key: string, values: string[], has_blanks: boolean, total_unique: number, truncated: boolean }> {
    const response = await apiClient.get(`${BASE_URL}/titles/${titleId}/column-values/`, {
      params: {
        sheet_id: sheetId,
        column_key: columnKey,
        limit
      }
    })
    return response.data
  },

  /**
   * Save user's data for a specific sheet (FULL REPLACE - use for small datasets)
   */
  async saveUserData(titleId: number, sheetId: number, rows: UserRowData[]): Promise<SaveUserDataResponse> {
    const response = await apiClient.post(`${BASE_URL}/titles/${titleId}/my-data/`, {
      sheet_id: sheetId,
      rows
    })
    return response.data
  },

  /**
   * Differential update - only update changed rows (EFFICIENT for large datasets)
   * Use this when you have tracked changes and want to save only modified rows.
   * 
   * IMPORTANT: Uses database IDs for row identification, NOT row positions.
   * Row positions can change with insertions - database IDs are stable.
   */
  async updateUserDataDifferential(
    titleId: number, 
    request: DifferentialUpdateRequest | DifferentialUpdateRequestV2
  ): Promise<DifferentialUpdateResponse> {
    const response = await apiClient.patch(`${BASE_URL}/titles/${titleId}/my-data/`, request)
    return response.data
  },

  /**
   * Update with comprehensive operations (new format)
   * Supports: updates, insertions, deletions, appends
   */
  async updateUserDataWithOperations(
    titleId: number,
    sheetId: number,
    operations: RowOperations
  ): Promise<DifferentialUpdateResponse> {
    const request: DifferentialUpdateRequestV2 = {
      sheet_id: sheetId,
      operations
    }
    const response = await apiClient.patch(`${BASE_URL}/titles/${titleId}/my-data/`, request)
    return response.data
  },

  /**
   * Update sheet name/description
   */
  async updateSheet(sheetId: number, data: { name?: string, description?: string }): Promise<TitleSheetItem> {
    const response = await apiClient.patch(`${BASE_URL}/my-sheets/${sheetId}/`, data)
    return response.data
  },

  /**
   * Delete a sheet
   */
  async deleteSheet(sheetId: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/my-sheets/${sheetId}/`)
  },

  /**
   * Admin: Get any sheet's data (read-only view)
   */
  async getAdminSheetData(
    sheetId: number,
    page: number = 1,
    pageSize: number = 100,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    filters?: Record<string, { excluded: string[], show_blanks: boolean }>
  ): Promise<AdminSheetDataResponse> {
    const params: Record<string, string | number> = { 
      page,
      page_size: pageSize
    }
    
    if (sortBy) {
      params.sort_by = sortBy
      params.sort_order = sortOrder || 'asc'
    }
    
    if (filters && Object.keys(filters).length > 0) {
      params.filters = JSON.stringify(filters)
    }
    
    const queryParams = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    )
    
    const response = await apiClient.get(`${BASE_URL}/admin/sheets/${sheetId}/data/?${queryParams}`)
    return response.data
  }
}

// Admin sheet data response type
export interface AdminSheetDataResponse {
  sheet_id: number
  sheet_name: string
  sheet_description: string
  is_submitted: boolean
  submitted_at: string | null
  owner_id: number
  owner_name: string
  owner_username: string
  template_id: number | null
  template_name: string
  rows: Array<{
    id: number
    row_order: number
    row_number: number
    data: Record<string, string>
    styles: Record<string, any>
    height: number
  }>
  columns: Array<{
    key: string
    label: string
    data_type: string
    width?: number
    min_width?: number
    is_required?: boolean
    options?: string[]
  }>
  pagination: PaginationInfo
}

// Default export with all services
export default {
  columns: columnService,
  templates: templateService,
  sheets: sheetService,
  titles: titleService
}
