<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

// Types
interface Column {
  id: string
  key: string
  label: string
  width: number
  minWidth: number
}

interface CellStyle {
  bold?: boolean
  italic?: boolean
  backgroundColor?: string
  textColor?: string
}

interface Row {
  id: number
  height: number
  cells: Record<string, string>
  styles: Record<string, CellStyle>
}

interface CellPosition {
  rowId: number
  colKey: string
}

// Extended color palette like Office apps
const colorPalette = [
  // Row 1 - Theme colors
  '#ffffff', '#000000', '#1e3a5f', '#2d4a6f', '#b78a41', '#c9a961', '#4a5568', '#718096',
  // Row 2 - Standard colors
  '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0',
  // Row 3 - Light tints
  '#f8d7da', '#fce8e8', '#fff3cd', '#fffde7', '#d4edda', '#c3e6cb', '#d1ecf1', '#cce5ff',
  // Row 4 - Medium tints  
  '#f5c6cb', '#f8d4d4', '#ffeeba', '#fff9c4', '#c3e6cb', '#a3d9a5', '#bee5eb', '#b8daff',
  // Row 5 - Pastels
  '#fecaca', '#fed7d7', '#fef08a', '#fef9a7', '#bbf7d0', '#86efac', '#a5f3fc', '#93c5fd',
  // Row 6 - Vivid
  '#ef4444', '#f87171', '#eab308', '#facc15', '#22c55e', '#4ade80', '#06b6d4', '#3b82f6'
]

// Theme colors for quick access
const themeColors = [
  { name: 'أبيض', color: '#ffffff' },
  { name: 'أسود', color: '#000000' },
  { name: 'أزرق داكن', color: '#1e3a5f' },
  { name: 'ذهبي', color: '#b78a41' },
  { name: 'أحمر', color: '#dc2626' },
  { name: 'أخضر', color: '#16a34a' },
  { name: 'أزرق', color: '#2563eb' },
  { name: 'بنفسجي', color: '#7c3aed' },
]

// Column definitions matching the Excel image
const columns = ref<Column[]>([
  { id: 'col-1', key: 'activityType', label: 'نوع النشاط\nType of activity', width: 120, minWidth: 80 },
  { id: 'col-2', key: 'hasMeetingMinutes', label: 'يوجد محضر اجتماع', width: 140, minWidth: 100 },
  { id: 'col-3', key: 'department', label: 'القسم المعني', width: 140, minWidth: 100 },
  { id: 'col-4', key: 'activityName', label: 'اسم النشاط', width: 180, minWidth: 120 },
  { id: 'col-5', key: 'representationType', label: 'نوع التمثيل', width: 120, minWidth: 80 },
  { id: 'col-6', key: 'activityScope', label: 'نطاق النشاط', width: 120, minWidth: 80 },
  { id: 'col-7', key: 'activitySource', label: 'مصدر النشاط', width: 140, minWidth: 100 },
  { id: 'col-8', key: 'participatingEntities', label: 'الجهات المشاركة', width: 160, minWidth: 120 },
  { id: 'col-9', key: 'outputs', label: 'المخرجات', width: 200, minWidth: 150 },
])

// Filter options for each column (predefined based on requirements)
const columnFilterOptions: Record<string, string[]> = {
  'activityType': ['اجتماع'],
  'hasMeetingMinutes': ['نعم'],
  'department': ['قسم البحث والتطوير', 'قسم الجاهزية', 'قسم المعلومات'],
  'activityName': ['اجتماع تمرين براكة الامارات'],
  'representationType': ['مشارك', 'منظم'],
  'activityScope': ['خارجي', 'داخلي'],
  'activitySource': ['ضمن الخطة المؤسسية'],
  'participatingEntities': ['ncma - fnar'],
  'outputs': ['تم اعتماد التقرير النهائي'],
}

// Filter state - stores UNCHECKED (excluded) values for each column
interface ColumnFilter {
  excludedValues: Set<string>  // Values that are UNCHECKED (hidden)
  showBlanks: boolean
  searchQuery: string
}

const columnFilters = ref<Record<string, ColumnFilter>>({})

// Initialize filters for all columns
const initializeFilters = () => {
  columns.value.forEach(col => {
    columnFilters.value[col.key] = {
      excludedValues: new Set<string>(),  // Empty = all values shown
      showBlanks: true,
      searchQuery: ''
    }
  })
}

// Active filter dropdown state
const activeFilterColumn = ref<string | null>(null)
const filterDropdownPosition = ref({ top: 0, left: 0 })

// Get unique values from data for a column (dynamic values + predefined)
const getColumnFilterValues = (colKey: string): string[] => {
  const predefined = columnFilterOptions[colKey] || []
  const dataValues = rows.value
    .map(row => row.cells[colKey]?.trim())
    .filter(v => v && v !== '')
  
  // Combine predefined and data values, remove duplicates
  const allValues = [...new Set([...predefined, ...dataValues])]
  return allValues.sort((a, b) => a.localeCompare(b, 'ar'))
}

// Check if column has active filter
const hasActiveFilter = (colKey: string): boolean => {
  const filter = columnFilters.value[colKey]
  if (!filter) return false
  return filter.excludedValues.size > 0 || !filter.showBlanks
}

// Filtered rows based on all active filters
const filteredRows = computed(() => {
  return rows.value.filter(row => {
    // Check each column filter
    for (const col of columns.value) {
      const filter = columnFilters.value[col.key]
      if (!filter) continue
      
      // Skip if no filter is active on this column
      if (filter.excludedValues.size === 0 && filter.showBlanks) continue
      
      const cellValue = row.cells[col.key]?.trim() || ''
      const isBlank = cellValue === ''
      
      if (isBlank) {
        // If cell is blank, check if blanks are allowed
        if (!filter.showBlanks) return false
      } else {
        // If cell has value, check if value is NOT in excluded set
        if (filter.excludedValues.has(cellValue)) return false
      }
    }
    return true
  })
})

// Open filter dropdown
// Filter dropdown dimensions
const FILTER_DROPDOWN_WIDTH = 280
const FILTER_DROPDOWN_HEIGHT = 420

const openFilterDropdown = (colKey: string, event: MouseEvent) => {
  event.stopPropagation()
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Calculate initial position (below and aligned with button)
  let top = rect.bottom + 4
  let left = rect.left
  
  // Check if dropdown exceeds bottom of screen
  if (top + FILTER_DROPDOWN_HEIGHT > viewportHeight - 10) {
    // Open above the button instead
    top = rect.top - FILTER_DROPDOWN_HEIGHT - 4
    
    // If still doesn't fit above, position at top of viewport
    if (top < 10) {
      top = 10
    }
  }
  
  // Check if dropdown exceeds right edge (RTL consideration)
  if (left + FILTER_DROPDOWN_WIDTH > viewportWidth - 10) {
    // Align to right edge of button instead
    left = rect.right - FILTER_DROPDOWN_WIDTH
  }
  
  // Check if dropdown exceeds left edge
  if (left < 10) {
    left = 10
  }
  
  filterDropdownPosition.value = { top, left }
  
  // Reset search query when opening
  if (columnFilters.value[colKey]) {
    columnFilters.value[colKey].searchQuery = ''
  }
  
  activeFilterColumn.value = colKey
}

// Close filter dropdown
const closeFilterDropdown = () => {
  activeFilterColumn.value = null
}

// Toggle filter value selection (toggle exclusion)
const toggleFilterValue = (colKey: string, value: string) => {
  const filter = columnFilters.value[colKey]
  if (!filter) return
  
  // If value is excluded, include it (remove from excluded)
  // If value is included, exclude it (add to excluded)
  if (filter.excludedValues.has(value)) {
    filter.excludedValues.delete(value)
  } else {
    filter.excludedValues.add(value)
  }
}

// Toggle blanks filter
const toggleBlanksFilter = (colKey: string) => {
  const filter = columnFilters.value[colKey]
  if (filter) {
    filter.showBlanks = !filter.showBlanks
  }
}

// Select all filter values (clear all exclusions)
const selectAllFilterValues = (colKey: string) => {
  const filter = columnFilters.value[colKey]
  if (!filter) return
  
  filter.excludedValues.clear()  // Clear exclusions = show all
  filter.showBlanks = true
}

// Check if "Select All" should be checked
const isSelectAllChecked = (colKey: string): boolean => {
  const filter = columnFilters.value[colKey]
  if (!filter) return true
  return filter.excludedValues.size === 0 && filter.showBlanks
}

// Clear filter for a column
const clearColumnFilter = (colKey: string) => {
  const filter = columnFilters.value[colKey]
  if (filter) {
    filter.excludedValues.clear()
    filter.showBlanks = true
    filter.searchQuery = ''
  }
  closeFilterDropdown()
}

// Filter values based on search query
const getFilteredFilterValues = (colKey: string): string[] => {
  const values = getColumnFilterValues(colKey)
  const filter = columnFilters.value[colKey]
  if (!filter || !filter.searchQuery) return values
  
  const query = filter.searchQuery.toLowerCase()
  return values.filter(v => v.toLowerCase().includes(query))
}

// Apply filter (close dropdown)
const applyFilter = () => {
  closeFilterDropdown()
}

// Sort column A to Z
const sortColumnAtoZ = (colKey: string) => {
  rows.value.sort((a, b) => {
    const valA = a.cells[colKey] || ''
    const valB = b.cells[colKey] || ''
    return valA.localeCompare(valB, 'ar')
  })
  closeFilterDropdown()
}

// Sort column Z to A
const sortColumnZtoA = (colKey: string) => {
  rows.value.sort((a, b) => {
    const valA = a.cells[colKey] || ''
    const valB = b.cells[colKey] || ''
    return valB.localeCompare(valA, 'ar')
  })
  closeFilterDropdown()
}

// Initialize filters on setup
initializeFilters()

// Generate initial rows (15 rows)
const generateInitialRows = (): Row[] => {
  const rows: Row[] = []
  for (let i = 1; i <= 20; i++) {
    const cells: Record<string, string> = {}
    const styles: Record<string, CellStyle> = {}
    columns.value.forEach(col => {
      cells[col.key] = ''
      styles[col.key] = {}
    })
    rows.push({ id: i, height: 32, cells, styles })
  }
  // Pre-fill first row with sample data from the image
  rows[0].cells = {
    activityType: 'اجتماع',
    hasMeetingMinutes: 'نعم',
    department: 'قسم الجاهزية',
    activityName: 'اجتماع فريق دراسة الإمارات',
    representationType: 'منفذ',
    activityScope: 'خارجي',
    activitySource: 'ضمن الخطة المؤسسية',
    participatingEntities: 'noma - fnar',
    outputs: 'تم اعداد التقرير النهائي',
  }
  return rows
}

const rows = ref<Row[]>(generateInitialRows())

// State
const activeCell = ref<CellPosition | null>(null)
const editingCell = ref<CellPosition | null>(null)
const selectedRange = ref<{ start: CellPosition; end: CellPosition } | null>(null)
const isResizingCol = ref(false)
const isResizingRow = ref(false)
const resizingColIndex = ref(-1)
const resizingRowIndex = ref(-1)
const startX = ref(0)
const startY = ref(0)
const startWidth = ref(0)
const startHeight = ref(0)
const copiedCells = ref<{ cells: Record<string, string>[]; colKeys: string[] } | null>(null)

// Context menu state
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuRow = ref<number | null>(null)
const contextMenuCell = ref<CellPosition | null>(null)
const contextMenuType = ref<'row' | 'cell'>('cell')
const contextMenuRef = ref<HTMLElement | null>(null)

// Selected rows for row operations
const selectedRows = ref<Set<number>>(new Set())
const showColorPicker = ref(false)
const colorPickerTarget = ref<'bg' | 'text'>('bg')

// Submenu state for flyout color pickers
const activeSubmenu = ref<'bg' | 'text' | null>(null)
const submenuPosition = ref<{ top: number; left: number; openLeft: boolean }>({ top: 0, left: 0, openLeft: false })
const lockedColorTarget = ref<'bg' | 'text' | null>(null) // Locked when flyout opens, used for color application

// Cut mode tracking
const cutMode = ref(false)
const cutSource = ref<{ type: 'cell' | 'row'; rowIds?: number[]; cell?: CellPosition } | null>(null)

// Computed
const totalWidth = computed(() => {
  return columns.value.reduce((sum, col) => sum + col.width, 0) + 50 // +50 for row numbers
})

// Methods
const getCellId = (rowId: number, colKey: string) => `cell-${rowId}-${colKey}`

const isCellActive = (rowId: number, colKey: string) => {
  return activeCell.value?.rowId === rowId && activeCell.value?.colKey === colKey
}

const isCellEditing = (rowId: number, colKey: string) => {
  return editingCell.value?.rowId === rowId && editingCell.value?.colKey === colKey
}

const isCellSelected = (rowId: number, colKey: string) => {
  // Check if entire row is selected
  if (selectedRows.value.has(rowId)) return true
  
  if (!selectedRange.value) return isCellActive(rowId, colKey)
  
  const { start, end } = selectedRange.value
  const minRow = Math.min(start.rowId, end.rowId)
  const maxRow = Math.max(start.rowId, end.rowId)
  const startColIndex = columns.value.findIndex(c => c.key === start.colKey)
  const endColIndex = columns.value.findIndex(c => c.key === end.colKey)
  const minCol = Math.min(startColIndex, endColIndex)
  const maxCol = Math.max(startColIndex, endColIndex)
  const colIndex = columns.value.findIndex(c => c.key === colKey)
  
  return rowId >= minRow && rowId <= maxRow && colIndex >= minCol && colIndex <= maxCol
}

const isRowSelected = (rowId: number) => {
  return selectedRows.value.has(rowId)
}

const isCellCut = (rowId: number, colKey: string) => {
  if (!cutMode.value || !cutSource.value) return false
  if (cutSource.value.type === 'row') {
    return cutSource.value.rowIds?.includes(rowId) || false
  }
  if (cutSource.value.type === 'cell' && cutSource.value.cell) {
    return cutSource.value.cell.rowId === rowId && cutSource.value.cell.colKey === colKey
  }
  return false
}

const getCellStyle = (rowId: number, colKey: string) => {
  const row = rows.value.find(r => r.id === rowId)
  if (!row || !row.styles || !row.styles[colKey]) return {}
  const style = row.styles[colKey]
  const cssStyle: Record<string, string> = {}
  if (style.backgroundColor) {
    cssStyle.backgroundColor = style.backgroundColor
  }
  if (style.textColor) {
    cssStyle.color = style.textColor
  }
  if (style.bold) cssStyle.fontWeight = 'bold'
  if (style.italic) cssStyle.fontStyle = 'italic'
  return cssStyle
}

// Check if cell has a custom background color
const hasCustomBackground = (rowId: number, colKey: string): boolean => {
  const row = rows.value.find(r => r.id === rowId)
  return !!(row?.styles?.[colKey]?.backgroundColor)
}

// Check if any cell in a row has a custom background color
const rowHasCustomBackground = (rowId: number): boolean => {
  const row = rows.value.find(r => r.id === rowId)
  if (!row?.styles) return false
  return columns.value.some(col => !!row.styles?.[col.key]?.backgroundColor)
}

const selectCell = (rowId: number, colKey: string, event?: MouseEvent | KeyboardEvent) => {
  // Clear row selection when selecting individual cell
  if (!event?.ctrlKey && !event?.metaKey) {
    selectedRows.value.clear()
  }
  
  if (event?.shiftKey && activeCell.value) {
    selectedRange.value = {
      start: activeCell.value,
      end: { rowId, colKey }
    }
  } else {
    activeCell.value = { rowId, colKey }
    selectedRange.value = null
  }
  editingCell.value = null
}

const selectRow = (rowId: number, event?: MouseEvent) => {
  if (event?.ctrlKey || event?.metaKey) {
    // Toggle row selection with Ctrl/Cmd
    if (selectedRows.value.has(rowId)) {
      selectedRows.value.delete(rowId)
    } else {
      selectedRows.value.add(rowId)
    }
  } else if (event?.shiftKey && selectedRows.value.size > 0) {
    // Range selection with Shift
    const lastSelected = Array.from(selectedRows.value).pop() || rowId
    const minRow = Math.min(lastSelected, rowId)
    const maxRow = Math.max(lastSelected, rowId)
    for (let i = minRow; i <= maxRow; i++) {
      selectedRows.value.add(i)
    }
  } else {
    // Single row selection
    selectedRows.value.clear()
    selectedRows.value.add(rowId)
  }
  // Set active cell to first column of this row
  activeCell.value = { rowId, colKey: columns.value[0].key }
  selectedRange.value = null
  editingCell.value = null
}

const startEditing = (rowId: number, colKey: string) => {
  activeCell.value = { rowId, colKey }
  editingCell.value = { rowId, colKey }
  selectedRange.value = null
  nextTick(() => {
    const cellId = getCellId(rowId, colKey)
    const cellElement = document.querySelector(`[data-cell-id="${cellId}"] input`)
    if (cellElement instanceof HTMLInputElement) {
      cellElement.focus()
      cellElement.select()
    }
  })
}

const finishEditing = () => {
  editingCell.value = null
}

const updateCellValue = (rowId: number, colKey: string, value: string) => {
  const row = rows.value.find(r => r.id === rowId)
  if (row) {
    row.cells[colKey] = value
    // Auto-adjust row height based on content
    const lines = value.split('\n').length
    const minHeight = 32
    const lineHeight = 24
    row.height = Math.max(minHeight, lines * lineHeight)
  }
}

// Column resize
const startColResize = (event: MouseEvent, index: number) => {
  event.preventDefault()
  isResizingCol.value = true
  resizingColIndex.value = index
  startX.value = event.clientX
  startWidth.value = columns.value[index].width
  document.addEventListener('mousemove', onColResize)
  document.addEventListener('mouseup', stopColResize)
}

const onColResize = (event: MouseEvent) => {
  if (!isResizingCol.value) return
  const diff = startX.value - event.clientX // RTL: reversed
  const newWidth = Math.max(columns.value[resizingColIndex.value].minWidth, startWidth.value + diff)
  columns.value[resizingColIndex.value].width = newWidth
}

const stopColResize = () => {
  isResizingCol.value = false
  resizingColIndex.value = -1
  document.removeEventListener('mousemove', onColResize)
  document.removeEventListener('mouseup', stopColResize)
}

// Row resize
const startRowResize = (event: MouseEvent, index: number) => {
  event.preventDefault()
  isResizingRow.value = true
  resizingRowIndex.value = index
  startY.value = event.clientY
  startHeight.value = rows.value[index].height
  document.addEventListener('mousemove', onRowResize)
  document.addEventListener('mouseup', stopRowResize)
}

const onRowResize = (event: MouseEvent) => {
  if (!isResizingRow.value) return
  const diff = event.clientY - startY.value
  const newHeight = Math.max(24, startHeight.value + diff)
  rows.value[resizingRowIndex.value].height = newHeight
}

const stopRowResize = () => {
  isResizingRow.value = false
  resizingRowIndex.value = -1
  document.removeEventListener('mousemove', onRowResize)
  document.removeEventListener('mouseup', stopRowResize)
}

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (!activeCell.value) return
  
  const { rowId, colKey } = activeCell.value
  const colIndex = columns.value.findIndex(c => c.key === colKey)
  const rowIndex = rows.value.findIndex(r => r.id === rowId)
  
  // If editing, only handle Enter and Escape
  if (editingCell.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      finishEditing()
      // Move to next row
      if (rowIndex < rows.value.length - 1) {
        selectCell(rows.value[rowIndex + 1].id, colKey)
      }
    } else if (event.key === 'Escape') {
      finishEditing()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      finishEditing()
      if (event.shiftKey) {
        // Move left (RTL: actually right visually)
        if (colIndex < columns.value.length - 1) {
          selectCell(rowId, columns.value[colIndex + 1].key)
        }
      } else {
        // Move right (RTL: actually left visually)
        if (colIndex > 0) {
          selectCell(rowId, columns.value[colIndex - 1].key)
        }
      }
    }
    return
  }
  
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      if (rowIndex > 0) {
        selectCell(rows.value[rowIndex - 1].id, colKey, event)
      }
      break
    case 'ArrowDown':
      event.preventDefault()
      if (rowIndex < rows.value.length - 1) {
        selectCell(rows.value[rowIndex + 1].id, colKey, event)
      }
      break
    case 'ArrowLeft':
      event.preventDefault()
      // RTL: ArrowLeft moves to next column
      if (colIndex < columns.value.length - 1) {
        selectCell(rowId, columns.value[colIndex + 1].key, event)
      }
      break
    case 'ArrowRight':
      event.preventDefault()
      // RTL: ArrowRight moves to previous column
      if (colIndex > 0) {
        selectCell(rowId, columns.value[colIndex - 1].key, event)
      }
      break
    case 'Enter':
      event.preventDefault()
      startEditing(rowId, colKey)
      break
    case 'Tab':
      event.preventDefault()
      if (event.shiftKey) {
        if (colIndex < columns.value.length - 1) {
          selectCell(rowId, columns.value[colIndex + 1].key)
        }
      } else {
        if (colIndex > 0) {
          selectCell(rowId, columns.value[colIndex - 1].key)
        }
      }
      break
    case 'Delete':
    case 'Backspace':
      event.preventDefault()
      if (selectedRange.value) {
        clearSelectedCells()
      } else {
        updateCellValue(rowId, colKey, '')
      }
      break
    case 'c':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        copyCells()
      }
      break
    case 'v':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        pasteCells()
      }
      break
    case 'x':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        cutCells()
      }
      break
    default:
      // Start editing on any printable character
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        startEditing(rowId, colKey)
      }
  }
}

const clearSelectedCells = () => {
  if (!selectedRange.value) return
  
  const { start, end } = selectedRange.value
  const minRow = Math.min(start.rowId, end.rowId)
  const maxRow = Math.max(start.rowId, end.rowId)
  const startColIndex = columns.value.findIndex(c => c.key === start.colKey)
  const endColIndex = columns.value.findIndex(c => c.key === end.colKey)
  const minCol = Math.min(startColIndex, endColIndex)
  const maxCol = Math.max(startColIndex, endColIndex)
  
  rows.value.forEach(row => {
    if (row.id >= minRow && row.id <= maxRow) {
      for (let i = minCol; i <= maxCol; i++) {
        row.cells[columns.value[i].key] = ''
      }
    }
  })
}

const copyCells = () => {
  if (!activeCell.value) return
  
  const cellsToCopy: Record<string, string>[] = []
  const colKeys: string[] = []
  
  if (selectedRange.value) {
    const { start, end } = selectedRange.value
    const minRow = Math.min(start.rowId, end.rowId)
    const maxRow = Math.max(start.rowId, end.rowId)
    const startColIndex = columns.value.findIndex(c => c.key === start.colKey)
    const endColIndex = columns.value.findIndex(c => c.key === end.colKey)
    const minCol = Math.min(startColIndex, endColIndex)
    const maxCol = Math.max(startColIndex, endColIndex)
    
    for (let i = minCol; i <= maxCol; i++) {
      colKeys.push(columns.value[i].key)
    }
    
    rows.value.forEach(row => {
      if (row.id >= minRow && row.id <= maxRow) {
        const cellData: Record<string, string> = {}
        colKeys.forEach(key => {
          cellData[key] = row.cells[key]
        })
        cellsToCopy.push(cellData)
      }
    })
  } else {
    const { rowId, colKey } = activeCell.value
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      colKeys.push(colKey)
      cellsToCopy.push({ [colKey]: row.cells[colKey] })
    }
  }
  
  copiedCells.value = { cells: cellsToCopy, colKeys }
}

const cutCells = () => {
  copyCells()
  clearSelectedCells()
  if (!selectedRange.value && activeCell.value) {
    updateCellValue(activeCell.value.rowId, activeCell.value.colKey, '')
  }
}

const pasteCells = () => {
  if (!copiedCells.value || !activeCell.value) return
  
  const { cells, colKeys } = copiedCells.value
  const { rowId, colKey } = activeCell.value
  const startRowIndex = rows.value.findIndex(r => r.id === rowId)
  const startColIndex = columns.value.findIndex(c => c.key === colKey)
  
  cells.forEach((cellData, rowOffset) => {
    const targetRowIndex = startRowIndex + rowOffset
    if (targetRowIndex >= rows.value.length) return
    
    colKeys.forEach((key, colOffset) => {
      const targetColIndex = startColIndex + colOffset
      if (targetColIndex >= columns.value.length) return
      
      const targetColKey = columns.value[targetColIndex].key
      rows.value[targetRowIndex].cells[targetColKey] = cellData[key] || ''
    })
  })
}

// Add one row at a time
const addMoreRows = () => {
  const currentLength = rows.value.length
  const cells: Record<string, string> = {}
  const styles: Record<string, CellStyle> = {}
  columns.value.forEach(col => {
    cells[col.key] = ''
    styles[col.key] = {}
  })
  rows.value.push({ id: currentLength + 1, height: 32, cells, styles })
}

// Context menu operations
const MENU_WIDTH = 220 // Approximate menu width
const MENU_HEIGHT = 400 // Approximate max menu height

const calculateMenuPosition = (clientX: number, clientY: number) => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  let x = clientX
  let y = clientY
  
  // Check right edge (in RTL, this is the visual left)
  if (clientX + MENU_WIDTH > viewportWidth) {
    x = clientX - MENU_WIDTH
  }
  
  // Check left edge (in RTL, this is the visual right)
  if (x < 0) {
    x = 10 // Small margin from edge
  }
  
  // Check bottom edge
  if (clientY + MENU_HEIGHT > viewportHeight) {
    y = viewportHeight - MENU_HEIGHT - 10
  }
  
  // Check top edge
  if (y < 0) {
    y = 10
  }
  
  return { x, y }
}

// Watch for context menu visibility to adjust position after render
watch(showContextMenu, (isVisible) => {
  if (isVisible) {
    nextTick(() => {
      if (contextMenuRef.value) {
        const menuRect = contextMenuRef.value.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        let newX = contextMenuX.value
        let newY = contextMenuY.value
        
        // Adjust if menu exceeds right edge
        if (menuRect.right > viewportWidth) {
          newX = viewportWidth - menuRect.width - 10
        }
        
        // Adjust if menu exceeds left edge
        if (newX < 0) {
          newX = 10
        }
        
        // Adjust if menu exceeds bottom edge
        if (menuRect.bottom > viewportHeight) {
          newY = viewportHeight - menuRect.height - 10
        }
        
        // Adjust if menu exceeds top edge
        if (newY < 0) {
          newY = 10
        }
        
        contextMenuX.value = newX
        contextMenuY.value = newY
      }
    })
  }
})

const showRowContextMenu = (event: MouseEvent, rowId: number) => {
  event.preventDefault()
  event.stopPropagation()
  
  // Select the row if not already selected
  if (!selectedRows.value.has(rowId)) {
    if (!event.ctrlKey && !event.metaKey) {
      selectedRows.value.clear()
    }
    selectedRows.value.add(rowId)
  }
  
  const { x, y } = calculateMenuPosition(event.clientX, event.clientY)
  
  contextMenuRow.value = rowId
  contextMenuCell.value = null
  contextMenuType.value = 'row'
  contextMenuX.value = x
  contextMenuY.value = y
  showContextMenu.value = true
  showColorPicker.value = false
}

const showCellContextMenu = (event: MouseEvent, rowId: number, colKey: string) => {
  event.preventDefault()
  event.stopPropagation()
  
  // Select the cell
  activeCell.value = { rowId, colKey }
  selectedRows.value.clear()
  
  const { x, y } = calculateMenuPosition(event.clientX, event.clientY)
  
  contextMenuCell.value = { rowId, colKey }
  contextMenuRow.value = rowId
  contextMenuType.value = 'cell'
  contextMenuX.value = x
  contextMenuY.value = y
  showContextMenu.value = true
  showColorPicker.value = false
}

const closeContextMenu = () => {
  showContextMenu.value = false
  contextMenuRow.value = null
  contextMenuCell.value = null
  showColorPicker.value = false
  activeSubmenu.value = null
  submenuHovered.value = false
  menuItemHovered.value = false
  lockedColorTarget.value = null
}

const copyRow = () => {
  const rowsToCopy = selectedRows.value.size > 0 
    ? Array.from(selectedRows.value) 
    : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
  
  if (rowsToCopy.length === 0) return
  
  const cellsToCopy: Record<string, string>[] = []
  const colKeys = columns.value.map(col => col.key)
  
  rowsToCopy.sort((a, b) => a - b).forEach(rowId => {
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      cellsToCopy.push({ ...row.cells })
    }
  })
  
  copiedCells.value = { cells: cellsToCopy, colKeys }
  cutMode.value = false
  cutSource.value = null
  closeContextMenu()
}

const cutRow = () => {
  const rowsToCut = selectedRows.value.size > 0 
    ? Array.from(selectedRows.value) 
    : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
  
  if (rowsToCut.length === 0) return
  
  const cellsToCopy: Record<string, string>[] = []
  const colKeys = columns.value.map(col => col.key)
  
  rowsToCut.sort((a, b) => a - b).forEach(rowId => {
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      cellsToCopy.push({ ...row.cells })
    }
  })
  
  copiedCells.value = { cells: cellsToCopy, colKeys }
  cutMode.value = true
  cutSource.value = { type: 'row', rowIds: [...rowsToCut] }
  closeContextMenu()
}

const copyCell = () => {
  if (!contextMenuCell.value) return
  const { rowId, colKey } = contextMenuCell.value
  const row = rows.value.find(r => r.id === rowId)
  if (row) {
    copiedCells.value = { 
      cells: [{ [colKey]: row.cells[colKey] }], 
      colKeys: [colKey] 
    }
  }
  cutMode.value = false
  cutSource.value = null
  closeContextMenu()
}

const cutCell = () => {
  if (!contextMenuCell.value) return
  const { rowId, colKey } = contextMenuCell.value
  const row = rows.value.find(r => r.id === rowId)
  if (row) {
    copiedCells.value = { 
      cells: [{ [colKey]: row.cells[colKey] }], 
      colKeys: [colKey] 
    }
    cutMode.value = true
    cutSource.value = { type: 'cell', cell: { rowId, colKey } }
  }
  closeContextMenu()
}

const pasteToCell = () => {
  pasteCells()
  // Clear cut source after paste if in cut mode
  if (cutMode.value && cutSource.value) {
    if (cutSource.value.type === 'row' && cutSource.value.rowIds) {
      cutSource.value.rowIds.forEach(rowId => {
        const row = rows.value.find(r => r.id === rowId)
        if (row) {
          columns.value.forEach(col => {
            row.cells[col.key] = ''
          })
        }
      })
    } else if (cutSource.value.type === 'cell' && cutSource.value.cell) {
      const { rowId, colKey } = cutSource.value.cell
      const row = rows.value.find(r => r.id === rowId)
      if (row) {
        row.cells[colKey] = ''
      }
    }
    cutMode.value = false
    cutSource.value = null
  }
  closeContextMenu()
}

const duplicateRow = () => {
  const rowsToDuplicate = selectedRows.value.size > 0 
    ? Array.from(selectedRows.value).sort((a, b) => a - b)
    : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
  
  if (rowsToDuplicate.length === 0) return
  
  // Find the last row index to insert after
  const lastRowId = rowsToDuplicate[rowsToDuplicate.length - 1]
  const lastRowIndex = rows.value.findIndex(r => r.id === lastRowId)
  if (lastRowIndex === -1) return
  
  // Create duplicate rows
  const newRows: Row[] = []
  rowsToDuplicate.forEach(rowId => {
    const sourceRow = rows.value.find(r => r.id === rowId)
    if (sourceRow) {
      newRows.push({
        id: 0,
        height: sourceRow.height,
        cells: { ...sourceRow.cells },
        styles: JSON.parse(JSON.stringify(sourceRow.styles))
      })
    }
  })
  
  // Insert after the last selected row
  rows.value.splice(lastRowIndex + 1, 0, ...newRows)
  
  // Re-index rows
  rows.value.forEach((row, idx) => {
    row.id = idx + 1
  })
  
  closeContextMenu()
}

const insertRowAbove = () => {
  const targetRowId = contextMenuRow.value ?? (selectedRows.value.size > 0 ? Math.min(...selectedRows.value) : null)
  if (targetRowId === null) return
  
  const rowIndex = rows.value.findIndex(r => r.id === targetRowId)
  if (rowIndex === -1) return
  
  const cells: Record<string, string> = {}
  const styles: Record<string, CellStyle> = {}
  columns.value.forEach(col => {
    cells[col.key] = ''
    styles[col.key] = {}
  })
  const newRow: Row = { id: 0, height: 32, cells, styles }
  rows.value.splice(rowIndex, 0, newRow)
  // Re-index rows
  rows.value.forEach((row, idx) => {
    row.id = idx + 1
  })
  closeContextMenu()
}

const insertRowBelow = () => {
  const targetRowId = contextMenuRow.value ?? (selectedRows.value.size > 0 ? Math.max(...selectedRows.value) : null)
  if (targetRowId === null) return
  
  const rowIndex = rows.value.findIndex(r => r.id === targetRowId)
  if (rowIndex === -1) return
  
  const cells: Record<string, string> = {}
  const styles: Record<string, CellStyle> = {}
  columns.value.forEach(col => {
    cells[col.key] = ''
    styles[col.key] = {}
  })
  const newRow: Row = { id: 0, height: 32, cells, styles }
  rows.value.splice(rowIndex + 1, 0, newRow)
  // Re-index rows
  rows.value.forEach((row, idx) => {
    row.id = idx + 1
  })
  closeContextMenu()
}

const deleteRow = () => {
  const rowsToDelete = selectedRows.value.size > 0 
    ? Array.from(selectedRows.value) 
    : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
  
  if (rowsToDelete.length === 0) return
  
  // Remove rows (from end to start to maintain indices)
  rowsToDelete.sort((a, b) => b - a).forEach(rowId => {
    const rowIndex = rows.value.findIndex(r => r.id === rowId)
    if (rowIndex !== -1) {
      rows.value.splice(rowIndex, 1)
    }
  })
  
  // Re-index rows
  rows.value.forEach((row, idx) => {
    row.id = idx + 1
  })
  
  selectedRows.value.clear()
  closeContextMenu()
}

const clearRow = () => {
  const rowsToClear = selectedRows.value.size > 0 
    ? Array.from(selectedRows.value) 
    : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
  
  rowsToClear.forEach(rowId => {
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      columns.value.forEach(col => {
        row.cells[col.key] = ''
      })
    }
  })
  closeContextMenu()
}

const clearCell = () => {
  if (!contextMenuCell.value) return
  const { rowId, colKey } = contextMenuCell.value
  const row = rows.value.find(r => r.id === rowId)
  if (row) {
    row.cells[colKey] = ''
  }
  closeContextMenu()
}

// Cell formatting functions
const toggleBold = () => {
  if (contextMenuType.value === 'cell' && contextMenuCell.value) {
    const { rowId, colKey } = contextMenuCell.value
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      if (!row.styles[colKey]) row.styles[colKey] = {}
      row.styles[colKey].bold = !row.styles[colKey].bold
    }
  } else if (contextMenuType.value === 'row') {
    const rowsToFormat = selectedRows.value.size > 0 
      ? Array.from(selectedRows.value) 
      : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
    
    rowsToFormat.forEach(rowId => {
      const row = rows.value.find(r => r.id === rowId)
      if (row) {
        columns.value.forEach(col => {
          if (!row.styles[col.key]) row.styles[col.key] = {}
          row.styles[col.key].bold = !row.styles[col.key].bold
        })
      }
    })
  }
  closeContextMenu()
}

const toggleItalic = () => {
  if (contextMenuType.value === 'cell' && contextMenuCell.value) {
    const { rowId, colKey } = contextMenuCell.value
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      if (!row.styles[colKey]) row.styles[colKey] = {}
      row.styles[colKey].italic = !row.styles[colKey].italic
    }
  } else if (contextMenuType.value === 'row') {
    const rowsToFormat = selectedRows.value.size > 0 
      ? Array.from(selectedRows.value) 
      : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
    
    rowsToFormat.forEach(rowId => {
      const row = rows.value.find(r => r.id === rowId)
      if (row) {
        columns.value.forEach(col => {
          if (!row.styles[col.key]) row.styles[col.key] = {}
          row.styles[col.key].italic = !row.styles[col.key].italic
        })
      }
    })
  }
  closeContextMenu()
}

// Hover timeout to prevent accidental switching
const hoverTimeout = ref<number | null>(null)

// Handle submenu hover for flyout color pickers
const handleSubmenuHover = (target: 'bg' | 'text', event: MouseEvent) => {
  // If flyout is already open with a locked target, don't change it unless we hover for a while
  if (submenuHovered.value && lockedColorTarget.value !== null) {
    return
  }
  
  // If already active on this target, do nothing
  if (activeSubmenu.value === target) return

  const menuItem = event.currentTarget as HTMLElement
  
  // Clear any existing timeout
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }
  
  // Set delay to switch submenu (prevents accidental switching when moving mouse diagonally)
  hoverTimeout.value = window.setTimeout(() => {
    const rect = menuItem.getBoundingClientRect()
    const contextMenuEl = contextMenuRef.value
    
    if (!contextMenuEl) return
    
    const contextRect = contextMenuEl.getBoundingClientRect()
    const submenuWidth = 280 // Width of color picker submenu
    const viewportWidth = window.innerWidth
    
    // Determine if submenu should open to the left or right
    // In RTL, default is to open to the left (visual right)
    let openLeft = true
    let left = contextRect.left - submenuWidth - 4
    
    // If not enough space on left, open to the right
    if (left < 10) {
      openLeft = false
      left = contextRect.right + 4
    }
    
    // If still not enough space on right, force left with scroll
    if (left + submenuWidth > viewportWidth - 10) {
      left = viewportWidth - submenuWidth - 10
    }
    
    // Calculate top position aligned with menu item
    let top = rect.top - 8
    
    // Check bottom edge
    const submenuHeight = 320 // Approximate height
    if (top + submenuHeight > window.innerHeight - 10) {
      top = window.innerHeight - submenuHeight - 10
    }
    
    // Check top edge
    if (top < 10) {
      top = 10
    }
    
    // Double check we haven't entered the flyout in the meantime
    if (submenuHovered.value) return

    submenuPosition.value = { top, left, openLeft }
    activeSubmenu.value = target
    colorPickerTarget.value = target
    lockedColorTarget.value = target // Lock the target
    menuItemHovered.value = true
  }, 200) // 200ms delay to prevent accidental switches
}

const handleMenuItemLeave = () => {
  // Clear the open timeout if we leave before it fires
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
    hoverTimeout.value = null
  }
  
  menuItemHovered.value = false
  closeSubmenu()
}

const closeSubmenu = () => {
  // Use a longer delay to allow moving to submenu
  setTimeout(() => {
    if (!submenuHovered.value && !menuItemHovered.value) {
      activeSubmenu.value = null
    }
  }, 150)
}

// Track if hovering over submenu or menu item
const submenuHovered = ref(false)
const menuItemHovered = ref(false)

// Keep submenu open when hovering over it
const handleSubmenuEnter = () => {
  // If we receive a pending switch to another submenu but we entered the flyout,
  // we should likely cancel that switch because the user intention was to interact 
  // with the CURRENT flyout, not the one they briefly crossed.
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
    hoverTimeout.value = null
  }
  
  submenuHovered.value = true
}

const handleSubmenuLeave = () => {
  submenuHovered.value = false
  setTimeout(() => {
    if (!menuItemHovered.value) {
      activeSubmenu.value = null
    }
  }, 100)
}

const applyColor = (color: string) => {
  // Use the locked target - this is the target that was set when the flyout opened
  const target = lockedColorTarget.value || colorPickerTarget.value
  
  if (contextMenuType.value === 'cell' && contextMenuCell.value) {
    const { rowId, colKey } = contextMenuCell.value
    const rowIndex = rows.value.findIndex(r => r.id === rowId)
    if (rowIndex !== -1) {
      const row = rows.value[rowIndex]
      if (!row.styles) row.styles = {}
      if (!row.styles[colKey]) row.styles[colKey] = {}
      
      if (target === 'bg') {
        if (color === '') {
          row.styles[colKey].backgroundColor = undefined
        } else {
          row.styles[colKey].backgroundColor = color
        }
      } else {
        if (color === '') {
          row.styles[colKey].textColor = undefined
        } else {
          row.styles[colKey].textColor = color
        }
      }
      // Force reactivity update
      rows.value[rowIndex] = { ...row }
    }
  } else if (contextMenuType.value === 'row') {
    const rowsToFormat = selectedRows.value.size > 0 
      ? Array.from(selectedRows.value) 
      : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
    
    rowsToFormat.forEach(rowId => {
      const rowIndex = rows.value.findIndex(r => r.id === rowId)
      if (rowIndex !== -1) {
        const row = rows.value[rowIndex]
        if (!row.styles) row.styles = {}
        
        columns.value.forEach(col => {
          if (!row.styles[col.key]) row.styles[col.key] = {}
          if (target === 'bg') {
            if (color === '') {
              row.styles[col.key].backgroundColor = undefined
            } else {
              row.styles[col.key].backgroundColor = color
            }
          } else {
            if (color === '') {
              row.styles[col.key].textColor = undefined
            } else {
              row.styles[col.key].textColor = color
            }
          }
        })
        // Force reactivity update
        rows.value[rowIndex] = { ...row }
      }
    })
  }
  // Reset all states
  lockedColorTarget.value = null
  activeSubmenu.value = null
  submenuHovered.value = false
  menuItemHovered.value = false
  setTimeout(() => {
    closeContextMenu()
  }, 50)
}

const clearFormatting = () => {
  if (contextMenuType.value === 'cell' && contextMenuCell.value) {
    const { rowId, colKey } = contextMenuCell.value
    const row = rows.value.find(r => r.id === rowId)
    if (row) {
      row.styles[colKey] = {}
    }
  } else if (contextMenuType.value === 'row') {
    const rowsToFormat = selectedRows.value.size > 0 
      ? Array.from(selectedRows.value) 
      : (contextMenuRow.value !== null ? [contextMenuRow.value] : [])
    
    rowsToFormat.forEach(rowId => {
      const row = rows.value.find(r => r.id === rowId)
      if (row) {
        columns.value.forEach(col => {
          row.styles[col.key] = {}
        })
      }
    })
  }
  closeContextMenu()
}

// Double-click to auto-fit column width
const autoFitColumn = (index: number) => {
  const colKey = columns.value[index].key
  let maxWidth = columns.value[index].minWidth
  
  // Check header width
  const headerWidth = columns.value[index].label.length * 12
  maxWidth = Math.max(maxWidth, headerWidth)
  
  // Check all cells in this column
  rows.value.forEach(row => {
    const cellContent = row.cells[colKey]
    if (cellContent) {
      const contentWidth = cellContent.length * 10 + 20
      maxWidth = Math.max(maxWidth, contentWidth)
    }
  })
  
  columns.value[index].width = Math.min(maxWidth, 400) // Max 400px
}

// Import/Export state
const showImportModal = ref(false)
const isExporting = ref(false)
const isImporting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const importError = ref<string | null>(null)

// Column key to Excel column header mapping (Arabic headers as they appear in the template)
const columnHeadersMap: Record<string, string> = {
  'activityType': 'نوع النشاط',
  'hasMeetingMinutes': 'يوجد محضر اجتماع',
  'department': 'القسم المعني',
  'activityName': 'اسم النشاط',
  'representationType': 'نوع التمثيل',
  'activityScope': 'نطاق النشاط',
  'activitySource': 'مصدر النشاط',
  'participatingEntities': 'الجهات المشاركة',
  'outputs': 'المخرجات',
}

// Download template
const downloadTemplate = () => {
  // Use the existing template file
  const link = document.createElement('a')
  link.href = '/activities 2026.xlsx'
  link.download = 'activities 2026.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Export to Excel
const exportToExcel = async () => {
  isExporting.value = true
  
  try {
    // Fetch the template file from public folder
    const templateResponse = await fetch('/activities 2026.xlsx')
    if (!templateResponse.ok) {
      throw new Error('Failed to load template file')
    }
    const templateArrayBuffer = await templateResponse.arrayBuffer()
    
    // Use ExcelJS to preserve images and formatting
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(templateArrayBuffer)
    
    // Get the first worksheet
    const worksheet = workbook.worksheets[0]
    
    // Column mapping: Our column keys to Excel column numbers (1-indexed in ExcelJS)
    // Based on the template: A=المخرجات, B=الجهات المشاركة, C=مصدر النشاط, D=نطاق النشاط, E=نوع التمثيل, F=اسم النشاط, G=القسم المعني, H=يوجد محضر اجتماع, I=نوع النشاط
    const columnToExcel: Record<string, number> = {
      'outputs': 1,           // A - المخرجات
      'participatingEntities': 2,  // B - الجهات المشاركة
      'activitySource': 3,    // C - مصدر النشاط
      'activityScope': 4,     // D - نطاق النشاط
      'representationType': 5, // E - نوع التمثيل
      'activityName': 6,      // F - اسم النشاط
      'department': 7,        // G - القسم المعني
      'hasMeetingMinutes': 8, // H - يوجد محضر اجتماع
      'activityType': 9,      // I - نوع النشاط
    }
    
    // Start inserting data from row 3 (1-indexed in ExcelJS)
    let currentRow = 3
    
    rows.value.forEach(row => {
      // Check if row has any data
      const hasData = Object.values(row.cells).some(v => v && v.trim() !== '')
      if (!hasData) return
      
      // Insert each cell value
      columns.value.forEach(col => {
        const excelCol = columnToExcel[col.key]
        if (excelCol !== undefined) {
          const cell = worksheet.getCell(currentRow, excelCol)
          cell.value = row.cells[col.key] || ''
        }
      })
      
      currentRow++
    })
    
    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]
    const filename = `activities_export_${date}.xlsx`
    
    // Write to buffer and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export error:', error)
  } finally {
    isExporting.value = false
  }
}

// Open import modal
const openImportModal = () => {
  importError.value = null
  showImportModal.value = true
}

// Close import modal
const closeImportModal = () => {
  showImportModal.value = false
  importError.value = null
  // Reset file input
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// Trigger file input click
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

// Handle file upload
const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Check file extension
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    importError.value = 'يرجى اختيار ملف Excel (.xlsx أو .xls)'
    return
  }
  
  isImporting.value = true
  importError.value = null
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    // The template has headers on row 2 (index 1), so we need to adjust
    // First, try reading with default (row 1 as header)
    let jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' })
    
    // Check if first row data looks like headers (contains our expected column names)
    const firstRowKeys = jsonData.length > 0 ? Object.keys(jsonData[0]) : []
    const hasExpectedHeaders = Object.values(columnHeadersMap).some(header => 
      firstRowKeys.some(key => key.includes(header) || header.includes(key))
    )
    
    // If headers not found in row 1, try row 2 (skip first row)
    if (!hasExpectedHeaders && range.e.r >= 1) {
      // Read starting from row 2 (index 1) as header
      jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { 
        defval: '',
        range: 1  // Start from row 2 (0-indexed, so 1 means row 2)
      })
    }
    
    if (jsonData.length === 0) {
      importError.value = 'الملف لا يحتوي على بيانات'
      return
    }
    
    // Debug: log the keys to see what headers were detected
    console.log('Detected headers:', jsonData.length > 0 ? Object.keys(jsonData[0]) : [])
    
    // Map imported data to rows
    const newRows: Row[] = []
    
    jsonData.forEach((rowData) => {
      const cells: Record<string, string> = {}
      const styles: Record<string, CellStyle> = {}
      
      columns.value.forEach(col => {
        // Try to find matching header - check multiple possible formats
        const arabicHeader = columnHeadersMap[col.key]
        let value = ''
        
        // Check for exact match first
        if (rowData[arabicHeader] !== undefined) {
          value = rowData[arabicHeader]
        } else if (rowData[col.key] !== undefined) {
          value = rowData[col.key]
        } else {
          // Try partial match (headers might have extra text like newlines)
          const matchingKey = Object.keys(rowData).find(key => 
            key.includes(arabicHeader) || arabicHeader.includes(key) ||
            key.replace(/\s+/g, ' ').trim() === arabicHeader
          )
          if (matchingKey) {
            value = rowData[matchingKey]
          }
        }
        
        cells[col.key] = String(value).trim()
        styles[col.key] = {}
      })
      
      // Only add rows with data (skip rows that only have "اختار" placeholder)
      const hasRealData = Object.values(cells).some(v => 
        v !== '' && v !== 'اختار' && v !== 'اختيار'
      )
      if (hasRealData) {
        newRows.push({
          id: newRows.length + 1,
          height: 32,
          cells,
          styles
        })
      }
    })
    
    if (newRows.length === 0) {
      importError.value = 'لم يتم العثور على بيانات صالحة في الملف'
      return
    }
    
    // Add empty rows to reach minimum of 20
    while (newRows.length < 20) {
      const cells: Record<string, string> = {}
      const styles: Record<string, CellStyle> = {}
      columns.value.forEach(col => {
        cells[col.key] = ''
        styles[col.key] = {}
      })
      newRows.push({
        id: newRows.length + 1,
        height: 32,
        cells,
        styles
      })
    }
    
    // Update rows
    rows.value = newRows
    
    // Close modal
    closeImportModal()
  } catch (error) {
    console.error('Import error:', error)
    importError.value = 'حدث خطأ أثناء قراءة الملف. تأكد من أن الملف بصيغة Excel صحيحة.'
  } finally {
    isImporting.value = false
    // Reset file input
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

// Handle drag and drop file upload
const handleDrop = (event: DragEvent) => {
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    // Create a synthetic event with the file
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    if (fileInputRef.value) {
      fileInputRef.value.files = dataTransfer.files
      handleFileUpload({ target: fileInputRef.value } as unknown as Event)
    }
  }
}

// Handle click outside to close filter dropdown
const handleClickOutside = (event: MouseEvent) => {
  if (activeFilterColumn.value) {
    const target = event.target as HTMLElement
    const filterDropdown = document.querySelector('[class*="filterDropdown"]')
    const filterBtn = target.closest('[class*="filterBtn"]')
    
    if (!filterDropdown?.contains(target) && !filterBtn) {
      closeFilterDropdown()
    }
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', closeContextMenu)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div :class="$style.container">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.headerContent">
      </div>
      <div :class="$style.toolbar">
        <button :class="$style.toolbarBtn" title="إضافة صفوف" @click="addMoreRows">
          <i class="fas fa-plus"></i>
          <span>إضافة صفوف</span>
        </button>
        <button :class="$style.toolbarBtn" title="استيراد من Excel" @click="openImportModal">
          <i class="fas fa-file-import"></i>
          <span>استيراد</span>
        </button>
        <button :class="$style.toolbarBtn" title="تصدير إلى Excel" @click="exportToExcel" :disabled="isExporting">
          <i class="fas fa-file-export"></i>
          <span>{{ isExporting ? 'جاري التصدير...' : 'تصدير' }}</span>
        </button>
      </div>
    </div>

    <!-- Spreadsheet -->
    <div :class="$style.spreadsheetWrapper">
      <div 
        ref="tableRef"
        :class="$style.spreadsheet"
        :style="{ minWidth: totalWidth + 'px' }"
      >
        <!-- Column Headers -->
        <div :class="$style.headerRow">
          <!-- Row number header -->
          <div :class="[$style.headerCell, $style.rowNumberHeader]">
            #
          </div>
          <!-- Column headers -->
          <div
            v-for="(col, index) in columns"
            :key="col.id"
            :class="$style.headerCell"
            :style="{ width: col.width + 'px' }"
            @dblclick="autoFitColumn(index)"
          >
            <span :class="$style.headerText">{{ col.label }}</span>
            <!-- Filter button -->
            <button
              :class="[$style.filterBtn, { [$style.filterActive]: hasActiveFilter(col.key) }]"
              @click.stop="openFilterDropdown(col.key, $event)"
              :title="'تصفية ' + col.label.split('\n')[0]"
            >
              <i class="fas fa-caret-down"></i>
            </button>
            <!-- Column resize handle -->
            <div
              :class="$style.colResizeHandle"
              @mousedown="startColResize($event, index)"
            ></div>
          </div>
        </div>

        <!-- Data Rows -->
        <div :class="$style.dataRows">
          <div
            v-for="(row, rowIndex) in filteredRows"
            :key="row.id"
            :class="[$style.dataRow, { [$style.rowSelected]: isRowSelected(row.id) }, { [$style.rowHasCustomBg]: rowHasCustomBackground(row.id) }]"
            :style="{ height: row.height + 'px' }"
          >
            <!-- Row number -->
            <div 
              :class="[$style.cell, $style.rowNumberCell, { [$style.rowNumberSelected]: isRowSelected(row.id) }]"
              @click="selectRow(row.id, $event)"
              @contextmenu="showRowContextMenu($event, row.id)"
            >
              {{ row.id }}
              <!-- Row resize handle -->
              <div
                :class="$style.rowResizeHandle"
                @mousedown.stop="startRowResize($event, rowIndex)"
              ></div>
            </div>
            <!-- Data cells -->
            <div
              v-for="col in columns"
              :key="getCellId(row.id, col.key)"
              :data-cell-id="getCellId(row.id, col.key)"
              :class="[
                $style.cell,
                { [$style.cellActive]: isCellActive(row.id, col.key) },
                { [$style.cellSelected]: isCellSelected(row.id, col.key) },
                { [$style.cellEditing]: isCellEditing(row.id, col.key) },
                { [$style.cellCut]: isCellCut(row.id, col.key) },
                { [$style.hasCustomBg]: hasCustomBackground(row.id, col.key) }
              ]"
              :style="{ width: col.width + 'px', ...getCellStyle(row.id, col.key) }"
              @click="selectCell(row.id, col.key, $event)"
              @dblclick="startEditing(row.id, col.key)"
              @contextmenu="showCellContextMenu($event, row.id, col.key)"
            >
              <template v-if="isCellEditing(row.id, col.key)">
                <input
                  type="text"
                  :class="$style.cellInput"
                  :value="row.cells[col.key]"
                  @input="updateCellValue(row.id, col.key, ($event.target as HTMLInputElement).value)"
                  @blur="finishEditing"
                  @keydown.stop
                />
              </template>
              <template v-else>
                <span :class="$style.cellContent">{{ row.cells[col.key] }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <Transition name="fade">
      <div
        v-if="showContextMenu"
        ref="contextMenuRef"
        :class="$style.contextMenu"
        :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
        @click.stop
      >
        <!-- Cell-specific options -->
        <template v-if="contextMenuType === 'cell'">
          <button :class="$style.contextMenuItem" @click="copyCell">
            <i class="fas fa-copy"></i>
            <span>نسخ الخلية</span>
          </button>
          <button :class="$style.contextMenuItem" @click="cutCell">
            <i class="fas fa-scissors"></i>
            <span>قص الخلية</span>
          </button>
          <button :class="$style.contextMenuItem" @click="pasteToCell">
            <i class="fas fa-paste"></i>
            <span>لصق</span>
          </button>
          <div :class="$style.contextMenuDivider"></div>
          <button :class="$style.contextMenuItem" @click="clearCell">
            <i class="fas fa-eraser"></i>
            <span>مسح المحتوى</span>
          </button>
          <div :class="$style.contextMenuDivider"></div>
        </template>
        
        <!-- Row-specific options -->
        <template v-if="contextMenuType === 'row'">
          <button :class="$style.contextMenuItem" @click="copyRow">
            <i class="fas fa-copy"></i>
            <span>نسخ الصف{{ selectedRows.size > 1 ? 'وف' : '' }}</span>
          </button>
          <button :class="$style.contextMenuItem" @click="cutRow">
            <i class="fas fa-scissors"></i>
            <span>قص الصف{{ selectedRows.size > 1 ? 'وف' : '' }}</span>
          </button>
          <button :class="$style.contextMenuItem" @click="pasteToCell">
            <i class="fas fa-paste"></i>
            <span>لصق</span>
          </button>
          <button :class="$style.contextMenuItem" @click="duplicateRow">
            <i class="fas fa-clone"></i>
            <span>تكرار الصف{{ selectedRows.size > 1 ? 'وف' : '' }}</span>
          </button>
          <div :class="$style.contextMenuDivider"></div>
          <button :class="$style.contextMenuItem" @click="clearRow">
            <i class="fas fa-eraser"></i>
            <span>مسح المحتوى</span>
          </button>
          <button :class="[$style.contextMenuItem, $style.danger]" @click="deleteRow">
            <i class="fas fa-trash"></i>
            <span>حذف الصف{{ selectedRows.size > 1 ? 'وف' : '' }}</span>
          </button>
          <div :class="$style.contextMenuDivider"></div>
        </template>
        
        <!-- Formatting options (for both cell and row) -->
        <div :class="$style.contextMenuSection">
          <span :class="$style.contextMenuLabel">التنسيق</span>
        </div>

                <!-- Background Color with Flyout -->
        <div 
          :class="[$style.contextMenuItem, $style.hasSubmenu, { [$style.submenuActive]: activeSubmenu === 'bg' }]"
          @mouseenter="handleSubmenuHover('bg', $event)"
          @mouseleave="handleMenuItemLeave"
        >
          <i class="fas fa-fill-drip"></i>
          <span>لون الخلفية</span>
          <i class="fas fa-chevron-left" :class="$style.submenuArrow"></i>
        </div>

                <!-- Text Color with Flyout -->
        <div 
          :class="[$style.contextMenuItem, $style.hasSubmenu, { [$style.submenuActive]: activeSubmenu === 'text' }]"
          @mouseenter="handleSubmenuHover('text', $event)"
          @mouseleave="handleMenuItemLeave"
        >
          <i class="fas fa-font"></i>
          <span>لون النص</span>
          <i class="fas fa-chevron-left" :class="$style.submenuArrow"></i>
        </div>

        <button :class="$style.contextMenuItem" @click="toggleBold">
          <i class="fas fa-bold"></i>
          <span>عريض</span>
        </button>
        <button :class="$style.contextMenuItem" @click="toggleItalic">
          <i class="fas fa-italic"></i>
          <span>مائل</span>
        </button>
        

        

        
        <button :class="$style.contextMenuItem" @click="clearFormatting">
          <i class="fas fa-remove-format"></i>
          <span>إزالة التنسيق</span>
        </button>
        
        <template v-if="contextMenuType === 'row'">
          <div :class="$style.contextMenuDivider"></div>
          <button :class="$style.contextMenuItem" @click="insertRowAbove">
            <i class="fas fa-arrow-up"></i>
            <span>إدراج صف أعلى</span>
          </button>
          <button :class="$style.contextMenuItem" @click="insertRowBelow">
            <i class="fas fa-arrow-down"></i>
            <span>إدراج صف أسفل</span>
          </button>
        </template>
      </div>
    </Transition>

    <!-- Color Picker Flyout Submenu -->
    <Transition name="fade">
      <div
        v-if="activeSubmenu && showContextMenu"
        :class="$style.colorPickerFlyout"
        :style="{ 
          top: submenuPosition.top + 'px', 
          left: submenuPosition.left + 'px'
        }"
        @mouseenter="handleSubmenuEnter"
        @mouseleave="handleSubmenuLeave"
        @click.stop
      >
        <div :class="$style.colorPickerHeader">
          <span>{{ activeSubmenu === 'bg' ? 'لون الخلفية' : 'لون النص' }}</span>
        </div>
        
        <!-- Theme Colors Section -->
        <div :class="$style.colorSection">
          <span :class="$style.colorSectionLabel">ألوان السمة</span>
          <div :class="$style.themeColorsRow">
            <button
              v-for="(tc, index) in themeColors"
              :key="'theme-' + index"
              :class="$style.themeColorBtn"
              :style="{ backgroundColor: tc.color }"
              :title="tc.name"
              @click="applyColor(tc.color)"
            >
              <span v-if="tc.color === '#ffffff'" :class="$style.whiteColorBorder"></span>
            </button>
          </div>
        </div>
        
        <!-- Standard Colors Section -->
        <div :class="$style.colorSection">
          <span :class="$style.colorSectionLabel">الألوان القياسية</span>
          <div :class="$style.colorGrid">
            <button
              v-for="(color, index) in colorPalette"
              :key="'standard-' + index"
              :class="$style.colorOption"
              :style="{ backgroundColor: color }"
              @click="applyColor(color)"
            >
              <span v-if="color === '#ffffff'" :class="$style.whiteColorBorder"></span>
            </button>
          </div>
        </div>
        
        <!-- No Color Option -->
        <div :class="$style.colorPickerFooter">
          <button :class="$style.noColorBtn" @click="applyColor('')">
            <i class="fas fa-ban"></i>
            <span>بدون {{ activeSubmenu === 'bg' ? 'خلفية' : 'لون' }}</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Column Filter Dropdown -->
    <Transition name="fade">
      <div
        v-if="activeFilterColumn"
        :class="$style.filterDropdown"
        :style="{ top: filterDropdownPosition.top + 'px', left: filterDropdownPosition.left + 'px' }"
        @click.stop
      >
        <!-- Filter Header -->
        <div :class="$style.filterHeader">
          <span>{{ columns.find(c => c.key === activeFilterColumn)?.label?.split('\n')[0] }}</span>
          <button :class="$style.filterCloseBtn" @click="closeFilterDropdown">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Sort Options -->
        <div :class="$style.filterSortSection">
          <button :class="$style.filterSortBtn" @click="sortColumnAtoZ(activeFilterColumn!)">
            <i class="fas fa-sort-alpha-down"></i>
            <span>Sort A to Z</span>
          </button>
          <button :class="$style.filterSortBtn" @click="sortColumnZtoA(activeFilterColumn!)">
            <i class="fas fa-sort-alpha-up"></i>
            <span>Sort Z to A</span>
          </button>
        </div>

        <div :class="$style.filterDivider"></div>

        <!-- Clear Filter -->
        <button 
          :class="[$style.filterClearBtn, { [$style.disabled]: !hasActiveFilter(activeFilterColumn!) }]"
          @click="clearColumnFilter(activeFilterColumn!)"
          :disabled="!hasActiveFilter(activeFilterColumn!)"
        >
          <i class="fas fa-filter-circle-xmark"></i>
          <span>Clear Filter From "{{ columns.find(c => c.key === activeFilterColumn)?.label?.split('\n')[0] }}"</span>
        </button>

        <div :class="$style.filterDivider"></div>

        <!-- Text Filters Label -->
        <div :class="$style.filterLabel">
          <span>Text Filters</span>
          <i class="fas fa-chevron-left"></i>
        </div>

        <div :class="$style.filterDivider"></div>

        <!-- Search Input -->
        <div :class="$style.filterSearchWrapper">
          <i class="fas fa-search" :class="$style.filterSearchIcon"></i>
          <input
            type="text"
            :class="$style.filterSearchInput"
            placeholder="Search"
            v-model="columnFilters[activeFilterColumn!].searchQuery"
          />
        </div>

        <!-- Filter Values List -->
        <div :class="$style.filterValuesList">
          <!-- Select All -->
          <label :class="$style.filterValueItem">
            <input
              type="checkbox"
              :class="$style.filterCheckbox"
              :checked="isSelectAllChecked(activeFilterColumn!)"
              @change="selectAllFilterValues(activeFilterColumn!)"
            />
            <span>(Select All)</span>
          </label>

          <!-- Dynamic Values -->
          <label
            v-for="value in getFilteredFilterValues(activeFilterColumn!)"
            :key="value"
            :class="$style.filterValueItem"
          >
            <input
              type="checkbox"
              :class="$style.filterCheckbox"
              :checked="!columnFilters[activeFilterColumn!].excludedValues.has(value)"
              @change="toggleFilterValue(activeFilterColumn!, value)"
            />
            <span>{{ value }}</span>
          </label>

          <!-- Blanks -->
          <label :class="$style.filterValueItem">
            <input
              type="checkbox"
              :class="$style.filterCheckbox"
              :checked="columnFilters[activeFilterColumn!].showBlanks"
              @change="toggleBlanksFilter(activeFilterColumn!)"
            />
            <span>(Blanks)</span>
          </label>
        </div>

        <!-- Footer Buttons -->
        <div :class="$style.filterFooter">
          <button :class="$style.filterOkBtn" @click="applyFilter">OK</button>
          <button :class="$style.filterCancelBtn" @click="closeFilterDropdown">Cancel</button>
        </div>
      </div>
    </Transition>

    <!-- Status Bar -->
    <div :class="$style.statusBar">
      <span v-if="activeCell">
        الخلية: {{ activeCell.rowId }} - {{ columns.find(c => c.key === activeCell?.colKey)?.label?.split('\n')[0] }}
      </span>
      <span>عدد الصفوف: {{ filteredRows.length }} / {{ rows.length }}</span>
      <span>عدد الأعمدة: {{ columns.length }}</span>
    </div>

    <!-- Import Modal -->
    <Transition name="fade">
      <div v-if="showImportModal" :class="$style.modalOverlay" @click="closeImportModal">
        <div :class="$style.importModal" @click.stop>
          <div :class="$style.modalHeader">
            <h3 :class="$style.modalTitle">
              <i class="fas fa-file-import"></i>
              استيراد البيانات من Excel
            </h3>
            <button :class="$style.modalCloseBtn" @click="closeImportModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div :class="$style.modalBody">
            <!-- Download Template Section -->
            <div :class="$style.importSection">
              <div :class="$style.sectionIcon">
                <i class="fas fa-download"></i>
              </div>
              <div :class="$style.sectionContent">
                <h4 :class="$style.sectionTitle">الخطوة 1: تحميل القالب</h4>
                <p :class="$style.sectionDesc">
                  قم بتحميل قالب Excel الجاهز وملء البيانات المطلوبة
                </p>
                <button :class="$style.downloadBtn" @click="downloadTemplate">
                  <i class="fas fa-file-excel"></i>
                  تحميل القالب
                </button>
              </div>
            </div>

            <div :class="$style.sectionDivider">
              <span :class="$style.dividerLine"></span>
              <span :class="$style.dividerText">ثم</span>
              <span :class="$style.dividerLine"></span>
            </div>

            <!-- Upload Section -->
            <div :class="$style.importSection">
              <div :class="$style.sectionIcon">
                <i class="fas fa-upload"></i>
              </div>
              <div :class="$style.sectionContent">
                <h4 :class="$style.sectionTitle">الخطوة 2: رفع الملف</h4>
                <p :class="$style.sectionDesc">
                  بعد ملء القالب، قم برفع الملف لاستيراد البيانات
                </p>
                <div :class="$style.uploadArea" @click="triggerFileInput" @dragover.prevent @drop.prevent="handleDrop">
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept=".xlsx,.xls"
                    :class="$style.fileInput"
                    @change="handleFileUpload"
                  />
                  <div :class="$style.uploadContent">
                    <i class="fas fa-cloud-upload-alt" :class="$style.uploadIcon"></i>
                    <span :class="$style.uploadText">
                      {{ isImporting ? 'جاري الاستيراد...' : 'اضغط أو اسحب الملف هنا' }}
                    </span>
                    <span :class="$style.uploadHint">ملفات Excel فقط (.xlsx, .xls)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="importError" :class="$style.errorMessage">
              <i class="fas fa-exclamation-circle"></i>
              {{ importError }}
            </div>
          </div>

          <div :class="$style.modalFooter">
            <button :class="$style.cancelBtn" @click="closeImportModal">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style module src="./ListingActivities.module.css"></style>
