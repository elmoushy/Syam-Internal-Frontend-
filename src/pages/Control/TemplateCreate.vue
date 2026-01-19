<template>
  <div :class="$style.container" :data-theme="currentTheme">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.headerRight">
        <button :class="$style.backBtn" @click="handleBack">
          <i class="fas fa-arrow-right"></i>
          رجوع
        </button>
        <h1 :class="$style.title">إنشاء نموذج جديد</h1>
      </div>
      <div :class="$style.headerLeft">
        <button :class="$style.cancelBtn" @click="handleCancel">إلغاء</button>
        <button :class="$style.saveBtn" @click="handleSave">إنشاء</button>
      </div>
    </div>

    <!-- Tabs -->
    <div :class="$style.tabsWrapper">
      <div :class="$style.tabs">
        <button
          :class="[$style.tab, { [$style.tabActive]: activeTab === 'properties' }]"
          @click="activeTab = 'properties'">
          الخصائص
        </button>
        <button :class="[$style.tab, { [$style.tabActive]: activeTab === 'database' }]" @click="activeTab = 'database'">
          قاعدة البيانات
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div :class="$style.content">
      <!-- Properties Tab -->
      <div v-if="activeTab === 'properties'" :class="$style.tabContent + ' ' + $style.propertiesTab">
        <FormInput v-model="form.name" label="اسم النموذج" placeholder="ادخل اسم النموذج" required />

        <FormTextarea v-model="form.description" label="الوصف" placeholder="ادخل وصف النموذج" :rows="6" />

        <FormTextarea
          v-model="form.notes"
          label="ملاحظات / تعليمات للمستخدمين"
          placeholder="تعليمات أو ملاحظات تظهر للمستخدمين عند استخدام هذا النموذج"
          :rows="4" />
      </div>

      <!-- Database Tab -->
      <div v-if="activeTab === 'database'" :class="$style.tabContent">
        <div :class="$style.databaseLayout">
          <!-- Available Columns (Right Panel) -->
          <div
            :class="[$style.columnsPanel, { [$style.dragOver]: isDraggingOverAvailable }]"
            @dragover.prevent="handleDragOverAvailable"
            @dragleave="handleDragLeaveAvailable"
            @drop="handleDropOnAvailable">
            <div :class="$style.panelHeader">
              <div :class="$style.panelTitleRow">
                <h3>الأعمدة المتاحة</h3>
                <span :class="$style.count">{{ availableColumns.length }}</span>
              </div>
              <p :class="$style.panelDescription">اسحب الأعمدة الى منطقة التصميم</p>
            </div>

            <!-- Action Buttons Row -->
            <div :class="$style.actionButtonsRow">
              <button :class="$style.manualBtn" @click="openManualPanel">
                <i class="fas fa-plus"></i>
                يدوي
              </button>
              <button :class="$style.templateBtn" @click="openTemplatePanel">
                <i class="far fa-copy"></i>
                نموذج
              </button>
              <button :class="$style.excelBtn" @click="openExcelPanel">
                <i class="fas fa-upload"></i>
                Excel
              </button>
            </div>

            <div :class="$style.columnsList">
              <!-- Available Column Card -->
              <div
                v-for="column in availableColumns"
                :key="column.id"
                :class="[$style.availableColumnCard, { [$style.dragOverItem]: dragOverItemId === column.id }]"
                draggable="true"
                @dragstart="handleDragStart($event, column, 'available')"
                @dragend="handleDragEnd"
                @dragover.prevent="handleDragOverItem($event, column, 'available')"
                @dragleave="handleDragLeaveItem"
                @drop="handleDropOnItem($event, column, 'available')">
                <div :class="$style.availableCardTop">
                  <div :class="$style.dragHandle">
                    <i class="fas fa-grip-vertical"></i>
                  </div>
                  <span :class="$style.availableColumnName">{{ column.name }}</span>
                </div>
                <div :class="$style.availableCardBottom">
                  <div :class="$style.typeBadgeDropdown">
                    <span>{{ getTypeLabel(column.type) }}</span>
                    <i class="fas fa-chevron-down"></i>
                  </div>
                  <span :class="$style.excelBadgeGreen">Excel</span>
                </div>
              </div>

              <div v-if="availableColumns.length === 0" :class="$style.emptyState">
                <i class="fas fa-th-large"></i>
                <p :class="$style.emptyTitle">لا توجد أعمدة متاحة</p>
                <p :class="$style.emptyHint">استخدم الأزرار أعلاه لإضافة أعمدة</p>
              </div>
            </div>
          </div>

          <!-- Template Structure (Left Panel) -->
          <div
            :class="[$style.structurePanel, { [$style.dragOver]: isDraggingOverStructure }]"
            @dragover.prevent="handleDragOverStructure"
            @dragleave="handleDragLeaveStructure"
            @drop="handleDropOnStructure">
            <div :class="$style.panelHeader">
              <div :class="$style.panelTitleRow">
                <h3>هيكل النموذج</h3>
                <span :class="$style.count">{{ selectedColumns.length }}</span>
              </div>
              <p :class="$style.panelDescription">ترتيب الحقول كما سيراها المستخدم</p>
            </div>

            <div :class="$style.structureList">
              <!-- Structure Column Card -->
              <div
                v-for="(column, index) in selectedColumns"
                :key="column.id"
                :class="[$style.structureColumnCard, { [$style.dragOverItem]: dragOverItemId === column.id }]"
                draggable="true"
                @dragstart="handleDragStart($event, column, 'structure')"
                @dragend="handleDragEnd"
                @dragover.prevent="handleDragOverItem($event, column, 'structure')"
                @dragleave="handleDragLeaveItem"
                @drop="handleDropOnItem($event, column, 'structure')">
                <div :class="$style.structureCardTop">
                  <div :class="$style.structureCardTopRight">
                    <span :class="$style.structureNumber">{{ index + 1 }}</span>
                    <span :class="$style.structureColumnName">{{ column.name }}</span>
                  </div>
                  <div :class="$style.dragHandle">
                    <i class="fas fa-grip-vertical"></i>
                  </div>
                </div>
                <div :class="$style.structureCardMiddle">
                  <span :class="$style.typeBadgeIcon">
                    <i :class="getTypeIcon(column.type)"></i>
                    {{ getTypeLabel(column.type) }}
                  </span>
                  <span :class="$style.excelBadgeGreen">Excel</span>
                </div>
                <div :class="$style.structureCardBottom">
                  <button :class="$style.deleteBtn" @click.stop="removeColumn(column)">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                  <button :class="$style.editLink" @click.stop="openEditPanel(column)">
                    <i class="fas fa-external-link-alt"></i>
                    تعديل
                  </button>
                </div>
              </div>

              <div v-if="selectedColumns.length === 0" :class="$style.emptyState">
                <i class="fas fa-th-large"></i>
                <p :class="$style.emptyTitle">اسحب الأعمدة هنا</p>
                <p :class="$style.emptyHint">ابدأ بإضافة الحقول من القائمة المتاحة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Manual Column SidePanel -->
    <SidePanel v-model:isOpen="showManualPanel" title="إنشاء عمود جديد" width="450px">
      <div :class="$style.panelBody">
        <FormInput v-model="newColumn.name" label="اسم العمود" placeholder="ادخل اسم العمود" />

        <FormSelect
          v-model="newColumn.type"
          label="نوع البيانات"
          :options="columnTypeOptions"
          placeholder="اختر نوع البيانات" />
      </div>

      <template #footer>
        <div :class="$style.panelFooter">
          <button :class="$style.primaryBtn" @click="createManualColumn">إنشاء العمود</button>
          <button :class="$style.secondaryBtn" @click="showManualPanel = false">إلغاء</button>
        </div>
      </template>
    </SidePanel>

    <!-- Edit Column SidePanel -->
    <SidePanel v-model:isOpen="showEditPanel" title="تعديل عمود" width="450px">
      <div :class="$style.panelBody">
        <FormInput v-model="editingColumn.name" label="اسم العمود" placeholder="ادخل اسم العمود" />

        <FormSelect
          v-model="editingColumn.type"
          label="نوع البيانات"
          :options="columnTypeOptions"
          placeholder="اختر نوع البيانات" />
      </div>

      <template #footer>
        <div :class="$style.panelFooter">
          <button :class="$style.primaryBtn" @click="saveEditColumn">حفظ التعديلات</button>
          <button :class="$style.secondaryBtn" @click="showEditPanel = false">إلغاء</button>
        </div>
      </template>
    </SidePanel>

    <!-- Template Import SidePanel -->
    <SidePanel
      v-model:isOpen="showTemplatePanel"
      :title="templateStep === 1 ? 'استيراد من نموذج موجود' : 'اختيار الأعمدة'"
      width="450px">
      <!-- Step 1: Select Template -->
      <div v-if="templateStep === 1" :class="$style.panelBody">
        <div :class="$style.templateList">
          <div
            v-for="template in existingTemplates"
            :key="template.id"
            :class="$style.templateItem"
            @click="selectTemplate(template)">
            <div :class="$style.templateIcon">
              <div :class="$style.documentIcon">
                <img src="/icons/Document.svg" alt="Document" />
              </div>
            </div>
            <div :class="$style.templateItemContent">
              <span :class="$style.templateName">{{ template.name }}</span>
              <span :class="$style.templateCount">{{ template.columnCount }} عمود</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Select Columns -->
      <div v-if="templateStep === 2" :class="$style.panelBody">
        <div :class="$style.selectAllRow">
          <div :class="$style.templateIcon">
            <div :class="$style.documentIcon">
              <img src="/icons/Document.svg" alt="Document" />
            </div>
          </div>

          <div :class="$style.templateInfo">
            <span :class="$style.templateName">{{ selectedTemplate?.name }}</span>
            <span :class="$style.selectedCount"
              >{{ selectedTemplateColumns.length }} من {{ templateColumns.length }} محدد</span
            >
          </div>
          <button :class="$style.selectAllBtn" @click="toggleSelectAllTemplateColumns">تحديد الكل</button>
        </div>

        <div :class="$style.columnCheckboxList">
          <div
            v-for="column in templateColumns"
            :key="column.id"
            :class="[$style.columnCheckboxItem, { [$style.selected]: isTemplateColumnSelected(column) }]"
            @click="toggleTemplateColumn(column)">
            <div :class="$style.checkbox">
              <i v-if="isTemplateColumnSelected(column)" class="fas fa-check"></i>
            </div>
            <div :class="$style.columnCheckboxContent">
              <span :class="$style.columnName">{{ column.name }}</span>
              <span :class="$style.columnType">النوع: {{ getTypeLabel(column.type) }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div :class="$style.panelFooter">
          <button v-if="templateStep === 2" :class="$style.primaryBtn" @click="importTemplateColumns">
            استيراد الأعمدة المحددة
          </button>
          <button :class="$style.secondaryBtn" @click="closeTemplatePanel">إلغاء</button>
        </div>
      </template>
    </SidePanel>

    <!-- Excel Import SidePanel -->
    <SidePanel v-model:isOpen="showExcelPanel" title="استيراد جدول بيانات" width="450px">
      <!-- Step 1: Upload File -->
      <div v-if="excelStep === 1" :class="$style.panelBody">
        <div :class="$style.uploadArea">
          <div :class="$style.excelIcon">
            <img src="/icons/excel.svg" alt="Excel" />
          </div>
          <h3 :class="$style.uploadTitle">رفع ملف Excel</h3>
          <p :class="$style.uploadDescription">
            قم برفع ملف Excel لاستخراج اسماء الأعمدة منه تلقائيا.
            <br />
            سيتم الكشف تلقائيا عن صف الأعمدة
          </p>
          <button :class="$style.uploadBtn" @click="simulateExcelUpload">
            <i class="fas fa-upload"></i>
            اختر ملف Excel
          </button>
        </div>
      </div>

      <!-- Step 2: Select Columns -->
      <div v-if="excelStep === 2" :class="$style.panelBody">
        <div :class="$style.discoveredHeader">
          <div :class="$style.discoveredInfo">
            <span :class="$style.discoveredCount">تم اكتشاف {{ excelColumns.length }} عمود</span>
            <span :class="$style.discoveredHint">حدد الأعمدة التي تريد استيرادها</span>
          </div>
          <div :class="$style.excelIconSmall">
            <img src="/icons/excel.svg" alt="Excel" />
          </div>
        </div>

        <div :class="$style.columnCheckboxList">
          <div
            v-for="column in excelColumns"
            :key="column.id"
            :class="[
              $style.columnCheckboxItem,
              $style.excelColumn,
              { [$style.selected]: isExcelColumnSelected(column) },
            ]"
            @click="toggleExcelColumn(column)">
            <div :class="$style.checkbox">
              <i v-if="isExcelColumnSelected(column)" class="fas fa-check"></i>
            </div>
            <div :class="$style.columnCheckboxContent">
              <span :class="$style.columnName">{{ column.name }}</span>
              <span :class="$style.columnType">النوع: {{ getTypeLabel(column.type) }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div :class="$style.panelFooter">
          <button v-if="excelStep === 2" :class="$style.primaryBtn" @click="importExcelColumns">
            استيراد الأعمدة المحددة
          </button>
          <button :class="$style.secondaryBtn" @click="closeExcelPanel">إلغاء</button>
        </div>
      </template>
    </SidePanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAppStore } from "@/stores/useAppStore";
import FormInput from "@/components/shared/FormInput.vue";
import FormTextarea from "@/components/shared/FormTextarea.vue";
import FormSelect from "@/components/shared/FormSelect.vue";
import SidePanel from "@/components/shared/SidePanel.vue";

const router = useRouter();
const store = useAppStore();

const currentTheme = computed(() => store.currentTheme);

// Active tab
const activeTab = ref<"properties" | "database">("properties");

// Form data
const form = ref({
  name: "",
  description: "",
  notes: "",
});

// Column interface
interface Column {
  id: number;
  name: string;
  type: string;
}

// Template interface
interface Template {
  id: number;
  name: string;
  columnCount: number;
}

// Type labels
const typeLabels: Record<string, string> = {
  text: "نص",
  email: "بريد إلكتروني",
  tel: "هاتف",
  date: "تاريخ",
  select: "قائمة منسدلة",
  boolean: "نعم/لا",
  number: "رقم",
};

// Type icons
const typeIcons: Record<string, string> = {
  text: "fas fa-font",
  email: "fas fa-envelope",
  tel: "fas fa-phone",
  date: "fas fa-calendar",
  select: "fas fa-chevron-down",
  boolean: "fas fa-check-square",
  number: "fas fa-hashtag",
};

// Column type options for FormSelect
const columnTypeOptions = [
  { value: "text", label: "نص" },
  { value: "number", label: "رقم" },
  { value: "date", label: "تاريخ" },
  { value: "email", label: "بريد إلكتروني" },
  { value: "tel", label: "هاتف" },
  { value: "select", label: "قائمة منسدلة" },
  { value: "boolean", label: "نعم/لا" },
];

// Get type label
const getTypeLabel = (type: string) => typeLabels[type] || type;

// Get type icon
const getTypeIcon = (type: string) => typeIcons[type] || "fas fa-font";

// Available columns (empty by default to show empty state)
const availableColumns = ref<Column[]>([]);

// Selected columns
const selectedColumns = ref<Column[]>([]);

// ============== MANUAL PANEL ==============
const showManualPanel = ref(false);
const newColumn = ref({ name: "", type: "" });

const openManualPanel = () => {
  newColumn.value = { name: "", type: "" };
  showManualPanel.value = true;
};

const createManualColumn = () => {
  if (!newColumn.value.name || !newColumn.value.type) return;

  const newId = Date.now();
  availableColumns.value.push({
    id: newId,
    name: newColumn.value.name,
    type: newColumn.value.type,
  });
  showManualPanel.value = false;
};

// ============== TEMPLATE PANEL ==============
const showTemplatePanel = ref(false);
const templateStep = ref(1);
const selectedTemplate = ref<Template | null>(null);
const templateColumns = ref<Column[]>([]);
const selectedTemplateColumns = ref<Column[]>([]);

// Mock existing templates
const existingTemplates = ref<Template[]>([
  { id: 1, name: "حصر الأنشطة", columnCount: 8 },
  { id: 2, name: "الشؤون المالية", columnCount: 12 },
  { id: 3, name: "الموارد البشرية", columnCount: 6 },
  { id: 4, name: "تقييم الأداء", columnCount: 10 },
  { id: 5, name: "استبيان رضا العملاء", columnCount: 5 },
]);

// Mock template columns data
const templateColumnsData: Record<number, Column[]> = {
  1: [
    { id: 101, name: "اسم النشاط", type: "text" },
    { id: 102, name: "نوع النشاط", type: "select" },
    { id: 103, name: "تاريخ البدء", type: "date" },
    { id: 104, name: "تاريخ الانتهاء", type: "date" },
    { id: 105, name: "المسؤول", type: "text" },
    { id: 106, name: "الميزانية", type: "number" },
    { id: 107, name: "الحالة", type: "select" },
    { id: 108, name: "ملاحظات", type: "text" },
  ],
  2: [
    { id: 201, name: "رقم الفاتورة", type: "text" },
    { id: 202, name: "التاريخ", type: "date" },
    { id: 203, name: "المبلغ", type: "number" },
    { id: 204, name: "نوع العملية", type: "select" },
  ],
  3: [
    { id: 301, name: "اسم الموظف", type: "text" },
    { id: 302, name: "الرقم الوظيفي", type: "text" },
    { id: 303, name: "القسم", type: "select" },
    { id: 304, name: "البريد الإلكتروني", type: "email" },
    { id: 305, name: "رقم الهاتف", type: "tel" },
    { id: 306, name: "تاريخ التعيين", type: "date" },
  ],
  4: [
    { id: 401, name: "اسم الموظف", type: "text" },
    { id: 402, name: "الفترة", type: "text" },
    { id: 403, name: "التقييم", type: "number" },
    { id: 404, name: "التوصيات", type: "text" },
  ],
  5: [
    { id: 501, name: "اسم العميل", type: "text" },
    { id: 502, name: "التقييم العام", type: "number" },
    { id: 503, name: "ملاحظات", type: "text" },
  ],
};

const openTemplatePanel = () => {
  templateStep.value = 1;
  selectedTemplate.value = null;
  templateColumns.value = [];
  selectedTemplateColumns.value = [];
  showTemplatePanel.value = true;
};

const selectTemplate = (template: Template) => {
  selectedTemplate.value = template;
  templateColumns.value = templateColumnsData[template.id] || [];
  selectedTemplateColumns.value = [...templateColumns.value];
  templateStep.value = 2;
};

const isTemplateColumnSelected = (column: Column) => {
  return selectedTemplateColumns.value.some((c) => c.id === column.id);
};

const toggleTemplateColumn = (column: Column) => {
  const index = selectedTemplateColumns.value.findIndex((c) => c.id === column.id);
  if (index > -1) {
    selectedTemplateColumns.value.splice(index, 1);
  } else {
    selectedTemplateColumns.value.push(column);
  }
};

const toggleSelectAllTemplateColumns = () => {
  if (selectedTemplateColumns.value.length === templateColumns.value.length) {
    selectedTemplateColumns.value = [];
  } else {
    selectedTemplateColumns.value = [...templateColumns.value];
  }
};

const importTemplateColumns = () => {
  selectedTemplateColumns.value.forEach((col) => {
    const newCol = { ...col, id: Date.now() + Math.random() * 1000 };
    availableColumns.value.push(newCol);
  });
  showTemplatePanel.value = false;
};

const closeTemplatePanel = () => {
  showTemplatePanel.value = false;
};

// ============== EXCEL PANEL ==============
const showExcelPanel = ref(false);
const excelStep = ref(1);
const excelColumns = ref<Column[]>([]);
const selectedExcelColumns = ref<Column[]>([]);

// Mock Excel columns
const mockExcelColumns: Column[] = [
  { id: 601, name: "اسم النشاط", type: "text" },
  { id: 602, name: "نوع النشاط", type: "select" },
  { id: 603, name: "تاريخ البدء", type: "date" },
  { id: 604, name: "تاريخ الانتهاء", type: "date" },
  { id: 605, name: "المسؤول", type: "text" },
  { id: 606, name: "الميزانية", type: "number" },
];

const openExcelPanel = () => {
  excelStep.value = 1;
  excelColumns.value = [];
  selectedExcelColumns.value = [];
  showExcelPanel.value = true;
};

const simulateExcelUpload = () => {
  // Simulate file upload and column detection
  excelColumns.value = [...mockExcelColumns];
  selectedExcelColumns.value = [...mockExcelColumns];
  excelStep.value = 2;
};

const isExcelColumnSelected = (column: Column) => {
  return selectedExcelColumns.value.some((c) => c.id === column.id);
};

const toggleExcelColumn = (column: Column) => {
  const index = selectedExcelColumns.value.findIndex((c) => c.id === column.id);
  if (index > -1) {
    selectedExcelColumns.value.splice(index, 1);
  } else {
    selectedExcelColumns.value.push(column);
  }
};

const importExcelColumns = () => {
  selectedExcelColumns.value.forEach((col) => {
    const newCol = { ...col, id: Date.now() + Math.random() * 1000 };
    availableColumns.value.push(newCol);
  });
  showExcelPanel.value = false;
};

const closeExcelPanel = () => {
  showExcelPanel.value = false;
};

// Add column to structure
const addColumn = (column: Column) => {
  if (!selectedColumns.value.find((c) => c.id === column.id)) {
    selectedColumns.value.push(column);
  }
};

// Remove column from structure
const removeColumn = (column: Column) => {
  const index = selectedColumns.value.findIndex((c) => c.id === column.id);
  if (index > -1) {
    selectedColumns.value.splice(index, 1);
  }
};

// ============== EDIT PANEL ==============
const showEditPanel = ref(false);
const editingColumn = ref({ id: 0, name: "", type: "" });
const editingColumnOriginalId = ref(0);

const openEditPanel = (column: Column) => {
  editingColumn.value = { ...column };
  editingColumnOriginalId.value = column.id;
  showEditPanel.value = true;
};

const saveEditColumn = () => {
  // Update in selected columns
  const selectedIndex = selectedColumns.value.findIndex((c) => c.id === editingColumnOriginalId.value);
  if (selectedIndex > -1) {
    selectedColumns.value[selectedIndex].name = editingColumn.value.name;
    selectedColumns.value[selectedIndex].type = editingColumn.value.type;
  }

  // Update in available columns
  const availableIndex = availableColumns.value.findIndex((c) => c.id === editingColumnOriginalId.value);
  if (availableIndex > -1) {
    availableColumns.value[availableIndex].name = editingColumn.value.name;
    availableColumns.value[availableIndex].type = editingColumn.value.type;
  }

  showEditPanel.value = false;
};

// ============== DRAG AND DROP ==============
const isDraggingOverAvailable = ref(false);
const isDraggingOverStructure = ref(false);
const draggedColumn = ref<Column | null>(null);
const dragSource = ref<"available" | "structure" | null>(null);
const dragOverItemId = ref<number | null>(null);

const handleDragStart = (event: DragEvent, column: Column, source: "available" | "structure") => {
  draggedColumn.value = column;
  dragSource.value = source;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(column));
  }
};

const handleDragEnd = () => {
  draggedColumn.value = null;
  dragSource.value = null;
  isDraggingOverAvailable.value = false;
  isDraggingOverStructure.value = false;
  dragOverItemId.value = null;
};

const handleDragOverItem = (event: DragEvent, targetColumn: Column, targetList: "available" | "structure") => {
  event.preventDefault();
  if (draggedColumn.value && draggedColumn.value.id !== targetColumn.id) {
    dragOverItemId.value = targetColumn.id;
  }
};

const handleDragLeaveItem = () => {
  dragOverItemId.value = null;
};

const handleDropOnItem = (event: DragEvent, targetColumn: Column, targetList: "available" | "structure") => {
  event.stopPropagation();
  dragOverItemId.value = null;

  if (!draggedColumn.value || draggedColumn.value.id === targetColumn.id) {
    return;
  }

  // Reordering within the same list
  if (dragSource.value === targetList) {
    const list = targetList === "available" ? availableColumns.value : selectedColumns.value;
    const draggedIndex = list.findIndex((c) => c.id === draggedColumn.value!.id);
    const targetIndex = list.findIndex((c) => c.id === targetColumn.id);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove from old position
      const [removed] = list.splice(draggedIndex, 1);
      // Insert at new position
      list.splice(targetIndex, 0, removed);
    }
  }
  // Moving between lists
  else {
    if (targetList === "structure" && dragSource.value === "available") {
      // Add to structure at the target position if not already there
      if (!selectedColumns.value.find((c) => c.id === draggedColumn.value!.id)) {
        const targetIndex = selectedColumns.value.findIndex((c) => c.id === targetColumn.id);
        selectedColumns.value.splice(targetIndex, 0, { ...draggedColumn.value });
      }
    } else if (targetList === "available" && dragSource.value === "structure") {
      // Remove from structure
      const index = selectedColumns.value.findIndex((c) => c.id === draggedColumn.value!.id);
      if (index > -1) {
        selectedColumns.value.splice(index, 1);
      }
    }
  }

  handleDragEnd();
};

const handleDragOverAvailable = (event: DragEvent) => {
  event.preventDefault();
  isDraggingOverAvailable.value = true;
};

const handleDragLeaveAvailable = () => {
  isDraggingOverAvailable.value = false;
};

const handleDropOnAvailable = () => {
  isDraggingOverAvailable.value = false;

  if (draggedColumn.value && dragSource.value === "structure") {
    // Remove from structure
    const index = selectedColumns.value.findIndex((c) => c.id === draggedColumn.value!.id);
    if (index > -1) {
      selectedColumns.value.splice(index, 1);
    }
  }

  handleDragEnd();
};

const handleDragOverStructure = (event: DragEvent) => {
  event.preventDefault();
  isDraggingOverStructure.value = true;
};

const handleDragLeaveStructure = () => {
  isDraggingOverStructure.value = false;
};

const handleDropOnStructure = () => {
  isDraggingOverStructure.value = false;

  if (draggedColumn.value && dragSource.value === "available") {
    // Add to structure if not already there
    if (!selectedColumns.value.find((c) => c.id === draggedColumn.value!.id)) {
      selectedColumns.value.push({ ...draggedColumn.value });
    }
  }

  handleDragEnd();
};

// Handle back
const handleBack = () => {
  router.push("/control/templates");
};

// Handle cancel
const handleCancel = () => {
  router.push("/control/templates");
};

// Handle save
const handleSave = () => {
  console.log("Save template:", form.value);
  console.log("Selected columns:", selectedColumns.value);
  // Implement save logic here
};
</script>

<style module>
.container {
  padding: 0;
  min-height: calc(100vh - 62px);
  background-color: #f8fafc;
}

.container[data-theme="night"] {
  background-color: #0f172a;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: white;
  border-bottom: 1px solid #e2e8f0;
  margin: 1rem 1.5rem;
  border-radius: 12px;
}

.container[data-theme="night"] .header {
  background-color: #1e293b;
  border-bottom-color: #334155;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.backBtn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: transparent;
  color: #64748b;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .backBtn {
  color: #94a3b8;
}

.backBtn:hover {
  color: #a17d23;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.container[data-theme="night"] .title {
  color: #f8fafc;
}

.cancelBtn {
  padding: 0.625rem 1.5rem;
  background-color: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .cancelBtn {
  background-color: #334155;
  border-color: #475569;
  color: #94a3b8;
}

.cancelBtn:hover {
  background-color: #f8fafc;
  border-color: #cbd5e1;
}

.saveBtn {
  padding: 0.625rem 1.5rem;
  background-color: #a17d23;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.saveBtn:hover {
  background-color: #8a6b1e;
}

/* Tabs */
.tabsWrapper {
  display: flex;
  justify-content: flex-start;
  padding: 1rem 2rem 0;
}

.tabs {
  display: flex;
  gap: 0;
  background-color: #f1f5f9;
  border-radius: 8px;
  padding: 4px;
}

.container[data-theme="night"] .tabs {
  background-color: #334155;
}

.tab {
  padding: 0.625rem 1.5rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .tab {
  color: #94a3b8;
}

.tab:hover {
  color: #1e293b;
}

.container[data-theme="night"] .tab:hover {
  color: #f8fafc;
}

.tabActive {
  background-color: #a17d23 !important;
  color: white !important;
}

/* Content */
.content {
  padding: 1.5rem 2rem;
}

.tabContent {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border-radius: 12px;
}

.propertiesTab {
  background-color: white;
  padding: 1.5rem;
}

.container[data-theme="night"] .tabContent {
  background-color: #1e293b;
}

/* Database Layout */
.databaseLayout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  background: transparent;
  padding: 0;
  box-shadow: none;
}

@media (max-width: 1024px) {
  .databaseLayout {
    grid-template-columns: 1fr;
  }
}

/* Panels */
.columnsPanel,
.structurePanel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.container[data-theme="night"] .columnsPanel,
.container[data-theme="night"] .structurePanel {
  background-color: #1e293b;
}

.panelHeader {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-bottom: 0;
  border-bottom: none;
}

.panelTitleRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panelHeader h3 {
  font-size: 1.125rem;
  font-weight: 500;
  color: #1e293b;
  margin: 0;
}

.container[data-theme="night"] .panelHeader h3 {
  color: #f8fafc;
}

.panelDescription {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.container[data-theme="night"] .panelDescription {
  color: #94a3b8;
}

.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  background-color: #f1f5f9;
  color: #64748b;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid #e2e8f0;
}

.container[data-theme="night"] .count {
  background-color: #334155;
  border-color: #475569;
  color: #94a3b8;
}

/* Action Buttons Row */
.actionButtonsRow {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.manualBtn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0;
  background-color: #a17d23;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.manualBtn:hover {
  background-color: #8a6b1e;
}

.templateBtn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #fef3e2;
  color: #a17d23;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .templateBtn {
  background-color: #334155;
  border-color: #a17d23;
}

.templateBtn:hover {
  background-color: #fef7ed;
}

.container[data-theme="night"] .templateBtn:hover {
  background-color: #475569;
}

.excelBtn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #e8f5f1;
  color: #10b981;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .excelBtn {
  background-color: #334155;
  border-color: #10b981;
}

.excelBtn:hover {
  background-color: #ecfdf5;
}

.container[data-theme="night"] .excelBtn:hover {
  background-color: #475569;
}

/* Columns List */
.columnsList,
.structureList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 250px;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.25rem;
  border: 1px dashed #e2e8f0;
  border-radius: 8px;
}

.container[data-theme="night"] .columnsList,
.container[data-theme="night"] .structureList {
  border-color: #475569;
}

/* Column Item */
.columnItem,
.structureItem {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s;
  cursor: pointer;
}

.container[data-theme="night"] .columnItem,
.container[data-theme="night"] .structureItem {
  background-color: #0f172a;
  border-color: #334155;
}

.columnItem:hover,
.structureItem:hover {
  border-color: #a17d23;
  box-shadow: 0 2px 8px rgba(161, 125, 35, 0.1);
}

.dragHandle {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  cursor: grab;
}

.container[data-theme="night"] .dragHandle {
  color: #475569;
}

.dragHandle i {
  font-size: 1rem;
}

.columnItemContent,
.structureItemContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.columnItemName,
.structureItemName {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.container[data-theme="night"] .columnItemName,
.container[data-theme="night"] .structureItemName {
  color: #f8fafc;
}

.columnItemMeta,
.structureItemMeta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.typeBadge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background-color: #f1f5f9;
  color: #64748b;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

.container[data-theme="night"] .typeBadge {
  background-color: #334155;
  border-color: #475569;
  color: #94a3b8;
}

.excelBadge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  background-color: #ecfdf5;
  color: #10b981;
  border: 1px solid #10b981;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .excelBadge {
  background-color: #064e3b;
  border-color: #10b981;
}

.excelBadge:hover {
  background-color: #d1fae5;
}

.container[data-theme="night"] .excelBadge:hover {
  background-color: #065f46;
}

/* Empty State */
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 0.5rem;
}

.emptyState i {
  font-size: 2.5rem;
  color: #a17d23;
  margin-bottom: 0.5rem;
}

.container[data-theme="night"] .emptyState i {
  color: #c9a961;
}

.emptyTitle {
  font-size: 1rem;
  font-weight: 600;
  color: #a17d23;
  margin: 0;
}

.container[data-theme="night"] .emptyTitle {
  color: #c9a961;
}

.emptyHint {
  font-size: 0.875rem;
  font-weight: 400;
  color: #94a3b8;
  margin: 0;
}

.container[data-theme="night"] .emptyHint {
  color: #64748b;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .headerRight,
  .headerLeft {
    width: 100%;
    justify-content: center;
  }

  .title {
    font-size: 1.25rem;
  }

  .content {
    padding: 1rem;
  }

  .tabContent {
    padding: 1rem;
  }

  .actionButtonsRow {
    flex-direction: column;
  }
}

/* ============== SIDE PANEL STYLES ============== */
.panelBody {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;
}

.panelFooter {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.container[data-theme="night"] .panelFooter {
  border-top-color: #334155;
  background-color: #1e293b;
}

.primaryBtn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  background-color: #a17d23;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.primaryBtn:hover {
  background-color: #8a6a1e;
}

.secondaryBtn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  background-color: transparent;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.container[data-theme="night"] .secondaryBtn {
  border-color: #475569;
  color: #94a3b8;
}

.secondaryBtn:hover {
  background-color: #f1f5f9;
}

.container[data-theme="night"] .secondaryBtn:hover {
  background-color: #334155;
}

/* Template List */
.templateList {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.templateItem {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 1rem;
}

.container[data-theme="night"] .templateItem {
  background-color: #1e293b;
  border-color: #334155;
}

.templateItem:hover {
  border-color: #a17d23;
  background-color: #fef9e7;
}

.container[data-theme="night"] .templateItem:hover {
  border-color: #c9a961;
  background-color: #2d2a1f;
}

.templateItemContent {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.templateName {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e293b;
}

.container[data-theme="night"] .templateName {
  color: #f8fafc;
}

.templateCount {
  font-size: 0.8125rem;
  color: #64748b;
}

.container[data-theme="night"] .templateCount {
  color: #94a3b8;
}

.templateIcon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fef3e2;
  border-radius: 8px;
  color: #0284c7;
  font-size: 1rem;
}

.container[data-theme="night"] .templateIcon {
  background-color: #164e63;
  color: #38bdf8;
}

/* Select All Row */
.selectAllRow {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: #fef9e7;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 0.5rem;
}

.container[data-theme="night"] .selectAllRow {
  background-color: #2d2a1f;
  border-color: #4a4530;
}

.selectAllBtn {
  padding: 0.375rem 0.75rem;
  background-color: #a17d23;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.selectAllBtn:hover {
  background-color: #8a6a1e;
}

.templateInfo {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.selectedCount {
  font-size: 0.75rem;
  color: #64748b;
}

.container[data-theme="night"] .selectedCount {
  color: #94a3b8;
}

/* Column Checkbox List */
.columnCheckboxList {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.columnCheckboxItem {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .columnCheckboxItem {
  background-color: #1e293b;
  border-color: #334155;
}

.columnCheckboxItem:hover {
  border-color: #a17d23;
}

.columnCheckboxItem.selected {
  border-color: #a17d23;
  background-color: #fef9e7;
}

.container[data-theme="night"] .columnCheckboxItem.selected {
  border-color: #c9a961;
  background-color: #2d2a1f;
}

.checkbox {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  background-color: white;
  transition: all 0.2s;
}

.container[data-theme="night"] .checkbox {
  border-color: #475569;
  background-color: #334155;
}

.columnCheckboxItem.selected .checkbox {
  background-color: #a17d23;
  border-color: #a17d23;
  color: white;
}

.container[data-theme="night"] .columnCheckboxItem.selected .checkbox {
  background-color: #c9a961;
  border-color: #c9a961;
}

.checkbox i {
  font-size: 0.625rem;
}

.columnCheckboxContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.columnName {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #1e293b;
}

.container[data-theme="night"] .columnName {
  color: #f8fafc;
}

.columnType {
  font-size: 0.75rem;
  color: #64748b;
}

.container[data-theme="night"] .columnType {
  color: #94a3b8;
}

/* Excel Upload */
.uploadArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  text-align: center;
  background-color: #fafafa;
}

.container[data-theme="night"] .uploadArea {
  border-color: #334155;
  background-color: #1e293b;
}

.excelIcon {
  width: 80px;
  height: 80px;
  margin-bottom: 1rem;
}

.excelIcon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.uploadTitle {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem;
}

.container[data-theme="night"] .uploadTitle {
  color: #f8fafc;
}

.uploadDescription {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.container[data-theme="night"] .uploadDescription {
  color: #94a3b8;
}

.uploadBtn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.uploadBtn:hover {
  background-color: #059669;
}

/* Discovered Header */
.discoveredHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: #d1fae5;
  border-radius: 10px;
  margin-bottom: 1rem;
}

.container[data-theme="night"] .discoveredHeader {
  background-color: #064e3b;
}

.discoveredInfo {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.discoveredCount {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #059669;
}

.container[data-theme="night"] .discoveredCount {
  color: #34d399;
}

.discoveredHint {
  font-size: 0.75rem;
  color: #047857;
}

.container[data-theme="night"] .discoveredHint {
  color: #6ee7b7;
}

.excelIconSmall {
  width: 36px;
  height: 36px;
}

.excelIconSmall img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.excelColumn {
  background-color: #f0fdf4;
}

.container[data-theme="night"] .excelColumn {
  background-color: #052e16;
}

/* Structure Item Updated */
.structureItem {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background-color: #fafafa;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s;
}

.container[data-theme="night"] .structureItem {
  background-color: #1e293b;
  border-color: #334155;
}

.structureItem:hover {
  border-color: #a17d23;
}

.structureItemHeader {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 150px;
}

.structureNumber {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: #a17d23;
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 600;
}

.structureItemName {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #1e293b;
}

.container[data-theme="night"] .structureItemName {
  color: #f8fafc;
}

.structureItemMeta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.structureItemActions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: auto;
}

.deleteBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .deleteBtn {
  background-color: #450a0a;
  border-color: #7f1d1d;
  color: #f87171;
}

.deleteBtn:hover {
  background-color: #fee2e2;
}

.container[data-theme="night"] .deleteBtn:hover {
  background-color: #7f1d1d;
}

.editInputWrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.container[data-theme="night"] .editInputWrapper {
  background-color: #334155;
  border-color: #475569;
}

.editInputWrapper i {
  color: #94a3b8;
  font-size: 0.75rem;
}

.editInput {
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: #1e293b;
  width: 80px;
  outline: none;
}

.container[data-theme="night"] .editInput {
  color: #f8fafc;
}

.editInput::placeholder {
  color: #94a3b8;
}

/* ============== DRAG OVER STATE ============== */
.dragOver {
  border: 2px dashed #a17d23 !important;
  background-color: #fef9e7 !important;
}

.container[data-theme="night"] .dragOver {
  background-color: #2d2a1f !important;
}

.dragOverItem {
  border: 2px solid #a17d23 !important;
  background-color: #fef9e7 !important;
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(161, 125, 35, 0.2) !important;
}

.container[data-theme="night"] .dragOverItem {
  background-color: #2d2a1f !important;
  box-shadow: 0 4px 12px rgba(201, 169, 97, 0.3) !important;
}

/* ============== AVAILABLE COLUMN CARD ============== */
.availableColumnCard {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: grab;
  transition: all 0.2s;
}

.availableColumnCard:active {
  cursor: grabbing;
}

.container[data-theme="night"] .availableColumnCard {
  background-color: #0f172a;
  border-color: #334155;
}

.availableColumnCard:hover {
  border-color: #a17d23;
  box-shadow: 0 2px 8px rgba(161, 125, 35, 0.1);
}

.availableCardTop {
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.availableColumnName {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.container[data-theme="night"] .availableColumnName {
  color: #f8fafc;
}

.availableCardBottom {
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 0.5rem;
}

.typeBadgeDropdown {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background-color: #f1f5f9;
  color: #64748b;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

.container[data-theme="night"] .typeBadgeDropdown {
  background-color: #334155;
  border-color: #475569;
  color: #94a3b8;
}

.typeBadgeDropdown i {
  font-size: 0.625rem;
}

.excelBadgeGreen {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  background-color: #ecfdf5;
  color: #10b981;
  border: 1px solid #10b981;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.container[data-theme="night"] .excelBadgeGreen {
  background-color: #064e3b;
  border-color: #10b981;
}

/* ============== STRUCTURE COLUMN CARD ============== */
.structureColumnCard {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: grab;
  transition: all 0.2s;
}

.structureColumnCard:active {
  cursor: grabbing;
}

.container[data-theme="night"] .structureColumnCard {
  background-color: #0f172a;
  border-color: #334155;
}

.structureColumnCard:hover {
  border-color: #a17d23;
  box-shadow: 0 2px 8px rgba(161, 125, 35, 0.1);
}

.structureCardTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.structureCardTopRight {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.structureNumber {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background-color: #a17d23;
  color: white;
  border-radius: 50%;
  font-size: 0.8125rem;
  font-weight: 600;
}

.structureColumnName {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.container[data-theme="night"] .structureColumnName {
  color: #f8fafc;
}

.structureCardMiddle {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.typeBadgeIcon {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background-color: #f1f5f9;
  color: #64748b;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

.container[data-theme="night"] .typeBadgeIcon {
  background-color: #334155;
  border-color: #475569;
  color: #94a3b8;
}

.typeBadgeIcon i {
  font-size: 0.75rem;
}

.structureCardBottom {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.container[data-theme="night"] .structureCardBottom {
  border-top-color: #334155;
}

.deleteBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .deleteBtn {
  background-color: #450a0a;
  border-color: #7f1d1d;
  color: #f87171;
}

.deleteBtn:hover {
  background-color: #fee2e2;
}

.container[data-theme="night"] .deleteBtn:hover {
  background-color: #7f1d1d;
}

.editLink {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex: 1;
  padding: 0.625rem 1rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .editLink {
  background-color: #334155;
  border-color: #475569;
  color: #94a3b8;
}

.editLink:hover {
  border-color: #a17d23;
  color: #a17d23;
}

.container[data-theme="night"] .editLink:hover {
  border-color: #c9a961;
  color: #c9a961;
}

.editLink i {
  font-size: 0.75rem;
}
</style>
