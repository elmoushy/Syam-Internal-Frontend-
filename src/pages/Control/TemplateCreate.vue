<template>
  <div :class="$style.container" :data-theme="currentTheme">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.headerRight">
        <button :class="$style.backBtn" @click="handleBack">
          <i class="fas fa-arrow-right"></i>
          رجوع
        </button>
        <h1 :class="$style.title">{{ editMode ? 'تعديل النموذج' : 'إنشاء نموذج جديد' }}</h1>
      </div>
      <div :class="$style.headerLeft">
        <button :class="$style.cancelBtn" @click="handleCancel">إلغاء</button>
        <button :class="$style.saveBtn" @click="handleSave" :disabled="isSaving">
          <i v-if="isSaving" class="fas fa-spinner fa-spin"></i>
          <span v-else>{{ editMode ? 'تحديث' : 'إنشاء' }}</span>
        </button>
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
      <!-- Loading State -->
      <div v-if="isLoading" :class="$style.loadingContainer">
        <i class="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل النموذج...</p>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" :class="$style.errorMessage">
        <i class="fas fa-exclamation-circle"></i>
        <p>{{ errorMessage }}</p>
      </div>

      <!-- Properties Tab -->
      <div v-else-if="activeTab === 'properties'" :class="$style.tabContent + ' ' + $style.propertiesTab">
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
              <button 
                v-if="availableColumns.length > 0" 
                :class="$style.moveAllBtn" 
                @click="moveAllToStructure"
                title="نقل جميع الأعمدة إلى الهيكل">
                <i class="fas fa-arrow-left"></i>
                <span>نقل الكل</span>
                <i class="fas fa-layer-group"></i>
              </button>
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
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15 5H6.66667C5.74619 5 5 5.74619 5 6.66667V15C5 15.9205 5.74619 16.6667 6.66667 16.6667H15C15.9205 16.6667 16.6667 15.9205 16.6667 15V6.66667C16.6667 5.74619 15.9205 5 15 5Z" stroke="#9CA3AF" stroke-width="3.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M33.3359 5H25.0026C24.0821 5 23.3359 5.74619 23.3359 6.66667V15C23.3359 15.9205 24.0821 16.6667 25.0026 16.6667H33.3359C34.2564 16.6667 35.0026 15.9205 35.0026 15V6.66667C35.0026 5.74619 34.2564 5 33.3359 5Z" stroke="#9CA3AF" stroke-width="3.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M33.3359 23.333H25.0026C24.0821 23.333 23.3359 24.0792 23.3359 24.9997V33.333C23.3359 34.2535 24.0821 34.9997 25.0026 34.9997H33.3359C34.2564 34.9997 35.0026 34.2535 35.0026 33.333V24.9997C35.0026 24.0792 34.2564 23.333 33.3359 23.333Z" stroke="#9CA3AF" stroke-width="3.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M15 23.333H6.66667C5.74619 23.333 5 24.0792 5 24.9997V33.333C5 34.2535 5.74619 34.9997 6.66667 34.9997H15C15.9205 34.9997 16.6667 34.2535 16.6667 33.333V24.9997C16.6667 24.0792 15.9205 23.333 15 23.333Z" stroke="#9CA3AF" stroke-width="3.33333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

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
                <span :class="$style.count">{{ visibleColumnCount }}</span>
              </div>
              <p :class="$style.panelDescription">ترتيب الحقول كما سيراها المستخدم</p>
            </div>

            <div :class="$style.structureList">
              <!-- Structure Column Card -->
              <div
                v-for="(column, index) in sortedSelectedColumns"
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
                    <!-- Mandatory column badge -->
                    <span v-if="isColumnMandatory(column)" :class="$style.mandatoryBadge">
                      <i class="fas fa-lock"></i>
                      إلزامي
                    </span>
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
                  <span v-if="column.allowsAttachment" :class="[$style.attachmentBadge, column.attachmentRequired ? $style.required : '']">
                    <i class="fas fa-paperclip"></i>
                    {{ column.attachmentRequired ? 'مرفق مطلوب' : 'يسمح بمرفق' }}
                  </span>
                  <span :class="$style.excelBadgeGreen">Excel</span>
                </div>
                <div :class="$style.structureCardBottom">
                  <!-- Hide delete and edit buttons for mandatory columns -->
                  <template v-if="!isColumnMandatory(column)">
                    <button :class="$style.deleteBtn" @click.stop="removeColumn(column)">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                    <button :class="$style.editLink" @click.stop="openEditPanel(column)">
                      <i class="fas fa-external-link-alt"></i>
                      تعديل
                    </button>
                  </template>
                  <span v-else :class="$style.lockedText">
                    <i class="fas fa-lock"></i>
                    عمود إلزامي
                  </span>
                </div>
              </div>

              <div v-if="visibleColumnCount === 0" :class="$style.emptyState">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15 5H6.66667C5.74619 5 5 5.74619 5 6.66667V15C5 15.9205 5.74619 16.6667 6.66667 16.6667H15C15.9205 16.6667 16.6667 15.9205 16.6667 15V6.66667C16.6667 5.74619 15.9205 5 15 5Z" stroke="#A17D23" stroke-width="3.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M33.3359 5H25.0026C24.0821 5 23.3359 5.74619 23.3359 6.66667V15C23.3359 15.9205 24.0821 16.6667 25.0026 16.6667H33.3359C34.2564 16.6667 35.0026 15.9205 35.0026 15V6.66667C35.0026 5.74619 34.2564 5 33.3359 5Z" stroke="#A17D23" stroke-width="3.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M33.3359 23.333H25.0026C24.0821 23.333 23.3359 24.0792 23.3359 24.9997V33.333C23.3359 34.2535 24.0821 34.9997 25.0026 34.9997H33.3359C34.2564 34.9997 35.0026 34.2535 35.0026 33.333V24.9997C35.0026 24.0792 34.2564 23.333 33.3359 23.333Z" stroke="#A17D23" stroke-width="3.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M15 23.333H6.66667C5.74619 23.333 5 24.0792 5 24.9997V33.333C5 34.2535 5.74619 34.9997 6.66667 34.9997H15C15.9205 34.9997 16.6667 34.2535 16.6667 33.333V24.9997C16.6667 24.0792 15.9205 23.333 15 23.333Z" stroke="#A17D23" stroke-width="3.33333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

                <p :class="$style.emptyTitle2">اسحب الأعمدة هنا</p>
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
        
        <!-- Options field for select type -->
        <div v-if="newColumn.type === 'select'" :class="$style.optionsSection">
          <label :class="$style.optionsLabel">خيارات القائمة المنسدلة</label>
          <div v-for="(option, index) in newColumn.options" :key="index" :class="$style.optionRow">
            <input 
              v-model="newColumn.options[index]" 
              :class="$style.optionInput" 
              placeholder="ادخل خيار" 
            />
            <button 
              @click="removeOption(newColumn.options, index)" 
              :class="$style.removeOptionBtn"
              type="button">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <button @click="addOption(newColumn.options)" :class="$style.addOptionBtn" type="button">
            <i class="fas fa-plus"></i>
            إضافة خيار
          </button>
        </div>
        
        <!-- Attachment Settings -->
        <div :class="$style.attachmentSection">
          <label :class="$style.toggleLabel">
            <input 
              type="checkbox" 
              v-model="newColumn.allowsAttachment"
              :class="$style.toggleCheckbox"
            />
            <span :class="$style.toggleSlider"></span>
            <span :class="$style.toggleText">يسمح بمرفقات</span>
          </label>
          
          <label v-if="newColumn.allowsAttachment" :class="[$style.toggleLabel, $style.subToggle]">
            <input 
              type="checkbox" 
              v-model="newColumn.attachmentRequired"
              :class="$style.toggleCheckbox"
            />
            <span :class="$style.toggleSlider"></span>
            <span :class="$style.toggleText">المرفق مطلوب</span>
          </label>
        </div>
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
        
        <!-- Options field for select type -->
        <div v-if="editingColumn.type === 'select'" :class="$style.optionsSection">
          <label :class="$style.optionsLabel">خيارات القائمة المنسدلة</label>
          <div v-for="(option, index) in editingColumn.options" :key="index" :class="$style.optionRow">
            <input 
              v-model="editingColumn.options[index]" 
              :class="$style.optionInput" 
              placeholder="ادخل خيار" 
            />
            <button 
              @click="removeOption(editingColumn.options, index)" 
              :class="$style.removeOptionBtn"
              type="button">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <button @click="addOption(editingColumn.options)" :class="$style.addOptionBtn" type="button">
            <i class="fas fa-plus"></i>
            إضافة خيار
          </button>
        </div>
        
        <!-- Attachment Settings -->
        <div :class="$style.attachmentSection">
          <label :class="$style.toggleLabel">
            <input 
              type="checkbox" 
              v-model="editingColumn.allowsAttachment"
              :class="$style.toggleCheckbox"
            />
            <span :class="$style.toggleSlider"></span>
            <span :class="$style.toggleText">يسمح بمرفقات</span>
          </label>
          
          <label v-if="editingColumn.allowsAttachment" :class="[$style.toggleLabel, $style.subToggle]">
            <input 
              type="checkbox" 
              v-model="editingColumn.attachmentRequired"
              :class="$style.toggleCheckbox"
            />
            <span :class="$style.toggleSlider"></span>
            <span :class="$style.toggleText">المرفق مطلوب</span>
          </label>
        </div>
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
<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 16.4C0 7.34254 7.34253 0 16.4 0H39.5943C48.6518 0 55.9943 7.34253 55.9943 16.4V39.5943C55.9943 48.6518 48.6518 55.9943 39.5943 55.9943H16.4C7.34254 55.9943 0 48.6518 0 39.5943V16.4Z" fill="#F2F5F8"/>
<g clip-path="url(#clip0_914_30215)">
<path fill-rule="evenodd" clip-rule="evenodd" d="M19.6594 11.9971H31.2031L40.8031 21.5971V39.8312C40.8031 42.134 38.8102 43.9971 36.3554 43.9971H19.6594C17.196 43.9971 15.2031 42.134 15.2031 39.8312V16.163C15.2031 13.8601 17.196 11.9971 19.6594 11.9971Z" fill="#079455"/>
<path d="M19.9479 32.3603L21.0038 34.145H21.0447L22.1058 32.3603H23.3561L21.7581 34.9785L23.3919 37.5967H22.1186L21.0447 35.8095H21.0038L19.93 37.5967H18.6618L20.3007 34.9785L18.6925 32.3603H19.9479ZM24.0567 37.5967V32.3603H25.1638V36.6839H27.4087V37.5967H24.0567ZM30.9825 33.8663C30.962 33.66 30.8742 33.4998 30.7191 33.3856C30.564 33.2714 30.3535 33.2143 30.0876 33.2143C29.9069 33.2143 29.7543 33.2399 29.6299 33.291C29.5055 33.3404 29.41 33.4095 29.3435 33.4981C29.2788 33.5867 29.2464 33.6873 29.2464 33.7998C29.243 33.8936 29.2626 33.9754 29.3052 34.0453C29.3495 34.1151 29.41 34.1757 29.4867 34.2268C29.5634 34.2762 29.6521 34.3197 29.7526 34.3572C29.8532 34.393 29.9606 34.4237 30.0748 34.4492L30.5452 34.5617C30.7737 34.6129 30.9833 34.6811 31.1742 34.7663C31.3651 34.8515 31.5305 34.9563 31.6702 35.0808C31.81 35.2052 31.9183 35.3518 31.995 35.5205C32.0734 35.6893 32.1134 35.8828 32.1151 36.1009C32.1134 36.4214 32.0316 36.6992 31.8697 36.9345C31.7094 37.168 31.4776 37.3495 31.1742 37.4791C30.8725 37.6069 30.5086 37.6708 30.0825 37.6708C29.6597 37.6708 29.2915 37.6061 28.9779 37.4765C28.666 37.347 28.4222 37.1552 28.2467 36.9012C28.0728 36.6455 27.9816 36.3294 27.9731 35.9526H29.0444C29.0563 36.1282 29.1066 36.2748 29.1952 36.3924C29.2856 36.5083 29.4058 36.5961 29.5558 36.6558C29.7075 36.7137 29.8788 36.7427 30.0697 36.7427C30.2572 36.7427 30.42 36.7154 30.558 36.6609C30.6978 36.6063 30.806 36.5305 30.8827 36.4333C30.9594 36.3362 30.9978 36.2245 30.9978 36.0984C30.9978 35.9808 30.9629 35.8819 30.893 35.8018C30.8248 35.7217 30.7242 35.6535 30.5913 35.5972C30.46 35.541 30.2989 35.4899 30.108 35.4438L29.5379 35.3007C29.0964 35.1933 28.7478 35.0254 28.4921 34.797C28.2364 34.5686 28.1094 34.2609 28.1112 33.874C28.1094 33.5569 28.1938 33.2799 28.3643 33.043C28.5364 32.8061 28.7725 32.6211 29.0725 32.4882C29.3725 32.3552 29.7134 32.2887 30.0952 32.2887C30.4839 32.2887 30.8231 32.3552 31.1129 32.4882C31.4043 32.6211 31.631 32.8061 31.793 33.043C31.9549 33.2799 32.0384 33.5543 32.0435 33.8663H30.9825ZM33.8979 32.3603L34.9538 34.145H34.9947L36.0558 32.3603H37.3061L35.7081 34.9785L37.3419 37.5967H36.0686L34.9947 35.8095H34.9538L33.88 37.5967H32.6118L34.2507 34.9785L32.6425 32.3603H33.8979Z" fill="white"/>
<path d="M31.2236 18.5251V11.9971L40.8031 21.5971H34.4168C31.543 21.5971 31.0906 19.5491 31.2236 18.5251Z" fill="white" fill-opacity="0.3"/>
</g>
<defs>
<clipPath id="clip0_914_30215">
<rect width="32" height="32" fill="white" transform="translate(12 11.9971)"/>
</clipPath>
</defs>
</svg>
          </div>
          <h3 :class="$style.uploadTitle">رفع ملف Excel</h3>
          <p :class="$style.uploadDescription">
            قم برفع ملف Excel لاستخراج اسماء الأعمدة منه تلقائيا.
            <br />
            سيتم الكشف تلقائيا عن صف الأعمدة
          </p>
          
          <!-- Hidden file input -->
          <input
            ref="excelFileInput"
            type="file"
            accept=".xlsx,.xls"
            style="display: none"
            @change="handleExcelFileSelect"
          />
          
          <!-- Show selected file name -->
          <div v-if="excelFile" :class="$style.selectedFile">
            <i class="fas fa-file-excel"></i>
            <span>{{ excelFile.name }}</span>
            <button @click="excelFile = null" :class="$style.removeFileBtn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <!-- Error message -->
          <p v-if="excelError" :class="$style.errorMessage">{{ excelError }}</p>
          
          <button :class="$style.uploadBtn" @click="triggerFileInput" :disabled="isParsingExcel">
            <i :class="isParsingExcel ? 'fas fa-spinner fa-spin' : 'fas fa-upload'"></i>
            {{ excelFile ? 'تغيير الملف' : 'اختر ملف Excel' }}
          </button>
          
          <!-- Parse button (when file selected) -->
          <button 
            v-if="excelFile" 
            :class="$style.primaryBtn" 
            @click="simulateExcelUpload"
            :disabled="isParsingExcel"
            style="margin-top: 12px; width: 100%;"
          >
            <i :class="isParsingExcel ? 'fas fa-spinner fa-spin' : 'fas fa-search'"></i>
            {{ isParsingExcel ? 'جاري تحليل الملف...' : 'تحليل الأعمدة' }}
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
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.5026 1.66699H5.0026C4.56058 1.66699 4.13665 1.84259 3.82409 2.15515C3.51153 2.46771 3.33594 2.89163 3.33594 3.33366V16.667C3.33594 17.109 3.51153 17.5329 3.82409 17.8455C4.13665 18.1581 4.56058 18.3337 5.0026 18.3337H15.0026C15.4446 18.3337 15.8686 18.1581 16.1811 17.8455C16.4937 17.5329 16.6693 17.109 16.6693 16.667V5.83366L12.5026 1.66699Z" stroke="#00A350" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.6641 1.66699V5.00033C11.6641 5.44235 11.8397 5.86628 12.1522 6.17884C12.4648 6.4914 12.8887 6.66699 13.3307 6.66699H16.6641" stroke="#00A350" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6.66406 10.833H8.33073" stroke="#00A350" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.6641 10.833H13.3307" stroke="#00A350" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6.66406 14.167H8.33073" stroke="#00A350" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.6641 14.167H13.3307" stroke="#00A350" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
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
// @ts-nocheck
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAppStore } from "@/stores/useAppStore";
import FormInput from "@/components/shared/FormInput.vue";
import FormTextarea from "@/components/shared/FormTextarea.vue";
import FormSelect from "@/components/shared/FormSelect.vue";
import SidePanel from "@/components/shared/SidePanel.vue";
import { templateService } from "@/services/activityService";
import type { TemplateListItem, TemplateColumn, DataType } from "@/types/activity.types";
import * as XLSX from 'xlsx';
import Swal from "sweetalert2";

const router = useRouter();
const route = useRoute();
const store = useAppStore();

const currentTheme = computed(() => store.currentTheme);

// Edit mode detection
const editMode = ref(false);
const editTemplateId = ref<number | null>(null);

// Loading and error states
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");

// Active tab
const activeTab = ref<"properties" | "database">("properties");

// Form data
const form = ref({
  name: "",
  description: "",
  notes: "",
});

// Column interface for local state
interface Column {
  id: number;
  name: string;
  type: string;
  key?: string; // Column key for backend reference
  options?: string[]; // For select type columns
  isFromBackend?: boolean; // Track if column exists in backend
  backendId?: number; // Store the backend column ID if exists
  allowsAttachment?: boolean; // Allow file attachments for this column
  attachmentRequired?: boolean; // Is attachment required (only when allowsAttachment=true)
  isMandatory?: boolean; // Cannot be removed from template
}

// Template interface for local state
interface TemplateInfo {
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

// Selected columns - these will be the template structure
const selectedColumns = ref<Column[]>([]);

// Computed property to filter out mandatory columns from display
// (Mandatory columns are still in selectedColumns and will be sent to backend)
const sortedSelectedColumns = computed(() => {
  return selectedColumns.value.filter(col => !isColumnMandatory(col));
});

// Computed property for visible column count (excluding mandatory)
const visibleColumnCount = computed(() => sortedSelectedColumns.value.length);

// ============== MANDATORY COLUMNS ==============
// These columns MUST be present in every template and cannot be removed
const MANDATORY_COLUMNS: Column[] = [
  {
    id: -1, // Will be assigned proper ID on save
    name: 'نسبة الإنجاز المطلوبة',
    type: 'number',
    key: 'required_achievement_percentage',
    isMandatory: true,
  },
  {
    id: -2, // Will be assigned proper ID on save
    name: 'نسبة الإنجاز الفعلية',
    type: 'number',
    key: 'actual_achievement_percentage',
    isMandatory: true,
  },
];

// Keys of mandatory columns for quick lookup
const MANDATORY_COLUMN_KEYS = MANDATORY_COLUMNS.map(col => col.key);

// Ensure mandatory columns are in selectedColumns
const ensureMandatoryColumns = () => {
  for (const mandatory of MANDATORY_COLUMNS) {
    const exists = selectedColumns.value.some(
      col => col.key === mandatory.key || col.name === mandatory.name
    );
    if (!exists) {
      // Add mandatory column with unique ID
      selectedColumns.value.push({
        ...mandatory,
        id: Date.now() + Math.random(), // Unique ID for frontend
      });
    }
  }
};

// Check if a column is mandatory
const isColumnMandatory = (column: Column): boolean => {
  return column.isMandatory === true || 
         (column.key !== undefined && MANDATORY_COLUMN_KEYS.includes(column.key));
};

// ============== MANUAL PANEL ==============
const showManualPanel = ref(false);
const newColumn = ref<{ name: string; type: string; options: string[]; allowsAttachment: boolean; attachmentRequired: boolean }>({ 
  name: "", 
  type: "", 
  options: [],
  allowsAttachment: false,
  attachmentRequired: false
});

const openManualPanel = () => {
  newColumn.value = { name: "", type: "", options: [], allowsAttachment: false, attachmentRequired: false };
  showManualPanel.value = true;
};

const createManualColumn = async () => {
  if (!newColumn.value.name || !newColumn.value.type) return;
  
  // Validate options for select type
  if (newColumn.value.type === 'select' && newColumn.value.options.length === 0) {
    await Swal.fire({
      title: 'تنبيه',
      text: 'يجب إضافة خيار واحد على الأقل للقائمة المنسدلة',
      icon: 'warning',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#a17d23',
    });
    return;
  }

  const newId = Date.now();
  availableColumns.value.push({
    id: newId,
    name: newColumn.value.name,
    type: newColumn.value.type,
    options: newColumn.value.type === 'select' ? newColumn.value.options.filter(o => o.trim()) : undefined,
    allowsAttachment: newColumn.value.allowsAttachment,
    attachmentRequired: newColumn.value.attachmentRequired
  });
  showManualPanel.value = false;
};

// ============== TEMPLATE PANEL ==============
const showTemplatePanel = ref(false);
const templateStep = ref(1);
const selectedTemplate = ref<TemplateInfo | null>(null);
const templateColumns = ref<Column[]>([]);
const selectedTemplateColumns = ref<Column[]>([]);
const isLoadingTemplates = ref(false);
const isLoadingTemplateColumns = ref(false);

// Existing templates from backend
const existingTemplates = ref<TemplateInfo[]>([]);

// Load templates from backend
const loadExistingTemplates = async () => {
  isLoadingTemplates.value = true;
  try {
    const templates = await templateService.getAll({ status: 'published' });
    existingTemplates.value = templates.map(t => ({
      id: t.id,
      name: t.name,
      columnCount: t.column_count
    }));
  } catch (error: any) {
    console.error('Failed to load templates:', error);
    existingTemplates.value = [];
  } finally {
    isLoadingTemplates.value = false;
  }
};

// Load columns for a specific template
const loadTemplateColumns = async (templateId: number) => {
  isLoadingTemplateColumns.value = true;
  try {
    const template = await templateService.getById(templateId);
    templateColumns.value = template.template_columns.map(tc => ({
      id: tc.id,
      name: tc.column_definition.label,
      type: tc.column_definition.data_type,
      isFromBackend: true,
      backendId: tc.column_definition.id
    }));
    selectedTemplateColumns.value = [...templateColumns.value];
  } catch (error: any) {
    console.error('Failed to load template columns:', error);
    templateColumns.value = [];
    selectedTemplateColumns.value = [];
  } finally {
    isLoadingTemplateColumns.value = false;
  }
};

const openTemplatePanel = () => {
  templateStep.value = 1;
  selectedTemplate.value = null;
  templateColumns.value = [];
  selectedTemplateColumns.value = [];
  showTemplatePanel.value = true;
  loadExistingTemplates();
};

const selectTemplate = async (template: TemplateInfo) => {
  selectedTemplate.value = template;
  await loadTemplateColumns(template.id);
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
const excelFile = ref<File | null>(null);
const isParsingExcel = ref(false);
const excelError = ref("");
const excelFileInput = ref<HTMLInputElement | null>(null);

const openExcelPanel = () => {
  excelStep.value = 1;
  excelColumns.value = [];
  selectedExcelColumns.value = [];
  excelFile.value = null;
  excelError.value = "";
  showExcelPanel.value = true;
};

// Trigger file input click
const triggerFileInput = () => {
  excelFileInput.value?.click();
};

// Handle file selection
const handleExcelFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    excelFile.value = target.files[0];
    excelError.value = "";
  }
};

// Parse Excel file using client-side xlsx library
const parseExcelFile = async () => {
  if (!excelFile.value) return;
  
  isParsingExcel.value = true;
  excelError.value = "";
  
  try {
    const arrayBuffer = await excelFile.value.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Get the range of the sheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Determine which row to use as headers
    let headerRow = range.s.r; // Start with first row
    
    // Check if first row contains valid text data or images/empty cells
    let validCellsInFirstRow = 0;
    let totalCellsInFirstRow = 0;
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      totalCellsInFirstRow++;
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      
      // Check if cell has valid text content
      if (cell && cell.v && String(cell.v).trim().length > 0) {
        // Check if it's not just an image placeholder or special characters
        const cellValue = String(cell.v).trim();
        if (cellValue.length > 0 && !/^[\x00-\x1F\x7F-\x9F]+$/.test(cellValue)) {
          validCellsInFirstRow++;
        }
      }
    }
    
    // If first row has less than 50% valid cells, use second row as headers
    if (totalCellsInFirstRow > 0 && validCellsInFirstRow / totalCellsInFirstRow < 0.5) {
      if (range.e.r > range.s.r) { // Make sure there's a second row
        headerRow = range.s.r + 1;
        console.log('First row appears to contain images or empty cells, using second row as headers');
      }
    }
    
    // Extract column headers from the determined header row
    const columns: Column[] = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v) {
        const columnName = String(cell.v).trim();
        if (columnName) {
          // Infer column type from the data in the column (starting after header row)
          const inferredType = inferColumnType(worksheet, col, range, headerRow);
          columns.push({
            id: Date.now() + col,
            name: columnName,
            type: inferredType,
            isFromBackend: false
          });
        }
      }
    }
    
    if (columns.length > 0) {
      excelColumns.value = columns;
      selectedExcelColumns.value = [...columns];
      excelStep.value = 2;
    } else {
      excelError.value = "لم يتم العثور على أعمدة في الملف";
    }
  } catch (error: any) {
    console.error('Failed to parse Excel:', error);
    excelError.value = error.message || 'فشل في قراءة ملف Excel';
  } finally {
    isParsingExcel.value = false;
  }
};

// Infer column type from data samples
const inferColumnType = (worksheet: XLSX.WorkSheet, col: number, range: XLSX.Range, headerRow: number = 0): string => {
  // Check a few rows to infer the type (start from the row after the header)
  const startRow = headerRow + 1;
  for (let row = startRow; row <= Math.min(startRow + 10, range.e.r); row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = worksheet[cellAddress];
    
    if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
      const value = cell.v;
      const cellType = cell.t; // s=string, n=number, b=boolean, d=date
      
      // Check cell type
      if (cellType === 'n') {
        return 'number';
      }
      if (cellType === 'b') {
        return 'boolean';
      }
      if (cellType === 'd' || (cell.w && /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(cell.w))) {
        return 'date';
      }
      
      // String-based inference
      const strValue = String(value);
      
      // Check for email pattern
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
        return 'email';
      }
      
      // Check for phone pattern (various formats)
      if (/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{7,}$/.test(strValue.replace(/\s/g, ''))) {
        return 'tel';
      }
      
      // Check for boolean-like values
      if (['yes', 'no', 'true', 'false', 'نعم', 'لا', '1', '0'].includes(strValue.toLowerCase())) {
        return 'boolean';
      }
      
      // Default to text
      return 'text';
    }
  }
  
  // Default to text if no data found
  return 'text';
};

const simulateExcelUpload = () => {
  parseExcelFile();
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

// Move all available columns to structure
const moveAllToStructure = () => {
  if (availableColumns.value.length === 0) return;
  
  const movedCount = availableColumns.value.length;
  
  // Add all available columns to structure
  availableColumns.value.forEach(column => {
    addColumn(column);
  });
  
  // Clear available columns
  availableColumns.value = [];
  
  // Show success message
  Swal.fire({
    icon: 'success',
    title: 'تم النقل بنجاح',
    text: `تم نقل ${movedCount} عمود إلى هيكل النموذج`,
    timer: 2000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });
};

// Remove column from structure
const removeColumn = async (column: Column) => {
  // Prevent removal of mandatory columns
  if (isColumnMandatory(column)) {
    await Swal.fire({
      title: 'غير مسموح',
      text: 'لا يمكن إزالة هذا العمود لأنه إلزامي في جميع النماذج',
      icon: 'warning',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#a17d23',
    });
    return;
  }
  
  const index = selectedColumns.value.findIndex((c) => c.id === column.id);
  if (index > -1) {
    selectedColumns.value.splice(index, 1);
  }
};

// ============== EDIT PANEL ==============
const showEditPanel = ref(false);
const editingColumn = ref<{ id: number; name: string; type: string; options: string[]; allowsAttachment: boolean; attachmentRequired: boolean }>({ 
  id: 0, 
  name: "", 
  type: "", 
  options: [],
  allowsAttachment: false,
  attachmentRequired: false
});
const editingColumnOriginalId = ref(0);

const openEditPanel = (column: Column) => {
  editingColumn.value = { 
    ...column, 
    options: column.options ? [...column.options] : [],
    allowsAttachment: column.allowsAttachment || false,
    attachmentRequired: column.attachmentRequired || false
  };
  editingColumnOriginalId.value = column.id;
  showEditPanel.value = true;
};

const saveEditColumn = async () => {
  // Validate options for select type
  if (editingColumn.value.type === 'select' && editingColumn.value.options.length === 0) {
    await Swal.fire({
      title: 'تنبيه',
      text: 'يجب إضافة خيار واحد على الأقل للقائمة المنسدلة',
      icon: 'warning',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#a17d23',
    });
    return;
  }
  
  // Update in selected columns
  const selectedIndex = selectedColumns.value.findIndex((c) => c.id === editingColumnOriginalId.value);
  if (selectedIndex > -1) {
    selectedColumns.value[selectedIndex].name = editingColumn.value.name;
    selectedColumns.value[selectedIndex].type = editingColumn.value.type;
    selectedColumns.value[selectedIndex].options = editingColumn.value.type === 'select' ? editingColumn.value.options.filter(o => o.trim()) : undefined;
    selectedColumns.value[selectedIndex].allowsAttachment = editingColumn.value.allowsAttachment;
    selectedColumns.value[selectedIndex].attachmentRequired = editingColumn.value.attachmentRequired;
  }

  // Update in available columns
  const availableIndex = availableColumns.value.findIndex((c) => c.id === editingColumnOriginalId.value);
  if (availableIndex > -1) {
    availableColumns.value[availableIndex].name = editingColumn.value.name;
    availableColumns.value[availableIndex].type = editingColumn.value.type;
    availableColumns.value[availableIndex].options = editingColumn.value.type === 'select' ? editingColumn.value.options.filter(o => o.trim()) : undefined;
    availableColumns.value[availableIndex].allowsAttachment = editingColumn.value.allowsAttachment;
    availableColumns.value[availableIndex].attachmentRequired = editingColumn.value.attachmentRequired;
  }

  showEditPanel.value = false;
};

// Helper functions for managing options
const addOption = (optionsArray: string[]) => {
  optionsArray.push('');
};

const removeOption = (optionsArray: string[], index: number) => {
  optionsArray.splice(index, 1);
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
      // Prevent removing mandatory columns via drag
      if (isColumnMandatory(draggedColumn.value)) {
        Swal.fire({
          title: 'غير مسموح',
          text: 'لا يمكن إزالة هذا العمود لأنه إلزامي في جميع النماذج',
          icon: 'warning',
          confirmButtonText: 'حسناً',
          confirmButtonColor: '#a17d23',
        });
        handleDragEnd();
        return;
      }
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
    // Prevent removing mandatory columns via drag
    if (isColumnMandatory(draggedColumn.value)) {
      Swal.fire({
        title: 'غير مسموح',
        text: 'لا يمكن إزالة هذا العمود لأنه إلزامي في جميع النماذج',
        icon: 'warning',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#a17d23',
      });
      handleDragEnd();
      return;
    }
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

// Validate form before save
const validateForm = (): boolean => {
  if (!form.value.name.trim()) {
    errorMessage.value = "اسم النموذج مطلوب";
    activeTab.value = "properties";
    return false;
  }
  if (selectedColumns.value.length === 0) {
    errorMessage.value = "يجب إضافة عمود واحد على الأقل للنموذج";
    activeTab.value = "database";
    return false;
  }
  errorMessage.value = "";
  return true;
};

// Load template data for editing
const loadTemplateForEdit = async (templateId: number) => {
  isLoading.value = true;
  errorMessage.value = "";
  
  try {
    console.log('🔄 Loading template ID:', templateId);
    const template = await templateService.getById(templateId);
    
    console.log('📥 Raw template response:', template);
    console.log('📊 Template columns field:', template.columns);
    console.log('📊 Template template_columns field:', template.template_columns);
    
    // Populate form fields
    form.value.name = template.name;
    form.value.description = template.description || "";
    form.value.notes = template.notes || "";
    
    console.log('✅ Form populated:', form.value);
    
    // Populate columns - use the simplified 'columns' field from backend
    if (template.columns && template.columns.length > 0) {
      console.log('📋 Processing columns...');
      
      selectedColumns.value = template.columns.map((col: any, index: number) => {
        console.log(`  Column ${index + 1}:`, col);
        return {
          id: col.id,
          name: col.name,
          key: col.key, // Include key for mandatory column detection
          type: col.data_type,
          options: col.options || [],
          isFromBackend: true,
          backendId: col.id,
          allowsAttachment: col.allows_attachment || false,
          attachmentRequired: col.attachment_required || false,
          isMandatory: col.is_mandatory || MANDATORY_COLUMN_KEYS.includes(col.key) // Set mandatory flag
        };
      });
      
      // Ensure mandatory columns are present (in case they were somehow missing)
      ensureMandatoryColumns();
      
      console.log('✅ Loaded', selectedColumns.value.length, 'columns into Template Structure');
      console.log('📦 Selected columns:', selectedColumns.value);
    } else {
      console.warn('⚠️ No columns found in template.columns');
      console.warn('   Template has template_columns?', !!template.template_columns);
      console.warn('   Template_columns length:', template.template_columns?.length);
      
      // Even if no columns, ensure mandatory columns are present
      ensureMandatoryColumns();
    }
    
    // Force UI update
    console.log('🔄 Final state - selectedColumns:', selectedColumns.value.length);
    console.log('🔄 Final state - availableColumns:', availableColumns.value.length);
    
  } catch (error: any) {
    console.error("❌ Failed to load template:", error);
    console.error("❌ Error response:", error.response?.data);
    errorMessage.value = error.response?.data?.error || error.message || "فشل في تحميل النموذج";
  } finally {
    isLoading.value = false;
  }
};

// Handle save - create or update template in backend
const handleSave = async () => {
  if (!validateForm()) {
    return;
  }
  
  isSaving.value = true;
  errorMessage.value = "";
  
  try {
    console.log('🔄 Preparing to save template...');
    console.log('📝 Edit mode:', editMode.value);
    console.log('🆔 Template ID:', editTemplateId.value);
    console.log('📋 Selected columns count:', selectedColumns.value.length);
    console.log('📦 Selected columns:', selectedColumns.value);
    
    // Prepare template data
    const templateData = {
      name: form.value.name,
      description: form.value.description,
      notes: form.value.notes,
      // Include inline column definitions
      columns: selectedColumns.value.map((col, index) => {
        const columnData: any = {
          label: col.name,
          data_type: col.type as DataType,
          order: index + 1,
          options: col.type === 'select' && col.options ? col.options.filter(o => o.trim()) : undefined,
          allows_attachment: col.allowsAttachment || false,
          attachment_required: col.attachmentRequired || false
        };
        // Include key for mandatory columns so backend can identify them
        if (col.key) {
          columnData.key = col.key;
        }
        if (col.isMandatory) {
          columnData.is_mandatory = true;
        }
        console.log(`  📌 Column ${index + 1}:`, columnData);
        return columnData;
      })
    };
    
    console.log('📤 Sending to backend:', templateData);
    console.log('📊 Column count in payload:', templateData.columns.length);
    
    let result;
    if (editMode.value && editTemplateId.value) {
      // Update existing template
      console.log('🔄 Calling templateService.update()...');
      result = await templateService.update(editTemplateId.value, templateData);
      console.log("✅ Template updated successfully:", result);
      
      // Refresh the columns from the response
      if (result.columns && result.columns.length > 0) {
        console.log('🔄 Refreshing selectedColumns from response...');
        selectedColumns.value = result.columns.map((col: any) => ({
          id: col.id,
          name: col.name,
          type: col.data_type,
          options: col.options || [],
          isFromBackend: true,
          backendId: col.id
        }));
        console.log('✅ Columns refreshed:', selectedColumns.value.length, 'columns');
      }
    } else {
      // Create new template
      console.log('🔄 Calling templateService.create()...');
      const createdTemplate = await templateService.create(templateData);
      console.log("✅ Template created successfully:", createdTemplate);
    }
    
    console.log('✅ Save operation completed, navigating back...');
    // Navigate back to templates list
    router.push("/control/templates");
  } catch (error: any) {
    console.error("❌ Save failed:", error);
    console.error("❌ Error response:", error.response);
    console.error("❌ Error data:", error.response?.data);
    console.error("❌ Error message:", error.message);
    errorMessage.value = error.response?.data?.error || error.message || (editMode.value ? "فشل في تحديث النموذج" : "فشل في إنشاء النموذج");
  } finally {
    isSaving.value = false;
  }
};

// Initialize on mount
onMounted(async () => {
  // Check if we're in edit mode
  const templateId = route.params.id;
  if (templateId && typeof templateId === 'string') {
    editMode.value = true;
    editTemplateId.value = parseInt(templateId, 10);
    await loadTemplateForEdit(editTemplateId.value);
  } else {
    // New template - ensure mandatory columns are added
    ensureMandatoryColumns();
    console.log('✅ Mandatory columns added for new template:', selectedColumns.value);
  }
});
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

.loadingContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
}

.loadingContainer i {
  font-size: 3rem;
  color: #a17d23;
}

.loadingContainer p {
  font-size: 1.125rem;
  color: #64748b;
}

.container[data-theme="night"] .loadingContainer p {
  color: #94a3b8;
}

.errorMessage {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background-color: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  color: #dc2626;
  margin-bottom: 1rem;
}

.container[data-theme="night"] .errorMessage {
  background-color: #450a0a;
  border-color: #991b1b;
  color: #fca5a5;
}

.errorMessage i {
  font-size: 1.25rem;
}

.errorMessage p {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
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

/* Move All Button */
.moveAllBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  margin-top: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  width: 100%;
  justify-content: center;
}

.moveAllBtn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

.moveAllBtn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.moveAllBtn i:first-child {
  animation: slideLeft 1.5s ease-in-out infinite;
}

.moveAllBtn i:last-child {
  opacity: 0.8;
}

@keyframes slideLeft {
  0%, 100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(-4px);
  }
}

.container[data-theme="night"] .moveAllBtn {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  box-shadow: 0 2px 8px rgba(90, 103, 216, 0.4);
}

.container[data-theme="night"] .moveAllBtn:hover {
  box-shadow: 0 4px 12px rgba(90, 103, 216, 0.5);
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
  color: #717784;
  margin-bottom: 0.5rem;
}

.container[data-theme="night"] .emptyState i {
  color: #c9a961;
}

.emptyTitle {
  font-size: 1rem;
  font-weight: 600;
  color: #717784;
  margin: 0;
}
.emptyTitle2 {
  font-size: 1rem;
  font-weight: 600;
  color: #A17D23;
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
  background-color: #A17D23;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.uploadBtn:hover {
  background-color: #755b19;
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

/* Mandatory column badge */
.mandatoryBadge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  background-color: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #b45309;
  margin-right: 0.5rem;
}

.container[data-theme="night"] .mandatoryBadge {
  background-color: #451a03;
  border-color: #92400e;
  color: #fcd34d;
}

.mandatoryBadge i {
  font-size: 0.6rem;
}

/* Locked text for mandatory columns */
.lockedText {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #9ca3af;
  font-size: 0.875rem;
}

.container[data-theme="night"] .lockedText {
  color: #6b7280;
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

/* Attachment badge */
.attachmentBadge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background-color: #f0f9ff;
  color: #0284c7;
  border: 1px solid #0284c7;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.container[data-theme="night"] .attachmentBadge {
  background-color: #0c4a6e;
  border-color: #0ea5e9;
  color: #7dd3fc;
}

.attachmentBadge.required {
  background-color: #fef3c7;
  color: #b45309;
  border-color: #b45309;
}

.container[data-theme="night"] .attachmentBadge.required {
  background-color: #78350f;
  border-color: #f59e0b;
  color: #fcd34d;
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

/* ============== OPTIONS SECTION (for select type) ============== */
.optionsSection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.container[data-theme="night"] .optionsSection {
  background-color: #1e293b;
  border-color: #334155;
}

.optionsLabel {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.container[data-theme="night"] .optionsLabel {
  color: #f8fafc;
}

.optionRow {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.optionInput {
  flex: 1;
  padding: 0.625rem 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #1e293b;
  background-color: white;
  transition: all 0.2s;
}

.container[data-theme="night"] .optionInput {
  background-color: #0f172a;
  border-color: #334155;
  color: #f8fafc;
}

.optionInput:focus {
  outline: none;
  border-color: #a17d23;
}

.removeOptionBtn {
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

.container[data-theme="night"] .removeOptionBtn {
  background-color: #450a0a;
  border-color: #7f1d1d;
  color: #f87171;
}

.removeOptionBtn:hover {
  background-color: #fee2e2;
}

.container[data-theme="night"] .removeOptionBtn:hover {
  background-color: #7f1d1d;
}

.addOptionBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background-color: white;
  border: 1px dashed #e2e8f0;
  border-radius: 6px;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.container[data-theme="night"] .addOptionBtn {
  background-color: #0f172a;
  border-color: #334155;
  color: #94a3b8;
}

.addOptionBtn:hover {
  border-color: #a17d23;
  color: #a17d23;
  background-color: #fef9e7;
}

.container[data-theme="night"] .addOptionBtn:hover {
  border-color: #c9a961;
  color: #c9a961;
  background-color: #2d2a1f;
}

/* ============== ATTACHMENT SECTION ============== */
.attachmentSection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-top: 1rem;
}

.container[data-theme="night"] .attachmentSection {
  background-color: #1e293b;
  border-color: #334155;
}

.toggleLabel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.toggleCheckbox {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.toggleSlider {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: #cbd5e1;
  border-radius: 12px;
  transition: all 0.3s;
  flex-shrink: 0;
}

.toggleSlider::before {
  content: '';
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggleCheckbox:checked + .toggleSlider {
  background-color: #a17d23;
}

.toggleCheckbox:checked + .toggleSlider::before {
  right: 22px;
}

.container[data-theme="night"] .toggleSlider {
  background-color: #475569;
}

.container[data-theme="night"] .toggleSlider::before {
  background-color: #f8fafc;
}

.container[data-theme="night"] .toggleCheckbox:checked + .toggleSlider {
  background-color: #c9a961;
}

.toggleText {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
}

.container[data-theme="night"] .toggleText {
  color: #f8fafc;
}

.subToggle {
  padding-right: 1.5rem;
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

/* ============== EXCEL UPLOAD STYLES ============== */
.selectedFile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: #ecfdf5;
  border: 1px solid #10b981;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.container[data-theme="night"] .selectedFile {
  background-color: #064e3b;
  border-color: #10b981;
}

.selectedFile span {
  color: #047857;
  font-size: 0.875rem;
  font-weight: 500;
}

.container[data-theme="night"] .selectedFile span {
  color: #6ee7b7;
}

.removeFileBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: #dc2626;
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.removeFileBtn:hover {
  background-color: #b91c1c;
}

.errorMessage {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin-bottom: 1rem;
  color: #dc2626;
  font-size: 0.875rem;
}

.container[data-theme="night"] .errorMessage {
  background-color: #450a0a;
  border-color: #7f1d1d;
  color: #f87171;
}

.parseBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: #10b981;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}

.parseBtn:hover:not(:disabled) {
  background-color: #059669;
}

.parseBtn:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.container[data-theme="night"] .parseBtn:disabled {
  background-color: #475569;
}
</style>
