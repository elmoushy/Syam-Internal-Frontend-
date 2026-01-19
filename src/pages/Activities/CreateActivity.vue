<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormInput from '@/components/shared/FormInput.vue'
import FormTextarea from '@/components/shared/FormTextarea.vue'
import FormSelect from '@/components/shared/FormSelect.vue'
import FormFileUpload from '@/components/shared/FormFileUpload.vue'
import FormRadio from '@/components/shared/FormRadio.vue'

const route = useRoute()
const router = useRouter()

const sheetId = ref(route.params.id)

// Form data
const formData = ref({
  activityType: null as string | number | null,
  activityName: '',
  activityDepartment: '',
  activitySection: '',
  activityScope: null as string | number | null,
  activitySource: null as string | number | null,
  objectives: '',
  attachments: null as File | null,
  hasMinutes: null as boolean | null, // Radio button example
  description: '' // Textarea example with custom rows
})

// Form errors
const errors = ref({
  activityType: '',
  activityName: '',
  activityDepartment: '',
  activitySection: '',
  activityScope: '',
  activitySource: '',
  objectives: '',
  attachments: '',
  hasMinutes: '',
  description: ''
})

// Options for dropdowns
const activityTypeOptions = [
  { value: 1, label: 'اجتماع' },
  { value: 2, label: 'ورش العمل' },
  { value: 3, label: 'دورة تدريبية' },
  { value: 4, label: 'مؤتمر' },
  { value: 5, label: 'أخرى' }
]

const activityScopeOptions = [
  { value: 1, label: 'داخلي' },
  { value: 2, label: 'خارجي' },
  { value: 3, label: 'مختلط' }
]

const activitySourceOptions = [
  { value: 1, label: 'مصدر 1' },
  { value: 2, label: 'مصدر 2' },
  { value: 3, label: 'مصدر 3' }
]

const isSubmitting = ref(false)
const isSavingDraft = ref(false)

const handleFileSelected = (file: File) => {
  formData.value.attachments = file
  errors.value.attachments = ''
}

const validateForm = (): boolean => {
  let isValid = true
  
  // Reset errors
  Object.keys(errors.value).forEach(key => {
    errors.value[key as keyof typeof errors.value] = ''
  })

  // Validate required fields
  if (!formData.value.activityType) {
    errors.value.activityType = 'نوع النشاط مطلوب'
    isValid = false
  }

  if (!formData.value.activityName.trim()) {
    errors.value.activityName = 'اسم النشاط مطلوب'
    isValid = false
  }

  if (!formData.value.activityDepartment.trim()) {
    errors.value.activityDepartment = 'القسم المنفذ مطلوب'
    isValid = false
  }

  if (!formData.value.activitySection.trim()) {
    errors.value.activitySection = 'اسم النشاط مطلوب'
    isValid = false
  }

  if (!formData.value.activityScope) {
    errors.value.activityScope = 'نطاق النشاط مطلوب'
    isValid = false
  }

  if (!formData.value.activitySource) {
    errors.value.activitySource = 'مصدر النشاط مطلوب'
    isValid = false
  }

  if (!formData.value.objectives.trim()) {
    errors.value.objectives = 'المخرجات مطلوبة'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  
  try {
    // TODO: Implement API call to submit activity
    console.log('Submitting activity:', formData.value)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Navigate back to the detail page
    router.push(`/activities/local/${sheetId.value}`)
  } catch (error) {
    console.error('Error submitting activity:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleSaveDraft = async () => {
  isSavingDraft.value = true
  
  try {
    // TODO: Implement API call to save draft
    console.log('Saving draft:', formData.value)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Navigate back to the detail page
    router.push(`/activities/local/${sheetId.value}`)
  } catch (error) {
    console.error('Error saving draft:', error)
  } finally {
    isSavingDraft.value = false
  }
}

const handleCancel = () => {
  router.push(`/activities/local/${sheetId.value}`)
}

onMounted(() => {
  console.log('Creating activity for sheet:', sheetId.value)
})
</script>

<template>
  <div :class="$style.container">
    <!-- Page Header -->
    <div :class="$style.pageHeader">
      <div :class="$style.titleSection">
        <button :class="$style.backBtn" @click="handleCancel" title="رجوع">
          <i class="fas fa-arrow-left"></i>
          رجوع
        </button>
        <h1 :class="$style.pageTitle">إنشاء نشاط جديد</h1>
      </div>
      
      <div :class="$style.headerActions">
                <button :class="$style.submitBtn" @click="handleSubmit" :disabled="isSubmitting">
          <i v-if="isSubmitting" class="fas fa-spinner fa-spin"></i>
          إنشاء
        </button>
   
        <button :class="$style.draftBtn" @click="handleSaveDraft" :disabled="isSavingDraft">
          <i v-if="isSavingDraft" class="fas fa-spinner fa-spin"></i>
         <svg width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.07031 12.1231C2.41774 10.2374 6.5046 4.88022 11.2909 1.86822C14.8892 -0.398061 18.2852 2.59337 15.6503 5.60537C13.0737 8.55051 9.61946 12.6048 8.14346 14.6174C6.61431 16.7037 9.23203 19.2288 11.8515 16.8254C13.6 15.2208 15.4257 13.3745 17.2789 12.0099C19.7817 10.1688 21.928 11.7939 20.836 13.8699C20.0475 15.3699 19.4732 16.0317 18.8132 17.2951C18.1549 18.5568 18.8526 20.0705 19.852 20.2008C21.0897 20.3602 21.8732 19.4739 22.9309 18.0905" stroke="#A17D23" stroke-width="2.14286" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

          مسودة
        </button>
             <button :class="$style.cancelBtn" @click="handleCancel">
          إلغاء
        </button>

      </div>
    </div>

    <!-- Form Content -->
    <div :class="$style.mainContent">
      <form :class="$style.form" @submit.prevent="handleSubmit">
        <!-- Row 1: Activity Type -->
        <div :class="$style.formRow">
          <FormSelect
            v-model="formData.activityType"
            label="نوع النشاط"
            placeholder="ادخل نوع النشاط"
            :options="activityTypeOptions"
            :searchable="true"
            :required="true"
            :error="errors.activityType"
          />
        </div>

        <!-- Row 2: Department and Section -->
        <div :class="$style.formRow">
          <FormInput
            v-model="formData.activityDepartment"
            label="القسم المنفذ"
            placeholder="ادخل القسم المنفذ"
            :required="true"
            :error="errors.activityDepartment"
          />
          <FormInput
            v-model="formData.activitySection"
            label="اسم النشاط"
            placeholder="ادخل اسم النشاط"
            :required="true"
            :error="errors.activitySection"
          />
        </div>

        <!-- Row 3: Scope and Source -->
        <div :class="$style.formRow">
          <FormSelect
            v-model="formData.activityScope"
            label="نطاق النشاط"
            placeholder="اختر نطاق النشاط"
            :options="activityScopeOptions"
            :searchable="true"
            :required="true"
            :error="errors.activityScope"
          />
          <FormSelect
            v-model="formData.activitySource"
            label="مصدر النشاط"
            placeholder="اختر مصدر النشاط"
            :options="activitySourceOptions"
            :searchable="true"
            :required="true"
            :error="errors.activitySource"
          />
        </div>

        <!-- Row 4: Objectives -->
        <div :class="$style.formRow">
          <FormTextarea
            v-model="formData.objectives"
            label="المخرجات"
            placeholder="ادخل المخرجات"
            :rows="5"
            :required="true"
            :error="errors.objectives"
          />
        </div>

        <!-- Row 5: Has Minutes (Radio Button Example) -->
        <div :class="$style.formRow">
          <FormRadio
            v-model="formData.hasMinutes"
            label="يوجد محضر اجتماع"
            :required="false"
            :error="errors.hasMinutes"
          />
        </div>

             <!-- Row 5.5: Minutes Attachment (shown only when hasMinutes is true) -->
        <div v-if="formData.hasMinutes === true" :class="$style.formRow">
          <FormFileUpload
            label="المرفقات"
            accept=".jpg, .jpeg, .png, .gif, .webp, .svg, .bmp, .pdf"
            @fileSelected="handleFileSelected"
            :error="errors.attachments"
          />
        </div>
 

        <!-- Row 6: Description (Textarea with custom rows) -->
        <div :class="$style.formRow">
          <FormTextarea
            v-model="formData.description"
            label="الوصف"
            placeholder="ادخل وصف النموذج"
            :rows="6"
            :required="false"
            :error="errors.description"
          />
        </div>

        <!-- Row 7: Attachments -->
        <div :class="$style.formRow">
          <FormFileUpload
            label="المرفقات"
            accept=".jpg, .jpeg, .png, .gif, .webp, .svg, .bmp, PDF"
            @fileSelected="handleFileSelected"
            :error="errors.attachments"
          />
        </div>
      </form>
    </div>
  </div>
</template>

<style module>
.container {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: calc(100vh - 80px);
  background: #f5f5f5;
  direction: rtl;
  font-family: "Cairo", "Segoe UI", Tahoma, sans-serif;
  padding: 24px 40px;
}

/* ==================== PAGE HEADER ==================== */
.pageHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  padding: 10px;
  border-radius: 20px;
  margin-bottom: 24px;
}

.titleSection {
  display: flex;
  align-items: center;
  gap: 16px;
}

.backBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: #A17D23;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.backBtn:hover {
  background: #FFF8ED;
}

.backBtn i {
  font-size: 14px;
}

.pageTitle {
  font-size: 32px;
  font-weight: 400;
  color: #121011;
  margin: 0;
}

.headerActions {
  display: flex;
  gap: 0;
  background: transparent;
  border-radius: 8px;
  gap: 8px;
  /* overflow: hidden; */
}

.cancelBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px ;
  color: #717784;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancelBtn:hover {
  background: #F5F7FA;
  color: #0E121B;
}

.draftBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  color: #717784;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

}

.draftBtn:hover:not(:disabled) {
  background: #FFF8ED;
  color: #A17D23;
}

.draftBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.draftBtn i {
  font-size: 12px;
}

.submitBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  background: #A17D23;
  border: 1px solid #A17D23;
  border-radius:  8px ;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submitBtn:hover:not(:disabled) {
  background: #8a6b1e;
  border-color: #8a6b1e;
}

.submitBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submitBtn i {
  font-size: 12px;
}

/* ==================== MAIN CONTENT ==================== */
.mainContent {
  background: white;
  border-radius: 16px;
  padding: 32px;
  flex: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  border: 1px solid #E1E4EA;
  padding: 20px;
  border-radius: 10px;
}

.formRow:has(> :only-child) {
  grid-template-columns: 1fr;
}

@media (max-width: 768px) {
  .formRow {
    grid-template-columns: 1fr;
  }
}
</style>
