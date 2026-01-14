// src/composables/useActivitySheet.ts
// State management composable for Activities Template System

import { ref, computed, readonly } from 'vue'
import { sheetService, templateService, columnService } from '@/services/activityService'
import type { 
  Sheet, 
  SheetRow, 
  SheetListItem,
  Template, 
  TemplateListItem,
  ColumnDefinition,
  ColumnSnapshot,
  ChunkedSaveResult
} from '@/types/activity.types'

// ============ MODULE-LEVEL STATE (shared across components) ============

const currentSheet = ref<Sheet | null>(null)
const currentTemplate = ref<Template | null>(null)
const rows = ref<SheetRow[]>([])
const columns = ref<ColumnDefinition[]>([])
const templates = ref<TemplateListItem[]>([])
const sheets = ref<SheetListItem[]>([])

const isLoading = ref(false)
const isSaving = ref(false)
const saveProgress = ref({ saved: 0, total: 0, failedRows: [] as number[] })
const isDirty = ref(false)
const lastError = ref<string | null>(null)

// Chunk size for saving
const CHUNK_SIZE = 100

// ============ COMPOSABLE ============

export function useActivitySheet() {
  
  // ============ COMPUTED ============
  
  const hasUnsavedChanges = computed(() => isDirty.value)
  
  /**
   * Get columns from current sheet's snapshot
   */
  const sheetColumns = computed(() => {
    if (!currentSheet.value) return []
    
    // Use column_snapshot from sheet
    return currentSheet.value.column_snapshot.map((col: ColumnSnapshot, index: number) => ({
      id: index,
      key: col.key,
      label: col.label,
      dataType: col.data_type,
      width: col.width || 120,
      isRequired: col.is_required,
      isVisible: col.is_visible,
      order: index
    })).sort((a: { order: number }, b: { order: number }) => a.order - b.order)
  })
  
  /**
   * Get active (visible) columns only
   */
  const visibleColumns = computed(() => {
    return sheetColumns.value.filter((col: { isVisible: boolean }) => col.isVisible)
  })
  
  // ============ LOAD METHODS ============
  
  /**
   * Load all available column definitions
   */
  async function loadColumns(): Promise<void> {
    try {
      columns.value = await columnService.getAll()
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    }
  }
  
  /**
   * Load user's templates
   */
  async function loadTemplates(params?: {
    mine_only?: boolean
    status?: string
  }): Promise<void> {
    isLoading.value = true
    lastError.value = null
    try {
      templates.value = await templateService.getAll(params)
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Load user's sheets
   */
  async function loadSheets(params?: {
    template_id?: number
    search?: string
  }): Promise<void> {
    isLoading.value = true
    lastError.value = null
    try {
      sheets.value = await sheetService.getAll(params)
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Load a specific sheet with all its rows
   */
  async function loadSheet(sheetId: number): Promise<void> {
    isLoading.value = true
    lastError.value = null
    
    try {
      // Load sheet metadata
      currentSheet.value = await sheetService.getById(sheetId)
      
      // Load template if exists
      if (currentSheet.value.template) {
        try {
          currentTemplate.value = await templateService.getById(currentSheet.value.template)
        } catch {
          // Template may be deleted/archived - that's ok, we have column snapshot
          currentTemplate.value = null
        }
      }
      
      // Load all rows (handles pagination internally)
      rows.value = await sheetService.getAllRows(sheetId)
      isDirty.value = false
      
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      currentSheet.value = null
      rows.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  // ============ TEMPLATE METHODS ============
  
  /**
   * Create a new template
   */
  async function createTemplate(
    name: string, 
    description: string, 
    columnIds: number[]
  ): Promise<Template> {
    lastError.value = null
    try {
      const columnConfigs = columnIds.map((id, index) => ({
        column_definition_id: id,
        order: index,
        is_required: false,
        is_visible: true
      }))
      
      const template = await templateService.create({
        name,
        description,
        columns: columnConfigs
      })
      
      await loadTemplates()
      return template
      
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    }
  }
  
  /**
   * Update a template
   */
  async function updateTemplate(
    templateId: number,
    data: { name?: string; description?: string; columnIds?: number[] }
  ): Promise<Template> {
    lastError.value = null
    try {
      const updateData: any = {}
      
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      
      if (data.columnIds) {
        // Use setColumns API for updating template columns (separate from update)
        await templateService.setColumns(templateId, data.columnIds.map((id, index) => ({
          column_definition_id: id,
          order: index,
          is_required: false,
          is_visible: true
        })))
      }
      
      const template = await templateService.update(templateId, updateData)
      await loadTemplates()
      return template
      
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    }
  }
  
  /**
   * Publish a template
   */
  async function publishTemplate(templateId: number): Promise<void> {
    lastError.value = null
    try {
      await templateService.publish(templateId)
      await loadTemplates()
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    }
  }
  
  /**
   * Archive a template (soft delete)
   */
  async function archiveTemplate(templateId: number): Promise<void> {
    lastError.value = null
    try {
      await templateService.delete(templateId)
      await loadTemplates()
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    }
  }
  
  // ============ SHEET METHODS ============
  
  /**
   * Create a new sheet from template
   */
  async function createSheet(name: string, templateId: number): Promise<Sheet> {
    lastError.value = null
    try {
      const sheet = await sheetService.create({ name, template_id: templateId })
      await loadSheets()
      return sheet
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    }
  }
  
  /**
   * Update sheet metadata
   */
  async function updateSheet(sheetId: number, data: { name: string }): Promise<Sheet> {
    lastError.value = null
    try {
      const sheet = await sheetService.update(sheetId, data)
      
      if (currentSheet.value?.id === sheetId) {
        currentSheet.value = sheet
      }
      
      await loadSheets()
      return sheet
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    }
  }
  
  /**
   * Delete a sheet
   */
  async function deleteSheet(sheetId: number): Promise<void> {
    lastError.value = null
    try {
      await sheetService.delete(sheetId)
      
      if (currentSheet.value?.id === sheetId) {
        currentSheet.value = null
        rows.value = []
      }
      
      await loadSheets()
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    }
  }
  
  // ============ ROW METHODS ============
  
  /**
   * Update a cell value
   */
  function updateCell(rowNumber: number, columnKey: string, value: string): void {
    const row = rows.value.find(r => r.row_number === rowNumber)
    if (row) {
      row.data[columnKey] = value
      isDirty.value = true
    }
  }
  
  /**
   * Update cell style
   */
  function updateCellStyle(
    rowNumber: number, 
    columnKey: string, 
    style: Partial<{ bgColor: string; textColor: string; fontWeight: string; fontStyle: string }>
  ): void {
    const row = rows.value.find(r => r.row_number === rowNumber)
    if (row) {
      if (!row.styles) row.styles = {}
      row.styles[columnKey] = { ...row.styles[columnKey], ...style }
      isDirty.value = true
    }
  }
  
  /**
   * Update row height
   */
  function updateRowHeight(rowNumber: number, height: number): void {
    const row = rows.value.find(r => r.row_number === rowNumber)
    if (row) {
      row.height = height
      isDirty.value = true
    }
  }
  
  /**
   * Add a new row at the end
   */
  function addRow(): SheetRow {
    const maxRowNumber = rows.value.length > 0 
      ? Math.max(...rows.value.map(r => r.row_number))
      : 0
    
    const newRow: SheetRow = {
      row_number: maxRowNumber + 1,
      data: {},
      styles: {},
      height: 32
    }
    
    rows.value.push(newRow)
    isDirty.value = true
    return newRow
  }
  
  /**
   * Add multiple empty rows
   */
  function addRows(count: number): SheetRow[] {
    const newRows: SheetRow[] = []
    for (let i = 0; i < count; i++) {
      newRows.push(addRow())
    }
    return newRows
  }
  
  /**
   * Insert row at specific position
   */
  function insertRowAt(index: number): SheetRow {
    const newRow: SheetRow = {
      row_number: index + 1,
      data: {},
      styles: {},
      height: 32
    }
    
    rows.value.splice(index, 0, newRow)
    
    // Renumber rows after insertion
    rows.value.forEach((row, idx) => {
      row.row_number = idx + 1
    })
    
    isDirty.value = true
    return newRow
  }
  
  /**
   * Delete rows by row numbers
   */
  function deleteRows(rowNumbers: number[]): void {
    rows.value = rows.value.filter(r => !rowNumbers.includes(r.row_number))
    
    // Renumber rows
    rows.value.forEach((row, index) => {
      row.row_number = index + 1
    })
    
    isDirty.value = true
  }
  
  /**
   * Delete single row
   */
  function deleteRow(rowNumber: number): void {
    deleteRows([rowNumber])
  }
  
  /**
   * Duplicate a row
   */
  function duplicateRow(rowNumber: number): SheetRow | null {
    const sourceRow = rows.value.find(r => r.row_number === rowNumber)
    if (!sourceRow) return null
    
    const sourceIndex = rows.value.indexOf(sourceRow)
    const newRow: SheetRow = {
      row_number: rowNumber + 1,
      data: { ...sourceRow.data },
      styles: sourceRow.styles ? { ...sourceRow.styles } : {},
      height: sourceRow.height
    }
    
    rows.value.splice(sourceIndex + 1, 0, newRow)
    
    // Renumber rows after insertion
    rows.value.forEach((row, idx) => {
      row.row_number = idx + 1
    })
    
    isDirty.value = true
    return newRow
  }
  
  /**
   * Save all rows (chunked with error recovery)
   */
  async function saveRows(): Promise<ChunkedSaveResult> {
    if (!currentSheet.value) {
      throw new Error('No sheet loaded')
    }
    
    isSaving.value = true
    saveProgress.value = { saved: 0, total: rows.value.length, failedRows: [] }
    
    try {
      const result = await sheetService.saveRowsChunked(
        currentSheet.value.id,
        rows.value,
        CHUNK_SIZE,
        (saved, total, failedRows) => {
          saveProgress.value = { saved, total, failedRows: failedRows || [] }
        }
      )
      
      if (result.failedChunks.length === 0) {
        isDirty.value = false
      }
      
      return result
      
    } catch (error: any) {
      lastError.value = error.response?.data?.detail || error.message
      throw error
    } finally {
      isSaving.value = false
    }
  }
  
  /**
   * Get row by row number
   */
  function getRow(rowNumber: number): SheetRow | undefined {
    return rows.value.find(r => r.row_number === rowNumber)
  }
  
  /**
   * Get cell value
   */
  function getCellValue(rowNumber: number, columnKey: string): string {
    const row = getRow(rowNumber)
    return row?.data[columnKey] || ''
  }
  
  // ============ VALIDATION ============
  
  /**
   * Validate a cell value against column validation rules
   */
  function validateCell(columnKey: string, value: string): { valid: boolean; errors: string[] } {
    const column = columns.value.find(c => c.key === columnKey)
    if (!column) return { valid: true, errors: [] }
    
    const errors: string[] = []
    
    for (const validation of column.validations) {
      if (!validation.is_active) continue
      
      switch (validation.rule_type) {
        case 'required':
          if (!value || value.trim() === '') {
            errors.push(validation.error_message || 'هذا الحقل مطلوب')
          }
          break
          
        case 'min_length':
          if (value && value.length < parseInt(validation.rule_value)) {
            errors.push(validation.error_message || `الحد الأدنى ${validation.rule_value} حرف`)
          }
          break
          
        case 'max_length':
          if (value && value.length > parseInt(validation.rule_value)) {
            errors.push(validation.error_message || `الحد الأقصى ${validation.rule_value} حرف`)
          }
          break
          
        case 'min_value':
          if (value && parseFloat(value) < parseFloat(validation.rule_value)) {
            errors.push(validation.error_message || `الحد الأدنى ${validation.rule_value}`)
          }
          break
          
        case 'max_value':
          if (value && parseFloat(value) > parseFloat(validation.rule_value)) {
            errors.push(validation.error_message || `الحد الأقصى ${validation.rule_value}`)
          }
          break
          
        case 'regex':
          if (value) {
            try {
              const regex = new RegExp(validation.rule_value)
              if (!regex.test(value)) {
                errors.push(validation.error_message || 'التنسيق غير صحيح')
              }
            } catch {
              // Invalid regex, skip
            }
          }
          break
      }
    }
    
    return { valid: errors.length === 0, errors }
  }
  
  // ============ CLEANUP ============
  
  /**
   * Clear current state
   */
  function clearState(): void {
    currentSheet.value = null
    currentTemplate.value = null
    rows.value = []
    isDirty.value = false
    lastError.value = null
    saveProgress.value = { saved: 0, total: 0, failedRows: [] }
  }
  
  /**
   * Reset all state (including templates/sheets lists)
   */
  function resetAll(): void {
    clearState()
    templates.value = []
    sheets.value = []
    columns.value = []
  }
  
  // ============ RETURN ============
  
  return {
    // State (readonly)
    currentSheet: readonly(currentSheet),
    currentTemplate: readonly(currentTemplate),
    rows: readonly(rows),
    columns: readonly(columns),
    templates: readonly(templates),
    sheets: readonly(sheets),
    isLoading: readonly(isLoading),
    isSaving: readonly(isSaving),
    saveProgress: readonly(saveProgress),
    hasUnsavedChanges,
    lastError: readonly(lastError),
    
    // Computed
    sheetColumns,
    visibleColumns,
    
    // Load methods
    loadColumns,
    loadTemplates,
    loadSheets,
    loadSheet,
    
    // Template methods
    createTemplate,
    updateTemplate,
    publishTemplate,
    archiveTemplate,
    
    // Sheet methods
    createSheet,
    updateSheet,
    deleteSheet,
    
    // Row methods
    updateCell,
    updateCellStyle,
    updateRowHeight,
    addRow,
    addRows,
    insertRowAt,
    deleteRows,
    deleteRow,
    duplicateRow,
    saveRows,
    getRow,
    getCellValue,
    
    // Validation
    validateCell,
    
    // Cleanup
    clearState,
    resetAll,
    
    // Direct access for advanced mutations
    _rows: rows,
    _isDirty: isDirty,
    _currentSheet: currentSheet,
    _currentTemplate: currentTemplate
  }
}
