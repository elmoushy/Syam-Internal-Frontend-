<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  label: string
  required?: boolean
  accept?: string
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  accept: '.jpg, .jpeg, .png, .gif, .webp, .svg, .bmp, PDF'
})

const emit = defineEmits<{
  (e: 'fileSelected', file: File): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)

const fileName = computed(() => selectedFile.value?.name || '')

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
    emit('fileSelected', file)
  }
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    selectedFile.value = file
    emit('fileSelected', file)
  }
}

const handleDragOver = () => {
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const triggerFileInput = () => {
  fileInput.value?.click()
}
</script>

<template>
  <div :class="$style.formGroup">
    <label :class="$style.label">
      {{ label }}
      <span v-if="required" :class="$style.required">*</span>
    </label>
    
    <div 
      :class="[$style.uploadArea, isDragging && $style.uploadAreaDragging, error && $style.uploadAreaError]"
      @click="triggerFileInput"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :class="$style.fileInput"
        @change="handleFileSelect"
      />
      
      <div :class="$style.uploadContent">
        <div :class="$style.uploadIcon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 14V34M24 14L18 20M24 14L30 20" stroke="#A17D23" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M36 28V38C36 39.1046 35.1046 40 34 40H14C12.8954 40 12 39.1046 12 38V28" stroke="#A17D23" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        
        <div :class="$style.uploadText">
          <p :class="$style.uploadMainText">
            اسحب المرفق هنا أو 
            <span :class="$style.uploadLink">اختر ملف من الحاسوب</span>
          </p>
          <p :class="$style.uploadSubText">
            الملفات المدعومة: {{ accept }}
          </p>
        </div>
        
        <div v-if="fileName" :class="$style.selectedFileName">
          <i class="fas fa-file"></i>
          {{ fileName }}
        </div>
      </div>
    </div>

    <span v-if="error" :class="$style.errorMessage">{{ error }}</span>
  </div>
</template>

<style module>
.formGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.label {
  font-size: 14px;
  font-weight: 600;
  color: #0E121B;
  text-align: right;
}

.required {
  color: #D44333;
  margin-right: 4px;
}

.uploadArea {
  border: 2px dashed #E1E4EA;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #FAFBFC;
}

.uploadArea:hover {
  border-color: #A17D23;
  background: #FFF8ED;
}

.uploadAreaDragging {
  border-color: #A17D23;
  background: #FFF8ED;
}

.uploadAreaError {
  border-color: #D44333;
}

.fileInput {
  display: none;
}

.uploadContent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.uploadIcon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 50%;
}

.uploadText {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.uploadMainText {
  font-size: 14px;
  color: #0E121B;
  margin: 0;
  direction: rtl;
}

.uploadLink {
  color: #A17D23;
  text-decoration: underline;
  font-weight: 600;
}

.uploadSubText {
  font-size: 12px;
  color: #717784;
  margin: 0;
  direction: rtl;
}

.selectedFileName {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #E1E4EA;
  border-radius: 8px;
  font-size: 14px;
  color: #0E121B;
}

.selectedFileName i {
  color: #A17D23;
}

.errorMessage {
  font-size: 12px;
  color: #D44333;
  text-align: right;
}
</style>
