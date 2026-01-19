// src/types/activity.types.ts
// Types for the Dynamic Activities Template System

export type DataType = 'text' | 'number' | 'date' | 'boolean' | 'select'

export type ValidationRuleType = 
  | 'required'
  | 'regex'
  | 'min_length'
  | 'max_length'
  | 'min_value'
  | 'max_value'
  | 'options'
  | 'unique'
  | 'date_format'
  | 'date_range'

export interface ValidationRule {
  id: number
  rule_type: ValidationRuleType
  rule_value: string
  error_message: string
  is_active: boolean
  order: number
  created_at?: string
}

export interface ValidationRuleCreate {
  rule_type: ValidationRuleType
  rule_value: string
  error_message: string
  is_active?: boolean
  order?: number
}

export interface ColumnDefinition {
  id: number
  key: string
  label: string
  data_type: DataType
  default_width: number
  min_width: number
  order: number
  is_system: boolean
  is_active: boolean
  options: string[]
  validations: ValidationRule[]
  can_delete: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface ColumnDefinitionCreate {
  key: string
  label: string
  data_type: DataType
  default_width?: number
  min_width?: number
  order?: number
  options?: string[]
}

export interface ColumnDefinitionUpdate {
  label?: string
  data_type?: DataType
  default_width?: number
  min_width?: number
  order?: number
  is_active?: boolean
  options?: string[]
}

export type TemplateStatus = 'draft' | 'published' | 'archived'

export interface TemplateColumn {
  id: number
  column_definition: ColumnDefinition
  column_definition_id?: number
  order: number
  width: number | null
  is_required: boolean
  is_visible: boolean
  effective_width: number
}

// For assigning existing columns to template (legacy)
export interface TemplateColumnCreate {
  column_definition_id: number
  order?: number
  width?: number | null
  is_required?: boolean
  is_visible?: boolean
}

// For inline column creation with template
export interface InlineColumnCreate {
  label: string
  data_type: DataType
  options?: string[]
}

export interface Template {
  id: number
  name: string
  description: string
  notes?: string  // Added for user instructions
  status: TemplateStatus
  is_deleted: boolean
  owner: number
  owner_name: string
  header_image: string | null
  template_columns: TemplateColumn[]  // Full nested format
  columns?: Array<{  // Simplified format for frontend
    id: number
    name: string
    data_type: DataType
    options?: string[]
    order: number
    is_required: boolean
    is_visible: boolean
  }>
  can_delete: boolean
  sheet_count: number
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface TemplateListItem {
  id: number
  name: string
  description: string
  status: TemplateStatus
  is_deleted: boolean
  is_active_title?: boolean  // Indicates if this is the currently active template for users
  owner: number
  owner_name: string
  column_count: number
  sheet_count: number
  can_delete: boolean
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface TemplateCreate {
  name: string
  description?: string
  notes?: string
  columns?: InlineColumnCreate[]
}

export interface TemplateUpdate {
  name?: string
  description?: string
  notes?: string
  status?: TemplateStatus
  is_active_title?: boolean
  columns?: InlineColumnCreate[]
}

export interface ColumnSnapshot {
  key: string
  label: string
  data_type: DataType
  width: number
  min_width: number
  is_required: boolean
  is_visible: boolean
  options: string[]
  validations: {
    rule_type: ValidationRuleType
    rule_value: string
    error_message: string
  }[]
}

export interface Sheet {
  id: number
  name: string
  template: number | null
  template_name: string | null
  template_status: string | null
  column_snapshot: ColumnSnapshot[]
  owner: number
  owner_name: string
  row_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SheetListItem {
  id: number
  name: string
  template: number | null
  template_name: string | null
  owner: number
  owner_name: string
  row_count: number
  column_count?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SheetCreate {
  name: string
  template_id: number
}

export interface CellStyle {
  bold?: boolean
  italic?: boolean
  backgroundColor?: string
  textColor?: string
}

export interface SheetRow {
  id?: number
  row_number: number
  data: Record<string, string>
  styles: Record<string, CellStyle>
  height: number
  created_at?: string
  updated_at?: string
}

export interface SheetRowCreate {
  row_number: number
  data: Record<string, string>
  styles?: Record<string, CellStyle>
  height?: number
}

export interface BulkRowsRequest {
  rows: SheetRowCreate[]
  chunk_id?: string
}

export interface BulkRowsResponse {
  success: boolean
  created_count: number
  created: SheetRow[]
  errors: { row_number?: number; id?: number; error: string }[]
  chunk_id: string
  warnings?: string[]
}

export interface BulkRowsUpdateResponse {
  success: boolean
  updated_count: number
  updated: SheetRow[]
  errors: { row_number?: number; id?: number; error: string }[]
  chunk_id: string
}

export interface BulkRowsDeleteRequest {
  row_ids?: number[]
  row_numbers?: number[]
}

export interface BulkRowsDeleteResponse {
  success: boolean
  deleted_count: number
}

export interface CursorPaginatedResponse<T> {
  rows: T[]
  next_cursor: string | null
  prev_cursor: string | null
  total_count: number
  has_more: boolean
}

export interface ChunkedSaveResult {
  created: number
  updated: number
  total_rows: number
  failedChunks: number[]
}

// ============ PAGINATION TYPES ============

export interface PaginationInfo {
  page: number
  page_size: number
  total_count: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface PaginatedUserDataResponse {
  sheet_id: number
  sheet_name: string
  sheet_description?: string
  title_id: number
  title_name: string
  rows: UserRowData[]
  columns: ColumnSnapshot[]
  pagination: PaginationInfo
}

/**
 * Row data from server.
 * IMPORTANT: `id` is the stable database identifier, `row_order` is display position.
 */
export interface UserRowData {
  id?: number           // Database PK - STABLE identifier (undefined for new rows)
  row_order?: number    // Display position (1-indexed)
  row_number?: number   // DEPRECATED: Use row_order. Kept for backward compatibility.
  data: Record<string, string>
  styles: Record<string, CellStyle>
  height: number
}

// ============ DIFFERENTIAL UPDATE TYPES ============

/**
 * Update operation for an existing row (identified by database ID)
 */
export interface RowUpdateOperation {
  id: number  // Database PK - the row to update
  data?: Record<string, string>
  styles?: Record<string, CellStyle>
  height?: number
}

/**
 * Insert operation - inserts a new row at a specific position
 * All rows at or after this position will be shifted down
 */
export interface RowInsertOperation {
  insert_at_order: number  // Position to insert at (1-indexed)
  data: Record<string, string>
  styles: Record<string, CellStyle>
  height: number
}

/**
 * Append operation - adds a new row at the end
 */
export interface RowAppendOperation {
  data: Record<string, string>
  styles: Record<string, CellStyle>
  height: number
}

/**
 * Comprehensive operations structure for PATCH request
 */
export interface RowOperations {
  updates?: RowUpdateOperation[]      // Update existing rows by ID
  insertions?: RowInsertOperation[]   // Insert new rows at specific positions
  deletions?: number[]                // Database IDs of rows to delete
  appends?: RowAppendOperation[]      // New rows to add at the end
}

/**
 * NEW comprehensive request format for PATCH endpoint
 */
export interface DifferentialUpdateRequestV2 {
  sheet_id: number
  operations: RowOperations
}

/**
 * DEPRECATED: Old request format - still supported for backward compatibility
 * Use DifferentialUpdateRequestV2 with operations instead
 */
export interface DifferentialUpdateRequest {
  sheet_id: number
  updated_rows?: UserRowData[]       // Uses id field for identification
  new_rows?: UserRowData[]           // Appended at end
  deleted_row_ids?: number[]         // Database IDs to delete
  deleted_row_numbers?: number[]     // DEPRECATED: Delete by old row_number
}

export interface DifferentialUpdateResponse {
  success: boolean
  message: string
  sheet_id: number
  updated_count: number
  inserted_count?: number  // New field for insertions
  created_count: number    // Alias for appended count
  deleted_count: number
  row_count: number
  errors: { id?: number; row_number?: number; error: string }[]
}
